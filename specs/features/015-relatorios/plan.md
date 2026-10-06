---
spec: "015"
status: approved # draft | approved
---

# Plano técnico — 015 Relatórios

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0009](../../../docs/adr/0009-partida-ao-vivo.md), [0010](../../../docs/adr/0010-relatorios-como-leitura-da-partida.md)

## Abordagem

**O relatório não é gravado: é uma leitura da partida.** Tudo o que ele mostra já está nas tabelas do jogo (`game`, `game_player`, `game_question`, `game_answer`), e os números (percentuais, perguntas difíceis, classificação) são contas puras sobre essas linhas, refeitas a cada leitura, como já acontece com o placar (spec 010). Nada é calculado quando a partida acaba, então não há "momento de gerar o relatório" para falhar, e uma partida antiga vira relatório sem migração.

O contexto novo, `core/reports`, lê a partida por **uma porta de consulta própria** (`ReportGameQuery`), no mesmo molde da `library` com os quizzes: reaproveita os tipos de valor do jogo (`GamePhase`, `Correctness`, `GameChoice`), nunca as funções. As duas regras que ele precisa repetir do jogo (até que pergunta a partida chegou, e o desempate da classificação) ficam em funções pequenas e testadas dentro de `reports`.

O que **é** do relatório e não existe hoje ganha uma tabela pequena, `report`, com uma linha só para o relatório que foi renomeado ou mandado para a lixeira: o nome próprio e o `trashedAt`. Sem linha, o relatório tem o título da partida e está fora da lixeira.

No contexto do jogo mudam três coisas, pequenas:

1. a partida guarda **quando foi iniciada** (`startedAt`), para o tempo e a data do relatório;
2. a chave estrangeira `game.quiz_id → quiz` **deixa de existir**, para a partida sobreviver ao quiz excluído (RN-05). O `quizId` continua guardado como referência por ID, que é como os contextos se falam;
3. excluir um quiz de vez passa a **apagar as partidas dele que nunca começaram** (hoje iam embora pela cascata), e a deixar as iniciadas.

Não há evento de tempo real novo, nem estado em memória.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Relatório | `Report`, `ReportHeader`, `ReportGame` | sim |
| Nome do relatório | `ReportHeader.name`, `parseReportName`, `REPORT_NAME_MAX_LENGTH` | sim |
| Seção dos relatórios | `ReportSection` (`reports` \| `trash`) | sim |
| Participante | `ReportParticipant` | sim |
| Pergunta jogada | `playedQuestionCount` | sim |
| Perguntas do participante | `questionsOf(participant, played)` | sim |
| Percentual de acertos | `Accuracy` (`correct`, `total`) | sim |
| Pergunta difícil | `isDifficult`, `LOW_ACCURACY_PERCENT` | sim |
| Ajuda necessária | `needsHelp` | sim |
| Não concluiu | `didNotFinish` | sim |
| Início da partida | `Game.startedAt` | sim |
| Jogar de novo | `game.host` (`usePlayAgain`) | não |

## Domínio — `packages/core/src/reports/domain`

### Agregados e entidades

O relatório não tem agregado com comportamento: é um **registro de leitura** mais duas propriedades editáveis.

**`report.ts`**

```ts
export const REPORT_SECTIONS = ["reports", "trash"] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];

/** One line of the list: what is known without reading the answers. */
export interface ReportHeader {
	gameId: string;
	ownerId: string;
	/** The report's own name, or the game's title (RN-45). */
	name: string;
	quizId: string;
	/** Null once the quiz was deleted for good (RN-05). */
	quiz: { trashed: boolean; playable: boolean; coverImageKey: string | null } | null;
	/** How many questions the game had (RN-24). */
	questionCount: number;
	/** `finished` went to the podium; `ended` stopped before it (RN-25). */
	outcome: "finished" | "ended";
	/** Where an ended game stopped; null for a finished one. */
	stoppedAt: { questionIndex: number; phase: GamePhase } | null;
	startedAt: Date;
	endedAt: Date;
	trashedAt: Date | null;
}

/** Questions that reached their results (RN-09). */
export function playedQuestionCount(header: ReportHeader): number;
export function requireOwnedReport(header: ReportHeader | null, ownerId: string): ReportHeader; // RN-03
export function assertOutOfTrash(header: ReportHeader): void; // RN-51
export function parseReportName(raw: string): string; // RN-46: trim, 1..95 graphemes
```

