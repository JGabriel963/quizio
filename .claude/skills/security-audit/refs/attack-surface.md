# Mapa da superfície de ataque

Carregar no **Passo 1**. Substitui o mapa de `app/api/**/route.ts`, Server Actions e `proxy.ts`/`middleware.ts` da skill original: o Quizio não tem servidor separado nem borda própria; tudo roda no app TanStack Start (`apps/web`), em funções serverless na Vercel ou num processo Node numa VPS.

Listar no relatório o que existir de fato; se surgir uma entrada nova que não está aqui, auditar e acrescentar a este arquivo.

---

## 1. Rotas de servidor (`apps/web/src/routes`)

```bash
git grep -nE "server:\s*\{|handlers:" -- apps/web/src/routes
```

| Rota | Arquivo | Quem chama | O que conferir |
|---|---|---|---|
| `/api/trpc/*` | `apps/web/src/routes/api/trpc/$.ts` | navegador, `httpBatchLink` (GET para queries, POST para mutations) | `createContext` em `packages/api/src/context.ts` (sessão, `clientIp`); sem limite de corpo fora da Vercel |
| `/api/auth/*` | `apps/web/src/routes/api/auth/$.ts` | navegador, agentes | `auth.handler` do Better Auth: tudo em `packages/auth/src/create-auth.ts` |
| `/api/agents/login`, `/api/agents/connect` | `apps/web/src/routes/api/agents/*.ts` | navegador no meio do OAuth | Só embrulham a query assinada em base64url (`apps/web/src/lib/oauth-flow.ts`) e redirecionam para `/login` e `/connect`; o `location` tem de ser relativo |
| `/mcp` | `apps/web/src/routes/mcp.ts` | agentes de IA | `createQuizioMcpHandler` (`packages/mcp/src/handler.ts`): bearer → `admitAgentRequest` → ferramentas |
| `/.well-known/*` | `apps/web/src/routes/[.]well-known/$.ts` | agentes | Repassa ao `auth.handler` os metadados OAuth (RFC 9728/8414) com CORS `*`: documentos públicos, sem cookie |

## 2. Server functions (`createServerFn`)

São endpoints RPC públicos, como as Server Actions do Next: a tela que as chama não as protege.

```bash
git grep -nE "createServerFn|createMiddleware" -- apps/web/src
```

| Função | Arquivo | O que conferir |
|---|---|---|
| `getUser` | `apps/web/src/functions/get-user.ts` (middleware `apps/web/src/middleware/auth.ts`) | Devolve só a sessão de quem chama |
| `readAgentConnectRequest` | `apps/web/src/functions/agent-connect-request.ts` | Lê a query assinada do consentimento; o domínio de retorno mostrado vem de `webAddressParts` (achado M1) |

## 3. Procedures do tRPC (`packages/api/src/routers`)

Um arquivo por contexto, combinados em `packages/api/src/routers/index.ts`: `account`, `agent`, `auth`, `game`, `group`, `library`, `media`, `notification`, `quiz` (+ `quiz-questions.ts`, `quiz-assistant.ts`), `report`, `theme`.

- `protectedProcedure` (`packages/api/src/index.ts`) só garante **que há sessão**. O dono é checado no use case.
- `publicProcedure` (sem sessão) existe hoje apenas em:
  - `appRouter.healthCheck` e `auth.settings` (configuração pública da instância);
  - `game.join.*` (`find`, `enter`, `setAvatar`, `session`, `answer`): jogador anônimo do jogo ao vivo;
  - `game.assignment.*` (`cover`, `join`, `resume`, `play`, `start`, `answer`, `advance`, `setAvatar`): participante anônimo da atividade.

```bash
git grep -nE "publicProcedure" -- packages/api/src/routers ':!*.test.ts'
```

Qualquer `publicProcedure` fora dessa lista é candidato: justificar pela spec ou reportar.

- Erros: o middleware `domainErrorsAsClientErrors` converte `DomainError` em `NOT_FOUND`/`BAD_REQUEST`; o `errorFormatter` só acrescenta `domainCode`. O resto é 500 com a mensagem original (achado L1).
- Queries vão por GET com o input na URL (`apps/web/src/router.tsx`, `httpBatchLink`): segredo em input de query vai para logs (achado L3).

## 4. Identidades e onde são provadas

| Quem | Como prova | Onde |
|---|---|---|
| Criador (navegador) | Cookie de sessão do Better Auth | `context.ts` → `protectedProcedure` |
| Agente de IA | Bearer: chave `qz_…` (hash SHA-256 em `access_key`) ou JWT do Better Auth (JWKS, issuer `/api/auth`, audience `/mcp`) com consentimento ativo | `packages/core/src/agents/application/admit-agent-request.ts`, `packages/auth/src/agent-token-verifier.ts` |
| Jogador ao vivo | `playerId` + `secret` (UUID guardado pelo navegador por PIN) | `hasPlayerSecret` em `packages/core/src/game/domain/player.ts` |
| Participante de atividade | `playerId` + `secret`, ou só o **apelido** no `resume` (paridade Kahoot, achado M5) | `loadParticipant` em `packages/core/src/game/application/assignment-play-view.ts`, `resume-assignment.ts` |
| Quem tem o PIN | Nada além do PIN (6 dígitos ao vivo, 8 em atividade), limitado por IP | `find-game-by-pin.ts` + `AttemptLimiter` |
| Quem tem o convite | Código de 128 bits no grupo | `groupMembers.addWithInvite` |

## 5. Autorização no core (helpers a procurar em cada use case)

