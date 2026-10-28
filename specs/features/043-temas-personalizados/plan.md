---
spec: "043"
status: approved # draft | approved
---

# Plano técnico — 043 Temas personalizados

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADRs: [0021](../../../docs/adr/0021-temas-catalogo-proprio.md), [0022](../../../docs/adr/0022-temas-personalizados.md) 

## Abordagem

O tema pronto é um ID; o tema personalizado é um **registro do criador**. Ele fica numa tabela própria (`custom_theme`), num contexto novo do core, **`themes`**, com o agregado `CustomTheme` e os casos de uso de criar, editar, excluir e listar.

**O quiz aponta para o tema por uma coluna nova**, `quiz.custom_theme_id`, uma chave estrangeira com `ON DELETE SET NULL`. A ADR 0021 previa outro formato de ID no mesmo `theme_id`, e a ADR 0022 revê isso: com a chave estrangeira, o banco cumpre sozinho a RN-19. Excluir o tema zera a coluna, e o quiz volta ao `theme_id`, que vale `standard` sempre que há um tema personalizado escolhido. Assim ninguém guarda um ID solto de um tema que não existe mais.

**A partida não pode apontar para o tema**, porque editar e excluir não a alcançam (RN-18, RN-24). Por isso ela **copia a aparência** na criação: `game.custom_theme`, um `jsonb` com o padrão, as cores, a chave da imagem e o seu tom, e a chave do logotipo. Esse valor, `ThemeLook`, fica no **shared kernel**, porque `themes` o produz, `game` o guarda e as visões o desenham. Nenhum contexto importa o outro: o `PlayableQuizQuery` já junta o quiz com o que a partida copia, e passa a juntar também o tema.

**O contraste vai para o core.** A RN-11 obriga o servidor a recusar uma cor ilegível, então a matemática do WCAG (`relativeLuminance`, `contrastRatio`, `readableTextOn`), que hoje está só em `apps/web/src/lib/contrast.ts`, muda para `shared/domain/contrast.ts`. A web reexporta e continua igual. O tom de uma imagem de fundo (RN-12) é medido **no navegador**, num canvas, ao enviar. O servidor não processa imagens (spec 007), e um tom errado só deixa a faixa no tom contrário, ainda legível.

**Arquivos**: logotipo e fundo vão para `themes/{ownerId}/`. O envio segue o padrão dos grupos (spec 036):
- `theme.requestUpload` assina o PUT e grava uma linha `theme_upload`.
- Salvar o tema **consome** a linha na mesma transação, e Cancelar a descarta.
- Cada pedido de envio varre as linhas com mais de 24 h (RN-29).

Um arquivo que sai do tema é apagado só se **nenhuma partida** o copiou: o porto `ThemeFileUsage` pergunta isso ao `game.custom_theme` (RN-28).

**As visões ganham um campo, sem perder nenhum**: onde hoje vai `themeId`, vai também `customTheme: ThemeLookView | null`, com as URLs públicas já montadas. Só as visões do anfitrião levam a URL do logotipo (RN-26). Na web, o `GameThemeProvider` e o `GameScreen` passam a receber um `ShownTheme` (o ID e, opcionalmente, a aparência). O `themeStyle` escreve as mesmas variáveis CSS da spec 042 a partir da aparência. As telas do anfitrião trocam o nome do Quizio pelo logotipo com um componente só, o `GameBrand`.

## Linguagem ubíqua

| PT | Código | Onde |
| --- | --- | --- |
| Tema personalizado | `CustomTheme` | `themes/domain/custom-theme.ts` |
| Seus temas | `listCustomThemes` | `themes/application` |
| Aparência do tema | `ThemeLook` | `shared/domain/theme-look.ts` (valor copiado pela partida) |
| Padrão de fundo | `BackgroundPatternId` (`BACKGROUND_PATTERN_IDS`) | `shared/domain/theme-look.ts` |
| Cor do fundo / cor de contraste | `backgroundColor` / `accentColor` (`HexColor`) | `shared/domain/theme-look.ts` |
| Tom da imagem | `imageTone` (`ThemeTone`) | `ThemeLook.image.tone` |
| Logotipo do tema | `logoKey` / `logoUrl` | `ThemeLook` / `ThemeLookView` |
| Tema mostrado | `ShownTheme` | `apps/web/src/lib/theme-catalog.ts` |

