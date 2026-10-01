---
spec: "008"
status: approved # draft | approved
---

# Plano técnico — 008 Partida ao vivo 1/4: Lobby

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0002](../../../docs/adr/0002-realtime-pusher-protocol.md), [0009](../../../docs/adr/0009-partida-ao-vivo.md)

## Abordagem

Esta etapa inaugura o contexto `game`. A partida é uma linha no banco (`game`), criada por "Organizar ao vivo" com a versão jogável e o título do momento; os jogadores são linhas de `game_player`. Não há estado em memória nem timer: a validade de 8 horas é um instante guardado, conferido a cada acesso.

O jogador não tem conta. Ao entrar, recebe um `playerId` e um segredo, guardados no `localStorage` por partida, e os envia nas chamadas de jogador. É o que permite recarregar a página e continuar sendo o mesmo jogador.

As duas telas se atualizam por um canal público `game-{gameId}`. O evento é só um aviso: cada tela tem uma consulta que devolve o estado inteiro (`game.lobby`, `game.join.session`), refeita ao reconectar, ao voltar o foco e a cada 15 segundos. Um evento perdido atrasa a tela, não a deixa errada.

O contexto `game` não importa o contexto `quiz`. Ele lê o que precisa do quiz por uma porta de consulta própria (`PlayableQuizQuery`), no mesmo padrão da biblioteca. No sentido contrário, a exclusão definitiva do quiz avisa a partida por uma porta do `quiz` (`QuizGames`), ligada no container.

Estas decisões estão no [ADR 0009](../../../docs/adr/0009-partida-ao-vivo.md), proposto junto com este plano. Ele também fixa como a partida vai avançar sem timer na spec 009, para que o modelo desta etapa não precise ser refeito.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Partida ao vivo | `Game` (`GameSession` no glossário passa a `Game`) | sim |
| Estado da partida | `GameStatus` (`lobby` \| `ended`; `playing` e `finished` chegam nas specs 009 e 011) | sim |
| Motivo do encerramento | `GameEndReason` (`host` \| `replaced` \| `expired` \| `quizDeleted`) | sim |
| PIN do jogo | `GamePin`, `GamePinGenerator` | sim |
| Entrada bloqueada | `locked` | sim |
| Jogador | `Player` | sim |
| Apelido | `Nickname`, `nicknameKey` | sim |
| Segredo do jogador | `secret` | sim |
| Quiz jogável | `PlayableQuiz`, `PlayableQuizQuery` | sim |
| Limite de tentativas | `AttemptLimiter` | sim |
| Organizar ao vivo | `hostGame` | sim |
| Link de entrada | `joinLink` (só na interface) | sim |

## Domínio — `packages/core/src/game/domain`

### Agregados e entidades

**`Game`** (`game.ts`):

```ts
export const GAME_STATUSES = ["lobby", "ended"] as const;
export const GAME_END_REASONS = ["host", "replaced", "expired", "quizDeleted"] as const;
export const GAME_TTL_MS = 8 * 60 * 60 * 1000;
export const GAME_MAX_PLAYERS = 200;

export interface Game {
	id: string;
	/** The host: the owner of the quiz when the game was created. */
	ownerId: string;
	quizId: string;
	/** Number of the playable version the game was created with (RN-04). */
	quizVersion: number;
	/** The quiz's title at creation (RN-04). */
	title: string;
	pin: string;
	status: GameStatus;
	locked: boolean;
	createdAt: Date;
	expiresAt: Date;
	endedAt: Date | null;
	endReason: GameEndReason | null;
}
```

- `newGame({ id, quiz, pin, now })`: `lobby`, liberada, `expiresAt = now + 8 h` (RN-04, RN-11).
- `isGameOpen(game, now)`: não encerrada e dentro do prazo. `expireIfDue(game, now)`: devolve a partida encerrada com motivo `expired` e `endedAt = expiresAt` quando o prazo passou (RN-11).
- `requireOwnedGame(game, ownerId)`: partida de outro dono é `GameNotFoundError` (RN-20).
- `endGame(game, reason, now)`: idempotente (RN-31, RN-32). `setGameLocked(game, locked)`: exige partida aberta (RN-23).
- `assertJoinable(game, now)`: aberta (senão `GamePinNotRecognizedError`) e não bloqueada (senão `GameLockedError`) — RN-24, RN-38.

