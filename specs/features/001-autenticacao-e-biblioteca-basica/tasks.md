---
spec: "001"
status: todo # todo | in-progress | done
---

# Tarefas — 001 Autenticação e biblioteca básica

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando. `[P]` = pode ser feita em paralelo com as outras `[P]` da mesma fase, desde que as dependências indicadas estejam prontas.

## Fase 1 — Domínio

- [ ] **T01** `[P]` `core/shared` — texto pesquisável e contagem de caracteres
  - Teste: `packages/core/src/shared/domain/search-text.test.ts` › "strips accents, lowercases and collapses whitespace"; `text-length.test.ts` › "counts emoji and composed accents as one character"
  - Implementar: `shared/domain/search-text.ts` (`normalizeSearchText`), `shared/domain/text-length.ts` (`characterCount`)
  - Cobre: CA-20, RN-19

- [ ] **T02** `[P]` `core/shared` — chave de mídia por dono
  - Teste: `packages/core/src/shared/domain/media-key.test.ts` › "builds owner-scoped keys, detects ownership and reads the extension"; os testes existentes de `request-media-upload.test.ts` continuam verdes
  - Implementar: `shared/domain/media-key.ts` (`mediaKeyFor`, `isMediaKeyOwnedBy`, `mediaKeyExtension`); refatorar `media/application/request-media-upload.ts` para usá-lo
  - Cobre: RN-15

- [ ] **T03** `[P]` `core/identity` — regras de cadastro
  - Teste: `packages/core/src/identity/domain/sign-up-rules.test.ts` › "accepts names of 2 and 50 characters and rejects 1 and 51"; "trims names and lowercases trimmed emails"; "exposes password limits of 8 to 128"
  - Implementar: `identity/domain/sign-up-rules.ts` (`CREATOR_NAME_LENGTH`, `PASSWORD_LENGTH`, `normalizeCreatorName`, `normalizeEmail`, `assertCreatorName`, `InvalidCreatorNameError`)
  - Cobre: CA-03, RN-02

- [ ] **T04** `core/quiz` — dados do quiz (value objects) — depende de T01
  - Teste: `packages/core/src/quiz/domain/quiz-details.test.ts` › "treats blank titles as absent and displays 'Quiz sem título'"; "accepts a 95-character title and rejects 96"; "accepts a 500-character description and rejects 501"; "rejects visibilities other than private and unlisted"; "truncates the base so a duplicate title fits 95 characters"; "builds the search text from the display title"
  - Implementar: `quiz/domain/quiz-details.ts` e os erros `QuizTitleTooLongError`, `QuizDescriptionTooLongError`, `InvalidQuizVisibilityError`
  - Cobre: CA-15, CA-16, CA-22, RN-12, RN-13, RN-14, RN-19, RN-20

- [ ] **T05** `core/quiz` — agregado `Quiz` — depende de T04
  - Teste: `packages/core/src/quiz/domain/quiz.test.ts` › "creates a private draft stamped with the creation time"; "changing details bumps updatedAt and is refused in the trash"; "trashing keeps updatedAt and is idempotent"; "restoring clears trashedAt, keeps every other field and is idempotent"; "only trashed quizzes can be deleted permanently"; "copying refuses trashed quizzes and uses the duplicate title with new timestamps"; "treats a missing or foreign quiz as not found"
  - Implementar: `shared/domain/not-found-error.ts`; `quiz/domain/quiz.ts` (`newQuiz`, `changeQuizDetails`, `trashQuiz`, `restoreQuiz`, `assertPermanentlyDeletable`, `copyQuiz`, `requireOwnedQuiz`); erros `QuizNotFoundError`, `QuizInTrashError`, `QuizNotInTrashError`, `InvalidCoverImageError`
  - Cobre: CA-19, CA-21, CA-23, CA-24, CA-25, CA-26, RN-10, RN-11, RN-18, RN-20, RN-21, RN-22, RN-23, RN-24

