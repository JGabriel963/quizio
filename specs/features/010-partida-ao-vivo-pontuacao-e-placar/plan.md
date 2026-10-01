---
spec: "010"
status: approved # draft | approved
---

# Plano técnico — 010 Partida ao vivo 3/4: Pontuação e placar

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0009](../../../docs/adr/0009-partida-ao-vivo.md)

## Abordagem

Os **pontos de uma resposta** são calculados quando ela chega, no mesmo lugar em que a spec 009 já calcula o tempo e a correção, e gravados na linha da resposta. Nunca mais mudam.

Tudo o mais é **derivado das respostas na hora da leitura**: o total de um jogador é a soma dos pontos dele, a sequência sai das respostas dele em ordem, e a posição sai dos totais de todos. Não há coluna de total nem tabela de placar para manter em dia. Isso evita dois problemas: uma resposta que chega no mesmo instante em que a fase fecha nunca fica fora da conta, e não existe um segundo lugar que possa discordar das respostas.

A regra de não divulgar antes da hora (RN-09) vira uma única conta: **até que pergunta os pontos já foram revelados**. Na revelação e no placar, é a pergunta atual; nas outras fases, a anterior. Todo total, sequência e posição é calculado até essa pergunta.

O **placar** é uma quinta fase, `scoreboard`, depois de `results`. Ela entra na máquina de fases que a spec 009 montou, com a mesma gravação condicional: nenhum caso de uso novo, só mais um passo em `nextStage`.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Fase | `GamePhase` ganha `scoreboard` | altera |
| Pontos da resposta | `Answer.points`, `answerPoints` | sim |
| Pergunta revelada | `revealedThrough` | sim |
| Total de pontos | `total` | sim |
| Sequência de acertos | `streakAfter` | sim |
| Classificação | `Standing` (`playerId`, `nickname`, `total`, `rank`) | sim |
| Placar | `ScoreboardEntry` (`Standing` + `climbed`) | sim |

## Domínio — `packages/core/src/game/domain`

### Agregados e entidades

**`scoring.ts`** (existe; hoje só serve a testes): `calculateAnswerScore` ganha `correctAnswers` (padrão 1), o número de alternativas corretas marcadas. Os pontos possíveis passam a ser `1000 × multiplicador × correctAnswers`, e o arredondamento continua único, no fim (RN-01, RN-02, RN-06).

**`answer.ts`**:

```ts
export interface Answer {
	// ...
	/** Worked out on receipt and never changed (spec 010, RN-07). */
	points: number;
}

/** Points of an answer: by speed, per right answer marked, zero if any is wrong. */
export function answerPoints(
	question: GameQuestion,
	choiceIds: readonly string[],
	responseTimeMs: number,
): number;
```

`answerPoints` usa `correctnessOf` (incorreta → 0), `question.points` (`noPoints` → 0, RN-04) e `calculateAnswerScore` com o número de corretas marcadas (CA-01 a CA-08).

**`game-progress.ts`**:

- `GAME_PHASES` ganha `scoreboard`, depois de `results`. `phaseDurationMs("scoreboard")` é nulo (RN-21).
- `nextStage`: `results` → `scoreboard` da mesma pergunta; `scoreboard` → abertura da pergunta seguinte, ou a partida terminada depois da última (RN-17, RN-23).
- `revealedThrough(progress)`: o índice da última pergunta cujos pontos já podem ser divulgados; −1 antes da primeira revelação (RN-09).

**`standings.ts`** (novo), puro:

```ts
export const SCOREBOARD_SIZE = 5;

export interface Standing {
	playerId: string;
	nickname: string;
	total: number;
	/** 1-based; no two players share one (RN-19). */
	rank: number;
}

export interface ScoreboardEntry extends Standing {
	/** Went up since the previous question's scoreboard (RN-20). */
	climbed: boolean;
}
```

- `rankPlayers(players, totals)`: `players` vem na ordem de entrada; ordena por total decrescente e, no empate, mantém essa ordem (RN-19). Quem não tem resposta entra com 0 (RN-08).
- `scoreboardOf(current, previous)`: os cinco primeiros de `current`, com `climbed` quando a posição é menor que em `previous`; `previous` nulo no placar da primeira pergunta (RN-18, RN-20).
- `streakAfter(answers, questionIndex)`: de trás para frente a partir de `questionIndex`, conta as perguntas seguidas com resposta correta ou parcialmente correta; uma pergunta sem resposta interrompe (RN-10).
- `standingOf(standings, playerId)`: a posição do jogador e quem está logo à frente, com a diferença de pontos (RN-15).