## Domínio

### Shared kernel

- **`shared/domain/contrast.ts`** (movido da web, sem mudar o comportamento):
  - `LIGHT_TEXT = "#ffffff"` e `DARK_TEXT = "#1f1f1f"`.
  - `relativeLuminance`, `contrastRatio`, `worstContrast` e `readableTextOn`.
  - **Novo:** `isLegibleColor(hex)`, que é verdadeiro quando `max(contrastRatio(hex, LIGHT_TEXT), contrastRatio(hex, DARK_TEXT)) >= 4.5` (RN-11).
  - O `apps/web/src/lib/contrast.ts` passa a reexportar daqui.
- **`shared/domain/theme-look.ts`** (novo):
  - Tipos:
    ```ts
    export const BACKGROUND_PATTERN_IDS = ["waves", "peaks", "rings", "tiles"] as const; // RN-05
    export type BackgroundPatternId = (typeof BACKGROUND_PATTERN_IDS)[number];
    export type HexColor = string; // "#rrggbb", minúsculo

    export interface ThemeLook {
    	background:
    		| { kind: "pattern"; pattern: BackgroundPatternId; color: HexColor }
    		| { kind: "image"; key: string; tone: ThemeTone };
    	accentColor: HexColor;
    	logoKey: string | null;
    }
    ```
  - `ThemeTone` (`dark` | `light`) passa da web para cá.
  - Funções:
    - `parseHexColor(text)`: aceita `#RRGGBB` e guarda em minúsculas.
    - `isBackgroundPatternId`.
    - `themeLookFileKeys(look)`: as chaves de arquivo que a aparência usa.
    - `readThemeLook(json)`: lê o `jsonb` guardado com tolerância. Uma forma que ele não reconhece vira `null`, e a partida aparece com Padrão, como um ID desconhecido na spec 042 (RN-05).
- **`shared/application/theme-look-view.ts`** (novo):
  ```ts
  export interface ThemeLookView {
  	pattern: BackgroundPatternId | null;
  	backgroundColor: HexColor | null;
  	imageUrl: string | null;
  	imageTone: ThemeTone | null;
  	accentColor: HexColor;
  	logoUrl: string | null;
  }
  ```
  - `themeLookView(look, storage, { withLogo })` monta as URLs com `getPublicUrl`. As chaves nunca saem do servidor, e o cliente não monta URL (ADR 0003).
- **`shared/domain/media-key.ts`**: acrescenta `themeFileKeyFor(ownerId, id, ext)`, `isThemeFileKeyOwnedBy(key, ownerId)` e `themesPrefixOf(ownerId)`.

### Themes — `packages/core/src/themes` (contexto novo)

- **`domain/custom-theme.ts`**:
  ```ts
  export interface CustomTheme {
  	id: string;
  	ownerId: string;
  	name: string;          // 1 a 30 caracteres (characterCount), RN-03
  	look: ThemeLook;
  	createdAt: Date;
  	updatedAt: Date;
  }
  ```
  - `parseThemeName`: corta os espaços das pontas e exige de 1 a 30 caracteres.
  - `parseThemeLookInput(input)`: confere o padrão, o formato das cores e se as duas cores são legíveis (`isLegibleColor`) (RN-06, RN-11). Para uma imagem, o tom é obrigatório.
  - `DEFAULT_THEME_NAME = "Meu tema"`. Os valores iniciais do formulário ficam na web (RN-03, RN-05, RN-06).
- **Erros** (estendem `DomainError`):
  - `THEME.NOT_FOUND` (`NotFoundError`): o tema não existe ou é de outro criador (RN-20, RN-21).
  - `THEME.INVALID_NAME`.
  - `THEME.INVALID_COLOR`: formato errado.
  - `THEME.ILLEGIBLE_COLOR`.
  - `THEME.UNKNOWN_PATTERN`.
  - `THEME.UPLOAD_NOT_FOUND`: a chave não é um envio pendente do criador nem um arquivo que o tema já tem.
