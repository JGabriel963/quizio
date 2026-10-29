---
spec: "045"
status: in-progress # todo | in-progress | done
---

# Tarefas — 045 Créditos de IA

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0024](../../../docs/adr/0024-creditos-de-ia.md) (proposto)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.
>
> **Repositório verde a cada tarefa.** T04 e T05 mudam portas que têm implementação em outro pacote. Por isso cada uma leva junto o adapter que implementa a porta e ajusta os chamadores para o comportamento de antes (1 crédito por criação, sem uso), e a fase 3 completa o resto.
>
> **Teste de integração:** o adapter de IA muda e já tem `ai-sdk-question-generator.int.test.ts`, que só roda com as variáveis de IA. T08 acrescenta a conferência da estimativa ali.

## Fase 1 — Domínio

- [x] **T01** `core/quiz` — pesos e conversão do uso em créditos
  - Teste: `quiz/domain/generation-credits.test.ts`
    - "creditsOf converts input and output tokens by the instance's weights"
    - "a creation costs a whole number of credits, rounded up"
    - "a creation costs at least 1 credit"
    - "weights like 0.1 add no floating-point error (counted in thousandths)"
    - "doubling the weights doubles the credits"
    - "parseCreditPricing refuses zero, negative and non-finite weights"
  - Implementar: `quiz/domain/generation-credits.ts`, com `CreditPricing`, `TokenUsage`, `DEFAULT_CREDIT_PRICING` (0,1 e 0,25), `creditsOf` e `parseCreditPricing`
  - Cobre: CA-03, CA-17 · RN-01, RN-02, RN-04, RN-05

- [x] **T02** [P] `core/quiz` — estimativa e teto de saída
  - Teste: `quiz/domain/generation-credits.test.ts`
    - "the output cap follows the requested count"
    - "extracting is capped as 30 questions"
    - "a short topic of about 10 questions is estimated at 2 credits by default"
    - "a longer count raises the estimate"
    - "more PDF pages raise the estimate"
    - "an estimate is at least 1 credit"
  - Implementar: `GenerationSize`, `CreditEstimate`, as constantes nomeadas do plano, `maxOutputTokensFor` e `estimateGeneration`
  - Cobre: CA-01, CA-02, CA-20 · RN-06, RN-07, RN-12

- [x] **T03** [P] `core/quiz` — a cobrança de uma criação
  - Teste: `quiz/domain/generation-credits.test.ts`
    - "charges the real usage and never more than the estimate"
    - "the instance spends the real usage, even past the estimate"
    - "without a reported usage the estimate is charged and spent"
  - Implementar: `GenerationCharge` e `settleCharge`
  - Cobre: CA-04, CA-09, CA-10 · RN-09, RN-10, RN-13

## Fase 2 — Aplicação (portas, fakes e casos de uso)

- [x] **T04** `core/quiz` e `db` — a cota soma créditos (porta, fake, Drizzle e migração)
  - Teste: `quiz/testing/in-memory-generation-quota.test.ts` e `db/src/repositories/quiz/drizzle-generation-quota.test.ts`
    - "sums credits, not rows"
    - "refuses credits that do not fit the owner's budget"
    - "refuses credits that do not fit the instance's ceiling, counting every owner"
    - "settle writes what the creator was charged and what the instance spent"
    - "the credits of a creation return 24 hours after it"
    - (só Drizzle) "two reservations of one owner at the same time never pass the budget"
    - (só Drizzle) "a row stored before the change counts as 1 credit"
    - (só Drizzle) "a deleted account's credits still count for the instance": o teste de hoje, agora em créditos
  - Implementar:
    - `ports/generation-quota.ts`: `reserve(ownerId, credits, limits, windowMs, now)`, `settle(id, charge)` e `usage` em créditos
    - `InMemoryGenerationQuota`
    - `schema/quiz.ts`: colunas `credits` e `instance_credits` com default 1, e o índice `generation_usage_created_idx`
    - `createDrizzleGenerationQuota`, com a soma sob a trava única
    - migração `pnpm -F @quizio/db exec drizzle-kit generate --name generation_credits`
    - chamadores: `generateQuestions` reserva 1 crédito, como hoje, até a T06
  - Cobre: CA-06, CA-12, CA-14, CA-16, CA-19 · RN-03, RN-13, RN-15, RN-18

