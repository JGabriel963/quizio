---
spec: "014"
status: done # todo | in-progress | done
---

# Tarefas — 014 Opções de jogo 3/3: Reprodução automática

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.

## Fechamento (2026-10-06)

- Testes: `pnpm test` 1771 ✅ (core 778, db 105, api 92, ui 32, web 740, auth 15, realtime 6, storage 3); `pnpm check-types` e `pnpm -F web exec tsc --noEmit` limpos; Biome limpo nos arquivos alterados.
- E2E: as cinco specs de jogo (`game-autoplay`, novo, `game-connection`, `game-lobby`, `game-play` e `game-options`) 20 ✅, desktop e celular. A suíte E2E completa não foi rodada. `game-autoplay.spec.ts` é um cenário curto, por pedido do usuário: quiz de uma pergunta, a contagem aparece ao lado de Iniciar, o teste clica em Iniciar e a revelação vai sozinha ao pódio.
- **Falha vista no caminho e decidida pelo usuário**: `game-options.spec.ts` (CA-07 da spec 012) falhou na rodada final. Não era da reprodução automática: desde a spec 013, um pedido sem resposta abre também o diálogo "Conexão perdida", que cobre o painel até a nova tentativa, 5 s depois; o teste esperava a chave do painel por 5 s e perdia a corrida por pouco. Mostrado ao usuário antes de corrigir; ele escolheu corrigir só o teste, que agora espera o diálogo fechar.
- `pnpm test:int` não foi rodado: `packages/realtime` e `packages/storage` não mudaram.
- Banco: `pnpm -F @quizio/db db:push` aplicado no banco local (`game.autoplay_since` e `host_preferences.autoplay`). Outras máquinas precisam rodar o mesmo comando. Os contêineres do projeto estavam parados e foram iniciados com `pnpm infra:up`.
- Conferido num navegador de verdade, numa partida de duas perguntas com dois jogadores e **nenhum clique para o jogo andar** (roteiro do Playwright rodado uma vez e apagado): a contagem do lobby em 15, em 9 seis segundos depois, de volta a 14 um segundo depois de o segundo jogador entrar; recarregar com 10 e voltar com 8; a partida iniciando sozinha 15 s depois da última entrada; a revelação com a contagem em 5 no lugar de "Avançar"; a chave desligada no meio (7 s depois a revelação continuava, com "Avançar") e ligada de novo (contagem em 5); o placar com a contagem; a segunda pergunta abrindo sozinha; recarregar na revelação com 4 e voltar com 3; o pódio, parado 8 s depois. As capturas do painel, do lobby, da revelação e do placar foram olhadas.
- Só nos testes, não no navegador: a queda de conexão do anfitrião durante uma contagem (CA-25, CA-26); remover jogadores durante a contagem do lobby (CA-09, CA-10); bloquear o jogo durante a contagem (CA-13); a falha ao salvar a chave (CA-03); leitores de tela e movimento reduzido (CA-28).
- **Limitação conhecida**: com a aba do anfitrião em segundo plano o navegador atrasa os temporizadores, e a partida deixa de avançar no prazo. Vale mais aqui do que nas outras specs, porque a ideia da chave é o anfitrião não ficar olhando a tela.
- TDD: T01 a T06, T08, T09 e T11 a T14 tiveram os testes escritos e vistos falhar antes do código. Na T10 o teste foi escrito antes e falhou por o componente não existir. Na T07, três dos quatro testes passaram de primeira, como previsto (a regra entrou na T03); o quarto falhou até o ajudante de teste `createStartedGame` aprender a esperar o prazo da reprodução automática. A T15 não tem teste de componente.
- Testes antigos ajustados: os que comparavam as opções, a visão do anfitrião ou a partida por igualdade ganharam `autoplay`, `autoStart` e `autoAdvance`; os que contavam quatro chaves no painel contam cinco; as chamadas de `changeGameOptions` e `saveOptions` ganharam o instante.
- Sobrou no banco local: as contas e os quizzes criados pelos E2E, como sempre.
- Desvios do plano: no fim de [plan.md](plan.md).

## Fase 1 — Domínio

