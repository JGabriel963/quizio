---
spec: "001"
status: approved # draft | approved
---

# Plano técnico — 001 Autenticação e biblioteca básica

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR proposto: [0007](../../../docs/adr/0007-autenticacao-better-auth-google.md)

## Abordagem

A feature tem duas metades independentes.

**Identidade.** Continua no Better Auth, que ganha:
- login com Google, com vínculo automático de contas quando o e-mail coincide e o Google o confirma;
- cadastro desligável por variável de ambiente;
- limite de tentativas de login gravado no Postgres, porque a memória não serve em serverless.

A configuração vira uma fábrica `createAuth(...)` que recebe o banco e as opções. Isso permite testar os fluxos de conta contra PGlite, inclusive o Google, simulando a verificação do token. As regras de nome e senha ficam no core e são compartilhadas entre o hook do servidor e o formulário.

**Biblioteca.** Nasce no core, dividida em dois contextos:
- **`quiz`** tem o agregado `Quiz` e os comandos: criar, editar dados, duplicar, lixeira, restaurar, excluir definitivamente.
- **`library`** tem a consulta das seções com pesquisa: um *read model* separado por uma porta própria, que é onde entrarão favoritos e pastas (011).

Adapters Drizzle implementam as duas portas sobre a mesma tabela `quiz`. A capa usa o upload pré-assinado já existente; a porta `ObjectStorage` ganha `copy` para que cada quiz seja dono do próprio objeto de capa.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Criador | `Creator` (usuário do Better Auth) | já no glossário (spec) |
| Cadastro aberto | `signUpEnabled` | já no glossário (spec) |
| Quiz / Dono | `Quiz` / `ownerId` | existente |
| Dados do quiz | `QuizDetails` (título, descrição, visibilidade) | sim |
| Alteração de capa | `CoverChange` (`keep` / `set` / `remove`) | sim |
| Seção da biblioteca | `LibrarySection` (`recent` / `drafts` / `trash`) | já no glossário (spec) |
| Item da biblioteca | `LibraryItem` | sim |
| Texto de pesquisa | `SearchText` (normalizado sem acento e em minúsculas) | sim |
| Chave de mídia | `MediaKey` (`media/{ownerId}/{id}.{ext}`) | sim |

## Domínio — `packages/core/src`

### Shared kernel (`shared/domain`)

| Arquivo | Conteúdo |
| --- | --- |
| `not-found-error.ts` | `abstract class NotFoundError extends DomainError` — o middleware tRPC traduz para `NOT_FOUND` em vez de `BAD_REQUEST` (RN-10). |
| `search-text.ts` | `normalizeSearchText(text)`: NFD → remove diacríticos → `toLocaleLowerCase("pt-BR")` → colapsa espaços → trim (RN-19). |
| `media-key.ts` | `mediaKeyFor(ownerId, id, ext)`, `isMediaKeyOwnedBy(key, ownerId)`, `mediaKeyExtension(key)`. Sai de dentro de `request-media-upload` para ser reutilizado pelo contexto `quiz` sem importar outro contexto. |
| `text-length.ts` | `characterCount(text)`: conta *code points* (`[...text].length`), para que emoji e acentos compostos contem como 1 caractere nos limites de 95/500/50. |

### Identidade (`identity/domain`) — novo

`sign-up-rules.ts` — regras puras, usadas pelo hook do Better Auth e pelo formulário web:

- `CREATOR_NAME_LENGTH = { min: 2, max: 50 }`, `PASSWORD_LENGTH = { min: 8, max: 128 }` (RN-02)
- `normalizeCreatorName(raw)` (trim), `normalizeEmail(raw)` (trim + minúsculas)
- `assertCreatorName(name)` → `InvalidCreatorNameError`

A identidade continua um subdomínio genérico: o core **não** modela usuário nem sessão, só as regras de cadastro que a spec define.

### Quiz (`quiz/domain`)

**`quiz-details.ts`** — value objects como funções de parse:

| Função / constante | Regra |
| --- | --- |
| `QUIZ_TITLE_MAX_LENGTH = 95`, `parseQuizTitle(raw)` | trim; vazio → `null`; > 95 → `QuizTitleTooLongError` (RN-12) |
| `QUIZ_DESCRIPTION_MAX_LENGTH = 500`, `parseQuizDescription(raw)` | só espaços → `null`; > 500 → `QuizDescriptionTooLongError` (RN-13) |
| `QUIZ_VISIBILITIES = ["private", "unlisted"]`, `DEFAULT_QUIZ_VISIBILITY = "private"`, `assertQuizVisibility` | RN-14 |
| `UNTITLED_QUIZ_TITLE = "Quiz sem título"`, `displayQuizTitle(title)` | RN-12. É texto em PT porque vira dado persistido na cópia (RN-20) e é pesquisável (RN-19). |
| `duplicateQuizTitle(title)` | `"‹base› (cópia)"`, com a base truncada (e `trimEnd`) para caber em 95 (RN-20) |
| `quizSearchText(title)` | `normalizeSearchText(displayQuizTitle(title))` — gravado pelo adapter para a busca |

**`quiz.ts`** — agregado imutável (objeto + funções puras, no estilo funcional do projeto):

```ts
interface Quiz {
	id: string;
	ownerId: string;
	title: string | null;
	description: string | null;
	coverImageKey: string | null;
	visibility: QuizVisibility;
	status: "draft"; // "published" chega na 002
	createdAt: Date;
	updatedAt: Date;
	trashedAt: Date | null;
}
```

| Função | Invariantes |
| --- | --- |
| `newQuiz({ id, ownerId, details, coverImageKey, now })` | status `draft`, `createdAt = updatedAt = now`, `trashedAt = null` (RN-11, RN-18) |
| `changeQuizDetails(quiz, { details, coverImageKey }, now)` | proibido na lixeira → `QuizInTrashError`; atualiza `updatedAt` (RN-18, RN-22) |
| `trashQuiz(quiz, now)` | idempotente; **não** altera `updatedAt` (RN-18, RN-21) |
| `restoreQuiz(quiz)` | idempotente; limpa `trashedAt`, preserva o resto (RN-23) |
| `assertPermanentlyDeletable(quiz)` | só na lixeira → senão `QuizNotInTrashError` (RN-24) |
| `copyQuiz(source, { id, coverImageKey, now })` | proibido na lixeira; título via `duplicateQuizTitle`; novos timestamps (RN-20, RN-22) |
| `requireOwnedQuiz(quiz \| null, ownerId)` | inexistente ou de outro dono → `QuizNotFoundError` (RN-10) |

`restoreQuiz` e `trashQuiz` são idempotentes de propósito: um duplo clique em "Desfazer" (CA-23) não pode virar erro.

### Library (`library/domain`)

- `library-section.ts`: `LIBRARY_SECTIONS = ["recent", "drafts", "trash"]` (RN-16, RN-17).
- `library-search.ts`: `parseLibrarySearch(raw)` → `null` se vazio, senão `normalizeSearchText` (RN-19).
- Ordem da Lixeira (a spec não define): **excluídos mais recentemente primeiro** (`trashedAt` desc). Recentes e Rascunhos seguem `updatedAt` desc, com desempate por `id`.

### Erros de domínio

| Classe | `code` | Tradução tRPC | Quando |
| --- | --- | --- | --- |
| `QuizNotFoundError` (`NotFoundError`) | `QUIZ.NOT_FOUND` | `NOT_FOUND` | inexistente ou de outro dono (RN-10) |
| `QuizInTrashError` | `QUIZ.IN_TRASH` | `BAD_REQUEST` | editar/duplicar na lixeira (RN-22) |
| `QuizNotInTrashError` | `QUIZ.NOT_IN_TRASH` | `BAD_REQUEST` | excluir definitivamente fora da lixeira (RN-24) |
| `QuizTitleTooLongError` | `QUIZ.TITLE_TOO_LONG` | `BAD_REQUEST` | RN-12 |
| `QuizDescriptionTooLongError` | `QUIZ.DESCRIPTION_TOO_LONG` | `BAD_REQUEST` | RN-13 |
| `InvalidQuizVisibilityError` | `QUIZ.INVALID_VISIBILITY` | `BAD_REQUEST` | RN-14 |
| `InvalidCoverImageError` | `QUIZ.INVALID_COVER` | `BAD_REQUEST` | chave de outro dono ou objeto inexistente no storage (RN-15) |
| `InvalidCreatorNameError` | `IDENTITY.INVALID_NAME` | via hook Better Auth (`APIError` 400, `code: "INVALID_NAME"`) | RN-02 |

