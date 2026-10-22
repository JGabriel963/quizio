---
spec: "033"
status: approved # draft | approved
---

# Plano técnico — 033 Puzzle

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0008](../../../docs/adr/0008-modelo-de-perguntas.md), [0009](../../../docs/adr/0009-partida-ao-vivo.md), [0010](../../../docs/adr/0010-relatorios-como-leitura-da-partida.md), [0014](../../../docs/adr/0014-atribuicao-como-partida.md)

## Abordagem

O Puzzle cabe quase todo no que o Quiz já tem, porque **a resposta dele também é uma lista de ids de alternativas**:

- `game_answer.choice_ids` já é uma lista **ordenada**. Para o Puzzle, ela guarda **a ordem enviada**. Não há coluna nova nas respostas.
- A partida já sorteia posições de cor e forma para as alternativas do Quiz (`withShuffledChoices`, spec 012). O Puzzle usa o mesmo sorteio, **sempre**, com uma regra a mais: nunca sair numa ordem certa (RN-14).
- O celular e o anfitrião já recebem as alternativas com a forma e, com as perguntas nos dispositivos, com o texto. Sem o texto, os blocos do celular só têm a forma, que é o que a RN-20 pede.
- A atribuição já guarda uma ordem por participante (`Player.choiceOrder`, spec 030). O Puzzle passa a usá-la sempre, não só com "Ordem aleatória de respostas".

O que é novo:

1. **No quiz**, o conteúdo `{ items }`, com 4 posições de texto, e duas mudanças: o texto de uma posição e mover uma posição para outra.
2. **No game**, a ordem certa (`GameQuestion.correctOrder`), um ramo de correção que compara **os textos** na ordem enviada (por isso respostas repetidas valem nas duas posições, RN-09) e a contagem de acertos e erros da revelação.
3. **No web**, arrastar com `@dnd-kit/sortable`, que o app já usa na lista de perguntas. Ele tem teclado e anúncios para leitores de tela prontos (RN-05, RN-21, RN-32).

Não há revisão de respostas, nem correção nova (`correct` e `wrong` bastam), nem nada no ciclo da partida ou na reprodução automática.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Puzzle | `puzzle`, `PuzzleQuestion`, `PuzzleContent` | sim |
| Respostas do Puzzle (posições do editor) | `items` (`(string \| null)[]`, 4 posições), `PUZZLE_ITEM_COUNT` (4), `MIN_PUZZLE_ITEMS` (3) | sim |
| Ordem certa | `GameQuestion.correctOrder` (ids das alternativas) | sim |
| Ordem sorteada | as `choices` da `GameQuestion` em ordem de `shapeIndex`; na atribuição, `Player.choiceOrder` | reuso |
| Ordem enviada | `Answer.choiceIds` de um Puzzle | reuso |

## Domínio

### Quiz — `packages/core/src/quiz/domain`

**`question.ts`**

- `QUESTION_TYPES` ganha `"puzzle"`.
- O tipo:
  ```ts
  /** Up to 4 answers written in the right order; null is an empty slot (spec 033, RN-03). */
  export interface PuzzleQuestion extends QuestionBase {
  	type: "puzzle";
  	/** Always 4 slots, top to bottom: the right order (RN-03, RN-08). */
  	items: (string | null)[];
  }
  ```
  `PuzzleContent = Pick<PuzzleQuestion, "type" | "items">`.
- **As posições não têm id.** No editor, a cor e a forma são da posição (RN-04), e mover troca os textos de lugar (RN-05). O id só aparece na partida (abaixo).
- `blankContent("puzzle")` → `{ items: [null, null, null, null] }`.
- `parseStoredContent` é tolerante: completa ou corta para 4 posições, e o que não é texto vira `null`.
- `questionContent`, `isBlankQuestion` e `copyQuestion` ganham o ramo (`copyQuestion` copia a lista, CA-10).
- O texto passa por `parseChoiceText` (75 caracteres, CA-03): o mesmo limite e o mesmo erro (`QUIZ.CHOICE_TEXT_TOO_LONG`) das alternativas do Quiz.
- **Tempos:** `timeLimitsFor("puzzle")` = `TIME_LIMITS_SECONDS` a partir de 20; `defaultTimeLimitFor("puzzle")` = 60 (RN-10, RN-11, CA-07). Pelo seletor da captura, 45 e 90 s já existem na lista do Quiz.

