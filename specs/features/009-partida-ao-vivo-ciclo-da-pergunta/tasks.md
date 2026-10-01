---
spec: "009"
status: done # todo | in-progress | done
---

# Tarefas — 009 Partida ao vivo 2/4: Ciclo da pergunta

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: teste falhando pelo motivo certo → mínimo para passar → refatorar.

## Fechamento (2026-10-01)

- Testes: `pnpm test` 1223 ✅ (core 557, db 76, api 67, ui 25, web 474, auth 15, realtime 6, storage 3); `pnpm check-types` e `pnpm -F web exec tsc --noEmit` limpos; Biome limpo nos arquivos alterados.
- E2E: 94 ✅ (desktop + celular), incluindo os 4 de `game-play.spec.ts`: uma partida inteira com anfitrião e dois jogadores em navegadores separados, e o tempo acabando sozinho seguido de encerrar no meio do jogo.
- `pnpm test:int` não foi rodado: `packages/realtime` e `packages/storage` não mudaram.
- Schema aplicado com `pnpm -F @quizio/db db:push`: colunas `question_count`, `question_index`, `phase` e `phase_started_at` em `game`; valores `playing` e `finished` no enum `game_status`; enums `game_phase` e `answer_correctness`; tabelas `game_question` e `game_answer`. Em cada máquina com banco antigo, rode o mesmo comando.
- Conferido no navegador com um anfitrião e um jogador: abertura, respostas (múltipla escolha com Enviar), total de respostas ao vivo, Pular o cronômetro, revelação, recarregar o anfitrião no meio das respostas, tempo esgotado e fim do jogo; uma pergunta com imagem de fundo.
- Desvios do plano: listados no fim de [plan.md](plan.md).
- Depois do fechamento, a pedido do usuário: o botão Enviar saiu do celular e um toque é a resposta em qualquer pergunta (RN-16 e CA-15 reescritos; múltipla escolha no celular virou pergunta em aberto). `player-stage.test.tsx` cobre o novo comportamento; os 58 testes dos componentes do jogador passam e a tela foi conferida no navegador. A suíte inteira e o E2E não foram rodados de novo: o E2E não usa múltipla escolha.
- TDD: nas tarefas T02 a T08 a implementação e o teste foram escritos juntos e rodados em seguida, sem ver cada teste falhar antes. Os testes de T01 e os de componente falharam primeiro quando havia o que corrigir (contagem regressiva, Avançar com relógio falso, três casos do fluxo do jogador).
- Auxiliares de teste novos: `createStartedGame` (`core/game/testing/started-game.ts`) inicia a partida e a leva até uma fase; `newParticipant`, `lobbyPin` e `enterNickname` foram para `e2e/support.ts`.
- Critérios sem teste próprio no navegador:
  - CA-13 (seis alternativas), CA-15 (múltipla escolha), CA-31 e CA-33 (imagem) são testados no domínio e nos componentes; o E2E usa uma pergunta de duas alternativas e um Verdadeiro ou falso.
  - CA-27 (anfitrião fora durante o tempo) e CA-43 (duas abas) são testados nos casos de uso e no repositório (`saveIfAt`), não com duas abas de verdade.
  - CA-38 (editar o quiz durante o jogo) é testado em `start-game.test.ts` e em `drizzle-game-play.test.ts`.
- Achado fora desta spec, não corrigido: ao abrir `/host/{id}` por carga completa da página, o console mostra um erro de hidratação. O cartaz "Prepare-se para participar" é renderizado no servidor sem a origem (`/join`) e no navegador com ela (`localhost:3001/join`). Vem da spec 008 e não afeta o jogo.

## Fase 1 — Domínio

- [x] **T01** `core/game` — andamento da partida: iniciar, prazos de cada fase, pular, fim
  - Teste: `game-progress.test.ts` › "starts in the game intro"; "refuses a transition before its deadline"; "skipping closes the answers early"; "advancing after the last results finishes the game"; "accepts an answer within the limit plus the grace"; "measures the response time from the phase start"
  - Implementar: `game/domain/game-progress.ts`, `game.ts` (estados `playing` e `finished`, `questionCount`, `progress`), `testing/a-game.ts`
  - Cobre: CA-01, CA-02, CA-05, CA-09, CA-17 a CA-19, CA-23, CA-25, CA-26, CA-34 a CA-37, RN-01 a RN-04, RN-08, RN-10 a RN-12, RN-18, RN-30
- [x] **T02** `core/game` — pergunta da partida e palco público
  - Teste: `game-question.test.ts` › "keeps only the filled answers with their positions"; "turns true/false into two answers"; "reads a stored question back"; `public-stage.test.ts` › "carries shapes but no text and no correct answer"
  - Implementar: `game/domain/game-question.ts`, `public-stage.ts`, `game-events.ts`, `testing/a-game-question.ts`
  - Cobre: CA-12 a CA-14, CA-22, RN-14, RN-15, RN-21, RN-27
