---
spec: "004"
status: approved # draft | approved
---

# Plano técnico — 004 Editor 2/5: pergunta Quiz completa

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0008](../../../docs/adr/0008-modelo-de-perguntas.md)

## Abordagem

Esta etapa aplica o ADR 0008 pela primeira vez. A `question` ganha duas colunas comuns a todo tipo, `time_limit_seconds` e `points`, e a coluna `content jsonb` com o que é próprio do Quiz: `{ selection, choices: [{ id, text, correct }] }`. O core é dono do formato. Um parser puro (`parseQuizContent`) lê o JSON com tolerância, completando os padrões para as perguntas antigas, e as regras de edição são funções puras.

Toda edição de uma pergunta passa a ser uma **mudança (`QuestionChange`)** discriminada: `text`, `timeLimit`, `points`, `selection`, `choiceText`, `choiceCorrect` ou `extraChoices`. A função pura `applyQuestionChange` aplica a mudança e devolve um aviso opcional (`multipleEnabled`, `correctsCleared`). O mesmo código roda no servidor (fonte da verdade) e no cliente (atualização otimista e avisos), porque o web pode importar regras puras do core.

A incompletude (RN-14) também é uma função pura, `questionIssues`, calculada no cliente para a lista e as dicas. A spec 006 vai reutilizá-la no servidor para bloquear a publicação. Ela não é persistida.

O cliente já envia uma requisição por campo. Esta etapa acrescenta uma **fila por pergunta** em `useEditorActions`: como o servidor regrava a linha inteira da pergunta, duas mudanças da mesma pergunta nunca ficam em voo ao mesmo tempo, o que evita perder a alteração de uma alternativa quando outra é salva junto.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Alternativa | `Choice` (`AnswerOption` na UI) | sim no domínio |
| Resposta correta | `correct` | sim |
| Opções de resposta | `SelectionMode` (`single`/`multiple`) | sim (era 📝) |
| Limite de tempo | `timeLimitSeconds`, `TIME_LIMITS_SECONDS` | sim (era 📝) |
| Pontos da pergunta | `QuestionPoints` (`standard`/`double`/`noPoints`) | sim no contexto quiz |
| Mudança de pergunta | `QuestionChange`, `applyQuestionChange` | sim |
| Aviso da mudança | `QuestionChangeNotice` | sim |
| Pergunta incompleta | `questionIssues`, `QuestionIssue` | sim |
| Respostas extras | `extraChoices` (espaços 5 e 6) | sim |

## Domínio — `packages/core/src/quiz/domain`

### Entidade `Question` (ampliada, `question.ts`)

```ts
export const TIME_LIMITS_SECONDS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240] as const; // RN-10
export const DEFAULT_TIME_LIMIT_SECONDS = 20;
export const QUESTION_POINTS = ["standard", "double", "noPoints"] as const;        // RN-12
export const SELECTION_MODES = ["single", "multiple"] as const;                    // RN-07
export const CHOICE_TEXT_MAX_LENGTH = 75;                                          // RN-04
export const DEFAULT_CHOICE_COUNT = 4;
export const MAX_CHOICE_COUNT = 6;                                                  // RN-03

export interface Choice { id: string; text: string | null; correct: boolean }
export interface Question {
	id: string; type: QuestionType; text: string | null;
	timeLimitSeconds: TimeLimitSeconds; points: QuestionPoints;
	selection: SelectionMode; choices: Choice[]; // 4 ou 6, em ordem de posição
}
```

- **O id de uma alternativa é o da sua posição** (`choiceIdAt(index)` → `choice-1`…`choice-6`). Os ids só precisam ser únicos dentro da pergunta, a posição é fixa (cor e forma) e uma cópia pode mantê-los. Com isso, `blankQuestion` continua pura, sem gerador de ids.
- `blankQuestion(id)`: 4 alternativas vazias, `single`, 20 s, `standard`.
- `copyQuestion` copia tudo (RN-18).
- `parseQuizContent(raw: unknown)`: lê com tolerância. JSON ausente ou inválido vira `single` com 4 alternativas vazias; entradas desconhecidas são ignoradas.
- `parseTimeLimit`, `parsePoints`, `parseSelection` e `parseChoiceText` recebem valores crus (vindos da API ou do restore) e lançam os erros abaixo.

### Mudanças (`question-change.ts`)

```ts
export type QuestionChange =
	| { kind: "text"; text: string | null }
	| { kind: "timeLimit"; seconds: number }
	| { kind: "points"; points: string }
	| { kind: "selection"; selection: string }
	| { kind: "choiceText"; choiceId: string; text: string | null }
	| { kind: "choiceCorrect"; choiceId: string; correct: boolean }
	| { kind: "extraChoices"; visible: boolean };

export type QuestionChangeNotice =
	| { kind: "multipleEnabled" }            // RN-08
	| { kind: "correctsCleared"; count: number }; // RN-09

export function applyQuestionChange(question, change): { question: Question; notice: QuestionChangeNotice | null };
```

