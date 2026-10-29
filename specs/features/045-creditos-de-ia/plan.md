---
spec: "045"
status: approved # draft | approved
---

# Plano técnico — 045 Créditos de IA

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR proposto: [0024](../../../docs/adr/0024-creditos-de-ia.md)

## Abordagem

A unidade da cota passa de **criação** para **crédito**, sem mudar a forma da cota.

**O que continua igual** (a cota da spec 027, ajustada pela auditoria de 2026-10-29):
- uma linha de `generation_usage` por criação, numa janela móvel de 24 horas;
- uma trava consultiva única para a reserva;
- a reserva feita antes de ler o PDF;
- a devolução só quando o provedor não respondeu ou o PDF é inválido;
- as linhas da conta excluída ficam sem vínculo.

**O que muda:**
- **Créditos por linha:** cada linha guarda créditos. Na reserva, são a estimativa; depois da resposta, a linha é **acertada** com o uso real (o do criador limitado à estimativa; o da instância, inteiro).
- **Módulo puro no core:** a conta mora em `quiz/domain/generation-credits.ts`: pesos, estimativa, teto de saída e cobrança, em milésimos inteiros para não errar no arredondamento.
- **Gerador:** `QuestionGenerator` recebe o teto de saída de cada criação e devolve o uso que o provedor informou, também nas falhas.
- **Mesma estimativa nos dois lados:** `quiz.assistant.status` passa a levar os pesos, e o navegador calcula a estimativa com a mesma função do core, sem uma chamada a mais por tecla. O servidor recalcula ao reservar e é quem decide.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Crédito de IA | `credits` (número inteiro) | sim |
| Orçamento de créditos | `QuotaLimits.perOwner` / `AssistantSettings.creditsPerDay` | sim (renomeia a cota de criações) |
| Teto da instância | `QuotaLimits.instance` / `AssistantSettings.instanceCreditsPerDay` | sim |
| Pesos dos créditos | `CreditPricing` | sim |
| Estimativa da criação | `CreditEstimate` (`estimateGeneration`) | sim |
| Uso informado pelo provedor | `TokenUsage` | sim |
| Cobrança | `GenerationCharge` (`settleCharge`) | sim |
| Teto de saída | `maxOutputTokens` (`maxOutputTokensFor`) | sim |
| Cota de criações | `GenerationQuota` (porta mantida, agora em créditos) | não |

## Domínio — `packages/core/src/quiz/domain`

### Value objects (`generation-credits.ts`, novo)

```ts
/** Credits per thousand tokens, as the instance sets them for its model (RN-04). */
export interface CreditPricing {
	inputPer1kTokens: number;
	outputPer1kTokens: number;
}

/** What the provider says a call used (RN-01). */
export interface TokenUsage {
	inputTokens: number;
	outputTokens: number;
}

/** What is known of the source before reading it (RN-06). */
export type GenerationSize =
	| { kind: "topic"; characters: number }
	| { kind: "pdf"; pages: number };

/** The most a creation may charge, and the output cap that keeps it true (RN-06, RN-07). */
export interface CreditEstimate {
	credits: number;
	maxOutputTokens: number;
}

/** What a creation costs: `charged` to the creator, `spent` for the instance (RN-09, RN-13). */
export interface GenerationCharge {
	charged: number;
	spent: number;
}
```

### Funções puras

| Função | Regra |
| --- | --- |
| `maxOutputTokensFor(options)` | RN-07: `OUTPUT_TOKENS_BASE + OUTPUT_TOKENS_PER_QUESTION × n`, com `n` a Duração ou 30 na extração |
| `estimateGeneration(size, options, pricing)` | RN-06: entrada estimada (`ESTIMATED_BRIEF_TOKENS` mais `caracteres ÷ ESTIMATED_CHARACTERS_PER_TOKEN` ou `páginas × ESTIMATED_TOKENS_PER_PDF_PAGE`) mais o teto de saída, convertidos pelos pesos e arredondados para cima, no mínimo 1 (RN-02) |
| `creditsOf(usage, pricing)` | RN-01 e RN-02: conta em milésimos inteiros (`round(peso × 1000)`), arredonda para cima, no mínimo 1 |
| `settleCharge(estimate, usage \| null, pricing)` | RN-09, RN-10 e RN-13: sem uso conhecido, `charged = spent = estimativa`; com uso, `spent = creditsOf(uso)` e `charged = min(spent, estimativa)` |
| `parseCreditPricing(input)` | Pesos finitos e maiores que zero (o env já valida a forma) |

