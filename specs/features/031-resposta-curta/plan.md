---
spec: "031"
status: approved # draft | approved
---

# Plano técnico — 031 Resposta curta

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0008](../../../docs/adr/0008-modelo-de-perguntas.md), [0009](../../../docs/adr/0009-partida-ao-vivo.md), [0010](../../../docs/adr/0010-relatorios-como-leitura-da-partida.md), [0014](../../../docs/adr/0014-atribuicao-como-partida.md)

## Abordagem

A Resposta curta é o primeiro tipo cuja resposta **não é uma escolha entre alternativas**. Quase todo o caminho de uma resposta hoje passa por `choiceIds`: a cópia para a partida (`choicesOf`), a correção (`correctnessOf`), os pontos (`answerPoints`), a distribuição, a tela da atribuição e o relatório. O plano não cria um caminho paralelo. Ele **generaliza a resposta** para `{ choiceIds, text }` e acrescenta um ramo por tipo onde a correção é decidida:

1. **Quiz (autoria).** Um terceiro membro de `Question`, com as respostas aceitas no `content` jsonb (ADR 0008: tipo novo não pede tabela), e **tempos por tipo** (20 a 240 s, padrão 30). Hoje a lista de tempos é única e global.
2. **Normalização no shared kernel.** A mesma função decide se a pergunta está incompleta (quiz), se a resposta está certa (game) e como o relatório agrupa as respostas (reports). Os contextos não podem importar funções uns dos outros, então `normalizeTypedAnswer` e o agrupamento ficam em `core/shared`, como `normalizeSearchText`.
3. **Game.** A pergunta da partida leva as respostas aceitas, e a resposta grava o texto digitado. A comparação é feita no servidor quando a resposta chega (`correctness` e `points` gravados, como hoje).
4. **Revisão.** É o primeiro caso em que **pontos gravados mudam** (altera a spec 010, RN-07 e o ADR 0009 §6). A regra continua estreita: só o anfitrião, só na revelação daquela pergunta, e **enviar avança a partida**. Para que só um pedido regrave, o servidor primeiro avança com `saveIfAt` (de dois pedidos, um só passa) e só então regrava as respostas.
5. **Pausa da reprodução automática.** A partida guarda, junto do andamento, quando a revisão foi aberta e quando foi fechada (`reviewOpenedAt`, `reviewClosedAt`). Com a revisão aberta, a revelação não tem prazo; ao fechar, a contagem parte do fechamento. Continua sem temporizador no servidor.
6. **Atribuição e relatório** só ganham os campos novos (texto digitado, respostas aceitas) e um ramo de apresentação. Correção e pontos continuam vindo da linha da resposta.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Resposta curta | `typeAnswer`, `TypeAnswerQuestion` | sim |
| Respostas aceitas | `acceptedAnswers`, `TYPE_ANSWER_MAX_LENGTH` (20), `MAX_ACCEPTED_ANSWERS` (4) | sim |
| Tempos por tipo | `timeLimitsFor(type)`, `defaultTimeLimitFor(type)`, `fitTimeLimit(type, seconds)` | sim |
| Normalização da resposta | `normalizeTypedAnswer` | sim |
| Grupo de respostas digitadas | `TypedAnswerGroup`, `groupTypedAnswers` | sim |
| Resposta enviada | `AnswerResponse` (`choiceIds`, `text`) | sim |
| Respostas parecidas | `isSimilarAnswer` | sim |
| Revisar respostas | `reviewTypedAnswers`, `openAnswerReview`, `closeAnswerReview` | sim |
| Resposta revisada | `Answer.reviewedAt`, `PlayerOutcome.reviewed` | sim |

## Domínio

### Shared kernel — `packages/core/src/shared/domain/typed-answer.ts` (novo)

```ts
/** Signs Kahoot ignores when comparing typed answers (spec 031, RN-13 c). */
export const IGNORED_ANSWER_SIGNS: string; // "~`!@#$%^&*(){}[];:\"'<,.>?/\\|-_+="

/**
 * The form typed answers are compared in (RN-13): no case, no accents, none of
 * the ignored signs, spaces collapsed and trimmed; emojis dropped when the
 * answer has letters or digits. "" when nothing is left.
 */
export function normalizeTypedAnswer(text: string): string;

export interface TypedAnswerGroup {
	/** The normalized form, which identifies the group. */
	key: string;
	/** As the first player who sent it wrote it, or as the creator wrote it. */
	text: string;
	count: number;
	correct: boolean;
	/** One of the question's accepted answers: always correct (RN-29). */
	accepted: boolean;
}

/**
 * Accepted answers (even with 0) and sent answers, one group per normalized
 * form, correct ones first, then by count (RN-24, RN-27, RN-37).
 */
