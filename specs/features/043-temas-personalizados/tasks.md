---
spec: "043"
status: done # todo | in-progress | done
---

# Tarefas — 043 Temas personalizados

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0022](../../../docs/adr/0022-temas-personalizados.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.
>
> Teste de integração: nenhum adapter novo fala com um serviço externo. O storage não muda, e os repositórios novos são testados com PGlite, como os outros. Por isso não há `*.int.test.ts` novo.

## Fase 1 — Domínio

- [x] **T01** `core/shared` — contraste no shared kernel
  - Teste: `shared/domain/contrast.test.ts` › "isLegibleColor is true when light or dark text reaches 4.5:1", "a mid gray that reaches neither is not legible", mais os casos que hoje estão em `apps/web/src/lib/contrast.test.ts`, movidos para cá
  - Implementar: `shared/domain/contrast.ts` (movido de `apps/web/src/lib/contrast.ts`) e `ThemeTone` em `shared/domain/theme.ts`. `apps/web/src/lib/contrast.ts` passa a reexportar, e `theme-catalog.ts` importa o `ThemeTone` do core
  - Cobre: CA-08 · RN-10, RN-11

- [x] **T02** [P] `core/shared` — aparência do tema
  - Teste: `shared/domain/theme-look.test.ts`
    - "parseHexColor takes #RRGGBB and stores it in lower case"
    - "parseHexColor refuses #12345, names and missing #"
    - "themeLookFileKeys lists the image and the logo"
    - "readThemeLook reads a stored look and gives null for an unknown shape or pattern"
  - Implementar: `shared/domain/theme-look.ts`, com `BACKGROUND_PATTERN_IDS`, `ThemeLook`, `HexColor`, `parseHexColor`, `isBackgroundPatternId`, `themeLookFileKeys` e `readThemeLook`
  - Cobre: CA-09 · RN-04, RN-05, RN-06

- [x] **T03** [P] `core/shared` — chaves dos arquivos de tema
  - Teste: `shared/domain/media-key.test.ts`
    - "a theme file lives under themes/{owner}/"
    - "isThemeFileKeyOwnedBy refuses another owner and nested paths"
  - Implementar: `themeFileKeyFor`, `isThemeFileKeyOwnedBy` e `themesPrefixOf` em `shared/domain/media-key.ts`
  - Cobre: RN-28, RN-30

- [x] **T04** `core/themes` — o agregado `CustomTheme`
  - Teste: `themes/domain/custom-theme.test.ts`
    - "a name has 1 to 30 characters, trimmed"
    - "refuses an unknown pattern"
    - "refuses an illegible background or accent color"
    - "an image background needs its tone"
    - "requireOwnedTheme hides someone else's theme as not found"
  - Implementar: `themes/domain/custom-theme.ts` (`CustomTheme`, `parseThemeName`, `parseThemeLookInput`, `requireOwnedTheme`, `DEFAULT_THEME_NAME`) e `themes/domain/theme-errors.ts` (`THEME.NOT_FOUND`, `INVALID_NAME`, `INVALID_COLOR`, `ILLEGIBLE_COLOR`, `UNKNOWN_PATTERN`, `UPLOAD_NOT_FOUND`)
  - Cobre: CA-07, CA-08, CA-17 · RN-02, RN-03, RN-11, RN-21

- [x] **T05** `core/quiz` e `core/game` — o quiz aponta para o tema e a partida copia a aparência
  - Teste:
    - `quiz/domain/quiz.test.ts`: "a quiz starts with no custom theme"; "copyQuiz keeps the custom theme only when asked"
    - `game/domain/game.test.ts` e `assignment.test.ts`: "a new game copies the custom look"
  - Implementar:
    - `Quiz.customThemeId` e `QuizThemeChoice`, e `copyQuiz(source, { keepCustomTheme })`
    - `Game.customTheme` em `newGame`/`newAssignment`
    - `aQuiz`, `aGame` e `aPlayableQuiz` com os valores nulos
  - Cobre: CA-20 · RN-24, RN-27

## Fase 2 — Aplicação (casos de uso, portas e fakes)

- [x] **T06** `core/themes` — portas e fakes
  - Teste: `themes/testing/in-memory-custom-theme-repository.test.ts`
    - "createTakingUploads refuses when an upload is missing and writes nothing"
    - "listByOwner counts the quizzes using each theme"
    - "deleting a theme sets its quizzes back to standard"
    - O fake recebe um registro de quizzes, para imitar a chave estrangeira com `SET NULL`
  - Implementar:
    - `themes/application/ports/*`: `CustomThemeRepository`, `ThemeUploadRepository`, `ThemeFileUsage`
    - `quiz/application/ports/custom-theme-reads.ts`
    - `themes/testing/*` e `aCustomTheme()`
  - Cobre: RN-19, RN-29

- [x] **T07** `core/themes` — pedir e descartar um envio
  - Teste:
    - `request-theme-upload.test.ts`: "refuses another type or more than 10 MB"; "records a pending upload under themes/{owner}/"; "sweeps up to 20 uploads older than 24 h and deletes their files"
    - `discard-theme-upload.test.ts`: "removes the owner's pending upload and its file"; "ignores someone else's key"
  - Implementar: `createRequestThemeUpload`, `createDiscardThemeUpload`
  - Cobre: CA-06, CA-10 · RN-07, RN-29

- [x] **T08** `core/themes` — criar
  - Teste: `create-custom-theme.test.ts`
    - "creates a pattern theme"
    - "creates an image theme with a logo and takes the uploads"
    - "refuses a key that is not the owner's pending upload or is missing from storage (THEME.UPLOAD_NOT_FOUND)"
    - "refuses an illegible color before writing"
  - Implementar: `createCreateCustomTheme`
  - Cobre: CA-02, CA-04, CA-08 · RN-02 a RN-07, RN-11

- [x] **T09** `core/themes` — editar
  - Teste: `update-custom-theme.test.ts`
    - "changes the look and the name"
    - "keeps an unchanged file and takes a new upload"
    - "deletes the replaced image nobody copied"
    - "keeps a file a game copied"
    - "someone else's theme is THEME.NOT_FOUND"
  - Implementar: `createUpdateCustomTheme`, com a liberação de arquivos em `themes/application/theme-files.ts` (`releaseUnusedThemeFiles`, com melhor esforço)
  - Cobre: CA-13, CA-14, CA-17, CA-21 · RN-17, RN-18, RN-28

- [x] **T10** `core/themes` — excluir e listar
  - Teste:
    - `delete-custom-theme.test.ts`: "deletes the theme and its unused files"; "keeps the files an open assignment copied"; "someone else's is NOT_FOUND"
    - `list-custom-themes.test.ts`: "only the owner's, newest first, with quizCount and URLs"
  - Implementar: `createDeleteCustomTheme`, `createListCustomThemes` e `shared/application/theme-look-view.ts` (`themeLookView`, `withLogo`)
  - Cobre: CA-15, CA-17, CA-22 · RN-16, RN-19, RN-28

- [x] **T11** `core/quiz` — aplicar um tema personalizado
  - Teste: `set-quiz-theme.test.ts`
    - "applies an own custom theme and resets the catalog id to standard"
    - "choosing a catalog theme clears the custom theme"
    - "someone else's or a deleted theme is THEME.NOT_FOUND"
    - "does not mark unpublished changes"
  - Implementar: `createSetQuizTheme` com `QuizThemeChoice` e `CustomThemeReads`, e `QuizRepository.saveTheme` com as duas colunas
  - Cobre: CA-12, CA-16 · RN-16, RN-20, RN-21, RN-23

- [x] **T12** `core/quiz` — o editor recebe a aparência, e duplicar decide o tema
  - Teste:
    - `get-quiz-editor.test.ts` e `get-quiz-details.test.ts`: "carries the custom look with URLs"
    - `duplicate-quiz.test.ts`: "a copy of one's own quiz keeps the custom theme"
    - `duplicate-shared-quiz.test.ts`: "a copy of someone else's quiz starts with standard"
  - Implementar:
    - `loadQuizDetailsView` e `getQuizEditor` com `customTheme`. O porto de leitura devolve a aparência ou um `CustomThemeReads.lookOf`
    - `duplicateQuiz` e `duplicateSharedQuiz`
  - Cobre: CA-02, CA-20 · RN-22, RN-27

- [x] **T13** `core/game` — a partida copia, e as visões levam a aparência
  - Teste:
    - `host-game.test.ts` e `create-assignment.test.ts`: "copies the quiz's custom look"; "a shared quiz copies its owner's look"; "the game keeps the look it copied"
    - `host-game-view.test.ts`: "the host's view has the logo URL"
    - `get-player-session.test.ts`, `find-game-by-pin.test.ts`, `get-assignment-cover.test.ts` e `assignment-play-view.test.ts`: "has the look without the logo"
  - Implementar:
    - `PlayableQuiz.customTheme`, `AssignmentLandingRecord.customTheme` e seus fakes
    - `customTheme: ThemeLookView | null` nas visões
  - Cobre: CA-05, CA-14, CA-19 · RN-22, RN-24, RN-25, RN-26

- [x] **T14** [P] `core/groups` e `core/library` — páginas do quiz compartilhado e do quiz público
  - Teste: `get-shared-quiz.test.ts` e `get-public-quiz.test.ts`: "carries the owner's custom look without the logo"
  - Implementar: `SharedQuizDetail`/`PublicQuizDetail` e as visões com `customTheme`
  - Cobre: RN-22, RN-25

- [x] **T15** [P] `core/identity` — excluir a conta apaga os temas
  - Teste: `delete-account.test.ts`: "deletes the themes prefix"
  - Implementar: `deletePrefix(themesPrefixOf(userId))` em `deleteAccount`
  - Cobre: CA-23 · RN-30

## Fase 3 — Adapters

- [x] **T16** `packages/db` — schema e migration
  - Teste: `schema/themes.test.ts` (PGlite)
    - "deleting a custom theme sets quiz.custom_theme_id to null"
    - "deleting the user deletes their themes and pending uploads"
  - Implementar:
    - `schema/themes.ts`: `custom_theme` e `theme_upload`
    - `quiz.custom_theme_id` e `game.custom_theme`
    - `pnpm db:generate` → `0016_custom_themes.sql` (snapshot com 2 espaços, entrada no `_journal.json`)
    - Aplicar no banco local com `ALTER TABLE`/`CREATE TABLE` à mão (nota do `drizzle-kit push`)
  - Cobre: CA-15, CA-23 · RN-19, RN-30

- [x] **T17** `packages/db` — repositórios dos temas
  - Teste:
    - `drizzle-custom-theme-repository.test.ts`: "creates taking the uploads in one transaction"; "rolls back when an upload is missing"; "lists the owner's newest first with quizCount"; "updates and deletes"
    - `drizzle-theme-upload-repository.test.ts`: "takes the expired uploads once"
  - Implementar: `drizzle-custom-theme-repository.ts` (também `CustomThemeReads`) e `drizzle-theme-upload-repository.ts`
  - Cobre: CA-02, CA-10, CA-15 · RN-16, RN-19, RN-29

- [x] **T18** `packages/db` — arquivos em uso pelas partidas
  - Teste: `drizzle-theme-file-usage.test.ts`: "finds the image and logo keys a game copied"; "ignores games with no custom look"
  - Implementar: `drizzle-theme-file-usage.ts`
  - Cobre: CA-22 · RN-28

- [x] **T19** `packages/db` — leituras com a aparência
  - Teste:
    - `drizzle-quiz-repository.test.ts`: "saveTheme writes both columns"
    - `drizzle-game-repository.test.ts`: "stores and reads the copied look"
    - `drizzle-playable-quiz-query.test.ts`: "joins the current custom look"
    - Também `drizzle-assignment-landing-query`, `drizzle-shared-quiz-reads` e `drizzle-creator-profile-query`: "return the custom look"
  - Implementar: os adapters alterados, com `LEFT JOIN custom_theme` e `readThemeLook`
  - Cobre: CA-13, CA-14, CA-19 · RN-18, RN-24, RN-25

## Fase 4 — API

- [x] **T20** `packages/api` — router `theme` e `quiz.setTheme`
  - Teste:
    - `routers/theme.test.ts`: "create, list, update and delete through the router"; "a visitor gets UNAUTHORIZED"; "someone else's theme is NOT_FOUND with data.domainCode THEME.NOT_FOUND"
    - `routers/quiz.test.ts`: "setTheme takes a catalog or a custom choice"
  - Implementar:
    - `routers/theme.ts` e `routers/index.ts`
    - O `zod` do `look` com `BACKGROUND_PATTERN_IDS`
    - `container.ts` e `composition-root.ts`
    - `testing/test-context.ts` com os fakes
  - Cobre: CA-16, CA-17 · RN-21

## Fase 5 — UI

- [x] **T21** `apps/web` — tema mostrado e estilo
  - Teste: `lib/theme-catalog.test.ts`
    - "a pattern look gives the color base, the pattern art and readable text"
    - "an image look puts the image behind and takes its tone"
    - "a light image gives light strips with dark text"
    - "a catalog theme is unchanged"
  - Implementar:
    - `ShownTheme`, `shownTheme()` e `themeStyle(shown)`
    - `public/themes/patterns/{waves,peaks,rings,tiles}.svg` (formas translúcidas, gerados pelo script do scratchpad)
    - Mostrar os 4 padrões no `theme-showcase`
  - Cobre: CA-04, CA-11 · RN-05, RN-08, RN-10, RN-12

- [x] **T22** `apps/web` — telas de jogo com o tema personalizado e o logotipo
  - Teste:
    - `game-screen.test.tsx`: "draws a custom look"
    - `game-brand.test.tsx`: "shows the whole logo when there is one, else the Quizio name"
    - `host-lobby.test.tsx` e `podium.test.tsx`: "the logo replaces the name"
    - `join-flow.test.tsx` e `assignment-play-flow.test.tsx`: "the game's custom look shows after the PIN"
  - Implementar:
    - `GameThemeProvider`/`useGameTheme` com `ShownTheme` e `logoUrl`
    - `components/game/game-brand.tsx`
    - As rotas e os fluxos: `host.$gameId`, `JoinFlow`, `AssignmentPlayFlow`, `OpeningGame`, `SharedQuizPage` e a página pública
  - Cobre: CA-05, CA-19 · RN-09, RN-22, RN-26

- [x] **T23** [P] `apps/web` — paleta, padrões e cores
  - Teste:
    - `lib/theme-palette.test.ts`: "the 12 colors are legible and named"
    - `theme-color-picker.test.tsx`: "picks a palette color"; "takes a typed #RRGGBB"; "keeps the color on an invalid code and says the format"
    - `pattern-picker.test.tsx`: "picks a pattern with the keyboard"
  - Implementar: `lib/theme-palette.ts`, `components/editor/themes/theme-color-picker.tsx` e `pattern-picker.tsx`
  - Cobre: CA-09, CA-25 · RN-05, RN-06

- [x] **T24** [P] `apps/web` — envio de arquivo e tom da imagem
  - Teste:
    - `lib/image-tone.test.ts`: "a mostly white image is light, a dark one is dark" (canvas falso)
    - `theme-file-field.test.tsx`: "refuses a PDF or 12 MB before sending"; "shows the progress and the thumbnail"; "Remover clears it"
  - Implementar: `lib/image-tone.ts`, `components/editor/themes/theme-file-field.tsx`
  - Cobre: CA-04, CA-06, CA-11 · RN-07, RN-09, RN-12

- [x] **T25** `apps/web` — o formulário do "Crie seu tema"
  - Teste: `lib/custom-theme-form.test.ts`
    - "starts with Meu tema, the first pattern, Quizio's purple and blue"
    - "Salvar is off with an empty name or an illegible color"
    - "knows when something changed"
    - "tracks the uploads to discard"
  - Implementar: `lib/custom-theme-form.ts` (reducer puro)
  - Cobre: CA-07, CA-08, CA-10 · RN-03, RN-05, RN-06, RN-11, RN-15

- [x] **T26** `apps/web` — prévia em três telas
  - Teste: `theme-preview.test.tsx`
    - "shows the lobby, a question and the podium in the look"
    - "the accent color follows the form"
    - "on a narrow screen, tabs pick one screen"
  - Implementar: `components/editor/themes/theme-preview.tsx`
  - Cobre: CA-03, CA-24 · RN-14

- [x] **T27** `apps/web` — o diálogo "Crie seu tema" / "Editar tema"
  - Teste: `custom-theme-dialog.test.tsx`
    - "creates a theme and applies it to the quiz"
    - "Editar opens with the theme's values"
    - "Cancelar asks Descartar este tema? and discards the uploads"
    - "a failed save keeps the dialog with the message"
    - "is filled and saved with the keyboard"
  - Implementar: `components/editor/themes/custom-theme-dialog.tsx` e `lib/theme-mutations.ts`
  - Cobre: CA-02, CA-10, CA-18, CA-25 · RN-13, RN-15, RN-17

- [x] **T28** `apps/web` — "Seus temas" no painel e no editor
  - Teste:
    - `themes-panel.test.tsx`: "the plus opens Crie seu tema, without Em breve"; "lists the creator's themes, one radio group with the catalog"; "the ⋮ has Editar and Excluir"
    - `delete-custom-theme-dialog.test.tsx`: "says how many quizzes go back to standard"
    - `quiz-editor.test.tsx`: "choosing a custom theme shows it at once and saves it"; "a deleted theme leaves the quiz on standard after reload"
  - Implementar:
    - Mover `themes-panel.tsx` e `themes-sheet.tsx` para `components/editor/themes/`
    - "Seus temas", `delete-custom-theme-dialog.tsx`, `actions.setTheme(choice)` e `pendingTheme` como `ShownTheme`
    - O `theme.list` na rota do editor
  - Cobre: CA-01, CA-12, CA-13, CA-15 · RN-13, RN-16, RN-17, RN-19, RN-20

## Fase 6 — E2E e fechamento

- [x] **T29** E2E `apps/web/e2e/custom-themes.spec.ts` (desktop e mobile)
  - No desktop:
    - Criar um tema com padrão e cores, salvar e conferir o fundo no editor e depois do recarregamento.
    - Organizar ao vivo e conferir o fundo no lobby.
    - Editar a cor de contraste e conferir a próxima partida.
    - Excluir o tema e conferir que o quiz volta a Padrão.
  - No mobile: abrir "Crie seu tema", trocar as abas da prévia e conferir que não há rolagem horizontal.
  - Cobre: CA-02, CA-13, CA-15, CA-24

- [x] **T30** Fechamento
  - `pnpm check` (Biome só nos arquivos alterados, com `--line-ending=crlf`), `pnpm test`, `pnpm check-types` e `pnpm -F web exec tsc --noEmit`
  - `pnpm test:e2e` para `custom-themes`, `themes` e `design-system`
  - Conferir no navegador temas com padrão claro e escuro, imagem clara e escura, e o logotipo no lobby, no placar e no pódio
  - Atualizar `spec.md` (status `done`, changelog), `glossary.md` (📝 → ✅), `roadmap.md`, `docs/design-system.md` (padrões, paleta e `GameBrand`), `CLAUDE.md` (parágrafo de temas personalizados) e a ADR 0022 (aceita)

## Revisão do layout (2026-10-28, pedido do usuário)

A partir das capturas do "Crie seu tema" do Kahoot, depois de entregue. Sem spec nova: o comportamento é o mesmo, com o recorte e o seletor de cor acrescentados (changelog da spec).

- [x] **T31** `packages/ui` — `ColorPicker` e a matemática de cor
  - Teste: `lib/color.test.ts` (HSV ↔ hex, código de 3 ou 6 dígitos) e `components/color-picker.test.tsx` (código digitado, barra de matiz, setas no quadrado, Cancelar, código incompleto)
  - Cobre: RN-06
- [x] **T32** `apps/web` — biblioteca de 48 cores e "Cores personalizadas"
  - Teste: `lib/theme-palette.test.ts` (6 × 8, todas legíveis) e `lib/custom-colors.test.ts` (primeira e única, as últimas 8, armazenamento bloqueado)
  - Implementar: `lib/theme-palette.ts`, `lib/custom-colors.ts`, `components/editor/themes/color-library.tsx`
  - Cobre: RN-06, RN-11
- [x] **T33** `apps/web` — recorte de imagem
  - Teste: `lib/theme-image-crop.test.ts` (parte da imagem no quadro 16:9 e quadrado, zoom) e `image-crop-dialog.test.tsx` (Paisagem por padrão, Quadrado e zoom no Salvar, só Paisagem para o fundo, Fechar)
  - Cobre: RN-07
- [x] **T34** `apps/web` — prévia em notebook e celular com pontos
  - Teste: `theme-preview.test.tsx` (lobby primeiro, os pontos trocam, cor de contraste, logotipo só no anfitrião)
  - Cobre: RN-14, RN-26
- [x] **T35** `apps/web` — "Crie seu tema" com o cartão de linhas e painéis flutuantes
  - Teste: `custom-theme-dialog.test.tsx` (criar, a aba Cor do fundo, cor do seletor lembrada, cor ilegível recusada, logotipo recortado e enviado, arquivo recusado, imagem de fundo recortada com o tom, a prévia vai ao lobby na cor de contraste, Editar, Cancelar e descartar, falha ao salvar, teclado)
  - Removidos: `theme-color-picker.tsx` e `theme-file-field.tsx`, substituídos pelos painéis
  - Ajustes vistos no navegador: o recorte fica dentro do diálogo (aninhado, para não fechar sozinho), Esc com um painel aberto fecha só o painel, o rodapé fica visível no celular
  - E2E `custom-themes.spec.ts` atualizado para os painéis
  - Cobre: RN-06, RN-07, RN-11, RN-13, RN-14, CA-02, CA-03, CA-06, CA-08, CA-10, CA-18, CA-24, CA-25

## Fechamento (2026-10-28)

### Desvios do plano

- **Duplicar decide pelo dono, no domínio.** O plano previa uma opção `keepCustomTheme` em `copyQuiz`. A regra ficou dentro dele: a cópia para o mesmo dono mantém o tema, e a cópia para outra pessoa nasce com Padrão (RN-27). Nenhum chamador precisa saber disso.
- **`THEME.NOT_FOUND` mora no shared kernel** (`shared/domain/theme.ts`). O `quiz` recusa o tema alheio ao aplicar e o `themes` ao editar, e um contexto não importa o outro. O `themes/domain/theme-errors.ts` reexporta o erro.
- **O contraste foi movido, não reexportado.** A web importa direto de `@quizio/core/shared/domain/contrast`, e o `lib/contrast.ts` saiu.
- **O logotipo entra no `Wordmark`, sem um `GameBrand` novo.** Com logotipo no tema, o nome do Quizio vira o logotipo, onde quer que o nome esteja nas telas do anfitrião: lobby, cabeçalho durante a partida (com o placar) e pódio. As visões do jogador não recebem a URL, então o celular continua com o nome (RN-26).
- **`quiz.get` também traz `customTheme`** (para a tela de abertura vinda da página do quiz). O tipo `QuizDetailsData` da web passou a ser os detalhes sem esse campo, comum a todos os procedimentos.
- **O `QuizEditorView` traz `customTheme` também no "Descartar".** O `discardQuizChanges` devolve a mesma visão, e sem o campo o editor perderia o tema ao descartar.
- **`ThemesPanel` e `ThemesSheet` continuam em `components/editor/`.** Mudá-los de pasta só mexeria em imports. Os componentes novos estão em `components/editor/themes/`.
- **As abas da prévia no celular são botões com `aria-pressed`.** O design system não tem `Tabs`, só `TabNav`, que é feito de links.
- **Excluir o tema chama `deleteTheme`, e a lista e o editor são consultados de novo.** O quiz volta a Padrão pela chave estrangeira, sem otimismo no cliente.
- **Os padrões não entraram no `/design-system`.** A vitrine continua só com os temas prontos. Os padrões aparecem no "Crie seu tema" e foram conferidos ali.

### Verificação

- `pnpm test`: 9 de 9 pacotes verdes (core 1799, db 304, api 222, web 1604, auth 23).
- `pnpm check-types` 8/8 e `pnpm -F web exec tsc --noEmit` sem erros. Biome rodado só nos arquivos alterados (`--line-ending=crlf`).
- E2E `custom-themes` e `themes` verdes no desktop e no celular. No celular, a primeira rodada falhou porque o painel de temas é modal e esconde o "Salvo" do cabeçalho; o teste agora fecha o painel antes (o E2E da spec 042 já fazia o mesmo).
- Conferido no navegador: "Seus temas" sem "Em breve", o "Crie seu tema" com a prévia, um fundo claro deixando o texto escuro, e "Descartar este tema?" ao cancelar.
- Migration `0016_custom_themes` aplicada à mão no banco local (`psql`).
- `pnpm test:int` não rodado: nenhum adapter de serviço externo mudou.

### Exceções ao TDD

- Os fakes (`InMemoryThemeStore`, `InMemoryThemeFileUsage`) foram escritos junto com o teste deles.
- Os testes de duplicar (T12) e de `saveTheme` com as duas colunas (T19) já passaram na primeira execução. O comportamento tinha vindo de T05 e T16, cujos testes falharam antes.

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T28 |
| CA-02 | T08, T12, T17, T27, T29 |
| CA-03 | T26 |
| CA-04 | T08, T21, T24 |
| CA-05 | T13, T22 |
| CA-06 | T07, T24 |
| CA-07 | T04, T25 |
| CA-08 | T01, T04, T08, T25 |
| CA-09 | T02, T23 |
| CA-10 | T07, T17, T25, T27 |
| CA-11 | T21, T24 |
| CA-12 | T11, T28 |
| CA-13 | T09, T19, T28, T29 |
| CA-14 | T09, T13, T19 |
| CA-15 | T10, T16, T17, T28, T29 |
| CA-16 | T11, T20 |
| CA-17 | T04, T09, T10, T20 |
| CA-18 | T27 |
| CA-19 | T13, T19, T22 |
| CA-20 | T05, T12 |
| CA-21 | T09 |
| CA-22 | T10, T18 |
| CA-23 | T15, T16 |
| CA-24 | T26, T29 |
| CA-25 | T23, T27 |

Os 25 critérios de aceite estão cobertos.
