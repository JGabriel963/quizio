---
spec: "047"
status: approved # draft | approved
---

# Plano técnico — 047 Formatação do enunciado

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0025](../../../docs/adr/0025-texto-formatado.md) (rascunho)

## Abordagem

O enunciado continua sendo o texto puro (`text`), e a formatação passa a viajar **ao lado dele**, como um valor novo do shared kernel, `TextFormatting`: por marca, a lista de trechos `[início, fim)` em posições do texto (unidades UTF-16). O contexto `quiz` valida e normaliza o par ao gravar (RN-03, RN-04, RN-08, RN-10). A versão jogável e a cópia da partida já guardam a pergunta inteira em `jsonb`, então levam o campo sem coluna nova; só a linha viva `question` ganha a coluna `text_formatting`. As leituras são tolerantes: o que não tem formatação, ou a tem inválida, é lido como sem formatação (RN-22).

No editor, o `Textarea` do enunciado dá lugar a um editor **Tiptap 3** com um esquema mínimo: um parágrafo, texto e as quatro marcas. A barra flutuante e o diálogo de símbolos são componentes do app, e o documento do Tiptap é traduzido para o par por funções puras. Todas as outras telas desenham o par com um componente comum (`FormattedText`), sem biblioteca. Os agentes de IA leem e escrevem o par como marcação inline (`<b>`, `<i>`, `<sub>`, `<sup>`), traduzida no pacote `mcp`. Os símbolos que a Montserrat não tem vêm de uma fonte recortada das Noto, publicada com o design system e baixada só quando um deles aparece (RN-16). As decisões estão na ADR 0025.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Formatação | `TextFormatting` | sim |
| Marca de formatação | `TextMark` (`bold`, `italic`, `subscript`, `superscript`) | sim |
| Trecho | `TextRange` (`[start, end)`) | sim |
| Segmento formatado | `FormattedSegment` (texto + marcas, para desenhar) | sim |
| Barra de formatação | `FormattingToolbar` | sim |
| Diálogo de símbolos | `SymbolDialog`, catálogo `SYMBOL_TABS` | sim |
| Enunciado formatado (na tela) | `FormattedText` | sim |
| Marcação do enunciado (agentes) | `statementMarkup` / `parseStatementMarkup` | sim |
| Enunciado | `text` + `textFormatting` | alterado |

## Domínio

### Shared kernel — `packages/core/src/shared/domain/text-formatting.ts` (novo)

O valor é do shared kernel porque o `quiz` o valida, o `game` o copia e os `reports` o mostram, e nenhum desses contextos importa os outros. É o mesmo caminho de `typed-answer.ts` e `slider-scale.ts` (ADR 0008).

```ts
export const TEXT_MARKS = ["bold", "italic", "subscript", "superscript"] as const;
export type TextMark = (typeof TEXT_MARKS)[number];

/** [start, end) in UTF-16 units of the text, the way JavaScript indexes a string. */
export type TextRange = readonly [start: number, end: number];

/**
 * The marked stretches of a text, per mark (spec 047, RN-03). Normalized: each
 * list sorted, its ranges never touching, every edge on a grapheme boundary,
 * and subscript never overlapping superscript (RN-04). An absent mark has none.
 */
export type TextFormatting = Readonly<Partial<Record<TextMark, readonly TextRange[]>>>;
export const NO_FORMATTING: TextFormatting = {};

export interface FormattedSegment {
	text: string;
	marks: readonly TextMark[];
}

export type TextFormattingIssue = "unknownMark" | "badRange" | "subscriptAndSuperscript";
```

Funções puras:

| Função | Faz |
| --- | --- |
| `textFormattingIssue(text, raw: unknown)` | Confere a **forma**: objeto só com chaves de `TEXT_MARKS`, listas de pares de inteiros com `0 ≤ início < fim ≤ text.length`. Devolve o problema ou `null`. |
| `normalizeTextFormatting(text, formatting)` | Leva as pontas às fronteiras de caracteres percebidos (com o `Intl.Segmenter` já usado por `characterCount`; o início recua e o fim avança), ordena, junta trechos que se tocam ou se cruzam e tira listas vazias. Idempotente. |
| `overlapsSubAndSuper(formatting)` | `true` quando algum trecho de subscrito cruza um de sobrescrito (RN-04). |
| `trimFormattedText(text, formatting)` | Corta os espaços das pontas, como `parseLimitedText`, desloca os trechos pelo que saiu do começo e corta o que passou do fim (RN-10). |
| `readTextFormatting(text, raw)` | Leitura **tolerante** do que veio do banco, da versão ou da cópia da partida: com texto nulo, ou com qualquer problema, devolve `NO_FORMATTING`; senão, a forma normalizada (RN-22). |
| `sameTextFormatting(a, b)` | Igualdade de duas formas normalizadas (para "Alterações não salvas", RN-19). |
| `copyTextFormatting(formatting)` | Cópia profunda, como `copyImage`. |
| `formattedSegments(text, formatting)` | Divide o texto em todas as pontas de trecho e devolve os segmentos com as marcas de cada um, na ordem do texto. É o que as telas, o editor e a marcação dos agentes usam para desenhar. |

