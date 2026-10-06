---
spec: "013"
status: approved # draft | approved
---

# Plano técnico — 013 Opções de jogo 2/3: Robustez da partida

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0009](../../../docs/adr/0009-partida-ao-vivo.md)

## Abordagem

Três entregas, do menor para o maior:

1. **"Encerrar agora"** é só tela: uma linha a mais no painel de Configurações, que abre a confirmação que o botão de sair já abre. Nenhuma regra muda no servidor.
2. **Conexão perdida** (anfitrião e jogador) também é quase só tela: cada tela já pergunta ao servidor de tempos em tempos; passa a reparar quando a pergunta fica **sem resposta** (diferente de receber uma recusa), avisa e tenta de novo a cada 5 s. A mesma peça serve às duas telas.
3. **Anfitrião ausente** é a única parte com servidor. A partida ganha **o instante do último sinal do anfitrião**. A tela do anfitrião dá sinal a cada 4 s; a sessão do jogador, que o celular já consulta, passa a dizer há quanto tempo o anfitrião não dá sinal. Com 10 s ou mais, o celular mostra a barra. Sem temporizador no servidor e sem presença do Pusher: é uma coluna e uma conta, como o resto da partida (ADR 0009).

Dois cuidados que saem do código de hoje:

- **A tela do anfitrião troca o jogo por uma página de erro quando uma consulta de fundo falha** (`view.isError`). Com esta spec, se a tela já tem a partida, ela continua mostrando a partida, com o diálogo por cima.
- **O pedido de avanço não se repete depois de uma falha de rede.** Hoje, se o prazo vence com o anfitrião sem conexão, o pedido falha e a tela fica parada mesmo depois que a conexão volta. A tela passa a pedir de novo quando reconecta (RN-11).

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Sinal do anfitrião | `Game.hostSeenAt`, `signalHost`, `HOST_SIGNAL_INTERVAL_MS` | sim |
| Anfitrião ausente | `isHostAway`, `hostIdleMs`, `HOST_AWAY_AFTER_MS` | sim |
| O anfitrião voltou | evento `host-back` (`GAME_EVENTS.hostBack`) | sim |
| Conexão perdida | `isConnectionFailure`, `useConnectionWatch` | sim |
| Encerrar agora | `GameSettings` `onEnd` (reusa `endGame`) | não |

## Domínio — `packages/core/src/game/domain`

### Agregados e entidades

**`game.ts`**

- `Game.hostSeenAt: Date` — quando a tela do anfitrião deu sinal pela última vez. `newGame` começa com `now`: quem cria a partida está na tela.

**`host-presence.ts`** (novo)

```ts
/** How often the host's screen tells the server it is there. */
export const HOST_SIGNAL_INTERVAL_MS = 4_000;
/** Without a signal for this long, the host counts as away (spec 013, RN-14). */
export const HOST_AWAY_AFTER_MS = 10_000;

/** How long ago the host's screen last gave a sign; null once the game is over (RN-19). */
export function hostIdleMs(game: Game, now: Date): number | null;
export function isHostAway(game: Game, now: Date): boolean;
```

`hostIdleMs` devolve `null` para partida terminada ou encerrada (`!isGameOpen`), e nunca um número negativo. Com o sinal a cada 4 s, o anfitrião só conta como ausente depois de dois sinais perdidos.

### Value objects

Nenhum.

### Serviços de domínio

Nenhum. RN-10 (as respostas valem sem o anfitrião), RN-24 (pergunta perdida conta como sem resposta), RN-25 (a pergunta espera por quem caiu) e RN-26 (nada muda para o anfitrião) **já são o comportamento de hoje**: `submitAnswer` não depende do anfitrião, `countEligible` conta todos os jogadores ativos e o placar sai das respostas. O plano só acrescenta testes com o nome dessas regras.

### Erros de domínio

Nenhum novo.

## Aplicação — `packages/core/src/game/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `signalHost` (novo) | `{ ownerId, gameId }` | `{ status: GameStatus }` | `GAME.NOT_FOUND` (partida de outro dono ou inexistente) | `games` (`findById`, `save` via `loadGame`, `saveHostSeen`), `realtime`, `clock` |
| `getPlayerSession` (alterado) | igual | `PlayerSessionView` com `hostIdleMs` | iguais | iguais |

