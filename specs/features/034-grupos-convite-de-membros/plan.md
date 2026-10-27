---
spec: "034"
status: approved # draft | approved
---

# Plano técnico — 034 Grupos 1/5 — Criar o grupo e convidar membros

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR proposto: [0015](../../../docs/adr/0015-grupos-e-convite-por-codigo.md)

## Abordagem

Um **contexto novo, `groups`**, no core (`packages/core/src/groups`), com o agregado `Group` (nome, administrador, código do convite, "configuração pulada") e a pertença como linhas próprias (`GroupMember`). O administrador também é uma linha de membro, com o papel `admin`, para que contagens, listas e "quem vê o grupo" saiam de uma regra só (RN-01, RN-05). O que se mostra de cada usuário (nome, e-mail) vem da conta do Better Auth por uma **porta de leitura** do contexto (`GroupReads`), como a `AssignmentLandingQuery` faz com o nome do criador. O convite é um **código secreto aleatório** guardado no grupo (um por vez, RN-23); aceitar é um `INSERT` condicionado ao código ainda ser o do grupo, para que redefinir e aceitar ao mesmo tempo nunca deixe entrar pelo link antigo (RN-29) e dois aceites deixem uma linha só. Nada de tempo real: as telas refazem a consulta ao abrir e ao voltar o foco, e o servidor confere a pertença a cada pedido, então remover, sair e excluir valem na próxima leitura (RN-35, RN-37). Na web, a área `/groups` ganha um layout com a coluna de seções e "Grupos recentes"; o convite é uma tela própria em `/invite/$code`, dentro de `_auth` (que já leva ao login e volta, RN-26) e fora do shell.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Grupo | `Group` | sim |
| Papel no grupo | `GroupRole` (`admin` \| `member`) | sim |
| Membro do grupo | `GroupMember` | sim |
| Código do convite | `Group.inviteCode` | sim |
| Seção de grupos | `GroupSection` (`managed` \| `joined`) | sim |
| Aba do grupo | `GroupTab` (`activity` \| `shared` \| `assignments`) | sim (só web) |
| Grupos recentes | `recentGroups` / `GroupVisit` | sim |
| Configurar seu grupo | `GroupSetup` (`setupDismissedAt`) | sim |
| Criar grupo / Aceitar convite / Redefinir link / Remover membro / Sair / Excluir | `createGroup`, `acceptGroupInvite`, `resetGroupInvite`, `removeGroupMember`, `leaveGroup`, `deleteGroup` | sim |

## Domínio — `packages/core/src/groups/domain`

### Agregados e entidades

**`Group`** (`group.ts`)

```ts
interface Group {
	id: string;
	name: string;            // RN-03: 1–20 caracteres, sem espaços nas pontas
	adminId: string;         // RN-02: o criador, único administrador
	inviteCode: string;      // RN-23: um válido por vez
	createdAt: Date;
	setupDismissedAt: Date | null; // RN-17: "Pular configuração"
}
```

Invariantes: o nome passa por `parseGroupName`; o administrador é sempre membro com o papel `admin` (garantido por `createGroup`, que grava os dois na mesma transação); `adminId` nunca muda nesta etapa.

**`GroupMember`** (`group-member.ts`): `{ groupId, userId, role: GroupRole, joinedAt }`. Chave (grupo, usuário): ser membro duas vezes é impossível (RN-29).

### Value objects e regras puras

- `GROUP_ROLES = ["admin", "member"] as const`, `GroupRole`.
- `GROUP_SECTIONS = ["managed", "joined"] as const`, `GroupSection` (RN-07) — constantes usadas pelo zod do router e pelo `validateSearch` da rota.
- `GROUP_NAME_MAX_LENGTH = 20`; `parseGroupName(raw)`: apara, conta com `characterCount`, lança `InvalidGroupNameError` se 0 ou > 20 (RN-03, CA-04).
- `RECENT_GROUPS_LIMIT = 5` (RN-10).
- `GROUP_MEMBER_PREVIEW = 3` (RN-13: ícones do cabeçalho).
- `groupSetupOf(group, memberCount, role)` → `null` para membro ou cartão escondido; senão `{ invited: memberCount > 1, assigned: false, posted: false }` (RN-17). O cartão some quando os três estão feitos ou com `setupDismissedAt`; `assigned` e `posted` ficam `false` até as specs 036 e 038.
- `sortMembers(members)`: administrador primeiro, os demais por nome (`localeCompare` pt-BR, sem diferenciar acentos) (RN-32).
- `matchesGroupSearch(text, query)` sobre `normalizeSearchText` do shared kernel (RN-08, RN-31).
- `canSeeMemberEmail(viewerRole)` → `viewerRole === "admin"` (RN-34).