### Quiz — `quiz/domain/question.ts` (alterado)

- `QuestionBase` ganha `textFormatting: TextFormatting` (RN-18). `blankQuestion` começa com `NO_FORMATTING`; `isBlankQuestion` não muda, porque um enunciado nulo nunca tem formatação.
- **`parseQuestionStatement(text, formatting: unknown)`** devolve `{ text: string | null; textFormatting: TextFormatting }`, nesta ordem:
  1. `textFormattingIssue` contra o texto como veio, e `InvalidTextFormattingError` se houver problema;
  2. `trimFormattedText`; um texto vazio vira `{ text: null, textFormatting: NO_FORMATTING }` (RN-10);
  3. `characterCount` do texto contra `QUESTION_TEXT_MAX_LENGTH`, e `QuestionTextTooLongError` se passar (RN-07, RN-08: a formatação não conta);
  4. `normalizeTextFormatting`, e `InvalidTextFormattingError` se, depois dela, `overlapsSubAndSuper` (RN-04).
- `parseQuestionText(raw)` continua existindo para quem só tem texto (assistente de criação) e passa a ser `parseQuestionStatement(raw, NO_FORMATTING).text`.
- `copyQuestion` copia a formatação com `copyTextFormatting` (RN-20). `newQuizVersion`, `duplicateQuestion`, `copyQuizContent`, `duplicateSharedQuiz` e `discardQuizChanges` já passam por ela.

### Quiz — outros arquivos do domínio (alterados)

- `question-change.ts`: `{ kind: "text"; text: string | null; formatting: TextFormatting }`, aplicada com `parseQuestionStatement`. `changeType` (que monta a pergunta campo a campo) leva `textFormatting` junto do `text` (RN-20).
- `question-draft.ts`: `QuestionDraft` ganha `textFormatting?: TextFormatting`; `buildQuestion` usa `parseQuestionStatement` (agentes, RN-29).
- `question-patch.ts`: quando o patch traz `text`, a formatação é a do patch ou nenhuma (RN-29: o enunciado enviado substitui o anterior inteiro); sem `text`, texto e formatação ficam como estão. `draftOf` e `draftForType` levam o campo.
- `accept-generated.ts`: a pergunta criada pelo assistente tem `NO_FORMATTING` (fora de escopo).
- `quiz-version.ts`: `sameQuestionLists` compara também `sameTextFormatting` (RN-19); `parseVersionQuestions` tira `textFormatting` do resto do objeto antes do `parseStoredContent` e o lê com `readTextFormatting`. Versões gravadas antes não têm o campo e ficam sem formatação.
- `testing/a-question.ts`: o construtor de teste aceita `textFormatting`.

### Game — `game/domain` (alterado)

- `GameQuestion` ganha `textFormatting`. `toGameQuestion` (campo a campo) o copia da pergunta da versão (RN-21); `parseStoredGameQuestion` o lê com `readTextFormatting`, então as partidas já gravadas ficam sem formatação.
- `PublicStage.question` ganha `textFormatting`, montado em `publicStageOf` ao lado do `text` e `NO_FORMATTING` quando o enunciado não vai aos celulares. É o mesmo valor que já viaja no evento `stage-changed`.
- `HostQuestionView` (`host-game-view.ts`, `toQuestionView`) e `PlayQuestionView` (`assignment-play-view.ts`, `questionView`, reaproveitado por `resultView`) ganham `textFormatting`.
- `testing/a-game-question.ts` aceita o campo.

### Reports — `reports/domain` e `application` (alterados)

- `ReportQuestion` ganha `textFormatting`; `QuestionRowView` (`questionRow`) o leva e, com ele, `HardestQuestionView` e `QuestionDetailView`; `ParticipantAnswerView` ganha `textFormatting` ao lado do `text`, que ali é o enunciado.
- A pesquisa pelo enunciado acontece na tela, sobre o `text` (RN-23), e não muda.
- `testing/in-memory-report-store.ts` copia o campo e `a-report-game.ts` o aceita.

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `InvalidTextFormattingError` (`quiz/domain/question.ts`) | `QUIZ.INVALID_TEXT_FORMATTING` | Marca desconhecida, trecho fora do texto ou não inteiro, ou subscrito cruzando sobrescrito (RN-04, RN-30). O editor nunca envia isso; quem pode enviar é um agente ou um pedido montado à mão. |
| `QuestionTextTooLongError` (existente) | `QUIZ.QUESTION_TEXT_TOO_LONG` | O texto, sem contar a formatação, passa de 160 (RN-08, CA-32). |

## Aplicação

Nenhum caso de uso novo. Os que gravam ou copiam o enunciado recebem o campo pelos tipos acima:

| Caso de uso | O que muda |
| --- | --- |
| `updateQuestion` (`quiz.questions.update`) | A mudança `text` traz `formatting` (RN-18). |
| `editQuestion`, `addQuestions`, `createQuiz` (agentes) | Rascunhos e patches com `textFormatting` (RN-29). |
| `duplicateQuestion`, `duplicateQuiz`, `duplicateSharedQuiz`, `discardQuizChanges`, `publishQuiz` | Já passam por `copyQuestion`/`sameQuestionLists`; só os testes novos (RN-19, RN-20). |
| `startGame`, `createAssignment` | Já copiam pela `toGameQuestion` (RN-21). |
| `getHostGame`, `getPlayerSession`, `assignmentPlay*` | As visões levam o campo. |
| `getReport`, `getReportQuestion`, `getReportParticipant` | Idem. |
| `getQuizEditor`, `getQuizPreview`, `getSharedQuiz`, `getPublicQuiz` | Devolvem `Question` inteiras, então levam o campo sem mudança. |

### Portas

Nenhuma porta nova. `PlayableQuizQuery`, `SharedQuizReads` e `CreatorProfileQuery` continuam devolvendo `Question[]`, lidas com `parseVersionQuestions`.

## Adapters

### Banco — `packages/db`

- `schema/quiz.ts`: `question.textFormatting = jsonb("text_formatting").$type<unknown>().notNull().default({})`.
- `repositories/quiz/drizzle-question-repository.ts`: `QuestionRow`, `listByQuiz` e o `set` do upsert de `saveList` passam a incluir a coluna; `toQuestion` lê com `readTextFormatting(text, row.textFormatting)`; `toColumns` grava `question.textFormatting`.
- `quiz_version.questions` e `game_question.question` são `jsonb` com o objeto inteiro: a versão e a cópia da partida gravam o campo sem mudança no adapter, e o leem pelo core (`parseVersionQuestions`, `parseStoredGameQuestion`). **Não há coluna nova em `game_question`.**
- `repositories/reports/drizzle-report-game-query.ts` monta `ReportQuestion` campo a campo a partir de `game_question.question`: acrescentar `textFormatting: readTextFormatting(text, raw.textFormatting)`.
- `drizzle-playable-quiz-query.ts`, `drizzle-shared-quiz-reads.ts` e `drizzle-creator-profile-query.ts` já usam `parseVersionQuestions`: só os testes.
- Migration `0021_question_text_formatting.sql` (gerada com `pnpm db:generate`): `ALTER TABLE "question" ADD COLUMN "text_formatting" jsonb DEFAULT '{}'::jsonb NOT NULL;`.

### Real-time

| Canal | Evento | Payload | Publicado por | Assinado por |
| --- | --- | --- | --- | --- |
| `game-{gameId}` | `stage-changed` (existente) | O `PublicStage`, agora com `question.textFormatting` quando o enunciado vai aos celulares | `publishToGame` (sem mudança) | `JoinFlow`, rota do anfitrião (sem mudança) |

Tamanho: a forma normalizada guarda pares de números por marca, e os trechos de uma marca não se tocam, então cabem no máximo cerca de 80 por marca num enunciado de 160 caracteres. No pior caso são uns 3 KB, e o maior palco (spec 012) continua abaixo dos 10 KB. As junções do palco recebido com o que a tela já tem (`join-flow.tsx`, `routes/_auth/host.$gameId.tsx`, `lib/game-stage.ts`) trocam o objeto da pergunta inteiro; conferir na implementação que nenhuma escolhe campos um a um.

### Fonte de símbolos — `packages/ui`

- `packages/ui/src/fonts/quizio-symbols.woff2`, `quizio-symbols.css` (o `@font-face` "Quizio Symbols" com `unicode-range` e `font-display: swap`), `quizio-symbols.coverage.json` (os pontos de código que a Montserrat e o recorte cobrem juntos) e `OFL.txt`.
- `packages/ui/scripts/build-symbol-font.py` (fontTools; roda à mão, o resultado é versionado). Ele recebe o catálogo de símbolos (`apps/web/src/lib/symbol-catalog.json`), os arquivos da Montserrat em `node_modules` e as fontes Noto de origem: **Noto Sans** variável (grego e moedas, com o eixo de peso, então o grego em negrito é negrito de verdade), **Noto Sans Math** e **Noto Sans Symbols 2**. As fontes de origem são baixadas dos lançamentos oficiais do projeto Noto, numa pasta fora do repositório. O script recorta só os caracteres do catálogo que a Montserrat não tem, nessa ordem de preferência, e falha listando os que nenhuma fonte cobre.
- `globals.css`: importa `quizio-symbols.css` e o itálico da Montserrat (`@fontsource-variable/montserrat/wght-italic.css`; hoje só o normal é carregado, e o `<em>` sairia inclinado artificialmente), e `--font-sans` passa a ser `"Montserrat Variable", "Quizio Symbols", ui-sans-serif, system-ui, sans-serif`.
- `package.json` do `@quizio/ui`: `"./fonts/*": "./src/fonts/*"` nos `exports`, para o teste do catálogo ler a cobertura.

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `quiz.questions.update` (existente) | mutation | sessão | a mudança `{ kind: "text", text, formatting? }` | a pergunta, como hoje | `QUIZ.INVALID_TEXT_FORMATTING`, `QUIZ.QUESTION_TEXT_TOO_LONG` |