- [x] **T05** `core/quiz` e `ai` — o gerador recebe o teto de saída e devolve o uso
  - Teste:
    - `ai/src/ai-sdk-question-generator.test.ts`: "returns the usage the provider reported"; "asks for the request's output cap, within the configured one"; "a usage the provider did not report is null"
    - `quiz/testing/in-memory-question-generator.test.ts` (novo): "answers with a usage of 1 credit by default"
  - Implementar:
    - `ports/question-generator.ts`: `QuestionGenerationRequest.maxOutputTokens`, `QuestionGeneration` (`drafts` e `usage`) e `GenerationChargedError` (`usage`)
    - `InMemoryQuestionGenerator`: `respondWith(drafts, usage?)` com uso padrão de 1.500 e 2.500 tokens
    - o retorno do adapter de IA
    - `generateQuestions` passa a ler `generation.drafts`
  - Cobre: CA-03 · RN-01, RN-07

- [x] **T06** `core/quiz` — `generateQuestions` em créditos
  - Teste: `quiz/application/generate-questions.test.ts`
    - "reserves the estimate before reading the PDF"
    - "refuses an estimate above what the creator has left, reading nothing"
    - "refuses an estimate above what the instance has left, reserving nothing"
    - "charges the real usage rounded up and gives the rest back"
    - "never charges more than the estimate, while the instance spends the real usage"
    - "a provider that gave no answer charges nothing"
    - "an invalid PDF gives the reservation back"
    - "a timeout charges the estimate"
    - "an answer outside the format charges the usage it reported"
    - "a creation is settled by the server whatever the client does"
    - "extracting is estimated as 30 questions and charged"
    - "doubled weights double the estimate and the charge"
    - "tells the credits used and what is left"
  - Implementar:
    - `AssistantSettings`: `{ creditsPerDay, instanceCreditsPerDay, pricing }`
    - `generateQuestions`: estimativa, reserva, acerto e `creditsUsed`
    - `test-context.ts` e `composition-root.ts` com os valores de hoje (as variáveis novas chegam na T09)
  - Cobre: CA-03, CA-04, CA-05, CA-07, CA-08, CA-09, CA-10, CA-11, CA-14, CA-17, CA-20 · RN-08, RN-09, RN-10, RN-11, RN-12, RN-14

- [x] **T07** [P] `core/quiz` — `getAssistantStatus` em créditos
  - Teste: `quiz/application/get-assistant-status.test.ts`
    - "tells the budget, the credits used and what is left"
    - "carries the instance's weights"
    - "tells when the next credits come back"
  - Implementar: `getAssistantStatus` (soma de créditos, `pricing`)
  - Cobre: CA-13, CA-18 · RN-16, RN-17

## Fase 3 — Adapters

- [x] **T08** `ai` — falhas com uso e raciocínio baixo
  - Teste:
    - `ai-sdk-question-generator.test.ts`: "an answer outside the format is charged by the usage it reports"; "a timeout is charged without a usage"; "a provider that gave no answer is not charged" (o de hoje)
    - `ai-model.test.ts`: "OpenAI is asked for a low reasoning effort"; "Anthropic and Google keep their defaults"
    - `ai-sdk-question-generator.int.test.ts`: "a topic's real usage stays within its estimate" (só com o provedor real)
  - Implementar:
    - `ai-sdk-question-generator.ts`: `NoObjectGeneratedError` vira `GenerationChargedError(usage)`, e as outras falhas viram `GenerationChargedError(null)`
    - `ai-model.ts`: `generationProviderOptions(provider)`, passado pela config
  - Cobre: CA-07, CA-09, CA-10 · RN-07, RN-10

## Fase 4 — API e composition root

- [x] **T09** `env` e `api` — variáveis em créditos
  - Teste: `packages/api/src/assistant-settings.test.ts` (novo)
    - "reads the credits per day and the instance's ceiling"
    - "falls back to AI_GENERATIONS_PER_DAY and AI_INSTANCE_GENERATIONS_PER_DAY"
    - "uses the default weights when none are set"
  - Implementar:
    - `packages/env/src/server.ts`: `AI_CREDITS_PER_DAY`, `AI_INSTANCE_CREDITS_PER_DAY`, `AI_CREDITS_PER_1K_INPUT_TOKENS` e `AI_CREDITS_PER_1K_OUTPUT_TOKENS`
    - `packages/api/src/assistant-settings.ts`: `assistantSettingsOf(env)`, com o fallback
    - `composition-root.ts`
    - `apps/web/.env.example`
  - Cobre: CA-17 · RN-03, RN-04, RN-13

- [x] **T10** `api` e `mcp` — status e criação em créditos
  - Teste:
    - `routers/quiz-assistant.test.ts`: "status carries the credits and the weights"; "generate returns the credits used"; "maps a creation that does not fit with its domain code"
    - `mcp/src/tools/account.test.ts`: "get_account tells the assistant's credits"
    - `mcp/src/tools/quizzes.test.ts`: "adding questions as an agent spends no credits" (o teste de hoje, agora em créditos)
  - Implementar: a saída do router (sem mudança na entrada) e a descrição e os campos de `get_account`
  - Cobre: CA-21 · RN-19

