---
spec: "042"
status: approved # draft | approved
---

# Plano técnico — 042 Temas prontos

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0021](../../../docs/adr/0021-temas-catalogo-proprio.md) (rascunho)

## Abordagem

Um tema é **um identificador**, como o avatar (ADR 0013). O core sabe só quais IDs existem e qual é o padrão; fundo, cores, nome em português e grupo ficam num catálogo da web, conferido por um teste. Como quiz e partida precisam do mesmo catálogo, e um contexto não importa o outro, os IDs ficam no **shared kernel** (`shared/domain/theme.ts`). O quiz ganha `themeId`, salvo sozinho por um caso de uso novo (`setQuizTheme`, gravado só na coluna, como `saveVisibility`), fora da versão jogável (RN-07). A partida lê o `themeId` pelo `PlayableQuizQuery` e o **copia na criação** (`newGame`, `newAssignment`), por isso nunca muda depois (RN-10, RN-11). As visões que as telas de jogo já consultam ganham `themeId`. Na web, o `GameScreen` deixa de ter o roxo fixo: lê o tema de um contexto (`GameThemeProvider`, que as rotas montam) e escreve **variáveis CSS** (`--game-fg`, `--game-accent`…). O texto que fica direto sobre o fundo passa a usar tokens novos (`text-game-fg`, `bg-game-accent`), e a cor desse texto é **calculada** a partir das cores do tema pela razão de contraste do WCAG (RN-19, RN-20). Um teste confere os 14 temas. O `.dark` continua em todas as telas de jogo, para não mexer nas superfícies dos componentes. No editor, a coluna da direita vira a barra Temas/Propriedades, e o ⋮ das telas estreitas ganha "Temas", que abre o mesmo painel num `Sheet`.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Tema | `ThemeId`, `THEME_IDS` (`shared/domain/theme.ts`) | sim |
| Tema padrão | `DEFAULT_THEME_ID = "standard"` | sim |
| Tema do quiz | `Quiz.themeId` | sim |
| Tema da partida | `Game.themeId` | sim |
| Tema desconhecido | `UnknownThemeError` (`QUIZ.UNKNOWN_THEME`) | sim |
| Catálogo de temas (web) | `THEME_CATALOG`, `THEME_GROUPS` em `lib/theme-catalog.ts` | sim |
| Tom do tema | `ThemeTone` (`dark` \| `light`), derivado do contraste | sim |

## Domínio

### Shared kernel — `packages/core/src/shared/domain/theme.ts` (novo)

```ts
export const THEME_IDS = [
	"standard",
	// Cores (dark)
	"purple", "blue", "teal", "red", "orange", "graphite",
	// Claros (light)
	"light", "light-blue", "light-green", "light-yellow", "light-orange", "lilac", "beige",
] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const DEFAULT_THEME_ID: ThemeId = "standard"; // RN-04

export function isThemeId(value: string): value is ThemeId;
/** Reading a stored row: an id that left the catalog reads as the default (RN-05, CA-04). */
export function knownThemeId(value: string | null | undefined): ThemeId;
```

- Os IDs são estáveis, em inglês e kebab-case; a ordem é a do painel. Um ID nunca muda de desenho: trocar a arte de um tema é criar outro ID e tirar o antigo (ADR 0021, como ADR 0013).
- Fica no shared kernel porque `quiz` (valida a escolha) e `game` (lê da linha) precisam da mesma lista, e o `game` nunca importa o `quiz`.

### Quiz — `quiz/domain/quiz.ts` (alterado)

- `Quiz.themeId: ThemeId`. `newQuiz` começa com `DEFAULT_THEME_ID` (RN-04).
- `copyQuiz(source, copy)` copia `source.themeId` (RN-08). Como `duplicateQuiz`, `duplicateSharedQuiz` e a cópia do quiz público passam por `copyQuizContent` → `copyQuiz`, as três ganham o tema de uma vez (CA-16).
- `parseThemeId(value: string): ThemeId` em `quiz/domain/quiz.ts`: lança `UnknownThemeError` fora do catálogo (RN-05, CA-03).
- `sameQuestionLists`/`hasUnpublishedChanges` não mudam: o tema não é parte da versão (RN-07).

