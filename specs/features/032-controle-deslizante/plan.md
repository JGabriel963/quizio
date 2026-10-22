---
spec: "032"
status: approved # draft | approved
---

# Plano técnico — 032 Controle deslizante

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0008](../../../docs/adr/0008-modelo-de-perguntas.md), [0009](../../../docs/adr/0009-partida-ao-vivo.md), [0010](../../../docs/adr/0010-relatorios-como-leitura-da-partida.md), [0014](../../../docs/adr/0014-atribuicao-como-partida.md)

## Abordagem

A spec 031 deixou o caminho pronto para um tipo que não é escolha:

- **tempos por tipo** (`timeLimitsFor`, `defaultTimeLimitFor`, `fitTimeLimit`);
- **resposta genérica** (`AnswerResponse`, `parseAnswerResponse`, `gradeAnswer`);
- **um ramo por tipo** onde a correção é decidida.

O Controle deslizante segue o mesmo desenho e acrescenta três coisas:

1. **A matemática da escala no shared kernel.** A etapa, as posições, a margem e a classificação são usadas pelo editor (o que mostrar e quando a pergunta está incompleta), pela partida (correção e pontos) e pelo relatório (a faixa da margem). Como os contextos não importam funções uns dos outros, ela fica em `core/shared/domain/slider-scale.ts`, como a normalização da 031.
   - **Toda a conta é feita em centésimos inteiros.** Os números têm no máximo 2 casas decimais e 10 caracteres, então ±9.999.999.999 vira no máximo ±10¹², bem abaixo de `Number.MAX_SAFE_INTEGER`.
   - Assim, "a resposta é uma posição", "está dentro da margem" e "a etapa é 30" são comparações exatas, sem erro de ponto flutuante.
2. **Uma correção nova, `almostCorrect`.** Ela entra no enum `Correctness` (e no `answer_correctness` do banco). Tudo que hoje conta acertos passa a contá-la como acerto (RN-22): a sequência (`standings.ts`), as contas do relatório (`report-stats.ts`, `drizzle-report-game-query.ts`) e os rótulos.
3. **A resposta é um número.** `AnswerResponse` ganha `value`, e `game_answer` ganha a coluna `value`. A pergunta da partida leva a escala inteira (`GameQuestion.slider`). O celular recebe **só a parte pública** da escala: a primeira e a última posição e a etapa, nunca a resposta nem a margem (RN-23).

Nada muda no ciclo da partida, na reprodução automática ou na atribuição além de um ramo de apresentação. Não há revisão de respostas neste tipo.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Controle deslizante | `slider`, `SliderQuestion`, `SliderContent` | sim |
| Mínimo, máximo, resposta | `min`, `max`, `answer` (números, até 2 casas) | sim |
| Unidade | `unit`, `SLIDER_UNIT_MAX_LENGTH` (20) | sim |
| Número do controle | `parseSliderNumber`, `SLIDER_NUMBER_MAX_LENGTH` (10) | sim |
| Margem de resposta | `answerMargin`, `ANSWER_MARGINS` (`none`, `low`, `medium`, `high`, `maximum`) | sim |
| Escala | `SliderScale`, `sliderScaleOf` | sim |
| Valor da etapa | `sliderStep` | sim |
| Posições, pontas | `firstPosition`, `lastPosition`, `isSliderPosition`, `startPosition` | sim |
| Faixa da margem | `marginRange` (`low`, `high`) | sim |
| Precisão | `sliderPrecision` | sim |
| Quase correta | `Correctness` `almostCorrect` | sim (valor novo) |
| Escala pública | `PublicSliderScale` | sim |

## Domínio

### Shared kernel — `packages/core/src/shared/domain/slider-scale.ts` (novo)

