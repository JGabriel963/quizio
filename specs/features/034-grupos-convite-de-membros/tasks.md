---
spec: "034"
status: done # todo | in-progress | done
---

# Tarefas — 034 Grupos 1/5 — Criar o grupo e convidar membros

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0015](../../../docs/adr/0015-grupos-e-convite-por-codigo.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.
>
> Os repositórios Drizzle são testados com PGlite (`createTestDb()`), como os demais do `packages/db`; não há serviço externo novo, logo nenhum `*.int.test.ts`.

## Fase 1 — Domínio (`packages/core/src/groups/domain`)

- [x] **T01** `core/groups` — o grupo, o nome e os papéis
  - Teste: `groups/domain/group.test.ts` ›
    - "accepts names of 1 and 20 characters, trimmed"
    - "counts an emoji as one character"
    - "refuses a blank name and one of 21 characters with GROUP.INVALID_NAME"
  - Implementar: `group.ts` (`Group`, `GROUP_NAME_MAX_LENGTH`, `parseGroupName`, `InvalidGroupNameError`), `group-member.ts` (`GroupMember`, `GROUP_ROLES`, `GroupRole`), `group-section.ts` (`GROUP_SECTIONS`, `RECENT_GROUPS_LIMIT`, `GROUP_MEMBER_PREVIEW`)
  - Cobre: CA-04 · RN-01, RN-02, RN-03

- [x] **T02** `core/groups` — ordem, pesquisa e e-mail dos membros
  - Teste: `groups/domain/group-member.test.ts` ›
    - "sorts the admin first, then the others by name, ignoring accents"
    - "matches a search without case or accents"
    - "only the admin may see a member's email"
  - Implementar: `group-member.ts` (`sortMembers`, `matchesGroupSearch` sobre `normalizeSearchText`, `canSeeMemberEmail`)
  - Cobre: CA-05, CA-22, CA-23 · RN-08, RN-31, RN-32, RN-34

- [x] **T03** [P] `core/groups` — permissões do papel
  - Teste: `groups/domain/group-permissions.test.ts` ›
    - "assertAdmin refuses a member with GROUP.NOT_ADMIN"
    - "assertCanLeave refuses the admin with GROUP.ADMIN_CANNOT_LEAVE"
    - "assertRemovable refuses the admin with GROUP.CANNOT_REMOVE_ADMIN"
  - Implementar: `group-permissions.ts` e os erros em `group-errors.ts` (`GroupNotFoundError`, `GroupMemberNotFoundError`, `NotGroupAdminError`, `AdminCannotLeaveError`, `CannotRemoveAdminError`, `InvalidGroupInviteError`)
  - Cobre: CA-21, CA-25, CA-26, CA-27 · RN-02, RN-22, RN-33, RN-36, RN-37

- [x] **T04** [P] `core/groups` — o cartão "Configurar seu grupo"
  - Teste: `groups/domain/group-setup.test.ts` ›
    - "a member never gets the setup"
    - "Convidar membros is done once the group has a second member"
    - "the setup is gone once dismissed"
  - Implementar: `group-setup.ts` (`groupSetupOf`)
  - Cobre: CA-07, CA-08, CA-10 · RN-17

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T05** `core/groups` — portas e fakes
  - Teste: `groups/testing/in-memory-group-store.test.ts` ›
    - "creates a group with its admin as a member"
    - "addWithInvite adds once, reports alreadyMember, and is invalid for an old code"
    - "deleting a group removes its members and visits"
    - "recentForUser keeps only groups the user still belongs to, newest first"
  - Implementar: `application/ports/` (`group-repository.ts`, `group-member-repository.ts`, `group-visit-repository.ts`, `group-reads.ts`, `invite-code-generator.ts`), `testing/in-memory-group-store.ts` (com `addUser`), `testing/sequential-invite-code-generator.ts`, `testing/a-group.ts`
  - Cobre: CA-06, CA-20, CA-27 (fake) · RN-10, RN-23, RN-29

- [x] **T06** `core/groups` — criar o grupo e carregar com a pertença
  - Teste: `create-group.test.ts` › "creates the group with its creator as admin and only member" · "gives the group an invite code" · "refuses an invalid name before writing"; `load-group.test.ts` › "a non-member gets GROUP.NOT_FOUND, like an unknown id"
  - Implementar: `create-group.ts`, `load-group.ts` (`requireMembership`)
  - Cobre: CA-03, CA-04, CA-12 · RN-01, RN-05, RN-11, RN-12

- [x] **T07** `core/groups` — listas, recentes e visita
  - Teste: `list-groups.test.ts` › "splits managed and joined" · "orders by creation for the admin and by joining for a member, newest first" · "filters the section by name without case or accents"; `list-recent-groups.test.ts` › "keeps the 5 most recent" · "drops deleted, left and removed groups"; `visit-group.test.ts` › "a revisit moves the group to the top" · "a non-member cannot visit"
  - Implementar: `list-groups.ts`, `list-recent-groups.ts`, `visit-group.ts`
  - Cobre: CA-02, CA-05, CA-06 · RN-07, RN-08, RN-10, RN-20

- [x] **T08** `core/groups` — a página do grupo e a configuração
  - Teste: `get-group.test.ts` › "the admin's view has role admin and the setup" · "a member's view has no setup" · "tells the admin's name, member count, creation date and up to 3 members, admin first"; `dismiss-group-setup.test.ts` › "the admin dismisses the setup for good" · "a member cannot dismiss"
  - Implementar: `get-group.ts` (`GroupView`), `dismiss-group-setup.ts`
  - Cobre: CA-07, CA-08, CA-10, CA-11 · RN-13, RN-17, RN-18, RN-19

- [x] **T09** `core/groups` — membros
  - Teste: `list-group-members.test.ts` › "lists every member, admin first" · "search filters and keeps the total" · "the email goes only to the admin" · "a non-member gets GROUP.NOT_FOUND"
  - Implementar: `list-group-members.ts`
  - Cobre: CA-12, CA-22, CA-23 · RN-31, RN-32, RN-34

- [x] **T10** `core/groups` — ler e redefinir o convite
  - Teste: `group-invite.test.ts` › "the admin reads the code" · "a member gets GROUP.NOT_ADMIN; an outsider GROUP.NOT_FOUND"; "gives a new code; the old one is invalid and the members stay" · "a member cannot reset"
  - Implementar: `get-group-invite.ts`, `reset-group-invite.ts`
  - Cobre: CA-13, CA-18, CA-21 · RN-21, RN-22, RN-23, RN-24

- [x] **T11** `core/groups` — a tela do convite e aceitar
  - Teste: `group-invite.test.ts` ("the invitation screen", "acceptGroupInvite") › "a pending invitation tells only the group's name" · "a member or the admin gets status member" · "reset, deleted and unknown codes are the same invalid status" · "accepting makes a member who sees the group" · "accepting twice adds one membership" · "an old code fails with GROUP.INVITE_INVALID" · "a removed member can come back with the link"
  - Implementar: `get-group-invitation.ts`, `accept-group-invite.ts`
  - Cobre: CA-14, CA-17, CA-19, CA-20, CA-25 · RN-25, RN-27, RN-28, RN-29, RN-30

- [x] **T12** `core/groups` — remover, sair e excluir
  - Teste: `group-membership-changes.test.ts` › "removes a member, who then gets GROUP.NOT_FOUND" · "refuses removing the admin" · "a member cannot remove" · "an unknown member is GROUP.MEMBER_NOT_FOUND" · "a member leaves" · "the admin cannot leave" · "the admin deletes; members lose it and the link is invalid" · "a member cannot delete"
  - Implementar: `remove-group-member.ts`, `leave-group.ts`, `delete-group.ts`
  - Cobre: CA-25, CA-26, CA-27 · RN-33, RN-35, RN-36, RN-37

## Fase 3 — Adapters

- [x] **T13** `db` — schema dos grupos e migration
  - Teste: `repositories/groups/drizzle-group-repositories.test.ts` › "creates a group with its admin's membership in one transaction" · "invite codes are unique" · "saveInviteCode and saveSetupDismissed change only their column" · "deleting a group cascades to members and visits"
  - Implementar: `schema/groups.ts` (`groupTable`, `groupMember`, `groupVisit`, índices), export em `schema/index.ts`, `repositories/groups/drizzle-group-repository.ts`; `pnpm db:generate` (migration commitada) e `pnpm -F @quizio/db db:push` no banco local
  - Se `group` como nome de tabela der atrito, trocar para `user_group` (plano, Riscos)
  - Cobre: CA-18, CA-27 · RN-01, RN-23, RN-24, RN-37

- [x] **T14** `db` — membros e visitas
  - Teste: `drizzle-group-repositories.test.ts` › "addWithInvite: added, alreadyMember, and invalid after a reset" · "two accepts at once leave one row" · "remove deletes only that membership" · "touch upserts the visit time"
  - Implementar: `drizzle-group-member-repository.ts` (`INSERT … SELECT … WHERE invite_code … ON CONFLICT DO NOTHING`), `drizzle-group-visit-repository.ts`
  - Cobre: CA-06, CA-20, CA-25 · RN-20, RN-29

- [x] **T15** `db` — leitura com as contas
  - Teste: `repositories/groups/drizzle-group-reads.test.ts` › "lists a user's groups with role, member count and since" · "recentForUser keeps the 5 latest of groups the user belongs to" · "members carry the account's name and email"
  - Implementar: `drizzle-group-reads.ts` (junções com `user`)
  - Cobre: CA-05, CA-06, CA-22 · RN-08, RN-10, RN-32

- [x] **T16** [P] `api` — gerador do código do convite
  - Teste: `random-invite-code-generator.test.ts` › "draws 22 URL-safe characters" · "two codes differ"
  - Implementar: `random-invite-code-generator.ts` (`randomBytes(16).toString("base64url")`)
  - Cobre: RN-23

## Fase 4 — API

- [x] **T17** `api` — container, composition root e router
  - Teste: `routers/group.test.ts` ›
    - "group.create returns the id and group.list shows it in managed"
    - "refuses a 21-character name sent directly (GROUP.INVALID_NAME)"
    - "a non-member gets NOT_FOUND on get, members, visit and invite.get"
    - "a member gets BAD_REQUEST GROUP.NOT_ADMIN on invite.get, invite.reset, removeMember, delete and dismissSetup"
    - "invite.find answers pending, member and invalid; invite.accept joins"
    - "members omits emails for a member"
    - "every procedure needs a session"
  - Implementar: `routers/group.ts` (com o sub-router `invite`), `routers/index.ts`, `container.ts` (adapters e 14 casos de uso), `composition-root.ts`, `testing/test-context.ts` (fake com os usuários de `callerFor`)
  - Cobre: CA-03, CA-04, CA-12, CA-21, CA-23, CA-25, CA-27 · RN-05, RN-22

## Fase 5 — UI

- [x] **T18** [P] `ui` — etiqueta "Administrador"
  - Teste: `packages/ui/src/components/badge.test.tsx` › "renders the role variant"
  - Implementar: variante `role` no `cva` do `Badge`; exemplo em `/design-system`
  - Cobre: CA-22 · RN-32

- [x] **T19** `web` — navegação e bases
  - Teste: `components/layout/main-nav.test.tsx` › "links Grupos to /groups without Em breve" · "marks Grupos on group paths"; `lib/group-invite-link.test.ts` › "builds the invite link from the origin and code"; `lib/user-color.test.ts` › "gives a user always the same color of the palette"; `lib/group-error-messages.test.ts` › "maps every GROUP code to Portuguese"
  - Implementar: `main-nav.tsx`, `lib/group-invite-link.ts`, `lib/user-color.ts`, `lib/group-error-messages.ts`, tipos em `lib/api-types.ts`, `components/groups/user-avatar.tsx`
  - Cobre: CA-01 · RN-06

- [x] **T20** `web` — tela de grupos e criar grupo
  - Teste: `groups-column.test.tsx` › "links both sections and highlights the open one" · "shows Grupos recentes only with visits, highlighting the open group"; `groups-empty-state.test.tsx` › "shows Colaborar, Atribuir and Competir with Criar grupo when managing none" · "explains how to join when in no group" · "says Nenhum grupo encontrado. for a search"; `create-group-dialog.test.tsx` › "disables Criar grupo while the name is blank" · "counts down from 20 and stops at 20 characters" · "shows the server's refusal beside the field"
  - Também: `group-grid.test.tsx` › "lists each group as a link with its member count"
  - Implementar: `groups-column.tsx`, `group-grid.tsx` (o cartão fica nele), `groups-empty-state.tsx`, `create-group-dialog.tsx`, `lib/group-mutations.ts` (`create`), rotas `_shell/groups/route.tsx` e `_shell/groups/index.tsx` (`validateSearch` com `section` e `q`)
  - Cobre: CA-02, CA-03, CA-04, CA-05, CA-06 · RN-07 a RN-12

- [x] **T21** `web` — página do grupo
  - Teste: `group-page.test.tsx` (um arquivo para os componentes da página) › "shows settings (Em breve) and Adicionar membros to the admin" · "hides admin actions from a member" · "the admin's menu has Excluir and no Sair; the member's has Sair and no Excluir" · "shows up to 3 member icons and +N" · "Publicar algo and its actions are Em breve; Atribuir only for the admin" · "shows the setup card only to the admin" · "marks Convidar membros done" · "Pular configuração dismisses" · "keeps the open tab in the address and shows Em breve on Compartilhado and Atribuições" · "tells the admin's name, member count and creation date"
  - Implementar: `group-header.tsx`, `group-options-menu.tsx`, `member-avatars` (em `group-header.tsx`), `group-tabs.tsx`, `group-activity.tsx`, `group-setup-card.tsx`, `group-coming-soon.tsx`, `group-info-dialog.tsx`, rota `_shell/groups/$groupId/index.tsx` (consulta `group.get`, `group.visit` ao abrir, `tab` na busca, tela de não encontrado), mutation `dismissSetup`
  - Cobre: CA-07, CA-08, CA-09, CA-10, CA-11, CA-12 · RN-13 a RN-20

- [x] **T22** `web` — diálogo de convite
  - Teste: `invite-dialog.test.tsx` › "shows the link and copies it with Link copiado" · "Redefinir link asks first and then shows the new link" · "cancelling the confirmation keeps the link" · "explains Redefinir link in its help"
  - Implementar: `invite-dialog.tsx` (ligado a `group.invite.get` e `resetInvite`), aberto por "Adicionar membros" e por "Convidar membros"
  - Cobre: CA-13, CA-18 · RN-16, RN-21, RN-24

- [x] **T23** `web` — tela do convite
  - Teste: `invite-card.test.tsx` › "a pending invitation shows the group's name with Cancelar and Aceitar convite" · "Aceitar convite is busy while joining" · "Cancelar goes home without joining" · "an invalid invitation shows Este convite não é mais válido with Ir para o início"
  - Implementar: `invite-card.tsx`, rota `_auth/invite.$code.tsx` (sem shell; `member` vai direto ao grupo com `replace`), mutation `acceptInvite`
  - Cobre: CA-14, CA-15, CA-16, CA-17, CA-19 · RN-25 a RN-28

- [x] **T24** `web` — membros do grupo
  - Teste: `members-table.test.tsx` (tabela, informações e confirmações) › "renders the Administrador badge and Ativo for each member" · "Remover only for the admin and never on their own row" · "Ver perfil is Em breve" · "Adicionar membros only for the admin" · "shows name, email, role and status" · "omits the email line without it" · "Remover, Sair and Excluir confirm with the spec's texts"
  - Implementar: `members-table.tsx`, `member-info-dialog.tsx`, `confirm-group-dialogs.tsx`, rota `_shell/groups/$groupId/members.tsx`, mutations `removeMember`, `leave`, `delete` (com as navegações de RN-36 e RN-37) ligadas também ao menu ⋮ da página
  - Cobre: CA-22, CA-23, CA-24, CA-25, CA-26, CA-27 · RN-31 a RN-37

## Fase 6 — E2E e fechamento

- [x] **T25** E2E — o caminho do convite
  - Teste: `apps/web/e2e/groups.spec.ts` › (dois contextos, desktop e mobile)
    - "creates a group, invites a member by link and sees them in the members list"
    - "a signed-out guest signs in and comes back to the invitation"
    - "a reset link is no longer valid and the new one works"
    - "the admin removes a member and deletes the group"
  - Implementar: ajustes que o E2E revelar; helpers em `e2e/support.ts` se preciso
  - Feito: o clique em "Criar grupo" se repete até o diálogo abrir (num servidor frio o primeiro clique chega antes da hidratação); `home.spec.ts` passou a seguir o link Grupos em vez de esperá-lo "Em breve"
  - Cobre: CA-14, CA-16, CA-18, CA-25, CA-27

- [x] **T26** Fechamento
  - Feito: Biome nos arquivos alterados, `pnpm test`, `pnpm check-types`, `tsc` da web, E2E de grupos e da página inicial
  - `pnpm check` (só nos arquivos alterados, com `--line-ending=crlf`), `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, `pnpm test:e2e`
  - Atualizar `spec.md` (status `done`, changelog), `glossary.md` (status ✅ e os nomes do código), `roadmap.md` (034 ✅ com plano e tarefas), `CLAUDE.md` (parágrafo de Grupos, rotas), `docs/architecture.md` (contexto `groups` na tabela de bounded contexts); spec 002 e 029 no changelog (Grupos saiu de "Em breve")

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T19 |
| CA-02 | T07, T20 |
| CA-03 | T06, T17, T20 |
| CA-04 | T01, T06, T17, T20 |
| CA-05 | T02, T07, T15, T20 |
| CA-06 | T05, T07, T14, T15, T20 |
| CA-07 | T04, T08, T21 |
| CA-08 | T04, T08, T21 |
| CA-09 | T21 |
| CA-10 | T04, T08, T21 |
| CA-11 | T08, T21 |
| CA-12 | T06, T09, T17, T21 |
| CA-13 | T10, T22 |
| CA-14 | T11, T23, T25 |
| CA-15 | T23 |
| CA-16 | T23, T25 |
| CA-17 | T11, T23 |
| CA-18 | T10, T13, T22, T25 |
| CA-19 | T11, T23 |
| CA-20 | T05, T11, T14 |
| CA-21 | T03, T10, T17 |
| CA-22 | T02, T09, T15, T18, T24 |
| CA-23 | T02, T09, T17, T24 |
| CA-24 | T24 |
| CA-25 | T03, T11, T12, T14, T17, T24, T25 |
| CA-26 | T03, T12, T24 |
| CA-27 | T03, T05, T12, T13, T17, T24, T25 |

Todos os 27 critérios aparecem em ao menos uma tarefa.
