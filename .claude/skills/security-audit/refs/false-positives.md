# Falsos positivos — filtro obrigatório

Carregar no **Passo 6**. Todo candidato passa por aqui antes de entrar no relatório. A lista do Quizio (§3) foi semeada pela auditoria de 29/10/2026; ao fim de cada auditoria, acrescentar os descartes novos que valerem para as próximas, com o motivo.

Atenção: cada descarte vale **enquanto o motivo for verdade**. Se o código que sustenta o motivo mudou (um helper removido, uma constraint afrouxada, uma versão trocada), reverificar em vez de descartar de novo.

---

## 1. Regra geral

Um candidato só vira achado se a resposta for **sim** a todas:

1. Há um caminho de exploração plausível, não só um "padrão suspeito"?
2. A entrada é controlada pelo atacante (input do tRPC, argumento de ferramenta MCP, query/body/cabeçalho de rota, arquivo enviado, URL dada a um agente, texto que outra pessoa escreveu)?
3. Não há validação, sessão, dono, limite ou constraint no caminho, incluindo o use case, o helper de dono, o adapter e o banco?
4. O código roda em produção (não teste, fake em `testing/`, `e2e/`, `design-system`, script de dev)?
5. O impacto vai além do que uma ADR ou spec já aceitou?

Qualquer "não" ou "incerto" → descartar, ou LOW com confiança LOW marcado "revisão manual".

## 2. Padrões genéricos que não são achado sozinhos

| Padrão | Por quê |
|---|---|
| `{texto}` em JSX | O React escapa |
| `href={url}` | Só se a URL vem de usuário sem checar protocolo |
| `target="_blank"` sem `rel` | LOW no máximo (tabnabbing) |
| `publicProcedure` | Há uma lista justificada (`refs/attack-surface.md` §3); fora dela, ler o use case antes |
| Router sem checagem de dono visível | A checagem mora no use case: seguir até o helper |
| `sql.raw` / `` sql`…` `` | Seguro com constantes e interpolação parametrizada; só é achado com string de usuário concatenada |
| `console.error(error)` em catch | LOW no máximo; só sobe se logar senha, token, segredo de jogador ou sessão inteira |
| Versão atrás da última sem advisory | INFO |
| Aviso do `pnpm audit` em pacote não alcançável em produção | Tabela de dependências, não achado |
| `.env.example` com senha padrão de dev | INFO |
| CSP ausente | INFO (`refs/headers.md`) |
| `Access-Control-Allow-Origin: *` sem credenciais em documento público | Não é achado |

## 3. Descartados no Quizio (auditoria de 29/10/2026)

### Autorização

- **IDOR em quizzes, perguntas, relatórios, temas, mídia e notificações.** Tudo passa por `requireOwnedQuiz`, `loadEditableQuiz`, `loadOwnedHeader(s)` ou `findOwned`, e os ids de pergunta são buscados dentro da lista do dono.
- **Mass assignment.** O zod remove chaves desconhecidas, e os `userId` de entrada são só alvos checados.
- **`QuizShareGrants.canUse`.** Quiz privado e não compartilhado dá `false`; o ramo público exige `public`, publicado e fora da lixeira; `duplicateSharedQuiz` copia só a versão jogável, como privada.
- **`getPublicQuiz` mostrando as respostas certas.** Por design para quiz público (spec 039); `PersonView` não tem e-mail.
- **Forjar um post de grupo para ler o relatório de alguém.** Só `assignInGroup` (jogo novo do próprio autor) e `assignToGroups` (dono checado) gravam `game_id`.
- **IDOR em grupos, posts, curtidas e convites.** `requireMembership` em todo procedimento, posts filtrados por `(group_id, id)`, e-mail só para o admin.
- **Código de convite adivinhável.** 128 bits (`randomBytes(16)`); `INSERT … SELECT … ON CONFLICT` parametrizado.
- **Ações do anfitrião sem dono.** `view`, `start`, `advance`, `setOptions`, `removePlayer`, `end` e `review.*` usam `protectedProcedure` + `requireOwnedGame`.

### Injeção e XSS

- **SQL injection.** `sql.raw` só com nomes de coluna constantes (`drizzle-question-repository.ts`), LIKE da biblioteca com escape, cursores como parâmetros.
- **XSS.** Sem `dangerouslySetInnerHTML`, `innerHTML` ou markdown; `linkify` só gera `https?://` com `rel="noopener noreferrer nofollow"`; cores de tema checadas como `#rrggbb` no servidor.
- **pdf.js (CVE-2024-4367).** A versão instalada (6.4) tem a correção, e só o PDF do próprio criador é renderizado.
- **Injeção de prompt no assistente de criação.** Sem ferramentas, saída estruturada e revalidada, fonte do próprio criador.

### Storage e uploads