### Game — `game/domain/game.ts` e `assignment.ts` (alterados)

- `Game.themeId: ThemeId`. `newGame` e `newAssignment` recebem `themeId` (RN-10). Nenhuma função muda o tema depois (RN-11, RN-12).

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `UnknownThemeError` | `QUIZ.UNKNOWN_THEME` | `setQuizTheme` com um ID fora de `THEME_IDS` (RN-05, CA-03) |

## Aplicação

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `createSetQuizTheme` (novo, `quiz/application/set-quiz-theme.ts`) | `QuizReference & { themeId: string }` | `QuizDetailsView` | `QUIZ.NOT_FOUND`, `QUIZ.IN_TRASH`, `QUIZ.UNKNOWN_THEME` | `QuizRepository.saveTheme`, `Clock` |
| `copyQuizContent` (alterado via `copyQuiz`) | — | a cópia com o tema | — | — |
| `createHostGame` (alterado) | — | a partida com `quiz.themeId` | — | `PlayableQuizQuery` |
| `createCreateAssignment` (alterado) | — | a atribuição com `quiz.themeId` (também pelo grupo, que chama o mesmo caso de uso) | — | `PlayableQuizQuery` |
| `createFindGameByPin` (alterado) | — | `{ gameId, pin, mode, themeId }`: a tela do apelido já sai com o tema (RN-14) | — | — |
| `getHostGame`, `getPlayerSession`, `getAssignmentCover`, `getAssignmentPlay` (alterados) | — | cada visão ganha `themeId` | — | — |

`setQuizTheme` segue `setQuizVisibility`: `requireOwnedQuiz` → `assertQuizEditable` → `parseThemeId` → `quizzes.saveTheme(quiz.id, { themeId, updatedAt })`. Não chama `markQuizEdited` e não toca em perguntas, então o selo de alterações não salvas não muda (CA-07), e vale num rascunho (CA-08).

### Portas alteradas

```ts
// quiz/application/ports/quiz-repository.ts
saveTheme(id: string, change: { themeId: ThemeId; updatedAt: Date }): Promise<void>;

// quiz/application/quiz-details-view.ts
interface QuizDetailsView { /* … */ themeId: ThemeId }

// game/application/ports/playable-quiz-query.ts
interface PlayableQuiz { /* … */ themeId: ThemeId }

// game/application/ports/assignment-landing-query.ts
interface AssignmentLandingRecord { /* … */ themeId: ThemeId }

// visões
interface HostGameView { /* … */ themeId: ThemeId }
interface PlayerSessionView { /* … */ themeId: ThemeId }
interface AssignmentPlayView { /* … */ themeId: ThemeId }
```

Fakes: `InMemoryQuizRepository.saveTheme`; o fake do `PlayableQuizQuery` e o da `AssignmentLandingQuery` passam a devolver `themeId` (padrão `standard`); `aQuiz()` ganha `themeId`.

## Adapters

### Banco — `packages/db`

- `schema/quiz.ts`: `quiz.theme_id text not null default 'standard'`.
- `schema/game.ts`: `game.theme_id text not null default 'standard'`.
- Sem enum no Postgres: o catálogo muda sem migration, e um ID que saiu continua legível (RN-05).
- `drizzle-quiz-repository.ts`: `save` grava `theme_id`; `saveTheme` grava só `theme_id` e `updated_at`; a leitura passa por `knownThemeId`.
- `drizzle-game-repository.ts`: `create`/`save` gravam `theme_id`; a leitura passa por `knownThemeId`. O tema não entra em `saveOptions`, `saveLocked` etc.: ele nunca muda.
- `drizzle-playable-quiz-query.ts` e `drizzle-assignment-landing-query.ts`: leem `quiz.theme_id` / `game.theme_id`.
- As leituras que alimentam as páginas do quiz compartilhado e do quiz público, de onde se abre "Organizar ao vivo", devolvem `themeId` para a tela de abertura (ver UI).

