---
spec: "036"
status: approved # draft | approved
---

# Plano técnico — 036 Grupos 3/5 — Atividade

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0016](../../../docs/adr/0016-mural-do-grupo.md), [0017](../../../docs/adr/0017-arquivos-do-grupo.md)

## Abordagem

A publicação de texto reaproveita o mural da 038 (ADR 0016): `group_post` ganha o tipo **`message`** e as colunas de **um arquivo** (imagem ou PDF), e as curtidas, o ⋮ e a exclusão já existentes passam a valer para ela.

**Arquivos (ADR 0017):**
- O navegador envia o arquivo direto ao bucket por URL pré-assinada, como as imagens das perguntas, sob o prefixo **`groups/{groupId}/`**.
- Um envio ainda não publicado fica numa tabela própria, **`group_upload`**, que o "Publicar" consome e uma varredura de 24 h limpa (o padrão do `source_upload` da spec 027).
- O arquivo é apagado com a publicação e com o grupo.

**"Atribuir kahoot" dentro da publicação não cria caminho novo no servidor:** o diálogo junta texto e quiz e, ao Publicar, chama o `group.assign` da 038 com a mensagem, agora opcional mesmo vazia.

**Mural:** vira paginado, 20 por vez, com cursor.

**Links:** são só apresentação, no web (`linkify`), e o texto nunca vira HTML.

**Pergunta em aberto da spec:** o endereço do arquivo é **público e impossível de adivinhar**, como o das imagens das perguntas (ADR 0003). O Quizio só o mostra a membros, e ele deixa de funcionar quando a publicação ou o grupo são excluídos. URLs temporárias assinadas foram descartadas (ADR 0017, alternativas): no R2 o acesso público vale para o bucket inteiro pelo domínio, e as URLs venceriam com a página aberta.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Publicação | `GroupPost` (`kind: "message" \| "assignment"`) | alterado |
| Criar publicação | `createGroupPost` / `group.post` | sim |
| Anexo da publicação (arquivo) | `GroupPostFile` (`type: "image" \| "pdf"`, `key`, `name`, `sizeBytes`) | sim |
| Envio pendente | `GroupUpload` / `group_upload` | sim |
| Pedir envio de arquivo | `requestGroupUpload` / `group.requestUpload` | sim |
| Descartar envio | `discardGroupUpload` / `group.discardUpload` | sim |
| O que foi publicado (cabeçalho) | `GroupPostView.headline` (`message` \| `image` \| `file` \| `assignment`) | sim |
| Mostrar mais publicações | cursor do `group.feed` (`GroupFeedCursor`) | sim |

## Domínio — `packages/core/src/groups/domain`

### Agregados e entidades

**`GroupPost`** (alterado, `group-post.ts`):

```ts
export const GROUP_POST_KINDS = ["assignment", "message"] as const;

export interface GroupPost {
	id: string;
	groupId: string;
	authorId: string;
	kind: GroupPostKind;
	message: string | null;
	gameId: string | null; // só em "assignment"
	file: GroupPostFile | null; // só em "message" (RN-07)
	createdAt: Date;
}
```

Invariantes:
- Uma `message` tem texto ou arquivo (RN-06).
- Uma `assignment` tem `gameId` e nunca `file`; o próprio quiz é o anexo (RN-07, RN-15).
- Um anexo no máximo: o tipo do arquivo exclui a atividade e vice-versa (RN-07).

### Value objects

**`GroupPostFile`** (`group-file.ts`, novo): `{ type: "image" | "pdf"; key: string; name: string; sizeBytes: number }`.

A política fica no próprio `groups`, que não importa o `media` (regra de contextos). Um teste a liga às constantes do `media`:
- `GROUP_IMAGE_TYPES`: JPG, PNG, GIF e WebP, até 10 MB (RN-09).
- `GROUP_PDF_TYPE`: `application/pdf`, até 20 MB (RN-11).

