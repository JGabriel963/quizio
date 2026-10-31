---
spec: "049"
status: done # todo | in-progress | done
---

# Tarefas — 049 Imagem nas respostas

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.
>
> Sem migration: as imagens das respostas vão no `content` `jsonb` que já existe. O único adapter que muda (`isMediaInUse`) é testado com PGlite; nenhum adapter que fala com um serviço externo muda, por isso não há `*.int.test.ts` novo.

## Fase 1 — Domínio

- [x] **T01** `core/quiz` — o valor `AnswerImage`
  - Teste: `quiz/domain/answer-image.test.ts`
    - "newAnswerImage has no crop and no alt text"
    - "parseAnswerCrop takes landscape, portrait and square and refuses a circle"
    - "readAnswerImage reads a stored image and drops one without a key or with a bad crop"
    - "copyAnswerImage is deep"
  - Implementar: `quiz/domain/answer-image.ts` (`AnswerImage`, `ANSWER_CROP_SHAPES`, `newAnswerImage`, `parseAnswerCrop`, `readAnswerImage`, `copyAnswerImage`)
  - Cobre: CA-07, CA-08 · RN-04, RN-11, RN-12

- [x] **T02** `core/quiz` — a resposta em imagem na pergunta
  - Teste: `quiz/domain/question.test.ts` e `question-issues.test.ts`
    - "blank content has no answer images"
    - "stored choices and puzzle slots read their images, and old ones have none"
    - "a stored answer with text and image keeps the image and loses the text"
    - "copyQuestion copies the answer images deeply"
    - "an image answer counts as filled" (alternativas mínimas do Quiz e 3 do Puzzle)
    - "a quiz of image answers is complete"
  - Implementar: `Choice.image`, `PuzzleQuestion.itemImages`, `isFilledChoice`, `isFilledSlot`, as leituras e a cópia; trocar os `text !== null` que decidem preenchimento (`question-issues.ts` e o resto que a busca apontar); construtores de teste
  - Cobre: CA-02, CA-09, CA-12 · RN-01, RN-02, RN-18

- [x] **T03** `core/quiz` — as mudanças da imagem da resposta
  - Teste: `quiz/domain/question-change.test.ts`
    - "answerImage puts the image, drops the text and its formatting and keeps the correct mark"
    - "answerImage with null removes the image and the correct mark, leaving an empty answer"
    - "answerImageCrop saves the crop and refuses a circle"
    - "answerImageAltText saves up to 1000 characters"
    - "crop or alt text on an answer without image is ANSWER_HAS_NO_IMAGE"
    - "a text change on an image answer is ANSWER_HAS_IMAGE"
    - "puzzleItemMoved carries the image"
    - "removing the extra answers drops their images"
    - "remembered content brings the images back, and refuses text and image together"
  - Implementar: `AnswerRef`, `answerImage`/`answerImageCrop`/`answerImageAltText`, os erros, `movePuzzleItem`, `setExtraChoices`, `QuestionContentInput`
  - Cobre: CA-03, CA-07, CA-08, CA-10, CA-12 · RN-07, RN-11 a RN-13, RN-15, RN-18

- [x] **T04** `core/quiz` — agentes, versão e assistente
  - Teste:
    - `question-draft.test.ts`: "a draft takes image answers for quiz and puzzle"; "an answer with text and image is ANSWER_TEXT_AND_IMAGE"
    - `question-patch.test.ts`: "choices sent replace the images too"
    - `quiz-version.test.ts`: "an answer image change makes the lists differ"
    - `accept-generated.test.ts`: "generated answers have no image"
  - Implementar: `question-draft.ts`, `question-patch.ts`, `quiz-version.ts`, `accept-generated.ts`
  - Cobre: CA-12, CA-20 · RN-17, RN-21, RN-27

- [x] **T05** [P] `core/game` — a imagem na partida
  - Teste:
    - `game-question.test.ts`: "an image answer is copied with its image and no text"; "reads a stored choice with an image, and an old one without"; "a shuffled image answer keeps its image"
    - `puzzle.test.ts`: "two image answers are never the same answer"
    - `public-stage.test.ts`: "the image goes only with the texts and never in the intro"
  - Implementar: `GameChoice.text: string | null`, `GameChoice.image`, `choicesOf`, `parseStoredGameQuestion`, a identidade da resposta no Puzzle, `PublicChoice.image`; construtores de teste
  - Cobre: CA-11, CA-14, CA-16 · RN-16, RN-20, RN-23

- [x] **T06** [P] `core/reports` — as ordens e as alternativas com imagem
  - Teste: `puzzle-orders.test.ts`: "orders group by answer identity, with image answers apart"; "an ordered image answer carries its image"
  - Implementar: `puzzle-orders.ts` (`OrderedAnswer.image`, agrupamento pela identidade)
  - Cobre: CA-18 · RN-24

## Fase 2 — Aplicação (casos de uso)

