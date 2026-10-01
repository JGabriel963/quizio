---
spec: "007"
status: approved # draft | approved
---

# Plano técnico — 007 Editor 5/5: Imagem na pergunta

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0003](../../../docs/adr/0003-storage-r2.md), [0008](../../../docs/adr/0008-modelo-de-perguntas.md)

## Abordagem

A imagem vira um atributo da pergunta, comum a todos os tipos: `image: QuestionImage | null`, com a **chave** do arquivo, a posição, o recorte e o texto alternativo. Ela entra no que toda pergunta compartilha (ADR 0008), então acompanha a troca de tipo, a cópia e o snapshot da versão jogável sem regra extra. As quatro edições são novos `QuestionChange`s, aplicados pelo mesmo `applyQuestionChange` puro no servidor e, de forma otimista, no cliente; passam pela mesma fila de escrita do editor.

O envio reaproveita o que a capa já usa: `media.requestUpload` valida formato e tamanho e devolve uma URL pré-assinada; o navegador envia direto ao storage; depois o editor manda a mudança `image` com a chave. O servidor confere que a chave é do dono e que o arquivo existe.

O recorte é guardado como **parâmetros** (forma, zoom, posição em frações), não como um arquivo novo. Ele não depende das dimensões da imagem e é desenhado só com CSS, então a mesma regra serve ao editor, às miniaturas e, na spec 008, à partida.

**Ciclo de vida dos arquivos.** Os arquivos de imagem pertencem ao quiz. Um arquivo só é apagado quando nenhuma pergunta viva e nenhuma versão guardada do quiz o referencia; a exclusão definitiva apaga todos. Duplicar uma pergunta compartilha a chave dentro do quiz; duplicar um quiz copia os arquivos para chaves novas.

**Troca de provedor de storage.** Nada nesta feature conhece o R2. O core fala só com a porta `ObjectStorage`; o banco guarda **chaves**, nunca URLs; as URLs são montadas por `getPublicUrl` na leitura; o navegador recebe método, URL e cabeçalhos prontos e não sabe quem é o provedor. Trocar para S3, GCS/Firebase ou outro é: um adapter novo que implemente a porta (ou só configuração, se falar S3), uma linha na composition root e copiar os objetos com as mesmas chaves. Isso passa a ficar escrito no ADR 0003.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Imagem da pergunta | `QuestionImage` | sim |
| Posição da imagem | `ImagePlacement` (`media` \| `background`) | sim |
| Recorte | `ImageCrop`, `CropShape` (`landscape` \| `portrait` \| `square` \| `circle`) | sim |
| Texto alternativo | `altText` | sim |
| Imagens em uso | `imageKeysOf`, `releaseUnusedImages` | sim |

## Domínio — `packages/core/src/quiz/domain`

### Agregados e entidades

**`Question`** (`question.ts`): `QuestionBase` ganha `image: QuestionImage | null` (RN-01). `blankQuestion` nasce com `null`; `copyQuestion` copia a imagem em profundidade (RN-33); `isBlankQuestion` é falso quando há imagem; a troca de tipo carrega a imagem (RN-34).

### Value objects

**`QuestionImage`** (`question-image.ts`, novo):

```ts
export const IMAGE_PLACEMENTS = ["media", "background"] as const;
export const CROP_SHAPES = ["landscape", "portrait", "square", "circle"] as const;
export const CROP_MAX_ZOOM = 3;
export const IMAGE_ALT_TEXT_MAX_LENGTH = 1000;

export interface ImageCrop {
	shape: CropShape;
	/** 1 = the frame takes as much of the image as it can; up to CROP_MAX_ZOOM. */
	zoom: number;
	/** Where the frame sits along its free travel, 0 to 1; 0.5 is centered. */
	x: number;
	y: number;
}

export interface QuestionImage {
	key: string;
	placement: ImagePlacement;
	crop: ImageCrop | null;
	altText: string | null;
}
```

