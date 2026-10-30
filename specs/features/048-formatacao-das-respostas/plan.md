---
spec: "048"
status: approved # draft | approved
---

# Plano técnico — 048 Formatação das respostas

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0025](../../../docs/adr/0025-texto-formatado.md) (atualização)

## Abordagem

A resposta passa a ter o mesmo par do enunciado: o texto puro e, ao lado, um `TextFormatting` do shared kernel (spec 047). No Quiz, cada `Choice` ganha `textFormatting`. No Puzzle, as respostas continuam sendo a lista `items` de textos, e a formatação vem numa lista paralela, `itemFormatting`, uma por posição. As duas ficam dentro do `content` da pergunta, que já é `jsonb` na linha viva, na versão jogável e na cópia da partida. **Não há coluna nova nem migration**, e as leituras são tolerantes, como na 047: o que foi gravado antes fica sem formatação (RN-17).

Na partida, cada `GameChoice` ganha `textFormatting`, copiado da alternativa ou da posição do Puzzle, e vai com ela para as visões do anfitrião, do celular, da atividade e dos relatórios. A correção não muda: no Quiz é pelo id e no Puzzle pelos textos (RN-12).

No editor, o campo do enunciado é separado num **campo formatado comum** (Tiptap, barra, diálogo de símbolos, foco), parametrizado pelo limite, pelo texto de exemplo e pelos nomes. O enunciado, as alternativas do Quiz e as respostas do Puzzle passam a usá-lo, e o `AnswerTextInput` da correção de 2026-10-30 sai. As outras telas desenham as respostas com o `FormattedText` que já existe, que também dá o peso normal (RN-18). Os agentes leem e escrevem as respostas com a mesma marcação do enunciado.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Formatação da resposta (Quiz) | `Choice.textFormatting` | sim |
| Formatação das respostas do Puzzle | `PuzzleQuestion.itemFormatting` (uma por posição, alinhada a `items`) | sim |
| Formatação da resposta na partida | `GameChoice.textFormatting` | sim |
| Resposta com formatação (relatório do Puzzle) | `OrderedAnswer` (`text` + `textFormatting`) | sim |
| Campo formatado (editor) | `FormattedTextField`, `FormattedValue` | sim (sai do `QuestionTextField`) |
| Extensões do campo formatado | `formattedTextExtensions({ maxLength, placeholder })`, `SingleLine`, `CharacterLimit` | renomeados (eram `statementExtensions`, `StatementLine`, `StatementLimit`) |
| Marcação de texto (agentes) | `parseTextMarkup` / `textMarkup` | renomeados (eram `parseStatementMarkup` / `statementMarkup`) |

## Domínio

### Quiz — `quiz/domain/question.ts`

- `Choice` passa a ser `{ id, text, textFormatting, correct }`. `emptyChoices` começa com `NO_FORMATTING`.
- `PuzzleQuestion` ganha `itemFormatting: TextFormatting[]`, sempre com `PUZZLE_ITEM_COUNT` posições e `NO_FORMATTING` nas vazias. `blankContent("puzzle")` começa assim.
- **`parseFormattedText(raw, formatting, maxLength, tooLong)`** (privada) recebe o corpo de `parseQuestionStatement`: confere a forma (`InvalidTextFormattingError`), corta as pontas deslocando os trechos, transforma texto vazio em `null` sem formatação, conta o limite só no texto e recusa subscrito sobre sobrescrito. `parseQuestionStatement` passa a usá-la.
- **`parseAnswer(raw, formatting)`** (nova, exportada) devolve `{ text, textFormatting }` com `CHOICE_TEXT_MAX_LENGTH` e `ChoiceTextTooLongError` (RN-04, RN-05, RN-08). `parseChoiceText(raw)` continua para quem só tem texto (assistente) e passa a ser `parseAnswer(raw, NO_FORMATTING).text`.
- Leitura do que está gravado:
  - `isStoredChoice` não muda: ela só confere `text` e `correct`, e o código anterior já ignora campos a mais.
  - `parseQuizContent` lê `textFormatting` de cada alternativa com `readTextFormatting(text, choice.textFormatting)`.
  - `parseStoredPuzzleItems` vira `parseStoredPuzzle(raw)` e devolve `{ items, itemFormatting }`. A formatação de cada posição é lida com `readTextFormatting` contra o texto já cortado, e falta ou lista de outro tamanho viram `NO_FORMATTING`.
