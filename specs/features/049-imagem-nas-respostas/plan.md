---
spec: "049"
status: approved # draft | approved
---

# Plano técnico — 049 Imagem nas respostas

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · Base: spec 007 (imagem da pergunta), spec 048 (formatação das respostas)

## Abordagem

A imagem da resposta é um valor novo do contexto `quiz`, `AnswerImage` (`key`, `crop`, `altText`, sem posição), irmão do `QuestionImage` da spec 007:

- no Quiz, cada `Choice` ganha `image`;
- no Puzzle, a lista paralela `itemImages` entra ao lado de `items` e `itemFormatting` (spec 048).

Tudo fica dentro do `content` `jsonb` da pergunta, da versão jogável e da cópia da partida. **Não há coluna nova nem migration.**

**Texto e imagem nunca juntos**: o domínio garante isso em cada mudança (RN-01, RN-07, RN-13). Uma resposta "preenchida" passa a ser texto **ou** imagem, por uma função só do core.

As imagens das respostas entram em **`imageKeysOf`**, a função que já diz quais arquivos um quiz usa. Com isso valem, sem código novo:

- as URLs do editor e das páginas;
- a cópia dos arquivos ao duplicar;
- a limpeza de arquivos sem uso (`releaseUnusedImages`);
- a exclusão definitiva do quiz;
- a conferência de que o arquivo é do dono.

O envio reusa o caminho da imagem da pergunta (`media.requestUpload`, `uploadFile`, `recordMediaUpload`), e a varredura de envios esquecidos passa a enxergar as chaves dentro do `content`.

Na partida, cada `GameChoice` ganha `image`, e o texto fica `null` numa resposta em imagem. As visões levam o endereço público, o recorte e o texto alternativo. No web, um componente comum desenha a imagem recortada (`AnswerImage`), usado pelo editor, pelo telão, pelo celular, pela atividade, pelas páginas e pelos relatórios.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Imagem da resposta | `AnswerImage` (`key`, `crop`, `altText`) | sim |
| Imagens das respostas do Puzzle | `PuzzleQuestion.itemImages` (uma por posição, alinhada a `items`) | sim |
| Resposta preenchida | `isFilledChoice`, `isFilledSlot` (texto ou imagem) | sim |
| Formas do recorte da resposta | `ANSWER_CROP_SHAPES` (`landscape`, `portrait`, `square`) | sim |
| Qual resposta | `AnswerRef` (`{ choiceId }` no Quiz, `{ slot }` no Puzzle) | sim |
| Imagem da resposta na partida | `GameChoice.image` | sim |

## Domínio

### Quiz — `quiz/domain/answer-image.ts` (novo)

```ts
export const ANSWER_CROP_SHAPES = ["landscape", "portrait", "square"] as const;

/** An answer shown as an image instead of text (spec 049, RN-01, RN-04). */
export interface AnswerImage {
	key: string;
	/** Never a circle (RN-11); null shows the whole image. */
	crop: ImageCrop | null;
	altText: string | null;
}
```

- `newAnswerImage(key)` cria sem recorte e sem texto alternativo.
- `parseAnswerCrop(input)` reaproveita `parseImageCrop` da spec 007 e recusa o círculo (`InvalidQuestionImageError`).
- `parseImageAltText` vem da spec 007.
- `readAnswerImage(raw)` é a leitura tolerante: sem chave, a resposta não tem imagem; recorte inválido vira sem recorte.
- `copyAnswerImage` faz a cópia profunda.

### Quiz — `question.ts`

- `Choice` ganha `image: AnswerImage | null`; `PuzzleQuestion` ganha `itemImages: (AnswerImage | null)[]`, sempre com 4 posições.
- `emptyChoices` e `blankContent` começam sem imagens.
- **Preenchida**: `isFilledChoice(choice)` é `text !== null || image !== null`, e `isFilledSlot(question, slot)` é o mesmo no Puzzle. Elas substituem os `text !== null` que hoje decidem preenchimento:
  - `questionIssues` / `missingAnswerHints`, para contar as respostas (RN-02);
  - a regra de que uma resposta vazia não é correta;
  - `parseQuizContent`;
  - o `choicesOf` da partida.
- Leitura: `parseQuizContent` e `parseStoredPuzzle` leem as imagens com `readAnswerImage`. Uma resposta gravada com texto **e** imagem fica com a imagem e perde o texto, para a regra nunca quebrar.
- `questionContent` e `copyQuestion` copiam as imagens (RN-18).

### Quiz — `question-change.ts`