**`signalHost`**: carrega com `loadGame` (que aplica o prazo de 8 horas) e exige o dono. Se a partida está aberta: lê `isHostAway` com o valor guardado, grava `saveHostSeen(gameId, now)` e, **se estava ausente**, publica `host-back`. Numa partida terminada ou encerrada não grava nem publica: só responde. Nunca recusa uma partida que existe, porque a tela usa a resposta como prova de que há conexão (no pódio também, RN-09).

**`getPlayerSession`**: `PlayerSessionView.hostIdleMs = hostIdleMs(game, clock.now())` — `null` fora de `waiting` e `playing` (jogador removido, partida terminada ou encerrada). O celular decide com `HOST_AWAY_AFTER_MS`.

### Portas novas ou alteradas

```ts
// ports/game-repository.ts
export interface GameRepository {
	// ...
	/**
	 * Stores when the host's screen last gave a sign, and nothing else: it is
	 * written every few seconds and must never undo a stage or a setting.
	 */
	saveHostSeen(gameId: string, at: Date): Promise<void>;
}
```

`InMemoryGameRepository` ganha `saveHostSeen`; `aGame()` ganha `hostSeenAt` (igual a `createdAt` por padrão). `save` continua regravando a linha inteira, o que inclui `hostSeenAt`; ele só é usado para encerrar, quando o valor já não importa. `saveIfAt`, `saveLocked` e `saveOptions` não tocam na coluna.

## Adapters

### Banco — `packages/db`

- `schema/game.ts`: coluna `host_seen_at timestamp not null default now()` na tabela `game`.
- `drizzle-game-repository.ts`: `saveHostSeen` com `update ... set host_seen_at` por id. `toGame`/`toRow` levam o campo sem conversão.

### Real-time

| Canal | Evento | Payload | Publicado por (caso de uso) | Assinado por (tela) |
| --- | --- | --- | --- | --- |
| `game-{id}` | `host-back` | `{}` | `signalHost`, só quando o anfitrião estava ausente | `JoinFlow`: tira a barra na hora |

É uma dica, como os outros: quem perde o evento descobre na próxima consulta da sessão. **Não há evento de "anfitrião saiu"**: sem temporizador no servidor, ninguém está lá para publicá-lo; o celular descobre pela sessão. Um `stage-changed` também prova que o anfitrião está lá e tira a barra.

### Storage / outros

Nada.

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `game.signal` | mutation | protegida | `{ gameId }` | `{ status }` | `GAME.NOT_FOUND` |
| `game.join.session` | query | pública | igual | ganha `hostIdleMs: number \| null` | iguais |

Ligações novas em `container.ts`: `signalHost` com `games`, `realtime` e `clock`. `composition-root.ts` não muda.

## UI — `apps/web` e `packages/ui`

### Peças comuns — `apps/web/src/lib`

**`connection.ts`** (novo)

```ts
/** No answer from the server: the network, not a refusal (spec 013, RN-04). */
export function isConnectionFailure(error: unknown): boolean;
/** Rejects with a connection failure when `request` takes longer than `ms`. */
export function withTimeout<T>(request: Promise<T>, ms?: number): Promise<T>;

export const CONNECTION_RETRY_MS = 5_000;
export const CONNECTION_TIMEOUT_MS = 5_000;
```

`isConnectionFailure` é verdadeiro para uma falha de `fetch` (erro do cliente tRPC **sem** `data`: o servidor não respondeu no formato da API) e para o tempo-limite; falso para qualquer erro com `data` (recusa de domínio, não encontrado, não autorizado). O tempo-limite é uma corrida (`Promise.race`), sem abortar o pedido: o cliente manda os pedidos em lote, e abortar um deles não é confiável.

**`use-connection-watch.ts`** (novo)

