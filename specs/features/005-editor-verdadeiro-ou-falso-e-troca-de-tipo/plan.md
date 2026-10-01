---
spec: "005"
status: approved # draft | approved
---

# Plano técnico — 005 Editor 3/5: Verdadeiro ou falso e troca de tipo

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0008](../../../docs/adr/0008-modelo-de-perguntas.md)

## Abordagem

Esta etapa cumpre o que o ADR 0008 já previa: `Question` vira uma **união discriminada por `type`**. O que é comum (id, enunciado, tempo, pontos) fica na base; `QuizQuestion` guarda `selection` e `choices`, e `TrueFalseQuestion` guarda `correct: boolean | null`. O `content jsonb` de uma pergunta Verdadeiro ou falso é `{ correct }`, lido pelo parser tolerante do core.

A troca de tipo é mais uma **mudança (`QuestionChange`)**, `{ kind: "type", type, remembered }`, aplicada pela mesma função pura `applyQuestionChange` no servidor e no cliente. Ela mantém a base da pergunta e troca o conteúdo pelo do novo tipo: em branco, ou o conteúdo `remembered` que o cliente manda de volta, revalidado com as mesmas regras do "Desfazer" (`parseQuestionContent`).

A **lembrança da sessão** (RN-17, RN-18) vive só no cliente, numa referência dentro de `useEditorActions`: `questionId → { quiz?, trueFalse? }`. Antes de trocar, o cliente guarda o conteúdo atual; se já houver conteúdo lembrado do tipo de destino, ele vai junto na mudança. Nada disso é persistido nem passa pelo cache do TanStack, então recarregar ou sair do editor descarta. Uma cópia tem id novo e por isso nasce sem lembrança (RN-21).

A regra "desmarcar a correta marca a outra" (RN-07) é uma função pura do domínio, `toggledTrueFalseCorrect`, que a UI usa para decidir o valor enviado. A mudança `{ kind: "trueFalseCorrect", correct: boolean }` só aceita `true` ou `false`, então nunca se volta a "nenhuma".

O seletor de tipo reaproveita o `DropdownMenu` do design system (menu do base-ui): já dá foco, teclado, Esc e clique fora. Não é preciso um primitivo novo.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Verdadeiro ou falso | `trueFalse`, `TrueFalseQuestion` | sim |
| Pergunta Quiz | `QuizQuestion` | sim (antes era a única `Question`) |
| Conteúdo do tipo | `QuestionContent`, `questionContent`, `parseStoredContent` | sim |
| Troca de tipo | `QuestionChange` `kind: "type"` | sim |
| Respostas lembradas | `remembered` (`QuestionContentInput`), `RememberedContents` no cliente | sim |
| Seletor de tipo | `QuestionTypePicker` | sim |
| Aviso de respostas guardadas | `QuestionChangeNotice` `kind: "quizAnswersKept"` | sim |

## Domínio — `packages/core/src/quiz/domain`

### Entidade `Question` (`question.ts`)

```ts
export const QUESTION_TYPES = ["quiz", "trueFalse"] as const; // RN-01

interface QuestionBase { id: string; text: string | null; timeLimitSeconds: TimeLimitSeconds; points: QuestionPoints }
export interface QuizQuestion extends QuestionBase { type: "quiz"; selection: SelectionMode; choices: Choice[] }
export interface TrueFalseQuestion extends QuestionBase { type: "trueFalse"; correct: boolean | null } // RN-06, RN-07
export type Question = QuizQuestion | TrueFalseQuestion;

export type QuizContent = Pick<QuizQuestion, "type" | "selection" | "choices">;
export type TrueFalseContent = Pick<TrueFalseQuestion, "type" | "correct">;
export type QuestionContent = QuizContent | TrueFalseContent;
```

