---
spec: "008"
status: done # todo | in-progress | done
---

# Tarefas — 008 Partida ao vivo 1/4: Lobby

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: teste falhando pelo motivo certo → mínimo para passar → refatorar.

## Fechamento (2026-10-01)

- Testes: `pnpm test` 1057 ✅ (core 475, db 64, api 62, ui 25, web 407, auth 15, realtime 6, storage 3); `pnpm check-types` e `pnpm -F web exec tsc --noEmit` limpos; Biome limpo nos arquivos alterados.
- E2E: 90 ✅ (desktop + celular), incluindo os 4 de `game-lobby.spec.ts`. Uma execução feita ao mesmo tempo que `pnpm test` teve 6 falhas por tempo esgotado; sozinha, a suíte passou inteira.
- `pnpm test:int` não foi rodado: `packages/realtime` e `packages/storage` não mudaram.
- Schema aplicado com `pnpm -F @quizio/db db:push` (tabelas `game`, `game_player`, `attempt_window`; enums `game_status`, `game_end_reason`). Em cada máquina com banco antigo, rode o mesmo comando.
- Dependência nova: `qrcode.react` em `apps/web`.
- Desvios do plano:
  - O quiz de outro dono é `GAME.QUIZ_NOT_FOUND` (`GameQuizNotFoundError`), não `QUIZ.NOT_FOUND`: o contexto `game` não importa erros do contexto `quiz`.
  - A porta do `quiz` para as partidas entra em `deleteQuizPermanently` como `quizGames`, porque `games` já é o repositório de partidas no container.
  - A sessão do jogador é guardada **por PIN** (`quizio:player:{PIN}`), não por `gameId`: o link de entrada só traz o PIN. Como um PIN pode ser sorteado de novo, a sessão guardada é sempre conferida com o servidor.
  - `/join` e `/join/{PIN}` são uma rota-mãe (`join.tsx`) com duas filhas vazias, para a tela não ser remontada quando o endereço acompanha o fluxo.
  - Os formulários do jogador só aparecem depois que a página está interativa (`ClientOnly`). O E2E mostrou que o PIN digitado antes disso se perdia.
  - O botão "Organizar ao vivo" e seus avisos ficaram dentro de `quiz-details-view.tsx`, sem um `host-game-button.tsx`.
  - Os componentes do anfitrião ficaram em quatro arquivos (`host-lobby.tsx`, `join-instructions.tsx`, `player-grid.tsx`, `lobby-dialogs.tsx`) e os do jogador em dois (`join-flow.tsx`, `join-forms.tsx`), em vez de um por elemento.
  - `HostLobby` e `JoinFlow` recebem as ações por props; a consulta, os eventos em tempo real e as mutações do anfitrião ficam na rota `host.$gameId.tsx`, coberta pelo E2E. O `JoinFlow` assina os eventos e consulta a sessão ele mesmo, e é testado com o `InMemoryRealtimeSubscriber`.
  - Testes de aplicação agrupados em três arquivos (`host-game.test.ts`, `host-lobby.test.ts`, `join-game.test.ts`); os de repositório, em `drizzle-game-repositories.test.ts`.
  - O cadeado e a remoção aparecem na tela do anfitrião antes da resposta do servidor (atualização otimista). O E2E espera a resposta antes de testar a entrada bloqueada.
- Critérios sem teste próprio:
  - CA-12 (QR expandido fecha com clique fora) testa o X/Esc; o clique fora é do primitivo de diálogo.
  - CA-44 (partida cheia) é testado no caso de uso, não no navegador.
  - CA-45 (removido sem conexão) é testado no `JoinFlow` pela consulta periódica, sem derrubar a rede de verdade.
  - CA-09 ("Recentes") é garantido por `hostGame` não escrever no quiz; não há teste de biblioteca.

## Fase 1 — Domínio

- [x] **T01** `core/game` — PIN do jogo: leitura e formatação
  - Teste: `game-pin.test.ts` › "reads six digits ignoring spaces"; "refuses a leading zero"; "formats in two groups"
  - Implementar: `game/domain/game-pin.ts`
  - Cobre: CA-10, CA-36, RN-09, RN-10, RN-36
- [x] **T02** `core/game` — apelido: limites e chave de comparação
  - Teste: `nickname.test.ts` › "trims and collapses spaces"; "accepts 1 to 15 perceived characters"; "has the same key regardless of case and accents"
  - Implementar: `game/domain/nickname.ts`
  - Cobre: CA-39 a CA-42, RN-41, RN-42
