---
spec: "031"
status: done # todo | in-progress | done
---

# Tarefas — 031 Resposta curta

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADRs: [0008](../../../docs/adr/0008-modelo-de-perguntas.md), [0009](../../../docs/adr/0009-partida-ao-vivo.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.

## Fase 1 — Domínio

- [x] **T01** `core/shared` — normalizar e agrupar respostas digitadas
  - Teste: `shared/domain/typed-answer.test.ts` › "ignores case and accents", "ignores the listed signs", "collapses and trims spaces", "drops emojis beside letters or digits", "keeps an emoji-only answer", "an answer of signs only normalizes to empty", "groups sent answers by normalized form, named after the first one sent", "accepted answers come first, also with no one sending them", "correct groups come before wrong ones, then by count"
  - Implementar: `shared/domain/typed-answer.ts` (`IGNORED_ANSWER_SIGNS`, `normalizeTypedAnswer`, `TypedAnswerGroup`, `groupTypedAnswers`)
  - Cobre: CA-11, CA-12 · RN-13, RN-24, RN-37

- [x] **T02** `core/quiz` — o tipo Resposta curta e os tempos por tipo
  - Teste: `quiz/domain/question.test.ts` › "a blank type answer has one empty accepted answer, 30 s and standard points", "type answer time limits run from 20 s to 4 min", "fits a time below the type's minimum to it", "parses stored accepted answers, tolerating missing or long ones", "copying a type answer copies its accepted answers", "a type answer with an empty main answer is blank"
  - Implementar: `quiz/domain/question.ts` (`QUESTION_TYPES`, `TypeAnswerQuestion`, `TypeAnswerContent`, `TYPE_ANSWER_MAX_LENGTH`, `MAX_ACCEPTED_ANSWERS`, `parseAcceptedAnswer`, `AcceptedAnswerTooLongError`, `timeLimitsFor`, `defaultTimeLimitFor`, `fitTimeLimit`, ramos em `blankContent`, `isBlankQuestion`, `parseStoredContent`, `questionContent`, `blankQuestion`); `quiz/testing/a-question.ts` (`aTypeAnswerQuestion`, `asTypeAnswer`)
  - Cobre: CA-02, CA-07, CA-10 · RN-01, RN-03, RN-06, RN-11

- [x] **T03** `core/quiz` — mudanças da Resposta curta
  - Teste: `quiz/domain/question-change.test.ts` › "writes an accepted answer at its position", "refuses an accepted answer over 20 characters", "adds accepted answers up to four", "refuses a fifth accepted answer", "removes an extra accepted answer", "never removes the main accepted answer", "refuses a time limit the type does not take", "changing to type answer raises the time to 20 s and starts blank", "changing back restores the remembered accepted answers", "accepted-answer changes do not apply to other types"
  - Implementar: `quiz/domain/question-change.ts` (`acceptedAnswerText`, `acceptedAnswerAdded`, `acceptedAnswerRemoved`, `requireTypeAnswer`, `TooManyAcceptedAnswersError`, `TimeLimitNotAllowedError`, `parseQuestionContent` exaustivo, `changeType` com `fitTimeLimit`)
  - Cobre: CA-03, CA-04, CA-05, CA-09 · RN-02, RN-03, RN-04, RN-07, RN-12

- [x] **T04** `core/quiz` — incompleta e versão jogável `[P]`
  - Teste: `question-issues.test.ts` › "a type answer without accepted answers is incomplete", "an accepted answer of signs only does not count", "a type answer with an accepted answer and a text is complete"; `quiz-version.test.ts` › "different accepted answers are different lists", "the same accepted answers are the same list", "a stored time outside the type falls back to its default"
  - Implementar: `question-issues.ts` (`noAcceptedAnswer`, `switch` exaustivo), `quiz-version.ts` (`sameContent` exaustivo, `parseVersionQuestions`); `accept-generated.ts` usa `defaultTimeLimitFor`
  - Cobre: CA-06 · RN-09, RN-10

- [x] **T05** `core/game` — a pergunta da partida e a resposta digitada
  - Teste: `game-question.test.ts` › "a type answer is copied with its filled accepted answers and no choices", "a stored game question without accepted answers reads as none"; `answer.test.ts` › "a typed answer equal to an accepted one after normalization is correct", "any accepted answer is correct", "one letter off is wrong", "an emoji-only answer matches only emojis", "refuses a type answer without text, over 20 characters or with choices", "refuses text for a choice question", "points of a right typed answer follow the speed formula", "reviewed points: right as if on arrival, wrong as zero"
  - Implementar: `game-question.ts` (`acceptedAnswers`, `choicesOf`, `toGameQuestion`, `parseStoredGameQuestion`), `answer.ts` (`AnswerResponse`, `Answer.text`, `Answer.reviewedAt`, `parseAnswerResponse`, `correctnessOf`, `answerPoints`, `reviewedPoints`); `testing/a-game-question.ts` (`anAnswer` com `text` e `reviewedAt`)
  - Cobre: CA-12, CA-13 · RN-13 a RN-16, RN-30

- [x] **T06** `core/game` — etiquetas e revisão `[P]`
  - Teste: `typed-answer-review.test.ts` › "Pedra is similar to Pedro", "Paulo is not similar to Pedro", "answers under 4 characters are never similar", "the reveal has every correct tag and the most sent wrong ones, 12 in all", "refuses changing an accepted answer", "refuses a key nobody sent", "keeps the changes to sent answers"
  - Implementar: `typed-answer-review.ts` (`isSimilarAnswer`, `REVEAL_TAG_LIMIT`, `revealTags`, `ReviewChange`, `parseReviewChanges`, `AnswerNotReviewableError`)
  - Cobre: CA-19a, CA-25, CA-26 · RN-23a, RN-27 a RN-29

- [x] **T07** `core/game` — a revisão no andamento e na reprodução automática
  - Teste: `game-progress.test.ts` › "a transition clears the review instants", "with review the results move on before the autoplay deadline"; `autoplay.test.ts` › "an open review leaves the results without a deadline", "closing the review restarts the countdown from the closing", "the token changes when the review closes"
  - Implementar: `game-progress.ts` (`reviewOpenedAt`, `reviewClosedAt`, `nextStage` com `review`), `autoplay.ts` (`autoAdvanceFrom`)
  - Cobre: CA-28 · RN-30a, RN-32

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T08** `core/quiz` — aplicar o tempo a todas
  - Teste: `apply-time-limit-to-all.test.ts` › "applying 10 s gives type answers 20 s and quizzes 10 s"; `update-question.test.ts` › "saves an accepted answer", "refuses a time the type does not take"; `add-question.test.ts` › "adds a blank type answer"
  - Implementar: `apply-time-limit-to-all.ts` (`fitTimeLimit` por pergunta)
  - Cobre: CA-02, CA-08 · RN-07

- [x] **T09** `core/game` — portas e fakes da revisão
  - Teste: `in-memory-answer-repository.test.ts` › "regrade rewrites correctness and points of the given answers and marks them reviewed", "regrade leaves the other answers alone"; `in-memory-game-repository.test.ts` › "saveReview writes the instants only while at from", "saveIfAt clears the review instants"
  - Implementar: `ports/answer-repository.ts` (`AnswerRegrade`, `regrade`), `ports/game-repository.ts` (`saveReview`), fakes
  - Cobre: CA-22, CA-28 · RN-30, RN-32

- [x] **T10** `core/game` — responder com texto
  - Teste: `submit-answer.test.ts` › "a typed answer equal to an accepted one scores by speed", "a typed answer is stored with its text", "refuses a typed answer to a choice question", "everyone answering a type answer closes the answers"
  - Implementar: `submit-answer.ts` (`parseAnswerResponse`, grava `text`)
  - Cobre: CA-13 · RN-14 a RN-16, RN-19

- [x] **T11** `core/game` — o que o anfitrião e o celular veem
  - Teste: `host-game-view.test.ts` › "while answering a type answer, the host gets no accepted answers", "the results of a type answer carry the reveal tags with counts", "reviewOpen tells an open review"; `get-player-session.test.ts` › "no accepted answer reaches the device before the results", "typed and not sent is a timeout", "a reviewed answer is told as reviewed with its new points"
  - Implementar: `host-game-view.ts` (`typedAnswers`, `reviewOpen`), `get-player-session.ts` (`outcome.reviewed`)
  - Cobre: CA-14, CA-17, CA-19 · RN-15, RN-20, RN-23, RN-31

- [x] **T12** `core/game` — abrir, fechar e listar a revisão
  - Teste: `open-answer-review.test.ts` › "opening holds the autoplay countdown", "opening twice keeps the first instant", "closing restarts the countdown", "refuses outside the results of a type answer", "refuses another owner's game"; `get-typed-answers.test.ts` › "lists accepted, similar and other answers with counts", "refuses a question that is not a type answer"
  - Implementar: `open-answer-review.ts` (`createOpenAnswerReview`, `createCloseAnswerReview`, `ReviewNotAvailableError`), `get-typed-answers.ts`
  - Cobre: CA-21, CA-24, CA-28, CA-29 · RN-27, RN-28, RN-32, RN-33

- [x] **T13** `core/game` — enviar a revisão
  - Teste: `review-typed-answers.test.ts` › "accepting an answer rescores everyone who sent it by their stored response time", "marking an answer wrong takes its points away", "moves to the scoreboard with the new totals", "on the last question it finishes the game with the new points", "passes the autoplay deadline", "refuses after advancing", "of two submits only one regrades", "refuses a change to an accepted answer", "publishes the stage after regrading"
  - Implementar: `review-typed-answers.ts` (`createReviewTypedAnswers`)
  - Cobre: CA-22, CA-23a, CA-25, CA-27 · RN-26, RN-29, RN-30, RN-30a, RN-33

- [x] **T14** `core/game` — a Resposta curta na atribuição `[P]`
  - Teste: `answer-assignment-question.test.ts` › "a right typed answer goes to the results with its points", "without the timer a right typed answer is worth the full points"; `get-assignment-play.test.ts` › "the results of a type answer carry the typed text and the accepted answers", "accepted answers never show while answering"
  - Implementar: `answer-assignment-question.ts`, `assignment-play-view.ts` (`typedText`, `acceptedAnswers`)
  - Cobre: CA-30 · RN-34, RN-35

- [x] **T15** `core/reports` — respostas digitadas no relatório `[P]`
  - Teste: `get-report-question.test.ts` › "a type answer lists the sent answers grouped, correct first, accepted ones with zero", "a reviewed answer counts as correct"; `get-report-participant.test.ts` › "shows what the participant typed"; `report-stats.test.ts` › "a type answer's accuracy counts correct answers"
  - Implementar: `report-game.ts` (`acceptedAnswers`, `text`), `get-report-question.ts` (`typedAnswers`), `get-report-participant.ts` (`typedText`), `testing/a-report-game.ts`, `testing/in-memory-report-store.ts`
  - Cobre: CA-31 · RN-36, RN-37

## Fase 3 — Adapters (repositórios, real-time, storage)

- [x] **T16** `db` — schema e migration
  - Teste: `drizzle-question-repository.test.ts` › "stores and reads a type answer with its accepted answers", "a stored time outside the type reads as its default"; `drizzle-quiz-version-repository.test.ts` › "a version keeps type answers"
  - Implementar: `schema/quiz.ts` (enum), `schema/game.ts` (`game_answer.text`, `game_answer.reviewed_at`, `game.review_opened_at`, `game.review_closed_at`), repositórios de pergunta e versão; `pnpm db:generate` (migration com `ALTER TYPE … ADD VALUE`, conferida à mão) e `pnpm -F @quizio/db db:push` no banco local
  - Cobre: CA-03, CA-10 · RN-03

- [x] **T17** `db` — respostas, revisão e andamento
  - Teste: `drizzle-game-play.test.ts` › "stores a typed answer with its text", "regrade rewrites the answers of one question and marks them reviewed", "saveReview writes only while at from", "saveIfAt clears the review instants", "a game question without accepted answers still reads"
  - Implementar: `drizzle-answer-repository.ts` (`text`, `reviewedAt`, `regrade`), `drizzle-game-repository.ts` (colunas, `saveIfAt`, `saveReview`), `drizzle-game-question-repository.ts`
  - Cobre: CA-22, CA-27, CA-28 · RN-30, RN-32

- [x] **T18** `db` — o relatório lê o texto `[P]`
  - Teste: `drizzle-report-game-query.test.ts` › "reads typed answers and accepted answers of a type answer question"
  - Implementar: `drizzle-report-game-query.ts`
  - Cobre: CA-31 · RN-37

Sem adapter novo nem mudança de real-time: não há `*.int.test.ts` a criar.

## Fase 4 — API (routers + composition root)

- [x] **T19** `api` — editor
  - Teste: `quiz-questions.test.ts` › "adds a type answer", "updates an accepted answer", "refuses a long accepted answer with its domain code", "changes a question to type answer with remembered content", "applying 10 s to all gives type answers 20 s"
  - Implementar: `routers/quiz-questions.ts` (`content` e `change` com os ramos novos)
  - Cobre: CA-02, CA-03, CA-04, CA-08 · RN-03, RN-07

- [x] **T20** `api` — partida e atribuição
  - Teste: `game.test.ts` › "a player answers a type answer with text", "refuses text and choices together", "the host opens, lists and submits a review", "refuses a review from someone else", "no accepted answer in the player's session before the results"; `assignment` › "a participant answers a type answer with text"
  - Implementar: `routers/game.ts` (`join.answer`, `assignment.answer`, `review.open`, `review.close`, `review.answers`, `review.submit`), `container.ts`
  - Cobre: CA-14, CA-22, CA-29, CA-30 · RN-15, RN-26, RN-33

## Fase 5 — UI (design system → componentes do app → rotas)

- [x] **T21** `web` — rótulos, ícone e prévia no seletor
  - Teste: `question-type-picker.test.tsx` › "offers Resposta curta after Verdadeiro ou falso", "shows the type's preview on hover and focus"; `question-labels.test.ts` › "names the missing accepted answer"
  - Implementar: `lib/quiz-labels.ts`, `components/editor/question-type-icon.tsx`, `lib/question-type-previews.ts`, `question-type-picker.tsx` (`QuestionTypePreview`), `lib/question-labels.ts`, `lib/quiz-error-messages.ts`
  - Cobre: CA-01, CA-06 · RN-01, RN-09

- [x] **T22** `web` — respostas aceitas no editor
  - Teste: `type-answer-answers.test.tsx` › "starts with the main answer and Adicionar outras respostas aceitas", "adds fields up to four, then hides Adicionar mais", "counts the characters left while editing", "stops at 20 characters", "removes an emptied extra field on blur", "hints Adicione uma resposta aceita"; `question-canvas.test.tsx` › "a type answer shows its accepted answers"; `question-list.test.tsx` › "a type answer shows one bar per accepted answer"
  - Implementar: `components/editor/type-answer-answers.tsx`, `question-canvas.tsx` (`switch`), `question-list.tsx` (`answerBars`), token `answer-teal` em `packages/ui/src/styles/globals.css` se faltar
  - Cobre: CA-02, CA-03, CA-04, CA-05, CA-06 · RN-03 a RN-05, RN-09, RN-11

- [x] **T23** `web` — tempos e cache do editor `[P]`
  - Teste: `question-properties-panel.test.tsx` › "a type answer offers times from 20 s"; `question-properties-menu.test.tsx` › idem; `editor-cache.test.ts` › "applying 10 s to all gives type answers 20 s"; `question-type-change.test.ts` › "remembers the accepted answers across type changes"
  - Implementar: `question-properties-panel.tsx`, `question-properties-menu.tsx`, `lib/editor-cache.ts` (`withTimeLimitForAll`), `lib/question-mutations.ts` (`changeKey`, ações das respostas aceitas, `addGeneratedQuestions` exaustivo)
  - Cobre: CA-07, CA-08, CA-09 · RN-06, RN-07

- [x] **T24** `web` — campo no celular
  - Teste: `typed-answer-input.test.tsx` › "Enviar is disabled while blank", "counts down from 20", "sends the trimmed text once, also with Enter", "gives the text back when it was not sent"; `player-stage.test.tsx` › "a type answer shows the field with and without questions on devices", "a reviewed answer says it was marked correct", "a reviewed answer says it was marked incorrect"
  - Implementar: `components/game/player/typed-answer-input.tsx`, `player-stage.tsx`, `join-flow.tsx` (`answer` com `text`), `routes/join.tsx`
  - Cobre: CA-15, CA-16, CA-17, CA-22 · RN-17 a RN-20, RN-31

- [x] **T25** `web` — anfitrião: respostas e revelação
  - Teste: `stage-screens.test.tsx` › "a type answer shows Jogadores, digitem a resposta! instead of choices"; `typed-answers-reveal.test.tsx` › "shows every tag, then only the correct ones with counts", "goes straight to the correct ones with reduced motion", "goes straight to the correct ones when mounted already in the results", "Mostrar mídia swaps the tags for the image"; `lib/typed-answers-reveal.test.ts` › "scatters tags the same way for the same question"
  - Implementar: `stage-screens.tsx`, `components/game/host/typed-answers-reveal.tsx`, `lib/typed-answers-reveal.ts`
  - Cobre: CA-18, CA-19, CA-19a, CA-20 · RN-21 a RN-25

- [x] **T26** `web` — anfitrião: revisão
  - Teste: `answer-review.test.tsx` › "lists correct, similar and other answers with counts", "marking moves the tag and leaves its place empty", "clicking twice puts it back and disables Enviar", "accepted answers do not move", "Enviar sends the changes", "Cancelar sends nothing", "a failure keeps the review open with the message"; `host-stage.test.tsx` › "no countdown while the review is open", "a new token after closing starts the countdown over", "Enviar shows the scoreboard that comes back"
  - Implementar: `components/game/host/answer-review.tsx`, `host-stage.tsx`, `routes/_auth/host.$gameId.tsx` (mutations e consulta), `lib/game-error-messages.ts`
  - Cobre: CA-21, CA-22, CA-23, CA-24, CA-25, CA-28 · RN-26 a RN-32

- [x] **T27** `web` — atribuição e relatório `[P]`
  - Teste: `play-question.test.tsx` › "a type answer shows the field"; `play-result.test.tsx` › "a type answer shows the typed text and the accepted answers"; `report-details.test.tsx` › "a type answer lists the sent answers with counts and marks", "the participant detail shows the typed text"
  - Implementar: `components/assignment/play/play-question.tsx`, `play-result.tsx`, `assignment-play-flow.tsx`, `routes/assignment.$gameId.tsx`, `components/reports/question-detail.tsx`, `participant-detail.tsx`
  - Cobre: CA-30, CA-31 · RN-34, RN-35, RN-37

## Fase 6 — E2E e fechamento

- [x] **T28** E2E — Resposta curta ao vivo e na atribuição
  - Teste: `apps/web/e2e/type-answer.spec.ts` › "the host accepts a similar typed answer and the scoreboard counts it", "a participant answers a type answer in an assignment"
  - Implementar: ajustes de `e2e/support.ts` (criar uma Resposta curta)
  - Cobre: CA-15, CA-19, CA-22, CA-30

- [x] **T29** Fechamento
  - `pnpm check` (Biome só nos arquivos alterados, `--line-ending=crlf`), `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, `pnpm test:e2e`
  - ADR 0008 (tipo novo e normalização no shared kernel) e ADR 0009 (seção "Atualização — revisão de respostas")
  - `CLAUDE.md` (parágrafo da Resposta curta), `docs/architecture.md` (pontos gravados que a revisão muda)
  - `spec.md` (status `done`, changelog; spec 010 RN-07 com a nota da alteração), `glossary.md` (status ✅), `roadmap.md` (✅, links do plano e das tarefas)

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T21 |
| CA-02 | T02, T08, T19, T22 |
| CA-03 | T03, T16, T19, T22 |
| CA-04 | T03, T19, T22 |
| CA-05 | T03, T22 |
| CA-06 | T04, T21, T22 |
| CA-07 | T02, T23 |
| CA-08 | T08, T19, T23 |
| CA-09 | T03, T23 |
| CA-10 | T02, T16 |
| CA-11 | T01 |
| CA-12 | T01, T05 |
| CA-13 | T05, T10 |
| CA-14 | T11, T20 |
| CA-15 | T24, T28 |
| CA-16 | T24 |
| CA-17 | T11, T24 |
| CA-18 | T25 |
| CA-19 | T11, T25, T28 |
| CA-19a | T06, T25 |
| CA-20 | T25 |
| CA-21 | T12, T26 |
| CA-22 | T09, T13, T17, T20, T24, T26, T28 |
| CA-23 | T26 |
| CA-23a | T13 |
| CA-24 | T12, T26 |
| CA-25 | T06, T13, T26 |
| CA-26 | T06 |
| CA-27 | T13, T17 |
| CA-28 | T07, T09, T12, T17, T26 |
| CA-29 | T12, T20 |
| CA-30 | T14, T20, T27, T28 |
| CA-31 | T15, T18, T27 |

Todos os 34 critérios (CA-01 a CA-31, mais CA-19a e CA-23a) aparecem em ao menos uma tarefa.