**`question-change.ts`**

- `QuestionContentInput` ganha o ramo do Puzzle (para `type.remembered`).
- Mudanças novas, com `requirePuzzle`:
  - `{ kind: "puzzleItemText"; index: number; text: string | null }`: grava o texto já validado; `null` esvazia a posição.
  - `{ kind: "puzzleItemMoved"; from: number; to: number }`: tira o texto de `from` e o põe em `to`, e as posições do meio andam uma casa (o que o arrastar mostra, CA-04, CA-05). `from === to` não muda nada.
- Uma posição fora de 0 a 3 é `PuzzleItemNotFoundError`.
- `changeType`: indo para Puzzle sem conteúdo lembrado, recebe o em branco; o tempo passa por `fitTimeLimit`, de 10 para 20 s (RN-11, CA-09). As respostas não passam do Quiz para o Puzzle nem do Puzzle para o Quiz (RN-02).

**`question-issues.ts`**

| Issue | Quando | Texto na lista |
| --- | --- | --- |
| `notEnoughPuzzleItems` | menos de 3 posições com texto (RN-07, RN-08) | "Adicione no mínimo 3 respostas" |

Um texto só de espaços já chega como `null` por `parseChoiceText`, então "preenchida" é "não nula".

**`quiz-version.ts`**: `sameContent` compara as 4 posições na ordem; `parseVersionQuestions` usa o tempo do tipo.

**Erros de domínio**

| Classe | `code` | Quando |
| --- | --- | --- |
| `PuzzleItemNotFoundError` (`NotFoundError`) | `QUIZ.PUZZLE_ITEM_NOT_FOUND` | Posição fora de 0 a 3 em `puzzleItemText` ou `puzzleItemMoved` |

### Game — `packages/core/src/game/domain`

**`game-question.ts`**

- `GameQuestion.correctOrder: string[]`: os ids das alternativas na ordem certa; `[]` nos outros tipos. `parseStoredGameQuestion` trata a ausência como `[]` (linhas gravadas antes).
- `choicesOf` ganha o ramo do Puzzle: uma `GameChoice` por posição preenchida, de cima para baixo, com `id = choiceIdAt(slot)`, `shapeIndex` = a posição entre as preenchidas (0, 1, 2…) e `correct: true`. Assim, as três respostas nas posições 1, 2 e 4 viram uma pergunta de 3 respostas (RN-08, CA-06).
- `correctOrder` são esses ids, nessa ordem.
- `arrangeGameQuestions` **sempre** embaralha o Puzzle, com ou sem `randomizeAnswers` (RN-15), com `shuffledPuzzle` (abaixo). A ordem das alternativas na partida é a do `shapeIndex`, como hoje.

**`puzzle.ts`** (novo)

```ts
/** The texts in the order of the ids; an unknown id has no text. */
export function puzzleTexts(question: GameQuestion, ids: readonly string[]): string[];

/** Right only when, at every position, the text is the right one (RN-09, RN-16). */
export function isRightOrder(question: GameQuestion, ids: readonly string[]): boolean;

/**
 * An order of the ids that is not a right order (RN-14): the draw, or, when
 * it came out right, the draw turned by one place. Only all-equal texts
 * have no wrong order; they keep the editor's.
 */
export function wrongOrderOf(
	question: GameQuestion,
	ids: readonly string[],
	shuffle: <T>(items: readonly T[]) => T[],
): string[];

/** The ids as positions: shapeIndex is the place in `order` (RN-15). */
export function placedInOrder(question: GameQuestion, order: readonly string[]): GameChoice[];
```

