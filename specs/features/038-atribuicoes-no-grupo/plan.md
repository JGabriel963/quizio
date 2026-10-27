---
spec: "038"
status: approved # draft | approved
---

# Plano técnico — 038 Grupos 5/5 — Atribuições no grupo

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0014](../../../docs/adr/0014-atribuicao-como-partida.md), [0015](../../../docs/adr/0015-grupos-e-convite-por-codigo.md), [0016](../../../docs/adr/0016-mural-do-grupo.md)

## Abordagem

O contexto `groups` ganha o **mural**: a publicação (`GroupPost`) é uma linha própria, com o autor, a mensagem e o **id da atribuição** (o `game.id`), sem chave estrangeira para `game`; as curtidas são linhas (`GroupPostLike`). **A atribuição continua sendo do contexto `game`** (ADR 0014): atribuir no grupo chama o `createAssignment` da spec 029 por uma porta do `groups` (`GroupAssignments`), ligada no `container.ts`, como o contexto `quiz` já chega às partidas por `QuizGames`. O que o cartão mostra (título, capa, perguntas, prazo, se acabou) é **lido** do jogo a cada leitura do mural, por uma porta de leitura do `groups` (`GroupAssignmentQuery`), como a `AssignmentLandingQuery`: por isso **nenhuma escrita precisa acontecer quando a atribuição acaba ou o relatório é apagado**. A publicação perde o anexo sozinha, porque a leitura não encontra mais um jogo aberto (RN-16). A aba Atribuições é a mesma leitura, só com as abertas. Na web, o fluxo "Atribuir" do grupo é um conjunto novo de diálogos ("Selecionar kahoot", "Configurações da atividade atribuída", "Criar publicação") que reaproveita as regras de prazo e as opções da 029, e o diálogo de compartilhar da 029 ganha "Atribuir a grupos".

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Mural | `GroupFeed` / `listGroupFeed` | sim |
| Publicação | `GroupPost` (`kind: "assignment"`) | sim |
| Anexo da publicação | `GroupPostView.attachment` (null quando removido) | sim |
| Curtida | `GroupPostLike` / `setPostLike` | sim |
| Atribuição do grupo | `GroupAssignment` / `listGroupAssignments` | sim |
| Atribuir no grupo | `assignInGroup` | sim |
| Atribuir a grupos | `assignToGroups` / `listAssignableGroups` | sim |
| Excluir publicação | `deleteGroupPost` | sim |
| Relatório somente para leitura | `ReportView.readOnly` / `ReportReadGrants` | sim |
| Pode atribuir | `canAssign` (`membersCanAssign`, spec 035) | sim |

## Domínio — `packages/core/src/groups/domain`

### Entidades

```ts
// group-post.ts
interface GroupPost {
	id: string;
	groupId: string;
	authorId: string;
	kind: "assignment";        // a 036 acrescenta "text"
	message: string | null;    // RN-11, RN-12
	gameId: string | null;     // a atribuição; nunca muda depois de criada
	createdAt: Date;
}
```

### Value objects e regras puras

- `GROUP_POST_MESSAGE_MAX_LENGTH = 500`; `parsePostMessage(raw)`: apara, guarda as quebras, 1 a 500 por `characterCount`, senão `InvalidPostMessageError` (RN-12).
- `group-permissions.ts`: `canAssign(group, role)`: administrador, ou membro com `membersCanAssign` (RN-01); `assertCanAssign` → `AssignNotAllowedError`. `canManagePost(post, viewer)`: autor ainda membro, ou administrador; dá "Ver relatório" e "Excluir publicação" (RN-20, RN-31).
- `group-assignment.ts`: `GroupAssignmentRecord` (abaixo) e:
  - `isAssignmentOpen(record, now)`: `endedAt === null && expiresAt > now`; com o registro ausente, a atribuição não existe mais (RN-16);
  - `attachmentOf(record | null, now)`: o anexo do cartão, ou `null` quando a atribuição acabou ou sumiu (RN-16);
  - `sortGroupAssignments(items, sort)`: `recent` (publicação mais nova primeiro), `oldest`, `deadline` (prazo mais próximo) (RN-22).