- Mudanças novas, que apontam a resposta por `AnswerRef` (`{ choiceId }` no Quiz, `{ slot }` no Puzzle):
  - `{ kind: "answerImage"; answer: AnswerRef; key: string | null }`:
    - com chave, põe a imagem nova, **apaga o texto e a formatação** e mantém a marca de correta (RN-07);
    - com `null`, remove a imagem, os ajustes e a marca de correta (RN-13).
  - `{ kind: "answerImageCrop"; answer; crop }` e `{ kind: "answerImageAltText"; answer; altText }`. Numa resposta sem imagem, elas dão `AnswerHasNoImageError`.
- `choiceText` e `puzzleItemText` numa resposta com imagem dão `AnswerHasImageError` (o editor nunca manda; um agente pode).
- `movePuzzleItem` move texto, formatação e imagem juntos (RN-15).
- `setExtraChoices` descarta as imagens das respostas 5 e 6.
- Nas respostas lembradas da troca de tipo, `QuestionContentInput` aceita `image` nas alternativas e `itemImages` no Puzzle; `parseQuizInput` e `parsePuzzleItems` recusam texto e imagem juntos (RN-18).
- Rascunhos e patches dos agentes (`question-draft.ts`, `question-patch.ts`):
  - as alternativas aceitam `image` e o Puzzle aceita `itemImages`;
  - uma lista enviada substitui a anterior inteira, imagens incluídas;
  - texto e imagem juntos dão `AnswerTextAndImageError` (RN-27).
- `quiz-version.ts`: `sameQuestionLists` compara as imagens das respostas (chave, recorte, texto alternativo) (RN-17).
- `accept-generated.ts`: nunca cria imagens (RN-21).

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `AnswerHasImageError` | `QUIZ.ANSWER_HAS_IMAGE` | Texto mandado para uma resposta em imagem. |
| `AnswerHasNoImageError` | `QUIZ.ANSWER_HAS_NO_IMAGE` | Recorte ou texto alternativo de uma resposta sem imagem. |
| `AnswerTextAndImageError` | `QUIZ.ANSWER_TEXT_AND_IMAGE` | Uma resposta com texto e imagem juntos, de um agente ou no conteúdo lembrado (RN-01, RN-27). |
| `InvalidQuestionImageError` (existente) | `QUIZ.INVALID_IMAGE` | Arquivo que não existe ou não é do dono; recorte em círculo (RN-03, RN-11). |

### Game — `game/domain`

- `GameChoice.text` passa a `string | null` (null numa resposta em imagem), e entra `image: GameAnswerImage | null` (`key`, `crop`, `altText`).
  - `choicesOf` copia as respostas preenchidas, de texto ou de imagem.
  - `parseStoredGameQuestion` lê a imagem com tolerância, e as partidas antigas ficam como estão.
  - Verdadeiro ou falso continua com texto.
- **Puzzle** (`puzzle.ts`): `puzzleTexts`/`isRightOrder` passam a comparar uma **identidade da resposta**: o texto, ou a chave `image:{id}` para uma imagem. Assim duas imagens nunca são iguais (RN-16), e as respostas de texto continuam como antes.
- `PublicStage.question.choices[]` ganha `image: { url, crop, altText } | null`, só quando os textos vão aos celulares (`answersShown`), como o texto (RN-23). `publicStageOf` já recebe `imageUrlOf`.
- `HostChoiceView` e `PlayChoiceView` ganham `image` com o endereço público (RN-22).

### Reports — `reports/domain` e `application`

- As alternativas do relatório já são `GameChoice`.
- As visões (`ChoiceView`, alternativas do detalhe da pergunta, `OrderedAnswer` do Puzzle) ganham `image: { url, crop, altText } | null`. O endereço é montado só enquanto `header.quiz` não é nulo, como a imagem da pergunta; depois disso, a visão leva só o texto alternativo.
- `puzzle-orders.ts` agrupa as ordens pela identidade das respostas (texto ou `image:{id}`), e não pelo texto, que é nulo numa imagem.

## Aplicação