```ts
export const ANSWER_MARGINS = ["none", "low", "medium", "high", "maximum"] as const;
export type AnswerMargin = (typeof ANSWER_MARGINS)[number];
/** Percent of the range each margin allows (RN-11); `maximum` reaches the far end. */
export const MARGIN_PERCENT = { none: 0, low: 5, medium: 10, high: 20 } as const;

/** A complete scale: min < max and min ≤ answer ≤ max, all with at most 2 decimals. */
export interface SliderScale { min: number; max: number; answer: number; margin: AnswerMargin }

/** Range ÷ 100 rounded up at its first significant digit, never below 1 (RN-09). */
export function sliderStep(min: number, max: number): number;
/** The answer minus/plus whole steps, within the range (RN-10). */
export function firstPosition(scale: SliderScale): number;
export function lastPosition(scale: SliderScale): number;
export function isSliderPosition(scale: SliderScale, value: number): boolean;
/** The position closest to the middle of the range; the lower one on a tie (RN-24). */
export function startPosition(scale: SliderScale): number;
/** answer ± margin, clipped by min and max; exact (RN-11). */
export function marginRange(scale: SliderScale): { low: number; high: number };
/** correct when equal, almostCorrect within the margin, wrong otherwise (RN-19). */
export function sliderCorrectness(scale: SliderScale, value: number): "correct" | "almostCorrect" | "wrong";
/** 1 − distance ÷ margin; 1 when exact (RN-20). */
export function sliderPrecision(scale: SliderScale, value: number): number;
```

- Tudo é calculado em **centésimos inteiros** (`toHundredths = Math.round(n * 100)`).
- **A etapa** sai só de comparações inteiras. Com `R` = faixa em centésimos:
  - se `R ≤ 10 000`, a etapa é 1;
  - senão, acha-se a potência `p = 10^k` com `R ≥ p·10 000` e `R < 10p·10 000`, e a etapa é `ceil(R / (p·10 000)) × p`.
  - Isso dá 50 → 1, 540 → 6, 800 → 8 e 2100,33 → 30, sem `Math.log10`.
- **A margem** compara `100 × distância ≤ porcentagem × R`, para que 10% de 2100,33 não perca a última casa.
- **A Máxima** usa `max(answer − min, max − answer)` como margem.

### Quiz — `packages/core/src/quiz/domain`

**`question.ts`**

- `QUESTION_TYPES` ganha `"slider"`.
- O tipo da pergunta:
  ```ts
  export interface SliderQuestion extends QuestionBase {
  	type: "slider";
  	min: number | null; max: number | null; answer: number | null;
  	unit: string | null; answerMargin: AnswerMargin;
  }
  ```
  `SliderContent` é o `Pick` dos campos próprios. Mínimo e máximo podem ser nulos: um campo vazio é estado de editor (RN-16 c).
- `blankContent("slider")` → `{ min: 0, max: 50, answer: null, unit: null, answerMargin: "medium" }` (RN-06, RN-08).
- `parseStoredContent` é tolerante: um número inválido vira `null`, e uma margem desconhecida vira `medium`.
- `questionContent`, `isBlankQuestion` e `copyQuestion` ganham um ramo novo nos `switch`.
- **Tempos:** `timeLimitsFor("slider")` = `TIME_LIMITS_SECONDS` a partir de 10; `defaultTimeLimitFor("slider")` = 20 (RN-13, RN-14).
- `parseSliderNumber(raw: string): number` (RN-04):
  - aceita sinal, dígitos e **um** separador, vírgula ou ponto;
  - aceita até 2 casas e até 10 caracteres no texto digitado;
  - devolve o número. Fora disso, `InvalidSliderNumberError`.
- `parseSliderUnit(raw)`: `parseLimitedText(raw, 20, …)`, e vazio vira `null`.

**`question-change.ts`**

- `QuestionContentInput` ganha o ramo do slider (para `type.remembered`).
- Mudanças novas, com `requireSlider`:
  - `{ kind: "sliderNumber"; field: "min" | "max" | "answer"; value: string | null }`: grava o número já validado. `null` esvazia o mínimo ou o máximo; a resposta não pode ser esvaziada. **Nunca move a resposta** (RN-16).
    - `{ kind: "sliderUnit"; text: string | null }` (RN-05).
  - `{ kind: "answerMargin"; margin: AnswerMargin }` (RN-08).