- **`requireOwnedTheme(theme, ownerId)`**: segue o padrão de `requireOwnedQuiz`.

### Quiz — `quiz/domain/quiz.ts` (alterado)

- `Quiz.customThemeId: string | null`. Invariante: com ele preenchido, `themeId` vale `standard`, e é esse o valor que sobra quando o banco o zera (RN-19).
- `QuizThemeChoice = { kind: "catalog"; themeId: ThemeId } | { kind: "custom"; customThemeId: string }`.
- `copyQuiz(source, { keepCustomTheme })`: duplicar o próprio quiz mantém o tema; o `duplicateSharedQuiz` passa `false` e a cópia sai com `standard` (RN-27).

### Game — `game/domain/game.ts` e `assignment.ts` (alterados)

- `Game.customTheme: ThemeLook | null`, copiado em `newGame` e `newAssignment` do `PlayableQuiz`. Nunca muda depois (RN-24).

## Aplicação

### Casos de uso — `themes/application`

| Caso de uso | Dependências | O que faz |
| --- | --- | --- |
| `createListCustomThemes` | `themes`, `storage` | Lista do criador, do mais recente ao mais antigo, com `ThemeLookView` (com o logotipo) e `quizCount` (RN-16, RN-19). |
| `createRequestThemeUpload` | `storage`, `themeUploads`, `ids`, `clock` | Aplica a política de mídia (RN-07), varre até 20 envios com mais de 24 h (`takeExpiredUploads`, apagando os arquivos) e grava o envio pendente. Devolve a chave e a URL assinada (RN-29). |
| `createDiscardThemeUpload` | `themeUploads`, `storage` | Cancelar ou X: tira o envio pendente do criador e apaga o arquivo (CA-10). |
| `createCreateCustomTheme` | `themes`, `themeUploads`, `storage`, `ids`, `clock` | Valida o nome e a aparência. Cada chave de arquivo precisa ser um envio pendente do criador que existe no storage. Grava o tema e **consome os envios numa transação** (`themes.createTakingUploads`). |
| `createUpdateCustomTheme` | as mesmas + `fileUsage` | `requireOwnedTheme`; uma chave pode ser a que o tema já tem ou um envio pendente. Grava tudo e consome os envios numa transação. Depois apaga as chaves antigas que saíram, se `fileUsage.inUse` disser que nenhuma partida as copiou (RN-18, RN-28). Isso é feito com melhor esforço. |
| `createDeleteCustomTheme` | `themes`, `fileUsage`, `storage` | `requireOwnedTheme` e apaga o tema. O banco zera `quiz.custom_theme_id` (RN-19). Depois libera os arquivos que nenhuma partida usa (RN-28, CA-22). |

### Casos de uso alterados

- **`createSetQuizTheme`**: recebe `choice: QuizThemeChoice`. Com um tema do catálogo, grava `themeId` e zera `customThemeId`. Com um tema personalizado, confere o dono pelo porto `CustomThemeReads.findOwned(ownerId, id)` (`THEME.NOT_FOUND`), grava `customThemeId` e põe `themeId = standard`. Continua fora da versão jogável (RN-23).
- **`loadQuizDetailsView` / editor** (`getQuizEditor`): o quiz carrega `customThemeId` e `customTheme: ThemeLookView | null`, o tema que o centro do editor desenha.
- **`duplicateQuiz`** mantém o tema; **`duplicateSharedQuiz`** zera (RN-27).
- **`hostGame` / `createAssignment`**: copiam `quiz.customTheme` do `PlayableQuiz` (RN-24, RN-25).
- **Visões com `customTheme: ThemeLookView | null`**, ao lado do `themeId` de hoje:
  - `HostGameView`, com o logotipo.
  - `PlayerSessionView`, `findGameByPin`, a capa da atribuição e o `AssignmentPlayView`, sem o logotipo (RN-26).
  - `SharedQuizView` e `PublicQuizView`, sem o logotipo; são usados só pela tela de abertura.
- **`deleteAccount`**: apaga também `themesPrefixOf(userId)`. Os temas somem pela cascata de `user` (RN-30).

