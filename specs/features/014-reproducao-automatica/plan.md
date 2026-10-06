---
spec: "014"
status: approved # draft | approved
---

# Plano técnico — 014 Opções de jogo 3/3: Reprodução automática

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0009](../../../docs/adr/0009-partida-ao-vivo.md)

## Abordagem

A reprodução automática não cria um jeito novo de o jogo andar: ela dá **um prazo** a três momentos que hoje esperam um clique (o lobby, a revelação e o placar), e a tela do anfitrião, que já pede o avanço quando um prazo vence, passa a pedir nesses também. O servidor confere o prazo pelo próprio relógio, como faz com a abertura da pergunta e com as respostas.

Para o prazo ser do servidor, a partida guarda **desde quando a reprodução automática está ligada** (`autoplaySince`), no lugar de um simples ligado/desligado. Dele saem as duas contas:

- **revelação e placar**: 5 s a partir do que for mais tarde, o começo da fase ou o instante em que a chave foi ligada (RN-11, RN-12, RN-15);
- **lobby**: 15 s a partir do que for mais tarde, a última entrada de um jogador ou o instante em que a chave foi ligada, e só se há alguém no lobby (RN-05 a RN-08).

"A última entrada" conta também quem foi removido depois: assim, remover um jogador entre vários não mexe na contagem (RN-07), sem guardar mais nada.

Não há evento novo, tabela nova nem temporizador no servidor.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Reprodução automática | `GameOptions.autoplay`, `Game.autoplaySince` | sim |
| Contagem para iniciar | `autoStartRemainingMs`, `AUTOPLAY_START_MS` | sim |
| Contagem para avançar | `autoAdvanceRemainingMs`, `AUTOPLAY_ADVANCE_MS` | sim |
| Contagem na tela do anfitrião | `AutoCountdownView` (`remainingMs`, `token`) | sim |
| Início automático | `startGame` com `auto` | alterado |

## Domínio — `packages/core/src/game/domain`

### Agregados e entidades

**`game-options.ts`**

- `GameOptions.autoplay: boolean`; `DEFAULT_GAME_OPTIONS.autoplay = false` (RN-03).
- `changeGameOptions(game, change, now)`: ganha `now`. `autoplay` pode mudar no lobby e durante o jogo (RN-02). Ligar grava `autoplaySince = now`; desligar grava `null`; pedir o que já está não mexe no instante.

**`game.ts`**

- `Game.autoplaySince: Date | null` — desde quando a chave está ligada nesta partida. Invariante: `options.autoplay === (autoplaySince !== null)`.
- `newGame`: com `options.autoplay`, começa com `autoplaySince = now`.

**`autoplay.ts`** (novo)

```ts
/** The lobby starts by itself this long after the last player got in (spec 014, RN-05). */
export const AUTOPLAY_START_MS = 15_000;
/** The results and the scoreboard stay this long before moving on (RN-11, RN-12). */
export const AUTOPLAY_ADVANCE_MS = 5_000;

/**
 * Time left for the lobby to start by itself; null without autoplay, outside
 * the lobby or with nobody in it. `lastJoinedAt` counts removed players too.
 */
export function autoStartRemainingMs(
	game: Game,
	lobby: { activePlayers: number; lastJoinedAt: Date | null },
	now: Date,
): number | null;

/** Time left for the results or the scoreboard to move on; null otherwise. */
export function autoAdvanceRemainingMs(game: Game, now: Date): number | null;

/** What the countdown counts from: another instant is another countdown. */
export function autoStartToken(game: Game, lastJoinedAt: Date | null): string | null;
export function autoAdvanceToken(game: Game): string | null;
```

**`game-progress.ts`**

- `nextStage`: na revelação e no placar, com a reprodução automática ligada, um pedido antes do prazo é recusado com `GAME.STAGE_NOT_DUE`, como nas fases com tempo. Com ela desligada, nada muda: o pedido passa a qualquer momento (RN-04). `skip` continua valendo só para as respostas.
- `phaseDurationMs` e `remainingMsOf` **não mudam**: são o que vai para os celulares, e para o jogador nada muda (RN-20).

### Value objects

Nenhum.

### Serviços de domínio

Nenhum.

### Erros de domínio

Nenhum novo. O início automático antes da hora usa `GAME.STAGE_NOT_DUE`, que a tela já trata em silêncio.

