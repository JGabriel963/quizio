---
spec: "032"
status: done # todo | in-progress | done
---

# Tarefas — 032 Controle deslizante

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADRs: [0008](../../../docs/adr/0008-modelo-de-perguntas.md), [0009](../../../docs/adr/0009-partida-ao-vivo.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.

## Fase 1 — Domínio

- [x] **T01** `core/shared` — a escala: etapa, posições e margem
  - Teste: `shared/domain/slider-scale.test.ts` ›
    - "the step is the range over 100 rounded up at its first digit, at least 1" (50 → 1, 540 → 6, 800 → 8, 2100.33 → 30)
    - "positions count from the answer within the range" (100 to 900, 8, 600 → 104 and 896; 100 to 640, 6 → 102 and 636)
    - "the min and the max are positions only when they fall on a step"
    - "the start is the position closest to the middle, the lower one on a tie"
    - "margin ranges of each level are clipped by the range" (560–640, 520–680, 440–760, 100–900; 546–640)
    - "the margin keeps the decimals of the range" (−100.3 to 2000.03 → 389.967 to 810.033)
    - "the maximum margin reaches the far end"
  - Implementar: `shared/domain/slider-scale.ts`:
    - `ANSWER_MARGINS`, `MARGIN_PERCENT`, `SliderScale`;
    - `sliderStep`, `firstPosition`, `lastPosition`, `isSliderPosition`, `startPosition`, `marginRange`;
    - a conta toda em centésimos inteiros.
  - Cobre: CA-04, CA-05, CA-15 · RN-09, RN-10, RN-11, RN-24

- [x] **T02** `core/shared` — correção e precisão
  - Teste: `slider-scale.test.ts` ›
    - "equal to the answer is correct"
    - "within the margin is almost correct, its edge included"
    - "past the margin is wrong"
    - "with no margin only the answer is right"
    - "precision is 1 at the answer and 0 at the margin's edge"
    - "with the maximum margin the far end is almost correct with precision 0"
  - Implementar: `slider-scale.ts` (`sliderCorrectness`, `sliderPrecision`)
  - Cobre: CA-16, CA-18 · RN-19, RN-20

- [x] **T03** `core/quiz` — o tipo Controle deslizante e seus números
  - Teste: `quiz/domain/question.test.ts` ›
    - "a blank slider has 0 to 50, no answer, no unit, the medium margin and 20 s"
    - "slider time limits run from 10 s to 4 min"
    - "fits 5 s to 10 s for a slider"
    - "parses a slider number with a comma or a dot"
    - "refuses a third decimal, letters, two separators and an 11th character"
    - "parses negative numbers"
    - "refuses a unit over 20 characters; an empty unit is none"
    - "parses stored slider content, tolerating bad numbers and an unknown margin"
    - "copying a slider copies its scale"
  - Implementar:
    - `quiz/domain/question.ts`:
      - `QUESTION_TYPES` com `slider`, `SliderQuestion`, `SliderContent`;
      - `SLIDER_NUMBER_MAX_LENGTH`, `SLIDER_UNIT_MAX_LENGTH`, `parseSliderNumber`, `parseSliderUnit`;
      - `InvalidSliderNumberError`, `SliderUnitTooLongError`;
      - os ramos em `blankContent`, `isBlankQuestion`, `parseStoredContent`, `questionContent`, `timeLimitsFor`, `defaultTimeLimitFor`, `copyQuestion`.
    - `quiz/testing/a-question.ts` (`aSliderQuestion`, `asSlider`).
  - Cobre: CA-02, CA-06, CA-11, CA-14 · RN-03, RN-04, RN-05, RN-06, RN-08, RN-13

- [x] **T04** `core/quiz` — mudanças do Controle deslizante
  - Teste: `quiz/domain/question-change.test.ts` ›
    - "writes the min, the max and the answer from typed text"
    - "changing the range never moves the answer"
    - "empties the min or the max, never the answer"
    - "adding the answer puts it in the middle of the range, rounded to 2 decimals"
    - "refuses adding the answer without a valid range"
    - "adding the answer again keeps it"
    - "writes and clears the unit"
    - "writes the answer margin"
    - "changing to slider starts blank with 10 s from 5 s"
    - "changing back restores the remembered scale"
    - "slider changes do not apply to other types"
  - Implementar: `quiz/domain/question-change.ts`:
    - as mudanças `sliderNumber`, `sliderAnswerAdded`, `sliderUnit` e `answerMargin`, com `requireSlider`;
    - `SliderRangeInvalidError`, `SliderAnswerRequiredError`;
    - o ramo do slider em `parseQuestionContent`.
  - Cobre: CA-03, CA-07, CA-10, CA-13 · RN-02, RN-06, RN-07, RN-14, RN-16, RN-18

- [x] **T05** `core/quiz` — incompleta e versão jogável `[P]`
  - Teste:
    - `question-issues.test.ts` ›
      - "a slider without an answer is incomplete"
      - "an empty or inverted range is an invalid range"
      - "an answer outside the range is out of range"
      - "a complete slider has a scale"
    - `quiz-version.test.ts` ›
      - "different scales are different lists"
      - "the same scale is the same list"
  - Implementar:
    - `question-issues.ts`: `noSliderAnswer`, `invalidSliderRange`, `sliderAnswerOutOfRange`, `sliderScaleOf`;
    - `quiz-version.ts`: `sameContent`, `parseVersionQuestions`.
  - Cobre: CA-02, CA-07, CA-08 · RN-16

- [x] **T06** `core/game` — pontos de precisão e velocidade `[P]`
  - Teste: `game/domain/scoring.test.ts` ›
    - "an exact slider answer within 500 ms earns 1000"
    - "an exact slider answer at the time limit earns 900"
    - "half precision within 500 ms earns 600"
    - "precision 0 earns only the speed part"
    - "double points double it and no points give 0"
    - "checks the response time like the other questions"
  - Implementar: `scoring.ts` (`calculateSliderScore`)
  - Cobre: CA-17, CA-18, CA-19 · RN-21

- [x] **T07** `core/game` — a pergunta da partida e a resposta numérica
  - Teste:
    - `game-question.test.ts` ›
      - "a slider is copied with its scale and unit, without choices"
      - "a stored game question without a scale reads as none"
    - `answer.test.ts` ›
      - "a slider takes a value that is a position of the scale"
      - "refuses a value off the positions, a value for a choice question and choices for a slider"
      - "grades the answer as correct, almost correct or wrong with its points"
  - Implementar:
    - `game-question.ts`: `slider`, `toGameQuestion`, `parseStoredGameQuestion`;
    - `answer.ts`: `CORRECTNESS` com `almostCorrect`, `AnswerResponse.value`, `Answer.value`, `parseAnswerResponse`, `gradeAnswer`;
    - `testing/a-game-question.ts`: `anAnswer({ value })`.
  - Cobre: CA-15, CA-16, CA-17 · RN-19, RN-21, RN-23

- [x] **T08** `core/game` — quase correta conta como acerto e a escala pública
  - Teste:
    - `standings.test.ts` › "an almost correct answer keeps the streak"
    - `public-stage.test.ts` ›
      - "a slider stage carries the public scale from the answers on, with or without questions on devices"
      - "the public scale has neither the answer nor the margin"
  - Implementar:
    - `standings.ts`;
    - `public-stage.ts`: `PublicSliderScale`, `question.slider`;
    - um `switch` exaustivo sobre `Correctness` onde houver `if`.
  - Cobre: CA-16, CA-20 · RN-22, RN-23, RN-24, RN-27

## Fase 2 — Aplicação (casos de uso + visões)

- [x] **T09** `core/quiz` — o tempo de 5 s aplicado a todas `[P]`
  - Teste: `apply-time-limit-to-all.test.ts` › "applying 5 s to all gives sliders 10 s"
  - Implementar: nada além de `fitTimeLimit` (confere que T03 basta)
  - Cobre: CA-12 · RN-14

- [x] **T10** `core/game` — responder ao vivo e na atribuição
  - Teste:
    - `submit-answer.test.ts` ›
      - "a slider answer is graded on receipt and stores its value"
      - "refuses a value that is not a position"
    - `answer-assignment-question.test.ts` › "a slider answer without the question timer earns full points when exact"
  - Implementar: `submit-answer.ts` e `answer-assignment-question.ts` (`value?`); os fakes de `AnswerRepository` guardam `value`
  - Cobre: CA-15, CA-17, CA-25 · RN-21, RN-26, RN-33

- [x] **T11** `core/game` — visões do anfitrião, do celular e da atribuição
  - Teste:
    - `host-game-view.test.ts` ›
      - "a slider's answers stage has the public scale"
      - "a slider's results count the answers per position with the margin range"
    - `get-player-session.test.ts` ›
      - "a slider's outcome has the value sent and the answer"
      - "an almost correct outcome says so"
      - "moved and not sent is no answer"
      - "the answer never reaches the device before the results"
    - `get-assignment-play.test.ts` › "a slider's result shows the value sent, the answer and the margin range"
  - Implementar:
    - `host-game-view.ts`: `stage.slider`;
    - `get-player-session.ts`: `outcome.slider`;
    - `assignment-play-view.ts`: `screen.question.slider`, `sliderResult`.
  - Cobre: CA-20, CA-22, CA-24, CA-25 · RN-23, RN-28, RN-30, RN-31, RN-34

- [x] **T12** `core/reports` — relatório do Controle deslizante `[P]`
  - Teste:
    - `report-stats.test.ts` ›
      - "almost correct answers count as right in a question's accuracy"
      - "and in a participant's"
    - `get-report-question.test.ts` › "a slider's detail lists the values sent, nearest first, with the average and the margin"
    - `get-report-participant.test.ts` › "shows the value a participant sent"
  - Implementar:
    - `report-game.ts`: `ReportAnswer.value`, `ReportQuestion.slider`;
    - `report-stats.ts`;
    - `report-view.ts`: `sliderAnswers`, `sliderValue`;
    - `testing/` com respostas numéricas.
  - Cobre: CA-26 · RN-22, RN-35, RN-36

## Fase 3 — Adapters

- [x] **T13** `db` — schema, migration e repositórios
  - Teste:
    - `drizzle-question-repository.test.ts` › "stores and reads a slider's scale"
    - `drizzle-answer-repository.test.ts` › "stores and reads an answer's value with its decimals"
    - `drizzle-game-play.test.ts` › "stores an almost correct answer"
    - `drizzle-report-game-query.test.ts` › "tallies almost correct answers as right and reads values"
  - Implementar:
    - `schema/quiz.ts`: `question_type` com `slider`;
    - `schema/game.ts`: `answer_correctness` com `almostCorrect`, `game_answer.value numeric(14,2)`;
    - `drizzle-answer-repository.ts`;
    - `drizzle-report-game-query.ts`: `inArray` para os acertos, `value`.
  - Depois:
    - `pnpm db:generate`; conferir que a migration só acrescenta;
    - `pnpm -F @quizio/db db:push` no banco local.
  - Cobre: CA-14, CA-26 · RN-03, RN-22

## Fase 4 — API

- [x] **T14** `api` — mudanças do editor e respostas numéricas
  - Teste: `routers/quiz.test.ts` e `routers/game.test.ts` ›
    - "updates a slider's min, answer, unit and margin"
    - "refuses an invalid slider number with its domain code"
    - "a player answers a slider with a value"
    - "the session never carries the slider's answer before the results"
  - Implementar:
    - `routers/quiz-questions.ts`: `sliderNumber`, `sliderAnswerAdded`, `sliderUnit`, `answerMargin`, `type.remembered`;
    - `routers/game.ts`: `value?` em `join.answer` e `assignment.answer`.
  - Cobre: CA-03, CA-06, CA-15, CA-20 · RN-04, RN-23

## Fase 5 — UI

- [x] **T15** `web` — rótulos, formato e cadastro do tipo `[P]`
  - Teste:
    - `lib/slider-format.test.ts` › "formats numbers the Brazilian way, with up to 2 decimals"
    - `question-type-picker.test.tsx` › "shows Controle deslizante after Resposta curta with its preview"
  - Implementar:
    - `lib/slider-format.ts`;
    - `quiz-labels.ts`, `question-type-icon.tsx`, `question-type-previews.ts`;
    - `question-labels.ts`: os três motivos;
    - `quiz-error-messages.ts`: os quatro códigos;
    - `api-types.ts`.
  - Cobre: CA-01 · RN-01, RN-04, RN-37

- [x] **T16** `web` — a escala do editor
  - Teste: `components/editor/slider-answers.test.tsx` ›
    - "a new slider shows 0, 50 and Adicionar resposta"
    - "adding the answer shows the margin and the step"
    - "shows step 30 and 390 to 810 for −100,3 to 2.000,03"
    - "the fields refuse letters, a third decimal and an 11th character"
    - "an answer above the max marks the max with its message"
    - "an answer below the min marks the min with its message"
    - "dragging the marker moves the answer by steps"
    - "the unit shows under the number"
  - Implementar:
    - `components/game/slider-scale-ticks.tsx`;
    - `components/editor/slider-answers.tsx`;
    - `question-canvas.tsx`: o ramo do slider;
    - `lib/question-mutations.ts`: `changeKey`.
  - Cobre: CA-02, CA-03, CA-05, CA-06, CA-07, CA-09, CA-10 · RN-06, RN-07, RN-12, RN-16

- [x] **T17** `web` — painel de propriedades e lista `[P]`
  - Teste:
    - `question-properties-panel.test.tsx` ›
      - "a slider offers 10 s to 4 min"
      - "the answer margin lists its five levels with their explanations"
    - `question-list.test.tsx` › "a slider's thumbnail shows the scale with its marker"
  - Implementar:
    - `question-properties-panel.tsx` e `question-properties-menu.tsx`: "Margem de resposta" (e, se preciso, um item com descrição no `Select` de `@quizio/ui`);
    - `question-list.tsx`.
  - Cobre: CA-02, CA-11 · RN-08, RN-13, RN-17

- [x] **T18** `web` — o controle do celular
  - Teste:
    - `lib/use-hold-repeat.test.ts` ›
      - "repeats while held and stops on release"
      - "stops at the end"
    - `components/game/player/slider-answer-input.test.tsx` ›
      - "starts at the position closest to the middle"
      - "the limit buttons move one position"
      - "arrows move one position and Page keys ten"
      - "announces the value with its unit"
      - "Enviar sends the value once"
  - Implementar: `lib/use-hold-repeat.ts`, `slider-answer-input.tsx` (escala ampliada, arrasto, mão animada)
  - Cobre: CA-21 · RN-24, RN-25, RN-26, RN-37

- [x] **T19** `web` — o slider na partida (celular)
  - Teste: `player-stage.test.tsx` ›
    - "a slider shows the control with and without questions on devices"
    - "the result says Quase correto"
    - "shows the value sent and the right answer"
  - Implementar: `player-stage.tsx`, `join-flow.tsx`, `routes/join.tsx` (`answer` com `{ value }`)
  - Cobre: CA-21, CA-22, CA-24 · RN-26, RN-27, RN-28

- [x] **T20** `web` — o anfitrião: respostas e revelação
  - Teste:
    - `lib/slider-results.test.ts` › "builds one column per position with its count, color and height"
    - `stage-screens.test.tsx` › "the host sees the small scale with its ends while players answer"
    - `slider-results.test.tsx` ›
      - "opens on the answer with its green tag and count"
      - "choosing a column outside the margin shows a red tag"
      - "shows the numbers of the ends"
      - "Mostrar mídia swaps the chart for the image"
  - Implementar: `lib/slider-results.ts`, `components/game/host/slider-results.tsx`, `stage-screens.tsx`
  - Cobre: CA-23, CA-24 · RN-29, RN-30, RN-31, RN-32

- [x] **T21** `web` — atribuição e relatórios `[P]`
  - Teste:
    - `play-question.test.tsx` › "a slider shows the control"
    - `play-result.test.tsx` › "a slider result shows the value sent, the answer and the margin"
    - `report-details.test.tsx` ›
      - "a slider's detail lists values with the average"
      - "a participant's slider answer shows its value"
  - Implementar:
    - `play-question.tsx`, `play-result.tsx`, `assignment-play-flow.tsx`, `routes/assignment.$gameId.tsx`;
    - `question-detail.tsx`, `participant-detail.tsx`;
    - `report-labels.ts`: `almostCorrect`.
  - Cobre: CA-25, CA-26 · RN-33, RN-34, RN-36

## Fase 6 — E2E e fechamento

- [x] **T22** E2E — Controle deslizante de ponta a ponta
  - Teste: `apps/web/e2e/slider.spec.ts` ›
    - "creates a slider, plays it live and sees the distribution"
    - "an assignment shows the slider's result"
  - Cobre: CA-02, CA-03, CA-21, CA-24, CA-25

- [x] **T23** Fechamento
  - `pnpm check` (Biome nos arquivos mudados, CRLF), `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, `pnpm test:e2e` do tipo
  - Atualizar `spec.md` (status `done`, changelog), `glossary.md` (status ✅), `roadmap.md` (032 ✅)
  - ADR 0008: seção "Atualização — Controle deslizante (spec 032)"
  - `CLAUDE.md`: parágrafo do Controle deslizante
  - Cobre: todos

## Cobertura dos CAs

| CA | Tarefas |
| --- | --- |
| CA-01 | T15 |
| CA-02 | T03, T05, T16, T17, T22 |
| CA-03 | T04, T14, T16, T22 |
| CA-04 | T01 |
| CA-05 | T01, T16 |
| CA-06 | T03, T14, T16 |
| CA-07 | T04, T05, T16 |
| CA-08 | T05 |
| CA-09 | T16 |
| CA-10 | T04, T16 |
| CA-11 | T03, T17 |
| CA-12 | T09 |
| CA-13 | T04 |
| CA-14 | T03, T13 |
| CA-15 | T01, T07, T10, T14 |
| CA-16 | T02, T07, T08 |
| CA-17 | T06, T07, T10 |
| CA-18 | T02, T06 |
| CA-19 | T06 |
| CA-20 | T08, T11, T14 |
| CA-21 | T18, T19, T22 |
| CA-22 | T11, T19 |
| CA-23 | T20 |
| CA-24 | T11, T19, T20, T22 |
| CA-25 | T10, T11, T21, T22 |
| CA-26 | T12, T13, T21 |