| Helper | Arquivo | Protege |
|---|---|---|
| `requireOwnedQuiz` | `packages/core/src/quiz/domain/quiz.ts` | Quiz do dono (outro dono = não encontrado) |
| `loadEditableQuiz` | `packages/core/src/quiz/application/editable-quiz.ts` | Editor: dono e fora da lixeira |
| `QuizShareGrants.canUse` | `packages/core/src/shared/application/ports/quiz-share-grants.ts` | Usar quiz alheio: compartilhado num grupo do usuário, ou público, publicado e fora da lixeira |
| `requireOwnedGame` | `packages/core/src/game/domain/game.ts` | Ações do anfitrião |
| `loadLiveGame` / `requireAssignment` | `packages/core/src/game/application/game-lifecycle.ts` / `packages/core/src/game/domain/game.ts` | Separar jogo ao vivo de atividade |
| `loadParticipant` | `packages/core/src/game/application/assignment-play-view.ts` | Passos do participante (prova o par e liquida o progresso no relógio do servidor) |
| `loadOwnedHeader(s)` | `packages/core/src/reports/application/load-report.ts` | Relatórios; leitura só-leitura do admin via `ReportReadGrants` |
| `requireMembership` + `group-permissions.ts` | `packages/core/src/groups/application/load-group.ts` | Grupos: não membro = `GROUP.NOT_FOUND`; admin vs membro pelas permissões |
| `requireShareableAssignment` | `packages/core/src/groups/application/list-assignable-groups.ts` | "Atribuir a grupos" |
| `requireOwnedTheme` / `findOwned` | `packages/core/src/themes/domain/custom-theme.ts`, `customThemes.findOwned` | Temas personalizados |
| `is*OwnedBy` / `isGroupFileKeyOf` | `packages/core/src/shared/domain/media-key.ts` | Chave de storage no prefixo do dono ou do grupo |

## 6. MCP (`packages/mcp`)

- `packages/mcp/src/tools.ts` registra as ferramentas de `packages/mcp/src/tools/*.ts` (`defineTool` com `kind` read/write/idempotent/destructive); `server.test.ts` tem a lista e o tipo de cada uma.
- As ferramentas chamam **os use cases do container com o `userId` da identidade**, não os routers.
- Erros: `toolErrorResult` (`packages/mcp/src/tool-results.ts`) devolve só `DomainError` com `code`; o resto vira mensagem genérica e `console.error` no servidor.
- Entradas de arquivo: `{ url }` passa por `importRemoteFile` → `RemoteFiles` (`packages/storage/src/http-remote-files.ts`).
- Texto escrito por outras pessoas é rotulado com `WRITTEN_BY_PEOPLE` (`packages/mcp/src/tools/groups.ts`).

## 7. Better Auth (`/api/auth/*`)

Configuração em `packages/auth/src/create-auth.ts`, instância em `packages/auth/src/index.ts`. Pontos a listar:

- e-mail e senha (`/sign-up/email`, `/sign-in/email`, `/change-password`, `/update-user`), com o hook `before` e `databaseHooks.user.create.before` (cadastro fechado em todos os caminhos);
- Google (só com `GOOGLE_CLIENT_ID`/`SECRET`), `accountLinking.requireLocalEmailVerified: false` (ADR 0007);
- servidor OAuth 2.1 dos agentes: `jwt()`, `mcp()` com `allowDynamicClientRegistration` e `allowUnauthenticatedClientRegistration: true`, `cimd()`; `/oauth2/register`, `/oauth2/authorize`, `/oauth2/token`, `/oauth2/consent`. A lista completa sai do fonte do plugin instalado (`ls node_modules/.pnpm | grep '^@better-auth+mcp@'`, depois `node_modules/@better-auth/mcp/dist` dentro dessa pasta);
- rate limit em banco (`rateLimit.storage: "database"`) com `customRules` por caminho, chaveado por `advanced.ipAddress.ipAddressHeaders` = `CLIENT_IP_HEADER`.

## 8. Arquivos e storage

| Prefixo | Pedido de upload | Quem pode ler |
|---|---|---|
| `media/{ownerId}/` | `media.requestUpload` → `packages/core/src/media/application/request-media-upload.ts` | Público (URL do bucket) |
| `sources/{ownerId}/` | `media.requestSourceUpload` → `request-source-upload.ts` (varredura de 24 h) | Público pela chave UUID; o servidor lê para a IA |
| `groups/{groupId}/` | `group.requestUpload` → `packages/core/src/groups/application/request-group-upload.ts` | Público; post só com a linha `group_upload` na transação |
| `profiles/{userId}/` | `account.requestPhotoUpload` → `packages/core/src/identity/application/request-profile-photo-upload.ts` | Público |
| `themes/{ownerId}/` | `theme.requestUpload` → `packages/core/src/themes/application/request-theme-upload.ts` | Público; arquivos soltos voltam às pendências |

O navegador faz PUT direto no storage com a URL assinada (`packages/storage/src/s3-object-storage.ts`); os bytes nunca passam pelo app.

## 9. Tempo real (Pusher / Soketi)

- `gameChannel(gameId)` (`packages/core/src/game/domain/game-events.ts`): canal **público** por jogo; eventos são dicas, sem pontos, lugares nem a resposta certa.
- Canal de notificações por usuário: HMAC do id com `PUSHER_SECRET` (`packages/realtime/src/hmac-inbox-channels.ts`).
- Clientes nunca publicam; não há endpoint de auth de canal.

## 10. Configuração e ambiente

- `packages/env/src/server.ts` (validado no import) e `packages/env/src/web.ts` (`VITE_*`, vai para o bundle).
- `apps/web/vite.config.ts` (plugin `nitro`; `routeRules` para cabeçalhos), `apps/web/vercel.json`, `docker-compose.yml`.
- Fora do escopo do código: painéis da Vercel, do R2, do Pusher e do provedor de IA. O relatório diz o que não foi verificável.