### Serviços de domínio

- `assertAdmin(membership)`: lança `NotGroupAdminError` se o papel não for `admin` (RN-16, RN-22, RN-33, RN-37).
- `assertCanLeave(membership)`: lança `AdminCannotLeaveError` para o administrador (RN-36).
- `assertRemovable(target)`: lança `CannotRemoveAdminError` se o alvo é o administrador (RN-33, CA-25).

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `InvalidGroupNameError` | `GROUP.INVALID_NAME` | Nome vazio ou com mais de 20 caracteres (RN-03) |
| `GroupNotFoundError` (`NotFoundError`) | `GROUP.NOT_FOUND` | Grupo inexistente ou de que o usuário não é membro (RN-05, CA-12) |
| `GroupMemberNotFoundError` (`NotFoundError`) | `GROUP.MEMBER_NOT_FOUND` | Remover quem não é (mais) membro |
| `NotGroupAdminError` | `GROUP.NOT_ADMIN` | Membro pede ação do administrador (CA-21, CA-25, CA-27) |
| `AdminCannotLeaveError` | `GROUP.ADMIN_CANNOT_LEAVE` | O administrador pede para sair (RN-36) |
| `CannotRemoveAdminError` | `GROUP.CANNOT_REMOVE_ADMIN` | Remover o administrador (RN-33) |
| `InvalidGroupInviteError` | `GROUP.INVITE_INVALID` | Aceitar com código redefinido, de grupo excluído ou inventado (RN-28, RN-29) |

Um membro que pede ação de administrador recebe `GROUP.NOT_ADMIN`, não "não encontrado": ele já sabe que o grupo existe.

## Aplicação — `packages/core/src/groups/application`

Toda leitura e escrita sobre um grupo começa por `requireMembership(deps, { groupId, userId })` (`load-group.ts`), que devolve `{ group, membership }` ou lança `GroupNotFoundError` — inexistente e alheio são o mesmo erro (RN-05).

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `createCreateGroup` | `userId, name` | `{ groupId }` | `INVALID_NAME` | `groups`, `ids`, `inviteCodes`, `clock` |
| `createListGroups` | `userId, section, search?` | `{ items: GroupListItem[] }` (id, nome, total de membros, `since`) | — | `groupReads` |
| `createListRecentGroups` | `userId` | `{ items: { id, name }[] }` (até 5) | — | `groupReads` |
| `createVisitGroup` | `userId, groupId` | `void` | `NOT_FOUND` | `groups`, `members`, `visits`, `clock` |
| `createGetGroup` | `userId, groupId` | `GroupView` (abaixo) | `NOT_FOUND` | `groups`, `members`, `groupReads` |
| `createListGroupMembers` | `userId, groupId, search?` | `{ total, items: GroupMemberView[] }` (e-mail `null` para quem não é admin) | `NOT_FOUND` | `groups`, `members`, `groupReads` |
| `createGetGroupInvite` | `userId, groupId` | `{ code }` | `NOT_FOUND`, `NOT_ADMIN` | `groups`, `members` |
| `createResetGroupInvite` | `userId, groupId` | `{ code }` | `NOT_FOUND`, `NOT_ADMIN` | `groups`, `members`, `inviteCodes` |
| `createGetGroupInvitation` | `userId, code` | `{ status: "invalid" } \| { status: "pending", groupId, name } \| { status: "member", groupId }` | — | `groups`, `members` |
| `createAcceptGroupInvite` | `userId, code` | `{ groupId }` | `INVITE_INVALID` | `groups`, `members`, `clock` |
| `createDismissGroupSetup` | `userId, groupId` | `void` | `NOT_FOUND`, `NOT_ADMIN` | `groups`, `members`, `clock` |
| `createRemoveGroupMember` | `userId, groupId, memberId` | `void` | `NOT_FOUND`, `NOT_ADMIN`, `CANNOT_REMOVE_ADMIN`, `MEMBER_NOT_FOUND` | `groups`, `members` |
| `createLeaveGroup` | `userId, groupId` | `void` | `NOT_FOUND`, `ADMIN_CANNOT_LEAVE` | `groups`, `members` |
| `createDeleteGroup` | `userId, groupId` | `void` | `NOT_FOUND`, `NOT_ADMIN` | `groups`, `members` |

