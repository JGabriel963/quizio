---
spec: "035"
status: approved # draft | approved
---

# Plano técnico — 035 Grupos 2/5 — Configurações do grupo

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0015](../../../docs/adr/0015-grupos-e-convite-por-codigo.md)

## Abordagem

Tudo cabe no contexto `groups` da spec 034. O agregado `Group` ganha a **descrição** e as **quatro permissões dos membros**, guardadas como colunas da tabela `group`, com o padrão do Kahoot como `DEFAULT` do banco: a migration dá esses valores também aos grupos que já existem (RN-08). Cada escrita grava só o que muda (`saveDetails` para nome e descrição; `savePermission` para uma chave), como as opções da partida (spec 012), para que duas chaves mudadas ao mesmo tempo fiquem as duas (RN-09). As regras do que um membro pode fazer viram funções puras no domínio (`canInvite`, `canSeeMembers`), usadas pelos casos de uso que já existem: `getGroupInvite` passa a aceitar o membro quando o administrador permite, `listGroupMembers` recusa o membro quando a lista está oculta, e `getGroup` diz à tela o que o membro pode fazer e não manda a prévia dos membros a quem não pode vê-la. As chaves de compartilhar e de atividades só são guardadas e lidas (RN-16). Na web, a ⚙ vira link para a rota nova `/groups/$groupId/settings`. Nenhum ADR novo: a decisão de guardar as permissões no grupo entra como um parágrafo no ADR 0015.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Configurações do grupo | `GroupSettings` / `getGroupSettings` | sim |
| Descrição do grupo | `Group.description` | sim |
| Permissões dos membros | `GroupPermissions` (`membersCanInvite`, `membersCanSeeMembers`, `membersCanShare`, `membersCanAssign`) | sim |
| Mudar nome e descrição | `updateGroupDetails` | sim |
| Mudar uma chave | `setGroupPermission` | sim |
| O que quem vê pode fazer | `GroupView.abilities` (`invite`, `seeMembers`) | sim |

## Domínio — `packages/core/src/groups/domain`

### Agregado

`Group` (`group.ts`) ganha:

```ts
description: string;           // "" quando vazia (RN-05)
permissions: GroupPermissions; // RN-07
```

`aGroup()` e `createGroup` passam a dar `description: ""` e `DEFAULT_GROUP_PERMISSIONS`.

### Value objects e regras puras

- `group-permissions.ts` (o arquivo de checagens da 034 cresce):
  - `GROUP_PERMISSIONS = ["membersCanInvite", "membersCanSeeMembers", "membersCanShare", "membersCanAssign"] as const`, `GroupPermission`, `GroupPermissions = Record<GroupPermission, boolean>`;
  - `DEFAULT_GROUP_PERMISSIONS`: as três primeiras `true`, `membersCanAssign` `false` (RN-08);
  - `canInvite(group, role)`: administrador, ou membro com `membersCanInvite` (RN-11, RN-12);
  - `canSeeMembers(group, role)`: administrador, ou membro com `membersCanSeeMembers` (RN-13);
  - `assertCanInvite` → `InviteNotAllowedError`; `assertCanSeeMembers` → `MembersHiddenError`.
- `group.ts`: `GROUP_DESCRIPTION_MAX_LENGTH = 500`; `parseGroupDescription(raw)`: tira os espaços das pontas, mantém as quebras de linha, conta com `characterCount`, lança `InvalidGroupDescriptionError` acima de 500 (RN-04, RN-05).

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `InvalidGroupDescriptionError` | `GROUP.INVALID_DESCRIPTION` | Descrição com mais de 500 caracteres (RN-04) |
| `InviteNotAllowedError` | `GROUP.INVITE_NOT_ALLOWED` | Membro pede o link com "convidar" desligada (RN-12) |
| `MembersHiddenError` | `GROUP.MEMBERS_HIDDEN` | Membro pede a lista com "ver membros" desligada (RN-13) |