- `GROUP_ASSIGNMENT_SORTS = ["recent", "oldest", "deadline"] as const`.
- `group-setup.ts`: `groupSetupOf` passa a receber `{ assignments, posts }` e marca `assigned` e `posted` (RN-29).

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `InvalidPostMessageError` | `GROUP.INVALID_MESSAGE` | Mensagem vazia ou com mais de 500 caracteres (RN-12) |
| `AssignNotAllowedError` | `GROUP.ASSIGN_NOT_ALLOWED` | Quem não pode atribuir pede para atribuir (RN-01) |
| `GroupPostNotFoundError` (`NotFoundError`) | `GROUP.POST_NOT_FOUND` | Publicação de outro grupo ou já removida |
| `PostDeleteNotAllowedError` | `GROUP.POST_DELETE_NOT_ALLOWED` | Excluir sem ser o autor nem o administrador (RN-20) |
| `AssignmentNotShareableError` | `GROUP.ASSIGNMENT_NOT_SHAREABLE` | "Atribuir a grupos" com uma atribuição de outro dono, acabada ou inexistente (RN-25) |
| `AlreadyAssignedToGroupError` | `GROUP.ALREADY_ASSIGNED` | A atribuição já está naquele grupo (RN-28) |

Os erros de prazo e de quiz não jogável vêm do `createAssignment` da 029 (`GAME.*`), que já têm mensagens na web.

## Aplicação — `packages/core/src/groups/application`

### Portas novas

```ts
// ports/group-assignments.ts — wired in container.ts to game's createAssignment
export interface GroupAssignments {
	create(input: {
		ownerId: string;
		quizId: string;
		deadline: Date;
		options: AssignmentOptions; // value type of game/domain/assignment
	}): Promise<{ gameId: string }>;
}

// ports/group-assignment-query.ts — read model over game, report, quiz and user
export interface GroupAssignmentRecord {
	gameId: string;
	ownerId: string;
	ownerName: string;
	/** The report's own name, or the game's title. */
	name: string;
	questionCount: number;
	/** Null once the quiz was deleted (spec 015). */
	coverImageKey: string | null;
	expiresAt: Date;
	endedAt: Date | null;
}
export interface GroupAssignmentQuery {
	/** Only assignments; a deleted game is simply missing. */
	findMany(gameIds: readonly string[]): Promise<GroupAssignmentRecord[]>;
}

// ports/group-post-repository.ts
export interface GroupPostRepository {
	/** "taken" when the assignment is already in that group (RN-28). */
	createPost(post: GroupPost): Promise<"created" | "taken">;
	findPost(groupId: string, postId: string): Promise<GroupPost | null>;
	deletePost(postId: string): Promise<void>; // likes go with it
	/** Idempotent: liking twice is one like (RN-17, RN-18). */
	setLike(postId: string, userId: string, liked: boolean, at: Date): Promise<void>;
}

// ports/group-feed-query.ts
export interface GroupPostRecord extends GroupPost {
	authorName: string;
	likeCount: number;
	likedByViewer: boolean;
}
export interface GroupFeedQuery {
	/** Newest first (RN-13). */
	list(groupId: string, viewerId: string): Promise<GroupPostRecord[]>;
	likeCount(postId: string): Promise<number>;
	/** For "Configurar seu grupo" (RN-29). */
	stats(groupId: string): Promise<{ posts: number; assignments: number }>;
	/** Groups (of the given ones) that already have this assignment (RN-26). */
	groupsWithAssignment(gameId: string, groupIds: readonly string[]): Promise<string[]>;
}
```