**`Player`** (`player.ts`): `{ id, gameId, nickname, nicknameKey, secret, joinedAt, removedAt }`.

- `newPlayer({ id, gameId, nickname, secret, now })`.
- `removePlayer(player, now)`; `isActivePlayer(player)`.
- `samePlayerSecret(player, secret)`.

### Value objects

- **`GamePin`** (`game-pin.ts`): `GAME_PIN_LENGTH = 6`; `parseGamePin(raw)` tira espaços e exige 6 dígitos sem zero à esquerda (RN-09, RN-36), senão `null`; `formatGamePin(pin)` → "265 914" (RN-10). Puro, usado também pela interface.
- **`Nickname`** (`nickname.ts`): `NICKNAME_MAX_LENGTH = 15`; `parseNickname(raw)` apara, junta espaços e confere 1 a 15 caracteres com `characterCount` (RN-41); `nicknameKeyOf(nickname)` usa `normalizeSearchText` do shared kernel, para "José" e "jose" terem a mesma chave (RN-42).

### Serviços de domínio

Nenhum.

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `GameNotFoundError` (`NotFoundError`) | `GAME.NOT_FOUND` | partida inexistente ou de outro dono; jogador ou segredo que não confere |
| `QuizNotPlayableError` | `GAME.QUIZ_NOT_PLAYABLE` | quiz rascunho ou na lixeira (RN-02) |
| `GamePinNotRecognizedError` | `GAME.PIN_NOT_RECOGNIZED` | PIN malformado, sem partida aberta, encerrada ou vencida (RN-38) |
| `TooManyPinAttemptsError` | `GAME.TOO_MANY_PIN_ATTEMPTS` | limite de PINs errados (RN-39) |
| `GameLockedError` | `GAME.LOCKED` | entrada bloqueada (RN-24) |
| `GameFullError` | `GAME.FULL` | 200 jogadores ativos (RN-45) |
| `InvalidNicknameError` | `GAME.INVALID_NICKNAME` | apelido vazio ou com mais de 15 caracteres (RN-41) |
| `NicknameTakenError` | `GAME.NICKNAME_TAKEN` | apelido em uso ou removido (RN-30, RN-42) |
| `GameEndedError` | `GAME.ENDED` | travar ou remover numa partida encerrada |

O quiz de outro dono é `GAME.QUIZ_NOT_FOUND` (`GameQuizNotFoundError`, um `NotFoundError`), lançado por `hostGame` (CA-05).

## Aplicação — `packages/core/src/game/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `hostGame` | `{ ownerId, quizId }` | `{ gameId }` | `QUIZ.NOT_FOUND`, `GAME.QUIZ_NOT_PLAYABLE` | `playableQuizzes`, `games`, `pins`, `ids`, `clock`, `realtime` |
| `getHostLobby` | `{ ownerId, gameId }` | `HostLobbyView` | `GAME.NOT_FOUND` | `games`, `players`, `clock` |
| `setGameLocked` | `{ ownerId, gameId, locked }` | `{ locked }` | `GAME.NOT_FOUND`, `GAME.ENDED` | `games`, `clock`, `realtime` |
| `removePlayer` | `{ ownerId, gameId, playerId }` | — | `GAME.NOT_FOUND`, `GAME.ENDED` | `games`, `players`, `clock`, `realtime` |
| `endGame` | `{ ownerId, gameId }` | — | `GAME.NOT_FOUND` | `games`, `clock`, `realtime` |
| `endGamesOfQuiz` | `{ quizId, reason }` | — | — | `games`, `clock`, `realtime` |
| `findGameByPin` | `{ pin, clientKey }` | `{ gameId, pin }` | `GAME.PIN_NOT_RECOGNIZED`, `GAME.TOO_MANY_PIN_ATTEMPTS`, `GAME.LOCKED` | `games`, `attempts`, `clock` |
| `joinGame` | `{ gameId, nickname }` | `{ playerId, secret, nickname }` | `GAME.PIN_NOT_RECOGNIZED`, `GAME.LOCKED`, `GAME.FULL`, `GAME.INVALID_NICKNAME`, `GAME.NICKNAME_TAKEN` | `games`, `players`, `ids`, `clock`, `realtime` |
| `getPlayerSession` | `{ gameId, playerId, secret }` | `PlayerSessionView` | `GAME.NOT_FOUND` | `games`, `players`, `clock` |