```ts
interface GroupView {
	id: string;
	name: string;
	role: GroupRole;                 // do usuário que vê (RN-13, RN-16, RN-18)
	adminName: string;               // RN-19
	memberCount: number;
	createdAt: Date;
	memberPreview: { userId: string; name: string }[]; // até 3, admin primeiro (RN-13)
	setup: { invited: boolean; assigned: boolean; posted: boolean } | null; // RN-17
}
```

Notas:

- **Seções e pesquisa no core** (`listGroups`): a porta devolve os grupos do usuário com o papel; o caso de uso escolhe a seção (`admin` → `managed`, `member` → `joined`), ordena por `since` decrescente (criação para quem administra, entrada para quem participa, RN-08) e filtra com `matchesGroupSearch`. Sem limite: um usuário tem poucas dezenas de grupos, no máximo.
- **A visita é uma mutation à parte** (`visitGroup`), chamada pela página ao abrir um grupo, para que consultas (refeitas no foco, pré-carregadas por links) não escrevam (RN-20). `visits.touch` é um upsert de `(userId, groupId, visitedAt)`.
- **Grupos recentes** saem da junção das visitas com a pertença: grupo excluído, saída ou remoção somem sem apagar visitas (RN-10, CA-06).
- **`getGroupInvitation`** não lança: a tela do convite tem três estados e "inválido" é um deles (RN-25, RN-27, RN-28). Devolve só o nome do grupo — nada de membros ou administrador antes de aceitar.
- **`acceptGroupInvite`**: `groups.findByInviteCode(code)`; nulo → `INVITE_INVALID`. Depois `members.addWithInvite({ groupId, inviteCode, userId, joinedAt })`, que insere só se o grupo ainda tem aquele código e ignora a linha que já existe; resultado `"added" | "alreadyMember" | "invalid"`. `alreadyMember` responde como sucesso (RN-27, CA-20); `invalid` (o link foi redefinido entre a leitura e a escrita) vira `INVITE_INVALID` (RN-29).
- **`resetGroupInvite`** gera um código novo e grava só a coluna (`groups.saveInviteCode`), sem reescrever o grupo.
- **`deleteGroup`** apaga o grupo; membros e visitas vão em cascata no banco (RN-37).

### Portas novas

```ts
// groups/application/ports/group-repository.ts
export interface GroupRepository {
	findById(id: string): Promise<Group | null>;
	findByInviteCode(code: string): Promise<Group | null>;
	/** The group and its admin's membership, together (RN-01). */
	create(group: Group, admin: GroupMember): Promise<void>;
	/** Only the code: an invite reset never rewrites the name (RN-24). */
	saveInviteCode(id: string, code: string): Promise<void>;
	saveSetupDismissed(id: string, at: Date): Promise<void>;
	/** Members and visits go with it (RN-37). */
	delete(id: string): Promise<void>;
}

// groups/application/ports/group-member-repository.ts
export interface GroupMemberRepository {
	find(groupId: string, userId: string): Promise<GroupMember | null>;
	count(groupId: string): Promise<number>;
	/**
	 * Adds a member only while the group's invite is still `inviteCode`
	 * (RN-29); an existing membership stays as it is (CA-20).
	 */
	addWithInvite(input: {
		groupId: string;
		inviteCode: string;
		userId: string;
		joinedAt: Date;
	}): Promise<"added" | "alreadyMember" | "invalid">;
	remove(groupId: string, userId: string): Promise<void>;
}

// groups/application/ports/group-visit-repository.ts
export interface GroupVisitRepository {
	touch(userId: string, groupId: string, at: Date): Promise<void>;
}

// groups/application/ports/invite-code-generator.ts
export interface InviteCodeGenerator {
	/** Unguessable and URL-safe (RN-23). */
	generate(): string;
}

// groups/application/ports/group-reads.ts — read model over the accounts
export interface GroupListRecord {
	id: string;
	name: string;
	role: GroupRole;
	memberCount: number;
	/** createdAt for the admin, joinedAt for a member (RN-08). */
	since: Date;
}
export interface GroupMemberRecord {
	userId: string;
	name: string;
	email: string;
	role: GroupRole;
	joinedAt: Date;
}
export interface GroupReads {
	listForUser(userId: string): Promise<GroupListRecord[]>;
	/** Most recent first, only groups the user still belongs to (RN-10). */
	recentForUser(userId: string, limit: number): Promise<{ id: string; name: string }[]>;
	members(groupId: string): Promise<GroupMemberRecord[]>;
}
```