- [x] **T03** `core/game` — resposta: validação, correção e distribuição
  - Teste: `answer.test.ts` › "refuses an answer that is not of the question"; "single selection takes exactly one"; "grades multiple selection"; "counts each marked answer once"
  - Implementar: `game/domain/answer.ts`
  - Cobre: CA-21, CA-28, CA-29, CA-31, CA-32, RN-22 a RN-24

## Fase 2 — Aplicação

- [x] **T04** portas e fakes: `saveIfAt`, `GameQuestionRepository`, `AnswerRepository`, `PlayableQuizQuery.questions`
  - Teste: exercitados pelos casos de uso
  - Implementar: `game/application/ports/*`, `game/testing/*`
- [x] **T05** `getHostGame` (era `getHostLobby`) e a visão do anfitrião por fase
  - Teste: `get-host-game.test.ts` › "hides the correct answer until the results"; "shows the distribution in the results"; "gives the image its public URL"; "shows the time that is really left"
  - Implementar: `host-game-view.ts`, `get-host-game.ts`; remover `host-lobby-view.ts`, `get-host-lobby.ts`
  - Cobre: CA-06, CA-22, CA-28, CA-29, CA-32, CA-33, CA-41
- [x] **T06** `startGame`
  - Teste: `start-game.test.ts` › "copies the questions and opens the game intro"; "needs a player"; "is not found for another creator"; "starting twice keeps the stage"; "is not changed by a later version of the quiz"
  - Cobre: CA-01 a CA-03, CA-05, CA-38
- [x] **T07** `advanceGame`
  - Teste: `advance-game.test.ts` › "walks a question through its phases"; "refuses to open the answers early"; "a repeated request changes nothing"; "skips the timer"; "finishes after the last results and frees the PIN"; "a finished game takes no transition"
  - Cobre: CA-08, CA-09, CA-23, CA-25 a CA-27, CA-34 a CA-37, CA-43
- [x] **T08** `submitAnswer`
  - Teste: `submit-answer.test.ts` › "stores the answer with the server's time"; "takes one answer per question"; "refuses an answer past the limit"; "refuses a wrong secret and a removed player"; "closes the answers when everybody answered"
  - Cobre: CA-10, CA-16 a CA-21, CA-24, CA-27, CA-37
- [x] **T09** `getPlayerSession` com o palco; `findGameByPin` e `joinGame` com a partida em andamento
  - Teste: `get-player-session.test.ts` › "shows shapes without texts while answering"; "knows the player has answered"; "tells each player the result"; `join-game.test.ts` › "a game in progress takes nobody new"
  - Cobre: CA-04, CA-07, CA-11, CA-22, CA-30, CA-31, CA-39, CA-40

## Fase 3 — Adapters

- [x] **T10** schema (`game` com o andamento, `game_question`, `game_answer`) e repositórios Drizzle; `db:push`
  - Teste: `drizzle-game-play.test.ts` › "saves a transition only from the expected stage"; "keeps one answer per player and question"; "copies and reads the questions"; "reads the questions of a playable version"
  - Cobre: CA-16, CA-35, CA-38, CA-43

## Fase 4 — API

- [x] **T11** router `game`: `view`, `start`, `advance`, `join.answer`; container e composition root
  - Teste: `routers/game.test.ts`
  - Cobre: CA-03, CA-20, CA-22

## Fase 5 — UI

- [x] **T12** `lib`: contagem regressiva, eventos do jogo na visão do anfitrião, mensagens de erro
  - Teste: `use-countdown.test.ts`, `game-stage.test.ts`
  - Cobre: CA-41
- [x] **T13** telas do anfitrião por fase, Iniciar no lobby e rota `/host/{gameId}`
  - Teste: `host/host-stage.test.tsx`, `host/host-lobby.test.tsx`
  - Cobre: CA-02, CA-06, CA-08, CA-23, CA-25, CA-28, CA-29, CA-32 a CA-34, CA-36
- [x] **T14** telas do jogador e o fluxo de entrada durante o jogo
  - Teste: `player/player-stage.test.tsx`, `player/join-flow.test.tsx`
  - Cobre: CA-04, CA-07, CA-10, CA-11, CA-13 a CA-15, CA-17, CA-30, CA-31, CA-36, CA-39, CA-40, CA-44

## Fase 6 — E2E e fechamento

- [x] **T15** E2E: anfitrião e dois jogadores do início ao fim, desktop e celular
  - Teste: `apps/web/e2e/game-play.spec.ts`
  - Cobre: CA-01, CA-04, CA-10, CA-24, CA-25, CA-30, CA-34, CA-36, CA-39, CA-41, CA-42
- [x] **T16** Fechamento
  - `pnpm check`, `pnpm test`, typecheck, `pnpm test:e2e`
  - Atualizar `spec.md`, `glossary.md`, `roadmap.md`, `CLAUDE.md`, `docs/architecture.md`, ADR 0009

Cobertura: CA-01 a CA-44 aparecem em ao menos uma tarefa (CA-42 no E2E; CA-43 em T07 e T10; CA-44 em T14).