### Portas

```ts
// themes/application/ports
export interface CustomThemeRepository {
	findById(id: string): Promise<CustomTheme | null>;
	listByOwner(ownerId: string): Promise<(CustomTheme & { quizCount: number })[]>;
	createTakingUploads(theme: CustomTheme, uploadKeys: string[]): Promise<"ok" | "uploadMissing">;
	updateTakingUploads(theme: CustomTheme, uploadKeys: string[]): Promise<"ok" | "uploadMissing">;
	delete(id: string): Promise<void>;
}
export interface ThemeUploadRepository {
	addThemeUpload(upload: { key: string; ownerId: string; createdAt: Date }): Promise<void>;
	isPendingThemeUpload(key: string, ownerId: string): Promise<boolean>;
	removeThemeUpload(key: string, ownerId: string): Promise<boolean>;
	takeExpiredThemeUploads(before: Date, limit: number): Promise<string[]>;
}
/** Which of these theme files a game copied (RN-28). */
export interface ThemeFileUsage {
	inUse(keys: readonly string[]): Promise<Set<string>>;
}

// quiz/application/ports
export interface CustomThemeReads {
	findOwned(ownerId: string, id: string): Promise<{ id: string } | null>;
}
```

- `QuizRepository.saveTheme(quizId, { themeId, customThemeId, updatedAt })` grava as duas colunas juntas.
- `PlayableQuiz.customTheme: ThemeLook | null`.
- `AssignmentLandingRecord`, `SharedQuizDetail` e `PublicQuizDetail` ganham `customTheme: ThemeLook | null`.
- Os nomes das portas de envio são próprios (`addThemeUpload`…), como manda a regra da spec 036 para portas que uma loja de teste implementa junto com outras.
- **Fakes** em `themes/testing`: `InMemoryCustomThemeRepository` (que também implementa `CustomThemeReads`), `InMemoryThemeUploadRepository`, `InMemoryThemeFileUsage` e o construtor `aCustomTheme()`.

## Adapters

### Banco — `packages/db`

- **Schema `themes.ts`** (novo):
  - `custom_theme`:
    - `id` text pk, `owner_id` text FK `user` `ON DELETE CASCADE`, `name` text.
    - `look` jsonb not null.
    - `created_at` e `updated_at`.
    - Índice `(owner_id, created_at desc)`.
  - `theme_upload`:
    - `key` text pk, `owner_id` FK `user` cascade, `created_at`.
    - Índice em `created_at`.
- **`quiz`**: `custom_theme_id` text, null, FK `custom_theme(id)` `ON DELETE SET NULL`, com índice.
- **`game`**: `custom_theme` jsonb, null. Não é chave estrangeira: a partida guarda a cópia.
- **Repositórios**:
  - `drizzle-custom-theme-repository.ts`:
    - O `quizCount` sai de um `count` de `quiz` agrupado.
    - `createTakingUploads` faz numa transação o `DELETE … FROM theme_upload WHERE key IN (…) AND owner_id = …`, confere o número de linhas e insere o tema. Se faltar alguma linha, faz rollback e devolve `uploadMissing`.
  - `drizzle-theme-upload-repository.ts`.
  - `drizzle-theme-file-usage.ts`: `SELECT` em `game` onde `custom_theme->'background'->>'key' = ANY($1)` ou `custom_theme->>'logoKey' = ANY($1)`.
- **Alterados**:
  - `drizzle-quiz-repository` (`saveTheme`, leitura da coluna).
  - `drizzle-game-repository`: grava e lê `custom_theme` com `readThemeLook`.
  - `drizzle-playable-quiz-query`, `drizzle-assignment-landing-query`, `drizzle-shared-quiz-reads` e `drizzle-creator-profile-query`: fazem `LEFT JOIN custom_theme` e devolvem o `look`.
- **Migration** `0016_custom_themes`. Todas as colunas são novas e anuláveis, e as tabelas são novas, então o código já publicado continua funcionando (docs/deploy.md). Rodar `pnpm db:generate` e aplicar localmente com `ALTER TABLE` à mão, por causa da nota do `drizzle-kit push`.

### Storage