- `textFormattingInput` (exportado de `routers/quiz-questions.ts`, para a spec das respostas reaproveitar): `z.object` com uma chave opcional por `TEXT_MARKS` (enumeradas a partir da constante do core), cada uma `z.array(z.tuple([n, n])).max(400)` com `n = z.number().int().min(0).max(10_000)`, e `.strict()`. Só a forma: as regras ficam no core.
- O router passa `formatting ?? NO_FORMATTING`. Um navegador ainda com a versão anterior aberta durante o deploy manda a mudança sem `formatting`, e o enunciado fica sem formatação, o que é aceitável: aquela tela não tinha como formatar.
- As saídas (`quiz.editor`, `quiz.get`, `quiz.preview`, `group.shared.get`, `account.publicQuiz`, `game.*`, `report.*`) já devolvem o que os casos de uso montam, e o `lib/api-types.ts` da web deriva de `RouterOutputs`.
- Nenhuma ligação nova em `container.ts` nem em `composition-root.ts`.

## MCP — `packages/mcp`

- **`schemas/statement-markup.ts` (novo)**:
  - `parseStatementMarkup(markup)` devolve `{ text, formatting }`. Reconhece `<b>`, `<i>`, `<sub>` e `<sup>` e os fechamentos, sem diferenciar maiúsculas, aninhados à vontade. Qualquer outro trecho com cara de tag (`<\/?[A-Za-z][A-Za-z0-9]*\s*>`, como `<u>` ou `<strong>`), uma tag sem par ou um fechamento fora de ordem lançam `ToolInputError` (`INVALID_INPUT`) com a lista das quatro (RN-30, CA-31). O resto é texto: "x < 3" e "a<b" passam como estão. `&lt;` vira `<`, e só isso.
  - `statementMarkup(text, formatting)` faz o caminho inverso com `formattedSegments`, abrindo as tags na ordem b, i, sub, sup. Um `<` do texto que formaria um trecho com cara de tag sai como `&lt;`, para a volta ser exata.
  - Subscrito dentro de sobrescrito chega ao core e é recusado com `QUIZ.INVALID_TEXT_FORMATTING`, como os outros erros de domínio (`toolErrorResult`).
- `schemas/question-input.ts`: a descrição de `text` diz que aceita as quatro tags e que o limite conta só o texto. `toQuestionDraft` e `toQuestionPatch` passam o texto por `parseStatementMarkup`. `questionOutput` devolve o enunciado como marcação no `text` e não expõe `textFormatting` (RN-28).
- `tools/reports.ts` (`get_report`, `get_report_detail`) e `tools/library.ts` (`get_others_quiz`): os enunciados das saídas (`questions[].text`, `summary.hardestQuestion.text`, o `text` do detalhe da pergunta, `answers[].text` do participante, as perguntas do quiz de outra pessoa) passam por `statementMarkup`.
- `instructions.ts`: uma linha sobre a marcação do enunciado.
- Nenhuma ferramenta nova; `server.test.ts` continua com as 60.

## UI — `apps/web` e `packages/ui`

### Dependências

No `package.json` do `apps/web` (só o app usa; não vão para o catálogo do pnpm): `@tiptap/core`, `@tiptap/pm`, `@tiptap/react`, `@tiptap/extension-document`, `@tiptap/extension-paragraph`, `@tiptap/extension-text`, `@tiptap/extension-bold`, `@tiptap/extension-italic`, `@tiptap/extension-subscript`, `@tiptap/extension-superscript` e `@tiptap/extensions` (`UndoRedo`, `Placeholder`), todos na mesma versão 3.x. O `StarterKit` não entra.

### Funções puras do editor — `apps/web/src/lib/`