Notas:

- **`hostGame`**: lê o quiz por `PlayableQuizQuery`; exige dono, publicado e fora da lixeira. Encerra as partidas abertas do quiz com motivo `replaced` (RN-07) e publica o aviso. Sorteia o PIN e grava; em conflito de PIN, sorteia de novo, até 5 vezes. Uma partida vencida que ainda segura o PIN sorteado é encerrada antes. Não toca no quiz (RN-08).
- **Carga com validade**: `loadGame(deps, gameId)` aplica `expireIfDue` e grava o encerramento quando o prazo passou. Todos os casos de uso passam por ela (RN-11).
- **`getHostLobby`** devolve a partida mesmo encerrada, com o motivo, para a tela "Esta partida foi encerrada." (RN-32, CA-33).
- **`findGameByPin`**: confere o limite antes de procurar; só o PIN errado conta uma tentativa (RN-39).
- **`joinGame`** confere de novo se a partida está aberta e liberada (CA-23), conta os jogadores ativos (RN-45), valida o apelido e tenta inserir. O conflito de apelido vem do repositório.
- **`getPlayerSession`** devolve `{ status: "waiting" | "removed" | "ended", nickname, gameId }`. Um segredo errado é `GAME.NOT_FOUND`. É o que resolve a remoção e o encerramento vistos depois de uma queda de conexão (RN-46).
- **Gravar antes de publicar**: uma falha do `realtime` é registrada e não desfaz a operação (ADR 0009, item 4).

`HostLobbyView`: `{ gameId, quizId, title, pin, status, endReason, locked, players: { id, nickname }[] }`, com os jogadores ativos em ordem de entrada (RN-17).

### Portas novas ou alteradas

```ts
// game/application/ports/game-repository.ts
export interface GameRepository {
	findById(id: string): Promise<Game | null>;
	/** The game that holds the PIN and has not been ended (it may be past its deadline). */
	findUnendedByPin(pin: string): Promise<Game | null>;
	listUnendedByQuiz(quizId: string): Promise<Game[]>;
	/** Inserts; "pinTaken" when another unended game holds the PIN. */
	create(game: Game): Promise<"created" | "pinTaken">;
	save(game: Game): Promise<void>;
}

// game/application/ports/player-repository.ts
export interface PlayerRepository {
	findById(id: string): Promise<Player | null>;
	/** Active players, in order of arrival. */
	listActive(gameId: string): Promise<Player[]>;
	countActive(gameId: string): Promise<number>;
	/** Inserts; "nicknameTaken" when the key exists in the game, removed players included. */
	add(player: Player): Promise<"added" | "nicknameTaken">;
	save(player: Player): Promise<void>;
}

// game/application/ports/playable-quiz-query.ts
export interface PlayableQuiz {
	id: string;
	ownerId: string;
	title: string | null;
	/** Playable version in force; null for a draft. */
	version: number | null;
	trashed: boolean;
}
export interface PlayableQuizQuery {
	find(quizId: string): Promise<PlayableQuiz | null>;
}

// game/application/ports/game-pin-generator.ts
export interface GamePinGenerator {
	/** Six digits, no leading zero. */
	generate(): string;
}

// shared/application/ports/attempt-limiter.ts
export interface AttemptLimiter {
	/** Attempts recorded for the key in the window that contains `now`. */
	count(key: string, windowMs: number, now: Date): Promise<number>;
	record(key: string, windowMs: number, now: Date): Promise<void>;
}

// quiz/application/ports/quiz-games.ts
export interface QuizGames {
	/** Ends the open games of a quiz that is being deleted for good (spec 008, RN-34). */
	endGamesOfDeletedQuiz(quizId: string): Promise<void>;
}
```