- Nada novo no adapter: `createPresignedUpload`, `exists`, `delete` e `deletePrefix` já existem.
- A política de CORS do bucket já cobre o PUT de qualquer chave.

### Real-time

- Nenhum evento novo. O tema é copiado na criação, e as telas recebem-no com as consultas que já fazem.

## API — `packages/api`

- **`routers/theme.ts`** (novo, registrado em `routers/index.ts`), todo `protectedProcedure`:
  - `list`.
  - `requestUpload({ contentType, sizeBytes })`.
  - `discardUpload({ key })`.
  - `create({ name, look })` e `update({ themeId, name, look })`.
  - `delete({ themeId })`.
  - O `look` é validado por um `z.discriminatedUnion("kind", …)` só quanto à forma. Os padrões vêm de `BACKGROUND_PATTERN_IDS`, e os limites e a legibilidade ficam no core.
- **`quiz.setTheme`**: a entrada passa a ser `{ quizId, choice }`, com `choice` = `{ kind: "catalog", themeId }` ou `{ kind: "custom", customThemeId }`.
- **`container.ts`**: liga os casos de uso novos aos adapters, `CustomThemeReads` ao repositório e `ThemeFileUsage` ao adapter do banco.
- **`composition-root.ts`**: instancia os repositórios novos.
- O `createTestApi` usa os fakes.

## UI — `apps/web` e `packages/ui`

### Tema mostrado

- **`lib/theme-catalog.ts`**:
  - `ShownTheme = { themeId: ThemeId; custom: ThemeLookView | null }`.
  - `themeStyle(shown)`:
    - Sem `custom`, faz o mesmo de hoje.
    - Com padrão: `--game-base` recebe a cor do fundo e `--game-bg-image`, o SVG do padrão (`public/themes/patterns/{id}.svg`, formas brancas e pretas translúcidas desenhadas por cima da cor).
    - Com imagem: `--game-bg-image` recebe a URL, e o tom vem de `imageTone` (RN-12).
    - `--game-fg` sai do `readableTextOn` sobre a cor do fundo, e `--game-accent`/`--game-accent-fg` saem da cor de contraste. As faixas (`--game-chip`, `--game-bar`) seguem o tom, como na spec 042.
  - `shownTheme(themeId, custom)` monta o valor a partir das visões.
- **`lib/game-theme.tsx`**: o `GameThemeProvider` passa a receber `theme: ShownTheme`, e `useGameTheme()` devolve também o `logoUrl`.
- **`components/game/game-brand.tsx`** (novo): o logotipo (inteiro, `object-contain`, altura máxima fixa, `alt` "Logotipo") ou o `Wordmark` de hoje. Entra no lobby, no placar e no pódio do anfitrião (RN-26). Os jogadores recebem `logoUrl: null`, então continuam vendo o nome do Quizio.
- **Rotas e fluxos**: trocam `themeId` por `shownTheme(view.themeId, view.customTheme)`. São eles: `host.$gameId`, `JoinFlow` (`FoundGame` e o passo `rejoin`), `AssignmentPlayFlow`, `OpeningGame`, o editor, `SharedQuizPage` e a página pública.

### "Seus temas" e "Crie seu tema" — `components/editor/themes/`

- **`ThemesPanel`**:
  - Recebe `customThemes` e `onCreate`/`onEdit`/`onDelete`.
  - "Seus temas" entra no mesmo `RadioGroup`, com o valor `custom:{id}`, que só existe na UI, para o teclado percorrer tudo (spec 042, RN-27).
  - O "+" perde o "Em breve" (RN-13), e cada miniatura ganha o ⋮ (`DropdownMenu`: Editar, Excluir) (RN-17).
  - Os arquivos `themes-panel.tsx` e `themes-sheet.tsx` vão para esta pasta.
- **`CustomThemeDialog`** (`custom-theme-dialog.tsx`):
  - Um `Dialog` largo, de tela inteira no celular (CA-24), com os campos e a prévia.
  - O estado é um reducer puro, `lib/custom-theme-form.ts`: valores iniciais, campos alterados (para "Descartar este tema?"), envios em andamento e seus tokens, e a validação com `isLegibleColor`/`parseHexColor` (RN-11, CA-08, CA-09).
  - Os efeitos (enviar, salvar, descartar) ficam no componente, como no `CreatePostFlow`.