| Caso de uso | O que muda |
| --- | --- |
| `updateQuestion` | Em `answerImage` com chave, `assertUsableImage(storage, key, ownerId)`, como em `image` (RN-03). Depois de gravar, `releaseUnusedImages` já cobre a imagem removida ou trocada, porque `imageKeysOf` passa a incluir as respostas (RN-19). |
| `question-images.ts` | `imageKeysOf` passa a incluir `choice.image.key` e `itemImages[i].key`. `assertUsableImages` (agentes) vale para elas. |
| `copyQuizContent` | Troca as chaves das imagens das respostas pelas copiadas, com a mesma função que troca a da pergunta (RN-18). |
| `getSharedQuiz` | Monta `imageUrls` com `imageKeysOf`, no lugar do laço próprio. |
| `getQuizEditor`, `getQuizPreview`, `getPublicQuiz`, `deleteQuizPermanently`, `discardQuizChanges`, `duplicate*` | Passam por `imageKeysOf`/`copyQuestion`/`sameQuestionLists`; só os testes. |
| `startGame`, `createAssignment` | Copiam por `toGameQuestion` (RN-20). |
| `getHostGame`, `getPlayerSession`, `assignmentPlay*`, `getReportQuestion`, `getReportParticipant` | As visões levam a imagem com o endereço. |

Nenhuma porta nova.

## Adapters

### Banco — `packages/db`

- Sem coluna nova e sem migration.
- `drizzle-media-uploads.ts` (`isMediaInUse`) passa a procurar a chave também no `content` da pergunta viva (`strpos(question.content::text, quoted)`), porque a imagem de uma resposta não está na coluna `image`. O `quiz_version.questions` já é procurado como texto, e a cópia da partida não conta para a varredura, como hoje.
- Testes de ida e volta no repositório das perguntas, das versões e do relatório.

### Real-time

| Canal | Evento | Payload | Publicado por | Assinado por |
| --- | --- | --- | --- | --- |
| `game-{gameId}` | `stage-changed` (existente) | `choices[].image` (endereço, recorte, texto alternativo) só com os textos nos celulares | `publishToGame` | `JoinFlow` |

Seis imagens acrescentam cerca de 1,5 KB; o pior caso da spec 048 continua abaixo dos 10 KB (teste do palco).

### Storage

Nada novo: as imagens vão para `media/{ownerId}/` pelo `media.requestUpload` e entram em `media_upload` com `recordMediaUpload`.

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros |
| --- | --- | --- | --- | --- | --- |
| `quiz.questions.update` (existente) | mutation | sessão | `answerImage`, `answerImageCrop`, `answerImageAltText` com `answer: { choiceId } \| { slot }`; o `content` lembrado com `image`/`itemImages` | a pergunta | `QUIZ.INVALID_IMAGE`, `QUIZ.ANSWER_HAS_IMAGE`, `QUIZ.ANSWER_HAS_NO_IMAGE`, `QUIZ.ANSWER_TEXT_AND_IMAGE` |

- A forma do recorte e do texto alternativo reaproveita as entradas da imagem da pergunta (`imageCropInput`, o texto até 10 000 caracteres, com o limite de 1000 no core).
- Nenhuma ligação nova em `container.ts`.

## MCP — `packages/mcp`

- `schemas/question-input.ts`:
  - `choices[]` ganha `image` opcional, com a mesma forma de `image` da pergunta (um envio ou `{ url }`, `crop`, `altText`, sem `placement`);
  - `items[]` aceita, além do texto, `{ image }`.
  - `toQuestionDraft`/`toQuestionPatch` resolvem cada imagem por `imageDraft` (envio conferido ou `importRemoteFile` para o link) e montam `image`/`itemImages`.
  - Texto e imagem juntos dão `ToolInputError` antes de chegar ao core (RN-27).
- Saídas (`questionOutput`, `get_others_quiz`, `get_report_detail`): uma resposta em imagem sai como `{ text: null, image: { url, crop, altText } }` (RN-26).
- `instructions.ts`: uma linha sobre as respostas em imagem.

## UI — `apps/web`

### Desenhar a imagem — `components/quiz/answer-image.tsx` (novo)

`AnswerImage({ url, crop, altText, label, className })` desenha a imagem com `lib/image-crop.ts` (a mesma matemática da spec 007), inteira quando não há recorte, numa moldura de altura dada pelo `className`, com faixas da cor do fundo onde a imagem não preenche. O nome para leitores de tela é o texto alternativo, ou o `label` ("Imagem da resposta N") (RN-25).

### Editor

- `FormattingToolbar` ganha `onImage?`: com ele, o primeiro botão é a imagem, com a dica "Adicione imagem como resposta alternativa", e uma linha antes de B (RN-05).
- **`ChoiceField`** e o campo do **Puzzle**:
  - **sem imagem**: o `FormattedTextField` de hoje, com `onImage`, e o ícone de imagem à direita enquanto a resposta está vazia;
  - **com imagem**: `AnswerImageField` (novo, `components/editor/answer-image-field.tsx`), que mostra a imagem, as ações "Detalhes da mídia", "Recortar imagem" e "Remover" ao passar o ponteiro ou com o foco (RN-10), e o progresso do envio (RN-08).