Constantes nomeadas, que o plano calibra e a pergunta em aberto da spec revisa:

| Constante | Valor | Por quê |
| --- | --- | --- |
| `ESTIMATED_BRIEF_TOKENS` | 1.500 | instruções do `generationBrief` mais o formato de saída |
| `ESTIMATED_CHARACTERS_PER_TOKEN` | 3 | conservador para PT, ES e EN |
| `ESTIMATED_TOKENS_PER_PDF_PAGE` | 3.000 | página como texto mais imagem nos três provedores; uma página escaneada pode passar disso (risco abaixo) |
| `OUTPUT_TOKENS_BASE` | 1.000 | envelope do JSON e um pouco de raciocínio |
| `OUTPUT_TOKENS_PER_QUESTION` | 350 | enunciado, 4 alternativas e chaves do formato plano |

Com os pesos padrão (0,1 crédito por mil tokens de entrada e 0,25 por mil de saída):
- **Assunto curto, cerca de 10 perguntas:** a estimativa é "até 2 créditos", e a cobrança típica é 1 (cerca de 1.500 tokens de entrada e 2.500 de saída).
- **PDF de 30 páginas, cerca de 20 perguntas:** a estimativa é "até 12".

### Erros de domínio

Nenhum código novo:

| Classe | `code` | Quando |
| --- | --- | --- |
| `GenerationQuotaExceededError` | `QUIZ.GENERATION_QUOTA_EXCEEDED` | a estimativa passa do que resta ao criador (RN-08, RN-16) |
| `GenerationInstanceLimitError` | `QUIZ.GENERATION_INSTANCE_LIMIT` | a estimativa passa do que resta do teto (RN-14) |

## Aplicação — `packages/core/src/quiz/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `generateQuestions` (alterado) | igual | `+ creditsUsed: number` | os de hoje, com as cotas em créditos | `GenerationQuota`, `QuestionGenerator`, `PdfPages`, `ObjectStorage` |
| `getAssistantStatus` (alterado) | igual | `limit`, `used`, `remaining` em créditos; `+ pricing: CreditPricing` | — | `GenerationQuota` |

Ordem em `generateQuestions`:
1. Opções e fonte conferidas, sem ler nada.
2. `estimateGeneration` com o tamanho da fonte (o número de caracteres do assunto ou o número de páginas).
3. `reserve` com `estimate.credits`; a recusa vira `GenerationInstanceLimitError` ou `GenerationQuotaExceededError`.
4. Leitura do PDF; numa falha, `release`.
5. `generate({ brief, source, maxOutputTokens })`, com três desfechos:
   - **Sucesso:** `settle(id, settleCharge(estimate, usage))`.
   - **`GenerationNotChargedError`:** `release`.
   - **`GenerationChargedError`:** `settle(id, settleCharge(estimate, error.usage))`, depois `GenerationFailedError`.
6. A resposta leva `creditsUsed = charge.charged` e `remaining`.

Se o criador fecha o assistente (RN-11), a requisição segue no servidor e acerta como qualquer outra; nada muda no código.

### Portas alteradas

```ts
// quiz/application/ports/generation-quota.ts
export interface QuotaLimits {
	/** Credits each creator may spend in the window (RN-03). */
	perOwner: number;
	/** Credits everybody may spend together (RN-13). */
	instance: number;
}

export interface GenerationQuota {
	/** Sums the credits of the window, the owner's and everybody's, and takes `credits` when both fit. */
	reserve(
		ownerId: string,
		credits: number,
		limits: QuotaLimits,
		windowMs: number,
		now: Date,
	): Promise<QuotaReservation>;
	/** Writes what the creation really cost, once the provider answered (RN-09). */
	settle(id: string, charge: GenerationCharge): Promise<void>;
	release(id: string): Promise<void>;
	/** `used` is the owner's credits in the window; `oldestAt` the oldest use. */
	usage(
		ownerId: string,
		windowMs: number,
		now: Date,
	): Promise<{ used: number; oldestAt: Date | null }>;
}

// quiz/application/ports/question-generator.ts
export interface QuestionGenerationRequest {
	brief: string;
	source:
		| { kind: "topic"; text: string }
		| { kind: "pdf"; document: Uint8Array };
	/** RN-07: the most the model may write for this creation. */
	maxOutputTokens: number;
}

export interface QuestionGeneration {
	drafts: GeneratedDraft[];
	/** Null when the provider did not tell. */
	usage: TokenUsage | null;
}

export interface QuestionGenerator {
	generate(request: QuestionGenerationRequest): Promise<QuestionGeneration>;
}

/** Already exists: the provider gave no answer, nothing to charge (RN-10). */
export class GenerationNotChargedError extends Error {}

/** The provider answered, or may have (timeout): charged by `usage`, or by the estimate without it (RN-10). */
export class GenerationChargedError extends Error {
	constructor(
		message: string,
		readonly usage: TokenUsage | null,
		options?: { cause?: unknown },
	);
}
```