`playedQuestionCount`: `questionCount` para `finished`; para `ended`, o índice em que parou, mais um se a fase era `results` ou `scoreboard`. É a regra de `revealedThrough` do jogo, repetida aqui de propósito (ver Riscos).

**`report-game.ts`** — a partida inteira, como o relatório a lê:

```ts
export interface ReportParticipant {
	id: string;
	nickname: string;
	/** First question the player could answer (spec 012, RN-13). */
	firstQuestionIndex: number;
	joinedAt: Date;
}
export interface ReportQuestion {
	index: number;
	type: QuestionType;
	text: string;
	imageKey: string | null;
	choices: GameChoice[]; // shapeIndex, text, correct: as the game showed them
}
export interface ReportAnswer {
	questionIndex: number;
	playerId: string;
	choiceIds: string[];
	correctness: Correctness;
	points: number;
	responseTimeMs: number;
}
export interface ReportGame {
	header: ReportHeader;
	/** In order of arrival; removed players are not here (RN-08). */
	participants: ReportParticipant[];
	/** Only the played ones (RN-09). */
	questions: ReportQuestion[];
	/** Only of played questions. */
	answers: ReportAnswer[];
}
```

### Value objects

**`accuracy.ts`**

```ts
/** Right answers out of the possible ones. Kept as two integers so 35% is compared exactly (RN-16). */
export interface Accuracy { correct: number; total: number }
export const LOW_ACCURACY_PERCENT = 35;
export function accuracyPercent(a: Accuracy): number | null; // rounded; null when total is 0
export function isLowAccuracy(a: Accuracy): boolean; // total > 0 && correct * 100 < 35 * total
```

### Serviços de domínio

**`report-stats.ts`** — funções puras sobre `ReportGame`:

```ts
/** The questions that count for a participant (RN-10). */
export function questionsOf(p: ReportParticipant, played: number): number; // max(0, played - firstQuestionIndex)

export interface ParticipantStats {
	playerId: string; nickname: string;
	rank: number; total: number;          // RN-20
	accuracy: Accuracy;                    // RN-13
	unanswered: number;                    // RN-12
}
export function participantStats(game: ReportGame): ParticipantStats[]; // by rank

export interface QuestionStats {
	index: number;
	accuracy: Accuracy;                    // RN-14
	unanswered: number;
	averageResponseTimeMs: number | null;  // RN-21, of who answered
	choiceCounts: { choiceId: string; count: number }[];
}
export function questionStats(game: ReportGame): QuestionStats[];

export function overallAccuracy(participants: { firstQuestionIndex: number }[], played: number, correctAnswers: number): Accuracy; // RN-15
export function difficultQuestions(stats: QuestionStats[]): QuestionStats[]; // RN-17, hardest first
export function needsHelp(stats: ParticipantStats[]): ParticipantStats[];    // RN-18, lowest first
export function didNotFinish(stats: ParticipantStats[]): ParticipantStats[]; // RN-19, most unanswered first
export function durationMs(header: ReportHeader): number;                    // RN-21
```

A classificação é o total de pontos das respostas, do maior para o menor, com o empate pela ordem de chegada (a ordem de `participants`): a mesma regra de `rankPlayers` do jogo.

`overallAccuracy` recebe só o mínimo (a primeira pergunta de cada participante e o total de acertos) porque a **lista** a calcula para 20 relatórios sem ler as respostas uma a uma.

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `ReportNotFoundError` (`NotFoundError`) | `REPORT.NOT_FOUND` | Não existe, é de outro criador, a partida não foi iniciada ou ainda não acabou (RN-01 a RN-03) |
| `ReportInTrashError` | `REPORT.IN_TRASH` | Abrir ou renomear um relatório que está na lixeira (RN-51) |
| `ReportNotInTrashError` | `REPORT.NOT_IN_TRASH` | Excluir definitivamente o que não está na lixeira (RN-53) |
| `InvalidReportNameError` | `REPORT.INVALID_NAME` | Nome vazio ou com mais de 95 caracteres (RN-46) |

### Mudanças em `packages/core/src/game`

- `Game.startedAt: Date | null`; `startGame` (domínio) grava `now`. `newGame` começa com `null`.
- `GameRepository.deleteUnstartedByQuiz(quizId): Promise<void>` — apaga as partidas do quiz com `questionCount = 0`.
- `createEndGamesOfQuiz` não muda; quem chama o novo método é a ligação `quizGames.endGamesOfDeletedQuiz` do container, depois de encerrar as abertas.

