---
spec: "029"
status: approved # draft | approved
---

# Plano técnico — 029 Atribuir quiz 1/2 — Criar, compartilhar e acompanhar a atribuição

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0014](../../../docs/adr/0014-atribuicao-como-partida.md)

## Abordagem

**A atribuição é uma partida (`Game`) em outro modo** (`mode: "assignment"`, ADR 0014). Ela já tem tudo o que a atribuição precisa e a 029-2/2 vai usar: dono, quiz e versão, título do momento, PIN único entre as abertas, opções, `expiresAt` (que vira o prazo), `endedAt`/`endReason`, as perguntas copiadas em `game_question`, e depois `game_player` e `game_answer`. Os relatórios já leem partidas (ADR 0010), então a atribuição vira relatório só com mudanças na consulta. O que muda na partida é pouco e explícito: duas colunas (`mode`, `question_timer`), o índice "uma partida aberta por quiz" passa a valer só para o modo ao vivo (RN-05), e todo caso de uso da partida ao vivo recusa uma atribuição como se ela não existisse.

Na criação (`createAssignment`), o servidor confere o prazo no seu relógio (depois de agora, até `maxDeadlineDays`, uma configuração da instância), sorteia um **PIN de 8 dígitos** por uma porta nova, grava a partida já "em jogo" (`status: "playing"`, sem `progress`, `startedAt` = criação) e **copia as perguntas da versão jogável na hora** (RN-04), sem embaralhar: a ordem por participante é da 029-2/2. Alterar o prazo grava só `expires_at`, com a condição de a partida não ter acabado (RN-38). Encerrar é o `closeGame` que já existe. Nada roda no fim do prazo: quem lê depois do prazo vê a atribuição acabada, como já acontece com as 8 horas da partida ao vivo (ADR 0009).

O participante chega por **`/assignment/$gameId`** (o link) ou pelo PIN em `/join`, que passa a reconhecer 8 dígitos e redireciona. A tela da atividade lê uma consulta pública (`AssignmentLandingQuery`) com o nome (do relatório, se renomeado), o nome do criador, o tempo que falta e o número de participantes. O tempo é sempre mandado como **tempo restante** (`remainingMs`), nunca como instante a comparar com o relógio do aparelho. Não há eventos em tempo real nesta etapa.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Atribuição | `Game` com `mode: "assignment"`; `GameMode` (`live` \| `assignment`) | sim |
| Prazo | `Game.expiresAt` de uma atribuição; `assignmentDeadlineError` | sim (reuso) |
| PIN da atribuição | `ASSIGNMENT_PIN_LENGTH` (8), `AssignmentPinGenerator`, `parseJoinPin` | sim |
| Opções da atribuição | `AssignmentOptions` (`gameCharacters`, `questionTimer`, `randomizeAnswers`) | sim |
| Timer da pergunta | `Game.questionTimer` | sim |
| Preferências de atribuição | `AssignmentPreferencesRepository`, tabela `assignment_preferences` | sim |
| Tela da atividade | `AssignmentLandingView`, `AssignmentLandingQuery` | sim |
| Atribuição aberta (relatório) | `ReportHeader.status: "open"`, `ReportHeader.mode` | sim |

## Domínio — `packages/core/src/game/domain`

### Agregado `Game` (alterado) — `game.ts`

- `mode: GameMode` (`GAME_MODES = ["live", "assignment"]`). `newGame` continua criando `live`.
- `questionTimer: boolean` — sempre `true` ao vivo; na atribuição, a chave "Timer da pergunta" (RN-13). Guardado agora, usado pela pontuação na 029-2/2.
- `isGameOpen`, `endGame`, `expireIfDue` e `requireOwnedGame` valem para os dois modos: a atribuição acaba no prazo (`expireIfDue`, razão `expired`) ou em "Encerrar agora" (`endGame`, razão `host`) — RN-39, RN-40.
- Novo `requireLiveGame(game)` e `requireAssignment(game)`: o modo errado lança `GameNotFoundError`, para que um ID de atribuição não sirva às telas do anfitrião ao vivo nem o contrário (o mesmo princípio de "de outro dono é igual a inexistente").

### Novo módulo `assignment.ts`