`AssistantSettings` passa a ser `{ creditsPerDay, instanceCreditsPerDay, pricing: CreditPricing }`.

### Fakes em memória

- **`InMemoryGenerationQuota`:** soma créditos, ganha `settle` e guarda `charged` e `spent` por uso.
- **`InMemoryQuestionGenerator`:** `respondWith(drafts, usage?)` (uso padrão de 1.500 e 2.500 tokens, que dá 1 crédito com os pesos padrão) e `failNext(error)`. Ele também é o gerador `fake` do E2E.

## Adapters

### Banco — `packages/db`

`schema/quiz.ts`, tabela `generation_usage`:
- **`credits integer not null default 1`:** o que o criador paga. É a estimativa na reserva e a cobrança depois do acerto.
- **`instance_credits integer not null default 1`:** o que conta no teto. É a estimativa na reserva e o uso real depois do acerto.
- **Índice `generation_usage_created_idx` em `created_at`:** a soma da instância percorre a janela de todos.

`createDrizzleGenerationQuota`:
- **`reserve`:** sob a mesma trava `pg_advisory_xact_lock(hashtext('generation'))`, soma `instance_credits` da janela de todos e `credits` da janela do dono. Recusa `instance` quando `soma + credits > instance`, senão `owner` quando `soma do dono + credits > perOwner`. Insere `credits = instance_credits = estimativa`.
- **`settle`:** um `UPDATE … SET credits, instance_credits WHERE id`.
- **`usage`:** soma de `credits` e o `min(created_at)` do dono.

### IA — `packages/ai`

`ai-sdk-question-generator.ts`:
- **Teto por chamada:** usa `maxOutputTokens: min(request.maxOutputTokens, config.maxOutputTokens)`. O valor da config, 32.000, continua como teto de segurança.
- **Uso:** devolve `result.usage` como `TokenUsage`, ou `null` quando faltar algum dos dois números.
- **Falhas:**
  - `providerGaveNoAnswer` → `GenerationNotChargedError`, como hoje;
  - `NoObjectGeneratedError` → `GenerationChargedError(error.usage)`;
  - qualquer outra (inclusive o tempo limite) → `GenerationChargedError(null)`.
- **Raciocínio:** modelos de raciocínio contam o raciocínio como saída. A config ganha `providerOptions`, que `createLanguageModel` monta por provedor (OpenAI: `reasoningEffort: "low"`; Anthropic e Google: o padrão do provedor). Assim o teto por Duração não corta a resposta.

### Real-time

Nenhum.

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `quiz.assistant.status` | query | sessão | — | `enabled`, `limit`, `used`, `remaining`, `nextAvailableAt`, `nextFreeInMs` (em créditos) `+ pricing` | — |
| `quiz.assistant.generate` | mutation | sessão | igual | `+ creditsUsed` | `QUIZ.GENERATION_QUOTA_EXCEEDED`, `QUIZ.GENERATION_INSTANCE_LIMIT`, os de hoje |

**MCP:** `get_account` (`packages/mcp/src/tools/account.ts`) diz "credits" na descrição e nos campos de `aiAssistant`. Os agentes continuam sem gastar créditos (RN-19).

