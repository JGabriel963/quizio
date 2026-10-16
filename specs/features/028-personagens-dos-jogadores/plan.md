---
spec: "028"
status: approved # draft | approved
---

# Plano técnico — 028 Personagens dos jogadores

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0013](../../../docs/adr/0013-arte-dos-avatares.md)

## Abordagem

O avatar é **dois identificadores** guardados na linha do jogador (`game_player.character`, `game_player.accessory`), validados no core contra um catálogo de IDs (`game/domain/avatar.ts`). O core não sabe de desenhos nem de nomes em português: a arte (Fluent Emoji Flat, MIT, ADR 0013) e os rótulos ficam em `apps/web`, num catálogo com os mesmos IDs, conferido por um teste. O sorteio usa a porta `Shuffler` que já existe. A troca é um caso de uso público (`changeAvatar`), permitido só enquanto o jogador espera para jogar (RN-13), que grava **só as duas colunas** (`players.saveAvatar`, como `games.saveOptions`), para não desfazer nada que a linha tenha mudado ao mesmo tempo. "Personagens dos jogadores" é mais uma `GameOptions` (`gameCharacters`) e mais uma coluna em `game` e em `host_preferences`. Quando ela está desligada, **o servidor não manda avatar nenhum** (`avatar: null` em todas as visões), então as telas só precisam desenhar o que chega. Dois eventos novos dizem às telas que algo mudou: `avatar-changed` (o cartão do lobby troca sem refazer a consulta) e `characters-changed` (os celulares perguntam a sessão de novo, porque hoje uma opção mudada não chega a eles antes da próxima fase).

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Avatar | `Avatar` (`{ character, accessory }`) | sim |
| Personagem | `character`, `CHARACTER_IDS` | sim |
| Acessório | `accessory`, `ACCESSORY_IDS` (`null` = "Nenhum") | sim |
| Personagens dos jogadores | `GameOptions.gameCharacters` | sim |
| Avatar fixo | `AvatarFixedError` (`GAME.AVATAR_FIXED`) | sim |
| Avatar desconhecido | `UnknownAvatarError` (`GAME.UNKNOWN_AVATAR`) | sim |
| Catálogo de avatares (web) | `AVATAR_CATALOG` em `lib/avatar-catalog.ts` | sim |

## Domínio — `packages/core/src/game/domain`

### Value objects — `avatar.ts` (novo)

```ts
export const CHARACTER_IDS = ["koala", "tiger", "fox", /* … ≥ 24 */] as const;
export const ACCESSORY_IDS = ["top-hat", "crown", "graduation-cap", /* … ≥ 24 */] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];
export type AccessoryId = (typeof ACCESSORY_IDS)[number];

export interface Avatar {
	character: CharacterId;
	/** Null is "Nenhum" (RN-04). */
	accessory: AccessoryId | null;
}

/** Throws UnknownAvatarError for anything outside the catalog (RN-06). */
export function parseAvatar(input: { character: string; accessory: string | null }): Avatar;
/** The same, but null instead of throwing: a remembered avatar that left the catalog (RN-08, CA-03). */
export function knownAvatar(input: { character: string; accessory: string | null } | null): Avatar | null;
/** A random character and a random accessory, never "Nenhum" (RN-07). */
export function drawAvatar(shuffler: Shuffler): Avatar;
```

- Os IDs são estáveis em inglês e kebab-case; a ordem das listas é a ordem da grade. Um ID nunca é reaproveitado para outro desenho. Um ID que sair do catálogo continua aceito na **leitura** de linhas antigas (ver "Leitura tolerante" em Adapters), mas não em trocas.
- `drawAvatar` recebe o `Shuffler` (porta de `shared`), pega o primeiro de cada lista embaralhada. O domínio continua puro: a função recebe a porta como argumento, como `arrangeGameQuestions`.

### Entidade `Player` (alterada)

