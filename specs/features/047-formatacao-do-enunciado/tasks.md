---
spec: "047"
status: done # todo | in-progress | done
---

# Tarefas — 047 Formatação do enunciado

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0025](../../../docs/adr/0025-texto-formatado.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.
>
> Teste de integração: nenhum adapter que fala com um serviço externo muda. A coluna nova e as leituras dos `jsonb` são testadas com PGlite, como os outros repositórios, por isso não há `*.int.test.ts` novo.

## Fase 1 — Domínio

- [x] **T01** `core/shared` — o valor `TextFormatting`
  - Teste: `shared/domain/text-formatting.test.ts`
    - "textFormattingIssue accepts ranges inside the text and no mark"
    - "textFormattingIssue reports an unknown mark, a reversed, empty or outside range and a non-integer"
    - "normalize sorts, merges touching and overlapping ranges and drops empty lists"
    - "normalize moves the edges to grapheme boundaries, never splitting an emoji or an accent"
    - "bold and italic may cover the same range"
    - "overlapsSubAndSuper is true only when a subscript crosses a superscript"
    - "trimFormattedText shifts the ranges by the spaces cut at the start and clips the end"
    - "readTextFormatting gives no formatting for a null text, a bad shape or ranges past the text"
    - "sameTextFormatting compares normalized values"
    - "copyTextFormatting is deep"
    - "formattedSegments splits the text at every edge with the marks of each piece"
  - Implementar: `shared/domain/text-formatting.ts` (`TEXT_MARKS`, `TextMark`, `TextRange`, `TextFormatting`, `NO_FORMATTING`, `FormattedSegment`, `textFormattingIssue`, `normalizeTextFormatting`, `overlapsSubAndSuper`, `trimFormattedText`, `readTextFormatting`, `sameTextFormatting`, `copyTextFormatting`, `formattedSegments`)
  - Cobre: CA-04, CA-06, CA-27 · RN-03, RN-04, RN-10, RN-22

- [x] **T02** `core/quiz` — o enunciado com formatação na pergunta
  - Teste: `quiz/domain/question.test.ts`
    - "parseQuestionStatement keeps a bold range"
    - "trims the text and shifts its ranges"
    - "a blank text has no formatting"
    - "the limit counts the text, not the formatting" (160 caracteres com trechos marcados passam; 161 dão `QuestionTextTooLongError`)
    - "refuses a range outside the text with InvalidTextFormattingError"
    - "refuses subscript overlapping superscript"
    - "blankQuestion has no formatting"
    - "copyQuestion copies the formatting deeply"
  - Implementar: `QuestionBase.textFormatting`, `parseQuestionStatement`, `parseQuestionText` sobre ela, `InvalidTextFormattingError` (`QUIZ.INVALID_TEXT_FORMATTING`), `blankQuestion`, `copyQuestion`; `quiz/testing/a-question.ts` aceita `textFormatting`; os construtores de teste de outros contextos que montam `Question` (`groups/testing/in-memory-shared-quiz-reads.ts`, `quiz/testing/in-memory-question-generator.ts`) com `NO_FORMATTING`
  - Cobre: CA-02, CA-06, CA-09, CA-20, CA-32 · RN-04, RN-07, RN-08, RN-10, RN-18, RN-20

- [x] **T03** `core/quiz` — a mudança `text` leva a formatação
  - Teste: `quiz/domain/question-change.test.ts`
    - "a text change saves the text and its formatting"
    - "a text change without marks clears the formatting"
    - "a type change keeps the formatting"
  - Implementar: `QuestionChange` `{ kind: "text"; text; formatting }` aplicada com `parseQuestionStatement`; `changeType` copia `textFormatting`
  - Cobre: CA-02, CA-20 · RN-18, RN-20

- [x] **T04** `core/quiz` — rascunhos e patches dos agentes
  - Teste:
    - `quiz/domain/question-draft.test.ts`: "a draft keeps its formatting"; "a draft without formatting has none"
    - `quiz/domain/question-patch.test.ts`: "a patch with a text replaces the formatting with the one sent"; "a patch without a text keeps text and formatting"
    - `quiz/domain/accept-generated.test.ts`: "a generated question has no formatting"
  - Implementar: `QuestionDraft.textFormatting?`, `buildQuestion` com `parseQuestionStatement`; `draftOf`, `draftForType` e `patchedQuestion`; `accept-generated.ts` com `NO_FORMATTING`
  - Cobre: CA-30 · RN-29

- [x] **T05** `core/quiz` — a versão jogável compara e lê a formatação
  - Teste: `quiz/domain/quiz-version.test.ts`
    - "a formatting change makes the lists differ"
    - "the same formatting written in another order is the same"
    - "parseVersionQuestions reads the formatting and leaves it out of the content"
    - "a stored version without the field reads without formatting"
  - Implementar: `sameQuestionLists` com `sameTextFormatting`; `parseVersionQuestions` tira `textFormatting` antes do `parseStoredContent` e o lê com `readTextFormatting`
  - Cobre: CA-19, CA-27 · RN-19, RN-22

- [x] **T06** [P] `core/game` — a cópia da pergunta e o palco público
  - Teste:
    - `game/domain/game-question.test.ts`: "toGameQuestion copies the formatting"; "parseStoredGameQuestion reads a copy without formatting"
    - `game/domain/public-stage.test.ts`: "carries the formatting with the statement"; "no statement, no formatting"
  - Implementar: `GameQuestion.textFormatting`, `toGameQuestion`, `parseStoredGameQuestion`; `PublicStage.question.textFormatting` em `publicStageOf`; `game/testing/a-game-question.ts`
  - Cobre: CA-22, CA-23 · RN-21, RN-25

- [x] **T07** [P] `core/reports` — a pergunta do relatório
  - Teste: `reports/application/report-view.test.ts` › "a question row carries the formatting"
  - Implementar: `ReportQuestion.textFormatting`; `QuestionRowView` (`questionRow`); `testing/in-memory-report-store.ts` (cópia profunda) e `a-report-game.ts`
  - Cobre: CA-25 · RN-25

## Fase 2 — Aplicação (casos de uso)

- [x] **T08** `core/quiz` — editar, salvar, descartar e copiar
  - Teste:
    - `update-question.test.ts`: "saves the text and its formatting"; "a formatting change alone marks unpublished changes"
    - `discard-quiz-changes.test.ts`: "brings back the saved formatting"
    - `duplicate-question.test.ts`, `duplicate-quiz.test.ts` e `duplicate-shared-quiz.test.ts`: "the copy keeps the formatting"
    - `get-quiz-editor.test.ts` (ou o teste da visão do editor): "publishedQuestions carry the formatting"
  - Implementar: só o que os testes pedirem; os casos de uso já passam por `applyQuestionChange`, `copyQuestion` e `sameQuestionLists`
  - Cobre: CA-02, CA-19, CA-20 · RN-18, RN-19, RN-20

- [x] **T09** `core/game` — visões e cópias da partida e da atividade
  - Teste:
    - `start-game.test.ts`: "a game takes the formatting of the playable version"; "a later edit does not reach the copy"
    - `create-assignment.test.ts`: "an assignment copies the formatting"; "a later edit does not reach it"
    - `host-game-view.test.ts`: "the host's question carries the formatting"
    - `get-player-session.test.ts`: "the device gets the formatting only with the statement"
    - `assignment-play-view.test.ts`: "the question and the result carry the formatting"
  - Implementar: `HostQuestionView` (`toQuestionView`), `PlayQuestionView` (`questionView`, reaproveitado por `resultView`)
  - Cobre: CA-19, CA-21, CA-22, CA-23, CA-24 · RN-21, RN-25

- [x] **T10** [P] `core/reports` — leituras do relatório
  - Teste:
    - `get-report.test.ts`: "the hardest question carries the formatting"
    - `get-report-question.test.ts`: "the detail carries the formatting"
    - `get-report-participant.test.ts`: "each answer row carries the statement's formatting"
  - Implementar: `HardestQuestionView`, `QuestionDetailView` (já estendem `QuestionRowView`) e `ParticipantAnswerView.textFormatting`
  - Cobre: CA-25 · RN-25

## Fase 3 — Adapters

- [x] **T11** `packages/db` — coluna `question.text_formatting`
  - Teste: `repositories/quiz/drizzle-question-repository.test.ts`
    - "round-trips text_formatting"
    - "a row written before reads without formatting" (insert sem a coluna; o padrão `'{}'`)
    - "saveList rewrites the formatting with the text"
  - Implementar: `schema/quiz.ts` (`textFormatting`, `jsonb`, `not null`, padrão `{}`); `QuestionRow`, `toQuestion` com `readTextFormatting`, `toColumns`, `listByQuiz` e o `set` do upsert de `saveList`. `pnpm db:generate` gera `0021_question_text_formatting.sql` (só o `ADD COLUMN`; conferir o SQL) e o snapshot; no banco local, `pnpm -F @quizio/db db:push` ou o `ALTER TABLE` à mão no container
  - Cobre: CA-02, CA-27 · RN-18, RN-22

- [x] **T12** `packages/db` — formatação nas leituras dos `jsonb`
  - Teste:
    - `drizzle-quiz-version-repository.test.ts`: "a saved version keeps the formatting (spec 047)"
    - `drizzle-report-game-query.test.ts`: "the report reads the game's questions, not the quiz's" (com a formatação gravada pelo `drizzle-game-question-repository`); "an old copy reads without formatting"
    - A consulta da partida jogável, a do quiz compartilhado e a do perfil não têm teste próprio para isso: elas leem a versão com `parseVersionQuestions`, coberta na T05, e não mapeiam campo a campo
  - Implementar: `drizzle-report-game-query.ts` leva o `textFormatting` que `parseStoredGameQuestion` leu; o resto já passa pelo core
  - Cobre: CA-19, CA-23, CA-25, CA-26, CA-27 · RN-19, RN-21, RN-22

## Fase 4 — API e MCP

- [x] **T13** `packages/api` — a mudança de enunciado com formatação
  - Teste: `routers/quiz-questions.test.ts`
    - "update saves a text change with its formatting"
    - "a text change without formatting clears it"
    - "an invalid formatting is BAD_REQUEST with QUIZ.INVALID_TEXT_FORMATTING"
    - "refuses an unknown mark key by its shape"
    - e o teste de entradas sem limite continua verde (`secrets-in-body.test.ts`)
  - Implementar: `textFormattingInput` (exportado) em `routers/quiz-questions.ts`, chaves de `TEXT_MARKS`, `.strict()`, listas com `.max(400)`; o router passa `formatting ?? NO_FORMATTING`
  - Cobre: CA-02, CA-06 · RN-04, RN-18

- [x] **T14** [P] `packages/mcp` — a marcação do enunciado
  - Teste: `schemas/statement-markup.test.ts`
    - "parses nested tags into ranges"
    - "tags are case-insensitive"
    - "refuses an unknown tag listing the four"
    - "refuses an unclosed or misplaced closing tag"
    - "keeps x < 3 and a<b as text"
    - "decodes &lt; and nothing else"
    - "renders sup and b tags in a fixed order"
    - "round-trips a literal tag-like text"
  - Implementar: `schemas/statement-markup.ts` (`parseStatementMarkup`, `statementMarkup`), lançando `ToolInputError` (`INVALID_INPUT`)
  - Cobre: CA-29, CA-30, CA-31 · RN-28, RN-29, RN-30

- [x] **T15** `packages/mcp` — as ferramentas leem e escrevem a marcação
  - Teste:
    - `tools/questions.test.ts`: "add_questions keeps sub and bold"; "update_question without tags clears the formatting"; "160 characters with tags are accepted, 161 are refused"; "subscript inside superscript is refused with QUIZ.INVALID_TEXT_FORMATTING"
    - `create_quiz` e `get_quiz` com a marcação ficam cobertos pelo `quizWith`/`read` de `tools/questions.test.ts` ("add_questions keeps sub and bold, and get_quiz reads them back"); `tools/questions.test.ts` também tem "an unknown tag is refused and x < 3 is text"
    - `tools/reports.test.ts`: "get_report and get_report_detail return statements as markup"
    - `tools/library.test.ts`: "get_others_quiz returns statements as markup"
    - `tools-inputs.test.ts` continua verde
  - Implementar: `schemas/question-input.ts` (descrição de `text`, `toQuestionDraft`, `toQuestionPatch`, `questionOutput` sem `textFormatting`); as saídas de `tools/reports.ts` e `tools/library.ts`; uma linha em `instructions.ts`
  - Cobre: CA-29, CA-30, CA-31, CA-32 · RN-28, RN-29, RN-30

## Fase 5 — UI (design system → componentes do app → telas)

- [x] **T16** [P] `apps/web` — catálogo de símbolos e a grade
  - Teste:
    - `lib/symbol-catalog.test.ts`: "has the five tabs in order, Caracteres especiais first"; "Grego has 24 capitals and 25 small letters with σ and ς"; "each symbol is one grapheme and appears once in its tab"
    - `lib/symbol-grid.test.ts`: "arrows move by one and by a row"; "Home and End go to the ends"; "never leaves the grid"
  - Implementar: `lib/symbol-catalog.json` (listas das capturas, Matemática completada pela família dos operadores, conforme o plano), `lib/symbol-catalog.ts` (`SYMBOL_TABS`), `lib/symbol-grid.ts` (`gridMoveTarget`)
  - Cobre: CA-17, CA-18 · RN-11, RN-15, RN-17

- [x] **T17** `packages/ui` — fontes: itálico e símbolos
  - Teste: `apps/web/src/lib/symbol-catalog.test.ts` › "every symbol is covered by Montserrat or Quizio Symbols" (falha até a cobertura existir)
  - Implementar:
    - `packages/ui/scripts/build-symbol-font.py` (fontTools; entradas: o catálogo, a Montserrat de `node_modules` e as Noto baixadas fora do repositório; falha listando o que nada cobre)
    - gerar `packages/ui/src/fonts/quizio-symbols.woff2`, `quizio-symbols.css` e `quizio-symbols.coverage.json`; copiar o `OFL.txt`
    - `globals.css`: importa `quizio-symbols.css` e `@fontsource-variable/montserrat/wght-italic.css`; `--font-sans` com "Quizio Symbols" depois da Montserrat
    - `"./fonts/*"` nos `exports` do `@quizio/ui`
    - anotar o tamanho do `.woff2`
  - Cobre: CA-17 · RN-16

- [x] **T18** [P] `packages/ui` — `Toggle` e as abas `pill`
  - Teste: `toggle.test.tsx` › "toolbar variant exposes aria-pressed and the pressed look"; `tabs.test.tsx` › "pill variant marks the selected tab"
  - Implementar: `npx shadcn@latest add toggle -c packages/ui` (na worktree, o arquivo cai na raiz do checkout principal: movê-lo), convertido ao estilo do projeto com a variante `toolbar`; `cva` em `tabs.tsx` com a variante `pill`; os dois na página `/design-system`
  - Cobre: CA-03, CA-13 · RN-05, RN-11

- [x] **T19** [P] `apps/web` — `FormattedText`
  - Teste: `components/quiz/formatted-text.test.tsx`
    - "draws strong, em, sub and sup for the marked pieces"
    - "plain text in normal weight"
    - "a text with markup-like characters is drawn as text"
    - "no formatting draws the text as it is"
  - Implementar: `components/quiz/formatted-text.tsx`
  - Cobre: CA-05, CA-27 · RN-24, RN-26

- [x] **T20** `apps/web` — Tiptap e a tradução do documento
  - Teste: `lib/statement-document.test.ts`
    - "statementToDocument makes one paragraph with a text node per segment"
    - "documentToStatement turns marked text nodes into ranges"
    - "a text node with two marks gives a range in each"
    - "a superscript digit becomes a superscript range"
    - "round-trips text and formatting"
    - "an empty document is an empty text"
  - Implementar: as dependências do plano no `package.json` do `apps/web` (Tiptap 3, mesma versão em todas; `pnpm install`); `lib/statement-document.ts`
  - Cobre: CA-04, CA-05 · RN-03

- [x] **T21** `apps/web` — as extensões do enunciado
  - Teste: `lib/statement-extensions.test.ts` (estado do ProseMirror montado com o esquema das extensões, sem DOM)
    - "turning subscript on removes superscript there, and the other way"
    - "Enter adds no line"
    - "a pasted slice keeps the four marks and drops the rest"
    - "pasted blocks become one line separated by spaces"
    - "refuses a transaction past 160 characters"
    - "accepts a mark change at the limit"
    - "fitSliceToRoom cuts at a grapheme"
    - "a symbol that does not fit changes nothing"
  - Implementar: `lib/statement-extensions.ts` (`Document` de um parágrafo, `Paragraph`, `Text`, `Bold`, `Italic`, `Subscript`/`Superscript` com `excludes`, `UndoRedo`, `Placeholder`, `StatementLine`, `StatementLimit`, `fitSliceToRoom`)
  - Cobre: CA-06, CA-10, CA-11, CA-16 · RN-04, RN-06, RN-07, RN-09, RN-14

- [x] **T22** [P] `apps/web` — `FormattingToolbar`
  - Teste: `components/editor/formatting-toolbar.test.tsx`
    - "has B, I, X₂, X², a separator and Ω, without f(x)"
    - "a button is pressed while its mark is on"
    - "each button has its tooltip"
    - "clicking a mark calls onToggle and Ω calls onSymbols"
    - "a click does not take the focus" (`mousedown` cancelado)
  - Implementar: `components/editor/formatting-toolbar.tsx`
  - Cobre: CA-01, CA-03, CA-12 · RN-01, RN-02, RN-05

- [x] **T23** [P] `apps/web` — `SymbolDialog`
  - Teste: `components/editor/symbol-dialog.test.tsx`
    - "opens on Caracteres especiais with five tabs and Cancelar"
    - "picking a symbol calls onPick and closes"
    - "Cancelar, Esc and outside close without picking"
    - "arrows move in the grid and Enter picks"
    - "the scroll button shows while there is more below"
  - Implementar: `components/editor/symbol-dialog.tsx`
  - Cobre: CA-13, CA-17, CA-18 · RN-11, RN-12, RN-13, RN-17

- [x] **T24** `apps/web` — o campo do enunciado com o editor
  - Teste:
    - `src/testing/setup.ts` com os stubs do ProseMirror no jsdom e `src/testing/statement-editor.ts` (`statementEditorOf`, `typeStatement`)
    - `components/editor/question-text-field.test.tsx` (reescrito):
      - "is a textbox named Pergunta"
      - "shows the toolbar only while the statement or the toolbar has focus"
      - "saves the text and its formatting after the pause and on blur"
      - "the counter ignores the formatting"
      - "a picked symbol goes in at the cursor and the counter drops by one"
      - "a symbol replaces the selection and takes the marks where it goes"
      - "a symbol that does not fit changes nothing"
      - "closing the dialog gives the focus back to the field"
      - "before the editor mounts, the statement shows formatted"
    - `question-canvas.test.tsx` e `quiz-editor.test.tsx` passam a escrever com `typeStatement` e a conferir `{ kind: "text", text, formatting }`
  - Implementar:
    - `question-text-field.tsx` reescrito com `useEditor`/`useEditorState`, o par no `useDebouncedAutosave`, a barra e o diálogo
    - `question-canvas.tsx` (`initialStatement`, `onSaveStatement`) e `quiz-editor.tsx`
    - `lib/quiz-error-messages.ts` com `QUIZ.INVALID_TEXT_FORMATTING`
    - nos E2E que conferem o enunciado com `toHaveValue` (`assistant.spec.ts`, `game-options.spec.ts`, `game-play.spec.ts`), trocar por `toHaveText`
  - Cobre: CA-01, CA-09, CA-13, CA-14, CA-15, CA-16 · RN-01, RN-07, RN-08, RN-12, RN-13, RN-14, RN-18

- [x] **T25** [P] `apps/web` — enunciado formatado no editor e nas páginas do quiz
  - Teste: `question-list.test.tsx` › "the item shows the statement formatted and keeps a plain aria-label"; `incomplete-questions-dialog.test.tsx` › "shows the statement formatted"; `quiz-question-preview.test.tsx` › "slide and row show the statement formatted"; `shared-quiz-page.test.tsx` › "questions show their formatting"
  - Implementar: `FormattedText` em `question-list.tsx`, `incomplete-questions-dialog.tsx`, `quiz/quiz-question-preview.tsx` e `groups/shared/shared-question-list.tsx`, sem `font-bold`/`font-semibold` no enunciado
  - Cobre: CA-26 · RN-24, RN-25, RN-27

- [x] **T26** [P] `apps/web` — tela do anfitrião e celular
  - Teste: `host-stage.test.tsx` › "draws the statement formatted, in normal weight, in the intro and the answers"; `answer-review.test.tsx` › "the review shows the statement formatted"; `player-stage.test.tsx` › "the device draws the subscript with the option on"
  - Implementar: `game/host/stage-screens.tsx` (`QuestionText`), `answer-review.tsx` (`questionFormatting`) e `host-stage.tsx`; `game/player/question-on-device.tsx` (`Statement`, `DeviceQuestionIntro`, `DeviceQuestion`) e `player-stage.tsx`; conferir que as junções do palco (`join-flow.tsx`, `routes/_auth/host.$gameId.tsx`, `lib/game-stage.ts`) trocam o objeto da pergunta inteiro
  - Cobre: CA-21, CA-22 · RN-24, RN-25, RN-26

- [x] **T27** [P] `apps/web` — atividade e relatórios
  - Teste: `play-question.test.tsx` e `play-result.test.tsx` › "the statement shows formatted"; `report-tables.test.tsx` › "the question list shows the formatting and the search uses the text"; `report-details.test.tsx` › "the question and the participant's rows show the formatting"; `report-summary.test.tsx` › "the hardest question shows the formatting"
  - Implementar: `assignment/play/play-stage.tsx` (`QuestionLayout`), `play-question.tsx` (`asDeviceQuestion`), `play-result.tsx`; `reports/questions-table.tsx`, `question-detail.tsx`, `report-summary.tsx`, `participant-detail.tsx`
  - Cobre: CA-24, CA-25 · RN-23, RN-24, RN-25

## Fase 6 — E2E e fechamento

- [x] **T28** E2E — `apps/web/e2e/statement-formatting.spec.ts` (desktop e mobile)
  - Editor (desktop):
    - a barra aparece e some;
    - negrito numa seleção, com recarga;
    - B sem seleção;
    - negrito e itálico juntos;
    - sobrescrito para expoentes, e subscrito tirando o sobrescrito;
    - os quatro atalhos;
    - desfazer e refazer;
    - o limite de 160;
    - colar HTML com `DataTransfer` (negrito, vermelho, sublinhado, link, sobrescrito e quebra);
    - π inserido no cursor pelo diálogo.
  - Jogo e relatório (desktop): publicar, partida com "perguntas nos dispositivos" ligada e um jogador; a tela do anfitrião e o celular mostram o `sup`/`sub`; o relatório mostra a formatação.
  - Mobile: a barra inteira na tela, e o diálogo com menos colunas e rolagem.
  - Parar o servidor de prévia antes de rodar (ele não tem `AI_PROVIDER=fake`); rodar também os E2E que usam o enunciado
  - Cobre: CA-01 a CA-08, CA-10, CA-11, CA-14, CA-17, CA-21, CA-22, CA-25, CA-28

- [x] **T29** Fechamento
  - `pnpm check` só nos arquivos mudados (Biome com `--line-ending=crlf`), `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, `pnpm test:e2e`
  - Medir no `vite build` o pedaço da rota do editor com o Tiptap; se ele cair no pedaço comum, carregar o campo com `lazy`
  - ADR 0025 com status aceito; `docs/design-system.md` (fonte de símbolos, itálico, `FormattedText`, `Toggle`, abas `pill`); `CLAUDE.md` (um parágrafo sobre a formatação do enunciado); `glossary.md` (✅ nos termos da 047); `roadmap.md` (✅); `spec.md` (status `done` e changelog)

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T22, T24, T28 |
| CA-02 | T02, T03, T08, T11, T13, T28 |
| CA-03 | T18, T22, T28 |
| CA-04 | T01, T20, T28 |
| CA-05 | T19, T20, T28 |
| CA-06 | T01, T02, T13, T21, T28 |
| CA-07 | T28 |
| CA-08 | T28 |
| CA-09 | T02, T24 |
| CA-10 | T21, T28 |
| CA-11 | T21, T28 |
| CA-12 | T22 |
| CA-13 | T18, T23, T24 |
| CA-14 | T24, T28 |
| CA-15 | T24 |
| CA-16 | T21, T24 |
| CA-17 | T16, T17, T23, T28 |
| CA-18 | T16, T23 |
| CA-19 | T05, T08, T09, T12 |
| CA-20 | T02, T03, T08 |
| CA-21 | T09, T26, T28 |
| CA-22 | T06, T09, T26, T28 |
| CA-23 | T06, T09, T12 |
| CA-24 | T09, T27 |
| CA-25 | T07, T10, T12, T27, T28 |
| CA-26 | T12, T25 |
| CA-27 | T01, T05, T11, T12, T19 |
| CA-28 | T28 |
| CA-29 | T14, T15 |
| CA-30 | T04, T14, T15 |
| CA-31 | T14, T15 |
| CA-32 | T02, T15 |