- `questionContent` copia as formatações com `copyTextFormatting` (`choices` e `itemFormatting`). `copyQuestion` e `storedContent` passam por ela (RN-15).

### Quiz — `quiz/domain/question-change.ts`

- `QuestionContentInput`: as alternativas do Quiz aceitam `textFormatting?`, e o Puzzle aceita `itemFormatting?`. `parseQuizInput` e `parsePuzzleItems` passam a usar `parseAnswer`, e o que faltar fica sem formatação. É o caminho das respostas lembradas na troca de tipo (RN-15).
- `{ kind: "choiceText"; choiceId; text; formatting?: TextFormatting }`, aplicada com `parseAnswer`. Sem `formatting`, a resposta fica sem formatação, como no enunciado. A regra de que resposta vazia não é correta continua (RN-08).
- `{ kind: "puzzleItemText"; index; text; formatting? }`: `setPuzzleItem` grava texto e formatação na posição.
- `movePuzzleItem` move `items` e `itemFormatting` juntos (RN-11).
- `setExtraChoices`: as alternativas 5 e 6 tiradas perdem também a formatação (`emptyChoices`).
- `changeType` já monta o conteúdo por `parseQuestionContent` ou `blankContent`, então não muda.

### Quiz — outros arquivos

- `question-draft.ts` (agentes): `choices?: { text, correct, textFormatting? }[]`, `items?` e `itemFormatting?`. `buildQuestion` usa `parseAnswer` (RN-23).
- `question-patch.ts`: as listas continuam sendo substituídas inteiras. Uma lista enviada traz a sua formatação, e o que vier sem ela fica sem formatação (RN-23). `draftOf` e `draftForType` levam os campos.
- `quiz-version.ts`: `sameQuestionLists` compara `sameTextFormatting` de cada alternativa e de cada posição do Puzzle (RN-14). `parseVersionQuestions` já passa por `parseStoredContent`.
- `accept-generated.ts`: as alternativas criadas pelo assistente vêm com `NO_FORMATTING` (fora de escopo).
- `testing/a-question.ts`: os construtores de teste aceitam as formatações.

### Game — `game/domain` e `application`

- `GameChoice` ganha `textFormatting`. `choicesOf` o copia da alternativa (Quiz) ou de `itemFormatting[slot]` (Puzzle); no Verdadeiro ou falso é `NO_FORMATTING` (RN-16). `parseStoredGameQuestion` o lê com `readTextFormatting(choiceText, raw.textFormatting)`, então as partidas gravadas antes ficam sem formatação.
- `withShuffledChoices` e `withDrawnIds` copiam a alternativa com `...choice`; conferir no teste que a formatação acompanha a alternativa sorteada.
- `isRightOrder` (`puzzle.ts`) não muda: compara textos (RN-12).
- Visões:
  - `PublicStage.question.choices[]` ganha `textFormatting`, só quando os textos vão aos celulares (`answersShown`), e `NO_FORMATTING` nos outros casos;
  - `HostQuestionView.choices[]` (`host-game-view.ts`) e `PlayChoiceView` (`assignment-play-view.ts`) também ganham o campo.
- O resultado do Puzzle (`puzzleResultsOf`) e o `rightOrder` da atividade são listas de ids, e as telas tiram texto e formatação das alternativas. Não mudam.
- `testing/a-game-question.ts` aceita o campo.

### Reports — `reports/domain` e `application`

- `ReportQuestion.choices` já são `GameChoice` e levam o campo, porque o adapter usa `parseStoredGameQuestion`.
- `get-report-question.ts`: as alternativas da visão e as escolhidas por participante ganham `textFormatting`.
- `get-report-participant.ts`: idem nas escolhidas por pergunta, e `puzzleOrder` passa de `string[]` para `OrderedAnswer[]`.
- `puzzle-orders.ts`: `correctOrder` e cada ordem enviada passam a listar `OrderedAnswer` (`{ text, textFormatting }`, com a formatação da alternativa enviada). O agrupamento continua pela lista de textos (RN-12).
- `testing/in-memory-report-store.ts` e `a-report-game.ts` copiam e aceitam o campo.

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `InvalidTextFormattingError` (existente) | `QUIZ.INVALID_TEXT_FORMATTING` | A formatação de uma resposta não cabe no texto, tem marca desconhecida ou subscrito sobre sobrescrito (RN-02, RN-24). |
| `ChoiceTextTooLongError` (existente) | `QUIZ.CHOICE_TEXT_TOO_LONG` | O texto de uma resposta de Quiz ou de Puzzle, sem contar a formatação, passa de 75 (RN-05, CA-24). |

