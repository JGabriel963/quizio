---
spec: "009"
status: approved # draft | approved
---

# Plano técnico — 009 Partida ao vivo 2/4: Ciclo da pergunta

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0002](../../../docs/adr/0002-realtime-pusher-protocol.md), [0009](../../../docs/adr/0009-partida-ao-vivo.md)

## Abordagem

A partida ganha um **andamento**: em que pergunta está, em que fase e desde quando. São três colunas na linha `game`, e toda a regra de tempo é uma conta entre o instante guardado e o relógio do servidor (ADR 0009, item 1). Nada acontece sozinho: a tela do anfitrião pede cada transição, dizendo de que fase ela parte; o servidor confere o prazo e grava com uma atualização condicional, de modo que um pedido repetido, atrasado ou vindo de outra aba não faz nada.

Ao iniciar, a partida **copia as perguntas** da versão jogável para a tabela `game_question`, já na forma que o jogo usa: só as alternativas preenchidas, cada uma com a sua posição de cor e forma, e o Verdadeiro ou falso como duas alternativas. A partir daí o jogo não lê mais o quiz, e uma resposta custa a leitura de uma linha de pergunta, não da versão inteira.

Cada resposta é uma linha em `game_answer`, com chave em (partida, pergunta, jogador): a chave garante uma resposta por pergunta mesmo com dois envios simultâneos. O tempo de resposta e a correção são calculados e gravados no recebimento; a correção só sai do servidor na revelação.

As telas continuam no modelo do lobby: um canal público por partida, com o evento como aviso. O evento de mudança de fase leva o **palco público** (número da pergunta, fase, duração, formas das alternativas), então o celular mostra os botões sem precisar consultar; o que é individual (se já respondeu, se acertou) vem da consulta de sessão do jogador. Durante o jogo essa consulta é refeita a cada 5 segundos, não 15, porque as fases são curtas.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Estado da partida | `GameStatus` ganha `playing` e `finished` | altera |
| Andamento | `GameProgress` (`questionIndex`, `phase`, `phaseStartedAt`) | sim |
| Fase | `GamePhase` (`gameIntro` \| `questionIntro` \| `answering` \| `results`) | sim |
| Iniciar | `startGame` | sim |
| Avançar de fase | `advanceGame`, `StageRef` | sim |
| Pergunta da partida | `GameQuestion`, `GameChoice` | sim |
| Resposta | `Answer` | sim |
| Correção | `Correctness` (`correct` \| `partiallyCorrect` \| `wrong`) | sim |
| Distribuição de respostas | `AnswerDistribution` | sim |
| Palco | `PublicStage`, `HostStageView`, `PlayerStageView` | sim |

## Domínio — `packages/core/src/game/domain`

### Agregados e entidades

**`Game`** (`game.ts`) ganha:

```ts
export const GAME_STATUSES = ["lobby", "playing", "finished", "ended"] as const;

export interface Game {
	// ...
	/** How many questions the game has; 0 until it starts. */
	questionCount: number;
	/** Where the game is; null in the lobby. */
	progress: GameProgress | null;
}
```

- `isGameOpen`: `lobby` ou `playing`. Uma partida `finished` tem `endedAt` (o que libera o PIN pelo índice existente) e `endReason` nulo (RN-30).
- `assertJoinable`: partida `playing` lança `GameAlreadyStartedError` (RN-03).

**`GameProgress`** (`game-progress.ts`, novo), puro:

```ts
export const GAME_PHASES = ["gameIntro", "questionIntro", "answering", "results"] as const;
export const GAME_INTRO_MS = 3_000;
export const QUESTION_INTRO_MS = 5_000;
export const ANSWER_GRACE_MS = 500;

export interface GameProgress {
	/** 0-based; 0 during the game intro. */
	questionIndex: number;
	phase: GamePhase;
	phaseStartedAt: Date;
}

/** Which stage a request starts from: makes every transition idempotent. */
export interface StageRef {
	questionIndex: number;
	phase: GamePhase;
}
```