- **Girar uma casa** depois de um sorteio certo é determinístico e sempre dá uma ordem errada quando os textos não são todos iguais: uma sequência de até 4 textos que fica igual girando uma casa tem todos os textos iguais. Com o `FixedShuffler` (que inverte), `["1", "2", "1"]` sai igual e vira `["2", "1", "1"]`, o que dá um teste direto do CA-12.
- A comparação é pelo **texto exato** gravado (já sem espaços nas pontas). Não usa a normalização da Resposta curta: o jogador não digita nada.

**`answer.ts`**

- `parseAnswerResponse` ganha o ramo do Puzzle: `choiceIds` precisa ser **uma permutação de todos os ids** da pergunta (nem a mais, nem a menos, nem repetido), sem `text` nem `value`. Senão, `InvalidAnswerError`.
- `gradeAnswer` ganha o ramo: `isRightOrder` → `correct` com `reviewedPoints(question, true, responseTimeMs)` (a fórmula de velocidade, RN-18), ou `wrong` com 0 (RN-16).
- O comentário de `Answer.choiceIds` passa a dizer: na ordem da pergunta, ou, num Puzzle, na ordem enviada.

**`player.ts`** — `newAssignmentParticipant`

- `choiceOrder` passa a existir quando há `randomizeAnswers` **ou** algum Puzzle. Para cada pergunta: Quiz com `randomizeAnswers` → sorteio como hoje; **Puzzle → `wrongOrderOf`** (RN-28); o resto → os ids na ordem.

**`public-stage.ts`**: nada muda. O Puzzle manda as alternativas como o Quiz, já na ordem sorteada, com o texto só com as perguntas nos dispositivos (RN-20). **`correctOrder` nunca entra** (RN-17, CA-14).

**`puzzle-results.ts`** (novo, como `slider-results.ts`)

```ts
/** The reveal of a puzzle (RN-26): the right order, and who got it right or wrong. */
export interface PuzzleResults {
	order: string[];   // correctOrder
	correct: number;   // answers graded correct
	wrong: number;     // answers graded wrong; no answer counts in neither
}
export function puzzleResultsOf(question: GameQuestion, answers: readonly Pick<Answer, "correctness">[]): PuzzleResults;
```

## Aplicação

### Casos de uso

| Caso de uso | Mudança |
| --- | --- |
| `updateQuestion` (quiz) | as duas mudanças novas e `QUIZ.PUZZLE_ITEM_NOT_FOUND` |
| `applyTimeLimitToAll` (quiz) | nada: já usa `fitTimeLimit` (CA-08) |
| `startGame` / `createAssignment` | nada: `arrangeGameQuestions` embaralha |
| `joinAssignment` | nada: `newAssignmentParticipant` desenha a ordem |
| `submitAnswer` / `answerAssignmentQuestion` | nada: `choiceIds` já viaja; a regra está em `parseAnswerResponse` e `gradeAnswer` |
| `loadHostGameView` | `stage.puzzleResults` na revelação |
| `assignment-play-view.ts` | `questionView`: num Puzzle, as alternativas vêm na ordem de `choiceOrder` com o `shapeIndex` da posição (`placedInOrder`); `resultView`: `puzzleResult` |
| `getReportQuestion` / `getReportParticipant` | `puzzleAnswers` / `puzzleOrder` |

**Visões**

```ts
// host-game-view.ts — HostStageView, só na revelação (RN-26)
puzzleResults: PuzzleResults | null;

// assignment-play-view.ts — QuestionResultView (RN-29)
puzzleResult: {
	sent: string[] | null;          // os textos na ordem enviada
	correct: string[];              // os textos na ordem certa
} | null;

// reports — QuestionDetailView (RN-31)
puzzleAnswers: {
	correctOrder: { text: string; shapeIndex: number }[];
	orders: { texts: string[]; count: number; correct: boolean }[]; // a certa primeiro, depois da mais enviada à menos
} | null;
// ParticipantAnswerView
puzzleOrder: string[] | null;     // os textos na ordem enviada
```