export function groupTypedAnswers(
	acceptedAnswers: readonly string[],
	answers: readonly { text: string; correct: boolean; receivedAt: Date }[],
): TypedAnswerGroup[];
```

Reutiliza `normalizeSearchText` (sem acento, minúsculas, espaços) e acrescenta os sinais e a regra dos emojis (`\p{Extended_Pictographic}` contra `[\p{L}\p{N}]`). Puro, sem dependência.

### Quiz — `packages/core/src/quiz/domain`

**`question.ts`**

- `QUESTION_TYPES = ["quiz", "trueFalse", "typeAnswer"]`.
- `TypeAnswerQuestion extends QuestionBase { type: "typeAnswer"; acceptedAnswers: (string | null)[] }`: de 1 a 4 posições, a primeira sempre presente (pode ser `null`, campo vazio). `TypeAnswerContent = Pick<…, "type" | "acceptedAnswers">`. A ordem é a do editor e dá a cor (RN-05).
- `blankContent("typeAnswer")` → `{ acceptedAnswers: [null] }`; `isBlankQuestion`, `parseStoredContent` (tolerante: lista ausente ou vazia vira `[null]`, textos longos são cortados com `truncateCharacters`), `questionContent`: ramo novo em cada `switch`.
- `parseAcceptedAnswer(raw)`: `parseLimitedText(raw, TYPE_ANSWER_MAX_LENGTH, …)` → `AcceptedAnswerTooLongError` (`QUIZ.ACCEPTED_ANSWER_TOO_LONG`).
- **Tempos por tipo** (RN-06, RN-07):

```ts
export function timeLimitsFor(type: QuestionType): readonly TimeLimitSeconds[]; // typeAnswer: 20…240
export function defaultTimeLimitFor(type: QuestionType): TimeLimitSeconds;       // typeAnswer: 30
/** The seconds the type accepts closest to the ones asked: the type's minimum when below it. */
export function fitTimeLimit(type: QuestionType, seconds: TimeLimitSeconds): TimeLimitSeconds;
```

  `blankQuestion(id, type)` usa `defaultTimeLimitFor(type)`. `parseTimeLimit` continua validando a lista global; quem aplica a uma pergunta confere o tipo.

**`question-change.ts`**

- `QuestionContentInput` ganha `{ type: "typeAnswer"; acceptedAnswers: (string | null)[] }`; `parseQuestionContent` passa a ser um `switch` exaustivo (hoje é `if/else`).
- Mudanças novas, com `requireTypeAnswer`:
  - `{ kind: "acceptedAnswerText"; index: number; text: string | null }`: escreve na posição (RN-03).
  - `{ kind: "acceptedAnswerAdded" }`: acrescenta uma posição vazia; com 4, `TooManyAcceptedAnswersError` (`QUIZ.TOO_MANY_ACCEPTED_ANSWERS`) (RN-04).
  - `{ kind: "acceptedAnswerRemoved"; index: number }`: remove uma posição extra (`index ≥ 1`); a principal nunca sai (RN-04). O editor a manda quando um campo extra fica vazio e perde o foco.
- `timeLimit`: recusa um tempo fora de `timeLimitsFor(question.type)` com `TimeLimitNotAllowedError` (`QUIZ.TIME_LIMIT_NOT_ALLOWED`).
- `changeType`: o tempo passa por `fitTimeLimit(novoTipo, …)` (RN-07). Indo para Resposta curta, sem conteúdo lembrado, o conteúdo é o em branco (RN-12).

**`question-issues.ts`**

- `QuestionIssue` ganha `"noAcceptedAnswer"`: nenhuma resposta aceita com `normalizeTypedAnswer(text) !== ""` (RN-09). `questionIssues` vira um `switch` exaustivo. `missingAnswerHints` e `missingAnswerCount` continuam só do Quiz.

**`quiz-version.ts`**

- `sameContent` vira `switch` exaustivo: Resposta curta compara a lista de respostas aceitas, na ordem.
- `parseVersionQuestions`: o tempo fora da lista do tipo cai para o padrão do tipo.

**`accept-generated.ts`**

- Sem mudança de comportamento: o assistente continua só com Quiz e Verdadeiro ou falso (fora de escopo). `buildQuestion` passa a usar `defaultTimeLimitFor`.

### Game — `packages/core/src/game/domain`

**`game-question.ts`**

- `GameQuestion.acceptedAnswers: string[]`: as preenchidas, como o criador escreveu; `[]` nos outros tipos. Numa Resposta curta, `choices: []` e `selection: "single"`.
- `choicesOf` ganha o ramo `typeAnswer` (`[]`); `toGameQuestion` copia `acceptedAnswers`.
- `parseStoredGameQuestion`: aceita a lista e a trata como `[]` quando ausente (linhas de `game_question` gravadas antes desta feature).
- `arrangeGameQuestions`: nada muda (só embaralha Quiz).

**`answer.ts`**

```ts
/** What a player sent: the marked choices, or the typed text (spec 031). */
export interface AnswerResponse { choiceIds: string[]; text: string | null }