### Real-time

Nenhum evento novo: o tema é fixo na partida, e cada tela já o recebe na consulta que faz ao abrir.

### Storage

Nada. Os temas prontos são arquivos estáticos do app (`apps/web/public/themes/`), fora do `ObjectStorage` (RN-09, ADR 0021).

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `quiz.setTheme` (nova) | mutation | sessão | `{ quizId: uuid, themeId: string (máx. 64) }` | `QuizDetailsView` | `QUIZ.NOT_FOUND`, `QUIZ.IN_TRASH`, `QUIZ.UNKNOWN_THEME` |
| `quiz.get`, `quiz.editor` | — | — | — | `quiz.themeId` | — |
| `game.view`, `game.join.find`, `game.join.session`, `game.assignment.cover`, `game.assignment.play` | — | — | — | `themeId` | — |

O `themeId` entra como `z.string()` e não como `z.enum(THEME_IDS)`: assim um ID desconhecido chega ao core e volta com `domainCode` `QUIZ.UNKNOWN_THEME` (CA-03), como o avatar.

`container.ts`: `setQuizTheme: createSetQuizTheme({ quizzes, questions, storage, clock })`. Nada muda na `composition-root.ts`.

## UI — `apps/web` e `packages/ui`

### Catálogo e contraste

- **Arte**: `apps/web/public/themes/{id}.svg`, desenhada pelo Quizio: degradês com curvas e montanhas em camadas, sem texto, em proporção 16:9 e com `preserveAspectRatio="xMidYMid slice"`, para cobrir qualquer tela. O `standard` reproduz o degradê `brand → brand-strong` de hoje (CA-02). A miniatura do painel usa o mesmo arquivo.
- **`lib/theme-catalog.ts`**: `THEME_CATALOG: Record<ThemeId, ThemeEntry>` e `THEME_GROUPS` (`Padrão`, `Cores`, `Claros` → IDs, RN-02).

  ```ts
  interface ThemeEntry {
  	name: string;               // "Azul claro"
  	image: string;              // "/themes/light-blue.svg"
  	base: string;               // cor de fundo enquanto a imagem carrega
  	surfaces: readonly string[]; // as cores do fundo que o texto pode cobrir
  	accent: string;             // cartões dos apelidos, blocos do pódio, faixa da miniatura
  }
  ```

- **`lib/contrast.ts`** (puro): `relativeLuminance(hex)`, `contrastRatio(a, b)` (fórmula do WCAG 2.2) e `readableTextOn(colors): "#ffffff" | "#1f1f1f"`, que escolhe o par com a **maior razão mínima** contra todas as cores. O tom do tema (`themeTone(entry)`) é `light` quando o texto escolhido sobre `surfaces` é escuro (RN-21). Nada é guardado à mão, então a regra é a mesma para os temas personalizados da spec 043.
- **`themeStyle(id)`**: devolve as variáveis CSS do tema: `--game-bg-image`, `--game-base`, `--game-fg` (texto sobre o fundo), `--game-accent`, `--game-accent-fg` (texto sobre o destaque).

### Tokens — `packages/ui/src/styles/globals.css`

- `@theme inline`: `--color-game-fg: var(--game-fg, #ffffff)`, `--color-game-accent: var(--game-accent, var(--brand-strong))`, `--color-game-accent-fg: var(--game-accent-fg, #ffffff)`. Sem tema, os valores são os de hoje.
- `docs/design-system.md` e `/design-system`: seção "Temas" com as 14 miniaturas, o tom e as razões de contraste calculadas.

### Telas de jogo