- `changeType`: indo para slider sem conteúdo lembrado, recebe o em branco (RN-18). O tempo passa por `fitTimeLimit`, de 5 para 10 s (RN-14).

**`question-issues.ts`** — três motivos novos (RN-16):

| Issue | Quando | Texto na lista |
| --- | --- | --- |
| `noSliderAnswer` | `answer === null` | "Resposta ausente" |
| `invalidSliderRange` | min ou max nulo, ou min ≥ max | "Intervalo inválido" |
| `sliderAnswerOutOfRange` | resposta < min ou > max (só com faixa válida) | "Resposta fora do intervalo" |

`sliderScaleOf(question): SliderScale | null` devolve a escala só quando a pergunta não tem nenhum desses motivos. O editor e a cópia para a partida usam essa função.

**`quiz-version.ts`**: `sameContent` compara os cinco campos; `parseVersionQuestions` usa o tempo do tipo.

**Erros de domínio**

| Classe | `code` | Quando |
| --- | --- | --- |
| `InvalidSliderNumberError` | `QUIZ.INVALID_SLIDER_NUMBER` | Não é número, tem mais de 2 casas ou mais de 10 caracteres (RN-04) |
| `SliderUnitTooLongError` | `QUIZ.SLIDER_UNIT_TOO_LONG` | Unidade com mais de 20 caracteres (RN-05) |
| `SliderRangeInvalidError` | `QUIZ.SLIDER_RANGE_INVALID` | "Adicionar resposta" com mínimo ou máximo vazio, ou mínimo ≥ máximo |
| `SliderAnswerRequiredError` | `QUIZ.SLIDER_ANSWER_REQUIRED` | Esvaziar a resposta (`sliderNumber` answer `null`) |

### Game — `packages/core/src/game/domain`

**`game-question.ts`**

- `GameQuestion.slider: (SliderScale & { unit: string | null }) | null`, copiado por `toGameQuestion` com `sliderScaleOf`. A versão jogável só tem perguntas completas, então a escala existe.
- Num slider, `choices: []` e `acceptedAnswers: []`.
- `parseStoredGameQuestion` trata a ausência como `null`, para as linhas gravadas antes.

**`answer.ts`**

- `CORRECTNESS` ganha `"almostCorrect"`.
- `AnswerResponse` ganha `value: number | null`, e `Answer` ganha `value: number | null` (null nos outros tipos).
- `parseAnswerResponse`:
  - num slider, exige `value` finito que seja **uma posição da escala** (`isSliderPosition`, CA-15), sem `choiceIds` nem `text`;
  - nos outros tipos, `value` precisa estar ausente;
  - qualquer outra forma é `InvalidAnswerError`.
- `gradeAnswer` ganha o ramo do slider: `sliderCorrectness` e `sliderPoints`.

**`scoring.ts`**

```ts
/**
 * 80% by precision and 20% by speed (spec 032, RN-21): the speed factor is the
 * one of calculateAnswerScore (1 within the first 500 ms, down to ½ at the limit).
 */
export function calculateSliderScore(input: {
	precision: number; responseTimeMs: number; timeLimitMs: number; pointsMultiplier: PointsMultiplier;
}): number;
```

- Faz as mesmas checagens de tempo de `calculateAnswerScore`.
- **Fórmula:** `round(pontos × (0,8 × precisão + 0,2 × fator))`.
- **Resultado:** com `precision` 1 e resposta no instante, 1000; no fim do tempo, 900.

**`standings.ts`**: `streakAfter` conta `almostCorrect` como acerto (RN-22).

**`public-stage.ts`**: `PublicStage.question.slider: PublicSliderScale | null`.

```ts
export interface PublicSliderScale {
	min: number; max: number;       // os rótulos dos botões (RN-25)
	first: number; last: number;    // as pontas (RN-10)
	step: number; start: number; unit: string | null;
}
```

- Vai com as perguntas nos dispositivos ligadas ou não (RN-27), a partir da fase de respostas.
- **Nunca leva `answer` nem a margem** (RN-23, CA-20).
- `first` e `step` dizem que a resposta é uma das posições, mas não qual. A spec aceita isso.

