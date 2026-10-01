---
spec: "005"
status: done # todo | in-progress | done
---

# Tarefas — 005 Editor 3/5: Verdadeiro ou falso e troca de tipo

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: teste falhando pelo motivo certo → mínimo para passar → refatorar. `[P]` = paralelizável na fase.

## Fechamento (2026-10-01)

- Testes: `pnpm test` 595 ✅ (core 278, db 37, api 39, ui 22, web 195, auth 15, realtime 6, storage 3); `pnpm check-types` e `pnpm -F web exec tsc --noEmit` limpos; Biome limpo nos 49 arquivos alterados.
- E2E: 66 ✅ (desktop + celular), incluindo os 6 de `editor-true-false.spec.ts`.
- Schema aplicado com `pnpm -F @quizio/db db:push`. Em cada máquina com banco antigo, rode o mesmo comando: o enum `question_type` ganha o valor `trueFalse`.
- Desvios do plano:
  - O teste da lembrança da sessão ficou em `question-type-change.test.ts` (função pura `typeChangeFor`), não em um teste de `question-mutations`.
  - `DropdownMenuContent` (design system) passou a aceitar `collisionAvoidance`, para o seletor abrir abaixo do botão quando não cabe ao lado (celular).
  - Um salvamento atrasado de um campo do Quiz numa pergunta que já virou Verdadeiro ou falso é descartado no cliente, em vez de aparecer como falha.

## Fase 1 — Domínio

- [x] **T01** `core/quiz` — `Question` como união por tipo; pergunta Verdadeiro ou falso
  - Teste: `question.test.ts` › "a blank true/false question has no correct answer"; "copies a true/false question under a new id"; "rejects an unknown question type"; "reads stored true/false content tolerantly"; "toggling the marked answer marks the other one"
  - Implementar: `question.ts`, `testing/a-question.ts`
  - Cobre: CA-07, CA-08, CA-23, RN-01, RN-06, RN-07, RN-21
- [x] **T02** `core/quiz` — `applyQuestionChange`: `trueFalseCorrect`, `type`, mudanças fora do tipo; `parseQuestion` para os dois tipos
  - Teste: `question-change.test.ts` › "marks the correct true/false answer"; "changes time and points of a true/false question"; "changing type keeps text, time and points and blanks the answers"; "tells when quiz answers were set aside"; "no notice without written answers or from true/false to quiz"; "restores remembered quiz content (6 slots, corrects, multiple)"; "restores the remembered true/false answer"; "same type changes nothing"; "refuses an unknown type and a remembered content of another type"; "refuses a quiz change on a true/false question and vice versa"; "parses a whole true/false question"
  - Implementar: `question-change.ts`
  - Cobre: CA-08, CA-10, CA-15, CA-16, CA-17, CA-20, CA-22, RN-10, RN-14 a RN-17, RN-19, RN-20
- [x] **T03** `[P]` `core/quiz` — incompletude da pergunta Verdadeiro ou falso
  - Teste: `question-issues.test.ts` › "a true/false question misses its text and its correct answer"; "a true/false question has no answer hints"
  - Implementar: `question-issues.ts`
  - Cobre: CA-12, RN-11

## Fase 2 — Aplicação

- [x] **T04** `core/quiz` — `addQuestion` com tipo
  - Teste: `add-question.test.ts` › "adds a blank true/false question after the selected one"; "refuses an unknown type"
  - Implementar: `add-question.ts`
  - Cobre: CA-02, CA-03, RN-03
- [x] **T05** `core/quiz` — casos de uso existentes com perguntas Verdadeiro ou falso
  - Teste: `update-question.test.ts` › "changes the type and saves the new content"; `apply-time-limit-to-all.test.ts` › "applies to questions of every type"; `duplicate-question.test.ts` e `duplicate-quiz.test.ts` › "copies a true/false question with its correct answer"; `restore-question.test.ts` › "restores a true/false question"; `create-quiz.test.ts` › "starts with a blank quiz question" (já existente, confirma RN-05)
  - Implementar: `quiz-editor-view.ts` (cópia por tipo)
  - Cobre: CA-06, CA-11, CA-15, CA-23, RN-05, RN-09, RN-21

## Fase 3 — Adapters

- [x] **T06** `db/quiz` — conteúdo por tipo no `jsonb`; `db:push` do enum
  - Teste: `drizzle-question-repository.test.ts` › "round-trips a true/false question"; "reads a true/false row with malformed content as unanswered"
  - Implementar: `drizzle-question-repository.ts`
  - Cobre: CA-10, CA-14

## Fase 4 — API

