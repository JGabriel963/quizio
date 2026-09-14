---
spec: "NNN"
status: draft # draft | approved
---

# Plano técnico — NNN <título>

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md)

## Abordagem

<!-- Resumo em um parágrafo. -->

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |

## Domínio — `packages/core/src/<contexto>/domain`

### Agregados e entidades

<!-- Nome, identidade, atributos, invariantes (referenciar RN-xx). -->

### Value objects

### Serviços de domínio

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |

## Aplicação — `packages/core/src/<contexto>/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |

### Portas novas ou alteradas

```ts
// assinatura das interfaces
```

## Adapters

### Banco — `packages/db`

<!-- Tabelas/colunas em schema/<contexto>.ts, índices, repositórios em repositories/<contexto>/. -->

### Real-time

| Canal | Evento | Payload | Publicado por (caso de uso) | Assinado por (tela) |
| --- | --- | --- | --- | --- |

### Storage / outros

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |

Ligações novas em `container.ts` / `composition-root.ts`:

## UI — `apps/web` e `packages/ui`

<!-- Rotas, componentes do app, novas variantes no design system, estados de carregamento/erro. -->

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | domínio | <nome do teste> | `packages/core/src/.../x.test.ts` |

## Dados e migração

<!-- `pnpm db:generate` necessário? Backfill? -->

## Riscos e decisões

<!-- Decisões arquiteturais novas → propor ADR em docs/adr/. -->