## Aplicação — `packages/core/src/*/application`

### Casos de uso

| Caso de uso | Mudança |
| --- | --- |
| `updateQuestion` (quiz) | as quatro mudanças novas e os erros `QUIZ.*` acima |
| `applyTimeLimitToAll` (quiz) | nada: já usa `fitTimeLimit` (5 s vira 10 s no slider, CA-12) |
| `startGame` / `createAssignment` | nada: `toGameQuestion` copia a escala |
| `submitAnswer` / `answerAssignmentQuestion` | `value?` na entrada; `answers.add` grava `value` |
| `loadHostGameView` | `stage.slider` (abaixo) |
| `getPlayerSession` | `outcome.slider` na revelação e no placar |
| `assignment-play-view.ts` | `screen.question.slider` (pública) e, no resultado, `sliderResult` |
| `getReportQuestion` / `getReportParticipant` | `sliderAnswers` / `sliderValue` |
| `report-stats.ts` | `almostCorrect` conta como certa (RN-22, RN-35) |

**Visões**

```ts
// host-game-view.ts — HostStageView
slider: {
	scale: PublicSliderScale;                       // na fase de respostas (RN-30)
	results: {                                      // só na revelação (RN-31)
		answer: number;
		low: number; high: number;                  // marginRange
		counts: { value: number; count: number }[]; // só posições com respostas
	} | null;
} | null;

// get-player-session.ts — PlayerOutcome, na revelação e no placar (RN-28)
slider: { sent: number | null; answer: number; unit: string | null } | null;

// assignment-play-view.ts — QuestionResultView (RN-34)
sliderResult: { sent: number | null; answer: number; low: number; high: number; unit: string | null } | null;

// reports — QuestionDetailView (RN-36)
sliderAnswers: {
	answer: number; unit: string | null; low: number; high: number;
	average: number | null;                         // média dos valores enviados
	values: { value: number; count: number; correctness: Correctness }[]; // do mais perto ao mais longe
} | null;
// ParticipantAnswerView
sliderValue: number | null;
```

- `counts` tem uma entrada por posição com respostas, no máximo 200 (os jogadores). A tela desenha as outras posições como pontos a partir de `first`, `last` e `step`.
- Numa escala, `(last − first) ÷ step ≤ 100`, então são no máximo 101 colunas.

### Portas

Nenhuma porta nova. `AnswerRepository.add` e as leituras passam a gravar e devolver `value`. `ReportGameQuery` devolve `value` das respostas e `slider` da pergunta, via `parseStoredGameQuestion`.

**Fakes e builders:**

- os fakes já guardam a `Answer` inteira;
- `aSliderQuestion` / `asSlider` (quiz/testing);
- `aGameQuestion({ type: "slider", slider })`, `anAnswer({ value })` (game/testing);
- `aReportGame` com respostas numéricas (reports/testing).

## Adapters

### Banco — `packages/db`

- **`schema/quiz.ts`:** `question_type` ganha `slider`. O `content` jsonb guarda `{ min, max, answer, unit, answerMargin }` (ADR 0008: tipo novo não pede tabela).
- **`schema/game.ts`:**
  - `answer_correctness` ganha `almostCorrect`;
  - `game_answer.value` é `numeric(14, 2)`, nula, lida como `Number(...)`;
  - a escala vai no jsonb da `game_question`, que já é a cópia inteira.
- **Repositórios:**
  - `drizzle-answer-repository.ts`: `value` em `add` e nas leituras;
  - `drizzle-report-game-query.ts`: a contagem de acertos (linha do `eq(gameAnswer.correctness, "correct")`) vira `inArray(…, ["correct", "almostCorrect"])`, e `value` entra nas respostas.

### Real-time

Nenhum evento novo. `stage-changed` já carrega a `PublicStage`, que ganha `question.slider` com alguns números.

## API — `packages/api`