```ts
export const ASSIGNMENT_DEFAULT_MAX_DEADLINE_DAYS = 28; // RN-08 (configurável na instância)

export interface AssignmentOptions {
	gameCharacters: boolean;
	questionTimer: boolean;
	randomizeAnswers: boolean;
}
export const DEFAULT_ASSIGNMENT_OPTIONS: AssignmentOptions = {
	gameCharacters: false, questionTimer: true, randomizeAnswers: false, // RN-14
};

/** RN-08: depois de `now` e no máximo `maxDays` dias depois. */
export function assertAssignmentDeadline(deadline: Date, now: Date, maxDays: number): void;

/** A partida de uma atribuição, já "em jogo" e com as perguntas contadas (RN-04, RN-15). */
export function newAssignment(input: {
	id: string; ownerId: string; quizId: string; quizVersion: number; title: string;
	pin: string; deadline: Date; options: AssignmentOptions; questionCount: number; now: Date;
}): Game;
// status "playing", progress null, startedAt = createdAt = now, expiresAt = deadline,
// options = { showQuestionsOnDevices: true, randomizeQuestions: false, autoplay: false,
//             randomizeAnswers, gameCharacters }, autoplaySince null, locked false.

/** RN-36 a RN-38: só aberta; o novo prazo passa pelas mesmas regras. */
export function changeAssignmentDeadline(game: Game, deadline: Date, now: Date, maxDays: number): Game;
```

A precisão de hora (RN-07, RN-09) é da tela: o servidor não conhece o fuso do aparelho, então confere só os limites.

### `game-pin.ts` (alterado)

- `ASSIGNMENT_PIN_LENGTH = 8`, qualquer dígito (pode começar com zero, RN-18).
- `parseJoinPin(raw): { pin: string; mode: GameMode } | null` — aceita os 6 dígitos da partida ao vivo (sem zero à esquerda) e os 8 da atribuição; `parseGamePin` continua para quem só aceita o ao vivo.
- `formatGamePin` já divide ao meio ("0435 2236").

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `AssignmentDeadlinePassedError` | `ASSIGNMENT.DEADLINE_PASSED` | prazo igual ou anterior a agora, ao criar ou alterar (RN-08, CA-09, CA-10, CA-32) |
| `AssignmentDeadlineTooFarError` | `ASSIGNMENT.DEADLINE_TOO_FAR` | prazo a mais de `maxDays` dias (RN-08, CA-10, CA-32) |
| `GameEndedError` (existente) | `GAME.ENDED` | alterar o prazo de uma atribuição acabada (RN-38, CA-33) |
| `QuizNotPlayableError` (existente) | `GAME.QUIZ_NOT_PLAYABLE` | atribuir rascunho ou quiz na lixeira (RN-03, CA-04, CA-05) |
| `GameNotFoundError` (existente) | `GAME.NOT_FOUND` | atribuição de outro dono, ou ID do modo errado |

## Domínio — `packages/core/src/reports/domain`

`ReportHeader` (alterado):

- `mode: GameMode` e `status: "finished" | "ended" | "open"` (substitui `outcome`; `endedEarly` continua sendo `status === "ended"` **só** no ao vivo).
- `deadline: Date` — o prazo de uma atribuição (`expiresAt`).
- `endedAt: Date | null` — null enquanto a atribuição está aberta.
- `pin: string | null` — o PIN de uma atribuição aberta (o Resumo mostra e copia, RN-32); null no resto.
- `playedQuestionCount(header)`: numa atribuição, **todas** as perguntas (cada participante joga as dele; as contas por participante são da 029-2/2, RN-35).
- Novo `assertCanTrash(header)` → `ReportAssignmentOpenError` (`REPORT.ASSIGNMENT_OPEN`) para atribuição aberta (RN-41).

`ReportHeaderView` ganha `mode` e `assignment: { open: boolean; deadline: Date; remainingMs: number | null; pin: string | null } | null`. A lista (`ReportListItemView`) ganha `mode` e `remainingMs` (abertas).

## Aplicação