Fakes em `testing/`: `InMemoryGameRepository`, `InMemoryPlayerRepository`, `InMemoryPlayableQuizQuery`, `SequentialGamePinGenerator`, `InMemoryAttemptLimiter` (shared), `NoQuizGames` (quiz), e o construtor `aGame()`.

`deleteQuizPermanently` (contexto `quiz`) ganha a dependência `games: QuizGames` e a chama antes de apagar as linhas.

## Adapters

### Banco — `packages/db`

`schema/game.ts` (novo):

- **`game`**: `id` (pk), `owner_id` (fk `user`, cascade), `quiz_id` (fk `quiz`, cascade), `quiz_version` (int), `title` (text), `pin` (text), `status` (enum `game_status`), `locked` (bool), `created_at`, `expires_at`, `ended_at` (nulo), `end_reason` (enum `game_end_reason`, nulo).
  - Índice único parcial em `pin` onde `ended_at is null` (RN-09).
  - Índice em `quiz_id` onde `ended_at is null` (RN-07).
- **`game_player`**: `id` (pk), `game_id` (fk `game`, cascade), `nickname`, `nickname_key`, `secret`, `joined_at`, `removed_at` (nulo).
  - Índice único em `(game_id, nickname_key)` (RN-30, RN-42).
  - Índice em `(game_id, joined_at)` (RN-17).
- **`attempt_window`** (`schema/shared.ts`, novo): `key` (pk), `window_started_at`, `count`. Janela fixa, gravada por upsert.

Repositórios em `repositories/game/`: `drizzle-game-repository.ts`, `drizzle-player-repository.ts`, `drizzle-playable-quiz-query.ts` (lê a tabela `quiz`, sem carregar o agregado). Em `repositories/shared/`: `drizzle-attempt-limiter.ts`. Os conflitos de PIN e de apelido são traduzidos da violação de índice único para o resultado da porta.

A FK `quiz_id` em cascata apaga as partidas de um quiz excluído definitivamente. A spec 013 (relatórios) revisita isso, se relatórios precisarem sobreviver ao quiz.

### Real-time

Canal `game-{gameId}`, público (ADR 0009, item 3).

| Canal | Evento | Payload | Publicado por (caso de uso) | Assinado por (tela) |
| --- | --- | --- | --- | --- |
| `game-{gameId}` | `player-joined` | `{ player: { id, nickname } }` | `joinGame` | lobby do anfitrião |
| `game-{gameId}` | `player-removed` | `{ playerId }` | `removePlayer` | lobby do anfitrião, espera do jogador |
| `game-{gameId}` | `lock-changed` | `{ locked }` | `setGameLocked` | lobby do anfitrião |
| `game-{gameId}` | `game-ended` | `{ reason }` | `endGame`, `endGamesOfQuiz`, `hostGame` (partida substituída) | lobby do anfitrião, espera do jogador |

Nomes de canal e de evento ficam em `game/domain/game-events.ts` (`gameChannel(gameId)`, `GAME_EVENTS`), usados pelo servidor e pela interface. Os payloads têm poucas dezenas de bytes.

### Storage / outros

Nenhuma mudança em `packages/storage`. `GamePinGenerator` de produção: `createRandomGamePinGenerator()` em `packages/api`, com `crypto.randomInt(100000, 1000000)`.

## API — `packages/api`