```ts
export interface ConnectionWatch {
	lost: boolean;
	/** A retry is on its way. */
	retrying: boolean;
	/** Whole seconds to the next retry. */
	retryInSeconds: number;
	/** "Reconectar": tries now. */
	retryNow: () => void;
	/** What a request of the screen ended in: a connection failure marks it lost. */
	report: (error: unknown) => void;
}
export function useConnectionWatch(options: {
	enabled: boolean;
	/** Asks the server anything; resolves when it answers. */
	probe: () => Promise<unknown>;
	onBack?: () => void;
}): ConnectionWatch;
```

- Fica **perdida** quando o navegador dispara `offline` ou quando `report` recebe uma falha de conexão.
- Perdida, conta 5 s (`retryInSeconds` de 5 a 1), chama `probe`, e ou volta (`onBack`) ou recomeça a contagem (RN-06). `online` do navegador e `retryNow` tentam na hora (RN-07).
- O estado e as transições ficam numa função pura (`connectionReducer`), testada sem relógio; o hook só liga os eventos do navegador e o temporizador.

### Tela do anfitrião

**`routes/_auth/host.$gameId.tsx`**

- `signal = () => withTimeout(client.game.signal.mutate({ gameId }))`, com `useTRPCClient`.
- `useConnectionWatch({ enabled: status !== "ended", probe: signal, onBack: refresh })`.
- **Sinal periódico** (`lib/use-host-signal.ts`, um hook testado à parte, já que a rota não tem teste de componente): enquanto a partida está no lobby ou em jogo e a conexão não está perdida, chama `signal` a cada `HOST_SIGNAL_INTERVAL_MS` e logo ao montar; a falha vai para `report`. No pódio não há sinal periódico (RN-19); a queda é percebida pelo `offline` do navegador e a volta pelo `probe`.
- Consulta `game.view`: com dados na tela, uma falha de consulta **não** troca a tela por `GameUnavailable`; a falha vai para `report`. A página de erro continua para a primeira carga e para "não encontrada".
- `advanceFrom`: uma falha de conexão vai para `report`, sem toast. `failed` (travar, opções, remover, encerrar) idem: com o diálogo aberto o toast é ruído.
- Renderiza `ConnectionLostDialog` ao lado da tela (lobby, jogo e pódio), e passa `connected={!watch.lost}` para `HostStage`.
- Ao voltar (`onBack`): `refresh()`. Se a partida foi encerrada durante a queda, a consulta mostra "Esta partida foi encerrada." (RN-13).

**`components/game/host/connection-lost-dialog.tsx`** (novo) — `AlertDialog` de `packages/ui`, controlado por `watch.lost` e sem atender pedidos de fechar (Esc e clique fora não fecham; sem X; RN-08). Como é modal, o resto da tela fica inerte. Título "Conexão perdida", os dois textos da RN-05, um ícone de conexão (`WifiOffIcon`), a linha "Tentando novamente em {n} segundos…" ou "Reconectando…" (`aria-live`), e o botão "Reconectar", que recebe o foco ao abrir (RN-29). A entrada e a saída usam a animação que o `AlertDialog` já tem, que respeita movimento reduzido.

**`host-stage.tsx`** — prop `connected: boolean`. O efeito que pede o avanço no prazo passa a depender dela: desconectada, não pede; ao reconectar, o efeito roda de novo e pede na hora se o prazo já venceu (RN-11, CA-13).

**`game-settings.tsx`** — prop `onEnd: () => void`. Depois da lista de chaves, uma seção separada por linha com "Encerrar jogo" e o botão "Encerrar agora" (`Button`, variante padrão azul). `HostStage` e `HostLobby` passam `onEnd={() => setEnding(true)}`: a confirmação `EndGameDialog` abre por cima do painel, e cancelar volta a ele (RN-02).

### Celular do jogador

**`components/game/player/connection-bar.tsx`** (novo) — barra fixa na borda de baixo, `role="status"`: indicador de espera, "Conexão perdida" em destaque, a segunda linha (`"O anfitrião se desconectou"` ou `"Tentando reconectar…"`) e o botão "Sair". Atrás, uma camada escura que cobre a tela **sem receber toques** (`pointer-events-none`), para as alternativas continuarem tocáveis (RN-17). Entra e sai com `motion` (`AnimatePresence`, sobe da borda), dentro de `GameMotion`; com movimento reduzido aparece e some sem animação e o indicador não gira (`motion-safe:animate-spin`).

