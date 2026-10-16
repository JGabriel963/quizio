---
spec: "027"
status: done # todo | in-progress | done
---

# Tarefas — 027 Personagens dos jogadores

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0012](../../../docs/adr/0012-arte-dos-avatares.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.

## Fechamento (2026-10-15)

- Testes: `pnpm test` 2076 ✅ (core 901, web 870, db 139, api 109, ui 32, auth 16, realtime 6, storage 3); `pnpm check-types` e `pnpm -F web exec tsc --noEmit` limpos; Biome limpo nos arquivos alterados.
- E2E: `avatars` (novo) e as specs de jogo (`game-lobby`, `game-play`, `game-options`, `game-connection`, `game-autoplay`), `reports` e `design-system`, 26 ✅ no total, desktop e celular. `pnpm test:int` não foi rodado: nenhum adapter de serviço externo mudou.
- Banco: migration `0001_dazzling_omega_flight.sql` (quatro `ADD COLUMN`, com default ou nulas) e `pnpm -F @quizio/db db:push` no banco local.
- Máquina local: a porta 5432 estava ocupada pelo `nasa-db` (outro projeto), então o Postgres do Quizio foi recriado na porta 5442 com um override do Compose fora do repositório, e o `apps/web/.env` local (não versionado) aponta para ela. O `nasa-db` não foi tocado.
- **Desvios do plano**:
  - A rota do anfitrião passou a pedir a partida de novo quando a chave dos personagens muda (como já fazia com a reprodução automática): os avatares que voltam ao religar só o servidor tem. O E2E pegou isso.
  - A tela de espera com personagens usa o `PlayerFrame` (com rodapé); sem personagens continua a da spec 008.
  - O avatar do jogador chega ao rodapé e às telas de espera por um contexto (`PlayerAvatarContext`), em vez de uma prop a mais em cada tela do jogador.
  - O fone de ouvido ganhou um `slot` próprio (`ears`), e o `top` subiu, depois de olhar a matriz no `/design-system`. Nenhum item saiu do catálogo.
- **Testes antigos que mudaram por causa das regras desta spec** (nenhum por regressão): expectativas com objetos inteiros de opções, jogadores, sessão, classificação e placar ganharam `gameCharacters`, `avatar` e `canChangeAvatar`; o painel tem seis chaves em vez de cinco (`host-lobby`, `host-stage`, `game-settings`, `e2e/game-options`); "every switch is off for a first game" virou "shows every switch off when every option is off", porque os personagens começam ligados; e `JSON.stringify(view)` sem "true" (spec 009) passou a ignorar as opções, que agora têm uma ligada por padrão.
- Conferido num navegador de verdade (T22), com um roteiro do Playwright rodado e apagado: espera do jogador, editor nas duas abas, lobby com três jogadores, resposta no celular, pódio, tela final e classificação, em celular (Pixel 7) e tela larga. Ajustes feitos depois de olhar: a grade do editor esticava as linhas (agora rola num contêiner próprio) e o avatar acima do painel era cortado pela borda da tela.
- TDD: domínio, aplicação, banco, API e componentes tiveram o teste escrito antes e visto falhar. Exceção: na T03, `player.ts` foi escrito antes de rodar o teste vermelho.
- Fica para depois: o nome acessível do cartão do lobby sai como "Ana , remover participante" (o texto oculto é posicionado de forma absoluta); já era assim antes desta spec.

## Fase 1 — Domínio

- [x] **T01** `core/game` — o avatar como value object
  - Teste: `game/domain/avatar.test.ts` › "accepts a character and an accessory from the catalog", "accepts no accessory", "rejects an unknown character", "rejects an unknown accessory", "knownAvatar is null for an id that left the catalog", "draws a character and an accessory with the shuffler", "the catalog has at least 24 characters and 24 accessories, without repeats"
  - Implementar: `game/domain/avatar.ts` (`CHARACTER_IDS`, `ACCESSORY_IDS`, `Avatar`, `parseAvatar`, `knownAvatar`, `drawAvatar`, `UnknownAvatarError`). Os IDs saem da lista do plano; a lista final é revista na T14 e as duas pontas mudam juntas.
  - Cobre: CA-03, CA-06, CA-12 · RN-01, RN-02, RN-04, RN-06, RN-07

- [x] **T02** `core/game` — a opção "Personagens dos jogadores" `[P]`
  - Teste: `game/domain/game-options.test.ts` › "characters are on for a host who never touched the settings", "characters can be turned off in the lobby and during the game"
  - Implementar: `game/domain/game-options.ts` (`gameCharacters`, `DEFAULT_GAME_OPTIONS`); `testing/a-game.ts` com a opção ligada
  - Cobre: CA-18 · RN-23, RN-24

- [x] **T03** `core/game` — o jogador tem avatar e só troca enquanto espera
  - Teste: `game/domain/player.test.ts` › "a new player keeps the avatar given", "changes the avatar in the lobby", "refuses a change once the game intro started", "a player who joined during the answers changes until the next question opens", "refuses a change with characters off", "refuses a change from a removed player", "avatarShown is null with characters off"
  - Implementar: `game/domain/player.ts` (`Player.avatar`, `newPlayer`, `canChangeAvatar`, `changePlayerAvatar`, `avatarShown`, `AvatarFixedError`)
  - Cobre: CA-10, CA-11, CA-19, CA-20 · RN-13, RN-14, RN-25, RN-26

- [x] **T04** `core/game` — a classificação leva o avatar
  - Teste: `game/domain/standings.test.ts` › "standings carry each player's avatar", "the scoreboard carries the avatar", "a player shown without avatar has null"
  - Implementar: `game/domain/standings.ts` (`rankPlayers` com `avatar`, `Standing.avatar`)
  - Cobre: CA-16, CA-17 · RN-18, RN-19

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T05** `core/game` — a porta e o fake gravam só o avatar
  - Teste: `game/testing/in-memory-game-repository.test.ts` (ou um teste novo do fake de jogadores) › "saveAvatar changes only the avatar of the player"
  - Implementar: `application/ports/player-repository.ts` (`saveAvatar`), `testing/in-memory-player-repository.ts`; `testing/in-memory-host-preferences-repository.ts` e `in-memory-game-repository.ts` com `gameCharacters`; `testing/game-deps.ts` com o `FixedShuffler`
  - Cobre: RN-12 (base para CA-05)

- [x] **T06** `core/game` — entrar com avatar sorteado ou lembrado
  - Teste: `game/application/join-game.test.ts` › "draws an avatar when none is remembered", "keeps a remembered avatar from the catalog", "draws when the remembered avatar left the catalog", "a player who joins with characters off still gets an avatar", "player-joined carries the avatar only with characters on"
  - Implementar: `application/join-game.ts` (entrada `avatar?`, saída `avatar`, `shuffler`), `application/host-game-view.ts` (`toLobbyPlayerView(game, player)`), `domain/game-events.ts` (payload)
  - Cobre: CA-01, CA-02, CA-03, CA-20 · RN-07, RN-08, RN-26

- [x] **T07** `core/game` — trocar o avatar
  - Teste: `game/application/change-avatar.test.ts` › "saves the avatar and publishes avatar-changed", "two players may have the same avatar", "refuses an unknown character and saves nothing", "refuses a change after the game started", "refuses a wrong secret as a missing session", "publishes nothing when the change is refused"
  - Implementar: `application/change-avatar.ts` (`createChangeAvatar`), `domain/game-events.ts` (`avatarChanged`, `AvatarChangedPayload`)
  - Cobre: CA-05, CA-10, CA-12, CA-14 · RN-05, RN-06, RN-12, RN-13, RN-14

- [x] **T08** `core/game` — as visões mostram o avatar, ou nada com a chave desligada
  - Teste: `get-host-game.test.ts` › "lobby players carry their avatar", "scoreboard and final standings carry avatars", "with characters off no view carries an avatar", "turning characters back on shows the avatar of who joined while off"; `get-player-session.test.ts` › "the session carries the avatar and whether it can change", "a late player can change while sitting out", "with characters off the session has no avatar and cannot change"
  - Implementar: `application/host-game-view.ts`, `application/get-player-session.ts` (`avatar`, `canChangeAvatar`)
  - Cobre: CA-09, CA-10, CA-11, CA-16, CA-17, CA-19, CA-20, CA-21 · RN-09, RN-13, RN-16 a RN-19, RN-25, RN-26

- [x] **T09** `core/game` — a chave é salva e avisa os celulares
  - Teste: `set-game-options.test.ts` › "saves gameCharacters for the host's next games", "publishes characters-changed when the switch changes", "other switches publish nothing"; `host-game.test.ts` › "a new game starts with the host's characters setting"
  - Implementar: `application/set-game-options.ts`, `domain/game-events.ts` (`charactersChanged`, `CharactersChangedPayload`), `application/host-game.ts` se precisar
  - Cobre: CA-19, CA-22 · RN-23, RN-24, RN-25

## Fase 3 — Adapters (repositórios, real-time, storage)

- [x] **T10** `db` — colunas do avatar e da chave
  - Teste: `repositories/game/drizzle-game-repositories.test.ts` › "a player is stored with the avatar", "saveAvatar writes only the avatar columns", "an avatar id that left the catalog is read as a known one"; `drizzle-game-options.test.ts` › "game and host preferences keep gameCharacters", "a host without preferences has characters on"
  - Implementar: `schema/game.ts` (`game_player.character`, `game_player.accessory`, `game.game_characters`, `host_preferences.game_characters`), `drizzle-player-repository.ts` (`add`, `saveAvatar`, leitura tolerante), `drizzle-game-repository.ts`, `drizzle-host-preferences-repository.ts`
  - Depois: `pnpm db:generate` (migration commitada) e `pnpm -F @quizio/db db:push` no banco local
  - Cobre: CA-09, CA-22 · RN-09, RN-23
  - Sem `*.int.test.ts`: nenhum adapter novo de serviço externo; os repositórios são testados com PGlite, como os outros.

## Fase 4 — API (routers + composition root)

- [x] **T11** `api` — entrar com avatar, trocar o avatar e a chave
  - Teste: `routers/game.test.ts` › "join.enter accepts a remembered avatar", "join.setAvatar changes the avatar of the player", "join.setAvatar maps an unknown avatar to BAD_REQUEST with GAME.UNKNOWN_AVATAR", "join.setAvatar after the start answers GAME.AVATAR_FIXED", "setOptions turns gameCharacters off"
  - Implementar: `routers/game.ts` (`join.enter` com `avatar`, `join.setAvatar`, `setOptions` com `gameCharacters`), `container.ts` (`changeAvatar`; `joinGame` com `shuffler`)
  - Cobre: CA-02, CA-05, CA-10, CA-12, CA-19 · RN-06, RN-14

## Fase 5 — UI (design system → componentes do app → rotas)

- [x] **T12** `web` — a arte do conjunto
  - Teste: `lib/avatar-catalog.test.ts` › "has the same ids as the core, in the same order", "every item has a label and an image path"
  - Implementar: `apps/web/public/avatars/` (`characters/*.svg`, `accessories/*.svg`, `neutral-head.svg`, `LICENSE`, `SOURCES.md`) copiados do Fluent Emoji Flat (ADR 0012); `lib/avatar-catalog.ts` com rótulos em português e `slot` de cada acessório
  - Cobre: RN-02, RN-03, RN-20

- [x] **T13** `web` — o componente `Avatar`
  - Teste: `components/game/avatar.test.tsx` › "draws the character and the accessory", "draws no accessory for none", "is hidden from screen readers next to the nickname", "replays the pop when the avatar changes", "does not animate with reduced motion"
  - Implementar: `components/game/avatar.tsx` (tamanhos `sm`/`md`/`lg`/`xl`, posição por `slot`, `animateOnChange`)
  - Cobre: CA-23 · RN-20, RN-21

- [x] **T14** `web` — seção "Avatares" no `/design-system` e revisão do encaixe
  - Teste: `routes/design-system` (teste existente da página, se houver) › "shows the avatars section"
  - Implementar: a seção com todos os personagens e a matriz de acessórios sobre três rostos; olhar num navegador, ajustar `slot`/ajustes por personagem, tirar do catálogo (core e web juntos) os pares que não encaixam, mantendo o mínimo de 24 + 24
  - Cobre: RN-02, RN-03

- [x] **T15** `web` — o editor de avatar
  - Teste: `components/game/player/avatar-editor.test.tsx` › "opens on the character tab with the current one pressed", "the accessory tab starts with none over a neutral head", "a tap changes the preview at once and calls onChange", "none sends a null accessory", "done closes the editor", "a failed change goes back to the previous avatar and shows the notice"
  - Implementar: `components/game/player/avatar-editor.tsx` (painel, abas, grade, "Pronto", troca otimista, aviso "Não foi possível trocar o avatar.")
  - Cobre: CA-04, CA-05, CA-06, CA-07, CA-08, CA-13 · RN-10, RN-11, RN-12, RN-14

- [x] **T16** `web` — o avatar lembrado pelo navegador `[P]`
  - Teste: `lib/player-session.test.ts` › "remembers the last avatar", "has no avatar when storage is unavailable"
  - Implementar: `lib/player-session.ts` (`avatar()`, `rememberAvatar()`)
  - Cobre: CA-02 · RN-08, RN-15

- [x] **T17** `web` — espera, rodapé e fluxo do jogador
  - Teste: `join-flow.test.tsx` › "the waiting screen shows the avatar card with the pencil", "the pencil opens the editor", "enter sends the remembered avatar", "a successful change is remembered", "the editor closes when the session says the avatar is fixed", "characters-changed refetches the session and closes the editor", "without avatar the waiting screen is the one of spec 008", "a player sitting out can open the editor"; `player-stage.test.tsx` › "the footer shows the avatar beside the nickname"
  - Implementar: `components/game/player/join-flow.tsx` (`WaitingScreen`, tela de "Você entrou!", assinatura de `characters-changed`, `setAvatar`), `player-frame.tsx` (rodapé), rota `join.tsx` (ligar `game.join.setAvatar`), `lib/api-types.ts`
  - Cobre: CA-01, CA-02, CA-09, CA-10, CA-11, CA-15, CA-19 · RN-08, RN-10, RN-13, RN-15, RN-17, RN-25

- [x] **T18** `web` — o lobby do anfitrião
  - Teste: `lib/game-lobby.test.ts` › "avatarChanged replaces the avatar of that player", "playerJoined keeps the avatar"; `host/host-lobby.test.tsx` › "each card shows the player's avatar", "cards show only the nickname without avatars"
  - Implementar: `lib/game-lobby.ts`, `host/player-grid.tsx` (avatar à esquerda, `animateOnChange`), rota `_auth/host.$gameId.tsx` (assinar `avatar-changed`)
  - Cobre: CA-01, CA-05, CA-14, CA-19 · RN-12, RN-16, RN-21

- [x] **T19** `web` — placar, pódio e classificação `[P]`
  - Teste: `host/scoreboard.test.tsx` › "each row shows the avatar"; `host/podium.test.tsx` › "each step shows the avatar above the nickname", "the full standings show avatars", "no avatars when the view has none"
  - Implementar: `host/scoreboard.tsx`, `host/podium.tsx`, `host/final-standings.tsx`
  - Cobre: CA-16, CA-17, CA-21 · RN-18, RN-19

- [x] **T20** `web` — a chave no painel `[P]`
  - Teste: `host/game-settings.test.tsx` › "shows Personagens dos jogadores after autoplay, on by default", "turning it off sends gameCharacters false"
  - Implementar: `host/game-settings.tsx`
  - Cobre: CA-18, CA-19, CA-22 · RN-22, RN-24

## Fase 6 — E2E e fechamento

- [x] **T21** E2E — avatares na partida
  - Teste: `apps/web/e2e/avatars.spec.ts` › "a player changes the character and the host sees it in the lobby", "the host turns characters off and the phone shows only the nickname"
  - Cobre: CA-01, CA-05, CA-19

- [x] **T22** Conferência num navegador de verdade
  - Lobby, espera, editor nas duas abas, troca refletida no anfitrião, jogador que entrou no meio, placar, pódio e classificação, chave desligada e religada; em tela de celular e larga, comparando com as capturas do Kahoot (spec 027). Ajustes de layout sem nova spec.

- [x] **T23** Fechamento
  - `pnpm check` (Biome só nos arquivos alterados, `--line-ending=crlf`), `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`; `pnpm test:e2e` das specs de jogo (008 a 014) e de `avatars`
  - Atualizar `spec.md` (status `done`, changelog; fechar as perguntas em aberto: conjunto Fluent Emoji Flat, só rosto), `glossary.md` (status ✅ e nomes do código), `roadmap.md` (✅, links do plano e das tarefas), `CLAUDE.md` (parágrafo da spec 027 na seção do jogo) e as notas "Sem avatar" das specs 008 a 011 (changelog apontando para a 027)

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T06, T17, T18, T21 |
| CA-02 | T06, T11, T16, T17 |
| CA-03 | T01, T06 |
| CA-04 | T15 |
| CA-05 | T07, T11, T15, T18, T21 |
| CA-06 | T01, T15 |
| CA-07 | T15 |
| CA-08 | T15 |
| CA-09 | T08, T10, T17 |
| CA-10 | T03, T07, T08, T11, T17 |
| CA-11 | T03, T08, T17 |
| CA-12 | T01, T07, T11 |
| CA-13 | T15 |
| CA-14 | T07, T18 |
| CA-15 | T17 |
| CA-16 | T04, T08, T19 |
| CA-17 | T04, T08, T19 |
| CA-18 | T02, T20 |
| CA-19 | T03, T08, T09, T11, T17, T18, T20, T21 |
| CA-20 | T03, T06, T08 |
| CA-21 | T08, T19 |
| CA-22 | T09, T10, T20 |
| CA-23 | T13 |

Todos os 23 critérios aparecem em ao menos uma tarefa.