- [ ] **T06** `[P]` `core/library` — seções e pesquisa — depende de T01
  - Teste: `packages/core/src/library/domain/library-search.test.ts` › "returns null for blank searches and normalized text otherwise"; "lists the recent, drafts and trash sections"
  - Implementar: `library/domain/library-section.ts`, `library/domain/library-search.ts`
  - Cobre: CA-20, RN-16, RN-17, RN-19

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [ ] **T07** `core` — portas e fakes — depende de T05
  - Teste: `packages/core/src/quiz/testing/in-memory-quiz-repository.test.ts` › "saves, finds, overwrites and deletes quizzes"; `packages/core/src/shared/testing/in-memory-object-storage.test.ts` › "copies an existing object to a new key"
  - Implementar: `quiz/application/ports/quiz-repository.ts`; `quiz/testing/in-memory-quiz-repository.ts`; `copy` na porta `shared/application/ports/object-storage.ts` e em `InMemoryObjectStorage` (mais `keys()`); `quiz/application/quiz-details-view.ts` (`toQuizDetailsView`)
  - Cobre: RN-10, RN-15

- [ ] **T08** `core/quiz` — criar quiz — depende de T02, T07
  - Teste: `packages/core/src/quiz/application/create-quiz.test.ts` › "creates a private draft with zero questions stamped now"; "stores an owned, uploaded cover"; "rejects cover keys from another owner or missing in storage without creating the quiz"; "rejects titles above the limit"
  - Implementar: `quiz/application/create-quiz.ts` (`createCreateQuiz`)
  - Cobre: CA-14, CA-15, CA-17, RN-11, RN-12, RN-14, RN-15

- [ ] **T09** `[P]` `core/quiz` — detalhes do quiz — depende de T07
  - Teste: `packages/core/src/quiz/application/get-quiz-details.test.ts` › "returns details with the cover URL and zero questions"; "returns trashed quizzes flagged with trashedAt"; "treats another owner's quiz as not found"
  - Implementar: `quiz/application/get-quiz-details.ts`
  - Cobre: CA-19, CA-24, CA-28, RN-10

- [ ] **T10** `core/quiz` — editar dados e capa — depende de T02, T07
  - Teste: `packages/core/src/quiz/application/update-quiz-details.test.ts` › "saves new details and bumps updatedAt"; "leaves the quiz unchanged when a limit is exceeded"; "replacing the cover deletes the previous object after saving"; "removing the cover deletes its object"; "rejects foreign or missing cover keys"; "refuses quizzes in the trash"; "treats another owner's quiz as not found"
  - Implementar: `quiz/application/update-quiz-details.ts` (`CoverChange`)
  - Cobre: CA-16, CA-17, CA-18, CA-19, CA-24, RN-15, RN-18, RN-22

- [ ] **T11** `[P]` `core/quiz` — duplicar — depende de T02, T07
  - Teste: `packages/core/src/quiz/application/duplicate-quiz.test.ts` › "creates an independent draft copy with the cover copied to a new key"; "leaves the original untouched"; "fits the copy title in 95 characters"; "refuses quizzes in the trash"; "treats another owner's quiz as not found"
  - Implementar: `quiz/application/duplicate-quiz.ts`
  - Cobre: CA-19, CA-21, CA-22, CA-24, RN-20, RN-22

- [ ] **T12** `[P]` `core/quiz` — lixeira e restaurar — depende de T07
  - Teste: `packages/core/src/quiz/application/move-quiz-to-trash.test.ts` › "moves the quiz to the trash without touching updatedAt"; "is idempotent"; `restore-quiz.test.ts` › "restores every field including updatedAt"; "is idempotent"; os dois › "treats another owner's quiz as not found"
  - Implementar: `quiz/application/move-quiz-to-trash.ts`, `quiz/application/restore-quiz.ts`
  - Cobre: CA-19, CA-23, CA-25, RN-18, RN-21, RN-23