| Procedure | Mudança |
| --- | --- |
| `quiz.questions.update` | `change` aceita: `sliderNumber { field: "min" \| "max" \| "answer", value: string ≤ 20 \| null }`, `sliderAnswerAdded`, `sliderUnit { text: string ≤ 200 \| null }` e `answerMargin { margin: z.enum(ANSWER_MARGINS) }`. `type.remembered` aceita o conteúdo do slider |
| `quiz.questions.add` | `type` já é `z.enum(QUESTION_TYPES)` |
| `game.join.answer` / `game.assignment.answer` | `value?: z.number().finite()`; a regra (posição da escala) é do core |

- O número viaja como **texto** do editor até o core, para que o limite de 10 caracteres e a vírgula sejam decididos num lugar só (`parseSliderNumber`).
- A resposta do jogador viaja como **número**, porque o celular só manda posições.
- `container.ts` e `composition-root.ts` não mudam.

## UI — `apps/web` e `packages/ui`

### Comum

- **`lib/slider-format.ts`:**
  - `formatSliderNumber(n)` com `Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 })`, que dá "−100,3" e "2.000,03" (RN-04, RN-37);
  - `sliderColumns(scale)` lista as posições de `first` a `last`.
- **`components/game/slider-scale-ticks.tsx`:** a fileira de marcas, usada pelo editor, pelo anfitrião e pelo celular. Cada marca pode ser **cinza**, **azul** (na margem) ou **ativa**, e a faixa azul-clara fica atrás.

### Editor

- **Rótulos:** `quiz-labels.ts` ganha "Controle deslizante"; `question-type-icon.tsx` e `question-type-previews.ts` ganham o exemplo do Everest e a frase (RN-01). Os `Record` exigem as entradas.
- **`question-canvas.tsx`:** ramo `slider` → `slider-answers.tsx` (novo, `SliderAnswers`).
  - **Campos:**
    - "Mínimo" e "Máximo" são campos de texto com `inputMode="decimal"`;
    - o filtro do campo só deixa sinal, dígitos, um separador, 2 casas e 10 caracteres (CA-06);
    - o valor é salvo pelo autosave com a mudança `sliderNumber`.
  - **Sem resposta:** o botão "Adicionar resposta" fica no meio.
  - **Marcador:**
    - o número é editável, com o mesmo filtro;
    - "Adicionar unidade" abre o campo de unidade com o contador de 20;
    - arrastar com o ponteiro passa pelas posições de `sliderStep` contadas a partir do mínimo e grava a resposta ao soltar (CA-09).
  - **Abaixo da escala:** "Margem de resposta: X a Y" e "Valor da etapa: N", cada um com o "?" num `Tooltip`. Os números da margem são arredondados ao inteiro na tela (RN-12).
  - **Erros:** o contorno vermelho e as mensagens "Insira um valor máximo maior." / "Insira um valor mínimo menor." vêm dos motivos de `questionIssues`, com a regra de quando avisar da spec 004 (RN-16).
- **`question-properties-panel.tsx` / `question-properties-menu.tsx`:** "Margem de resposta" é um `Select` com título e explicação em cada item (RN-08). Se o `Select` de `@quizio/ui` não tiver item com descrição, a variante entra **na raiz do componente**. O tempo usa `timeLimitsFor`.
- **`question-list.tsx`:** a miniatura com a escala e o marcador (RN-17).
- **`lib/question-labels.ts`:** os três motivos novos.
- **`lib/quiz-error-messages.ts`:** os quatro códigos novos.
- **`lib/question-mutations.ts`:**
  - `changeKey` das mudanças novas (`slider:{field}`, `sliderUnit`, `answerMargin`);
  - o cache otimista usa `applyQuestionChange`, sem regra no cliente.

### Partida — celular