Fakes: `InMemoryGroupStore` implementa `GroupPostRepository` e `GroupFeedQuery` (com os nomes dos usuários que já conhece); `InMemoryGroupAssignments` cria registros num `InMemoryGroupAssignmentQuery` controlável (encerrar, apagar, vencer).

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `createAssignInGroup` | `userId, groupId, quizId, deadline, options, message?` | `{ postId, gameId }` | `NOT_FOUND`, `ASSIGN_NOT_ALLOWED`, `INVALID_MESSAGE`, os `GAME.*` do prazo e do quiz | `groups`, `groupMembers`, `groupAssignments`, `groupPosts`, `ids`, `clock` |
| `createListGroupFeed` | `userId, groupId` | `{ posts: GroupPostView[] }` | `NOT_FOUND` | `groups`, `groupMembers`, `groupFeed`, `groupAssignmentQuery`, `storage`, `clock` |
| `createListGroupAssignments` | `userId, groupId, sort` | `{ items: GroupAssignmentView[] }` | `NOT_FOUND` | as mesmas |
| `createSetPostLike` | `userId, groupId, postId, liked` | `{ liked, likeCount }` | `NOT_FOUND`, `POST_NOT_FOUND` | `groupMembers`, `groupPosts`, `groupFeed`, `clock` |
| `createDeleteGroupPost` | `userId, groupId, postId` | `void` | `NOT_FOUND`, `POST_NOT_FOUND`, `POST_DELETE_NOT_ALLOWED` | `groups`, `groupMembers`, `groupPosts` |
| `createListAssignableGroups` | `userId, gameId` | `{ groups: { id, name, alreadyAssigned }[] }` | `ASSIGNMENT_NOT_SHAREABLE` | `groupReads`, `groupFeed`, `groupAssignmentQuery`, `clock` |
| `createAssignToGroups` | `userId, gameId, groupIds (1..50)` | `{ assigned: number }` | `ASSIGNMENT_NOT_SHAREABLE`, `NOT_FOUND`, `ASSIGN_NOT_ALLOWED`, `ALREADY_ASSIGNED` | `groups`, `groupMembers`, `groupAssignmentQuery`, `groupPosts`, `ids`, `clock` |
| `createGetGroup` (muda) | igual | + `abilities.assign`; `setup` com `assigned`/`posted` | igual | + `groupFeed` |

```ts
interface GroupPostView {
	id: string;
	author: { userId: string; name: string };
	createdAt: Date;
	message: string | null;
	likeCount: number;
	liked: boolean;
	/** Null once the assignment is over or gone (RN-16). */
	attachment: {
		gameId: string;
		name: string;
		questionCount: number;
		coverUrl: string | null;
		ownerName: string;
		remainingMs: number;
	} | null;
	/** The author while a member, or the admin: "Ver relatório" (while the game exists) and "Excluir publicação" (RN-20, RN-31). */
	canSeeReport: boolean;
	canDelete: boolean;
}
interface GroupAssignmentView extends NonNullable<GroupPostView["attachment"]> {
	postId: string;
	assignedAt: Date;
	assignedBy: { userId: string; name: string };
	canSeeReport: boolean;
	canDelete: boolean;
}
```

Notas:

- **`assignInGroup` escreve em dois contextos** (a atribuição e a publicação). Se a publicação falhar depois da atribuição criada, sobra uma atribuição comum nos relatórios de quem atribuiu, sem dano; a mensagem e a permissão são conferidas **antes** de criar a atribuição, para que um pedido inválido nunca a crie.
- `listGroupFeed` busca as publicações e, numa leitura só, os registros das atribuições delas; `attachmentOf` decide o anexo pelo relógio do servidor. Tempo restante vai como `remainingMs` (como na 029).
- `assignToGroups` confere tudo antes de escrever: a atribuição é do pedinte e está aberta, ele pode atribuir em **cada** grupo, e nenhum já a tem; depois cria uma publicação por grupo, sem mensagem. Dois pedidos ao mesmo tempo: o índice único deixa uma (`"taken"` é ignorado na segunda).
- `listAssignableGroups` usa `groupReads.listForUser` + `canAssign` e marca `alreadyAssigned` com `groupFeed.groupsWithAssignment`.
- Excluir o grupo apaga publicações e curtidas por cascata; as atribuições não são tocadas (RN-30).

