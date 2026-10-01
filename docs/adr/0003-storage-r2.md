# ADR 0003 — Storage de mídia no Cloudflare R2 via API S3, com upload direto

- **Status:** aceito
- **Data:** 2026-09-13

## Contexto

Quizzes usam imagens (capa, pergunta, fundo) e, no futuro, possivelmente áudio de lobby. Funções serverless da Vercel têm limite de tamanho de corpo e cobram por tempo de execução, então os bytes não devem passar pelo app.

## Decisão

- **Cloudflare R2** em produção, acessado pela **API S3** (`@aws-sdk/client-s3`) — sem SDK proprietário, permitindo trocar por qualquer provedor S3-compatível só por configuração.
- Porta `ObjectStorage` no core; adapter `createS3ObjectStorage` em `@quizio/storage`.
- **Upload direto do navegador com URL pré-assinada (PUT)**: o caso de uso `requestMediaUpload` valida tipo e tamanho, gera a chave `media/{ownerId}/{id}.{ext}` e devolve a URL. `content-type` e `content-length` entram na assinatura, então o provedor rejeita arquivos de outro tamanho. (R2 não suporta POST pré-assinado com política de tamanho.)
- Cálculo de checksum do SDK em `WHEN_REQUIRED`: por padrão o SDK v3 recente adiciona parâmetros CRC32 às URLs pré-assinadas, o que quebra uploads do navegador para o R2.
- **Local**: **RustFS** no `docker-compose.yml`. As imagens Docker do MinIO deixaram de ser publicadas para a edição community, por isso não foi usado.
- `pnpm -F @quizio/storage bucket:setup` cria o bucket e configura CORS para `BETTER_AUTH_URL`; também tenta liberar leitura pública de `media/*`. No R2 não existem bucket policies: habilite acesso público pelo painel (domínio próprio ou `r2.dev`) e aponte `STORAGE_PUBLIC_URL` para ele.

## Consequências

- Uploads não consomem banda nem tempo das funções.
- Existe uma janela entre "URL emitida" e "arquivo enviado": a entidade que referencia a mídia deve confirmar a existência (`ObjectStorage.exists`) ao salvar, e uploads órfãos serão limpos por uma rotina futura.
- SVG fica fora da política inicial (risco de XSS ao servir conteúdo do usuário).

## Trocar de provedor

Acrescentado em 2026-10-01, com a imagem das perguntas (spec 007). O R2 é a escolha de hoje, não um compromisso: o que o código garante para a troca ser barata é o seguinte.

- **O core só conhece a porta `ObjectStorage`** (`createPresignedUpload`, `getPublicUrl`, `exists`, `delete`, `copy`). Nenhum caso de uso, router ou componente importa o SDK da AWS nem sabe o nome do provedor.
- **O banco guarda chaves, nunca URLs.** Capa (`quiz.cover_image_key`) e imagem da pergunta (`question.image.key`, inclusive dentro dos snapshots de `quiz_version`) são chaves `media/{ownerId}/{id}.{ext}`. A URL pública é montada por `getPublicUrl` a cada leitura, então mudar de domínio ou de provedor não exige reescrever dados.
- **O navegador não sabe quem é o provedor.** Ele recebe do servidor a URL, o método e os cabeçalhos do envio (`PresignedUpload`) e apenas os usa.
- **Só a composition root instancia o adapter** (`packages/api/src/composition-root.ts`), a partir das variáveis `STORAGE_*`.

Passos de uma troca:

1. **Provedor que fala S3** (Amazon S3, Backblaze B2, MinIO, DigitalOcean Spaces…): só configuração. Trocar `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, as credenciais e `STORAGE_PUBLIC_URL`; rodar `bucket:setup` para o CORS.
2. **Provedor com API própria** (Firebase/Google Cloud Storage, Azure Blob, Supabase Storage…): escrever `packages/storage/src/<tecnologia>-object-storage.ts` implementando a porta, com seu `*.int.test.ts`, e trocar a fábrica chamada na composition root. Todos oferecem envio direto por URL assinada com `PUT`, que é o que a porta pede; cabeçalhos exigidos pelo provedor vão em `PresignedUpload.headers`.
3. **Migrar os objetos** copiando-os para o novo bucket **com as mesmas chaves** (por exemplo com `rclone`). Nenhuma linha do banco muda.
4. Apontar `STORAGE_PUBLIC_URL` (ou o equivalente do adapter novo) para o endereço público do novo bucket.

O que quebraria essa garantia, e por isso não deve ser feito: guardar URL completa no banco, montar URL no cliente a partir de uma base fixa, ou chamar o SDK do provedor fora de `packages/storage`.

## Alternativas consideradas

- **Upload passando pelo servidor** — simples, mas esbarra nos limites da Vercel.
- **Binding nativo do R2 (Workers)** — só funciona com deploy na Cloudflare.
- **Vercel Blob** — prende o storage ao provedor de hospedagem, o oposto do objetivo.