- **`components/game/player/slider-answer-input.tsx`** (novo, `SliderAnswerInput`):
  - **Marcador:** grande, com o número e a unidade, sobre a escala ampliada (um trecho das marcas, que corre sob o marcador ao arrastar com o ponteiro) (RN-24).
  - **Acessibilidade:** é um elemento `role="slider"` com `aria-valuemin`/`max`/`now` e `aria-valuetext` com a unidade. As setas movem uma posição e Page Up/Down movem dez (RN-25, RN-37).
  - **Botões "‹ {min}" e "{max} ›":** cada toque move uma posição. Segurar repete com `setInterval` a partir de 400 ms, até a ponta ou até soltar (`pointerup`/`pointerleave`/`pointercancel`). A repetição fica num hook `useHoldRepeat` testável com timers falsos.
  - **Mão animada:** aparece até o primeiro toque na escala, com estado local por pergunta e `motion-safe`.
  - **Enviar:** manda `{ value }`. Uma falha de conexão devolve os controles, como hoje.
- **`player-stage.tsx`:**
  - o slider aparece com e sem as perguntas nos dispositivos (RN-27);
  - "Quase correto" entra nos títulos do resultado;
  - `outcome.slider` mostra "Sua resposta: X" e "Resposta correta: Y" (RN-28).
- **`join-flow.tsx` / `routes/join.tsx`:** `JoinApi.answer` aceita `{ value }`.

### Partida — anfitrião

- **`stage-screens.tsx`:** na fase de respostas, a escala pequena com as pontas e o "?" que passeia. O passeio é uma animação CSS (`motion-safe`) e parado com movimento reduzido (RN-30).
- **`slider-results.tsx`** (novo, `SliderResults`, RN-31):
  - **Faixa:** branca, com rolagem horizontal (`overflow-x-auto`, arrastar com o ponteiro e roda do mouse), uma coluna por posição, barras com altura proporcional a `count` e pontos nas colunas vazias.
  - **Cores:** azul dentro de `[low, high]` e cinza fora; faixa azul-clara atrás da margem.
  - **Ao montar:** rola até a resposta (`scrollIntoView({ inline: "center" })`). Mostra o ✓ em cima da resposta e os números das pontas.
  - **Etiqueta da coluna escolhida:** número, unidade e "👤 N"; verde na resposta, azul na margem, vermelha fora. Passar o mouse, tocar ou usar o teclado (botões por coluna) escolhe outra.
  - **Barras:** sobem com `animate-bar-grow`.
  - **Funções puras** em `lib/slider-results.ts` (colunas, cores, altura relativa), testadas à parte.
  - "Mostrar mídia" / "Ocultar mídia" funciona como na 031 (RN-32).

### Atribuição

- **`play-question.tsx`:** usa `SliderAnswerInput`, com a escala da tela.
- **`play-result.tsx`:** ramo do slider com "Correto" / "Quase correto" / "Incorreto", o valor enviado e "A resposta correta é:" com a margem (RN-34).
- **`assignment-play-flow.tsx` / `routes/assignment.$gameId.tsx`:** `answer` aceita `{ value }`.

### Relatórios

- **`question-detail.tsx`:** com `sliderAnswers`, mostra:
  - a resposta, a unidade e a margem;
  - a média;
  - a lista dos valores com contagem, barra e "Correta" / "Quase correta" / "Incorreta" (RN-36).