Funções:
- `parseGroupFile({ type, contentType, sizeBytes, fileName })`:
  - confere que o tipo de conteúdo combina com o `type` e o tamanho;
  - o nome é limpo: sem caminho (`/`, `\`), sem caracteres de controle, até 120 caracteres com `characterCount`. Vazio vira "arquivo.pdf" ou "imagem".
- `groupFileKeyFor(groupId, id, extension)` → `groups/{groupId}/{id}.{ext}`. Fica no shared kernel `media-key.ts`, junto de `mediaKeyFor` e `sourceKeyFor`, com `isGroupFileKeyOf(key, groupId)`.

**Mensagem** (alterado):
- `parsePostMessage` passa a aceitar vazio: `parseOptionalPostMessage(raw) → string | null`, com 0 a 500 caracteres, pontas aparadas, quebras mantidas (RN-05).
- `assertPostHasContent(message, attachment)` recusa os dois vazios (RN-06).
- O `assignInGroup` troca para a versão opcional: `""` vira `null` (RN-15).

### Serviços de domínio

- `postHeadlineOf(post, attachmentAlive)` (`group-post.ts`, puro) → `"message" | "image" | "file" | "assignment"` (RN-17):
  - `assignment` com cartão → `"assignment"`; sem cartão → `"file"` (spec 038, RN-16);
  - `message` com imagem → `"image"`; com PDF → `"file"`; senão → `"message"`.
- `canManagePost` (existente) já cobre autor e administrador (RN-19).

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `InvalidPostMessageError` (existente, `GROUP.INVALID_MESSAGE`) | — | texto com mais de 500 caracteres |
| `EmptyPostError` | `GROUP.EMPTY_POST` | sem texto e sem anexo (RN-06) |
| `UnsupportedGroupFileError` | `GROUP.UNSUPPORTED_FILE` | tipo fora da lista, ou que não combina com imagem/PDF (RN-09, RN-11) |
| `InvalidGroupFileSizeError` | `GROUP.INVALID_FILE_SIZE` | 0 byte, acima de 10 MB (imagem) ou de 20 MB (PDF) |
| `GroupUploadNotFoundError` | `GROUP.UPLOAD_NOT_FOUND` | publicar com um envio que não é da pessoa e do grupo, já usado, vencido, ou cujo arquivo não chegou ao bucket |

## Aplicação — `packages/core/src/groups/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `createRequestGroupUpload` (novo) | `userId, groupId, type, contentType, sizeBytes, fileName` | `{ key, uploadUrl, method, headers }` | `GROUP.NOT_FOUND`, `UNSUPPORTED_FILE`, `INVALID_FILE_SIZE` | `groups`, `groupMembers`, `groupUploads`, `storage`, `ids`, `clock` |
| `createDiscardGroupUpload` (novo) | `userId, groupId, key` | `void` (idempotente) | `GROUP.NOT_FOUND` | `groupUploads`, `storage` |
| `createCreateGroupPost` (novo) | `userId, groupId, message, uploadKey?` | `{ postId }` | `NOT_FOUND`, `INVALID_MESSAGE`, `EMPTY_POST`, `UPLOAD_NOT_FOUND` | `groupPosts`, `groupUploads`, `storage`, `ids`, `clock` |
| `createListGroupFeed` (alterado) | `+ cursor?` | `{ posts, nextCursor }` | — | `groupFeed` (`limit` 20) |
| `createDeleteGroupPost` (alterado) | — | — | — | `+ storage`: apaga o arquivo depois da linha (RN-20) |
| `createDeleteGroup` (alterado) | — | — | — | `+ groupPosts.fileKeysOfGroup`, `groupUploads`, `storage`: lê as chaves, apaga o grupo, depois os arquivos (RN-21) |
| `createAssignInGroup` (alterado) | `message` opcional, `""` → `null` | — | — | — (RN-14, RN-15) |

**`requestGroupUpload`:**
1. `requireMembership`, depois `parseGroupFile`.
2. Varre até 20 envios do grupo inteiro com mais de 24 h (`groupUploads.takeExpired`) e apaga seus objetos.
3. Grava a linha pendente e devolve a URL pré-assinada (300 s) com `contentDisposition: inline; filename*=UTF-8''{nome}`, para o PDF baixar com o nome certo.

**`createGroupPost`:**
1. `requireMembership`; sem `canPost` próprio, porque todo membro publica (RN-01).
2. `parseOptionalPostMessage`.
3. Com `uploadKey`:
   - confere `isGroupFileKeyOf(key, groupId)`;
   - confere `storage.exists(key)`, porque o arquivo pode não ter chegado ao bucket;
   - faz `groupPosts.createMessageFromUpload(post, { key, uploaderId })`, que **numa transação** apaga a linha de `group_upload` da pessoa e do grupo (`DELETE … RETURNING`) e insere a publicação com os dados do arquivo. Resposta `"missing"` → `GROUP.UPLOAD_NOT_FOUND`. Dois Publicar com o mesmo envio deixam uma publicação só.
4. Sem `uploadKey`: `assertPostHasContent` e `createPost`.

A atribuição dentro da publicação continua sendo o `assignInGroup`. O web chama `group.assign` com o texto.

### Portas novas ou alteradas

```ts
// groups/application/ports/group-upload-repository.ts (nova)
export interface GroupUpload {
	key: string;
	groupId: string;
	uploaderId: string;
	file: Omit<GroupPostFile, "key">; // type, name, sizeBytes
	createdAt: Date;
}
export interface GroupUploadRepository {
	add(upload: GroupUpload): Promise<void>;
	/** Idempotente; só a do próprio uploader. Devolve se havia linha. */
	remove(key: string, uploaderId: string): Promise<boolean>;
	/** Remove e devolve as chaves de até `limit` envios criados antes de `before`. */
	takeExpired(before: Date, limit: number): Promise<string[]>;
	/** As chaves pendentes do grupo (excluir o grupo). */
	keysOfGroup(groupId: string): Promise<string[]>;
}

// group-post-repository.ts (alterada)
interface GroupPostRepository {
	createPost(post: GroupPost): Promise<"created" | "taken">;
	/** Consome o envio e cria a publicação numa transação (RN-21). */
	createMessageFromUpload(
		post: Omit<GroupPost, "file">,
		upload: { key: string; uploaderId: string },
	): Promise<"created" | "missing">;
	/** Devolve a publicação apagada, para apagar o arquivo depois. */
	deletePost(postId: string): Promise<GroupPost | null>;
	fileKeysOfGroup(groupId: string): Promise<string[]>;
	// findPost, setLike sem mudança
}

// group-feed-query.ts (alterada)
export interface GroupFeedCursor { createdAt: Date; id: string }
interface GroupFeedQuery {
	/** Mais novas primeiro, (created_at, id) decrescente; `limit + 1` para saber se há mais. */
	listPosts(
		groupId: string,
		viewerId: string,
		page: { limit: number; after: GroupFeedCursor | null },
	): Promise<GroupPostRecord[]>;
}

// shared/application/ports/object-storage.ts (alterada)
interface PresignedUploadRequest {
	// …
	/** Assinado junto; o navegador manda o mesmo cabeçalho. */
	contentDisposition?: string;
}
```

`GroupPostView` ganha:
- `headline`;
- `file: { type, url, name, sizeBytes } | null` (a URL vem de `storage.getPublicUrl`, nunca guardada).

`postViewsOf` não muda de forma: o arquivo vem da própria linha.

**Fakes:**
- `InMemoryGroupUploadRepository` (novo);
- o `InMemoryGroupPostRepository` e o fake do feed ganham o arquivo, a paginação e `createMessageFromUpload`;
- o `FakeObjectStorage` registra o `contentDisposition` pedido.

## Adapters

### Banco — `packages/db`

**`schema/groups.ts`:**
- `group_post_kind` ganha o valor **`message`** (`ALTER TYPE … ADD VALUE`, gerado pelo drizzle-kit).
- `group_post` ganha `file_type` (enum novo `group_file_type`: `image`, `pdf`), `file_key`, `file_name`, `file_size_bytes` (integer), todas anuláveis, e o check `group_post_file_complete`: as quatro juntas, ou nenhuma.
- O índice do mural passa a `(group_id, created_at desc, id desc)`, para o cursor.
- Tabela nova **`group_upload`**:
  - colunas: `key` (pk), `group_id` (fk `group` cascade), `uploader_id` (fk `user` cascade), `file_type`, `file_name`, `file_size_bytes` e `created_at`;
  - índices: `group_upload_created_idx (created_at)` e `(group_id)`.

**Repositórios:**
- `drizzle-group-post-repository.ts`: `createMessageFromUpload` em `db.transaction`, `deletePost … RETURNING`, `fileKeysOfGroup`.
- `drizzle-group-feed-query.ts`: keyset `(created_at, id) < ($1, $2)` com `limit`.
- `drizzle-group-upload-repository.ts` (novo): `takeExpired` com `DELETE … WHERE key IN (SELECT … FOR UPDATE SKIP LOCKED LIMIT n) RETURNING key`, como o `source_upload`.

**Migration:** `pnpm db:generate` (0011). Compatível com o código anterior, porque só acrescenta valor de enum, colunas anuláveis e tabela. O valor de enum novo não aparece em linhas até o código novo publicar.

### Real-time

Nenhum. O mural continua sem tempo real (spec 034): as telas refazem a consulta.

### Storage / outros

- **`@quizio/storage`:** `createPresignedUpload` passa `ContentDisposition` ao `PutObjectCommand` e o devolve nos `headers` assinados. O teste `*.int.test.ts` sobe com o cabeçalho e lê de volta.
- **`scripts/setup-bucket.mjs`:** a política pública passa a `media/*` **e** `groups/*`; o CORS do PUT já vale.
- **`docs/deploy.md`:**
  - os arquivos dos grupos usam o mesmo domínio público do bucket;
  - não precisam de regra de ciclo de vida, porque a varredura limpa os envios não publicados.

## API — `packages/api`

Todas as procedures ficam no router `group`.

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `group.requestUpload` | mutation | sessão | `{ groupId, type: enum(GROUP_FILE_TYPES), contentType: string max 100, sizeBytes: int, fileName: string max 1000 }` | `{ key, uploadUrl, method, headers }` | `NOT_FOUND`, `UNSUPPORTED_FILE`, `INVALID_FILE_SIZE` |
| `group.discardUpload` | mutation | sessão | `{ groupId, key: string max 300 }` | `void` | `NOT_FOUND` |
| `group.post` | mutation | sessão | `{ groupId, message: string max 5000, uploadKey?: string max 300 }` | `{ postId }` | `NOT_FOUND`, `INVALID_MESSAGE`, `EMPTY_POST`, `UPLOAD_NOT_FOUND` |
| `group.feed` | query (infinite) | sessão | `{ groupId, cursor?: { createdAt: iso, id } }` | `{ posts, nextCursor }` | `NOT_FOUND` |
| `group.assign` | mutation (alterada) | sessão | `message` aceita `""` | — | — |

Ligações novas:
- **`container.ts`:** `groupUploads` nas deps; os três casos de uso novos; `storage` em `deleteGroupPost` e `deleteGroup`.
- **`composition-root.ts`:** `DrizzleGroupUploadRepository`.
- **`test-context.ts`:** o fake.

## UI — `apps/web` e `packages/ui`

### Estado e componentes

- **`lib/group-post-state.ts`** (novo, redutor puro): o diálogo "Criar publicação" com
  - `step: closed | compose | select | configure`;
  - `message`;
  - `attachment: none | uploading { type, name, sizeBytes, progress, previewUrl } | file { type, key, name, sizeBytes, previewUrl } | quiz { quiz, settings }`;
  - `error`.
  Ações: `open`, `pickQuiz`, `addToPost(settings)`, `backToCompose` (Fechar e Cancelar, RN-13), `startUpload`, `progress`, `uploaded`, `uploadFailed`, `removeAttachment`, `message`. `canPublish` segue RN-06.
- **`components/groups/post/`** (novo):
  - **`CreatePostDialog`**: campo com `CountedField` (contador restante), a faixa **`AttachBar`** (Imagem, PDF, Compartilhar kahoot `ComingSoonAction`, Atribuir kahoot quando `canAssign`, cada um com `Tooltip`), a prévia **`AttachmentPreview`** com X, os erros de arquivo, Cancelar e Publicar;
  - **`CreatePostFlow`**: liga o redutor ao `SelectQuizDialog` e ao `AssignmentSettingsDialog`, que recebe `variant: "group" | "post"`; `"post"` troca os botões por Cancelar e "Adicionar à publicação";
  - escolha de arquivo por `<input type="file" accept>` escondido; tipo e tamanho são conferidos no navegador antes de pedir a URL, com as mesmas mensagens que os códigos do servidor;
  - o envio usa `uploadFile` (`lib/upload-file.ts`, já com progresso) e `URL.createObjectURL` para a prévia;
  - Cancelar e X chamam `group.discardUpload` (melhor esforço).
- **`lib/use-group-upload.ts`** (novo): pede a URL, envia, informa o progresso e cancela o XHR ao fechar.
- **`AssignmentPostDialog` da 038:** Publicar fica disponível com o quiz e o texto vazio (RN-15); o texto passa a ser opcional no redutor `group-assign-state`.

### Mural

- **`GroupPost`** (alterado):
  - o cabeçalho vem de `headline` (`lib/group-post-labels.ts`: "compartilhou uma mensagem/imagem/um arquivo", "atribuiu um kahoot");
  - o texto vem de **`PostText`**, que monta a lista de pedaços de `linkify(text)` (`lib/linkify.ts`, puro: `http://`, `https://`, `www.` → `https://www.`; tira `.,;:!?)` do fim, menos o `)` que fecha um `(` dentro do link) e renderiza **nós de texto e `<a target="_blank" rel="noopener noreferrer nofollow">`**, nunca HTML;
  - a imagem é **`PostImage`** (largura do cartão, `object-contain`, `max-h-[28rem]`, botão que abre o **`ImageViewer`**, um `Dialog` em tela cheia com Fechar; o alt é "Imagem publicada por {nome}");
  - o PDF é **`PostFileCard`** (ícone `FileTextIcon`, nome, tamanho por `formatFileSize`, "2,4 MB", e link em aba nova);
  - o ⋮ (`PostMenu`) não muda de forma: sem `gameId`, só "Excluir publicação"; o texto da confirmação depende de haver arquivo (RN-20).
- **`GroupFeed`:** recebe páginas e **"Mostrar mais publicações"** (`hasNextPage`, `fetchNextPage`, ocupado enquanto carrega).
- **`GroupActivity`:**
  - "Publicar algo" vira um botão com cara de campo;
  - Criar publicação deixa de ser `ComingSoonAction`;
  - some a frase "Publicações e compartilhamento chegam em breve."; Compart. continua "Em breve".
- **`GroupSetupCard`:** o passo "Criar publicação" aciona `onCreatePost`.
- **Estado vazio:** o Criar publicação abre o diálogo.

### Rota e mutações

- **`routes/_auth/_shell/groups.$groupId.index.tsx`:**
  - `group.feed` passa a `useInfiniteQuery` (`trpc.group.feed.infiniteQueryOptions`, `getNextPageParam: nextCursor`), mantendo o `groupQuery` (sem repetir NOT_FOUND);
  - monta o `CreatePostFlow`.
- **`lib/group-mutations.ts`:**
  - `post`, que invalida o mural e o grupo (o passo de configuração), com o toast de erro pelos códigos;
  - `setLike` e `deletePost` passam a mexer no formato de páginas (`InfiniteData`);
  - mensagens novas em `lib/group-error-messages.ts`.

### Design system

`Dialog`, `Tooltip` e `Button` já existem. **`Progress`** entra novo, pelo CLI do shadcn na raiz (`npx shadcn@latest add progress -c packages/ui`, sem sobrescrever os outros arquivos), convertido ao estilo do projeto, e é usado no andamento do envio. Ele vai também para o catálogo `/design-system`.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | componente | `every Criar publicação opens the dialog; a member sees no Atribuir` | `components/groups/group-activity.test.tsx` |
| CA-01 | componente | `the setup step Criar publicação opens the dialog` | `components/groups/group-page.test.tsx` |
| CA-02 | componente | `the attach bar shows Atribuir kahoot only for who may assign` | `components/groups/post/create-post-dialog.test.tsx` |
| CA-03 | aplicação | `a member posts a message, newest first` | `core/groups/application/create-group-post.test.ts` |
| CA-03 | API | `group.post creates a message post and the setup step is done` | `api/src/routers/group.test.ts` |
| CA-03 | E2E | `um membro publica uma mensagem com link; o administrador vê` | `apps/web/e2e/group-posts.spec.ts` |
| CA-04 | domínio | `parseOptionalPostMessage: 0 to 500, trimmed, line breaks kept` | `core/groups/domain/group-post.test.ts` |
| CA-04 | aplicação | `refuses an empty post, 501 characters and a non-member` | `create-group-post.test.ts` |
| CA-04 | componente | `Publicar is disabled with only spaces; the counter reaches 0` | `create-post-dialog.test.tsx` |
| CA-05 | redutor | `cancel closes and asks to discard the upload` | `lib/group-post-state.test.ts` |
| CA-05 | aplicação | `discardGroupUpload removes the row and the object` | `core/groups/application/discard-group-upload.test.ts` |
| CA-06 | domínio | `parseGroupFile accepts JPG/PNG/GIF/WebP up to 10 MB, refuses others` | `core/groups/domain/group-file.test.ts` |
| CA-06 | aplicação | `requestGroupUpload signs a key under groups/{groupId}/ and sweeps expired uploads` | `core/groups/application/request-group-upload.test.ts` |
| CA-06 | aplicação | `a post consumes its upload once; a missing object or someone else's upload is refused` | `create-group-post.test.ts` |
| CA-06 | componente | `an image shows its progress, then the preview; Publicar without text` | `create-post-dialog.test.tsx` |
| CA-06 | componente | `the image opens enlarged and closes with Esc` | `components/groups/group-post.test.tsx` |
| CA-06/07 | componente | `wrong type and size messages before any request` | `create-post-dialog.test.tsx` |
| CA-07 | domínio | `a PDF up to 20 MB; the file name is cleaned` | `group-file.test.ts` |
| CA-07 | componente | `a PDF post: compartilhou um arquivo, name, 2,4 MB, link in a new tab` | `group-post.test.tsx` |
| CA-07 | adapter | `a presigned upload keeps its Content-Disposition` | `packages/storage/src/s3-object-storage.int.test.ts` |
| CA-06/07 | E2E | `imagem e PDF no mural` | `group-posts.spec.ts` |
| CA-08 | redutor | `one attachment: the bar comes back after X, the text stays` | `group-post-state.test.ts` |
| CA-08 | domínio | `a post has text or a file, never a file and a game` | `group-post.test.ts` |
| CA-09 | redutor | `Atribuir kahoot: select → configure → back with the quiz; nothing created` | `group-post-state.test.ts` |
| CA-09 | componente | `Publicar with a quiz calls assign with the text` | `components/groups/post/create-post-flow.test.tsx` |
| CA-09 | E2E | `atribuir pela publicação` | `group-posts.spec.ts` |
| CA-10 | redutor | `Fechar and Cancelar go back to compose without attachment` | `group-post-state.test.ts` |
| CA-10 | componente | `the post variant of the settings has Cancelar and Adicionar à publicação` | `assignment-settings-dialog.test.tsx` |
| CA-11 | aplicação | `assignInGroup with an empty message posts no message` | `core/groups/application/assign-in-group.test.ts` |
| CA-11 | componente | `Adicionar mensagem: Publicar is enabled with the quiz and no text` | `assignment-post-dialog.test.tsx` |
| CA-12 | unidade | `linkify: http, https, www; trailing punctuation; parentheses` | `apps/web/src/lib/linkify.test.ts` |
| CA-12 | componente | `links open in a new tab; markup shows as typed` | `group-post.test.tsx` |
| CA-13 | repositório | `listPosts pages by (created_at, id), newest first` | `packages/db/src/repositories/groups/drizzle-group-feed.test.ts` |
| CA-13 | aplicação | `listGroupFeed returns 20 and a cursor while there are more` | `core/groups/application/list-group-feed.test.ts` |
| CA-13 | componente | `Mostrar mais publicações loads the next page and goes away` | `components/groups/group-feed.test.tsx` |
| CA-14 | componente | `a message post likes like an assignment` | `group-post.test.tsx` |
| CA-15 | aplicação | `deleting a post deletes its file; a member who did not post is refused` | `core/groups/application/delete-group-post.test.ts` |
| CA-15 | componente | `the menu of a message has only Excluir publicação; the file wording` | `group-post.test.tsx` |
| CA-15 | E2E | `excluir a publicação com PDF` | `group-posts.spec.ts` |
| CA-16 | aplicação | `deleting the group deletes posted and pending files` | `core/groups/application/delete-group.test.ts` |
| CA-16 | repositório | `createMessageFromUpload is one transaction; two publishes leave one post; file columns check` | `packages/db/src/repositories/groups/drizzle-group-repositories.test.ts` |
| CA-16 | repositório | `takeExpired returns and removes old uploads only` | `packages/db/src/repositories/groups/drizzle-group-upload-repository.test.ts` |

## Dados e migração

- `pnpm db:generate` gera a 0011: valor `message` no enum, enum `group_file_type`, as quatro colunas e o check em `group_post`, o índice do mural refeito e a tabela `group_upload`. Sem backfill: as linhas existentes são `assignment` sem arquivo.
- O teste de PGlite do `drizzle-group-repositories.test.ts` cobre o check: arquivo incompleto é recusado.

## Riscos e decisões

- **ADR 0017 — arquivos do grupo:**
  - prefixo `groups/{groupId}/` com URL pública impossível de adivinhar;
  - o envio pendente fica em `group_upload` e é consumido numa transação ao publicar;
  - varredura de 24 h a cada envio;
  - os arquivos são apagados com a publicação e o grupo.
  Isso responde à pergunta em aberto da spec. Quem recebe o endereço de um arquivo de fora do Quizio consegue abri-lo enquanto a publicação existir, como acontece hoje com as imagens das perguntas.
- **Apagar arquivos depois do banco é melhor esforço**: uma falha do storage deixa um objeto órfão sem dono no banco. Uma conta excluída (`author_id` com cascade) também apaga as publicações sem passar pelo caso de uso, e os arquivos dela ficam. Aceito, por ser raro e barato; registrado no ADR.
- **O tamanho é garantido pela assinatura** (`contentLength` assinado no PUT), como nas imagens. O tipo também (`contentType` assinado). Um arquivo que não é PDF de verdade só abre errado no navegador, e o PDF nunca é lido no servidor.
- **`ALTER TYPE … ADD VALUE`**: o valor novo do enum não pode ser usado na mesma transação da migração, e a 0011 não o usa. As migrações rodam antes do build na Vercel, então o código antigo nunca vê uma `message`.
- **O like otimista e a exclusão passam a mexer em páginas**: o maior risco de regressão no web. Ele fica coberto pelos testes de mutação existentes, adaptados, e pelo E2E da 038.
- **Links**: `rel="noopener noreferrer nofollow"` e só os esquemas `http`/`https`. Sem `javascript:`, porque o `linkify` só reconhece esses dois prefixos e `www.`.
- **XSS**: o texto nunca passa por `dangerouslySetInnerHTML`.
