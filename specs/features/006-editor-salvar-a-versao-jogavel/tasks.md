---
spec: "006"
status: done # todo | in-progress | done
---

# Tarefas — 006 Editor 4/5: Salvar a versão jogável

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: teste falhando pelo motivo certo → mínimo para passar → refatorar. `[P]` = paralelizável na fase.

## Fechamento (2026-10-01)

- Testes: `pnpm test` 755 ✅ (core 336, db 46, api 46, ui 25, web 278, auth 15, realtime 6, storage 3); `pnpm check-types` e `pnpm -F web exec tsc --noEmit` limpos; Biome limpo nos 96 arquivos alterados.
- E2E: 78 ✅ (desktop + celular), incluindo os 6 de `editor-publish.spec.ts`.
- Schema aplicado com `pnpm -F @quizio/db db:push`. Em cada máquina com banco antigo, rode o mesmo comando: o enum `quiz_status` ganha `published`, a tabela `quiz` ganha `published_version`, `published_at` e `has_unpublished_changes`, e nasce a tabela `quiz_version`.
- Desvios do plano:
  - Os testes do selo "Rascunho"/"Publicado"/"Alterações não salvas" do editor ficaram em `editor-cache.test.ts` (função pura `publishStateOf`) e `quiz-editor.test.tsx`, além de `editor-header.test.tsx`.
  - `EditorActions` ganhou `current()`: os passos que rodam depois de um salvamento (Salvar, Sair) leem os dados do cache na hora, porque o `data` da renderização pode estar um passo atrás.
  - O editor não chama `toast` direto: recebe `onError` da rota, o que o deixa testável sem o Sonner.
  - No celular, o cabeçalho do editor esconde a marca e mostra só o ícone do estado do salvamento, para caber Sair e Salvar; o selo de status fica só para leitores de tela abaixo de `md`.
  - Na biblioteca, o selo de status fica junto ao número de perguntas, em qualquer largura.
  - `publishQuiz` ignora os "toques finais" quando recusa por pergunta incompleta: nada é gravado num Salvar recusado.

## Fase 1 — Domínio

- [x] **T01** `core/quiz` — lista de perguntas incompletas e respostas que faltam
  - Teste: `question-issues.test.ts` › "lists incomplete questions in order with their issues"; "a true/false question without a correct answer"; "counts the missing answers"
  - Implementar: `question-issues.ts`
  - Cobre: CA-03, CA-07, CA-38, RN-09, RN-10, RN-10a
- [x] **T02** `core/quiz` — `QuizVersion`: cópia destacada, comparação por conteúdo, leitura tolerante
  - Teste: `quiz-version.test.ts` › "a version is a detached copy of the questions"; "equal lists have no changes"; "order, count, type and content are changes"; "ignores question ids"; "reads stored questions tolerantly"
  - Implementar: `quiz-version.ts`
  - Cobre: CA-02, CA-19, CA-20, RN-01, RN-19
- [x] **T03** `core/quiz` — status publicado no `Quiz`
  - Teste: `quiz.test.ts` › "a new quiz is a draft without a version"; "publishing needs a title"; "publishing numbers the versions"; "a published quiz keeps its title"; "publish state of a quiz"; "a copy is always a draft"
  - Implementar: `quiz.ts`, `testing/a-quiz.ts`
  - Cobre: CA-18, CA-25, RN-02 a RN-04, RN-12, RN-21, RN-32

## Fase 2 — Aplicação

- [x] **T04** `core/quiz` — porta `QuizVersionRepository` e fake; `markEdited` no `QuizRepository`
  - Teste: `in-memory-quiz-version-repository.test.ts` › "finds a version by quiz and number"; "replaces a version of the same number"; "deletes every version of a quiz"; `in-memory-quiz-repository.test.ts` › "markEdited writes only the edit marks"
  - Implementar: `ports/quiz-version-repository.ts`, `ports/quiz-repository.ts`, `testing/in-memory-*.ts`
- [x] **T05** `core/quiz` — `publishQuiz`
  - Teste: `publish-quiz.test.ts` › "publishes a complete draft as version 1"; "refuses incomplete questions"; "refuses a quiz without title"; "refuses incomplete questions before a missing title"; "applies the finishing touches before publishing"; "publishing again creates version 2"; "publishing without changes keeps the version"; "a published quiz with an incomplete question keeps its version"; "hides other owners' quizzes and refuses trashed ones"; "publishing updates the last modification"
  - Implementar: `publish-quiz.ts`
  - Cobre: CA-01, CA-08, CA-11, CA-14, CA-15, CA-22 a CA-24, CA-37
- [x] **T06** `core/quiz` — as escritas do editor marcam as alterações não salvas
  - Teste: `update-question.test.ts` › "editing a published quiz keeps its version"; "undoing an edit clears the flag"; `question-use-cases.test.ts` › "every list change marks the quiz"
  - Implementar: `editable-quiz.ts` e os seis casos de uso do editor
  - Cobre: CA-17, CA-19, CA-20, RN-18, RN-19
- [x] **T07** `core/quiz` — `discardQuizChanges`
  - Teste: `discard-quiz-changes.test.ts` › "restores the questions of the current version"; "keeps the quiz details"; "refuses a draft"; "hides other owners' quizzes"
  - Implementar: `discard-quiz-changes.ts`
  - Cobre: CA-29, CA-30, RN-26
