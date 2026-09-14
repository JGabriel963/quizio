# Estratégia de testes

> Decisão registrada em [ADR 0004](adr/0004-estrategia-de-testes.md).

## Ciclo TDD

Todo comportamento novo nasce de um teste que falha:

1. **Red** — escreva o teste descrevendo a regra (normalmente derivado de um critério de aceite da spec).
2. **Green** — implemente o mínimo para passar.
3. **Refactor** — melhore nomes e estrutura com os testes verdes.

As tarefas em `specs/features/*/tasks.md` já vêm ordenadas assim: teste primeiro, depois implementação.

## Pirâmide

| Camada | O que cobre | Ferramenta | Arquivo | Onde roda |
| --- | --- | --- | --- | --- |
| **Domínio** | Regras puras (pontuação, validação de pergunta, transições da partida) | Vitest | `*.test.ts` ao lado do código em `packages/core` | `pnpm test` |
| **Aplicação** | Casos de uso orquestrando portas | Vitest + fakes em memória | `*.test.ts` em `core/src/*/application` | `pnpm test` |
| **Repositórios** | Mapeamento Drizzle ↔ domínio, constraints, queries | Vitest + **PGlite** (Postgres em WASM, sem Docker) | `*.test.ts` em `packages/db` usando `createTestDb()` | `pnpm test` |
| **API** | Routers: autenticação, mapeamento de erros, contrato | Vitest + `createCallerFactory` + container com fakes | `*.test.ts` em `packages/api` | `pnpm test` |
| **Componentes** | UI do design system e hooks | Vitest + jsdom + Testing Library | `*.test.tsx` em `packages/ui` e `apps/web` | `pnpm test` |
| **Integração de adapters** | Adapter contra o serviço real (RustFS, Soketi) | Vitest | `*.int.test.ts` | `pnpm test:int` (requer `pnpm infra:up`) |
| **E2E** | Fluxos completos no navegador, incluindo host + N jogadores | Playwright (desktop + mobile) | `apps/web/e2e/*.spec.ts` | `pnpm test:e2e` (requer infra) |

Quanto mais regra de negócio, mais baixo na pirâmide o teste deve estar. E2E cobre apenas os caminhos críticos (criar quiz → organizar partida → jogadores respondem → pódio).

## Comandos

```bash
pnpm test          # unit + componentes + PGlite, todos os pacotes (Turborepo, com cache)
pnpm test:watch    # Vitest em modo watch, todos os projetos pela raiz
pnpm test:int      # adapters contra containers locais
pnpm test:e2e      # Playwright; sobe o dev server se não estiver rodando
pnpm -F @quizio/core test                # um pacote
pnpm vitest run packages/core/src/game   # um diretório, pela raiz
```

Primeira execução do E2E: `pnpm -F web exec playwright install chromium`.

## Convenções

- **Fakes em vez de mocks.** Portas têm implementações em memória (`InMemoryObjectStorage`, `InMemoryRealtimePublisher`, `InMemoryRealtimeSubscriber`, `FixedClock`, `SequentialIdGenerator`). `vi.fn()` só na fronteira com SDKs de terceiros dentro dos próprios adapters.
- **Tempo e IDs são injetados** (`Clock`, `IdGenerator`) — nada de `Date.now()` ou `crypto.randomUUID()` dentro do core.
- **Nomes de teste descrevem a regra**, em inglês, no presente: `awards nothing for incorrect answers`.
- **Arrange / Act / Assert** separados por linha em branco.
- **Vitest 5** limpa o histórico de mocks antes de cada teste (`clearMocks` padrão) e roda com `globals: false`: importe `describe/it/expect` de `vitest`.
- **Testes de componentes** consultam por papel acessível (`getByRole`), não por classe — exceto quando a classe *é* o contrato (variantes do design system).
- **PGlite**: crie um banco por arquivo de teste em `beforeAll` e feche em `afterAll`; o schema é aplicado com `drizzle-kit/api` a partir de `packages/db/src/schema`.
- **E2E de partida ao vivo** usa um `browser.newContext()` por participante para simular host e jogadores simultâneos.

## Definition of Done (testes)

- Todo critério de aceite da spec tem ao menos um teste automatizado apontando para ele.
- `pnpm test` verde; `pnpm test:int` verde se algum adapter mudou; E2E verde se um fluxo crítico mudou.
- Nenhum teste marcado `.skip`/`.only` commitado.