- **`GameThemeProvider` / `useGameTheme()`** (`lib/game-theme.tsx`): um contexto com o `themeId`; sem provedor, `standard`.
- **`GameScreen`**: lê `useGameTheme()`, aplica `themeStyle` e `data-theme={id}` (para testes e E2E), troca `bg-linear-to-b from-brand to-brand-strong` pelo fundo do tema (`bg-(--game-base)` com a imagem em `cover`) e `text-white` por `text-game-fg`. Continua `.dark` (RN-17: cartões, cabeçalhos e diálogos não mudam). A pergunta com imagem de fundo continua por cima, como hoje (RN-16, CA-21).
- **O que fica direto sobre o fundo** passa de `text-white`/`bg-card` para `text-game-fg`/`bg-game-accent text-game-accent-fg`: o `Wordmark`, os cartões de apelido do lobby, a faixa "Aguardando os participantes", o placar, os blocos e nomes do pódio, os textos de espera do celular, `ConnectionBar` e as telas da atribuição. Hoje são 34 ocorrências de `text-white` em `components/game` e `components/assignment`; as tarefas passam por cada uma e decidem se ela fica sobre o fundo ou sobre uma superfície fixa.
- **Quem monta o provedor**:
  - `/host/$gameId`: `HostGameView.themeId` (lobby ao pódio, CA-17, CA-18, CA-19).
  - `/join` e `/join/$pin`: `standard` até o PIN ser aceito; depois, o `themeId` de `game.join.find` e, já dentro, o de `game.join.session` (RN-14, CA-20).
  - `/assignment/$gameId`: o da capa (`game.assignment.cover`) e, jogando, o de `game.assignment.play` (RN-15, CA-22 a CA-24).
  - `GameUnavailable`: sem provedor (`standard`).
- **Tela de abertura (`OpeningGame`)**: aparece enquanto `game.host` cria a partida, antes de a partida existir. Ela usa o tema do quiz que as páginas já têm à mão (`QuizDetailsView.themeId` na página do quiz e no editor, e o `themeId` das leituras do quiz compartilhado e do público); onde não houver (biblioteca), usa `standard`. Ver Riscos.

### Editor

- **Centro**: `quiz-editor.tsx` troca o degradê fixo da `main` por um `ThemeBackdrop` (mesma imagem e variáveis) com o `themeId` do cache do editor (CA-06, CA-11). O que fica direto sobre o fundo (dicas, área de mídia vazia, "Adicionar mais respostas") usa `text-game-fg` (CA-10).
- **`EditorSideRail`** (novo, `components/editor/editor-side-rail.tsx`): coluna estreita com dois botões, "Temas" (`PaletteIcon`) e "Propriedades" (`SlidersVerticalIcon`), com `aria-pressed` e o destaque azul. O estado `openPanel: "themes" | "properties" | null` fica no `quiz-editor.tsx` e começa em `"properties"` (RN-22, RN-23, CA-12). O painel aberto ocupa a `aside` de hoje e ganha o X no título; `QuestionPropertiesPanel` recebe `onClose`.
- **`ThemesPanel`** (novo, `components/editor/themes-panel.tsx`), com as ações por props:
  - "Seus temas" com o quadro tracejado e o "+" desabilitado, marcado "Em breve" (`Badge variant="soon"` como dica) (RN-24).
  - Um bloco por grupo, com o cabeçalho que recolhe e expande (`aria-expanded`; um `button` simples, sem primitivo novo), todos abertos (CA-13).
  - As miniaturas num `RadioGroup` do design system (`packages/ui/src/components/radio-group.tsx`), que dá as setas do teclado e o anúncio "selecionado" (RN-27, CA-14). A variante **`tile`** entra no `cva` do `RadioGroupItem` (imagem com faixa do nome, borda azul quando marcada, como o `SelectItem variant="tile"`), em vez de um wrapper.
  - `savingId` mostra a carga sobre a miniatura (RN-26).