### Erros de domínio

Nenhum novo.

## Aplicação — `packages/core/src/game/application`

### Casos de uso

| Caso de uso | Mudança | Portas |
| --- | --- | --- |
| `submitAnswer` | grava `points` com a resposta | sem mudança |
| `advanceGame` | sem código novo: a fase `scoreboard` vem de `nextStage` | sem mudança |
| `getHostGame`, `advanceGame` (visão) | `HostStageView.scoreboard` na fase de placar | + `answers.totalsThrough` |
| `getPlayerSession` | total, pontos, sequência e posição | + `answers.totalsThrough`, `answers.listByPlayer`, `players.listActive` |

**`HostStageView`** ganha `scoreboard: ScoreboardEntry[] | null`, preenchido só na fase `scoreboard`. Nela, `question` vem nulo: o placar não mostra a pergunta. São duas somas, até a pergunta atual e até a anterior, para as setas.

**`PlayerStageView`** ganha:

```ts
/** Sum of the points revealed so far (RN-16). */
total: number;
/** Only in the results and the scoreboard. */
outcome: {
	result: PlayerResult;
	/** Null in a "Sem pontos" question (RN-14). */
	points: number | null;
	streak: number;
	rank: number;
	/** Who is right ahead; null for the first. */
	behind: { nickname: string; points: number } | null;
} | null;
```

`outcome` substitui o campo `result` da spec 009. Na fase de respostas, `total` é a soma até a pergunta anterior, e nada do que o jogador acabou de responder aparece (CA-10, CA-18).

**`PublicStage`** não muda de forma: na fase `scoreboard` leva a mesma pergunta da revelação, para o cabeçalho do celular.

### Portas novas ou alteradas

```ts
// answer-repository.ts
export interface AnswerRepository {
	// ...
	/** Sum of points per player over the questions up to `questionIndex`. */
	totalsThrough(
		gameId: string,
		questionIndex: number,
	): Promise<{ playerId: string; total: number }[]>;
	/** A player's answers in the game, by question. */
	listByPlayer(gameId: string, playerId: string): Promise<Answer[]>;
}
```

`InMemoryAnswerRepository` ganha os dois métodos. `anAnswer()` ganha `points`.

## Adapters

### Banco — `packages/db`

- `game_answer.points`: `integer`, não nulo, padrão 0.
- Enum `game_phase` ganha `scoreboard`.
- `drizzle-answer-repository.ts`: `totalsThrough` é um `SELECT player_id, sum(points) … GROUP BY player_id` filtrado por partida e `question_index <= ?`; `listByPlayer` lê pela chave.

### Real-time

Nenhum evento novo. `stage-changed` já avisa a entrada no placar, com o palco público. Pontos, totais e posições **não vão por evento**: o anfitrião refaz `game.view`, e cada jogador a própria sessão, como na revelação (ADR 0009, item 3).

## API — `packages/api`

Nenhuma procedure nova. `game.advance` aceita `scoreboard` em `from.phase` (o enum vem de `GAME_PHASES`). Mudam as saídas de `game.view`, `game.advance` e `game.join.session`.

## UI — `apps/web`

**`lib/`**

- `game-stage.ts` — `positionMessage(outcome)`: "Você está no pódio!" até o 3º lugar; senão "Você está em 5º lugar" e "120 pontos atrás de Bia" (RN-15). Formata os pontos com separador de milhar quando passar de 9999.

**`components/game/host/`**

- `scoreboard.tsx` — "Avançar" à direita e a lista de até cinco faixas: apelido, pontos e a seta de quem subiu; a primeira em branco.
- `host-stage.tsx` — mostra o placar na fase `scoreboard`. A fase não tem prazo, então nada é agendado.

**`components/game/player/`**

- `player-stage.tsx` — a tela de resultado ganha a sequência, a faixa "+ 639" e a posição; o rodapé ganha o total. Na fase `scoreboard` mostra a mesma tela de resultado (RN-21).
- `join-flow.tsx` — o evento de entrada no placar não apaga o resultado que o celular já mostra; a sessão é consultada de novo, como na revelação.