- Os diálogos são os da spec 007:
  - `UploadImageDialog`;
  - `CropImageDialog`, com uma prop `shapes` para ficar sem o Círculo (RN-11);
  - `MediaDetailsDialog`.
- Envio: `quiz-editor.tsx` ganha `uploadAnswerImage(questionId, answer, file)`, no molde do `uploadImage` da pergunta. Ele pede `media.requestUpload`, envia com `uploadFile` e manda `answerImage`. O envio fica guardado no rastreador de envios que Sair e Salvar esperam, com a chave da resposta, e a imagem vai para a pergunta e a resposta em que o envio começou (RN-08).
- `lib/question-mutations.ts`: `changeKey` das mudanças novas por resposta. `lib/editor-cache.ts`/`imageUrlOf` já resolvem a URL, porque o `imageUrls` do editor vem de `imageKeysOf`.
- O bloco do Puzzle que segue o ponteiro (`DraggedAnswer`) mostra a imagem.

### Partida, atividade, páginas e relatórios

- **Tela do anfitrião**:
  - `stage-choices.tsx`: a imagem depois da forma, com a altura inteira do bloco (RN-22);
  - `puzzle-block.tsx`: a imagem no lugar do texto.
- **Celular**:
  - `answer-buttons.tsx`: com imagem, o botão mostra a imagem centralizada, sem a forma (RN-23);
  - `puzzle-answer-input.tsx`: pelo `PuzzleBlock`.
- **Atividade**: `play-question.tsx` passa a imagem adiante, e `play-result.tsx` mostra a miniatura.
- **Páginas do quiz e relatórios**: `quiz-question-preview.tsx`, `shared-question-list.tsx`, `report-parts.tsx` (`ChoiceChip`), `question-detail.tsx` (ordens) e `participant-detail.tsx` mostram a miniatura (RN-24).
- Os tipos locais aceitam `image` ausente, para um palco publicado por um servidor anterior durante o deploy.

## Estratégia de testes

| CA | Teste | Camada |
| --- | --- | --- |
| CA-01 | `choice-field.test.tsx`: "an empty answer shows the image icon, a written one does not", "the toolbar's first button is the image, with its tip"; `formatting-toolbar.test.tsx` | componente |
| CA-02 | `question-change.test.ts`: "answerImage puts the image and the answer counts as filled"; `update-question.test.ts`: "refuses a key that is not an upload of the owner"; `question-issues.test.ts`; `drizzle-question-repository.test.ts`: "round-trips answer images in content"; E2E (enviar, recarregar) | domínio, aplicação, repositório, E2E |
| CA-03 | `question-change.test.ts`: "an image replaces the text and its formatting, and keeps the correct mark", "removing it leaves an empty answer, not correct" | domínio |
| CA-04 | `answer-image-field.test.tsx` / `choice-field.test.tsx`: "a refused file shows the media policy message", "a failed upload leaves the answer as it was" | componente |
| CA-05 | `quiz-editor.test.tsx`: "an answer image goes to the answer the upload started in", "Salvar waits for the answer upload" | componente |
| CA-06 | `answer-image-field.test.tsx`: "shows the three actions" | componente |
| CA-07 | `answer-image.test.ts` (domínio): "a circle crop is refused"; `crop-image-dialog.test.tsx`: "offers only the shapes it is given"; `question-change.test.ts`: "answerImageCrop saves the crop"; E2E | domínio, componente, E2E |
| CA-08 | `question-change.test.ts`: "answerImageAltText saves up to 1000 characters"; `answer-image.test.tsx` (web): "is named by its alt text, or Imagem da resposta N" | domínio, componente |
| CA-09 | `question-issues.test.ts`: "a quiz of image answers is complete"; `publish-quiz.test.ts` | domínio, aplicação |
| CA-10 | `question-change.test.ts`: "puzzleItemMoved carries the image"; `puzzle-answers.test.tsx`: "an image slot shows the image and the handle" | domínio, componente |
| CA-11 | `puzzle.test.ts`: "two image answers are never the same answer" | domínio |
| CA-12 | `quiz-version.test.ts`: "an answer image change makes the lists differ"; `discard-quiz-changes.test.ts`; `duplicate-question.test.ts`, `duplicate-quiz.test.ts` ("copies the answer image files"), `duplicate-shared-quiz.test.ts`; `question-change.test.ts`: "remembered content brings the images back" | domínio, aplicação |
| CA-13 | `host-game-view.test.ts`: "the host's choices carry the image"; `host-stage.test.tsx`: "draws the answer images, cropped" | aplicação, componente |
| CA-14 | `public-stage.test.ts`: "the image goes only with the texts and never in the intro"; `answer-buttons.test.tsx`: "an image answer button shows the image without the shape" | domínio, componente |
| CA-15 | `puzzle-block.test.tsx` / `puzzle-results.test.tsx`: "draws the image" | componente |
| CA-16 | `start-game.test.ts`, `create-assignment.test.ts`: "a later edit of an answer image does not reach the copy"; `game-question.test.ts`: "reads a stored choice with an image, and an old one without" | aplicação, domínio |
| CA-17 | `assignment-play-view.test.ts`; `play-question.test.tsx`, `play-result.test.tsx` | aplicação, componente |
| CA-18 | `get-report-question.test.ts`, `get-report-participant.test.ts`, `puzzle-orders.test.ts`; `report-details.test.tsx`; `quiz-question-preview.test.tsx`, `shared-quiz-page.test.tsx` | aplicação, domínio, componente |
| CA-19 | `question-images.test.ts`: "imageKeysOf includes the answers", "releaseUnusedImages deletes an answer image no version uses and keeps one a version uses"; `drizzle-media-uploads.test.ts`: "an answer image in content is in use" | aplicação, repositório |
| CA-20 | `tools/questions.test.ts`: "add_questions puts an image answer from a link", "an answer with text and image is refused"; `tools/quizzes.test.ts`: "get_quiz returns image answers"; `routers/quiz-questions.test.ts` (as formas novas e os códigos) | adapter (mcp), API |

