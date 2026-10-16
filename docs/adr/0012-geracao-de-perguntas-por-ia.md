# ADR 0012 — Geração de perguntas por IA: AI SDK atrás de uma porta, o core valida tudo

- **Status:** aceito (2026-10-16)
- **Contexto da decisão:** [spec 027](../../specs/features/027-criacao-de-perguntas-com-ia/spec.md) · [plano](../../specs/features/027-criacao-de-perguntas-com-ia/plan.md)

## Contexto

A spec 027 traz o assistente de criação do Kahoot: perguntas Quiz e Verdadeiro ou falso criadas por um modelo de linguagem a partir de um assunto ou de um PDF (gerar ou extrair). É o primeiro provedor de IA do Quizio. A constituição exige que ele fique atrás de uma porta e seja substituível (artigo IV), sem paywall mas com limites técnicos configuráveis (artigo VI). O app roda em funções serverless na Vercel, que limitam o corpo da requisição (4,5 MB) e o tempo de execução, e não guardam estado entre requisições.

## Decisão

1. **Porta `QuestionGenerator` no contexto quiz.** Ela recebe instruções em texto e a fonte (texto ou bytes de PDF) e devolve rascunhos não confiáveis (`GeneratedDraft`). **O core escreve as instruções** (`generationBrief`) e **valida cada rascunho** com os parsers do editor (`acceptGeneratedQuestions`): limites de caracteres, número de alternativas, correta, tipo pedido, quantidade máxima. O que não passa é descartado, nunca cortado. Trocar de provedor não muda as regras.
2. **AI SDK como adapter** (`@quizio/ai`, `ai-sdk-question-generator.ts`), com `generateText` + `Output.object` e um esquema zod. O provedor (Anthropic, OpenAI ou Google) é escolhido por `AI_PROVIDER`/`AI_MODEL`/`AI_API_KEY` só na composition root. Sem provedor configurado, o gerador é `null` e a funcionalidade some da interface.
3. **O PDF vai ao modelo como arquivo**, não como texto extraído. O navegador sobe o arquivo direto ao storage (URL pré-assinada, prefixo `sources/{ownerId}/`); o servidor o lê, copia só as páginas escolhidas com `pdf-lib` (porta `PdfPages`) e envia esse PDF ao modelo. Assim páginas com tabelas, fórmulas ou escaneadas são lidas pelo próprio modelo.
4. **Nada da criação fica no servidor até ser adicionado.** As perguntas criadas voltam ao navegador; "Adicionar" as reenvia e o servidor as valida de novo antes de gravar.
5. **Cota por janela móvel numa tabela** (`generation_usage`): reservada antes da chamada, sob um lock consultivo por criador, e devolvida se a chamada falhar.
6. **O documento de origem é temporário**: apagado quando o assistente fecha e, na falta disso, por uma varredura preguiçosa (feita a cada novo envio) dos que passaram de 24 h. Sem timers no servidor.
7. **Tempo**: o adapter aborta em 120 s; a função tem `maxDuration` de 300 s na Vercel. Sem streaming nesta versão.

## Consequências

- Um provedor novo é um `case` em `createLanguageModel`; casos de uso, routers e telas não mudam.
- O resultado nunca viola as regras do editor, mesmo que o modelo seja induzido por instruções escondidas na fonte.
- PDF como arquivo custa mais tokens que texto; a cota e os limites (50 páginas, 20 MB) controlam o custo.
- A espera é de dezenas de segundos sem resultado parcial. Transmitir as perguntas à medida que ficam prontas exigiria uma rota de servidor com streaming, fora do tRPC atual.
- Um arquivo abandonado pode ficar no bucket até o próximo envio de qualquer criador; uma regra de ciclo de vida no prefixo `sources/` é recomendada no guia de deploy.

## Alternativas consideradas

- **TanStack AI**: também envia PDF ao modelo e devolve objetos validados por esquema (`outputSchema`), mas ainda está em 0.x (0.69 em outubro de 2026), com API sujeita a mudar, e não transmite objetos parciais, o que fecharia a porta ao streaming das perguntas. A integração dele com o TanStack Start não pesa aqui, porque a API é tRPC. O AI SDK está na versão 7, estável, e tem utilitários de teste (`MockLanguageModelV4`). Como o provedor fica atrás da porta `QuestionGenerator`, trocar de biblioteca depois é reescrever um adapter.
- **Extrair o texto do PDF no navegador e mandar só texto**: mais barato e sem storage, mas perde páginas escaneadas e layout, e o servidor não teria como conferir o limite de páginas.
- **Enviar o PDF no corpo da requisição**: esbarra no limite de 4,5 MB da Vercel.
- **Guardar as criações no banco** para o "Adicionar" referenciar por id: mais tabelas e limpeza, sem ganho de segurança, já que o conteúdo é revalidado.
- **Usar o `AttemptLimiter`** existente para a cota: ele trabalha com janelas fixas, e a spec pede 24 h móveis com o horário da próxima vaga.
- **Uma chamada de IA para decidir se o PDF "já contém perguntas"**: gastaria cota e tempo; uma heurística pura sobre o texto das páginas basta, porque errar só esconde ou mostra uma pergunta intermediária.