- [x] **T07** `core/quiz` — arquivos das imagens das respostas
  - Teste:
    - `question-images.test.ts`: "imageKeysOf includes the answer images"; "releaseUnusedImages deletes an answer image no version uses and keeps one a version uses"
    - `update-question.test.ts`: "answerImage refuses a key that is not an upload of the owner"
    - `copy-quiz-content.test.ts` (ou `duplicate-quiz.test.ts`): "copies the answer image files under new keys"
    - `get-shared-quiz.test.ts`: "imageUrls include the answer images"
    - `discard-quiz-changes.test.ts`: "brings back the answer images"
  - Implementar: `question-images.ts`, `update-question.ts`, `copy-quiz-content.ts`, `get-shared-quiz.ts`
  - Cobre: CA-02, CA-12, CA-18, CA-19 · RN-03, RN-17 a RN-19

- [x] **T08** `core/game` — visões da partida e da atividade
  - Teste:
    - `get-host-game.test.ts`: "the host's choices carry the image with its address"
    - `get-player-session.test.ts`: "the device gets the image only with the texts"
    - `get-assignment-play.test.ts`: "the choices carry the image"
    - `start-game.test.ts`, `create-assignment.test.ts`: "a later edit of an answer image does not reach the copy"
  - Implementar: `HostChoiceView.image`, `PlayChoiceView.image` (`host-game-view.ts`, `assignment-play-view.ts`)
  - Cobre: CA-13, CA-14, CA-16, CA-17 · RN-20, RN-22, RN-23

- [x] **T09** [P] `core/reports` — leituras do relatório
  - Teste: `get-report-details.test.ts`: "the choices, each participant's choices and the puzzle orders carry the image address while the quiz exists"; "without the quiz they carry only the alt text"
  - Implementar: `report-view.ts` (`ChoiceView.image`), `get-report-question.ts`, `get-report-participant.ts`
  - Cobre: CA-18 · RN-24

## Fase 3 — Adapters

- [x] **T10** `packages/db` — banco
  - Teste:
    - `drizzle-question-repository.test.ts`: "round-trips answer images in content"
    - `drizzle-quiz-version-repository.test.ts`: "versions carry the answer images"
    - `drizzle-report-game-query.test.ts`: "reads the choices' images from game_question"
    - `drizzle-media-uploads.test.ts`: "an answer image in a live question's content is in use"
  - Implementar: `drizzle-media-uploads.ts` (`isMediaInUse` procura no `content`). Sem `db:generate`.
  - Cobre: CA-02, CA-16, CA-18, CA-19 · RN-19

## Fase 4 — API e MCP

- [x] **T11** `packages/api` — as mudanças da imagem da resposta
  - Teste: `routers/quiz-questions.test.ts`: "answerImage puts an uploaded image in a quiz answer and a puzzle slot"; "answerImageCrop and answerImageAltText"; "a circle crop and a foreign key are INVALID_IMAGE"; "a text change on an image answer is ANSWER_HAS_IMAGE"; "a type change keeps the remembered images"
  - Implementar: `routers/quiz-questions.ts` (`answerRef`, as três mudanças, `image` e `itemImages` no `content`)
  - Cobre: CA-02, CA-03, CA-07, CA-08, CA-12 · RN-03, RN-07, RN-11 a RN-13

- [x] **T12** `packages/mcp` — agentes leem e põem imagens nas respostas
  - Teste:
    - `tools/questions.test.ts`: "add_questions puts an image answer from a link"; "a puzzle slot takes an image"; "an answer with text and image is refused"
    - `tools/quizzes.test.ts`: "get_quiz returns image answers with their address and alt text"
    - `tools/reports.test.ts`: "get_report_detail returns image answers"
  - Implementar: `schemas/question-input.ts` (`choices[].image`, `items[]` com `{ image }`, saída), `tools/library.ts`, `tools/reports.ts`, `instructions.ts`
  - Cobre: CA-20 · RN-26, RN-27

## Fase 5 — UI

- [x] **T13** [P] `apps/web` — desenhar a imagem da resposta
  - Teste: `components/quiz/answer-image.test.tsx`: "draws the whole image without a crop"; "draws the cropped part"; "is named by its alt text, or the label"
  - Implementar: `components/quiz/answer-image.tsx` sobre `lib/image-crop.ts`
  - Cobre: CA-07, CA-08 · RN-09, RN-25

- [x] **T14** `apps/web` — barra e diálogos
  - Teste:
    - `formatting-toolbar.test.tsx`: "with onImage, the first button is the image with its tip"
    - `image-dialogs.test.tsx`: "the crop dialog offers only the shapes it is given"
  - Implementar: `FormattingToolbar` (`onImage`), `FormattedTextField` (passa `onImage`), `CropImageDialog` (`shapes`)
  - Cobre: CA-01, CA-07 · RN-05, RN-11