- **Chave de storage de outro usuário** em capa, imagem, foto, tema ou PDF: `isFileDirectlyUnder` bloqueia `/` e `..`, e há `exists` e a linha pendente na transação.
- **Apagar arquivo de outro usuário.** Chaves sempre do prefixo do dono, cópias duplicam o objeto, `deletePrefix` usa o id da sessão e exige `/` final.
- **Upload com tipo ou tamanho falso.** `content-type` e `content-length` vão na assinatura; SVG e HTML não são aceitos.
- **Injeção no `Content-Disposition`.** Caracteres de controle removidos; nome em `filename*=UTF-8''…`.
- **SSRF por DNS rebinding.** A checagem roda no `connect.lookup` de cada conexão (fixa o IP checado); IPv4 decimal/octal/hex normalizados; IPv4 mapeado em IPv6, metadados de nuvem e no máximo 3 redirects, cada um rechecado.

### Jogo e tempo real

- **Resposta certa vazando antes dos resultados.** Nada em `PublicStage`, `PlayerStageView`, `history` ou nos eventos.
- **Tempo ou pontos forjados, resposta dupla ou atrasada.** Medidos no servidor; PK `(game, question, player)`; `acceptsAnswers`.
- **Eventos de cliente no Pusher.** Canais públicos sem endpoint de auth; canais de notificação são HMAC de 128 bits.
- **Escala do slider revela a resposta módulo o passo.** Por design da spec 032 (INFO 9, não achado novo).

### Autenticação e agentes

- **Open redirect no login e no OAuth.** O router-core bloqueia URLs protocol-relative; o Better Auth recusa `javascript:`/`data:` em `redirect_uri` e valida o `callbackURL`. (O `safeRedirect` em si continua INFO 7.)
- **Pular o consentimento (`skip_consent`) ou usar o JWT da sessão como token do MCP.** Issuer e audience diferentes; linha em `oauth_consent` obrigatória.
- **Timing ou enumeração de chaves de acesso.** 256 bits, busca por hash, mesma mensagem em toda falha.
- **Trocar a senha mantendo agentes conectados.** O hook `after` de `/change-password` revoga chaves, consentimentos e tokens; há teste.
- **Cadastro com o cadastro fechado.** `databaseHooks.user.create.before` cobre todos os caminhos (inclusive ID token do Google).
- **`AI_PROVIDER=fake` em produção.** Recusado com `NODE_ENV=production`.
- **CORS `*` em `/.well-known/*`.** Metadados públicos de descoberta OAuth, sem cookie (spec 044).
- **Vinculação Google com `requireLocalEmailVerified: false`.** Risco aceito na ADR 0007 até haver domínio de e-mail: INFO 5, não achado.

### Dados e configuração

- **SSR vazando dados de outro usuário.** `QueryClient` por requisição, nada desidratado, devtools fora do build de produção.
- **Segredos em logs.** Não há; o único log é o `console.error` de falha de ferramenta do MCP (`apps/web/src/routes/mcp.ts`).
- **Erro interno vazando pelo MCP.** `toolErrorResult` troca qualquer erro que não seja `DomainError` por uma mensagem genérica (o vazamento do L1 é só do tRPC).

### Dependências (não alcançáveis em produção, em 29/10/2026)

- `undici@8.10.2` (storage): `undici.request` com `connect.lookup`, sem `tls`, sem interceptores, redirects à mão.
- `undici@7.x` (via `@ai-sdk/provider-utils`): só fala com hosts fixos do provedor.
- `seroval` (TanStack Start): nenhum RegExp ou typed array chega à serialização; o tRPC não tem transformer.
- Tudo que entra pelo CLI `shadcn` em `dependencies` de `packages/ui` (`@modelcontextprotocol/sdk@1.x`, `proxy-addr`, `body-parser`, `hono`, `systeminformation`, `fast-uri`, `ip-address`, `deepmerge`, `brace-expansion`…): é um CLI; o app usa só `shadcn/tailwind.css`, resolvido no build.
- `source-map-js`, `esbuild@0.18`, `@vitest/mocker`: build e testes.

## 4. Quando rebaixar

| Situação | Ajuste |
|---|---|
| Só explorável fora da Vercel (IP do cliente, corpo sem limite, IPv6 de transição) | LOW, e o relatório diz "antes de ir para a VPS" |
| Só no dev server exposto por túnel | LOW |
| Risco registrado como aceito numa spec ou ADR | INFO com a referência, ou achado só pelo impacto além do aceito (como M5) |
| Depende de cookie mudar de `SameSite=Lax` | INFO |
| Exige conta, mas contas são de graça (cadastro aberto, sem verificação de e-mail) | Não rebaixar por "exige login" |
| Exige só o PIN ou o link da atividade | Tratar como público: a turma inteira recebe |
| Abuso que só gasta recurso do próprio atacante | Descartar |
| Abuso que gasta cota compartilhada da instância (IA, Pusher, bucket) | Manter |