### Casos de uso — `packages/core/src/game/application`

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `createGetAssignmentSetup` (novo) | `{ ownerId }` | `{ options: AssignmentOptions; maxDeadlineDays: number }` | — | `assignmentPreferences`, config |
| `createCreateAssignment` (novo) | `{ ownerId, quizId, deadline: Date, options }` | `{ gameId, pin }` | `GAME.QUIZ_NOT_FOUND`, `GAME.QUIZ_NOT_PLAYABLE`, `ASSIGNMENT.DEADLINE_*` | `playableQuizzes`, `games`, `gameQuestions`, `assignmentPins`, `assignmentPreferences`, `ids`, `clock`, config |
| `createChangeAssignmentDeadline` (novo) | `{ ownerId, gameId, deadline }` | `void` | `GAME.NOT_FOUND`, `GAME.ENDED`, `ASSIGNMENT.DEADLINE_*` | `games`, `clock`, config |
| `createEndAssignment` (novo) | `{ ownerId, gameId }` | `void` | `GAME.NOT_FOUND` | `games`, `clock`, `realtime` (via `closeGame`) |
| `createGetAssignmentLanding` (novo, público) | `{ gameId }` | `AssignmentLandingView` | `GAME.NOT_FOUND` | `assignmentLanding`, `clock` |
| `createFindGameByPin` (alterado) | `{ pin, clientKey }` | `{ gameId, pin, mode }` | os de hoje | + `games.findLatestAssignmentByPin` |
| `createHostGame` (alterado) | — | — | — | `endGamesOfQuiz` só do modo ao vivo (RN-05) |
| `createEndGamesOfQuiz` (alterado) | `{ quizId, reason, modes? }` | — | — | "replaced" passa `["live"]`; "quizDeleted", os dois (RN-42) |
| casos de uso ao vivo (`getHostGame`, `startGame`, `advanceGame`, `setGameLocked`, `setGameOptions`, `signalHost`, `removePlayer`, `endGame`, `joinGame`, `getPlayerSession`, `submitAnswer`, `changeAvatar`) | — | — | `GAME.NOT_FOUND` para atribuição | `requireLiveGame` depois de `loadGame` |

Detalhes:

- **`createAssignment`**: carrega o quiz pela `PlayableQuizQuery` (mesmas checagens do `hostGame`); `assertAssignmentDeadline` no relógio do servidor; copia as perguntas com `arrangeGameQuestions(questions, { randomizeQuestions: false, randomizeAnswers: false }, identity)`; sorteia o PIN (até 5 tentativas, como o `hostGame`: `findUnendedByPin` + `settleGame` libera o de uma vencida; `create` → `"taken"` sorteia de novo); grava a partida, depois `gameQuestions.saveAll`; por fim `assignmentPreferences.save(ownerId, options)` (CA-14). Não chama `endGamesOfQuiz` (RN-05).
- **`changeAssignmentDeadline`**: `loadGame` (aplica o prazo vencido) → `requireOwnedGame` → `requireAssignment` → `changeAssignmentDeadline` (domínio) → `games.saveDeadline(gameId, deadline)`, condicional a `ended_at is null`; `false` (alguém encerrou no meio) → `GameEndedError`.
- **`findGameByPin`**: com `parseJoinPin`. Um PIN de 8 dígitos procura a atribuição aberta com ele; sem ela, a **mais recente** atribuição que teve o PIN (`findLatestAssignmentByPin`), para mostrar "Esta atividade foi encerrada" (CA-42). Achar qualquer uma libera a tentativa; não achar conta como PIN errado (RN-20, CA-41). Para atribuição, devolve `mode: "assignment"` sem `assertJoinable`.
- **`getAssignmentLanding`**: `AssignmentLandingView = { status: "open"; name; creatorName; remainingMs; participantCount } | { status: "ended"; name }`. Lê pela porta e decide "acabada" pelo relógio do servidor (`endedAt` ou `now >= expiresAt`), sem gravar. Não devolve nada das perguntas (RN-48).

### Casos de uso — `packages/core/src/reports/application` (alterados)

- `listReports`: abertas primeiro (a porta já ordena), `remainingMs` para as abertas, `"—"` no percentual sem participantes (já é `null`).
- `getReport`: `header.assignment` (RN-31 a RN-33); com a atribuição aberta, o Resumo só tem os três cartões vazios além do que vem do cabeçalho (RN-34). Perguntas: todas as da atribuição, percentual `null` (RN-34).
- `moveReportsToTrash`: `assertCanTrash` em cada cabeçalho antes de gravar; uma aberta na seleção recusa o pedido inteiro (RN-41, CA-37).
- `renameReport`: sem mudança — a tela da atividade lê o nome do relatório (RN-28, CA-30).

### Portas novas ou alteradas

