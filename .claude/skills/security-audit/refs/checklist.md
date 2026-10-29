# Checklist de revisão — Quizio

Carregar nos **Passos 4 e 5**. Cada item diz onde olhar e o que tem de ser verdade. Um item marcado como falho vira **candidato**, que ainda passa por `refs/false-positives.md`. Entre colchetes, o achado conhecido que o item cobre (`refs/known-findings.md`): reverificar em vez de redescobrir.

Fora do escopo do scan profundo: `node_modules/`, `.output/`, `apps/web/src/routeTree.gen.ts`, `**/*.test.ts(x)`, `**/*.int.test.ts`, `apps/web/e2e/`, `packages/*/src/testing/`, `packages/core/src/*/testing/`, `.claude/`, migrações SQL geradas (ler só se uma mudança de schema afrouxar uma constraint).

---

## 1. Autorização (tRPC, server functions, MCP)

- [ ] Todo procedure em `packages/api/src/routers/*.ts` é `protectedProcedure`, exceto a lista de `refs/attack-surface.md` §3.
- [ ] O router passa `ctx.session.user.id` como `ownerId`/`userId`; nenhum id de **pessoa** vindo do input é usado como identidade (só como alvo checado: remover membro, etc.).
- [ ] Cada use case que recebe um id de recurso carrega pelo dono: `requireOwnedQuiz`, `loadEditableQuiz`, `requireOwnedGame`, `loadOwnedHeader(s)`, `requireMembership`, `requireOwnedTheme`/`findOwned`. Outro dono = `NotFoundError` (indistinguível de inexistente).
- [ ] Ids filhos são buscados **dentro** do pai do dono: perguntas na lista do quiz do dono, posts por `(group_id, id)`, curtidas por post do grupo.
- [ ] Quiz alheio só por `QuizShareGrants.canUse` (grupo em comum ou público + publicado + fora da lixeira), e só nos usos previstos: `hostGame`, `createAssignment`, `duplicateSharedQuiz`, "Jogar novamente".
- [ ] Permissões de grupo pelo helper (`packages/core/src/groups/domain/group-permissions.ts`), nunca por `role === "admin"` espalhado; e-mail de membro só para o admin (`canSeeMemberEmail`).
- [ ] Leitura de relatório alheio só pelo `ReportReadGrants` (admin de um grupo com post daquele jogo), e só-leitura (`header.readOnly`).
- [ ] Mass assignment: os schemas zod do router não deixam passar `ownerId`, `adminId`, `aiGenerated`, `hasUnpublishedChanges`, chaves de storage de outro prefixo etc. (o zod remove chaves desconhecidas; conferir o que é **declarado**).
- [ ] Server functions (`createServerFn`) checam a sessão por conta própria; `beforeLoad` de `_auth` é só UI.
- [ ] MCP: cada ferramenta de `packages/mcp/src/tools/*.ts` chama o use case com o `userId` da identidade admitida; nenhuma ferramenta aceita um `userId`/`ownerId` do agente; nenhuma reimplementa regra que o use case já tem (e que um router poderia ter checado sozinho).
- [ ] Contextos que se leem por porta (`PlayableQuizQuery`, `GroupAssignments`, `GroupAssignmentQuery`, `SharedQuizReads`, `NotificationQuery`) aplicam o dono/membro do lado que lê.

## 2. Jogadores anônimos e integridade do jogo