## Aplicação — `packages/core/src/reports/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `listReports` | `ownerId`, `section`, `search?`, `limit` | `{ items: ReportListItem[], total }` | — | `ReportGameQuery`, `storage`, `clock` |
| `getReport` | `ownerId`, `gameId` | `ReportView` (cabeçalho, resumo, linhas de participantes e de perguntas) | `NOT_FOUND`, `IN_TRASH` | idem |
| `getReportParticipant` | `ownerId`, `gameId`, `playerId` | `ParticipantDetailView` (RN-42) | `NOT_FOUND`, `IN_TRASH` | idem |
| `getReportQuestion` | `ownerId`, `gameId`, `questionIndex` | `QuestionDetailView` (RN-44) | `NOT_FOUND`, `IN_TRASH` | idem |
| `renameReport` | `ownerId`, `gameId`, `name` | `{ name }` | `NOT_FOUND`, `IN_TRASH`, `INVALID_NAME` | `ReportGameQuery`, `ReportRepository`, `clock` |
| `moveReportsToTrash` | `ownerId`, `gameIds` | — | `NOT_FOUND` | idem |
| `restoreReports` | `ownerId`, `gameIds` | — | `NOT_FOUND` | idem |
| `deleteReportsPermanently` | `ownerId`, `gameIds` | — | `NOT_FOUND`, `NOT_IN_TRASH` | idem |

Notas:

- **`listReports`** lê os cabeçalhos do criador na seção (já ordenados), filtra pelo nome com `normalizeSearchText` (o mesmo da biblioteca, RN-27), corta em `limit` e só então pede os **totais** das partidas da página (`tallies`), de onde sai o percentual geral de cada linha. `total` é o tamanho da seção depois da pesquisa: dele saem o "Mostrar mais" (RN-28) e o "Ver tudo (N)" do cartão (RN-31). `ReportListItem`: `gameId`, `name`, `coverUrl`, `questionCount`, `participantCount`, `accuracyPercent`, `endedEarly`, `endedAt`, `trashedAt`, `canPlayAgain`, `quizId`.
- As três ações em lote conferem **todos** os relatórios antes de mexer em qualquer um: um que não é do criador faz a ação inteira falhar com `NOT_FOUND`. Mover para a lixeira o que já está lá, e restaurar o que não está, não fazem nada (repetir o pedido é inofensivo).
- **`getReport`** monta: `header` (nome, início, fim, `endedEarly`, `playedCount`, `questionCount`, `quizId`, `canPlayAgain`, `canViewQuiz`, `coverUrl`); `summary` (`accuracyPercent`, `participantCount`, `durationMs`, `hardestQuestion` com a URL da imagem, e as três listas já ordenadas: `difficultCount`, `needsHelp[]`, `didNotFinish[]`); `participants[]` (as `ParticipantStats`, com `needsHelp` marcado); `questions[]` (índice, enunciado, tipo, percentual, `difficult`). Não leva as respostas uma a uma: os detalhes têm as suas consultas, para uma partida de 200 jogadores não mandar milhares de linhas de uma vez.
- `canPlayAgain` e `canViewQuiz`: o quiz existe e está fora da lixeira; para jogar, também tem versão jogável (RN-48, RN-05).
- **Imagens (RN-06)**: a URL só é montada quando `header.quiz` não é nulo. Enquanto o quiz existe, todas as versões dele ficam guardadas (ADR 0008) e `releaseUnusedImages` não apaga a imagem de nenhuma; quando ele é excluído de vez, as imagens vão junto e o relatório deixa de apontar para elas.
- "Organizado por" (RN-32) é o nome de quem está vendo, que a tela já tem da sessão; o caso de uso não o devolve.

### Portas novas ou alteradas