## Adapters

### Banco — `packages/db`

`schema/groups.ts`:

```ts
groupPostKind = pgEnum("group_post_kind", ["assignment"])
group_post (
	id text pk,
	group_id text not null references "group"(id) on delete cascade,
	author_id text not null references user(id) on delete cascade,
	kind group_post_kind not null,
	message text,
	game_id text,               -- sem FK: a publicação sobrevive ao jogo (RN-16)
	created_at timestamptz not null
)
unique index group_post_assignment_idx on group_post(group_id, game_id) where game_id is not null  -- RN-28
index group_post_feed_idx on group_post(group_id, created_at)
group_post_like (
	post_id text references group_post(id) on delete cascade,
	user_id text references user(id) on delete cascade,
	created_at timestamptz not null,
	primary key (post_id, user_id)
)
```

Repositórios em `repositories/groups/`:

- `drizzle-group-post-repository.ts`: `createPost` com `ON CONFLICT DO NOTHING` no índice único → `"taken"`; `setLike` com `INSERT … ON CONFLICT DO NOTHING` ou `DELETE`.
- `drizzle-group-feed-query.ts`: as publicações com o nome do autor, o total de curtidas (`count` agrupado) e a curtida de quem vê; `stats`; `groupsWithAssignment`.
- `drizzle-group-assignment-query.ts`: `game` (`mode = 'assignment'`) com `report.name`, `quiz.cover_image_key` (left join) e `user.name`, por `inArray(game.id, …)`; um jogo apagado não volta.

### Real-time

Nenhum (spec 034): o mural é relido ao abrir e ao voltar o foco.

### Biblioteca (`library`)

"Selecionar kahoot" usa `library.list({ section: "recent" })` e filtra os publicados (`status === "published"`). O `LibraryQuizRecord` ganha `description` (a linha da descrição, RN-04), lida pelo adapter Drizzle e pelo fake.

### Relatório somente para leitura (`reports`, RN-20a)

O administrador abre o relatório de uma atribuição que um membro publicou no grupo. O contexto `reports` continua sem conhecer grupos: ganha a porta

```ts
// reports/application/ports/report-read-grants.ts
export interface ReportReadGrants {
	/** Somebody other than the owner may read this report, without changing it. */
	canRead(viewerId: string, gameId: string): Promise<boolean>;
}
```

implementada em `packages/db/src/repositories/reports/drizzle-report-read-grants.ts`: existe uma `group_post` com esse `game_id` num grupo onde `viewerId` é `admin` em `group_member`. `load-report.ts` ganha `loadReadableReport(deps, { viewerId, gameId })`: o dono como hoje; outra pessoa só com `canRead` e com o relatório fora da lixeira; de resto `REPORT.NOT_FOUND`. Os três casos de uso de leitura (`getReport`, `getReportParticipant`, `getReportQuestion`) passam a usá-lo, e `ReportView` ganha `readOnly` (quem vê não é o dono). Todas as escritas (renomear, lixeira, excluir, prazo, encerrar) continuam com `loadOwnedHeader`, e `listReports` continua só do dono. O fake é `InMemoryReportReadGrants` (concessões explícitas nos testes).

Na web, `reports.$gameId.tsx` passa `readOnly` ao `ReportHeader`, ao `AssignmentSummary` e ao estado da lixeira: sem renomear, lixeira, excluir, jogar de novo, alterar prazo, encerrar e compartilhar.

## API — `packages/api`

