---
spec: "035"
status: done # todo | in-progress | done
---

# Tarefas — 035 Grupos 2/5 — Configurações do grupo

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0015](../../../docs/adr/0015-grupos-e-convite-por-codigo.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.
>
> Só os repositórios Drizzle da 034 mudam, testados com PGlite; não há serviço externo novo, logo nenhum `*.int.test.ts`.

## Fase 1 — Domínio (`packages/core/src/groups/domain`)

- [x] **T01** `core/groups` — a descrição
  - Teste: `group.test.ts` › "a description keeps its line breaks and loses the spaces at its ends" · "only spaces is an empty description" · "accepts 500 characters, an emoji counting as one" · "refuses 501 with GROUP.INVALID_DESCRIPTION"
  - Implementar: `group.ts` (`description` no `Group`, `GROUP_DESCRIPTION_MAX_LENGTH`, `parseGroupDescription`), `InvalidGroupDescriptionError` em `group-errors.ts`; `aGroup()` com `description: ""`
  - Cobre: CA-05, CA-06 · RN-04, RN-05

- [x] **T02** `core/groups` — as permissões e o que o membro pode
  - Teste: `group-permissions.test.ts` › "a new group has Kahoot's defaults: invite, see and share on, assign off" · "the admin may always invite and see members" · "a member invites and sees members only as the switches say" · "assertCanInvite refuses with GROUP.INVITE_NOT_ALLOWED" · "assertCanSeeMembers refuses with GROUP.MEMBERS_HIDDEN"
  - Implementar: `group-permissions.ts` (`GROUP_PERMISSIONS`, `GroupPermission`, `GroupPermissions`, `DEFAULT_GROUP_PERMISSIONS`, `canInvite`, `canSeeMembers`, `assertCanInvite`, `assertCanSeeMembers`), os dois erros em `group-errors.ts`, `permissions` no `Group` e em `aGroup()`
  - Cobre: CA-03, CA-10, CA-11, CA-12, CA-13 · RN-07, RN-08, RN-11 a RN-13

## Fase 2 — Aplicação

- [x] **T03** `core/groups` — portas e fake
  - Teste: `in-memory-group-store.test.ts` › "saveDetails changes the name and the description only" · "savePermission changes one switch only"
  - Implementar: `saveDetails` e `savePermission` em `GroupRepository` e no `InMemoryGroupStore`
  - Cobre: CA-08 · RN-09

- [x] **T04** `core/groups` — criar com o padrão
  - Teste: `create-group.test.ts` › "a new group has no description and Kahoot's defaults"
  - Implementar: `create-group.ts`
  - Cobre: CA-03 · RN-08

- [x] **T05** `core/groups` — as configurações
  - Teste: `group-settings.test.ts` › "the admin reads the name, the description and the switches" · "renames and describes, and getGroup shows it" · "refuses an invalid name or description before writing" · "turns one switch and reads it back; two switches keep both" · "share and assign are stored and read back" · "a member gets GROUP.NOT_ADMIN on settings, details and switches; an outsider GROUP.NOT_FOUND"
  - Implementar: `get-group-settings.ts`, `update-group-details.ts`, `set-group-permission.ts`
  - Cobre: CA-02, CA-04, CA-05, CA-08, CA-15 · RN-02, RN-04, RN-06, RN-09, RN-16

- [x] **T06** `core/groups` — a página do grupo diz o que o membro pode
  - Teste: `get-group.test.ts` › "tells the description" · "abilities follow the switches for a member and are all true for the admin" · "with the list hidden a member gets no preview, but the total and the admin" · "the admin always gets the preview" · "inviting without seeing members"
  - Implementar: `get-group.ts` (`description`, `abilities`, prévia vazia sem `seeMembers`)
  - Cobre: CA-04, CA-11, CA-12, CA-13, CA-14 · RN-06, RN-11, RN-13, RN-14, RN-15

- [x] **T07** `core/groups` — lista de membros e convite seguem as chaves
  - Teste: `list-group-members.test.ts` › "with the list hidden a member gets GROUP.MEMBERS_HIDDEN" · "the admin always gets the list"; `group-invite.test.ts` › "a member reads the code when the admin allows" · "a member still cannot reset" · "with inviting off a member gets GROUP.INVITE_NOT_ALLOWED and the link still lets people in"
  - Implementar: `list-group-members.ts`, `get-group-invite.ts`
  - Cobre: CA-10, CA-11, CA-12, CA-13 · RN-11, RN-12, RN-13

## Fase 3 — Adapters

- [x] **T08** `db` — colunas e repositório
  - Teste: `drizzle-group-repositories.test.ts` › "a row inserted without the new columns reads the domain's defaults" · "creates and reads description and permissions" · "saveDetails changes name and description only" · "savePermission changes only its column; two at once keep both"
  - Implementar: colunas em `schema/groups.ts`; `toGroup`, `create`, `saveDetails`, `savePermission` em `drizzle-group-repository.ts`; `pnpm -F @quizio/db db:generate` (migration commitada) e `pnpm -F @quizio/db db:push`
  - Cobre: CA-03, CA-08 · RN-08, RN-09

## Fase 4 — API

- [x] **T09** `api` — `group.settings` e as recusas novas
  - Teste: `routers/group.test.ts` › "settings: the admin reads, renames, describes and turns switches" · "a member gets BAD_REQUEST GROUP.NOT_ADMIN on settings; an outsider NOT_FOUND" · "refuses a 501-character description sent directly" · "a member gets GROUP.MEMBERS_HIDDEN and GROUP.INVITE_NOT_ALLOWED as the switches say"
  - Implementar: sub-router `settings` em `routers/group.ts`, `container.ts` (três casos de uso)
  - Cobre: CA-02, CA-05, CA-11, CA-12 · RN-02, RN-12, RN-13

## Fase 5 — UI

- [x] **T10** `web` — mensagens e campo com contador
  - Teste: `lib/group-error-messages.test.ts` › "maps GROUP.INVALID_DESCRIPTION, GROUP.INVITE_NOT_ALLOWED and GROUP.MEMBERS_HIDDEN" · "tells hidden members and not admin apart"; `counted-field.test.tsx` › "counts down by characters and stops at the limit"
  - Implementar: `lib/group-error-messages.ts`; `components/groups/counted-field.tsx`, usado por `create-group-dialog.tsx` (os testes dela continuam verdes)
  - Cobre: CA-05 · RN-04

- [x] **T11** `web` — diálogo "Nome e descrição"
  - Teste: `group-details-dialog.test.tsx` › "opens with the saved name and description" · "disables Salvar without a name" · "stops the description at 500" · "sends both, trimmed" · "shows the server's refusal beside the field" · "Cancelar keeps the saved values"
  - Implementar: `group-details-dialog.tsx`
  - Cobre: CA-04, CA-05, CA-07 · RN-04, RN-05

- [x] **T12** `web` — tela de configurações
  - Teste: `group-settings.test.tsx` › "shows the four sections in order, with the texts of Kahoot" · "a switch shows its value and calls onToggle" · "a failed switch goes back and tells Não foi possível salvar a configuração." · "Editar opens Nome e descrição"
  - Feito: a volta da chave e o aviso ficaram no `GroupSettingsPanel` (estado local), não no cache da consulta; `members-hidden.test.tsx` também cobre a mensagem de quem não é administrador
  - Implementar: `group-settings.tsx` (`SettingRow`), mutations `updateDetails` e `setPermission` (otimista, com volta) em `lib/group-mutations.ts`, `GroupSettingsData` em `lib/api-types.ts`, rota `groups.$groupId.settings.tsx` (esqueleto, erro, "Só o administrador do grupo pode mudar as configurações.", "Grupo não encontrado")
  - Cobre: CA-01, CA-02, CA-08, CA-09, CA-15 · RN-01 a RN-03, RN-09

- [x] **T13** `web` — a página do grupo, os membros e o convite seguem as chaves
  - Teste: `group-page.test.tsx` › "the admin's gear links to the settings" · "a member without seeMembers has no icons nor Ver membros" · "Adicionar membros follows abilities.invite" · "Compart. and Atribuir stay Em breve" · "the info dialog shows the description with its line breaks, and no line without one"; `invite-dialog.test.tsx` › "no Redefinir link without canReset"; `members-hidden.test.tsx` › "tells O administrador ocultou a lista de membros. with the way back"
  - Implementar: `group-header.tsx` (⚙ como link, ícones e "Ver membros" por `abilities.seeMembers`), `group-tabs.tsx` (`canInvite`), `invite-dialog.tsx` (`canReset`), `group-invite-control.tsx`, `group-info-dialog.tsx` (descrição), `group-states.tsx` (`MembersHidden`), rotas `groups.$groupId.index.tsx` e `groups.$groupId.members.tsx`
  - Cobre: CA-01, CA-04, CA-06, CA-10, CA-11, CA-12, CA-14, CA-15 · RN-01, RN-06, RN-11 a RN-16

## Fase 6 — E2E e fechamento

- [x] **T14** E2E — configurações com dois navegadores
  - Teste: `apps/web/e2e/group-settings.spec.ts` › (desktop e celular)
    - "the admin renames and describes the group; a member sees it"
    - "a member invites while the admin allows, and stops when the admin turns it off"
    - "a hidden list leaves the member with the total"
  - Implementar: ajustes que o E2E revelar
  - Feito: `groups.spec.ts` (034) passou a conferir que o membro não tem a ⚙, em vez de "Adicionar membros", que agora segue a chave
  - Cobre: CA-01, CA-04, CA-10, CA-11, CA-12

- [x] **T15** Fechamento
  - Biome nos arquivos alterados (`--line-ending=crlf`), `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, E2E de grupos (034 e 035)
  - Atualizar `spec.md` (status `done`, changelog), `glossary.md` (✅), `roadmap.md` (035 ✅ com plano e tarefas), ADR 0015 (parágrafo "Permissões dos membros"), `CLAUDE.md` (parágrafo de Grupos e a rota `/groups/$groupId/settings`)

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T12, T13, T14 |
| CA-02 | T05, T09, T12 |
| CA-03 | T02, T04, T08 |
| CA-04 | T05, T06, T11, T13, T14 |
| CA-05 | T01, T05, T09, T10, T11 |
| CA-06 | T01, T13 |
| CA-07 | T11 |
| CA-08 | T03, T05, T08, T12 |
| CA-09 | T12 |
| CA-10 | T02, T07, T13, T14 |
| CA-11 | T02, T06, T07, T09, T13, T14 |
| CA-12 | T02, T06, T07, T09, T13, T14 |
| CA-13 | T02, T06, T07 |
| CA-14 | T06, T13 |
| CA-15 | T05, T12, T13 |

Todos os 15 critérios aparecem em ao menos uma tarefa.