Router novo `routers/game.ts`, com o sub-router `join` para o jogador.

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `game.host` | mutation | sessão | `{ quizId }` | `{ gameId }` | `QUIZ.NOT_FOUND`, `GAME.QUIZ_NOT_PLAYABLE` |
| `game.lobby` | query | sessão | `{ gameId }` | `HostLobbyView` | `GAME.NOT_FOUND` |
| `game.setLocked` | mutation | sessão | `{ gameId, locked }` | `{ locked }` | `GAME.NOT_FOUND`, `GAME.ENDED` |
| `game.removePlayer` | mutation | sessão | `{ gameId, playerId }` | — | `GAME.NOT_FOUND`, `GAME.ENDED` |
| `game.end` | mutation | sessão | `{ gameId }` | — | `GAME.NOT_FOUND` |
| `game.join.find` | mutation | pública | `{ pin: string }` | `{ gameId, pin }` | `GAME.PIN_NOT_RECOGNIZED`, `GAME.TOO_MANY_PIN_ATTEMPTS`, `GAME.LOCKED` |
| `game.join.enter` | mutation | pública | `{ gameId, nickname: string }` | `{ playerId, secret, nickname }` | `GAME.PIN_NOT_RECOGNIZED`, `GAME.LOCKED`, `GAME.FULL`, `GAME.INVALID_NICKNAME`, `GAME.NICKNAME_TAKEN` |
| `game.join.session` | query | pública | `{ gameId, playerId, secret }` | `PlayerSessionView` | `GAME.NOT_FOUND` |

- `game.join.find` é mutation porque registra tentativas.
- `Context` ganha `clientIp`, lido do cabeçalho `x-forwarded-for` (primeiro endereço) em `createContext`. É a chave do `AttemptLimiter`: `pin:{ip}`, janela de 60 s, limite de 30 (RN-39). A prioridade dos cabeçalhos na Vercel é a mesma pendência já registrada no roadmap para o Better Auth.
- As strings de entrada têm um teto de forma no zod (PIN até 16 caracteres, apelido até 100); a regra fica no core.

Ligações novas em `container.ts`: adapters `games`, `players`, `playableQuizzes`, `pins`, `attempts`; os nove casos de uso; `deleteQuizPermanently` recebe `games: { endGamesOfDeletedQuiz: (quizId) => endGamesOfQuiz({ quizId, reason: "quizDeleted" }) }`. Em `composition-root.ts`: os quatro adapters Drizzle e o gerador de PIN. `createTestApi` ganha os fakes e expõe `games`, `players` e `realtime`.

## UI — `apps/web` e `packages/ui`

**Rotas**

- `routes/_auth/host.$gameId.tsx` — tela do anfitrião, em tela cheia, fora do `_shell`, com a classe `.dark`. Outro criador recebe a página de não encontrado; sem sessão, o `_auth` redireciona (CA-18).
- `routes/join.tsx` e `routes/join.$pin.tsx` — públicas, com `.dark`. `/join` é a entrada do PIN; `/join/{PIN}` é o link de entrada, que confere o PIN e segue para o apelido (RN-37).

**`packages/ui`**: nenhum primitivo novo. `Button` ganha a variante `game` (o botão escuro "Entrar" / "Ok, vamos lá!") no `cva`. `Dialog`, `AlertDialog` e `Tooltip` já existem.

**`lib/`**

- `game-mutations.ts` — `useHostGame()` (cria a partida e navega para `/host/{gameId}`; expõe `pending`, `error`, `retry`), e as ações do lobby com atualização do cache da consulta `game.lobby`.
- `game-lobby.ts` (puro) — `applyLobbyEvent(view, event)`: entrada, remoção, cadeado e encerramento sobre o `HostLobbyView`, sem duplicar um jogador que a consulta já trouxe.
- `player-session.ts` — lê e grava `{ playerId, secret }` no `localStorage` por `gameId`, com `try/catch`; sem armazenamento disponível, o jogador entra e só não é retomado ao recarregar.
- `join-link.ts` — `joinAddress()` e `joinLink(pin)` a partir de `window.location.origin`.
- `game-error-messages.ts` — os códigos `GAME.*` em português, com os textos da spec.
- `use-fullscreen.ts` — alterna a tela cheia e acompanha `fullscreenchange` (RN-21).

**`components/game/`**

