---
spec: "003"
status: done # todo | in-progress | done
---

# Tarefas — 003 Editor 1/5: fundação e lista de perguntas

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0008](../../../docs/adr/0008-modelo-de-perguntas.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando. `[P]` = pode ser feita em paralelo com as outras `[P]` da mesma fase, desde que as dependências indicadas estejam prontas.

## Fase 1 — Domínio

- [x] **T01** `[P]` `core/quiz` — entidade `Question` e enunciado
  - Teste: `packages/core/src/quiz/domain/question.test.ts` ›
    - "creates a blank quiz question with no text"
    - "trims the text and stores whitespace-only text as null"
    - "accepts 120 characters counting accents and emoji as one"
    - "refuses 121 characters with QuestionTextTooLongError"
    - "copies a question under a new id keeping its content"
  - Implementar: `quiz/domain/question.ts` (`QUESTION_TYPES`, `QuestionType`, `Question`, `QUESTION_TEXT_MAX_LENGTH`, `blankQuestion`, `parseQuestionText`, `copyQuestion`, `QuestionTextTooLongError`); `quiz/testing/a-question.ts`
  - Cobre: CA-19, CA-20, RN-07, RN-09, RN-10, RN-12

- [x] **T02** `core/quiz` — regras da lista de perguntas — depende de T01
  - Teste: `packages/core/src/quiz/domain/question-list.test.ts` ›
    - "inserts right after the given question"
    - "inserts at the end when no question is given"
    - "refuses to insert after a question that is not in the list"
    - "allows the 200th question and refuses the 201st"
    - "moves a question to a new index"
    - "refuses a move outside the list"
    - "removes a question returning it with its index"
    - "refuses to remove the only question"
    - "restores a removed question at its former index"
    - "clamps a restore index beyond the end"
    - "ignores a restore of a question already in the list"
    - "refuses a restore that would exceed the limit"
  - Implementar: `quiz/domain/question-list.ts` (`QUIZ_MAX_QUESTIONS`, `insertQuestionAfter`, `moveQuestion`, `removeQuestion`, `restoreQuestionAt`, `QuestionNotFoundError`, `QuestionLimitReachedError`, `LastQuestionError`, `InvalidQuestionPositionError`)
  - Cobre: CA-09, CA-10, CA-11, CA-13, CA-15, CA-16, RN-11 a RN-16

- [x] **T03** `[P]` `core/quiz` — `touchQuiz` e `renameQuiz`
  - Teste: `packages/core/src/quiz/domain/quiz.test.ts` ›
    - "touching a quiz sets updatedAt to now"
    - "touching a trashed quiz throws QuizInTrashError"
    - "renames within 95 characters and touches updatedAt"
    - "renaming to blank stores no title"
    - "renaming a trashed quiz throws QuizInTrashError"
  - Implementar: `quiz/domain/quiz.ts` (`touchQuiz`, `renameQuiz`, este sobre o `parseQuizTitle` existente)
  - Cobre: CA-06, CA-21, CA-26, RN-03, RN-18, RN-24

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T04** `core/quiz` — porta `QuestionRepository` e fake em memória — depende de T01
  - Teste: `packages/core/src/quiz/testing/in-memory-question-repository.test.ts` ›
    - "lists a quiz's questions in saved order"
    - "saveList replaces the list, dropping missing questions"
    - "saveList leaves other quizzes untouched"
    - "saveQuestion updates content without changing order"
    - "counts a quiz's questions"
    - "deleteAllOfQuiz removes only that quiz's questions"
  - Implementar: `quiz/application/ports/question-repository.ts`; `quiz/testing/in-memory-question-repository.ts` (com o helper `listOf(quizId)`)
  - Cobre: RN-13, RN-28 (contrato)

- [x] **T05** `core/quiz` — views e contagem de perguntas nos detalhes — depende de T04
  - Teste: `packages/core/src/quiz/application/get-quiz-details.test.ts` › "reports the quiz's question count"
  - Implementar: `quiz/application/quiz-editor-view.ts` (`QuestionView`, `QuizEditorView`, `toQuestionView`); `toQuizDetailsView(quiz, storage, questionCount)`. `getQuizDetails` passa a usar `questions.countByQuiz`, e os chamadores atuais de `toQuizDetailsView` recebem a contagem
  - Cobre: CA-27, RN-26

- [x] **T06** `core/quiz` — `createQuiz` cria a pergunta em branco — depende de T04, T05
  - Teste: `packages/core/src/quiz/application/create-quiz.test.ts` › "creates the quiz with one blank quiz question"; "reports one question in the returned view"
  - Implementar: `quiz/application/create-quiz.ts` (+ `questions` nas deps)
  - Cobre: CA-01, RN-04, RN-08

- [x] **T07** `core/quiz` — caso de uso `getQuizEditor` — depende de T04, T05
  - Teste: `packages/core/src/quiz/application/get-quiz-editor.test.ts` ›
    - "returns the quiz details and its questions in order"
    - "hides missing and foreign quizzes behind QuizNotFoundError"
    - "refuses a trashed quiz with QuizInTrashError without writing"
    - "gives a question-less quiz one blank question without touching updatedAt"
  - Implementar: `quiz/application/get-quiz-editor.ts`
  - Cobre: CA-04, CA-06, CA-07, CA-26, RN-02, RN-03, RN-08

- [x] **T08** `core/quiz` — `addQuestion` e `duplicateQuestion` — depende de T02, T03, T04
  - Teste:
    - `packages/core/src/quiz/application/add-question.test.ts` › "adds a blank question right after the selected one"; "adds at the end when nothing is selected"; "touches the quiz's updatedAt"; "refuses the 201st question"
    - `packages/core/src/quiz/application/duplicate-question.test.ts` › "places the copy right after the original under a new id"; "the copy is independent of the original"; "refuses to duplicate at the limit"
  - Implementar: `quiz/application/add-question.ts`, `quiz/application/duplicate-question.ts`
  - Cobre: CA-09, CA-10, CA-16, CA-26, RN-11, RN-12, RN-16, RN-24

- [x] **T09** `core/quiz` — `moveQuestion`, `deleteQuestion` e `restoreQuestion` — depende de T02, T03, T04
  - Teste:
    - `move-question.test.ts` › "persists the new order"; "refuses an index outside the list"
    - `delete-question.test.ts` › "removes the question and returns it with its index"; "refuses to delete the only question"
    - `restore-question.test.ts` › "puts the question back at its index"; "a repeated restore is a no-op"; "revalidates the restored text"
    - todos em `packages/core/src/quiz/application/`
  - Implementar: `quiz/application/move-question.ts`, `delete-question.ts`, `restore-question.ts`
  - Cobre: CA-11, CA-13, CA-15, CA-26, RN-13, RN-14, RN-15, RN-24

- [x] **T10** `core/quiz` — `updateQuestion` e `renameQuiz` — depende de T01, T03, T04
  - Teste:
    - `update-question.test.ts` › "saves the parsed text and touches updatedAt"; "stores whitespace-only text as null"; "refuses more than 120 characters"; "refuses a question from another quiz with QuestionNotFoundError"
    - `rename-quiz.test.ts` › "renames and touches updatedAt"; "refuses more than 95 characters"
  - Implementar: `quiz/application/update-question.ts` (`changes: { text? }`), `quiz/application/rename-quiz.ts`
  - Cobre: CA-18, CA-19, CA-20, CA-21, CA-26, RN-10, RN-18, RN-24

- [x] **T11** `core/quiz` — regras comuns a todas as operações do editor — depende de T08, T09, T10
  - Teste: `packages/core/src/quiz/application/question-use-cases.test.ts` (tabela sobre os sete casos de uso que alteram) ›
    - "every editor operation hides foreign quizzes behind QuizNotFoundError"
    - "every editor operation refuses a trashed quiz"
    - "every editor operation sets updatedAt to now"
  - Implementar: ajustes nos casos de uso, se algum falhar
  - Cobre: CA-04, CA-06, CA-26, RN-02, RN-03, RN-24

- [x] **T12** `core/quiz` — duplicar e excluir definitivamente um quiz levam as perguntas — depende de T04
  - Teste:
    - `duplicate-quiz.test.ts` › "copies the questions in order under new ids"; "editing a copied question leaves the original intact"; "a source without questions yields a copy with one blank question"
    - `delete-quiz-permanently.test.ts` › "removes the quiz's questions"
  - Implementar: `quiz/application/duplicate-quiz.ts` e `delete-quiz-permanently.ts` (+ `questions` e `ids` nas deps)
  - Cobre: CA-28, CA-29, RN-08, RN-27, RN-28

## Fase 3 — Adapters (repositórios, real-time, storage)

- [x] **T13** `db/quiz` — schema `question` e aplicação no banco local — depende de T01
  - Teste: `packages/db/src/repositories/quiz/drizzle-question-repository.test.ts` › "deleting a quiz cascades to its questions" (escrito primeiro; falha porque a tabela não existe)
  - Implementar: `db/src/schema/quiz.ts` (`questionType` a partir de `QUESTION_TYPES`, tabela `question`, índice `question_quiz_position_idx`; o comentário do `quizStatus` passa a citar a spec 006); rodar `pnpm db:push` no Postgres local
  - Cobre: CA-29, RN-28

- [x] **T14** `db/quiz` — adapter `createDrizzleQuestionRepository` — depende de T04, T13
  - Teste: `drizzle-question-repository.test.ts` › os mesmos seis casos de T04, sobre PGlite, mais "saveList rewrites positions in a single transaction"
  - Implementar: `db/src/repositories/quiz/drizzle-question-repository.ts`
  - Cobre: CA-09, CA-11 (persistência da ordem), CA-29
  - Sem `*.int.test.ts`: é um repositório Postgres, e o PGlite é a camada de integração dele (docs/testing.md). Nenhum serviço externo muda

- [x] **T15** `[P]` `db/library` — contagem real de perguntas — depende de T13
  - Teste: `packages/db/src/repositories/library/drizzle-library-quiz-query.test.ts` › "records carry the real question count"; "a quiz without questions reports zero"
  - Implementar: `drizzle-library-quiz-query.ts` (subconsulta `count(*)`; sai o comentário "(spec 003)")
  - Cobre: CA-27, RN-26

## Fase 4 — API (routers + composition root)

- [x] **T16** `api` — ligações e harness de teste — depende de T06, T12, T14
  - Teste: `packages/api/src/routers/quiz.test.ts` › "create returns a quiz with one question"; o harness passa a contar as perguntas nos registros da biblioteca (`library.test.ts` › "library items carry the question count")
  - Implementar: `container.ts` (`questions` em `Adapters`); `composition-root.ts` (`createDrizzleQuestionRepository(db)`); `testing/test-context.ts` (`questions: InMemoryQuestionRepository` exposto, `questionCount` real)
  - Cobre: CA-01, CA-27

- [x] **T17** `api` — `quiz.editor` e `quiz.rename` — depende de T07, T10, T16
  - Teste: `quiz.test.ts` › "editor returns the quiz and its questions"; "editor of another owner's quiz is NOT_FOUND"; "editor of a trashed quiz is BAD_REQUEST with domainCode QUIZ.IN_TRASH"; "rename refuses visitors"
  - Implementar: `routers/quiz.ts`; `container.ts` (`getQuizEditor`, `renameQuiz`)
  - Cobre: CA-04, CA-06, CA-21

- [x] **T18** `api` — router `quiz.questions` — depende de T08, T09, T10, T16
  - Teste: `packages/api/src/routers/quiz-questions.test.ts` ›
    - "add, duplicate, move, delete and restore round-trip through quiz.editor"
    - "delete of the only question is BAD_REQUEST with domainCode QUIZ.LAST_QUESTION"
    - "update refuses visitors"
    - "operations on another owner's quiz are NOT_FOUND"
  - Implementar: `routers/quiz-questions.ts` (só forma em zod; `type` com `z.enum(QUESTION_TYPES)`); montado em `routers/quiz.ts` como `questions`; `container.ts` (seis casos de uso)
  - Cobre: CA-09 a CA-15, CA-18

## Fase 5 — UI (design system → componentes do app → rotas)

- [x] **T19** `[P]` `web/lib` — rastreador de salvamento — depende de nada
  - Teste: `apps/web/src/lib/save-tracker.test.ts` ›
    - "reports saving while an operation is pending and saved after"
    - "keeps only the latest failed operation per key"
    - "retry resends failed operations and returns to saved"
    - "flush resolves true when everything saved and false when something failed"
  - Implementar: `lib/save-tracker.ts` (`createSaveTracker`, `SaveTrackerProvider`, `useSaveTracker`)
  - Cobre: CA-23, CA-24, CA-25, RN-20 a RN-23

- [x] **T20** `web/lib` — hook de autosave com debounce — depende de T19
  - Teste: `apps/web/src/lib/use-debounced-autosave.test.tsx` (timers falsos) ›
    - "sends 800 ms after the last change"
    - "sends immediately on blur"
    - "keeps one request in flight per key and sends the latest value next"
    - "flushes pending changes on unmount"
  - Implementar: `lib/use-debounced-autosave.ts`
  - Cobre: CA-18, CA-25, RN-20

- [x] **T21** `[P]` `web/lib` — cache do editor e seleção — depende de T02, T18 (tipos)
  - Teste: `apps/web/src/lib/editor-cache.test.ts` ›
    - "moves a question optimistically"
    - "removes a question optimistically and restores on rollback"
    - "selects the next question after removal"
    - "selects the previous question when the last one is removed"
  - Implementar: `lib/editor-cache.ts` (sobre as funções puras do core); `lib/api-types.ts` (`QuizEditorData`, `QuestionData`); `lib/quiz-error-messages.ts` (códigos novos)
  - Cobre: CA-13, CA-14, RN-14

- [x] **T22** `web` — Criar abre o editor — depende de T16
  - Teste: `apps/web/src/components/layout/top-bar.test.tsx` (novo) › "Criar creates a quiz and navigates to its editor"; "Criar is disabled while creating"; `recent-quizzes-card.test.tsx` e `library-empty-state.test.tsx` passam a esperar o mesmo hook
  - Implementar: `useCreateQuiz()` em `lib/quiz-mutations.ts`. Remover `CreateQuizProvider`/`create-quiz-context.tsx` e o modo `create` do `QuizFormDialog` (e os testes desse modo); ajustar `routes/index.tsx`, `top-bar.tsx`, `recent-quizzes-card.tsx` e `library-empty-state.tsx`
  - Cobre: CA-01, RN-04

- [x] **T23** `[P]` `web/editor` — cabeçalho: título, Configurações, estado do salvamento, Sair — depende de T19, T20
  - Teste:
    - `components/editor/save-status.test.tsx` › "shows Salvando…, Salvo and the failure with Tentar de novo in a status region"
    - `quiz-title-field.test.tsx` › "caps the title at 95 characters when typing or pasting"; "autosaves the title"
    - `editor-header.test.tsx` › "Configurações opens the details dialog in edit mode with current values"; "Sair waits for pending saves before leaving"
    - todos em `apps/web/src/components/editor/`
  - Implementar: `save-status.tsx`, `quiz-title-field.tsx`, `editor-header.tsx`
  - Cobre: CA-21, CA-22, CA-23, CA-24, CA-25, RN-06, RN-18, RN-19, RN-21

- [x] **T24** `[P]` `web/editor` — enunciado e área central — depende de T20
  - Teste: `components/editor/question-text-field.test.tsx` › "keeps the first 120 characters when typing or pasting 130"; "shows remaining characters from 100 on"; "autosaves the text"; `question-canvas.test.tsx` › "shows the media area and four answer slots marked Em breve"
  - Implementar: `question-text-field.tsx`, `question-canvas.tsx`
  - Cobre: CA-18, CA-19, RN-10

- [x] **T25** `web/editor` — lista ordenável e painel de propriedades — depende de T21
  - Teste:
    - `components/editor/question-list.test.tsx` › "shows position, type and the start of the text for each question"; "highlights the selected question"; "delete is disabled with 'Não é possível excluir todo o conteúdo' when only one question remains"; "Adicionar and Duplicar are disabled at 200 questions with the reason"
    - `question-properties-panel.test.tsx` › "shows the type read-only"; "Excluir and Duplicar follow the list rules"
  - Implementar: adicionar `@dnd-kit/core`, `@dnd-kit/sortable` e `@dnd-kit/utilities` ao `apps/web`; `question-list.tsx`, `question-list-item.tsx` (anúncios de arrastar em PT-BR), `question-properties-panel.tsx`
  - Cobre: CA-15, CA-16, CA-17, RN-13, RN-15, RN-16, RN-17

- [x] **T26** `web/editor` — editor montado, mutations e estados da tela — depende de T21 a T25
  - Teste:
    - `components/editor/quiz-editor.test.tsx` › "shows header, list, canvas and properties without the main nav"; "clicking a question selects it and shows its text"; "adding selects the new question"; "deleting offers Desfazer"
    - `editor-unavailable.test.tsx` › "loading shows the editor skeleton"; "not found says Quiz não encontrado"; "a trashed quiz links to the trash section"; "an error offers to retry"
  - Implementar: `lib/question-mutations.ts`; `quiz-editor.tsx` (grade de 3 colunas; gavetas em tela estreita); `editor-unavailable.tsx`
  - Cobre: CA-04, CA-06, CA-08, CA-13, CA-17, CA-30, RN-06, RN-14

- [x] **T27** `web/routes` — rotas: casca sem caminho, editor e Editar na página do quiz — depende de T22, T26
  - Teste: `apps/web/src/components/quiz/quiz-details-view.test.tsx` › "renders Editar linking to the quiz editor"; `app-shell.test.tsx` e `main-nav.test.tsx` seguem verdes
  - Implementar:
    - `routes/_auth/route.tsx` fica só com o guard.
    - Novo `routes/_auth/_shell/route.tsx`; mover `library.tsx` e `quizzes.$quizId.tsx` para `_shell/`.
    - Novo `routes/_auth/creator.$quizId.tsx`, com `useBlocker` + `enableBeforeUnload` e refetch no foco da janela.
    - Botão Editar em `quiz-details-view.tsx`.
    - Typecheck com `pnpm -F web exec tsc --noEmit`, depois de o dev server regenerar o `routeTree.gen.ts`.
  - Cobre: CA-02, CA-03, CA-08, RN-01, RN-05, RN-06, RN-23

## Fase 6 — E2E e fechamento

- [x] **T28** `web/e2e` — ajustar os E2E existentes ao novo Criar — depende de T27
  - Teste: `home.spec.ts` › "creating from the top bar opens the editor and puts the quiz on top of the dashboard"; `library.spec.ts` › criar com capa PNG passa por **Configurações** no editor; duplicar e excluir criam pelo editor; helper em `e2e/support.ts`
  - Implementar: ajustes nos specs e no helper
  - Cobre: CA-01, CA-22, RN-04

- [x] **T29** `web/e2e` — fluxo do editor — depende de T27
  - Teste: `apps/web/e2e/editor.spec.ts` ›
    - "Criar opens the editor with one blank Quiz question, listed in Rascunhos as 1 pergunta"
    - "typed text and title survive a reload"
    - "adds after the selected, duplicates, drags C before A, and the order survives a reload"
    - "moves a question with the keyboard"
    - "deletes and undoes"
    - "shows the failure offline and saves on retry"
    - "Sair returns to the quiz page with the new title and count"
    - "a visitor opening the editor signs in and comes back"
  - Implementar: correções que os testes revelarem
  - Cobre: CA-01, CA-03, CA-05, CA-09, CA-10, CA-11, CA-12, CA-13, CA-18, CA-21, CA-24

- [x] **T30** Fechamento
  - `pnpm check`, `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, `pnpm test:e2e`. Não precisa de `pnpm test:int`: nenhum adapter de serviço externo mudou
  - Atualizar:
    - `spec.md`: status `done` e changelog com as descobertas.
    - `plan.md`: descobertas.
    - `glossary.md`: termos da 003 de 📝 para ✅.
    - `roadmap.md`: 003 ✅ e link das tarefas.
    - `docs/architecture.md`: o editor como exemplo de colunas + `jsonb` e link do ADR 0008.
    - `docs/design-system.md`, se algum token novo entrar.
    - `CLAUDE.md`: a rota `/creator/$quizId` e o layout `_shell` na seção de rotas.

- [x] **T31** (acrescentada na implementação) `core/quiz` + `db/quiz` — `QuizRepository.touch` para não sobrescrever mudanças concorrentes
  - Teste: `add-question.test.ts` › "never overwrites a quiz change made while the question was being added"; `drizzle-quiz-repository.test.ts` › "touch sets only updatedAt"
  - Implementar: porta, fake, adapter Drizzle, `markQuizEdited`
  - Cobre: CA-21, CA-26 (revelada pelo E2E "Sair")

- [x] **T32** (acrescentada na implementação) `web/lib` — mudança no debounce conta como "Salvando…"
  - Teste: `save-tracker.test.ts` › "reports saving while a change waits to be sent"; `use-debounced-autosave.test.tsx` › "reports saving from the first keystroke, before the debounce ends"
  - Implementar: `markPending`/`clearPending` no `SaveTracker`
  - Cobre: CA-23, CA-25, RN-23

## Verificação de cobertura

| CA | Tarefas |
| --- | --- |
| CA-01 | T06, T16, T22, T28, T29 |
| CA-02 | T27 |
| CA-03 | T27, T29 |
| CA-04 | T07, T11, T17, T18, T26 |
| CA-05 | T29 |
| CA-06 | T03, T07, T11, T17, T26 |
| CA-07 | T07 |
| CA-08 | T26, T27 |
| CA-09 | T02, T08, T14, T18, T29 |
| CA-10 | T01, T02, T08, T18, T29 |
| CA-11 | T02, T09, T14, T18, T29 |
| CA-12 | T29 |
| CA-13 | T02, T09, T18, T21, T26, T29 |
| CA-14 | T21 |
| CA-15 | T02, T09, T18, T25 |
| CA-16 | T02, T08, T25 |
| CA-17 | T25, T26 |
| CA-18 | T10, T18, T20, T24, T29 |
| CA-19 | T01, T10, T24 |
| CA-20 | T01, T10 |
| CA-21 | T03, T10, T17, T23, T29 |
| CA-22 | T23, T28 |
| CA-23 | T19, T23 |
| CA-24 | T19, T23, T29 |
| CA-25 | T19, T20, T23 |
| CA-26 | T03, T07, T08, T09, T10, T11 |
| CA-27 | T05, T15, T16 |
| CA-28 | T12 |
| CA-29 | T12, T13, T14 |
| CA-30 | T26 |

Todos os 30 CAs da spec aparecem em pelo menos uma tarefa.
