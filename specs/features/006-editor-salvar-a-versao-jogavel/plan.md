---
spec: "006"
status: approved # draft | approved
---

# Plano técnico — 006 Editor 4/5: Salvar a versão jogável

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0008](../../../docs/adr/0008-modelo-de-perguntas.md)

## Abordagem

O Salvar vira o caso de uso `publishQuiz`: carrega o quiz e as perguntas, confere tudo com regras puras do core (`incompleteQuestions`, título), e grava um **snapshot** da lista de perguntas na tabela `quiz_version` (decisão 4 do ADR 0008), marcando o quiz como `published`. As linhas vivas de `question` continuam sendo o rascunho de trabalho; nada muda no salvamento automático.

"Alterações não salvas" é a comparação por conteúdo entre a lista viva e o snapshot (`sameQuestionLists`, pura). O **editor** recebe o snapshot junto com o quiz e calcula o selo na hora, sobre o cache otimista. O **servidor** guarda o resultado da mesma comparação numa coluna do quiz (`has_unpublished_changes`), recalculada a cada escrita do editor, para a biblioteca e a página do quiz lerem sem carregar JSON.

Descartar é o caso de uso `discardQuizChanges`: reescreve a lista viva com as perguntas do snapshot.

Na interface, quatro diálogos novos e o selo de status. O fluxo (qual diálogo abre, para onde sai) mora no `QuizEditor`, que já conhece a seleção e as perguntas "recém-começadas".

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Versão jogável | `QuizVersion` | sim |
| Publicado | `status: "published"`, `QUIZ_STATUSES` | sim |
| Salvar (versão jogável) | `publishQuiz` | sim |
| Alterações não salvas | `hasUnpublishedChanges`, `sameQuestionLists` | sim |
| Descartar alterações | `discardQuizChanges` | sim |
| Pergunta incompleta (lista) | `incompleteQuestions`, `IncompleteQuestion` | sim |
| Respostas que faltam | `missingAnswerCount` | sim |
| Toques finais | `FinishingTouches` (`details` do `publishQuiz`) | sim |
| Estado de publicação | `QuizPublishState` (`draft` \| `published` \| `unpublishedChanges`) | sim |

## Domínio — `packages/core/src/quiz/domain`

### Agregados e entidades

**`Quiz`** (`quiz.ts`) ganha:

- `status: "draft" | "published"` (`QUIZ_STATUSES`) — RN-02, RN-03;
- `publishedVersion: number | null` — número da versão vigente (RN-04);
- `publishedAt: Date | null` — quando a versão vigente foi salva (RN-31);
- `hasUnpublishedChanges: boolean` — sempre `false` em rascunho (RN-19).

Funções puras novas ou alteradas:

- `publishQuiz(quiz, now)`: exige quiz fora da lixeira e com título; devolve `status: "published"`, `publishedVersion + 1`, `publishedAt = now`, `hasUnpublishedChanges: false`, `updatedAt = now` (RN-15, RN-17).
- `withFinishingTouches(quiz, { title, description })`: aplica título e descrição do diálogo "Toques finais" (RN-12).
- `markQuizChanges(quiz, hasUnpublishedChanges, now)`: usado pelo editor e pelo descartar (RN-19, RN-26).
- `renameQuiz` e `changeQuizDetails`: recusam título vazio em quiz publicado (RN-21).
- `quizPublishState(quiz)`: `draft` | `published` | `unpublishedChanges` (RN-22, RN-30).
- `newQuiz`/`copyQuiz`: nascem rascunho, sem versão (RN-32).

**`QuizVersion`** (`quiz-version.ts`): `{ quizId, number, questions: Question[], createdAt }`, imutável (RN-01).

- `newQuizVersion(quiz, questions, now)`: cópia destacada das perguntas (`copyQuestion`), número = `quiz.publishedVersion`.
- `sameQuestionLists(a, b)`: mesma quantidade e, posição a posição, mesmo tipo, enunciado, tempo, pontos e conteúdo; **ignora o id da pergunta** (RN-19).
- `parseVersionQuestions(raw)`: leitura tolerante do JSON guardado, reaproveitando `parseStoredContent`; item irreconhecível é descartado.

### Serviços de domínio

`question-issues.ts`:

- `incompleteQuestions(list)`: `{ question, position, issues }[]` das perguntas com `questionIssues` não vazio, na ordem (RN-09, RN-10).
- `missingAnswerCount(question)`: quantas alternativas faltam para chegar a 2 (RN-10a).

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `QuizTitleRequiredError` | `QUIZ.TITLE_REQUIRED` | Salvar sem título; apagar o título de um quiz publicado |
| `IncompleteQuestionsError` | `QUIZ.INCOMPLETE_QUESTIONS` | Salvar com alguma pergunta incompleta |
| `QuizNotPublishedError` | `QUIZ.NOT_PUBLISHED` | Descartar alterações de um rascunho |