Invariantes que `applyQuestionChange` garante:

- **RN-06:** alternativa vazia nunca é correta. Marcar uma vazia lança erro; apagar o texto desmarca.
- **RN-08:** em `single`, marcar uma segunda correta passa a pergunta para `multiple` e devolve o aviso `multipleEnabled`.
- **RN-09:** passar para `single` com mais de uma correta mantém só a primeira e devolve `correctsCleared`.
- **RN-03:** `extraChoices: true` completa até 6 alternativas; `false` corta para 4 e descarta as de índice 4 e 5.

### Incompletude (`question-issues.ts`)

```ts
export type QuestionIssue = "missingText" | "notEnoughAnswers" | "noCorrectAnswer"; // RN-14
export function questionIssues(question): QuestionIssue[];
/** Posições (1 e 2) que recebem a dica "A resposta N não foi adicionada" (RN-16). */
export function missingAnswerHints(question): number[];
```

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `InvalidTimeLimitError` | `QUIZ.INVALID_TIME_LIMIT` | Segundos fora da lista da RN-10 |
| `InvalidQuestionPointsError` | `QUIZ.INVALID_POINTS` | Pontos fora de `QUESTION_POINTS` |
| `InvalidSelectionModeError` | `QUIZ.INVALID_SELECTION` | Modo fora de `SELECTION_MODES` |
| `ChoiceTextTooLongError` | `QUIZ.CHOICE_TEXT_TOO_LONG` | Mais de 75 caracteres (RN-04) |
| `ChoiceNotFoundError` (NotFound) | `QUIZ.CHOICE_NOT_FOUND` | `choiceId` que a pergunta não tem (inclusive 5 ou 6 com os extras ocultos) |
| `EmptyChoiceCannotBeCorrectError` | `QUIZ.EMPTY_CHOICE_CORRECT` | Marcar como correta uma alternativa vazia (RN-06) |

## Aplicação — `packages/core/src/quiz/application`

| Caso de uso | Entrada | Saída | Mudança |
| --- | --- | --- | --- |
| `updateQuestion` | ref + `questionId` + `change: QuestionChange` | `{ question: QuestionView; notice }` | antes era `changes: { text? }`; agora aplica `applyQuestionChange` |
| `applyTimeLimitToAll` (novo) | ref + `seconds` | `{ updatedCount }` | valida, aplica a todas e grava com `saveList` (RN-11) |
| `restoreQuestion` | ref + `question` completa + `index` | como antes | revalida todos os campos (`parseRestoredQuestion`) |
| `QuestionView` | — | ganha `timeLimitSeconds`, `points`, `selection`, `choices` | — |

As outras operações (adicionar, duplicar, mover, excluir, abrir, duplicar quiz) não mudam: elas já trabalham com a `Question` inteira.

## Adapters — `packages/db`

`schema/quiz.ts`:

```ts
export const questionPoints = pgEnum("question_points", QUESTION_POINTS);
// question:
timeLimitSeconds: integer("time_limit_seconds").notNull().default(DEFAULT_TIME_LIMIT_SECONDS),
points: questionPoints("points").notNull().default("standard"),
/** Type-specific content (ADR 0008), parsed by the core. */
content: jsonb("content").$type<unknown>().notNull().default({}),
```

`drizzle-question-repository.ts` grava `content = { selection, choices }` e lê com `parseQuizContent` e `parseTimeLimit`/`parsePoints` tolerantes (um valor inválido no banco vira o padrão, sem quebrar o editor). `saveList` e `saveQuestion` passam a gravar as colunas novas. Aplicação: `drizzle-kit push`. As linhas existentes recebem os padrões das colunas e `content = {}`, que o parser completa.

## API — `packages/api`

| Procedure | Entrada (forma) | Saída |
| --- | --- | --- |
| `quiz.questions.update` | `{ quizId, questionId, change }`, com `change` = `z.discriminatedUnion("kind", …)` (enums vindos das constantes do core; números e textos só com a forma) | `{ question, notice }` |
| `quiz.questions.applyTimeLimitToAll` (nova) | `{ quizId, seconds: int }` | `{ updatedCount }` |
| `quiz.questions.restore` | `question` com todos os campos | `{ index }` |

## UI — `apps/web` e `packages/ui`

### Design system

- `AnswerShape` ganha `pentagon` e `inverted-triangle`; `ANSWER_SHAPES` passa a ter 6 formas.
- `globals.css` ganha os tokens `--answer-teal` e `--answer-purple`.
- O `cva` do `AnswerOption` ganha as duas cores. A página `/design-system` mostra as 6.