```ts
// reports/application/ports/report-game-query.ts
/**
 * Read model of the live games as the reports show them. Contract:
 * - a game is a report when it started (`questionCount > 0`) and is over:
 *   `endedAt` is set, or its deadline passed (`expiresAt <= now`), in which
 *   case it ended at the deadline, where it was (RN-01, RN-02);
 * - `name` is the report's own name, or the game's title;
 * - `listHeaders`: only games of `ownerId`, in the section, by `endedAt`
 *   desc, ties by `gameId`.
 */
export interface ReportGameQuery {
	listHeaders(criteria: { ownerId: string; section: ReportSection; now: Date }): Promise<ReportHeader[]>;
	findHeader(gameId: string, now: Date): Promise<ReportHeader | null>;
	/** What the list needs to work out each game's accuracy, without the answers. */
	tallies(headers: readonly ReportHeader[]): Promise<ReportTally[]>;
	/** Participants, played questions and their answers. */
	findGame(gameId: string, now: Date): Promise<ReportGame | null>;
}
export interface ReportTally {
	gameId: string;
	/** `firstQuestionIndex` of each participant. */
	participantFirstQuestions: number[];
	/** Right answers to played questions. */
	correctAnswers: number;
}

// reports/application/ports/report-repository.ts
/** The part of a report that is written: its name, the trash, and its end. */
export interface ReportRepository {
	saveName(gameId: string, name: string): Promise<void>;
	/** `at` null takes them out of the trash. */
	saveTrashed(gameIds: readonly string[], at: Date | null): Promise<void>;
	/** Deletes the games, with players, questions and answers (RN-53). */
	delete(gameIds: readonly string[]): Promise<void>;
}
```

Fakes: `reports/testing/in-memory-report-store.ts` (uma classe que implementa as duas portas sobre uma lista de `ReportGame`, com o contrato acima) e `reports/testing/a-report-game.ts` (construtor de partidas para os testes: `aReportGame({ questions: 4, players: ["Ana", "Bia"], answers: {...} })`).

`game/testing`: o fake de `GameRepository` ganha `deleteUnstartedByQuiz`.

## Adapters

### Banco — `packages/db`

**`schema/game.ts`**

- `game.started_at timestamptz` (nula até iniciar).
- `game.quiz_id`: sai o `.references(() => quiz.id, { onDelete: "cascade" })`; fica `text not null`. O índice `game_unended_quiz_idx` continua.
- Índice novo `game_owner_ended_idx` em (`owner_id`, `ended_at`), para a lista.

**`schema/reports.ts`** (novo)

```ts
/** What a creator changed in a report (spec 015). No row: the game's title, out of the trash. */
export const report = pgTable("report", {
	gameId: text("game_id").primaryKey().references(() => game.id, { onDelete: "cascade" }),
	name: text("name"),
	trashedAt: timestamp("trashed_at", { withTimezone: true }),
});
```

**`repositories/reports/drizzle-report-game-query.ts`**

- `listHeaders` / `findHeader`: `game` `left join report` `left join quiz`. Condição de relatório: `question_count > 0 and (ended_at is not null or expires_at <= now)`; `endedAt = coalesce(ended_at, expires_at)`; `startedAt = coalesce(started_at, created_at)` (partidas anteriores a esta spec não têm o início gravado); `outcome` de `status`; `stoppedAt` das colunas da fase, que uma partida encerrada no meio conserva. Do quiz: `trashed_at`, `published_version is not null`, `cover_image_key`.
- `tallies`: duas consultas para as partidas da página, com `inArray`: os `first_question_index` dos jogadores não removidos, e a contagem de respostas `correct` agrupada por partida e pergunta (o adapter soma só as de índice menor que `playedQuestionCount`).
- `findGame`: cabeçalho, jogadores não removidos por `joined_at`, `game_question` (lidas por `parseStoredGameQuestion`) e `game_answer`, estas duas cortadas nas perguntas jogadas.

**`repositories/reports/drizzle-report-repository.ts`**

- `saveName` e `saveTrashed`: `insert … on conflict (game_id) do update` só da coluna em questão, para renomear e mandar para a lixeira ao mesmo tempo não se desfazerem.
- `delete`: `delete from game where id in (…)`; jogadores, perguntas, respostas e a linha de `report` vão pela cascata.

**`repositories/game/drizzle-game-repository.ts`**: `startedAt` no mapeamento; `deleteUnstartedByQuiz`.

### Real-time

Nenhum canal ou evento novo.

### Storage / outros

Nada novo: `storage.getPublicUrl` para a capa e as imagens das perguntas. Nenhuma imagem é apagada por esta spec.

## API — `packages/api`