`listGroupMembers` lê todos os membros e filtra e conta no core (a contagem "X de Y" precisa do total e do filtrado, RN-31). `getGroup` usa `groupReads.members` para o nome do administrador, o total e a prévia — uma consulta só.

### Fakes — `packages/core/src/groups/testing`

- `InMemoryGroupStore`: implementa `GroupRepository`, `GroupMemberRepository`, `GroupVisitRepository` e `GroupReads` sobre os mesmos mapas (como `InMemoryReportStore`), com um registro de usuários (`addUser({ id, name, email })`) para os nomes e e-mails; `delete` remove membros e visitas, como a cascata.
- `SequentialInviteCodeGenerator` (`invite-a`, `invite-b`, …).
- `aGroup()` builder.

## Adapters

### Banco — `packages/db`

`schema/groups.ts`:

```ts
group (
	id text pk,
	name text not null,
	admin_id text not null references user(id) on delete cascade,
	invite_code text not null unique,            -- RN-23
	created_at timestamptz not null,
	setup_dismissed_at timestamptz
)
group_member (
	group_id text not null references group(id) on delete cascade,
	user_id text not null references user(id) on delete cascade,
	role text not null,                           -- 'admin' | 'member'
	joined_at timestamptz not null,
	primary key (group_id, user_id)               -- RN-29
)
index group_member_user_idx on group_member(user_id)   -- listas do usuário
group_visit (
	user_id text not null references user(id) on delete cascade,
	group_id text not null references group(id) on delete cascade,
	visited_at timestamptz not null,
	primary key (user_id, group_id)
)
index group_visit_recent_idx on group_visit(user_id, visited_at desc)
```

`group` é palavra reservada no SQL: o Drizzle cita os nomes, então funciona; o nome TypeScript da tabela é `groupTable` para não confundir. 

Repositórios em `repositories/groups/`:

- `drizzle-group-repository.ts` — `create` numa transação (grupo + linha `admin`); `saveInviteCode`, `saveSetupDismissed` atualizam só a coluna.
- `drizzle-group-member-repository.ts` — `addWithInvite`: `INSERT INTO group_member SELECT … FROM "group" WHERE id = $groupId AND invite_code = $code ON CONFLICT DO NOTHING RETURNING`; sem linha devolvida, uma leitura distingue `alreadyMember` (a pertença existe) de `invalid`.
- `drizzle-group-visit-repository.ts` — upsert `ON CONFLICT (user_id, group_id) DO UPDATE SET visited_at`.
- `drizzle-group-reads.ts` — junções com `user` (nome, e-mail) e contagem de membros por grupo (`count` agrupado), `recentForUser` com `INNER JOIN group_member` no mesmo usuário.

Testes PGlite: `drizzle-group-repositories.test.ts` (criação com o admin, unicidade do código, cascata ao excluir, `addWithInvite` nos três resultados incluindo o código trocado) e `drizzle-group-reads.test.ts` (listas, contagem, recentes só de grupos a que ainda pertence).

### Real-time

Nenhum evento nesta etapa. Pertença e convite não precisam de aviso imediato: cada tela consulta ao abrir e ao voltar o foco, e todo pedido confere a pertença no servidor. O mural (spec 036) é que pode pedir um canal por grupo.