## Aplicação

Nenhum caso de uso novo e nenhuma porta nova.

| Caso de uso | O que muda |
| --- | --- |
| `updateQuestion` (`quiz.questions.update`) | `choiceText` e `puzzleItemText` trazem `formatting`; a troca de tipo traz as formatações lembradas (RN-13, RN-15). |
| `editQuestion`, `addQuestions`, `createQuiz` (agentes) | Rascunhos e patches com as formatações das respostas (RN-23). |
| `duplicateQuestion`, `duplicateQuiz`, `duplicateSharedQuiz`, `discardQuizChanges`, `publishQuiz` | Já passam por `copyQuestion`/`sameQuestionLists`; só os testes (RN-14, RN-15). |
| `startGame`, `createAssignment` | Já copiam por `toGameQuestion` (RN-16). |
| `getHostGame`, `getPlayerSession`, `assignmentPlay*` | As visões levam o campo. |
| `getReportQuestion`, `getReportParticipant` | As visões levam o campo e as ordens do Puzzle formatadas. |
| `getQuizEditor`, `getQuizPreview`, `getSharedQuiz`, `getPublicQuiz` | Devolvem `Question` inteiras, então levam o campo sem mudança. |

## Adapters

### Banco — `packages/db`

- **Nenhuma coluna nova.** O `content` da linha `question` é `jsonb` gravado por `storedContent`, e `quiz_version.questions` e `game_question.question` guardam o objeto inteiro. A formatação das respostas vai dentro deles, e o core a lê com tolerância.
- `drizzle-question-repository.ts`, `drizzle-report-game-query.ts` e as consultas que usam `parseVersionQuestions` não mudam; só ganham testes de ida e volta.
- Compatível com o código em produção durante o deploy: o código anterior lê as alternativas pelo `isStoredChoice`, que ignora o campo a mais. Se ele regravar uma pergunta, a formatação das respostas se perde naquela gravação, como o enunciado na 047.

### Real-time

| Canal | Evento | Payload | Publicado por | Assinado por |
| --- | --- | --- | --- | --- |
| `game-{gameId}` | `stage-changed` (existente) | O `PublicStage`, agora com `choices[].textFormatting` quando os textos vão aos celulares | `publishToGame` (sem mudança) | `JoinFlow` (sem mudança) |

Tamanho: numa resposta de 75 caracteres cabem no máximo cerca de 38 trechos por marca, porque os trechos de uma marca não se tocam. O pior caso, com seis respostas alternando as quatro marcas letra a letra e o enunciado igual, passa dos 10 KB do Pusher; um quiz real fica longe disso. O evento é uma dica, e o celular pergunta a sessão a cada 5 s durante o jogo, então um evento recusado só atrasa aquela tela. Um teste confere que um palco com seis respostas e o enunciado inteiramente formatados, com vários trechos cada, fica abaixo de 10 KB (ver Riscos).

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `quiz.questions.update` (existente) | mutation | sessão | `choiceText` e `puzzleItemText` com `formatting`; `type` com `remembered` levando as formatações | a pergunta, como hoje | `QUIZ.INVALID_TEXT_FORMATTING`, `QUIZ.CHOICE_TEXT_TOO_LONG` |

- `choiceText` e `puzzleItemText`: `formatting: textFormattingInput.default(() => ({}))`. Uma aba ainda na versão anterior manda a mudança sem formatação, e a resposta fica sem ela.
- `content` (as respostas lembradas na troca de tipo): cada alternativa do Quiz ganha `textFormatting: textFormattingInput.default(() => ({}))` e o Puzzle ganha `itemFormatting: z.array(textFormattingInput).max(4).default(() => [])`. Sem isso o zod descartaria os campos e a formatação se perderia na ida e volta do tipo (RN-15).
- Nenhuma ligação nova em `container.ts` nem em `composition-root.ts`.