Router novo `routers/report.ts`, todo com `protectedProcedure`:

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `report.list` | query | sessão | `{ section: enum(REPORT_SECTIONS), search?: string ≤ 200, limit: int 1..200 }` | `{ items, total }` | — |
| `report.get` | query | sessão | `{ gameId }` | `ReportView` | `REPORT.NOT_FOUND`, `REPORT.IN_TRASH` |
| `report.participant` | query | sessão | `{ gameId, playerId }` | `ParticipantDetailView` | idem |
| `report.question` | query | sessão | `{ gameId, questionIndex: int ≥ 0 }` | `QuestionDetailView` | idem |
| `report.rename` | mutation | sessão | `{ gameId, name: string }` | `{ name }` | `REPORT.NOT_FOUND`, `REPORT.IN_TRASH`, `REPORT.INVALID_NAME` |
| `report.moveToTrash` | mutation | sessão | `{ gameIds: string[] 1..200 }` | — | `REPORT.NOT_FOUND` |
| `report.restore` | mutation | sessão | `{ gameIds: string[] 1..200 }` | — | `REPORT.NOT_FOUND` |
| `report.deletePermanently` | mutation | sessão | `{ gameIds: string[] 1..200 }` | — | `REPORT.NOT_FOUND`, `REPORT.NOT_IN_TRASH` |

`REPORT.IN_TRASH` em `report.get` é como a tela sabe mostrar "está na lixeira" com Restaurar (RN-51).

Ligações novas em `container.ts` / `composition-root.ts`:

- adapters `reportGames: ReportGameQuery` e `reports: ReportRepository` (Drizzle no composition root; o fake nos testes, em `testing/test-context.ts`);
- os oito casos de uso;
- `quizGames.endGamesOfDeletedQuiz` passa a encerrar as abertas **e** chamar `games.deleteUnstartedByQuiz(quizId)`.

## UI — `apps/web` e `packages/ui`

### Rotas (dentro de `_auth/_shell`)

- **`/reports?section=reports|trash&q=`** — `routes/_auth/_shell/reports.index.tsx`. Uma consulta `report.list`; "Mostrar mais" aumenta o `limit` de 20 em 20 (`placeholderData` mantém a lista na tela enquanto a maior chega).
- **`/reports/$gameId?tab=summary|participants|questions&view=all|flagged&participant=&question=`** — `routes/_auth/_shell/reports.$gameId.tsx`. Uma consulta `report.get`; `tab` e `view` no endereço (RN-33, CA-23, CA-26); `participant` e `question` abrem o detalhe num `Sheet` sobre a aba, cada um com a sua consulta, e fechar o painel tira o parâmetro (voltar do navegador fecha o detalhe).

`MAIN_NAV_ITEMS`: Relatórios vira link para `/reports`; `activeMainNavLabel` marca Relatórios em `/reports…` (RN-22).

### Componentes — `apps/web/src/components/reports/`

| Componente | O que faz |
| --- | --- |
| `accuracy-ring.tsx` | O anel de percentual (SVG, verde sobre vermelho), em dois tamanhos, sempre com o número ao lado ou dentro; `aria-hidden` no desenho (RN-55) |
| `report-tabs.tsx` | Abas Relatórios e Lixeira, sobre o `TabNav` da biblioteca |
| `report-list.tsx`, `report-list-item.tsx` | A tabela (`<table>`) em telas largas e cartões em telas estreitas; caixa de seleção, capa com "N perguntas", nome, "Ao vivo", "Encerrada antes do fim", participantes, anel, data, menu (RN-24 a RN-26, RN-29) |
| `report-selection-bar.tsx` | A ação para os selecionados |
| `report-empty-state.tsx` | Vazio, pesquisa sem resultado e lixeira vazia (RN-30) |
| `rename-report-dialog.tsx` | Renomear pelo menu da lista; o campo e a validação são os mesmos do cabeçalho (RN-45 a RN-47) |
| `delete-report-dialog.tsx` | Confirmação de excluir de vez (`AlertDialog`) |
| `report-header.tsx` | "Relatório", nome com o lápis (edição no lugar), "Ao vivo", data, "Organizado por", menu "Opções de relatório" (RN-32, RN-34) |
| `report-summary.tsx` | Os cinco cartões do Resumo, com os `Tooltip`s de explicação (RN-35 a RN-39) |
| `participants-table.tsx`, `participant-detail.tsx` | RN-40 a RN-42 |
| `questions-table.tsx`, `question-detail.tsx` | RN-43, RN-44; as alternativas com `AnswerShape` |
| `report-trashed.tsx` | "Este relatório está na lixeira", com Restaurar (RN-51) |
| `home/recent-reports-card.tsx` | No lugar do `ComingSoonCard` da página inicial; `report.list` com `limit` igual ao de "Seus quizzes" (RN-31) |

Os componentes recebem dados e ações por propriedades, e as rotas ligam o tRPC, como no resto do app.

### Bibliotecas de apoio — `apps/web/src/lib`