- `newQuestionImage(key)`: ao centro, sem recorte, sem texto (RN-13).
- `parseImagePlacement`, `parseImageCrop` (forma conhecida, zoom em [1, 3], x e y em [0, 1], números finitos), `parseImageAltText` (apara, vazio vira `null`, até 1000 caracteres percebidos — RN-29).
- `cropAspectRatio(shape)`: 3/2, 2/3, 1, 1 (RN-18).
- `sameImage(a, b)`: compara chave, posição, recorte e texto, para `sameQuestionLists` (RN-35).
- `parseStoredImage(raw)`: leitura tolerante do JSON guardado; malformado vira `null`.

**`QuestionChange`** (`question-change.ts`) ganha:

| `kind` | Campos | Regra |
| --- | --- | --- |
| `image` | `key: string \| null` | coloca uma imagem nova (RN-13) ou remove com os ajustes (RN-16) |
| `imagePlacement` | `placement: string` | RN-23; mantém o recorte (RN-24) |
| `imageCrop` | `crop: { shape, zoom, x, y }` | RN-18 a RN-22 |
| `imageAltText` | `altText: string \| null` | RN-28 a RN-30 |

As três últimas exigem que a pergunta tenha imagem.

**`quiz-version.ts`**: `sameQuestionLists` passa a comparar a imagem; `parseVersionQuestions` lê `image` com `parseStoredImage`.

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `InvalidQuestionImageError` | `QUIZ.INVALID_IMAGE` | chave que não é do dono ou arquivo que não existe (RN-03) |
| `QuestionHasNoImageError` | `QUIZ.NO_IMAGE` | ajuste numa pergunta sem imagem |
| `InvalidImagePlacementError` | `QUIZ.INVALID_IMAGE_PLACEMENT` | posição desconhecida |
| `InvalidImageCropError` | `QUIZ.INVALID_IMAGE_CROP` | forma desconhecida, zoom ou posição fora do intervalo |
| `ImageAltTextTooLongError` | `QUIZ.IMAGE_ALT_TEXT_TOO_LONG` | mais de 1000 caracteres |

## Aplicação — `packages/core/src/quiz/application`

### Casos de uso

Nenhum caso de uso novo; os existentes mudam:

| Caso de uso | Mudança | Portas |
| --- | --- | --- |
| `updateQuestion` | mudança `image` com chave: `assertUsableImage`; depois de gravar, libera a imagem que saiu | + `storage` (`exists`, `delete`), `versions.listByQuiz` |
| `deleteQuestion` | libera a imagem da pergunta excluída | + `storage.delete`, `versions.listByQuiz` |
| `discardQuizChanges` | libera as imagens que só o rascunho descartado usava (RN-36) | + `storage.delete`, `versions.listByQuiz` |
| `duplicateQuiz` | copia cada arquivo distinto para uma chave nova do mesmo dono (RN-33) | já tem `storage` |
| `deleteQuizPermanently` | apaga as imagens das perguntas vivas e de todas as versões antes das linhas (RN-37) | + `questions.listByQuiz`, `versions.listByQuiz` |
| `getQuizEditor`, `discardQuizChanges` | a visão do editor ganha `imageUrls` | — |

`question-images.ts` (novo), compartilhado:

- `assertUsableImage(storage, key, ownerId)`: como `assertUsableCover`.
- `imageKeysOf(questions)`: chaves distintas.
- `releaseUnusedImages(deps, quizId, before, after)`: para cada chave de `before` que não está em `after`, apaga o arquivo se nenhuma versão guardada a usa. É executado depois de gravar e é **melhor esforço**: uma falha ao apagar não desfaz a edição (sobra um órfão, como os envios abandonados do ADR 0003).

`QuizEditorView` ganha `imageUrls: Record<string, string>`: a URL pública de cada chave usada pelas perguntas vivas e pelas publicadas. `QuestionView` continua igual a `Question`, então a aplicação otimista no cliente não muda de tipo.

### Portas novas ou alteradas

```ts
export interface QuizVersionRepository {
	// ...
	/** Every stored version of the quiz, oldest first. */
	listByQuiz(quizId: string): Promise<QuizVersion[]>;
}
```