- **`statement-document.ts`**: `statementToDocument(text, formatting)` monta o `JSONContent` do Tiptap (um parágrafo com um nó de texto por segmento de `formattedSegments`; os nomes das marcas do Tiptap são os de `TextMark`); `documentToStatement(doc)` faz a volta, percorrendo os nós de texto e acumulando os trechos. Sem DOM.
- **`statement-extensions.ts`**: a lista de extensões do enunciado:
  - `Document.extend({ content: "paragraph" })`, `Paragraph`, `Text`, `Bold`, `Italic`;
  - `Subscript.extend({ excludes: "superscript" })` e `Superscript.extend({ excludes: "subscript" })`, porque as extensões não se excluem sozinhas (RN-04). Os atalhos Mod-B, Mod-I, Mod-, e Mod-. já vêm nelas (RN-06);
  - `UndoRedo` (RN-06) e `Placeholder` ("Comece a digitar a pergunta");
  - **`StatementLine`** (extensão nossa): Enter, Shift-Enter e Mod-Enter não fazem nada; `transformPasted` achata os blocos colados num parágrafo só, separados por espaço, e `transformPastedText` troca as quebras por espaços (RN-07). As marcas que o esquema conhece sobrevivem à colagem, e o resto some, porque o esquema não o reconhece. As regras de leitura do HTML do Tiptap já tratam o `<b style="font-weight:normal">` do Google Docs e o `vertical-align` (RN-09);
  - **`StatementLimit`** (extensão nossa, um plugin do ProseMirror): `filterTransaction` recusa uma transação que deixe o texto com mais de 160 caracteres percebidos (`characterCount` do core) quando ele cresceu; a colagem é cortada antes, por `fitSliceToRoom(slice, room)`, que guarda os nós de texto até o espaço livre e corta o último com `truncateCharacters`, sem partir um acento ou emoji (RN-07, RN-14). O `CharacterCount` do Tiptap foi descartado: o corte dele na colagem conta posições, não caracteres percebidos.
- **`symbol-catalog.json` + `symbol-catalog.ts`**: as cinco abas (`id`, nome e a lista de símbolos), lidas também pelo script da fonte. As listas seguem as capturas: Caracteres especiais com as letras do latim de À a ž, na ordem da captura; Moeda com os 31 da captura; Matemática com os 80 visíveis e o resto dos operadores da mesma família (setas duplas, ∂, ∇, ⊂, ⊃, ⊆, ⊇, ∪, ∧, ∨, ⌊, ⌋…), fechados na T da lista; Grego com 24 maiúsculas e 25 minúsculas (com σ); Outro com os 30 da captura. Isso responde à pergunta em aberto da spec.
- **`symbol-grid.ts`**: `gridMoveTarget(index, key, columns, count)` para as setas, Home e End na grade (RN-17).

### Componentes do editor — `apps/web/src/components/editor/`

- **`question-text-field.tsx`** (reescrito; nome e lugar mantidos):
  - `useEditor` com as extensões, `content: statementToDocument(...)`, `immediatelyRender: false` (SSR) e, em `editorProps.attributes`, `role="textbox"`, `aria-label="Pergunta"`, `aria-multiline="false"`, `aria-describedby` (a dica e o texto de ajuda de hoje) e as classes de hoje, com `font-normal` no lugar de `font-bold` (RN-24). O papel e o nome mantêm os localizadores de 22 arquivos E2E (`getByRole("textbox", { name: "Pergunta" }).fill(...)` funciona num `contenteditable`).
  - O valor do `useDebouncedAutosave` passa a ser `{ text, formatting }`, mantida a chave `question:${id}:text`. `onUpdate` grava `documentToStatement(editor.getJSON())`, e `onSave` recebe o par. O contador mostra `160 − characterCount(text)` (RN-08).
  - O estado aceso dos botões e o foco vêm de `useEditorState` (no Tiptap 3, o componente não redesenha a cada transação).
  - Até o editor montar no navegador, o campo é desenhado com `FormattedText` nas mesmas classes, para a página não pular.
  - A barra aparece enquanto o foco está no campo ou na própria barra (`focus-within` do contêiner, RN-01). Os botões cancelam o `mousedown`, para o campo não perder o foco com o clique.
- **`formatting-toolbar.tsx`** (novo): `FormattingToolbar({ active: Record<TextMark, boolean>, onToggle(mark), onSymbols() })`, com `role="toolbar"` e `aria-label="Formatação do enunciado"`. B, I, X₂ e X² são `Toggle` com `aria-pressed`, um separador, e Ω é um botão. Cada um tem `Tooltip` com o nome (RN-02). Fica posicionada em `absolute bottom-full` centralizada sobre o campo, sem empurrar o layout.
- **`symbol-dialog.tsx`** (novo): `SymbolDialog({ open, onOpenChange, onPick(symbol) })` sobre `Dialog` e `Tabs`.
  - A grade é um grupo de botões com tabindex itinerante (`gridMoveTarget`; as colunas vêm do `grid-template-columns` calculado).
  - A borda de baixo esmaece com uma máscara, e o botão redondo azul com a seta rola uma página quando ainda há o que rolar.
  - Escolher chama `onPick` e fecha. O campo insere com `editor.chain().focus().insertContent(symbol).run()`, que usa as marcas do ponto do cursor (RN-12) e é barrado pelo `StatementLimit` quando não cabe (RN-14).
  - Fechar sem escolher devolve o foco ao campo pela seleção que o ProseMirror guardou (RN-13).