export interface Answer {
	// …
	choiceIds: string[];
	/** The typed text of a Resposta curta, trimmed; null for the other types. */
	text: string | null;
	correctness: Correctness;
	points: number;
	/** When the host's review changed this answer (spec 031, RN-31); null otherwise. */
	reviewedAt: Date | null;
}

export function parseAnswerResponse(question: GameQuestion, raw: { choiceIds?: string[]; text?: string }): AnswerResponse;
export function correctnessOf(question: GameQuestion, response: AnswerResponse): Correctness;
export function answerPoints(question: GameQuestion, response: AnswerResponse, responseTimeMs: number): number;
/** Points of an answer the review marked: as if it had been right (or wrong) when it arrived (RN-30). */
export function reviewedPoints(question: GameQuestion, correct: boolean, responseTimeMs: number): number;
```

- `parseAnswerResponse` substitui `parseAnswerChoices`. Numa Resposta curta exige `text` com 1 a 20 caracteres depois de aparar (`characterCount`) e nenhum `choiceIds`; nos outros tipos, o contrário. Qualquer outra forma é `InvalidAnswerError` (`GAME.INVALID_ANSWER`).
- Resposta curta: `correct` quando `normalizeTypedAnswer(text)` é igual à forma normalizada de alguma resposta aceita (RN-14); senão `wrong`. Nunca `partiallyCorrect`.
- `answerDistribution` continua só das alternativas.

**`typed-answer-review.ts`** (novo)

```ts
/** At most 2 edits apart, normalized, and at least 4 characters long (RN-28). */
export function isSimilarAnswer(answerKey: string, correctKeys: readonly string[]): boolean;

/** The tags of the results animation: every correct group, then the most sent wrong ones, 12 in all (RN-23, RN-23a). */
export const REVEAL_TAG_LIMIT = 12;
export function revealTags(groups: readonly TypedAnswerGroup[]): TypedAnswerGroup[];