- `startGame(game, { playerCount, questionCount, now })`: exige `lobby` e ao menos um jogador; devolve `playing` em `gameIntro` (RN-01, RN-02).
- `phaseDurationMs(phase, timeLimitSeconds)`: 3 s, 5 s, o limite da pergunta, ou `null` na revelação (RN-04, RN-08, RN-10, RN-11).
- `nextStage(game, { timeLimitSeconds, skip, now })`: a fase seguinte, ou a partida terminada depois da última revelação. Lança `StageNotDueError` se o prazo da fase não passou, salvo `answering` com `skip` (RN-10 a RN-12, RN-30).
- `closeAnswers(game, now)`: `answering` → `results`, usada também quando todos respondem.
- `acceptsAnswers(game, { questionIndex, timeLimitSeconds, now })`: fase `answering` da pergunta pedida e dentro do limite mais a tolerância (RN-18).
- `responseTimeOf(progress, timeLimitSeconds, now)`: do início da fase ao recebimento, limitado ao tempo da pergunta (RN-18).

**`GameQuestion`** (`game-question.ts`, novo): a pergunta como a partida a usa.

```ts
export interface GameChoice {
	id: string;
	/** Position of color and shape, 0 to 5 (spec 004, RN-01). */
	shapeIndex: number;
	text: string;
	correct: boolean;
}

export interface GameQuestion {
	index: number;
	type: QuestionType;
	text: string;
	timeLimitSeconds: number;
	points: QuestionPoints;
	selection: SelectionMode;
	/** Only filled answers, in position order (RN-14, RN-27). */
	choices: GameChoice[];
	image: QuestionImage | null;
}
```

- `toGameQuestion(question, index)`: Quiz mantém as alternativas preenchidas com o índice da posição; Verdadeiro ou falso vira "Verdadeiro" (posição 1, azul, losango) e "Falso" (posição 0, vermelho, triângulo), nessa ordem (RN-15). Os tipos `Question`, `QuestionImage`, `QuestionPoints` e `SelectionMode` vêm do contexto `quiz` como tipos de valor.
- `parseStoredGameQuestion(raw)`: leitura do JSON guardado.

**`Answer`** (`answer.ts`, novo): `{ gameId, questionIndex, playerId, choiceIds, responseTimeMs, correctness, receivedAt }`.

- `parseAnswerChoices(question, choiceIds)`: ao menos uma, sem repetição, todas da pergunta; seleção simples exige exatamente uma (CA-21).
- `correctnessOf(question, choiceIds)`: RN-24.
- `answerDistribution(question, answers)`: contagem por alternativa (RN-22, RN-23).

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `GameAlreadyStartedError` | `GAME.ALREADY_STARTED` | entrar, ou iniciar, numa partida que já saiu do lobby |
| `GameHasNoPlayersError` | `GAME.NO_PLAYERS` | iniciar sem jogadores (RN-01) |
| `StageNotDueError` | `GAME.STAGE_NOT_DUE` | transição pedida antes do prazo (CA-09, CA-26) |
| `AnswersClosedError` | `GAME.ANSWERS_CLOSED` | resposta fora da fase ou do prazo (RN-20) |
| `AlreadyAnsweredError` | `GAME.ALREADY_ANSWERED` | segunda resposta do jogador na pergunta (RN-17) |
| `InvalidAnswerError` | `GAME.INVALID_ANSWER` | alternativa que não é da pergunta, vazia, repetida, ou mais de uma na seleção simples |