Configurações, nome, descrição, chaves e redefinir o link continuam com `GROUP.NOT_ADMIN` para o membro (RN-02, RN-11).

## Aplicação — `packages/core/src/groups/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `createGetGroupSettings` (novo) | `userId, groupId` | `{ name, description, permissions }` | `NOT_FOUND`, `NOT_ADMIN` | `groups`, `groupMembers` |
| `createUpdateGroupDetails` (novo) | `userId, groupId, name, description` | `{ name, description }` | `NOT_FOUND`, `NOT_ADMIN`, `INVALID_NAME`, `INVALID_DESCRIPTION` | `groups`, `groupMembers` |
| `createSetGroupPermission` (novo) | `userId, groupId, permission, value` | `void` | `NOT_FOUND`, `NOT_ADMIN` | `groups`, `groupMembers` |
| `createGetGroup` (muda) | igual | `GroupView` + `description`, `abilities: { invite, seeMembers }`; `memberPreview: []` sem `seeMembers` | igual | igual |
| `createListGroupMembers` (muda) | igual | igual | + `MEMBERS_HIDDEN` | igual |
| `createGetGroupInvite` (muda) | igual | igual | `INVITE_NOT_ALLOWED` no lugar de `NOT_ADMIN` para o membro | igual |
| `createResetGroupInvite` | sem mudança: só o administrador (RN-11) | | | |
| `createGetGroupInvitation`, `createAcceptGroupInvite` | sem mudança: o convite aceita quem chega com o link válido (RN-12) | | | |

Notas:

- `getGroup` continua mandando `adminName` e `memberCount` a todos (RN-14); só a prévia some sem `seeMembers` (RN-13), para o servidor não mandar nomes que a tela não pode mostrar.
- `updateGroupDetails` valida os dois campos antes de gravar e grava os dois juntos (`saveDetails`): são um diálogo só, com um Salvar só (RN-04).
- `setGroupPermission` grava mesmo que o valor seja o atual (idempotente): a tela não precisa ler antes.

### Portas alteradas

```ts
// group-repository.ts
export interface GroupRepository {
	// …as da spec 034
	/** Name and description only: a switch turned meanwhile stays (RN-09). */
	saveDetails(id: string, details: { name: string; description: string }): Promise<void>;
	/** One switch only (RN-09). */
	savePermission(id: string, permission: GroupPermission, value: boolean): Promise<void>;
}
```

`InMemoryGroupStore` implementa as duas; `GroupReads` não muda (a descrição e as permissões vêm do agregado, por `groups.findById`).

## Adapters

### Banco — `packages/db`

`schema/groups.ts`, tabela `group`, colunas novas:

```ts
description: text("description").notNull().default(""),
membersCanInvite: boolean("members_can_invite").notNull().default(true),
membersCanSeeMembers: boolean("members_can_see_members").notNull().default(true),
membersCanShare: boolean("members_can_share").notNull().default(true),
membersCanAssign: boolean("members_can_assign").notNull().default(false),
```

Os `DEFAULT` repetem `DEFAULT_GROUP_PERMISSIONS`; um teste PGlite confere que um grupo inserido sem as colunas lê o padrão do domínio, para os dois não se desencontrarem. `drizzle-group-repository.ts`: `toGroup` monta `permissions`; `create` grava tudo; `saveDetails` e `savePermission` (um `Record<GroupPermission, column>` escolhe a coluna) atualizam só o que é deles.

Migration: `pnpm db:generate` gera `ALTER TABLE "group" ADD COLUMN … DEFAULT …`; só adiciona colunas com padrão, compatível com o código já publicado.

### Real-time

Nenhum (RN-10): cada pedido confere a chave no servidor.

## API — `packages/api`

`routers/group.ts` ganha o sub-router `settings`:

| Procedure | query/mutation | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- |
| `group.settings.get` | query | `{ groupId }` | `{ name, description, permissions }` | `NOT_FOUND`, `NOT_ADMIN` |
| `group.settings.updateDetails` | mutation | `{ groupId, name: string ≤1000, description: string ≤5000 }` | `{ name, description }` | `NOT_FOUND`, `NOT_ADMIN`, `INVALID_NAME`, `INVALID_DESCRIPTION` |
| `group.settings.setPermission` | mutation | `{ groupId, permission: enum(GROUP_PERMISSIONS), value: boolean }` | `void` | `NOT_FOUND`, `NOT_ADMIN` |

`group.get`, `group.members` e `group.invite.get` mantêm a forma; mudam o que devolvem e recusam (acima). `container.ts` liga os três casos de uso novos.

## UI — `apps/web` e `packages/ui`

### Rotas

- Nova: `routes/_auth/_shell/groups.$groupId.settings.tsx` (`/groups/$groupId/settings`), dentro do layout da área de grupos (com a coluna). Estados: esqueleto, erro com Tentar novamente, "Só o administrador do grupo pode mudar as configurações." (`GROUP.NOT_ADMIN`), "Grupo não encontrado".
- `groups.$groupId.members.tsx`: o erro `GROUP.MEMBERS_HIDDEN` mostra "O administrador ocultou a lista de membros." com o link de volta; "Adicionar membros" segue `abilities.invite` (que já vem em `group.get`).
- `groups.$groupId.index.tsx`: "Adicionar membros" segue `abilities.invite`; o `GroupInviteControl` monta para quem pode convidar, com `canReset` só para o administrador.

### Componentes (`apps/web/src/components/groups/`)

- `group-settings.tsx` (novo): as quatro seções com os ícones e os textos das capturas (`SettingRow`: ícone, título, explicação, `Switch` à direita, que vai para baixo em telas estreitas) e a linha "Nome e descrição" com **Editar**. Recebe `settings` e `onToggle(permission, value)`, `onEditDetails`.
- `group-details-dialog.tsx` (novo): Nome (contador de 20) e Descrição (`Textarea`, contador de 500), Cancelar e Salvar; o erro do servidor ao lado do campo, como `CreateGroupDialog`. O contador por caracteres do `CreateGroupDialog` vira um campo compartilhado (`CountedField`) para os dois diálogos não divergirem.
- `group-header.tsx`: a ⚙ do administrador vira link para as configurações (tooltip "Configurações do grupo"); os ícones dos membros e "Ver membros" só com `abilities.seeMembers`.
- `group-tabs.tsx`: `onAddMembers` aparece por `canInvite` (renomeia `isAdmin`).
- `invite-dialog.tsx`: prop `canReset`; sem ela, nada de "Redefinir link" nem da ajuda.
- `group-info-dialog.tsx`: linha "Descrição" (com `whitespace-pre-line`) quando há uma.

### Lib

- `lib/group-mutations.ts`: `updateDetails` (invalida as consultas de grupo; o diálogo mostra o erro) e `setPermission` **otimista**: escreve o valor no cache de `group.settings.get` e, se falhar, volta o valor anterior e mostra "Não foi possível salvar a configuração." (RN-09, CA-09).
- `lib/group-error-messages.ts`: `GROUP.INVALID_DESCRIPTION`, `GROUP.INVITE_NOT_ALLOWED`, `GROUP.MEMBERS_HIDDEN`; `isMembersHidden`, `isNotGroupAdmin`.
- `lib/api-types.ts`: `GroupSettingsData`.

### Design system

