---
spec: "NNN"
status: todo # todo | in-progress | done
---

# Tarefas — NNN <título>

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.

## Fase 1 — Domínio

- [ ] **T01** `core/<contexto>` — <comportamento>
  - Teste: `<arquivo>.test.ts` › "<nome do teste>"
  - Implementar: `<arquivo>.ts`
  - Cobre: CA-01, RN-01

## Fase 2 — Aplicação (casos de uso + portas + fakes)

## Fase 3 — Adapters (repositórios, real-time, storage)

## Fase 4 — API (routers + composition root)

## Fase 5 — UI (design system → componentes do app → rotas)

## Fase 6 — E2E e fechamento

- [ ] **Tnn** Fechamento
  - `pnpm check`, `pnpm test`, typecheck; `pnpm test:int` / `pnpm test:e2e` se aplicável
  - Atualizar `spec.md` (status `done`, changelog), `glossary.md`, `roadmap.md` e docs afetadas