## Fase 5 — UI

- [x] **T11** [P] `web/lib` — textos e estimativa do assistente
  - Teste:
    - `lib/assistant-labels.test.ts`: "remainingLabel counts credits"; "estimateLabel says up to N credits, singular for 1"; "notEnoughCreditsReason tells what it needs and what is left"; "nextAvailableMessage tells when the next credits come back"; "creditsUsedLabel tells what the creation used"
    - `lib/assistant-credits.test.ts` (novo): "estimates a topic from its length and count"; "estimates a PDF from the chosen pages"; "is null with nothing to create"
  - Implementar: `lib/assistant-labels.ts` e `lib/assistant-credits.ts`
  - Cobre: CA-01, CA-02, CA-05, CA-13 · RN-06, RN-08, RN-16, RN-20

- [x] **T12** `web` — o assistente mostra a estimativa e recusa sem saldo
  - Teste:
    - `components/editor/assistant/quiz-assistant.test.tsx`: "shows the estimate before Crie"; "Crie is unavailable when the estimate does not fit, and comes back when it does"; "tells when the budget is used up"
    - `options-panel.test.tsx`: "shows the credits left and never the instance's ceiling"
    - `generated-questions.test.tsx`: "the ready banner tells the credits used"
  - Implementar:
    - `quiz-assistant.tsx`: estimativa e `createDisabledReason`
    - `options-panel.tsx`, `source-bar.tsx` e `pdf-pages-step.tsx`: a estimativa junto do Crie, também no celular
    - `assistant-state.ts`: `creditsUsed`
    - `generated-questions.tsx`
    - `lib/quiz-error-messages.ts`: o texto de `QUIZ.GENERATION_QUOTA_EXCEEDED`
  - Cobre: CA-01, CA-03, CA-05, CA-13, CA-15 · RN-06, RN-08, RN-09, RN-14, RN-16

- [x] **T13** [P] `web` — Acesso à IA em créditos
  - Teste: `components/account/ai-access-section.test.tsx`
    - "tells the credits used of the budget in the last 24 hours"
    - "tells when the next credits come back"
    - "says the budget is used up"
    - "never mentions the instance's ceiling"
  - Implementar: `components/account/ai-access-section.tsx`
  - Cobre: CA-15, CA-18 · RN-17

## Fase 6 — E2E e fechamento

- [x] **T14** E2E — créditos no assistente
  - Teste: `apps/web/e2e/assistant.spec.ts` › "shows the credits left and the credits a creation used", com o gerador `fake`: "Restam 20 créditos", a estimativa, depois "Esta criação usou 1 crédito." e "Restam 19 créditos". Os textos de cota que os testes de hoje conferem são atualizados.
  - Cobre: CA-01, CA-03

- [ ] **T15** Fechamento — feito, menos a calibração: falta rodar `pnpm test:int` do pacote `ai` com uma chave real (o teste "a topic's real usage stays within its estimate") e ajustar as constantes e os pesos pelo uso medido
  - `pnpm check` (nos arquivos alterados, com `--line-ending=crlf`), `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, `pnpm test:int` do pacote `ai` (se houver chave) e `pnpm test:e2e` do assistente
  - Aplicar a migração no banco local (`pnpm db:migrate`) e conferir na tela
  - ADR 0024 → aceito; ADR 0012, item 5, aponta para o 0024
  - Specs 027 (RN-31 a RN-33) e 039 (RN-17): as regras alteradas apontam para a 045, com changelog
  - `spec.md` (status `done`, changelog e perguntas em aberto respondidas com os valores medidos), `glossary.md` (os termos da 045 em ✅), `roadmap.md` (045 ✅ com o link das tarefas)
  - CLAUDE.md (assistente e variáveis), `docs/deploy.md` (variáveis e calibração dos pesos)

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T02, T11, T12, T14 |
| CA-02 | T02, T11 |
| CA-03 | T01, T05, T06, T12, T14 |
| CA-04 | T03, T04, T06 |
| CA-05 | T06, T11, T12 |
| CA-06 | T04 |
| CA-07 | T06, T08 |
| CA-08 | T06 |
| CA-09 | T03, T06, T08 |
| CA-10 | T03, T06, T08 |
| CA-11 | T06 |
| CA-12 | T04 |
| CA-13 | T07, T11, T12 |
| CA-14 | T04, T06 |
| CA-15 | T12, T13 |
| CA-16 | T04 |
| CA-17 | T01, T06, T09 |
| CA-18 | T07, T13 |
| CA-19 | T04 |
| CA-20 | T02, T06 |
| CA-21 | T10 |

Os 21 critérios aparecem em ao menos uma tarefa.
