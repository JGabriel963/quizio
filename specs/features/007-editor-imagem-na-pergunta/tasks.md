---
spec: "007"
status: done # todo | in-progress | done
---

# Tarefas — 007 Editor 5/5: Imagem na pergunta

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: teste falhando pelo motivo certo → mínimo para passar → refatorar. `[P]` = paralelizável na fase.

## Fechamento (2026-10-01)

- Testes: `pnpm test` 905 ✅ (core 405, db 50, api 49, ui 25, web 352, auth 15, realtime 6, storage 3); `pnpm check-types` e `pnpm -F web exec tsc --noEmit` limpos; Biome limpo nos 128 arquivos alterados desde o último commit (specs 006 e 007).
- E2E: 86 ✅ (desktop + celular), incluindo os 8 de `editor-image.spec.ts`.
- `pnpm test:int` não foi rodado: nenhum adapter de serviço externo mudou (`packages/storage` ficou como estava).
- Schema aplicado com `pnpm -F @quizio/db db:push`. Em cada máquina com banco antigo, rode o mesmo comando: a tabela `question` ganha a coluna `image` (nula).
- Desvios do plano:
  - Os testes de domínio da imagem ficaram num arquivo próprio, `question-image-change.test.ts` (mudanças, cópia, troca de tipo, versão jogável), em vez de espalhados por `question.test.ts`, `question-change.test.ts` e `quiz-version.test.ts`.
  - Os testes de aplicação ficaram em `question-images.test.ts`, que exercita `updateQuestion`, `duplicateQuestion`, `deleteQuestion`, `discardQuizChanges`, `getQuizEditor`, `duplicateQuiz` e `deleteQuizPermanently` com imagens, em vez de um bloco em cada arquivo.
  - Os quatro diálogos são testados juntos em `image-dialogs.test.tsx`.
  - O componente que desenha a imagem chama-se `QuestionImageView` (`question-image-view.tsx`), para não colidir com o tipo `QuestionImage` do core.
  - O diálogo de recorte não usa `croppedImageStyle`: lá a imagem precisa aparecer também fora da moldura, escurecida, e `object-fit` a cortaria. Ele usa `spillingImageStyle`, que posiciona a imagem pelas dimensões naturais. As duas funções dão o mesmo enquadramento (conferido no navegador).
  - Miniaturas mostram a imagem de fundo sem o recorte (`thumbnailImage`), já que o recorte não vale para o fundo.
  - `isBlankQuestion` passou a considerar a imagem: uma pergunta só com imagem já não é "recém-começada".
  - CA-12 (Sair espera o envio) é garantido por o envio ser registrado no `SaveTracker`, cujo `flush()` já tem teste; não há teste próprio do envio dentro do hook `useEditorActions`.
  - CA-13 (GIF animado) não tem teste de animação: o que se testa é que o tipo `image/gif` é aceito e que o arquivo enviado nunca é reprocessado.

## Fase 1 — Domínio

- [x] **T01** `core/quiz` — `QuestionImage`: posição, recorte, texto alternativo, leitura tolerante
  - Teste: `question-image.test.ts` › "a new image sits in the middle without crop or alt text"; "validates the crop"; "limits the alt text"; "reads a stored image tolerantly"; "compares images"
  - Implementar: `question-image.ts`
  - Cobre: CA-22, CA-31, CA-32, RN-13, RN-18, RN-20, RN-29
- [x] **T02** `core/quiz` — a pergunta tem imagem; cópia, pergunta em branco, troca de tipo
  - Teste: `question.test.ts` › "a blank question has no image"; "a copy has its own image"; `question-change.test.ts` › "a type change keeps the image"
  - Implementar: `question.ts`, `question-change.ts`, `testing/a-question.ts`
  - Cobre: CA-14, CA-36, RN-01, RN-33, RN-34
- [x] **T03** `core/quiz` — as quatro mudanças de imagem
  - Teste: `question-change.test.ts` › "sets and removes the image"; "changes the placement and keeps the crop"; "crops"; "describes"; "refuses adjustments without an image"
  - Implementar: `question-change.ts`
  - Cobre: CA-17, CA-28, RN-16, RN-23, RN-24
- [x] **T04** `core/quiz` — a imagem na versão jogável e nas pendências
  - Teste: `quiz-version.test.ts` › "an image change is a change"; "reads stored images"; `question-issues.test.ts` › "an image does not complete a question"
  - Implementar: `quiz-version.ts`
  - Cobre: CA-15, CA-37, RN-35

## Fase 2 — Aplicação