- [ ] **T13** `[P]` `core/quiz` — excluir definitivamente — depende de T07
  - Teste: `packages/core/src/quiz/application/delete-quiz-permanently.test.ts` › "refuses quizzes outside the trash"; "deletes the cover object before removing the quiz"; "deletes quizzes without a cover"; "treats another owner's quiz as not found"
  - Implementar: `quiz/application/delete-quiz-permanently.ts`
  - Cobre: CA-19, CA-26, RN-24

- [ ] **T14** `[P]` `core/library` — listar biblioteca — depende de T06, T07
  - Teste: `packages/core/src/library/application/list-library.test.ts` › "recent lists non-trashed quizzes by updatedAt desc"; "drafts lists non-trashed drafts"; "trash lists trashed quizzes by trashedAt desc"; "filters by normalized title including 'Quiz sem título'"; "never returns another owner's quizzes"; "returns an empty list for an empty trash"; "maps cover keys to public URLs"
  - Implementar: `library/application/ports/library-quiz-query.ts`; `library/testing/in-memory-library-quiz-query.ts`; `library/application/list-library.ts`
  - Cobre: CA-18, CA-19, CA-20, CA-23, CA-27, RN-16, RN-17, RN-19

## Fase 3 — Adapters (repositórios, storage, autenticação)

- [ ] **T15** `db` — schema `quiz` e repositório — depende de T05, T07
  - Teste: `packages/db/src/repositories/quiz/drizzle-quiz-repository.test.ts` (PGlite) › "round-trips a quiz with every field"; "upserts on save"; "deletes a quiz"; "stores the normalized search title"; "cascades when the owner is removed"
  - Implementar: `packages/db/src/schema/quiz.ts` (enums `quiz_visibility`, `quiz_status`, índice), exportar em `schema/index.ts`; `repositories/quiz/drizzle-quiz-repository.ts`; rodar `pnpm db:push` no banco local
  - Cobre: CA-14, CA-26, RN-10, RN-11, RN-19

- [ ] **T16** `db` — consulta da biblioteca — depende de T14, T15
  - Teste: `packages/db/src/repositories/library/drizzle-library-quiz-query.test.ts` (PGlite) › "filters by owner"; "splits recent, drafts and trash"; "orders by updatedAt desc and trash by trashedAt desc"; "matches 'biblia' against 'Bom de Bíblia (Junho)' and 'BÍBLIA KIDS'"; "treats % and _ in the search literally"; "returns nothing for an empty trash"
  - Implementar: `repositories/library/drizzle-library-quiz-query.ts`
  - Cobre: CA-18, CA-19, CA-20, CA-23, CA-27, RN-16, RN-17, RN-19

- [ ] **T17** `[P]` `storage` — copiar objeto — depende de T07
  - Teste: `packages/storage/src/s3-object-storage.test.ts` › "encodes each key segment in the copy source"; `s3-object-storage.int.test.ts` › "copies an object so deleting the copy keeps the original"
  - Implementar: `copy` em `packages/storage/src/s3-object-storage.ts` (`CopyObjectCommand`)
  - Cobre: CA-17, CA-21, RN-20

- [ ] **T18** `auth` — fábrica `createAuth`, cadastro e login por e-mail — depende de T03
  - Teste: `packages/auth/src/create-auth.test.ts` (PGlite, via `auth.handler`) › "creates the account and a session on email sign-up"; "rejects sign-up with an existing email regardless of case and surrounding spaces"; "rejects names of 1 and 51 characters and passwords of 7 and 129"; "signs in with correct credentials"; "returns the same error for an unknown email and a wrong password"
  - Implementar: `packages/auth/src/create-auth.ts` (opções do plano, hook `before` de `/sign-up/email`); `src/index.ts` só monta a instância de produção; `vitest.config.ts` e scripts `test`/`check-types` em `packages/auth`; exportar `createTestDb` para uso no pacote; `AUTH_SIGN_UP_ENABLED` em `packages/env/src/server.ts`
  - Cobre: CA-01, CA-02, CA-03, CA-04, CA-05, RN-01, RN-02, RN-06, RN-08