**`join-flow.tsx`**

- `JoinApi.session` e `JoinApi.answer` passam por `withTimeout` na rota (`routes/join.tsx`).
- `useConnectionWatch({ enabled: playerId !== null && !settled, probe: checkSession })`. `checkSession` passa a devolver/relatar a falha de conexão em vez de engoli-la.
- O estado `waiting` guarda `hostAway: boolean`, atualizado a cada resposta da sessão (`view.hostIdleMs !== null && view.hostIdleMs >= HOST_AWAY_AFTER_MS`) e zerado por `host-back` e por `stage-changed`.
- **Quando perguntar de novo**: a espera entre consultas deixa de ser um intervalo fixo e passa a ser `nextSessionCheckInMs(hostIdleMs, interval)` (função pura em `lib/game-stage.ts`): o menor entre o intervalo de hoje (15 s no lobby, 5 s em jogo) e o tempo que falta para o silêncio do anfitrião chegar a 10 s. Assim a barra aparece perto dos 10 s também no lobby, e a decisão sempre vem de uma resposta do servidor, nunca de uma conta feita no celular (CA-18, CA-19, CA-24).
- O que a barra mostra: `watch.lost` → "Tentando reconectar…" (prioridade, RN-21); senão `hostAway` → "O anfitrião se desconectou"; senão nada. A barra aparece no passo `waiting` enquanto a partida está no lobby ou em jogo.
- **"Sair"** (`stepOut`): vai para o passo `rejoin` com o PIN e o apelido, **sem** apagar a sessão guardada (diferente de `leave`), e tira o PIN do endereço. A tela "Voltar como {apelido}" já existe (RN-18).
- `submitAnswer`: uma falha de conexão mostra `ANSWER_NOT_SENT_MESSAGE` ("Sua resposta não foi enviada."), devolve as alternativas (já acontece) e vai para `report` (RN-23). Se o servidor tinha recebido a resposta que estourou o tempo-limite, a nova tentativa volta `GAME.ALREADY_ANSWERED`, que já é tratada como enviada.

**`lib/game-error-messages.ts`** — `ANSWER_NOT_SENT_MESSAGE`.

**`lib/api-types.ts`** — `PlayerSessionData` ganha `hostIdleMs` pela inferência do router.

### Design system