## Aplicação — `packages/core/src/game/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `setGameOptions` (alterado) | `options` aceita `autoplay` | `HostGameView` | iguais | `games.saveOptions(gameId, change, now)`, `preferences`, `clock` |
| `startGame` (alterado) | ganha `auto?: boolean` | `HostGameView` | com `auto`, `GAME.STAGE_NOT_DUE` se a contagem não venceu ou a chave está desligada | `players.lastJoinedAt` |
| `advanceGame` (alterado) | igual | igual | `GAME.STAGE_NOT_DUE` na revelação e no placar, com a chave ligada e antes do prazo | iguais |
| `hostGame` (alterado) | igual | igual | iguais | `preferences` já traz `autoplay` |
| `loadHostGameView` (alterado) | — | `autoStart` no lobby, `stage.autoAdvance` na revelação e no placar | — | `players.lastJoinedAt` |

**`startGame` com `auto`**: a tela pede o início quando a contagem dela chega a zero, mas um jogador pode ter entrado no último instante. Com `auto`, o servidor refaz a conta e recusa se ainda não venceu; a tela pergunta de novo e mostra a contagem nova. Sem `auto` (o clique em Iniciar), nada muda.

**`HostGameView`**

```ts
export interface AutoCountdownView {
	/** By the server's clock when the view was made. */
	remainingMs: number;
	/** Changes when the countdown starts over (a player joined, the switch turned). */
	token: string;
}
// HostGameView
autoStart: AutoCountdownView | null;      // lobby
// HostStageView
autoAdvance: AutoCountdownView | null;    // results and scoreboard
```

O `token` é o instante de que a contagem parte, como texto. A tela **não o compara com o relógio dela**: só o usa para saber que a contagem é outra, e então aceitar uma leitura que termina mais tarde (hoje ela fica com a que termina primeiro, `useSteadyTimeLeft`).

### Portas novas ou alteradas

```ts
// ports/player-repository.ts
export interface PlayerRepository {
	// ...
	/**
	 * When the last player got in, removed ones included: removing a player
	 * must not move the lobby's countdown back (spec 014, RN-07).
	 */
	lastJoinedAt(gameId: string): Promise<Date | null>;
}

// ports/game-repository.ts
/**
 * Stores only the options given. `at` is the instant autoplay counts from
 * when it is being turned on; one already on keeps the instant it has.
 */
saveOptions(gameId: string, change: Partial<GameOptions>, at: Date): Promise<void>;
```

Fakes: `InMemoryPlayerRepository.lastJoinedAt`, `InMemoryGameRepository.saveOptions` com `at`, `aGame()` com `autoplaySince: null`.

## Adapters

### Banco — `packages/db`

- `schema/game.ts`: `game.autoplay_since timestamp null` (uma coluna só: nula é desligada) e `host_preferences.autoplay boolean not null default false`.
- `drizzle-game-repository.ts`: `toGame` deriva `options.autoplay` de `autoplay_since`; `toRow` grava a coluna; `saveOptions` com `autoplay: true` faz `autoplay_since = coalesce(autoplay_since, at)` e com `false` grava `null`, sempre só nas colunas que mudaram (spec 012).
- `drizzle-player-repository.ts`: `lastJoinedAt` com `max(joined_at)` da partida, sem filtrar removidos.
- `drizzle-host-preferences-repository.ts`: a coluna nova entra no `find` e no `save` parcial.

### Real-time

Nenhum evento novo. A partida iniciada e a fase mudada já saem em `stage-changed`. A mudança da chave não vai para os celulares (RN-20).

### Storage / outros

Nada.

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `game.setOptions` | mutation | protegida | `options.autoplay?: boolean` | `HostGameView` | iguais |
| `game.start` | mutation | protegida | `auto?: boolean` | `HostGameView` | `GAME.STAGE_NOT_DUE` |
| `game.view`, `game.advance` | — | — | iguais | `autoStart`, `stage.autoAdvance` | `GAME.STAGE_NOT_DUE` no avanço |

`container.ts` e `composition-root.ts` não mudam: os casos de uso já recebem `clock` e `players`.

## UI — `apps/web` e `packages/ui`

**`components/game/host/auto-countdown.tsx`** (novo) — o bloco escuro com o número: `role="timer"`, com o nome do que conta ("Inicia em", "Avança em") e os segundos de `useCountdown`. O número troca com `motion-safe:animate-pop-in`; com movimento reduzido, sem animação (RN-22).

**`game-settings.tsx`** — a quinta chave, "Reprodução automática" (`PlayIcon`), com a explicação da RN-01, depois de "Mostrar respostas em ordem aleatória". Nunca fica desabilitada.

**`host-lobby.tsx`**

- Com `lobby.autoStart`, o grupo do cadeado e do Iniciar mostra `AutoCountdown` ("Inicia em") à direita (RN-09).
- Um efeito pede `actions.start(true)` quando a contagem chega a zero, com o mesmo cuidado do `HostStage`: se o servidor diz que ainda não é hora, a tela pergunta de novo. Ganha `connected`, como o `HostStage` (spec 013): sem conexão não pede, e pede ao voltar (RN-19).
- `HostLobbyActions.start: (auto?: boolean) => Promise<unknown>`.