- [x] **T15** `apps/web` — a resposta em imagem no editor
  - Teste:
    - `answer-image-field.test.tsx`: "shows the image and, on hover or focus, the three actions"; "Remover asks to remove the image"; "Detalhes da mídia saves the alt text"; "Recortar saves the crop"; "shows the upload progress"
    - `choice-field.test.tsx`: "an empty answer shows the image icon, a written one does not"; "with an image the field is gone and the image shows"; "a refused file shows the media policy message"; "a failed upload leaves the answer as it was"
    - `puzzle-answers.test.tsx`: "an image slot shows the image and the handle"
  - Implementar: `answer-image-field.tsx`; `ChoiceField` e o campo do Puzzle com as duas formas; o `DraggedAnswer`
  - Cobre: CA-01, CA-03, CA-04, CA-06, CA-07, CA-08, CA-10 · RN-05 a RN-13, RN-15

- [x] **T16** `apps/web` — enviar e salvar a imagem da resposta
  - Teste: `quiz-editor.test.tsx`: "an answer image goes to the answer the upload started in"; "Salvar waits for the answer upload"; "removing an answer image sends answerImage with null"
  - Implementar: `uploadAnswerImage` em `quiz-editor.tsx`, as mudanças em `lib/question-mutations.ts` (`changeKey`) e o rastreador de envios
  - Cobre: CA-02, CA-05, CA-13 · RN-08, RN-14

- [x] **T17** [P] `apps/web` — telão e celular
  - Teste:
    - `host-stage.test.tsx`: "draws the answer images, cropped, in the answers and the results"
    - `puzzle-results.test.tsx` / `puzzle-answer-input.test.tsx`: "an image block draws the image"
    - `answer-buttons.test.tsx`: "an image answer button shows the image without the shape"
  - Implementar: `stage-choices.tsx`, `puzzle-block.tsx`, `answer-buttons.tsx`, `puzzle-answer-input.tsx`
  - Cobre: CA-13, CA-14, CA-15 · RN-22, RN-23, RN-25

- [x] **T18** [P] `apps/web` — atividade, páginas e relatórios
  - Teste: `play-question.test.tsx`, `play-result.test.tsx`, `quiz-question-preview.test.tsx`, `shared-quiz-page.test.tsx`, `report-details.test.tsx`: "an image answer shows as a thumbnail"
  - Implementar: `play-question.tsx`, `play-result.tsx`, `quiz-question-preview.tsx`, `shared-question-list.tsx`, `report-parts.tsx`, `question-detail.tsx`, `participant-detail.tsx`
  - Cobre: CA-17, CA-18 · RN-24

## Fase 6 — E2E e fechamento

- [x] **T19** E2E — `apps/web/e2e/answer-images.spec.ts` (desktop e mobile)
  - Teste:
    - **Editor:** ícone e barra; enviar um PNG e recarregar (CA-01, CA-02); a imagem toma o lugar do texto e remover devolve o campo (CA-03); recortar em Quadrado (CA-07); texto alternativo (CA-08); Puzzle com ↑ (CA-10).
    - **Partida:** o telão mostra as imagens e o celular as mostra com "perguntas nos dispositivos" e só formas sem a opção (CA-13, CA-14).
    - Os E2E do editor, do Puzzle e da partida continuam passando.
  - Cobre: CA-01, CA-02, CA-03, CA-07, CA-08, CA-10, CA-13, CA-14

- [x] **T20** Fechamento
  - Checks:
    - Biome nos arquivos mudados (`--line-ending=crlf`);
    - testes por pacote;
    - `pnpm check-types` e `pnpm -F web exec tsc --noEmit`;
    - E2E das respostas, do editor e da partida;
    - busca por `text !== null` que ainda decida preenchimento.
  - Documentação:
    - `CLAUDE.md`: parágrafo da imagem nas respostas;
    - `docs/design-system.md`;
    - `glossary.md` (✅);
    - `roadmap.md` (✅);
    - `spec.md` (`done` e changelog);
    - `plan.md` (ajustes da implementação).

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T14, T15, T19 |
| CA-02 | T02, T07, T10, T11, T16, T19 |
| CA-03 | T03, T11, T15, T19 |
| CA-04 | T15 |
| CA-05 | T16 |
| CA-06 | T15 |
| CA-07 | T01, T03, T11, T13, T14, T15, T19 |
| CA-08 | T01, T03, T11, T13, T15, T19 |
| CA-09 | T02 |
| CA-10 | T03, T15, T19 |
| CA-11 | T05 |
| CA-12 | T02, T03, T04, T07, T11 |
| CA-13 | T08, T16, T17, T19 |
| CA-14 | T05, T08, T17, T19 |
| CA-15 | T17 |
| CA-16 | T05, T08, T10 |
| CA-17 | T08, T18 |
| CA-18 | T06, T07, T09, T10, T18 |
| CA-19 | T07, T10 |
| CA-20 | T04, T12 |

Todos os 20 critérios aparecem em ao menos uma tarefa.