## Aplicação — `packages/core/src/game/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `startGame` | `{ ownerId, gameId }` | `HostGameView` | `GAME.NOT_FOUND`, `GAME.NO_PLAYERS`, `GAME.ENDED` | `games`, `players`, `playableQuizzes`, `gameQuestions`, `clock`, `realtime` |
| `advanceGame` | `{ ownerId, gameId, from: StageRef, skip }` | `HostGameView` | `GAME.NOT_FOUND`, `GAME.STAGE_NOT_DUE`, `GAME.ENDED` | `games`, `players`, `gameQuestions`, `answers`, `storage`, `clock`, `realtime` |
| `getHostGame` (era `getHostLobby`) | `{ ownerId, gameId }` | `HostGameView` | `GAME.NOT_FOUND` | `games`, `players`, `gameQuestions`, `answers`, `storage`, `clock` |
| `submitAnswer` | `{ gameId, playerId, secret, questionIndex, choiceIds }` | — | `GAME.NOT_FOUND`, `GAME.ANSWERS_CLOSED`, `GAME.ALREADY_ANSWERED`, `GAME.INVALID_ANSWER` | `games`, `players`, `gameQuestions`, `answers`, `clock`, `realtime` |
| `getPlayerSession` (altera) | — | `PlayerSessionView` com `stage` | — | + `gameQuestions`, `answers` |
| `findGameByPin`, `joinGame` (alteram) | — | — | + `GAME.ALREADY_STARTED` | — |

Notas:

- **`startGame`**: iniciar uma partida que já está em andamento devolve a visão atual, sem erro (CA-05). Lê as perguntas da versão por `PlayableQuizQuery.questions`, grava a cópia e só então muda o estado.
- **`advanceGame`**: se a partida não está mais em `from`, devolve a visão atual sem mudar nada (RN-12, CA-35, CA-43). Senão calcula a fase seguinte e grava com `games.saveIfAt`; se outra requisição chegou antes, a gravação não acontece e a visão atual é devolvida.
- **`submitAnswer`**: confere jogador ativo e segredo, a fase e o prazo, valida as alternativas, grava. Depois publica o total e, se o total alcançou o número de jogadores ativos, fecha as respostas pela mesma gravação condicional (RN-10b). Uma resposta de PIN desconhecido não revela nada: é `GAME.NOT_FOUND`.
- **`HostGameView`** substitui `HostLobbyView`: os campos do lobby mais `questionCount` e `stage: HostStageView | null`.
- **`HostStageView`**: `{ questionIndex, phase, remainingMs, question?, answerCount, distribution? }`. `question` traz enunciado, tipo, seleção, alternativas e a imagem com a URL pública. A marca de correta e a distribuição só vêm em `results` (RN-21); a tela do anfitrião é projetada, e assim a resposta não fica na página antes da hora.
- **`PlayerStageView`**: `{ questionIndex, questionCount, type, selection, phase, remainingMs, choices: { id, shapeIndex, label }[], answered, result }`. `label` só existe no Verdadeiro ou falso; `result` (`correct` \| `partiallyCorrect` \| `wrong` \| `timeout`) só em `results`. Nunca traz o enunciado, os textos nem a correta (RN-14, RN-21, RN-26).
- **`PlayerSessionStatus`** ganha `playing` e `finished`.
- `remainingMs` é calculado no servidor; o cliente guarda o instante em que recebeu e conta a partir dele, sem depender do relógio do aparelho.

### Portas novas ou alteradas

```ts
// game-repository.ts
export interface GameRepository {
	// ...
	/**
	 * Saves only if the stored game is still at `from` (the lobby when null).
	 * False means another request moved it first.
	 */
	saveIfAt(game: Game, from: StageRef | null): Promise<boolean>;
}

// game-question-repository.ts
export interface GameQuestionRepository {
	saveAll(gameId: string, questions: readonly GameQuestion[]): Promise<void>;
	find(gameId: string, index: number): Promise<GameQuestion | null>;
}

// answer-repository.ts
export interface AnswerRepository {
	/** Inserts; "alreadyAnswered" when the player has an answer for the question. */
	add(answer: Answer): Promise<"added" | "alreadyAnswered">;
	find(gameId: string, questionIndex: number, playerId: string): Promise<Answer | null>;
	listByQuestion(gameId: string, questionIndex: number): Promise<Answer[]>;
	countByQuestion(gameId: string, questionIndex: number): Promise<number>;
}

// playable-quiz-query.ts
export interface PlayableQuizQuery {
	find(quizId: string): Promise<PlayableQuiz | null>;
	/** The questions of that playable version, in order; empty if it is gone. */
	questions(quizId: string, version: number): Promise<Question[]>;
}
```

