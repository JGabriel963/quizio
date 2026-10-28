# ADR 0023 — Servidor MCP: adapter de entrada sobre os casos de uso, OAuth pelo Better Auth e chaves próprias

- **Status:** aceito (2026-10-28)
- **Contexto da decisão:** [spec 044](../../specs/features/044-servidor-mcp/spec.md) (RN-01 a RN-07, RN-16 a RN-18, RN-24, RN-32 a RN-35) · [plano](../../specs/features/044-servidor-mcp/plan.md)

## Contexto

A spec 044 abre a conta do criador para o agente de IA que ele preferir (ChatGPT, Claude, Codex, Cursor, VS Code, Gemini CLI), pelo Model Context Protocol. O agente faz quase tudo o que as telas fazem, com as mesmas regras.

Isso traz quatro problemas que o Quizio ainda não tinha:

- um segundo cliente da API, fora do navegador;
- um servidor OAuth, porque o MCP exige OAuth 2.1 para servidores remotos;
- credenciais de longa duração;
- arquivos que chegam por link, e não do navegador.

Tudo isso tem de rodar na Vercel, sem estado entre requisições ([ADR 0002](0002-realtime-pusher-protocol.md), [ADR 0011](0011-deploy-com-nitro.md)).

## Decisão

- **O servidor MCP é um adapter de entrada**, num pacote próprio (`packages/mcp`), irmão dos routers tRPC. Cada ferramenta chama um caso de uso do container com o `ownerId` de quem autorizou. As regras de dono, de permissões de grupo e de limites continuam só no core. Só o que as telas não tinham virou caso de uso novo: perguntas de qualquer tipo num pedido, uma pergunta inteira de uma vez e a importação por link.
- **Sem estado**: Streamable HTTP com respostas JSON e um `McpServer` por requisição, com o SDK oficial v2 (`WebStandardStreamableHTTPServerTransport`). Não há sessão MCP nem stream: `GET` responde `405`.
- **O Better Auth é o servidor de autorização**, com os plugins `jwt`, `mcp` (sobre o `oauth-provider`) e `cimd`:
  - os agentes se registram por Client ID Metadata Document, o preferido na revisão 2026-07-28 do MCP, ou por registro dinâmico (DCR), que fica como alternativa;
  - o token de acesso é um JWT com a audiência `{origem}/mcp` (RFC 8707);
  - a tela de consentimento é do Quizio (`/connect`) e mostra o nome e o domínio de volta do agente, porque qualquer um pode registrar um cliente.
- **A conexão é conferida a cada pedido.** Um JWT não se revoga no servidor. Por isso o recurso, além de verificar a assinatura, exige que o consentimento ainda exista e tenha sido usado nos últimos 90 dias. Desconectar ou trocar a senha apaga o consentimento e os refresh tokens, e o pedido seguinte já é recusado.
- **As chaves de acesso são do Quizio** (contexto `agents`), e não o plugin de API keys do Better Auth:
  - o segredo `qz_…` tem 256 bits e é mostrado uma vez;
  - só o SHA-256 é guardado;
  - o limite de 20 ativas é contado sob uma trava por dono.
  - Ficam no core, testáveis com fakes, e o mesmo caso de uso (`admitAgentRequest`) trata chave e JWT.
- **Um limite por pessoa**, 120 pedidos por minuto somando agentes e chaves, sobre o `AttemptLimiter` em Postgres que já existe.
- **Importar por link é uma exceção explícita** à regra de que os bytes não passam pela função ([ADR 0003](0003-storage-r2.md)). O ChatGPT e o claude.ai não conseguem enviar um arquivo por PUT. Por isso o servidor baixa o arquivo, até o limite da política do destino, e grava com `ObjectStorage.put`. O tipo vale pelo que os bytes dizem. A conexão para fora é protegida contra SSRF no `lookup` (rede privada, loopback, link-local, metadados) e em cada redirecionamento. Agentes que rodam no computador da pessoa continuam podendo enviar direto ao storage pela URL pré-assinada.

## Alternativas consideradas

- **Ferramentas chamando os routers tRPC por `createCaller`**: reaproveitaria o zod, mas as entradas boas para um agente são outras (descrições por campo, uma pergunta inteira em vez de mudanças de editor). Chamar os casos de uso deixa os dois adapters finos e independentes.
- **Servidor MCP com estado (sessões, SSE)**: não sobrevive a funções sem memória, e nenhuma ferramenta precisa avisar o agente por conta própria.
- **Escrever o OAuth à mão**: DCR, CIMD, PKCE, metadados (RFC 8414 e 9728) e JWKS são muita superfície de segurança; o Better Auth já é o provedor de contas.
- **Só chaves de acesso**: o ChatGPT e os conectores do claude.ai exigem OAuth.
- **Tokens opacos com introspecção**: os clientes MCP pedem `resource`, que leva ao JWT. A conferência do consentimento dá a revogação sem perder isso.
- **Plugin de API keys do Better Auth**: guardaria as chaves fora do core e não daria o limite de 20 sob trava nem a mesma identidade das conexões.

## Consequências

- O Better Auth sobe de 1.7.1 para 1.7.14 junto com os três plugins, numa versão única fixada no catálogo. A regeneração do `schema/auth.ts` acrescenta as tabelas do OAuth e do JWT.
- `BETTER_AUTH_URL` passa a ser também o emissor e a audiência dos tokens: trocar o domínio público exige reconectar os agentes.
- O agente lê textos escritos por outras pessoas (mural, quizzes compartilhados). As descrições os marcam como dados e as ações irreversíveis vão anotadas como destrutivas, mas pedir confirmação é decisão do cliente. A injeção de prompt é um risco do protocolo, não só do Quizio.
- Cada pedido custa de 2 a 3 consultas a mais (consentimento, limite e último uso, este gravado no máximo uma vez por minuto).
- Novos tipos de pergunta e novas telas precisam de ferramentas para o agente acompanhar: a spec de cada um passa a dizer o que o servidor MCP ganha.