## Aplicação

### Casos de uso — `quiz/application`

Todos recebem `ownerId` da sessão e começam por `requireOwnedQuiz` quando operam sobre um quiz existente (RN-10). A saída comum é `QuizDetailsView`:

```ts
interface QuizDetailsView {
	id: string;
	title: string | null;
	description: string | null;
	coverImageUrl: string | null;
	visibility: QuizVisibility;
	status: "draft";
	questionCount: number; // 0 até a feature 002
	createdAt: Date;
	updatedAt: Date;
	trashedAt: Date | null;
}
```

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `createCreateQuiz` | `ownerId, title?, description?, visibility?, coverImageKey?` | `QuizDetailsView` | título, descrição, visibilidade, capa | `QuizRepository`, `ObjectStorage`, `IdGenerator`, `Clock` |
| `createUpdateQuizDetails` | `ownerId, quizId, title, description, visibility, cover: CoverChange` | `QuizDetailsView` | + `NOT_FOUND`, `IN_TRASH` | `QuizRepository`, `ObjectStorage`, `Clock` |
| `createDuplicateQuiz` | `ownerId, quizId` | `QuizDetailsView` (cópia) | `NOT_FOUND`, `IN_TRASH` | `QuizRepository`, `ObjectStorage`, `IdGenerator`, `Clock` |
| `createMoveQuizToTrash` | `ownerId, quizId` | `void` | `NOT_FOUND` | `QuizRepository`, `Clock` |
| `createRestoreQuiz` | `ownerId, quizId` | `QuizDetailsView` | `NOT_FOUND` | `QuizRepository`, `ObjectStorage` |
| `createDeleteQuizPermanently` | `ownerId, quizId` | `void` | `NOT_FOUND`, `NOT_IN_TRASH` | `QuizRepository`, `ObjectStorage` |
| `createGetQuizDetails` | `ownerId, quizId` | `QuizDetailsView` | `NOT_FOUND` | `QuizRepository`, `ObjectStorage` |

Regras de orquestração:

- **Capa nova** (`create` ou `cover.type = "set"`): `isMediaKeyOwnedBy(key, ownerId)` **e** `storage.exists(key)`; se falhar, `InvalidCoverImageError` sem alterar nada (CA-17).
- **Troca ou remoção de capa**: salva o quiz primeiro, depois `storage.delete(chaveAntiga)`. Se a remoção falhar, o objeto fica órfão (ver riscos), mas o quiz nunca aponta para um objeto apagado.
- **Duplicar com capa**: `storage.copy(origem, mediaKeyFor(ownerId, novoId, ext))` **antes** de salvar a cópia. Assim, remover a capa de um quiz não afeta o outro (CA-21).
- **Excluir definitivamente**: `storage.delete(capa)` **antes** de `quizzes.delete(id)`. `delete` no S3 é idempotente, então uma falha no meio pode ser repetida (CA-26).

### Caso de uso — `library/application`

| Caso de uso | Entrada | Saída | Portas |
| --- | --- | --- | --- |
| `createListLibrary` | `ownerId, section, search?` | `LibraryItem[]` (`id, title, coverImageUrl, visibility, status, questionCount, updatedAt, trashedAt`) | `LibraryQuizQuery`, `ObjectStorage` (URL da capa) |

### Portas novas ou alteradas

```ts
// packages/core/src/quiz/application/ports/quiz-repository.ts
export interface QuizRepository {
	findById(id: string): Promise<Quiz | null>;
	save(quiz: Quiz): Promise<void>; // upsert
	delete(id: string): Promise<void>;
}

// packages/core/src/library/application/ports/library-quiz-query.ts
export interface LibraryQuizQuery {
	list(criteria: {
		ownerId: string;
		section: LibrarySection;
		searchText: string | null; // já normalizado
	}): Promise<LibraryQuizRecord[]>; // ordenado conforme a seção
}

// packages/core/src/shared/application/ports/object-storage.ts (alteração)
export interface ObjectStorage {
	// ...métodos existentes
	copy(sourceKey: string, destinationKey: string): Promise<void>;
}
```

### Fakes em memória

- `quiz/testing/in-memory-quiz-repository.ts`: `InMemoryQuizRepository` (expõe `all()` para testes).
- `library/testing/in-memory-library-quiz-query.ts`: `InMemoryLibraryQuizQuery`, construído com uma fonte `() => LibraryQuizRecord[]`. Aplica os mesmos filtros e ordens do contrato e serve de especificação executável para o adapter Drizzle.
- `shared/testing/in-memory-object-storage.ts`: ganha `copy` e `keys()`.

