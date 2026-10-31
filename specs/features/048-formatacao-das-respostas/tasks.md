---
spec: "048"
status: done # todo | in-progress | done
---

# Tarefas — 048 Formatação das respostas

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0025](../../../docs/adr/0025-texto-formatado.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.
>
> Sem migration: a formatação das respostas vai dentro dos `jsonb` que já existem (`question.content`, `quiz_version.questions`, `game_question.question`), testados com PGlite. Nenhum adapter que fala com um serviço externo muda, por isso não há `*.int.test.ts` novo.

## Fase 1 — Domínio

- [x] **T01** `core/quiz` — as respostas com formatação na pergunta
  - Teste: `quiz/domain/question.test.ts`
    - "parseAnswer keeps a bold range"
    - "parseAnswer turns blank text into null without formatting"
    - "the answer limit counts the text, not the formatting" (75 caracteres com trechos marcados passam; 76 dão `ChoiceTextTooLongError`)
    - "parseAnswer refuses a range outside the text and subscript over superscript"
    - "parseQuestionStatement keeps its behavior over parseFormattedText"
    - "blank content has no answer formatting" (Quiz e Puzzle)
    - "stored choices and puzzle items without formatting read as none"
    - "a stored puzzle's formatting stays aligned with its four slots" (lista ausente, curta ou longa)
    - "copyQuestion copies the answers' formatting deeply"
  - Implementar:
    - Tipos: `Choice.textFormatting` e `PuzzleQuestion.itemFormatting`.
    - Parsers: `parseFormattedText` (privada), `parseAnswer`, e `parseChoiceText` e `parseQuestionStatement` sobre ela.
    - Conteúdo: `emptyChoices`, `blankContent`, `parseQuizContent`, `parseStoredPuzzle` e `questionContent` com cópia profunda.
    - Construtores de teste: `quiz/testing/a-question.ts`, e os de outros contextos que montam alternativas ou Puzzles (`groups/testing/in-memory-shared-quiz-reads.ts`, `quiz/testing/in-memory-question-generator.ts`), com `NO_FORMATTING`.
  - Cobre: CA-02, CA-05, CA-09, CA-13, CA-21 · RN-04, RN-05, RN-08, RN-13, RN-15, RN-17

- [x] **T02** `core/quiz` — as mudanças das respostas levam a formatação
  - Teste: `quiz/domain/question-change.test.ts`
    - "choiceText saves the text and its formatting"
    - "choiceText without marks clears the formatting"
    - "a blank answer stops being correct and has no formatting"
    - "puzzleItemText saves the slot's formatting"
    - "puzzleItemMoved carries the formatting with the text"
    - "removing the extra answers drops their formatting"
    - "remembered content brings the answers' formatting back" (Quiz e Puzzle)
  - Implementar: `formatting?` em `choiceText` e `puzzleItemText`; `setPuzzleItem` e `movePuzzleItem` com `itemFormatting`; `setExtraChoices`; `QuestionContentInput` com `textFormatting?` e `itemFormatting?`, e `parseQuizInput` e `parsePuzzleItems` com `parseAnswer`
  - Cobre: CA-02, CA-09, CA-10, CA-13 · RN-08, RN-11, RN-13, RN-15

- [x] **T03** `core/quiz` — rascunhos e patches dos agentes
  - Teste:
    - `quiz/domain/question-draft.test.ts`: "a quiz draft keeps its answers' formatting"; "a puzzle draft keeps its items' formatting"; "a draft without answer formatting has none"
    - `quiz/domain/question-patch.test.ts`: "a patch with choices replaces their formatting with the one sent"; "a patch without answers keeps them with their formatting"
    - `quiz/domain/accept-generated.test.ts`: "generated answers have no formatting"
  - Implementar: `QuestionDraft` (`choices[].textFormatting?`, `itemFormatting?`), `buildQuestion` com `parseAnswer`; `draftOf`, `draftForType` e `patchedQuestion`; `accept-generated.ts` com `NO_FORMATTING`
  - Cobre: CA-23 · RN-23

- [x] **T04** `core/quiz` — a versão jogável compara e lê a formatação das respostas
  - Teste: `quiz/domain/quiz-version.test.ts`
    - "an answer's formatting change makes the lists differ"
    - "a puzzle item's formatting change makes the lists differ"
    - "a stored version without answer formatting reads as none"
  - Implementar: `sameQuestionLists` com `sameTextFormatting` por alternativa e por posição do Puzzle
  - Cobre: CA-12, CA-21 · RN-14, RN-17

- [x] **T05** [P] `core/game` — as alternativas da partida e o palco público
  - Teste:
    - `game/domain/game-question.test.ts`:
      - "a quiz choice takes its answer's formatting"
      - "a puzzle choice takes its slot's formatting"
      - "true/false choices have none"
      - "parseStoredGameQuestion reads choices without formatting"
      - "a shuffled or drawn choice keeps its formatting"
    - `game/domain/public-stage.test.ts`:
      - "the choices carry the formatting only with the texts"
      - "a stage with every answer and the statement formatted stays under 10 KB"
    - `game/domain/puzzle.test.ts`: "equal texts with different formatting may swap places"
  - Implementar: `GameChoice.textFormatting`, `choicesOf`, `parseStoredGameQuestion`, `PublicStage.question.choices[].textFormatting`; `game/testing/a-game-question.ts`
  - Cobre: CA-11, CA-15, CA-17 · RN-12, RN-16

- [x] **T06** [P] `core/reports` — as ordens do Puzzle formatadas
  - Teste: `reports/domain/puzzle-orders.test.ts`
    - "orders keep each answer's formatting, grouped by text"
    - "the right order is formatted"
    - "a participant's order is formatted"
  - Implementar: `OrderedAnswer` em `puzzle-orders.ts` (`correctOrder`, `orders[].answers`, `puzzleOrderOf`); `reports/testing/a-report-game.ts` e `in-memory-report-store.ts` com o campo
  - Cobre: CA-19 · RN-12, RN-19

## Fase 2 — Aplicação (casos de uso)

- [x] **T07** `core/quiz` — editar, salvar, descartar e copiar
  - Teste:
    - `update-question.test.ts`: "saves an answer's text and formatting"
    - `discard-quiz-changes.test.ts`: "brings back the answers' saved formatting"
    - `duplicate-question.test.ts`, `duplicate-quiz.test.ts` e `duplicate-shared-quiz.test.ts`: "copies the answers' formatting"
  - Implementar: só o que os testes apontarem (os casos de uso já passam por `applyQuestionChange`, `copyQuestion` e `sameQuestionLists`)
  - Cobre: CA-02, CA-12, CA-13 · RN-13, RN-14, RN-15

- [x] **T08** `core/game` — visões e cópias da partida e da atividade
  - Teste:
    - `start-game.test.ts`: "a game takes the answers' formatting of the playable version"; "a later edit of an answer does not reach the copy"
    - `create-assignment.test.ts`: "an assignment keeps the answers' formatting it was created with"
    - `host-game-view.test.ts`: "the host's choices carry the formatting"
    - `get-player-session.test.ts`: "the device's choices carry the formatting with the texts"
    - `assignment-play-view.test.ts`: "the choices carry the formatting"
  - Implementar: `HostQuestionView.choices[].textFormatting`, `PlayChoiceView.textFormatting`
  - Cobre: CA-12, CA-14, CA-15, CA-17, CA-18 · RN-16, RN-19

- [x] **T09** [P] `core/reports` — leituras do relatório
  - Teste:
    - `get-report-question.test.ts`: "the choices and each participant's choices carry the formatting"; "the puzzle orders are formatted"
    - `get-report-participant.test.ts`: "the chosen answers and the puzzle order carry the formatting"
  - Implementar: `textFormatting` nas alternativas das visões; `puzzleOrder: OrderedAnswer[] | null`
  - Cobre: CA-19 · RN-19

## Fase 3 — Adapters

- [x] **T10** `packages/db` — formatação das respostas nos `jsonb`
  - Teste:
    - `drizzle-question-repository.test.ts`: "round-trips the answers' formatting in content"; "a row written before reads without answer formatting"
    - `drizzle-report-game-query.test.ts`: "reads the choices' formatting from game_question"
    - `drizzle-playable-quiz-query.test.ts` e `drizzle-shared-quiz-reads.test.ts`: "versions carry the answers' formatting"
  - Implementar: nada além do que os testes apontarem (o `content` é gravado por `storedContent` e lido pelo core). Sem `db:generate`.
  - Cobre: CA-02, CA-17, CA-19, CA-20, CA-21 · RN-13, RN-16, RN-17

## Fase 4 — API e MCP

- [x] **T11** `packages/api` — as mudanças das respostas com formatação
  - Teste: `routers/quiz-questions.test.ts`
    - "choiceText takes a formatting"
    - "puzzleItemText takes a formatting"
    - "an answer change without formatting leaves none"
    - "a type change keeps the remembered answers' formatting"
    - "an answer's bad formatting is INVALID_TEXT_FORMATTING"
  - Implementar: `formatting: textFormattingInput.default(...)` em `choiceText` e `puzzleItemText`; `textFormatting` nas alternativas e `itemFormatting` no Puzzle do `content`
  - Cobre: CA-02, CA-13 · RN-13, RN-15

- [x] **T12** [P] `packages/mcp` — a marcação das respostas
  - Teste: `schemas/text-markup.test.ts` (o de `statement-markup` renomeado, que continua verde)
    - "withAnswerMarkup turns choices and puzzle items into tags and drops their formatting"
    - "answersFromMarkup splits choices and items into text and formatting"
    - "an unknown tag in an answer is refused listing the four"
    - "x < 3 in an answer stays text"
  - Implementar: `schemas/statement-markup.ts` → `schemas/text-markup.ts` (`parseTextMarkup`, `textMarkup`, `withStatementMarkup`, `statementFromMarkup`, `withAnswerMarkup`, `answersFromMarkup`) e os imports
  - Cobre: CA-23, CA-24 · RN-22, RN-23, RN-24

- [x] **T13** `packages/mcp` — as ferramentas leem e escrevem as respostas com tags
  - Teste:
    - `tools/questions.test.ts`:
      - "add_questions keeps the answers' tags" (Quiz e Puzzle)
      - "update_question without tags clears an answer's formatting"
      - "x < 3 is kept as an answer"
      - "75 characters with tags are accepted, 76 are refused"
    - `tools/quizzes.test.ts`: "get_quiz returns the answers as markup"
    - `tools/reports.test.ts`: "get_report_detail returns the answers and the puzzle orders as markup"
    - `tools/library.test.ts`: "get_others_quiz returns the answers as markup"
  - Implementar: `schemas/question-input.ts` (descrições, `toQuestionDraft`, `toQuestionPatch`, `questionOutput`); `tools/reports.ts`, `tools/library.ts`; `instructions.ts`
  - Cobre: CA-23, CA-24 · RN-22, RN-23, RN-24

## Fase 5 — UI (componentes do app → telas)

- [x] **T14** `apps/web` — funções do campo formatado com nomes gerais
  - Teste:
    - `lib/formatted-text-document.test.ts` (renomeado; continua verde)
    - `lib/formatted-text-extensions.test.ts` (renomeado):
      - "the limit follows maxLength" (75 caracteres: digitar e colar param no limite)
      - "accepts a mark change at the limit"
      - "a placeholder function is read again on each draw"
  - Implementar: `statement-document.ts` → `formatted-text-document.ts` (`toFormattedDocument`, `fromFormattedDocument`); `statement-extensions.ts` → `formatted-text-extensions.ts` (`formattedTextExtensions({ maxLength, placeholder })`, `SingleLine`, `CharacterLimit`, `FORMATTED_TEXT_EDITOR_OPTIONS`); `src/testing/statement-editor.ts` → `formatted-text-editor.ts` (`editorOf`, `typeInEditor`, `formattedField`); imports
  - Cobre: CA-03, CA-06, CA-07 · RN-02, RN-04, RN-06, RN-07

- [x] **T15** `apps/web` — `FormattedTextField`
  - Teste:
    - `components/editor/formatted-text-field.test.tsx`:
      - "shows the toolbar only while the field or the toolbar has the focus"
      - "clicking a button keeps the focus"
      - "a picked symbol goes into this field at the cursor"
      - "a symbol that does not fit changes nothing"
      - "closing the dialog gives the focus back to this field"
      - "toolbarClassName places the toolbar"
    - `formatting-toolbar.test.tsx`: "the toolbar takes its label"
    - `question-text-field.test.tsx` continua verde
  - Implementar: `formatted-text-field.tsx` (a partir do `QuestionTextField`, com `FormattedValue`); `FormattingToolbar` com `label`; `question-text-field.tsx` sobre ele
  - Cobre: CA-01, CA-08 · RN-01, RN-03, RN-09, RN-10

- [x] **T16** `apps/web` — as alternativas do Quiz com o campo formatado
  - Teste: `components/editor/choice-field.test.tsx`
    - "the toolbar shows with the focused answer only"
    - "the toolbar goes above the first row and below the others" (resposta 1 acima; resposta 2 abaixo e acima com `@xl:`; da 3 em diante abaixo)
    - "the counter ignores the formatting"
    - "saves the text and its formatting"
    - "keeps the first 75 characters of a paste"
    - "an empty answer cannot be marked correct"
    - "the answer is in normal weight"
    - (os testes de hoje adaptados ao editor por comando)
  - Implementar:
    - `choice-field.tsx` com `FormattedTextField`;
    - `quiz-answers.tsx`, `question-canvas.tsx`, `quiz-editor.tsx` e `lib/question-mutations.ts` passam o par;
    - sai `answer-text-input.tsx` com o teste;
    - `question-canvas.test.tsx` e `quiz-editor.test.tsx` adaptados.
  - Cobre: CA-01, CA-02, CA-05, CA-06, CA-09 · RN-01, RN-01a, RN-04, RN-05, RN-06, RN-13, RN-18

- [x] **T17** `apps/web` — as respostas do Puzzle com o campo formatado
  - Teste: `components/editor/puzzle-answers.test.tsx`
    - "saves the slot's text and formatting"
    - "a moved answer keeps its formatting"
    - "the toolbar goes above the first answer only"
    - "the dragged copy shows the formatting"
  - Implementar: `PuzzleAnswerField` com `FormattedTextField`, `registerField` com o par, `DraggedAnswer` com `FormattedText`
  - Cobre: CA-10 · RN-01a, RN-11

- [x] **T18** [P] `apps/web` — respostas formatadas nas páginas do quiz
  - Teste: `quiz-question-preview.test.tsx` e `shared-quiz-page.test.tsx`: "draws the answers formatted, in normal weight"
  - Implementar: `quiz/quiz-question-preview.tsx` (as três listas de respostas), `groups/shared/shared-question-list.tsx`
  - Cobre: CA-20 · RN-18, RN-19

- [x] **T19** [P] `apps/web` — tela do anfitrião e celular
  - Teste:
    - `stage-choices.test.tsx` (ou `host-stage.test.tsx`): "draws the answers formatted, in normal weight, in the answers and the results"
    - `puzzle-results.test.tsx`: "the right order is formatted"
    - `puzzle-block.test.tsx` (ou `puzzle-answer-input.test.tsx`): "draws the block's formatting"
    - `answer-buttons.test.tsx`: "draws the superscript"; "the button's name is the plain text"
  - Implementar: `game/host/stage-choices.tsx`, `game/host/puzzle-results.tsx`, `components/game/puzzle-block.tsx`, `game/player/answer-buttons.tsx`, `game/player/puzzle-answer-input.tsx`
  - Cobre: CA-14, CA-15, CA-16 · RN-18, RN-19, RN-20, RN-21

- [x] **T20** [P] `apps/web` — atividade e relatórios
  - Teste:
    - `play-result.test.tsx`: "the answers, the sent and the right order are formatted"
    - `report-details.test.tsx`: "the choices, each participant's choices and the puzzle orders are formatted"
  - Implementar: `assignment/play/play-result.tsx`; `reports/report-parts.tsx` (`ChoiceChip` com `textFormatting`), `reports/question-detail.tsx`, `reports/participant-detail.tsx`
  - Cobre: CA-18, CA-19 · RN-18, RN-19

## Fase 6 — E2E e fechamento

- [x] **T21** E2E — os testes de hoje com as respostas formatáveis
  - `toHaveValue` sobre "Resposta N" passa a `toHaveText`: `editor-quiz-question.spec.ts` (inclusive o teste da resposta longa, que passa a conferir a altura do bloco), `puzzle.spec.ts`, `editor-publish.spec.ts` e os outros que a busca apontar
  - Rodar esses specs e os que preenchem respostas (`game-play`, `statement-formatting`, `editor`) no desktop e no mobile
  - Cobre: CA-02 (regressão do salvamento das respostas)

- [x] **T22** E2E — `apps/web/e2e/answer-formatting.spec.ts` (desktop e mobile)
  - Teste:
    - **Barra:**
      - acima da resposta 2 e abaixo da 3, sem imagem nem f(x), pelas caixas na tela (CA-01);
      - no celular, acima da resposta 1 e abaixo da 2, inteira na tela, e o símbolo entra na resposta 2 (CA-22).
    - **Marcas e atalhos:**
      - B num trecho, salvo depois de recarregar (CA-02);
      - X₂ e Ctrl+. (CA-03);
      - Ctrl+B na resposta 1 e Ctrl+I na 2, e Ctrl+Z na 2 não desfaz a 1 (CA-04).
    - **Limite, colar e símbolos:**
      - colar 90 caracteres para em 75, com o contador em 0 (CA-06);
      - colar HTML com `DataTransfer` mantém só as quatro marcas (CA-07);
      - π entra na resposta 3 (CA-08).
    - **Puzzle no editor:** ↑ na alça leva a formatação junto, e a barra fica acima da 1 e abaixo da 2 (CA-10).
    - **Partida:** anfitrião e celular com "perguntas nos dispositivos" mostram a resposta com sobrescrito e o bloco do Puzzle formatado (CA-14, CA-15, CA-16).
  - Cobre: CA-01, CA-02, CA-03, CA-04, CA-06, CA-07, CA-08, CA-10, CA-14, CA-15, CA-16, CA-22

- [x] **T23** Fechamento
  - Checks:
    - Biome só nos arquivos mudados, com `--line-ending=crlf`;
    - `pnpm test` (por pacote, se a carga derrubar o db);
    - `pnpm check-types` e `pnpm -F web exec tsc --noEmit`;
    - os E2E das respostas, do editor e da partida.
  - Medir a abertura do editor com até sete campos formatados.
  - Documentação:
    - ADR 0025: nota de atualização (respostas no `content`, lista paralela no Puzzle);
    - `CLAUDE.md`: o parágrafo da formatação passa a falar das respostas e dos nomes novos (`FormattedTextField`, `formatted-text-*`, `text-markup.ts`);
    - `glossary.md`: ✅ nos termos;
    - `roadmap.md`: ✅;
    - `spec.md`: status `done` e changelog.

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T15, T16, T22 |
| CA-02 | T01, T02, T07, T10, T11, T16, T21, T22 |
| CA-03 | T14, T22 |
| CA-04 | T22 |
| CA-05 | T01, T16 |
| CA-06 | T14, T16, T22 |
| CA-07 | T14, T22 |
| CA-08 | T15, T22 |
| CA-09 | T01, T02, T16 |
| CA-10 | T02, T17, T22 |
| CA-11 | T05 |
| CA-12 | T04, T07, T08 |
| CA-13 | T01, T02, T07, T11 |
| CA-14 | T08, T19, T22 |
| CA-15 | T05, T08, T19, T22 |
| CA-16 | T19, T22 |
| CA-17 | T05, T08, T10 |
| CA-18 | T08, T20 |
| CA-19 | T06, T09, T10, T20 |
| CA-20 | T10, T18 |
| CA-21 | T01, T04, T10 |
| CA-22 | T22 |
| CA-23 | T03, T12, T13 |
| CA-24 | T12, T13 |

Todos os 24 critérios aparecem em ao menos uma tarefa.