- Ganha `avatar: Avatar`. `newPlayer` recebe `avatar`.
- `changePlayerAvatar(game, player, avatar): Player` — invariantes:
  - jogador ativo e partida aberta (`assertGameOpen`);
  - `game.options.gameCharacters` ligada (RN-25: com a chave desligada não há editor);
  - `canChangeAvatar(game, player)`: `game.status === "lobby"`, ou partida em andamento e `!canAnswer(player, game.progress.questionIndex)` (RN-13, CA-11). Quem entrou no lobby já não pode na abertura da partida (`gameIntro`, pergunta 0); quem entrou no meio pode até a abertura da sua primeira pergunta.
  - Fora disso, `AvatarFixedError` (CA-10).
- `canChangeAvatar` também alimenta a visão do jogador (o lápis aparece ou não).

### Agregado `Game` / `GameOptions` (alterados)

- `GameOptions.gameCharacters: boolean`; `DEFAULT_GAME_OPTIONS.gameCharacters = true` (RN-23).
- `changeGameOptions` não muda: `gameCharacters` pode mudar no lobby e no jogo (RN-24), como `autoplay`.
- `avatarShown(game, player): Avatar | null` — o avatar do jogador, ou `null` com a chave desligada (RN-25, RN-26). **Toda visão passa por ela**; é a única regra de exibição.

### Serviços de domínio

- `rankPlayers` passa a receber `{ id, nickname, avatar }` e `Standing` ganha `avatar: Avatar | null`. Quem chama entrega os jogadores já com `avatarShown` aplicado (os `Player` são mapeados antes), então `ScoreboardEntry`, `final.standings` e o pódio levam o avatar sem lógica nova (RN-18, RN-19).

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `UnknownAvatarError` | `GAME.UNKNOWN_AVATAR` | Personagem ou acessório fora do catálogo numa troca (RN-06, CA-12) |
| `AvatarFixedError` | `GAME.AVATAR_FIXED` | Troca fora do período de espera, com a chave desligada ou de jogador removido (RN-13, RN-14, RN-25, CA-10) |

## Aplicação — `packages/core/src/game/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `createJoinGame` (alterado) | `+ avatar?: { character; accessory } \| null` | `+ avatar: Avatar` | os de hoje | `+ shuffler` |
| `createChangeAvatar` (novo) | `{ gameId, playerId, secret, avatar }` | `{ avatar: Avatar }` | `GameNotFoundError` (par inválido), `UnknownAvatarError`, `AvatarFixedError` | `games`, `players` (`findById`, `saveAvatar`), `realtime`, `clock` |
| `createSetGameOptions` (alterado) | `options.gameCharacters?` | `HostGameView` | os de hoje | publica `characters-changed` quando `gameCharacters` está na mudança |
| `createGetPlayerSession` (alterado) | — | `+ avatar: Avatar \| null`, `+ canChangeAvatar: boolean` | — | — |
| `loadHostGameView` / `toLobbyPlayerView` (alterados) | — | `LobbyPlayerView.avatar`, `Standing.avatar` | — | — |

- **Entrar** (RN-07, RN-08): `knownAvatar(input.avatar) ?? drawAvatar(deps.shuffler)`. Um avatar lembrado desconhecido não é erro: vale o sorteio (CA-03). O jogador recebe avatar **mesmo com a chave desligada** (RN-26). O `player-joined` leva `toLobbyPlayerView(game, player)`, com `avatar` só se a chave estiver ligada.
- **Trocar** (`changeAvatar`): carrega com `loadGame`; confere o par `playerId`/`secret` como `getPlayerSession` (mesmo `GameNotFoundError`); `parseAvatar`; `changePlayerAvatar`; `players.saveAvatar(player.id, avatar)`; publica `avatar-changed` com `{ playerId, avatar }` (best effort, depois da escrita). A decisão "ainda está esperando?" é lida antes da escrita, e uma troca que cruze com o início da pergunta pode ser aceita por milissegundos: é aceitável, porque o avatar não pesa em nada do jogo e a regra é de apresentação (RN-13). Não vale um update condicional.
- **Opções**: `setGameOptions` publica `characters-changed` `{ on }` depois de gravar, só quando `gameCharacters` vem na mudança. As demais opções continuam sem evento (spec 012, RN-21).

