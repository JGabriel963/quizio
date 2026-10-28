---
spec: "044"
status: in-progress # todo | in-progress | done
---

# Tarefas — 044 Servidor MCP para agentes de IA

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0023](../../../docs/adr/0023-servidor-mcp-para-agentes.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.
>
> **Duas etapas, um PR cada** (plano, "Abordagem"):
>
> - **Etapa 1 (T01 a T41)**: conexão, chaves, "Agentes de IA", o servidor e as ferramentas de conta, biblioteca, quizzes, perguntas, arquivos e temas.
> - **Etapa 2 (T42 a T51)**: partida ao vivo, atribuições, relatórios, grupos e notificações.
>
> **Testes de integração novos**: `put` do S3 e `http-remote-files` (T22), contra o RustFS e um servidor HTTP local.

# Etapa 1

## Fase 0 — Preparação

- [x] **T01** Better Auth 1.7.14 e dependências novas, sem mudar comportamento
  - Teste: os existentes. `packages/auth/src/create-auth.test.ts`, `account-credentials.test.ts` e `apps/web/e2e/auth.spec.ts` verdes depois da troca.
  - Implementar:
    - no catálogo (`pnpm-workspace.yaml`): `better-auth` 1.7.14 e, na mesma versão fixa, `@better-auth/mcp`, `@better-auth/oauth-provider` e `@better-auth/cimd`;
    - `@modelcontextprotocol/server` e `@modelcontextprotocol/client` 2.4.0;
    - `jose` (auth) e `undici` (storage), por `catalog:` quando usados por mais de um pacote;
    - `pnpm install`.
  - Regenerar `schema/auth.ts` com `npx auth@1.7.14 generate` (sem plugins novos ainda) e conferir no diff que as tabelas atuais não mudam. Se mudarem, gerar a migração junto.
  - Cobre: plano, "Riscos" (troca de versão)

## Fase 1 — Domínio

- [x] **T02** [P] `core/agents` — chave de acesso
  - Teste: `agents/domain/access-key.test.ts`
    - "a key name has 1 to 50 characters, trimmed"
    - "refuses an empty or 51-character name (AGENT.INVALID_KEY_NAME)"
    - "isAccessKeyToken recognizes the qz_ prefix"
  - Implementar: `agents/domain/access-key.ts`, com `AccessKey`, `ACCESS_KEY_NAME_LENGTH`, `ACCESS_KEY_PREFIX`, `parseAccessKeyName` e `isAccessKeyToken`, e `agents/domain/agent-errors.ts`, com os seis erros do plano
  - Cobre: CA-06 · RN-05

- [x] **T03** [P] `core/agents` — conexão, identidade e limite
  - Teste: `agents/domain/agent-connection.test.ts`
    - "agentNameOf uses the registered name, or the return address's domain"
    - "a connection is idle after 90 days without use, counting from connecting when never used"
    - "retryAfterSeconds counts to the end of the fixed window"
  - Implementar: `agents/domain/agent-connection.ts` (`AgentConnection`, `agentNameOf`, `isConnectionIdle`), `agent-identity.ts` (`AgentIdentity`) e `agent-settings.ts` (`AgentSettings`, `AGENT_DEFAULT_REQUESTS_PER_MINUTE` 120, `AGENT_DEFAULT_MAX_ACCESS_KEYS` 20, `AGENT_DEFAULT_CONNECTION_IDLE_DAYS` 90, `retryAfterSeconds`)
  - Cobre: CA-10, CA-28 · RN-04, RN-18, RN-33

- [x] **T04** [P] `core/quiz` — rascunho de pergunta de qualquer tipo
  - Teste: `quiz/domain/question-draft.test.ts`
    - "builds a quiz question with 2 to 6 answers in 4 or 6 slots, multiple when more than one is correct"
    - "builds true/false, type answer, slider and puzzle questions"
    - "uses the type's default time limit and refuses one the type does not offer"
    - "refuses a 161-character statement, a 76-character answer, a 21-character accepted answer and a malformed slider number"
    - "keeps an incomplete question (no statement, one answer, no correct) for the editor to flag"
    - "marks every question built from a draft as made with AI"
  - Implementar: `quiz/domain/question-draft.ts`, com `QuestionDraft` e `questionFromDraft`, sobre os parsers de `question.ts`
  - Cobre: CA-11, CA-13 · RN-21, RN-22

- [x] **T05** `core/quiz` — alteração de pergunta (depois de T04)
  - Teste: `quiz/domain/question-patch.test.ts`
    - "changes only the fields sent and keeps the id and the AI mark"
    - "a type change without content starts the new type blank, keeps the statement and fits the time limit"
    - "sets, changes and removes the image with its placement, crop and alt text"
    - "applies the same limits as a draft"
  - Implementar: `quiz/domain/question-patch.ts`, com `QuestionPatch`, `draftOf` e `patchedQuestion`
  - Cobre: CA-14 · RN-21

- [x] **T06** [P] `core/media` — tipo pelos bytes e erros de link
  - Teste: `media/domain/file-signature.test.ts`
    - "recognizes JPEG, PNG, GIF, WebP and PDF by their first bytes"
    - "returns null for HTML, text and empty bytes"
  - Implementar: `media/domain/file-signature.ts` (`sniffFileType`) e `media/domain/remote-file-errors.ts` (`MEDIA.INVALID_URL`, `URL_NOT_PUBLIC`, `URL_UNREACHABLE`, `URL_TOO_LARGE`)
  - Cobre: CA-16 · RN-24

## Fase 2 — Aplicação (casos de uso, portas e fakes)

- [x] **T07** `core/agents` — portas e fakes
  - Teste: `agents/testing/in-memory-access-key-repository.test.ts`
    - "add refuses the key over the limit"
    - "findByHash ignores revoked keys"
    - "markUsed writes at most once per throttle window"
    - "revokeAllFor removes only that owner's keys"
  - Implementar:
    - portas em `agents/application/ports/`: `access-key-repository.ts`, `access-key-secrets.ts`, `agent-token-verifier.ts` e `agent-connection-store.ts`;
    - fakes em `agents/testing/`: `InMemoryAccessKeyRepository`, `FakeAccessKeySecrets`, `FakeAgentTokenVerifier`, `InMemoryAgentConnectionStore` e `anAccessKey()`.
  - Cobre: RN-05, RN-16

- [x] **T08** `core/agents` — criar, listar e revogar chaves
  - Teste:
    - `create-access-key.test.ts`: "returns the secret once and stores only its hash and start"; "refuses the 21st active key (AGENT.KEY_LIMIT)"; "refuses an invalid name before writing"
    - `list-agent-access.test.ts`: "lists connections with the agent's name and last use, and keys with only their start"; "leaves out connections idle for 90 days"
    - `revoke-access-key.test.ts`: "revokes the owner's key"; "someone else's key is not found (AGENT.KEY_NOT_FOUND)"
  - Implementar: `createCreateAccessKey`, `createListAgentAccess`, `createRevokeAccessKey` e as views (`AccessKeyView`, `AgentConnectionView`)
  - Cobre: CA-05, CA-06, CA-07, CA-10 · RN-05, RN-14, RN-15, RN-18, RN-35

- [x] **T09** `core/agents` — admitir um pedido
  - Teste: `admit-agent-request.test.ts`
    - "a valid access key gives the owner's identity and records its use"
    - "a verified token whose connection still exists gives the user's identity"
    - "no token, an unknown or revoked key, an invalid token and a disconnected connection are unauthorized"
    - "a connection idle for 90 days is unauthorized, a key idle as long is not"
    - "the 121st request in a minute is rate limited with the seconds to wait, and an invalid token never counts"
  - Implementar: `createAdmitAgentRequest`
  - Cobre: CA-05, CA-07, CA-09, CA-10, CA-28 · RN-06, RN-16, RN-18, RN-33

- [x] **T10** `core/agents` — desconectar e revogar tudo
  - Teste:
    - `disconnect-agent.test.ts`: "disconnects the user's connection"; "someone else's connection is not found"
    - `revoke-all-agent-access.test.ts`: "removes every key and connection of the user and nobody else's"
  - Implementar: `createDisconnectAgent`, `createRevokeAllAgentAccess`
  - Cobre: CA-07, CA-08 · RN-16, RN-17

- [x] **T11** `core/quiz` — adicionar perguntas em lote
  - Teste: `quiz/application/add-questions.test.ts`
    - "inserts the drafts after the given question, or first"
    - "replaces the lone blank question"
    - "refuses going past 200 questions and writes nothing"
    - "refuses an image key that is not the owner's media"
    - "marks the quiz edited, so a published quiz shows unpublished changes"
  - Implementar: `createAddQuestions`, generalizando `appendGeneratedQuestions` para uma posição (`question-list.ts`)
  - Cobre: CA-11, CA-13 · RN-21, RN-22

- [x] **T12** `core/quiz` — editar uma pergunta inteira
  - Teste: `quiz/application/edit-question.test.ts`
    - "applies a patch and keeps the AI mark"
    - "releases an image no longer used"
    - "an edit from the agent and one from the editor on other fields both stay"
    - "someone else's quiz is not found"
  - Implementar: `createEditQuestion`
  - Cobre: CA-14, CA-29 · RN-21, RN-34

- [x] **T13** `core/quiz` — criar o quiz já com perguntas e tema
  - Teste: `quiz/application/create-quiz.test.ts`
    - "with drafts, the quiz starts with them instead of the blank question, all made with AI"
    - "an invalid draft refuses the whole quiz and writes nothing"
    - "starts with the chosen ready-made or custom theme"
    - "without drafts it still starts with one blank question" (o comportamento atual)
  - Implementar: `questions?` e o tema em `CreateQuizInput`
  - Cobre: CA-11 · RN-20, RN-22

- [x] **T14** `core/media` — importar um arquivo por link
  - Teste: `media/application/import-remote-file.test.ts`
    - "imports a public PNG as the owner's media and returns its key"
    - "uses the type the bytes show, not the one the server declared"
    - "refuses a PDF as an image, an 11 MB image and an HTML page without writing"
    - "passes the URL errors through"
    - "a group file gets the group's key and pending upload; a theme file the theme's"
  - Implementar:
    - `put` em `ObjectStorage` e no `InMemoryObjectStorage`;
    - as portas `media/application/ports/remote-files.ts` e `remote-file-uploads.ts`;
    - o fake `media/testing/fake-remote-files.ts`;
    - o caso de uso `createImportRemoteFile`.
  - Cobre: CA-16 · RN-24

- [x] **T15** [P] `core/identity` — renomear o criador
  - Teste: `identity/application/rename-creator.test.ts`
    - "renames with the sign-up name rules"
    - "refuses a 1- or 51-character name"
  - Implementar: `rename` em `AccountRepository` e no fake, e `createRenameCreator`
  - Cobre: RN-19

## Fase 3 — Adapters

- [x] **T16** `packages/db` — tabela e repositório das chaves
  - Teste: `repositories/agents/drizzle-access-key-repository.test.ts` (PGlite)
    - "adds, lists and finds a key by its hash"
    - "two adds at the same time never pass the limit"
    - "revoke only touches the owner's key"
    - "markUsed writes at most once a minute"
    - "deleting the user deletes their keys"
  - Implementar: `schema/agents.ts` (`access_key`) e `createDrizzleAccessKeyRepository`, com `pg_advisory_xact_lock` no `add`
  - Cobre: CA-06, CA-07 · RN-05

- [x] **T17** `packages/auth` — o Better Auth como servidor OAuth do MCP
  - Teste: `packages/auth/src/create-auth-oauth.test.ts` (o handler real sobre PGlite)
    - "a client registers dynamically, the signed-in user consents and the code exchange with PKCE returns an access token for /mcp"
    - "a client identified by a metadata document URL is accepted" (com o `fetchClientMetadataResource` fixo)
    - "a redirect_uri other than the registered one is refused and no consent is stored"
    - "denying consent returns access_denied to the client"
    - "registration is rate limited per IP"
    - "sign-up stays closed on the login of the flow when the instance closes it"
  - Teste: `create-auth.test.ts`
    - "changing the password calls onPasswordChanged with the user"
    - "signing out does not"
  - Implementar:
    - `agents` e `onPasswordChanged` em `CreateAuthOptions`;
    - os plugins `jwt()`, `mcp({ loginPage: "/login", consentPage: "/connect", resource, refreshTokenExpiresIn })` e `cimd(...)`;
    - a regra `/oauth2/register` no `rateLimit.customRules`;
    - o `hooks.after` de `/change-password`;
    - regenerar `schema/auth.ts` com os plugins e conferir os `ON DELETE CASCADE` para `user`.
  - Cobre: CA-01, CA-04, CA-08 · RN-03, RN-04, RN-06, RN-17

- [x] **T18** `packages/auth` — verificador dos tokens
  - Teste: `agent-token-verifier.test.ts` (com o fluxo de T17)
    - "a token issued for /mcp verifies with the user and the client"
    - "a token for another audience, an expired one and garbage give null"
    - "keys are read in process and cached"
  - Implementar: `createBetterAuthAgentTokenVerifier(auth, { issuer, audience })`, com `jose` e `auth.api.getJwks()`
  - Cobre: CA-01, CA-09 · RN-02

- [x] **T19** `packages/db` — conexões dos agentes sobre as tabelas do OAuth
  - Teste: `repositories/agents/drizzle-agent-connection-store.test.ts` (PGlite, com linhas de `oauth_client`/`oauth_consent`/tokens inseridas como o plugin grava)
    - "lists the user's consents with the client's name and redirect, and the last use"
    - "find returns null after the consent is deleted"
    - "disconnect deletes the consent, that client's tokens for the user and the usage, and only those"
    - "disconnectAll leaves other users untouched"
    - "markUsed writes at most once a minute"
  - Implementar: `agent_connection_usage` em `schema/agents.ts` e `createDrizzleAgentConnectionStore`
  - Cobre: CA-07, CA-08, CA-10 · RN-14, RN-16, RN-17

- [x] **T20** [P] `packages/db` — renomear a conta
  - Teste: `repositories/identity/drizzle-account-repository.test.ts` › "rename writes the user's name and updatedAt"
  - Implementar: `rename` em `createDrizzleAccountRepository`
  - Cobre: RN-19

- [x] **T21** `packages/db` — migração (depois de T16, T17 e T19)
  - Teste: `repositories/agents/agents-schema.test.ts` › "deleting a user cascades to keys, usage, consents and tokens"
  - Implementar:
    - `pnpm db:generate` gera `0017_agents.sql`, que é commitada;
    - aplicar localmente com `psql` no container (nota da máquina sobre o `db:push`).
  - Cobre: RN-17

- [x] **T22** [P] `packages/storage` — `put` e arquivos por link
  - Teste:
    - `s3-object-storage.int.test.ts` › "put writes an object that read and exists see"
    - `http-remote-files.test.ts` › "isPublicAddress refuses private, loopback, link-local, CGNAT, metadata and IPv4-mapped IPv6 addresses"
    - `http-remote-files.int.test.ts` (servidor local com `allowPrivateNetworks`):
      - "reads the bytes, the type and the file name"
      - "stops past maxBytes"
      - "gives up after the timeout and after 3 redirects"
      - "refuses a redirect to a private address when private networks are not allowed"
  - Implementar: `put` em `createS3ObjectStorage` (`PutObjectCommand`) e `createHttpRemoteFiles`, com o `lookup` do `undici` e os redirecionamentos à mão
  - Cobre: CA-16 · RN-24

- [x] **T23** [P] `packages/api` — segredos das chaves
  - Teste: `random-access-key-secrets.test.ts`
    - "a secret is qz_ plus 43 base64url characters and its start is the first 9"
    - "hashOf gives the stored hash"
    - "two secrets differ"
  - Implementar: `createRandomAccessKeySecrets` com `node:crypto`
  - Cobre: RN-05, RN-35

## Fase 4 — API e composition root

- [x] **T24** Ligações, env e harness de teste
  - Teste:
    - `packages/api/src/testing/test-context.test.ts` (novo) › "exposes the container and the agents' fakes"
    - ~~`packages/env` › "AGENT_* default to 120, 20 and 90 and refuse values out of range"~~ — o pacote `env` não tem testes nem Vitest; os limites e padrões ficam no schema zod, como as outras variáveis
  - Implementar:
    - **env**: `AGENT_REQUESTS_PER_MINUTE`, `AGENT_MAX_ACCESS_KEYS` e `AGENT_CONNECTION_IDLE_DAYS` em `packages/env/src/server.ts` e em `apps/web/.env.example`;
    - **container**: `Adapters` e `useCases` novos em `container.ts`, e `RemoteFileUploads` montado sobre os três casos de uso de envio;
    - **composition root**: o verificador, `remoteFiles`, `agentSettings`, os repositórios e `mcpSettings` em `composition-root.ts`;
    - **auth**: `onPasswordChanged` em `packages/auth/src/index.ts`, com `createRevokeAllAgentAccess` sobre os repositórios Drizzle;
    - **harness**: `createTestApi` devolve `container` e os fakes de agentes.
  - Cobre: RN-05, RN-17, RN-18, RN-33

- [x] **T25** `packages/api` — router `agent`
  - Teste: `routers/agent.test.ts`
    - "access lists the caller's connections and keys and the server URL"
    - "createKey returns the secret once"
    - "createKey refuses the 21st (AGENT.KEY_LIMIT) and a bad name"
    - "revokeKey and disconnect act only on the caller's"
    - "everything needs a session"
  - Implementar: `routers/agent.ts`, montado em `routers/index.ts`
  - Cobre: CA-05, CA-06, CA-07, CA-30 · RN-12 a RN-16

## Fase 5 — Servidor MCP (`packages/mcp`)

- [x] **T26** O pacote, as ferramentas e os erros
  - Teste: `packages/mcp/src/server.test.ts` (cliente em memória)
    - "initialize returns Quizio's instructions"
    - "a read tool is read-only, a write tool is not destructive and a destructive one says so"
    - "a domain error comes back as isError with its code and message"
    - "a not found error looks the same whether the thing is missing or someone else's"
    - "an unexpected error comes back as INTERNAL without details"
  - Implementar:
    - `packages/mcp`: `package.json` com os exports `./*`, `tsconfig` e `vitest.config.ts`;
    - `define-tool.ts`, `tool-errors.ts`, `links.ts`, `instructions.ts`, `server.ts` e `testing/connect-test-client.ts`.
  - Cobre: CA-15, CA-26 · RN-10, RN-11

- [x] **T27** O endereço HTTP
  - Teste: `packages/mcp/src/handler.test.ts` (`Request` → `Response`)
    - "no bearer, an unknown key and an invalid token get 401 with WWW-Authenticate pointing to the resource metadata"
    - "an access key lists the tools and calls list_quizzes for its owner"
    - "the 121st request in a minute gets 429 with Retry-After"
    - "OPTIONS answers CORS for any origin with Authorization allowed"
    - "GET and DELETE get 405"
    - "a revoked key gets 401" (no lugar de "the token never appears in a log": o handler não registra nada do pedido, e não há log para conferir)
  - Implementar: `handler.ts` (`createMcpHandler`), sobre o `WebStandardStreamableHTTPServerTransport` sem sessão e com respostas JSON
  - Cobre: CA-05, CA-09, CA-28 · RN-01, RN-06, RN-33

- [x] **T28** Ferramentas de conta e biblioteca
  - Teste: `tools/account.test.ts`, `tools/library.test.ts`
    - "get_account gives name, email and the assistant's quota"
    - "rename_account follows the sign-up rules"
    - "list_quizzes lists a section with search, with links"
    - "get_creator_profile and get_others_quiz read a public quiz and a quiz shared in the caller's group"
    - "get_others_quiz of a private quiz is not found"
  - Implementar: `tools/account.ts`, `tools/library.ts`
  - Cobre: CA-15 · RN-19, RN-20

- [x] **T29** Ferramentas de quiz
  - Teste: `tools/quizzes.test.ts`
    - "create_quiz with the five question types, then publish_quiz, gives a published quiz in order, all made with AI, the quota untouched and the editor and quiz links" (CA-11)
    - "publish_quiz with questions 2 and 5 incomplete lists both with their reasons" (CA-12)
    - "update_quiz changes only what is sent: details, visibility and theme"
    - "duplicate_quiz copies the caller's own, a shared one and a public one"
    - "set_quiz_trashed moves and restores; delete_quiz_permanently only from the trash"
    - "discard_quiz_changes brings back the playable version"
    - "someone else's quiz is not found for every tool" (CA-15)
  - Implementar: `tools/quizzes.ts` e `schemas/question-draft.ts`, com as descrições sobre as constantes do core
  - Cobre: CA-11, CA-12, CA-15 · RN-20, RN-22, RN-23

- [x] **T30** Ferramentas de perguntas
  - Teste: `tools/questions.test.ts`
    - "add_questions inserts after a question and returns what each one is missing"
    - "add_questions refuses a 161-character statement and the 201st question" (CA-13)
    - "update_question changes the statement and time and keeps the AI mark; duplicate_question copies the mark" (CA-14)
    - "an update_question from the agent and an editor change to another field both stay" (CA-29)
    - "move_question, delete_question (never the last) and set_time_limit_for_all"
  - Implementar: `tools/questions.ts` e `schemas/question-patch.ts`
  - Cobre: CA-13, CA-14, CA-29 · RN-21, RN-22, RN-34

- [x] **T31** Arquivos: link, envio direto e imagens
  - Teste: `tools/files.test.ts`
    - "request_upload for media returns the URL, the headers and a curl example"
    - "create_quiz takes a cover from a public link"
    - "update_question takes an image by uploadKey, as background with alt text"
    - "an internal-network link, an unreachable one, a PDF as image and an 11 MB image are refused and nothing changes"
  - Implementar: `tools/files.ts` (`request_upload`), `schemas/file-source.ts` e a resolução de `{ url }`/`{ uploadKey }` nas ferramentas de quiz e de pergunta
  - Cobre: CA-16 · RN-24

- [x] **T32** Ferramentas de temas
  - Teste: `tools/themes.test.ts`
    - "list_themes gives the ready-made ids with their tone and the caller's custom themes"
    - "create_custom_theme with a pattern, a legible color and a logo by link, then update_quiz uses it"
    - "an accent color under 4.5:1 is refused with the minimum"
    - "update_custom_theme and delete_custom_theme"
  - Implementar: `tools/themes.ts`
  - Cobre: CA-17 · RN-25

- [x] **T33** Lista de ferramentas da etapa 1
  - Teste: `server.test.ts`
    - "lists the 24 stage-1 tools with the expected kind each"
    - "offers no tool to delete the account, change the password or photo, manage connections or keys, join as a player, or start or advance a game"
  - Implementar: o registro em `server.ts` e a tabela esperada no teste (o tipo de cada ferramenta, do plano)
  - Cobre: CA-26, CA-27 · RN-08, RN-32

## Fase 6 — UI

- [x] **T34** [P] `packages/ui` — abas e bloco de código
  - Teste:
    - `tabs.test.tsx` › "switches panels with the mouse and the arrow keys and exposes a tablist"
    - `code-block.test.tsx` › "copies its text and says Copiado for a moment"; "long text wraps inside the block"
  - Implementar:
    - `tabs.tsx`: `npx shadcn@latest add tabs -c packages/ui` (no worktree o arquivo cai na raiz do checkout principal; mover), convertido ao estilo do projeto com o visual da `TabNav`;
    - `code-block.tsx`;
    - os dois no `/design-system`.
  - Cobre: CA-30, CA-32 · RN-13

- [x] **T35** `apps/web/lib` — instruções por agente e rótulos
  - Teste: `lib/agent-instructions.test.ts`
    - "every reference agent and Outro agente has steps"
    - "every command carries the server URL"
    - "the order is ChatGPT, Claude, Codex, Cursor, VS Code, Gemini CLI, Outro agente"
  - Implementar:
    - `lib/agent-instructions.ts`, com os comandos e os caminhos de menu **conferidos na documentação atual de cada agente**, e as fontes num comentário;
    - `lib/agent-labels.ts`: "Conectado em", "Último uso", "Ainda não usado" e os textos dos vazios.
  - Cobre: CA-30, CA-31 · RN-01, RN-13

- [x] **T36** `components/agents` — a seção Agentes de IA
  - Teste:
    - `agents-section.test.tsx`: "shows the explanation, the server URL with Copiar and the tabs"; "empty states say Nenhum agente conectado. and Nenhuma chave criada."
    - `connected-agents-card.test.tsx`: "Desconectar asks first and removes the row"; "a failure keeps the row and tells"
    - `access-keys-card.test.tsx`: "Criar chave is unavailable at 20 with the limit text"; "Revogar asks first"
    - `create-access-key-dialog.test.tsx`: "names the key, then shows it once with Copiar and the warning"; "the name field shows its limit"
  - Implementar: `AgentsSection`, `AgentServerCard`, `ConnectInstructions`, `ConnectedAgentsCard`, `AccessKeysCard` e `CreateAccessKeyDialog`, todos por props
  - Cobre: CA-05, CA-06, CA-07, CA-30 · RN-13 a RN-15

- [x] **T37** Configurações › Agentes de IA e o aviso da Senha
  - Teste:
    - `settings-layout.test.tsx` › "the sections are Seu perfil, Acesso à IA, Agentes de IA, Senha and Exclusão de conta"
    - `password-section.test.tsx` › "warns that changing the password disconnects the AI agents"
  - Implementar: `agents` em `lib/account-sections.ts`, `AgentsSettings` em `routes/_auth/_shell/settings.tsx` (queries e mutations de `agent.*`, com o carregamento e a falha), e a frase em `password-section.tsx`
  - Cobre: CA-08, CA-30 · RN-12, RN-17

- [x] **T38** `components/agents` — a tela "Conectar ao Quizio"
  - Teste: `connect-agent-screen.test.tsx`
    - "shows the agent, the account, what it may and may not do and the return domain"
    - "Permitir and Cancelar call their actions and disable while sending"
    - "Usar outra conta calls its action"
    - "the invalid state shows the message and Ir para o início, without Permitir"
  - Implementar: `ConnectAgentScreen`, com o texto da seção "Experiência" da spec
  - Cobre: CA-01, CA-03, CA-04 · RN-03, RN-04

- [x] **T39** Rotas: `/connect`, login, `.well-known` e `/mcp`
  - Teste:
    - `lib/oauth-flow.test.ts` › "isOAuthContinuation recognizes the signed authorization query"; "keeps the query to resume after login"; "afterSignIn leaves the redirect to the auth client during an authorization and goes to the safe redirect otherwise"
    - A rota de login não tem teste próprio: o caminho inteiro fica no E2E de T40
  - Implementar:
    - `routes/connect.tsx`:
      - `beforeLoad` que exige sessão e manda a `/login` com a consulta;
      - server function que verifica a consulta assinada e lê o cliente público;
      - as ações por `authClient.oauth2.consent`.
    - `lib/oauth-flow.ts`.
    - `oauthProviderClient()` em `lib/auth-client.ts`.
    - Em `routes/login.tsx`, não navegar sozinho quando é continuação; o Google leva o mesmo `callbackURL`.
    - As rotas de servidor `routes/mcp.ts` e `.well-known` (recurso protegido e servidor de autorização, com CORS), conferindo antes a convenção do TanStack Router para pastas que começam com ponto.
  - Cobre: CA-01, CA-02, CA-04 · RN-01, RN-03, RN-06

## Fase 7 — E2E e fechamento da etapa 1

- [x] **T40** E2E `apps/web/e2e/mcp-agents.spec.ts`
  - Teste (desktop e celular; parar o preview antes, nota da máquina):
    - "a key connects an MCP client that creates a quiz with three questions and publishes it": cria a chave na seção, o cliente `@modelcontextprotocol/client` chama `create_quiz` e `publish_quiz`, e a biblioteca mostra o quiz Publicado com o brilho nas perguntas (CA-05, CA-11)
    - "an agent connects through authorization": o teste registra o cliente, abre a URL de autorização sem sessão, entra, vê "Conectar ao Quizio", Permitir, captura o código com `page.route`, troca pelo token, chama `tools/list`, vê a linha em Agentes conectados, Desconectar e o pedido seguinte recebe `401` (CA-01, CA-02, CA-07, CA-30)
    - "Cancelar returns access_denied and Usar outra conta switches accounts" (CA-03)
    - "on a phone the authorization screen and the section have no horizontal scroll" (CA-32)
  - Implementar: helpers em `e2e/support.ts` (cliente OAuth de teste com PKCE, cliente MCP com a chave)
  - Cobre: CA-01, CA-02, CA-03, CA-05, CA-07, CA-11, CA-30, CA-32

- [x] **T41** Fechamento da etapa 1
  - `pnpm check` nos arquivos alterados (`--line-ending=crlf`, `xargs -n 25`), `pnpm test` (por pacote com `--maxWorkers=3` se o PGlite estourar), typecheck (com `pnpm -F web exec tsc --noEmit`), `pnpm test:int` e `pnpm test:e2e`
  - Documentação:
    - `docs/architecture.md`: `packages/mcp` na tabela de pacotes e o contexto `agents`;
    - `docs/deploy.md`: `BETTER_AUTH_URL` como emissor e audiência, e as variáveis `AGENT_*`;
    - o parágrafo da spec 044 e as variáveis no `CLAUDE.md`;
    - o ADR 0023 como "aceito".
  - Glossário com os termos da etapa 1 em ✅. Changelog da spec: "etapa 1 entregue", com as escolhas feitas
  - ~~PR da etapa 1~~ — dispensado pelo usuário em 2026-10-28: a etapa 2 seguiu na mesma branch, e as duas vão num PR só

# Etapa 2

## Fase 8 — Partida, atribuições, relatórios, grupos e notificações

- [x] **T42** `core/game` e a tela do anfitrião — aviso de opções mudadas
  - Teste:
    - `game/application/set-game-options.test.ts` › "publishes options-changed on the game's channel after writing"
    - `lib/host-game-refresh.test.tsx` › "options-changed is one of the events that refetch the host's game"
  - Implementar:
    - `options-changed` em `game/domain/game-events.ts` e a publicação em `createSetGameOptions`;
    - em `routes/_auth/host.$gameId.tsx`, a assinatura do aviso, com a lista dos eventos que refazem a consulta extraída para `lib/host-game-refresh.ts`, para poder ser testada.
  - Cobre: CA-18 · RN-26, RN-34

- [x] **T43** Ferramentas da partida ao vivo
  - Teste: `tools/live-games.test.ts`
    - "host_live_game gives the PIN, the join and host screen links and the reminder to open the host screen"
    - "a quiz never published cannot be hosted" (CA-19)
    - "update_live_game turns autoplay on and locks, publishing the events; remove_player removes in the lobby"
    - "end_live_game publishes game-ended"
    - "hosting a shared or public quiz works"
  - Implementar: `tools/live-games.ts`
  - Cobre: CA-18, CA-19 · RN-26

- [x] **T44** Ferramentas de atribuições
  - Teste: `tools/assignments.test.ts`
    - "create_assignment with a deadline 28 days ahead and no timer gives the link and the 8-digit PIN"
    - "29 days ahead and in the past are refused with the rule"
    - "a quiz never published cannot be assigned" (CA-19)
    - "change_assignment_deadline, then end_assignment"
    - "assign_to_groups posts in the groups where the caller may assign"
  - Implementar: `tools/assignments.ts` e `schemas/deadline.ts` (data, hora e fuso em ISO 8601)
  - Cobre: CA-19, CA-20 · RN-27

- [x] **T45** Ferramentas de relatórios
  - Teste: `tools/reports.test.ts`
    - "get_report gives the same numbers as the report screen's query"
    - "get_report_detail reads a participant and a question"
    - "rename_report and set_reports_trashed"
    - "an open assignment cannot go to the trash"
    - "delete_reports_permanently from the trash"
    - "an admin reads a member's assignment report read-only"
  - Implementar: `tools/reports.ts`
  - Cobre: CA-21 · RN-28

- [x] **T46** Ferramentas de grupos e membros
  - Teste: `tools/groups.test.ts`
    - "create_group, get_group with settings and invite link for the admin, update_group with description and a permission"
    - "turning off members seeing members leaves a member only the total" (CA-22)
    - "a member's list of members has no emails" (CA-23)
    - "accept_group_invite takes the whole link or the code and signals the admin" (CA-24)
    - "reset_group_invite, remove_group_member, leave_group and delete_group follow the roles"
    - "a group the caller is not in is not found" (CA-15)
  - Implementar: `tools/groups.ts`
  - Cobre: CA-15, CA-22, CA-23, CA-24 · RN-29

- [x] **T47** Ferramentas do mural e do conteúdo do grupo
  - Teste: `tools/group-posts.test.ts`
    - "create_group_post with text and an image by link appears as the caller's and signals the other members" (CA-22)
    - "a post with an assignment needs the assign permission" (CA-23)
    - "a post with a shared quiz, share_quizzes_with_group with up to 50, and unshare_quiz_from_group"
    - "list_group_feed pages by cursor; get_group_post; set_post_like; delete_group_post by author or admin"
    - "list_group_shared_quizzes and list_group_assignments"
  - Implementar: `tools/group-posts.ts`, com os textos de outras pessoas descritos como dados
  - Cobre: CA-22, CA-23 · RN-29, RN-35

- [x] **T48** Ferramentas de notificações e o "visto"
  - Teste: `tools/notifications.test.ts`
    - "list_notifications gives Novo and Anteriores without marking the inbox seen"
    - "get_group does not record a visit"
    - "mark_notifications_read marks some or all"
  - Implementar: `tools/notifications.ts`
  - Cobre: CA-25 · RN-30, RN-31

- [x] **T49** Lista completa das ferramentas
  - Teste: `server.test.ts`
    - "lists the 60 tools with the expected kind each"
    - "still offers none of the screen-only actions"
  - Implementar: a tabela esperada completa e as instruções do servidor com os fluxos da etapa 2
  - Cobre: CA-26, CA-27 · RN-08, RN-32

## Fase 9 — E2E e fechamento

- [x] **T50** E2E da etapa 2 (`mcp-agents.spec.ts`)
  - Teste:
    - "an agent hosts a game and changes the lobby": a tela do anfitrião aberta e um jogador num segundo contexto; o agente liga a reprodução automática, trava e remove o jogador, e a tela acompanha em poucos segundos (CA-18)
    - "an agent posts in a group and the other member's bell shows it" (CA-22)
  - Cobre: CA-18, CA-22

- [ ] **T51** Fechamento da feature
  - Os mesmos checks de T41
  - **CA-31 manual** na instância publicada:
    - conectar cada agente de referência (ChatGPT, claude.ai, Claude Desktop, Claude Code, Codex, Cursor, VS Code e Gemini CLI) pelas instruções da seção;
    - listar os quizzes;
    - no ChatGPT e no claude.ai, também pelo Google;
    - registrar o resultado por agente no changelog, e corrigir as instruções que tiverem mudado.
  - Spec `done` com o changelog, roadmap ✅, glossário ✅, `CLAUDE.md` (as ferramentas da etapa 2) e PR da etapa 2
  - **Situação em 2026-10-28:** checks feitos (unitários de todos os pacotes, typecheck, `test:int`, E2E completo; as falhas por tempo da máquina passaram na nova rodada), glossário, `CLAUDE.md` e docs atualizados, e um PR com as duas etapas. ChatGPT e Claude já conectaram pelo túnel. Falta só o CA-31 na instância publicada, que o usuário vai conferir em produção; depois disso, spec e tarefas `done` e roadmap ✅.

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T17, T18, T38, T39, T40 |
| CA-02 | T39, T40 |
| CA-03 | T38, T40 |
| CA-04 | T17, T38, T39 |
| CA-05 | T08, T09, T25, T27, T36, T40 |
| CA-06 | T02, T08, T16, T25, T36 |
| CA-07 | T08, T09, T10, T16, T19, T25, T36, T40 |
| CA-08 | T10, T17, T19, T37 |
| CA-09 | T09, T18, T27 |
| CA-10 | T03, T08, T09, T19 |
| CA-11 | T04, T11, T13, T29, T40 |
| CA-12 | T29 |
| CA-13 | T04, T11, T30 |
| CA-14 | T05, T12, T30 |
| CA-15 | T26, T28, T29, T46 |
| CA-16 | T06, T14, T22, T31 |
| CA-17 | T32 |
| CA-18 | T42, T43, T50 |
| CA-19 | T43, T44 |
| CA-20 | T44 |
| CA-21 | T45 |
| CA-22 | T46, T47, T50 |
| CA-23 | T46, T47 |
| CA-24 | T46 |
| CA-25 | T48 |
| CA-26 | T26, T33, T49 |
| CA-27 | T33, T49 |
| CA-28 | T03, T09, T27 |
| CA-29 | T12, T30 |
| CA-30 | T25, T34, T35, T36, T37, T40 |
| CA-31 | T35, T51 (manual) |
| CA-32 | T34, T40 |

Os 32 CAs aparecem em ao menos uma tarefa; só o CA-31 depende de verificação manual, como o plano prevê.