### Outros

`packages/api/src/random-invite-code-generator.ts`: `randomBytes(16).toString("base64url")` (128 bits, 22 caracteres), ao lado dos geradores de PIN. Teste: formato URL-safe e dois códigos diferentes.

## API — `packages/api`

`routers/group.ts`, montado como `group` em `routers/index.ts`. Tudo `protectedProcedure`; a identidade vem da sessão.

| Procedure | query/mutation | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- |
| `group.list` | query | `{ section: enum(GROUP_SECTIONS), search?: string ≤200 }` | `{ items }` | — |
| `group.recent` | query | — | `{ items }` | — |
| `group.create` | mutation | `{ name: string ≤1000 }` (o limite é do domínio) | `{ groupId }` | `INVALID_NAME` |
| `group.get` | query | `{ groupId }` | `GroupView` | `NOT_FOUND` |
| `group.visit` | mutation | `{ groupId }` | `void` | `NOT_FOUND` |
| `group.dismissSetup` | mutation | `{ groupId }` | `void` | `NOT_FOUND`, `NOT_ADMIN` |
| `group.members` | query | `{ groupId, search?: string ≤200 }` | `{ total, items }` | `NOT_FOUND` |
| `group.removeMember` | mutation | `{ groupId, userId }` | `void` | `NOT_FOUND`, `NOT_ADMIN`, `CANNOT_REMOVE_ADMIN`, `MEMBER_NOT_FOUND` |
| `group.leave` | mutation | `{ groupId }` | `void` | `NOT_FOUND`, `ADMIN_CANNOT_LEAVE` |
| `group.delete` | mutation | `{ groupId }` | `void` | `NOT_FOUND`, `NOT_ADMIN` |
| `group.invite.get` | query | `{ groupId }` | `{ code }` | `NOT_FOUND`, `NOT_ADMIN` |
| `group.invite.reset` | mutation | `{ groupId }` | `{ code }` | `NOT_FOUND`, `NOT_ADMIN` |
| `group.invite.find` | query | `{ code: string ≤100 }` | `{ status, … }` | — |
| `group.invite.accept` | mutation | `{ code: string ≤100 }` | `{ groupId }` | `INVITE_INVALID` |

`groupId` como `z.string().min(1).max(100)`, como `gameId` nos outros routers. O servidor devolve só o **código**; o link (`{origin}/invite/{code}`) é montado na web, como `assignmentLink` (nenhuma URL de app guardada no banco).

Ligações novas:

- `container.ts` — `Adapters` ganha `groups`, `groupMembers`, `groupVisits`, `groupReads`, `inviteCodes`; `useCases` ganha os 14 casos de uso.
- `composition-root.ts` — os quatro adapters Drizzle e `createRandomInviteCodeGenerator()`.
- `testing/test-context.ts` — `InMemoryGroupStore` e `SequentialInviteCodeGenerator` no container de teste; o fake conhece os usuários de `callerFor`.

## UI — `apps/web` e `packages/ui`

### Rotas

| Rota | Arquivo | Layout |
| --- | --- | --- |
| `/groups?section=managed\|joined&q=` | `routes/_auth/_shell/groups/index.tsx` | shell + coluna de grupos |
| `/groups/$groupId?tab=activity\|shared\|assignments` | `routes/_auth/_shell/groups/$groupId/index.tsx` | shell + coluna |
| `/groups/$groupId/members?q=` | `routes/_auth/_shell/groups/$groupId/members.tsx` | shell + coluna |
| `/invite/$code` | `routes/_auth/invite.$code.tsx` | tela cheia, sem shell (captura 5) |

`routes/_auth/_shell/groups/route.tsx` é o layout da área: a coluna `GroupsColumn` à esquerda (em telas largas) e o `Outlet`. O `_auth` já manda quem não tem sessão para `/login?redirect=/invite/{code}` e volta depois de entrar (RN-26, CA-16); o login já esconde "Criar conta" com o cadastro fechado. `validateSearch` com `.catch(...)` como em `reports.index.tsx`.

