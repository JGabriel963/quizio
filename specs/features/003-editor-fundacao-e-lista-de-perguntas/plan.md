---
spec: "003"
status: approved # draft | approved
---

# Plano técnico — 003 Editor 1/5: fundação e lista de perguntas

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0008](../../../docs/adr/0008-modelo-de-perguntas.md)

## Abordagem

O contexto **quiz** ganha a entidade **pergunta (`Question`)**, com uma tabela própria (`question`) ligada ao quiz. A tabela guarda em colunas o que é comum a todo tipo e é consultado ou ordenado: posição, tipo e enunciado. O conteúdo que muda de tipo para tipo irá para uma coluna `content jsonb`, validada pelo core. A decisão está no [ADR 0008](../../../docs/adr/0008-modelo-de-perguntas.md). Nesta etapa a tabela nasce só com o que a spec 003 usa; as colunas das specs 004 a 007 estão listadas em [Evolução prevista do modelo](#evolução-prevista-do-modelo), para que o desenho completo fique visível desde já.

As regras da lista (pelo menos 1 pergunta, no máximo 200, inserir depois da selecionada, mover, excluir e desfazer) são **funções puras** sobre uma lista ordenada de perguntas, em `quiz/domain/question-list.ts`. Os casos de uso carregam o quiz e a lista, aplicam a função e persistem por uma porta nova, `QuestionRepository`. A porta separa as duas escritas que o editor faz:

- **`saveList`** para as operações estruturais (adicionar, duplicar, mover, excluir, desfazer). Ela substitui a lista inteira numa transação, e isso cabe folgado no limite de 200 perguntas.
- **`saveQuestion`** para o salvamento automático do enunciado, que é a escrita frequente e toca uma única linha.

No cliente, o editor é uma rota nova em tela cheia, `/creator/$quizId`, fora da casca da área do criador. O estado vem de uma única query (`quiz.editor`). As operações estruturais usam atualização otimista quando os ids já são conhecidos (mover, excluir). Adicionar e duplicar esperam o id devolvido pelo servidor. Os textos seguem por um salvamento automático com debounce, coordenado por um **rastreador de salvamento** que alimenta o indicador do cabeçalho, guarda as falhas para "Tentar de novo" e esvazia a fila antes de sair.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Pergunta | `Question` | sim (era 📝) |
| Tipo de pergunta | `QuestionType` (`"quiz"` nesta etapa) | sim (era 📝) |
| Enunciado | `text` | sim |
| Pergunta em branco | `blankQuestion` | sim |
| Posição | `position` (índice na lista) | sim |
| Limite de perguntas | `QUIZ_MAX_QUESTIONS` | sim |
| Limite do enunciado | `QUESTION_TEXT_MAX_LENGTH` | sim |
| Editor | rota `/creator/$quizId`, `QuizEditorView` | sim |
| Salvamento automático | `Autosave`, `SaveTracker` | sim |
| Renomear quiz | `renameQuiz` | sim |

## Domínio — `packages/core/src/quiz/domain`

### Agregados e entidades

**`Question`** (`question.ts`) é uma entidade do contexto quiz. Ela é identificada por `id` e pertence a um quiz. A posição **não** é um atributo da entidade: é o índice na lista, e só o adapter a grava.

```ts
export const QUESTION_TYPES = ["quiz"] as const; // "trueFalse" chega na spec 005
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface Question {
	id: string;
	type: QuestionType;
	/** null = sem enunciado (permitido no rascunho, RN-09). */
	text: string | null;
}

export const QUESTION_TEXT_MAX_LENGTH = 120; // RN-10
export function blankQuestion(id: string): Question; // type "quiz", text null (RN-09)
export function parseQuestionText(raw: string | null): string | null; // trim, "" → null, > 120 → erro (RN-10)
export function copyQuestion(source: Question, id: string): Question; // RN-12
```

**Lista de perguntas** (`question-list.ts`). A lista é um `readonly Question[]` em ordem. As invariantes são as da spec:

```ts
export const QUIZ_MAX_QUESTIONS = 200; // RN-16, configurável: única fonte do valor

/** Insere logo depois de `afterId` (RN-11, RN-12); com `afterId` null, no fim. Erro se chegar a 201 ou se `afterId` não existir. */
export function insertQuestionAfter(list, afterId: string | null, question): { list; index: number };
/** RN-13. `toIndex` fora de 0..n-1 → erro. */
export function moveQuestion(list, questionId, toIndex: number): readonly Question[];
/** RN-14/RN-15. Erro se for a única pergunta. */
export function removeQuestion(list, questionId): { list; removed: Question; index: number };
/** "Desfazer" (RN-14): recoloca em `index`, limitado a 0..n; idempotente se o id já estiver na lista; respeita o limite. */
export function restoreQuestionAt(list, question, index: number): { list; index: number };
```

**`Quiz`** (`quiz.ts`) ganha duas funções:

- `touchQuiz(quiz, now)`: exige `assertQuizEditable` e atualiza `updatedAt` (RN-24). Toda alteração feita no editor passa por ela.
- `renameQuiz(quiz, title, now)`: usa o `parseQuizTitle` existente (RN-18).

`copyQuiz` não muda. As perguntas são copiadas pelo caso de uso.

### Value objects

`QuestionType` e o enunciado validado (`parseQuestionText`). A contagem de caracteres usa o `characterCount` do shared kernel.

### Serviços de domínio

Nenhum além das funções puras de `question-list.ts`.

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `QuestionNotFoundError` (estende `NotFoundError`) | `QUIZ.QUESTION_NOT_FOUND` | O id da pergunta não está na lista do quiz |
| `QuestionTextTooLongError` | `QUIZ.QUESTION_TEXT_TOO_LONG` | O enunciado passa de 120 caracteres (RN-10) |
| `QuestionLimitReachedError` | `QUIZ.QUESTION_LIMIT_REACHED` | Adicionar, duplicar ou desfazer levaria a 201 perguntas (RN-16) |
| `LastQuestionError` | `QUIZ.LAST_QUESTION` | Tentativa de excluir a única pergunta (RN-15) |
| `InvalidQuestionPositionError` | `QUIZ.INVALID_QUESTION_POSITION` | `toIndex` fora da lista |
| `QuizInTrashError` (existe) | `QUIZ.IN_TRASH` | Qualquer operação do editor num quiz na lixeira (RN-03) |
| `QuizNotFoundError` (existe) | `QUIZ.NOT_FOUND` | Quiz inexistente ou de outro dono (RN-02) |

## Aplicação — `packages/core/src/quiz/application`

Todos os casos de uso recebem `{ ownerId, quizId }` (`QuizReference`) e seguem o mesmo roteiro:

1. `requireOwnedQuiz` e depois `assertQuizEditable`.
2. `questions.listByQuiz`.
3. A função pura de domínio.
4. A escrita das perguntas.
5. `quizzes.save(touchQuiz(quiz, now))`.

As perguntas são gravadas **antes** do `touchQuiz`. Se a segunda escrita falhar, o único efeito é uma "última modificação" atrasada (ver Riscos).

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `getQuizEditor` | `QuizReference` | `QuizEditorView` | NOT_FOUND, IN_TRASH | quizzes, questions, storage |
| `addQuestion` | ref + `afterQuestionId: string \| null` | `{ question: QuestionView; index }` | NOT_FOUND, IN_TRASH, QUESTION_NOT_FOUND, QUESTION_LIMIT_REACHED | quizzes, questions, ids, clock |
| `duplicateQuestion` | ref + `questionId` | `{ question; index }` | idem | quizzes, questions, ids, clock |
| `moveQuestion` | ref + `questionId`, `toIndex` | `void` | NOT_FOUND, IN_TRASH, QUESTION_NOT_FOUND, INVALID_QUESTION_POSITION | quizzes, questions, clock |
| `deleteQuestion` | ref + `questionId` | `{ question: QuestionView; index }` (para o "Desfazer") | NOT_FOUND, IN_TRASH, QUESTION_NOT_FOUND, LAST_QUESTION | quizzes, questions, clock |
| `restoreQuestion` | ref + `question: { id, type, text }`, `index` | `{ index }` | NOT_FOUND, IN_TRASH, QUESTION_TEXT_TOO_LONG, QUESTION_LIMIT_REACHED | quizzes, questions, clock |
| `updateQuestion` | ref + `questionId`, `changes: { text?: string \| null }` | `QuestionView` | NOT_FOUND, IN_TRASH, QUESTION_NOT_FOUND, QUESTION_TEXT_TOO_LONG | quizzes, questions, clock |
| `renameQuiz` | ref + `title: string \| null` | `QuizDetailsView` | NOT_FOUND, IN_TRASH, TITLE_TOO_LONG | quizzes, questions, storage, clock |
| `createQuiz` (alterado) | como hoje | como hoje | como hoje | + questions: grava `[blankQuestion]` (RN-04) |
| `duplicateQuiz` (alterado) | como hoje | como hoje | como hoje | + questions: copia a lista com ids novos, na mesma ordem (RN-27). Um original sem perguntas gera uma cópia com uma pergunta em branco (RN-08) |
| `deleteQuizPermanently` (alterado) | como hoje | como hoje | como hoje | + questions: `deleteAllOfQuiz` antes de apagar o quiz (RN-28) |
| `getQuizDetails` (alterado) | como hoje | `questionCount` real (RN-26) | como hoje | + questions.countByQuiz |

Detalhes de cada caso:

- **`getQuizEditor` é leitura com uma única escrita possível.** Se o quiz não tem perguntas (quizzes antigos, RN-08), ele grava `saveList(quizId, [blankQuestion])` **sem** tocar `updatedAt` (RN-24: abrir não altera). Duas aberturas simultâneas não geram duas perguntas, porque `saveList` substitui a lista inteira: a última gravação vence e sobra uma pergunta só. Num quiz na lixeira, ele lança `QuizInTrashError` antes de qualquer escrita (RN-03).
- **`updateQuestion` já nasce com `changes` parcial.** A spec 004 acrescenta tempo, pontos e alternativas sem trocar a assinatura.
- **`restoreQuestion` recebe o conteúdo da pergunta excluída de volta do cliente**, que é o que `deleteQuestion` devolveu. Esse conteúdo é revalidado como qualquer edição, então nada diferente de uma edição normal entra no banco. Isso evita criar exclusão lógica (e o filtro `deleted_at` em toda consulta) só por causa do "Desfazer". Se o id já existe, a operação não faz nada: um "Desfazer" repetido nunca falha.

Views (`quiz/application/quiz-editor-view.ts`):

```ts
export interface QuestionView { id: string; type: QuestionType; text: string | null }
export interface QuizEditorView {
	quiz: QuizDetailsView; // title, coverImageUrl… para o cabeçalho e as Configurações
	questions: QuestionView[]; // em ordem; sempre ≥ 1
}
```

`toQuizDetailsView(quiz, storage, questionCount)` passa a receber a contagem. Deixa de existir o `questionCount: 0` fixo.

### Portas novas ou alteradas

`quiz/application/ports/question-repository.ts`:

```ts
export interface QuestionRepository {
	/** Perguntas do quiz em ordem de posição. */
	listByQuiz(quizId: string): Promise<Question[]>;
	countByQuiz(quizId: string): Promise<number>;
	/**
	 * Substitui a lista inteira do quiz, atomicamente: remove as que não estão
	 * em `questions`, insere/atualiza as demais e grava position = índice.
	 */
	saveList(quizId: string, questions: readonly Question[]): Promise<void>;
	/** Atualiza o conteúdo de uma pergunta existente, sem mexer na posição. */
	saveQuestion(quizId: string, question: Question): Promise<void>;
	deleteAllOfQuiz(quizId: string): Promise<void>;
}
```

Fake: `quiz/testing/in-memory-question-repository.ts` (`InMemoryQuestionRepository`), com o helper de teste `listOf(quizId)`. O contrato é testado do mesmo jeito nos dois lados: `in-memory-question-repository.test.ts` e o teste PGlite do adapter.

Builder: `quiz/testing/a-question.ts` (`aQuestion({ id, text })`).

## Adapters

### Banco — `packages/db`

Em `schema/quiz.ts`, junto do quiz, porque é o mesmo contexto:

```ts
export const questionType = pgEnum("question_type", QUESTION_TYPES);

export const question = pgTable(
	"question",
	{
		id: text("id").primaryKey(),
		quizId: text("quiz_id").notNull().references(() => quiz.id, { onDelete: "cascade" }),
		/** Índice na lista, 0..n-1; reescrito por saveList. */
		position: integer("position").notNull(),
		type: questionType("type").notNull(),
		text: text("text"),
	},
	(table) => [index("question_quiz_position_idx").on(table.quizId, table.position)],
);
```

- **Sem unique em `(quiz_id, position)`.** Uma renumeração passaria por estados intermediários duplicados. Quem garante a ordem é `saveList`, numa transação. O índice só serve para ler em ordem.
- `onDelete: "cascade"` reforça a RN-28 no banco, além do `deleteAllOfQuiz` explícito do caso de uso.
- O comentário `"published" arrives with the editor feature (spec 002)` do `quizStatus` passa a citar a **spec 006**.

`repositories/quiz/drizzle-question-repository.ts` (`createDrizzleQuestionRepository(db)`):

- `saveList` roda em `db.transaction`: `delete … where quiz_id = ? and id not in (…)`, depois um único `insert … values (…) on conflict (id) do update set position, type, text`.
- `saveQuestion` faz `update … where id = ? and quiz_id = ?`, sem tocar `position`.
- `countByQuiz` usa `count()`.

`repositories/library/drizzle-library-quiz-query.ts`: `questionCount` vira a subconsulta `(select count(*)::int from question where question.quiz_id = quiz.id)` e sai o comentário "(spec 003)" (RN-26). A página inicial herda a contagem, porque usa a mesma consulta.

### Real-time

Nenhum. O editor não sincroniza abas; vale a última escrita (spec, Fora de escopo).

### Storage / outros

Nenhum uso novo de storage. O `duplicateQuiz` continua copiando a capa como hoje.

## API — `packages/api`

Routers finos. O zod valida só a forma; limites e regras ficam no core. Novo arquivo `routers/quiz-questions.ts`, montado como `quiz.questions`. O `quiz.ts` ganha `editor` e `rename`.

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `quiz.editor` | query | protegida | `{ quizId }` | `QuizEditorView` | NOT_FOUND, IN_TRASH |
| `quiz.rename` | mutation | protegida | `{ quizId, title: string \| null }` | `QuizDetailsView` | NOT_FOUND, IN_TRASH, TITLE_TOO_LONG |
| `quiz.questions.add` | mutation | protegida | `{ quizId, afterQuestionId: string \| null }` | `{ question, index }` | NOT_FOUND, IN_TRASH, QUESTION_NOT_FOUND, QUESTION_LIMIT_REACHED |
| `quiz.questions.duplicate` | mutation | protegida | `{ quizId, questionId }` | `{ question, index }` | idem |
| `quiz.questions.move` | mutation | protegida | `{ quizId, questionId, toIndex: int ≥ 0 }` | `void` | NOT_FOUND, IN_TRASH, QUESTION_NOT_FOUND, INVALID_QUESTION_POSITION |
| `quiz.questions.delete` | mutation | protegida | `{ quizId, questionId }` | `{ question, index }` | NOT_FOUND, IN_TRASH, QUESTION_NOT_FOUND, LAST_QUESTION |
| `quiz.questions.restore` | mutation | protegida | `{ quizId, question: { id, type: enum(QUESTION_TYPES), text: string \| null }, index: int ≥ 0 }` | `{ index }` | NOT_FOUND, IN_TRASH, QUESTION_TEXT_TOO_LONG, QUESTION_LIMIT_REACHED |
| `quiz.questions.update` | mutation | protegida | `{ quizId, questionId, changes: { text?: string \| null } }` | `QuestionView` | NOT_FOUND, IN_TRASH, QUESTION_NOT_FOUND, QUESTION_TEXT_TOO_LONG |

`quiz.create` continua aceitando os dados opcionais. O Criar chama `quiz.create({})`.

Ligações novas:

- `container.ts`: `questions: QuestionRepository` em `Adapters`, e os oito casos de uso novos em `useCases`.
- `composition-root.ts`: `questions: createDrizzleQuestionRepository(db)`.
- `testing/test-context.ts`: expõe `questions: InMemoryQuestionRepository` e passa a calcular o `questionCount` dos registros da biblioteca a partir dele.

## UI — `apps/web` e `packages/ui`

### Rotas

A casca sai do guard para um layout sem caminho, o que deixa o editor sem ela (RN-06) sem mudar nenhuma URL:

| Arquivo | Papel |
| --- | --- |
| `routes/_auth/route.tsx` | Só o guard de sessão e o `<Outlet/>`. O `CreateQuizProvider` deixa de existir (ver abaixo). |
| `routes/_auth/_shell/route.tsx` (novo) | Layout sem caminho que renderiza o `AppShell` com o `pathname`. |
| `routes/_auth/_shell/library.tsx`, `routes/_auth/_shell/quizzes.$quizId.tsx` | Movidos de `_auth/`. As URLs não mudam. |
| `routes/_auth/creator.$quizId.tsx` (novo) | Editor em tela cheia (RN-01, RN-06). |

A página do quiz ganha o botão **Editar** como `<Button render={<Link to="/creator/$quizId" …/>} nativeButton={false}>`, em destaque (RN-05). "Editar dados" continua como ação secundária.

### Criar (RN-04)

`useCreateQuiz()` em `lib/quiz-mutations.ts` chama `quiz.create({})`, invalida biblioteca e painel e navega para `/creator/$quizId`. A barra superior, o estado vazio do painel e o da biblioteca chamam esse hook. Saem de uso, e por isso são removidos:

- `CreateQuizProvider`/`CreateQuizContext`, que existiam para hospedar o diálogo uma vez só;
- o modo `create` do `QuizFormDialog`, que fica só com `edit`.

Enquanto a criação está em andamento, o botão Criar fica indisponível, para evitar rascunhos duplicados num clique duplo.

### Componentes do editor — `apps/web/src/components/editor/`

| Componente | Responsabilidade |
| --- | --- |
| `quiz-editor.tsx` | Monta o editor a partir de `QuizEditorView` e mantém a pergunta selecionada. Em tela larga é uma grade de 3 colunas; em tela estreita, a lista e o painel ficam em gavetas abertas por botões (spec, Experiência). |
| `editor-header.tsx` | Marca, `QuizTitleField`, "Configurações" (abre o `QuizFormDialog` em modo `edit`), `SaveStatus` e "Sair" (`tracker.flush()` e depois a página do quiz; RN-23, CA-25). |
| `quiz-title-field.tsx` | Título com autosave (RN-18). Corta em 95 caracteres com `truncateCharacters` ao digitar ou colar. |
| `question-list.tsx` / `question-list-item.tsx` | Lista ordenável e miniatura com "N Quiz" e o começo do enunciado (RN-17). Duplicar e excluir ficam com `Tooltip` quando indisponíveis (RN-15, RN-16). O botão Adicionar fica embaixo. |
| `question-canvas.tsx` | `QuestionTextField` em destaque, área de mídia e as quatro alternativas com `AnswerShape`, marcadas "Em breve" e desabilitadas (specs 004 e 007). |
| `question-text-field.tsx` | Enunciado com autosave, corte em 120 caracteres com `truncateCharacters` e contador de restantes a partir de 100. |
| `question-properties-panel.tsx` | "Tipo de pergunta: Quiz" (só leitura). Excluir e Duplicar no rodapé, com as mesmas regras da lista. |
| `save-status.tsx` | "Salvando…", "✓ Salvo" ou "Não foi possível salvar · Tentar de novo", num `role="status"`. |
| `editor-unavailable.tsx` | Estados de carregando (skeleton no formato do editor), não encontrado, na lixeira (link para `/library?section=trash`) e erro com tentar de novo (CA-04, CA-06, CA-30). |

**Arrastar e soltar:** `@dnd-kit/core` + `@dnd-kit/sortable`, novas dependências só de `apps/web` e por isso fora do catálogo. O sensor de teclado já vem com a biblioteca: Espaço pega o item, as setas movem, Espaço solta. Os anúncios de leitor de tela serão traduzidos para PT-BR (CA-12). Soltar chama `quiz.questions.move`.

### Estado e salvamento — `apps/web/src/lib/`

- **`editor-cache.ts`** reúne atualizações puras do cache de `quiz.editor`: mover e excluir aplicam `moveQuestion`/`removeQuestion` do core de forma otimista, com rollback no erro. Tem também a regra de seleção depois de excluir, `selectionAfterRemoval(list, index)` (RN-14, CA-14).
- **`question-mutations.ts`**: um hook por operação. Adicionar e duplicar esperam a resposta, inserem no cache e selecionam o item novo. Excluir mostra o toast "Pergunta excluída." com a ação "Desfazer", que chama `restore` com o que `delete` devolveu (RN-14). Toda mutation é registrada no rastreador.
- **`save-tracker.ts`** é um store pequeno, sem React, com um hook `useSaveTracker()` por cima (RN-20 a RN-23):
  - `track(key, run)`: executa, conta pendências e, se falhar, guarda a **última** operação daquela `key` para "Tentar de novo". A `key` é, por exemplo, `question:<id>:text` ou `quiz:title`.
  - `status`: `"saving" | "saved" | "failed"`.
  - `retry()` reenvia as operações que falharam.
  - `flush()` dispara os debounces pendentes e espera tudo terminar. Resolve `false` se sobrar falha.
- **`use-debounced-autosave.ts`** guarda o valor local do campo e envia **800 ms** depois da última tecla e no `blur`. Isso resolve a pergunta em aberto da spec. Por `key`, só uma requisição fica em voo: o valor mais recente espera a anterior terminar, o que impede uma resposta antiga de sobrescrever uma nova. No desmonte, ele faz o flush.
- **Sair com pendências:** `useBlocker` do TanStack Router com `enableBeforeUnload` enquanto `status !== "saved"`. Na navegação interna ele tenta `flush()` e só bloqueia se a tentativa falhar (RN-23).
- **Erros:** os códigos novos entram em `lib/quiz-error-messages.ts`, por exemplo `QUIZ.LAST_QUESTION` → "Não é possível excluir todo o conteúdo." e `QUIZ.QUESTION_LIMIT_REACHED` → "Limite de 200 perguntas atingido.". O `api-types.ts` ganha `QuizEditorData` e `QuestionData`.

### Design system — `packages/ui`

Nada de primitivo novo: `Tooltip`, `Button`, `Skeleton`, `AnswerShape` e `Badge` já existem. As cores de fundo do editor (roxo do Kahoot) usam os tokens de `globals.css`. Se faltar um tom, ele entra como token lá, não como cor solta na tela.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | aplicação | creates the quiz with one blank quiz question | `core/src/quiz/application/create-quiz.test.ts` |
| CA-01 | API | `quiz.create({})` then `quiz.editor` returns one blank question | `api/src/routers/quiz.test.ts` |
| CA-01 | E2E | Criar opens `/creator/<id>` with "1 Quiz" selected; Rascunhos shows "1 pergunta" | `web/e2e/editor.spec.ts` |
| CA-02 | componente | details page renders "Editar" linking to `/creator/<id>` | `web/src/components/quiz/quiz-details-view.test.tsx` |
| CA-03 | E2E | Sair returns to the quiz page with updated title and count | `web/e2e/editor.spec.ts` |
| CA-04 | aplicação | hides missing and foreign quizzes behind QuizNotFoundError | `core/src/quiz/application/get-quiz-editor.test.ts` |
| CA-04 | API | `quiz.editor` of another owner is NOT_FOUND | `api/src/routers/quiz.test.ts` |
| CA-05 | E2E | a visitor opening `/creator/<id>` signs in and comes back to the editor | `web/e2e/editor.spec.ts` |
| CA-06 | aplicação | rejects every editor operation on a trashed quiz (tabela de casos) | `core/src/quiz/application/question-use-cases.test.ts` |
| CA-06 | componente | trashed state links to the trash section | `web/src/components/editor/editor-unavailable.test.tsx` |
| CA-07 | aplicação | gives a question-less quiz one blank question without touching updatedAt | `get-quiz-editor.test.ts` |
| CA-08 | componente | editor shows header, list, canvas and properties, and no main nav | `web/src/components/editor/quiz-editor.test.tsx` |
| CA-09 | domínio | inserts right after the given question | `core/src/quiz/domain/question-list.test.ts` |
| CA-09 | aplicação | adds a blank question after the selected one and touches updatedAt | `core/src/quiz/application/add-question.test.ts` |
| CA-09, CA-11 | repositório | saveList persists order, removes missing rows, keeps other quizzes intact | `db/src/repositories/quiz/drizzle-question-repository.test.ts` |
| CA-10 | domínio + aplicação | copy goes right after the original, with its text, under a new id | `question-list.test.ts`, `duplicate-question.test.ts` |
| CA-11 | domínio | moves a question to a new index | `question-list.test.ts` |
| CA-11 | E2E | dragging C before A persists after reload | `web/e2e/editor.spec.ts` |
| CA-12 | E2E | keyboard (Espaço, ↑, Espaço) moves B above A and keeps focus | `web/e2e/editor.spec.ts` |
| CA-13 | domínio + aplicação | removes and restores at the same index; repeated restore is a no-op | `question-list.test.ts`, `delete-question.test.ts`, `restore-question.test.ts` |
| CA-13 | E2E | delete then "Desfazer" brings B back between A and C | `web/e2e/editor.spec.ts` |
| CA-13, CA-14 | unidade (web) | selection after removal: next one, or previous when last | `web/src/lib/editor-cache.test.ts` |
| CA-15 | domínio | refuses to remove the only question (LastQuestionError) | `question-list.test.ts` |
| CA-15 | componente | delete is disabled with "Não é possível excluir todo o conteúdo" in list and panel | `question-list.test.tsx`, `question-properties-panel.test.tsx` |
| CA-16 | domínio | 199 → 200 allowed, 200 → 201 refused (insert and restore) | `question-list.test.ts` |
| CA-16 | componente | Adicionar and Duplicar are disabled at 200 with the reason | `question-list.test.tsx` |
| CA-17 | componente | clicking an item selects it and shows its text in the canvas | `quiz-editor.test.tsx` |
| CA-18 | aplicação | updates the text and touches updatedAt | `update-question.test.ts` |
| CA-18 | unidade (web) | sends 800 ms after the last change and on blur; one request in flight per key | `web/src/lib/use-debounced-autosave.test.tsx` |
| CA-18 | E2E | typed text survives a reload and shows in the list item | `web/e2e/editor.spec.ts` |
| CA-19 | domínio | 120 graphemes (accents and emoji) accepted, 121 refused | `core/src/quiz/domain/question.test.ts` |
| CA-19 | componente | typing or pasting 130 characters keeps the first 120 | `question-text-field.test.tsx` |
| CA-20 | domínio | whitespace-only text is stored as null | `question.test.ts` |
| CA-21 | aplicação | renames within 95 characters, refuses longer, touches updatedAt | `core/src/quiz/application/rename-quiz.test.ts` |
| CA-21 | componente | title field caps at 95 and autosaves | `quiz-title-field.test.tsx` |
| CA-22 | componente | Configurações opens the details dialog in edit mode with current values | `editor-header.test.tsx` |
| CA-23 | unidade (web) | status goes saving → saved | `web/src/lib/save-tracker.test.ts` |
| CA-23 | componente | status texts and role="status" | `save-status.test.tsx` |
| CA-24 | unidade (web) | a failure keeps the latest op per key and retry resends it | `save-tracker.test.ts` |
| CA-24 | E2E | offline typing shows failure; back online, retry saves and survives reload | `web/e2e/editor.spec.ts` |
| CA-25 | unidade (web) + componente | flush fires pending debounces; Sair awaits flush before navigating | `save-tracker.test.ts`, `editor-header.test.tsx` |
| CA-26 | aplicação | each mutating use case sets updatedAt to now; getQuizEditor does not | `question-use-cases.test.ts`, `get-quiz-editor.test.ts` |
| CA-27 | repositório | library records carry the real question count | `db/src/repositories/library/drizzle-library-quiz-query.test.ts` |
| CA-27 | aplicação | details view reports the question count | `get-quiz-details.test.ts` |
| CA-28 | aplicação | duplicating copies questions in order with new ids, independent of the original | `duplicate-quiz.test.ts` |
| CA-29 | aplicação + repositório | permanent deletion removes the questions (use case and FK cascade) | `delete-quiz-permanently.test.ts`, `drizzle-question-repository.test.ts` |
| CA-30 | componente | loading skeleton, and error with retry | `editor-unavailable.test.tsx` |

**Testes existentes que mudam:**
- Os E2E que criam um quiz pelo formulário (`library.spec.ts`: criar com capa PNG, duplicar, excluir; `home.spec.ts`: criar pela barra superior) passam a criar pelo editor. A capa passa a ser enviada em **Configurações**.
- O helper de criar quiz em `e2e/support.ts` segue a mesma mudança.
- Os testes do `QuizFormDialog` em modo `create` saem.

## Dados e migração

- Tabela e enum novos: `pnpm db:push` em desenvolvimento, como até aqui (o roadmap adia `db:generate` para antes do primeiro deploy).
- **Sem backfill:** quizzes antigos ganham a pergunta em branco ao abrir o editor (RN-08, `getQuizEditor`). Até lá, aparecem com "0 perguntas" na biblioteca, o que é verdade.

## Evolução prevista do modelo

Referência para as próximas specs, **não implementada aqui**:

| Spec | Muda no banco | Muda no domínio |
| --- | --- | --- |
| 004 | `question`: `time_limit_seconds int`, `points` (enum `standard`/`double`/`none`), `content jsonb` com `{ selection, choices: [{ id, text, correct }] }` | `Question` vira união discriminada por `type`; `parseQuestionContent`; avisos de pergunta incompleta |
| 005 | `question_type` ganha `true_false`; `content` = `{ correct: boolean \| null }` | Conversão de tipo. As alternativas de Quiz ficam só na memória do cliente durante a sessão |
| 006 | `quiz.status` ganha `published`; tabela `quiz_version (id, quiz_id, number, snapshot jsonb, published_at)`; `quiz.published_version_id` | `publishQuiz` valida tudo e congela o snapshot |
| 007 | `question.image_key`; `imageKey` dentro de cada alternativa em `content` | Política de mídia nas perguntas |

## Riscos e decisões

- **ADR 0008 (aceito): modelo de perguntas em colunas + `jsonb` por tipo, com versão jogável como snapshot.** É a decisão estrutural que o editor inteiro vai seguir. [Rascunho](../../../docs/adr/0008-modelo-de-perguntas.md).
- **Escritas não atômicas entre perguntas e quiz.** As perguntas e o `updatedAt` do quiz são duas escritas por portas diferentes. Se a segunda falhar, o quiz fica com a "última modificação" atrasada e nada se perde. Uma unidade de trabalho entre repositórios fica para quando houver uma regra que exija atomicidade de verdade, e a publicação (006) é a candidata natural.
- **Duas abas no mesmo quiz.** Vale a última escrita por campo, e `saveList` de uma aba pode desfazer uma reordenação da outra. Está fora de escopo na spec; o cliente refaz a query `quiz.editor` ao voltar o foco para a janela, o que reduz a divergência.
- **Carga do autosave.** 800 ms de debounce mais uma requisição em voo por campo mantêm poucas chamadas por pergunta. Cada chamada custa 2 leituras (quiz e lista) e 2 escritas. Se isso pesar na Vercel, `updateQuestion` pode deixar de carregar a lista inteira e passar a usar `saveQuestion` com checagem de pertença; a porta já permite essa troca.
- **Mudança de comportamento do Criar.** Ele cria no banco antes de o criador digitar qualquer coisa, então quem abre e sai deixa um rascunho vazio, igual ao Kahoot. Aceito; a limpeza de rascunhos vazios não entra aqui.
- **Nova dependência (`@dnd-kit`).** Só no `apps/web`, não é decisão arquitetural. A alternativa (HTML5 drag and drop nativo) não tem suporte a teclado nem a toque.

## Descobertas na implementação (2026-09-25)

- **Corrida entre o autosave do título e as operações da lista.** O E2E "Sair" perdeu o título: `addQuestion` carregava o quiz, o `rename` gravava o título, e o `markQuizEdited` regravava o quiz inteiro com a cópia antiga. A porta `QuizRepository` ganhou `touch(id, updatedAt)`, que grava só `updated_at`; todas as operações do editor usam essa função. Teste: `add-question.test.ts` › "never overwrites a quiz change made while the question was being added" e `drizzle-quiz-repository.test.ts` › "touch sets only updatedAt".
- **Mudança digitada ainda no debounce contava como "Salvo".** Fechar a aba nos 800 ms perdia o texto sem aviso (RN-23). O `SaveTracker` ganhou `markPending`/`clearPending`: o estado vira "Salvando…" na primeira tecla, o que também liga o aviso do navegador ao sair.
- **Offline, o TanStack Query pausa mutations em vez de falhar**, e o editor ficaria em "Salvando…" para sempre. As mutations do editor usam `networkMode: "always"` para mostrar "Não foi possível salvar" e o "Tentar de novo" (CA-24).
- **Ids que voltam do cliente no "Desfazer".** `saveList` usa `on conflict … do update … where quiz_id = ?`, então um id de outro quiz nunca é tomado. A regra entrou no contrato da porta e no fake.
- **Subconsulta de contagem no Drizzle.** Dentro de SQL cru, as colunas saem sem o nome da tabela, e `"id"` apontava para `question.id`. Os nomes são qualificados à mão em `drizzle-library-quiz-query.ts`.
- **Configurações esvazia a fila de salvamento antes de abrir**, para o formulário partir do título já salvo. Depois de salvar ali, o campo de título do cabeçalho é remontado (`titleRevision`).
- **`CreateQuizContext` foi mantido**, com o valor `{ createQuiz, creating }`, porque é o ponto de injeção dos testes. Saiu o modo `create` do `QuizFormDialog` e do `QuizDetailsDialog`, cujo título virou "Configurações do quiz".
- **Links com cara de botão** (`Editar`, estados do editor) usam `Link` + `buttonVariants`, como na spec 002, para manter a semântica de link.
- **Nomes que mudaram em relação à tabela de testes:**
  - os testes do Criar ficaram em `app-shell.test.tsx`, não num `top-bar.test.tsx`;
  - o hook de ações se chama `useEditorActions` (`lib/question-mutations.ts`) e não tem teste unitário, porque depende do tRPC. Os componentes recebem `EditorActions` por props e são testados com fakes; o E2E cobre a ligação real.
- **Ambiente Windows:** com `core.autocrlf=true`, `pnpm check` converte CRLF → LF em todos os arquivos. Nesta entrega o Biome rodou só nos arquivos alterados.