## Adapters

### Banco — `packages/db`

**`src/schema/quiz.ts`** (nova; exportada por `schema/index.ts`)

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `text` PK | `IdGenerator` |
| `owner_id` | `text` not null → `user.id` `on delete cascade` | RN-10 |
| `title` | `text` null | RN-12 |
| `description` | `text` null | RN-13 |
| `cover_image_key` | `text` null | RN-15 |
| `visibility` | `pgEnum quiz_visibility('private','unlisted')` not null default `private` | RN-14 |
| `status` | `pgEnum quiz_status('draft')` not null default `draft` | RN-11 (a 002 acrescenta `published`) |
| `search_title` | `text` not null | `quizSearchText(title)`, calculado no adapter (RN-19) |
| `created_at`, `updated_at` | `timestamp with time zone` not null | RN-18 |
| `trashed_at` | `timestamp with time zone` null | RN-21 |

Índice `quiz_owner_trashed_updated_idx (owner_id, trashed_at, updated_at)`.

A busca é `search_title ILIKE '%' || termo || '%'`, com `%`, `_` e `\` escapados. Não é necessária a extensão `unaccent`, porque o texto já é gravado normalizado e o mesmo SQL roda em Postgres 18 e no PGlite.

**Repositórios**
- `src/repositories/quiz/drizzle-quiz-repository.ts`: `createDrizzleQuizRepository(db: Database): QuizRepository`, com `insert … on conflict (id) do update`.
- `src/repositories/library/drizzle-library-quiz-query.ts`: `createDrizzleLibraryQuizQuery(db)`. Filtros:
  - `recent`: `trashed_at is null`.
  - `drafts`: `trashed_at is null and status = 'draft'`.
  - `trash`: `trashed_at is not null`.
  - `questionCount` é a constante `0` até a 002 criar a tabela de perguntas.

**Better Auth**: com `rateLimit.storage = "database"`, regenerar `src/schema/auth.ts` via `npx @better-auth/cli generate`, o que acrescenta a tabela `rateLimit`.

Aplicação do schema: `pnpm db:push` (ainda sem migrations; ver roadmap).

### Storage — `packages/storage`

`createS3ObjectStorage` implementa `copy` com `CopyObjectCommand` (`CopySource: "{bucket}/{key}"` com cada segmento codificado). O R2 e o RustFS suportam a operação. Isso ganha teste unitário e um caso no `s3-object-storage.int.test.ts`.

### Autenticação — `packages/auth`

`src/create-auth.ts` exporta `createAuth(options)`; `src/index.ts` passa a apenas montar a instância de produção a partir do env e de `createDb()`.

```ts
interface CreateAuthOptions {
	db: Database;
	baseURL: string;
	secret: string;
	signUpEnabled: boolean;
	google?: {
		clientId: string;
		clientSecret: string;
		/** Somente testes: substitui a verificação do ID token e a leitura do perfil. */
		verifyIdToken?: (token: string) => Promise<boolean>;
		getUserInfo?: (token: unknown) => Promise<{ user: GoogleUser; data: unknown }>;
	};
}
```

Configuração aplicada:

| Opção Better Auth | Valor | Regra |
| --- | --- | --- |
| `emailAndPassword` | `enabled`, `minPasswordLength: 8`, `maxPasswordLength: 128`, `disableSignUp: !signUpEnabled` | RN-02, RN-05 |
| `socialProviders.google` | presente só se configurado; `disableSignUp: !signUpEnabled`, `prompt: "select_account"` | RN-03, RN-05 |
| `account.accountLinking` | `enabled: true`, **sem** `trustedProviders`: o vínculo implícito do Better Auth ocorre porque o Google informa `email_verified` | RN-04 |
| `rateLimit` | `enabled: true` (também em dev), `storage: "database"`, `customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 5 } }` | RN-07 |
| `session` | padrão (7 dias, renovada a cada 24 h, cookie persistente) | RN-08 |
| `hooks.before` em `/sign-up/email` | `normalizeCreatorName`/`normalizeEmail` no body; `assertCreatorName`, com erro → `APIError("BAD_REQUEST", { code: "INVALID_NAME" })` | RN-02 |
| `trustedOrigins` | `[BETTER_AUTH_URL]` (inalterado) | — |

Mensagens genéricas de credencial (RN-06) já são o comportamento do Better Auth (`INVALID_EMAIL_OR_PASSWORD` para e-mail inexistente e para senha errada). O teste garante que continue assim.

### Ambiente — `packages/env`

| Variável | Tipo | Observação |
| --- | --- | --- |
| `AUTH_SIGN_UP_ENABLED` | `stringbool`, default `true` | RN-05 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | opcionais, mas as duas juntas (`refine`) | Sem elas, o Google fica desligado e o botão some. Em produção são obrigatórias pelo checklist de deploy. Redirect: `{BETTER_AUTH_URL}/api/auth/callback/google`. |

Atualizar `apps/web/.env.example` e `CLAUDE.md`.

### Real-time

Não se aplica a esta feature.

## API — `packages/api`

**Middleware de erros** (`src/index.ts`): `NotFoundError` → `NOT_FOUND`; demais `DomainError` → `BAD_REQUEST` (como hoje). O `data.domainCode` é mantido.

| Procedure | Tipo | Auth | Entrada (forma zod) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `auth.settings` | query | pública | — | `{ signUpEnabled, googleEnabled }` | — |
| `library.list` | query | protegida | `{ section: z.enum(LIBRARY_SECTIONS), search?: z.string().max(200) }` | `LibraryItem[]` | — |
| `quiz.get` | query | protegida | `{ quizId: z.string() }` | `QuizDetailsView` | `QUIZ.NOT_FOUND` |
| `quiz.create` | mutation | protegida | `{ title?: z.string().nullable(), description?: z.string().nullable(), visibility?: z.enum(QUIZ_VISIBILITIES), coverImageKey?: z.string().nullable() }` | `QuizDetailsView` | título, descrição, visibilidade, capa |
| `quiz.updateDetails` | mutation | protegida | `{ quizId, title: z.string().nullable(), description: z.string().nullable(), visibility: z.enum(...), cover: z.discriminatedUnion("type", [keep, set{key}, remove]) }` | `QuizDetailsView` | + `NOT_FOUND`, `IN_TRASH` |
| `quiz.duplicate` | mutation | protegida | `{ quizId }` | `QuizDetailsView` | `NOT_FOUND`, `IN_TRASH` |
| `quiz.moveToTrash` | mutation | protegida | `{ quizId }` | `void` | `NOT_FOUND` |
| `quiz.restore` | mutation | protegida | `{ quizId }` | `QuizDetailsView` | `NOT_FOUND` |
| `quiz.deletePermanently` | mutation | protegida | `{ quizId }` | `void` | `NOT_FOUND`, `NOT_IN_TRASH` |
| `media.requestUpload` | mutation | protegida | existente | existente | existente |

Os limites de tamanho **não** são duplicados no zod (a regra é do core). Os enums vêm das constantes exportadas pelo core. Removo `privateData`, que era código de exemplo do scaffold.

**Ligações novas**
- `container.ts`: `Adapters` ganha `quizzes: QuizRepository`, `libraryQuizzes: LibraryQuizQuery` e `authSettings: { signUpEnabled: boolean; googleEnabled: boolean }`; `useCases` ganha os oito casos de uso acima.
- `composition-root.ts`: uma instância de `createDb()` compartilhada pelos repositórios; `authSettings` lido do env.
- `context.ts`: continua usando a instância `auth` de produção.

## UI — `apps/web` e `packages/ui`

### Rotas

| Rota | Arquivo | Conteúdo |
| --- | --- | --- |
| `/login` | `routes/login.tsx` | `validateSearch`: `{ mode?: "sign-in" \| "sign-up", redirect?: string, error?: string }`. Padrão `sign-in`. Já conectado → `redirect` seguro. |
| `/library` | `routes/_auth/library.tsx` | `validateSearch`: `{ section = "recent", q?: string }`. Layout com navegação lateral (Recentes, Rascunhos, Lixeira), pesquisa e botão **Criar**. |
| `/quizzes/$quizId` | `routes/_auth/quizzes.$quizId.tsx` | Detalhes, ou aviso de lixeira, ou "quiz não encontrado". |

Mudanças em rotas existentes:
- `routes/_auth/route.tsx` redireciona para `/login?redirect=<href atual>` (RN-09).
- `routes/_auth/dashboard.tsx` é removida.
- A home e o cabeçalho passam a apontar para `/library`.

### Componentes do app — `apps/web/src`

| Arquivo | Responsabilidade |
| --- | --- |
| `components/auth/sign-in-form.tsx`, `sign-up-form.tsx` | PT-BR. Validação com as constantes de `identity/domain/sign-up-rules`. O cadastro mostra o aviso de cadastros fechados quando `auth.settings.signUpEnabled` é falso. |
| `components/auth/google-sign-in-button.tsx` | `authClient.signIn.social({ provider: "google", callbackURL: redirect, errorCallbackURL: "/login?mode=…&error=…" })`. Só aparece com `googleEnabled`. |
| `lib/auth-error-messages.ts` | Mapeia códigos para PT-BR: `INVALID_EMAIL_OR_PASSWORD`, `USER_ALREADY_EXISTS*`, `INVALID_NAME`, `PASSWORD_TOO_SHORT`/`LONG`, HTTP 429, `signup_disabled`. Código desconhecido → mensagem genérica. |
| `lib/safe-redirect.ts` | Aceita só caminhos internos (começam com `/`, não com `//` nem `/\`). Senão `/library`. Evita open redirect. |
| `components/library/library-nav.tsx` | Seções, com a ativa destacada no estilo `sidebar-primary` (roxo, como no Kahoot). |
| `components/library/library-search.tsx` | Input com *debounce* de 300 ms, sincronizado com `?q=`. |
| `components/library/quiz-list.tsx`, `quiz-list-item.tsx` | Capa, título (`displayQuizTitle`), "0 perguntas", visibilidade, tempo relativo e menu de ações por seção. |
| `components/library/library-empty-state.tsx` | Estados vazios de Recentes/Rascunhos (com CTA), Lixeira e pesquisa sem resultado. |
| `components/quiz/quiz-cover.tsx` | Imagem ou placeholder padrão (bloco roxo com a marca). |
| `components/quiz/quiz-details-dialog.tsx` | Criar e editar. TanStack Form com contadores 0/95 e 0/500, visibilidade e `CoverImageField`. |
| `components/quiz/cover-image-field.tsx` | `media.requestUpload`, depois `uploadFile` com progresso. Pré-visualização, trocar e remover. Em falha, mantém a capa anterior. |
| `components/quiz/delete-permanently-dialog.tsx` | Confirmação explícita (RN-24). |
| `components/quiz/quiz-details-view.tsx` | Apresentação dos detalhes (CA-28) e do estado de lixeira (CA-24). Testável sem router. |
| `lib/upload-file.ts` | PUT via `XMLHttpRequest` (o `fetch` não reporta progresso de upload), usando os headers devolvidos pela API. |
| `lib/format-relative-time.ts` | `Intl.RelativeTimeFormat("pt-BR")`, com `now` injetável: "agora", "há 2 meses". |
| `lib/quiz-mutations.ts` | Hooks de mutation que invalidam `library.list` e `quiz.get`. `moveToTrash` mostra um toast (sonner) com a ação **Desfazer** → `quiz.restore` (CA-23). |

