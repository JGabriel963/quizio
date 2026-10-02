---
spec: "013"
status: done # todo | in-progress | done
---

# Tarefas — 013 Opções de jogo 2/3: Robustez da partida

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.

## Fechamento (2026-10-02)

- **Falha vista no caminho e decidida pelo usuário**: o E2E da CA-07 da spec 012 (`game-options.spec.ts`) passou a falhar depois da T13, porque uma falha de conexão nas ações do anfitrião deixou de mostrar o aviso e só abria o diálogo "Conexão perdida". Mostrado ao usuário antes de corrigir; ele escolheu manter o aviso. As ações que o anfitrião pede (travar, opções, remover, encerrar) voltaram a avisar quando falham, e a falha de conexão abre o diálogo junto. Só o avanço automático de fase fica sem aviso.
- Testes: `pnpm test` 1670 ✅ (core 722, db 95, api 86, ui 32, web 711, auth 15, realtime 6, storage 3); `pnpm check-types` e `pnpm -F web exec tsc --noEmit` limpos; Biome limpo nos arquivos alterados.
- E2E: as quatro specs de jogo (`game-connection`, novo, `game-lobby`, `game-play` e `game-options`) 18 ✅, desktop e celular, depois da correção acima. A suíte E2E completa não foi rodada.
- `pnpm test:int` não foi rodado: `packages/realtime` e `packages/storage` não mudaram.
- Banco: `pnpm -F @quizio/db db:push` aplicado no banco local (coluna `host_seen_at` em `game`). Outras máquinas precisam rodar o mesmo comando.
- Conferido no navegador, numa partida de verdade: "Encerrar jogo — Encerrar agora" no painel, a confirmação por cima dele e a volta ao painel ao cancelar; o diálogo "Conexão perdida" por cima do painel aberto, com o foco em "Reconectar" e a contagem, e o fechamento sozinho na volta (a queda foi simulada derrubando o `fetch` da página e disparando `offline`, porque o painel do navegador não desliga a rede); a tela do anfitrião indo direto aos resultados de uma pergunta que venceu durante a queda; a barra "O anfitrião se desconectou" no celular, com a tela escurecida, e o sumiço dela na volta.
- Só nos testes, não no navegador: a barra "Tentando reconectar…" do próprio celular e "Sua resposta não foi enviada." (cobertas pelo E2E com a rede desligada de verdade); o diálogo no pódio; movimento reduzido.
- **Achado na conferência e corrigido**: a barra do jogador ficava 64 px acima da borda e cobria o botão "Enviar" da múltipla escolha. Passou para a borda de baixo, por cima do apelido, e o aviso da tela (que fica nesse mesmo lugar) aparece no alto enquanto a barra está aberta.
- TDD: T01, T02, T03, T05, T06, T08, T10, T11, T12, T14, T16 e T17 tiveram os testes escritos e vistos falhar antes do código. Na T07, T09 e T15 o teste e o código foram escritos juntos, sem a rodada vermelha. A T04 é de testes de regras que já valiam: passaram de primeira, como previsto. A T13 não tem teste de componente.
- Testes antigos ajustados: os que comparavam a sessão do jogador por igualdade ganharam `hostIdleMs` (core e API).
- Sobrou no banco local: duas partidas encerradas do quiz de teste "Capitais do mundo (cópia)", além das que já existiam.
- Desvios do plano: no fim de [plan.md](plan.md).

## Fase 1 — Domínio

