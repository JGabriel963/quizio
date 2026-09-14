# ADR 0004 — Vitest, PGlite, Testing Library e Playwright

- **Status:** aceito
- **Data:** 2026-09-13

## Contexto

O projeto não tinha test runner configurado. A arquitetura hexagonal e o TDD exigem testes rápidos no domínio, testes realistas nos adapters e E2E para a partida ao vivo com múltiplos participantes.

## Decisão

- **Vitest 5** em todos os pacotes (nativo do Vite, que o app já usa). Cada pacote tem `vitest.config.ts` com `defineProject`; a raiz agrega os projetos para `pnpm test:watch`; `pnpm test` roda via Turborepo com cache.
- **Testes de integração de adapters** em arquivos `*.int.test.ts` com config separada (`vitest.int.config.ts`), executados por `pnpm test:int` contra os containers locais.
- **PGlite** (Postgres em WASM) para testes de repositório: schema aplicado com `drizzle-kit/api`, sem Docker, rápido o bastante para rodar junto dos testes unitários.
- **Testing Library + jsdom** para componentes e hooks; `@testing-library/jest-dom` para matchers.
- **Playwright** para E2E, com projetos desktop e mobile (jogadores usam celular), `webServer` apontando para o dev server.
- **Fakes em memória** das portas como mecanismo padrão de isolamento.

## Consequências

- `pnpm test` roda sem nenhuma infraestrutura externa.
- PGlite é Postgres real, mas não idêntico à versão 18 de produção; recursos muito específicos de versão devem ser cobertos em teste de integração contra o container.
- E2E e integração exigem `pnpm infra:up`; em CI isso vira *services* do pipeline.

## Alternativas consideradas

- **Jest** — configuração duplicada em relação ao Vite e ESM mais trabalhoso.
- **Testcontainers para repositórios** — mais fiel, porém lento e dependente de Docker em todo `pnpm test`.
- **Cypress** — multi-aba/multi-contexto (host + jogadores) é mais natural no Playwright.