Também passam para PT-BR `components/header.tsx` e `components/user-menu.tsx` (RN-25).

### Design system — `packages/ui`

- Adicionar via `npx shadcn@latest add dialog alert-dialog radio-group badge -c packages/ui` e reestilizar ao visual Kahoot: `rounded-md`, títulos `font-bold`, ações com `Button` pressionável.
- `Badge` ganha as variantes `private` e `unlisted`.
- `Input` e `Textarea` passam a `h-10` e `text-sm`, com foco `ring-primary`, alinhados aos botões.
- Atualizar a página `/design-system` com os novos componentes.

## Estratégia de testes

Camada mais baixa possível. Os testes de conta usam `createAuth` com PGlite (`createTestDb`) e chamam o `auth.handler(new Request(...))` real, então o limitador de tentativas e os hooks participam.

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | auth (PGlite) · E2E | creates the account and a session on email sign-up · sign up lands on empty library | `packages/auth/src/create-auth.test.ts` · `apps/web/e2e/auth.spec.ts` |
| CA-02 | auth | rejects sign-up with an existing email regardless of case and surrounding spaces | `create-auth.test.ts` |
| CA-03 | domínio · auth · componente | enforces name 2–50 and accepts the boundaries · rejects name 1/51 and password 7/129 · shows field messages | `core/src/identity/domain/sign-up-rules.test.ts` · `create-auth.test.ts` · `apps/web/src/components/auth/sign-up-form.test.tsx` |
| CA-04 | auth · E2E | signs in with correct credentials · sign in lands on library | `create-auth.test.ts` · `auth.spec.ts` |
| CA-05 | auth · unidade web | returns the same error for unknown email and wrong password · maps to one PT-BR message | `create-auth.test.ts` · `apps/web/src/lib/auth-error-messages.test.ts` |
| CA-06 | auth | blocks sign-in after 5 failed attempts and allows it after the window (`vi.setSystemTime`) | `create-auth.test.ts` |
| CA-07 | auth · manual | creates an account on first Google sign-in (ID token com verificação simulada) · smoke com Google real no checklist de deploy | `create-auth.test.ts` |
| CA-08 | auth | links Google sign-in to the existing account with the same email | `create-auth.test.ts` |
| CA-09 | auth · API · componente | with sign-up disabled: email sign-up rejected, new Google user gets `signup_disabled`, existing users sign in both ways · `auth.settings` reflects config · closed notice | `create-auth.test.ts` · `packages/api/src/routers/auth.test.ts` · `sign-up-form.test.tsx` |
| CA-10 | E2E | sign out returns home and library requires login | `auth.spec.ts` |
| CA-11 | E2E | session survives a new browser context with the saved storage state | `auth.spec.ts` |
| CA-12 | unidade web · E2E | accepts internal paths and rejects external/protocol-relative ones · deep link returns after login | `apps/web/src/lib/safe-redirect.test.ts` · `auth.spec.ts` |
| CA-13 | componente · E2E | renders empty state with create action · new account sees empty library | `components/library/library-empty-state.test.tsx` · `library.spec.ts` |
| CA-14 | aplicação · adapter · E2E | creates a private draft with zero questions stamped now · round-trips a quiz · created quiz tops Recentes and Rascunhos | `core/src/quiz/application/create-quiz.test.ts` · `packages/db/src/repositories/quiz/drizzle-quiz-repository.test.ts` · `library.spec.ts` |
| CA-15 | domínio | treats blank titles as absent and displays "Quiz sem título" | `core/src/quiz/domain/quiz-details.test.ts` |
| CA-16 | domínio · aplicação · componente | accepts 95/500 and rejects 96/501 code points · failed update leaves quiz unchanged · counters and limit messages | `quiz-details.test.ts` · `update-quiz-details.test.ts` · `quiz-details-dialog.test.tsx` |
| CA-17 | aplicação · adapter int · E2E | sets, replaces (deletes old object) and removes cover; rejects foreign or missing keys · SVG/PDF/10,1 MB já cobertos em `request-media-upload.test.ts` · upload real de PNG | `update-quiz-details.test.ts` · `s3-object-storage.int.test.ts` · `library.spec.ts` |
| CA-18 | aplicação · adapter | updating details bumps updatedAt · recent section orders by updatedAt desc | `update-quiz-details.test.ts` · `drizzle-library-quiz-query.test.ts` |
| CA-19 | aplicação · adapter · API | every quiz use case treats another owner's quiz as not found · list filters by owner · router maps to NOT_FOUND | `core/src/quiz/application/*.test.ts` · `drizzle-library-quiz-query.test.ts` · `packages/api/src/routers/quiz.test.ts` |
| CA-20 | domínio · adapter · componente | normalizes accents, case and spaces · search matches "biblia" in "Bom de Bíblia (Junho)" and "BÍBLIA KIDS", escapes `%`/`_` · no-results state | `core/src/shared/domain/search-text.test.ts` · `drizzle-library-quiz-query.test.ts` · `library-empty-state.test.tsx` |
| CA-21 | aplicação · adapter int | copies fields and cover object to a new key, leaves original untouched | `core/src/quiz/application/duplicate-quiz.test.ts` · `s3-object-storage.int.test.ts` (copy) |
| CA-22 | domínio | truncates the base so the copy title fits 95 characters | `quiz-details.test.ts` |
| CA-23 | aplicação · adapter · E2E | trashing keeps updatedAt and moves between sections; restore is idempotent · delete then undo | `move-quiz-to-trash.test.ts`, `restore-quiz.test.ts` · `drizzle-library-quiz-query.test.ts` · `library.spec.ts` |
| CA-24 | aplicação · componente | update/duplicate on trashed quiz throw `QUIZ.IN_TRASH` · details view shows only trash actions | `update-quiz-details.test.ts`, `duplicate-quiz.test.ts` · `components/quiz/quiz-details-view.test.tsx` |
| CA-25 | aplicação | restore preserves all fields including updatedAt | `restore-quiz.test.ts` |
| CA-26 | aplicação · adapter · E2E | requires trash, deletes cover before row · delete removes the row · cancel keeps / confirm removes | `delete-quiz-permanently.test.ts` · `drizzle-quiz-repository.test.ts` · `library.spec.ts` |
| CA-27 | adapter · componente | empty trash returns no items · empty trash message | `drizzle-library-quiz-query.test.ts` · `library-empty-state.test.tsx` |
| CA-28 | aplicação · componente | get returns view with cover URL and zero questions · details view shows fields and actions | `get-quiz-details.test.ts` · `quiz-details-view.test.tsx` |