- [x] **T05** `core/quiz` — `listByQuiz` das versões e `question-images.ts`
  - Teste: `in-memory-quiz-version-repository.test.ts` › "lists the versions of a quiz"; `question-images.test.ts` › "releases only what nobody uses"; "a storage failure does not throw"
  - Implementar: `ports/quiz-version-repository.ts`, fake, `question-images.ts`
- [x] **T06** `core/quiz` — `updateQuestion` confere e libera imagens
  - Teste: `update-question.test.ts` › "refuses an image of another owner"; "refuses a missing upload"; "removing an unpublished image deletes the file"; "removing a published image keeps the file"; "a duplicated question shares the file"
  - Implementar: `update-question.ts`
  - Cobre: CA-16, CA-17, CA-34, RN-03, RN-36
- [x] **T07** `[P]` `core/quiz` — `deleteQuestion`, `discardQuizChanges`, `deleteQuizPermanently`
  - Teste: `delete-question.test.ts` › "releases the image"; `discard-quiz-changes.test.ts` › "brings the image back and drops the draft's"; `delete-quiz-permanently.test.ts` › "deletes live and versioned images"
  - Implementar: os três casos de uso
  - Cobre: CA-38, CA-40, RN-36, RN-37
- [x] **T08** `[P]` `core/quiz` — `duplicateQuiz` copia os arquivos; visão do editor com `imageUrls`
  - Teste: `duplicate-quiz.test.ts` › "copies the question images"; `get-quiz-editor.test.ts` › "returns the urls of live and published images"
  - Implementar: `duplicate-quiz.ts`, `quiz-editor-view.ts`
  - Cobre: CA-35, RN-33

## Fase 3 — Adapters

- [x] **T09** `db` — coluna `image`, `listByQuiz`
  - Teste: `drizzle-question-repository.test.ts` › "stores the image"; "saveList updates the image"; `drizzle-quiz-version-repository.test.ts` › "lists the versions"; "keeps images in the snapshot"
  - Implementar: `schema/quiz.ts`, os dois repositórios; `pnpm -F @quizio/db db:push`

## Fase 4 — API

- [x] **T10** `api` — mudanças de imagem e `imageUrls`
  - Teste: `quiz.test.ts` › "sets, adjusts and removes a question image"; "refuses someone else's upload"
  - Implementar: `routers/quiz.ts` (ou o router de perguntas), `container.ts`
  - Cobre: CA-02, CA-16

## Fase 5 — UI

- [x] **T11** `web` — libs puras: recorte, escolha do arquivo, aviso do fundo, cache
  - Teste: `image-crop.test.ts`, `question-image-upload.test.ts`, `background-notice.test.ts`, `editor-cache.test.ts`
  - Implementar: os quatro arquivos de `lib/`, `quiz-error-messages.ts`
  - Cobre: CA-07 a CA-09, CA-22, CA-25, CA-27
- [x] **T12** `web` — `QuestionImage` e os quatro diálogos
  - Teste: `upload-image-dialog.test.tsx`, `crop-image-dialog.test.tsx`, `media-details-dialog.test.tsx`, `background-notice-dialog.test.tsx`
  - Implementar: os componentes em `components/editor`
  - Cobre: CA-04 a CA-06, CA-19, CA-21, CA-23, CA-24, CA-26, CA-30 a CA-32
- [x] **T13** `web` — área de mídia
  - Teste: `question-media.test.tsx` › vazio, soltar, recusas, enviando, falha, ações, modo fundo, não aceita soltar com imagem
  - Implementar: `question-media.tsx`, `question-canvas.tsx`
  - Cobre: CA-01, CA-03, CA-07, CA-10, CA-18, CA-26, CA-29
- [x] **T14** `web` — envio e ações no editor; miniaturas
  - Teste: `quiz-editor.test.tsx` › "the upload lands on the question it started in"; "leaving waits for the upload"; `question-list.test.tsx` › "shows the image thumbnail"
  - Implementar: `question-mutations.ts`, `quiz-editor.tsx`, `question-list.tsx`, `incomplete-questions-dialog.tsx`, rota
  - Cobre: CA-11, CA-12, CA-33

## Fase 6 — E2E e fechamento

- [x] **T15** E2E — `apps/web/e2e/editor-image.spec.ts`
  - Cobre: CA-02, CA-20, CA-26, CA-30, CA-37, CA-38, CA-41
- [x] **T16** Fechamento
  - `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, Biome nos arquivos alterados, `pnpm test:e2e`
  - Atualizar `spec.md` (status, changelog), ADR 0003 (trocar de provedor), ADR 0008 (imagem), `glossary.md`, `roadmap.md`, `CLAUDE.md`, specs 003 a 006 (nome da 007)