## Aplicação — `packages/core/src/quiz/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `publishQuiz` (novo) | `QuizReference` + `details?: { title, description }` | `QuizDetailsView` | `NOT_FOUND`, `IN_TRASH`, `INCOMPLETE_QUESTIONS`, `TITLE_REQUIRED`, `TITLE_TOO_LONG`, `DESCRIPTION_TOO_LONG` | quizzes, questions, versions, storage, clock |
| `discardQuizChanges` (novo) | `QuizReference` | `QuizEditorView` | `NOT_FOUND`, `IN_TRASH`, `NOT_PUBLISHED` | quizzes, questions, versions, storage, clock |
| `getQuizEditor` | — | `QuizEditorView` com `publishedQuestions` | — | + versions |
| `add/duplicate/move/delete/updateQuestion`, `applyTimeLimitToAll` | — | — | — | + versions (via `markQuizEdited`) |
| `renameQuiz`, `updateQuizDetails` | — | — | + `TITLE_REQUIRED` | — |
| `deleteQuizPermanently` | — | — | — | + versions |

Regras do `publishQuiz`, nesta ordem (RN-13, RN-14): aplica os toques finais, se vieram; recusa perguntas incompletas; recusa sem título; se o quiz já é publicado e a lista é igual à da versão vigente, **não cria versão** e só grava os toques finais (RN-16); senão grava a versão e depois o quiz.

`markQuizEdited(deps, quiz, questions)` passa a receber a lista resultante. Em quiz publicado, lê a versão vigente e grava `hasUnpublishedChanges`.

`QuizDetailsView` ganha `publishedVersion`, `publishedAt` e `hasUnpublishedChanges`. `QuizEditorView` ganha `publishedQuestions: QuestionView[] | null`.

### Portas novas ou alteradas

```ts
// ports/quiz-version-repository.ts
export interface QuizVersionRepository {
	/** The quiz's version of that number, or null. */
	find(quizId: string, number: number): Promise<QuizVersion | null>;
	/** Inserts the version; replaces one of the same quiz and number. */
	save(version: QuizVersion): Promise<void>;
	deleteAllOfQuiz(quizId: string): Promise<void>;
}

// ports/quiz-repository.ts — `touch` vira `markEdited`
markEdited(
	id: string,
	change: { updatedAt: Date; hasUnpublishedChanges: boolean },
): Promise<void>;
```

Fake novo: `testing/in-memory-quiz-version-repository.ts`.

`library`: `LibraryQuizRecord` ganha `hasUnpublishedChanges`; o contrato de `drafts` (só `status = draft`) não muda (RN-29).

## Adapters

### Banco — `packages/db`

- `schema/quiz.ts`: enum `quiz_status` passa a vir de `QUIZ_STATUSES` (`draft`, `published`); colunas `published_version integer`, `published_at timestamptz`, `has_unpublished_changes boolean not null default false`.
- Tabela `quiz_version`: `quiz_id` (FK, `on delete cascade`), `number integer`, `questions jsonb`, `created_at`; chave primária `(quiz_id, number)`.
- `repositories/quiz/drizzle-quiz-version-repository.ts`; `drizzle-quiz-repository.ts` troca `touch` por `markEdited`; `drizzle-library-quiz-query.ts` devolve `hasUnpublishedChanges`.

### Real-time

Nenhum.

### Storage / outros

Nenhum.

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `quiz.publish` | mutation | sim | `{ quizId, details?: { title: string \| null, description: string \| null } }` | `QuizDetailsView` | `QUIZ.NOT_FOUND`, `QUIZ.IN_TRASH`, `QUIZ.INCOMPLETE_QUESTIONS`, `QUIZ.TITLE_REQUIRED` |
| `quiz.discardChanges` | mutation | sim | `{ quizId }` | `QuizEditorView` | `QUIZ.NOT_FOUND`, `QUIZ.IN_TRASH`, `QUIZ.NOT_PUBLISHED` |

Ligações novas em `container.ts` / `composition-root.ts`: adapter `versions: QuizVersionRepository` (Drizzle em produção, fake em `test-context.ts`); casos de uso `publishQuiz` e `discardQuizChanges`.

## UI — `apps/web` e `packages/ui`