- [ ] **T19** `auth` — limite de tentativas persistido — depende de T18
  - Teste: `create-auth.test.ts` › "blocks sign-in after 5 failed attempts and allows it again after the window" (`vi.setSystemTime`)
  - Implementar: `rateLimit` com `storage: "database"` e `customRules`; regenerar `packages/db/src/schema/auth.ts` com `npx @better-auth/cli generate` (tabela `rateLimit`); `pnpm db:push`
  - Cobre: CA-06, RN-07

- [ ] **T20** `auth` — Google, vínculo e cadastro desligado — depende de T18
  - Teste: `create-auth.test.ts` › "creates an account on first Google sign-in"; "links Google sign-in to the existing account with the same email"; "with sign-up disabled rejects email sign-up and new Google users with signup_disabled"; "with sign-up disabled existing users still sign in with password and Google" (ID token com `verifyIdToken`/`getUserInfo` simulados)
  - Implementar: `socialProviders.google` e `account.accountLinking` em `create-auth.ts`; `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` opcionais e juntos (`refine`) em `packages/env/src/server.ts`; `apps/web/.env.example`
  - Cobre: CA-07, CA-08, CA-09, RN-03, RN-04, RN-05

## Fase 4 — API (routers + composition root)

- [ ] **T21** `api` — router `quiz`, erros `NOT_FOUND` e ligações — depende de T08–T13, T15
  - Teste: `packages/api/src/routers/quiz.test.ts` › "creates, fetches and updates a quiz for the signed-in owner"; "maps another owner's quiz to NOT_FOUND with domainCode QUIZ.NOT_FOUND"; "maps editing a trashed quiz to BAD_REQUEST with domainCode QUIZ.IN_TRASH"; "duplicates, trashes, restores and deletes permanently"; "requires authentication"
  - Implementar: `NotFoundError → NOT_FOUND` no middleware de `src/index.ts`; `src/routers/quiz.ts`; `Adapters`/`useCases` em `container.ts`; repositório Drizzle e `createDb` compartilhado em `composition-root.ts`; remover `privateData` de `routers/index.ts`
  - Cobre: CA-14, CA-19, CA-24, CA-26, RN-10

- [ ] **T22** `[P]` `api` — router `library` — depende de T14, T16, T21
  - Teste: `packages/api/src/routers/library.test.ts` › "lists a section for the signed-in owner only"; "passes the search through the library use case"; "requires authentication"
  - Implementar: `src/routers/library.ts`; `libraryQuizzes` no container e na composition root
  - Cobre: CA-19, CA-20

- [ ] **T23** `[P]` `api` — router `auth.settings` — depende de T20, T21
  - Teste: `packages/api/src/routers/auth.test.ts` › "exposes whether sign-up and Google sign-in are enabled"
  - Implementar: `src/routers/auth.ts`; `authSettings` no container e na composition root (a partir do env)
  - Cobre: CA-09, RN-03, RN-05

## Fase 5 — UI (design system → componentes do app → rotas)

- [ ] **T24** `[P]` `ui` — componentes novos no design system
  - Teste: `packages/ui/src/components/badge.test.tsx` › "renders private and unlisted visibility variants"; `alert-dialog.test.tsx` › "calls the confirm action only after confirmation"
  - Implementar: `npx shadcn@latest add dialog alert-dialog radio-group badge -c packages/ui` e reestilizar ao visual Kahoot; ajustar `input.tsx`/`textarea.tsx` (`h-10`, `text-sm`, foco `ring-primary`); acrescentar à página `/design-system`
  - Cobre: RN-14, RN-24, RN-25

