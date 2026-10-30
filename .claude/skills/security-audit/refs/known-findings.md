# Achados conhecidos e seu estado

Carregar nos **Passos 0 e 7**. Cada auditoria reverifica cada linha (lendo o código atual, não confiando no estado escrito) e atualiza a coluna **Estado** com a data: `aberto`, `corrigido em <commit/PR>`, `aceito (spec/ADR)`, `piorou`. Um achado corrigido que voltou é **regressão** e entra no relatório como achado novo, com a severidade original ou maior.

Os ids (M1, L3, INFO 6…) são os da auditoria que os abriu. Achados novos recebem ids novos no relatório da vez e são acrescentados aqui.

Origem: auditoria de 29/10/2026 sobre o commit `79c963f`. Este arquivo é a base das reverificações, com ou sem o relatório completo em `docs/security/`.

---

## MEDIUM

| Id | Achado | Onde olhar | Corrigido quando | Estado |
|---|---|---|---|---|
| M1 | A tela "Conectar ao Quizio" pode mostrar um domínio de retorno falso (regex ≠ parser do navegador; `\` e espaço) | `packages/core/src/shared/domain/web-address.ts`, `apps/web/src/functions/agent-connect-request.ts`, `packages/core/src/agents/domain/agent-connection.ts`, registro em `packages/auth/src/create-auth.ts` | Host mostrado calculado com `new URL(...).host`; URIs não canônicas recusadas no registro e no CIMD | corrigido em PR #31 (29/10/2026) |
| M2 | PDF com bomba de descompressão derruba a função antes de a cota ser cobrada | `packages/core/src/quiz/application/generate-questions.ts` (`sourceFor` antes da reserva), `packages/ai/src/pdf-lib-pdf-pages.ts` | Cota reservada antes de ler o PDF e leitura com teto de memória/tempo | corrigido em PR #31 (29/10/2026) |
| M3 | Cota diária de IA contornável (devolvida em qualquer erro) e sem teto de custo por geração | `generate-questions.ts` (`release` no catch), `packages/ai/src/ai-sdk-question-generator.ts` (sem `maxOutputTokens`) | Devolução só sem trabalho do provedor; `maxOutputTokens`; teto global | corrigido em PR #31 (29/10/2026; créditos da spec 045, ADR 0024) |
| M4 | `zod@4.5.4`: memória ao validar coleções grandes (GHSA-mrhx-c7xc-m3w5) | `pnpm-workspace.yaml` (catálogo), `pnpm why zod` | Toda cópia de zod 4 ≥ 4.6.6 no lockfile | corrigido em PR #31 (29/10/2026) |
| M5 | Qualquer pessoa com o link/PIN assume um participante da atividade pelo apelido (mesmo segredo devolvido) | `packages/core/src/game/application/assignment-play-view.ts` (`loadParticipant`), `get-assignment-cover.ts` (`participants`) | Só o par `playerId` + `secret` guardado pelo navegador continua o participante; a capa lista apelidos só para ver e nenhum procedimento devolve o segredo a quem diz um apelido | corrigido em PR #31 (29/10/2026; spec 030, RN-20) |
| M6 | Retomar a atividade reinicia uma pergunta cujo tempo já acabou | `packages/core/src/game/application/assignment-play-view.ts` (`loadParticipant`), `game/domain/participant-progress.ts` (`settleProgress`, `nextProgress`) | Nenhum caminho regrava o `startedAt` de uma pergunta em `answering`; o "Sim" é o próprio `game.assignment.play` | corrigido em PR #33 (30/10/2026; spec 030, RN-21) |
| M7 | Entradas anônimas sem limite: um script ocupa as 200 vagas | `join-game.ts`, `join-assignment.ts`, `join-limit.ts`, `remove-player.ts` (só lobby, só ao vivo) | Limite por IP/jogo; remover durante o jogo e na atividade (pede specs 008/029) | mitigado em PR #31 (29/10/2026): 60 entradas por minuto por rede; remover depois do lobby é a linha 046 do roadmap |
| M8 | Uma pessoa na rede da escola bloqueia a turma de entrar (o limitador barra até o PIN certo) | `packages/core/src/game/application/find-game-by-pin.ts` | QR code e link levam o id do jogo e não passam pelo limite de PINs; o PIN digitado continua limitado | corrigido em PR #31 (29/10/2026; spec 008, RN-39a) |

## LOW

| Id | Achado | Onde olhar | Corrigido quando | Estado |
|---|---|---|---|---|
| L1 | tRPC devolve mensagens internas de 500 (SQL, parâmetros, erro do provedor de IA; stack fora de produção) | `errorFormatter` em `packages/api/src/index.ts`; `String(error)` em `generate-questions.ts` | 500 sem `DomainError` com mensagem genérica e sem stack | corrigido em PR #31 (29/10/2026) |
| L2 | `clientIpOf` confia na primeira entrada do `x-forwarded-for` | `packages/api/src/client-ip.ts`, `packages/env/src/client-ip-header.ts`, `docs/deploy.md` (VPS) | Entrada mais à direita ou regra do proxy; IPv6 por /64; limpeza de `attempt_window`; boot falha na VPS com o padrão | corrigido em PR #31 (29/10/2026) |
| L3 | Segredo do jogador na URL de GETs (`game.join.session`, `game.assignment.play`) | `packages/api/src/routers/game.ts`, `routers/secrets-in-body.test.ts` | Esses procedimentos por POST ou segredo em cabeçalho | corrigido em PR #31 (29/10/2026) |
| L4 | Uploads sem cota; `media/` e `profiles/` sem limpeza; link remoto baixado antes da autorização | `request-media-upload.ts`, `request-profile-photo-upload.ts`, `import-remote-file.ts`, `media/application/media-uploads.ts` | `authorize(target)` antes do fetch; pendências com varredura; limite por usuário | corrigido em PR #31 (29/10/2026) |
| L5 | Escritas simultâneas passam do limite de 200 perguntas | `packages/core/src/quiz/domain/question-list.ts`, `drizzle-question-repository.ts` (`saveList`) | Leitura-checagem-escrita sob trava por quiz | corrigido em PR #31 (29/10/2026) |
| L6 | Textos sem `.max()` na borda; nenhum limite de corpo na VPS | `packages/api/src/routers/*.ts`, `packages/mcp/src/tools/`, `apps/web/src/lib/body-limit.ts` | `.max()` na borda e limite de corpo | corrigido em PR #31 (29/10/2026) |
| L7 | Troca de avatar sem limite, cada uma publica no Pusher | `packages/core/src/game/application/change-avatar.ts`, `avatar-change-limit.ts` | Sem escrita/evento quando nada muda; limite por jogador | corrigido em PR #31 (29/10/2026) |
| L8 | "Respostas aleatórias" mantém os ids das alternativas do editor | `withShuffledChoices` em `packages/core/src/game/domain/game-question.ts` | Ids renomeados pelo lugar sorteado, como `withDrawnIds` | corrigido em PR #31 (29/10/2026) |
| L9 | Enxurrada de posts quebra a aba Atribuições (sem página; `inArray` > 65.535 parâmetros) | `packages/core/src/groups/application/list-group-assignments.ts`, `listOpenAssignmentPosts` em `drizzle-group-feed-query.ts` | Consulta só dos posts com atividade aberta, com limite; limite por usuário em `group.post`/`share`/`assign` | corrigido em PR #31 (29/10/2026) |
| L10 | Nenhum cabeçalho de segurança HTTP | `apps/web/src/start.ts` (*request middleware*), `apps/web/src/lib/security-headers.ts` | `frame-ancestors`/`X-Frame-Options`, `nosniff`, `Referrer-Policy` em toda resposta | corrigido em PR #31 (29/10/2026); a CSP completa, primeiro em *report-only*, continua pendente |
| L11 | Dev server (Vite 8.2.2) exposto pelo ngrok | catálogo `vite`; fluxo de agentes por túnel (`docs/deploy.md`) | `vite` ≥ 8.2.4; túnel só com build de produção e cadastro fechado | corrigido em PR #31 (29/10/2026) |
| L12 | Texto de terceiros chega ao agente sem o rótulo de dado em algumas ferramentas | `packages/mcp/src/tools/reports.ts`, `live-games.ts`, `groups.ts` (`WRITTEN_BY_PLAYERS`) | Rótulo ou envelope `untrusted` em toda ferramenta que devolve texto alheio | corrigido em PR #31 (29/10/2026) |
| L13 | Lista de bloqueio de SSRF não cobre faixas IPv6 de transição | `packages/storage/src/http-remote-files.ts` | `64:ff9b:1::/48`, `2002::/16`, `2001::/32`, `::ffff:0:0:0/96` bloqueadas | corrigido em PR #31 (29/10/2026): só é público o que está em `2000::/3`, fora das faixas de transição e de documentação |

## INFO

| Id | Registro | Estado |
|---|---|---|
| INFO 1 | Registro OAuth aberto (10/min/IP) e `oauth_client` sem limpeza | aberto |
| INFO 2 | `/mcp` sem token válido não tem limite de taxa; `kid` desconhecido relê o JWKS a cada requisição (`packages/auth/src/agent-token-verifier.ts`) | aberto |
| INFO 3 | Chaves `qz_` não expiram por inatividade | aberto |
| INFO 4 | Conta só Google é excluída digitando o e-mail (spec 039, RN-38) | aceito (spec 039) |
| INFO 5 | Vinculação Google com `requireLocalEmailVerified: false` | aceito (ADR 0007) |
| INFO 6 | CSRF no `/api/trpc` depende só do `SameSite=Lax` (tRPC aceita `multipart/form-data`) | aberto |
| INFO 7 | `safeRedirect` não remove TAB/CR/LF; quem bloqueia hoje é o router-core | aberto |
| INFO 8 | Segredo do jogador comparado com `===` e guardado em texto puro | aberto (higiene) |
| INFO 9 | Escala do slider revela a resposta módulo o passo | aceito (spec 032) |
| INFO 10 | Bucket R2 inteiro público, inclusive `sources/` e `themes/`; falta `nosniff` | aberto |
| INFO 11 | `.gitignore` da raiz sem `*.pem`, `*.key`, `credentials.json`, `service-account.json` | aberto |
| INFO 12 | `docker-compose.yml` e `.env.example` com senhas padrão de dev | aceito (só dev) |
