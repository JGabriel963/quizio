# Design system

> Decisão registrada em [ADR 0005](adr/0005-design-system.md). Visualização ao vivo: `/design-system` no app.

## Princípios

- **Parecer Kahoot**: fundo cinza claro, cartões brancos, roxo como marca, azul como ação principal, tipografia bold, botões "pressionáveis" com borda inferior escura.
- **Customizar na raiz**: os primitivos shadcn em `packages/ui/src/components` são nossos. Novas variantes entram direto no `cva` do componente, não em wrappers espalhados pelo app.
- **Tokens semânticos**: componentes usam `bg-primary`, `bg-brand`, `bg-answer-red`… nunca hex direto.

## Tokens (`packages/ui/src/styles/globals.css`)

| Token | Valor | Uso |
| --- | --- | --- |
| `brand` / `brand-strong` | `#46178f` / `#25076b` | Logo, item ativo da navegação, telas de jogo |
| `primary` | `#1368ce` | Ação principal ("Crie", "Organizar ao vivo") |
| `success` | `#26890c` | Resposta correta, confirmações |
| `destructive` | `#e21b3c` | Resposta incorreta, exclusão |
| `background` / `card` | `#f2f2f2` / `#ffffff` | Fundo do app / superfícies |
| `answer-red` | `#e21b3c` | Alternativa 1 — triângulo |
| `answer-blue` | `#1368ce` | Alternativa 2 — losango |
| `answer-yellow` | `#d89e00` | Alternativa 3 — círculo |
| `answer-green` | `#26890c` | Alternativa 4 — quadrado |
| `shadow-press` / `shadow-press-sm` / `shadow-press-light` | inset inferior | Efeito de botão pressionável |
| `--radius` | `0.375rem` | Cantos levemente arredondados (primitivos passaram de `rounded-none` para `rounded-md`) |
| Fonte | Montserrat Variable | `@fontsource-variable/montserrat` |

A classe `.dark` define superfícies roxas para as telas de partida (lobby, pergunta, pódio). O app em si é claro, como o Kahoot.

## Componentes

### `Button`

Variantes sólidas pressionáveis: `default` (azul), `brand`, `success`, `destructive`, `secondary` (branco). Variantes planas: `outline`, `ghost`, `link`. Tamanhos: `xs`, `sm`, `default`, `lg`, `xl` (CTA de lobby) e `icon*`. Para navegação, use `render={<Link …/>}` com `nativeButton={false}` (padrão Base UI).

### `AnswerOption` + `AnswerShape`

- A **cor é derivada da forma** — impossível exibir um triângulo azul.
- Ordem fixa: `answerShapeAt(0..3)` → triângulo, losango, círculo, quadrado.
- O Kahoot aceita até **6 alternativas**; o par cor/forma da 5ª e 6ª não foi confirmado (`kahoot-reference §6.5`). Serão adicionadas ao `ANSWER_SHAPES` pela spec do editor.
- `state`: `idle`, `selected` (múltipla escolha; expõe `aria-pressed`), `correct` (ícone de check), `incorrect` (esmaecida + X).
- `size`: `default` (celular do jogador), `lg`/`xl` (tela do host).

## Adicionando ou alterando componentes

1. Primitivo compartilhado novo: `npx shadcn@latest add <componente> -c packages/ui`, depois ajuste as classes ao visual Kahoot (cantos `rounded-md`, `font-bold`, variantes pressionáveis quando for ação).
2. Nova variante: acrescente no `cva` do componente e cubra com teste em `*.test.tsx` quando a variante for contrato (ex.: cor de alternativa).
3. Adicione o componente/variante na página `/design-system`.
4. Rode `pnpm check` (o Biome ordena as classes Tailwind).