Sem primitivo novo em `packages/ui`.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 a CA-08 | domínio | fórmula, janela de 0,5 s, dobro, sem pontos, múltipla escolha | `scoring.test.ts`, `answer.test.ts` |
| CA-11, CA-12 | domínio | sequência cresce, zera com erro e sem resposta | `standings.test.ts` |
| CA-21 a CA-25, CA-30 | domínio | ordem, cinco primeiros, empate, setas | `standings.test.ts` |
| CA-20, CA-27, CA-29 | domínio | `results` → `scoreboard` → próxima ou fim | `game-progress.test.ts` |
| CA-04, CA-09, CA-13 | aplicação | pontos gravados no recebimento, iguais com sequências diferentes | `submit-answer.test.ts` |
| CA-20, CA-26 a CA-29 | aplicação | transições com o placar; pedido repetido; última pergunta | `advance-game.test.ts` |
| CA-21 a CA-25, CA-28, CA-30, CA-31 | aplicação | placar na visão do anfitrião, com setas | `get-host-game.test.ts` |
| CA-10, CA-14 a CA-19 | aplicação | sessão por fase: total só até o revelado; pontos, sequência e posição | `get-player-session.test.ts` |
| CA-09 | adapter | soma por jogador até uma pergunta; respostas do jogador | `drizzle-game-play.test.ts` |
| CA-10 | API | o que cada resposta contém antes da revelação | `routers/game.test.ts` |
| CA-15 a CA-17 | lib | texto da posição | `game-stage.test.ts` |
| CA-20 a CA-22, CA-24 a CA-26 | componente | placar do anfitrião | `host/host-stage.test.tsx` |
| CA-06, CA-14 a CA-19 | componente | resultado com pontos, sequência, posição e total | `player/player-stage.test.tsx`, `join-flow.test.tsx` |
| CA-14, CA-16, CA-20, CA-24, CA-29 | E2E | a partida da spec 009, agora com pontos e placar | `apps/web/e2e/game-play.spec.ts` |

Os testes da spec 009 que avançam da revelação direto para a pergunta seguinte passam a ter o placar no meio.

## Dados e migração

`pnpm -F @quizio/db db:push`: a coluna `points` em `game_answer` e o valor `scoreboard` no enum `game_phase`. As respostas de partidas já jogadas ficam com 0 pontos; não há o que recalcular.

## Riscos e decisões

- **Carga da sessão na revelação.** Para dar a posição, cada consulta de sessão soma os pontos da partida inteira e lê a lista de jogadores. Com 200 jogadores consultando a cada 5 segundos, são 40 somas por segundo sobre até alguns milhares de linhas. É aceitável para o limite atual; se pesar, a saída é guardar a classificação de cada pergunta numa tabela quando a fase fecha, sem mudar o domínio.
- **A posição do celular pode ficar um instante atrás do placar** se uma resposta entrar exatamente na virada da fase. Como tudo é calculado na leitura, a consulta seguinte corrige.
- **Empate sem critério de velocidade** (RN-19): a ordem de entrada é o que `listActive` já devolve; trocar para o tempo total de resposta é uma mudança só em `rankPlayers`.
- **`scoring.ts` já existia** desde a base do projeto, com a fórmula e os testes. O plano o reaproveita e só acrescenta a múltipla escolha.
- **Campo `result` da sessão vira `outcome`**: muda o contrato que a spec 009 entregou, sem mudar o que o jogador vê quando erra.
- **Sem ADR novo**: o ADR 0009 ganha uma nota de que totais e posições são derivados das respostas na leitura.

## Desvios na implementação (2026-10-01)

- **A fórmula foi reescrita com uma divisão só no fim**, `((2T − t) × P) ÷ 2T`. Com `1 − t ÷ T ÷ 2`, 19,9 s de 20 s dava 502,4999… e arredondava para 502; a spec pede 503 (CA-04). O teste novo de `answerPoints` foi o que mostrou.
- **Sem separador de milhar** nos pontos: o plano previa a partir de 10 000, e as capturas do Kahoot mostram o número puro.
- **O placar ficou em `host/scoreboard.tsx`**, como previsto; o texto da posição em `lib/game-stage.ts` (`positionMessage`).
- **`getPlayerSession` lê as respostas do jogador de uma vez** (`listByPlayer`) e deixou de usar `answers.find`: delas saem o "já respondeu", o total e a sequência.
- **No celular, o evento de entrada no placar mantém o resultado que já está na tela** e o total; a sessão é consultada de novo em seguida.