- No relatório, as ordens enviadas são **agrupadas pela sequência de textos**, e não de ids: com respostas repetidas, duas ordens de ids iguais em texto são a mesma resposta. Uma função pura em `reports/domain` faz o agrupamento (o contexto `reports` reusa os tipos do game, não as funções).
- O celular na revelação não ganha nada novo: "Correto", "Incorreto" ou "Tempo esgotado" (RN-23).

### Portas

Nenhuma porta nova e nenhuma mudança de assinatura. `game_question` já é um jsonb com a cópia inteira, e `ReportGameQuery` já devolve `choiceIds` e a pergunta por `parseStoredGameQuestion`.

**Fakes e builders:**

- `aPuzzleQuestion` / `asPuzzle` (quiz/testing);
- `aGameQuestion({ type: "puzzle", choices, correctOrder })` (game/testing);
- `aReportGame` com respostas de Puzzle (reports/testing).

## Adapters

### Banco — `packages/db`

- **`schema/quiz.ts`:** `question_type` ganha `puzzle` (vem de `QUESTION_TYPES`). O `content` jsonb guarda `{ items }` (ADR 0008: tipo novo não pede tabela).
- **`schema/game.ts`:** nada. `correctOrder` vai no jsonb da `game_question`; a ordem enviada vai em `choice_ids`; a ordem de cada participante vai em `choice_order`.
- **Repositórios:** nenhuma mudança de código esperada. Os testes de repositório confirmam que `choice_ids` volta **na ordem gravada** (o jsonb guarda a lista como veio) e que o conteúdo do Puzzle passa pelo `question`.

### Real-time

Nenhum evento novo. `stage-changed` já carrega a `PublicStage` com as alternativas.

## API — `packages/api`

| Procedure | Mudança |
| --- | --- |
| `quiz.questions.update` | `change` aceita `puzzleItemText { index: int 0–3, text: string ≤ 300 \| null }` e `puzzleItemMoved { from: int 0–3, to: int 0–3 }`. `type.remembered` aceita `{ type: "puzzle", items: (string \| null)[] ≤ 4 }` |
| `quiz.questions.add` | nada: `type` já é `z.enum(QUESTION_TYPES)` |
| `game.join.answer` / `game.assignment.answer` | nada: `choiceIds` já é aceito; a regra (permutação) é do core |

O limite de 75 caracteres é decidido no core (`parseChoiceText`); o zod só limita o tamanho do que chega. `container.ts` e `composition-root.ts` não mudam.

## UI — `apps/web` e `packages/ui`

### Comum

- **`components/game/puzzle-block.tsx`** (novo, `PuzzleBlock`): a faixa colorida com a forma à esquerda (`AnswerShape`, cor pela forma), o texto (opcional) e a alça ≡. É usada pelo celular, pelo anfitrião e pela atribuição. Ela não sabe arrastar; quem arrasta a envolve.
- **`lib/sortable.ts`** (novo): os sensores do `@dnd-kit` (ponteiro, toque com um pequeno atraso para não brigar com a rolagem, e teclado com `sortableKeyboardCoordinates`) e os **anúncios em português** para leitores de tela: "{texto} pego, posição 2 de 4", "{texto} movido para a posição 3 de 4", "{texto} solto na posição 3 de 4" (RN-32). A lista de perguntas do editor já usa o `@dnd-kit` e pode passar a usar os mesmos anúncios, se ainda não os tiver.

### Editor

- **Rótulos:** `quiz-labels.ts` ganha "Puzzle"; `question-type-icon.tsx` e `question-type-previews.ts` ganham o ícone, o exemplo dos países e a frase (RN-01). Os `Record` exigem as entradas.
- **`question-canvas.tsx`:** ramo `puzzle` → `puzzle-answers.tsx` (novo, `PuzzleAnswers`):
  - os 4 campos empilhados num `SortableContext` vertical, com a forma e a cor da **posição** (a coluna da forma fica fora do item arrastado, então não se move, RN-05);
  - o texto é um campo de várias linhas com o mesmo autosave das alternativas do Quiz (`puzzleItemText`) e o contador de 75 enquanto é editado (RN-04);
  - soltar um campo em outra posição envia `puzzleItemMoved` e reordena na hora (otimista, por `applyQuestionChange`);
  - o bloco arrastado usa `DragOverlay`, deslocado e acima dos outros, como na captura;
  - o aviso das 3 respostas fica embaixo (RN-06).