`ObjectStorage` **não muda**.

## Adapters

### Banco — `packages/db`

- `schema/quiz.ts`: coluna `image jsonb` (nula) em `question`, lida por `parseStoredImage`. A tabela `quiz_version` não muda: o snapshot já guarda a pergunta inteira.
- `drizzle-question-repository.ts`: lê e grava `image` (inclusive no `onConflictDoUpdate` do `saveList`).
- `drizzle-quiz-version-repository.ts`: `listByQuiz`.

### Real-time

Nenhum.

### Storage / outros

`packages/storage` não muda. `docs/adr/0003-storage-r2.md` ganha a seção "Trocar de provedor" com os passos e as garantias acima.

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `quiz.questions.update` | mutation | sessão | `change` aceita os quatro `kind` novos | pergunta + aviso | `QUIZ.INVALID_IMAGE`, `QUIZ.NO_IMAGE`, `QUIZ.INVALID_IMAGE_*`, `QUIZ.IMAGE_ALT_TEXT_TOO_LONG` |
| `quiz.editor`, `quiz.discardChanges` | — | sessão | — | + `imageUrls` | — |
| `media.requestUpload` | mutation | sessão | sem mudança | sem mudança | `MEDIA.*` |

Ligações em `container.ts`: `storage` e `versions` nos casos de uso que mudaram. `composition-root.ts` não muda.

## UI — `apps/web` e `packages/ui`

Sem primitivo novo em `packages/ui`: o zoom é um `<input type="range">` estilizado no app.

**`lib/`**

- `image-crop.ts` (puro): proporção por forma; `croppedImageStyle(crop)` — `object-fit: cover`, `object-position` e `transform: scale` com a mesma origem, o que reproduz "fração do percurso" sem conhecer as dimensões; `dragCrop(crop, delta, image, frame)` e `clampCrop` para o diálogo.
- `question-image-upload.ts`: `pickImageFile(files)` (primeira imagem aceita, RN-10) e a mensagem de recusa, com as constantes de `media-policy` do core (RN-09).
- `background-notice.ts`: lê e grava "não mostrar novamente" no `localStorage`, com `try/catch` (RN-26).
- `question-mutations.ts`: `uploadQuestionImage(questionId, file, onProgress)` — pede a URL, envia, guarda a URL em `imageUrls` do cache e enfileira a mudança `image`. O envio é registrado no `SaveTracker`, então o cabeçalho mostra "Salvando" e `flush()` (Sair, Salvar) espera por ele (RN-12).
- `editor-cache.ts`: `withImageUrl(data, key, url)`.
- `quiz-error-messages.ts`: os códigos novos.

**`components/editor/`**

- `question-image.tsx` — desenha a imagem com o recorte (ou inteira, `object-contain`); usada na área de mídia, na miniatura da lista e no diálogo de incompletas (RN-14, RN-32).
- `question-media.tsx` — a área de mídia: vazia (RN-06, com arrastar e "Carregar arquivo"), enviando (RN-11), com imagem e a fileira de ações (RN-15), e o modo fundo (RN-23). Substitui o bloco "Em breve" do `question-canvas.tsx`.
- `upload-image-dialog.tsx` — "Carregar imagem": zona de soltar, colar e botão (RN-07, RN-08).
- `crop-image-dialog.tsx` — "Recortar imagem": formas, moldura, arrastar, zoom (RN-18 a RN-21).
- `media-details-dialog.tsx` — texto alternativo (RN-28 a RN-30).
- `background-notice-dialog.tsx` — aviso do fundo (RN-25).
- `quiz-editor.tsx` — estado dos envios por pergunta (o envio pertence à pergunta em que começou), diálogos, e o fundo cobrindo a área central.
- `question-list.tsx`, `incomplete-questions-dialog.tsx` — miniatura com a imagem.