- **Design system**: `Badge` ganha as variantes `draft`, `published` e `unsaved` (na raiz do `cva`), documentadas em `/design-system` e `docs/design-system.md`.
- **`components/quiz/quiz-status-badge.tsx`**: selo a partir de `quizPublishState`; `showPublished` só no editor (RN-22, RN-30).
- **Editor** (`components/editor`):
  - `editor-header.tsx`: selo, **Sair** e **Salvar**; a marca passa a pedir a saída ao editor em vez de navegar direto.
  - `incomplete-questions-dialog.tsx`, `finishing-touches-dialog.tsx`, `quiz-ready-dialog.tsx`, `unsaved-changes-dialog.tsx`.
  - `quiz-editor.tsx`: orquestra o fluxo. `EditorActions` ganha `publish(details?)` e `discardChanges()`; `onExit` recebe o destino (`library` \| `home`).
  - `question-list.tsx`: alerta com os textos novos (RN-10a).
- **`lib/`**: `question-labels.ts` (`questionIssueLabel`), `question-mutations.ts` (publish, discard, título na fila única), `quiz-error-messages.ts` (códigos novos).
- **Rotas**: `creator.$quizId.tsx` navega para `/library` ou `/`; `quiz-details-view.tsx`, `quiz-list-item.tsx` e `home-quiz-item.tsx` mostram o selo; a página do quiz mostra a linha da versão.
- **Estados**: Salvar ocupado enquanto o pedido está em andamento; recusa do servidor vira o diálogo correspondente depois de recarregar o editor; falha de rede vira aviso e o editor continua aberto.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | caso de uso · E2E | "publishes a complete draft as version 1"; "publica um quiz completo e volta à biblioteca" | `publish-quiz.test.ts` · `editor-publish.spec.ts` |
| CA-02 | domínio · PGlite | "a version is a detached copy of the questions"; "stores and reads a version with both question types" | `quiz-version.test.ts` · `drizzle-quiz-version-repository.test.ts` |
| CA-03 | domínio · componente | "lists incomplete questions in order with their issues"; "lists each incomplete question with its reasons" | `question-issues.test.ts` · `incomplete-questions-dialog.test.tsx` |
| CA-04 | componente · E2E | "Corrigir selects the question and shows its hints" | `quiz-editor.test.tsx` · `editor-publish.spec.ts` |
| CA-05 | componente | "a just-started question blocks saving and gets its alert" | `quiz-editor.test.tsx` |
| CA-06 | componente | "Voltar para edição keeps the selection" | `quiz-editor.test.tsx` |
| CA-07 | domínio · componente | "a true/false question without a correct answer"; "uses Kahoot's reason texts" | `question-issues.test.ts` · `question-labels.test.ts` |
| CA-08 | caso de uso · componente · E2E | "applies the finishing touches before publishing"; "asks for the title, then publishes" | `publish-quiz.test.ts` · `quiz-editor.test.tsx` · `editor-publish.spec.ts` |
| CA-09 | componente | "Cancelar leaves the draft untitled" | `finishing-touches-dialog.test.tsx` |
| CA-10 | componente | "shows the remaining characters and cuts at the limit" | `finishing-touches-dialog.test.tsx` |
| CA-11 | caso de uso · componente | "refuses incomplete questions before a missing title"; "incomplete questions come before the title" | `publish-quiz.test.ts` · `quiz-editor.test.tsx` |
| CA-12 | componente | "Salvar waits for the autosave" | `quiz-editor.test.tsx` |
| CA-13 | componente | "a failed autosave stops Salvar" | `quiz-editor.test.tsx` |
| CA-14 | caso de uso · API | "refuses incomplete questions"; "refuses a quiz without title"; "publish maps refusals to domain codes" | `publish-quiz.test.ts` · `quiz.test.ts` |
| CA-15 | caso de uso · API | "hides other owners' quizzes and refuses trashed ones" | `publish-quiz.test.ts` · `quiz.test.ts` |
| CA-16 | componente | "Salvar is busy while publishing" | `editor-header.test.tsx` |
| CA-17 | caso de uso | "editing a published quiz keeps its version" | `update-question.test.ts` |
| CA-18 | domínio · componente | "publish state of a quiz"; "shows the status badge" | `quiz.test.ts` · `editor-header.test.tsx` |
| CA-19 | domínio · caso de uso | "equal lists have no changes"; "undoing an edit clears the flag" | `quiz-version.test.ts` · `update-question.test.ts` |
| CA-20 | domínio · caso de uso | "order, count, type and content are changes"; "every list change marks the quiz" | `quiz-version.test.ts` · `question-use-cases.test.ts` |
| CA-21 | caso de uso | "renaming a published quiz is not a pending change" | `rename-quiz.test.ts` |
| CA-22 | caso de uso · E2E | "publishing again creates version 2" | `publish-quiz.test.ts` · `editor-publish.spec.ts` |
| CA-23 | caso de uso | "publishing without changes keeps the version" | `publish-quiz.test.ts` |
| CA-24 | caso de uso | "a published quiz with an incomplete question keeps its version" | `publish-quiz.test.ts` |
| CA-25 | domínio · caso de uso · componente | "a published quiz keeps its title"; "refuses to clear the title of a published quiz"; "restores the title of a published quiz" | `quiz.test.ts` · `rename-quiz.test.ts`, `update-quiz-details.test.ts` · `quiz-editor.test.tsx` |
| CA-26 | componente · E2E | "Sair leaves at once without pending changes" | `quiz-editor.test.tsx` · `editor.spec.ts` |
| CA-27 | componente | "Sair and the brand ask when there are unpublished changes" | `quiz-editor.test.tsx` |
| CA-28 | componente · E2E | "Deixar sem salvar leaves to the asked destination" | `quiz-editor.test.tsx` · `editor-publish.spec.ts` |
| CA-29 | caso de uso · E2E | "restores the questions of the current version" | `discard-quiz-changes.test.ts` · `editor-publish.spec.ts` |
| CA-30 | caso de uso | "keeps the quiz details" | `discard-quiz-changes.test.ts` |
| CA-31 | componente | "Voltar para edição closes the dialog" | `unsaved-changes-dialog.test.tsx` |
| CA-32 | componente | "a failed discard keeps the editor open" | `quiz-editor.test.tsx` |
| CA-33 | fake · PGlite · componente · E2E | "drafts list only never-published quizzes"; "returns hasUnpublishedChanges"; "shows the status badge" | `in-memory-library-quiz-query.test.ts` · `drizzle-library-quiz-query.test.ts` · `quiz-list-item.test.tsx` · `editor-publish.spec.ts` |
| CA-34 | componente | "shows the status badge"; "tells when the playable version was saved" | `home-quiz-item.test.tsx` · `quiz-details-view.test.tsx` |
| CA-35 | caso de uso | "a copy of a published quiz is a draft with the current questions" | `duplicate-quiz.test.ts` |
| CA-36 | caso de uso · PGlite | "trash and restore keep the version"; "deletes the versions with the quiz" | `restore-quiz.test.ts`, `delete-quiz-permanently.test.ts` · `drizzle-quiz-version-repository.test.ts` |
| CA-37 | caso de uso | "publishing updates the last modification" | `publish-quiz.test.ts` |
| CA-38 | domínio · componente | "counts the missing answers"; "1 resposta faltando" | `question-issues.test.ts` · `question-labels.test.ts`, `question-list.test.tsx` |
| CA-39 | componente · E2E | "Deixar sem salvar leaves to the library without publishing" | `quiz-editor.test.tsx` · `editor-publish.spec.ts` |
| CA-40 | componente | "Voltar para edição stays in the editor, published" | `quiz-editor.test.tsx` |
| CA-41 | componente | "shows the four options as coming soon" | `quiz-ready-dialog.test.tsx` |

