---
spec: "012"
status: approved # draft | approved
---

# Plano técnico — 012 Opções de jogo 1/3: Configurações, entrada durante o jogo, perguntas no celular e ordem aleatória

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0009](../../../docs/adr/0009-partida-ao-vivo.md)

## Abordagem

Cinco mudanças, quase todas pequenas extensões do que as specs 008 a 011 montaram:

1. **Opções de jogo** são um valor da partida (`Game.options`), copiado das preferências do criador quando a partida é criada. Mudar uma opção grava na partida e nas preferências.
2. **Entrada durante o jogo**: a regra de quem pode entrar deixa de exigir o lobby. Cada jogador passa a guardar **a primeira pergunta que pode responder**; é dela que saem a espera de quem entrou no meio, a recusa de respostas a perguntas anteriores e a conta de "todos responderam".
3. **Perguntas nos dispositivos**: o palco público, que já vai para os celulares, passa a levar o enunciado, os textos e a imagem quando a opção está ligada. Como a mudança vale "a partir da próxima fase", não há evento novo para os celulares: o próximo `stage-changed` já vem no formato certo.
4. **Ordem aleatória**: o sorteio acontece uma vez, em `startGame`, antes de as perguntas serem copiadas para a partida. Depois disso nada sabe que houve sorteio: a partida lê as próprias perguntas, como hoje.
5. **Múltipla escolha no celular**: só tela. O servidor já recebe várias alternativas e já pontua por alternativa certa (spec 010).

Um cuidado atravessa o plano: hoje `games.save` regrava a partida inteira. Com o bloqueio e as opções podendo mudar **durante o jogo**, isso poderia desfazer um avanço de fase gravado no mesmo instante. O plano acrescenta uma gravação que toca só nas configurações.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Opções de jogo | `GameOptions` (`showQuestionsOnDevices`, `randomizeQuestions`, `randomizeAnswers`) | sim |
| Preferências do anfitrião | `HostPreferences`, `HostPreferencesRepository` | sim |
| Entrada durante o jogo | `Player.firstQuestionIndex`, `firstQuestionFor` | sim |
| Quem espera a próxima pergunta | `PlayerStageView.sittingOut` | sim |
| Embaralhar | `Shuffler` (porta) | sim |
| Mudar uma opção | `setGameOptions` | sim |

## Domínio — `packages/core/src/game/domain`

### Agregados e entidades

**`game-options.ts`** (novo)

```ts
export interface GameOptions {
	showQuestionsOnDevices: boolean;
	randomizeQuestions: boolean;
	randomizeAnswers: boolean;
}
export const DEFAULT_GAME_OPTIONS: GameOptions; // all false (RN-07)

/** The random orders are drawn when the game starts: only the lobby changes them (RN-25). */
export function changeGameOptions(game: Game, change: Partial<GameOptions>): Game;
```

`changeGameOptions` exige a partida aberta e recusa `randomizeQuestions`/`randomizeAnswers` fora do lobby.

**`game.ts`**

- `Game.options: GameOptions`; `newGame` recebe `options`.
- `assertJoinable`: aceita `lobby` e `playing`; recusa a partida que não está aberta e a bloqueada (RN-10, RN-12). `GameAlreadyStartedError` continua só para "Iniciar duas vezes".
- `setGameLocked` já aceita a partida em andamento (RN-09).

**`player.ts`**

- `Player.firstQuestionIndex: number`: 0 para quem entrou no lobby.
- `firstQuestionFor(game)`: 0 no lobby; a pergunta atual se as respostas dela ainda não abriram (`gameIntro`, `questionIntro`); a seguinte nas outras fases (RN-13).
- `canAnswer(player, questionIndex)`.

**`game-question.ts`**

```ts
/** The questions as the game will play them: shuffled or not, by its options (RN-22 to RN-24). */
export function arrangeGameQuestions(
	questions: readonly Question[],
	options: GameOptions,
	shuffle: <T>(items: readonly T[]) => T[],
): GameQuestion[];
```

- Com `randomizeQuestions`, embaralha a lista antes de numerar.
- Com `randomizeAnswers`, numa pergunta Quiz, embaralha **as posições** entre as alternativas preenchidas (o conjunto de cores e formas da pergunta não muda) e devolve as alternativas na ordem das posições. Verdadeiro ou falso fica como está.

**`public-stage.ts`**

`PublicStage.question` ganha, preenchidos só com `showQuestionsOnDevices` (RN-18 a RN-20):

