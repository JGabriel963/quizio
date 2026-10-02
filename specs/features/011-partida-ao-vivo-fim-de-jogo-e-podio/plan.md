---
spec: "011"
status: approved # draft | approved
---

# Plano técnico — 011 Partida ao vivo 4/4: Fim de jogo, pódio e animações

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0009](../../../docs/adr/0009-partida-ao-vivo.md)

## Abordagem

O plano tem duas metades que quase não se tocam.

**Fim de jogo.** O pódio **não é uma fase nova**: é o que as telas mostram de uma partida `finished`. A máquina de fases só perde um passo (a revelação da última pergunta termina a partida, sem placar), e a classificação final é a mesma conta da spec 010, feita até a última pergunta. Como uma partida terminada não muda mais, o pódio sai das respostas a cada leitura, sem tabela nova. A revelação em ordem usa o padrão dos prazos da spec 009: o servidor diz **quanto falta** para a revelação acabar, contado de `endedAt` pelo relógio dele, e a tela decide o que já mostra. "Jogar novamente" é a procedure `game.host` que já existe.

**Animações.** Ficam todas no cliente e são só apresentação (RN-25). O servidor passa a mandar o que falta para animar o placar: de onde cada faixa parte (lugar e total anteriores) e quem saiu dos cinco primeiros. As animações usam a biblioteca **`motion`** (a antiga Framer Motion), só nas telas do jogo: ela resolve o que é trabalhoso em CSS puro, que é a troca de lugar das faixas (`layout`), a saída de um elemento que deixa a tela (`AnimatePresence`) e as sequências com atraso. O que é simples continua em CSS (o salto de entrada, o brilho, o confete). A lógica de cada animação (de onde parte, aonde chega, o que já foi revelado) é uma função pura em `lib/`, testada sem relógio; os componentes só aplicam.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Pódio | `PODIUM_SIZE`, `PODIUM_REVEAL_MS`, `podiumRevealRemainingMs` | sim |
| Classificação final | `FinalView.standings` (`Standing[]`) | sim |
| Tela final do jogador | `PlayerFinalView` | sim |
| De onde a faixa parte | `ScoreboardEntry.previous` (`rank`, `total`) | sim |
| Quem saiu dos cinco | `scoreboardLeavers`, `HostStageView.scoreboardLeavers` | sim |
| Jogar novamente | `game.host` (já existe) | não |

## Domínio — `packages/core/src/game/domain`

### Agregados e entidades

**`game-progress.ts`**

- `nextStage`: em `results`, se é a última pergunta, a partida termina (`finished`, `progress: null`, `endedAt`); senão vai para `scoreboard`. Em `scoreboard`, sempre a abertura da pergunta seguinte (RN-01, RN-02). O ramo que terminava a partida no placar sai.

**`podium.ts`** (novo), puro:

```ts
export const PODIUM_SIZE = 3;

/** When each place shows, from the instant the game finished (RN-10). */
export const PODIUM_REVEAL_MS = { 3: 2_000, 2: 4_000, 1: 7_000 } as const;
export const PODIUM_REVEAL_TOTAL_MS = 7_000;

/** Time left of the podium's reveal, by the server's clock; 0 once it is over. */
export function podiumRevealRemainingMs(game: Game, now: Date): number;
```

`podiumRevealRemainingMs` usa `game.endedAt`; para uma partida que não está `finished`, devolve 0.

**`standings.ts`**

```ts
export interface ScoreboardEntry extends Standing {
	climbed: boolean;
	/** Where the row starts from; null in the first question's scoreboard (spec 011, RN-28). */
	previous: { rank: number; total: number } | null;
}

/** Who was among the first five before the question and is not anymore (RN-31). */
export function scoreboardLeavers(
	current: readonly Standing[],
	previous: readonly Standing[] | null,
): ScoreboardEntry[];
```

`scoreboardOf` continua devolvendo os cinco primeiros, agora com `previous`. `scoreboardLeavers` devolve quem estava entre os cinco em `previous` e está do 6º em diante em `current`, com o lugar e o total novos e o `previous`.

### Erros de domínio

Nenhum novo.

## Aplicação — `packages/core/src/game/application`

### Casos de uso

| Caso de uso | Mudança | Portas |
| --- | --- | --- |
| `advanceGame` | sem código novo: o fim na última revelação vem de `nextStage`; já publica `stage-changed` com `status: "finished"` | sem mudança |
| `getHostGame`, `advanceGame` (visão) | `HostGameView.final` numa partida terminada; `stage.scoreboardLeavers` no placar | sem mudança |
| `getPlayerSession` | `PlayerSessionView.final` numa partida terminada | sem mudança |
| `hostGame` | sem mudança: "Jogar novamente" o chama com o `quizId` da partida | sem mudança |