## MCP — `packages/mcp`

- `schemas/statement-markup.ts` passa a ser **`schemas/text-markup.ts`**:
  - `parseStatementMarkup`/`statementMarkup` passam a se chamar `parseTextMarkup`/`textMarkup`, sem mudar o comportamento;
  - `withStatementMarkup` e `statementFromMarkup` ficam;
  - entram `withAnswerMarkup(question)`, que troca as alternativas e as respostas do Puzzle pelo texto com tags e tira `textFormatting`/`itemFormatting` da saída, e `answersFromMarkup(input)`, que separa texto e formatação de `choices[].text` e `items[]`.
- `schemas/question-input.ts`:
  - as descrições de `choices[].text` e `items` dizem que aceitam as quatro tags e que o limite conta só o texto;
  - `toQuestionDraft` e `toQuestionPatch` passam as respostas por `answersFromMarkup`, e `questionOutput` por `withAnswerMarkup` (RN-22, RN-23);
  - uma marcação desconhecida é recusada com `ToolInputError` (`INVALID_INPUT`), como no enunciado (RN-24).
- Saídas de relatórios e de quizzes de outras pessoas:
  - `tools/reports.ts` (`get_report_detail`): as alternativas do detalhe da pergunta, as escolhidas de cada participante e as ordens do Puzzle saem como texto com tags;
  - `tools/library.ts` (`get_others_quiz`): passa por `withAnswerMarkup`.
- `instructions.ts`: a linha da marcação passa a falar do enunciado e das respostas.
- Nenhuma ferramenta nova; `server.test.ts` continua com as 60.

## UI — `apps/web`

### Campo formatado comum

- Renomeações nas **funções puras** (`lib/`), porque deixam de ser só do enunciado:
  - `statement-document.ts` → `formatted-text-document.ts` (`toFormattedDocument`, `fromFormattedDocument`);
  - `statement-extensions.ts` → `formatted-text-extensions.ts`:
    - `formattedTextExtensions({ maxLength, placeholder })`, em que o texto de exemplo pode ser uma função, para o do Puzzle, que muda com o total;
    - `SingleLine` e `CharacterLimit` (as antigas `StatementLine` e `StatementLimit`), `FORMATTED_TEXT_EDITOR_OPTIONS` e `fitSliceToRoom` sem mudança.

  Os testes vão junto.
- **`components/editor/formatted-text-field.tsx`** (novo): o que hoje está dentro do `QuestionTextField` e não é só do enunciado.
  - Assinatura: `FormattedTextField({ initialValue, maxLength, placeholder, label, describedBy, toolbarLabel, toolbarClassName, className, onChange, onFocusChange, onBlur })`. `toolbarClassName` posiciona a barra acima ou abaixo do campo (RN-01a); o padrão é acima, como no enunciado.
  - O que ele faz:
    - o grupo de foco (`fieldset`);
    - a `FormattingToolbar` flutuando acima enquanto o campo ou a barra tem o foco (RN-01);
    - o `useEditor` com `immediatelyRender: false`, `role="textbox"`, `aria-label`, `aria-placeholder`, `aria-describedby` e `aria-multiline="false"`;
    - os botões acesos por `useEditorState`;
    - o `SymbolDialog`, cujo símbolo vai para este campo (RN-09, RN-10);
    - o `FormattedText` antes de montar.
  - Exporta `FormattedValue { text: string; formatting: TextFormatting }`.
  - Como cada campo tem o próprio editor, cada um tem o próprio desfazer (RN-03), e só o campo em foco mostra a barra.
- `FormattingToolbar` recebe `label`: "Formatação do enunciado" e "Formatação da resposta N".
- `question-text-field.tsx` passa a usar o `FormattedTextField` e fica só com o que é do enunciado: o autosave, o contador, a dica e o aviso. O comportamento e os localizadores não mudam.

### Respostas no editor

