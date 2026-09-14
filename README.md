# Quizio

Clone pessoal do Kahoot, sem paywalls nem limite de participantes: crie quizzes, organize partidas ao vivo com PIN e acompanhe relatórios.

## Stack

TanStack Start (React 19, Vite 8) · tRPC · Drizzle + PostgreSQL · Better Auth · Cloudflare R2 (API S3) · protocolo Pusher (Pusher/Soketi) · shadcn + Base UI + Tailwind v4 · Vitest · Playwright · Biome · Turborepo · pnpm.

## Começando

Requisitos: Node 22.12+, pnpm 12, Docker.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env   # ajuste BETTER_AUTH_SECRET
pnpm infra:up                            # Postgres, RustFS (S3) e Soketi (Pusher) + bucket
pnpm db:push
pnpm dev                                 # http://localhost:3001
```

Console do storage local: http://localhost:9001 (usuário `quizio`, senha `quizio-secret`).

## Testes

```bash
pnpm test        # unitários, componentes e repositórios (PGlite) — sem infraestrutura
pnpm test:int    # adapters contra RustFS e Soketi (requer infra:up)
pnpm test:e2e    # Playwright; na primeira vez: pnpm -F web exec playwright install chromium
```

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Arquitetura hexagonal, bounded contexts, regras de dependência |
| [docs/testing.md](docs/testing.md) | Estratégia de testes e TDD |
| [docs/design-system.md](docs/design-system.md) | Tokens e componentes com visual Kahoot |
| [docs/adr/](docs/adr) | Decisões de arquitetura |
| [specs/README.md](specs/README.md) | Fluxo Spec-Driven Development (`/sdd-spec` → `/sdd-plan` → `/sdd-tasks` → `/sdd-implement`) |
| [specs/constitution.md](specs/constitution.md) | Princípios inegociáveis |
| [specs/product/kahoot-reference.md](specs/product/kahoot-reference.md) | Referência funcional do Kahoot |
| [specs/roadmap.md](specs/roadmap.md) | Ordem das funcionalidades |

## Estrutura

```
apps/web            app TanStack Start (UI + rotas de API)
packages/core       domínio e casos de uso (sem infraestrutura)
packages/api        routers tRPC + composition root
packages/db         schema Drizzle, repositórios, harness PGlite
packages/storage    adapter S3 (Cloudflare R2)
packages/realtime   adapters do protocolo Pusher (servidor e cliente)
packages/auth       Better Auth
packages/env        variáveis de ambiente validadas
packages/ui         design system
packages/config     tsconfig compartilhado
specs/              specs, templates, roadmap, referência do Kahoot
docs/               arquitetura, testes, design system, ADRs
```