**`HostGameView`** ganha:

```ts
/** Only for a finished game: the podium and the full standings (spec 011). */
final: {
	/** Everybody, the first one first (RN-05, RN-14). The podium is the first three. */
	standings: Standing[];
	/** Left of the reveal by the server's clock; 0 once it is over (RN-10, RN-11). */
	revealRemainingMs: number;
} | null;
```

`loadHostGameView` preenche `final` quando `game.status === "finished"`: `rankPlayers(listActive, totalsThrough(questionCount − 1))`. Uma partida `ended` continua com `final: null` (RN-04).

**`HostStageView`** ganha `scoreboardLeavers: ScoreboardEntry[] | null`, preenchido só na fase `scoreboard`, junto com o placar (as duas somas já são feitas).

**`PlayerSessionView`** ganha:

```ts
/** Only for an active player of a finished game (spec 011, RN-18 to RN-21). */
final: {
	title: string;
	rank: number;
	total: number;
	revealRemainingMs: number;
} | null;
```

Um jogador removido continua com `status: "removed"` e `final: null` (CA-27).

### Portas novas ou alteradas

Nenhuma. `totalsThrough` e `listActive` já existem.

## Adapters

### Banco — `packages/db`

Nenhuma mudança de schema. O valor `scoreboard` do enum e a coluna `points` vieram na spec 010.

### Real-time

Nenhum evento novo. `stage-changed` com `status: "finished"` já avisa o fim. Lugares e pontos não vão por evento (RN-24): o anfitrião refaz `game.view`, e cada celular a própria sessão.

## API — `packages/api`

Nenhuma procedure nova. Mudam as saídas de `game.view`, `game.advance` e `game.join.session`. "Jogar novamente" usa `game.host`.

## UI — `apps/web`

### `lib/` (lógica pura e hooks)

- `podium.ts` — `revealedPlaces(elapsedMs)`: quais lugares já aparecem; `podiumOf(standings)`: os três primeiros nos degraus. Usa as constantes do core.
- `scoreboard-animation.ts` — `scoreboardSteps(entries, leavers)`: a lista de faixas em cada etapa (`before`: quem estava entre os cinco, na ordem e com os totais de antes; `after`: os cinco de agora) e `changed`, que diz se há o que animar (RN-28 a RN-32).
- `count-up.tsx` — `<CountUp from to />`: o número que sobe, com o `animate` da `motion`; o valor final fica no texto acessível, e a contagem é `aria-hidden`.
- `game-motion.tsx` — `GameMotion`: o `MotionConfig` das telas do jogo, com `reducedMotion="user"` (RN-27) e as durações padrão (RN-26); e `useReducedMotion` reexportado.
- `use-elapsed.ts` — o tempo passado desde o que o servidor disse, no mesmo molde de `useCountdown` (o relógio do aparelho só mede o próprio intervalo).
- `game-stage.ts` — `finalMessage(rank)`: "Imbatível!", "Por pouco!", "No pódio!" ou "Você ficou em 5º lugar" com "Obrigado por jogar!" (RN-20, RN-21).
- `game-mutations.ts` — `usePlayAgain(quizId)`: chama `game.host` e navega para o lobby novo; `GAME.QUIZ_NOT_PLAYABLE` e `GAME.QUIZ_NOT_FOUND` viram "Este quiz não pode mais ser jogado." (RN-16).

### `components/game/host/`

- `podium.tsx` (novo, substitui `game-finished.tsx`) — o título, os três degraus, cada lugar entrando no seu tempo com os pontos contando, o destaque do 1º e o confete; depois da revelação, "Classificação", "Jogar novamente" e "Voltar ao quiz". O cabeçalho sai sem confirmação (RN-12).
- `final-standings.tsx` (novo) — a lista completa, no estilo do placar, com "Voltar ao pódio".
- `scoreboard.tsx` — cada faixa é um `motion.li` com `layout`, dentro de `AnimatePresence`: trocar a ordem da lista faz as faixas deslizarem, quem entra sobe de baixo e quem sai desce e some. Sequência: estado anterior → contagem dos pontos → a lista passa à ordem nova → setas. Um estado de etapa (`before` → `counting` → `after`) avança por temporizador; com movimento reduzido ou sem mudança, começa em `after`. "Avançar" não depende da etapa (RN-25).
- `stage-screens.tsx`, `stage-choices.tsx` — as barras da revelação crescem do zero; cada fase entra com uma transição curta.
- `player-grid.tsx` — o apelido novo entra com um salto.