Fakes em `testing/`: `InMemoryGameQuestionRepository`, `InMemoryAnswerRepository`; `InMemoryGameRepository.saveIfAt`; `InMemoryPlayableQuizQuery` com perguntas; construtor `aGameQuestion()`.

## Adapters

### Banco — `packages/db`

`schema/game.ts`:

- **`game`**: `question_count` (int, padrão 0), `question_index` (int, nulo), `phase` (enum `game_phase`, nulo), `phase_started_at` (nulo). O enum `game_status` ganha `playing` e `finished`.
- **`game_question`**: `game_id` (fk, cascade), `index`, `question` (jsonb, lido por `parseStoredGameQuestion`); chave em `(game_id, index)`.
- **`game_answer`**: `game_id` (fk, cascade), `question_index`, `player_id` (fk `game_player`, cascade), `choice_ids` (jsonb), `response_time_ms`, `correctness` (enum `answer_correctness`), `received_at`; chave em `(game_id, question_index, player_id)`.

Repositórios: `drizzle-game-repository.ts` ganha `saveIfAt` (um `UPDATE … WHERE id = ? AND question_index … AND phase …` que devolve se alterou alguma linha); `drizzle-game-question-repository.ts`; `drizzle-answer-repository.ts` (o conflito da chave vira `"alreadyAnswered"`); `drizzle-playable-quiz-query.ts` ganha `questions`, lendo `quiz_version` com `parseVersionQuestions`.

### Real-time

Canal `game-{gameId}` (ADR 0009).

| Canal | Evento | Payload | Publicado por (caso de uso) | Assinado por (tela) |
| --- | --- | --- | --- | --- |
| `game-{gameId}` | `stage-changed` | `{ status, stage: PublicStage \| null }` | `startGame`, `advanceGame`, `submitAnswer` (ao fechar) | anfitrião e jogadores |
| `game-{gameId}` | `answer-count` | `{ questionIndex, count }` | `submitAnswer` | anfitrião |

`PublicStage`: `{ questionIndex, questionCount, type, selection, phase, durationMs, choices: { id, shapeIndex, label }[] }`. Com seis alternativas fica em poucas centenas de bytes. Não leva enunciado, textos, correta nem distribuição: na revelação, o anfitrião refaz a consulta dele e cada jogador a de sessão.

### Storage / outros

`ObjectStorage.getPublicUrl` monta a URL da imagem na visão do anfitrião. Nenhuma mudança em `packages/storage`.

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `game.view` (era `game.lobby`) | query | sessão | `{ gameId }` | `HostGameView` | `GAME.NOT_FOUND` |
| `game.start` | mutation | sessão | `{ gameId }` | `HostGameView` | `GAME.NOT_FOUND`, `GAME.NO_PLAYERS`, `GAME.ENDED` |
| `game.advance` | mutation | sessão | `{ gameId, from: { questionIndex, phase }, skip?: boolean }` | `HostGameView` | `GAME.NOT_FOUND`, `GAME.STAGE_NOT_DUE`, `GAME.ENDED` |
| `game.join.answer` | mutation | pública | `{ gameId, playerId, secret, questionIndex, choiceIds: string[] }` | — | `GAME.NOT_FOUND`, `GAME.ANSWERS_CLOSED`, `GAME.ALREADY_ANSWERED`, `GAME.INVALID_ANSWER` |
| `game.join.session` | query | pública | sem mudança | + `stage` | — |
| `game.join.find`, `game.join.enter` | — | — | — | — | + `GAME.ALREADY_STARTED` |

`phase` é validado pelo enum de `GAME_PHASES`; `choiceIds` tem no máximo 6 itens. Ligações em `container.ts`: `gameQuestions`, `answers`, os casos de uso novos. Em `composition-root.ts`: os dois repositórios Drizzle.

## UI — `apps/web` e `packages/ui`

Sem primitivo novo em `packages/ui`: as formas vêm de `AnswerShape` e `answerShapeAt`, e as cores dos tokens `answer-*`.

**`lib/`**

