---
spec: "030"
status: done # todo | in-progress | done
---

# Tarefas — 030 Atribuir quiz 2/2 — Jogar a atribuição

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0014](../../../docs/adr/0014-atribuicao-como-partida.md) (seção "Andamento por participante")
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.

## Fase 1 — Domínio

- [x] **T01** `core/game` — o andamento do participante
  - Teste: `game/domain/participant-progress.test.ts` › "a participant starts answering the first question at once", "with characters on, a participant starts ready", "the deadline is the start plus the time limit", "without the question timer there is no deadline", "settling past the deadline goes to the results at the deadline", "settling before the deadline changes nothing", "next goes ready → answering → results → scoreboard → next question", "next after the last scoreboard is finished", "finishing keeps where the participant was"
  - Implementar: `game/domain/participant-progress.ts` (`PARTICIPANT_PHASES`, `ParticipantProgress`, `firstProgress`, `answerDeadline`, `settleProgress`, `nextProgress`, `finishProgress`, `ParticipantNotAtStageError`)
  - Cobre: CA-05, CA-08, CA-09, CA-10, CA-19, CA-20 · RN-05, RN-06, RN-09, RN-12, RN-21

- [x] **T02** `core/game` — o jogador de uma atribuição `[P]`
  - Teste: `game/domain/player.test.ts` › "an assignment participant starts at the first question, with progress", "with random answers each Quiz question gets a drawn order", "true/false is never shuffled", "without random answers there is no order of its own", "a live player has no progress"
  - Implementar: `game/domain/player.ts` (`Player.progress`, `Player.choiceOrder`, `newAssignmentParticipant`); `testing/a-game.ts` (`aPlayer` com `progress: null`, `choiceOrder: null`)
  - Cobre: CA-13 · RN-07

- [x] **T03** `core/game` — Pontuações da atribuição `[P]`
  - Teste: `game/domain/assignment-scoreboard.test.ts` › "a lone participant sees only themselves", "everyone is ranked by their current total, ties by arrival", "shows the first five and the viewer's own row when outside them", "the viewer's row is not repeated when inside the five", "who climbed since the viewer's last answer gets the arrow"
  - Implementar: `game/domain/assignment-scoreboard.ts`
  - Cobre: CA-14, CA-15, CA-16 · RN-14, RN-15

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T04** `core/game` — portas e fakes
  - Teste: `in-memory-player-repository.test.ts` › "saveProgressIfAt writes only the progress when it is still at from", "saveProgressIfAt refuses when another request moved first"; `in-memory-assignment-landing-query` com capa e número de perguntas (teste existente da landing ajustado)
  - Implementar: `ports/player-repository.ts` (`saveProgressIfAt`), `ports/assignment-landing-query.ts` (`coverImageKey`, `questionCount`); fakes
  - Cobre: CA-12 · RN-12, RN-13

- [x] **T05** `core/game` — a capa e entrar
  - Teste: `get-assignment-cover.test.ts` › "an open activity gives its name, cover, question count, creator, time left and participants", "an ended one says so", "a live game is missing"; `join-assignment.test.ts` › "joins and starts answering the first question", "with characters on, joins ready with a drawn avatar", "draws the answer order of each participant when asked", "a nickname in use is refused, ignoring case and accents", "an activity with 200 participants is full", "an ended activity refuses", "a live game is missing"
  - Implementar: `get-assignment-cover.ts` (substitui `get-assignment-landing.ts`), `join-assignment.ts`
  - Cobre: CA-01, CA-03, CA-04, CA-05, CA-13 · RN-01 a RN-07

- [x] **T06** `core/game` — a visão do participante
  - Teste: `get-assignment-play.test.ts` › "answering gives the public question in the participant's order and the time left, never which answer is right", "without the timer the time left is null", "coming back within the time gives what is left", "coming back past the time shows the results without an answer", "the history has every question already with results", "the scoreboard has everyone's current total", "a finished participant gets the place and the standings of now", "an ended activity finishes the participant in the middle", "a wrong secret is missing"
  - Implementar: `assignment-play-view.ts` (`AssignmentPlayView`, `QuestionResultView`, `loadParticipant`), `get-assignment-play.ts`
  - Cobre: CA-08, CA-09, CA-14, CA-15, CA-16, CA-18, CA-19, CA-20, CA-21, CA-22 · RN-08, RN-09, RN-13, RN-14, RN-17, RN-19 a RN-23

- [x] **T07** `core/game` — responder
  - Teste: `answer-assignment-question.test.ts` › "a right answer in 2 s of 20 is worth 950 and goes to the results", "a wrong answer is worth nothing and reveals the right one", "without the timer a right answer is worth the full points", "multiple selection counts per right answer", "an answer past the deadline is refused and the results show", "an answer to another question is refused", "a second answer is refused", "an answer after the activity ended is refused"
  - Implementar: `answer-assignment-question.ts`
  - Cobre: CA-06, CA-07, CA-08, CA-09, CA-12, CA-22 · RN-10, RN-11, RN-13, RN-23