- **`ThemeColorPicker`**: um `RadioGroup` dos 12 círculos com nomes acessíveis ("Azul-marinho"…) e um `Input` do código com a amostra (CA-25).
  - A paleta fica em `lib/theme-palette.ts`, com as cores de destaque e de fundo do catálogo da spec 042, o que responde à pergunta em aberto.
  - Um teste confere que as 12 passam de 4,5:1.
- **`PatternPicker`**: um `RadioGroup` `variant="tile"` com as 4 miniaturas.
- **`ThemeFileField`**: o envio do logotipo ou do fundo.
  - Reutiliza `uploadFile` e as mensagens de `lib/group-post-labels.ts`/spec 007, recusando antes de enviar (CA-06).
  - Mostra a barra `Progress` durante o envio.
  - Para o fundo, mede o tom com `lib/image-tone.ts` (canvas reduzido a 32×32, luminância média, `light` acima de 0,5).
- **`ThemePreview`**: três `GameScreen` reduzidos com `transform: scale` e dados fixos (lobby com três apelidos, uma pergunta de Quiz e o pódio). No celular, abas `Tabs` "Lobby", "Pergunta" e "Pódio" (RN-14).
- **`DeleteCustomThemeDialog`**: um `AlertDialog` com a contagem de `quizCount` (RN-19, CA-15).
- **Mutações** em `lib/theme-mutations.ts`:
  - `create`/`update`/`delete` invalidam `theme.list` e o `quiz.editor` dos quizzes abertos.
  - Salvar no "Crie seu tema" faz `theme.create` e, em seguida, `actions.setTheme({ kind: "custom", … })` pela fila do editor (RN-15).
  - A falha mantém o diálogo aberto com a mensagem (CA-18).
- **`actions.setTheme`** (`lib/question-mutations.ts`): passa a receber `QuizThemeChoice`, e o `pendingTheme` vira um `ShownTheme`.

## Estratégia de testes

| CA | Teste | Camada |
| --- | --- | --- |
| CA-01 | `themes-panel.test.tsx`: "the plus opens Crie seu tema, without Em breve" | componente |
| CA-02 | `create-custom-theme.test.ts`: "creates a pattern theme and takes the uploads"; `quiz-editor.test.tsx`: "saving a new theme applies it to the quiz"; E2E `custom-themes.spec.ts` | core, componente, E2E |
| CA-03 | `custom-theme-dialog.test.tsx`: "the preview follows the accent color before saving" | componente |
| CA-04 | `theme-catalog.test.ts`: "an image theme puts the image behind and takes the tone"; E2E | web unit, E2E |
| CA-05 | `host-game-view.test.ts`: "the host's view has the logo URL"; `get-player-session.test.ts`: "a player's view has no logo"; `game-brand.test.tsx` | core, componente |
| CA-06 | `request-theme-upload.test.ts`: "refuses another type or more than 10 MB"; `theme-file-field.test.tsx`: "refuses before sending" | core, componente |
| CA-07 | `custom-theme.test.ts`: "a name has 1 to 30 characters"; `custom-theme-form.test.ts`: "Salvar is off with an empty name" | domínio, web unit |
| CA-08 | `contrast.test.ts`: "isLegibleColor"; `custom-theme.test.ts`: "refuses an illegible color"; `custom-theme-form.test.ts`: "warns and blocks Salvar" | domínio, web unit |
| CA-09 | `theme-look.test.ts`: "parseHexColor takes #RRGGBB only"; `theme-color-picker.test.tsx` | domínio, componente |
| CA-10 | `discard-theme-upload.test.ts`; `custom-theme-dialog.test.tsx`: "Cancelar asks first and discards the uploads" | core, componente |
| CA-11 | `theme-catalog.test.ts`: "a light image gives light strips with dark text"; `image-tone.test.ts` | web unit |
| CA-12 | `set-quiz-theme.test.ts`: "applies an own custom theme" | core |
| CA-13 | `update-custom-theme.test.ts`: "changes the theme every quiz reads"; `drizzle-playable-quiz-query.test.ts` lê a aparência nova | core, repositório |
| CA-14 | `host-game.test.ts`: "the game keeps the look it copied"; `update-custom-theme.test.ts`: "keeps a file a game copied" | core |
| CA-15 | `drizzle-custom-theme-repository.test.ts`: "deleting sets the quizzes back to standard" (PGlite, FK); `delete-custom-theme-dialog.test.tsx` | repositório, componente |
| CA-16 | `set-quiz-theme.test.ts`: "someone else's or a deleted theme is THEME.NOT_FOUND"; `routers/theme.test.ts` | core, API |
| CA-17 | `list-custom-themes.test.ts`: "only the owner's"; `update-custom-theme.test.ts`/`delete-custom-theme.test.ts`: "someone else's is NOT_FOUND" | core |
| CA-18 | `custom-theme-dialog.test.tsx`: "a failed save keeps the dialog with the message" | componente |
| CA-19 | `host-game.test.ts` e `create-assignment.test.ts`: "a shared quiz copies its owner's look" | core |
| CA-20 | `duplicate-quiz.test.ts` e `duplicate-shared-quiz.test.ts` | core |
| CA-21 | `update-custom-theme.test.ts`: "deletes the replaced image nobody copied" | core |
| CA-22 | `delete-custom-theme.test.ts`: "keeps the files an open assignment copied"; `drizzle-theme-file-usage.test.ts` | core, repositório |
| CA-23 | `delete-account.test.ts`: "deletes the themes prefix"; FK cascade em PGlite | core, repositório |
| CA-24 | E2E `custom-themes.spec.ts` no projeto mobile: sem rolagem horizontal, abas da prévia | E2E |
| CA-25 | `custom-theme-dialog.test.tsx`: "is filled and saved with the keyboard" | componente |