Testes de apoio sem CA direto:
- `core/src/shared/domain/media-key.test.ts` e o `request-media-upload.test.ts` refatorado;
- `core/src/library/application/list-library.test.ts`, contra os fakes;
- `packages/api/src/routers/library.test.ts`;
- `apps/web/src/lib/format-relative-time.test.ts`;
- `apps/web/src/lib/upload-file.test.ts`, com XHR falso.

O E2E usa um e-mail único por teste (sem limpeza de banco) e roda com `pnpm infra:up`.

## Dados e migração

- `pnpm db:push` depois de: regenerar o schema do Better Auth (tabela `rateLimit`) e criar `schema/quiz.ts`.
- Não há dados existentes a migrar: a tabela `quiz` é nova e as contas atuais continuam válidas.

## Riscos e decisões

1. **Risco aceito — tomada de conta pré-criada (RN-04 sem verificação de e-mail).** Como o cadastro por senha não verifica o e-mail, alguém pode criar uma conta com o e-mail de outra pessoa. Quando a dona real entrar com Google, o vínculo automático a coloca **dentro da conta criada pelo invasor**, que continua sabendo a senha.
   - **Decisão (2026-09-13):** aceitar o risco por enquanto, dado o uso pessoal. Nenhuma mitigação nesta feature; o vínculo segue o comportamento padrão do Better Auth.
   - **Acompanhamento:** a verificação de e-mail no cadastro por senha fica registrada no roadmap e deve ser entregue antes de abrir o Quizio ao público. Com e-mails verificados, o risco deixa de existir.
   - Alternativas descartadas: remover a senha ao vincular o Google (muda a experiência de quem tem senha) e desligar o vínculo implícito (contraria a RN-04).