- [x] **T08** `[P]` `core/quiz` — editor e dados do quiz com a versão
  - Teste: `get-quiz-editor.test.ts` › "returns the published questions of a published quiz"; `rename-quiz.test.ts` › "refuses to clear the title of a published quiz"; "renaming a published quiz is not a pending change"; `update-quiz-details.test.ts` › "refuses to clear the title of a published quiz"; `duplicate-quiz.test.ts` › "a copy of a published quiz is a draft with the current questions"; `restore-quiz.test.ts` › "trash and restore keep the version"; `delete-quiz-permanently.test.ts` › "deletes the versions with the quiz"
  - Implementar: `get-quiz-editor.ts`, `quiz-editor-view.ts`, `quiz-details-view.ts`, `delete-quiz-permanently.ts`
  - Cobre: CA-21, CA-25, CA-35, CA-36
- [x] **T09** `[P]` `core/library` — `hasUnpublishedChanges` no registro da biblioteca
  - Teste: `in-memory-library-quiz-query.test.ts` › "drafts list only never-published quizzes"
  - Implementar: `ports/library-quiz-query.ts`
  - Cobre: CA-33, RN-29

## Fase 3 — Adapters

- [x] **T10** `db` — schema, repositório de versões, `markEdited`, biblioteca
  - Teste: `drizzle-quiz-version-repository.test.ts` › "stores and reads a version with both question types"; "replaces a version of the same number"; "deletes the versions with the quiz"; `drizzle-quiz-repository.test.ts` › "stores the published fields"; "markEdited writes only the edit marks"; `drizzle-library-quiz-query.test.ts` › "returns hasUnpublishedChanges"; "drafts leave out published quizzes"
  - Implementar: `schema/quiz.ts`, `repositories/quiz/*`, `repositories/library/*`; `pnpm -F @quizio/db db:push`
  - Cobre: CA-02, CA-33, CA-36

## Fase 4 — API

- [x] **T11** `api` — `quiz.publish` e `quiz.discardChanges`
  - Teste: `quiz.test.ts` › "publishes a quiz and lists it out of the drafts"; "publish maps refusals to domain codes"; "discards the changes of a published quiz"; "requires a session"
  - Implementar: `routers/quiz.ts`, `container.ts`, `composition-root.ts`, `testing/test-context.ts`
  - Cobre: CA-14, CA-15, CA-33

## Fase 5 — UI

- [x] **T12** `ui` — variantes `draft`, `published` e `unsaved` do `Badge`
  - Teste: `badge.test.tsx` › "renders the quiz status variants"
  - Implementar: `badge.tsx`, `/design-system`, `docs/design-system.md`
- [x] **T13** `web` — textos dos motivos e mensagens de erro
  - Teste: `question-labels.test.ts` › "uses Kahoot's reason texts"; "1 resposta faltando"; `question-list.test.tsx` › alerta com os textos novos
  - Implementar: `question-labels.ts`, `quiz-error-messages.ts`, `question-list.tsx`
  - Cobre: CA-07, CA-38, RN-10a
- [x] **T14** `web` — selo de status na biblioteca, na página inicial e na página do quiz
  - Teste: `quiz-list-item.test.tsx`, `home-quiz-item.test.tsx` › "shows the status badge"; `quiz-details-view.test.tsx` › "tells when the playable version was saved"
  - Implementar: `quiz-status-badge.tsx`, `quiz-list-item.tsx`, `home-quiz-item.tsx`, `quiz-details-view.tsx`
  - Cobre: CA-33, CA-34
- [x] **T15** `web` — os quatro diálogos
  - Teste: `incomplete-questions-dialog.test.tsx`, `finishing-touches-dialog.test.tsx`, `quiz-ready-dialog.test.tsx`, `unsaved-changes-dialog.test.tsx`
  - Implementar: os quatro componentes em `components/editor`
  - Cobre: CA-03, CA-09, CA-10, CA-31, CA-41
- [x] **T16** `web` — cabeçalho com selo, Sair e Salvar
  - Teste: `editor-header.test.tsx` › "shows the status badge"; "Salvar is busy while publishing"; "the brand asks to leave"
  - Implementar: `editor-header.tsx`
  - Cobre: CA-16, CA-18
- [x] **T17** `web` — fluxo de salvar, sair e descartar no editor
  - Teste: `quiz-editor.test.tsx` › os casos listados no plano (CA-04 a CA-06, CA-08, CA-11 a CA-13, CA-25 a CA-28, CA-32, CA-39, CA-40)
  - Implementar: `quiz-editor.tsx`, `question-mutations.ts`, `creator.$quizId.tsx`

## Fase 6 — E2E e fechamento

- [x] **T18** E2E — salvar, corrigir, toques finais, editar depois de publicar, descartar
  - Teste: `apps/web/e2e/editor-publish.spec.ts`; ajustar `editor.spec.ts` e os demais ao novo destino do Sair e aos textos novos
  - Cobre: CA-01, CA-04, CA-08, CA-22, CA-28, CA-29, CA-33, CA-39
- [x] **T19** Fechamento
  - `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, Biome nos arquivos alterados, `pnpm test:e2e`
  - Atualizar `spec.md` (status `done`, changelog), specs 003 a 005 (Sair, textos dos motivos), ADR 0008, `glossary.md`, `roadmap.md`, `CLAUDE.md`, `docs/design-system.md`