- [x] **T01** `core/game` — a chave como opção de jogo, com o instante em que foi ligada
  - Teste: `domain/game-options.test.ts` › "autoplay starts off"; "turning autoplay on in the lobby counts from then"; "turns autoplay on and off while the game is on"; "turning it on again keeps the instant it has"; "turning it off clears the instant"; "refuses an ended game"; `domain/game.test.ts` › "a new game with autoplay counts from its creation"; "a new game without autoplay has no instant"
  - Implementar: `domain/game-options.ts` (`GameOptions.autoplay`, `DEFAULT_GAME_OPTIONS`, `changeGameOptions(game, change, now)`), `domain/game.ts` (`Game.autoplaySince`, `newGame`), `testing/a-game.ts`
  - Cobre: CA-11, CA-12, RN-02, RN-03, RN-08
- [x] **T02** `core/game` — as duas contagens
  - Teste: `domain/autoplay.test.ts` › "no countdown without autoplay"; "an empty lobby has no countdown"; "counts 15 s from the last player"; "a player who joins restarts the countdown"; "counts from when autoplay was turned on, if that is later"; "removing the last player stops the countdown, and the next one starts another"; "a locked game keeps counting"; "never tells a negative time"; "the results and the scoreboard count 5 s from the phase's start"; "turned on during the results, counts 5 s from then"; "off, the results have no deadline"; "the other phases have no automatic countdown"; "a finished game has no countdown"; "another instant is another token"
  - Implementar: `domain/autoplay.ts` (`AUTOPLAY_START_MS`, `AUTOPLAY_ADVANCE_MS`, `autoStartRemainingMs`, `autoAdvanceRemainingMs`, `autoStartToken`, `autoAdvanceToken`)
  - Cobre: CA-04 a CA-07, CA-09, CA-13, CA-20 a CA-22, RN-05 a RN-08, RN-10 a RN-12, RN-15, RN-16
- [x] **T03** `core/game` — a revelação e o placar com prazo quando a chave está ligada
  - Teste: `domain/game-progress.test.ts` › "the results move on 5 s in with autoplay"; "refuses to leave the results before that"; "the scoreboard moves on 5 s in with autoplay"; "the results wait for the host without autoplay"; "autoplay leaves the answers' time alone"; "what goes to the devices has no deadline in the results"
  - Implementar: `domain/game-progress.ts` (`nextStage`)
  - Cobre: CA-04, CA-15, CA-16, CA-19, CA-27, RN-04, RN-11, RN-12, RN-14, RN-20

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T04** `core/game` — mudar a chave e levá-la para a próxima partida
  - Teste: `application/set-game-options.test.ts` › "autoplay is saved for the next game"; "turning autoplay on in the lobby counts from then"; "turns autoplay on and off during the game"; "turning it on does not undo a stage written meanwhile"; `application/host-game.test.ts` › "a game of a host with autoplay saved starts with it on"
  - Implementar: `application/set-game-options.ts`, `application/ports/game-repository.ts` (`saveOptions` com `at`), `testing/in-memory-game-repository.ts`, `testing/in-memory-host-preferences-repository.ts`
  - Cobre: CA-02, CA-11, CA-12, RN-02, RN-03, RN-08, RN-15
- [x] **T05** `core/game` — a visão do anfitrião diz as contagens
  - Teste: `application/get-host-game.test.ts` › "tells the lobby's countdown with autoplay and a player"; "tells no countdown for an empty lobby or without autoplay"; "tells the time really left of the lobby's countdown"; "removing one of several leaves the countdown"; "removing the last player stops it, and the next one starts another"; "tells the results' and the scoreboard's countdown, by the server's clock"; "the token changes when the countdown starts over"; `application/get-player-session.test.ts` › "the player's session has no countdown and no deadline in the results"
  - Implementar: `application/host-game-view.ts` (`AutoCountdownView`, `autoStart`, `stage.autoAdvance`), `application/ports/player-repository.ts` (`lastJoinedAt`), `testing/in-memory-player-repository.ts`
  - Cobre: CA-05, CA-06, CA-09, CA-10, CA-14, CA-23, CA-27, RN-07, RN-17, RN-20
