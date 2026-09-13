# ADR 0006 — Spec-Driven Development com fluxo próprio

- **Status:** aceito
- **Data:** 2026-09-13

## Contexto

O desenvolvimento é feito majoritariamente com IA. Sem specs, cada sessão reconstrói contexto a partir do código e decisões de produto se perdem. Ferramentas prontas (GitHub Spec Kit, OpenSpec) foram avaliadas.

## Decisão

- Fluxo próprio e leve em `specs/`: **constituição** → **spec** (o quê/por quê) → **plan** (como, nesta arquitetura) → **tasks** (passos TDD) → **implementação**.
- Comandos Claude Code como skills do projeto: `/sdd-spec`, `/sdd-plan`, `/sdd-tasks`, `/sdd-implement`, cada um lendo a constituição, a arquitetura e a referência do Kahoot.
- Revisão humana obrigatória entre spec → plan → tasks (campo `status` no frontmatter).
- **Idioma**: specs, ADRs e docs em PT-BR; código, nomes de entidades, testes e commits em inglês; glossário PT↔EN em `specs/glossary.md` como linguagem ubíqua.
- `specs/product/kahoot-reference.md` é a referência funcional; divergências intencionais do Kahoot são registradas na spec da feature.

## Consequências

- Templates e comandos alinhados à arquitetura hexagonal (o plan sempre lista contextos, portas, adapters e testes por camada).
- Specs viram documentação viva: mudanças de comportamento atualizam a spec junto com o código.

## Alternativas consideradas

- **GitHub Spec Kit** — padronizado, porém genérico e com mais cerimônia do que o necessário para um projeto individual.
- **OpenSpec** — bom modelo de deltas, mas adiciona um CLI externo ao fluxo.
