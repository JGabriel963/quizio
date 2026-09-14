---
name: sdd-spec
description: Create a Quizio feature spec (what and why, in PT-BR) from an idea, following the project's Spec-Driven Development flow. Use when the user wants to specify a new feature or asks for /sdd-spec.
argument-hint: <descrição da funcionalidade>
---

# /sdd-spec — especificar uma funcionalidade

Você vai escrever `specs/features/NNN-slug/spec.md` para a ideia: **$ARGUMENTS**

## 1. Carregue o contexto

Leia antes de escrever:

- `specs/constitution.md` e `specs/README.md`
- `specs/glossary.md` e `specs/roadmap.md`
- As seções relevantes de `specs/product/kahoot-reference.md` (use Grep para achá-las; o arquivo é longo)
- Specs existentes em `specs/features/*/spec.md` que toquem o mesmo contexto

## 2. Resolva ambiguidades de produto

Se a ideia deixar decisões de produto em aberto (escopo, divergência do Kahoot, itens "(não confirmado)" na referência), pergunte ao usuário com AskUserQuestion **antes** de escrever — no máximo 4 perguntas, cada uma com uma opção recomendada. Não pergunte sobre tecnologia: isso é do plano.

## 3. Escreva a spec

- Próximo número: maior `NNN` em `specs/features/` + 1, com 3 dígitos. Slug em PT-BR, kebab-case, sem acentos (`002-editor-de-quiz`).
- Copie `specs/templates/spec.md` e preencha todas as seções. Remova os comentários HTML.
- **Só o quê e o porquê.** Nada de tabelas, componentes, procedures ou bibliotecas.
- Cada regra de negócio (`RN-xx`) cita a fonte: `kahoot-reference §x.y` ou "decisão do produto (data)".
- Critérios de aceite (`CA-xx`) em Dado/Quando/Então, observáveis e testáveis; cubra casos de erro e limites (valores mínimos/máximos da referência).
- Termos de domínio novos: nome PT com o code name EN na primeira ocorrência; acrescente-os em `specs/glossary.md`.
- `status: draft`. Atualize a linha da feature em `specs/roadmap.md` com o link da spec.

## 4. Entregue

Responda com um resumo curto (objetivo, nº de RN e CA, divergências do Kahoot) e liste as perguntas em aberto. Peça aprovação: o próximo passo é o usuário mudar o status para `approved` (ou pedir para você mudar) e rodar `/sdd-plan NNN`. **Não escreva plano nem código nesta etapa.**