export interface ReviewChange { key: string; correct: boolean }
/** Refuses a change to an accepted answer's group (RN-29) or to a key nobody sent. */
export function parseReviewChanges(groups: readonly TypedAnswerGroup[], changes: readonly ReviewChange[]): ReviewChange[];
```

- A distância é a de Levenshtein sobre grafemas, parando ao passar de 2 (respostas têm no máximo 20 caracteres).

**`game-progress.ts`**

- `GameProgress` ganha `reviewOpenedAt: Date | null` e `reviewClosedAt: Date | null`. Elas valem só para a fase em que foram escritas e voltam a `null` em toda transição (`nextStage`, `closeAnswers`).
- `nextStage(game, { …, review?: boolean })`: com `review`, a revelação avança **sem conferir o prazo da reprodução automática** (como `skip` nas respostas). Só a revisão usa.

**`autoplay.ts`**

- `autoAdvanceFrom(game)`: na revelação com `reviewOpenedAt`, **não há prazo** (`null`, RN-32). Senão, conta do mais tarde entre `autoplaySince`, `phaseStartedAt` e `reviewClosedAt`. O `token` muda com o fechamento, e a tela recomeça os 5 s.

**Erros de domínio**

| Classe | `code` | Quando |
| --- | --- | --- |
| `AcceptedAnswerTooLongError` | `QUIZ.ACCEPTED_ANSWER_TOO_LONG` | Resposta aceita com mais de 20 caracteres (RN-03) |
| `TooManyAcceptedAnswersError` | `QUIZ.TOO_MANY_ACCEPTED_ANSWERS` | Quinta resposta aceita (RN-03) |
| `TimeLimitNotAllowedError` | `QUIZ.TIME_LIMIT_NOT_ALLOWED` | Tempo da lista global que o tipo não aceita (RN-06) |
| `ReviewNotAvailableError` | `GAME.REVIEW_NOT_AVAILABLE` | Revisar fora da revelação, depois de avançar ou numa pergunta que não é de Resposta curta (RN-26, CA-27) |
| `AnswerNotReviewableError` | `GAME.ANSWER_NOT_REVIEWABLE` | Mudar uma resposta aceita do editor, ou uma forma que ninguém enviou (RN-29) |

## Aplicação — `packages/core/src/*/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `updateQuestion` (quiz, alterado) | mudanças novas | igual | `QUIZ.ACCEPTED_ANSWER_TOO_LONG`, `QUIZ.TOO_MANY_ACCEPTED_ANSWERS`, `QUIZ.TIME_LIMIT_NOT_ALLOWED` | iguais |
| `applyTimeLimitToAll` (quiz, alterado) | igual | igual | iguais | cada pergunta recebe `fitTimeLimit(tipo, seconds)` (RN-07) |
| `submitAnswer` (game, alterado) | `choiceIds?` ou `text?` | igual | `GAME.INVALID_ANSWER` | `answers.add` grava `text` |
| `answerAssignmentQuestion` (game, alterado) | `choiceIds?` ou `text?` | `AssignmentPlayView` | `GAME.INVALID_ANSWER` | iguais |
| `openAnswerReview` (novo) | `{ ownerId, gameId, from: StageRef }` | `HostGameView` | `GAME.REVIEW_NOT_AVAILABLE` | `games.saveReview` |
| `closeAnswerReview` (novo) | `{ ownerId, gameId, from }` | `HostGameView` | iguais | `games.saveReview` |
| `getTypedAnswers` (novo) | `{ ownerId, gameId, questionIndex }` | `TypedAnswersView` | `GAME.REVIEW_NOT_AVAILABLE` | `answers.listByQuestion`, `gameQuestions.find` |
| `reviewTypedAnswers` (novo) | `{ ownerId, gameId, from, changes: ReviewChange[] }` | `HostGameView` (já no placar ou no pódio) | `GAME.REVIEW_NOT_AVAILABLE`, `GAME.ANSWER_NOT_REVIEWABLE` | `games.saveIfAt`, `answers.regrade`, `realtime` |
| `loadHostGameView` (alterado) | — | `stage.typedAnswers` na revelação | — | `answers.listByQuestion` (já lido para a distribuição) |
| `getPlayerSession` (alterado) | — | `outcome.reviewed` | — | iguais |
| `getReportQuestion` / `getReportParticipant` (alterados) | — | `typedAnswers`, `typedText` | — | iguais |

**`reviewTypedAnswers`, passo a passo** (RN-29, RN-30, RN-30a):

1. `loadLiveGame`, `requireOwnedGame`; a partida está em `from`, que é a revelação de uma Resposta curta. Senão, `ReviewNotAvailableError`.
2. Agrupa as respostas da pergunta (`groupTypedAnswers`) e confere as mudanças (`parseReviewChanges`).
3. **Avança primeiro**: `nextStage(game, { review: true })` → `games.saveIfAt(next, from)`. Se outro pedido avançou antes, nada é regravado e a resposta é a tela atual. Assim, a correção de uma pergunta nunca muda depois que outro pedido avançou (RN-26).
4. Regrava, das respostas daquela pergunta, as dos grupos que mudaram: `correctness` (`correct` ou `wrong`), `points = reviewedPoints(question, correct, responseTimeMs)` e `reviewedAt = now`, num só `answers.regrade`.
5. `publishStage` (placar ou pódio) e devolve a visão. Totais, sequências, posições, placar e pódio já saem das respostas a cada leitura (ADR 0009 §6), sem mais nada.

Entre os passos 3 e 4, uma leitura pode ver o placar com os pontos antigos por alguns milissegundos. O evento `stage-changed` só sai depois do passo 4, e todas as telas consultam de novo ao recebê-lo.

**`openAnswerReview` / `closeAnswerReview`**: gravam só `reviewOpenedAt` (abrir) ou `reviewOpenedAt = null` e `reviewClosedAt = now` (fechar) com `games.saveReview(gameId, from, review)`, uma atualização condicionada ao andamento estar em `from` (como `saveIfAt`), sem tocar no resto. Abrir o que já está aberto mantém o primeiro instante. A tela abre e fecha com ou sem a reprodução automática: assim uma segunda aba do anfitrião também não avança no meio da revisão.

**Visões**

```ts
// host-game-view.ts
export interface TypedAnswerTagView { text: string; count: number; correct: boolean }
// HostStageView, só na revelação de uma Resposta curta:
typedAnswers: {
	/** Every tag of the animation, correct and wrong (RN-23a). */
	tags: TypedAnswerTagView[];
} | null;
reviewOpen: boolean;

// get-typed-answers.ts — a lista inteira, só quando a revisão abre (RN-27)
export interface TypedAnswersView {
	groups: (TypedAnswerGroup & { similar: boolean })[];
}

// get-player-session.ts
PlayerOutcome.reviewed: boolean; // a resposta dele mudou na revisão (RN-31)

// assignment-play-view.ts
QuestionResultView.typedText: string | null;     // o que ele digitou (RN-35)
QuestionResultView.acceptedAnswers: string[];    // só em results e no histórico

// reports
ReportQuestion.acceptedAnswers: string[];
ReportAnswer.text: string | null;
QuestionDetailView.typedAnswers: { text: string; count: number; correct: boolean }[] | null; // RN-37
ParticipantAnswerView.typedText: string | null;
```

`PublicStage` **não muda**: o celular já recebe `question.type` e desenha o campo. As respostas aceitas nunca entram em `PublicStage`, `PlayerStageView` nem em `HostStageView` antes da revelação (RN-15, CA-14). Na atribuição, elas só aparecem em `results` e no histórico, como hoje as `rightIds`.

### Portas novas ou alteradas

```ts
// game/application/ports/answer-repository.ts
export interface AnswerRegrade { playerId: string; correctness: Correctness; points: number }
export interface AnswerRepository {
	// … existentes; add() grava também `text` e `reviewedAt: null`
	/** Rewrites correctness and points of these answers of one question, marking them reviewed. */
	regrade(gameId: string, questionIndex: number, regrades: AnswerRegrade[], reviewedAt: Date): Promise<void>;
}

