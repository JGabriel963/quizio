---
spec: "036"
status: done # todo | in-progress | done
---

# Tarefas — 036 Grupos 3/5 — Atividade

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADRs: [0016](../../../docs/adr/0016-mural-do-grupo.md), [0017](../../../docs/adr/0017-arquivos-do-grupo.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.
>
> O adapter de storage muda (`Content-Disposition`), por isso entra um `*.int.test.ts`. Os repositórios novos são testados com PGlite.

## Fase 1 — Domínio

- [x] **T01** `core/groups` — publicação de mensagem e texto opcional
  - Teste: `groups/domain/group-post.test.ts`:
    - "parseOptionalPostMessage: 0 to 500 characters, trimmed, keeping line breaks; empty is null"
    - "refuses 501 characters with GROUP.INVALID_MESSAGE"
    - "assertPostHasContent refuses no text and no attachment with GROUP.EMPTY_POST"
  - Implementar:
    - `group-post.ts`: `GROUP_POST_KINDS` com `message`, `GroupPost.file`, `parseOptionalPostMessage`, `assertPostHasContent`;
    - `EmptyPostError` em `group-errors.ts`;
    - o fake e os usos atuais de `GroupPost` com `file: null`.
  - Cobre: CA-04, CA-08 · RN-05, RN-06, RN-07

- [x] **T02** [P] `core/groups` + `shared` — arquivo do grupo
  - Teste: `groups/domain/group-file.test.ts`:
    - "accepts JPG, PNG, GIF and WebP images up to 10 MB"
    - "accepts a PDF up to 20 MB"
    - "refuses a type that does not match image or pdf with GROUP.UNSUPPORTED_FILE"
    - "refuses 0 bytes and oversize with GROUP.INVALID_FILE_SIZE"
    - "cleans the file name: no path, no control characters, at most 120 characters, a default when empty"
    - "matches the media policy limits"
  - Teste: `shared/domain/media-key.test.ts` › "groupFileKeyFor and isGroupFileKeyOf: a single file under groups/{groupId}/"
  - Implementar:
    - `group-file.ts`: `GroupPostFile`, `GROUP_FILE_TYPES`, `parseGroupFile`;
    - `UnsupportedGroupFileError` e `InvalidGroupFileSizeError`;
    - `groupFileKeyFor` e `isGroupFileKeyOf` em `media-key.ts`.
  - Cobre: CA-06, CA-07 · RN-09, RN-11

- [x] **T03** [P] `core/groups` — o cabeçalho da publicação
  - Teste: `group-post.test.ts`:
    - "postHeadlineOf: message, image, file, assignment"
    - "an assignment without its card reads as a file"
  - Implementar: `postHeadlineOf` em `group-post.ts`
  - Cobre: CA-03, CA-06, CA-07 · RN-17

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T04** `core/groups` — pedir e descartar o envio
  - Teste: `groups/application/request-group-upload.test.ts`:
    - "a member gets a presigned upload under groups/{groupId}/ with the file name as Content-Disposition"
    - "records the pending upload"
    - "sweeps up to 20 uploads older than 24 hours and deletes their objects"
    - "a non-member gets GROUP.NOT_FOUND"
    - "refuses a wrong type or size before signing"
  - Teste: `discard-group-upload.test.ts`:
    - "removes the row and the object of one's own upload"
    - "is idempotent"
    - "ignores someone else's upload"
  - Implementar:
    - a porta `GroupUploadRepository` e o fake `InMemoryGroupUploadRepository`;
    - `contentDisposition?` em `PresignedUploadRequest`, gravado pelo `FakeObjectStorage`;
    - `request-group-upload.ts` e `discard-group-upload.ts`.
  - Cobre: CA-05, CA-06, CA-07 · RN-08, RN-09, RN-11, RN-21

- [x] **T05** `core/groups` — criar a publicação
  - Teste: `groups/application/create-group-post.test.ts`:
    - "a member posts a message, newest first"
    - "the admin posts too"
    - "posts an image or a PDF consuming its upload once"
    - "a post with a file needs no text"
    - "refuses an empty post, 501 characters and a non-member"
    - "refuses a missing object, an upload of another member or group, or one already used, with GROUP.UPLOAD_NOT_FOUND"
  - Implementar:
    - `createMessageFromUpload` na porta `GroupPostRepository` e no fake;
    - `create-group-post.ts`.
  - Cobre: CA-03, CA-04, CA-06, CA-07, CA-08 · RN-01, RN-05 a RN-07, RN-09, RN-11, RN-21

- [x] **T06** [P] `core/groups` — atribuir com a mensagem vazia
  - Teste: `assign-in-group.test.ts` › "an empty or blank message posts no message"
  - Implementar: `assign-in-group.ts` com `parseOptionalPostMessage`
  - Cobre: CA-11 · RN-14, RN-15

- [x] **T07** `core/groups` — o mural paginado e a visão com o arquivo
  - Teste: `list-group-feed.test.ts`:
    - "returns 20 posts and a cursor while there are more"
    - "the next page starts after the cursor"
    - "the last page has no cursor"
  - Teste: `group-post-view.test.ts`:
    - "a message post has its headline and the file with its public URL, name and size"
    - "a message post offers delete and no report"
  - Implementar:
    - `GroupFeedCursor` e a paginação na porta `GroupFeedQuery` e no fake;
    - `list-group-feed.ts` (limite 20, `nextCursor`);
    - `headline` e `file` em `GroupPostView` (`group-post-view.ts`).
  - Cobre: CA-03, CA-06, CA-07, CA-13, CA-14, CA-15 · RN-17 a RN-19

- [x] **T08** `core/groups` — apagar os arquivos com a publicação e o grupo
  - Teste: `delete-group-post.test.ts`:
    - "deleting a post deletes its file"
    - "a member who did not post is refused and nothing is deleted"
  - Teste: `delete-group.test.ts` › "deleting the group deletes posted and pending files"
  - Implementar:
    - `deletePost` devolvendo a publicação e `fileKeysOfGroup` na porta e no fake;
    - `keysOfGroup` no repositório de envios;
    - `delete-group-post.ts` e `delete-group.ts` com `storage`.
  - Cobre: CA-15, CA-16 · RN-20 a RN-22

## Fase 3 — Adapters (repositórios, storage)

- [x] **T09** `packages/db` — esquema e migração
  - Teste: `drizzle-group-repositories.test.ts` › "a post's file columns are all set or all null"
  - Implementar em `schema/groups.ts`:
    - `message` em `group_post_kind`;
    - o enum `group_file_type`;
    - as colunas `file_*` e o check `group_post_file_complete`;
    - o índice do mural `(group_id, created_at desc, id desc)`;
    - a tabela `group_upload`.
  - Depois, `pnpm db:generate` (0011), revisada e versionada.
  - Cobre: CA-16 · RN-07, RN-21

- [x] **T10** `packages/db` — repositórios das publicações e dos envios
  - Teste: `drizzle-group-repositories.test.ts`:
    - "createMessageFromUpload consumes the upload and inserts the post in one transaction"
    - "two publishes of one upload leave one post"
    - "an upload of another user or group is missing"
    - "deletePost returns the deleted post"
    - "fileKeysOfGroup lists the posted files"
  - Teste: `drizzle-group-upload-repository.test.ts`:
    - "add and remove one's own upload"
    - "takeExpired returns and removes old uploads only"
    - "keysOfGroup"
  - Implementar:
    - `drizzle-group-post-repository.ts`;
    - `drizzle-group-upload-repository.ts` (novo).
  - Cobre: CA-05, CA-06, CA-15, CA-16 · RN-08, RN-20, RN-21

- [x] **T11** [P] `packages/db` — mural paginado com arquivos
  - Teste: `drizzle-group-feed.test.ts`:
    - "listPosts pages by (created_at, id), newest first"
    - "message posts come with their file"
  - Implementar: `drizzle-group-feed-query.ts` (keyset, `limit`, colunas `file_*`)
  - Cobre: CA-13 · RN-18

- [x] **T12** [P] `packages/storage` — `Content-Disposition` assinado
  - Teste: `s3-object-storage.test.ts` › "signs the Content-Disposition and returns it among the headers"
  - Teste: `s3-object-storage.int.test.ts` › "an upload with Content-Disposition is served with it"
  - Implementar:
    - `s3-object-storage.ts`;
    - `scripts/setup-bucket.mjs` liberando também `groups/*`.
  - Cobre: CA-07 · RN-11

## Fase 4 — API (routers + composition root)

- [x] **T13** `packages/api` — procedures e ligações
  - Teste: `routers/group.test.ts`:
    - "group.requestUpload signs an upload for a member"
    - "group.post creates a message post and the setup step is done"
    - "group.post with an upload shows the file in the feed"
    - "group.discardUpload"
    - "group.feed pages with a cursor"
    - "group.assign accepts an empty message"
    - "a non-member is NOT_FOUND"
  - Implementar:
    - `routers/group.ts` (`requestUpload`, `discardUpload`, `post`, o `feed` com cursor);
    - `container.ts`: os casos de uso novos e `storage` na exclusão;
    - `composition-root.ts`: `DrizzleGroupUploadRepository`;
    - `testing/test-context.ts`.
  - Cobre: CA-01, CA-03, CA-04, CA-06, CA-11, CA-13 · RN-01, RN-06, RN-15, RN-18, RN-23

## Fase 5 — UI (design system → componentes do app → rotas)

- [x] **T14** [P] `packages/ui` — `Progress`
  - Teste: `apps/web/src/routes/design-system` (catálogo): "renders the progress bar with its value"; ou um teste do componente em `packages/ui`, se houver o padrão.
  - Implementar:
    - `npx shadcn@latest add progress -c packages/ui` (sem sobrescrever arquivos existentes), convertido ao estilo do projeto;
    - uma entrada no `/design-system`.
  - Cobre: CA-06 · RN-09

- [x] **T15** [P] `apps/web` — links e rótulos
  - Teste: `lib/linkify.test.ts`:
    - "http, https and www become links"
    - "trailing punctuation stays out"
    - "a closing parenthesis stays when the link opened one"
    - "javascript: and other schemes stay text"
  - Teste: `lib/group-post-labels.test.ts`:
    - "headlines"
    - "formatFileSize: 2,4 MB, 850 KB"
  - Teste: `group-error-messages.test.ts` › "the new GROUP codes"
  - Implementar: `lib/linkify.ts`, `group-post-labels.ts` (cabeçalhos e `formatFileSize`), `group-error-messages.ts`
  - Cobre: CA-06, CA-07, CA-12 · RN-09, RN-11, RN-16, RN-17

- [x] **T16** `apps/web` — o estado de "Criar publicação"
  - Teste: `lib/group-post-state.test.ts`:
    - "canPublish with text or an attachment, not while uploading"
    - "one attachment: the bar comes back after X, the text stays"
    - "Atribuir kahoot: select → configure → back with the quiz"
    - "Fechar and Cancelar go back to compose without attachment"
    - "an upload failure brings the bar back with its message"
    - "cancel closes and names the upload to discard"
  - Implementar: `lib/group-post-state.ts`
  - Cobre: CA-05, CA-08, CA-09, CA-10 · RN-06 a RN-08, RN-12, RN-13

- [x] **T17** `apps/web` — o diálogo "Criar publicação"
  - Teste: `components/groups/post/create-post-dialog.test.tsx`:
    - "counter from 500 to 0; only spaces keep Publicar disabled"
    - "the attach bar shows Imagem, PDF, Compartilhar kahoot (em breve) and Atribuir kahoot only for who may assign, with tooltips"
    - "an image shows its progress, then the preview; Publicar without text"
    - "a PDF shows its name and size"
    - "wrong type and size messages before any request"
  - Implementar:
    - `create-post-dialog.tsx`, `attach-bar.tsx`, `attachment-preview.tsx`;
    - `lib/use-group-upload.ts`, com o teste do hook que envia, informa o progresso e cancela.
  - Cobre: CA-02, CA-04, CA-06, CA-07, CA-08 · RN-04 a RN-07, RN-09, RN-11

- [x] **T18** `apps/web` — atribuir pela publicação
  - Teste: `assignment-settings-dialog.test.tsx` › "the post variant has Cancelar and Adicionar à publicação"
  - Teste: `components/groups/post/create-post-flow.test.tsx`:
    - "Publicar with a quiz calls assign with the text"
    - "Publicar with a file calls post with the upload key"
    - "Cancelar discards the upload"
  - Teste: `assignment-post-dialog.test.tsx` › "Publicar is enabled with the quiz and no text"
  - Implementar:
    - a `variant` de `assignment-settings-dialog.tsx`;
    - `create-post-flow.tsx`;
    - o texto opcional em `assignment-post-dialog.tsx` e `group-assign-state.ts`.
  - Cobre: CA-05, CA-09, CA-10, CA-11 · RN-12 a RN-15

- [x] **T19** `apps/web` — a publicação no mural
  - Teste: `group-post.test.tsx`:
    - "a message post: compartilhou uma mensagem, the text with line breaks, likes"
    - "links open in a new tab; markup shows as typed"
    - "an image post opens enlarged and closes with Esc"
    - "a PDF post: compartilhou um arquivo, name, 2,4 MB, link in a new tab"
    - "the menu of a message has only Excluir publicação, with the file wording"
  - Implementar:
    - `group-post.tsx` (cabeçalho por `headline`);
    - `post-text.tsx`, `post-image.tsx`, `image-viewer.tsx` e `post-file-card.tsx`;
    - o texto da confirmação em `PostMenu`.
  - Cobre: CA-06, CA-07, CA-12, CA-14, CA-15 · RN-10, RN-11, RN-16, RN-17, RN-19, RN-20

- [x] **T20** `apps/web` — mural paginado, caixa e rota
  - Teste: `group-feed.test.tsx` › "Mostrar mais publicações loads the next page and goes away"
  - Teste: `group-activity.test.tsx` › "Publicar algo and Criar publicação open the dialog; Compart. stays em breve; a member sees no Atribuir"
  - Teste: `group-page.test.tsx` › "the setup step and the empty state open the dialog"
  - Teste: `group-mutations.test.ts` › "like and delete update the paged feed"
  - Implementar:
    - `group-feed.tsx` e `group-activity.tsx`;
    - `group-setup-card.tsx` (`onCreatePost`);
    - `groups.$groupId.index.tsx`: `useInfiniteQuery` e `CreatePostFlow`;
    - `lib/group-mutations.ts` (`post`, e as atualizações em páginas).
  - Cobre: CA-01, CA-03, CA-13, CA-14 · RN-01 a RN-03, RN-18, RN-23

## Fase 6 — E2E e fechamento

- [x] **T21** `apps/web/e2e` — publicações no grupo
  - Teste: `e2e/group-posts.spec.ts`:
    - "um membro publica uma mensagem com link; o administrador vê e curte"
    - "imagem e PDF no mural; excluir a publicação com PDF"
    - "atribuir pela publicação"
  - Rodar também `group-assignments.spec.ts` e `groups.spec.ts`, porque o mural agora é paginado.
  - Cobre: CA-03, CA-06, CA-07, CA-09, CA-12, CA-14, CA-15

- [x] **T22** Fechamento
  - Rodar:
    - `pnpm check`, `pnpm test`, `pnpm check-types` e `pnpm -F web exec tsc --noEmit`;
    - `pnpm test:int` (storage);
    - `pnpm test:e2e` das specs de grupos.
  - Atualizar:
    - `spec.md` (status `done`, changelog; responder a pergunta em aberto com o ADR 0017);
    - a changelog da spec 038 (RN-11: texto opcional com o quiz);
    - `glossary.md` (✅);
    - `roadmap.md` (036 ✅, links do plano e das tarefas);
    - `docs/deploy.md` (`groups/*` público);
    - a seção de grupos do `CLAUDE.md`.

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T13, T20 |
| CA-02 | T17 |
| CA-03 | T03, T05, T07, T13, T20, T21 |
| CA-04 | T01, T05, T13, T17 |
| CA-05 | T04, T10, T16, T18 |
| CA-06 | T02, T03, T04, T05, T07, T10, T13, T14, T15, T17, T19, T21 |
| CA-07 | T02, T03, T04, T05, T07, T12, T15, T17, T19, T21 |
| CA-08 | T01, T05, T16, T17 |
| CA-09 | T16, T18, T21 |
| CA-10 | T16, T18 |
| CA-11 | T06, T13, T18 |
| CA-12 | T15, T19, T21 |
| CA-13 | T07, T11, T13, T20 |
| CA-14 | T07, T19, T20, T21 |
| CA-15 | T07, T08, T10, T19, T21 |
| CA-16 | T08, T09, T10 |