- **Telas estreitas**: `QuestionPropertiesMenu` (o ⋮ ao lado do enunciado) ganha o item "Temas", que abre um `Sheet` com o `ThemesPanel` (RN-28, CA-15).
- **Salvar**: `useEditorActions` ganha `setTheme(themeId)`, que entra na fila única do editor e no `SaveTracker`, como o `rename`: aplica o tema no cache do `quiz.editor` na hora, envia `quiz.setTheme` com `networkMode: "always"` e, se falhar, **devolve o tema anterior ao cache** e deixa o "Não foi possível salvar · Tentar de novo"; "Tentar de novo" envia de novo a última escolha e volta a aplicá-la (RN-26, CA-09). Ao terminar, invalida as listagens que levam `QuizDetailsView` (`useInvalidateQuizzes`).

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | componente | `ThemesPanel` mostra "Seus temas" em breve e os grupos com 1, 6 e 7 temas | `apps/web/src/components/editor/themes-panel.test.tsx` |
| CA-01 | web (puro) | o catálogo e `THEME_GROUPS` têm exatamente os IDs de `THEME_IDS`, cada um com arquivo em `public/themes` | `apps/web/src/lib/theme-catalog.test.ts` |
| CA-02 | repositório | linhas sem `theme_id` informado leem `standard` (quiz e partida) | `packages/db/src/repositories/quiz/drizzle-quiz-repository.test.ts`, `…/game/drizzle-game-repositories.test.ts` |
| CA-03 | aplicação + API | `setQuizTheme` recusa um ID fora do catálogo com `QUIZ.UNKNOWN_THEME` e não grava; o router expõe o `domainCode` | `packages/core/src/quiz/application/set-quiz-theme.test.ts`, `packages/api/src/routers/quiz.test.ts` |
| CA-04 | domínio + repositório | `knownThemeId` devolve `standard` para um ID desconhecido; a linha com um ID removido lê `standard` | `packages/core/src/shared/domain/theme.test.ts`, repositórios acima |
| CA-05 | web (puro) | todos os temas: o texto escolhido tem razão ≥ 4,5 contra cada cor de `surfaces` e contra `accent` | `apps/web/src/lib/theme-catalog.test.ts`, `apps/web/src/lib/contrast.test.ts` |
| CA-06 | aplicação + componente | `setQuizTheme` grava e devolve o tema; o editor troca o fundo na hora e o tema fica marcado depois de salvar | `set-quiz-theme.test.ts`, `apps/web/src/components/editor/quiz-editor.test.tsx` |
| CA-07 | aplicação | trocar o tema de um quiz publicado não muda `hasUnpublishedChanges` nem a versão | `set-quiz-theme.test.ts` |
| CA-08 | aplicação | o tema é salvo num rascunho | `set-quiz-theme.test.ts` |
| CA-09 | componente | com a mutação falhando, o tema anterior volta e o cabeçalho mostra a falha com "Tentar de novo" | `quiz-editor.test.tsx` |
| CA-10 | web (puro) + componente | o tom de um tema claro é `light` e o centro do editor usa o texto escuro | `theme-catalog.test.ts`, `quiz-editor.test.tsx` |
| CA-11 | componente | a pergunta com imagem de fundo mostra a imagem; a outra, o tema | `quiz-editor.test.tsx` |
| CA-12 | componente | a barra troca entre Temas e Propriedades, com `aria-pressed`, e o X fecha o painel | `apps/web/src/components/editor/editor-side-rail.test.tsx`, `quiz-editor.test.tsx` |
| CA-13 | componente | a seta recolhe e expande o grupo (`aria-expanded`) | `themes-panel.test.tsx` |
| CA-14 | componente | as setas do teclado escolhem "Grafite", que fica `aria-checked` | `themes-panel.test.tsx` |
| CA-15 | componente + E2E | o ⋮ abre "Temas" num `Sheet` e a escolha é salva; no projeto mobile do Playwright, sem rolagem horizontal | `question-properties-menu.test.tsx`, `apps/web/e2e/themes.spec.ts` |
| CA-16 | domínio + aplicação | `copyQuiz` copia o tema; `duplicateQuiz` e `duplicateSharedQuiz` nascem com ele | `quiz/domain/quiz.test.ts`, `duplicate-quiz.test.ts`, `duplicate-shared-quiz.test.ts` |
| CA-17 | aplicação + E2E | `hostGame` copia o tema; `game.view` o devolve; o lobby e o pódio têm `data-theme` do quiz | `host-game.test.ts`, `get-host-game.test.ts`, `apps/web/e2e/themes.spec.ts` |
| CA-18 | aplicação | trocar o tema do quiz não muda a partida aberta; a próxima `hostGame` usa o novo | `host-game.test.ts` |
| CA-19 | componente | num tema claro, `Wordmark`, apelidos do lobby e nomes do pódio usam `text-game-fg` escuro; o cartão do PIN continua branco | `host-lobby.test.tsx`, `podium.test.tsx`, `game-screen.test.tsx` |
| CA-20 | aplicação + componente + E2E | `findGameByPin` e `getPlayerSession` devolvem o tema; a tela do PIN tem `standard`, as seguintes o tema | `find-game-by-pin.test.ts`, `get-player-session.test.ts`, `join-flow.test.tsx`, `themes.spec.ts` |
| CA-21 | componente | a pergunta com imagem de fundo cobre o tema na tela do anfitrião e no celular | `host-stage.test.tsx`, `question-on-device.test.tsx` |
| CA-22 | aplicação + componente | `createAssignment` copia o tema; capa e jogo o usam | `create-assignment.test.ts`, `get-assignment-cover.test.ts`, `get-assignment-play.test.ts`, `assignment-play-flow.test.tsx` |
| CA-23 | aplicação | trocar o tema do quiz não muda a atribuição aberta | `create-assignment.test.ts` |
| CA-24 | aplicação | `assignToGroups` cria a atribuição com o tema do quiz | `packages/core/src/groups/application/assign-to-groups.test.ts` (ou o teste do container que liga `GroupAssignments`) |
| CA-25 | componente | as telas do relatório não montam `GameThemeProvider` nem `GameScreen` (teste de fumaça na página) | `apps/web/src/components/reports/*.test.tsx` (um teste que verifica a ausência de `data-theme`) |