`MainNav`: Grupos ganha `to: "/groups"` e `search: { section: "managed" }`, sem `comingSoon`; `activeMainNavLabel` marca Grupos para `/groups…` (RN-06, CA-01). `/invite` não marca nenhum item.

### Componentes (`apps/web/src/components/groups/`)

Recebem dados e ações por props (as rotas ligam o tRPC), como `components/reports`.

- `groups-column.tsx` — "Grupos que gerencio" / "Grupos em que participo" (links com a seção), "Grupos recentes" (só com itens; o aberto destacado) e "Criar grupo +". Em telas estreitas, as duas seções viram `TabNav` acima da lista e os recentes saem (Experiência).
- `group-grid.tsx` + `group-card.tsx` — cartões com nome e "N membros" (`Card`), esqueleto e erro.
- `groups-empty-state.tsx` — ilustrações Colaborar / Atribuir / Competir (SVG inline com ícones Lucide, no estilo do `ReportEmptyState`), textos de RN-09 por seção, "Nenhum grupo encontrado."
- `create-group-dialog.tsx` — `Dialog` com `Input` e contador de restantes (`characterCount` + `GROUP_NAME_MAX_LENGTH` do core), botão indisponível sem nome, erro do servidor ao lado do campo.
- `group-header.tsx` — nome, `MemberAvatars` (até 3 + "+N", link para membros), ⚙ "Em breve" (tooltip "Configurações do grupo", só admin), `GroupOptionsMenu`.
- `group-options-menu.tsx` — `DropdownMenu` "Opções do grupo" com os itens de RN-18 por papel.
- `group-tabs.tsx` — `TabNav` com Atividade / Compartilhado / Atribuições na busca `tab`, mais "Adicionar membros" (admin) na mesma linha.
- `group-activity.tsx` — caixa "Publicar algo" (campo e ações com `Badge variant="soon"`), `GroupSetupCard` e o vazio "Ainda não há nenhuma atividade…".
- `group-setup-card.tsx` — três passos com ilustrações; "Convidar membros" acionável e com a marca verde (`success`) quando `invited`; "Pular configuração".
- `group-coming-soon.tsx` — conteúdo de Compartilhado e Atribuições.
- `invite-dialog.tsx` — "Convidar usuários": campo somente leitura com o link (truncado com reticências), Copiar (`navigator.clipboard`, toast "Link copiado"), "Redefinir link" com `Tooltip` (?) e um `AlertDialog` de confirmação; Fechar.
- `group-info-dialog.tsx`, `member-info-dialog.tsx` — os dois "Informações…"; a linha do e-mail só quando ele vem.
- `members-table.tsx` — voltar, pesquisa (`LibrarySearch`), "{n} de {total} membros do grupo", "Adicionar membros" (admin), tabela Nome / Status (Status vai para baixo do nome em telas estreitas), ⓘ e ⋮ (Informações do membro, Ver perfil "Em breve", Remover quando permitido).
- `confirm-group-dialogs.tsx` — `AlertDialog`s de Remover, Sair e Excluir com os textos da spec.
- `invite-card.tsx` — a tela do convite: pendente (título, ilustração, nome do grupo, Cancelar / Aceitar convite ocupado durante o pedido) e inválido (RN-28).
- `user-avatar.tsx` — círculo com o ícone de pessoa numa cor tirada do id (`lib/user-color.ts`, função pura sobre uma paleta fixa de tokens).

### Lib

- `lib/group-mutations.ts` — `create`, `dismissSetup`, `removeMember`, `leave`, `delete`, `resetInvite`, `acceptInvite`, com invalidação de `group.list`, `group.recent`, `group.get`, `group.members` e as navegações de RN-12, RN-25, RN-36 e RN-37.
- `lib/group-error-messages.ts` — `GROUP.*` → PT ("Este convite não é mais válido.", "Só o administrador pode fazer isso.", …).
- `lib/group-invite-link.ts` — `groupInviteLink(origin, code)`.
- `lib/api-types.ts` — `GroupListItemData`, `GroupViewData`, `GroupMemberData`.

### Design system (`packages/ui`)