- `use-countdown.ts` — `useCountdown(remainingMs, receivedAt)`: segundos restantes, sem ficar negativo, e um aviso quando chega a zero.
- `game-stage.ts` (puro) — aplica `stage-changed` e `answer-count` à visão do anfitrião; escolhe a frase de espera pelo número da pergunta, para não mudar a cada renderização.
- `game-error-messages.ts` — os códigos novos; `GAME.ALREADY_STARTED` é "Este jogo já começou.".

**`components/game/`**

- `host/game-header.tsx` — o cabeçalho do lobby, extraído para as telas do jogo (RN-05).
- `host/host-stage.tsx` — escolhe a tela pela fase e agenda a transição: ao fim de `remainingMs`, pede `advance` com a fase atual; se o servidor responder `STAGE_NOT_DUE`, tenta de novo em 250 ms.
- `host/game-intro.tsx`, `host/question-intro.tsx`, `host/answering.tsx`, `host/results.tsx`, `host/game-finished.tsx`.
- `host/stage-choices.tsx` — as faixas das alternativas na base, nos estados de respostas e de revelação; `host/answer-bars.tsx` — as barras.
- `host/stage-image.tsx` — a imagem ao centro (com `QuestionImageView`, do editor) ou como fundo.
- `host/host-lobby.tsx` — Iniciar deixa de ser "Em breve" e fica indisponível sem jogadores.
- `player/player-stage.tsx` — abertura, botões, espera, resultado e fim; `player/answer-buttons.tsx` — seleção simples, múltipla escolha com Enviar, e Verdadeiro ou falso.
- `player/join-flow.tsx` — o passo `waiting` passa a servir também ao jogo: com a sessão em `playing` ou `finished`, mostra o `PlayerStage`. Aplica `stage-changed` na hora e refaz a consulta de sessão a cada 5 s durante o jogo.

**Rotas**: `host.$gameId.tsx` consulta `game.view`, assina os eventos novos e liga `start` e `advance`. `join.tsx` ganha `answer` no `JoinApi`.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01, CA-02, CA-05, CA-09, CA-23, CA-25, CA-26, CA-34 a CA-37 | domínio | iniciar, prazos de cada fase, pular, última pergunta termina | `core/game/domain/game-progress.test.ts` |
| CA-12 a CA-14, CA-21, CA-28, CA-29, CA-31, CA-32 | domínio | pergunta da partida, validação da resposta, correção, distribuição | `game-question.test.ts`, `answer.test.ts` |
| CA-17 a CA-19 | domínio | prazo, tolerância e tempo de resposta | `game-progress.test.ts` |
| CA-01 a CA-05, CA-38 | aplicação | iniciar copia as perguntas, exige jogador e dono, é idempotente; não muda com o quiz | `start-game.test.ts` |
| CA-08, CA-09, CA-23, CA-25 a CA-27, CA-34 a CA-37, CA-43 | aplicação | transições, pedido repetido, pedido de fase antiga, evento publicado | `advance-game.test.ts` |
| CA-10, CA-16 a CA-21, CA-24, CA-37 | aplicação | responder, uma por pergunta, prazo, segredo, todos responderam fecha | `submit-answer.test.ts` |
| CA-06, CA-22, CA-28 a CA-33 | aplicação | visão do anfitrião por fase: sem a correta antes da revelação, distribuição, imagem | `get-host-game.test.ts` |
| CA-07, CA-11, CA-22, CA-30, CA-39, CA-40 | aplicação | sessão do jogador por fase: sem textos, respondeu, resultado | `get-player-session.test.ts` |
| CA-04 | aplicação | PIN e apelido de partida em andamento | `join-game.test.ts` |
| CA-16, CA-35, CA-43 | adapter | chave da resposta; gravação condicional; cópia das perguntas | `db/repositories/game/drizzle-game-play.test.ts` |
| CA-03, CA-20, CA-22 | API | autenticação, erros, e o que cada resposta contém | `api/routers/game.test.ts` |
| CA-41 | lib | contagem a partir do tempo restante | `web/lib/use-countdown.test.ts` |
| CA-06, CA-08, CA-23, CA-25, CA-28, CA-29, CA-32 a CA-34, CA-36 | componente | telas do anfitrião por fase; transição agendada; pular; avançar | `host/host-stage.test.tsx` |
| CA-02 | componente | Iniciar indisponível sem jogadores | `host/host-lobby.test.tsx` |
| CA-07, CA-10, CA-11, CA-13 a CA-15, CA-17, CA-30, CA-31, CA-36, CA-44 | componente | telas do jogador; múltipla escolha; nomes das formas | `player/player-stage.test.tsx`, `join-flow.test.tsx` |
| CA-01, CA-04, CA-10, CA-24, CA-25, CA-30, CA-34, CA-36, CA-39, CA-41, CA-42 | E2E | anfitrião e dois jogadores do início ao fim, em desktop e celular | `apps/web/e2e/game-play.spec.ts` |