```ts
// game/application/ports/assignment-pin-generator.ts
export interface AssignmentPinGenerator {
	/** Oito dígitos aleatórios; o primeiro pode ser zero (spec 029, RN-18). */
	generate(): string;
}

// game/application/ports/assignment-preferences-repository.ts
export interface AssignmentPreferencesRepository {
	/** Null para quem nunca atribuiu (RN-14). */
	find(ownerId: string): Promise<AssignmentOptions | null>;
	save(ownerId: string, options: AssignmentOptions): Promise<void>;
}

// game/application/ports/assignment-landing-query.ts
export interface AssignmentLandingRecord {
	gameId: string;
	/** O nome do relatório, ou o título da partida (RN-28). */
	name: string;
	creatorName: string;
	expiresAt: Date;
	endedAt: Date | null;
	/** Jogadores não removidos. */
	participantCount: number;
}
export interface AssignmentLandingQuery {
	/** Só atribuições; null para ID desconhecido ou do modo ao vivo. */
	find(gameId: string): Promise<AssignmentLandingRecord | null>;
}

// game/application/ports/game-repository.ts (alterado)
interface GameRepository {
	listUnendedByQuiz(quizId: string, modes?: readonly GameMode[]): Promise<Game[]>;
	/** A atribuição mais recente que teve o PIN, aberta ou não. */
	findLatestAssignmentByPin(pin: string): Promise<Game | null>;
	/** Grava só o prazo, se a partida não acabou; false se acabou (RN-38). */
	saveDeadline(gameId: string, deadline: Date): Promise<boolean>;
	// create(): "taken" passa a ser PIN ocupado, ou quiz com partida AO VIVO aberta
}

// reports/application/ports/report-game-query.ts (contrato alterado)
// - relatório = partida ao vivo iniciada e acabada, OU qualquer atribuição (RN-27)
// - listHeaders: atribuições abertas primeiro, pelo prazo asc; depois por endedAt desc (RN-30)
```

Fakes: `InMemoryAssignmentPreferencesRepository`, `InMemoryAssignmentLandingQuery` (sobre o fake de jogos e um mapa de nomes), `SequentialAssignmentPinGenerator`; o `InMemoryGameRepository` ganha os métodos novos e a regra do índice por modo; o `InMemoryReportStore` ganha o modo e a ordem.

## Adapters

### Banco — `packages/db`

`schema/game.ts`:

- `gameMode = pgEnum("game_mode", GAME_MODES)`; `game.mode` `not null default 'live'`.
- `game.question_timer boolean not null default true`.
- `game_unended_quiz_idx` passa a `where ended_at is null and mode = 'live'` (RN-05). `game_unended_pin_idx` continua igual: 6 e 8 dígitos nunca colidem.
- Índice `game_assignment_pin_idx` em `(pin, created_at)` `where mode = 'assignment'` para `findLatestAssignmentByPin`.
- Tabela `assignment_preferences` (`owner_id` pk → `user.id` cascade, `game_characters` default false, `question_timer` default true, `randomize_answers` default false, `updated_at`), separada de `host_preferences` (RN-14).

Repositórios:

- `drizzle-game-repository.ts`: mapear `mode`/`questionTimer`; `listUnendedByQuiz(quizId, modes)`; `findLatestAssignmentByPin`; `saveDeadline` (`update … set expires_at where id and ended_at is null returning id`).
- `drizzle-assignment-preferences-repository.ts` (novo).
- `drizzle-assignment-landing-query.ts` (novo): `game` ⟕ `report` (nome) ⟕ `user` (nome do criador) + contagem de `game_player` sem `removed_at`, filtrando `mode = 'assignment'`.
- `drizzle-report-game-query.ts`: `isReport = or(mode = 'assignment', and(question_count > 0, acabou))`; colunas `mode`, `expiresAt`, `pin`; `toHeader` monta `status` (`open` quando atribuição sem `endedAt` e antes do prazo), `endedAt` null se aberta, `pin` só se aberta; ordem `case when aberta then 0 else 1`, `case when aberta then expires_at end asc`, `coalesce(ended_at, expires_at) desc`, `id`. `findHeader`/`findGame` recebem `now` como hoje.

### Real-time

Nenhum evento novo. "Encerrar agora" reaproveita `closeGame`, que publica `game-ended` no canal da partida (sem assinantes nesta etapa; a 029-2/2 usa). A tela da atividade e o relatório leem as suas consultas.

### Outros — `packages/api`

- `random-assignment-pin-generator.ts` (novo), ao lado de `random-game-pin-generator.ts`, com `crypto.randomInt`.
- Configuração: `ASSIGNMENT_MAX_DEADLINE_DAYS` (opcional, padrão 28, inteiro 1–365) em `packages/env/src/server.ts`, `apps/web/.env.example` e na seção Environment do `CLAUDE.md`; a composition root passa `assignmentMaxDeadlineDays` ao container, que o injeta nos casos de uso (RN-08).

## API — `packages/api`