Nenhuma primitiva nova em `packages/ui`.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | componente | shows "Encerrar jogo" with "Encerrar agora" after the switches | `apps/web/src/components/game/host/game-settings.test.tsx` |
| CA-02 | componente + E2E | "Encerrar agora" asks and ends the game · ending from the settings sends the players back to the PIN | `host-stage.test.tsx`, `host-lobby.test.tsx` · `apps/web/e2e/game-connection.spec.ts` |
| CA-03 | componente | cancelling keeps the game and the panel | `host-stage.test.tsx` |
| CA-04 | aplicação (já coberto, spec 011 CA-05) | a game ended in the middle has no podium | `packages/core/src/game/application/get-host-game.test.ts` |
| CA-05 | hook + componente | a connection failure marks the connection lost · shows the dialog with the countdown and "Reconectar" | `apps/web/src/lib/use-connection-watch.test.ts`, `host/connection-lost-dialog.test.tsx` |
| CA-06 | hook | retries every 5 seconds and starts the countdown again | `use-connection-watch.test.ts` |
| CA-07 | hook + componente | "Reconectar" tries at once | `use-connection-watch.test.ts`, `connection-lost-dialog.test.tsx` |
| CA-08 | hook + E2E | comes back by itself when a retry is answered · the host's dialog closes when the network returns | `use-connection-watch.test.ts` · `game-connection.spec.ts` |
| CA-09 | componente | Escape and a click outside do not close it | `connection-lost-dialog.test.tsx` |
| CA-10 | unidade | a refusal of the server is not a connection failure | `apps/web/src/lib/connection.test.ts` |
| CA-11 | aplicação (já coberto) + componente | the time left is the server's after a gap · keeps the countdown across a reconnection | `get-host-game.test.ts`, `host-stage.test.tsx` |
| CA-12 | aplicação | an answer counts while the host is away | `packages/core/src/game/application/submit-answer.test.ts` |
| CA-13 | componente + E2E | asks for the next stage again when the connection returns · a question whose time ran out offline goes to its results | `host-stage.test.tsx` · `game-connection.spec.ts` |
| CA-14 | aplicação (já coberto) + E2E | a player who joined meanwhile shows when the host is back | `host-lobby.test.ts` · `game-connection.spec.ts` |
| CA-15 | componente (já coberto, spec 011) + hook | goes on from where the reveal is after a reload · the watch works without the periodic signal | `podium.test.tsx`, `use-connection-watch.test.ts` |
| CA-16 | aplicação | a signal never ends or moves the game | `packages/core/src/game/application/signal-host.test.ts` |
| CA-17 | aplicação | tells the status of a game past its deadline, without marking the host present | `signal-host.test.ts` |
| CA-18 | domínio + aplicação + componente | the host is away after 10 s without a signal · the session tells how long the host has been silent · shows "O anfitrião se desconectou" | `domain/host-presence.test.ts`, `get-player-session.test.ts`, `player/join-flow.test.tsx` |
| CA-19 | domínio + unidade | a host silent for less than 10 s is not away · asks again when the silence would reach 10 s | `host-presence.test.ts`, `apps/web/src/lib/game-stage.test.ts` |
| CA-20 | aplicação + componente | publishes "host-back" only when the host was away · the bar goes away with "host-back" and with a new stage | `signal-host.test.ts`, `join-flow.test.tsx` |
| CA-21 | E2E | closing the host's tab shows the bar, reopening hides it | `game-connection.spec.ts` |
| CA-22 | componente | an answer is sent with the bar showing | `join-flow.test.tsx` |
| CA-23 | componente | "Sair" keeps the session and offers the way back | `join-flow.test.tsx` |
| CA-24 | componente | the bar shows in the lobby too | `join-flow.test.tsx` |
| CA-25 | domínio + componente | no idle time for a game that is over · no bar on the final screen | `host-presence.test.ts`, `join-flow.test.tsx` |
| CA-26 | componente + E2E | a failed check shows "Tentando reconectar…" · the phone warns offline and returns by itself | `join-flow.test.tsx` · `game-connection.spec.ts` |
| CA-27 | componente | the device's own connection comes before the host's | `join-flow.test.tsx` |
| CA-28 | componente + E2E | returns to the current stage as the same player | `join-flow.test.tsx` · `game-connection.spec.ts` |
| CA-29 | componente | an answer that got no reply shows "Sua resposta não foi enviada." and the buttons again | `join-flow.test.tsx` |
| CA-30 | componente | the answer can be sent again | `join-flow.test.tsx` |
| CA-31 | aplicação (já coberto, spec 010) | no answer gives no points and resets the streak | `get-player-session.test.ts` |
| CA-32 | aplicação | the answers stay open while someone has not answered | `submit-answer.test.ts` |
| CA-33 | aplicação | a player who stopped answering stays in the count and in the final standings | `get-host-game.test.ts` |
| CA-34 | componente | an ended game leads to the PIN when the device is back | `join-flow.test.tsx` |
| CA-35 | componente (já coberto, spec 011) | a finished game shows the final screen when the device is back | `join-flow.test.tsx` |
| CA-36 | componente | with reduced motion the bar shows without animation | `player/connection-bar.test.tsx` |
| CA-37 | componente | the dialog is an alert and focuses "Reconectar" · the bar is a status | `connection-lost-dialog.test.tsx`, `connection-bar.test.tsx` |

Além disso:

- **Repositório** (`packages/db/src/repositories/game/drizzle-game-repositories.test.ts`): `saveHostSeen` grava só a coluna; um avanço (`saveIfAt`) e uma opção (`saveOptions`) gravados antes continuam como estavam.
- **Router** (`packages/api/src/routers/game.test.ts`): `game.signal` exige sessão, recusa a partida de outro dono com `NOT_FOUND` e faz `game.join.session` devolver `hostIdleMs` perto de zero.
- **E2E** (`game-connection.spec.ts`): a queda é simulada com `context.setOffline(true)` em cada contexto (anfitrião, jogador) e, para a aba fechada, `page.close()`. São cinco cenários; os de anfitrião ausente esperam mais de 10 s de verdade.