- `Badge`: variante **`role`** na raiz do `cva` para "Administrador" (fundo `muted`, texto pequeno, sem borda tracejada), registrada em `/design-system`.
- Nada mais: `Dialog`, `AlertDialog`, `DropdownMenu`, `TabNav`, `Card`, `Tooltip`, `Input`, `Skeleton` já existem.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | componente | "links Grupos to /groups without Em breve" e "marks Grupos on group paths" | `components/layout/main-nav.test.tsx` |
| CA-02 | componente | "shows Colaborar, Atribuir and Competir with Criar grupo when managing none" · "explains how to join when in no group" · "hides Grupos recentes without visits" | `components/groups/groups-empty-state.test.tsx`, `groups-column.test.tsx` |
| CA-03 | aplicação + API | "creates the group with its creator as admin and only member" · "group.create returns the id and the group lists it" | `groups/application/create-group.test.ts`, `api/routers/group.test.ts` |
| CA-04 | domínio + componente + API | "accepts 1 and 20 characters, an emoji counting as one, trimmed" · "refuses empty and 21 characters" · "disables Criar grupo while the name is blank and counts down" · "refuses a 21-character name sent directly" | `groups/domain/group.test.ts`, `components/groups/create-group-dialog.test.tsx`, `api/routers/group.test.ts` |
| CA-05 | aplicação + repositório | "splits managed and joined, newest first" · "searches without case or accents" · "lists with member counts" | `groups/application/list-groups.test.ts`, `db/.../drizzle-group-reads.test.ts` |
| CA-06 | aplicação + repositório + componente | "keeps the 5 most recent visits" · "a revisit moves the group to the top" · "drops deleted, left and removed groups" · "highlights the open group" | `list-recent-groups.test.ts`, `visit-group.test.ts`, `drizzle-group-reads.test.ts`, `groups-column.test.tsx` |
| CA-07 | aplicação + componente | "the admin's view has role admin and the setup" · "shows settings, Adicionar membros, Atribuir and the setup card to the admin" · "the admin's menu has Excluir and no Sair" | `get-group.test.ts`, `group-header.test.tsx`, `group-activity.test.tsx` |
| CA-08 | componente | "hides admin actions from a member" · "the member's menu has Sair and no Excluir" | `group-header.test.tsx`, `group-activity.test.tsx` |
| CA-09 | componente (rota) | "keeps the open tab in the address and shows Em breve" | `components/groups/group-tabs.test.tsx` |
| CA-10 | domínio + aplicação + componente | "marks Convidar membros done with a second member" · "dismissing hides the setup for good" · "only the admin can dismiss" | `group-setup.test.ts`, `dismiss-group-setup.test.ts`, `group-setup-card.test.tsx` |
| CA-11 | aplicação + componente | "tells the admin's name, member count and creation date" | `get-group.test.ts`, `group-info-dialog.test.tsx` |
| CA-12 | aplicação + API | "a non-member gets GROUP.NOT_FOUND, like an unknown id" (get, members, visit, invite) · "maps it to NOT_FOUND" | `load-group.test.ts`, `api/routers/group.test.ts` |
| CA-13 | componente | "shows the link and copies it with Link copiado" | `components/groups/invite-dialog.test.tsx` |
| CA-14 | aplicação + componente + E2E | "a pending invitation tells the group's name" · "accepting makes a member" · "Aceitar convite leads to the group" | `get-group-invitation.test.ts`, `accept-group-invite.test.ts`, `invite-card.test.tsx`, `e2e/groups.spec.ts` |
| CA-15 | componente | "Cancelar goes home without joining" | `invite-card.test.tsx` |
| CA-16 | E2E | "a signed-out guest signs in and comes back to the invitation" | `e2e/groups.spec.ts` |
| CA-17 | aplicação | "a member or the admin gets status member" | `get-group-invitation.test.ts` |
| CA-18 | aplicação + repositório + componente | "reset gives a new code and the old one is invalid; members stay" · "saveInviteCode changes only the code" · "cancelling the confirmation keeps the link" | `reset-group-invite.test.ts`, `drizzle-group-repositories.test.ts`, `invite-dialog.test.tsx` |
| CA-19 | aplicação + componente | "reset, deleted and unknown codes are the same invalid status" · "shows Este convite não é mais válido" | `get-group-invitation.test.ts`, `invite-card.test.tsx` |
| CA-20 | aplicação + repositório | "accepting twice adds one membership" · "addWithInvite: added, alreadyMember, invalid after a reset" | `accept-group-invite.test.ts`, `drizzle-group-repositories.test.ts` |
| CA-21 | aplicação + API | "a member cannot read or reset the invite (GROUP.NOT_ADMIN)" | `get-group-invite.test.ts`, `reset-group-invite.test.ts`, `api/routers/group.test.ts` |
| CA-22 | domínio + aplicação + componente | "admin first, then by name" · "search filters and keeps the total" · "renders n de total and the Administrador badge" | `group-member.test.ts`, `list-group-members.test.ts`, `members-table.test.tsx` |
| CA-23 | aplicação + componente | "the email goes only to the admin" · "the dialog omits the email line without it" | `list-group-members.test.ts`, `member-info-dialog.test.tsx` |
| CA-24 | componente | "Remover only for the admin, never on their own row; Ver perfil Em breve" | `members-table.test.tsx` |
| CA-25 | aplicação + API | "removes a member, who then gets NOT_FOUND" · "a removed member can come back with the link" · "refuses removing the admin and requests from members" | `remove-group-member.test.ts`, `api/routers/group.test.ts` |
| CA-26 | aplicação + componente | "a member leaves" · "the admin cannot leave" · "Sair confirms and goes to joined" | `leave-group.test.ts`, `confirm-group-dialogs.test.tsx` |
| CA-27 | aplicação + repositório + E2E | "the admin deletes; members and the link go with it" · "a member cannot delete" · "cascade removes members and visits" | `delete-group.test.ts`, `drizzle-group-repositories.test.ts`, `e2e/groups.spec.ts` |

