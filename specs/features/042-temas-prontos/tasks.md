---
spec: "042"
status: done # todo | in-progress | done
---

# Tarefas — 042 Temas prontos

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0021](../../../docs/adr/0021-temas-catalogo-proprio.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.

## Fechamento (2026-10-27)

- Verificação: `pnpm test` 9/9 tarefas ✅ (web 1549, db 284, api 215, auth 23, core e ui verdes); `pnpm check-types` 8/8 ✅; `pnpm -F web exec tsc --noEmit` limpo; Biome limpo nos arquivos alterados (rodado só neles, com `--line-ending=crlf`). Um `pnpm check` completo foi rodado por engano, reescreveu o repositório em LF e foi desfeito arquivo por arquivo (snapshots antigos das migrations incluídos).
- Banco: migration `0015_themes.sql` (duas `ADD COLUMN ... DEFAULT 'standard' NOT NULL`). No banco local, `drizzle-kit push --force` adicionou as colunas e parou ao tentar recriar chaves primárias compostas (diferença falsa conhecida do drizzle-kit, que falhou por dependência); nada mais mudou.
- E2E: `themes` (novo) e `design-system`, 4 ✅ (desktop e celular). O pódio com tema ficou nos testes de componente (`podium.test.tsx`), não no E2E.
- Conferido num navegador de verdade (T27) com um roteiro do Playwright rodado e apagado: editor com o painel, lobby, pergunta, revelação e pódio em Amarelo claro, Verde-azulado e Lilás (este no celular), mais o `/design-system`.
- **Desvios do plano**:
  - Tokens novos `game-chip` e `game-bar`: as faixas `bg-black/…` herdavam a cor do texto e ficariam ilegíveis num tema claro. Viraram faixas claras com texto escuro nos temas claros; cabeçalho e rodapé continuam escuros (registrado no changelog da spec).
  - A "Aguardando os participantes" usa `game-chip` (faixa clara nos temas claros, como no Kahoot), não o destaque.
  - O editor guarda a escolha em andamento (`pendingTheme`) no componente; a ação `setTheme` resolve `true`/`false` pelo `SaveTracker`. Assim o CA-09 é testado no componente.
  - `ThemeShowcase` (`components/game/theme-showcase.tsx`) é o que o `/design-system` mostra.
- **Testes antigos que mudaram pelas regras desta spec** (nenhum por regressão): objetos inteiros de quiz, partida, sessão, capa, busca por PIN e visões da API ganharam `themeId`; o ⋮ ganhou o item "Temas".
- TDD: domínio, aplicação, banco, API e a maior parte dos componentes tiveram o teste visto falhar antes. Exceções: T05 e T09 já passavam pela T02/T08; o teste do `JoinFlow`, do `AssignmentPlayFlow`, do `EditorSideRail`, do `ThemeShowcase` e o do relatório sem tema (que passa por construção) foram escritos junto com a implementação.
- Fica para depois: `pnpm test:int` não foi rodado (nenhum adapter de serviço externo mudou).

## Fase 1 — Domínio

- [x] **T01** `core/shared` — o catálogo de IDs de tema
  - Teste: `shared/domain/theme.test.ts` › "has 14 themes without repeats, standard first", "isThemeId accepts only catalog ids", "knownThemeId reads an id that left the catalog as standard", "knownThemeId reads null as standard"
  - Implementar: `shared/domain/theme.ts` (`THEME_IDS`, `ThemeId`, `DEFAULT_THEME_ID`, `isThemeId`, `knownThemeId`)
  - Cobre: CA-04 · RN-01, RN-02, RN-04, RN-05

- [x] **T02** `core/quiz` — o quiz tem tema, e a cópia o leva
  - Teste: `quiz/domain/quiz.test.ts` › "a new quiz starts with the standard theme", "parseThemeId rejects an id outside the catalog with QUIZ.UNKNOWN_THEME", "copyQuiz keeps the source's theme"
  - Implementar: `quiz/domain/quiz.ts` (`Quiz.themeId`, `newQuiz`, `copyQuiz`, `parseThemeId`, `UnknownThemeError`); `aQuiz()` com `themeId`
  - Cobre: CA-03, CA-16 · RN-04, RN-05, RN-08

- [x] **T03** `core/game` — a partida e a atribuição guardam o tema `[P]`
  - Teste: `game/domain/game.test.ts` › "a new game keeps the theme it was given"; `game/domain/assignment.test.ts` › "a new assignment keeps the theme it was given"
  - Implementar: `game/domain/game.ts` (`Game.themeId`, `newGame`), `game/domain/assignment.ts` (`newAssignment`); `testing/a-game.ts` com `standard`
  - Cobre: RN-10, RN-11

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T04** `core/quiz` — `setQuizTheme`
  - Teste: `quiz/application/set-quiz-theme.test.ts` › "saves the chosen theme and returns it in the details", "saves the theme of a draft", "keeps the published state and the version of a published quiz", "refuses an unknown theme and saves nothing", "refuses a quiz in the trash", "treats someone else's quiz as missing"
  - Implementar: `set-quiz-theme.ts`; `QuizRepository.saveTheme`; `InMemoryQuizRepository.saveTheme`; `QuizDetailsView.themeId` (`quiz-details-view.ts`)
  - Cobre: CA-03, CA-06, CA-07, CA-08 · RN-05, RN-06, RN-07

- [x] **T05** `core/quiz` — duplicar leva o tema `[P]`
  - Teste: `duplicate-quiz.test.ts` › "the copy has the source's theme"; `duplicate-shared-quiz.test.ts` › "a member's copy has the shared quiz's theme"
  - Implementar: só se faltar algo depois da T02 (`copyQuizContent` passa por `copyQuiz`)
  - Cobre: CA-16 · RN-08

- [x] **T06** `core/game` — a partida ao vivo copia o tema do quiz
  - Teste: `host-game.test.ts` › "the game takes the quiz's theme", "changing the quiz's theme does not change an open game", "the next game takes the new theme"; `get-host-game.test.ts` › "the view carries the game's theme"
  - Implementar: `PlayableQuiz.themeId` (porta e fake), `host-game.ts`, `HostGameView.themeId` (`host-game-view.ts`)
  - Cobre: CA-17, CA-18 · RN-10, RN-11, RN-12, RN-13

- [x] **T07** `core/game` — o jogador recebe o tema depois do PIN `[P]`
  - Teste: `find-game-by-pin.test.ts` › "returns the game's theme with the game"; `get-player-session.test.ts` › "the session carries the game's theme"
  - Implementar: `find-game-by-pin.ts`, `PlayerSessionView.themeId` (`get-player-session.ts`)
  - Cobre: CA-20 · RN-14

- [x] **T08** `core/game` — a atribuição copia o tema e as telas o recebem `[P]`
  - Teste: `create-assignment.test.ts` › "the assignment takes the quiz's theme", "changing the quiz's theme does not change an open assignment"; `get-assignment-cover.test.ts` › "the cover carries the assignment's theme"; `get-assignment-play.test.ts` › "the play view carries the assignment's theme"
  - Implementar: `create-assignment.ts`, `AssignmentLandingRecord.themeId` (porta e fake), `get-assignment-cover.ts`, `AssignmentPlayView.themeId` (`assignment-play-view.ts`)
  - Cobre: CA-22, CA-23 · RN-10, RN-11, RN-15

- [x] **T09** `core/groups` — a atribuição feita no grupo leva o tema
  - Teste: no teste que já liga `GroupAssignments` ao `createAssignment` (container de teste da API, `packages/api/src/routers/group.test.ts` ou equivalente) › "an assignment made in a group has the quiz's theme"
  - Implementar: nada além da T08, se o teste passar; senão, a ligação no `container.ts`
  - Cobre: CA-24 · RN-10

## Fase 3 — Adapters (banco)

- [x] **T10** `db` — colunas e migration
  - Teste: `drizzle-quiz-repository.test.ts` › "a quiz saved without a theme reads standard", "saveTheme writes only the theme and keeps a rename made meanwhile", "a stored id that left the catalog reads standard"; `drizzle-game-repositories.test.ts` › "a game keeps its theme", "a game stored before themes reads standard"
  - Implementar: `schema/quiz.ts` e `schema/game.ts` (`theme_id text not null default 'standard'`); `drizzle-quiz-repository.ts` (`save`, `saveTheme`, leitura com `knownThemeId`); `drizzle-game-repository.ts` (`create`/`save`, leitura); `pnpm db:generate` (commitar a migration) e `pnpm -F @quizio/db db:push` no banco local
  - Cobre: CA-02, CA-04 · RN-04, RN-05

- [x] **T11** `db` — leituras do tema para a partida e a atribuição `[P]`
  - Teste: `drizzle-game-play.test.ts` (ou o teste do `PlayableQuizQuery`) › "find returns the quiz's theme"; `drizzle-assignment-reads.test.ts` › "the landing record carries the assignment's theme"
  - Implementar: `drizzle-playable-quiz-query.ts`, `drizzle-assignment-landing-query.ts`
  - Cobre: CA-17, CA-22 · RN-10

- [x] **T12** `db`/`core` — o tema nas leituras do quiz compartilhado e do público `[P]`
  - Teste: os testes das leituras da página do quiz compartilhado e do perfil público › "the page view carries the quiz's theme"
  - Implementar: a visão dessas páginas ganha `themeId` (para a tela de abertura)
  - Cobre: RN-13

## Fase 4 — API

- [x] **T13** `api` — `quiz.setTheme` e o tema nas respostas
  - Teste: `routers/quiz.test.ts` › "setTheme saves the theme and returns the details", "setTheme answers QUIZ.UNKNOWN_THEME for an id outside the catalog", "setTheme needs a session"; `routers/game.test.ts` › "game.view, join.find and join.session carry the theme"
  - Implementar: `routers/quiz.ts` (`setTheme`: `{ quizId, themeId: z.string().max(64) }`), `container.ts` (`setQuizTheme`)
  - Cobre: CA-03, CA-06, CA-17, CA-20

## Fase 5 — UI (design system → componentes do app → rotas)

- [x] **T14** `web` — contraste pelo WCAG
  - Teste: `apps/web/src/lib/contrast.test.ts` › "white on black has a ratio of 21", "equal colors have a ratio of 1", "picks dark text on a light color", "picks light text on a dark color", "picks the text with the best minimum ratio over several colors"
  - Implementar: `lib/contrast.ts` (`relativeLuminance`, `contrastRatio`, `readableTextOn`)
  - Cobre: CA-05 · RN-19, RN-20

- [x] **T15** `web` — a arte e o catálogo dos 14 temas
  - Teste: `apps/web/src/lib/theme-catalog.test.ts` › "has exactly the core's theme ids", "the groups are Padrão, Cores and Claros with 1, 6 and 7 themes", "every theme has its file in public/themes", "every theme reaches 4.5:1 on its background colors and on its accent", "the Claros themes are light and the Cores themes are dark"
  - Implementar: `apps/web/public/themes/*.svg` (desenho próprio, < ~15 KB cada; `standard` igual ao degradê de hoje), `lib/theme-catalog.ts` (`THEME_CATALOG`, `THEME_GROUPS`, `themeTone`, `themeStyle`)
  - Cobre: CA-01, CA-05, CA-10 · RN-01, RN-02, RN-03, RN-19, RN-20, RN-21

- [x] **T16** `ui` — tokens do jogo e a variante `tile` do `RadioGroupItem`
  - Teste: `packages/ui/src/components/radio-group.test.tsx` › "the tile variant shows the image and the name, with the blue border when checked"
  - Implementar: `globals.css` (`--color-game-fg`, `--color-game-accent`, `--color-game-accent-fg`, com os valores de hoje como padrão); `radio-group.tsx` (`variant: "tile"` no `cva`)
  - Cobre: RN-25, RN-27

- [x] **T17** `web` — `GameScreen` com o tema
  - Teste: `components/game/game-screen.test.tsx` › "without a provider the screen is standard", "the provider's theme sets data-theme and the CSS variables", "a light theme gives dark text over the background", "stays dark for cards and dialogs"
  - Implementar: `lib/game-theme.tsx` (`GameThemeProvider`, `useGameTheme`), `game-screen.tsx` (fundo do tema, `text-game-fg`, `data-theme`; `Wordmark` com `text-game-fg`)
  - Cobre: CA-02, CA-19 · RN-13, RN-17, RN-19, RN-21

- [x] **T18** `web` — inventário do texto sobre o fundo nas telas do anfitrião
  - Teste: `host-lobby.test.tsx` › "nickname cards use the theme's accent", "the waiting strip and the wordmark follow the theme's text color"; `podium.test.tsx` › "podium names and blocks follow the theme"; `scoreboard.test.tsx` › "scoreboard text follows the theme"; `host-stage.test.tsx` › "a question with a background image covers the theme"
  - Implementar: as ocorrências de `text-white`/`bg-card` sobre o fundo em `components/game/host/*` passam para `text-game-fg` / `bg-game-accent text-game-accent-fg`; o que fica sobre superfície fixa (cartão do PIN, enunciado, diálogos) não muda
  - Cobre: CA-17, CA-19, CA-21 · RN-13, RN-16, RN-17

- [x] **T19** `web` — inventário no celular e na atribuição `[P]`
  - Teste: `question-on-device.test.tsx` › "a question with a background image covers the theme"; `player-frame.test.tsx` (ou o teste das telas de espera) › "waiting texts follow the theme"; `assignment-play-flow.test.tsx` › "the flow follows the theme"
  - Implementar: `components/game/player/*`, `components/assignment/*` (mesma regra da T18), incluindo `ConnectionBar`
  - Cobre: CA-20, CA-21, CA-22 · RN-14, RN-15, RN-16

- [x] **T20** `web` — as rotas montam o tema
  - Teste: `join-flow.test.tsx` › "the PIN screen is standard and the nickname screen has the game's theme"; teste da rota/tela da atribuição › "the cover and the game use the assignment's theme"; `opening-game.test.tsx` › "uses the theme it is given, standard otherwise"; um teste da tela do relatório › "a report of a themed game has no game theme"
  - Implementar: `routes/host.$gameId.tsx` (`HostGameView.themeId`), `routes/join*.tsx` (`find` → `session`), `routes/assignment.$gameId.tsx`; `OpeningGame` com `themeId` opcional, passado pela página do quiz, pelo editor e pelas páginas do quiz compartilhado e público (`standard` na biblioteca)
  - Cobre: CA-17, CA-20, CA-22, CA-24, CA-25 · RN-13, RN-14, RN-15, RN-18

- [x] **T21** `web` — `ThemesPanel`
  - Teste: `components/editor/themes-panel.test.tsx` › "shows Seus temas as coming soon and the three groups with their themes", "marks the quiz's theme as checked", "choosing a theme calls onSelect with its id", "the arrow collapses and expands a group", "arrow keys choose Grafite and it is announced as checked", "shows the loading state on the theme being saved", "the X calls onClose"
  - Implementar: `components/editor/themes-panel.tsx`
  - Cobre: CA-01, CA-13, CA-14 · RN-23, RN-24, RN-25, RN-26, RN-27

- [x] **T22** `web` — barra Temas/Propriedades e fundo do editor
  - Teste: `components/editor/editor-side-rail.test.tsx` › "Propriedades starts pressed", "switching to Temas presses it"; `quiz-editor.test.tsx` › "opens Temas and Propriedades in the side panel and closes it with the X", "the canvas shows the quiz's theme", "a light theme gives dark text on the canvas", "a question with a background image covers the theme"
  - Implementar: `editor-side-rail.tsx`, `quiz-editor.tsx` (`openPanel`, `ThemeBackdrop` no centro, textos sobre o fundo com `text-game-fg`), `question-properties-panel.tsx` (`onClose` e o X)
  - Cobre: CA-06, CA-10, CA-11, CA-12 · RN-22, RN-23, RN-29

- [x] **T23** `web` — salvar o tema no editor
  - Teste: `quiz-editor.test.tsx` › "choosing a theme changes the canvas at once and saves it", "a failed save puts the previous theme back and offers Tentar de novo", "Tentar de novo sends the last choice again", "choosing a theme does not show Alterações não salvas"
  - Implementar: `lib/question-mutations.ts` (`setTheme` na fila e no `SaveTracker`, cache otimista, volta ao anterior na falha), `lib/editor-cache.ts` se precisar; invalidar as listagens
  - Cobre: CA-06, CA-07, CA-09 · RN-06, RN-07, RN-26

- [x] **T24** `web` — Temas em telas estreitas
  - Teste: `question-properties-menu.test.tsx` › "Temas opens the themes panel in a sheet", "choosing a theme there saves it"
  - Implementar: `question-properties-menu.tsx` (item "Temas" e o `Sheet` com o `ThemesPanel`)
  - Cobre: CA-15 · RN-28

- [x] **T25** `web` — design system
  - Teste: `routes/design-system` (teste existente da página) › "shows the themes section with every theme and its contrast"
  - Implementar: seção "Temas" no `/design-system` (miniaturas, tom, razões; lobby e pódio de exemplo num tema claro); `docs/design-system.md` (tokens `game-*`, variante `tile` do `RadioGroup`, temas)
  - Cobre: RN-20, RN-21

## Fase 6 — E2E e fechamento

- [x] **T26** E2E — tema do editor ao celular
  - Teste: `apps/web/e2e/themes.spec.ts` › "a theme chosen in the editor reaches the lobby, the player's phone and the podium" (desktop: escolhe "Azul claro", organiza ao vivo, um jogador entra; confere `data-theme` no lobby, no celular depois do PIN e no pódio, e `standard` na tela do PIN); "chooses a theme from the ⋮ on a phone" (projeto mobile, sem rolagem horizontal)
  - Cobre: CA-06, CA-15, CA-17, CA-20

- [x] **T27** Revisão visual
  - Conferir num navegador, em celular e tela larga, os 14 temas no editor, no lobby com jogadores, numa pergunta, no placar e no pódio, e um tema claro no celular e na atribuição. Mostrar ao usuário para decidir nomes e cores finais (pergunta em aberto da spec) e ajustar os SVGs.
  - Cobre: RN-03, RN-21

- [x] **T28** Fechamento
  - `pnpm check`, `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, `pnpm test:e2e` (themes e as specs de jogo, editor e atribuição); `pnpm test:int` só se um adapter de serviço externo mudar
  - Spec `done` com changelog (resolver a pergunta em aberto), glossário (temas para ✅), roadmap (042 ✅), ADR 0021 aceito, `CLAUDE.md` (parágrafo de temas), `docs/design-system.md`

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T15, T21 |
| CA-02 | T10, T17 |
| CA-03 | T02, T04, T13 |
| CA-04 | T01, T10 |
| CA-05 | T14, T15 |
| CA-06 | T04, T13, T22, T23, T26 |
| CA-07 | T04, T23 |
| CA-08 | T04 |
| CA-09 | T23 |
| CA-10 | T15, T22 |
| CA-11 | T22 |
| CA-12 | T22 |
| CA-13 | T21 |
| CA-14 | T21 |
| CA-15 | T24, T26 |
| CA-16 | T02, T05 |
| CA-17 | T06, T11, T13, T18, T20, T26 |
| CA-18 | T06 |
| CA-19 | T17, T18 |
| CA-20 | T07, T13, T19, T20, T26 |
| CA-21 | T18, T19 |
| CA-22 | T08, T11, T19, T20 |
| CA-23 | T08 |
| CA-24 | T09, T20 |
| CA-25 | T20 |

Todos os 25 critérios aparecem em ao menos uma tarefa.