Estados: vazio, arrastando por cima, enviando, com imagem, recusado (mensagem `role="alert"` junto à área), falha de envio.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-13, CA-14, CA-15, CA-36 | domínio | imagem em qualquer tipo; não muda as pendências; troca de tipo mantém | `core/quiz/domain/question-change.test.ts`, `question-issues.test.ts` |
| CA-17, CA-28 | domínio | remover leva os ajustes; posição mantém o recorte | `question-change.test.ts` |
| CA-20 a CA-25 | domínio + lib | validação do recorte; estilo e arrasto | `question-image.test.ts`, `web/lib/image-crop.test.ts` |
| CA-31, CA-32 | domínio | limite e vazio do texto alternativo | `question-image.test.ts` |
| CA-37 | domínio | `sameQuestionLists` vê imagem, posição, recorte e texto | `quiz-version.test.ts` |
| CA-16 | aplicação | chave de outro dono ou inexistente é recusada | `update-question.test.ts` |
| CA-17, CA-38, CA-39 | aplicação | arquivo liberado só quando ninguém usa; descartar devolve; versão mantém | `update-question.test.ts`, `discard-quiz-changes.test.ts`, `publish-quiz.test.ts` |
| CA-34 | aplicação | duplicar pergunta e remover da cópia mantém o arquivo | `duplicate-question.test.ts`, `update-question.test.ts` |
| CA-35 | aplicação | duplicar quiz copia os arquivos | `duplicate-quiz.test.ts` |
| CA-40 | aplicação | exclusão definitiva apaga as imagens vivas e das versões | `delete-quiz-permanently.test.ts` |
| CA-02, CA-20, CA-39 | adapter | coluna `image`; `listByQuiz` das versões | `db/.../drizzle-question-repository.test.ts`, `drizzle-quiz-version-repository.test.ts` |
| CA-02, CA-16 | API | `update` com os `kind` novos; `editor` devolve `imageUrls` | `api/routers/quiz.test.ts` |
| CA-01, CA-03, CA-07 a CA-10, CA-18 | componente | área vazia, soltar, recusas, falha, não aceita soltar com imagem | `question-media.test.tsx`, `question-image-upload.test.ts` |
| CA-04 a CA-06 | componente | diálogo de envio: escolher, colar, fechar | `upload-image-dialog.test.tsx` |
| CA-19, CA-21, CA-23, CA-24 | componente | diálogo de recorte | `crop-image-dialog.test.tsx` |
| CA-26, CA-27, CA-29 | componente | modo fundo e aviso | `question-media.test.tsx`, `background-notice-dialog.test.tsx` |
| CA-30 a CA-32 | componente | detalhes da mídia | `media-details-dialog.test.tsx` |
| CA-11, CA-12, CA-33 | componente | envio fica na pergunta de origem; miniatura | `quiz-editor.test.tsx`, `question-list.test.tsx` |
| CA-02, CA-20, CA-26, CA-30, CA-37, CA-38, CA-41 | E2E | enviar, recarregar, recortar, fundo, texto, alteração não salva e descartar; desktop e celular | `apps/web/e2e/editor-image.spec.ts` |

## Dados e migração

`pnpm -F @quizio/db db:push` (coluna `question.image`, nula). Sem backfill: perguntas e versões antigas leem `image` como `null`.

## Riscos e decisões

- **Liberação de arquivos é melhor esforço.** Uma falha do storage ao apagar deixa um órfão, sem afetar o quiz. A rotina de limpeza de órfãos continua pendente (ADR 0003).
- **Imagens de versões antigas ficam guardadas** até a exclusão definitiva do quiz, porque partidas e relatórios (spec 008 em diante) podem apontar para elas. Custa armazenamento, não correção.
- **Duplicar um quiz com muitas imagens** faz uma cópia por arquivo no storage, em paralelo. Aceitável para quizzes pessoais.
- **Recorte por CSS** depende de `object-fit` e `transform`, suportados em todos os navegadores-alvo; em troca, não há processamento de imagem no servidor nem arquivo derivado, e o GIF continua animado.
- **Sem ADR novo**: a decisão de storage é a do ADR 0003, que ganha a seção de troca de provedor; o modelo da pergunta segue o ADR 0008, com nota sobre a imagem.