- `host-game-button.tsx` — "Organizar ao vivo" com os três estados da página do quiz (disponível, rascunho, alterações não salvas) — RN-02, RN-05.
- `opening-game.tsx` — "Prepare-se para participar" em tela cheia enquanto `game.host` está pendente, e a falha com "Tentar de novo" e "Voltar ao quiz" (RN-13). Usado pelos dois pontos de entrada.
- `host/host-lobby.tsx` — a tela: consulta `game.lobby` com `refetchInterval` de 15 s, assina os quatro eventos e aplica `applyLobbyEvent`.
- `host/lobby-header.tsx` (sair, total, tela cheia), `host/join-instructions.tsx` (endereço, PIN ou "Jogo bloqueado", QR), `host/qr-code.tsx` (QR e o diálogo expandido), `host/copy-join-link.tsx`, `host/player-grid.tsx` (cartões como botões, com região `aria-live`), `host/lock-toggle.tsx`, `host/start-button.tsx` ("Em breve"), `host/remove-player-dialog.tsx`, `host/end-game-dialog.tsx`, `host/game-ended.tsx`.
- `player/join-flow.tsx` — a máquina de estados do jogador: `pin` → `nickname` → `waiting`, com as saídas `removed` e `ended` de volta ao PIN. Na espera, consulta `game.join.session` (15 s, foco e reconexão) e assina `player-removed` e `game-ended`.
- `player/pin-form.tsx`, `player/nickname-form.tsx`, `player/waiting-screen.tsx`, `player/join-notice.tsx` (a faixa vermelha na base).

`components/quiz/quiz-details-view.tsx` ganha o botão; `components/editor/quiz-ready-dialog.tsx` ativa "Organizar ao vivo" (RN-03).

**QR code**: biblioteca `qrcode.react` (SVG, sem rede), adicionada ao catálogo do pnpm. A versão e a API são conferidas na documentação antes da tarefa.

**Estados**: os listados na seção Experiência da spec. Carregamento da tela do anfitrião usa o mesmo cartaz "Prepare-se para participar".

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-10, CA-36 | domínio | PIN de 6 dígitos sem zero; espaços ignorados; formatação | `core/game/domain/game-pin.test.ts` |
| CA-39 a CA-42 | domínio | apelido aparado, 1 a 15 caracteres, emoji conta 1, chave sem acento e caixa | `core/game/domain/nickname.test.ts` |
| CA-11, CA-21, CA-24, CA-30 | domínio | validade, cadeado, encerrar idempotente, partida de outro dono | `core/game/domain/game.test.ts` |
| CA-01, CA-03 a CA-10 | aplicação | organizar: publicado, rascunho, lixeira, outro dono, versão e título do momento, substitui a aberta, colisão de PIN, não toca no quiz | `core/game/application/host-game.test.ts` |
| CA-17, CA-18, CA-33 | aplicação | lobby do dono, de outro dono, de partida encerrada ou vencida | `get-host-lobby.test.ts` |
| CA-21 a CA-24 | aplicação | travar, destravar, evento publicado | `set-game-locked.test.ts` |
| CA-25, CA-27, CA-29 | aplicação | remover, apelido bloqueado, evento | `remove-player.test.ts` |
| CA-30, CA-08, CA-34 | aplicação | encerrar pelo anfitrião, por substituição e por exclusão do quiz | `end-game.test.ts`, `end-games-of-quiz.test.ts`, `quiz/application/delete-quiz-permanently.test.ts` |
| CA-11, CA-22, CA-35 a CA-38 | aplicação | PIN certo, errado, encerrado, vencido, bloqueado, limite de tentativas | `find-game-by-pin.test.ts` |
| CA-15, CA-16, CA-23, CA-39 a CA-42, CA-44 | aplicação | entrar, ordem, bloqueio na hora do apelido, apelido repetido, cheia, evento | `join-game.test.ts` |
| CA-43, CA-45 | aplicação | sessão: esperando, removido, encerrado, segredo errado | `get-player-session.test.ts` |
| CA-10, CA-16, CA-27, CA-42 | adapter | índice único de PIN só entre abertas; apelido único com removidos; ordem de entrada; contagem | `db/repositories/game/drizzle-game-repository.test.ts`, `drizzle-player-repository.test.ts` |
| CA-03, CA-06 | adapter | consulta do quiz jogável | `drizzle-playable-quiz-query.test.ts` |
| CA-38 | adapter | janela de tentativas | `db/repositories/shared/drizzle-attempt-limiter.test.ts` |
| CA-03 a CA-05, CA-18, CA-37, CA-38 | API | autenticação, erros e contrato; chave do limite pelo IP | `api/routers/game.test.ts` |
| CA-15, CA-25, CA-29 | lib | eventos sobre a visão do lobby, sem duplicar | `web/lib/game-lobby.test.ts` |
| CA-43 | lib | sessão no `localStorage`, com armazenamento indisponível | `web/lib/player-session.test.ts` |
| CA-01 a CA-03, CA-06, CA-19 | componente | botão nos três estados; abrindo e falha | `host-game-button.test.tsx`, `opening-game.test.tsx`, `quiz-ready-dialog.test.tsx` |
| CA-12 a CA-17, CA-20, CA-21, CA-24 | componente | lobby: PIN formatado, QR e expansão, copiar, lista, vazio, bloqueado, Iniciar "Em breve", evento em tempo real com o `InMemoryRealtimeSubscriber` | `host/host-lobby.test.tsx` |
| CA-25, CA-26, CA-28, CA-31, CA-33 | componente | remover por mouse, teclado e toque; cancelar; encerrar; partida encerrada | `host/remove-player-dialog.test.tsx`, `host/end-game-dialog.test.tsx`, `host/host-lobby.test.tsx` |
| CA-35 a CA-45 | componente | fluxo do jogador: PIN, erros, apelido, limite, espera, removido, encerrado | `player/join-flow.test.tsx` |
| CA-01, CA-13, CA-15, CA-17, CA-25, CA-30, CA-32, CA-35, CA-43, CA-46 | E2E | anfitrião e jogador em contextos separados: organizar, entrar pelo PIN e pelo link, aparecer no lobby, recarregar as duas telas, remover, encerrar; no celular | `apps/web/e2e/game-lobby.spec.ts` |
| CA-15, CA-25 | integração | os eventos chegam por um Soketi real (já coberto pelo `pusher.int.test.ts`; sem teste novo) | — |