- [ ] `game.join.*` e `game.assignment.*` (exceto `find`, `enter`, `join`, `cover`, `resume`) provam `playerId` + `secret` (`hasPlayerSecret`, `loadParticipant`) **antes** de ler ou escrever.
- [ ] `resume` de atividade: o que devolve e o que reinicia. Pergunta vencida não pode recomeçar com o tempo inteiro [M6]; segredo devolvido pelo apelido [M5].
- [ ] A resposta certa não sai antes dos resultados: `PublicStage`, `PlayerStageView`, `publicStageOf`, `publicSliderScale`, `history`, eventos de `game-events.ts`. Conferir também tipos novos de pergunta (aceitas do type answer, ordem do puzzle, resposta e margem do slider).
- [ ] Ids das alternativas não revelam a resposta entre jogos: o puzzle renomeia (`withDrawnIds`); as demais alternativas embaralhadas mantêm o id do editor [L8].
- [ ] Tempo e correção medidos no servidor (`submitAnswer`, `answerAssignmentQuestion`); PK `(game, question, player)` impede resposta dupla; `acceptsAnswers`/`saveIfAt`/`saveProgressIfAt` impedem resposta atrasada ou passo repetido.
- [ ] Limitador de PIN (`packages/core/src/game/application/find-game-by-pin.ts` + `packages/db/src/repositories/shared/drizzle-attempt-limiter.ts`): reserva antes de olhar o PIN e libera no acerto. Um IP compartilhado (escola) não pode bloquear quem tem o PIN certo [M8].
- [ ] Entradas: além dos 200 jogadores, há limite por IP/jogo? O anfitrião consegue tirar bots depois do lobby, e o criador da atividade? [M7]
- [ ] Ações por jogador anônimo que publicam no Pusher ou escrevem (troca de avatar, entrar/sair) têm limite e não publicam quando nada mudou [L7].
- [ ] Segredo do jogador em URL: `game.join.session` e `game.assignment.play` são queries (GET) [L3].
- [ ] Ações do anfitrião (`view`, `start`, `advance`, `setOptions`, `removePlayer`, `end`, `review.*`) são `protectedProcedure` + `requireOwnedGame`; jogo ao vivo carregado por `loadLiveGame` (atividade = não encontrada).
- [ ] "Revisar respostas" regrada e avança numa transação (`ReviewResultsWriter.advanceAndRegrade`); só o anfitrião, só com os resultados abertos.

## 3. Better Auth, sessão e agentes (OAuth / MCP)

Arquivos: `packages/auth/src/create-auth.ts`, `packages/auth/src/index.ts`, `packages/auth/src/agent-token-verifier.ts`, `packages/core/src/agents/`, `apps/web/src/functions/agent-connect-request.ts`, `apps/web/src/routes/connect.tsx`, `apps/web/src/lib/oauth-flow.ts`, `apps/web/src/lib/safe-redirect.ts`.