- [ ] **T25** `[P]` `web/lib` — utilitários
  - Teste: `apps/web/src/lib/safe-redirect.test.ts` › "accepts internal paths and falls back to /library for external, protocol-relative and backslash paths"; `format-relative-time.test.ts` › "formats 'agora' and 'há 2 meses' in pt-BR"; `auth-error-messages.test.ts` › "maps invalid credentials, existing email, invalid name, rate limit and signup_disabled to Portuguese messages"; `upload-file.test.ts` › "sends the file with the presigned headers and reports progress"
  - Implementar: `apps/web/src/lib/safe-redirect.ts`, `format-relative-time.ts`, `auth-error-messages.ts`, `upload-file.ts`
  - Cobre: CA-05, CA-12, RN-06, RN-07, RN-25

- [ ] **T26** `web` — telas de entrada — depende de T20, T23, T24, T25
  - Teste: `apps/web/src/components/auth/sign-up-form.test.tsx` › "shows a message for each invalid field"; "shows the closed notice instead of the form when sign-up is disabled"; `sign-in-form.test.tsx` › "shows the generic credentials message"; "hides the Google button when Google is disabled"
  - Implementar: `routes/login.tsx` (`validateSearch` `mode`/`redirect`/`error`); `components/auth/sign-in-form.tsx`, `sign-up-form.tsx`, `google-sign-in-button.tsx` (PT-BR, limites do core); redirecionamento `?redirect=` em `routes/_auth/route.tsx`; remover `routes/_auth/dashboard.tsx`; `header.tsx`, `user-menu.tsx` e home em PT-BR apontando para `/library`
  - Cobre: CA-03, CA-05, CA-09, CA-10, CA-12, RN-03, RN-05, RN-09, RN-25

- [ ] **T27** `web` — página da biblioteca — depende de T22, T24, T25
  - Teste: `apps/web/src/components/library/library-empty-state.test.tsx` › "offers to create the first quiz in an empty library"; "shows the empty trash message"; "shows the no results message for a search"; `quiz-list-item.test.tsx` › "shows cover, display title, zero questions, visibility and relative time"; "offers edit, duplicate and delete outside the trash and restore or delete permanently inside it"
  - Implementar: `routes/_auth/library.tsx` (`section`, `q`); `components/library/library-nav.tsx`, `library-search.tsx` (debounce 300 ms), `quiz-list.tsx`, `quiz-list-item.tsx`, `library-empty-state.tsx`; `components/quiz/quiz-cover.tsx`
  - Cobre: CA-13, CA-20, CA-27, RN-16, RN-17, RN-19

- [ ] **T28** `web` — criar e editar dados do quiz com capa — depende de T21, T24, T25, T27
  - Teste: `apps/web/src/components/quiz/quiz-details-dialog.test.tsx` › "counts title and description characters and blocks saving above the limits"; "creates a private quiz by default"; `cover-image-field.test.tsx` › "uploads, previews and removes the cover"; "keeps the previous cover when the upload fails"
  - Implementar: `components/quiz/quiz-details-dialog.tsx`, `cover-image-field.tsx`; hooks de criação/edição em `lib/quiz-mutations.ts` (invalidam `library.list` e `quiz.get`)
  - Cobre: CA-14, CA-15, CA-16, CA-17, CA-18, RN-12, RN-13, RN-14, RN-15

- [ ] **T29** `web` — detalhes do quiz, lixeira e exclusão definitiva — depende de T27, T28
  - Teste: `apps/web/src/components/quiz/quiz-details-view.test.tsx` › "shows cover, title, description, visibility, zero questions and last change with edit, duplicate and delete actions"; "shows the trash notice with only restore and delete permanently"; `delete-permanently-dialog.test.tsx` › "keeps the quiz when cancelled and deletes it when confirmed"
  - Implementar: `routes/_auth/quizzes.$quizId.tsx` (incluindo "quiz não encontrado"); `components/quiz/quiz-details-view.tsx`, `delete-permanently-dialog.tsx`; duplicar, mover para a lixeira com toast **Desfazer**, restaurar e excluir definitivamente em `lib/quiz-mutations.ts`
  - Cobre: CA-21, CA-23, CA-24, CA-25, CA-26, CA-28, RN-20, RN-21, RN-22, RN-24

