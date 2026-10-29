---
name: security-audit
description: Auditoria de segurança do Quizio (TanStack Start + tRPC + Better Auth + Drizzle + MCP). Começa pelas versões do pnpm-lock.yaml e pelo pnpm audit, varre segredos rastreados, segue cada entrada até o destino (zod → sessão → dono → banco, storage, fetch ou IA), passa todo achado pelo filtro de falsos positivos e escreve o relatório em PT-BR com severidade e confiança; patches só propostos, para CRITICAL/HIGH. Use quando pedirem para auditar segurança, fazer uma auditoria ou revisão de segurança, procurar vulnerabilidades (IDOR, XSS, SSRF, OAuth, uploads, custo de IA, trapaça no jogo) ou /security-audit [caminho].
argument-hint: "[caminho opcional, ex.: packages/mcp]"
---

# /security-audit — auditoria de segurança do Quizio

Escopo: **$ARGUMENTS** (vazio = o monorepo inteiro).

Postura de pesquisador de segurança: contexto, fluxo de dados e o comportamento **da versão instalada** de cada biblioteca. Método adaptado da skill [`security-audit`](https://github.com/devfraga/skills-sujeito-programador/tree/main/security-audit) (feita para Next.js/Auth.js/Prisma/Stripe), com o checklist trocado pelo da nossa stack. A primeira auditoria feita assim é `docs/security/auditoria-2026-10-29.md`.

Relatório em **português** (termos OWASP/CWE/CVE podem ficar em inglês). Código citado como `arquivo:linha`.

## Princípios

1. **Versão instalada > última lançada.** CVEs e comportamento se checam na versão do `pnpm-lock.yaml`. "Há versão mais nova" sem advisory é no máximo INFO.
2. **Evidência > padrão.** Só é achado o que tem caminho de exploração com entrada controlada pelo atacante e nenhuma checagem no caminho. `publicProcedure`, CORS `*` ou ausência de CSP não são achados por si (`refs/false-positives.md`).
3. **Siga a cadeia até o fim.** Os routers são finos de propósito: a autorização do Quizio mora no core (`requireOwnedQuiz`, `requireMembership`, `requireOwnedGame`, `loadParticipant`…), não no router. Router sem checagem visível só vira achado depois de ler o use case, o helper de dono e o adapter.
4. **Biblioteca se confirma no código-fonte instalado** (`node_modules/.pnpm/<pacote, com / trocado por +>@<versão>[_<hash>]/node_modules/<pacote>/`; numa worktree sem `node_modules`, rodar `pnpm install` antes) ou no Context7 da mesma versão, nunca de memória.
5. **Decisão aceita não é achado novo.** Riscos registrados numa ADR ou spec (ex.: ADR 0007, spec 030) entram como INFO com a referência, ou como achado só se o impacto for maior do que o aceito.
6. **Nada muda no código.** Patches são propostas, só para CRITICAL e HIGH. O único arquivo escrito é o relatório. Sem commit, sem PR, a menos que peçam.
7. **Nenhum ataque contra uma instância real.** Um mecanismo pode ser reproduzido isolado (script Node no scratchpad, teste PGlite, `pnpm vitest run`), nunca contra produção, preview ou o túnel ngrok de alguém sem pedido explícito.

## Fluxo (ordem fixa)

### Passo 0 — Auditoria anterior e decisões

1. Ler o relatório mais recente em `docs/security/auditoria-*.md` e `refs/known-findings.md`. Cada achado conhecido é **reverificado** (corrigido / ainda aberto / piorou), não redescoberto como novo.
2. Ler o que define o que é "por design": `CLAUDE.md`, `specs/constitution.md`, `docs/architecture.md` (regra de dependência), `docs/deploy.md` (Vercel vs VPS) e as ADRs que tocam segurança: 0003 (storage), 0007 (Better Auth/Google, risco aceito), 0009 (jogo ao vivo), 0011 (deploy), 0014 (atribuições), 0023 (MCP).
3. `git log --oneline <commit da última auditoria>..HEAD` mostra o que mudou. Uma auditoria completa revisa tudo, mas o que mudou merece leitura linha a linha.

### Passo 1 — Escopo, stack e versões

`refs/project-stack.md`: inventário pelo lockfile, gates por versão (Better Auth 1.7, tRPC 11, zod 4, TanStack Start, Vite) e as diferenças **Vercel vs VPS**, que mudam a severidade de vários achados. Registrar o commit (`git rev-parse --short HEAD`) e o bloco "Stack instalada" do relatório.

Depois, mapear a superfície com `refs/attack-surface.md`: rotas de servidor em `apps/web/src/routes`, server functions em `apps/web/src/functions`, cada `publicProcedure`/`protectedProcedure` em `packages/api/src/routers`, as ferramentas do MCP em `packages/mcp/src/tools`, os endpoints do Better Auth e os canais de tempo real.

### Passo 2 — Dependências

```bash
pnpm audit --prod
pnpm why <pacote>          # por onde cada aviso entra
```

- Só pacotes **deste** lockfile, com a versão **resolvida**, não o range do `catalog:`.
- Para cada aviso, decidir se é **alcançável em produção**: o pacote roda no servidor ou no bundle do cliente, e a função vulnerável é chamada com entrada do atacante? Ler o advisory e o uso real (`git grep` do import). Não alcançável → tabela de dependências, não achado.
- Pacotes de CLI declarados em `dependencies` (o `shadcn` de `packages/ui`) inflam o audit sem rodar em produção.

### Passo 3 — Segredos e exposição

`refs/secrets.md`: `git ls-files` para arquivos sensíveis rastreados, `git grep` de prefixos de chave, o que vai para o navegador (`VITE_*`, validado em `packages/env/src/web.ts`), `.gitignore` da raiz e de `apps/web`, `docker-compose.yml`, `apps/web/vercel.json`.

### Passo 4 — Revisão do código por área

`refs/checklist.md`, marcando cada item. Áreas:

| Área | Foco |
|---|---|
| Autorização (tRPC, server functions, MCP) | dono checado no use case, IDOR/BOLA, `publicProcedure` justificado |
| Jogadores anônimos | `playerId` + `secret`, PIN e seu limitador, resposta certa antes da hora, tempo medido no servidor |
| Better Auth e agentes | rate limit, `CLIENT_IP_HEADER`, OAuth (`mcp`, `oauth-provider`, `cimd`, registro dinâmico), consentimento, chaves `qz_` |
| Uploads e storage | PUT assinado com tipo e tamanho, prefixos de `media-key.ts`, arquivo de outro usuário, varreduras de 24 h |
| SSRF | `packages/storage/src/http-remote-files.ts` (IP fixado no `connect.lookup`, faixas bloqueadas, redirects) |
| IA (custo e abuso) | cota antes de qualquer trabalho caro, devolução da cota, `maxOutputTokens`, PDF |
| MCP | ferramentas sobre use cases com o `userId` da identidade, erros, texto de terceiros como dado |
| Injeção e XSS | `sql.raw`, `` sql`…` ``, `dangerouslySetInnerHTML`, links (`linkify.ts`), redirects |
| Dados expostos | `errorFormatter` do tRPC, e-mail de membros, segredos em URL/log |
| Abuso e integridade | limites por IP/usuário, corridas entre leitura e escrita, Pusher |
| Configuração | cabeçalhos (`refs/headers.md`), CORS, CSRF, env validado |

Para uma auditoria completa, dá para dividir este passo em cinco frentes paralelas com subagentes, como na primeira auditoria: (1) autenticação, OAuth e MCP; (2) autorização do tRPC; (3) jogos, atividades e tempo real; (4) grupos, uploads, storage e SSRF; (5) cliente web, configuração e IA. Cada subagente recebe a sua frente, os caminhos de `refs/attack-surface.md` e `refs/checklist.md`, e devolve **candidatos** com `arquivo:linha`, trecho e caminho de exploração. Filtro, severidade e confiança finais ficam com quem escreve o relatório.

### Passo 5 — Fluxo entre arquivos

Para cada entrada controlada pelo atacante, desenhar a cadeia:

```
entrada (input do tRPC, args da ferramenta MCP, query/body de rota, cabeçalho, arquivo enviado, URL de agente)
  → validação de forma (zod no router / no schema da ferramenta; .max() presente?)
  → identidade (ctx.session, identidade do agente, ou playerId + secret do jogador anônimo)
  → autorização (helper de dono no use case; QuizShareGrants.canUse; permissões do grupo)
  → limites (AttemptLimiter, cota de IA, rate limit do Better Auth, 200 jogadores)
  → destino (Drizzle, ObjectStorage, fetch remoto, provedor de IA, Pusher, HTML)
```

Lembretes da nossa stack:

- O `beforeLoad` de `apps/web/src/routes/_auth/route.tsx` protege só a **tela**. Cada procedure, server function (`createServerFn`) e rota de servidor precisa da própria checagem.
- O MCP chama os **use cases** direto, sem passar pelos routers: uma checagem que só exista no router não protege o MCP.
- Contexto que lê outro contexto por porta (`PlayableQuizQuery`, `ReportGameQuery`, `GroupAssignments`, `ReportReadGrants`…) precisa que o lado de lá também cheque o dono ou a permissão.
- O que decide uma corrida é o banco (índices únicos, `saveIfAt`, `INSERT … ON CONFLICT`, transação). Ler-checar-escrever sem trava é candidato a achado.

### Passo 6 — Filtro de falsos positivos

`refs/false-positives.md` em **todo** candidato: a regra geral (exploração plausível, entrada do atacante, nenhuma checagem no caminho, código de produção) e a lista do Quizio, semeada pela primeira auditoria. Descartados vão para a seção "Falsos positivos descartados" do relatório com o motivo. Ao terminar, acrescentar ao `refs/false-positives.md` os descartes novos que valerem para as próximas auditorias.

### Passo 7 — Relatório

`refs/report.md`: escrever em `docs/security/auditoria-AAAA-MM-DD.md`, no formato da primeira auditoria (resumo, achados por categoria com confiança, dependências, segredos, patches, descartados, plano de correção, cobertura). Atualizar `refs/known-findings.md` com o estado de cada achado.

### Passo 8 — Patches (só CRITICAL e HIGH)

Antes/depois no estilo do projeto (tabs, use case como fábrica, erro de domínio com `code`, teste primeiro conforme `docs/testing.md`). Frase obrigatória: **"Revise cada patch antes de aplicar. Nada foi alterado no código."** Correções que mudam uma regra de produto pedem atualização de spec (fluxo `/sdd-spec`), e o relatório diz qual. Não propor CSP genérica como patch (`refs/headers.md`).

## Severidade

| Nível | Significado no Quizio |
|---|---|
| CRITICAL | Exploração imediata e ampla: SQLi, RCE, bypass de autenticação, segredo real rastreado no Git, ler/alterar dados de qualquer conta |
| HIGH | Exploração clara com impacto em outra pessoa: IDOR/BOLA, XSS armazenado, token de agente roubado, resposta certa vazando antes dos resultados para todos |
| MEDIUM | Exige condição ou encadeamento: engano no consentimento OAuth, DoS de memória, custo de IA sem teto, trapaça ou sabotagem de jogo/atividade |
| LOW | Defesa em profundidade, abuso limitado, depende de um deploy que ainda não existe (VPS) |
| INFO | Risco aceito em ADR/spec, higiene, versão atrás sem CVE, cabeçalhos ausentes sem exploração |

Confiança sempre declarada (HIGH | MEDIUM | LOW) e explicada: o que foi lido, o que foi reproduzido, o que não foi executado.

## Referências

| Arquivo | Uso |
|---|---|
| `refs/project-stack.md` | Passo 1: versões, gates, Vercel vs VPS |
| `refs/attack-surface.md` | Passo 1: mapa de entradas |
| `refs/secrets.md` | Passo 3 |
| `refs/checklist.md` | Passos 4 e 5 |
| `refs/headers.md` | Cabeçalhos, CORS e CSRF |
| `refs/false-positives.md` | Passo 6 (obrigatório) |
| `refs/known-findings.md` | Passos 0 e 7: achados das auditorias anteriores e seu estado |
| `refs/report.md` | Passo 7: modelo do relatório |

## Atalhos de busca (pistas, não achados)

```bash
git grep -nE "publicProcedure" -- packages/api/src/routers ':!*.test.ts'
git grep -nE "createServerFn|createFileRoute\(\"/(api|mcp|\.well-known)" -- apps/web/src
git grep -nE 'sql\.raw|sql`' -- packages/db/src ':!*.test.ts'
git grep -nE "dangerouslySetInnerHTML|innerHTML|document\.write" -- apps/web/src packages/ui/src ':!*.test.ts*'
git grep -nE "fetch\(|request\(" -- packages ':!*.test.ts' ':!**/testing/**'
git grep -nE "access-control-allow-origin|credentials" -- apps/web/src packages
git grep -nE "console\.(log|error)" -- packages apps/web/src ':!*.test.ts'
git grep -nE "\.secret\b" -- packages/core/src ':!*.test.ts'
```

Confirmar o contexto antes de reportar.