- `blankQuestion(id)` continua devolvendo uma `QuizQuestion`; `blankQuestion(id, type)` devolve a pergunta em branco do tipo (V/F: `correct: null`). `blankContent(type)` devolve só o conteúdo.
- `parseQuestionType(raw: string)`: lança `InvalidQuestionTypeError` fora de `QUESTION_TYPES` (RN-20).
- `questionContent(question)`: a parte própria do tipo, copiada (usada na lembrança do cliente e no adapter).
- `storedContent(question)`: o JSON gravado — `{ selection, choices }` ou `{ correct }`.
- `parseStoredContent(type, raw)`: leitura tolerante por tipo. Para V/F, qualquer coisa que não seja `true`/`false` vira `null`. `parseQuizContent` continua existindo e é usado por ele.
- `copyQuestion` copia qualquer tipo (RN-21).
- `toggledTrueFalseCorrect(current: boolean | null, clicked: boolean): boolean` — RN-07: clicar na que já está marcada devolve a outra.

### Mudanças (`question-change.ts`)

```ts
export type QuestionContentInput =
	| { type: "quiz"; selection: string; choices: { text: string | null; correct: boolean }[] }
	| { type: "trueFalse"; correct: boolean | null };

export type QuestionChange =
	| /* … as da spec 004 … */
	| { kind: "trueFalseCorrect"; correct: boolean }                                   // RN-07, RN-10
	| { kind: "type"; type: string; remembered: QuestionContentInput | null };         // RN-14 a RN-17

export type QuestionChangeNotice =
	| /* … */
	| { kind: "quizAnswersKept" };                                                      // RN-19

export type QuestionInput = { id: string; text: string | null; timeLimitSeconds: number; points: string } & QuestionContentInput;
export function parseQuestionContent(input: QuestionContentInput): QuestionContent;
```

Invariantes de `applyQuestionChange`:

- **RN-15, RN-16:** `type` mantém id, enunciado, tempo e pontos, e troca o conteúdo por `parseQuestionContent(remembered)` ou, sem `remembered`, por `blankContent(type)`.
- **RN-14:** trocar para o tipo atual devolve a pergunta como está, sem aviso.
- **RN-19:** indo de Quiz com alguma alternativa escrita para Verdadeiro ou falso, devolve o aviso `quizAnswersKept`.
- **RN-20:** tipo desconhecido lança `InvalidQuestionTypeError`; `remembered` de outro tipo que não o de destino também.
- Mudanças de Quiz (`selection`, `choiceText`, `choiceCorrect`, `extraChoices`) numa pergunta V/F, e `trueFalseCorrect` numa Quiz, lançam `QuestionChangeNotApplicableError`.
- `parseQuestion` (o "Desfazer" da exclusão) aceita os dois tipos.

### Incompletude (`question-issues.ts`)

`QuestionIssue` ganha `"noCorrectTrueFalse"` (RN-11b). Para V/F, `questionIssues` devolve `missingText` e/ou `noCorrectTrueFalse`; `missingAnswerHints` devolve `[]`.

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `InvalidQuestionTypeError` | `QUIZ.INVALID_TYPE` | Tipo fora de `QUESTION_TYPES`, ou `remembered` de um tipo diferente do destino |
| `QuestionChangeNotApplicableError` | `QUIZ.CHANGE_NOT_APPLICABLE` | Mudança que não existe no tipo da pergunta |

## Aplicação — `packages/core/src/quiz/application`

| Caso de uso | Mudança |
| --- | --- |
| `addQuestion` | a entrada ganha `type: string`; cria `blankQuestion(id, parseQuestionType(type))` (RN-03) |
| `updateQuestion` | sem mudança de código: já aplica qualquer `QuestionChange` |
| `restoreQuestion` | sem mudança de código: `parseQuestion` passa a aceitar V/F |
| `applyTimeLimitToAll`, `duplicateQuestion`, `duplicateQuiz`, `createQuiz` | sem mudança de regra; ajustes de tipo e testes com perguntas V/F (RN-05, RN-09, RN-21) |
| `toQuestionView` | passa a usar `copyQuestion`-like por tipo |

Nenhuma porta nova. O fake `InMemoryQuestionRepository` não muda.

## Adapters

### Banco — `packages/db`