**`composition-root.ts` e `packages/env/src/server.ts`:**
- **`AI_CREDITS_PER_DAY`** (padrão 20, o orçamento de cada criador). Na falta dele, lê `AI_GENERATIONS_PER_DAY`, para não quebrar uma instância já configurada.
- **`AI_INSTANCE_CREDITS_PER_DAY`** (padrão 200, o teto da instância). Na falta dele, lê `AI_INSTANCE_GENERATIONS_PER_DAY`.
- **Pesos:** `AI_CREDITS_PER_1K_INPUT_TOKENS` (padrão 0,1) e `AI_CREDITS_PER_1K_OUTPUT_TOKENS` (padrão 0,25), números maiores que zero.
- **Documentação:** `.env.example`, `docs/deploy.md` e o CLAUDE.md descrevem as novas variáveis.

## UI — `apps/web`

- **`lib/assistant-credits.ts`** (novo, puro): `assistantEstimate(state, pricing): CreditEstimate | null`. Ele lê o tamanho da fonte do estado (o comprimento do assunto ou o número de páginas escolhidas) e chama `estimateGeneration` do core. É `null` quando não há o que criar.
- **`lib/assistant-labels.ts`:**
  - `remainingLabel` em créditos: "Restam N créditos", "Resta 1 crédito", "Nenhum crédito restante";
  - `estimateLabel(n)`: "Esta criação usa até N créditos";
  - `notEnoughCreditsReason(estimate, remaining)`: o texto da RN-08;
  - `nextAvailableMessage(limit, at)`: o texto da RN-16;
  - `creditsUsedLabel(n)`: "Esta criação usou N créditos.".
- **`quiz-assistant.tsx`:** calcula a estimativa a cada render. O `createDisabledReason` ganha a recusa por saldo antes das outras. A estimativa vai ao painel, à barra da fonte e à tela de páginas.
- **`options-panel.tsx`:** a linha do saldo e a da estimativa.
- **`source-bar.tsx` e `pdf-pages-step.tsx`:** a estimativa junto do Crie (no celular, junto do botão fixo).
- **`generated-questions.tsx`:** a faixa de pronto acrescenta `creditsUsedLabel(result.creditsUsed)`.
- **`assistant-state.ts`:** guarda `creditsUsed` no `generationSucceeded`.
- **`components/account/ai-access-section.tsx`:** os textos da RN-17 em créditos e `aria-label` "Créditos usados".
- **`lib/quiz-error-messages.ts`:** `QUIZ.GENERATION_QUOTA_EXCEEDED` vira "Esta criação precisa de mais créditos do que restam.". O assistente mostra o texto exato, calculado com o status, assim que o refaz.
- **Design system:** sem variantes novas; a estimativa usa o texto auxiliar que o painel já tem.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | domínio · componente | estima um assunto curto; mostra "Esta criação usa até N créditos" antes do Crie | `core/src/quiz/domain/generation-credits.test.ts` · `web/src/components/editor/assistant/quiz-assistant.test.tsx` |
| CA-02 | domínio · web | a estimativa cresce com a Duração e com as páginas | `generation-credits.test.ts` · `web/src/lib/assistant-credits.test.ts` |
| CA-03 | domínio · aplicação · componente | `creditsOf` arredonda para cima; cobra o uso real e devolve a diferença; a faixa diz quanto usou | `generation-credits.test.ts` · `core/src/quiz/application/generate-questions.test.ts` · `generated-questions.test.tsx` |
| CA-04 | domínio · aplicação · repositório | `settleCharge` limita o criador e não a instância; `settle` grava os dois | `generation-credits.test.ts` · `generate-questions.test.ts` · `db/src/repositories/quiz/drizzle-generation-quota.test.ts` |
| CA-05 | aplicação · componente | recusa uma estimativa acima do que resta; Crie indisponível com a RN-08 e volta ao caber | `generate-questions.test.ts` · `quiz-assistant.test.tsx` |
| CA-06 | repositório | duas reservas do mesmo dono ao mesmo tempo não passam do orçamento | `drizzle-generation-quota.test.ts` |
| CA-07 | aplicação · adapter | provedor sem resposta não cobra | `generate-questions.test.ts` · `ai/src/ai-sdk-question-generator.test.ts` |
| CA-08 | aplicação | PDF inválido devolve a reserva | `generate-questions.test.ts` |
| CA-09 | aplicação · adapter | tempo esgotado cobra a estimativa | `generate-questions.test.ts` · `ai-sdk-question-generator.test.ts` |
| CA-10 | aplicação · adapter | resposta fora do formato cobra o uso informado | `generate-questions.test.ts` · `ai-sdk-question-generator.test.ts` |
| CA-11 | aplicação | a criação acerta pelo uso real sem depender do cliente | `generate-questions.test.ts` |
| CA-12 | fake · repositório | os créditos voltam 24 horas depois | `core/src/quiz/testing/in-memory-generation-quota.test.ts` · `drizzle-generation-quota.test.ts` |
| CA-13 | web · componente | mensagem de orçamento esgotado com a hora | `web/src/lib/assistant-labels.test.ts` · `quiz-assistant.test.tsx` |
| CA-14 | aplicação · repositório | o teto da instância recusa sem reservar | `generate-questions.test.ts` · `drizzle-generation-quota.test.ts` |
| CA-15 | componente | o painel e o Acesso à IA não falam do teto | `options-panel.test.tsx` · `ai-access-section.test.tsx` |
| CA-16 | repositório | os créditos de uma conta excluída continuam no teto | `drizzle-generation-quota.test.ts` |
| CA-17 | domínio · aplicação | pesos dobrados dobram a estimativa e a cobrança; as linhas acertadas não mudam | `generation-credits.test.ts` · `generate-questions.test.ts` |
| CA-18 | componente | Acesso à IA em créditos | `web/src/components/account/ai-access-section.test.tsx` |
| CA-19 | repositório | linha gravada antes da troca vale 1 crédito (default da coluna) | `drizzle-generation-quota.test.ts` |
| CA-20 | domínio · aplicação | a extração estima 30 perguntas e é cobrada | `generation-credits.test.ts` · `generate-questions.test.ts` |
| CA-21 | MCP | adicionar perguntas por um agente não muda o saldo | `mcp/src/tools/quizzes.test.ts` |