2. **Limite de tentativas por IP na Vercel.** O Better Auth lê `x-forwarded-for`, que a Vercel preenche. Os valores (5 por 60 s) são constantes em `create-auth.ts`, fáceis de ajustar. Pessoas atrás do mesmo IP (uma sala de aula) compartilham o limite, o que é aceitável para login de criadores.
3. **Uploads órfãos.** Formulário cancelado depois do upload, ou falha ao apagar a capa antiga. Aceito agora; uma rotina de limpeza fica para depois (já prevista no ADR 0003).
4. **Sem paginação na biblioteca.** Suficiente para uso pessoal (dezenas a centenas de quizzes). Se crescer, a porta `LibraryQuizQuery` ganha cursor sem afetar o domínio.
5. **Google opcional em dev.** Sem credenciais, o botão some. O smoke manual do CA-07 exige um projeto OAuth de teste. Entra no checklist de deploy do roadmap.
6. **Contagem de caracteres por code point.** Pode divergir de `maxLength` do HTML, que conta UTF-16. O formulário usa o contador do core, não `maxLength`.
7. **ADR proposto:** [0007 — Autenticação com Better Auth, Google e limite persistido](../../../docs/adr/0007-autenticacao-better-auth-google.md).
8. **Atualizações de documentação:** `docs/architecture.md` ganha `NotFoundError → NOT_FOUND`, o contexto `identity` no core e o padrão de *read model* da `library`; `CLAUDE.md` e `.env.example` ganham as variáveis novas.
