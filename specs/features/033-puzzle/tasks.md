---
spec: "033"
status: done # todo | in-progress | done
---

# Tarefas — 033 Puzzle

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADRs: [0008](../../../docs/adr/0008-modelo-de-perguntas.md), [0009](../../../docs/adr/0009-partida-ao-vivo.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.

## Fase 1 — Domínio

- [x] **T01** `core/quiz` — o tipo Puzzle e as suas posições
  - Teste: `quiz/domain/question.test.ts` ›
    - "a blank puzzle has four empty slots and 60 seconds"
    - "puzzle time limits run from 20 seconds to 4 minutes"
    - "stored puzzle content is completed or cut to four slots"
    - "copying a puzzle copies its slots in order"
  - Implementar: `question.ts`:
    - `"puzzle"` em `QUESTION_TYPES`, `PuzzleQuestion`, `PuzzleContent`, `PUZZLE_ITEM_COUNT`, `MIN_PUZZLE_ITEMS`;
    - os ramos de `blankContent`, `blankQuestion`, `parseStoredContent`, `questionContent`, `isBlankQuestion`, `copyQuestion`;
    - `timeLimitsFor` / `defaultTimeLimitFor`;
    - `aPuzzleQuestion` / `asPuzzle` em `quiz/testing`.
  - Os `switch` exaustivos e os `Record` do core apontam o resto; cada um ganha o ramo mínimo (sem regra nova) para o typecheck passar.
  - Cobre: CA-02, CA-07, CA-10 · RN-03, RN-10

- [x] **T02** `core/quiz` — escrever e mover as respostas
  - Teste: `question-change.test.ts` ›
    - "puzzleItemText writes a slot and empties it with null"
    - "puzzleItemText refuses a 76th character"
    - "puzzleItemMoved takes a slot to another place and shifts the ones between" (3º para o 1º; 1º para o 4º)
    - "moving a slot to its own place changes nothing"
    - "a slot outside 0 to 3 is not found"
    - "changing a 10 s quiz to puzzle gives empty slots and 20 s, and back brings the choices"
  - Implementar: `question-change.ts` (`requirePuzzle`, as duas mudanças, `PuzzleItemNotFoundError` com `QUIZ.PUZZLE_ITEM_NOT_FOUND`, o ramo de `QuestionContentInput` e de `changeType`)
  - Cobre: CA-03, CA-04, CA-09 · RN-02, RN-03, RN-05, RN-11

- [x] **T03** `core/quiz` — pergunta incompleta e versão jogável
  - Teste: `question-issues.test.ts` ›
    - "a puzzle with two filled slots does not have enough answers"
    - "three filled slots with an empty one between are enough"
  - Teste: `quiz-version.test.ts` › "puzzles with the same slots in another order differ"
  - Implementar: `question-issues.ts` (`notEnoughPuzzleItems`), `quiz-version.ts` (`sameContent`, tempo do tipo)
  - Cobre: CA-06 · RN-07, RN-08

- [x] **T04** `core/game` — a ordem certa na cópia da partida
  - Teste: `game-question.test.ts` ›
    - "a puzzle becomes one choice per filled slot, top to bottom, with its right order"
    - "slots 1, 2 and 4 make a three-answer puzzle"
    - "a stored game question without a right order reads as none"
  - Implementar: `game-question.ts` (`correctOrder`, o ramo de `choicesOf`, `parseStoredGameQuestion`); `aGameQuestion` aceita `correctOrder`
  - Cobre: CA-06 · RN-08

- [x] **T05** `core/game` — ordem certa e sorteio que nunca acerta
  - Teste: `game/domain/puzzle.test.ts` ›
    - "the right order is right and one swap is wrong"
    - "equal texts are right in either place" ("1", "1", "2")
    - "a draw that comes out right is turned by one place" (`FixedShuffler` com "1", "2", "1" → "2", "1", "1")
    - "a draw that comes out wrong is kept"
    - "all-equal texts keep the editor's order"
    - "placing in an order gives each choice the shape of its place"
  - Implementar: `game/domain/puzzle.ts` (`puzzleTexts`, `isRightOrder`, `wrongOrderOf`, `placedInOrder`)
  - Cobre: CA-11, CA-12 · RN-09, RN-14, RN-15, RN-16

- [x] **T06** `core/game` — a partida sempre embaralha o Puzzle
  - Teste: `game-question.test.ts` ›
    - "a puzzle is shuffled even without random answers, never in a right order"
    - "true/false is still never shuffled"
  - Implementar: `arrangeGameQuestions` com `wrongOrderOf` e `placedInOrder`
  - Cobre: CA-11, CA-15 · RN-14, RN-15

- [x] **T07** `core/game` — receber e corrigir a resposta
  - Teste: `answer.test.ts` ›
    - "a puzzle takes every choice once, in any order"
    - "a puzzle refuses a missing, an extra or a repeated id, a text and a value"
    - "the right order is correct with the speed points"
    - "one swap is wrong with no points"
    - "both orders of equal texts are correct"
  - Implementar: `answer.ts` (ramos de `parseAnswerResponse` e `gradeAnswer`; comentário de `Answer.choiceIds`)
  - Cobre: CA-12, CA-13 · RN-16, RN-18

- [x] **T08** `core/game` — cada participante com a sua ordem
  - Teste: `player.test.ts` ›
    - "an assignment participant gets a wrong order for each puzzle, without random answers"
    - "quiz questions keep their order without random answers"
  - Implementar: `newAssignmentParticipant` em `player.ts`
  - Cobre: CA-21 · RN-28

- [x] **T09** `core/game` — a revelação e o que o celular recebe
  - Teste: `puzzle-results.test.ts` › "counts right and wrong answers, not the missing ones" (3, 2 e 1 sem resposta)
  - Teste: `public-stage.test.ts` › "a puzzle sends the drawn choices and never the right order"
  - Implementar: `game/domain/puzzle-results.ts` (`PuzzleResults`, `puzzleResultsOf`)
  - Cobre: CA-14, CA-19 · RN-17, RN-20, RN-26

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T10** `core/quiz` — `updateQuestion` e "Aplicar a todas"
  - Teste: `update-question.test.ts` › "writes and moves puzzle slots"; `apply-time-limit-to-all.test.ts` › "applying 10 s to all gives puzzles 20 s"
  - Implementar: nada esperado além do T02; ajustar se o teste mostrar o contrário
  - Cobre: CA-04, CA-08 · RN-11

- [x] **T11** `core/game` — a partida ao vivo com um Puzzle
  - Teste: `host-game-view.test.ts` ›
    - "the host gets the puzzle's choices in the drawn order with their shapes"
    - "the results of a puzzle have the right order and the right and wrong counts"
  - Teste: `get-player-session.test.ts` ›
    - "a player's stage has the same order and shapes and no right order"
    - "a puzzle reordered and not sent is no answer"
  - Teste: `submit-answer.test.ts` › "a puzzle answer is stored in the sent order"
  - Implementar: `host-game-view.ts` (`stage.puzzleResults`)
  - Cobre: CA-13, CA-14, CA-15, CA-18, CA-19 · RN-15, RN-17, RN-22, RN-25, RN-26

- [x] **T12** `core/game` — a atribuição com um Puzzle
  - Teste: `assignment-play-view.test.ts` ›
    - "each participant sees the puzzle in their own order with the shapes of its places"
    - "the result of a puzzle has the sent order and the right one"
  - Teste: `answer-assignment-question.test.ts` › "a puzzle without a timer gives full points"
  - Implementar: `assignment-play-view.ts` (`questionView` com `placedInOrder`, `resultView` com `puzzleResult`)
  - Cobre: CA-21 · RN-28, RN-29

- [x] **T13** [P] `core/reports` — as ordens enviadas
  - Teste: `reports/domain/puzzle-orders.test.ts` › "groups sent orders by their texts, the right one first, then by count"
  - Teste: `get-report-question.test.ts` › "a puzzle lists the right order and the sent orders"; `get-report-participant.test.ts` › "a participant's puzzle answer shows the sent order"; `report-stats.test.ts` › "a puzzle counts only right orders" (3 de 6)
  - Implementar: `reports/domain/puzzle-orders.ts`, `get-report-question.ts` (`puzzleAnswers`), `get-report-participant.ts` (`puzzleOrder`); `aReportGame` com respostas de Puzzle
  - Cobre: CA-22 · RN-30, RN-31

## Fase 3 — Adapters (repositórios, real-time, storage)

- [x] **T14** `db` — o tipo novo e a ordem gravada
  - Teste: `drizzle-question-repository.test.ts` › "stores a puzzle's slots in order"
  - Teste: `drizzle-answer-repository.test.ts` › "keeps a puzzle's choice ids in the sent order"
  - Teste: `drizzle-report-game-query.test.ts` › "reads a puzzle's right order and sent orders"
  - Implementar: `pnpm db:generate` (`ALTER TYPE "question_type" ADD VALUE 'puzzle'`); nenhum código de repositório esperado
  - Cobre: CA-10, CA-22

## Fase 4 — API (routers + composition root)

- [x] **T15** `api` — as mudanças do Puzzle no editor
  - Teste: `routers/quiz.test.ts` ›
    - "updates and moves puzzle slots"
    - "refuses a slot outside 0 to 3 with QUIZ.PUZZLE_ITEM_NOT_FOUND"
    - "remembers a puzzle's slots on a type change"
  - Teste: `routers/game.test.ts` › "a player answers a puzzle with the ids in order"
  - Implementar: `routers/quiz.ts` (`puzzleItemText`, `puzzleItemMoved`, `type.remembered`)
  - Cobre: CA-04, CA-09, CA-13

## Fase 5 — UI (design system → componentes do app → rotas)

- [x] **T16** [P] `web` — rótulos, seletor e lista
  - Teste: `question-type-picker.test.tsx` › "shows Puzzle and its preview"; `question-list.test.tsx` › "a puzzle shows N Puzzle and four stacked bars"
  - Implementar: `quiz-labels.ts`, `question-type-icon.tsx`, `question-type-previews.ts`, `question-labels.ts`, `quiz-error-messages.ts`, a miniatura em `question-list.tsx`
  - Cobre: CA-01, CA-06 · RN-01, RN-07, RN-13

- [x] **T17** [P] `web` — arrastar e anúncios em português
  - Teste: `lib/sortable.test.ts` › "announces pick, move and drop with the position out of the total"
  - Implementar: `lib/sortable.ts` (sensores e anúncios); a lista de perguntas passa a usá-los se ainda não os tiver
  - Cobre: RN-32

- [x] **T18** `web` — o editor do Puzzle
  - Teste: `puzzle-answers.test.tsx` ›
    - "shows the four placeholders, the shapes and the hint"
    - "a filled slot takes the position's color and shows the counter"
    - "does not take a 76th character"
    - "the keyboard moves a slot one place up and sends puzzleItemMoved"
  - Teste: `question-type-change.test.ts` › "remembers the puzzle's slots"
  - Teste: `question-properties-panel.test.tsx` › "puzzle time limits start at 20 seconds"
  - Implementar: `puzzle-answers.tsx`, o ramo em `question-canvas.tsx`, a dica no enunciado, `changeKey` e a fila em `question-mutations.ts`
  - Cobre: CA-02, CA-03, CA-04, CA-05, CA-07, CA-09 · RN-03 a RN-06

- [x] **T19** `web` — o bloco e a resposta no celular
  - Teste: `puzzle-answer-input.test.tsx` ›
    - "shows the hint, the blocks in the received order and an enabled Enviar"
    - "without the texts the blocks have only shapes"
    - "the keyboard reorders and Enviar sends the ids in the new order"
    - "a lost answer gives the blocks back in the order they were"
  - Teste: `player-stage.test.tsx` › "the puzzle order does not carry over to the next question"
  - Implementar: `components/game/puzzle-block.tsx`, `player/puzzle-answer-input.tsx`, os ramos em `player-stage.tsx` e `question-on-device.tsx`
  - Cobre: CA-15, CA-16, CA-17 · RN-19 a RN-22

- [x] **T20** `web` — a tela do anfitrião
  - Teste: `stage-screens.test.tsx` › "a puzzle shows the choices stacked in the drawn order"
  - Teste: `puzzle-results.test.tsx` ›
    - "shows the right order with the game's shapes and ticks"
    - "shows the right and wrong bars"
    - "Mostrar mídia shows the image"
  - Implementar: o ramo em `stage-screens.tsx`, `host/puzzle-results.tsx` (deslizar com `motion`, direto com movimento reduzido)
  - Cobre: CA-15, CA-19, CA-20 · RN-24 a RN-27

- [x] **T21** `web` — atribuição e relatório
  - Teste: `play-question.test.tsx` › "a puzzle shows the blocks with their texts"; `play-result.test.tsx` › "a puzzle result shows the sent and the right order"
  - Teste: `report-details.test.tsx` › "a puzzle question lists the sent orders"; "a participant's puzzle answer shows the order"
  - Implementar: `play-question.tsx`, `play-result.tsx`, `question-detail.tsx`, `participant-detail.tsx`
  - Cobre: CA-21, CA-22 · RN-28 a RN-31

## Fase 6 — E2E e fechamento

- [x] **T22** E2E do Puzzle
  - Teste: `apps/web/e2e/puzzle.spec.ts` › "creates a puzzle, plays it live and reveals the right order":
    - criar um Puzzle de 3 respostas e trocar duas de lugar;
    - salvar e jogar com um jogador;
    - ordenar pelo teclado e enviar;
    - ver a ordem certa no anfitrião e "Correto" no celular.
  - Cobre: CA-02, CA-04, CA-13, CA-17, CA-19

- [x] **T23** Fechamento
  - `pnpm check`, `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, `pnpm test:e2e` (com `--workers=1` se instável)
  - Atualizar `spec.md` e `tasks.md` (status `done`, changelog), `glossary.md`, `roadmap.md`, a seção "Atualização — Puzzle" no ADR 0008, a nota no ADR 0009 e o parágrafo do Puzzle no `CLAUDE.md`

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T16 |
| CA-02 | T01, T18, T22 |
| CA-03 | T02, T18 |
| CA-04 | T02, T10, T15, T18, T22 |
| CA-05 | T18 |
| CA-06 | T03, T04, T16 |
| CA-07 | T01, T18 |
| CA-08 | T10 |
| CA-09 | T02, T15, T18 |
| CA-10 | T01, T14 |
| CA-11 | T05, T06 |
| CA-12 | T05, T07 |
| CA-13 | T07, T11, T15, T22 |
| CA-14 | T09, T11 |
| CA-15 | T06, T11, T19, T20 |
| CA-16 | T19 |
| CA-17 | T19, T22 |
| CA-18 | T11 |
| CA-19 | T09, T11, T20, T22 |
| CA-20 | T20 |
| CA-21 | T08, T12, T21 |
| CA-22 | T13, T14, T21 |