```ts
text: string | null;
image: { url: string; crop: ImageCrop | null; altText: string | null } | null;
choices: { id: string; shapeIndex: number; label: string | null; text: string | null }[];
```

`publicStageOf(game, question, imageUrlOf)` recebe quem transforma a chave da imagem em endereço: o domínio não conhece o storage, e o cliente não monta endereços (ADR 0003). `label` continua, para o nome acessível dos botões do Verdadeiro ou falso.

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `GameOptionsFixedError` | `GAME.OPTIONS_FIXED` | Mudar a ordem aleatória com a partida em andamento (RN-25) |

## Aplicação — `packages/core/src/game/application`

### Casos de uso

| Caso de uso | Mudança | Portas |
| --- | --- | --- |
| `hostGame` | a partida nasce com as preferências do criador | + `preferences.find` |
| `setGameOptions` (novo) | muda opções da partida e as preferências; devolve a visão do anfitrião | `games.saveSettings`, `preferences.save` |
| `setGameLocked` | grava só as configurações | `games.saveSettings` |
| `startGame` | arruma as perguntas pelas opções | + `shuffler` |
| `findGameByPin`, `joinGame` | aceitam a partida em andamento; `joinGame` grava `firstQuestionIndex` | sem mudança |
| `submitAnswer` | recusa pergunta anterior à primeira do jogador; "todos responderam" conta quem pode responder | + `players.countEligible` |
| `getPlayerSession` | `sittingOut`; palco com textos e imagem | + `storage` |
| `getHostGame`, `advanceGame` | `HostGameView.options` | sem mudança |

`publishStage` passa a receber o storage, para o endereço da imagem no palco público.

**`HostGameView`** ganha `options: GameOptions`.

**`PlayerStageView`** ganha `sittingOut: boolean`: verdadeiro enquanto a pergunta em curso é anterior à primeira do jogador. Nesse caso `question` vem nulo, `answered` falso e `outcome` nulo, e o celular mostra a espera (RN-13, RN-14).

### Portas novas ou alteradas

```ts
// game-repository.ts
/** Stores only `locked` and `options`: it never touches where the game is. */
saveSettings(game: Game): Promise<void>;

// player-repository.ts
/** Active players who may answer that question (spec 012, RN-16). */
countEligible(gameId: string, questionIndex: number): Promise<number>;

// host-preferences-repository.ts (novo)
export interface HostPreferencesRepository {
	find(ownerId: string): Promise<GameOptions | null>;
	save(ownerId: string, options: GameOptions): Promise<void>;
}

// shared/application/ports/shuffler.ts (novo)
export interface Shuffler {
	shuffle<T>(items: readonly T[]): T[];
}
```

Fakes: `InMemoryHostPreferencesRepository`; `FixedShuffler` (inverte a lista, para os testes saberem a ordem); os repositórios em memória ganham os métodos novos.

## Adapters

### Banco — `packages/db`

- `game`: `show_questions_on_devices`, `randomize_questions`, `randomize_answers` (`boolean`, não nulos, padrão falso).
- `game_player`: `first_question_index` (`integer`, não nulo, padrão 0).
- `host_preferences` (nova): `owner_id` (chave, referência a `user`, em cascata), as três opções e `updated_at`.
- `drizzle-game-repository.ts`: `saveSettings` é um `UPDATE` só das quatro colunas; `drizzle-player-repository.ts`: `countEligible`; `drizzle-host-preferences-repository.ts` (novo).

### Real-time

| Canal | Evento | Payload | Publicado por | Assinado por |
| --- | --- | --- | --- | --- |
| `game-{id}` | `stage-changed` (existe) | `PublicStage`, agora com texto, imagem e textos das alternativas quando a opção está ligada | `startGame`, `advanceGame`, `submitAnswer` | celulares |
| `game-{id}` | `player-joined` (existe) | sem mudança; agora também durante o jogo | `joinGame` | tela do anfitrião |

Nenhum evento novo. O maior palco (enunciado de 120 caracteres, seis alternativas de 75, endereço da imagem) fica abaixo de 2 KB, longe do teto de 10 KB. Uma segunda aba do anfitrião fica sabendo de uma opção mudada pela consulta periódica.

### Outros

`packages/api/src/random-shuffler.ts`: Fisher-Yates com `crypto.randomInt`, ao lado do gerador de PIN.

## API — `packages/api`