Nada novo: `Switch`, `Textarea`, `Dialog`, `Tooltip` existem.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | componente + E2E | "the admin's gear links to the settings" · "shows the four sections in order" · "opens the settings and comes back" | `group-page.test.tsx`, `group-settings.test.tsx`, `e2e/group-settings.spec.ts` |
| CA-02 | aplicação + API + componente | "a member gets GROUP.NOT_ADMIN on settings, details and switches; an outsider GROUP.NOT_FOUND" · "maps them" · "the route tells a member only the admin may" | `group-settings.test.ts` (core), `routers/group.test.ts`, `group-settings.test.tsx` |
| CA-03 | domínio + repositório | "a new group has Kahoot's defaults" · "a row inserted without the columns reads the domain's defaults" | `create-group.test.ts`, `drizzle-group-repositories.test.ts` |
| CA-04 | aplicação + componente + E2E | "renames and describes; every read shows it" · "the info dialog keeps line breaks" | `group-settings.test.ts`, `group-page.test.tsx`, `e2e/group-settings.spec.ts` |
| CA-05 | domínio + componente + API | "accepts 500 characters, an emoji counting as one" · "refuses 501" · "the dialog stops at 500 and disables Salvar without a name" · "refuses 501 sent directly" | `group.test.ts`, `group-details-dialog.test.tsx`, `routers/group.test.ts` |
| CA-06 | domínio + componente | "only spaces is empty" · "no Descrição line without one" | `group.test.ts`, `group-page.test.tsx` |
| CA-07 | componente | "Cancelar keeps the saved values" | `group-details-dialog.test.tsx` |
| CA-08 | repositório + aplicação | "savePermission changes only its column" · "two switches at once keep both" | `drizzle-group-repositories.test.ts`, `group-settings.test.ts` |
| CA-09 | componente (hook) | "a failed switch goes back and tells it" | `group-settings.test.tsx` (com a ação que rejeita) |
| CA-10 | aplicação + componente + E2E | "a member reads the code when the admin allows" · "a member still cannot reset" · "the dialog has no Redefinir link without canReset" · "Bruno invites Carla" | `group-invite.test.ts`, `invite-dialog.test.tsx`, `e2e/group-settings.spec.ts` |
| CA-11 | aplicação + componente | "with inviting off a member gets GROUP.INVITE_NOT_ALLOWED; the link still works" · "no Adicionar membros without abilities.invite" | `group-invite.test.ts`, `group-page.test.tsx`, `members-table` da rota |
| CA-12 | aplicação + API + componente + E2E | "with the list hidden a member gets GROUP.MEMBERS_HIDDEN and no preview, but the total and the admin" · "the header hides icons and Ver membros" · "the members route tells it" | `list-group-members.test.ts`, `get-group.test.ts`, `routers/group.test.ts`, `group-page.test.tsx`, `e2e/group-settings.spec.ts` |
| CA-13 | aplicação | "the admin always sees the list and the preview" | `list-group-members.test.ts`, `get-group.test.ts` |
| CA-14 | aplicação + componente | "inviting without seeing members" | `get-group.test.ts`, `group-page.test.tsx` |
| CA-15 | aplicação + componente | "share and assign are stored and read back" · "Compart. and Atribuir stay Em breve" | `group-settings.test.ts`, `group-page.test.tsx` |

E2E (`apps/web/e2e/group-settings.spec.ts`, dois contextos): Ana renomeia e descreve o grupo; Bruno entra, copia o link e vê a descrição; Ana oculta a lista e Bruno vê só o total; Ana desliga "convidar" e o "Adicionar membros" de Bruno some.

## Dados e migration

- Cinco colunas novas em `group`, todas com `DEFAULT`: `pnpm db:generate` (migration commitada) e `pnpm -F @quizio/db db:push` local. Sem backfill: o `DEFAULT` preenche os grupos existentes com o padrão do Kahoot (RN-08).

## Riscos e decisões

- **O padrão vive em dois lugares** (o `DEFAULT` do banco e `DEFAULT_GROUP_PERMISSIONS`): o teste de repositório que insere sem as colunas prende os dois juntos.
- **Tela aberta com a chave antiga** (RN-10): a tela pode mostrar "Adicionar membros" a um membro que acabou de perder a permissão; o servidor recusa (`GROUP.INVITE_NOT_ALLOWED`) e o diálogo mostra o erro. Aceitável sem tempo real.
- **ADR 0015**: acrescentar "Permissões dos membros (aceito em 2026-10-26, spec 035)": as chaves são colunas do grupo, gravadas uma a uma; as checagens vivem em funções de domínio nomeadas. Sem ADR novo.