- `question-canvas.tsx`: `initialText`/`onSaveText` viram `initialStatement`/`onSaveStatement`. `quiz-editor.tsx` envia `{ kind: "text", text, formatting }`. `lib/quiz-error-messages.ts` ganha "Não foi possível salvar a formatação." para `QUIZ.INVALID_TEXT_FORMATTING`.

### Design system — `packages/ui`

- **`toggle.tsx`** (novo, `npx shadcn@latest add toggle -c packages/ui`, sobre `@base-ui/react/toggle`, convertido ao estilo do projeto): variante `toolbar`. Fica cinza, mais claro ao passar o ponteiro, e cinza-escuro com o símbolo branco quando pressionado.
- **`tabs.tsx`**: `cva` com a variante `pill` no `TabsList`/`TabsTrigger`. As abas são botões pressionáveis cinza-claros, e a escolhida fica azul-escura com o texto branco, como no diálogo do Kahoot.
- Os dois entram na página `/design-system`, e `docs/design-system.md` ganha a fonte de símbolos e o `FormattedText`.

### Enunciado nas outras telas

- **`components/quiz/formatted-text.tsx`** (novo): `FormattedText({ text, formatting, className })`.
  - Desenha os segmentos com `strong`, `em`, `sub` e `sup`, aninhados nessa ordem, a partir de um `span` com `font-normal`. O peso normal fica no próprio componente, e nenhuma tela esquece a RN-24.
  - O `sub` e o `sup` usam o estilo do preflight do Tailwind, que já não afasta as linhas (RN-26).
  - O texto vem como nós de texto do React, nunca como HTML.
- Troca de `{…text}` por `FormattedText`, tirando o `font-bold`/`font-semibold` do enunciado (RN-24, RN-25):
  - **Editor:**
    - `question-list.tsx`: a parte visível; o `aria-label` continua com o texto puro, RN-27;
    - `incomplete-questions-dialog.tsx`.
  - **Páginas do quiz:**
    - `quiz/quiz-question-preview.tsx` (`QuestionSlide`, `QuestionRow`);
    - `groups/shared/shared-question-list.tsx`, que serve o quiz compartilhado e o público.
  - **Tela do anfitrião:**
    - `game/host/stage-screens.tsx` (`QuestionText`, na abertura e nas respostas e resultados);
    - `game/host/answer-review.tsx`, que recebe `questionFormatting` de `host-stage.tsx`.
  - **Celular:**
    - `game/player/question-on-device.tsx` (`Statement`, `DeviceQuestionIntro`, `DeviceQuestion`);
    - `game/player/player-stage.tsx`.
  - **Atividade:**
    - `assignment/play/play-stage.tsx` (`QuestionLayout`);
    - `play-question.tsx` (`asDeviceQuestion`);
    - `play-result.tsx`.
  - **Relatórios:**
    - `reports/questions-table.tsx`: a pesquisa continua sobre o `text`, RN-23;
    - `question-detail.tsx`, `report-summary.tsx` e `participant-detail.tsx`.
- O `generated-question-card.tsx` do assistente continua com texto puro: as perguntas criadas não têm formatação.

### Testes de componentes com o editor

O ProseMirror no jsdom monta, aplica comandos e responde ao foco, mas não digita nem seleciona como um navegador. Por isso:

- `src/testing/setup.ts` ganha os stubs de que o ProseMirror precisa no jsdom: `Range.prototype.getBoundingClientRect`/`getClientRects` e `document.elementFromPoint`.
- `src/testing/statement-editor.ts` traz `statementEditorOf(element)`, que lê a instância que o Tiptap guarda no próprio elemento editável (`element.editor`), e `typeStatement(element, text)`, que escreve por comando. Os testes que hoje digitam no enunciado (`question-text-field`, `question-canvas`, `quiz-editor`) passam a usá-los.
- Digitar, selecionar com o mouse ou o teclado, os atalhos, desfazer e colar ficam no E2E.
- Nos E2E que conferem o enunciado com `toHaveValue` (`assistant.spec.ts`, `game-options.spec.ts`, `game-play.spec.ts`), a conferência passa a `toHaveText`.

## Estratégia de testes