**E2E** (`apps/web/e2e/groups.spec.ts`, dois contextos de navegador): Ana cria "Turma 7A", copia o link (lido do campo), Bruno (outro contexto, com conta) abre, aceita e chega ao grupo; Ana vê "2 de 2 membros do grupo" e "Convidar membros" feito; Ana redefine o link e Carla, sem sessão, abre o antigo e vê "não é mais válido"; com o novo, entra e volta ao convite (CA-16); Ana remove Bruno e exclui o grupo. Desktop e mobile.

## Dados e migração

- Tabelas novas `group`, `group_member`, `group_visit`: `pnpm db:generate` gera a migration (commitada com a mudança). Só criações, compatível com o código já publicado (o deploy aplica migrations antes do build).
- Sem backfill.

## Riscos e decisões

- **Contexto novo `groups` e leitura das contas** → [ADR 0015](../../../docs/adr/0015-grupos-e-convite-por-codigo.md) (rascunho): grupo como agregado próprio, pertença em tabela própria com o admin como linha, convite como código no grupo com o aceite condicional, nomes e e-mails lidos da tabela do Better Auth por uma porta de leitura (o core não conhece o Better Auth).
- **Código no link** é um segredo de portador: quem tiver o link entra (RN-23). 128 bits aleatórios; redefinir é a defesa (RN-24, RN-30). Não há limitação de tentativas na consulta do convite: adivinhar 128 bits é inviável, ao contrário do PIN de 6 dígitos.
- **`group` é palavra reservada** do SQL. O Drizzle cita os identificadores; os testes PGlite e a migration confirmam. Se der atrito, a tabela vira `user_group` (decisão no momento da tarefa, sem mudar o domínio).
- **Visita como mutation** custa um pedido a mais ao abrir o grupo, mas mantém as consultas sem efeito colateral; falha da visita é silenciosa (`meta.suppressErrorToast`).
- **Sem evento de tempo real**: quem foi removido com a página aberta só percebe no próximo pedido (foco, navegação) — aceitável sem conteúdo no grupo ainda; o mural (036) reavalia.
- **E-mail do membro**: o caso de uso apaga o campo para quem não é admin, antes de sair do servidor (RN-34, CA-23) — nunca só na tela.
- **Specs seguintes**: as chaves de configuração (035) vão mudar `assertAdmin` para regras por permissão (convidar, ver membros); por isso as checagens ficam em funções de domínio nomeadas, não espalhadas pelos casos de uso.