- [x] **T06** `core/game` — o início automático conferido no servidor
  - Teste: `application/start-game.test.ts` › "an automatic start goes through once the countdown is over"; "an automatic start before the new deadline is refused"; "an automatic start without autoplay is refused"; "Iniciar starts before the countdown ends, once"
  - Implementar: `application/start-game.ts` (`auto`)
  - Cobre: CA-05, CA-07, CA-08, RN-05, RN-06, RN-09, RN-18
- [x] **T07** `core/game` — o avanço automático no caso de uso
  - Teste: `application/advance-game.test.ts` › "with autoplay, refuses to leave the results before 5 s"; "with autoplay, walks results and scoreboard by their deadlines"; "the last results finish the game by themselves"; "without autoplay the results still wait for the host" (CA-24 já coberto por "applies a transition once when two requests race")
  - Implementar: nada além da T03, se os testes passarem; senão `application/advance-game.ts`
  - Cobre: CA-15 a CA-17, CA-24, RN-11, RN-12, RN-18

## Fase 3 — Adapters (repositórios, real-time, storage)

- [x] **T08** `db` — as colunas e as gravações
  - Teste: `repositories/game/drizzle-game-options.test.ts` › "stores and reads autoplay and its instant"; "turning autoplay on twice keeps the first instant"; "turning it off clears the instant"; "turning it on does not undo a stage written before"; "lastJoinedAt counts removed players"; "lastJoinedAt of an empty game is null"; "stores and reads the host's autoplay, leaving the other options"
  - Implementar: `schema/game.ts` (`game.autoplay_since`, `host_preferences.autoplay`), `drizzle-game-repository.ts`, `drizzle-player-repository.ts`, `drizzle-host-preferences-repository.ts`; `pnpm -F @quizio/db db:push`
  - Cobre: CA-02, CA-10, RN-03, RN-07, RN-17

## Fase 4 — API (routers + composition root)

- [x] **T09** `api` — a chave e o início automático nas procedures
  - Teste: `routers/game.test.ts` › "game.setOptions turns autoplay on and the lobby tells its countdown"; "game.start with auto before the time is refused"; "game.start with auto after the countdown starts the game"; "a game of a host with autoplay saved starts with it on"; "with autoplay, game.advance from the results is refused before 5 s"
  - Implementar: `routers/game.ts` (`setOptions.options.autoplay`, `start.auto`)
  - Cobre: CA-02, CA-05, CA-07, CA-15, RN-03, RN-05, RN-11

## Fase 5 — UI (design system → componentes do app → rotas)

- [x] **T10** `web` — o bloco da contagem [P]
  - Teste: `components/game/host/auto-countdown.test.tsx` › "is a timer named after what it counts"; "counts down in whole seconds"; "shows 0 only when the time is up"; "does not animate with reduced motion"
  - Implementar: `components/game/host/auto-countdown.tsx`
  - Cobre: CA-28, RN-22
- [x] **T11** `web` — a chave no painel [P]
  - Teste: `components/game/host/game-settings.test.tsx` › "shows Reprodução automática, off, before Encerrar jogo"; "asks for the change at once"; "is free during the game"
  - Implementar: `game-settings.tsx`, `lib/api-types.ts` (se preciso)
  - Cobre: CA-01, CA-03, RN-01, RN-02
- [x] **T12** `web` — o que a tela muda antes de o servidor responder [P]
  - Teste: `lib/game-lobby.test.ts` › "turning autoplay off takes the countdowns away at once"; "turning it on waits for the server's countdown"
  - Implementar: `lib/game-lobby.ts` (`optionsChanged`)
  - Cobre: CA-12, CA-20, RN-08, RN-15
- [x] **T13** `web` — o lobby conta e inicia
  - Teste: `components/game/host/host-lobby.test.tsx` › "shows the countdown beside Iniciar"; "shows no countdown without one"; "asks for the automatic start at zero"; "asks again when the server says it is not time yet"; "a new countdown starts over, even ending later"; "Iniciar starts before the countdown ends"; "does not ask while disconnected, and starts when the connection returns and the countdown is over"
  - Implementar: `host-lobby.tsx` (`AutoCountdown`, efeito do início automático, `connected`, `start(auto)`)
  - Cobre: CA-05, CA-07, CA-08, CA-26, RN-05, RN-06, RN-09, RN-19
