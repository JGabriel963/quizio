---
spec: "038"
status: done # todo | in-progress | done
---

# Tarefas — 038 Grupos 5/5 — Atribuições no grupo

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADRs: [0014](../../../docs/adr/0014-atribuicao-como-partida.md), [0015](../../../docs/adr/0015-grupos-e-convite-por-codigo.md), [0016](../../../docs/adr/0016-mural-do-grupo.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.
>
> Os adapters novos são repositórios e consultas Drizzle, testados com PGlite como os demais; não há serviço externo novo, logo nenhum `*.int.test.ts`.

## Fase 1 — Domínio

- [x] **T01** `core/groups` — publicação e mensagem
  - Teste: `groups/domain/group-post.test.ts` › "a message has 1 to 500 characters, trimmed, keeping line breaks" · "refuses an empty message and one of 501 with GROUP.INVALID_MESSAGE"
  - Implementar: `group-post.ts` (`GroupPost`, `GROUP_POST_MESSAGE_MAX_LENGTH`, `parsePostMessage`), `InvalidPostMessageError` e os demais erros novos em `group-errors.ts`
  - Cobre: CA-06 · RN-11, RN-12

- [x] **T02** [P] `core/groups` — quem atribui e quem gerencia a publicação
  - Teste: `group-permissions.test.ts` › "canAssign: the admin always, a member with the switch" · "assertCanAssign refuses with GROUP.ASSIGN_NOT_ALLOWED" · "canManagePost: the author while a member, or the admin"
  - Implementar: `canAssign`, `assertCanAssign`, `canManagePost` em `group-permissions.ts`
  - Cobre: CA-01, CA-11, CA-21 · RN-01, RN-20, RN-31

- [x] **T03** [P] `core/groups` — o anexo e a ordem da aba
  - Teste: `groups/domain/group-assignment.test.ts` › "an open assignment has an attachment with the time left" · "an ended, expired or missing assignment has none" · "sorts by recent, oldest and deadline"
  - Implementar: `group-assignment.ts` (`GroupAssignmentRecord`, `isAssignmentOpen`, `attachmentOf`, `GROUP_ASSIGNMENT_SORTS`, `sortGroupAssignments`)
  - Cobre: CA-08a, CA-14 · RN-16, RN-22, RN-23

- [x] **T04** [P] `core/groups` — "Configurar seu grupo" com atribuições e publicações
  - Teste: `group-setup.test.ts` › "an assignment marks Atribuir and Criar publicação done" · "the card leaves once every step is done"
  - Implementar: `groupSetupOf(group, memberCount, role, stats)`
  - Cobre: CA-19 · RN-29

## Fase 2 — Aplicação

- [x] **T05** `core/groups` — portas e fakes do mural
  - Teste: `in-memory-group-store.test.ts` › "creates a post once per assignment and group (taken)" · "setLike is idempotent and unlikes" · "lists posts newest first with author, likes and the viewer's like" · "deleting a post or the group takes its likes"; `in-memory-group-assignment-query.test.ts` › "finds the assignments it was given, ended or not, and forgets deleted ones"
  - Implementar: portas `group-assignments.ts`, `group-assignment-query.ts`, `group-post-repository.ts`, `group-feed-query.ts`; `InMemoryGroupStore` (posts, curtidas, `stats`, `groupsWithAssignment`); `testing/in-memory-group-assignments.ts` (cria registros controláveis: encerrar, vencer, apagar)
  - Cobre: CA-09, CA-10, CA-18, CA-20 · RN-13, RN-17, RN-18, RN-28

- [x] **T06** `core/groups` — atribuir no grupo
  - Teste: `assign-in-group.test.ts` › "creates a plain assignment and a post, without or with a message" · "a member without the switch gets GROUP.ASSIGN_NOT_ALLOWED and nothing is created" · "an invalid message creates nothing" · "a refused deadline creates nothing" · "an outsider gets GROUP.NOT_FOUND"
  - Implementar: `assign-in-group.ts`
  - Cobre: CA-01, CA-04, CA-05, CA-06 · RN-01, RN-03, RN-08, RN-10, RN-11

- [x] **T07** `core/groups` — o mural e a aba
  - Teste: `list-group-feed.test.ts` › "newest first, with author, message, likes and the viewer's like" · "an ended, expired or deleted assignment loses its attachment, keeping the message and likes" · "canSeeReport and canDelete for the author and the admin; none for others" · "a post stays after its author leaves; only the admin may delete it"; `list-group-assignments.test.ts` › "only open assignments, sorted" · "an outsider gets GROUP.NOT_FOUND"
  - Implementar: `list-group-feed.ts`, `list-group-assignments.ts` (URLs de capa pelo `ObjectStorage`)
  - Cobre: CA-08a, CA-09, CA-11, CA-13, CA-14, CA-15, CA-21 · RN-13 a RN-16, RN-20, RN-22, RN-23, RN-31, RN-32

- [x] **T08** `core/groups` — curtir e excluir a publicação
  - Teste: `set-post-like.test.ts` › "likes and unlikes, telling the count" · "two likes at once count once" · "an outsider cannot like"; `delete-group-post.test.ts` › "the author and the admin delete it; the assignment stays" · "a member who did not assign gets GROUP.POST_DELETE_NOT_ALLOWED" · "a post of another group is GROUP.POST_NOT_FOUND"
  - Implementar: `set-post-like.ts`, `delete-group-post.ts`
  - Cobre: CA-10, CA-12, CA-21 · RN-17, RN-18, RN-21, RN-31

- [x] **T09** `core/groups` — atribuir a grupos
  - Teste: `assign-to-groups.test.ts` › "lists only groups where the user may assign, marking those that have it" · "posts to several groups without message" · "refuses an assignment already in a group, ended, or of somebody else, writing nothing" · "refuses a group where the user may not assign"
  - Implementar: `list-assignable-groups.ts`, `assign-to-groups.ts`
  - Cobre: CA-16, CA-17, CA-18 · RN-25 a RN-28

- [x] **T10** `core/groups` — a página do grupo diz quem atribui
  - Teste: `get-group.test.ts` › "abilities.assign follows the switch" · "the setup marks Atribuir and Criar publicação after an assignment"; `delete-group.test.ts` › "deleting the group keeps its assignments"
  - Implementar: `get-group.ts` (`abilities.assign`, `setup` com `groupFeed.stats`)
  - Cobre: CA-01, CA-19, CA-20 · RN-01, RN-29, RN-30

- [x] **T11** `core/reports` — relatório somente para leitura
  - Teste: `reports/application/get-report.test.ts` › "a granted reader gets the report read-only" · "without a grant, or with the report in the trash, it is REPORT.NOT_FOUND" · "the owner still gets it with every action"; `get-report-details.test.ts` › "participant and question details follow the same rule"; `change-reports.test.ts` › "writes stay the owner's even with a grant"
  - Implementar: porta `report-read-grants.ts`, `testing/in-memory-report-read-grants.ts`, `loadReadableReport` em `load-report.ts`, `readOnly` no `ReportView`, `getReport`/`getReportParticipant`/`getReportQuestion`
  - Cobre: CA-11 · RN-20a

- [x] **T12** [P] `core/library` — a descrição na biblioteca
  - Teste: `list-library.test.ts` › "items carry the quiz's description"
  - Implementar: `description` em `LibraryQuizRecord`, `LibraryItem` e `InMemoryLibraryQuizQuery`
  - Cobre: CA-02 · RN-04

## Fase 3 — Adapters

- [x] **T13** `db` — tabelas do mural e repositório
  - Teste: `repositories/groups/drizzle-group-post-repository.test.ts` › "creates a post and refuses the same assignment twice in a group (taken), also at once" · "setLike likes once and unlikes" · "deleting a post, or the group, takes its likes"
  - Implementar: `group_post_kind`, `group_post`, `group_post_like` em `schema/groups.ts`; `drizzle-group-post-repository.ts`; `pnpm -F @quizio/db db:generate` (migration commitada) e `db:push`
  - Cobre: CA-10, CA-18, CA-20 · RN-17, RN-28, RN-30

- [x] **T14** `db` — consultas do mural e das atribuições
  - Teste: `drizzle-group-feed-query.test.ts` › "lists newest first with author name, like count and the viewer's like" · "stats and groupsWithAssignment"; `drizzle-group-assignment-query.test.ts` › "reads name (report's or game's), owner, cover, count, deadline and end" · "a deleted game and a live game are missing"
  - Implementar: `drizzle-group-feed-query.ts`, `drizzle-group-assignment-query.ts`
  - Cobre: CA-08a, CA-09 · RN-13, RN-16

- [x] **T15** [P] `db` — concessão de leitura e descrição da biblioteca
  - Teste: `repositories/reports/drizzle-report-read-grants.test.ts` › "an admin of a group with the assignment may read" · "a member, or an admin after the post is deleted, may not"; `drizzle-library-quiz-query.test.ts` › "reads the description"
  - Implementar: `drizzle-report-read-grants.ts`, `description` em `drizzle-library-quiz-query.ts`
  - Cobre: CA-02, CA-11 · RN-04, RN-20a

## Fase 4 — API

- [x] **T16** `api` — procedures e ligações
  - Teste: `routers/group.test.ts` › "group.assign creates the assignment and the post; it is in the creator's reports" · "refuses a 501-character message and a member without the switch" · "feed, assignments, setLike and posts.delete" · "assignableGroups and assignToGroups"; `routers/report.test.ts` › "a granted admin reads a member's report read-only and cannot change it"
  - Implementar: `group.assign`, `group.feed`, `group.assignments`, `group.posts.setLike`, `group.posts.delete`, `group.assignableGroups`, `group.assignToGroups` em `routers/group.ts`; `container.ts` (`groupAssignments` sobre o `createAssignment` com `assignmentDeps`, os casos de uso, `reportReadGrants`); `composition-root.ts`; `testing/test-context.ts`
  - Cobre: CA-05, CA-06, CA-10, CA-11, CA-12, CA-16, CA-18 · RN-01, RN-03, RN-20a, RN-28

## Fase 5 — UI

- [x] **T17** `web` — rótulos, mensagens e o estado do fluxo
  - Teste: `lib/group-post-labels.test.ts` › "N curtida(s)" · "the post's date" · "time left without em"; `lib/group-assign-state.test.ts` › "select → configure → message; X goes back to select keeping deadline, options and text; cancel resets"; `lib/group-error-messages.test.ts` › "maps the new GROUP codes"
  - Implementar: `lib/group-post-labels.ts`, `lib/group-assign-state.ts`, `lib/group-error-messages.ts`, tipos em `lib/api-types.ts`
  - Cobre: CA-07, CA-10, CA-13 · RN-11, RN-14, RN-18, RN-23

- [x] **T18** `web` — "Selecionar kahoot"
  - Teste: `components/groups/assign/select-quiz-dialog.test.tsx` › "lists published quizzes, newest first, with cover, count, description, owner, visibility and age" · "searches without case or accents; Nenhum quiz encontrado." · "without quizzes offers Ir para a biblioteca" · "Fechar creates nothing"
  - Implementar: `select-quiz-dialog.tsx`
  - Cobre: CA-02, CA-03 · RN-04 a RN-06

- [x] **T19** `web` — "Configurações da atividade atribuída" e "Criar publicação"
  - Teste: `assignment-settings-dialog.test.tsx` › "starts in 3 days at 12:00 with the remembered options" · "Gerador de apelido is Em breve; no participant limit" · "a refused deadline shows under the fields" · "Atribuir agora and Adicionar mensagem"; `assignment-post-dialog.test.tsx` › "Publicar is disabled while empty; counts down from 500" · "X goes back; Cancelar closes everything"
  - Implementar: `assignment-settings-dialog.tsx`, `assignment-post-dialog.tsx`
  - Cobre: CA-04, CA-06, CA-07 · RN-07 a RN-12

- [x] **T20** `web` — o fluxo Atribuir no grupo
  - Teste: `assign-in-group-flow.test.tsx` › "select, configure and assign now" · "with a message" · "Cancelar on the message creates nothing" · "X keeps the deadline, the options and the text"; `group-page.test.tsx` › "Atribuir is active for abilities.assign in the composer, the setup card and the tab; Criar publicação and Compart. stay Em breve"
  - Implementar: `assign-in-group-flow.tsx`, mutation `assign` em `lib/group-mutations.ts`, `GroupActivity` e `GroupSetupCard` com o Atribuir ativo, rota `groups.$groupId.index.tsx`
  - Cobre: CA-01, CA-05, CA-06, CA-07 · RN-01, RN-02, RN-10, RN-11

- [x] **T21** `web` — mural e publicação
  - Teste: `group-post.test.tsx` › "shows atribuiu um kahoot, the date, the message, the card and Iniciar to a new tab" · "an ended one shows compartilhou um arquivo and the removed box, keeping likes" · "Curtir / Curtida and N curtidas, going back on failure" · "the ⋮ has Ver relatório and Excluir publicação in red when allowed, none otherwise" · "Excluir publicação asks first"; `group-feed.test.tsx` › "posts in order; the empty state without any"
  - Implementar: `group-feed.tsx`, `group-post.tsx` (`PostMenu`, `AssignmentAttachment`, `RemovedAttachment`, `LikeButton`), mutations `setLike` e `deletePost`, `GroupActivity` com o mural
  - Cobre: CA-08, CA-08a, CA-09, CA-10, CA-11, CA-12 · RN-13 a RN-21

- [x] **T22** `web` — aba Atribuições
  - Teste: `group-assignments-tab.test.tsx` › "cards with Kahoot, time left, cover, title and who assigned" · "list with Título, Atribuído por, Prazo and Atribuído" · "the view choice is remembered" · "Classificar por changes the order" · "a card opens the activity in a new tab" · "empty, with Atribuir for who may assign"
  - Implementar: `group-assignments-tab.tsx` (`AssignmentCard`, `AssignmentsTable`), `sort` na busca da rota
  - Cobre: CA-13, CA-14, CA-15 · RN-22 a RN-24

- [x] **T23** `web` — "Atribuir a grupos"
  - Teste: `assign-to-groups-dialog.test.tsx` › "lists the groups with checks; Já atribuída is checked and disabled" · "Atribuir is disabled without a check and tells Atividade atribuída a N grupos" · "without groups offers Criar grupo"; `share-assignment-dialog.test.tsx` › "Atribuir a grupos is active while the assignment is open; Atribuir por e-mail stays Em breve"
  - Implementar: `assign-to-groups-dialog.tsx`, `share-assignment-dialog.tsx`, mutation `assignToGroups`
  - Cobre: CA-16, CA-17 · RN-25 a RN-27

- [x] **T24** `web` — relatório somente para leitura
  - Teste: `report-header.test.tsx` › "read-only hides rename, trash, delete and play again"; `assignment-summary.test.tsx` › "read-only hides share, change deadline and end"
  - Implementar: `readOnly` em `ReportHeader`, `AssignmentSummary` e na rota `reports.$gameId.tsx`
  - Cobre: CA-11 · RN-20a

## Fase 6 — E2E e fechamento

- [x] **T25** E2E — atribuições no grupo com dois navegadores
  - Teste: `apps/web/e2e/group-assignments.spec.ts` › (desktop e celular)
    - "the admin assigns with a message; a member sees it, likes it and starts it"
    - "ending the assignment in the report leaves compartilhou um arquivo"
    - "an assignment made in the library goes to the group through Atribuir a grupos"
    - "the admin reads a member's report read-only"
  - Implementar: ajustes que o E2E revelar
  - Cobre: CA-05, CA-08, CA-08a, CA-10, CA-11, CA-16

- [x] **T26** Fechamento
  - Biome nos arquivos alterados (`--line-ending=crlf`), `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, E2E de grupos (034, 035, 038), da atribuição (029, 030) e de relatórios
  - Atualizar `spec.md` (status `done`, changelog), `glossary.md` (✅), `roadmap.md` (038 ✅ com plano e tarefas), `CLAUDE.md` (parágrafo do mural e das atribuições no grupo, rotas e `readOnly`), `docs/architecture.md` se preciso; spec 029 (changelog: "Atribuir a grupos" ativo) e 015 (changelog: leitura pelo administrador do grupo)

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T02, T06, T10, T20 |
| CA-02 | T12, T15, T18 |
| CA-03 | T18 |
| CA-04 | T06, T19 |
| CA-05 | T06, T16, T20, T25 |
| CA-06 | T01, T06, T16, T19, T20 |
| CA-07 | T17, T19, T20 |
| CA-08 | T21, T25 |
| CA-08a | T03, T07, T14, T21, T25 |
| CA-09 | T05, T07, T14, T21 |
| CA-10 | T05, T08, T13, T16, T17, T21, T25 |
| CA-11 | T02, T07, T11, T15, T16, T21, T24, T25 |
| CA-12 | T08, T16, T21 |
| CA-13 | T07, T17, T22 |
| CA-14 | T03, T07, T22 |
| CA-15 | T07, T22 |
| CA-16 | T09, T16, T23, T25 |
| CA-17 | T09, T23 |
| CA-18 | T05, T09, T13, T16 |
| CA-19 | T04, T10 |
| CA-20 | T05, T10, T13 |
| CA-21 | T02, T07, T08 |

Todos os 22 critérios aparecem em ao menos uma tarefa.