- **`participant-detail.tsx`:** o valor enviado.
- **`lib/report-labels.ts`:** o rótulo de `almostCorrect`.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | componente | shows Controle deslizante and its preview in the picker | `question-type-picker.test.tsx` |
| CA-02 | domínio + componente | a blank slider has 0 to 50, no answer, 20 s and the medium margin; it is incomplete | `question.test.ts`, `question-issues.test.ts`, `slider-answers.test.tsx` |
| CA-03 | domínio + componente | adding the answer puts it in the middle; the editor shows margin and step | `question-change.test.ts`, `slider-answers.test.tsx` |
| CA-04 | shared | step 8 and the margins of each level for 100 to 900 | `packages/core/src/shared/domain/slider-scale.test.ts` |
| CA-05 | shared + componente | step 30 and 390 to 810 for −100.3 to 2000.03; 6 and 546 to 640 | `slider-scale.test.ts`, `slider-answers.test.tsx` |
| CA-06 | domínio + componente | accepts comma or dot, refuses a third decimal, letters and an 11th character | `question.test.ts` (`parseSliderNumber`), `slider-answers.test.tsx` |
| CA-07 | domínio + componente | an answer above the max is kept and marks the question incomplete with the max's message | `question-issues.test.ts`, `slider-answers.test.tsx` |
| CA-08 | domínio | an empty or inverted range is an invalid range | `question-issues.test.ts` |
| CA-09 | componente | dragging moves the answer by steps up to the max | `slider-answers.test.tsx` |
| CA-10 | domínio + componente | the unit shows under the number, up to 20 characters | `question-change.test.ts`, `slider-answers.test.tsx` |
| CA-11 | domínio + componente | slider time limits run from 10 s to 4 min | `question.test.ts`, `question-properties-panel.test.tsx` |
| CA-12 | aplicação | applying 5 s to all gives sliders 10 s | `apply-time-limit-to-all.test.ts` |
| CA-13 | domínio + lib | changing to quiz and back brings the scale back | `question-change.test.ts`, `question-type-change.test.ts` |
| CA-14 | domínio + repositório | copies and stores the scale | `question.test.ts` (`copyQuestion`), `drizzle-question-repository.test.ts` |
| CA-15 | shared + domínio | positions count from the answer; 102 and 636 are the ends; 601 and 100 are refused | `slider-scale.test.ts`, `answer.test.ts` |
| CA-16 | shared + domínio | 680 is almost correct and keeps the streak; 688 is wrong | `slider-scale.test.ts`, `standings.test.ts` |
| CA-17 | domínio | 1000, 900 and 600 points | `scoring.test.ts` |
| CA-18 | shared + domínio | maximum margin: the far end is almost correct and earns only the speed part | `slider-scale.test.ts`, `scoring.test.ts` |
| CA-19 | domínio | no points and double points | `scoring.test.ts` |
| CA-20 | domínio + aplicação | the public stage has the scale without the answer or the margin | `public-stage.test.ts`, `get-player-session.test.ts` |
| CA-21 | componente | starts near the middle; buttons move one position and repeat when held; arrows and Page keys; Enviar sends | `slider-answer-input.test.tsx`, `use-hold-repeat.test.ts` |
| CA-22 | aplicação | moved and not sent is no answer | `get-player-session.test.ts` |
| CA-23 | componente | the host sees the small scale with the ends | `stage-screens.test.tsx` |
| CA-24 | aplicação + lib + componente | results count per position; colors and the selected column's tag; scrolling to an end | `host-game-view.test.ts`, `slider-results.test.ts`, `slider-results.test.tsx` |
| CA-25 | aplicação + componente | an assignment without a timer gives full points; the result shows the margin | `answer-assignment-question.test.ts`, `play-result.test.tsx` |
| CA-26 | aplicação + repositório + componente | the report lists values, the average, and counts almost correct as right | `get-report-question.test.ts`, `report-stats.test.ts`, `drizzle-report-game-query.test.ts`, `report-details.test.tsx` |

**E2E** (`apps/web/e2e/slider.spec.ts`):

1. criar um quiz com um Controle deslizante (faixa, resposta, unidade);
2. salvar e jogar ao vivo com um jogador;
3. mover com os botões e enviar;
4. ver a distribuição no anfitrião e "Quase correto" ou "Correto" no celular.

## Dados e migração

- **`pnpm db:generate`** com:
  - `ALTER TYPE "question_type" ADD VALUE 'slider'`;
  - `ALTER TYPE "answer_correctness" ADD VALUE 'almostCorrect'`;
  - `game_answer.value numeric(14,2)`, nula.
- **Nada a preencher.** `parseStoredGameQuestion` trata a falta de `slider` como `null`.
- **Compatível com o código anterior.** O deploy aplica a migration antes do build. Os dois valores novos dos enums só aparecem quando o código novo cria um slider ou grava uma resposta quase correta, e a coluna nula é ignorada pelo código antigo.
- Como na 031, a migration só cria os valores de enum; nada nela os usa na mesma transação.

## Ajustes feitos na implementação

