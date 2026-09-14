# ADR 0005 — Design system: shadcn/Base UI customizado na raiz com identidade Kahoot

- **Status:** aceito
- **Data:** 2026-09-13

## Contexto

O projeto usa shadcn (estilo `base-lyra`, sobre `@base-ui/react`) em `packages/ui`. O visual padrão é neutro, escuro e com cantos retos; o objetivo é uma experiência próxima à do Kahoot.

## Decisão

- Manter shadcn + Base UI, mas **tratar os componentes como código próprio**: variantes Kahoot são adicionadas diretamente no `cva` de cada primitivo.
- Tokens de cor, raio, sombras "pressionáveis" e fonte (Montserrat Variable) centralizados em `globals.css`; cores das alternativas (`answer-*`) como tokens de primeira classe.
- Tema **claro** por padrão (removido o `className="dark"` fixo); `.dark` reservado às telas de partida.
- Componentes de domínio visual reutilizáveis (`AnswerOption`, `AnswerShape`) no pacote de UI, sem regra de negócio.
- Página `/design-system` como catálogo vivo e alvo de teste E2E.

## Consequências

- Atualizações via `shadcn add --diff` precisarão de merge manual nas partes customizadas.
- Fontes e cores não usam assets do Kahoot (marca registrada); apenas se inspiram na paleta e na linguagem visual.

## Alternativas consideradas

- **Trocar para outro estilo shadcn (ex.: nova)** — ainda exigiria customização pesada.
- **Biblioteca de componentes própria do zero** — perderia acessibilidade pronta do Base UI.