- O enum `question_type` vem de `QUESTION_TYPES`, então ganha o valor `trueFalse` sozinho.
- `drizzle-question-repository.ts`: `toColumns` grava `content: storedContent(question)`; `toQuestion` monta a pergunta com `parseStoredContent(row.type, row.content)`.

### Real-time, storage

Nada.

## API — `packages/api`

| Procedure | Entrada (forma) | Mudança |
| --- | --- | --- |
| `quiz.questions.add` | `{ quizId, afterQuestionId, type: z.enum(QUESTION_TYPES) }` | `type` novo e obrigatório |
| `quiz.questions.update` | `change` ganha `{ kind: "trueFalseCorrect", correct: boolean }` e `{ kind: "type", type: z.enum(QUESTION_TYPES), remembered: content.nullable() }` | — |
| `quiz.questions.restore` | `question` = base + `z.discriminatedUnion("type", [quiz, trueFalse])` | aceita V/F |

Tipo desconhecido é barrado pelo zod (`BAD_REQUEST`) e, por garantia, pelo core (CA-22). Sem ligações novas no `container.ts`.

## UI — `apps/web` e `packages/ui`

### Design system

Nenhum primitivo novo. As alternativas de V/F usam `AnswerShape` e `ANSWER_COLOR_CLASSES` com as formas `diamond` (azul) e `triangle` (vermelho). A página `/design-system` e `docs/design-system.md` ganham o par Verdadeiro/Falso.

### Editor — `apps/web/src/components/editor/`

| Componente | Responsabilidade |
| --- | --- |
| `question-type-picker.tsx` (novo) | Botão "Adicionar" que abre um `DropdownMenu` ao lado (abaixo no celular): grupo "Testar conhecimento" e um cartão por tipo de `QUESTION_TYPES` (ícone em blocos coloridos e nome). No limite de 200, é o `ActionButton` indisponível com o motivo, e o menu não existe (RN-04) |
| `question-type-icon.tsx` (novo) | Ícone de cada tipo, usado no seletor |
| `true-false-answers.tsx` (novo) | "Verdadeiro" (azul, losango) e "Falso" (vermelho, triângulo) com texto fixo e a marcação "Verdadeiro correta"/"Falso correta"; usa `toggledTrueFalseCorrect`; mostra a dica "Marque a resposta correta" (RN-06, RN-07, RN-12) |
| `question-canvas.tsx` | Escolhe, pelo tipo, entre a grade de alternativas do Quiz (extraída para `quiz-answers.tsx`) e `TrueFalseAnswers` |
| `question-properties-panel.tsx` | "Tipo de pergunta" vira `PropertySelect` e chama `onChangeType`; "Opções de resposta" só aparece no Quiz (RN-08, RN-14) |
| `question-list.tsx` | Usa o seletor no lugar do botão; a miniatura mostra duas barras (azul e vermelha) para V/F (RN-13) |
| `quiz-editor.tsx` | `EditorActions.addQuestion(afterId, type)` e `changeQuestionType(questionId, type)` |

### Dados do cliente — `apps/web/src/lib/`

