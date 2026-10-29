# Cabeçalhos de segurança, CORS e CSRF

Carregar no **Passo 4** ao revisar configuração. Substitui o `next.config` `headers()` e o `proxy.ts`/`middleware.ts` da skill original.

**Regra de ouro:** cabeçalho ausente sem exploração é LOW ou INFO. Cabeçalho **presente e errado** (CORS refletindo a origem com credenciais, por exemplo) é que pode ser HIGH.

---

## 1. Onde os cabeçalhos podem estar no Quizio

| Ordem | Onde | Vale em |
|---|---|---|
| 1 | `routeRules` do plugin `nitro` em `apps/web/vite.config.ts` | Vercel e VPS (o lugar certo para cabeçalhos globais) |
| 2 | Uma rota de servidor que monta a `Response` (`apps/web/src/routes/[.]well-known/$.ts`, `apps/web/src/routes/mcp.ts`, `apps/web/src/routes/api/agents/*.ts`) | Só aquela rota |
| 3 | Better Auth (`/api/auth/*`): cookies `HttpOnly`, `Secure` em HTTPS, `SameSite=Lax`; checagem de origem contra `trustedOrigins` | Endpoints do Better Auth |
| 4 | `apps/web/vercel.json` (`headers`) | Só Vercel: evitar, porque a VPS perderia |
| 5 | Plataforma ou proxy (HSTS da Vercel; nginx/Caddy na VPS; o domínio público do bucket R2) | Fora do repositório: o relatório diz "não verificável neste scan" |

Ao propor mudança, preferir `routeRules` (ADR 0011: nada preso à Vercel). Confirmar a sintaxe na versão instalada do `nitro` (está em beta: `nitro@3.0.x-beta`), via Context7 ou o fonte instalado (`ls node_modules/.pnpm | grep '^nitro@'`).

## 2. Severidade

| Situação | Máximo |
|---|---|
| Sem `Content-Security-Policy` | INFO (não há XSS para conter; ver §4) |
| Sem HSTS no código | INFO: vem da Vercel; na VPS, do proxy |
| Sem `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` | LOW enquanto o `SameSite=Lax` segurar o clickjacking de "Permitir" em `/connect` [L10] |
| CSP permissiva com XSS real confirmado | MEDIUM, e o achado principal é o XSS |
| `Access-Control-Allow-Origin` refletido ou `*` **com** `Access-Control-Allow-Credentials: true` numa rota com cookie | HIGH |
| `/connect` ou o editor emoldurável **e** cookie que acompanha o iframe (`SameSite=None`) | MEDIUM ou mais, conforme a ação |

## 3. Conjunto mínimo recomendado (texto do relatório, não patch automático)

Para todas as rotas, por `routeRules`:

- `Content-Security-Policy: frame-ancestors 'none'` e `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

E, no bucket público (domínio do R2), `nosniff`, com o domínio do bucket fora do domínio do app.

## 4. CSP completa: só com inventário e em modo report-only

Uma CSP estrita quebra o Quizio se esquecer algum destes:

- scripts e estilos inline do SSR do TanStack Start e do Tailwind;
- `connect-src` para o Pusher (`wss://ws-<cluster>.pusher.com` e `sockjs`, ou o host do Soketi) e para o bucket (PUT direto pela URL assinada, `STORAGE_PUBLIC_URL`);
- `img-src` para o bucket (capas, imagens das perguntas, fotos, temas) e `blob:`/`data:` (recortes no navegador);
- `worker-src` do pdf.js (`pdfjs-dist`) e `blob:`;
- Google (login por redirect);
- nada de terceiros de analytics hoje; conferir com `git grep -nE "https://" -- apps/web/src ':!*.test.ts*'`.

Proposta sempre em etapas: `Content-Security-Policy-Report-Only` → ajuste → enforce, testada com `pnpm build && pnpm -F web start` (o dev server não mostra o que quebra).

## 5. CORS

- `/.well-known/*` responde `Access-Control-Allow-Origin: *` sem credenciais: documentos de descoberta públicos, por design (spec 044). Não é achado.
- `/mcp`: o transporte do MCP e os agentes usam bearer, não cookie. Conferir que nenhuma resposta do `/mcp` reflete a origem com `credentials`.
- `/api/trpc` e `/api/auth`: mesma origem; não devem responder CORS para outras origens.
- Uploads: o CORS é do **bucket** (origem = `BETTER_AUTH_URL`), configurado por `packages/storage/scripts/setup-bucket.mjs` no local e no painel do R2 em produção.

```bash
git grep -niE "access-control-allow-(origin|credentials)" -- apps/web/src packages ':!*.test.ts'
```

## 6. CSRF

- Better Auth checa a origem (`trustedOrigins: [baseURL]`) nas mutations dele.
- `/api/trpc`: as mutations dependem do cookie `SameSite=Lax`; o tRPC 11 aceita `multipart/form-data`, então um formulário de outro site não esbarra em preflight. Hoje é INFO [INFO 6]; vira achado se o cookie mudar para `SameSite=None` ou se surgir um subdomínio controlável pelo usuário no mesmo site.
- Procedures por GET (queries) não podem ter efeito colateral. `game.join.find` é mutation de propósito (conta PINs errados).

```bash
git grep -nE "\.query\(" -- packages/api/src/routers ':!*.test.ts'
```

Conferir que nenhuma `query` escreve (notificações e visitas a grupo usam mutations separadas por design).
