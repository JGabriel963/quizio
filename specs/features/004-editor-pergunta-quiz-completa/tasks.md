---
spec: "004"
status: in-progress # todo | in-progress | done
---

# Tarefas — 004 Editor 2/5: pergunta Quiz completa

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: teste falhando pelo motivo certo → mínimo para passar → refatorar. `[P]` = paralelizável na fase.

## Estado em 2026-09-30 (para retomar em outra máquina)

Feito:
- **T01:** `Question` com alternativas, tempo, pontos, seleção e os parsers.
- **T07:** colunas no schema e adapter Drizzle com round-trip.
- **Adiantado da T04:** `QuestionView` já é a `Question` completa.

Antes de continuar:
1. `pnpm install`, `pnpm infra:up` e **`pnpm -F @quizio/db exec drizzle-kit push`**. O schema ganhou o enum `question_points` e as colunas `time_limit_seconds`, `points` e `content`, que ainda **não** foram aplicados ao Postgres local desta máquina.
2. Estado dos testes no último commit: `core` 202 ✅ · `db` 34 ✅ · `web` 146 ✅ · `api` **2 ❌**. As duas falhas comparam a view com o literal antigo `{ id, type, text }`:
   - `quiz.test.ts` › "editor returns the quiz and its questions";
   - `quiz-questions.test.ts` › "round-trip".

   Corrigir trocando o literal por `blankQuestion(...)` ou `expect.objectContaining`.
3. Typecheck pendente. `restoreQuestion` ainda monta a pergunta só com `{ id, type, text }`, e o router `restore` só aceita esses campos. Os dois devem passar a receber a pergunta completa (T04), o que provavelmente acusa erro no `pnpm check-types`.
4. Próxima tarefa: **T02** (`applyQuestionChange`), seguindo a ordem abaixo.

## Fase 1 — Domínio

- [x] **T01** `core/quiz` — `Question` ampliada: alternativas, tempo, pontos, seleção; parsers
  - Teste: `question.test.ts` › "blank question has four empty single-choice answers, 20 s and standard points"; "copies every field under a new id"; "parses quiz content tolerantly"; "rejects time limits outside the list"; "rejects unknown points and selection modes"
  - Cobre: CA-01, CA-09, CA-11, CA-15, RN-01, RN-02, RN-07, RN-10, RN-12, RN-18
- [ ] **T02** `core/quiz` — `applyQuestionChange`
  - Teste: `question-change.test.ts` › text; choice text (trim, 75, clearing unmarks); correct (empty refused; single → multiple notice); selection (single keeps first, cleared count); extra choices (show/hide discards); time; points; unknown choice
  - Cobre: CA-02 a CA-08, CA-11, RN-03 a RN-09, RN-12
- [ ] **T03** `[P]` `core/quiz` — `questionIssues` e `missingAnswerHints`
  - Teste: `question-issues.test.ts`
  - Cobre: CA-12, CA-13, RN-14, RN-16

## Fase 2 — Aplicação

- [ ] **T04** `core/quiz` — `updateQuestion` com `QuestionChange`; `QuestionView` completa; `restoreQuestion` revalida tudo
  - Teste: `update-question.test.ts`, `restore-question.test.ts`, `question-use-cases.test.ts` (ajustados)
  - Cobre: CA-02, CA-05, CA-07, RN-13
- [ ] **T05** `core/quiz` — `applyTimeLimitToAll`
  - Teste: `apply-time-limit-to-all.test.ts` › "sets every question's time and returns the count"; "refuses an invalid time"; "refuses a trashed or foreign quiz"
  - Cobre: CA-10, RN-11
- [ ] **T06** `core/quiz` — duplicar pergunta e quiz copiam tudo
  - Teste: `duplicate-question.test.ts`, `duplicate-quiz.test.ts`
  - Cobre: CA-15, RN-18

## Fase 3 — Adapters

- [x] **T07** `db/quiz` — colunas `time_limit_seconds`, `points`, `content`; round-trip; `drizzle-kit push`
  - Teste: `drizzle-question-repository.test.ts` › "round-trips time, points and quiz content"; "reads legacy rows with defaults"
  - Cobre: CA-02, CA-09, CA-11, CA-14

## Fase 4 — API

- [ ] **T08** `api` — `update` com `change`, `applyTimeLimitToAll`, `restore` completo
  - Teste: `quiz-questions.test.ts`
  - Cobre: CA-02, CA-07, CA-10

## Fase 5 — UI

- [ ] **T09** `[P]` `ui` — formas e cores 5 e 6
  - Teste: `answer-option.test.tsx` › "six shapes in Kahoot order with their colors"
  - Cobre: CA-04, RN-01
- [ ] **T10** `[P]` `web/lib` — rótulos PT-BR de tempo, pontos, opções, motivos e avisos
  - Teste: `question-labels.test.ts`
  - Cobre: CA-09, CA-12
- [ ] **T11** `web/editor` — `ChoiceField`
  - Teste: `choice-field.test.tsx`
  - Cobre: CA-03, CA-06, CA-13
- [ ] **T12** `web/editor` — canvas com alternativas, extras e dicas
  - Teste: `question-canvas.test.tsx`
  - Cobre: CA-01, CA-04, CA-13
- [ ] **T13** `web/editor` — painel de propriedades com tempo, pontos, opções e aplicar a todas
  - Teste: `question-properties-panel.test.tsx`
  - Cobre: CA-09, CA-10, CA-11
- [ ] **T14** `web/editor` — lista com o tempo e o alerta de incompleta
  - Teste: `question-list.test.tsx`
  - Cobre: CA-09, CA-12
- [ ] **T15** `web` — `EditorActions.changeQuestion`/`applyTimeLimitToAll`, fila por pergunta, avisos
  - Teste: `quiz-editor.test.tsx` (ajustado); a ligação real fica coberta pelo E2E
  - Cobre: CA-07, CA-08, CA-10

## Fase 6 — E2E e fechamento

- [ ] **T16** `web/e2e` — `editor-quiz-question.spec.ts`
  - Cobre: CA-02, CA-04, CA-05, CA-07, CA-09, CA-10, CA-12, CA-14
- [ ] **T17** Fechamento: checks, spec/plano/tarefas `done`, glossário, roadmap, design-system.md

## Verificação de cobertura

CA-01 T01/T12 · CA-02 T02/T04/T07/T08/T16 · CA-03 T02/T11 · CA-04 T02/T09/T12/T16 · CA-05 T02/T04/T16 · CA-06 T02/T11 · CA-07 T02/T04/T15/T16 · CA-08 T02/T15 · CA-09 T01/T10/T13/T14/T16 · CA-10 T05/T08/T13/T16 · CA-11 T01/T02/T13 · CA-12 T03/T10/T14/T16 · CA-13 T03/T11/T12 · CA-14 T07/T16 · CA-15 T01/T06