- **Nomes das visões.** A escala pública vai em `HostQuestionView.slider` e `PlayQuestionView.slider` (a mesma `PublicSliderScale` da `PublicStage`). Os resultados do anfitrião ficam em `HostStageView.sliderResults` (`sliderResultsOf`, em `game/domain/slider-results.ts`). Na atribuição, `QuestionResultView` ganhou `sliderValue` e `sliderAnswer`.
- **A escala da partida não usa `sliderScaleOf`.** `toGameQuestion` monta a escala ali mesmo, porque o contexto `game` reusa tipos do `quiz`, mas não funções.
- **Erro novo:** `QUIZ.INVALID_ANSWER_MARGIN` (`InvalidAnswerMarginError`), para uma margem fora da lista.
- **Acertos nos relatórios:** a regra ficou em `isRightAnswer` (`report-stats.ts`), com um `switch` exaustivo sobre `Correctness`.
- **"Margem de resposta":** a explicação de cada opção entra no `PropertySelect` do painel. Não foi preciso uma variante nova no `Select` de `@quizio/ui`. No menu compacto, ela vira um `ChoiceDialog`, como as outras propriedades.
- **Animações:** dois tokens novos em `globals.css`, `animate-slider-hint` (a mão do celular) e `animate-slider-wander` (o "?" do anfitrião).
- **Sem arrastar no editor:** a resposta só se digita no balão, e as marcas contam a partir do mínimo, de etapa em etapa, cada uma com o seu número ao passar o mouse. As posições do jogador continuam contando a partir da resposta (RN-10).
- **Sem `sliderAnswerAdded` (nem `QUIZ.SLIDER_RANGE_INVALID`).** "Adicionar resposta" só abre o balão; a primeira `sliderNumber` da resposta traz a faixa (`sliderRangeAround`, em `question-change.ts`).
- **Rascunho da Resposta curta:** o `JoinFlow` guarda o texto não enviado junto com a pergunta, para ele não reaparecer na seguinte.

## Riscos e decisões

- **Centésimos inteiros no shared kernel.** É a decisão central. Com números de ponto flutuante, `600 − 8 × 62` e "10% de 2100,33" dão casas fantasmas, e o servidor recusaria uma posição legítima. A escala nunca passa de 10¹² centésimos, então `number` basta (nada de `bigint`).
- **Lugar do código:** a matemática fica no **shared kernel**, como a normalização da 031, porque quiz, game e reports precisam da mesma regra (architecture.md, "Read models").
- **ADR:** proponho uma seção **"Atualização — Controle deslizante (spec 032)"** no ADR 0008, sem ADR novo. Ela registra três coisas:
  - o conteúdo no jsonb;
  - a escala no shared kernel em centésimos;
  - a coluna `game_answer.value`.
- **`almostCorrect` em todo lugar que conta acertos.** Hoje o relatório só conta `correct`, e a sequência conta `correct` e `partiallyCorrect`. Para não esquecer nenhum lugar, cada `switch` sobre `Correctness` vira exaustivo, e os testes de `report-stats` e `standings` cobrem o valor novo. Isso **não muda** como `partiallyCorrect` conta no relatório: é outro assunto, fora desta spec.
- **O celular sabe as posições.** `first` e `step` mostram que a resposta é uma das cerca de 100 posições, o mesmo que o próprio controle mostra. Nunca vai a resposta nem a margem. Fica registrado na spec (RN-23).
- **Arrastar no editor e no celular.** A precisão de um arrasto numa escala de 100 posições é ruim no celular. Por isso existem os botões com repetição e o teclado, e a escala do celular é ampliada (cada posição tem uma largura mínima de toque).
- **O valor no editor viaja como texto.** O limite de 10 caracteres é sobre o que foi digitado ("−100,3" tem 6). O core é quem conta, e o filtro do campo só evita digitar o que seria recusado.
- **CLAUDE.md** ganha, na implementação, um parágrafo do Controle deslizante: escala no shared kernel em centésimos, `almostCorrect`, `PublicSliderScale` sem a resposta e `game_answer.value`.