### Portas novas ou alteradas

```ts
// application/ports/player-repository.ts
export interface PlayerRepository {
	// …
	/** Writes only the two avatar columns: nothing else of the row is rewritten. */
	saveAvatar(playerId: string, avatar: Avatar): Promise<void>;
}

// application/ports/host-preferences-repository.ts — sem mudança de assinatura:
// `save(ownerId, Partial<GameOptions>)` e `find(ownerId)` passam a incluir `gameCharacters`.
```

Fakes: `InMemoryPlayerRepository.saveAvatar`, `InMemoryHostPreferencesRepository` com `gameCharacters`; `aGame()` com a opção ligada por padrão; `game-deps.ts` ganha o `shuffler` determinístico que já existe em `shared/testing` (o mesmo de `startGame`).

## Adapters

### Banco — `packages/db`

`schema/game.ts`:

| Tabela | Coluna | Tipo | Observação |
| --- | --- | --- | --- |
| `game_player` | `character` | `text not null default 'koala'` | o default só existe para as linhas de antes e para o código anterior que ainda insere sem ela durante o deploy (CLAUDE.md, "compatível com o código anterior") |
| `game_player` | `accessory` | `text` (nulo) | `null` = "Nenhum" |
| `game` | `game_characters` | `boolean not null default true` | |
| `host_preferences` | `game_characters` | `boolean not null default true` | criador sem linha → `DEFAULT_GAME_OPTIONS` (já é assim) |

- `drizzle-player-repository.ts`: `add` grava as colunas; `saveAvatar` é `update game_player set character, accessory where id`; o mapeamento de linha usa uma **leitura tolerante**: um `character` que não está mais no catálogo vira o primeiro personagem, e um `accessory` desconhecido vira `null`, para uma linha antiga nunca derrubar uma tela.
- `drizzle-game-repository.ts`: `saveOptions` e o mapeamento passam a cobrir `game_characters`; `create` grava a opção.
- `drizzle-host-preferences-repository.ts`: idem.
- `pnpm db:generate` gera a migration (só `ADD COLUMN` com default; nenhum backfill).

### Real-time

| Canal | Evento | Payload | Publicado por (caso de uso) | Assinado por (tela) |
| --- | --- | --- | --- | --- |
| `game-{id}` | `player-joined` (alterado) | `{ player: { id, nickname, avatar: Avatar \| null } }` | `joinGame` | lobby do anfitrião |
| `game-{id}` | `avatar-changed` (novo) | `{ playerId, avatar }` (< 100 bytes) | `changeAvatar` | lobby do anfitrião (troca o cartão no cache, RN-12) |
| `game-{id}` | `characters-changed` (novo) | `{ on: boolean }` | `setGameOptions` | celulares (refazem `game.join.session`, fecham o editor, RN-25); a tela do anfitrião já recebe a visão nova na resposta da mutation |

O avatar é público como o apelido: já aparece na tela projetada. `avatar-changed` com a chave desligada não é publicado (a troca é recusada antes).

### Arte — `apps/web/public/avatars` (ADR 0013)