| CA | Teste | Camada |
| --- | --- | --- |
| CA-01 | `question-text-field.test.tsx`: "shows the toolbar only while the statement or the toolbar has focus", "clicking a button keeps the focus"; E2E `statement-formatting.spec.ts` | componente, E2E |
| CA-02 | `question.test.ts`: "parseQuestionStatement keeps a bold range"; `update-question.test.ts`: "saves the text and its formatting"; `drizzle-question-repository.test.ts`: "round-trips text_formatting"; E2E (selecionar, B, recarregar) | domínio, aplicação, repositório, E2E |
| CA-03 | `formatting-toolbar.test.tsx`: "a button is pressed while its mark is on"; E2E (B sem seleção, digitar, B de novo) | componente, E2E |
| CA-04 | `text-formatting.test.ts`: "bold and italic may cover the same range"; `statement-document.test.ts`: "a text node with two marks gives a range in each"; E2E | domínio, web unit, E2E |
| CA-05 | `statement-document.test.ts`: "a superscript digit becomes a superscript range"; `formatted-text.test.tsx`: "draws sup"; E2E | web unit, componente, E2E |
| CA-06 | `question.test.ts`: "refuses subscript overlapping superscript"; `statement-extensions.test.ts`: "turning subscript on removes superscript there" (comando sobre o esquema, sem DOM); E2E | domínio, web unit, E2E |
| CA-07 | E2E: Ctrl+B, Ctrl+I, Ctrl+, e Ctrl+. | E2E |
| CA-08 | E2E: Ctrl+Z e Ctrl+Shift+Z depois de um negrito | E2E |
| CA-09 | `question.test.ts`: "the limit counts the text, not the formatting"; `question-text-field.test.tsx`: "the counter ignores the formatting" | domínio, componente |
| CA-10 | `statement-extensions.test.ts`: "refuses a transaction past 160 characters", "accepts a mark change at the limit"; E2E | web unit, E2E |
| CA-11 | `statement-extensions.test.ts`: "a pasted slice keeps the four marks and drops the rest", "blocks become one line", "fitSliceToRoom cuts at a grapheme"; E2E (colar HTML com `DataTransfer`) | web unit, E2E |
| CA-12 | `formatting-toolbar.test.tsx`: "each button has its tooltip" | componente |
| CA-13 | `symbol-dialog.test.tsx`: "opens on Caracteres especiais with five tabs", "Cancelar, Esc and outside close without picking"; `question-text-field.test.tsx`: "closing the dialog gives the focus back to the field" | componente |
| CA-14 | `question-text-field.test.tsx`: "a picked symbol goes in at the cursor and the counter drops by one"; E2E | componente, E2E |
| CA-15 | `question-text-field.test.tsx`: "a symbol replaces the selection", "takes the marks where it goes" | componente |
| CA-16 | `statement-extensions.test.ts`: "a symbol that does not fit changes nothing"; `question-text-field.test.tsx` | web unit, componente |
| CA-17 | `symbol-catalog.test.ts`: "Grego has 24 capitals and 25 small letters with σ and ς", "every symbol is covered by Montserrat or Quizio Symbols", "each symbol is one grapheme"; `symbol-dialog.test.tsx`: "the grid scrolls"; E2E (desktop e mobile) | web unit, componente, E2E |
| CA-18 | `symbol-grid.test.ts`: "arrows move by one and by a row"; `symbol-dialog.test.tsx`: "Enter on a symbol picks it" | web unit, componente |
| CA-19 | `quiz-version.test.ts`: "a formatting change makes the lists differ"; `discard-quiz-changes.test.ts`: "brings back the saved formatting"; `start-game.test.ts`: "a game takes the formatting of the playable version" | domínio, aplicação |
| CA-20 | `question.test.ts`: "copyQuestion copies the formatting deeply"; `question-change.test.ts`: "a type change keeps the formatting"; `duplicate-quiz.test.ts`, `duplicate-shared-quiz.test.ts` | domínio, aplicação |
| CA-21 | `host-game-view.test.ts`: "the host's question carries the formatting"; `stage-screens.test.tsx` (ou `host-stage.test.tsx`): "draws the statement formatted, in normal weight" | aplicação, componente |
| CA-22 | `public-stage.test.ts`: "carries the formatting only with the statement"; `player-stage.test.tsx`: "the device draws the subscript" | domínio, componente |
| CA-23 | `start-game.test.ts` e `create-assignment.test.ts`: "a later edit does not reach the copy"; `game-question.test.ts`: "parseStoredGameQuestion reads a copy without formatting" | aplicação, domínio |
| CA-24 | `assignment-play-view.test.ts`; `play-question.test.tsx` e `play-result.test.tsx` | aplicação, componente |
| CA-25 | `get-report-question.test.ts`, `get-report.test.ts`; `drizzle-report-game-query.test.ts`; `report-details.test.tsx`, `report-tables.test.tsx` (inclui a pesquisa pelo texto), `report-summary.test.tsx` | aplicação, repositório, componente |
| CA-26 | `quiz-question-preview.test.tsx`, `shared-quiz-page.test.tsx`, `question-list.test.tsx` | componente |
| CA-27 | `drizzle-question-repository.test.ts`: "a row written before reads without formatting" (coluna com o padrão); `quiz-version.test.ts`: "a stored version without the field reads without formatting"; `formatted-text.test.tsx`: "plain text in normal weight" | repositório, domínio, componente |
| CA-28 | E2E `statement-formatting.spec.ts` no projeto mobile (barra inteira na tela, diálogo com menos colunas e rolagem) | E2E |
| CA-29 | `statement-markup.test.ts`: "renders sup tags"; `tools/quizzes.test.ts`: "get_quiz returns the statement as markup"; `tools/reports.test.ts`, `tools/library.test.ts` | adapter (mcp) |
| CA-30 | `statement-markup.test.ts`: "parses nested tags into ranges"; `tools/questions.test.ts`: "add_questions keeps sub and bold", "update_question without tags clears the formatting" | adapter (mcp) |
| CA-31 | `statement-markup.test.ts`: "refuses an unknown tag listing the four", "keeps x < 3 as text", "round-trips a literal tag-like text"; `tools/questions.test.ts` | adapter (mcp) |
| CA-32 | `tools/questions.test.ts`: "160 characters with tags are accepted, 161 are refused" | adapter (mcp) |