| Procedure | Tipo | Auth | Entrada | Saída | Erros |
| --- | --- | --- | --- | --- | --- |
| `game.setOptions` | mutation | sessão | `gameId`, `options` (as três chaves, todas opcionais) | `HostGameView` | `GAME.NOT_FOUND`, `GAME.ENDED`, `GAME.OPTIONS_FIXED` |

`container.ts`: `setGameOptions`, `preferences` e `shuffler`. `composition-root.ts`: os adapters novos.

## UI — `apps/web` e `packages/ui`

### `packages/ui`

- `Switch` (novo, sobre `@base-ui/react/switch`): a chave das configurações.
- `Sheet` (novo, sobre o `Dialog` do base-ui): o painel preso à lateral.

Os dois entram no catálogo `/design-system`.

### `components/game/host/`

- `game-settings.tsx` (novo) — o painel: quatro linhas (ícone, nome, explicação, chave) e o rodapé. Recebe `options`, `locked`, `status` e as ações; as chaves de ordem aleatória vêm desabilitadas fora do lobby, com a explicação.
- `game-header.tsx` — ganha a engrenagem e, durante o jogo, o trecho "Entre em {endereço}" com o PIN e o botão do QR, ou o cadeado com "Jogo bloqueado". O QR expandido sai de `join-instructions.tsx` para um componente compartilhado.
- `host-lobby.tsx`, `host-stage.tsx` — passam ao cabeçalho o que ele precisa; o painel fica montado nos dois.
- `routes/_auth/host.$gameId.tsx` — `game.setOptions` com atualização otimista e volta em caso de falha (RN-04); `setLocked` passa a valer também durante o jogo.

### `components/game/player/`

- `answer-buttons.tsx` — três formatos: só formas (hoje); com textos (forma pequena no canto, texto ao centro, botões baixos); e múltipla escolha (marcador no canto, "Selecione uma ou mais respostas!", botão "Enviar").
- `player-stage.tsx` — com a opção ligada: abertura com o enunciado e a barra de leitura; respostas com a imagem, a faixa do enunciado e a barra de tempo. Tela de espera de quem entrou no meio.
- `join-flow.tsx` — o estado das alternativas marcadas vive na tela de respostas e some ao enviar ou trocar de pergunta; "Este jogo já começou." sai.
- `lib/image-crop.ts` já desenha o recorte; a imagem do celular o reaproveita.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-05, CA-31 | domínio | padrões; ordem aleatória só no lobby | `game-options.test.ts` |
| CA-11, CA-12, CA-18 | domínio | primeira pergunta de quem entra, por fase | `player.test.ts` |
| CA-26 a CA-29, CA-33 | domínio | perguntas e posições embaralhadas; V/F intacto; desligado mantém a ordem | `game-question.test.ts` |
| CA-20 a CA-23 | domínio | palco público com e sem textos; nunca a certa | `public-stage.test.ts` |
| CA-04 a CA-08 | aplicação | opções salvas por criador; bloqueio não salvo; só o dono | `set-game-options.test.ts`, `host-lobby.test.ts` |
| CA-09, CA-15, CA-16 | aplicação | bloquear durante o jogo sem mexer na fase | `set-game-locked.test.ts` |
| CA-11 a CA-19 | aplicação | entrar em cada fase; pontos e lugar; cheia; apelido em uso; terminada | `join-game.test.ts`, `get-player-session.test.ts` |
| CA-13 | aplicação | quem entrou tarde não segura a pergunta | `submit-answer.test.ts` |
| CA-26 a CA-30, CA-32 | aplicação | início com sorteio; recarregar mantém; jogar novamente sorteia de novo | `start-game.test.ts` |
| CA-37 | aplicação | três certas, duas certas, duas certas e a errada | `submit-answer.test.ts` (já existe; conferir) |
| CA-04, CA-09, CA-13 | adapter | colunas novas, `saveSettings` não toca na fase, `countEligible`, preferências | `drizzle-game-*.test.ts`, `drizzle-host-preferences-repository.test.ts` |
| CA-08, CA-23, CA-31 | API | `game.setOptions`; o que o celular recebe com a opção ligada | `routers/game.test.ts` |
| CA-01 a CA-03, CA-07, CA-09, CA-31 | componente | painel, chaves, falha, desabilitadas no jogo | `host/game-settings.test.tsx` |
| CA-10, CA-15, CA-16 | componente | cabeçalho com PIN, bloqueado, QR | `host/game-header.test.tsx` |
| CA-12, CA-20 a CA-22c, CA-25 | componente | espera de quem entrou; celular com textos, imagem e tempo | `player/player-stage.test.tsx` |
| CA-34 a CA-36, CA-38, CA-39 | componente | marcar, enviar, nada marcado, tempo acaba, seleção simples | `player/answer-buttons.test.tsx`, `join-flow.test.tsx` |
| CA-01, CA-10 a CA-12, CA-20, CA-27, CA-34, CA-35 | E2E | painel, entrada no meio, perguntas no celular, múltipla escolha | `apps/web/e2e/game-options.spec.ts` |

