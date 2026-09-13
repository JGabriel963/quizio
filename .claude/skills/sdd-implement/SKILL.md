---
name: sdd-implement
description: Implement tasks from a Quizio feature's tasks.md using strict red-green-refactor TDD, keeping spec, plan and checklist in sync. Use when the user asks for /sdd-implement or to implement a planned feature.
argument-hint: <NNN> [Txx]
---

# /sdd-implement — implementar com TDD

Argumentos: **$ARGUMENTS** — número da feature e, opcionalmente, a tarefa (`Txx`). Sem tarefa: execute as pendentes em ordem.

## 1. Carregue

- `specs/features/<NNN>-*/spec.md`, `plan.md`, `tasks.md`
- `specs/constitution.md`, `docs/architecture.md`, `docs/testing.md`, `CLAUDE.md`

Se `tasks.md` não existir, pare e sugira `/sdd-tasks`. Marque `tasks.md` como `in-progress` e a spec como `in-progress`.

## 2. Para cada tarefa

1. **Red** — escreva o teste indicado. Rode só ele (`pnpm vitest run <arquivo>`) e confirme que falha **pelo motivo esperado** (não por import quebrado ou erro de digitação).
2. **Green** — implemente o mínimo para passar, respeitando a regra de dependência (nada de infraestrutura em `packages/core`; routers finos; regra no domínio).
3. **Refactor** — melhore nomes e estrutura com o teste verde; rode os testes do pacote (`pnpm -F <pacote> test`).
4. Marque `[x]` na tarefa.

Durante a execução:

- **Não amplie o escopo.** Algo necessário e não previsto → acrescente uma tarefa nova no `tasks.md` e explique.
- **Lacuna ou contradição na spec** (regra ausente, CA impossível) → pare e pergunte ao usuário; após a decisão, atualize `spec.md` (com changelog) e o plano.
- Use os fakes existentes (`packages/core/src/shared/testing`, `packages/realtime/src/testing`) e crie novos fakes junto das portas novas.
- Mudou schema → `pnpm db:generate` ou `pnpm db:push` conforme o plano.

## 3. Fechamento

Ao terminar as tarefas pedidas, rode e reporte o resultado real (não afirme sucesso sem ver a saída):

- `pnpm check`
- `pnpm test`
- typecheck dos pacotes alterados (`pnpm check-types`; web: `pnpm -F web exec tsc --noEmit`)
- `pnpm test:int` se um adapter mudou (requer `pnpm infra:up`)
- `pnpm test:e2e` se um fluxo crítico mudou

Se todas as tarefas estiverem concluídas: `tasks.md` e `spec.md` → `done`, atualize `specs/roadmap.md`, `specs/glossary.md` e docs afetadas. Não faça commit a menos que o usuário peça.
