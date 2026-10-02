---
spec: "010"
status: done # todo | in-progress | done
---

# Tarefas — 010 Partida ao vivo 3/4: Pontuação e placar

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: teste falhando pelo motivo certo → mínimo para passar → refatorar.

## Fechamento (2026-10-01)

- Testes: `pnpm test` 1286 ✅ (core 601, db 78, api 68, ui 25, web 490, auth 15, realtime 6, storage 3); `pnpm check-types` e `pnpm -F web exec tsc --noEmit` limpos; Biome limpo nos arquivos alterados.
- E2E: 94 ✅ (desktop + celular). `game-play.spec.ts` agora confere os pontos, a sequência, a posição, o total no rodapé e o placar depois de cada pergunta, inclusive depois de recarregar.
- `pnpm test:int` não foi rodado: `packages/realtime` e `packages/storage` não mudaram.
- Schema aplicado com `pnpm -F @quizio/db db:push`: coluna `points` em `game_answer` e o valor `scoreboard` no enum `game_phase`. Em cada máquina com banco antigo, rode o mesmo comando.
- Conferido no navegador com um anfitrião e um jogador: "Tempo esgotado" com a posição, o placar, "Correto" com "Sequência de respostas 1" e "+ 808", o total no rodapé e o placar final.
- Desvios do plano: listados no fim de [plan.md](plan.md). O principal: a fórmula que já existia arredondava 19,9 s de 20 s para 502 por erro de ponto flutuante; foi reescrita para dar os 503 da spec.
- TDD: os testes de domínio de `answerPoints` e de `standings` foram escritos antes e rodados; nos casos de uso e nas telas, teste e implementação foram escritos juntos. Os testes da spec 009 que avançavam da revelação direto para a pergunta seguinte foram ajustados para passar pelo placar.
- Critérios sem teste próprio no navegador: CA-21 (sete jogadores), CA-23 (empate), CA-30 (pergunta sem pontos) e CA-31 (partida do exemplo) são testados no domínio e nos casos de uso; o E2E joga com dois jogadores.

## Fase 1 — Domínio

- [x] **T01** `core/game` — pontos de uma resposta: velocidade, dobro, sem pontos, múltipla escolha
  - Teste: `scoring.test.ts` › "scores each right answer marked, rounding once"; `answer.test.ts` › "scores by speed"; "a wrong answer and a no-points question score nothing"; "scores multiple selection per right answer"
  - Implementar: `domain/scoring.ts`, `domain/answer.ts` (`points`, `answerPoints`), `testing/a-game-question.ts`
  - Cobre: CA-01 a CA-08, RN-01 a RN-06
- [x] **T02** `core/game` — fase de placar e pergunta revelada
  - Teste: `game-progress.test.ts` › "the results lead to the scoreboard, then to the next question"; "the last scoreboard finishes the game"; "knows which question's points are revealed"
  - Implementar: `domain/game-progress.ts`
  - Cobre: CA-20, CA-27, CA-29, RN-09, RN-17, RN-21, RN-23
- [x] **T03** `core/game` — classificação, placar e sequência
  - Teste: `standings.test.ts` › "ranks by total, ties by arrival"; "shows the first five"; "marks who climbed"; "the first scoreboard has no arrows"; "counts the streak back to the last miss"; "tells who is right ahead"
  - Implementar: `domain/standings.ts`
  - Cobre: CA-11, CA-12, CA-21 a CA-25, CA-30, RN-10, RN-15, RN-18 a RN-20

## Fase 2 — Aplicação

- [x] **T04** portas e fakes (`totalsThrough`, `listByPlayer`); `submitAnswer` grava os pontos
  - Teste: `submit-answer.test.ts` › "stores the points with the answer"; "the streak gives no points"
  - Cobre: CA-04, CA-09, CA-13, RN-07, RN-11
- [x] **T05** `advanceGame` e a visão do anfitrião com o placar
  - Teste: `advance-game.test.ts` › "shows the scoreboard between questions"; "a repeated request stays at the scoreboard"; `get-host-game.test.ts` › "shows the first five with who climbed"; "plays the reference game"
  - Cobre: CA-20 a CA-31
- [x] **T06** `getPlayerSession` com total, pontos, sequência e posição
  - Teste: `get-player-session.test.ts` › "keeps the total as it was until the results"; "tells the points, the streak and the place"; "hides the points of a no-points question"; "tells who is right ahead"
  - Cobre: CA-06, CA-10, CA-14 a CA-19

## Fase 3 — Adapters

- [x] **T07** coluna `points`, fase `scoreboard`, somas no repositório; `db:push`
  - Teste: `drizzle-game-play.test.ts` › "sums the points of each player up to a question"; "lists a player's answers by question"
  - Cobre: CA-09

## Fase 4 — API

- [x] **T08** saídas de `game.view`, `game.advance` e `game.join.session`
  - Teste: `routers/game.test.ts` › "scores, ranks and shows the scoreboard"; "sends no points before the results"
  - Cobre: CA-10

## Fase 5 — UI

- [x] **T09** `lib`: texto da posição
  - Teste: `game-stage.test.ts` › "is on the podium up to third place"; "tells the place and who is ahead"
  - Cobre: CA-16, CA-17
- [x] **T10** placar do anfitrião
  - Teste: `host/host-stage.test.tsx` › "shows the scoreboard with the leader first and who climbed"; "the scoreboard waits for the host"
  - Cobre: CA-20 a CA-22, CA-24 a CA-26
- [x] **T11** resultado do jogador com pontos, sequência, posição e total
  - Teste: `player/player-stage.test.tsx`, `player/join-flow.test.tsx`
  - Cobre: CA-06, CA-14 a CA-19

## Fase 6 — E2E e fechamento

- [x] **T12** E2E: a partida com pontos e placar
  - Teste: `apps/web/e2e/game-play.spec.ts`
  - Cobre: CA-14, CA-16, CA-20, CA-24, CA-29
- [x] **T13** Fechamento
  - `pnpm test`, typecheck, Biome, `pnpm test:e2e`
  - Atualizar `spec.md`, `glossary.md`, `roadmap.md`, `CLAUDE.md`, ADR 0009

Cobertura: CA-01 a CA-31 aparecem em ao menos uma tarefa.