Outros testes:
- `theme-look.test.ts`: `readThemeLook` com tolerância.
- `theme-palette.test.ts`: as 12 cores legíveis.
- Os testes da spec 042 continuam valendo, com `ShownTheme` sem `custom`.

## Dados e migração

- A migration `0016_custom_themes` cria `custom_theme` e `theme_upload` e acrescenta `quiz.custom_theme_id` e `game.custom_theme`. Ela não reescreve nenhuma linha: os quizzes e as partidas continuam com o `theme_id` de hoje.
- O código da spec 042 já em produção não lê as colunas novas, então a migration é compatível (vercel.json aplica antes do build).

## Riscos e decisões

- **ADR 0022 (rascunho)** registra três decisões:
  - Os temas personalizados vivem numa tabela própria, num contexto `themes`.
  - O quiz aponta para eles com uma chave estrangeira `SET NULL`, e não com outro formato de ID em `theme_id`, o que revê uma consequência da ADR 0021.
  - A partida copia a aparência em `jsonb`, com as chaves dos arquivos.
- **Arquivos que uma partida copiou**: ficam enquanto a partida existe. Se a partida for apagada depois do tema (relatório excluído para sempre), o arquivo fica órfão, para a varredura da ADR 0003. É aceitável, porque é raro e não quebra nada.
- **Excluir a conta** apaga `themes/{userId}/`. Uma atribuição aberta **de outra pessoa**, criada com o quiz compartilhado de quem saiu, perde a imagem do fundo e passa a mostrar só a cor do padrão ou o roxo. Isso é aceitável: o quiz também deixa de existir.
- **Tom medido no navegador** (RN-12): o servidor confia no `tone` recebido. Um valor falso só troca o tom das faixas, que continuam legíveis.
- **Mudanças nas visões da spec 042**: o `customTheme` é só acrescentado. O risco é esquecer uma tela, e isso é coberto pelos testes das visões e por um teste do `JoinFlow`/`AssignmentPlayFlow` com tema personalizado.
- **Prévia com `GameScreen` reduzido**: três telas pequenas no diálogo. Se pesar, a prévia vira imagens estáticas desenhadas com as mesmas variáveis.
- **Contextos da spec**: atualizados para `themes, quiz, game` (changelog da spec).