- [x] **T08** `core/game` — começar, avançar e trocar o avatar `[P]`
  - Teste: `advance-assignment-play.test.ts` › "results → scoreboard → next question, which starts its time now", "after the last scoreboard the participant finishes with the place", "a repeated request returns the current screen", "advancing from another screen is refused", "start leaves ready for the first question"; `change-assignment-avatar.test.ts` › "changes the avatar while ready", "refuses once playing"
  - Implementar: `advance-assignment-play.ts`, `start-assignment-play.ts`, `change-assignment-avatar.ts`
  - Cobre: CA-05, CA-10, CA-17 · RN-06, RN-12, RN-16, RN-22

- [x] **T09** `core/reports` — a atribuição no relatório
  - Teste: `get-report.test.ts` › "an assignment counts every question for every participant: 3 of 5 answered is 2 unanswered", "an assignment's summary has no duration"
  - Implementar: `get-report.ts`
  - Cobre: CA-22, CA-23 · RN-25 a RN-27

## Fase 3 — Adapters (banco)

- [x] **T10** `db` — schema e migration
  - Teste: `repositories/game/drizzle-player-progress.test.ts` › "stores and reads back a participant's progress and answer order", "a live player reads back without progress", "saveProgressIfAt writes only when still at from", "saveProgressIfAt refuses a stale from"
  - Implementar: `schema/game.ts` (enum `participant_phase`, colunas de `game_player`), `drizzle-player-repository.ts`; `pnpm db:generate` (commitar) e aplicar no banco local (conferir o enum e as colunas com `psql`, pela lição do índice parcial)
  - Cobre: CA-12, CA-13, CA-19 · RN-12, RN-20

- [x] **T11** `db` — a capa na consulta da atividade `[P]`
  - Teste: `drizzle-assignment-reads.test.ts` › "gives the quiz's cover and the question count", "the cover is null once the quiz was deleted"
  - Implementar: `drizzle-assignment-landing-query.ts`
  - Cobre: CA-01 · RN-01

- [x] **T12** `db` — relatório de uma atribuição jogada
  - Teste: `drizzle-report-game-query.test.ts` › "an assignment's participants and answers are read, with every question played", "an assignment ended in the middle keeps the answers given"
  - Implementar: ajustes em `drizzle-report-game-query.ts`, se o teste pedir
  - Cobre: CA-22, CA-23 · RN-25, RN-26

## Fase 4 — API

- [x] **T13** `api` — procedures do participante
  - Teste: `routers/game.test.ts` › "assignment.cover is public", "assignment.join, play, answer and advance play a whole assignment", "the right answer does not travel before the results", "assignment.answer to another question is BAD_REQUEST with ASSIGNMENT.NOT_AT_STAGE", "assignment.setAvatar only while ready", "join.find with eight digits still goes to the activity"
  - Implementar: `routers/game.ts` (sub-router `assignment`: `cover`, `join`, `play`, `start`, `answer`, `advance`, `setAvatar`; sai `landing`), `container.ts`, `testing/test-context.ts`
  - Cobre: CA-01, CA-02, CA-06, CA-12 · RN-13

## Fase 5 — UI

- [x] **T14** `web/lib` — a sessão do participante `[P]`
  - Teste: `lib/assignment-session.test.ts` › "remembers the participant of each activity", "forgets one activity without touching the others", "survives a broken storage"
  - Implementar: `lib/assignment-session.ts`
  - Cobre: CA-19, CA-21 · RN-20

- [x] **T15** `web` — capa, apelido e personagem
  - Teste: `components/assignment/play/assignment-cover.test.tsx` › "shows the cover, the question count, the name and Iniciar", "Iniciar opens the nickname"; `nickname-step.test.tsx` › "Ok, vamos lá! sends the nickname", "a refusal shows on the red strip"; `ready-screen.test.tsx` › "shows the avatar editor and Começar"
  - Implementar: `assignment-cover.tsx`, `nickname-step.tsx`, `ready-screen.tsx`; `assignment-landing.tsx` sem o "Em breve"
  - Cobre: CA-01, CA-03, CA-04, CA-05 · RN-01 a RN-06

- [x] **T16** `web` — pergunta e resultado
  - Teste: `play-question.test.tsx` › "shows the progress, the image, the statement and the answers with shape and text", "the time bar counts down from what the server sent", "without the timer there is no bar", "multiple selection marks and Enviar", "an answer that got no reply says so and gives the answers back"; `play-result.test.tsx` › "Correto then the points", "Incorreto with the chosen and the right one marked", "Tempo esgotado without an answer"
  - Implementar: `play-question.tsx` (com `question-on-device.tsx` da spec 012), `play-result.tsx`
  - Cobre: CA-06, CA-07, CA-08, CA-09 · RN-08, RN-09, RN-11, RN-24, RN-30

