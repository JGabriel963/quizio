# Auditoria de segurança — 29/10/2026

Método adaptado da skill [`security-audit`](https://github.com/devfraga/skills-sujeito-programador/tree/main/security-audit): primeiro as versões instaladas, depois `pnpm audit`, segredos rastreados e revisão do código por fluxo (entrada → validação → autenticação → autorização → destino). Todo achado passou pelo filtro de falsos positivos. O checklist da skill é de Next.js e foi trocado por um feito para a nossa stack.

- **Escopo:** monorepo inteiro em `main` @ `79c963f` (sem `node_modules`, `e2e/`, testes e fakes).
- **Stack instalada (lockfile):** `@tanstack/react-start@1.168.60`, `@tanstack/router-core@1.171.34`, `react@19.2.8`, `better-auth@1.7.14` (+ `oauth-provider`, `mcp`, `cimd` 1.7.14), `@trpc/server@11.18.0`, `drizzle-orm@0.45.2`, `zod@4.5.4`, `@modelcontextprotocol/server@2.4.0`, `ai@7.0.142`, `pdf-lib@1.17.1`, `undici@8.10.2`, `@aws-sdk/client-s3@3.1131.0`, `pusher@5.3.4`, `vite@8.2.2`.
- **Limitação:** análise estática. Nenhum exploit foi executado contra o app; dois mecanismos foram reproduzidos isoladamente em Node (o parser de URL do achado M1 e o `SafeUrlSchema` do Better Auth).

## Resumo

| Severidade | Qtde |
|---|---|
| 🔴 CRITICAL | 0 |
| 🟠 HIGH | 0 |
| 🟡 MEDIUM | 8 |
| 🔵 LOW | 13 |
| ⚪ INFO | 12 |

- **Dependências:** 55 avisos no `pnpm audit --prod`. Só um alcança o código de produção de verdade: `zod@4.5.4` (M4). Os demais vêm do CLI `shadcn` declarado em `dependencies`, de ferramentas de dev, ou não são alcançáveis (seção [Dependências](#dependências)).
- **Segredos:** nenhum segredo real em arquivos rastreados.
- **Falsos positivos descartados:** 30+ (seção [Descartados](#falsos-positivos-descartados)).

A base está sólida no que mais costuma falhar. Não há IDOR nos routers e use cases revisados. O SQL é parametrizado. Não há caminho de XSS. Os uploads assinam tipo e tamanho e as chaves ficam sempre sob o prefixo do dono. A resposta certa não vaza antes dos resultados. O SSRF dos links dos agentes fixa o IP checado. Os achados MEDIUM são de três tipos: **um engano na tela de consentimento OAuth**, **abuso de recursos (memória e custo de IA)** e **integridade dos jogos e atividades** (trapaça, sabotagem e bloqueio de turma).

## Achados

### Autenticação e agentes (OAuth)

#### 🟡 M1 — A tela "Conectar ao Quizio" pode mostrar um domínio de retorno falso
- **Status:** ✅ corrigido na branch `claude/security-audit-ae732e`. `isUnambiguousAddress` recusa backslash, espaço e caractere de controle. O registro dinâmico agora recusa esses endereços (`invalid_redirect_uri`), e a tela de consentimento recusa o pedido quando o endereço chega por documento de metadados. Os testes em `create-auth-oauth.test.ts` reproduzem o ataque: antes da correção, o endereço era registrado e chegava à tela.
- **Confiança:** HIGH. O mecanismo foi reproduzido com o `SafeUrlSchema` do Better Auth 1.7.14 e com o `URL` do Node; o fluxo completo não foi executado.
- **Onde:** [web-address.ts:6-16](../../packages/core/src/shared/domain/web-address.ts), usado em [agent-connect-request.ts:36-39](../../apps/web/src/functions/agent-connect-request.ts) e em `agents/domain/agent-connection.ts:31`. O registro aberto está em [create-auth.ts:97-98](../../packages/auth/src/create-auth.ts).
  ```ts
  const WEB_ADDRESS = /^([a-z][a-z0-9+.-]*):\/\/(?:[^@/?#\s]*@)?(\[[^\]/?#\s]+\]|[^:/?#\s]+).../i;
  returnDomain: request.redirectUri ? (webAddressParts(request.redirectUri)?.host ?? null) : null,
  ```
- **Exploração:**
  1. Sem login, o atacante registra um cliente (`allowUnauthenticatedClientRegistration: true`) com `client_name: "Claude"` e `redirect_uris: ["https://evil.example\@claude.ai/cb"]`. O Better Auth aceita e guarda a string crua.
  2. A regex do Quizio lê `evil.example\` como userinfo, e a tela diz "Depois, você volta para **claude.ai**".
  3. O navegador trata `\` como `/`: depois de Permitir, vai para `https://evil.example/@claude.ai/cb?code=…`.
  4. O atacante troca o código (cliente público com PKCE dele) e passa a agir como a vítima nas 60 ferramentas do MCP. Em Configurações › Agentes, a conexão aparece como "Claude".
  - Variante: um espaço no caminho faz a regex devolver `null`, e a linha do domínio some.

  | URI registrada | Host mostrado (regex) | Host real (navegador) |
  |---|---|---|
  | `https://evil.example\@claude.ai/cb` | `claude.ai` | `evil.example` |
  | `https://evil.example/a b` | *(nenhum)* | `evil.example` |
- **Correção:** calcular o host mostrado no servidor com `new URL(redirectUri).host`, o mesmo parser do navegador, e mostrar um aviso quando não for possível. Recusar no registro (hook `before` em `/oauth2/register` e no caminho CIMD) URIs com `new URL(u).href !== u`. Considere também marcar clientes de registro dinâmico como "não verificado" na tela, porque o `client_name` é escolhido por quem registra.

### Abuso de recursos e custo

#### 🟡 M2 — PDF com bomba de descompressão derruba a função antes de a cota ser cobrada
- **Status:** ✅ corrigido.
  - A cota passou a ser reservada **antes** de ler o PDF e é devolvida se ele for recusado.
  - `pdf-lib-pdf-pages.ts` envolve os dois parsers que o pdf-lib usa ao abrir o arquivo (object stream e XRef stream). Cada stream é medida com o `zlib` (`maxOutputLength`) contra um orçamento de 16 MB por PDF.
  - O PDF que passa do orçamento é recusado como "Não foi possível abrir esse PDF."
  - Os testes reproduzem a bomba de uma camada e a de duas camadas; antes da correção, o pdf-lib descomprimia as duas sem reclamar.
- **Confiança:** MEDIUM. Duas revisões independentes leram o código do pdf-lib 1.17.1; o ataque não foi executado.
- **Onde:** a leitura acontece em [generate-questions.ts:82-88](../../packages/core/src/quiz/application/generate-questions.ts) (`sourceFor`), e a reserva da cota só depois, na linha 106. O PDF é aberto em [pdf-lib-pdf-pages.ts:14](../../packages/ai/src/pdf-lib-pdf-pages.ts).
  ```ts
  pdf = await PDFDocument.load(document, { ignoreEncryption: true });
  ```
- **Exploração:**
  1. Basta qualquer conta. O usuário envia em `sources/` um "PDF" de até 20 MB: o tipo é assinado, mas os bytes não são checados.
  2. Uma *object stream* do arquivo é Flate aninhado. O `PDFDocument.load` decodifica todas as object streams ao abrir, e o `DecodeStream` dobra o buffer sem limite (cerca de 1000:1 por camada).
  3. Cada chamada a `quiz.assistant.generate` estoura a memória. Como a cota só é reservada depois, o ataque se repete sem custo para o atacante.
- **Efeito:**
  - Na Vercel (Fluid), derruba todas as requisições em andamento naquela instância.
  - Na futura VPS, com um único processo Node, derruba o app inteiro, inclusive jogos ao vivo.
  - Exige um provedor de IA configurado.
- **Correção:** reservar a cota **antes** de ler o PDF. Abrir o PDF num `worker_threads` com limite de memória e de tempo, ou checar antes o tamanho descomprimido das streams (`zlib.inflateSync(buf, { maxOutputLength })`).

#### 🟡 M3 — A cota diária de IA pode ser contornada, e cada geração não tem teto de custo
- **Status:** ✅ corrigido; RN-31 e RN-33 da spec 027 foram atualizadas.
  - A cota só volta quando o provedor não respondeu: `GenerationNotChargedError`, que o adapter deduz de `APICallError` sem status ou com 4xx/5xx, ou da chave ausente. Tempo esgotado e resposta fora do formato contam.
  - Cada chamada tem `maxOutputTokens` de 32.000.
  - Há um teto diário da instância inteira (`AI_INSTANCE_GENERATIONS_PER_DAY`, padrão 200), contado sob uma trava única com a cota de cada criador.
  - Excluir a conta não devolve mais os usos ao teto. As linhas de `generation_usage` ficam, sem vínculo com a pessoa (`ON DELETE SET NULL`, migração `0018_generation_usage_kept`). Antes, o cascade as apagava, e um script podia criar uma conta, gastar, excluir e repetir.
  - Continua valendo configurar um limite de gasto no painel do provedor.
- **Confiança:** MEDIUM.
- **Onde:** [generate-questions.ts:119-126](../../packages/core/src/quiz/application/generate-questions.ts) e [ai-sdk-question-generator.ts:84-91](../../packages/ai/src/ai-sdk-question-generator.ts). O limite de cadastro está em `create-auth.ts:71`.
  ```ts
  } catch (error) {
      await deps.generationQuota.release(reservation.id);   // devolve a cota em QUALQUER erro
  generateText({ ..., abortSignal: AbortSignal.timeout(...), maxRetries: 1 })  // sem maxOutputTokens
  ```
- **Exploração:**
  - **Cota devolvida em falhas provocadas:** um tema de até 20.000 caracteres pede "60 perguntas de 3.000 palavras". A saída passa de `.max(40)`, é cortada pelo limite de tokens ou estoura os 120 s. A geração falha e a cota volta, mas o provedor cobrou a saída inteira (duas vezes com `maxRetries: 1`).
  - **Cota por conta, e contas são de graça:** não há verificação de e-mail, e o limite é de 5 cadastros por minuto por IP. Isso dá milhares de contas por dia, cada uma com 20 gerações.
- **Efeito:** gasto ilimitado na chave de IA da instância (DoS financeiro).
- **Correção:**
  - Só devolver a cota quando o provedor não trabalhou (erro de rede, 429 ou 5xx antes de qualquer uso), e não em erro de schema, tamanho ou tempo.
  - Definir `maxOutputTokens`.
  - Criar um teto diário da instância inteira (contagem global em `generation_usage`).
  - Configurar um limite de gasto no painel do provedor.
  - Opcional: liberar o assistente só para contas com algum tempo de vida ou e-mail verificado (depende da [decisão de e-mail](../adr/0007-autenticacao-better-auth-google.md)).

#### 🟡 M4 — `zod@4.5.4` pode esgotar a memória ao validar coleções grandes (GHSA-mrhx-c7xc-m3w5)
- **Status:** ✅ corrigido. O catálogo pede `zod: ^4.6.6`, e o lockfile resolve `zod@4.6.7` em todo o monorepo, Better Auth incluído.
- **Confiança:** MEDIUM.
- **Onde:** o catálogo (`pnpm-workspace.yaml`, `zod: ^4.4.3` → 4.5.4) valida toda entrada do tRPC, do MCP e do Better Auth.
- **Exploração:** um array grande de elementos inválidos gera um *issue* por elemento, sem teto. O `.max(n)` dos nossos schemas roda depois dos elementos, então não protege. Além disso, o tRPC põe a `ZodError` serializada na mensagem do `BAD_REQUEST`.
  - Na Vercel, o corpo é limitado a 4,5 MB, o que ainda dá milhões de issues.
  - Na VPS não há limite (ver L6).
- **Correção:** subir o catálogo para `zod: ^4.6.6` e conferir com `pnpm why zod` que o Better Auth também passa a usar a 4.6.6.

#### 🔵 L4 — Uploads sem cota, `media/` e `profiles/` sem limpeza, link remoto baixado antes da autorização
- **Status:** ✅ corrigido. O link remoto passa por `RemoteFileUploads.authorize` (participação no grupo) e por um limite de 60 buscas por hora **antes** do download; cada pessoa pede no máximo 200 envios por hora, somando todos os tipos (`UPLOAD.TOO_MANY`); imagens e fotos ficam registradas em `media_upload` e são apagadas depois de 24 h se nada (capa, pergunta, versão, perfil) apontar para elas. Specs 007 (RN-35a) e 039.
- **Confiança:** HIGH.
- **Onde:** [request-media-upload.ts:39-61](../../packages/core/src/media/application/request-media-upload.ts), `request-profile-photo-upload.ts` e [import-remote-file.ts:50-60](../../packages/core/src/media/application/import-remote-file.ts).
- **Problema:**
  - É possível pedir PUTs assinados sem limite (10 MB cada) e usar o bucket público como hospedagem de arquivos.
  - Nada sobe em `media/` e `profiles/` sem ser usado é apagado; `sources/`, `groups/` e `themes/` têm varredura de 24 h.
  - Pelo MCP, `create_group_post` com `{ url }` baixa até 20 MB **antes** de `requireMembership`, a até 120 requisições por minuto por chave.
- **Correção:**
  - Checar a política e a participação no grupo antes do `remoteFiles.fetch` (um passo `authorize(target)`).
  - Registrar uploads pendentes de mídia e foto com varredura de 24 h, como nos demais prefixos.
  - Criar um limite de uploads por usuário.

#### 🔵 L6 — Textos sem `.max()` na borda e nenhum limite de corpo na VPS
- **Status:** ✅ corrigido. Toda string de entrada dos routers e das ferramentas do MCP tem `.max()` (as datas ISO também), com testes que percorrem os esquemas; `/api/trpc`, `/api/auth` e `/mcp` recusam com 413 corpos acima de 1 MB, inclusive os enviados sem `content-length`.
- **Confiança:** LOW.
- **Onde:** [quiz.ts:46,63-64](../../packages/api/src/routers/quiz.ts), `quiz-questions.ts:252,262,323`, `account.ts:392-395`, e [api/trpc/$.ts](../../apps/web/src/routes/api/trpc/$.ts), que não limita o corpo.
- **Problema:** fora da Vercel, um POST de centenas de MB é lido, convertido de JSON e percorrido por `Intl.Segmenter` antes de o core recusar.
- **Correção:** `.max()` nos `z.string()` da borda e limite de corpo no handler (ou no proxy da VPS).

#### 🔵 L7 — Troca de avatar sem limite, e cada troca publica um evento no Pusher
- **Status:** ✅ corrigido. O mesmo avatar não grava nem publica nada, e cada jogador troca no máximo 10 vezes a cada 5 segundos, também na atividade (spec 028, RN-12a).
- **Confiança:** MEDIUM.
- **Onde:** [change-avatar.ts:43-49](../../packages/core/src/game/application/change-avatar.ts).
- **Problema:** um jogador anônimo no lobby chama `join.setAvatar` em loop. São uma escrita e uma mensagem por chamada, multiplicada pelos inscritos, e até avatares iguais publicam. Isso pode esgotar a cota diária do Pusher da instância inteira.
- **Correção:** não escrever nem publicar quando nada mudou, e limitar trocas por jogador (por exemplo 2/s).

#### 🔵 L9 — Uma enxurrada de posts quebra a aba Atribuições do grupo
- **Status:** ✅ corrigido. A aba Atribuições lê só as publicações de atividades ainda abertas (as 500 mais novas) por `listOpenAssignmentPosts`, então uma atividade encerrada nunca toma o lugar de uma aberta; cada pessoa publica no máximo 20 vezes por minuto e 500 por dia, somando mensagens, arquivos, quizzes e atividades (spec 036, RN-05a).
- **Confiança:** MEDIUM.
- **Onde:** [list-group-assignments.ts:35](../../packages/core/src/groups/application/list-group-assignments.ts), que chama `listPosts` sem página. As curtidas usam `inArray`, com um parâmetro por post.
- **Problema:** qualquer membro posta sem limite. Com dezenas de milhares de posts, a aba fica lenta e, passando de 65.535, falha no limite de parâmetros do Postgres. Cada post também notifica todos os membros.
- **Correção:** consultar direto só os posts com `game_id` aberto, com limite, e criar um limite por usuário em `group.post`, `group.share` e `group.assign`.

### Jogos e atividades (jogadores anônimos)

#### 🟡 M5 — Qualquer pessoa com o link ou PIN assume um participante da atividade pelo apelido
- **Status:** ✅ corrigido, por decisão do usuário depois de observar o Kahoot: só o navegador que guardou o participante o continua (spec 030, RN-20). "Sim" em "Você é {apelido}?" manda o par `playerId` + `secret` que o navegador guardou, e a busca pelo apelido deixou de existir; a lista de quem entrou fica só para ver, e um apelido em uso é recusado como na partida ao vivo (RN-03). O segredo só sai do servidor uma vez, para o aparelho que entrou. A emboscada também fecha: quem chega com o nome já usado entra com outro apelido e nunca herda as respostas de outro. Em troca, quem muda de aparelho ou limpa o navegador entra de novo com outro apelido.
- **Confiança:** HIGH. É um risco **aceito de propósito** (paridade com o Kahoot, spec 030), mas com impacto maior do que o necessário.
- **Onde:** [resume-assignment.ts:37-56](../../packages/core/src/game/application/resume-assignment.ts) e `get-assignment-cover.ts:76`.
  ```ts
  return { playerId: participant.id, secret: participant.secret, nickname: participant.nickname };
  ```
- **Exploração:**
  1. A capa pública lista todos os apelidos (`participants`).
  2. `game.assignment.resume({ gameId, nickname })` devolve **o mesmo segredo** do participante. O aparelho da vítima não é desconectado, e o atacante mantém o acesso de forma permanente.
  3. Com o segredo, o atacante responde errado o que falta, lê o histórico da vítima e troca o avatar. Isso funciona também depois do fim da atividade.
  - Encadeamento: o atacante entra antes com o nome real de um colega e erra tudo. Quando o colega chega, "Você é Maria?" → "Sim" o põe na sessão sabotada.
- **Correção (decisão de produto, pede atualização da spec 030):**
  - Emitir um segredo novo no `resume` e invalidar o antigo, para que o aparelho original perceba.
  - Não listar apelidos na capa pública.
  - Limitar `resume` por IP.

#### 🟡 M6 — Retomar a atividade reinicia uma pergunta cujo tempo já acabou (fura o "Timer da pergunta")
- **Status:** ✅ corrigido em 30/10/2026, por decisão do usuário, com a mudança da regra RN-21 da spec 030. Até então, a regra decidida em 20/10/2026 a partir do Kahoot recomeçava a pergunta com o tempo inteiro. Agora o tempo de uma pergunta corre desde que ela apareceu: quem volta continua com o que sobrava, e uma pergunta cujo tempo acabou enquanto estava fora conta como não respondida (CA-19, CA-19a). `resumeAssignment` passou a ser só `loadParticipant`, a mesma porta de toda chamada do participante: confere o par e acerta o andamento pelo relógio do servidor, sem recomeçar nada. Um E2E sai no meio da pergunta e volta para conferir o tempo.
- **Confiança:** HIGH.
- **Onde:** [resume-assignment.ts:45-51](../../packages/core/src/game/application/resume-assignment.ts).
  ```ts
  if (isGameOpen(game) && progress.phase === "answering") {
      await deps.players.saveProgressIfAt(participant.id, progress, { ...progress, startedAt: deps.clock.now() });
  ```
- **Exploração:**
  1. O participante abre a pergunta e fecha a aba.
  2. Pesquisa a resposta pelo tempo que quiser.
  3. Retoma em outro navegador e recebe o tempo inteiro de novo.
  4. Responde em cerca de 100 ms e ganha a pontuação máxima de velocidade.
  - O comentário supõe que a tela já liquidou a pergunta vencida, mas um cliente que não lê de novo nunca faz isso.
- **Correção:** aplicar `settleProgress(game, question, progress, now)` antes de reiniciar, para que só uma pergunta ainda dentro do tempo recomece.

#### 🟡 M7 — Entradas anônimas sem limite: um script ocupa as 200 vagas
- **Status:** ✅ mitigado. Cada rede (IP) cria no máximo 60 jogadores por minuto em cada partida ou atividade (spec 008, RN-45a; spec 030, RN-04a), contados antes da inserção e devolvidos quando a entrada é recusada. Uma turma atrás do mesmo IP entra sem esperar; um script leva mais de 3 minutos para lotar a partida, tempo de o anfitrião bloquear a entrada. Remover jogadores depois do lobby e participantes da atividade ficou para uma spec própria (roadmap, linha 046), ao lado da entrada em duas etapas (024).
- **Confiança:** HIGH.
- **Onde:** [join-game.ts:66](../../packages/core/src/game/application/join-game.ts) e [join-assignment.ts:69](../../packages/core/src/game/application/join-assignment.ts), cujo único limite é 200 jogadores ativos, e [remove-player.ts:32-33](../../packages/core/src/game/application/remove-player.ts), que só remove no lobby e só de jogos ao vivo.
- **Exploração:** com o PIN, que a turma toda recebe, um script entra 200 vezes.
  - **Jogo ao vivo:** os alunos reais recebem `GAME.FULL`. Depois do início, o anfitrião não consegue tirar os bots, e os apelidos deles podem ir para o placar projetado.
  - **Atividade:** fica aberta por até 28 dias e não tem como remover ninguém. Fica "cheia" a vida toda, e o relatório do criador se enche de lixo.
- **Correção:**
  - Limite de entradas por IP e por jogo (o `AttemptLimiter` existente, generoso o bastante para o NAT de uma escola).
  - Permitir remover jogadores durante o jogo e participantes da atividade (pede atualização das specs 008 e 029).

#### 🟡 M8 — Uma pessoa na rede da escola bloqueia a turma inteira de entrar
- **Status:** ✅ corrigido de outro jeito. A correção sugerida abaixo (deixar um PIN certo passar com o balde cheio) foi descartada: quem tenta adivinhar também saberia quais PINs estão certos, e o limite deixaria de valer. Agora o QR code e o link de entrada levam o id da partida, que não dá para adivinhar, e não passam pelo limite (spec 008, RN-39a); o PIN digitado continua limitado, e a mensagem de bloqueio manda entrar pelo QR code ou pelo link. O link da atividade (`/assignment/{id}`) nunca passou pelo PIN.
- **Confiança:** HIGH no mecanismo; exige um IP compartilhado, que é o caso típico de uma escola.
- **Onde:** [find-game-by-pin.ts:70-78](../../packages/core/src/game/application/find-game-by-pin.ts).
  ```ts
  const allowed = await deps.attempts.reserve(attemptKey, PIN_ATTEMPT_WINDOW_MS, PIN_ATTEMPT_LIMIT, now);
  if (!allowed) throw new TooManyPinAttemptsError(...);   // antes de olhar o PIN
  ```
- **Exploração:** um aluno manda PINs inválidos no começo de cada janela de 60 s. Todos os outros aparelhos atrás do mesmo IP público recebem `TooManyPinAttemptsError` **mesmo com o PIN certo**.
- **Correção:** deixar passar um PIN certo mesmo com o balde cheio. Por exemplo, olhar o PIN primeiro e consumir o balde só nos erros, com um orçamento curto de erros por IP. Para não abrir uma rajada de tentativas, mantenha a reserva só para quem já errou.

#### 🔵 L3 — O segredo do jogador viaja na URL de requisições GET
- **Status:** ✅ corrigido. `game.join.session` e `game.assignment.play` viraram *mutations*: o segredo vai no corpo, nunca no endereço. Um teste percorre todos os procedimentos e falha se alguma *query* receber `secret`.
- **Confiança:** HIGH.
- **Onde:** [game.ts:120,186](../../packages/api/src/routers/game.ts) (`assignment.play` e `join.session` são *queries*) e o `httpBatchLink` em [router.tsx:38](../../apps/web/src/router.tsx).
- **Problema:** `GET /api/trpc/game.join.session?input={…"secret":"…"}` é consultado a cada 5 s. O segredo fica em logs da plataforma, de proxies e dos filtros com inspeção TLS comuns em escolas, e quem lê esses logs pode agir como o jogador.
- **Correção:** `methodOverride: "POST"` nesses procedimentos (um link só de POST para `game.*`) ou o segredo num cabeçalho.

#### 🔵 L8 — "Respostas aleatórias" mantém os ids das alternativas do editor
- **Status:** ✅ corrigido. Com "Respostas aleatórias", cada alternativa é renomeada pelo lugar sorteado na partida, como o quebra-cabeça já fazia; um id aprendido noutra partida não diz nada. Na atividade, o aparelho já mostra os textos, então o id não revela mais do que eles.
- **Confiança:** MEDIUM.
- **Onde:** `withShuffledChoices` em [game-question.ts:169](../../packages/core/src/game/domain/game-question.ts), que mantém o `id`; só o quebra-cabeça usa `withDrawnIds`.
- **Problema:** os ids (`choice-1..4`) são iguais em todo jogo do mesmo quiz, e os resultados de uma atividade revelam os `rightIds`. Um cliente com script responde certo pelo id em cerca de 50 ms num jogo ao vivo posterior, ignorando o embaralhamento.
- **Correção:** renomear as alternativas pelo lugar sorteado em cada jogo, como o quebra-cabeça já faz.

### Exposição de dados

#### 🔵 L1 — O tRPC devolve ao cliente mensagens internas de erro (SQL e parâmetros)
- **Status:** ✅ corrigido.
  - O `errorFormatter` troca a mensagem de todo `INTERNAL_SERVER_ERROR` por "Internal server error" e tira o `stack`.
  - O handler de `/api/trpc` registra a causa no log do servidor (`onError`).
  - `GenerationFailedError` tem mensagem fixa e guarda o erro do provedor em `cause`; `DomainError` passou a aceitar `{ cause }`.
- **Confiança:** HIGH no mecanismo; o gatilho com byte NUL não foi executado.
- **Onde:** o `errorFormatter` em [api/src/index.ts:7-18](../../packages/api/src/index.ts) só reescreve `DomainError`. Há também o `String(error)` em [generate-questions.ts:124](../../packages/core/src/quiz/application/generate-questions.ts).
- **Problema:**
  - No tRPC 11, um `INTERNAL_SERVER_ERROR` leva o `cause.message` mesmo em produção.
  - Um texto com `\u0000` faz o Postgres recusar, e o Drizzle devolve `Failed query: <SQL> params: <…>` para o navegador.
  - Erros do provedor de IA (modelo, cobrança, sufixo mascarado da chave) também voltam ao usuário.
  - Fora de `NODE_ENV=production`, o stack trace vai junto.
  - O MCP não é afetado: `toolErrorResult` já esconde esses erros.
- **Correção:** no `errorFormatter`, quando o código for `INTERNAL_SERVER_ERROR` e a causa não for `DomainError`, trocar a mensagem por uma genérica, tirar o `stack` e registrar o erro no servidor. No assistente, usar uma mensagem fixa.

### Configuração e infraestrutura

#### 🔵 L2 — `clientIpOf` confia na primeira entrada do `x-forwarded-for`
- **Status:** ✅ corrigido. `clientIpOf` lê a **última** entrada da lista (a que o proxy acrescentou), valida o endereço e conta IPv6 por /64; em produção fora da Vercel o app não sobe sem `CLIENT_IP_HEADER` (`resolveClientIpHeader`); o limitador apaga de tempos em tempos as janelas com mais de dois dias. O Better Auth já agrupa IPv6 por /64 e só confia em cabeçalho de valor único; o `docs/deploy.md` recomenda um assim na VPS.
- **Confiança:** MEDIUM. Depende do deploy; não é explorável na Vercel, que sobrescreve o cabeçalho.
- **Onde:** [client-ip.ts:11-17](../../packages/api/src/client-ip.ts). O risco já está documentado em `docs/deploy.md` (seção VPS).
- **Problema:** atrás de um proxy que **acrescenta** ao cabeçalho (o `$proxy_add_x_forwarded_for` do nginx), um valor novo por requisição gera um balde novo. Isso dá PINs ilimitados e login por força bruta, e também enche a tabela `attempt_window`, que nunca é limpa. Sem o cabeçalho, todo mundo cai num balde "unknown" compartilhado.
- **Correção:** usar a entrada mais à direita (a do seu proxy) ou a regra do Better Auth (valor único ou `trustedProxies`). Agrupar IPv6 por /64, limpar `attempt_window` antiga e, em produção fora da Vercel, falhar no boot se `CLIENT_IP_HEADER` continuar `x-forwarded-for`.

#### 🔵 L10 — Nenhum cabeçalho de segurança HTTP
- **Status:** ✅ corrigido. Um *request middleware* do TanStack Start (`apps/web/src/start.ts`) põe `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff` e `Referrer-Policy` em toda resposta, inclusive `/api/*` e `/mcp`, no dev, na Vercel e na VPS. A CSP completa fica para uma rodada *report-only*.
- **Confiança:** HIGH de que estão ausentes; a exploração atual é baixa.
- **Onde:** [vite.config.ts](../../apps/web/vite.config.ts) (sem `routeRules`) e [vercel.json](../../apps/web/vercel.json) (sem `headers`).
- **Problema:** faltam `frame-ancestors`/`X-Frame-Options`, `X-Content-Type-Options: nosniff` e `Referrer-Policy`. Hoje o cookie `SameSite=Lax` impede o clickjacking de "Permitir" em `/connect`, e não há XSS para uma CSP conter.
- **Correção:** `routeRules` do nitro, que valem na Vercel e na VPS, com `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff` e `Referrer-Policy: strict-origin-when-cross-origin`. CSP completa fica para depois, em modo *report-only* primeiro (o Pusher, o bucket e o Google precisam estar na lista). HSTS já vem da Vercel.

#### 🔵 L11 — Servidor de dev (Vite 8.2.2) exposto pelo ngrok
- **Status:** ✅ corrigido. O `vite` foi para 8.3.5, e o `docs/deploy.md` passou a mandar expor por túnel só o build de produção, com o cadastro fechado.
- **Confiança:** MEDIUM. Afeta só o fluxo de dev com agentes, não a produção.
- **Problema:** o GHSA-vfpm-58rq-9qcg vale no Windows (vaza os primeiros bytes de arquivos fora de `server.fs`). O maior problema, porém, é que quem descobre a URL do túnel acessa um build de dev que serve o código do monorepo em `/@fs/`, devolve stack traces, aceita cadastro e usa a sua chave de IA.
- **Correção:** subir o catálogo para `vite` ≥ 8.2.4. Para expor por túnel, usar o build de produção (`pnpm build && pnpm -F web start`) com `AUTH_SIGN_UP_ENABLED=false`.

#### 🔵 L13 — A lista de bloqueio de SSRF não cobre faixas IPv6 de transição
- **Status:** ✅ corrigido. Um endereço IPv6 só é público dentro de `2000::/3`, fora das faixas de transição (`2001::/23`, Teredo incluído, `2002::/16` do 6to4) e de documentação; NAT64 e IPv4 traduzido ficam de fora por não estarem em `2000::/3`.
- **Confiança:** LOW.
- **Onde:** [http-remote-files.ts:42-54](../../packages/storage/src/http-remote-files.ts).
- **Problema:** `64:ff9b:1::/48`, `2002::/16` (6to4), `2001::/32` (Teredo) e `::ffff:0:0:0/96` contam como públicos. Só importa numa VPS com IPv6 e um tradutor na rede.
- **Correção:** acrescentar essas faixas, ou aceitar só `2000::/3` menos as faixas de transição.

### Agentes de IA (injeção de prompt)

#### 🔵 L12 — Texto de terceiros chega ao agente sem o rótulo de "dado, não instrução" em algumas ferramentas
- **Status:** ✅ corrigido. As ferramentas de relatório e de jogo ao vivo avisam que apelidos e respostas digitadas são dados, não instruções (`WRITTEN_BY_PLAYERS`), e as instruções do servidor também.
- **Confiança:** LOW (defesa em profundidade).
- **Onde:** `WRITTEN_BY_PEOPLE` existe em `mcp/src/tools/groups.ts:17`, mas não em `reports.ts` nem em `live-games.ts`.
- **Problema:** um membro posta instruções no grupo. O agente do administrador, ao ler o feed, pode ser induzido a postar a lista de membros com e-mails noutro grupo, ou a "importar uma imagem" de `https://atacante/?d=<dados>`. Hoje só o rótulo e o julgamento do modelo seguram isso.
- **Correção:** rotular também as ferramentas de relatório e de jogo ao vivo, e devolver o texto alheio num envelope `untrusted` explícito.

### Integridade de dados

#### 🔵 L5 — Escritas simultâneas passam do limite de 200 perguntas
- **Status:** ✅ corrigido. `saveList` grava sob `pg_advisory_xact_lock` por quiz: duas listas ao mesmo tempo deixam uma delas, nunca as duas. O PGlite já serializa transações, então o teste documenta a garantia; a corrida só aparece no Postgres real.
- **Confiança:** MEDIUM.
- **Onde:** a checagem está em `quiz/domain/question-list.ts:44,110`, e a escrita em `drizzle-question-repository.ts:85-128` (`saveList`), sem trava.
- **Problema:** N chamadas paralelas a `quiz.assistant.add` passam na mesma leitura, e ficam até N×200 perguntas, que `publish` e `hostGame` copiam depois.
- **Correção:** fazer leitura, checagem e escrita numa transação com `SELECT … FOR UPDATE` no quiz, ou `pg_advisory_xact_lock` por quiz.

### INFO (sem exploração, registrados para decisão)

1. **Registro OAuth aberto** (10 por minuto por IP) e clientes que nunca são limpos: a tabela `oauth_client` cresce sem limite.
2. **Requisições ao `/mcp` sem token válido não têm limite de taxa.** Um JWT com `kid` desconhecido faz reler o JWKS a cada requisição (`agent-token-verifier.ts:194-199`).
3. **Chaves de acesso (`qz_…`) não expiram por inatividade**, ao contrário das conexões OAuth.
4. **Conta só com Google é excluída digitando o e-mail**, sem nova autenticação (é o que a spec 039, RN-38, define).
5. **Vinculação Google com `requireLocalEmailVerified: false`:** risco aceito na ADR 0007, enquanto não houver domínio de e-mail.
6. **CSRF no `/api/trpc`** depende só do cookie `SameSite=Lax`, porque o tRPC aceita `multipart/form-data`. Checar `Origin`/`Sec-Fetch-Site` nas mutations deixaria isso independente do cookie.
7. **`safeRedirect` não remove TAB, CR e LF** (`/%09/evil.com`). Hoje quem bloqueia é o `resolveRedirect` do router-core e o `navigate` do cliente, não o app. Vale endurecer resolvendo com `new URL(target, origin)` e exigindo a mesma origem.
8. **O segredo do jogador é comparado com `===` e guardado em texto puro.** É um UUID de 122 bits; usar `timingSafeEqual` e hash SHA-256 é só higiene.
9. **A escala do slider revela a resposta módulo o passo** (as posições contam a partir da resposta, por design da spec 032).
10. **No R2, o bucket inteiro é público**, inclusive `sources/` (os PDFs do assistente) e `themes/`, protegidos só pela chave UUID. Também falta `nosniff`. Mantenha o domínio do bucket fora do domínio do app.
11. **O `.gitignore` da raiz não cobre `*.pem`, `*.key`, `credentials.json` ou `service-account.json`.** O de `apps/web` cobre `*.pem`.
12. **O `docker-compose.yml` e o `.env.example` usam senhas padrão**, só para dev local.

## Dependências

`pnpm audit --prod` acusou 55 avisos (1 critical, 19 high, 30 moderate, 5 low). O que importa para produção:

| Pacote (instalado) | Por onde entra | Alcançável em produção? | Ação |
|---|---|---|---|
| `zod@4.5.4` | catálogo, validação de toda entrada | **Sim** → M4 | ✅ catálogo `^4.6.6` (resolve 4.6.7) |
| `undici@8.10.2` | `packages/storage` (links dos agentes) | Não: usa `undici.request` com `connect.lookup`, sem `tls`, sem interceptores e com redirects seguidos à mão | ✅ `^8.12.2` (resolve 8.12.3); a 8.10.2 ficou só no `jsdom` dos testes |
| `undici@7.29.1` | `@ai-sdk/provider-utils` | Não: só fala com hosts fixos do provedor | vem com a atualização do `ai` |
| `seroval@1.6.8` | TanStack Start (SSR) | Não: nenhum RegExp ou typed array chega à serialização, e o tRPC não tem transformer | atualizar `@tanstack/react-start` (higiene) |
| `vite@8.2.2` | dev server | Só no dev pelo ngrok → L11 | ✅ catálogo `^8.2.4` (resolve 8.3.5) |
| `@modelcontextprotocol/sdk@1.30.0`, `proxy-addr` (o "critical"), `body-parser`, `hono`, `systeminformation`, `fast-uri`, `ip-address`, `deepmerge`, `brace-expansion`… | todos pelo CLI **`shadcn`**, declarado em `dependencies` de `packages/ui` | Não: é um CLI. O app usa só `shadcn/tailwind.css`, resolvido no build | ✅ `shadcn` movido para `devDependencies` |
| `source-map-js`, `esbuild@0.18`, `@vitest/mocker` | build e testes | Não | — |

O MCP do Quizio usa `@modelcontextprotocol/server@2.4.0`, não o `sdk@1.30.0` dos avisos.

## Segredos

✅ **Nenhum segredo real em arquivos rastreados.** A busca cobriu `sk_live_`, `whsec_`, `AKIA…`, chaves privadas, tokens do GitHub, do Slack e do Google, `sk-ant-`, `sk-proj-` e connection strings com senha. A única ocorrência é a senha padrão do Postgres local em `apps/web/.env.example`. Nenhum `.env` está rastreado, e não há `.github/workflows`. Variáveis `VITE_*` expostas ao navegador: só as públicas do Pusher (key, cluster, host, porta e TLS).

## Propostas de patch

Nenhum achado CRITICAL ou HIGH, então não há patches obrigatórios nesta auditoria. As correções dos MEDIUM estão descritas em cada achado e ordenadas no plano abaixo. **Nada foi alterado no código.**

## Falsos positivos descartados

- **IDOR em quizzes, perguntas, relatórios, temas, mídia e notificações.** Tudo passa por `requireOwnedQuiz`, `loadEditableQuiz`, `loadOwnedHeader` ou `findOwned`, e os ids de pergunta são buscados dentro da lista do dono.
- **Mass assignment.** O zod remove chaves desconhecidas, e os `userId` de entrada são só alvos checados.
- **`QuizShareGrants.canUse`.** Um quiz privado e não compartilhado dá `false`. O ramo público exige `public`, publicado e fora da lixeira. `duplicateSharedQuiz` copia só a versão jogável, como privada.
- **`getPublicQuiz` com respostas certas.** É por design para quiz público, e `PersonView` não tem e-mail.
- **Forjar um post de grupo para ler o relatório de alguém.** Só `assignInGroup` (um jogo novo do próprio autor) e `assignToGroups` (dono checado) gravam `game_id`.
- **IDOR em grupos, posts, curtidas e convites.** `requireMembership` aparece em todo procedimento, os posts são filtrados por `(group_id, id)` e o e-mail só vai para o administrador.
- **Código de convite.** São 128 bits (`randomBytes(16)`), e o `INSERT … SELECT … ON CONFLICT` é parametrizado.
- **SQL injection.** O `sql.raw` só recebe nomes de coluna constantes, o LIKE da biblioteca é escapado e os cursores são parâmetros.
- **Chave de storage de outro usuário** em capa, imagem, foto, tema ou PDF: `isFileDirectlyUnder` bloqueia `/` e `..`, e há `exists` e a linha pendente na transação.
- **Apagar o arquivo de outro usuário.** As chaves são sempre do prefixo do dono, as cópias duplicam o objeto, e `deletePrefix` usa o id da sessão e exige `/` final.
- **Upload com tipo ou tamanho falso.** `content-type` e `content-length` vão na assinatura, e não se aceita SVG nem HTML.
- **Injeção no `Content-Disposition`.** Os caracteres de controle são removidos e o nome vai em `filename*=UTF-8''…`.
- **SSRF por DNS rebinding.** A checagem roda no `connect.lookup` de cada conexão, ou seja, fixa o IP checado. IPv4 decimal, octal e hex são normalizados, e o mapeado em IPv6, os metadados de nuvem e no máximo 3 redirects, cada um rechecado, são tratados.
- **Ações do anfitrião sem dono.** `view`, `start`, `advance`, `setOptions`, `removePlayer`, `end` e `review.*` usam todos `protectedProcedure` mais `requireOwnedGame`.
- **Vazamento da resposta certa antes dos resultados.** Nada encontrado em `PublicStage`, `PlayerStageView`, `history` ou nos eventos de tempo real.
- **Tempo ou pontos forjados, resposta dupla ou atrasada.** Tudo é medido no servidor, e há PK `(game, question, player)` e a checagem de `acceptsAnswers`.
- **Eventos de cliente no Pusher.** Os canais são públicos e não há endpoint de auth; os canais de notificação são HMAC de 128 bits.
- **XSS.** Não há `dangerouslySetInnerHTML`, `innerHTML` nem markdown. O `linkify` só gera `https?://`, com `rel="noopener noreferrer nofollow"`. As cores de tema são checadas como `#rrggbb` no servidor.
- **pdf.js (CVE-2024-4367).** A versão instalada (6.4) já tem a correção, e só o PDF do próprio criador é renderizado.
- **SSR vazando dados de outro usuário.** O `QueryClient` é criado por requisição, nada é desidratado, e devtools não vão para o build de produção.
- **Open redirect no login e no OAuth.** O router-core bloqueia URLs protocol-relative, e o Better Auth recusa `javascript:`/`data:` em `redirect_uri` e valida o `callbackURL`.
- **Pular o consentimento (`skip_consent`)** ou usar o JWT da sessão como token do MCP: o issuer e a audience são diferentes, e é obrigatório existir uma linha em `oauth_consent`.
- **Timing ou enumeração de chaves de acesso.** São 256 bits, a busca é por hash, e toda falha devolve a mesma mensagem.
- **Trocar a senha mantendo agentes conectados.** O hook revoga chaves, consentimentos e tokens, e há teste disso.
- **Cadastro com o cadastro fechado.** `databaseHooks.user.create.before` cobre todos os caminhos.
- **`AI_PROVIDER=fake` em produção.** É recusado com `NODE_ENV=production`.
- **Injeção de prompt no assistente de criação.** Não há ferramentas, a saída é estruturada e revalidada, e a fonte é do próprio criador.
- **Segredos em logs.** Não há; o único log é `console.error` de erro de ferramenta do MCP.

## Plano de correção sugerido

| # | Achado | Esforço | Precisa de spec? |
|---|---|---|---|
| 1 | ✅ M1 — recusar endereços de retorno ambíguos no registro e na tela de consentimento | pequeno | não (correção) |
| 2 | ✅ M4 — `zod` 4.6.7 (+ `vite` 8.3.5, `undici` 8.12.3, `shadcn` em devDependencies) | pequeno | não |
| 3 | ✅ M6 — mudar a RN-21 (tempo da pergunta que continua contando depois de sair) | pequeno | ✅ spec 030 (RN-21, CA-19, CA-19a) |
| 4 | ✅ L1 — `errorFormatter` mascarando 500 | pequeno | não |
| 5 | ✅ M2 + M3 — cota antes do PDF, sem devolução em falha provocada, `maxOutputTokens`, teto global, limite de descompressão | médio | ✅ spec 027 (RN-31, RN-33) |
| 6 | ✅ M8 + M7 — QR e link fora do limite de PIN; 60 entradas por minuto por rede em cada jogo | médio | ✅ specs 008, 029 e 030 |
| 7 | ✅ M5 — só o navegador que entrou continua o participante; lista só para ver | médio | ✅ spec 030 (RN-03, RN-20) |
| 8 | ✅ L10 — cabeçalhos de segurança (*request middleware*, no lugar de `routeRules`) | pequeno | não |
| 9 | ✅ Demais LOW (L2 a L9, L11 a L13) | médio | ✅ specs 007, 028, 036, 039 |

L2, L6 e L13, que só apareciam fora da Vercel, já estão corrigidos. O plano está concluído: o M6 foi o último, em 30/10/2026. Fica para depois a CSP completa, primeiro em modo *report-only* (L10).

## Cobertura

- **Revisado em 5 frentes paralelas:**
  - autenticação, OAuth e MCP;
  - autorização do tRPC;
  - jogos, atividades e tempo real;
  - grupos, uploads, storage e SSRF;
  - cliente web, configuração e IA.
- **Arquivos:** todos os routers de `packages/api`, os use cases de `packages/core` que eles chamam, os adapters Drizzle, `packages/auth`, `packages/mcp`, `packages/storage`, `packages/ai`, `packages/realtime`, as rotas de servidor de `apps/web` e o código-fonte das bibliotecas onde o comportamento importava (Better Auth 1.7.14, tRPC 11.18, pdf-lib 1.17.1, undici 8.10.2, router-core 1.171.34).
- **Ferramentas:** leitura estática, `pnpm audit --prod`, `git grep` de segredos e `git ls-files`.
- **Fora do escopo:** teste dinâmico (DAST), pentest, configuração dos painéis da Vercel, do R2 e do Pusher, e o histórico do Git.