**Testes de integração:** o teste com o provedor real (`ai-sdk-question-generator.int.test.ts`, só com as variáveis de IA) passa a conferir que o uso de uma criação por assunto fica dentro da estimativa. É o modo de calibrar as constantes.

**E2E:** o assistente com o gerador `fake` mostra "Restam 20 créditos" e, depois de criar, "Esta criação usou 1 crédito.".

## Dados e migração

- **Migração `0019`** (`pnpm -F @quizio/db exec drizzle-kit generate --name generation_credits`):
  - `ALTER TABLE generation_usage ADD COLUMN credits integer NOT NULL DEFAULT 1`;
  - o mesmo para `instance_credits`;
  - `CREATE INDEX generation_usage_created_idx`.
- **Transição (RN-18):** as linhas que já existem ganham 1 crédito cada pelo default.
- **Compatibilidade:** o código anterior continua inserindo sem essas colunas (ficam com 1) e contando linhas, então o deploy pode migrar antes do código novo.
- **Variáveis antigas:** `AI_GENERATIONS_PER_DAY` e `AI_INSTANCE_GENERATIONS_PER_DAY` seguem valendo como reserva das novas.

## Riscos e decisões

- **A estimativa é um teto feito de constantes.**
  - Um PDF escaneado pode usar mais tokens por página que os 3.000 estimados. Nesse caso o criador paga a estimativa (RN-09), mas o teto da instância conta o uso real (RN-13), então o gasto da instância continua protegido.
  - As constantes ficam no domínio, nomeadas, e o teste com o provedor real mostra quando estão baixas.
- **Modelos de raciocínio.**
  - O raciocínio conta como saída; um teto por Duração pequeno demais corta a resposta, e a falha é cobrada.
  - Mitigação: esforço de raciocínio baixo onde o provedor permite, mais `OUTPUT_TOKENS_BASE` como folga.
  - A conferir com o provedor real antes de fechar as constantes.
- **Arredondamento:** contas em milésimos inteiros, como o controle deslizante faz com centésimos, para `1,000…01` não virar 2.
- **O navegador calcula a estimativa,** mas só para mostrar; o servidor recalcula ao reservar e recusa o que não cabe.
- **A tabela cresce:** uma linha por criação, sem limpeza. O índice em `created_at` mantém as somas rápidas; uma varredura das linhas fora da janela fica para depois.
- **ADR 0024 proposto** ([rascunho](../../../docs/adr/0024-creditos-de-ia.md)): créditos como estimativa reservada e cobrança pelo uso real. Substitui o item 5 do ADR 0012.