- [x] **T14** `web` — a revelação e o placar contam e avançam
  - Teste: `components/game/host/host-stage.test.tsx` › "shows the countdown in place of Avançar in the results and asks at zero"; "Avançar is back when the countdown goes"; "a countdown turned on again starts over"; "asks for the next stage when the connection returns"; `components/game/host/scoreboard.test.tsx` › "shows the countdown in place of Avançar"
  - Implementar: `host-stage.tsx`, `stage-screens.tsx` (`Results`), `scoreboard.tsx`
  - Cobre: CA-15, CA-16, CA-20, CA-21, CA-25, RN-11 a RN-13, RN-15, RN-19
- [x] **T15** `web` — a rota do anfitrião liga tudo (sem teste de componente: conferida pelo typecheck, pelo E2E da T16 e no navegador)
  - Implementar: `routes/_auth/host.$gameId.tsx` — `start` com `auto` e recusa silenciosa que refaz a consulta; refazer a consulta em `player-joined`/`player-removed` e quando `autoplay` muda; `connected` para o `HostLobby`
  - Cobre: CA-05, CA-07, CA-11, CA-12, CA-14, CA-23, RN-06 a RN-08, RN-17

## Fase 6 — E2E e fechamento

- [x] **T16** E2E — reprodução automática
  - Teste: `apps/web/e2e/game-autoplay.spec.ts` › "com a chave ligada, a contagem aparece no lobby e a revelação vai sozinha ao pódio" — um cenário curto, por pedido do usuário (2026-10-06): quiz de uma pergunta, o teste clica em Iniciar em vez de esperar os 15 s
  - Cobre: CA-01, CA-05 (só a contagem na tela), CA-15, CA-17, CA-22
  - Fora do E2E, cobertos nas camadas de baixo: a espera de 15 s (T02, T06, T13), o placar avançando (T03, T07, T14), a partida inteira sem cliques (CA-18: T06, T07, T13, T14, e a conferência da T17) e desligar a chave na revelação (T12, T14)
- [x] **T17** Conferir no navegador, numa partida de verdade: uma partida de duas perguntas inteira sem cliques, esperando os 15 s do lobby (CA-18); a chave no painel; a contagem ao lado de Iniciar e a volta a 15 quando alguém entra; a contagem no lugar de Avançar na revelação e no placar; ligar e desligar no meio; recarregar no meio de uma contagem; o pódio parado
- [x] **T18** Fechamento
  - `pnpm check`, `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`; E2E das specs de jogo
  - Atualizar `spec.md` (status `done`, changelog), `tasks.md`, `glossary.md` (📝 → ✅), `roadmap.md`, `CLAUDE.md` (parágrafo da spec 014), a nota no ADR 0009, e o changelog da spec 009 (RN-11 alterada)

## Cobertura dos critérios de aceite

| CA | Tarefas | CA | Tarefas | CA | Tarefas |
| --- | --- | --- | --- | --- | --- |
| CA-01 | T11, T16 | CA-11 | T01, T04, T15 | CA-21 | T02, T14 |
| CA-02 | T04, T08, T09 | CA-12 | T01, T04, T12 | CA-22 | T02, T16 |
| CA-03 | T11 | CA-13 | T02 | CA-23 | T05, T15 |
| CA-04 | T02, T03 | CA-14 | T05, T15 | CA-24 | T07 (já coberto) |
| CA-05 | T02, T05, T06, T13, T16 | CA-15 | T03, T07, T09, T14, T16 | CA-25 | T14 |
| CA-06 | T02, T05 | CA-16 | T03, T07, T14 | CA-26 | T13 |
| CA-07 | T02, T06, T13 | CA-17 | T07, T16 | CA-27 | T03, T05 |
| CA-08 | T06, T13 | CA-18 | T06, T07, T13, T14, T17 | CA-28 | T10 |
| CA-09 | T02, T05 | CA-19 | T03 | | |
| CA-10 | T05, T08 | CA-20 | T02, T12, T14 | | |
