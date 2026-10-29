# Stack instalada, gates por versão e ambiente de deploy

Carregar no **Passo 1**. A auditoria vale para o commit e o lockfile de agora, não para uma stack "esperada".

---

## 1. Inventário pelo lockfile

O Quizio usa pnpm (versão em `packageManager` do `package.json` da raiz) com o catálogo em `pnpm-workspace.yaml`. O `catalog:` de cada `package.json` é um **range**; a versão auditada é a resolvida no `pnpm-lock.yaml`.

```bash
git rev-parse --short HEAD
grep -oE "^  '?(@tanstack/react-start|@tanstack/router-core|react|better-auth|@better-auth/[a-z-]+|@trpc/server|drizzle-orm|zod|@modelcontextprotocol/server|ai|@ai-sdk/[a-z-]+|pdf-lib|pdfjs-dist|undici|@aws-sdk/client-s3|pusher|pusher-js|jose|vite|nitro)@[0-9][^(':]*" pnpm-lock.yaml | sed "s/^  '\{0,1\}//" | sort -u
pnpm why <pacote>     # quem puxa cada versão (há duas de zod e de undici, por exemplo)
```

Versão mais nova no registry (`pnpm view <pacote> version`) só serve para uma linha INFO.

## 2. Pacotes que mudam a auditoria

| Pacote | Onde | Por que importa |
|---|---|---|
| `@tanstack/react-start`, `@tanstack/router-core` | `apps/web` | Rotas de servidor (`createFileRoute(...)({ server: { handlers } })`), server functions (`createServerFn`), `beforeLoad`, `resolveRedirect` (bloqueia redirects protocol-relative) |
| `nitro` | `apps/web/vite.config.ts` | Saída Vercel ou Node; `routeRules` para cabeçalhos; `maxDuration` |
| `@trpc/server` 11 | `packages/api` | `errorFormatter`, queries por GET com o input na URL, aceita `multipart/form-data` |
| `zod` 4 | todos | Validação de toda entrada (tRPC, MCP, Better Auth). GHSA-mrhx-c7xc-m3w5 (memória com coleções grandes) corrigido em 4.6.6 |
| `better-auth` 1.7 + `@better-auth/mcp`, `@better-auth/oauth-provider`, `@better-auth/cimd`, `jwt` | `packages/auth` | Sessão, rate limit em banco, `ipAddressHeaders`, servidor OAuth 2.1 dos agentes, registro dinâmico aberto, CIMD |
| `jose` | `packages/auth/src/agent-token-verifier.ts` | Verificação do JWT dos agentes (JWKS, issuer, audience) |
| `drizzle-orm` | `packages/db` | Queries parametrizadas; `sql.raw` só com constantes |
| `@modelcontextprotocol/server` | `packages/mcp` | Servidor MCP (não confundir com `@modelcontextprotocol/sdk`, que só entra pelo CLI `shadcn`) |
| `ai` + `@ai-sdk/*` | `packages/ai` | Custo por geração (`maxOutputTokens`, `maxRetries`, timeout) |
| `pdf-lib` | `packages/ai/src/pdf-lib-pdf-pages.ts` | Abre PDF enviado pelo usuário no servidor (descompressão sem teto) |
| `pdfjs-dist` | `apps/web` | Renderiza o PDF no navegador (CVE-2024-4367 corrigido a partir da 4.2.67) |
| `undici` | `packages/storage/src/http-remote-files.ts` | Download de links dos agentes (SSRF) |
| `@aws-sdk/client-s3` | `packages/storage` | URLs pré-assinadas (tipo e tamanho na assinatura) |
| `pusher` / `pusher-js` | `packages/realtime` | Canais públicos, sem eventos de cliente |
| `vite` | dev server | Só no dev, mas o dev é exposto por ngrok no fluxo de agentes |

## 3. Gates por versão (conferir a cada auditoria)

- **zod < 4.6.6** → reabrir M4 (`refs/known-findings.md`).
- **vite < 8.2.4** → GHSA-vfpm-58rq-9qcg vale no Windows; só pesa no dev exposto por túnel.
- **undici 8 < 8.12.2** → avisos do audit, mas o uso (`undici.request` com `connect.lookup`, sem `tls`, sem interceptores, redirects seguidos à mão) não os alcança; higiene.
- **better-auth**: a cada minor, reler no código instalado o que o Quizio depende: a chave do rate limit (`ipAddressHeaders`), `allowUnauthenticatedClientRegistration`, a validação de `redirect_uri` (`SafeUrlSchema`), o hook `before`/`after` e `databaseHooks.user.create.before`.
- **@trpc/server**: se a major mudar, reler o que vai em `error.message` de um `INTERNAL_SERVER_ERROR` e se o stack vai junto.
- **@tanstack/router-core**: se mudar, reler `resolveRedirect` e o `navigate` do cliente, que hoje seguram o `safeRedirect` (INFO 7).

Para confirmar comportamento: Context7 com a versão do lockfile, ou o fonte instalado. O pnpm guarda cada pacote em `node_modules/.pnpm/<nome com / trocado por +>@<versão>[_<hash>]/node_modules/<nome>/`, então procure com `ls node_modules/.pnpm | grep '^@better-auth+mcp@'`. Alguns internos ficam em outro pacote: o `SafeUrlSchema` está em `@better-auth/core` (`dist/utils/redirect-uri.mjs`), o `resolveRedirect` em `@tanstack/router-core`. Numa worktree sem `node_modules`, `pnpm install` primeiro.

## 4. Ambiente de deploy: Vercel hoje, VPS depois

`docs/deploy.md` e a ADR 0011. O código não pode depender da Vercel, então todo achado diz em qual ambiente vale.

| Tema | Vercel (produção atual, `gru1`) | VPS (futuro, `pnpm -F web start`) |
|---|---|---|
| IP do cliente | A Vercel sobrescreve `x-forwarded-for`; o padrão de `CLIENT_IP_HEADER` é seguro | O proxy tem de **escrever e sobrescrever** o cabeçalho escolhido; o nginx com `$proxy_add_x_forwarded_for` acrescenta e quebra os limitadores (L2) |
| Corpo da requisição | Limitado a 4,5 MB pela plataforma | Sem limite no app (L6) |
| HSTS | Vem da Vercel | Configurar no proxy |
| Memória | Fluid: um estouro derruba as requisições em andamento na instância | Um processo Node: um estouro derruba o app inteiro, inclusive jogos ao vivo (M2) |
| Duração | `maxDuration: 300` | Sem teto de função |
| Migrações | `apps/web/vercel.json` só migra em produção | Manual (`pnpm db:migrate`) |

Fora da produção: o dev server (`pnpm dev`) às vezes é exposto por **ngrok** para conectar agentes. Achados que só valem ali são LOW e dizem isso.

## 5. Bloco obrigatório no relatório

```
- **Escopo:** <monorepo inteiro | caminho> em `<branch>` @ `<commit>` (sem node_modules, e2e/, testes e fakes).
- **Stack instalada (lockfile):** `@tanstack/react-start@…`, `@tanstack/router-core@…`, `react@…`, `better-auth@…` (+ `oauth-provider`, `mcp`, `cimd` …), `@trpc/server@…`, `drizzle-orm@…`, `zod@…`, `@modelcontextprotocol/server@…`, `ai@…`, `pdf-lib@…`, `undici@…`, `@aws-sdk/client-s3@…`, `pusher@…`, `vite@…`.
- **Limitação:** análise estática; <o que foi reproduzido isolado, e como>.
```