## Dados e migração

`pnpm -F @quizio/db db:push` para a coluna `host_seen_at` (com padrão `now()`, as partidas que já existem ficam válidas). Sem backfill.

## Riscos e decisões

- **Presença por coluna, não por canal de presença do Pusher.** O canal de presença avisaria na hora quando a aba fecha, mas exige um endpoint de autorização para anfitrião e jogadores, só percebe uma queda de rede depois do tempo-limite do próprio soquete (dezenas de segundos) e poria estado fora do banco. A coluna segue o ADR 0009: o estado é uma linha e os eventos são dicas. Proponho registrar a decisão como **nota no ADR 0009** ao fechar, sem ADR novo.
- **Uma gravação a cada 4 s por partida aberta**, mais um pedido da tela do anfitrião. É uma atualização por chave primária; aceitável para o tamanho do projeto.
- **O celular consulta a sessão um pouco mais no lobby** (a cada 6 a 10 s, em vez de 15 s), para a barra aparecer perto dos 10 s. Em jogo, continua a cada 5 s.
- **Aba do anfitrião em segundo plano.** O navegador atrasa os temporizadores de uma aba escondida (em minutos, para um por minuto). Os jogadores veriam "O anfitrião se desconectou", o que é verdade na prática: com a aba escondida, o jogo também não avança no prazo.
- **Diálogo por cima do painel.** A confirmação de encerrar abre sobre o `Sheet` aberto, e o diálogo de conexão pode abrir sobre os dois. São diálogos aninhados do base-ui; a ordem e o foco são conferidos no navegador durante a implementação.
- **Tempo-limite sem abortar.** Uma resposta que estoura os 5 s pode ter chegado ao servidor. Para a resposta do jogador isso já é seguro (`GAME.ALREADY_ANSWERED` conta como enviada); para o sinal e para a sessão, repetir não muda nada.
- **Precisão dos 10 s.** O celular decide com o que o servidor respondeu, então a barra aparece entre 10 s e cerca de 10,5 s mais a latência; nunca antes.

## Desvios na implementação

- **A confirmação de encerrar fica dentro do painel.** O plano previa `GameSettings` com `onEnd` abrindo a confirmação da tela. Para o cancelar voltar ao painel sem fechá-lo, o `EndGameDialog` é renderizado dentro do `Sheet`, e `onEnd` só é chamado depois de confirmado.
- **`AlertDialog` passa a respeitar movimento reduzido na raiz** (`motion-reduce:animate-none!` no fundo e no conteúdo, em `packages/ui`). O plano dizia que a animação do diálogo já respeitava; não respeitava.
- **O teste de `saveHostSeen` ficou num arquivo próprio** (`drizzle-game-host-signal.test.ts`), em vez de `drizzle-game-repositories.test.ts`.
- **A sessão guarda o silêncio do anfitrião no passo `waiting`** (`hostIdleMs`), e não num estado à parte: assim a primeira leitura (ao entrar ou recarregar) já vale, sem esperar a consulta seguinte.
- **A barra do jogador fica na borda de baixo e leva o aviso para o alto.** O plano não dizia onde; a primeira versão cobria o "Enviar". O aviso "Sua resposta não foi enviada." aparece no alto da tela enquanto a barra está aberta (`ConnectionBar` `notice`).
- **A consulta da sessão virou uma cadeia de `setTimeout`**, no lugar do `setInterval`: cada resposta marca a próxima consulta com `nextSessionCheckInMs`. Sem conexão, quem pergunta é o `useConnectionWatch`.
- **Aviso nas ações do anfitrião sem conexão.** O plano tirava o toast de toda falha de conexão. Isso quebrou a CA-07 da spec 012 e o usuário decidiu manter o aviso: travar, opções, remover e encerrar avisam e abrem o diálogo; só o avanço automático de fase fica calado.
