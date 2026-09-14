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

## Alternativas consideradas

- **Upload passando pelo servidor** — simples, mas esbarra nos limites da Vercel.
- **Binding nativo do R2 (Workers)** — só funciona com deploy na Cloudflare.
- **Vercel Blob** — prende o storage ao provedor de hospedagem, o oposto do objetivo.