- [x] **T03** `core/game` — partida e jogador: validade, cadeado, encerramento, dono
  - Teste: `game.test.ts` › "a new game is an open lobby for 8 hours"; "is ended once past its deadline"; "ending is idempotent"; "refuses joining when locked or ended"; "another owner's game is not found"; `player.test.ts`
  - Implementar: `game/domain/game.ts`, `player.ts`, `game-events.ts`, `testing/a-game.ts`
  - Cobre: CA-11, CA-21, CA-24, CA-30, RN-04, RN-11, RN-20, RN-23, RN-24

## Fase 2 — Aplicação

- [x] **T04** portas e fakes: `GameRepository`, `PlayerRepository`, `PlayableQuizQuery`, `GamePinGenerator`, `AttemptLimiter`, `QuizGames`
  - Teste: os fakes são exercitados pelos casos de uso; `in-memory-attempt-limiter.test.ts`
  - Implementar: `game/application/ports/*`, `game/testing/*`, `shared/application/ports/attempt-limiter.ts`, `shared/testing/in-memory-attempt-limiter.ts`
- [x] **T05** `hostGame` e `endGamesOfQuiz`
  - Teste: `host-game.test.ts`, `end-games-of-quiz.test.ts`
  - Cobre: CA-01, CA-03 a CA-10, RN-01 a RN-09
- [x] **T06** `getHostLobby`, `setGameLocked`, `removePlayer`, `endGame`
  - Teste: `host-lobby.test.ts`
  - Cobre: CA-17, CA-18, CA-21, CA-24, CA-25, CA-27, CA-29, CA-30, CA-33
- [x] **T07** `findGameByPin`, `joinGame`, `getPlayerSession`
  - Teste: `join-game.test.ts`
  - Cobre: CA-11, CA-15, CA-16, CA-22, CA-23, CA-35 a CA-45
- [x] **T08** `deleteQuizPermanently` encerra a partida aberta
  - Teste: `delete-quiz-permanently.test.ts` › "ends the open games of the quiz"
  - Cobre: CA-34, RN-34

## Fase 3 — Adapters

- [x] **T09** schema `game`, `game_player`, `attempt_window` e repositórios Drizzle
  - Teste: `drizzle-game-repository.test.ts`, `drizzle-player-repository.test.ts`, `drizzle-playable-quiz-query.test.ts`, `drizzle-attempt-limiter.test.ts`
  - Cobre: CA-03, CA-06, CA-10, CA-16, CA-27, CA-38, CA-42

## Fase 4 — API

- [x] **T10** router `game` (anfitrião e `join`), `clientIp` no contexto, container e composition root
  - Teste: `routers/game.test.ts`
  - Cobre: CA-03 a CA-05, CA-18, CA-37, CA-38

## Fase 5 — UI

- [x] **T11** `lib`: mensagens de erro, visão do lobby com eventos, sessão do jogador, link de entrada, tela cheia
  - Teste: `game-lobby.test.ts`, `player-session.test.ts`, `join-link.test.ts`
  - Cobre: CA-15, CA-25, CA-29, CA-43
- [x] **T12** pontos de entrada: botão na página do quiz, "O quiz está pronto", "Prepare-se para participar"
  - Teste: `host-game-button.test.tsx`, `opening-game.test.tsx`, `quiz-ready-dialog.test.tsx`
  - Cobre: CA-01 a CA-03, CA-06, CA-19
- [x] **T13** lobby do anfitrião e rota `/host/{gameId}`
  - Teste: `host/host-lobby.test.tsx`
  - Cobre: CA-12 a CA-17, CA-20, CA-21, CA-24 a CA-26, CA-28, CA-29, CA-31, CA-33
- [x] **T14** entrada do jogador e rotas `/join`, `/join/{PIN}`
  - Teste: `player/join-flow.test.tsx`
  - Cobre: CA-35 a CA-45

## Fase 6 — E2E e fechamento

- [x] **T15** E2E com anfitrião e jogador em contextos separados, desktop e celular
  - Teste: `apps/web/e2e/game-lobby.spec.ts`
  - Cobre: CA-01, CA-13, CA-15, CA-17, CA-25, CA-30, CA-32, CA-35, CA-43, CA-46
- [x] **T16** Fechamento
  - `pnpm check`, `pnpm test`, typecheck, `pnpm test:e2e`
  - Atualizar `spec.md`, `glossary.md`, `roadmap.md`, `CLAUDE.md`, `docs/architecture.md`