- [x] **T07** `api` — `add` com tipo, `update` com as mudanças novas, `restore` dos dois tipos
  - Teste: `quiz-questions.test.ts` › "adds a true/false question"; "changes the type and back with remembered answers"; "refuses an unknown type"; "restores a deleted true/false question"
  - Implementar: `routers/quiz-questions.ts`
  - Cobre: CA-02, CA-16, CA-22

## Fase 5 — UI

- [x] **T08** `[P]` `web/lib` — rótulos e mensagens
  - Teste: `question-labels.test.ts` › "labels the true/false issue and the kept answers notice"
  - Implementar: `question-labels.ts`, `quiz-labels.ts`, `quiz-error-messages.ts`
  - Cobre: CA-12, CA-15
- [x] **T09** `[P]` `web/lib` — lembrança da sessão
  - Teste: `question-type-change.test.ts` › "same type sends nothing"; "first change sends no remembered content"; "going back sends what the question had"; "the true/false answer comes back too"; "another question has no remembered content"
  - Implementar: `question-type-change.ts`
  - Cobre: CA-16, CA-19, CA-21, CA-24, RN-17, RN-18, RN-21
- [x] **T10** `web/editor` — `TrueFalseAnswers`
  - Teste: `true-false-answers.test.tsx` › "shows Verdadeiro then Falso, fixed, with nothing marked and the hint"; "marking one asks for that answer"; "unmarking the marked one asks for the other"; "hides the hint once marked"
  - Implementar: `true-false-answers.tsx`
  - Cobre: CA-07, CA-08, CA-13
- [x] **T11** `web/editor` — canvas por tipo
  - Teste: `question-canvas.test.tsx` › "a true/false question shows its two fixed answers and no extra answers action"
  - Implementar: `question-canvas.tsx`, `quiz-answers.tsx`
  - Cobre: CA-07
- [x] **T12** `web/editor` — seletor de tipo
  - Teste: `question-type-picker.test.tsx` › "lists Quiz and Verdadeiro ou falso under Testar conhecimento"; "choosing a type calls back with it"; "Escape closes without adding"
  - Implementar: `question-type-picker.tsx`, `question-type-icon.tsx`
  - Cobre: CA-01, CA-03, CA-04
- [x] **T13** `web/editor` — lista: seletor no Adicionar, miniatura e alerta do Verdadeiro ou falso
  - Teste: `question-list.test.tsx` › "adds through the type picker"; "shows the type name and the alert of a true/false question"; o teste do limite de 200 continua valendo
  - Implementar: `question-list.tsx`
  - Cobre: CA-02, CA-05, CA-12
- [x] **T14** `web/editor` — painel: trocar o tipo; sem "Opções de resposta" no Verdadeiro ou falso
  - Teste: `question-properties-panel.test.tsx` › "changes the question type"; "a true/false question has no answer options"
  - Implementar: `question-properties-panel.tsx`
  - Cobre: CA-09, CA-15
- [x] **T15** `web` — `EditorActions.addQuestion(type)` e `changeQuestionType`; ligação ao tRPC
  - Teste: `quiz-editor.test.tsx` › "adds the chosen type after the selected question"; "changing the type asks the action"
  - Implementar: `quiz-editor.tsx`, `question-mutations.ts`, `editor-cache.ts`
  - Cobre: CA-02, CA-15, CA-16
- [x] **T16** `[P]` `web` — página `/design-system` e `docs/design-system.md` com Verdadeiro/Falso
  - Teste: `e2e/design-system.spec.ts` continua verde
  - Cobre: RN-06

## Fase 6 — E2E e fechamento

- [x] **T17** `web/e2e` — `editor-true-false.spec.ts`; ajuste dos E2E que acionam "Adicionar"
  - Cobre: CA-02, CA-08, CA-14, CA-15, CA-16, CA-18
- [x] **T18** Fechamento: `db:push`, checks, spec/plano/tarefas `done`, glossário, roadmap

## Verificação de cobertura

CA-01 T12 · CA-02 T04/T07/T13/T15/T17 · CA-03 T04/T12 · CA-04 T12 · CA-05 T13 · CA-06 T05 · CA-07 T01/T10/T11 · CA-08 T01/T02/T10/T17 · CA-09 T14 · CA-10 T02/T06 · CA-11 T05 · CA-12 T03/T08/T13 · CA-13 T10 · CA-14 T06/T17 · CA-15 T02/T05/T14/T15/T17 · CA-16 T02/T07/T09/T17 · CA-17 T02 · CA-18 T17 · CA-19 T09 · CA-20 T02 · CA-21 T09 · CA-22 T02/T07 · CA-23 T01/T05 · CA-24 T09