- **`choice-field.tsx`**: o `AnswerTextInput` dá lugar ao `FormattedTextField`.
  - Limite e texto de exemplo: `maxLength` 75 e `placeholder` de `answerPlaceholder(index)`.
  - Nomes e classes:
    - `label` "Resposta N" e `toolbarLabel` "Formatação da resposta N";
    - classes com `font-normal` no lugar do `font-bold` (RN-18), a quebra de linha e o texto de exemplo na cor de hoje.
  - O autosave guarda `{ text, formatting }` na mesma chave, e `onSaveText(text, formatting)` envia `choiceText` com `formatting` (RN-13). O contador continua contando `characterCount(text)` (RN-05) e não fica negativo, porque o `CharacterLimit` barra o excesso (RN-06).
  - A barra fica centralizada no campo (RN-01a):
    - acima na resposta 1;
    - na resposta 2, abaixo, e acima com `@xl:`, a mesma consulta de contêiner que põe as respostas em duas colunas, porque é ela que decide se a resposta 2 está na primeira linha;
    - abaixo da resposta 3 em diante.
- **`puzzle-answers.tsx`**: o mesmo no `PuzzleAnswerField`.
  - O `registerField` passa a devolver `{ text, formatting }` para o movimento enviar o que foi digitado antes de mover.
  - A barra fica acima da resposta 1 e abaixo das outras, porque o Puzzle tem uma coluna só (RN-01a).
  - O `DraggedAnswer` desenha com `FormattedText`, quebrando linha.
  - A formatação acompanha o texto na troca de posição (RN-11), pelo `applyQuestionChange` otimista de hoje.
- `quiz-answers.tsx`, `question-canvas.tsx`, `quiz-editor.tsx` e `lib/question-mutations.ts` passam o par em vez do texto. `lib/question-type-change.ts` já guarda o `questionContent`, que passa a ter as formatações.
- Saem `answer-text-input.tsx` e o teste dele. A linha única e o corte na colagem passam a ser do `SingleLine` e do `CharacterLimit`.

### Respostas nas outras telas

O `FormattedText` já dá o peso normal (RN-18) e nunca usa HTML. As telas que desenham `choice.text` passam a desenhar `FormattedText` com `choice.textFormatting`, e os nomes para leitores de tela continuam com o texto puro (RN-21):

- **Páginas do quiz:** `quiz/quiz-question-preview.tsx` (as três listas de respostas) e `groups/shared/shared-question-list.tsx`.
- **Tela do anfitrião:** `game/host/stage-choices.tsx` (respostas e revelação) e `game/host/puzzle-results.tsx`.
- **Puzzle na partida:** `components/game/puzzle-block.tsx` (o bloco do Puzzle no anfitrião, no celular e na atividade, recebendo `textFormatting`).
- **Celular:** `game/player/answer-buttons.tsx` e `game/player/puzzle-answer-input.tsx` (o bloco que segue o dedo).
- **Atividade:** `assignment/play/play-result.tsx` (as respostas, a ordem enviada e "A ordem certa é:").
- **Relatórios:**
  - `reports/report-parts.tsx` (`ChoiceChip` recebe `textFormatting`);
  - `reports/question-detail.tsx`, incluindo as ordens do Puzzle;
  - `reports/participant-detail.tsx`.

O `generated-question-card.tsx` do assistente continua com texto puro.

### Testes de componentes

- `src/testing/statement-editor.ts` passa a ser `formatted-text-editor.ts`: `editorOf(element)`, `typeInEditor(element, text)` e `formattedField(name)`. Os testes do enunciado, de `choice-field`, `puzzle-answers`, `question-canvas` e `quiz-editor` que digitavam nas respostas passam a usá-lo.
- Nos E2E, as respostas deixam de ser `textarea`:
  - as conferências `toHaveValue` sobre "Resposta N" passam a `toHaveText` (`editor-quiz-question`, `puzzle`, `editor-publish` e os outros que o typecheck e a busca apontarem);
  - o teste da resposta longa confere a altura do bloco em vez do `scrollHeight` do `textarea`.

## Estratégia de testes