| Procedure | query/mutation | Entrada (forma) | Saída | Erros |
| --- | --- | --- | --- | --- |
| `group.feed` | query | `{ groupId }` | `{ posts }` | `NOT_FOUND` |
| `group.assignments` | query | `{ groupId, sort: enum(GROUP_ASSIGNMENT_SORTS) }` | `{ items }` | `NOT_FOUND` |
| `group.assign` | mutation | `{ groupId, quizId, deadline, options, message?: string ≤5000 }` | `{ postId, gameId }` | ver acima |
| `group.posts.setLike` | mutation | `{ groupId, postId, liked: boolean }` | `{ liked, likeCount }` | `NOT_FOUND`, `POST_NOT_FOUND` |
| `group.posts.delete` | mutation | `{ groupId, postId }` | `void` | `NOT_FOUND`, `POST_NOT_FOUND`, `POST_DELETE_NOT_ALLOWED` |
| `group.assignableGroups` | query | `{ gameId }` | `{ groups }` | `ASSIGNMENT_NOT_SHAREABLE` |
| `group.assignToGroups` | mutation | `{ gameId, groupIds: string[1..50] }` | `{ assigned }` | ver acima |

`deadline` e `options` com a mesma forma de `game.assignment.create`. `container.ts`: `groupAssignments.create` é o `createAssignment` já montado com `assignmentDeps` (prazo máximo da instância, preferências salvas, RN-08); `composition-root.ts`: os três adapters Drizzle novos.

## UI — `apps/web`

### Mural e publicação (`components/groups/`)

- `group-feed.tsx`: a lista do mural dentro de `GroupActivity`, no lugar do estado vazio quando há publicações; esqueleto e erro.
- `group-post.tsx`: cabeçalho ("{nome} atribuiu um kahoot" / "compartilhou um arquivo", data por `lib/group-post-labels.ts`: "26 de outubro às 15:01"), ⋮ (`PostMenu`: "Ver relatório" → `/reports/$gameId`, "Excluir publicação" em vermelho, com a lixeira e o `AlertDialog`), mensagem (`whitespace-pre-line`), `AssignmentAttachment` (capa via `QuizCover`, "N perguntas", título, dono, "há X", **Iniciar** = `<a target="_blank" rel="noopener">` para `assignmentLink`) ou `RemovedAttachment` (quadro tracejado), "N curtidas" e o botão `LikeButton` ("Curtir" / "Curtida", otimista com volta).
- `GroupActivity` e `GroupSetupCard`: "Atribuir" ativo para `abilities.assign`; "Criar publicação" e "Compart." continuam `ComingSoonAction`.

### Fluxo Atribuir (`components/groups/assign/`)

- `assign-in-group-flow.tsx`: redutor puro (`lib/group-assign-state.ts`: `select` → `configure` → `message`, com o X voltando a `select` e mantendo prazo, opções e texto; Cancelar/Fechar zeram) e os três diálogos:
  - `select-quiz-dialog.tsx`: pesquisa local sobre `library.list` (publicados), linhas com `QuizCover`, descrição em uma linha, dono, visibilidade (`lib/quiz-labels.ts`) e "há X" (`formatRelativeTime`); vazio com "Ir para a biblioteca";
  - `assignment-settings-dialog.tsx`: data (`Calendar` num `Popover` de dia permitido) e hora (`Select` com `hourOptions`), as opções (as linhas da 029 com a ajuda em `Tooltip`; "Gerador de apelido" `Em breve`), "Adicionar mensagem", "Atribuir agora", "Fechar"; o erro de prazo abaixo dos seletores (`isDeadlineRefusal`). As regras vêm de `lib/assignment-deadline.ts` e as opções iniciais de `game.assignment.setup`;
  - `assignment-post-dialog.tsx`: "Criar publicação" com `CountedField` (500, várias linhas), o cartão do quiz com X, Cancelar, Publicar.
- Aberto pela caixa "Publicar algo", pelo cartão "Configurar seu grupo" e pela aba Atribuições.

### Aba Atribuições

- `group-assignments-tab.tsx`: "Kahoots", `Select` "Classificar por" (`sort` na busca da rota), "Atribuir", a troca cartões/lista (lembrada em `localStorage`, com `try/catch`), `AssignmentCard` (cartão) e `AssignmentsTable` (lista: Título, Atribuído por com `UserAvatar` e `title`/`aria-label` do nome, Prazo, Atribuído); acionar abre a atividade em aba nova; estado vazio de RN-24.
- A rota `groups.$groupId.index.tsx` troca `GroupComingSoon` pela aba quando `tab=assignments`; `sort` entra na busca.