CA-02 e CA-09 também entram no E2E do editor (`editor-publish.spec.ts`) e no teste da biblioteca, respectivamente.

## Dados e migração

`pnpm -F @quizio/db db:push`: três tabelas novas (`game`, `game_player`, `attempt_window`) e dois enums. Sem backfill.

## Riscos e decisões

- **ADR 0009**: estado no banco, jogador anônimo por segredo, canal público, evento como aviso. Aceito pelo usuário junto com este plano (2026-10-01).
- **Limite de PINs errados por IP** (RN-39): o servidor só vê o IP, e uma sala inteira costuma sair pelo mesmo. Por isso o limite subiu para 30 por minuto e só PINs errados contam; a spec foi ajustada. Atrás de um proxy que não repassa `x-forwarded-for`, todos caem na mesma chave.
- **Limite de 200 jogadores** mantido: o teto de 10 KB vale para eventos, e os do lobby levam um jogador por vez; a lista inteira vem pela consulta HTTP, com cerca de 12 KB para 200 jogadores. A contagem antes de inserir pode passar do limite por um ou dois em entradas simultâneas.
- **Jogadores que saem não somem**: sem presença, quem fecha a aba continua na lista (spec, Fora de escopo). A spec 012 decide.
- **Segredo em texto no banco e no `localStorage`**: o valor protegido é a participação numa partida de até 8 horas.
- **Soketi no E2E**: os testes de lobby dependem do tempo real local (`pnpm infra:up`), como o resto do E2E. A consulta periódica garante que um evento perdido não quebra o teste, só o atrasa.
- **`Game` em vez de `GameSession`** no código: mais curto e sem confundir com sessão de login; o glossário é atualizado.
- **Cascata `quiz` → `game`**: excluir o quiz apaga as partidas dele. Aceito até os relatórios existirem.