- [x] **T17** `web` — placar, fim e setas
  - Teste: `play-scoreboard.test.tsx` › "lists the first five and the viewer's row, highlighted"; `play-final.test.tsx` › "shows the activity, the medal with the place, the standings and Entrar em outro jogo", "an ended activity says Esta atividade foi encerrada"; `play-arrows.test.tsx` › "→ asks to advance", "← walks back through the history without answering", "at the end ← reviews every question from the last"
  - Implementar: `play-scoreboard.tsx`, `play-final.tsx`, `play-arrows.tsx`
  - Cobre: CA-10, CA-11, CA-14, CA-15, CA-16, CA-17, CA-18 · RN-12, RN-14 a RN-18

- [x] **T18** `web` — a rota do jogo
  - Teste: `assignment-play-flow.test.tsx` (o fluxo com uma API falsa, como `join-flow.test.tsx`) › "without a session: cover → nickname → first question", "with a session: straight to where the participant was", "a finished participant goes to the end", "the screen asks again when the time runs out", "a lost connection is told and the answer can be sent again"
  - Implementar: `components/assignment/play/assignment-play-flow.tsx`, `routes/assignment.$gameId.tsx`
  - Cobre: CA-01, CA-19, CA-20, CA-21, CA-22 · RN-12, RN-20, RN-21, RN-24

- [x] **T19** `web` — o relatório ao vivo e "Jogue este quiz"
  - Teste: `assignment-summary.test.tsx` › "Jogue este quiz is a link to the activity in a new tab"; `report-summary.test.tsx` › "an ended assignment has no Tempo"; teste da opção de consulta › "an open assignment's report asks again every 30 s"
  - Implementar: `assignment-summary.tsx`, `report-summary.tsx`, `routes/_auth/_shell/reports.$gameId.tsx`, `reports.index.tsx`
  - Cobre: CA-24, CA-25 · RN-27 a RN-29

## Fase 6 — E2E e fechamento

- [x] **T20** E2E — jogar uma atribuição
  - Teste: `apps/web/e2e/assignment-play.spec.ts` (desktop + celular) › "two participants play an assignment to the end": o criador atribui um quiz de duas perguntas; Ana entra pelo link (capa, Iniciar, apelido), responde certo, vê o resultado, Pontuações e o fim em 1º; Bia entra pelo PIN, responde e fica em 2º no placar de Ana ao voltar; o relatório mostra os dois; "Jogue este quiz" abre a atividade; sem rolagem horizontal no celular
  - Cobre: CA-01, CA-02, CA-15, CA-17, CA-23, CA-25, CA-26

- [x] **T21** Fechamento
  - `pnpm check` (Biome nos arquivos alterados, `--line-ending=crlf`, em lotes), `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`; `pnpm test:e2e` das specs de atribuição, relatórios e lobby (parar o preview antes)
  - Conferir as telas num navegador de verdade, celular e tela larga
  - Atualizar `spec.md` (status `done`, changelog), `glossary.md`, `roadmap.md`, `CLAUDE.md` (parágrafo da atribuição: o jogo do participante) e o ADR 0014

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T05, T11, T13, T15, T18, T20 |
| CA-02 | T13, T20 |
| CA-03 | T05, T15 |
| CA-04 | T05, T15 |
| CA-05 | T01, T05, T08, T15 |
| CA-06 | T07, T13, T16 |
| CA-07 | T07, T16 |
| CA-08 | T01, T06, T07, T16 |
| CA-09 | T01, T06, T07, T16 |
| CA-10 | T01, T08, T17 |
| CA-11 | T17 |
| CA-12 | T04, T07, T10, T13 |
| CA-13 | T02, T05, T10 |
| CA-14 | T03, T06, T17 |
| CA-15 | T03, T06, T17, T20 |
| CA-16 | T03, T06, T17 |
| CA-17 | T08, T17, T20 |
| CA-18 | T06, T17 |
| CA-19 | T01, T06, T10, T14, T18 |
| CA-19a | T01, T06 (`get-assignment-play.test.ts`, 2026-10-30) |
| CA-20 | T01, T06, T18 |
| CA-21 | T06, T14, T18 |
| CA-22 | T06, T07, T09, T12, T18 |
| CA-23 | T09, T12, T20 |
| CA-24 | T19 |
| CA-25 | T19, T20 |
| CA-26 | T20 |

Todos os 26 critérios aparecem em ao menos uma tarefa.

## Desvios na execução

- Os testes de `change-assignment-avatar` e `start-assignment-play` ficaram em `advance-assignment-play.test.ts`, junto dos outros passos do participante.
- `entry-screens.tsx` reúne capa, apelido e personagem num arquivo (no plano, três); os testes de pergunta e resultado ficaram em `play-question.test.tsx`, e os de placar, fim e setas em `play-end.test.tsx`.
- A tela `answering` leva também `durationMs`, para a barra de tempo.
- O E2E usa um quiz de uma pergunta: Ana termina em 1º, Bia em 2º, e o placar final de Ana mostra as duas ao voltar pelo link.
- O E2E da spec 029 passou a entrar pela capa ("Iniciar") em vez de conferir o apelido desativado.