### Atribuir a grupos

- `assign-to-groups-dialog.tsx`: lista com `Checkbox` por grupo, "Já atribuída" marcada e indisponível, "Atribuir" (indisponível sem marca), Cancelar, estado sem grupos com "Criar grupo"; aviso "Atividade atribuída a N grupo(s)".
- `share-assignment-dialog.tsx` (029): "Atribuir a grupos" vira item ativo quando a atribuição está aberta, abrindo o diálogo acima; "Atribuir por e-mail" continua `Em breve`.

### Lib

- `lib/group-mutations.ts`: `assign`, `setLike` (otimista no cache de `group.feed`), `deletePost`, `assignToGroups`; todos invalidam as consultas do grupo (e `report.list` em `assign`).
- `lib/group-post-labels.ts`: "N curtida(s)", data da publicação, tempo até o prazo sem "em" (`timeUntil` sem o prefixo).
- `lib/group-error-messages.ts`: os códigos novos.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | domínio + aplicação + componente | "canAssign: admin always, member with the switch" · "a member without the switch gets GROUP.ASSIGN_NOT_ALLOWED" · "Atribuir is active for abilities.assign; Criar publicação and Compart. stay Em breve" | `group-permissions.test.ts`, `assign-in-group.test.ts`, `group-page.test.tsx` |
| CA-02 | componente | "lists published quizzes, newest first, with cover, count, owner, visibility and age" · "searches without case or accents" · "Fechar creates nothing" | `select-quiz-dialog.test.tsx` |
| CA-03 | componente | "without quizzes offers Ir para a biblioteca" | `select-quiz-dialog.test.tsx` |
| CA-04 | componente + aplicação | "starts in 3 days at 12:00 with the remembered options; Gerador de apelido is Em breve; no participant limit" · "a refused deadline keeps the dialog open" | `assignment-settings-dialog.test.tsx`, `assign-in-group.test.ts` |
| CA-05 | aplicação + API + E2E | "creates a plain assignment and a post without message" · "it is in the creator's reports" | `assign-in-group.test.ts`, `routers/group.test.ts`, `e2e/group-assignments.spec.ts` |
| CA-06 | domínio + componente + API | "message of 1 to 500, trimmed, line breaks kept" · "Publicar is disabled while empty" · "refuses 501 sent directly" | `group-post.test.ts`, `assignment-post-dialog.test.tsx`, `routers/group.test.ts` |
| CA-07 | domínio (redutor) + componente | "Cancelar resets everything; X goes back to select keeping deadline, options and text" | `group-assign-state.test.ts`, `assign-in-group-flow.test.tsx` |
| CA-08 | componente + E2E | "Iniciar opens the activity in a new tab" · "a member plays with a nickname" | `group-post.test.tsx`, `e2e/group-assignments.spec.ts` |
| CA-08a | domínio + aplicação + repositório + componente | "an ended, expired or deleted assignment has no attachment" · "the feed keeps the message and likes" · "the tab lists only open ones" · "the post shows compartilhou um arquivo and the removed box" | `group-assignment.test.ts`, `list-group-feed.test.ts`, `drizzle-group-assignment-query.test.ts`, `group-post.test.tsx` |
| CA-09 | aplicação + repositório | "newest first" | `list-group-feed.test.ts`, `drizzle-group-feed-query.test.ts` |
| CA-10 | aplicação + repositório + componente | "like, unlike, two at once is one" · "an outsider cannot like" · "Curtir / Curtida and N curtidas" | `set-post-like.test.ts`, `drizzle-group-post-repository.test.ts`, `group-post.test.tsx` |
| CA-11 | aplicação + repositório + componente | "canSeeReport and canDelete for the author and the admin" · "no ⋮ without options" · "the admin reads a member's report read-only; not after the post is deleted; never a plain member" · "read-only hides every action" | `list-group-feed.test.ts`, `get-report.test.ts` (reports), `drizzle-report-read-grants.test.ts`, `group-post.test.tsx`, `report-header.test.tsx` |
| CA-12 | aplicação + API | "deleting the post keeps the assignment" · "a member who did not assign is refused" | `delete-group-post.test.ts`, `routers/group.test.ts` |
| CA-13 | componente | "cards and list with their columns; the choice is remembered; a card opens the activity" | `group-assignments-tab.test.tsx` |
| CA-14 | domínio | "sorts by recent, oldest and deadline" | `group-assignment.test.ts` |
| CA-15 | componente | "empty tab with Atribuir for who may assign" | `group-assignments-tab.test.tsx` |
| CA-16 | aplicação + componente + E2E | "lists only groups where the user may assign, marking those that have it" · "assigns to several at once" · "Atividade atribuída a 2 grupos" | `assign-to-groups.test.ts`, `assign-to-groups-dialog.test.tsx`, `e2e/group-assignments.spec.ts` |
| CA-17 | componente | "without groups offers Criar grupo" | `assign-to-groups-dialog.test.tsx` |
| CA-18 | aplicação + repositório | "refuses an assignment already in the group; two at once leave one" · "refuses an ended assignment or one of somebody else" | `assign-to-groups.test.ts`, `drizzle-group-post-repository.test.ts` |
| CA-19 | domínio + aplicação | "an assignment marks Atribuir and Criar publicação done" | `group-setup.test.ts`, `get-group.test.ts` |
| CA-20 | aplicação + repositório | "deleting the group keeps the assignment" · "cascade removes posts and likes" | `delete-group.test.ts`, `drizzle-group-post-repository.test.ts` |
| CA-21 | aplicação | "a post stays after its author leaves; the admin can remove it" · "turning the switch off keeps what was assigned" | `delete-group-post.test.ts`, `list-group-feed.test.ts` |

