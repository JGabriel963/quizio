# ADR 0001 — Monólito modular com arquitetura hexagonal, DDD tático e TDD

- **Status:** aceito
- **Data:** 2026-09-13

## Contexto

O Quizio replica as principais funcionalidades do Kahoot sem os limites do plano gratuito. O deploy inicial é na Vercel, mas o dono do projeto espera trocar recursos de infraestrutura (real-time, storage, possivelmente hospedagem) ao longo do tempo. O desenvolvimento é assistido por IA, o que exige limites claros entre módulos e specs como fonte de contexto.

O repositório já é um monorepo Better-T-Stack (TanStack Start, tRPC, Drizzle, Better Auth) com pacotes que exportam TypeScript cru.

## Decisão

- **Monólito modular** no mesmo monorepo e no mesmo app; nada de microsserviços.
- **Hexagonal**: um pacote `@quizio/core` sem dependências de infraestrutura contém domínio e casos de uso; portas são interfaces no core; adapters vivem em pacotes próprios (`db`, `storage`, `realtime`); `packages/api` é o adapter de entrada e a composition root.
- **DDD tático** por bounded context (quiz, game, library, reports, media) com linguagem ubíqua documentada em `specs/glossary.md`. DDD estratégico leve: contextos se referenciam por ID.
- **TDD** como fluxo padrão, viabilizado por fakes em memória das portas.
- Casos de uso como **funções fábrica** (`createX(deps)`), não classes — idiomático no restante do stack (tRPC, TanStack).
- Erros de negócio como exceções `DomainError` com `code`, convertidas em `BAD_REQUEST` por middleware tRPC.

## Consequências

- Trocar provedor = novo adapter + composition root; o core e os routers ficam intactos.
- Custo inicial maior: mapeamento entidade ↔ linha nos repositórios e interfaces explícitas. Aceito em troca de testabilidade e substituibilidade.
- Contextos CRUD simples (ex.: favoritos) podem ter domínio fino; a regra é não colocar lógica de negócio em routers ou componentes, não inflar camadas artificialmente.

## Alternativas consideradas

- **Arquitetura em camadas tradicional com Drizzle nos routers** — mais rápida no início, mas acopla regra de negócio ao ORM e ao tRPC, dificultando trocar infraestrutura e testar sem banco.
- **Clean Architecture completa (entities/use cases/interface adapters/frameworks com DTOs em todas as fronteiras)** — cerimônia excessiva para um projeto de uma pessoa.
- **Vertical slices sem núcleo compartilhado** — bom para CRUD, fraco para as regras ricas da partida ao vivo (pontuação, streak, ciclo da pergunta).