- [x] **T01** `core/game` — o sinal do anfitrião e quando ele conta como ausente
  - Teste: `domain/host-presence.test.ts` › "a new game has its host present"; "tells how long ago the host last gave a sign"; "the host is away after 10 s without a signal"; "a host silent for less than 10 s is not away"; "never tells a negative time"; "no idle time for a game that is over"; `domain/game.test.ts` › "a new game was seen by its host when created"
  - Implementar: `domain/host-presence.ts` (`HOST_SIGNAL_INTERVAL_MS`, `HOST_AWAY_AFTER_MS`, `hostIdleMs`, `isHostAway`), `domain/game.ts` (`Game.hostSeenAt`, `newGame`), `testing/a-game.ts` (`hostSeenAt`)
  - Cobre: CA-18, CA-19, CA-25, RN-14, RN-19

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T02** `core/game` — `signalHost`: a tela do anfitrião dá sinal
  - Teste: `application/signal-host.test.ts` › "stores when the host gave a sign"; "is not found for another creator"; "publishes host-back only when the host was away"; "publishes nothing while the host keeps signalling"; "a signal never ends or moves the game"; "does not undo a stage or a setting written meanwhile"; "tells the status of a game past its deadline, without marking the host present"; "answers for a finished game without writing"
  - Implementar: `application/signal-host.ts`, `application/ports/game-repository.ts` (`saveHostSeen`), `testing/in-memory-game-repository.ts`, `domain/game-events.ts` (`GAME_EVENTS.hostBack`), `testing/game-deps.ts` se precisar
  - Cobre: CA-16, CA-17, CA-20, RN-12, RN-13, RN-14
- [x] **T03** `core/game` — a sessão do jogador diz há quanto tempo o anfitrião está em silêncio
  - Teste: `application/get-player-session.test.ts` › "tells how long the host has been silent, in the lobby and during the game"; "tells no idle time for a finished or ended game"; "tells no idle time to a removed player"
  - Implementar: `application/get-player-session.ts` (`PlayerSessionView.hostIdleMs`)
  - Cobre: CA-18, CA-24, CA-25, RN-14, RN-19
- [x] **T04** `core/game` — regras que já valem, com o nome desta spec (testes de caracterização: devem passar de primeira, sem rodada vermelha; se algum falhar, parar e mostrar)
  - Teste: `application/submit-answer.test.ts` › "an answer counts while the host is away (spec 013)"; "the answers stay open while someone has not answered (spec 013)"; `application/get-host-game.test.ts` › "a player who stopped answering stays in the count and in the final standings (spec 013)"
  - Implementar: nada
  - Cobre: CA-12, CA-32, CA-33, RN-10, RN-25, RN-26 (CA-04, CA-11, CA-31 já cobertos por "only a finished game has a final", "shows the time that is really left" e "gives no points and no streak to a wrong answer or no answer")

## Fase 3 — Adapters (repositórios, real-time, storage)

- [x] **T05** `db` — coluna `host_seen_at` e `saveHostSeen`
  - Teste: `repositories/game/drizzle-game-repositories.test.ts` › "keeps when the host was last seen"; "saveHostSeen writes only that column: a stage and an option written before stay"
  - Implementar: `schema/game.ts` (`host_seen_at timestamp not null default now()`), `repositories/game/drizzle-game-repository.ts` (`saveHostSeen`); `pnpm -F @quizio/db db:push`
  - Cobre: RN-12, RN-14

## Fase 4 — API (routers + composition root)

- [x] **T06** `api` — `game.signal` e `hostIdleMs` em `game.join.session`
  - Teste: `routers/game.test.ts` › "game.signal needs a session"; "game.signal is not found for another creator"; "after a signal the player's session tells the host is there"; "the player's session tells a host that went silent"
  - Implementar: `routers/game.ts` (`signal`), `container.ts` (`signalHost`)
  - Cobre: CA-18, CA-20, RN-14

## Fase 5 — UI (design system → componentes do app → rotas)

- [x] **T07** `web` — o que é uma falha de conexão [P]
  - Teste: `lib/connection.test.ts` › "a request that got no answer is a connection failure"; "a refusal of the server is not a connection failure"; "not found and unauthorized are not connection failures"; "withTimeout rejects with a connection failure after the limit"; "withTimeout passes the answer and the error through"
  - Implementar: `lib/connection.ts` (`isConnectionFailure`, `withTimeout`, `CONNECTION_RETRY_MS`, `CONNECTION_TIMEOUT_MS`)
  - Cobre: CA-10, RN-04
- [x] **T08** `web` — `useConnectionWatch`: perder, contar, tentar e voltar
  - Teste: `lib/use-connection-watch.test.ts` › "a connection failure marks the connection lost"; "a refusal does not"; "the browser going offline marks it lost"; "counts 5 seconds and retries, then starts the countdown again"; "tells when a retry is on its way"; "comes back by itself when a retry is answered, and calls onBack"; "retryNow tries at once"; "the browser coming online tries at once"; "does nothing while disabled"; "stops when unmounted"
  - Implementar: `lib/use-connection-watch.ts` (`connectionReducer`, `useConnectionWatch`)
  - Cobre: CA-05 a CA-08, CA-15, RN-04, RN-06, RN-07, RN-09
