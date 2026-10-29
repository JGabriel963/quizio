# Segredos e exposição

Carregar no **Passo 3**. Busca textual + julgamento: placeholder de exemplo não é achado. Os comandos abaixo rodam no Git Bash; foram testados no repositório.

---

## 1. Arquivos sensíveis rastreados

```bash
git ls-files | grep -iE '(^|/)\.env($|\.)|\.(pem|key|p12|pfx)$|id_rsa|id_ed25519|credentials\.json|service-account|secrets\.(json|ya?ml)$'
```

Esperado hoje: só `apps/web/.env.example`. Qualquer `.env` real rastreado é achado (CRITICAL se tiver segredo de produção).

## 2. Literais de alto risco no código rastreado

```bash
git grep -nIE 'sk_live_|rk_live_|whsec_|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[0-9A-Za-z]{36}|github_pat_|xox[baprs]-|AIza[0-9A-Za-z_-]{35}|sk-ant-[0-9A-Za-z_-]{20,}|sk-proj-[0-9A-Za-z_-]{20,}|qz_[0-9A-Za-z_-]{43}|postgres(ql)?://[^:/ "]+:[^@/ "]+@' -- . ':!pnpm-lock.yaml'
git grep -nIE '(BETTER_AUTH_SECRET|PUSHER_SECRET|STORAGE_SECRET_ACCESS_KEY|AI_API_KEY|GOOGLE_CLIENT_SECRET)\s*[:=]\s*["'"'"']?[A-Za-z0-9+/_-]{16,}' -- . ':!*.example' ':!pnpm-lock.yaml'
```

Esperado hoje: a senha padrão do Postgres local em `apps/web/.env.example` (INFO 12). `qz_` é o prefixo das chaves de acesso dos agentes (256 bits em base64url = 43 caracteres); uma chave real num teste ou fixture é achado.

Histórico (só se achar um literal real, e o relatório diz que o histórico não foi varrido por padrão):

```bash
git log -p -S '<literal>' --all
```

## 3. Variáveis do Quizio

Validadas no import por `packages/env/src/server.ts` (t3-env + zod). Devem existir **só** em `apps/web/.env` (não rastreado) ou no painel do host:

| Variável | Segredo? | Nota |
|---|---|---|
| `DATABASE_URL` | sim | Senha embutida na URL |
| `BETTER_AUTH_SECRET` | sim | Mínimo 32 caracteres; assina cookies e a query do consentimento |
| `BETTER_AUTH_URL` | não | Também é a única origem confiável, o issuer e a audience dos agentes |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | o secret, sim | Ambos ou nenhum |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` (e demais `STORAGE_*`) | sim | R2 em produção, RustFS local |
| `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` | o secret, sim | `PUSHER_SECRET` também deriva os canais de notificação (HMAC) |
| `AI_API_KEY` | sim | Custo direto; conferir limite de gasto no painel do provedor |
| `VITE_PUSHER_*` | **não pode ser** | Vai para o bundle do navegador (`packages/env/src/web.ts`) |

Conferir os nomes reais em `packages/env/src/server.ts` antes de citar: se surgir uma variável nova, classificá-la aqui.

Regra: tudo que começa com `VITE_` é público. Um segredo com esse prefixo é CRITICAL.

```bash
git grep -nE "VITE_[A-Z_]+" -- packages/env/src apps/web/src ':!*.test.ts'
```

## 4. `.gitignore`

Conferir a raiz e `apps/web/.gitignore`. Devem cobrir: `.env`, `.env.*` (com exceção de `.env.example`), `*.pem`, `*.key`, `*.p12`, `*.pfx`, `credentials.json`, `service-account*.json`. Padrão faltando sem arquivo rastreado = INFO (risco de commit futuro) [INFO 11].

## 5. Onde mais olhar

- `docker-compose.yml`: senhas padrão só de dev (INFO, não achado).
- `apps/web/vercel.json`: só região e comando de build; nenhum `env` embutido.
- `.github/workflows/`: hoje não existe; se surgir, segredos só como `${{ secrets.* }}`.
- `package.json` (scripts) e `packages/storage/scripts/setup-bucket.mjs`: nenhum token na linha de comando.
- `.claude/launch.json` e `.claude/settings*.json`: nenhum token.
- Fixtures e testes: tokens com nome de teste (`test-secret`, PGlite, `x-forwarded-for` fictício) não são achado.

## 6. Ao achar um segredo real

1. Rotacionar no painel do provedor primeiro.
2. Remover do código; ler do env validado.
3. Conferir o `.gitignore`.
4. Se já foi para o remoto: limpar o histórico (`git filter-repo`) e considerar o segredo vazado de qualquer jeito.