- `characters/{id}.svg` e `accessories/{id}.svg`, copiados de [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (estilo **Flat**, MIT), com `LICENSE` e um `SOURCES.md` (ID → nome do emoji de origem). Servidos como arquivos estáticos; nada passa pelo `ObjectStorage` (não são do usuário).
- `neutral-head.svg`: cabeça cinza desenhada por nós, para mostrar os acessórios na grade (RN-11, CA-07).
- Personagens: rostos de bichos e criaturas do conjunto ("Koala", "Tiger face", "Fox", "Bear", "Panda", "Frog", "Monkey face", "Dog face", "Cat face", "Mouse face", "Hamster", "Rabbit face", "Cow face", "Pig face", "Lion", "Unicorn", "Dragon face", "Wolf", "Boar", "Horse face", "Polar bear", "Ogre", "Alien", "Robot", "Ghost", "Skull", "Sun with face"…). Acessórios: chapéus, capacetes, óculos e enfeites ("Top hat", "Crown", "Graduation cap", "Billed cap", "Military helmet", "Sunglasses", "Glasses", "Goggles", "Headphone", "Ribbon", "Necktie", "Scarf", "Jack-o-lantern", "Hibiscus"…). A lista final de 24 + 24 (no mínimo) sai na primeira tarefa de UI, depois de ver as combinações na página `/design-system`.

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `game.join.enter` (alterada) | mutation | pública | `+ avatar: { character: string ≤ 40, accessory: string ≤ 40 \| null } \| null` opcional | `+ avatar` | os de hoje |
| `game.join.setAvatar` (nova) | mutation | pública | `{ gameId, playerId, secret, avatar: { character, accessory } }` | `{ avatar }` | `GAME.UNKNOWN_AVATAR`, `GAME.AVATAR_FIXED`, `NOT_FOUND` |
| `game.join.session` (alterada) | query | pública | — | `+ avatar`, `+ canChangeAvatar` | — |
| `game.setOptions` (alterada) | mutation | protegida | `options.gameCharacters?: boolean` | `HostGameView` | os de hoje |
| `game.view` (alterada) | query | protegida | — | `players[].avatar`, `stage.scoreboard[].avatar`, `final.standings[].avatar` | — |

O zod só valida a forma (strings curtas); quem conhece o catálogo é o core (`parseAvatar`).

Ligações novas em `container.ts`: `changeAvatar` com `games`, `players`, `realtime`, `clock`; `joinGame` recebe o `shuffler` que o container já tem para `startGame`. `composition-root.ts` não muda.

## UI — `apps/web` e `packages/ui`

- **`lib/avatar-catalog.ts`**: `AVATAR_CATALOG = { characters: [{ id, label: "Coala", src }], accessories: [{ id, label: "Cartola", src, slot }] }`, com `slot` (`top`, `eyes`, `face`, `neck`) que diz onde o acessório se desenha. Teste: os IDs batem um a um com `CHARACTER_IDS`/`ACCESSORY_IDS` do core, na mesma ordem.
- **`components/game/avatar.tsx`**: `<Avatar avatar size="sm|md|lg|xl" />` — o personagem preenchendo um quadrado e o acessório por cima, posicionado pelo `slot` (geometria por slot, em frações do quadrado; um ajuste opcional por personagem no catálogo, se algum rosto pedir). `alt=""` + `aria-hidden` ao lado do apelido (RN-20). `animateOnChange`: um `key` pelo avatar com `motion-safe:animate-pop-in` (RN-21, CA-23).
- **`components/game/player/avatar-editor.tsx`**: o painel do editor (RN-11): avatar em destaque, `Tabs` "Personagem"/"Acessório", grade de botões (`aria-pressed`, `aria-label` = rótulo), "Nenhum" primeiro na aba Acessório, "Pronto". Toma `avatar`, `onChange(avatar)`, `onClose` como props (testável sem tRPC). A troca é otimista: mostra na hora, volta ao avatar do servidor e avisa "Não foi possível trocar o avatar." se a mutation falhar (RN-14, CA-13). Usa `Sheet`/`Dialog` existente de `packages/ui` (sem primitivo novo).
- **`WaitingScreen`** (`join-flow.tsx`): com `avatar`, o cartão grande com o lápis ("Editar avatar") só se `canChangeAvatar`; sem avatar, a tela de hoje (RN-10, RN-25). A tela de "Você entrou! Aguarde a próxima pergunta." (`sittingOut`) ganha o mesmo cartão (CA-11). O editor fecha sozinho quando a sessão volta com `canChangeAvatar: false` ou `avatar: null`.
- **`JoinFlow`**: assina `characters-changed` (refaz a sessão); `api.enter` manda o avatar lembrado; cada troca bem-sucedida chama `store.rememberAvatar` (RN-08, RN-15).
- **`lib/player-session.ts`**: `avatar(): StoredAvatar | null` e `rememberAvatar(avatar)` (chave `quizio:player:avatar`), com o mesmo tratamento de `localStorage` indisponível que `last()`.
- **`PlayerFrame`**: rodapé com `<Avatar size="sm">` antes do apelido quando a sessão tem avatar (RN-17).
- **Anfitrião**: `PlayerGrid` (cartão com avatar à esquerda, RN-16, `animateOnChange`), `Scoreboard` (RN-18), `Podium` (avatar acima do apelido, entrando junto, RN-19) e `FinalStandings` (RN-19). `lib/game-lobby.ts` ganha `avatarChanged`; a rota `host.$gameId.tsx` assina `avatar-changed` e aplica no cache.
- **`GameSettings`**: chave "Personagens dos jogadores" com "Os jogadores escolhem um personagem e um acessório.", depois de "Reprodução automática" (RN-22).
- **`/design-system`**: seção "Avatares" com a grade de personagens e uma matriz de acessórios sobre três rostos, para conferir o encaixe.
- Tipos de visão em `lib/api-types.ts` seguem as saídas novas.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | aplicação | entrar sem avatar lembrado sorteia um do catálogo e o publica em `player-joined` | `core/src/game/application/join-game.test.ts` |
| CA-01 | componente | tela de espera com avatar mostra o cartão e o lápis | `web/src/components/game/player/join-flow.test.tsx` |
| CA-02 | aplicação | entrar com avatar lembrado conhecido usa esse avatar | `join-game.test.ts` |
| CA-02 | unidade (web) | `rememberAvatar`/`avatar()` guardam e devolvem; `enter` recebe o lembrado | `web/src/lib/player-session.test.ts`, `join-flow.test.tsx` |
| CA-03 | domínio | `knownAvatar` devolve null para ID desconhecido; entrar cai no sorteio | `core/src/game/domain/avatar.test.ts`, `join-game.test.ts` |
| CA-04 | componente | o lápis abre o editor com as abas, o atual com `aria-pressed` e "Pronto" | `web/src/components/game/player/avatar-editor.test.tsx` |
| CA-05 | aplicação | `changeAvatar` grava e publica `avatar-changed` | `core/src/game/application/change-avatar.test.ts` |
| CA-05 | componente | tocar num personagem chama `onChange` e o destaque muda sem "Pronto" | `avatar-editor.test.tsx` |
| CA-05 | componente | `avatarChanged` troca o cartão no lobby | `web/src/lib/game-lobby.test.ts` |
| CA-06 | domínio + componente | `parseAvatar` aceita `accessory: null`; "Nenhum" envia null | `avatar.test.ts`, `avatar-editor.test.tsx` |
| CA-07 | componente | a aba Acessório começa com "Nenhum" e mostra a cabeça neutra | `avatar-editor.test.tsx` |
| CA-08 | componente | "Pronto" chama `onClose` | `avatar-editor.test.tsx` |
| CA-09 | aplicação | a sessão devolve o avatar gravado | `get-player-session.test.ts` |
| CA-10 | domínio | `changePlayerAvatar` recusa em `gameIntro` e depois (`AVATAR_FIXED`) | `core/src/game/domain/player.test.ts` |
| CA-10 | componente | a sessão com `canChangeAvatar: false` fecha o editor e tira o lápis | `join-flow.test.tsx` |
| CA-11 | domínio | quem entrou na fase de respostas pode trocar até a abertura da pergunta seguinte | `player.test.ts` |
| CA-12 | aplicação | ID fora do catálogo é recusado (`UNKNOWN_AVATAR`) e nada é gravado | `change-avatar.test.ts` |
| CA-12 | API | `game.join.setAvatar` mapeia para `BAD_REQUEST` com `domainCode` | `packages/api/src/routers/game.test.ts` |
| CA-13 | componente | falha da troca volta ao avatar anterior e mostra o aviso | `avatar-editor.test.tsx` |
| CA-14 | aplicação | dois jogadores com o mesmo avatar são aceitos | `change-avatar.test.ts` |
| CA-15 | componente | o rodapé mostra o avatar ao lado do apelido | `web/src/components/game/player/player-stage.test.tsx` |
| CA-16 | domínio + componente | `rankPlayers`/`scoreboardOf` levam o avatar; o placar o desenha | `standings.test.ts`, `host/scoreboard.test.tsx` |
| CA-17 | componente | pódio e classificação desenham o avatar | `host/podium.test.tsx` |
| CA-18 | componente + domínio | a chave aparece ligada e na ordem; `DEFAULT_GAME_OPTIONS.gameCharacters` é true | `host/game-settings.test.tsx`, `game-options.test.ts` |
| CA-19 | aplicação | desligar publica `characters-changed`; visões trazem `avatar: null` | `set-game-options.test.ts`, `get-host-game.test.ts` |
| CA-19 | componente | sessão sem avatar fecha o editor e mostra a espera da spec 008 | `join-flow.test.tsx` |
| CA-20 | aplicação | quem entrou com a chave desligada tem avatar ao religar | `join-game.test.ts`, `get-host-game.test.ts` |
| CA-21 | aplicação | com a chave desligada no jogo, placar, `final` e sessão trazem `avatar: null` | `get-host-game.test.ts`, `get-player-session.test.ts` |
| CA-22 | aplicação + repositório | `gameCharacters` é salvo nas preferências e herdado por `hostGame` | `set-game-options.test.ts`, `host-game.test.ts`, `packages/db/src/repositories/game/drizzle-game-options.test.ts` |
| CA-23 | componente | com `stubReducedMotion`, a troca não tem a classe de animação | `web/src/components/game/avatar.test.tsx` |
| — | repositório | `add`/`saveAvatar` gravam só as colunas do avatar; leitura tolerante de ID antigo | `packages/db/src/repositories/game/drizzle-game-repositories.test.ts` |
| — | unidade (web) | IDs do catálogo da web = IDs do core, na ordem | `web/src/lib/avatar-catalog.test.ts` |
| CA-01, CA-05, CA-19 | E2E | jogador entra, troca o personagem, o anfitrião vê; anfitrião desliga a chave | `apps/web/e2e/avatars.spec.ts` |

## Dados e migração

- `pnpm db:generate` gera uma migration com quatro `ADD COLUMN`, todas com default ou nulas: compatível com o código anterior durante o deploy (o build de produção aplica antes). Nenhum backfill: jogadores de partidas antigas ficam com "koala" e sem acessório, o que só aparece se alguém reabrir uma partida ainda aberta.

## Riscos e decisões

- **Arte de terceiros (ADR 0013)**: Fluent Emoji Flat (MIT), copiada para o repositório com a licença. Alternativas descartadas: os desenhos do Kahoot (protegidos), DiceBear (estilos sem bichos ou com licença CC BY por estilo), Twemoji (CC BY 4.0, exige atribuição visível), emojis do sistema (aparência muda por aparelho).
- **Encaixe dos acessórios**: os rostos do conjunto têm tamanhos e alturas de olhos parecidos, mas não iguais; óculos são o caso mais frágil. Mitigação: `slot` por acessório, ajuste opcional por personagem no catálogo e a matriz no `/design-system` para revisar antes de fechar a lista. Se algum par ficar ruim, sai do catálogo (o mínimo de 24 + 24 tem folga no conjunto).
- **Sem corpo inteiro**: o conjunto só tem rostos; vale a divergência "Avatar de rosto, sem corpo" da spec e fecha a pergunta em aberto sobre o corpo.
- **Troca que cruza o início da pergunta** (ver Aplicação): aceita sem update condicional, decisão consciente.
- **`characters-changed` é o primeiro evento de opção para os celulares**: a spec 012 (RN-21) evitava evento porque o que muda chega com a próxima fase; aqui a mudança vale no lobby, onde não há próxima fase. Os outros switches continuam sem evento.
- **Tamanho**: 50+ SVGs em `public/` (alguns KB cada) carregam sob demanda; a grade usa `loading="lazy"`.