Um sub-router `assignment` em `routers/game.ts` (o contexto é `game`):

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `game.assignment.setup` | query | protegida | — | `{ options, maxDeadlineDays }` | — |
| `game.assignment.create` | mutation | protegida | `{ quizId, deadline: z.iso.datetime(), options: { gameCharacters, questionTimer, randomizeAnswers } }` | `{ gameId, pin }` | `GAME.QUIZ_NOT_FOUND`, `GAME.QUIZ_NOT_PLAYABLE`, `ASSIGNMENT.DEADLINE_PASSED`, `ASSIGNMENT.DEADLINE_TOO_FAR` |
| `game.assignment.changeDeadline` | mutation | protegida | `{ gameId, deadline }` | `void` | `GAME.NOT_FOUND`, `GAME.ENDED`, `ASSIGNMENT.DEADLINE_*` |
| `game.assignment.end` | mutation | protegida | `{ gameId }` | `void` | `GAME.NOT_FOUND` |
| `game.assignment.landing` | query | pública | `{ gameId }` | `AssignmentLandingView` | `GAME.NOT_FOUND` |
| `game.join.find` (alterada) | mutation | pública | igual | `{ gameId, pin, mode }` | igual |
| `report.list`, `report.get` (alteradas) | query | protegida | igual | com `mode`/`assignment` | igual |
| `report.moveToTrash` (alterada) | mutation | protegida | igual | igual | + `REPORT.ASSIGNMENT_OPEN` |

`container.ts`: `assignmentPins`, `assignmentPreferences`, `assignmentLanding` nos adapters; os cinco casos de uso novos; `quizGames.endGamesOfDeletedQuiz` passa a encerrar os dois modos (RN-42) e `hostGame` o modo ao vivo. `composition-root.ts`: os adapters Drizzle novos, o gerador de PIN e a configuração. `testing/test-context.ts`: os fakes.

## UI — `apps/web` e `packages/ui`

**Design system (`packages/ui`)**: um primitivo `Calendar`, semana começando na segunda, em português, dia escolhido em `bg-primary`, dias indisponíveis esmaecidos. Entra no `/design-system`. *Na implementação ele foi escrito sobre uma tabela, sem `react-day-picker` nem a CLI do shadcn (que, numa worktree, grava na raiz do checkout principal): nenhuma dependência nova.*

**Lib (`apps/web/src/lib`)**:

- `assignment-deadline.ts` — puro: `defaultDeadline(now)` (3 dias, 12:00 local, RN-07), `deadlineBounds(now, maxDays)`, `hourOptions(day, now)` (só horas cheias futuras no dia de hoje, RN-09), `formatDeadlineLong` ("quinta-feira, 22 de outubro de 2026 às 12:00").
- `time-until.ts` — puro: `timeUntil(remainingMs)` → "em 3 dias" / "em 5 horas" / "em 40 minutos" (RN-10, CA-11), e `openFor(remainingMs)` → "Aberto por 2 dias".
- `assignment-link.ts` — `assignmentLink(origin, gameId)` e a mensagem de compartilhamento (RN-23); usa `useOrigin` como `join-link.ts`.
- `share-targets.ts` — URLs de WhatsApp, Telegram, Facebook, X e `mailto:` a partir da mensagem (RN-23).
- `assignment-mutations.ts` — `useCreateAssignment`, `useChangeAssignmentDeadline`, `useEndAssignment`, com invalidação de `report.list`/`report.get` e os avisos (RN-17, RN-26, RN-43).
- `game-error-messages.ts` / `report-error-messages.ts` — os códigos novos em português.

**Componentes (`apps/web/src/components/assignment/`, novo)**:

- `assign-dialog.tsx` — "Configurar atividade": cartão do prazo com "Editar", "Mais opções" recolhível com as quatro chaves (Gerador de apelido desabilitado com o selo "Em breve", RN-12), "Cancelar"/"Criar uma tarefa"; ao criar, troca para o compartilhamento no mesmo diálogo. Recebe `setup` e as ações por props.
- `deadline-picker.tsx` — `Popover`/diálogo com `Calendar` + `Select` de horário, "Cancelar"/"Definir" (RN-09). Reusado em "Alterar o prazo".
- `share-assignment-dialog.tsx` — "Compartilhe com os participantes": ilustração (SVG em `public/`), cartão da atividade (link para o relatório), "Compartilhar" (`navigator.share` ou menu de `share-targets`), "Adicionar participantes" (menu com os dois "Em breve"), "Copiar link", PIN com copiar e ajuda (RN-21 a RN-25).
- `assign-button.tsx` — abre o diálogo a partir de um `quizId`; usado na página do quiz, na linha da biblioteca e no "O quiz está pronto"; ao fechar o compartilhamento, toast "Atividade criada" com "Ver relatório" (RN-26).

**Telas alteradas**:

- `components/quiz/quiz-details-view.tsx` — "Atribuir" ao lado de "Organizar ao vivo", mesmas condições (RN-02, RN-03).
- `components/library/quiz-list-item.tsx` — em telas largas, ao passar o mouse ou focar (`group-hover`/`group-focus-within`), "Atribuir" e "Organizar ao vivo" sobre a visibilidade e a data, só para `status: "published"`; no celular, os dois no menu ⋮ (RN-02, CA-02). "Organizar ao vivo" reaproveita `useHostGame` de `game-mutations.ts`.
- `components/editor/quiz-ready-dialog.tsx` — opção "Atribuir" disponível depois de "Organizar ao vivo" (RN-02c); `quiz-editor.tsx` abre o diálogo de atribuir.
- `components/reports/report-list-item.tsx` — "Atribuição" e "Termina: …" (RN-29); menu com "Mover para a lixeira" desabilitado e a dica numa atribuição aberta (RN-41); `report-selection-bar.tsx` desabilita a ação com uma aberta selecionada.
- `components/reports/report-header.tsx` — bloco "Atribuição" à direita (troféu, etiqueta "Termina: …"/"Encerrada", datas, "Organizado por") (RN-31).
- `components/reports/report-summary.tsx` + novo `assignment-summary.tsx` — cartão de convite (anel de participantes, "Convide mais participantes!", "Compartilhar atividade atribuída", QR com "Baixar", PIN e URL com "Copiar"), cartão "Alterar prazo"/"Encerrar agora", cartão "Jogue este quiz" "Em breve", e os três cartões da spec 015 (RN-32 a RN-35). O QR reaproveita `join-qr.tsx` (`qrcode.react`); "Baixar" exporta o `canvas` como PNG.
- `components/reports/change-deadline-dialog.tsx` e `end-assignment-dialog.tsx` (novos) — RN-36, RN-39.
- Página inicial: o cartão "Relatórios mais recentes" usa a mesma linha resumida, com "Termina: …" para as abertas.

**Participante**:

- Rota pública `routes/assignment.$gameId.tsx` (renderizada só no cliente, como `/join`), dentro de `GameScreen`: `components/assignment/assignment-landing.tsx` com os estados aberta (RN-46: "Atividade por …", "Aberto por …", nome, participantes, apelido e "Ok, vamos lá!" desabilitados com "Em breve", "Não use seu nome verdadeiro"), encerrada (RN-47) e não encontrada (volta a `/join` com a mensagem). Carregando e erro com "Tentar novamente".
- `routes/join.tsx`: quando `game.join.find` responde `mode: "assignment"`, navega para `/assignment/$gameId`. O campo do PIN aceita 8 dígitos (`parseJoinPin` no cliente para validar o formato).

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | componente | "Atribuir" na página do quiz abre "Configurar atividade" com o prazo padrão e "Em 3 dias" | `apps/web/src/components/quiz/quiz-details-view.test.tsx`, `components/assignment/assign-dialog.test.tsx` |
| CA-01 | unidade (web) | `defaultDeadline` é daqui a 3 dias às 12:00 locais | `apps/web/src/lib/assignment-deadline.test.ts` |
| CA-02 | componente | linha publicada mostra os dois botões no hover/foco; rascunho não; menu ⋮ tem os dois | `apps/web/src/components/library/quiz-list-item.test.tsx` |
| CA-03 | componente | "O quiz está pronto" tem "Atribuir" disponível e chama a ação | `apps/web/src/components/editor/quiz-ready-dialog.test.tsx` |
| CA-04, CA-05 | aplicação | `createAssignment` recusa rascunho e quiz na lixeira (`GAME.QUIZ_NOT_PLAYABLE`); componente mostra "Atribuir" indisponível com a dica | `packages/core/src/game/application/create-assignment.test.ts`, `quiz-details-view.test.tsx` |
| CA-06 | componente | Cancelar e X fecham sem chamar `create` | `assign-dialog.test.tsx` |
| CA-07, CA-08 | componente + unidade | escolher dia e horário atualiza o cartão; dias fora dos limites desabilitados; hoje só horas futuras | `components/assignment/deadline-picker.test.tsx`, `lib/assignment-deadline.test.ts` |
| CA-09 | componente | erro `ASSIGNMENT.DEADLINE_PASSED` mantém o diálogo e mostra o motivo no cartão | `assign-dialog.test.tsx` |
| CA-10 | domínio + aplicação | `assertAssignmentDeadline` recusa passado, agora e > 28 dias; aceita 28 dias exatos; respeita `maxDays` configurado | `packages/core/src/game/domain/assignment.test.ts`, `create-assignment.test.ts` |
| CA-11 | unidade (web) | `timeUntil`: 2d22h → "em 3 dias", 5 h → "em 5 horas", 40 min → "em 40 minutos", singulares | `apps/web/src/lib/time-until.test.ts` |
| CA-12, CA-15 | componente | "Mais opções" com os padrões, Gerador "Em breve" desabilitado, sem limite/upgrade nem outras opções | `assign-dialog.test.tsx` |
| CA-13 | aplicação + repositório | a partida guarda `gameCharacters`, `questionTimer`, `randomizeAnswers`; `showQuestionsOnDevices` sempre ligado; colunas gravadas | `create-assignment.test.ts`, `packages/db/src/repositories/game/drizzle-assignment.test.ts` |
| CA-14 | aplicação + repositório | as opções ficam em `assignment_preferences` e `setup` as devolve; `host_preferences` não muda | `create-assignment.test.ts`, `get-assignment-setup.test.ts`, `drizzle-assignment-preferences-repository.test.ts` |
| CA-16 | aplicação + componente | `create` devolve PIN de 8 dígitos; o diálogo de compartilhamento mostra cartão, ações e PIN | `create-assignment.test.ts`, `share-assignment-dialog.test.tsx` |
| CA-17 | componente | "Copiar link" e copiar PIN escrevem na área de transferência e avisam | `share-assignment-dialog.test.tsx` |
| CA-18 | componente + unidade | sem `navigator.share`, menu com os destinos; URL do WhatsApp com a mensagem | `share-assignment-dialog.test.tsx`, `lib/share-targets.test.ts` |
| CA-19 | componente | "Adicionar participantes" tem os dois "Em breve", sem upgrade | `share-assignment-dialog.test.tsx` |
| CA-20 | componente | fechar o compartilhamento mostra "Atividade criada" com "Ver relatório" | `components/assignment/assign-button.test.tsx` |
| CA-21 | aplicação + repositório | duas atribuições abertas do mesmo quiz; o índice não as impede | `create-assignment.test.ts`, `drizzle-assignment.test.ts` |
| CA-22 | aplicação + repositório | `hostGame` não encerra atribuição e `createAssignment` não encerra a partida ao vivo; índice só para `live` | `host-game.test.ts`, `create-assignment.test.ts`, `drizzle-assignment.test.ts` |
| CA-23 | aplicação | perguntas copiadas na criação e título do momento; editar e publicar depois não muda `game_question` nem o título | `create-assignment.test.ts` |
| CA-24 | aplicação + repositório | atribuição recém-criada é relatório aberto: "Atribuição", `remainingMs`, 0 participantes, percentual null; aparece na página inicial | `packages/core/src/reports/application/list-reports.test.ts`, `drizzle-report-game-query.test.ts`, `get-home-overview.test.ts` |
| CA-25 | repositório | ordem: abertas pelo prazo, depois acabadas por `endedAt` desc | `drizzle-report-game-query.test.ts`, `in-memory-report-store.test.ts` |
| CA-26 | aplicação + componente | `getReport` com `assignment` aberto; cabeçalho e Resumo com todos os cartões e "Jogue este quiz" "Em breve" | `get-report.test.ts`, `report-header.test.tsx`, `components/reports/assignment-summary.test.tsx` |
| CA-27 | componente | "Compartilhar atividade atribuída" abre o compartilhamento com o mesmo link e PIN | `assignment-summary.test.tsx` |
| CA-28 | componente | "Baixar" gera um PNG do QR com o link da atividade | `assignment-summary.test.tsx` |
| CA-29 | API | `report.get` e `game.assignment.changeDeadline`/`end` de outro dono → `NOT_FOUND` | `packages/api/src/routers/game.test.ts`, `report.test.ts` |
| CA-30 | repositório + API | renomear o relatório muda o `name` da tela da atividade | `drizzle-assignment-landing-query.test.ts`, `game.test.ts` |
| CA-31 | aplicação + componente | `changeAssignmentDeadline` grava o novo prazo; relatório e lista refletem | `change-assignment-deadline.test.ts`, `change-deadline-dialog.test.tsx` |
| CA-32 | domínio + aplicação | prazo passado/longe recusado e o anterior mantido | `assignment.test.ts`, `change-assignment-deadline.test.ts` |
| CA-33 | aplicação + repositório + componente | acabada → `GAME.ENDED`; `saveDeadline` não grava em acabada; cabeçalho "Encerrada" sem os botões | `change-assignment-deadline.test.ts`, `drizzle-assignment.test.ts`, `report-header.test.tsx` |
| CA-34 | aplicação + E2E | `endAssignment` acaba na hora; o link mostra "encerrada" | `end-assignment.test.ts`, `apps/web/e2e/assignment.spec.ts` |
| CA-35 | componente | "Cancelar" na confirmação não chama `end` | `components/reports/end-assignment-dialog.test.tsx` |
| CA-36 | aplicação + repositório | depois do prazo, sem escrita, o relatório é acabado com `endedAt` = prazo e vai para depois das abertas | `list-reports.test.ts`, `drizzle-report-game-query.test.ts` |
| CA-37 | aplicação + componente | `moveReportsToTrash` com uma aberta → `REPORT.ASSIGNMENT_OPEN`; depois de encerrar, vai; item do menu desabilitado com a dica | `change-reports.test.ts`, `components/reports/report-list.test.tsx` |
| CA-38 | aplicação (container) | excluir o quiz de vez encerra a atribuição (`quizDeleted`) e mantém o relatório; lixeira não encerra | `packages/api/src/routers/quiz.test.ts` |
| CA-39 | aplicação + componente + E2E | `getAssignmentLanding` aberta com nome, criador, tempo e participantes, sem perguntas; tela com apelido "Em breve" | `get-assignment-landing.test.ts`, `components/assignment/assignment-landing.test.tsx`, `e2e/assignment.spec.ts` |
| CA-40 | aplicação + E2E | `findGameByPin` com 8 dígitos devolve `mode: "assignment"`; `/join` leva à tela da atividade | `packages/core/src/game/application/find-game-by-pin.test.ts`, `e2e/assignment.spec.ts` |
| CA-41 | domínio + aplicação | `parseJoinPin`; 8 dígitos sem atribuição conta tentativa e lança `GAME.PIN_NOT_RECOGNIZED` | `game-pin.test.ts`, `find-game-by-pin.test.ts` |
| CA-42 | aplicação + componente | PIN e link de atribuição encerrada → `status: "ended"`; tela "Esta atividade foi encerrada" | `find-game-by-pin.test.ts`, `get-assignment-landing.test.ts`, `assignment-landing.test.tsx` |