| CA | Teste | Camada |
| --- | --- | --- |
| CA-01 | `choice-field.test.tsx`: "the toolbar shows with the focused answer only", "the toolbar goes above the first row and below the others"; `formatted-text-field.test.tsx`: "clicking a button keeps the focus"; E2E `answer-formatting.spec.ts` (a barra acima da resposta 2 e abaixo da 3, pelas caixas na tela; sem imagem nem f(x)) | componente, E2E |
| CA-02 | `question.test.ts`: "parseAnswer keeps a bold range"; `question-change.test.ts`: "choiceText saves the text and its formatting"; `drizzle-question-repository.test.ts`: "round-trips the answers' formatting in content"; E2E (selecionar, B, recarregar) | domínio, repositório, E2E |
| CA-03 | `formatted-text-extensions.test.ts` (já cobre a exclusão de subscrito e sobrescrito, agora com o limite de 75); E2E (X₂, Ctrl+.) | web unit, E2E |
| CA-04 | E2E: Ctrl+B na resposta 1, Ctrl+I na 2, Ctrl+Z na 2 não desfaz a 1 | E2E |
| CA-05 | `question.test.ts`: "the answer limit counts the text, not the formatting"; `choice-field.test.tsx`: "the counter ignores the formatting" | domínio, componente |
| CA-06 | `formatted-text-extensions.test.ts`: "refuses a transaction past 75 characters", "accepts a mark change at the limit", "a paste is cut to the room left"; E2E (colar 90 caracteres, contador em 0) | web unit, E2E |
| CA-07 | E2E (colar HTML com `DataTransfer` numa resposta); `formatted-text-extensions.test.ts` já cobre as quatro marcas e a linha única | web unit, E2E |
| CA-08 | `formatted-text-field.test.tsx`: "a picked symbol goes into this field at the cursor", "a symbol that does not fit changes nothing"; E2E (π na resposta 3) | componente, E2E |
| CA-09 | `question.test.ts`: "parseAnswer turns blank text into null without formatting"; `question-change.test.ts`: "a blank answer stops being correct" | domínio |
| CA-10 | `question-change.test.ts`: "puzzleItemMoved carries the formatting with the text"; `puzzle-answers.test.tsx`: "a moved answer keeps its formatting", "the toolbar goes above the first answer only"; E2E (↑ na alça e recarregar) | domínio, componente, E2E |
| CA-11 | `puzzle.test.ts`: "equal texts with different formatting may swap places"; `game-question.test.ts`: "a puzzle choice takes its slot's formatting" | domínio |
| CA-12 | `quiz-version.test.ts`: "an answer's formatting change makes the lists differ"; `discard-quiz-changes.test.ts`: "brings back the answers' saved formatting"; `start-game.test.ts`: "a game takes the answers' formatting of the playable version" | domínio, aplicação |
| CA-13 | `question.test.ts`: "copyQuestion copies the answers' formatting deeply"; `question-change.test.ts`: "remembered content brings the formatting back"; `routers/quiz-questions.test.ts`: "a type change keeps the remembered formatting"; `duplicate-quiz.test.ts`, `duplicate-shared-quiz.test.ts` | domínio, API, aplicação |
| CA-14 | `host-game-view.test.ts`: "the host's choices carry the formatting"; `stage-choices.test.tsx` (ou `host-stage.test.tsx`): "draws the answers formatted, in normal weight" | aplicação, componente |
| CA-15 | `public-stage.test.ts`: "the choices carry the formatting only with the texts", "a stage with every answer formatted stays under 10 KB"; `answer-buttons.test.tsx`: "draws the superscript" | domínio, componente |
| CA-16 | `puzzle-block.test.tsx` (ou `puzzle-answer-input.test.tsx`): "draws the block's formatting"; `puzzle-results.test.tsx`; E2E (anfitrião e celular) | componente, E2E |
| CA-17 | `start-game.test.ts` e `create-assignment.test.ts`: "a later edit of an answer does not reach the copy"; `game-question.test.ts`: "parseStoredGameQuestion reads choices without formatting" | aplicação, domínio |
| CA-18 | `assignment-play-view.test.ts`: "the choices carry the formatting"; `play-result.test.tsx`: "the sent and the right order are formatted" | aplicação, componente |
| CA-19 | `get-report-question.test.ts`, `get-report-participant.test.ts`, `puzzle-orders.test.ts`: "orders keep each answer's formatting, grouped by text"; `report-details.test.tsx` | aplicação, domínio, componente |
| CA-20 | `quiz-question-preview.test.tsx`, `shared-quiz-page.test.tsx` | componente |
| CA-21 | `question.test.ts`: "stored choices and puzzle items without formatting read as none"; `quiz-version.test.ts`; `formatted-text.test.tsx` (texto puro em peso normal, já existe) | domínio, componente |
| CA-22 | E2E `answer-formatting.spec.ts` no projeto mobile (a barra inteira na tela, acima da resposta 1 e abaixo da 2; o símbolo entra na resposta 2) | E2E |
| CA-23 | `text-markup.test.ts`; `tools/quizzes.test.ts`: "get_quiz returns the answers as markup"; `tools/questions.test.ts`: "add_questions keeps the answers' tags", "update_question without tags clears an answer's formatting"; `tools/reports.test.ts` | adapter (mcp) |
| CA-24 | `tools/questions.test.ts`: "an unknown tag in an answer is refused", "x < 3 is kept as text", "75 characters with tags are accepted, 76 are refused" | adapter (mcp) |