### `components/game/player/`

- `final-screen.tsx` (novo) — a espera "Rufem os tambores…" enquanto `revealRemainingMs` não zera; depois a medalha ou o lugar, a frase, "Entrar em outro jogo" e o rodapé com o total.
- `player-stage.tsx` — o sinal de certo ou errado entra com um salto; "+ N" e o total do rodapé contam (`useCountUp`).
- `join-flow.tsx` — numa partida terminada, guarda `final` da sessão e mostra `FinalScreen`; ao receber o evento do fim, mostra a espera e consulta a sessão. "Entrar em outro jogo" esquece a entrada daquele PIN e volta à entrada do PIN.

### `components/game/`

- `confetti.tsx` (novo) — peças em CSS com atraso e posição fixados por índice (sem sorteio, para o teste e o SSR); não renderiza com movimento reduzido.
- `stage-transition.tsx` (novo) — envolve o conteúdo de uma fase e o anima na entrada, com `key` da fase. Só entrada, sem `mode="wait"`: a fase nova aparece na hora (RN-25, CA-38).

### Rota

- `routes/_auth/host.$gameId.tsx` — `finished` mostra `Podium`, com `receivedAt` da consulta; a consulta periódica para numa partida terminada.

### `packages/ui`

`styles/globals.css` ganha os keyframes das animações simples (`pop-in`, `confetti-fall`, `podium-glow`), neutralizadas em `prefers-reduced-motion`. Sem primitivo novo.

### Dependência nova

`motion` entra no catálogo do pnpm e em `apps/web`. É importada só pelos componentes de `components/game/`, então fica nos pedaços das rotas `/host` e `/join`, fora da biblioteca e do editor. Nos testes, `MotionGlobalConfig.skipAnimations = true` no setup do Vitest faz toda animação ir direto ao fim.

## Estratégia de testes

Animação não se testa por quadro: os testes conferem o **estado inicial**, o **estado final** e que **nada espera por ela**. As contas ficam em funções puras.

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 a CA-04 | domínio | última revelação termina a partida; as outras vão ao placar | `game-progress.test.ts` |
| CA-07, CA-13 | domínio | tempo que resta da revelação, por `endedAt` | `podium.test.ts` |
| CA-28 a CA-31 | domínio | `previous` em cada faixa; quem saiu dos cinco | `standings.test.ts` |
| CA-01, CA-04, CA-05 | aplicação | avançar da última revelação; pedido repetido; encerrada não tem `final` | `advance-game.test.ts` |
| CA-06, CA-08 a CA-14 | aplicação | classificação final na visão do anfitrião: três primeiros, empate, zeros, removido, exemplo | `get-host-game.test.ts` |
| CA-21 a CA-24, CA-26, CA-27 | aplicação | `final` da sessão: lugar, total, removido, recarregar | `get-player-session.test.ts` |
| CA-01, CA-17, CA-18 | API | fim pelo roteador; `game.host` de novo depois do fim; quiz na lixeira | `routers/game.test.ts` |
| CA-07, CA-15 | lib | lugares revelados por tempo | `podium.test.ts` (web) |
| CA-28 a CA-32 | lib | de onde cada faixa parte e aonde chega; `changed` | `scoreboard-animation.test.ts` |
| CA-22, CA-23 | lib | frases da tela final | `game-stage.test.ts` |
| CA-06 a CA-09, CA-15, CA-16, CA-19, CA-35, CA-36 | componente | pódio por tempo, degraus vazios, ações, classificação, movimento reduzido | `host/podium.test.tsx` |
| CA-28 a CA-34, CA-36 | componente | placar: começa no estado anterior, termina no novo; Avançar no meio | `host/scoreboard.test.tsx` |
| CA-20 a CA-25 | componente | espera e tela final; "Entrar em outro jogo" | `player/final-screen.test.tsx`, `join-flow.test.tsx` |
| CA-37, CA-38 | componente | contagem termina no valor certo; a fase nova aparece na hora | `player/player-stage.test.tsx`, `host/host-stage.test.tsx` |
| CA-01, CA-06, CA-17, CA-20, CA-21, CA-24 | E2E | a partida até o pódio, a tela final e "Jogar novamente" | `apps/web/e2e/game-play.spec.ts` |

