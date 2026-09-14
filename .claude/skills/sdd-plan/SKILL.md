---
name: sdd-plan
description: Write the technical plan (plan.md) for an approved Quizio feature spec, mapping it onto the hexagonal/DDD architecture and a test strategy. Use when the user asks for /sdd-plan or to plan an approved spec.
argument-hint: <NNN>
---

# /sdd-plan — planejar a implementação

Feature: **$ARGUMENTS** (pasta `specs/features/$ARGUMENTS-*`).

## 1. Pré-condições

- Leia `spec.md`. Se `status` não for `approved`, pare e peça ao usuário para aprovar (ou confirmar que quer planejar mesmo assim).
- Se houver perguntas em aberto não resolvidas que afetem o design, pergunte antes de planejar.

## 2. Carregue o contexto técnico

- `specs/constitution.md`, `docs/architecture.md`, `docs/testing.md`, `docs/design-system.md`, `docs/adr/*`
- `CLAUDE.md` (comandos e convenções do repositório)
- O código existente nos contextos afetados: `packages/core/src/<contexto>`, `packages/db/src/schema`, `packages/api/src/routers`, `packages/api/src/container.ts`, rotas relevantes em `apps/web/src/routes`

## 3. Escreva `plan.md`

Copie `specs/templates/plan.md` para a pasta da feature e preencha:

- **Domínio primeiro**: agregados, invariantes (referenciando `RN-xx`), value objects, erros com `code` `CONTEXTO.MOTIVO`.
- **Casos de uso** como funções fábrica `createX(deps)`; portas novas com assinatura TypeScript; fakes em memória que serão criados.
- **Adapters**: schema Drizzle por contexto, repositórios recebendo `Database`; canais/eventos real-time com payload mínimo (limite ~10 KB) e quem publica/assina; nada de estado em memória no servidor (Vercel).
- **API**: procedures finas; forma da entrada em zod, regra no core.
- **UI**: rotas, componentes, variantes novas no design system (na raiz do componente em `packages/ui`).
- **Testes**: tabela ligando **cada `CA-xx`** a pelo menos um teste, na camada mais baixa possível.
- Decisão arquitetural nova ou troca de provedor → proponha um ADR em `docs/adr/` (rascunho) e cite no plano.

Respeite a regra de dependência: nada de infraestrutura em `packages/core`.

## 4. Entregue

`status: draft` no plano. Resuma as decisões principais, riscos e ADRs propostos e peça aprovação. Após aprovado, o próximo passo é `/sdd-tasks $ARGUMENTS`. **Não escreva código nesta etapa.**