- [x] **T09** `web` — `useHostSignal`: o sinal periódico da tela do anfitrião [P]
  - Teste: `lib/use-host-signal.test.ts` › "signals at once and every 4 seconds"; "reports a failed signal"; "does not signal while disabled"; "stops when unmounted"
  - Implementar: `lib/use-host-signal.ts`
  - Cobre: RN-14, RN-19
- [x] **T10** `web` — diálogo "Conexão perdida" do anfitrião
  - Teste: `components/game/host/connection-lost-dialog.test.tsx` › "shows the title, the texts, the countdown and Reconectar"; "shows Reconectando… during a retry"; "Reconectar tries at once"; "Escape and a click outside do not close it"; "is an alert dialog and focuses Reconectar"; "shows nothing while connected"
  - Implementar: `components/game/host/connection-lost-dialog.tsx`
  - Cobre: CA-05, CA-07, CA-09, CA-37, RN-05 a RN-08, RN-28, RN-29
- [x] **T11** `web` — "Encerrar agora" no painel [P]
  - Teste: `components/game/host/game-settings.test.tsx` › "shows Encerrar jogo with Encerrar agora after the switches"; `host-stage.test.tsx` › "Encerrar agora asks and ends the game"; "cancelling keeps the game and the panel"; `host-lobby.test.tsx` › "Encerrar agora asks and ends the game from the lobby"
  - Implementar: `game-settings.tsx` (`onEnd`), `host-stage.tsx`, `host-lobby.tsx`
  - Cobre: CA-01 a CA-03, RN-01, RN-02
- [x] **T12** `web` — a tela do jogo pede o avanço de novo ao reconectar
  - Teste: `components/game/host/host-stage.test.tsx` › "does not ask for the next stage while disconnected"; "asks again when the connection returns and the time is up"; "keeps the countdown across a reconnection"
  - Implementar: `host-stage.tsx` (prop `connected`)
  - Cobre: CA-11, CA-13, RN-10, RN-11
- [x] **T13** `web` — a rota do anfitrião liga tudo (sem teste de componente: a rota só liga; conferida pelo typecheck, pelo E2E da T19 e no navegador)
  - Implementar: `routes/_auth/host.$gameId.tsx` — `signal` com `withTimeout`, `useConnectionWatch`, `useHostSignal`, `ConnectionLostDialog` no lobby, no jogo e no pódio; manter a tela quando a consulta falha com dados; falhas de conexão sem toast, relatadas ao `report`; `refresh` ao voltar; `connected` para `HostStage`
  - Cobre: CA-05, CA-08, CA-13 a CA-17, RN-04, RN-09, RN-11 a RN-13
- [x] **T14** `web` — quando o celular pergunta de novo [P]
  - Teste: `lib/game-stage.test.ts` › "asks at the usual interval while the host is signalling"; "asks again when the silence would reach 10 s"; "keeps the usual interval once the host is away"; "keeps the usual interval without an idle time"
  - Implementar: `lib/game-stage.ts` (`nextSessionCheckInMs`)
  - Cobre: CA-18, CA-19, CA-24
- [x] **T15** `web` — barra de conexão do jogador [P]
  - Teste: `components/game/player/connection-bar.test.tsx` › "tells the host disconnected"; "tells the device is reconnecting"; "Sair leaves"; "is a status"; "the dark layer takes no touches"; "with reduced motion the bar shows without animation and the indicator does not spin"; "shows nothing without a reason"
  - Implementar: `components/game/player/connection-bar.tsx`
  - Cobre: CA-36, CA-37, RN-15, RN-17, RN-20, RN-28, RN-29
