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
| `answer-teal` | `#0c8582` | Alternativa 5 — pentágono |
| `answer-purple` | `#864cbf` | Alternativa 6 — triângulo invertido |
| `answer-correct` | `#66bf39` | Marcação de "resposta correta" sobre um bloco de alternativa |
| `shadow-press` / `shadow-press-sm` / `shadow-press-light` | inset inferior | Efeito de botão pressionável |
| `--radius` | `0.375rem` | Cantos levemente arredondados (primitivos passaram de `rounded-none` para `rounded-md`) |
| Fonte | Montserrat Variable | `@fontsource-variable/montserrat` |

A classe `.dark` define superfícies roxas para as telas de partida (lobby, pergunta, pódio). O app em si é claro, como o Kahoot.

## Componentes

### `Button`

Variantes sólidas pressionáveis: `default` (azul), `brand`, `success`, `destructive`, `secondary` (branco) e `game` (quase preto, das telas de entrada do jogador). Variantes planas: `outline`, `ghost`, `link`. Tamanhos: `xs`, `sm`, `default`, `lg`, `xl` (CTA de lobby) e `icon*`. Para navegação, use `render={<Link …/>}` com `nativeButton={false}` (padrão Base UI).

### `Badge`

Além das variantes de visibilidade do quiz (`private`, `unlisted`), a variante **`soon`** (contorno tracejado, texto esmaecido) marca pontos de entrada de features planejadas mas ainda não entregues — navegação e cartões "Em breve" da spec 002. As variantes de **status do quiz** (spec 006) são `draft` (contorno neutro, "Rascunho"), `published` (verde suave, "Publicado") e `unsaved` (roxo suave, "Alterações não salvas"); no app elas são usadas pelo `QuizStatusBadge`.

### `TabNav` + `TabNavItem`

Abas para as seções de uma área (Recentes / Rascunhos / Lixeira na Biblioteca). **São links, nunca `role="tablist"`**: a seção mora na URL, então voltar/avançar do navegador e abrir em nova aba precisam funcionar. Use `render={<Link …/>}` no `TabNavItem` e `current` para marcar a seção aberta (`aria-current="page"`). O trilho é `inline-flex`: dentro de uma coluna `flex`, envolva num `div` para ele não esticar.

### `Select`

Lista de opções sobre `@base-ui/react/select`, usada no lugar do `<select>` do navegador (painel de propriedades do editor). `SelectTrigger` tem o visual dos campos do Kahoot (borda, `shadow-press-light`) e ocupa a largura do contêiner; `SelectContent` abre abaixo do campo, com a largura dele. Dê nome ao campo com `aria-labelledby` no `SelectTrigger`. `SelectItem` tem `variant="tile"` para cartões com ícone em cima e nome embaixo (lista de tipos de pergunta), dentro de um `SelectGroup` com `SelectLabel`.

### `AnswerOption` + `AnswerShape`

- A **cor é derivada da forma** — impossível exibir um triângulo azul.
- Ordem fixa: `answerShapeAt(0..5)` → triângulo, losango, círculo, quadrado, pentágono, triângulo invertido.
- A 5ª (turquesa, pentágono) e a 6ª (roxo, triângulo invertido) seguem a referência não confirmada adotada na spec 004 (RN-01; `kahoot-reference §6.5`).
- **Verdadeiro ou falso** (spec 005, RN-06) não segue a ordem das posições: "Verdadeiro" é o losango azul e "Falso" o triângulo vermelho, nessa ordem. O par mora em `TRUE_FALSE_ANSWERS` (`apps/web/src/components/editor/true-false-answers.tsx`).
- `ANSWER_COLOR_CLASSES` é a fonte única do par forma → fundo para blocos que não são `AnswerOption` (campos do editor, miniaturas).
- `state`: `idle`, `selected` (múltipla escolha; expõe `aria-pressed`), `correct` (ícone de check), `incorrect` (esmaecida + X).
- `size`: `default` (celular do jogador), `lg`/`xl` (tela do host).

### `Checkbox`

- `variant="default"`: caixa de formulário.
- `variant="answer"`: marcação redonda de "resposta correta" sobre um bloco de alternativa (spec 004); anel branco, preenchida de verde-claro (`answer-correct`) com o check branco quando marcada, para aparecer também sobre a alternativa verde.

### `Switch`

- Chave liga/desliga que vale na hora, sem botão de salvar (spec 012): verde (`success`) quando ligada.
- `size`: `default` e `sm`. Sem rótulo próprio: dê o nome com `aria-labelledby` ou envolva num `Label`.

### `Sheet`

- Painel preso à lateral, por cima da página (spec 012): `SheetContent` com `side="right"` (padrão) ou `"left"`, `SheetHeader`, `SheetBody` (a parte que rola) e `SheetFooter`.
- Sobre o `Dialog` do base-ui: fecha com o X, Esc ou clique fora. Abre num portal, fora de `.dark`, então é claro mesmo sobre as telas do jogo.

## Animações do jogo (spec 011)

As telas do jogo (`.dark`, dentro de `GameScreen`) têm animações curtas, como no Kahoot. São só apresentação: nada no jogo espera por elas.

- **Simples, em CSS**: keyframes em `globals.css`, usados com `motion-safe:` para respeitar o movimento reduzido. `animate-pop-in` (um elemento que salta ao entrar), `animate-stage-in` (o conteúdo de uma fase entrando), `animate-bar-grow` (barras crescendo, com `origin-bottom`), `animate-confetti-fall`, `animate-podium-glow`.
- **O que muda de lugar, sai da tela ou é sequência**: a biblioteca `motion` (`motion.li` com `layout`, `AnimatePresence`), só em `apps/web/src/components/game/`.
- **Números que sobem**: `CountUp` (`apps/web/src/lib/count-up.tsx`).
- **Durações**: até cerca de 1 s por movimento (`GAME_MOTION` em `lib/game-motion.tsx`).
- **Movimento reduzido**: `usePrefersReducedMotion()`; as telas mostram direto o estado final.

## Adicionando ou alterando componentes

1. Primitivo compartilhado novo: `npx shadcn@latest add <componente> -c packages/ui`, depois ajuste as classes ao visual Kahoot (cantos `rounded-md`, `font-bold`, variantes pressionáveis quando for ação).
2. Nova variante: acrescente no `cva` do componente e cubra com teste em `*.test.tsx` quando a variante for contrato (ex.: cor de alternativa).
3. Adicione o componente/variante na página `/design-system`.
4. Rode `pnpm check` (o Biome ordena as classes Tailwind).