Também: `routers/quiz-questions.test.ts` (a forma de `formatting` em `choiceText` e `puzzleItemText`, o padrão sem ela e o código de erro), `tools-inputs.test.ts` e o teste de entradas sem limite da API, que não mudam porque nenhum texto novo entra.

## Dados e migração

- Nenhuma migration. O que já está gravado (perguntas, versões, cópias das partidas) não tem as formatações das respostas e é lido sem elas (RN-17). O editor não mostra "Alterações não salvas" num quiz antigo, porque a linha viva e a versão são lidas do mesmo jeito (CA-21).

## Riscos e decisões

- **Sem ADR nova.** A ADR 0025 já previa que as respostas reaproveitariam o valor, as funções, o editor e a marcação. Ela ganha uma nota de atualização: a formatação das respostas fica dentro do `content` `jsonb`, sem coluna, e o Puzzle usa uma lista paralela.
- **Lista paralela no Puzzle** (`itemFormatting`): trocar `items` por objetos mudaria o formato gravado e todos os que leem as respostas do Puzzle (partida, relatórios, agentes, editor). A lista paralela só acrescenta. O risco é as duas listas se desencontrarem, e por isso só três funções do core as escrevem (`parseStoredPuzzle`, `setPuzzleItem`, `movePuzzleItem`), com testes que conferem o alinhamento.
- **Vários editores Tiptap na tela**: o enunciado e até seis respostas, sete no máximo, todos no pedaço da rota do editor. O ProseMirror é leve para isso; medir a abertura do editor na implementação.
- **Tamanho do evento `stage-changed`**: o pior caso artificial passa dos 10 KB. Um quiz real não chega perto, e um evento recusado só atrasa o celular até a próxima consulta, em até 5 s. Se o teste do palco formatado se aproximar do limite, o palco do evento deixa de levar as formatações das respostas e o celular as busca na consulta.
- **Peso normal nas telas da partida** (RN-18): muda a aparência de todas as respostas, inclusive dos quizzes antigos. Fica restrito ao `FormattedText`.
- **Testes com o editor no jsdom**: as alternativas passam a ser `contenteditable`. Os testes de componente que digitavam nelas passam ao acesso por comando, e digitar, selecionar, os atalhos e colar ficam no E2E, como na 047.

## Ajustes da implementação (2026-10-30)

- `parseQuestionStatement` e `parseAnswer` são a mesma `parseFormattedText` com limites e erros diferentes; ambas devolvem `FormattedTextValue`.
- `Choice.textFormatting` e `GameChoice.textFormatting` são obrigatórios no core e nas visões. No web, os tipos locais do bloco do Puzzle aceitam o campo ausente, como o `FormattedText`, para um palco publicado por um servidor anterior durante o deploy.
- A barra das respostas é posicionada pelo `toolbarClassName` do `FormattedTextField`; o enunciado também usa o campo comum, com `groupLabel` "Enunciado".
- No relatório, a lista de uma ordem do Puzzle virou o componente `OrderedAnswers` (o antigo `orderLabel` devolvia texto e não desenhava a formatação).
- O construtor de teste `aFormattedAnswersQuestion` ("H2O" com o 2 em subscrito e "CO2") entrou em `quiz/testing/a-question.ts` e é usado pelo core, pelo banco, pelo MCP e pelo web.
- Nenhuma dependência nova: o Tiptap já estava no pedaço da rota do editor, que agora monta um editor por resposta.