- **Dica do enunciado:** o campo do enunciado ganha, num Puzzle, o `Tooltip` "Adicione a ordem esperada…" enquanto tem o foco (RN-06).
- **`question-properties-panel.tsx` / `question-properties-menu.tsx`:** nada novo; o tempo usa `timeLimitsFor`.
- **`question-list.tsx`:** a miniatura com quatro barras empilhadas à direita (RN-13).
- **`lib/question-labels.ts`:** o motivo novo. **`lib/quiz-error-messages.ts`:** o código novo.
- **`lib/question-mutations.ts`:** `changeKey` das mudanças novas. `puzzleItemText:{index}` por posição; **`puzzleItemMoved` não é agrupado** (cada movimento é um pedido, na fila única do editor, depois dos textos pendentes daquela pergunta, para um texto não ser gravado na posição errada).

### Partida — celular

- **`components/game/player/puzzle-answer-input.tsx`** (novo, `PuzzleAnswerInput`):
  - o aviso "Arraste os blocos para os organizar na ordem certa.", os `PuzzleBlock` num `SortableContext` vertical e "Enviar" sempre habilitado (RN-19);
  - a ordem é estado local, começando na ordem recebida; "Enviar" manda `{ choiceIds }` nessa ordem (RN-22);
  - sem o texto (perguntas nos dispositivos desligado), os blocos têm só a forma (RN-20);
  - uma falha de conexão devolve os blocos **na ordem em que estavam**, sem voltar ao sorteio.
- **`player-stage.tsx` / `question-on-device.tsx`:** o Puzzle aparece com e sem as perguntas nos dispositivos, como o Controle deslizante. A ordem local é presa ao índice da pergunta, como o rascunho da Resposta curta, para não passar para a pergunta seguinte.
- **`join-flow.tsx`:** nada novo: `JoinApi.answer` já aceita `choiceIds`.

### Partida — anfitrião

- **`stage-screens.tsx`:** na fase de respostas, um Puzzle mostra as alternativas **empilhadas** com `PuzzleBlock` (sem alça), na ordem sorteada (RN-25), no lugar da grade do Quiz.
- **`puzzle-results.tsx`** (novo, `PuzzleResults`, RN-26):
  - à direita, os blocos na ordem certa, cada um com a forma e a cor da partida e o ✓; eles **deslizam** da ordem sorteada para a certa com `motion` (`layout`), e aparecem direto na ordem certa com movimento reduzido;
  - à esquerda, as duas barras, verde (acertos, ✓) e vermelha (erros, ✗), com `animate-bar-grow` e a contagem no pé;
  - "Mostrar mídia" / "Ocultar mídia" como na 031 (RN-27).

### Atribuição

- **`play-question.tsx`:** usa `PuzzleAnswerInput`, sempre com o texto (RN-28).
- **`play-result.tsx`:** ramo do Puzzle com "Correto" / "Incorreto", a ordem enviada e "A ordem certa é:" (RN-29).

### Relatórios