### Editor — `apps/web/src/components/editor/`

| Componente | Responsabilidade |
| --- | --- |
| `choice-field.tsx` (novo) | Bloco com cor e forma, campo autosalvo (chave `question:<id>:choice:<choiceId>`, corte em 75), marcação de correta (`role="checkbox"`, "Resposta N correta") indisponível quando vazia, e a dica da RN-16 |
| `question-canvas.tsx` | Grade de alternativas, "Adicionar mais respostas"/"Remover respostas extras" e a dica "Marque pelo menos 1 resposta correta". Sai o "Em breve" das alternativas |
| `question-properties-panel.tsx` | "Limite de tempo", "Pontos" e "Opções de resposta" como `<select>` nativos com o visual do Kahoot, e o link "Aplicar a todas as perguntas" |
| `question-list.tsx` | Miniatura com o círculo do tempo, as barras das alternativas preenchidas e o alerta de incompleta (ícone com os motivos na descrição acessível e no tooltip) |
| `lib/question-labels.ts` | Rótulos PT-BR: tempo ("20 segundos", "1 minuto 30 segundos"), pontos, opções, motivos de incompletude e avisos |

`EditorActions` troca `saveQuestionText` por `changeQuestion(questionId, change)`, com atualização otimista via `applyQuestionChange` e o aviso em toast, e ganha `applyTimeLimitToAll(seconds)`. Em `useEditorActions`, as mudanças da mesma pergunta passam por uma fila (`Map<questionId, Promise>`).

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | domínio | blank question has four empty single-choice answers, 20 s, standard | `question.test.ts` |
| CA-01 | componente | canvas shows four answer fields with Kahoot placeholders and "Adicionar mais respostas" | `question-canvas.test.tsx` |
| CA-02 | aplicação + repositório | choice text is saved; content round-trips through jsonb | `update-question.test.ts`, `drizzle-question-repository.test.ts` |
| CA-02 | E2E | answers survive a reload | `e2e/editor-quiz-question.spec.ts` |
| CA-03 | domínio + componente | 76 characters refused; paste of 80 keeps 75 | `question-change.test.ts`, `choice-field.test.tsx` |
| CA-04 | domínio + componente | extra choices shown and hidden (content discarded); shapes 5 and 6 | `question-change.test.ts`, `question-canvas.test.tsx`, `answer-option.test.tsx` |
| CA-05 | domínio + E2E | marking correct persists | `question-change.test.ts`, E2E |
| CA-06 | domínio + componente | empty choice cannot be correct; clearing text unmarks; toggle disabled | `question-change.test.ts`, `choice-field.test.tsx` |
| CA-07 | domínio + E2E | a second correct in single mode switches to multiple with notice | `question-change.test.ts`, E2E |
| CA-08 | domínio | switching to single keeps the first correct and reports cleared count | `question-change.test.ts` |
| CA-09 | domínio + componente + E2E | time limit options and default; list shows seconds | `question.test.ts`, `question-properties-panel.test.tsx`, `question-list.test.tsx`, E2E |
| CA-10 | aplicação + API | applies time to every question and returns the count | `apply-time-limit-to-all.test.ts`, `quiz-questions.test.ts` |
| CA-11 | domínio + componente | points options; invalid points refused | `question-change.test.ts`, `question-properties-panel.test.tsx` |
| CA-12 | domínio + componente + E2E | issues listed and cleared; warning in list | `question-issues.test.ts`, `question-list.test.tsx`, E2E |
| CA-13 | domínio + componente | answer hints for slots 1/2 only while fewer than 2 answers | `question-issues.test.ts`, `question-canvas.test.tsx` |
| CA-14 | repositório + E2E | incomplete question persists | `drizzle-question-repository.test.ts`, E2E |
| CA-15 | domínio + aplicação | copy keeps every field and stays independent | `question.test.ts`, `duplicate-question.test.ts` |

## Dados e migração

`drizzle-kit push`: enum `question_points`, 3 colunas com padrão, sem backfill. O parser tolerante cobre as linhas antigas.

## Riscos e decisões

- **Mudanças simultâneas da mesma pergunta.** O servidor lê a pergunta, aplica a mudança e regrava a linha. Duas requisições simultâneas da mesma pergunta perderiam uma alteração. A fila por pergunta no cliente evita isso numa aba só. Duas abas continuam no "vale a última" aceito na spec 003.
- **JSON sem esquema no banco.** Aceito no ADR 0008. O parser tolerante na leitura e o core como única porta de escrita protegem os dados.
- **Selects nativos** em vez de um primitivo de lista no design system. São mais simples, acessíveis e bons no celular. Se o visual incomodar, dá para trocar depois por um `Select` do base-ui na raiz de `packages/ui`.