E2E `apps/web/e2e/answer-images.spec.ts` (desktop e mobile):

- **Editor:** ícone, barra, envio, recorte em Quadrado, texto alternativo, remover devolvendo o campo, Puzzle com ↑.
- **Partida:** telão com as imagens e celular com e sem "perguntas nos dispositivos".

## Dados e migração

- Nenhuma migration. O que está gravado não tem imagens nas respostas.
- O código anterior lê o `content` ignorando os campos novos. Se ele regravar uma pergunta durante o deploy, as imagens das respostas se perdem naquela gravação, como a formatação na spec 048. Os arquivos ficam com a varredura.

## Riscos e decisões

- **Sem ADR nova**: a imagem da resposta é a imagem da pergunta (spec 007) num lugar novo, guardada como a formatação das respostas (spec 048). A ADR 0003 (storage) e o padrão de chaves não mudam.
- **Terceira lista paralela no Puzzle** (`itemImages`): o mesmo trade-off da spec 048. Só as funções do core que já escrevem as outras duas escrevem a terceira, e os testes conferem o alinhamento. Se houver uma quarta, vale trocar as listas por objetos.
- **`GameChoice.text` nulo**: muda um tipo usado pela partida, pelos relatórios e pelo web. O typecheck aponta cada lugar, e a comparação do Puzzle e o agrupamento das ordens passam a usar a identidade da resposta.
- **"Preenchida" espalhada**: hoje vários lugares testam `text !== null`. Todos passam por `isFilledChoice`/`isFilledSlot`, e uma busca no fim da implementação confere que não sobrou nenhum.
- **Varredura de envios**: sem procurar no `content`, a varredura de 24 h apagaria a imagem de uma resposta. O teste do adapter cobre esse caso.

## Ajustes durante a implementação

- **Troca de tipo não libera arquivos**: `updateQuestion` não chama `releaseUnusedImages` numa mudança `type`, porque o editor guarda as respostas do outro tipo na sessão e pode trazê-las de volta com as imagens; um arquivo que ninguém trouxe de volta fica para a varredura de órfãos (ADR 0003). Toda chave que uma mudança traz (a da imagem, a da resposta, as do conteúdo lembrado) passa por `assertUsableImage`, comparando as chaves da pergunta antes e depois.
- **Agentes**: o Puzzle recebe as imagens numa lista paralela `itemImages` (como `itemFormatting`), e não dentro de `items`; a leitura devolve `itemImages` e, no Quiz, `choices[].image` com `{ key, url, crop, altText }`.
- **Identidade no Puzzle**: duas respostas com o mesmo arquivo são a mesma resposta, como dois textos iguais (`answerIdentity` no jogo, `identityOf` nos relatórios).
- **Relatórios**: `ReportAnswerImage` traz `url: null` quando o quiz já não existe (`withoutAddress`), e a tela mostra um ícone com o texto alternativo.
- **Envio**: um único `UploadImageDialog` no editor, aberto pela resposta (`AnswerImageActions.pick`), guarda a resposta de onde saiu; `uploadAnswerImage` e `uploadQuestionImage` compartilham o mesmo envio em `question-mutations.ts`.

