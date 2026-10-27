---
spec: "039"
status: done # todo | in-progress | done
---

# Tarefas — 039 Conta e perfil do criador

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0019](../../../docs/adr/0019-conta-perfil-e-exclusao.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.
>
> O adapter de storage muda (`deletePrefix`), por isso há um `*.int.test.ts` (T13). As tabelas novas e o enum são testados com PGlite.

## Fase 1 — Domínio

- [x] **T01** [P] `core/shared` — chave da foto e pessoa com foto
  - Teste: `shared/domain/media-key.test.ts`:
    - "profilePhotoKeyFor builds profiles/{userId}/{id}.{ext}"
    - "isProfilePhotoKeyOwnedBy refuses another user's key and nested paths"
  - Teste: `shared/application/person-view.test.ts` › "personView builds the photo URL from the key, null without one"
  - Implementar: `media-key.ts` (`PROFILES_ROOT`, `profilePhotoKeyFor`, `isProfilePhotoKeyOwnedBy`) e `shared/application/person-view.ts` (`PersonView`, `personView`)
  - Cobre: CA-06, CA-09 · RN-06, RN-08

- [x] **T02** [P] `core/identity` — pedido de exclusão
  - Teste: `identity/domain/account-deletion.test.ts`:
    - "ACCOUNT_DELETION_REASONS keeps the eight reasons in order"
    - "parseDeletionRequest trims the feedback and turns empty into null"
    - "parseDeletionRequest refuses an unknown reason and feedback over 1000 characters"
  - Implementar: `account-deletion.ts` e os erros de `identity` (`InvalidDeletionRequestError`, `WrongPasswordError`, `EmailMismatchError`, `TooManyAttemptsError`, `InvalidProfilePhotoError`, `CreatorProfileNotFoundError`) em `identity/domain/account-errors.ts`
  - Cobre: CA-27, CA-29 · RN-36, RN-37, RN-38

- [x] **T03** [P] `core/quiz` — visibilidade Privado ou Público
  - Teste: `quiz/domain/quiz-details.test.ts`:
    - "QUIZ_VISIBILITIES is private and public"
    - "parseVisibility refuses unlisted"
  - Implementar: `QUIZ_VISIBILITIES = ["private", "public"]`. Ajustar `aQuiz`, os fakes e os testes que usam `unlisted` (`duplicate-quiz.test.ts`, entre outros) e os tipos `"private" | "unlisted"` (`SharedQuizView`), passando a `QuizVisibility`
  - Cobre: CA-19b · RN-25

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T04** `core/shared` — `deletePrefix` e a permissão de quiz público
  - Teste: `shared/testing/in-memory-object-storage.test.ts` › "deletePrefix removes only the keys under the prefix"
  - Implementar:
    - `deletePrefix` na porta `ObjectStorage` e no `InMemoryObjectStorage`;
    - a doc de `QuizShareGrants` passa a dizer "compartilhado ou público" (a regra fica no adapter, T12);
    - um fake de grants que aceita listar quizzes públicos.
  - Cobre: CA-25, CA-28 · RN-33, RN-39

- [x] **T05** `core/identity` — foto do perfil
  - Teste: `identity/application/profile-photo.test.ts`:
    - "requestProfilePhotoUpload presigns a key under profiles/{userId}/"
    - "requestProfilePhotoUpload refuses a PDF and 11 MB"
    - "setProfilePhoto refuses another user's key and a missing file"
    - "setProfilePhoto deletes the previous file"
    - "removeProfilePhoto deletes the file and returns no photo"
  - Implementar: portas `ProfilePhotoRepository` e `AccountRepository` (`find`, `delete`) e `AccountCredentials`; fakes `InMemoryProfilePhotoRepository`, `InMemoryAccountRepository` e `FakeAccountCredentials`; `request-profile-photo-upload.ts`, `set-profile-photo.ts` e `remove-profile-photo.ts`
  - Cobre: CA-04, CA-06, CA-08 · RN-07, RN-08, RN-10, RN-11

- [x] **T06** `core/identity` — conta
  - Teste: `identity/application/get-account.test.ts`:
    - "getAccount returns name, email, photoUrl and hasPassword"
    - "getAccount has no photo for a Google user until one is uploaded"
  - Implementar: `get-account.ts` (`AccountView`)
  - Cobre: CA-01, CA-10, CA-18 · RN-02, RN-05, RN-24

- [x] **T07** [P] `core/quiz` — acesso à IA
  - Teste: `quiz/application/get-assistant-status.test.ts` › "tells how many were used and when the oldest leaves the window (spec 039, RN-17)"
  - Implementar: `used` e `nextFreeInMs` em `getAssistantStatus` (a `quiz.assistant.status` que já existe serve à seção; dispensa o `getGenerationAccess` do plano, que repetiria o mesmo cálculo)
  - Cobre: CA-14, CA-15 · RN-17, RN-18, RN-19

- [x] **T08** [P] `core/quiz` — mudar a visibilidade e cópia Privada
  - Teste: `quiz/application/set-quiz-visibility.test.ts`:
    - "sets public on an owned quiz"
    - "another owner's quiz is not found"
    - "a trashed quiz cannot change"
  - Teste: `quiz/application/duplicate-shared-quiz.test.ts` › "the copy of someone else's quiz is private"
  - Teste: `quiz/application/duplicate-quiz.test.ts` › "the copy of an owned quiz keeps its visibility"
  - Implementar: `QuizRepository.saveVisibility`, o fake, `set-quiz-visibility.ts` e a visibilidade da cópia em `copyQuizContent`
  - Cobre: CA-19, CA-19a, CA-25 · RN-25, RN-25a, RN-26

- [x] **T09** `core/library` — perfil e quiz público
  - Teste: `library/application/get-creator-profile.test.ts`:
    - "lists the public quizzes with totals of games and participants"
    - "an unknown user is PROFILE_NOT_FOUND"
    - "tells the owner from a visitor"
  - Teste: `library/application/get-public-quiz.test.ts`:
    - "returns the playable version with image URLs"
    - "a quiz made private, trashed or deleted is PUBLIC_QUIZ_NOT_FOUND"
  - Implementar: porta `CreatorProfileQuery`, `InMemoryCreatorProfileQuery`, `get-creator-profile.ts` e `get-public-quiz.ts` (`PublicQuizView` com o mesmo formato de `SharedQuizView` onde servir)
  - Cobre: CA-20, CA-21, CA-24, CA-25, CA-26 · RN-27 a RN-34

- [x] **T10** `core/identity` — excluir a conta
  - Teste: `identity/application/delete-account.test.ts`:
    - "a wrong password is WRONG_PASSWORD and the account stays"
    - "the sixth wrong password in 60 s is TOO_MANY_ATTEMPTS"
    - "a Google-only account confirms with its email, another email is EMAIL_MISMATCH"
    - "stores the reason and the feedback without the user"
    - "ends games, deletes managed groups, deletes the account, then the files"
    - "deletes the group files and the media, sources and profiles prefixes"
  - Implementar: portas `AccountClosure` e `AccountDeletionFeedbackRepository`, `FakeAccountClosure` (registra a ordem), `InMemoryAccountDeletionFeedback` e `delete-account.ts`
  - Cobre: CA-28, CA-29 · RN-38, RN-39, RN-41

- [x] **T11** `core/groups` — fotos nas views do grupo
  - Teste: `groups/application/group-photos.test.ts`:
    - "group header and members carry photoUrl"
    - "feed authors, shared quiz owners and assigners carry photoUrl"
  - Implementar: porta compartilhada `ProfilePhotoKeys.keysOf(userIds)` (que o `ProfilePhotoRepository` de identity estende) e `loadPhotoUrls`; os seis casos de uso (`getGroup`, `listGroupMembers`, `postViewsOf`, `listSharedQuizzes`, `getSharedQuiz`, `listGroupAssignments`) põem `photoUrl` nas pessoas depois de ler. **Mudança do plano**: as portas de leitura dos grupos ficam como estavam, sem `join` com `profile_photo` (menos SQL mexido, o mesmo resultado na tela)
  - Cobre: CA-09 · RN-06

## Fase 3 — Adapters (repositórios, storage, auth)

- [x] **T12** `packages/db` — schema e migração
  - Teste: `repositories/identity/drizzle-identity-repositories.test.ts`:
    - "profile photo save returns the previous key and remove clears it"
    - "account delete cascades sessions, quizzes, games, managed groups, posts and likes"
    - "deletion feedback is stored without a user"
  - Teste: `repositories/quiz/drizzle-quiz-repository.test.ts`:
    - "saveVisibility writes only the visibility"
    - "an unlisted row reads as private"
  - Teste: `repositories/shared/drizzle-quiz-share-grants.test.ts`:
    - "a public published quiz out of the trash may be used by anyone"
    - "a public draft or trashed quiz may not"
  - Implementar:
    - `schema/identity.ts` (`profile_photo`, `account_deletion_feedback`) e o enum `quiz_visibility` com `public`;
    - os repositórios de `identity`, `saveVisibility` e o `OR` público em `canUse`;
    - `pnpm db:generate`, mais o `UPDATE quiz SET visibility = 'private' WHERE visibility = 'unlisted'` à mão no SQL gerado, e `pnpm db:push` local.
  - Cobre: CA-19b, CA-25, CA-28, CA-31 · RN-25, RN-33, RN-39, RN-41

- [x] **T13** [P] `packages/storage` — `deletePrefix`
  - Teste: `s3-object-storage.int.test.ts` › "deletePrefix removes every object under the prefix and nothing else (spec 039)" e "deletePrefix refuses a prefix that is not a folder" (a paginação de 1.000 fica no código, sem um teste que suba mil objetos)
  - Implementar: `ListObjectsV2` paginado + `DeleteObjects` em lotes de 1.000
  - Cobre: CA-08, CA-28 · RN-11, RN-39

- [x] **T14** `packages/db` — perfil e leituras da exclusão
  - Teste: `repositories/library/drizzle-creator-profile-query.test.ts` › "creator reads the name and the photo key", "lists only published public quizzes out of the trash, newest first", "counts started games of any host and their players", "publicQuiz returns the playable version's questions, null otherwise"
  - Teste: `repositories/identity/drizzle-account-closure-reads.test.ts` › "listIdsByOwner lists the owner's quizzes, trashed ones too", "listUnendedByOwner lists the open games a user hosts", "fileKeysByAuthor and uploadKeysOfUser find what the user left in groups"
  - Implementar: `drizzle-creator-profile-query.ts`; `quizGameCounts` extraído de `drizzle-shared-quiz-reads` para `repositories/game/quiz-game-counts.ts`; `QuizRepository.listIdsByOwner`, `GameRepository.listUnendedByOwner`, `GroupPostRepository.fileKeysByAuthor` e `GroupUploadRepository.uploadKeysOfUser` (portas, fakes e Drizzle). Sem `join` de fotos nas leituras dos grupos (ver T11)
  - Cobre: CA-20, CA-28 · RN-28, RN-29, RN-39

- [x] **T15** `packages/auth` — nome, senha e credenciais
  - Teste: `create-auth.test.ts`:
    - "update-user normalizes the name and refuses 1 and 51 characters"
    - "update-user refuses an image"
    - "change-password with revokeOtherSessions ends the other session"
    - "the sixth wrong current password in 60 s is rate limited"
    - "signing up again with a deleted account's email starts empty"
  - Teste: `account-credentials.test.ts`:
    - "hasPassword is false for a Google-only user"
    - "verifyPassword checks the credential account's hash"
  - Implementar: a hook `before` para `/update-user`, `customRules["/change-password"]` e `account-credentials.ts`
  - Cobre: CA-11, CA-12, CA-16, CA-17, CA-18, CA-31 · RN-13, RN-21, RN-22, RN-23, RN-24

## Fase 4 — API (routers + composition root)

- [x] **T16** `packages/api` — router `account`, visibilidade e acesso à IA
  - Teste: `routers/account.test.ts`:
    - "get returns the account of the session"
    - "photo upload, set and remove"
    - "profile of an unknown user is NOT_FOUND"
    - "a visitor reads a public quiz and hosts a live game with it"
    - "delete with the right password removes everything and keeps the member's report"
    - "a Google user without photo has photoUrl null"
  - Teste: `routers/quiz.test.ts` › "setVisibility public", e `routers/quiz-assistant.test.ts` › "access tells usage"
  - Implementar: `routers/account.ts` e `routers/index.ts`; `quiz.setVisibility` e `quiz.assistant.access`; em `container.ts`, os casos de uso e a `accountClosure` (`endGames`, `deleteManagedGroups`, `groupFileKeys`); em `composition-root.ts`, `accountCredentials` e os repositórios
  - Cobre: CA-10, CA-14, CA-19, CA-24, CA-25, CA-28, CA-30 · RN-04, RN-17, RN-27, RN-33, RN-39, RN-40

## Fase 5 — UI

- [x] **T17** [P] `packages/ui` + `apps/web` — avatar com foto e badge Público
  - Teste: `components/account/user-avatar.test.tsx`:
    - "shows the photo when there is one, the icon otherwise"
    - "square shape for the profile card"
  - Teste: `components/quiz/visibility-badge.test.tsx` › "shows Público"
  - Implementar:
    - mover `groups/user-avatar.tsx` para `account/user-avatar.tsx` e acrescentar `photoUrl`, `shape` e o tamanho `xl`;
    - nos 9 usos, passar `photoUrl` das views (em `api-types.ts`);
    - `Badge`: trocar a variante `unlisted` por `public`;
    - mostrar as variantes novas em `/design-system`.
  - Cobre: CA-09, CA-19 · RN-06, RN-25

- [x] **T18** `apps/web` — menu da conta e barra lateral
  - Teste: `components/account/account-menu.test.tsx` › "photo trigger, name, email, Ver perfil, Configurações and Encerrar sessão only"
  - Teste: `components/layout/main-nav.test.tsx` › "Início, Biblioteca, Relatórios and Grupos" (ajustar o CA-07 da spec 002)
  - Implementar: `account-menu.tsx` no lugar de `user-menu.tsx`, com os dados de `account.get`; tirar Descobrir de `main-nav.tsx`
  - Cobre: CA-01, CA-02, CA-32 · RN-01, RN-02, RN-43

- [x] **T19** `apps/web` — Configurações e Seu perfil
  - Teste: `components/account/settings-layout.test.tsx` › "Seu perfil, Acesso à IA, Senha and Exclusão de conta, the open one from the address"
  - Teste: `components/account/profile-section.test.tsx`:
    - "Alterar is disabled until the name changes"
    - "shows the length message for 1 and 51 characters"
    - "email is read only"
    - "Enter saves"
  - Implementar: `routes/_auth/_shell/settings.tsx` (validação de `section`), `settings-layout.tsx` e `profile-section.tsx` (`authClient.updateUser`, invalidar sessão e `account.get`)
  - Cobre: CA-03, CA-11, CA-12, CA-13 · RN-03, RN-12 a RN-16

- [x] **T20** `apps/web` — diálogo da foto
  - Teste: `lib/profile-photo-state.test.ts` › "empty → cropping → uploading → done or error, cancel back to cropping"
  - Teste: `lib/upload-file.test.ts` › "aborts the request with the signal"
  - Teste: `components/account/profile-photo-dialog.test.tsx`:
    - "Carregar is disabled without an image"
    - "refuses a PDF and 11 MB with the policy message"
    - "shows Carregando and closes when done"
    - "Cancelar during the upload keeps the chosen image"
    - "Remover foto only with a photo"
  - Implementar: `profile-photo-state.ts`, `crop-to-square.ts` (canvas → WebP 512), `signal` em `upload-file.ts` e `profile-photo-dialog.tsx` (arrastar, zoom com `Slider`, recorte redondo com `image-crop.ts`)
  - Cobre: CA-04, CA-05, CA-06, CA-07, CA-08 · RN-07 a RN-11

- [x] **T21** [P] `apps/web` — Acesso à IA e Senha
  - Teste: `components/account/ai-access-section.test.tsx` › "usage bar and next free time", "used up", "not available"
  - Teste: `components/account/password-section.test.tsx` › "disabled until all filled", "length, mismatch, wrong current password and too many attempts", "clears and toasts on success", "Google-only shows the notice"
  - Implementar: `ai-access-section.tsx`, `password-section.tsx` (`authClient.changePassword({ revokeOtherSessions: true })`) e os códigos em `lib/auth-error-messages.ts`
  - Cobre: CA-14, CA-15, CA-16, CA-17, CA-18 · RN-17 a RN-24

- [x] **T22** [P] `apps/web` — visibilidade na biblioteca e nas configurações do quiz
  - Teste: `components/library/quiz-list-item.test.tsx` › "Visibilidade submenu with Privado and Público, info texts, and the row follows"
  - Teste: `components/quiz/quiz-details-dialog.test.tsx` › "offers only Privado and Público with their descriptions"
  - Implementar: `DropdownMenuSub` + `DropdownMenuRadioGroup` + `Tooltip` em `quiz-list-item.tsx`; `setVisibility` otimista em `lib/quiz-mutations.ts`; o `RadioGroup` em `quiz-details-dialog.tsx`; Público em `select-quiz-dialog` e `shared-quizzes-tab`
  - Cobre: CA-19, CA-19a, CA-19b · RN-25, RN-25a

- [x] **T23** `apps/web` — perfil e página do quiz público
  - Teste: `components/profile/creator-profile.test.tsx`:
    - "header with photo, name and totals, and the cards"
    - "empty texts for the owner and a visitor"
    - "Opções de perfil by role, Copiar link toasts"
    - "unknown profile"
  - Teste: `components/profile/public-quiz-page.test.tsx` › "owner, Editar, Duplicar, hidden answers, Organizar ao vivo and Atribuir", "unavailable quiz goes back to the profile"
  - Teste: `components/groups/members-table.test.tsx` › "Ver perfil links to the profile"
  - Implementar: extrair `components/quiz/quiz-preview.tsx` de `shared-quiz-page.tsx`; `creator-profile.tsx`, `public-quiz-page.tsx`, `routes/_auth/_shell/profile.$userId.index.tsx` e `profile.$userId.quizzes.$quizId.tsx`; Ver perfil nos grupos e no menu
  - Cobre: CA-20 a CA-26 · RN-27 a RN-34

- [x] **T24** `apps/web` — Exclusão de conta
  - Teste: `components/account/delete-account-section.test.tsx`:
    - "the eight reasons in order"
    - "Excluir conta disabled without a reason"
    - "feedback stops at 1000"
    - "Cancelar returns to the link"
  - Teste: `components/account/delete-account-dialog.test.tsx` › "password confirmation and its error", "Google-only enables only with the account's email"
  - Implementar: `delete-account-section.tsx` e `delete-account-dialog.tsx`; depois de excluir, `router.invalidate()`, ir para `/` e mostrar o toast
  - Cobre: CA-27, CA-28, CA-29 · RN-35 a RN-38, RN-42

## Fase 6 — E2E e fechamento

- [x] **T25** E2E — conta
  - Teste: `apps/web/e2e/account.spec.ts`:
    - "uploads a cropped photo that shows in the top bar"
    - "changes the password and the old one stops working"
    - "deletes the account and cannot sign in again"
    - "Encerrar sessão goes to the public page"
    - "a profile link without session goes to sign in and back"
  - Cobre: CA-02, CA-04, CA-16, CA-24, CA-28

- [x] **T26** E2E — perfil público
  - Teste: `apps/web/e2e/public-profile.spec.ts` › "a visitor opens a public quiz from the profile, hosts it and duplicates a private copy"
  - Cobre: CA-19, CA-20, CA-25

- [x] **T27** Fechamento
  - `pnpm check`, `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, `pnpm test:int` (storage) e `pnpm test:e2e`
  - Atualizar:
    - a spec 039 (status `done`, changelog, incluindo o GIF que vira imagem parada);
    - o changelog da spec 037 (RN-21: a cópia de outra pessoa nasce Privada);
    - o changelog da spec 002 (RN-04: sem Descobrir);
    - a spec 001, RN-14 (visibilidades);
    - `glossary.md` (status ✅), `roadmap.md` (039 ✅) e o `CLAUDE.md` (rotas novas, a foto e a exclusão de conta).

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T06, T18 |
| CA-02 | T18, T25 |
| CA-03 | T19 |
| CA-04 | T05, T20, T25 |
| CA-05 | T20 |
| CA-06 | T01, T05, T20 |
| CA-07 | T20 |
| CA-08 | T05, T13, T20 |
| CA-09 | T01, T11, T14, T17 |
| CA-10 | T06, T16 |
| CA-11 | T15, T19 |
| CA-12 | T15, T19 |
| CA-13 | T19 |
| CA-14 | T07, T16, T21 |
| CA-15 | T07, T21 |
| CA-16 | T15, T21, T25 |
| CA-17 | T15, T21 |
| CA-18 | T06, T15, T21 |
| CA-19 | T08, T16, T17, T22, T26 |
| CA-19a | T08, T22 |
| CA-19b | T03, T12, T22 |
| CA-20 | T09, T14, T23, T26 |
| CA-21 | T09, T23 |
| CA-22 | T23 |
| CA-23 | T23 |
| CA-24 | T09, T16, T23, T25 |
| CA-25 | T04, T08, T09, T12, T16, T23, T26 |
| CA-26 | T09, T23 |
| CA-27 | T02, T24 |
| CA-28 | T04, T10, T12, T13, T14, T16, T24, T25 |
| CA-29 | T02, T10, T24 |
| CA-30 | T16 |
| CA-31 | T12, T15 |
| CA-32 | T18 |

Todos os 34 critérios (CA-01 a CA-32, CA-19a e CA-19b) aparecem em ao menos uma tarefa.