Também: `text-formatting.test.ts` (normalização, fronteiras de caracteres percebidos, corte das pontas, leitura tolerante, segmentos), `routers/quiz-questions.test.ts` (a forma de `formatting`, o padrão sem ela e o código de erro), `tools-inputs.test.ts` e o teste de entradas sem limite da API (os textos novos têm teto).

## Dados e migração

- `pnpm db:generate` gera a `0021_question_text_formatting`, que só acrescenta `question.text_formatting` com o padrão `'{}'`. Nenhuma linha é reescrita: as perguntas, as versões e as cópias das partidas existentes são lidas sem formatação (RN-22).
- É compatível com o código em produção (o `vercel.json` aplica a migration antes do build): o código anterior não conhece a coluna e grava as perguntas sem ela, e o padrão a preenche.
- Localmente, se o `db:push` falhar pelas chaves compostas, aplicar o `ALTER TABLE` à mão no container (o banco local é compartilhado pelas worktrees).

## Riscos e decisões

- **ADR 0025 (rascunho)**: a formatação como trechos por marca ao lado do texto, no shared kernel; o Tiptap 3 como editor; a marcação inline para os agentes; e a fonte de símbolos recortada.
- **Peso da página do editor**: o Tiptap e o ProseMirror entram só na rota do editor. Medir o pedaço no `vite build` da implementação; se a rota não estiver dividida, carregar o campo com `lazy`.
- **ProseMirror no jsdom**: os stubs e o acesso por comando cobrem os testes de componente; o que depende do navegador fica no E2E. Se os stubs não bastarem para um teste, ele vai para o E2E, sem afrouxar o critério.
- **Posições em UTF-16 e caracteres percebidos**: o editor trabalha em UTF-16, e a normalização leva as pontas às fronteiras dos caracteres percebidos. Assim, um trecho nunca parte um emoji, venha do editor ou de um agente.
- **Peso normal em todas as telas** (RN-24): muda a aparência de todos os quizzes. Fica restrito ao `FormattedText`, e os testes de componente conferem o peso.
- **Marcação dos agentes**: um texto literal com cara de tag sai escapado como `&lt;`, e só `&lt;` é decodificado na entrada. É a única ambiguidade do formato, e fica documentada na descrição do campo.
- **Fonte de símbolos**: o recorte depende de fontes baixadas à mão, e o script e a cobertura ficam versionados. Acrescentar um símbolo sem rodar o script faz o teste do catálogo falhar (RN-16). A licença OFL vai junto do arquivo.
- **Spec seguinte (respostas)**: reaproveita `TextFormatting`, `textFormattingInput`, `FormattedText`, as extensões, a barra, o diálogo e a marcação dos agentes. Esta spec não generaliza nada além do que o enunciado usa.

## Ajustes da implementação (2026-10-30)

- A mudança `text` leva `formatting` **opcional** no core (`QuestionChange`): sem ela, a pergunta fica sem formatação, como o plano previa para o router. Na API, `textFormattingInput` é um `z.partialRecord` das quatro marcas com `.default({})`.
- `FormattedText` aceita formatação ausente e desenha o texto puro: um evento de palco publicado por um servidor da versão anterior, durante o deploy, não traz o campo.
- O campo e a barra ficam num `fieldset` (o grupo do foco), e o enunciado ganhou um espaço acima para a barra flutuar sem cobrir o cabeçalho.
- Tiptap fixado em 3.32.0 (a 3.32.1 tinha dois dias). O ProseMirror fica só no pedaço da rota do editor: ele passou de cerca de 45 KB para 149 KB comprimidos; nenhuma outra tela mudou de tamanho, então não houve carregamento sob demanda.
- A fonte de símbolos saiu em dois arquivos, `quizio-symbols-sans.woff2` (grego e moedas, peso variável, ~20 KB) e `quizio-symbols-math.woff2` (~13 KB); a Noto Sans Symbols 2 não precisou entrar. ؋, ៛ e ﷼ saíram da aba Moeda (pediriam as Noto árabe e khmer). A fonte do app passou a ser a Montserrat estática (`@fontsource/montserrat`), a pedido do usuário.
- No MCP, `withStatementMarkup` troca o par pelo texto com tags nas saídas de perguntas, relatórios e quizzes de outras pessoas; `statementFromMarkup` faz o caminho de volta nas entradas.