- [ ] `BETTER_AUTH_SECRET` validado com mínimo de 32 caracteres (`packages/env/src/server.ts`); `trustedOrigins: [baseURL]` e nada mais.
- [ ] Rate limit habilitado, `storage: "database"`, regras para `/sign-in/email`, `/sign-up/email`, `/change-password`, `/oauth2/register`; chave pelo `CLIENT_IP_HEADER`. Novos endpoints sensíveis do Better Auth (reset de senha, verificação de e-mail, se um dia entrarem) precisam de regra.
- [ ] `clientIpOf` (`packages/api/src/client-ip.ts`) e `ipAddressHeaders` usam um cabeçalho que o cliente não forja no ambiente de deploy (`refs/project-stack.md` §4) [L2].
- [ ] Cadastro fechado (`AUTH_SIGN_UP_ENABLED=false`) barra todos os caminhos: e-mail, Google por redirect e por ID token (`databaseHooks.user.create.before`).
- [ ] `/update-user` recusa `image` e aplica as regras de nome; `/change-password` revoga sessões e todo acesso de agentes (`onPasswordChanged` → `revokeAllAgentAccess`).
- [ ] Tela de consentimento (`/connect`): o domínio de retorno mostrado é calculado com o **mesmo parser do navegador** (`new URL`), não com a regex de `packages/core/src/shared/domain/web-address.ts` [M1]; o nome do cliente vem de quem registrou (registro dinâmico aberto) e não deve parecer verificado.
- [ ] Registro de cliente (`/oauth2/register` e CIMD): `redirect_uris` canônicas (`new URL(u).href === u`), sem `javascript:`/`data:`; limite por IP; crescimento de `oauth_client` [INFO 1].
- [ ] Token do agente: JWKS, issuer (`{BETTER_AUTH_URL}/api/auth`) e audience (`{BETTER_AUTH_URL}/mcp`) checados; consentimento ativo e usado dentro de `AGENT_CONNECTION_IDLE_DAYS`; `kid` desconhecido não faz reler o JWKS a cada requisição [INFO 2].
- [ ] Chaves `qz_`: 256 bits, guardadas como hash SHA-256, mostradas uma vez, teto `AGENT_MAX_ACCESS_KEYS` contado sob advisory lock, mesma resposta para toda falha; expiração por inatividade [INFO 3].
- [ ] `AGENT_REQUESTS_PER_MINUTE` aplicado depois da admissão; requisições sem token válido também deveriam ter teto [INFO 2].
- [ ] Redirect pós-login: `safeRedirect` só aceita caminho interno; conferir TAB/CR/LF e `\` [INFO 7]. `location` das rotas `/api/agents/*` sempre relativo.
- [ ] Exclusão de conta (`packages/core/src/identity/application/delete-account.ts`): senha checada com `AttemptLimiter`; conta só Google confirma pelo e-mail [INFO 4]; apaga arquivos só sob os prefixos do próprio id.

## 4. Uploads e storage

Arquivos: `packages/core/src/shared/domain/media-key.ts`, `packages/core/src/media/application/`, `packages/core/src/groups/application/request-group-upload.ts`, `packages/core/src/themes/application/request-theme-upload.ts`, `packages/core/src/identity/application/request-profile-photo-upload.ts`, `packages/storage/src/s3-object-storage.ts`.

- [ ] O PUT assinado inclui `Content-Type` e `Content-Length`; tipos aceitos não incluem SVG nem HTML; tamanho máximo por tipo.
- [ ] Chave gerada pelo servidor sob o prefixo do dono/grupo; ao receber uma chave de volta, `is*OwnedBy`/`isGroupFileKeyOf` (que usam `isFileDirectlyUnder`: sem `/`, `.` ou `..` no nome) e `exists` antes de gravar.
- [ ] Upload pendente consumido numa transação junto com a escrita que o usa (post do grupo, tema), para ser usado uma vez, pelo dono, no lugar certo.
- [ ] Nenhum `storage.delete` direto em imagem de pergunta (só `releaseUnusedImages`); `deletePrefix` só com prefixo do id da sessão terminado em `/`.
- [ ] `Content-Disposition` com nome do usuário: sem caracteres de controle, `filename*=UTF-8''…`.
- [ ] Cota e limpeza: pedidos de upload por usuário têm limite? `media/` e `profiles/` têm varredura como `sources/`, `groups/` e `themes/`? [L4]
- [ ] Bucket público: nada sensível sob chave previsível; `sources/` (PDFs) protegidos só pelo UUID [INFO 10].

## 5. SSRF (links dos agentes)

Arquivos: `packages/storage/src/http-remote-files.ts`, `packages/core/src/media/application/import-remote-file.ts`, `packages/mcp/src/schemas/file-source.ts`.

- [ ] A checagem de IP roda no `connect.lookup` de cada conexão (fixa o IP checado, sem DNS rebinding), inclusive em cada redirect (máximo 3, rechecados).
- [ ] Faixas bloqueadas: loopback, privadas, link-local, metadados de nuvem, IPv4 decimal/octal/hex normalizados, IPv4 mapeado em IPv6; faixas IPv6 de transição (`64:ff9b::/96`, `64:ff9b:1::/48`, `2002::/16`, `2001::/32`) [L13].
- [ ] Download interrompido ao passar do limite do destino; tipo detectado pelos bytes, não pelo cabeçalho.
- [ ] A autorização do destino (dono, membro do grupo, política do tipo) acontece **antes** do download [L4].

## 6. IA: custo e abuso

Arquivos: `packages/core/src/quiz/application/generate-questions.ts`, `packages/ai/src/ai-sdk-question-generator.ts`, `packages/ai/src/pdf-lib-pdf-pages.ts`, `packages/db/src/repositories/quiz/drizzle-generation-quota.ts`.

- [ ] A cota (`AI_GENERATIONS_PER_DAY`, linha em `generation_usage` sob advisory lock) é reservada **antes** de qualquer trabalho caro, inclusive abrir o PDF [M2].
- [ ] A cota só volta quando o provedor não trabalhou (rede, 429, 5xx antes do uso), não em erro de schema, tamanho ou tempo [M3].
- [ ] `generateText` tem `maxOutputTokens`, timeout e `maxRetries` conscientes; há teto global da instância, não só por conta [M3].
- [ ] PDF aberto no servidor com teto de memória/tempo ou de tamanho descomprimido [M2]; só as páginas escolhidas vão ao modelo.
- [ ] `AI_PROVIDER=fake` recusado em produção.
- [ ] Erro do provedor não volta ao usuário com detalhes (modelo, cobrança, sufixo da chave) [L1].
- [ ] O que o modelo devolve passa pelos parsers do editor (`acceptGeneratedQuestions`, `parseGeneratedQuestion` estrito) antes de ser guardado; nada do modelo vira HTML.

## 7. MCP e injeção de prompt

- [ ] Toda ferramenta que devolve texto escrito por outras pessoas (posts, nomes, mensagens, apelidos, respostas digitadas, nomes de relatório) leva o rótulo `WRITTEN_BY_PEOPLE` ou envelope equivalente [L12].
- [ ] Ferramentas destrutivas marcadas como `destructive` (anotação MCP) para o cliente pedir confirmação; `server.test.ts` em dia.
- [ ] Ferramentas de jogo ao vivo param no lobby (sem `start`/`advance`), como a spec 044 define.
- [ ] Entradas que o schema não amarra lançam `ToolInputError`; datas exigem offset (`packages/mcp/src/schemas/deadline.ts`).
- [ ] Questões criadas por agente levam `aiGenerated: true` e não gastam a cota de geração (não há chamada ao provedor).

## 8. Injeção e XSS

- [ ] SQL: `sql.raw` só com nomes de coluna/constantes (`drizzle-question-repository.ts`); `` sql`…` `` com interpolação parametrizada; LIKE com escape; cursores como parâmetros.
- [ ] Nenhum `dangerouslySetInnerHTML`, `innerHTML`, `document.write` ou markdown renderizado como HTML com conteúdo de usuário (`apps/web/src`, `packages/ui/src`).
- [ ] Links de texto de usuário só por `apps/web/src/lib/linkify.ts` (`http(s)://` e `www.`, `rel="noopener noreferrer nofollow"`); `href` vindo de dado nunca aceita `javascript:`/`data:`.
- [ ] Cores e estilos de tema validados no servidor (`#rrggbb`, ids de padrão do catálogo) antes de virar CSS (`themeStyle`).
- [ ] Nada de `eval`, `new Function`, `child_process` ou `fs` com caminho vindo de request.

## 9. Dados expostos

- [ ] `errorFormatter` (`packages/api/src/index.ts`): um 500 que não é `DomainError` não leva SQL, parâmetros, mensagem do provedor de IA nem stack ao cliente [L1].
- [ ] Views só com o necessário: `PersonView` sem e-mail; capa pública da atividade (`get-assignment-cover.ts`) não expõe mais do que a spec quer [M5]; e-mail de membro só para o admin.
- [ ] Logs: só `console.error` de falhas, sem senha, token, segredo de jogador nem sessão inteira.
- [ ] SSR: `QueryClient` por requisição; nada de outro usuário desidratado; devtools fora do build de produção.
- [ ] Segredos e tokens fora de URLs (query string do tRPC, links gerados, eventos do Pusher).

## 10. Abuso, limites e corridas

- [ ] Todo `z.string()`/`z.array()` da borda tem `.max()`; fora da Vercel, há limite de corpo no handler ou no proxy [L6].
- [ ] Ações em massa por usuário (posts, compartilhamentos, atribuições, convites, uploads) têm limite ou ao menos não degradam leituras sem página [L9].
- [ ] Ler-checar-escrever com teto (200 perguntas, 200 jogadores, chaves de acesso, cota de IA) está numa transação com trava ou é decidido por constraint [L5].
- [ ] `attempt_window` e outras tabelas de contagem têm limpeza.
- [ ] Cotas de terceiros que um anônimo consegue gastar (mensagens do Pusher, chamadas de IA) têm teto.

## 11. Configuração

- [ ] Cabeçalhos de segurança por `routeRules` do nitro (`refs/headers.md`) [L10].
- [ ] CORS: só `/.well-known/*` (e o que o MCP precisar) com `*`, sem cookies; nenhuma rota com cookie de sessão responde `Access-Control-Allow-Origin` refletido + `credentials`.
- [ ] CSRF: mutations do `/api/trpc` dependem do cookie `SameSite=Lax`; checar `Origin`/`Sec-Fetch-Site` é defesa extra [INFO 6]. Better Auth checa a origem nos seus endpoints.
- [ ] `packages/env/src/web.ts`: só valores públicos em `VITE_*` (hoje: key, cluster, host, porta e TLS do Pusher).
- [ ] Dev exposto por túnel (ngrok): build de produção, cadastro fechado, Vite corrigido [L11].