- `report-mutations.ts` — renomear (otimista, com volta em caso de falha), mover para a lixeira com o aviso e **"Desfazer"** (que chama `report.restore`), restaurar e excluir; invalida `report.list` e `report.get`. Mesmo molde de `quiz-mutations.ts`.
- `report-labels.ts` — funções puras: a frase do resumo por faixa (RN-35), "11 min" / "menos de 1 min", "4,86 s", a data "13 de jun. de 2026, 17:45" (`Intl.DateTimeFormat("pt-BR")`), os textos de correta / parcialmente correta / incorreta / sem resposta.
- `report-error-messages.ts` — códigos `REPORT.*` em português.
- `api-types.ts` — os tipos de visão dos relatórios, com as datas como texto.

### Pódio

`host/podium.tsx` ganha o link **"Ver relatório"** (`/reports/$gameId`) junto das outras ações (RN-49). É um link comum: sair da tela do jogo passa pelo aviso de saída que já existe.

### Design system

Nenhuma primitiva nova em `packages/ui`: `TabNav`, `Checkbox`, `DropdownMenu`, `Dialog`, `AlertDialog`, `Sheet`, `Tooltip`, `Skeleton`, `Empty` e `Card` já existem. O anel de percentual fica no app, por só ter uso nos relatórios; se ganhar outro uso, sobe para o design system.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | aplicação | lists a finished game with its title, counts, accuracy and end | `core/src/reports/application/list-reports.test.ts` |
| CA-01 | repositório | a finished game is a report header | `db/src/repositories/reports/drizzle-report-game-query.test.ts` |
| CA-02 | domínio | an ended game counts only the questions that reached their results | `core/src/reports/domain/report.test.ts` |
| CA-02 | aplicação | a game ended in the middle tells how many were played | `core/src/reports/application/get-report.test.ts` |
| CA-03 | aplicação | a game ended before any results has no accuracy | `list-reports.test.ts`, `get-report.test.ts` |
| CA-04 | repositório | a game ended in the lobby is not a report | `drizzle-report-game-query.test.ts` |
| CA-05 | repositório | a game in progress is not a report; one past its deadline is | `drizzle-report-game-query.test.ts` |
| CA-05a | aplicação | two games of the same quiz are two reports, each with its own numbers | `core/src/reports/application/list-reports.test.ts` |
| CA-05a | repositório | renaming or trashing one report leaves the other of the same quiz alone | `db/src/repositories/reports/drizzle-report-repository.test.ts` |
| CA-06 | aplicação | another creator's report is not found | `get-report.test.ts` |
| CA-06 | API | report.get answers NOT_FOUND for another owner | `api/src/routers/report.test.ts` |
| CA-07 | domínio | overall accuracy is right answers over possible ones | `core/src/reports/domain/report-stats.test.ts` |
| CA-08 | domínio | a participant's accuracy and unanswered questions | `report-stats.test.ts` |
| CA-09 | domínio | questions before a late player's arrival do not count for them | `report-stats.test.ts` |
| CA-10 | domínio | a partially correct answer is not a right one | `report-stats.test.ts` |
| CA-11 | domínio | a question is difficult below 35%, not at 35% | `accuracy.test.ts`, `report-stats.test.ts` |
| CA-12 | domínio | a participant needs help below 35%, not at 35% | `report-stats.test.ts` |
| CA-13 | domínio | did not finish lists who left questions unanswered | `report-stats.test.ts` |
| CA-13 | componente | shows "Excelente! Todos concluíram" when nobody is listed | `web/src/components/reports/report-summary.test.tsx` |
| CA-14 | repositório | a player removed in the lobby is not a participant | `drizzle-report-game-query.test.ts` |
| CA-15 | domínio | duration goes from the start to the end | `report-stats.test.ts` |
| CA-15 | unidade (web) | formats minutes and "menos de 1 min" | `web/src/lib/report-labels.test.ts` |
| CA-16 | componente | Relatórios is a link and is marked on /reports | `web/src/components/layout/main-nav.test.tsx` |
| CA-17 | repositório | headers come by end, newest first | `drizzle-report-game-query.test.ts` |
| CA-18 | componente | explains where reports come from when there is none | `report-empty-state.test.tsx` |
| CA-19 | aplicação | search ignores case and accents | `list-reports.test.ts` |
| CA-19 | componente | tells that nothing was found for the term | `report-empty-state.test.tsx` |
| CA-20 | aplicação | limit cuts the list and total tells how many there are | `list-reports.test.ts` |
| CA-20 | componente | "Mostrar mais" shows while there are more | `report-list.test.tsx` |
| CA-21 | componente | lists the recent reports with "Ver tudo (N)"; explains when empty | `web/src/components/home/recent-reports-card.test.tsx` |
| CA-22 | componente | shows the name, the start, the host and the three tabs with counts | `report-header.test.tsx` |
| CA-23 | E2E | reloading keeps the tab | `web/e2e/reports.spec.ts` |
| CA-24 | aplicação | the summary has the hardest question and who needs help, in order | `get-report.test.ts` |
| CA-24 | componente | draws the five cards | `report-summary.test.tsx` |
| CA-25 | unidade (web) | picks the sentence by band | `report-labels.test.ts` |
| CA-26 | componente | "Ver tudo" and the card's title point to the flagged views | `report-summary.test.tsx` |
| CA-27 | componente | empty messages of the two cards | `report-summary.test.tsx` |
| CA-28 | componente | shows ten rows and the rest on "Mostrar mais" | `participants-table.test.tsx` |
| CA-29 | aplicação | a participant's answers, question by question | `get-report-participant.test.ts` |
| CA-29 | componente | shows each answer, its result, points and time | `participant-detail.test.tsx` |
| CA-30 | aplicação | questions come in the order they were played | `get-report.test.ts` |
| CA-30 | componente | filters by the statement | `questions-table.test.tsx` |
| CA-31 | domínio | counts who chose each answer and who did not answer | `report-stats.test.ts` |
| CA-31 | aplicação / componente | a question's detail | `get-report-question.test.ts`, `question-detail.test.tsx` |
| CA-32 | repositório | the report reads the game's questions, not the quiz's | `drizzle-report-game-query.test.ts` |
| CA-33 | aplicação | renaming changes the report's name only | `rename-report.test.ts` |
| CA-33 | repositório | saveName keeps the trash, saveTrashed keeps the name | `db/src/repositories/reports/drizzle-report-repository.test.ts` |
| CA-34 | domínio | rejects an empty name and one with 96 characters | `report.test.ts` |
| CA-34 | componente | tells why the name is not accepted | `report-header.test.tsx` |
| CA-35 | componente | a failed rename keeps the old name and warns | `report-header.test.tsx` |
| CA-36 | E2E | "Jogar de novo" opens a new lobby | `reports.spec.ts` |
| CA-37 | aplicação | without its quiz, a report has no images and no play again | `get-report.test.ts` |
| CA-37 | repositório | deleting the quiz keeps its started games and drops the others | `db/src/repositories/game/drizzle-game-repositories.test.ts`, `drizzle-report-game-query.test.ts` |
| CA-37 | API | deleting a quiz for good keeps its reports | `report.test.ts` |
| CA-38 | aplicação | a quiz in the trash cannot be played again or viewed | `get-report.test.ts` |
| CA-39 | componente | the podium links to the report | `web/src/components/game/host/podium.test.tsx` |
| CA-40 | aplicação | a trashed report leaves the list and shows in the trash | `trash-reports.test.ts` |
| CA-40 | E2E | move to the trash, undo | `reports.spec.ts` |
| CA-41 | aplicação | moves several at once; one foreign report fails them all | `trash-reports.test.ts` |
| CA-41 | componente | the header checkbox selects every row shown | `report-list.test.tsx` |
| CA-42 | aplicação | restoring puts it back | `trash-reports.test.ts` |
| CA-43 | aplicação | deleting for good needs the trash | `trash-reports.test.ts` |
| CA-43 | repositório | delete removes the game with players and answers, and no quiz | `drizzle-report-repository.test.ts` |
| CA-43 | componente | cancelling the confirmation changes nothing | `delete-report-dialog.test.tsx` |
| CA-44 | aplicação / componente | a trashed report does not open; the screen offers restore | `get-report.test.ts`, `report-trashed.test.tsx` |
| CA-45 | E2E | list, summary and tabs fit a phone | `reports.spec.ts` (projeto mobile) |
| CA-46 | componente | results are told in text and every ring has its number | `participant-detail.test.tsx`, `accuracy-ring.test.tsx` |
| CA-47 | componente | error state with "Tentar novamente" | `report-list.test.tsx` |