- **`question-detail.tsx`:** com `puzzleAnswers`, a ordem certa e a lista das ordens enviadas, cada uma com a contagem e "Correta" / "Incorreta" (RN-31).
- **`participant-detail.tsx`:** a ordem enviada, em uma linha ("Nilo → Amazonas → Yangtzé").

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | componente | shows Puzzle and its preview in the picker | `question-type-picker.test.tsx` |
| CA-02 | domínio + componente | a blank puzzle has 4 empty slots and 60 s and is incomplete; the editor shows the four placeholders, the shapes and the hint | `question.test.ts`, `question-issues.test.ts`, `puzzle-answers.test.tsx` |
| CA-03 | domínio + componente | a filled slot takes the position's color and the counter; a 76th character is refused | `question-change.test.ts`, `puzzle-answers.test.tsx` |
| CA-04 | domínio + componente | moving the third slot to the top shifts the others; dropping sends `puzzleItemMoved` | `question-change.test.ts`, `puzzle-answers.test.tsx` |
| CA-05 | componente | the keyboard moves a slot one place up | `puzzle-answers.test.tsx` |
| CA-06 | domínio | two filled slots are not enough; slots 1, 2 and 4 make a 3-answer question in that order | `question-issues.test.ts`, `game-question.test.ts` |
| CA-07 | domínio + componente | puzzle time limits run from 20 s to 4 min | `question.test.ts`, `question-properties-panel.test.tsx` |
| CA-08 | aplicação | applying 10 s to all gives puzzles 20 s | `apply-time-limit-to-all.test.ts` |
| CA-09 | domínio + lib | changing a 10 s quiz to puzzle gives empty slots and 20 s; going back brings both contents back | `question-change.test.ts`, `question-type-change.test.ts` |
| CA-10 | domínio + repositório | copies and stores the slots in order | `question.test.ts` (`copyQuestion`), `drizzle-question-repository.test.ts` |
| CA-11 | domínio | a drawn order that comes out right is turned by one place; the game's order is never a right one | `puzzle.test.ts`, `game-question.test.ts` |
| CA-12 | domínio | with "1", "1", "2" the draw is never right, and both orders of the two "1" are right | `puzzle.test.ts`, `answer.test.ts` |
| CA-13 | domínio | one swap is wrong with 0 points; the right order earns the speed points | `answer.test.ts` |
| CA-14 | domínio + aplicação | the public stage has the drawn choices and no right order | `public-stage.test.ts`, `get-player-session.test.ts` |
| CA-15 | aplicação + componente | the host and the device get the same order and shapes; Enviar starts enabled | `host-game-view.test.ts`, `puzzle-answer-input.test.tsx`, `stage-screens.test.tsx` |
| CA-16 | componente | without the texts the blocks have only shapes | `puzzle-answer-input.test.tsx` |
| CA-17 | componente | dragging and the keyboard reorder; Enviar sends the ids in the new order | `puzzle-answer-input.test.tsx` |
| CA-18 | aplicação | moved and not sent is no answer | `get-player-session.test.ts` |
| CA-19 | domínio + aplicação + componente | 3 right, 2 wrong, 1 without answer; the reveal lists the right order with the game's shapes | `puzzle-results.test.ts`, `host-game-view.test.ts`, `puzzle-results.test.tsx` |
| CA-20 | componente | Mostrar mídia | `puzzle-results.test.tsx` |
| CA-21 | domínio + aplicação + componente | each participant gets their own wrong order; the result shows the sent and the right order | `player.test.ts`, `assignment-play-view.test.ts`, `play-result.test.tsx` |
| CA-22 | aplicação + repositório + componente | the report groups orders by text, counts 3 of 6 right and shows a participant's order | `get-report-question.test.ts`, `get-report-participant.test.ts`, `drizzle-report-game-query.test.ts`, `report-details.test.tsx` |

Além disso: `parseAnswerResponse` recusa uma lista com um id a menos, a mais ou repetido; `drizzle-answer-repository.test.ts` confirma que `choice_ids` volta na ordem gravada.

**E2E** (`apps/web/e2e/puzzle.spec.ts`):

1. criar um quiz com um Puzzle de 3 respostas e trocar duas de lugar pela alça;
2. salvar e jogar ao vivo com um jogador;
3. ordenar os blocos no celular **pelo teclado** (o arrastar por ponteiro no Playwright é frágil) e enviar;
4. ver a revelação com a ordem certa e "Correto" no celular.

## Dados e migração

