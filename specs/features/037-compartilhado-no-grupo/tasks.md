---
spec: "037"
status: done # todo | in-progress | done
---

# Tarefas — 037 Grupos 4/5 — Compartilhado

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0018](../../../docs/adr/0018-quizzes-compartilhados-no-grupo.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.
>
> Nenhum adapter de serviço externo muda (storage e realtime ficam iguais), por isso não há `*.int.test.ts` novo. Os repositórios novos e o índice refeito são testados com PGlite.

## Fase 1 — Domínio

- [x] **T01** `core/groups` — quiz compartilhado e permissões
  - Teste: `groups/domain/group-permissions.test.ts`:
    - "canShare: the admin always, a member only with membersCanShare"
    - "assertCanShare refuses with GROUP.SHARE_NOT_ALLOWED"
    - "canUnshare: who shared and the admin"
  - Teste: `groups/domain/shared-quiz.test.ts`:
    - "sharedQuizzesPostKind: one quiz is quizShare, more are quizzesShare"
    - "SHARED_QUIZ_SORTS and a page of 20"
  - Implementar:
    - `shared-quiz.ts` (`SharedQuiz`, `SHARED_QUIZ_SORTS`, `SHARED_QUIZZES_PAGE_SIZE`, `sharedQuizzesPostKind`);
    - `canShare`, `assertCanShare` e `canUnshare` em `group-permissions.ts`;
    - em `group-errors.ts`: `ShareNotAllowedError`, `QuizNotShareableError`, `QuizAlreadySharedError`, `SharedQuizNotFoundError` (NotFound) e `UnshareNotAllowedError`.
  - Cobre: CA-01, CA-14 · RN-01, RN-06, RN-13, RN-14, RN-15

- [x] **T02** `core/groups` — publicações de kahoot
  - Teste: `groups/domain/group-post.test.ts`:
    - "postHeadlineOf: quizShare alive is quiz, without its share is file"
    - "postHeadlineOf: quizzesShare is always quizzes"
  - Implementar:
    - `GROUP_POST_KINDS` com `quizShare` e `quizzesShare`;
    - `GroupPost.sharedQuizId`, e `null` nos usos atuais e no fake;
    - `GroupPostHeadline` com `quiz` e `quizzes`.
  - Cobre: CA-02, CA-03, CA-14 · RN-06, RN-09, RN-13

- [x] **T03** [P] `core/quiz` — `copyQuiz` com o dono da cópia
  - Teste: `quiz/domain/quiz.test.ts` › "copyQuiz gives the copy the new owner"
  - Implementar:
    - `copyQuiz(source, { id, ownerId, coverImageKey, now })`;
    - o `duplicateQuiz` passa o mesmo dono, e os testes dele continuam verdes.
  - Cobre: CA-13 · RN-21

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T04** `core/shared` — porta `QuizShareGrants` e fake
  - Teste: `shared/testing/in-memory-quiz-share-grants.test.ts` › "canUse only after grant(userId, quizId); revoke takes it back"
  - Implementar:
    - `shared/application/ports/quiz-share-grants.ts`;
    - `shared/testing/in-memory-quiz-share-grants.ts`.
  - Cobre: CA-18 · ADR 0018 (3)

- [x] **T05** `core/groups` — portas e fakes do compartilhado
  - Teste: `groups/testing/in-memory-shared-quizzes.test.ts`:
    - "shareWithPost writes the rows and the post, or nothing when a quiz is already shared"
    - "list hides trashed and unpublished quizzes and sorts recent, oldest, nameAsc, nameDesc"
    - "removing a member removes their shares"
  - Implementar:
    - `ports/group-shared-quiz-repository.ts` e `ports/shared-quiz-reads.ts`, com as assinaturas do plano;
    - o `InMemoryGroupStore` com `shareWithPost`, `findSharedQuiz`, `removeSharedQuiz` e `sharedQuizIdsOf`;
    - o `InMemorySharedQuizReads`, que recebe os quizzes num `seed`;
    - `groupsTestDeps` com os dois fakes.
  - Cobre: CA-05, CA-06, CA-16, CA-17 · RN-04, RN-14, RN-22, RN-23

- [x] **T06** `core/groups` — `shareQuizzesInGroup`
  - Teste: `groups/application/share-quizzes-in-group.test.ts`:
    - "shares one quiz with a quizShare post that points at its share, with an optional message"
    - "shares several quizzes with one quizzesShare post without text"
    - "refuses a member without membersCanShare with GROUP.SHARE_NOT_ALLOWED"
    - "refuses drafts, trashed and foreign quizzes with GROUP.QUIZ_NOT_SHAREABLE and shares none"
    - "refuses a quiz already in the group with GROUP.QUIZ_ALREADY_SHARED and writes nothing"
    - "refuses a non-member with GROUP.NOT_FOUND"
  - Implementar: `share-quizzes-in-group.ts`
  - Cobre: CA-01, CA-02, CA-03, CA-04, CA-05 · RN-01, RN-02, RN-04, RN-06, RN-08

- [x] **T07** `core/groups` — `unshareQuiz` e o anexo na leitura
  - Teste: `groups/application/unshare-quiz.test.ts`:
    - "who shared and the admin remove it from the group"
    - "another member is refused with GROUP.UNSHARE_NOT_ALLOWED"
    - "a quiz not in the group is GROUP.SHARED_QUIZ_NOT_FOUND"
  - Teste: `groups/application/group-shared-posts.test.ts`:
    - "a quizShare post shows the quiz card while its share is alive"
    - "loses the card after unshare, a trashed quiz or a new share of the same quiz"
    - "deleting a quizzesShare post keeps the shares"
  - Implementar:
    - `unshare-quiz.ts`;
    - `postViewsOf` com `quiz: SharedQuizCardView | null` e `headline` (`group-post-view.ts`).
  - Cobre: CA-14, CA-15, CA-16 · RN-09, RN-11, RN-12, RN-13, RN-23

- [x] **T08** `core/groups` — a aba e a página
  - Teste: `groups/application/list-shared-quizzes.test.ts`:
    - "lists alive shares in the chosen order, 20 per page with hasMore"
    - "each card has cover URL, question count, owner, visibility, sharedAt and games"
    - "listSharedQuizIds returns the group's quiz ids"
  - Teste: `groups/application/get-shared-quiz.test.ts`:
    - "returns the published version with answers, image URLs, games, participants and ownedByViewer"
    - "a quiz not shared or in the trash is GROUP.SHARED_QUIZ_NOT_FOUND"
    - "an outsider gets GROUP.NOT_FOUND"
  - Implementar: `list-shared-quizzes.ts`, `list-shared-quiz-ids.ts`, `get-shared-quiz.ts`; `GroupView.abilities.canShare` (`get-group.ts`)
  - Cobre: CA-06, CA-07, CA-08, CA-09, CA-18 · RN-14, RN-15, RN-16, RN-17, RN-25

- [x] **T09** [P] `core/quiz` — `duplicateSharedQuiz`
  - Teste: `quiz/application/duplicate-shared-quiz.test.ts`:
    - "copies the published version's questions, not the owner's working copy"
    - "copies the cover and images under the member's keys and gives the draft '(cópia)'"
    - "refuses without a grant, a trashed quiz or a draft with QUIZ.NOT_FOUND"
  - Implementar:
    - `duplicate-shared-quiz.ts`;
    - `copyQuizContent`, extraída de `duplicate-quiz.ts` e usada pelos dois.
  - Cobre: CA-09, CA-13, CA-18 · RN-17, RN-21

- [x] **T10** [P] `core/game` — usar o quiz compartilhado
  - Teste: `game/application/host-game.test.ts`:
    - "a member with a grant hosts somebody else's quiz as their own game"
    - "hosting ends only the open live game of the same host"
    - "refuses without a grant with GAME.QUIZ_NOT_FOUND"
  - Teste: `game/application/create-assignment.test.ts`:
    - "a member with a grant assigns a shared quiz as their own assignment"
    - "refuses without a grant"
  - Implementar:
    - `quizShareGrants` em `host-game.ts` e `create-assignment.ts`;
    - `endGamesOfQuiz` e `listUnendedByQuiz` com `ownerId` opcional, incluindo o fake;
    - a exclusão do quiz continua encerrando as partidas de todos.
  - Cobre: CA-11, CA-12, CA-18 · RN-19, RN-20

- [x] **T11** [P] `core/reports` — Jogar novamente com a permissão
  - Teste: `reports/application/get-report.test.ts`:
    - "the quiz link is only for its owner"
    - "playQuizId for the owner or a member with a grant, null otherwise"
  - Teste: `list-reports.test.ts` › "playQuizId follows the same rule in the list"
  - Implementar:
    - `ReportHeader.quiz.ownerId`;
    - `quizLinksOf` com o leitor e `canUse`;
    - `quizShareGrants` em `getReport` e `listReports`.
  - Cobre: CA-18 · RN-24

## Fase 3 — Adapters (banco)

- [x] **T12** `db` — schema e migração
  - Teste: `drizzle-group-shared-quiz.test.ts` (PGlite):
    - "one share per group and quiz"
    - "deleting the quiz, the sharer's membership or the group removes the share"
    - "a quizShare post requires shared_quiz_id and other kinds refuse it"
  - Teste: `drizzle-game-repositories.test.ts` › "one open live game per quiz and host; two hosts may play the same quiz"
  - Implementar:
    - em `schema/groups.ts`: a tabela `group_shared_quiz` com as fks e os índices, os valores novos do enum, `group_post.shared_quiz_id` e o check;
    - em `schema/game.ts`: `game_unended_quiz_idx` em `(quiz_id, owner_id)`;
    - `pnpm db:generate` (0012): conferir o `ALTER TYPE … ADD VALUE` e o `DROP`/`CREATE` do índice;
    - `pnpm -F @quizio/db db:push` e, no banco local, o `DROP`/`CREATE` do índice à mão.
  - Cobre: CA-05, CA-11, CA-16, CA-17 · RN-04, RN-19, RN-22

- [x] **T13** `db` — repositório e leituras do compartilhado
  - Teste: `drizzle-group-shared-quiz.test.ts`:
    - "shareWithPost inserts rows and post in one transaction; alreadyShared writes nothing"
    - "findSharedQuiz, removeSharedQuiz, sharedQuizIdsOf"
  - Teste: `drizzle-shared-quiz-reads.test.ts`:
    - "shareable keeps the owner's published quizzes out of the trash"
    - "list hides trashed quizzes and sorts by sharedAt and by name with accents"
    - "games counts started live games and assignments of any host; participants counts their players"
    - "detail returns the version's questions and description; cards by share ids"
  - Implementar:
    - `drizzle-group-shared-quiz-repository.ts`, `drizzle-shared-quiz-reads.ts`;
    - `sharedQuizId` em `drizzle-group-post-repository.ts` e `drizzle-group-feed-query.ts`.
  - Cobre: CA-02, CA-05, CA-06, CA-07, CA-08, CA-16 · RN-06, RN-14, RN-15, RN-16

- [x] **T14** [P] `db` — permissões, partidas e relatórios
  - Teste: `drizzle-quiz-share-grants.test.ts`:
    - "canUse when the quiz is shared in a group the user belongs to"
    - "not after unshare, leaving the group, or for an outsider"
  - Teste: `drizzle-game-repositories.test.ts` › "listUnendedByQuiz filters by owner"
  - Teste: `drizzle-report-game-query.test.ts` › "the header's quiz has its ownerId"
  - Implementar:
    - `repositories/shared/drizzle-quiz-share-grants.ts`;
    - o filtro por dono em `drizzle-game-repository.ts`;
    - `ownerId` no cabeçalho do relatório.
  - Cobre: CA-11, CA-17, CA-18 · RN-19, RN-22, RN-24

## Fase 4 — API (routers + composition root)

- [x] **T15** `api` — procedures e ligações
  - Teste: `routers/group-shared.test.ts` (`createTestApi`):
    - "group.share shares one or several and the feed shows the post"
    - "group.share refuses a member without the switch"
    - "group.unshare by the sharer and the admin only"
    - "group.shared.list sorts and pages; group.shared.ids; group.shared.get for members only"
    - "quiz.duplicateShared copies for a member of the group"
    - "game.host and assignment.create accept a shared quiz"
  - Implementar:
    - em `routers/group.ts`: `share`, `unshare` e `shared.{list,ids,get}`;
    - `duplicateShared` em `routers/quiz.ts`;
    - `container.ts`, `composition-root.ts` e `test-context.ts`, com `quizShareGrants` em `hostGame`, `createAssignment`, `duplicateSharedQuiz`, `getReport` e `listReports`.
  - Cobre: CA-01 a CA-05, CA-08, CA-11 a CA-14, CA-18

## Fase 5 — UI (componentes do app → rotas)

- [x] **T16** `web` — rótulos, erros e estado da seleção
  - Teste: `lib/share-quizzes-state.test.ts`:
    - "toggles selection, keeps it across searches, never selects an already shared quiz"
    - "the button says Compartilhar 1 kahoot / Compartilhar N kahoots and is off with none"
  - Teste: `lib/group-post-labels.test.ts` › "headline labels for quiz and quizzes"
  - Teste: `lib/group-error-messages.test.ts` › "messages for the share codes"
  - Implementar:
    - `lib/share-quizzes-state.ts`;
    - `group-post-labels.ts` e `group-error-messages.ts`;
    - `share`, `unshare` e `duplicateShared` em `lib/group-mutations.ts`.
  - Cobre: CA-02, CA-03, CA-05 · RN-05, RN-06

- [x] **T17** `web` — "Selecionar kahoot" para compartilhar
  - Teste: `components/groups/shared/share-quizzes-dialog.test.tsx`:
    - "selects several quizzes with ✓ Selecionado and shares them"
    - "marks Já compartilhado and keeps it unavailable"
    - "Fechar closes without sharing; a refusal keeps the dialog open with the reason"
  - Teste: `components/groups/assign/select-quiz-dialog.test.tsx` › "single mode still picks one quiz"
  - Implementar:
    - `SelectQuizDialog` com `mode` e `sharedIds`;
    - `ShareQuizzesDialog`.
  - Cobre: CA-02, CA-03, CA-05 · RN-04, RN-05, RN-06, RN-07

- [x] **T18** `web` — Compart. na caixa e "Compartilhar kahoot" na publicação
  - Teste: `components/groups/group-activity.test.tsx` › "Compart. opens the share dialog for who can share and is hidden otherwise"
  - Teste: `components/groups/post/create-post-flow.test.tsx`:
    - "Compartilhar kahoot picks one quiz and comes back with its card, without settings"
    - "Publicar sends group.share with the message"
  - Teste: `lib/group-post-state.test.ts` › "a shared quiz is the attachment"
  - Implementar:
    - `group-activity.tsx` e `create-post-dialog.tsx` (a faixa sem "Em breve", por `canShare`);
    - `create-post-flow.tsx`, `group-post-state.ts`;
    - a rota do grupo.
  - Cobre: CA-01, CA-04 · RN-03, RN-08

- [x] **T19** `web` — publicações de kahoot no mural
  - Teste: `components/groups/group-post.test.tsx`:
    - "compartilhou um kahoot shows the card with Iniciar and its menu"
    - "compartilhou múltiplos kahoots links to the shared tab and has no card"
    - "a removed share shows compartilhou um arquivo and the dashed box"
  - Teste: `components/groups/shared/shared-quiz-menu.test.tsx`:
    - "everybody gets Duplicar; who shared and the admin get Remover do grupo"
    - "Remover do grupo? confirms and unshares"
  - Implementar: `SharedQuizAttachment`, `SharedQuizMenu`, `group-post.tsx`
  - Cobre: CA-02, CA-03, CA-13, CA-14, CA-15 · RN-09 a RN-13

- [x] **T20** `web` — aba Compartilhado
  - Teste: `components/groups/shared/shared-quizzes-tab.test.tsx`:
    - "shows Kahoots as cards with cover, question count, title and owner"
    - "the list has Título with N partidas, Criado por, Visibilidade and Compartilhados"
    - "Ordenar por changes the sort in the address; the view is remembered"
    - "Mostrar mais asks for the next 20"
    - "empty: the text with Compart. for who can share, without it otherwise"
  - Implementar:
    - `SharedQuizzesTab`, `SharedQuizCard` e `SharedQuizRow`;
    - `sort` no `validateSearch` da rota do grupo, e a aba no lugar de "Em breve".
  - Cobre: CA-06, CA-07 · RN-14, RN-15

- [x] **T21** `web` — página do quiz compartilhado
  - Teste: `components/groups/shared/shared-quiz-page.test.tsx`:
    - "shows owner, cover, title, description, N jogos, N participantes and Perguntas (N) without answers"
    - "Mostrar respostas shows the answers with the right ones marked"
    - "Editar opens Duplique para editar; Cancelar closes and Duplicar duplicates"
    - "Organizar ao vivo and Atribuir call their actions"
    - "a quiz no longer in the group shows the message and the way back"
  - Implementar:
    - `SharedQuizPage`, `SharedQuestionList`, `DuplicateToEditDialog`;
    - a rota `groups.$groupId.quizzes.$quizId.tsx`, que manda o dono para `/quizzes/$quizId`, liga `game.host`, `useAssignQuiz` e `quiz.duplicateShared` e navega para o editor.
  - Cobre: CA-08, CA-09, CA-10, CA-11, CA-12, CA-13, CA-18 · RN-10, RN-16 a RN-21, RN-25

- [x] **T22** [P] `web` — relatórios com `playQuizId`
  - Teste: `components/reports/report-header.test.tsx` › "links the quiz title only with quizId"
  - Teste: `routes` / `reports-list` › "Jogar novamente uses playQuizId"
  - Implementar:
    - `api-types.ts`;
    - `reports.$gameId.tsx` e `reports.index.tsx`, com "Jogar novamente" por `playQuizId`.
  - Cobre: CA-18 · RN-24

## Fase 6 — E2E e fechamento

- [x] **T23** E2E — `apps/web/e2e/group-shared.spec.ts`
  - "admin compartilha dois quizzes; o membro abre, vê as respostas, organiza ao vivo e duplica"
  - "o membro compartilha um quiz pela publicação; quem compartilhou remove do grupo"
  - "sem a chave, o membro não compartilha"
  - Rodar com o preview parado, `--workers=2`.
  - Cobre: CA-01, CA-02, CA-04, CA-08, CA-11, CA-13, CA-14

- [x] **T24** Fechamento
  - `pnpm check` (Biome só nos arquivos alterados, CRLF), `pnpm test` (por pacote, se a máquina estiver carregada), `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, `pnpm test:e2e` dos grupos
  - Atualizar `spec.md` (status `done`, changelog), `glossary.md` (✅), `roadmap.md` (037 ✅ com os links), `CLAUDE.md` (seção do Compartilhado), `docs/deploy.md` se a migração pedir cuidado, e a nota do ADR 0009 sobre a partida por anfitrião

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T01, T06, T15, T18, T23 |
| CA-02 | T02, T06, T13, T15, T16, T17, T19, T23 |
| CA-03 | T02, T06, T15, T16, T17, T19 |
| CA-04 | T06, T15, T18, T23 |
| CA-05 | T05, T06, T12, T13, T15, T16, T17 |
| CA-06 | T05, T08, T13, T20 |
| CA-07 | T08, T13, T20 |
| CA-08 | T08, T13, T15, T21, T23 |
| CA-09 | T08, T09, T21 |
| CA-10 | T21 |
| CA-11 | T10, T12, T14, T15, T21, T23 |
| CA-12 | T10, T15, T21 |
| CA-13 | T03, T09, T15, T19, T21, T23 |
| CA-14 | T01, T02, T07, T15, T19, T23 |
| CA-15 | T07, T19 |
| CA-16 | T05, T07, T12, T13 |
| CA-17 | T05, T12, T14 |
| CA-18 | T04, T08, T09, T10, T11, T14, T15, T21, T22 |

Todos os 18 CAs da spec aparecem em ao menos uma tarefa.