// game/application/ports/game-repository.ts
export interface GameRepository {
	// … existentes; saveIfAt grava também reviewOpenedAt e reviewClosedAt (null numa transição)
	/** Writes the review instants alone, only while the game is at `from`. */
	saveReview(gameId: string, from: StageRef, review: { openedAt: Date | null; closedAt: Date | null }): Promise<boolean>;
}
```

Fakes: `InMemoryAnswerRepository.regrade`, `InMemoryGameRepository.saveReview`. Builders: `aTypeAnswerQuestion` / `asTypeAnswer` (quiz/testing), `aGameQuestion({ type: "typeAnswer", acceptedAnswers })` e `anAnswer({ text })` (game/testing), `aReportGame` com respostas digitadas (reports/testing).

## Adapters

### Banco — `packages/db`

- `schema/quiz.ts`: `question_type` ganha `typeAnswer`. O `content` jsonb guarda `{ acceptedAnswers }`, sem coluna nova. O padrão da coluna `time_limit_seconds` continua 20; o core sempre grava o tempo.
- `schema/game.ts`:
  - `game_answer.text` (`text`, nula) e `game_answer.reviewed_at` (`timestamptz`, nula);
  - `game.review_opened_at` e `game.review_closed_at` (`timestamptz`, nulas), lidas e gravadas com o andamento.
- Repositórios:
  - `drizzle-question-repository.ts` / `drizzle-quiz-version-repository.ts`: o tempo fora da lista do tipo cai no padrão do tipo.
  - `drizzle-answer-repository.ts`: `text`, `reviewedAt`; `regrade` com um `UPDATE … FROM (VALUES …)` por pergunta (até 200 linhas).
  - `drizzle-game-repository.ts`: as duas colunas no mapeamento, em `saveIfAt` e no novo `saveReview` (`UPDATE … WHERE question_index = ? AND phase = ?`).
  - `drizzle-report-game-query.ts`: `text` das respostas e `acceptedAnswers` da pergunta, via `parseStoredGameQuestion`.

### Real-time

| Canal | Evento | Payload | Publicado por (caso de uso) | Assinado por (tela) |
| --- | --- | --- | --- | --- |
| `game-{id}` | `stage-changed` (existente) | igual | `reviewTypedAnswers`, depois de regravar | anfitrião e celulares, que consultam de novo |

Nenhum evento novo. Abrir e fechar a revisão não avisa ninguém: só a tela do anfitrião mostra a revisão, e uma segunda aba vê o estado na próxima consulta (`reviewOpen`).

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `quiz.questions.update` (alterada) | mutation | sessão | `change` ganha `acceptedAnswerText { index: int 0–3, text: string ≤ 200 \| null }`, `acceptedAnswerAdded`, `acceptedAnswerRemoved { index }`; `type.remembered` aceita `{ type: "typeAnswer", acceptedAnswers: (string\|null)[] ≤ 4 }` | igual | os de quiz novos |
| `quiz.questions.add` (alterada) | mutation | sessão | `type` aceita `typeAnswer` (`z.enum(QUESTION_TYPES)`) | igual | — |
| `game.join.answer` (alterada) | mutation | segredo | `choiceIds?` ou `text?` (string ≤ 200) | igual | `GAME.INVALID_ANSWER` |
| `game.assignment.answer` (alterada) | mutation | segredo | idem | igual | idem |
| `game.review.open` | mutation | sessão | `{ gameId, from }` | `HostGameView` | `GAME.REVIEW_NOT_AVAILABLE` |
| `game.review.close` | mutation | sessão | `{ gameId, from }` | `HostGameView` | idem |
| `game.review.answers` | query | sessão | `{ gameId, questionIndex }` | `TypedAnswersView` | idem |
| `game.review.submit` | mutation | sessão | `{ gameId, from, changes: { key: string ≤ 200, correct: boolean }[] ≤ 200 }` | `HostGameView` | idem, `GAME.ANSWER_NOT_REVIEWABLE` |

O zod confere só a forma; o limite de 20 caracteres e a normalização são do core. Os casos de uso novos entram em `container.ts` com os mesmos adapters de `advanceGame`; `composition-root.ts` não muda.

## UI — `apps/web` e `packages/ui`

### Editor

- `lib/quiz-labels.ts`: `typeAnswer: "Resposta curta"`. `components/editor/question-type-icon.tsx`: o ícone do celular com o "T" e o teclado (os dois são `Record`, então o compilador aponta).
- `question-type-picker.tsx`: o terceiro cartão e a **prévia ao passar o mouse ou focar** (`QuestionTypePreview`), num `Popover` aberto por hover/foco ao lado do cartão, com o exemplo e a frase de cada tipo em `lib/question-type-previews.ts` (RN-01, CA-01).
- `question-canvas.tsx`: o ternário vira `switch`; `type-answer-answers.tsx` (novo, `TypeAnswerAnswers`):
  - o campo principal azul, grande;
  - "Adicionar outras respostas aceitas", o título "Outras respostas aceitas", os campos amarelo, verde e turquesa e "Adicionar mais";
  - o contador `20 − characterCount` enquanto o campo tem foco;
  - campo extra vazio ao perder o foco → `acceptedAnswerRemoved`;
  - o balão "Adicione uma resposta aceita" com a regra da spec 004 (RN-16a).
  
  Os campos não são alternativas (não têm forma), então não viram variante de `AnswerOption`: são classes do componente do app com os tokens `answer-blue`, `answer-yellow` e `answer-green`, e um token novo `answer-teal` em `globals.css` se ainda não existir.
- `question-properties-panel.tsx` / `question-properties-menu.tsx`: o tempo lista `timeLimitsFor(question.type)`.
- `question-list.tsx`: `answerBars` com uma barra por resposta aceita.
- `lib/question-labels.ts`: `noAcceptedAnswer` → "Resposta aceita ausente"; a dica "Adicione uma resposta aceita".
- `lib/question-mutations.ts`: `changeKey` das mudanças novas (`acceptedAnswer:{index}`); `addGeneratedQuestions` com `switch` exaustivo. `lib/editor-cache.ts`: `withTimeLimitForAll` usa `fitTimeLimit`.
- `lib/quiz-error-messages.ts`: os três códigos novos.

### Partida — celular

- `components/game/player/typed-answer-input.tsx` (novo, `TypedAnswerInput`): campo azul "Digite sua resposta aqui" com rótulo para leitores de tela, `maxLength` por grafemas (corta ao colar), contador e "Enviar" desabilitado em branco; Enter envia (RN-17).
  - Usado em `PlayerStage` com e sem "Mostrar perguntas nos dispositivos" (RN-18).
  - O campo rola para a vista quando o teclado abre.
  - Falha de conexão devolve o texto (RN-19).
- `join-flow.tsx` / `routes/join.tsx`: `JoinApi.answer` aceita `{ choiceIds } | { text }`.
- `player-stage.tsx`: com `outcome.reviewed`, o título vira "Sua resposta foi marcada como correta" / "… como incorreta" (RN-31).

### Partida — anfitrião

- `stage-screens.tsx`: na fase de respostas de uma Resposta curta, `QuestionStage` mostra a faixa "Jogadores, digitem a resposta!" no lugar de `StageChoices` (RN-22).
- `typed-answers-reveal.tsx` (novo, `TypedAnswersReveal`):
  - as etiquetas entram espalhadas e inclinadas;
  - depois de ~1,5 s as erradas saem (`AnimatePresence`), e as corretas se reúnem sob "As respostas corretas são:" com o selo "N ✓" (RN-23);
  - o ponto de partida e o de chegada são funções puras em `lib/typed-answers-reveal.ts` (posições e rotações sorteadas por uma semente estável, a chave da pergunta), como `lib/scoreboard-animation.ts`;
  - com movimento reduzido, ou quando a tela monta já na revelação (recarga, segunda aba), vai direto às corretas (RN-23a; ver Riscos).
- "Mostrar mídia" / "Ocultar mídia" alterna a imagem no lugar das etiquetas (RN-25).
- `answer-review.tsx` (novo, `AnswerReview`):
  - cobre a revelação; usa a consulta `game.review.answers`;
  - faixas "Respostas corretas" e "Respostas incorretas", o quadro "Parecidas com as respostas corretas", etiquetas com contagem;
  - marcar com contorno e ✓ e deixar o lugar vazio é estado local (RN-29);
  - "Enviar" desabilitado sem mudança; "Cancelar".
  
  Abrir chama `game.review.open`, Cancelar `game.review.close` e Enviar `game.review.submit`. Falha: "Não foi possível revisar as respostas." e a revisão fica aberta.
- `host-stage.tsx`: a reprodução automática já segue `stage.autoAdvance`. Com a revisão aberta ele vem `null` e não há contagem; o `token` novo depois de Cancelar recomeça os 5 s (RN-32). Enviar mostra a visão que volta (placar ou pódio).
- `routes/_auth/host.$gameId.tsx`: as três mutations e a consulta.

### Atribuição

- `play-question.tsx`: Resposta curta usa `TypedAnswerInput`.
- `play-result.tsx`: ramo da Resposta curta com "Correto"/"Incorreto", o texto digitado com a marca e "As respostas corretas são:" com as aceitas (RN-35).
- `assignment-play-flow.tsx` / `routes/assignment.$gameId.tsx`: `answer` aceita `{ text }`.

### Relatórios

- `question-detail.tsx`: com `typedAnswers`, a seção "Respostas" lista as respostas enviadas (texto, contagem, barra, "Correta"/"Incorreta"), no lugar das alternativas (RN-37). A lista de participantes mostra o texto.
- `participant-detail.tsx`: "Resposta enviada" mostra o texto com a marca.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | componente | shows Resposta curta and its preview on hover | `apps/web/src/components/editor/question-type-picker.test.tsx` |
| CA-02 | domínio + componente | a blank type answer has one empty accepted answer, 30 s and standard points; panel hides answer options | `packages/core/src/quiz/domain/question.test.ts`, `question-properties-panel.test.tsx` |
| CA-03 | domínio + repositório + componente | adds up to four accepted answers in order; they survive a reload | `question-change.test.ts`, `drizzle-question-repository.test.ts`, `type-answer-answers.test.tsx` |
| CA-04 | domínio + componente | refuses a 21-character accepted answer; shows the characters left | `question-change.test.ts`, `type-answer-answers.test.tsx` |
| CA-05 | domínio + componente | removes an emptied extra answer on blur, never the main one | `question-change.test.ts`, `type-answer-answers.test.tsx` |
| CA-06 | domínio | is incomplete without an accepted answer that survives normalization | `question-issues.test.ts` |
| CA-07 | domínio + componente | type answer time limits run from 20 s to 4 min | `question.test.ts`, `question-properties-panel.test.tsx` |
| CA-08 | aplicação + cache | applying 10 s to all gives type answers 20 s | `apply-time-limit-to-all.test.ts`, `editor-cache.test.ts` |
| CA-09 | domínio + lib | changing to type answer raises the time to 20 s and remembers each type's answers | `question-change.test.ts`, `question-type-change.test.ts` |
| CA-10 | domínio | copies accepted answers | `question.test.ts` (`copyQuestion`) |
| CA-11 | shared | ignores case, accents, spaces and signs, and emojis beside text | `packages/core/src/shared/domain/typed-answer.test.ts` |
| CA-12 | shared + domínio | an emoji-only answer counts | `typed-answer.test.ts`, `answer.test.ts` |
| CA-13 | aplicação | any accepted answer is right and scores by speed | `submit-answer.test.ts` |
| CA-14 | aplicação + API | no accepted answer reaches a device before the results | `get-player-session.test.ts`, `host-game-view.test.ts`, `game.test.ts` |
| CA-15 | componente | the field counts down from 20 and Enviar sends once | `typed-answer-input.test.tsx`, `player-stage.test.tsx` |
| CA-16 | componente | the field shows without questions on devices | `player-stage.test.tsx` |
| CA-17 | aplicação | typed and not sent is no answer | `get-player-session.test.ts` (timeout) |
| CA-18 | componente | the host sees "Jogadores, digitem a resposta!" and no choices | `stage-screens.test.tsx` |
| CA-19 | aplicação + componente | results tag every group, wrong ones leave, correct ones count | `host-game-view.test.ts`, `typed-answers-reveal.test.tsx` |
| CA-19a | domínio + componente | at most 12 tags, correct first; no animation after a reload | `typed-answer-review.test.ts`, `typed-answers-reveal.test.tsx` |
| CA-20 | componente | Mostrar mídia swaps the tags for the image | `typed-answers-reveal.test.tsx` |
| CA-21 | aplicação + componente | the review lists accepted, similar and other answers | `get-typed-answers.test.ts`, `answer-review.test.tsx` |
| CA-22 | aplicação + repositório + E2E | accepting rescores by the stored response time and moves to the scoreboard; the phone says it was marked correct | `review-typed-answers.test.ts`, `drizzle-game-play.test.ts`, `get-player-session.test.ts`, `apps/web/e2e/type-answer.spec.ts` |
| CA-23 | componente | clicking twice puts the tag back and disables Enviar | `answer-review.test.tsx` |
| CA-23a | aplicação | reviewing the last question goes to the podium with the new points | `review-typed-answers.test.ts` |
| CA-24 | aplicação + componente | cancelling changes nothing | `review-typed-answers.test.ts` (close), `answer-review.test.tsx` |
| CA-25 | domínio + componente | accepted answers cannot change lanes | `typed-answer-review.test.ts`, `answer-review.test.tsx` |
| CA-26 | domínio | Pedra is similar to Pedro, Paulo is not | `typed-answer-review.test.ts` |
| CA-27 | aplicação | refuses a review after advancing; of two submits only one regrades | `review-typed-answers.test.ts` |
| CA-28 | domínio + aplicação + componente | an open review has no deadline; closing restarts the 5 s | `autoplay.test.ts`, `open-answer-review.test.ts`, `host-stage.test.tsx` |
| CA-29 | API | refuses a review from someone else | `packages/api/src/routers/game.test.ts` |
| CA-30 | aplicação + componente | an assignment result shows the typed text and the accepted answers | `answer-assignment-question.test.ts`, `play-result.test.tsx` |
| CA-31 | aplicação + repositório + componente | the report lists sent answers grouped, with reviewed ones correct | `get-report-question.test.ts`, `drizzle-report-game-query.test.ts`, `report-details.test.tsx` |

E2E (`apps/web/e2e/type-answer.spec.ts`): criar um quiz com uma Resposta curta, salvar, organizar ao vivo com um jogador, digitar uma resposta parecida, revisar, aceitar e ver o placar com os pontos. Uma variação curta numa atribuição.

## Dados e migração

- `pnpm db:generate` com:
  - `ALTER TYPE "question_type" ADD VALUE 'typeAnswer'`;
  - `game_answer.text`, `game_answer.reviewed_at`, `game.review_opened_at`, `game.review_closed_at`, todas nulas.
- Nada a preencher: perguntas, versões e partidas existentes continuam válidas. `parseStoredGameQuestion` trata a falta de `acceptedAnswers` como `[]`.
- **Compatível com o código anterior** (deploy aplica a migration antes do build): colunas nulas que o código antigo ignora; o valor novo do enum só aparece quando o código novo cria uma Resposta curta.
- O Postgres não deixa usar um valor de enum na mesma transação em que foi criado. A migration só o cria, e nada nela o usa.

## Ajustes feitos na implementação

- A correção ficou em `gradeAnswer(question, response, ms)`, que devolve `correctness` e `points`; `correctnessOf` e `answerPoints` continuam, só para as alternativas, e os testes deles não mudaram.
- `openAnswerReview`, `closeAnswerReview` e `getTypedAnswers` ficaram num arquivo só, `answer-review.ts`, com `loadReviewableResults`; `reviewTypedAnswers` ficou em `review-typed-answers.ts`.
- `GameProgress.reviewOpenedAt`/`reviewClosedAt` são opcionais (ausente = nulo), para não mexer nas partidas e nos testes que montam o andamento.
- `QUIZ.ACCEPTED_ANSWER_NOT_FOUND` (`AcceptedAnswerNotFoundError`) entrou para a posição de resposta aceita que não existe.
- Os sinais ignorados contam como espaço ("São-Paulo" = "São Paulo"), para o CA-11 valer.
- O celular recebe o texto não enviado de volta pelo `JoinFlow` (`typedDraft`).

## Riscos e decisões

- **Pontos gravados passam a mudar, uma vez, pela revisão.** Altera a spec 010, RN-07 e o ADR 0009 §6. Proposta: uma seção **"Atualização — revisão de respostas (spec 031)"** no ADR 0009, sem ADR novo. Ela registra três coisas:
  - só a revisão regrava, só na revelação da pergunta, só o anfitrião;
  - **avança antes de regravar**, para que só um pedido regrave;
  - a correção depois disso é final.
- **Normalização no shared kernel**, e não no `quiz` ou no `game`, porque os três contextos precisam da mesma regra e não podem importar funções uns dos outros (architecture.md, "Read models"). Registrar na mesma atualização do ADR 0008 que acrescenta o tipo.
- **Tempos por tipo** mexem num ponto que todo o editor usa. Para não espalhar a regra, ela fica em três funções do core (`timeLimitsFor`, `defaultTimeLimitFor`, `fitTimeLimit`), usadas pelo servidor e pelo cache otimista. Os próximos tipos (Controle deslizante: 10 s; Escala: 30 s) só acrescentam linhas.
- **Animação depois de recarregar** (RN-23a): o servidor não diz há quanto tempo a revelação começou, e a animação é só apresentação. Decisão: a tela anima quando **viu a fase mudar para a revelação**. Se montar já nela (recarga, segunda aba), mostra direto as corretas. Isso fica num `useRef` do componente, sem dado novo no servidor.
- **Revisão com 200 jogadores**: a lista inteira vai só na consulta da revisão (até 200 grupos de até 20 caracteres, alguns KB); a revelação leva no máximo 12 etiquetas.
- **Cliques fora de ordem na revisão** (abrir/fechar de duas abas): `saveReview` é condicional à fase, e abrir o que já está aberto mantém o instante. O pior caso é a contagem recomeçar uma vez a mais.
- **Prévia no seletor** vale para os três cartões (RN-01); os textos dos tipos atuais são novos e ficam em `lib/question-type-previews.ts`.
- **CLAUDE.md** ganha, na implementação, um parágrafo da Resposta curta (como cada spec do jogo tem): tempos por tipo, `AnswerResponse`, normalização no shared kernel e a revisão que avança antes de regravar.