Repositórios (PGlite): `saveTheme` grava só a coluna e não desfaz um `rename` feito ao mesmo tempo; `PlayableQuizQuery.find` e `AssignmentLandingQuery.find` devolvem o tema.

## Dados e migração

- `pnpm db:generate`: duas colunas `text not null default 'standard'`. O default preenche as linhas existentes (RN-04, CA-02) sem backfill.
- Compatível com o código já publicado (o deploy migra antes do build, [docs/deploy.md](../../../docs/deploy.md)): o código antigo não conhece as colunas e o default cobre os inserts dele.

## Riscos e decisões

- **ADR 0021 (rascunho)**: catálogo de temas próprio, com IDs no shared kernel, arte estática no app e o tema copiado na partida. Proposto junto com este plano.
- **Tela de abertura**: ela aparece antes de a partida existir, e a biblioteca, que também abre partidas, não carrega o tema do quiz. Para não pôr o tema na listagem só por isso, a abertura usa o tema que a página tiver e `standard` na biblioteca. São cerca de um segundo, e o lobby já vem com o tema certo. A RN-13 da spec foi ajustada para dizer isso (changelog da spec).
- **`text-white` espalhado**: o maior risco é esquecer um texto sobre o fundo e deixá-lo branco num tema claro. Mitigação: a tarefa de inventário passa por todas as ocorrências em `components/game` e `components/assignment`, e o `/design-system` mostra as telas principais num tema claro para a revisão a olho.
- **`.dark` mantido**: tirar o `.dark` dos temas claros mudaria `card`, `muted` e `popover` em dezenas de componentes. Mantê-lo e trocar só o que fica direto sobre o fundo limita a mudança ao que a spec pede.
- **Arte**: os 14 SVGs são trabalho de desenho, feito nas tarefas, com revisão visual do usuário antes de fechar (pergunta em aberto da spec: nomes e cores finais). Cada arquivo deve ficar abaixo de ~15 KB.
- **Sem eventos**: como o tema não muda numa partida, nenhuma tela precisa ser avisada.