- [x] **T16** `web` — o fluxo do jogador: anfitrião ausente, celular sem conexão e "Sair"
  - Teste: `components/game/player/join-flow.test.tsx` › describe "JoinFlow: connection (spec 013)": "shows O anfitrião se desconectou when the session tells the host is away"; "shows no bar while the host is signalling"; "the bar shows in the lobby too"; "the bar goes away with host-back and with a new stage"; "an answer is sent with the bar showing"; "Sair keeps the session and offers the way back"; "no bar on the final screen"; "a failed check shows Tentando reconectar…"; "the device's own connection comes before the host's"; "returns to the current stage as the same player"; "an ended game leads to the PIN when the device is back"; "asks again when the host's silence would reach 10 s"
  - Implementar: `join-flow.tsx` (`useConnectionWatch`, `hostAway`, `nextSessionCheckInMs`, `stepOut`, evento `host-back`), `join-forms.tsx`/`player-stage.tsx` só se a barra precisar de lugar
  - Cobre: CA-18 a CA-28, CA-34, RN-15 a RN-22, RN-27 (CA-35 já coberto por "catches up on the end of the game when the event was missed")
- [x] **T17** `web` — resposta que não foi enviada
  - Teste: `join-flow.test.tsx` › "an answer that got no reply shows Sua resposta não foi enviada. and the buttons again"; "the answer can be sent again"; "another failure keeps its own message"; `lib/game-error-messages.test.ts` › "has the message for an answer that was not sent"
  - Implementar: `join-flow.tsx` (`submitAnswer`), `lib/game-error-messages.ts` (`ANSWER_NOT_SENT_MESSAGE`), `routes/join.tsx` (`withTimeout` em `session` e `answer`)
  - Cobre: CA-29, CA-30, RN-23

## Fase 6 — E2E e fechamento

- [x] **T18** E2E — conexão e encerramento
  - Teste: `apps/web/e2e/game-connection.spec.ts` › "ending from the settings sends the players back to the PIN"; "the host's dialog shows offline and closes when the network returns, and a question whose time ran out goes to its results"; "a player who joined while the host was offline shows when the host is back"; "closing the host's tab shows the bar on the phone, reopening hides it"; "the phone warns offline and returns by itself as the same player"
  - Cobre: CA-02, CA-05, CA-08, CA-13, CA-14, CA-18, CA-20, CA-21, CA-26, CA-28
- [x] **T19** Conferir no navegador, numa partida de verdade: o painel com "Encerrar agora" e a confirmação por cima dele; o diálogo de conexão (com a rede desligada pelas ferramentas do navegador), a contagem e a volta; a barra no celular nos dois casos, com as alternativas ainda tocáveis; a ordem e o foco dos diálogos empilhados; as animações de entrada e saída
- [x] **T20** Fechamento
  - `pnpm check`, `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`; `pnpm test:e2e` nas specs de jogo
  - Atualizar `spec.md` (status `done`, changelog), `tasks.md`, `glossary.md` (📝 → ✅), `roadmap.md`, `CLAUDE.md` (parágrafo da spec 013) e a nota no ADR 0009 (presença por coluna)

## Cobertura dos critérios de aceite

| CA | Tarefas | CA | Tarefas | CA | Tarefas |
| --- | --- | --- | --- | --- | --- |
| CA-01 | T11 | CA-14 | T13, T18 | CA-27 | T16 |
| CA-02 | T11, T18 | CA-15 | T08, T13 | CA-28 | T16, T18 |
| CA-03 | T11 | CA-16 | T02, T13 | CA-29 | T17 |
| CA-04 | T04 (já coberto) | CA-17 | T02, T13 | CA-30 | T17 |
| CA-05 | T08, T10, T13, T18 | CA-18 | T01, T03, T06, T14, T16, T18 | CA-31 | T04 (já coberto) |
| CA-06 | T08 | CA-19 | T01, T14, T16 | CA-32 | T04 |
| CA-07 | T08, T10 | CA-20 | T02, T06, T16, T18 | CA-33 | T04 |
| CA-08 | T08, T13, T18 | CA-21 | T18 | CA-34 | T16 |
| CA-09 | T10 | CA-22 | T16 | CA-35 | T16 (já coberto) |
| CA-10 | T07 | CA-23 | T16 | CA-36 | T15 |
| CA-11 | T04 (já coberto), T12 | CA-24 | T03, T14, T16 | CA-37 | T10, T15 |
| CA-12 | T04 | CA-25 | T01, T03, T16 | | |
| CA-13 | T12, T13, T18 | CA-26 | T16, T18 | | |