## Dados e migração

`pnpm -F @quizio/db db:push`: quatro colunas novas em `game`, dois valores no enum `game_status`, os enums `game_phase` e `answer_correctness`, e as tabelas `game_question` e `game_answer`. Sem backfill: partidas abertas no lobby continuam válidas.

## Riscos e decisões

- **Um evento perdido custa tempo de resposta ao jogador.** Se o aviso de que as respostas abriram não chegar, o celular só mostra os botões na consulta seguinte, até 5 segundos depois. É o preço de não ter canal próprio com o servidor; a consulta a cada 5 segundos limita a perda.
- **Carga da consulta de sessão**: 200 jogadores consultando a cada 5 segundos são 40 leituras por segundo, e na revelação todos consultam juntos. Cada consulta lê a partida, a pergunta e a resposta do jogador, por chave.
- **A latência conta contra o jogador**: o tempo é medido no servidor, do início da fase ao recebimento. É a regra da constituição, e é igual para todos.
- **Fase de respostas sem o anfitrião**: se a tela dele fecha, as respostas param de valer no prazo, mas a revelação só aparece quando ele volta (RN-13).
- **O E2E espera tempos reais**: a abertura de 5 segundos e o limite mínimo de 5 segundos por pergunta. O teste usa perguntas de 5 segundos e fecha as respostas por "todos responderam" e por "Pular o cronômetro".
- **Renomear `getHostLobby` e `game.lobby`** para `getHostGame` e `game.view`: a consulta deixa de ser só do lobby. Mexe no que a 008 entregou, sem mudar comportamento.
- **Sem ADR novo**: o desenho é o do ADR 0009, que ganha uma nota sobre a gravação condicional das transições e o palco público no evento.

## Desvios na implementação (2026-10-01)

- **`PublicStage` e `PlayerStageView` têm a pergunta aninhada** (`question: { type, selection, choices } | null`), nula na abertura da partida, em vez de campos soltos.
- **`HostChoiceView.correct` é `boolean | null`**: nulo até a revelação. `HostStageView` ganhou `durationMs`, para a barra da abertura.
- **`advanceGame` numa partida terminada ou encerrada lança `GAME.ENDED`**; só o pedido de uma fase que a partida já deixou, com ela ainda em andamento, devolve a visão atual sem erro.
- **`saveIfAt` grava só o andamento** (estado, total de perguntas, fase, encerramento), não a linha inteira: o cadeado e os demais campos não são tocados por uma transição.
- **`startGame` recusa versão sem perguntas** com `GAME.QUIZ_NOT_PLAYABLE`.
- **Componentes do anfitrião em menos arquivos**: `stage-screens.tsx` reúne abertura da partida, abertura da pergunta, respostas e revelação; `stage-choices.tsx` reúne as faixas e as barras.
- **A rota do anfitrião aplica os eventos sem mexer na idade da consulta** (`setQueryData` com `updatedAt`), porque as contagens regressivas partem do instante em que o servidor informou o tempo restante.
- **O fluxo do jogador ignora o que chega atrasado**: um evento ou uma consulta de uma fase anterior à que o aparelho já mostra não volta a tela.
- **Sem botão Enviar no celular** (pedido do usuário depois do fechamento): `AnswerButtons` envia a alternativa tocada em qualquer pergunta. O servidor continua aceitando várias alternativas numa múltipla escolha.