Os testes da spec 010 que passam pelo placar da última pergunta (CA-29 de lá) mudam para o pódio. O E2E roda com `reducedMotion: "reduce"` nos passos do placar, para conferir os números sem esperar a animação, e sem ele no pódio.

## Dados e migração

Nenhuma. Partidas já terminadas antes desta entrega passam a mostrar o pódio ao serem reabertas.

## Riscos e decisões

- **Biblioteca `motion`** (decisão do usuário, 2026-10-01). Ganho: troca de lugar, saída de elementos e sequências sem máquina de estados feita à mão, e um ponto só para o movimento reduzido. Custo: algumas dezenas de KB a mais no celular do jogador, nas rotas do jogo; e uma dependência a manter. Regra de uso: `motion` para o que muda de lugar, sai da tela ou é sequência; CSS para o resto. O tamanho do pedaço de `/join` é medido no fechamento, antes e depois; se pesar, a saída é `LazyMotion`.
- **O celular sabe o lugar antes de mostrar.** A sessão traz o lugar durante a espera; "Rufem os tambores…" é só apresentação. Não é vazamento: o lugar depois da última pergunta já foi dito na revelação dela.
- **A lista completa vai na visão do anfitrião**: até 200 linhas pequenas, só numa partida terminada, e a consulta periódica para depois do fim.
- **O placar abre no estado anterior** (RN-28): quem olha o primeiro quadro vê a ordem antiga. Os testes da spec 010 que liam o placar logo ao abrir passam a esperar o estado final.
- **Excluir o quiz apaga as partidas dele** (chave estrangeira em cascata, desde a spec 008): o pódio "continua disponível" (RN-07) enquanto o quiz existir. Mantido; os relatórios (spec 013) é que vão decidir o que sobrevive ao quiz.
- **"Quiz não pode mais ser jogado"** cobre lixeira, exclusão e quiz que voltou a rascunho, com um texto só (RN-16).
- **Contador e leitor de tela**: os números que sobem têm o valor final no texto acessível; a contagem é `aria-hidden`.
- **Testes com animação**: no jsdom nada é medido, então `layout` não tem o que animar; os testes conferem a ordem e os valores de cada etapa, não o movimento. O movimento é conferido no navegador.
- **Sem ADR novo**: o ADR 0009 ganha uma nota de que o pódio é a leitura de uma partida terminada, com a revelação contada de `endedAt`.

## Desvios na implementação (2026-10-01)

- **`motion` ficou só em `apps/web`**, fora do catálogo do pnpm: o catálogo é para o que mais de um pacote usa.
- **Sem `use-elapsed.ts`**: a revelação usa o `useCountdown` que já existia, com o tempo que resta dito pelo servidor.
- **Sem `stage-transition.tsx`**: a entrada de cada fase é um keyframe de CSS (`animate-stage-in`) no próprio conteúdo da fase, sem componente em volta.
- **`usePrefersReducedMotion` próprio** (sobre `matchMedia`), em vez do `useReducedMotion` da biblioteca, que guarda a preferência numa variável global e não deixa testar os dois casos.
- **`CountUp` mostra um número só**, sem o valor final escondido para leitor de tela: os dois juntos duplicavam o texto. O leitor lê o valor que estiver na tela.
- **O placar pula a contagem quando ninguém visível pontuou** (`ScoreboardSteps.counts`): visto no navegador, um segundo parado antes de as faixas se moverem.
- **O pódio não repete a comemoração ao voltar da Classificação**: visto no navegador, o confete e as entradas tocavam de novo.
- **`advanceGame` numa partida terminada devolve o pódio** em vez de `GAME.ENDED` (CA-04); numa partida encerrada continua recusando.
- **`final` do jogador vem em `PlayerSessionView`**, e o celular para de consultar o servidor depois de recebê-lo.
- **Tamanho das rotas do jogo** (`vite build`, antes → depois): `/host` 41,5 → 130,2 kB (13,5 → 41,3 kB comprimido); `/join` 14,6 → 16,2 kB (5,1 → 5,7 kB comprimido), mais um pedaço compartilhado pelas duas, que antes tinha menos de 5,4 kB e passou a 60,3 kB (22,3 kB comprimido), onde está o núcleo da `motion` usado pelo contador. Para o celular do jogador são cerca de 20 kB comprimidos a mais; para a tela do anfitrião, cerca de 48 kB. `LazyMotion` não foi adotado.