- **`pnpm db:generate`** com `ALTER TYPE "question_type" ADD VALUE 'puzzle'`.
- **Nada a preencher.** `parseStoredGameQuestion` trata a falta de `correctOrder` como `[]`.
- **Compatível com o código anterior.** O valor novo do enum só aparece quando o código novo cria um Puzzle.

## Ajustes feitos na implementação

- **Teclado próprio, não o sensor do `@dnd-kit`.** ↑ e ↓ na alça movem o bloco uma posição de uma vez (`keyboardMoveTarget`), com o anúncio em `blockMovedAnnouncement`; o `@dnd-kit` fica com o ponteiro e o toque (`useBlockSensors`). O sensor de teclado dele precisa de medidas que o jsdom não tem e pede Espaço para pegar e soltar.
- **`wrongOrderOf(question, shuffle)`** sorteia a partir de `question.correctOrder`; não recebe os ids à parte.
- **Resultado da atribuição:** `QuestionResultView.rightOrder` (ids); a ordem enviada já é `chosenIds`. A tela pega os textos e as formas das alternativas da própria pergunta.
- **Relatório:** `chosenChoices` devolve `[]` num Puzzle (as alternativas marcadas repetiriam todas, fora de ordem); a ordem do participante é `puzzleOrder`. A tela não lista as alternativas de um Puzzle.
- **Editor:** um movimento aparece na hora a partir de `applyQuestionChange` sobre os textos da tela, até o cache do editor trazer a pergunta nova; o `DragOverlay` não tem animação de soltar, porque o campo para onde ela voltaria foi substituído pelo movimento. O celular também usa um `DragOverlay`, para o bloco arrastado passar por cima dos outros.
- **Celular:** a ordem que não chegou ao servidor volta aos blocos por `orderDraft` no `JoinFlow`, como o rascunho da Resposta curta.

## Riscos e decisões

- **A ordem enviada em `choice_ids`.** Reaproveitar a coluna evita uma migration e já leva a resposta a todos os lugares que leem respostas (relatório, atribuição). O risco é algum código tratar `choiceIds` como conjunto e ordenar ou deduplicar. Hoje `parseAnswerChoices` devolve na ordem da pergunta, mas o Puzzle não passa por ele (ramo próprio), e `answerDistribution` só conta. O teste do repositório e o de `parseAnswerResponse` cuidam disso.
- **A comparação é por texto, não por id** (RN-09). Ela faz respostas repetidas valerem nas duas posições sem lista de ordens aceitas. Duas respostas que só diferem em maiúsculas são diferentes, como no editor.
- **Girar em vez de sortear de novo** (RN-14). Sortear até sair errado depende da sorte e não termina com um `Shuffler` de teste que sempre devolve o mesmo. Girar uma casa é determinístico, sempre termina e quase não muda a distribuição.
- **Sorteio sempre ligado no Puzzle.** `arrangeGameQuestions` e `newAssignmentParticipant` ganham um ramo que ignora `randomizeAnswers`. Verdadeiro ou falso continua nunca embaralhado.
- **Arrastar no celular.** O toque precisa conviver com a rolagem da página, por isso o sensor de toque tem um pequeno atraso e a alça ≡ ocupa a altura do bloco. O teclado e os anúncios do `@dnd-kit` cobrem a acessibilidade (RN-32), sem um segundo jeito de mover na tela.
- **Mover no editor e a fila de gravação.** O servidor reescreve a linha da pergunta inteira; por isso `puzzleItemMoved` entra na fila única de `question-mutations.ts` depois do texto pendente, e o cache otimista aplica o mesmo `applyQuestionChange`.
- **ADR:** proponho uma seção **"Atualização — Puzzle (spec 033)"** no ADR 0008 (o conteúdo `{ items }` e a ordem certa como `correctOrder` na cópia da partida) e uma nota no ADR 0009 (a ordem enviada em `choice_ids`), sem ADR novo.
- **CLAUDE.md** ganha, na implementação, um parágrafo do Puzzle: as posições sem id no editor, `correctOrder`, a comparação por texto, o sorteio que nunca acerta e a ordem enviada em `choiceIds`.