## Fase 6 — E2E e fechamento

- [ ] **T30** `[P]` `web/e2e` — fluxos de conta — depende de T26, T27
  - Teste: `apps/web/e2e/auth.spec.ts` › "signs up and lands on the empty library"; "signs in and out, and the library then requires login"; "keeps the session in a new browser context with the saved storage state"; "returns to the requested quiz page after login"
  - Implementar: ajustes que o E2E revelar; e-mail único por teste
  - Cobre: CA-01, CA-04, CA-10, CA-11, CA-12, CA-13

- [ ] **T31** `[P]` `web/e2e` — fluxos da biblioteca — depende de T28, T29
  - Teste: `apps/web/e2e/library.spec.ts` › "creates a quiz with a PNG cover that tops Recentes and Rascunhos"; "searches ignoring accents"; "duplicates a quiz"; "deletes to the trash and undoes"; "deletes permanently after confirming, and the cover URL stops responding"
  - Implementar: ajustes que o E2E revelar (requer `pnpm infra:up`)
  - Cobre: CA-14, CA-17, CA-20, CA-21, CA-23, CA-26

- [ ] **T32** `[P]` Google OAuth — configuração e verificação manual — depende de T26
  - Teste: verificação manual com um projeto OAuth de teste. Primeiro acesso cria a conta (CA-07); e-mail já cadastrado entra na mesma conta (CA-08); com `AUTH_SIGN_UP_ENABLED=false`, um e-mail novo volta ao login com a mensagem de cadastros fechados (CA-09). Registrar o resultado no changelog da spec.
  - Implementar: instruções de criação do cliente OAuth e redirect URI em `apps/web/.env.example` e no checklist de deploy de `specs/roadmap.md`
  - Cobre: CA-07, CA-08, CA-09

- [ ] **T33** Fechamento
  - `pnpm check`, `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, `pnpm test:int` e `pnpm test:e2e` verdes
  - `docs/architecture.md`: `NotFoundError → NOT_FOUND`, contexto `identity` no core, *read model* da `library`
  - `CLAUDE.md`: variáveis `AUTH_SIGN_UP_ENABLED`, `GOOGLE_*`; rotas `/login`, `/library`, `/quizzes/$quizId`
  - `specs/glossary.md`: status ✅ para os termos implementados
  - `spec.md` → `done` com changelog; `tasks.md` → `done`; `specs/roadmap.md` → ✅

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T18, T30 |
| CA-02 | T18 |
| CA-03 | T03, T18, T26 |
| CA-04 | T18, T30 |
| CA-05 | T18, T25, T26 |
| CA-06 | T19 |
| CA-07 | T20, T32 |
| CA-08 | T20, T32 |
| CA-09 | T20, T23, T26, T32 |
| CA-10 | T26, T30 |
| CA-11 | T30 |
| CA-12 | T25, T26, T30 |
| CA-13 | T27, T30 |
| CA-14 | T08, T15, T21, T28, T31 |
| CA-15 | T04, T08, T28 |
| CA-16 | T04, T10, T28 |
| CA-17 | T08, T10, T17, T28, T31 |
| CA-18 | T10, T14, T16, T28 |
| CA-19 | T05, T09–T14, T16, T21, T22 |
| CA-20 | T01, T06, T14, T16, T22, T27, T31 |
| CA-21 | T05, T11, T17, T29, T31 |
| CA-22 | T04, T11 |
| CA-23 | T05, T12, T14, T16, T29, T31 |
| CA-24 | T05, T09, T10, T11, T21, T29 |
| CA-25 | T05, T12, T29 |
| CA-26 | T05, T13, T15, T21, T29, T31 |
| CA-27 | T14, T16, T27 |
| CA-28 | T09, T29 |

Todos os 28 critérios de aceite têm ao menos uma tarefa com teste automatizado. CA-07 e CA-08 também passam por verificação manual com o Google real (T32).