## Dados e migração

- O projeto ainda aplica o schema com `db:push` (roadmap, pendências). Rodar `pnpm -F @quizio/db db:push` em cada máquina: o enum `quiz_status` ganha `published`, a tabela `quiz` ganha três colunas com padrão seguro e nasce a tabela `quiz_version`.
- Sem backfill: todo quiz existente é rascunho, com `published_version` nulo e `has_unpublished_changes` falso.

## Riscos e decisões

- **O snapshot guarda só as perguntas**, não o quiz inteiro como o ADR 0008 (item 4) antecipava: título, descrição, capa e visibilidade valem na hora (spec, RN-06). A spec 008 decide o que a partida copia desses dados ao começar. Registrado no ADR 0008.
- **Versões antigas são mantidas** em `quiz_version` (uma linha por número). Não há tela para elas; servem às partidas e aos relatórios das specs 008 e 013, que apontam para a versão.
- **Duas escritas no Salvar** (versão, depois quiz) sem transação entre repositórios. Se a segunda falhar, sobra uma linha de versão com o próximo número, que o Salvar seguinte substitui (`save` é upsert por `(quiz_id, number)`).
- **`has_unpublished_changes` é um dado derivado.** Ele é recalculado a cada escrita do editor; uma escrita do título em paralelo regravava a linha inteira do quiz e poderia sobrepor a marca com um valor antigo. Mitigação: o título passa pela fila única de escritas do editor, e o editor calcula o próprio selo a partir do snapshot.
- **Custo por escrita**: cada alteração num quiz publicado lê a linha da versão (até 200 perguntas em JSON). Aceitável para o volume do editor.
- **Sair leva à Biblioteca** (RN-23), mudando a spec 003 (RN-06, CA-03, CA-25) e os E2E que esperavam a página do quiz.
- **Textos dos motivos** (RN-10a) mudam o alerta da lista das specs 004 e 005; os balões junto aos campos não mudam.