E2E (`apps/web/e2e/group-assignments.spec.ts`, dois contextos): Ana atribui "Capitais" com mensagem; Bruno vê a publicação, curte e inicia (aba nova, apelido); Ana encerra a atribuição no relatório e o mural mostra "compartilhou um arquivo"; Ana atribui pela biblioteca e manda para o grupo por "Atribuir a grupos".

## Dados e migração

- Tabelas `group_post` e `group_post_like` e o enum `group_post_kind`: `pnpm db:generate` (migration commitada) e `db:push` local. Só criações; compatível com o código publicado.
- `LibraryQuizRecord.description`: só leitura de coluna que já existe.

## Riscos e decisões

- **ADR 0016 (proposto)**: o mural como contexto `groups`, a publicação apontando para a atribuição por id sem chave estrangeira, o anexo derivado da leitura do jogo, e a criação da atribuição pela porta `GroupAssignments`.
- **Duas escritas sem transação** em `assignInGroup` (atribuição e publicação, contextos diferentes): o pior caso é uma atribuição sem publicação, visível nos relatórios; aceitável. Uma transação exigiria um adapter que conheça os dois contextos.
- **Mural sem paginação**: os grupos são pequenos; se crescer, a 036 acrescenta "Mostrar mais" no mesmo `list`.
- **Jogo apagado com publicação**: sem FK, o `game_id` fica órfão de propósito; a leitura trata como anexo removido.
- **Relatório lido por quem não é o dono** (RN-20a): a concessão vem do grupo, por uma porta de leitura do `reports`; as escritas continuam só do dono, e a lista de relatórios não muda. Entra no ADR 0016.
- **A 029 muda pouco**: só o item "Atribuir a grupos" do diálogo de compartilhar; o resto da 029 e da 030 fica igual.

## Changelog

- 2026-10-26: na implementação, os métodos de `GroupPostRepository` viraram `createPost`, `findPost` e `deletePost`, porque o fake em memória dos grupos implementa várias portas e `create`/`find`/`delete` já eram de outras; o curtir é otimista no `LikeRow` da publicação, não no cache de `group.feed`.