**`host-stage.tsx`** — o efeito que pede o avanço no prazo passa a usar `stage.remainingMs ?? stage.autoAdvance?.remainingMs`, e a chave da contagem estável inclui o `token` (ligar e desligar a chave recomeça a contagem). O resto é o que já existe: pedir de novo no `STAGE_NOT_DUE`, e ao reconectar.

**`stage-screens.tsx` (`Results`) e `scoreboard.tsx`** — com `autoAdvance`, mostram `AutoCountdown` ("Avança em") **no lugar** do botão Avançar (RN-13); sem ele, o botão, como hoje.

**`routes/_auth/host.$gameId.tsx`**

- `start` passa `auto`; a recusa `STAGE_NOT_DUE` é silenciosa e refaz a consulta.
- Com a chave ligada, `player-joined` e `player-removed` refazem a consulta além de mexer na lista: a contagem do lobby é do servidor (RN-06, RN-07).
- `setOptions`: a resposta já traz a partida; quando `autoplay` muda, a consulta é refeita para a contagem aparecer ou sumir (RN-08, RN-15).

**`lib/game-lobby.ts`** — `optionsChanged` leva `autoplay`; ao desligar, a contagem some na hora (`autoStart` e `stage.autoAdvance` ficam nulos), sem esperar o servidor.

**`lib/use-countdown.ts`** — nada novo: `useSteadyTimeLeft(key, …)` já recomeça com outra chave.

### Design system

Nenhuma primitiva nova.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | componente | shows Reprodução automática, off, before Encerrar jogo | `apps/web/src/components/game/host/game-settings.test.tsx` |
| CA-02 | aplicação + repositório | autoplay is saved for the next game · stores and reads the host's autoplay | `packages/core/src/game/application/set-game-options.test.ts`, `packages/db/src/repositories/game/drizzle-game-options.test.ts` |
| CA-03 | E2E (já coberto pela CA-07 da 012, mesma chamada) + componente | asks for the change at once | `game-settings.test.tsx` |
| CA-04 | domínio | no countdown without autoplay · the results wait for the host without autoplay | `packages/core/src/game/domain/autoplay.test.ts`, `domain/game-progress.test.ts` |
| CA-05 | domínio + componente + E2E | counts 15 s from the last player · shows the countdown beside Iniciar and starts at zero | `autoplay.test.ts`, `host-lobby.test.tsx`, `apps/web/e2e/game-autoplay.spec.ts` |
| CA-06 | domínio | an empty lobby has no countdown | `autoplay.test.ts` |
| CA-07 | domínio + aplicação | a player who joins restarts the countdown · an automatic start before the new deadline is refused | `autoplay.test.ts`, `packages/core/src/game/application/start-game.test.ts` |
| CA-08 | aplicação + componente | Iniciar starts before the countdown ends, once | `start-game.test.ts`, `host-lobby.test.tsx` |
| CA-09 | domínio + aplicação | removing the last player stops the countdown, and the next one starts another | `autoplay.test.ts`, `get-host-game.test.ts` |
| CA-10 | aplicação + repositório | removing one of several leaves the countdown · lastJoinedAt counts removed players | `get-host-game.test.ts`, `drizzle-game-options.test.ts` |
| CA-11 | domínio + aplicação | turning autoplay on in the lobby counts from then | `game-options.test.ts`, `set-game-options.test.ts` |
| CA-12 | domínio + componente | turning it off cancels the countdown · the countdown goes away at once | `game-options.test.ts`, `apps/web/src/lib/game-lobby.test.ts` |
| CA-13 | domínio | a locked game keeps counting | `autoplay.test.ts` |
| CA-14 | aplicação | tells the time really left of the lobby's countdown | `get-host-game.test.ts` |
| CA-15 | domínio + aplicação + componente | the results move on 5 s in · refuses an advance before that · shows the countdown in place of Avançar and asks at zero | `game-progress.test.ts`, `advance-game.test.ts`, `host-stage.test.tsx` |
| CA-16 | domínio + componente | the scoreboard moves on 5 s in · shows the countdown in place of Avançar | `game-progress.test.ts`, `scoreboard.test.tsx` |
| CA-17 | aplicação | the last results finish the game by themselves | `advance-game.test.ts` |
| CA-18 | aplicação + componente + navegador | an automatic start goes through once the countdown is over · walks results and scoreboard by their deadlines · asks at zero (lobby and stage) · conferência manual de uma partida inteira | `start-game.test.ts`, `advance-game.test.ts`, `host-lobby.test.tsx`, `host-stage.test.tsx` |
| CA-19 | domínio | autoplay leaves the answers' time alone | `game-progress.test.ts` |
| CA-20 | domínio + componente | off, the results have no deadline · Avançar is back when the countdown goes | `autoplay.test.ts`, `host-stage.test.tsx` |
| CA-21 | domínio | turned on during the results, counts 5 s from then | `autoplay.test.ts` |
| CA-22 | domínio + E2E | a finished game has no countdown · the podium stays | `autoplay.test.ts`, `game-autoplay.spec.ts` |
| CA-23 | aplicação | tells the time really left of the results' countdown | `get-host-game.test.ts` |
| CA-24 | aplicação (já coberto, spec 009) | two requests from the same stage move it once | `advance-game.test.ts` |
| CA-25 | componente | asks for the next stage when the connection returns | `host-stage.test.tsx` |
| CA-26 | componente | starts when the connection returns and the countdown is over | `host-lobby.test.tsx` |
| CA-27 | aplicação | the player's session has no countdown and no deadline in the results | `get-player-session.test.ts` |
| CA-28 | componente | is a timer named after what it counts · does not animate with reduced motion | `host/auto-countdown.test.tsx` |