Também: os casos de uso ao vivo recusam um ID de atribuição (`GAME.NOT_FOUND`) — um teste por caso de uso em `host-game.test.ts`/`get-host-game.test.ts` e um de router em `game.test.ts`; `toHeader` e a migração em `drizzle-report-game-query.test.ts`.

**E2E** (`apps/web/e2e/assignment.spec.ts`, desktop + mobile): criador publica um quiz, atribui com o prazo padrão, copia o PIN, abre o link num contexto anônimo (tela "Em breve"), entra pelo PIN em `/join`, volta ao relatório, altera o prazo, encerra e vê "Esta atividade foi encerrada" no link.

## Dados e migração

`pnpm db:generate` gera uma migration com: o enum `game_mode`; as colunas `game.mode` (default `live`, preenche as linhas antigas) e `game.question_timer` (default `true`); a troca do índice `game_unended_quiz_idx` (drop + create com o predicado novo); o índice `game_assignment_pin_idx`; a tabela `assignment_preferences`. Compatível com o código anterior durante o deploy (ADR 0011): ele não conhece atribuições, os defaults cobrem as colunas novas, e o índice novo é mais permissivo que o antigo só para linhas que o código anterior não cria.

## Riscos e decisões

- **ADR 0014: atribuição como partida no modo `assignment`.** Alternativa considerada: um agregado e tabelas próprias. Rejeitada porque a 029-2/2 precisa dos mesmos jogadores, perguntas, respostas, pontuação e relatório; duplicar seria pior que o custo do modo. O risco é um caso de uso ao vivo esquecer o modo: mitigado por `requireLiveGame` em todos e um teste por caso de uso, e pela atribuição não ter `progress` (nenhuma fase pode avançar).
- **`status: "playing"` sem `progress`** para a atribuição: mantém `isGameOpen`/`expireIfDue` e o "começou" dos relatórios sem estado novo; `isPlaying` continua falso (exige `progress`). A 029-2/2 decide o progresso por participante.
- **PIN depois de encerrada (CA-42)**: o PIN é liberado ao acabar; achar "a atribuição mais recente que teve o PIN" é uma escolha. Num espaço de 100 milhões, reuso é raro, e o pior caso é ver "encerrada" com o nome de outra atividade do mesmo PIN.
- **Precisão de hora só na tela**: o servidor não sabe o fuso; ele confere os limites. Um pedido direto com minutos passa — aceitável, não quebra regra nenhuma de jogo.
- **Configuração `ASSIGNMENT_MAX_DEADLINE_DAYS`**: variável nova, opcional, documentada (constituição VI).
- **Sem dependência nova**: o `Calendar` foi feito à mão (o plano previa `react-day-picker`).
- **Sem tempo real nesta etapa**: participantes ainda não entram; a 029-2/2 decide os eventos (participante entrou, prazo mudou, encerrada).
- Spec 015 alterada: RN-01/02 (atribuição é relatório desde a criação), ordem da lista e lixeira; registrar no changelog da 015 ao implementar.