Os testes das specs 008 e 009 que esperam "Este jogo já começou." passam a esperar a entrada.

## Dados e migração

`pnpm -F @quizio/db db:push`: três colunas em `game`, uma em `game_player` e a tabela `host_preferences`. Os padrões cobrem as partidas e os jogadores que já existem.

## Riscos e decisões

- **Gravação só das configurações** (`saveSettings`). Sem ela, bloquear durante o jogo regravaria a fase lida um instante antes e poderia desfazer um avanço. É a correção de um risco que hoje não aparece só porque o bloqueio vive no lobby.
- **Corrida na entrada**: um jogador pode entrar no exato instante em que as respostas abrem. Ele fica com a pergunta atual como primeira e pode respondê-la; a conta de "todos responderam" o inclui a partir daí. O pior caso é a fase esperar o tempo dele acabar.
- **Textos no canal público**: o enunciado e os textos passam pelo canal da partida. Não é vazamento: já estão na tela projetada. A certa continua fora (RN-20).
- **Opção mudada no meio de uma fase** só aparece na fase seguinte (RN-21); o celular que recarrega no meio já recebe o formato novo. Aceito.
- **Sorteio antes da cópia**: se a gravação das perguntas falhar depois do sorteio, um novo Iniciar sorteia de novo; nada foi mostrado ainda.
- **Preferências numa tabela própria**, no contexto `game`: o criador é só um identificador ali, e a tabela de usuário é gerada pelo Better Auth, que não se edita à mão.
- **Dois primitivos novos** (`Switch`, `Sheet`) no design system, adicionados pela CLI do shadcn e convertidos ao padrão do projeto.
- **Sem ADR novo**: o ADR 0009 ganha notas sobre a entrada durante o jogo e a gravação das configurações.

## Desvios na implementação (2026-10-02)

- **`Switch` e `Sheet` escritos à mão**, no padrão dos outros primitivos (`cva`, `cn`, `data-slot`, sobre `@base-ui/react`), em vez de gerados pela CLI do shadcn: num worktree a CLI grava o arquivo na raiz do checkout principal.
- **O palco público manda a imagem e os textos das alternativas só a partir da fase de respostas**; na abertura vai só o enunciado. Assim o canal público não adianta as alternativas ao que a tela do anfitrião mostra.
- **`setGameOptions` relê a partida depois de gravar** e devolve a visão do que está gravado; a tela do anfitrião aproveita da resposta só as opções, porque a fase que vem nela pode ser mais velha que a de um avanço que acabou de aparecer.
- **Sem `lib/game-mutations.test.tsx`**: a mudança otimista virou um evento do lobby (`optionsChanged` em `applyLobbyEvent`, testado em `game-lobby.test.ts`); a volta em caso de falha (CA-07) está na rota e é coberta pelo E2E, que derruba o pedido.
- **O celular consulta a sessão logo depois de entrar**: quem entra com o jogo em andamento não viu os eventos da partida, e sem isso ficaria na espera do lobby até a próxima consulta.
- **Quem espera a próxima pergunta é decidido no servidor** (`sittingOut`); num evento de fase o celular mantém a espera enquanto a pergunta for a mesma.
- **Os testes de `setGameLocked` e `findGameByPin` ficaram nos arquivos que já os tinham** (`host-lobby.test.ts`, `join-game.test.ts`); os de repositório, num arquivo novo, `drizzle-game-options.test.ts`.
- **`GAME.ALREADY_STARTED` continua existindo** só para "Iniciar" numa partida que já começou; a mensagem "Este jogo já começou." saiu.
- **`DrizzleHostPreferencesRepository` recebe um relógio opcional** para o `updated_at`, que é só registro da linha.
- **`saveSettings` virou `saveLocked` e `saveOptions`** (corrigido depois do fechamento): gravar o bloqueio e as três opções de uma vez perdia uma mudança quando duas chaves eram viradas em seguida, porque o segundo pedido regravava a outra chave com o valor que tinha lido antes. Agora cada pedido grava só o que mudou, na partida e nas preferências. O E2E pegou a falha, de forma intermitente.