**E2E** (`reports.spec.ts`), um cenário curto, como combinado na spec 014: joga uma partida de uma pergunta com um jogador até o pódio, aciona "Ver relatório", confere o Resumo, troca de aba e recarrega (CA-23), volta à lista, manda para a lixeira e desfaz (CA-40), e aciona "Jogar de novo" (CA-36). Roda no desktop e no celular (CA-45).

## Dados e migração

- `pnpm -F @quizio/db db:push`: coluna `game.started_at`, tabela `report`, índice `game_owner_ended_idx`, e a retirada da chave estrangeira de `game.quiz_id`.
- Sem backfill. Partidas anteriores a esta spec aparecem como relatórios (as que foram iniciadas), com o início igual ao momento em que foram criadas.

## Riscos e decisões

- **ADR 0010 (proposto): relatório como leitura da partida.** Registra que o relatório não é gravado, que `reports` lê as tabelas do jogo por uma porta própria, que a tabela `report` guarda só o nome e a lixeira, e que `game.quiz_id` deixa de ser chave estrangeira. O rascunho já está em `docs/adr/`; passa a "aceito" no fechamento.
- **Duas regras do jogo repetidas em `reports`**: até que pergunta a partida chegou (`playedQuestionCount` × `revealedThrough`) e o desempate da classificação (× `rankPlayers`). É o preço de os contextos não importarem funções um do outro. Um teste de repositório monta uma partida de verdade com os casos de uso do jogo e confere que o relatório dá a mesma classificação que o pódio, para as duas não se afastarem.
- **Sem a chave estrangeira, quem apaga as partidas do quiz é o código.** As não iniciadas são apagadas por `deleteUnstartedByQuiz`; as iniciadas ficam, de propósito. Se a exclusão do quiz falhar no meio, o pior caso é uma partida não iniciada sobrar sem quiz, que não aparece em tela nenhuma.
- **A pesquisa filtra no servidor de aplicação, não no banco**: `listReports` lê todos os cabeçalhos da seção e filtra pelo nome normalizado. Evita guardar uma coluna de pesquisa para um nome que quase sempre é o título da partida. É uma linha leve por relatório; passa a pesar na casa dos milhares de relatórios por criador, quando vale trocar por uma coluna normalizada.
- **Custo de uma leitura**: `report.get` lê todas as respostas da partida (até 200 jogadores × as perguntas) e refaz as contas. São poucos milhares de linhas, numa tela aberta de vez em quando; nada é guardado em cache no servidor.
- **Excluir de vez apaga a partida** (RN-53): é o único ponto em que `reports` escreve nas tabelas do jogo, e só para apagar a linha inteira.
- **Partida vencida que ninguém mais abriu**: continua "em andamento" no banco, porque o prazo só é aplicado quando alguém a lê (ADR 0009). A consulta dos relatórios a trata como encerrada no prazo, sem escrever nada.

