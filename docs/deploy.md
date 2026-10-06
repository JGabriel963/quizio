# Deploy

O Quizio é um único app (TanStack Start) que precisa de três serviços externos: Postgres, armazenamento S3 e tempo real no protocolo Pusher. O build é feito pelo [Nitro](https://nitro.build), que escolhe a saída conforme o lugar onde roda ([ADR 0011](adr/0011-deploy-com-nitro.md)):

| Destino | Como o Nitro decide | Saída | Como sobe |
| --- | --- | --- | --- |
| Vercel | detecta o build da Vercel | `apps/web/.vercel/output` | a própria Vercel publica |
| VPS / Docker | padrão (`node-server`) | `apps/web/.output` | `pnpm -F web start` (`node .output/server/index.mjs`) |

Para testar a saída da Vercel na sua máquina: `NITRO_PRESET=vercel pnpm -F web build`.

## Vercel

### 1. Serviços

- **Postgres** (Neon, Supabase ou outro), em São Paulo (`sa-east-1`), a mesma região das funções. Use a string de conexão **com pooler**: cada função serverless abre o seu próprio pool.
- **Cloudflare R2**: um bucket com acesso público de leitura (domínio próprio ou `r2.dev`) e um token de API com leitura e escrita. O navegador envia as imagens direto para o bucket, então ele precisa de uma regra de CORS liberando `PUT` e `GET` para a origem do app (`BETTER_AUTH_URL`), com o cabeçalho `content-type`. Detalhes no [ADR 0003](adr/0003-storage-r2.md).
- **Pusher Channels**: um app, de preferência no cluster `sa1` (São Paulo). O plano gratuito limita conexões simultâneas; cada jogador e cada anfitrião usa uma.
- **Google OAuth** (opcional): cliente do tipo "Web application" com a redirect URI `{BETTER_AUTH_URL}/api/auth/callback/google`.

### 2. Projeto

Importe o repositório na Vercel com:

- **Root Directory**: `apps/web` (mantenha ligada a opção de incluir arquivos fora da raiz, pois os pacotes ficam em `packages/`).
- **Framework, Build e Install**: os padrões detectados (`pnpm install`, `pnpm build`).
- **Node.js**: 22 ou mais novo.

As funções rodam em **São Paulo** (`"regions": ["gru1"]` em `apps/web/vercel.json`), ao lado do banco e do Pusher. Cada chamada faz mais de uma consulta em sequência, então a função precisa ficar na mesma região do banco: se o banco for para outro lugar, mude a região junto. O padrão da Vercel é Washington (`iad1`).

### 3. Variáveis de ambiente

| Variável | Valor em produção |
| --- | --- |
| `DATABASE_URL` | string de conexão com pooler |
| `BETTER_AUTH_SECRET` | 32+ caracteres aleatórios (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | a URL pública, sem barra no fim (ex.: `https://quizio.vercel.app`) |
| `AUTH_SIGN_UP_ENABLED` | `true` para criar a sua conta; depois `false` se a instância for só sua |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | os dois ou nenhum |
| `STORAGE_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `STORAGE_REGION` | `auto` |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | token do R2 |
| `STORAGE_BUCKET` | nome do bucket |
| `STORAGE_PUBLIC_URL` | URL pública do bucket |
| `STORAGE_FORCE_PATH_STYLE` | `false` |
| `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` / `PUSHER_CLUSTER` | do app no Pusher |
| `PUSHER_USE_TLS` | `true` |
| `VITE_PUSHER_KEY` / `VITE_PUSHER_CLUSTER` | os mesmos `key` e `cluster` |
| `VITE_PUSHER_USE_TLS` | `true` |

Não defina `PUSHER_HOST`, `PUSHER_PORT`, `VITE_PUSHER_HOST` nem `VITE_PUSHER_PORT` com o Pusher na nuvem. As `VITE_*` entram no pacote do navegador **no build**: mudou uma delas, faça um novo deploy.

`BETTER_AUTH_URL` é a única origem aceita, então os endereços de preview (`*-git-*.vercel.app`) não fazem login nem upload. Use o domínio de produção.

`CLIENT_IP_HEADER` fica no padrão (`x-forwarded-for`): a Vercel sobrescreve esse cabeçalho, o cliente não consegue forjá-lo.

### 4. Banco

O schema de produção é aplicado por migrations versionadas em `packages/db/src/migrations`, nunca por `db:push`, e **a Vercel aplica sozinha**: o `buildCommand` de `apps/web/vercel.json` roda `db:migrate:deploy` antes do build quando o deploy é de produção (`VERCEL_ENV=production`). Não há passo manual, nem no primeiro deploy.

- **Previews não migram.** Um PR com mudança de schema não toca o banco de produção; a migration só é aplicada quando ele chega à branch de produção.
- **Migration que falha derruba o build**, e a versão anterior continua no ar.
- **A migration entra antes do código novo.** Por alguns instantes a versão antiga roda sobre o schema novo, então prefira mudanças compatíveis com ela: adicionar coluna num deploy e remover a antiga no seguinte, em vez de renomear de uma vez.
- `DATABASE_URL` precisa estar disponível no build (é o padrão das variáveis da Vercel).

Ao mudar o schema: `pnpm -F @quizio/db db:generate`, revise o SQL gerado e faça o commit junto com a mudança. No desenvolvimento local o `db:push` continua valendo.

Para aplicar à mão, se precisar: `DATABASE_URL="<produção>" pnpm -F @quizio/db db:migrate`.

### 5. Conferência

Depois do deploy: criar conta, criar um quiz com imagem de capa (testa o R2 e o CORS), publicar, organizar uma partida e entrar pelo celular com o PIN (testa o Pusher).

## VPS (futuro)

Nada no código prende o app à Vercel. Numa VPS:

- `pnpm install && pnpm -F web build`, depois `pnpm -F web start` (porta em `PORT`, padrão 3000) atrás de um proxy com TLS (Caddy, nginx, Traefik).
- **Migrations**: o `vercel.json` não vale aqui. Rode `pnpm -F @quizio/db db:migrate:deploy` no script de deploy, antes de reiniciar o app.
- **`CLIENT_IP_HEADER`**: defina com o cabeçalho que o **seu proxy** escreve e sobrescreve (ex.: `x-real-ip`). Sem isso, um cliente pode mandar o próprio `x-forwarded-for` e escapar dos limites de tentativas de login e de PIN.
- As variáveis `VITE_*` precisam existir na hora do build; as demais, na hora de rodar.
- Postgres, armazenamento e tempo real podem continuar na nuvem ou ir para a mesma máquina: o `docker-compose.yml` já descreve Postgres, RustFS (S3) e Soketi (Pusher), que usam `STORAGE_FORCE_PATH_STYLE=true` e as variáveis `*_HOST`/`*_PORT`.
