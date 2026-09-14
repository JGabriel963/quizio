---
name: sdd-tasks
description: Break an approved Quizio technical plan into an ordered, test-first task checklist (tasks.md). Use when the user asks for /sdd-tasks or to split a plan into tasks.
argument-hint: <NNN>
---

# /sdd-tasks — quebrar o plano em tarefas TDD

Feature: **$ARGUMENTS** (pasta `specs/features/$ARGUMENTS-*`).

## 1. Pré-condições

Leia `spec.md` e `plan.md`. Se o plano não estiver `approved`, pare e peça aprovação.

## 2. Escreva `tasks.md`

Copie `specs/templates/tasks.md` e preencha seguindo estas regras:

- **De dentro para fora**: domínio → aplicação (casos de uso, portas, fakes) → adapters → API/composition root → UI → E2E.
- **Tarefas pequenas**: cada uma cabe em uma sessão curta e deixa o repositório verde.
- **Toda tarefa começa pelo teste**: indique o arquivo e o nome do teste (em inglês) que será escrito primeiro, depois os arquivos a implementar.
- **Rastreabilidade**: cada tarefa lista os `CA-xx`/`RN-xx` que cobre; ao final, todo `CA` da spec aparece em ao menos uma tarefa (confira explicitamente).
- Mudanças de schema incluem a tarefa de `pnpm db:generate`/`db:push` e o teste de repositório com PGlite.
- Adapters novos incluem teste `*.int.test.ts`.
- Última tarefa: fechamento (checks, atualização de spec/glossário/roadmap/docs).
- Numere `T01`, `T02`… Tarefas que podem ser feitas em paralelo recebem a marca `[P]`.

## 3. Entregue

`status: todo`. Mostre a lista resumida (uma linha por tarefa) e a verificação de cobertura dos CAs. Próximo passo: `/sdd-implement $ARGUMENTS`.