Além disso:

- **Repositório**: `saveOptions` com `autoplay` ligado duas vezes mantém o primeiro instante; ligar não desfaz um avanço gravado antes; a partida lida de volta tem `options.autoplay` de acordo com a coluna.
- **Router** (`packages/api/src/routers/game.test.ts`): `game.setOptions` com `autoplay`; `game.start` com `auto` antes da hora devolve `BAD_REQUEST` com `GAME.STAGE_NOT_DUE`; a partida de preferências salvas nasce com a chave ligada.
- **E2E** (`game-autoplay.spec.ts`): um cenário curto, por pedido do usuário (2026-10-06). Quiz de uma pergunta: a contagem aparece ao lado de Iniciar, o teste clica em Iniciar em vez de esperar os 15 s, o jogador responde e a revelação vai sozinha ao pódio em 5 s. A espera de 15 s, o placar e desligar a chave ficam nas camadas de baixo; nenhum teste automático espera os 15 s num navegador de verdade.

## Dados e migração

`pnpm -F @quizio/db db:push` para as duas colunas (`game.autoplay_since`, nula; `host_preferences.autoplay`, falsa por padrão). Sem backfill: partidas e preferências que já existem ficam com a chave desligada.

## Riscos e decisões

- **Um instante no lugar de um booleano.** `autoplay_since` serve de chave e de marco da contagem. A alternativa (um booleano e a contagem feita na tela) faria a contagem recomeçar a cada recarregamento e deixaria o início automático na mão do relógio do aparelho, contra o artigo V.
- **"Avançar" à mão é recusado antes do prazo com a chave ligada.** O botão some nesse caso (RN-13), então só uma segunda aba desatualizada chegaria a pedir; ela é recusada em silêncio e se atualiza.
- **A contagem do lobby depende de a tela saber das entradas.** O evento `player-joined` refaz a consulta; se o evento se perde, a tela pede o início na hora antiga, o servidor recusa (`auto`) e ela se corrige. O pior caso é a contagem na tela pular para o valor certo.
- **A consulta do lobby é refeita a cada entrada** com a chave ligada: numa sala entrando de uma vez, são várias consultas seguidas. O TanStack Query junta as que se sobrepõem; aceitável.
- **Aba do anfitrião escondida**: como na spec 013, o navegador atrasa os temporizadores e o jogo não avança no prazo. Vale ainda mais aqui, porque a ideia da chave é o anfitrião não ficar olhando: registrar no fechamento como limitação conhecida.
- **Comparações por igualdade nos testes antigos**: `GameOptions`, `HostGameView` e `Game` ganham campos; os testes que comparam o objeto inteiro precisam deles.
- Sem ADR novo: a decisão cabe na nota da spec 014 no ADR 0009, ao fechar.

## Desvios na implementação

- **Os testes de aplicação da reprodução automática ficaram num arquivo só**, `application/autoplay.test.ts` (visão do anfitrião, início automático e avanço), em vez de espalhados por `get-host-game.test.ts`, `start-game.test.ts` e `advance-game.test.ts`. Os de `setGameOptions` e de `hostGame` ficaram nos arquivos previstos.
- **`HostLobbyActions.start` passou a devolver uma promessa** que rejeita com o erro do servidor, como `advance` no `HostStage`: é o que deixa o lobby pedir de novo quando o servidor diz que ainda não é hora.
- **A rota também refaz a consulta depois de remover um jogador** (além dos eventos de entrada e saída), para a contagem sumir na hora quando o último sai.
- **A conferência da T17 foi feita com um roteiro do Playwright rodado uma vez e apagado**, e não no painel do navegador: a sessão do painel tinha expirado, e a partida precisava de um anfitrião e dois jogadores ao mesmo tempo.