## Desvios na implementação

- **A lista e as tabelas são listas com uma linha de cabeçalho, não `<table>`.** Uma grade de CSS dá as colunas em tela larga e deixa os números embaixo do nome no celular com um HTML só; os rótulos das colunas ficam em cada linha para leitores de tela.
- **Os testes foram agrupados em menos arquivos** do que a tabela previa: `get-report-details.test.ts` (participante e pergunta), `change-reports.test.ts` (renomear, lixeira, restaurar, excluir), `report-dialogs.test.tsx`, `report-tables.test.tsx` e `report-details.test.tsx`. Os estados da página (lixeira, não encontrado, erro, carregando) ficaram em `report-states.tsx`, e as peças comuns (resultado, alternativa, "?") em `report-parts.tsx`.
- **O teste que mantém as duas regras repetidas iguais às do jogo** compara as funções de `reports` com `revealedThrough` e `rankPlayers` sobre as mesmas linhas do banco, em vez de jogar uma partida pelos casos de uso do jogo.
- **No teste do router, os relatórios são postos direto no fake** (`api.reports.put`): ele não lê os fakes do jogo. "Excluir o quiz mantém as partidas iniciadas" é conferido nas partidas, no teste do router, e a leitura delas como relatório, no teste do adapter.
- **"Ver relatório" no pódio é uma ação** (`actions.report`) que a rota liga, como as outras do pódio, e não um link dentro do componente.
- **`LibrarySearch` ganhou a propriedade `label`** e é usada também na lista de relatórios.
- **`e2e/support.ts` ganhou `hideDevtools`**: no celular, o botão flutuante das ferramentas de desenvolvimento ficava por cima de "Ver relatório".
- **A conferência da T31** foi feita com um roteiro do Playwright e uma carga de dados temporários, apagados depois, porque precisava de partidas variadas (25 jogadores, encerrada no meio, quiz excluído).