- `question-type-change.ts` (novo): a lembrança da sessão como função pura. `typeChangeFor(remembered, question, type)` devolve `null` se o tipo for o atual (CA-21); senão guarda `questionContent(question)` em `remembered` e devolve a mudança `type` com o conteúdo lembrado do destino.
- `question-mutations.ts`: `addQuestion` manda o tipo. `changeQuestionType` mantém um `RememberedContents` numa referência do hook, chama `typeChangeFor` e segue o caminho de `changeQuestion` (otimista, fila única, aviso em toast).
- `question-labels.ts`: rótulo do motivo `noCorrectTrueFalse` ("Marque a resposta correta") e do aviso `quizAnswersKept`.
- `quiz-labels.ts`: "Verdadeiro ou falso".
- `quiz-error-messages.ts`: mensagens dos dois códigos novos.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | componente | picker lists only Quiz and Verdadeiro ou falso under "Testar conhecimento" | `question-type-picker.test.tsx` |
| CA-02 | aplicação + API + E2E | adds a blank true/false after the selected; survives reload | `add-question.test.ts`, `quiz-questions.test.ts`, `e2e/editor-true-false.spec.ts` |
| CA-03 | aplicação + componente | choosing Quiz adds a blank quiz question | `add-question.test.ts`, `question-type-picker.test.tsx` |
| CA-04 | componente | closing the picker with Escape adds nothing | `question-type-picker.test.tsx` |
| CA-05 | componente | at 200 questions the button is unavailable and no menu opens | `question-list.test.tsx` |
| CA-06 | aplicação | createQuiz still starts with a blank quiz question | `create-quiz.test.ts` |
| CA-07 | domínio + componente | blank true/false has no correct; fixed texts, no extra answers action | `question.test.ts`, `true-false-answers.test.tsx`, `question-canvas.test.tsx` |
| CA-08 | domínio + componente + E2E | marks, switches, and unmarking marks the other | `question.test.ts`, `question-change.test.ts`, `true-false-answers.test.tsx`, E2E |
| CA-09 | componente | panel shows type, time, points and no answer options | `question-properties-panel.test.tsx` |
| CA-10 | domínio + repositório | time and points change on true/false; content round-trips | `question-change.test.ts`, `drizzle-question-repository.test.ts` |
| CA-11 | aplicação | time applied to questions of both types | `apply-time-limit-to-all.test.ts` |
| CA-12 | domínio + componente | true/false issues; alert in the list | `question-issues.test.ts`, `question-list.test.tsx` |
| CA-13 | componente | hint shown until a correct is marked | `true-false-answers.test.tsx` |
| CA-14 | repositório + E2E | incomplete true/false persists | `drizzle-question-repository.test.ts`, E2E |
| CA-15 | domínio + aplicação + E2E | type change keeps base, blanks content, notice | `question-change.test.ts`, `update-question.test.ts`, E2E |
| CA-16 | domínio + cliente + E2E | remembered quiz content comes back | `question-change.test.ts`, `question-type-change.test.ts`, E2E |
| CA-17 | domínio | remembered 6 slots, corrects and multiple selection are restored | `question-change.test.ts` |
| CA-18 | E2E | after a reload, back to Quiz is blank | E2E |
| CA-19 | cliente | the true/false correct comes back | `question-type-change.test.ts` |
| CA-20 | domínio | no notice without written answers, nor from true/false to quiz | `question-change.test.ts` |
| CA-21 | cliente | same type sends nothing | `question-type-change.test.ts` |
| CA-22 | domínio + API | unknown type refused | `question-change.test.ts`, `quiz-questions.test.ts` |
| CA-23 | domínio + aplicação | copy keeps type and correct; quiz duplicate too | `question.test.ts`, `duplicate-question.test.ts`, `duplicate-quiz.test.ts` |
| CA-24 | cliente | a duplicate has no remembered content | `question-type-change.test.ts` |

## Dados e migração

`drizzle-kit push` acrescenta o valor `trueFalse` ao enum `question_type`. Sem backfill: as linhas existentes continuam `quiz`.

## Riscos e decisões

- **União discriminada em `Question`.** Todo código que lia `question.choices` passa a precisar saber o tipo. É o custo previsto no ADR 0008 e evita "alternativas de mentira" no V/F. `blankQuestion(id)` e `aQuestion()` continuam devolvendo `QuizQuestion`, o que mantém os testes existentes.
- **A lembrança vai e volta pelo cliente.** O servidor não confia nela: revalida com as regras do core, como já faz no "Desfazer" da exclusão. Um cliente adulterado só consegue gravar um conteúdo válido na própria pergunta.
- **Seletor como menu.** `role="menu"` com `menuitem` é adequado para "escolha uma ação". Se os tipos futuros pedirem abas (Procurar, Gerar, Importar), o seletor vira um popover próprio.
- **Sem ADR novo:** a decisão estrutural é a do ADR 0008.
