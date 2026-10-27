---
spec: "037"
status: approved # draft | approved
---

# Plano técnico — 037 Grupos 4/5 — Compartilhado

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0018](../../../docs/adr/0018-quizzes-compartilhados-no-grupo.md)

## Abordagem

**Um quiz compartilhado é uma linha que aponta para o quiz, nunca uma cópia.** A tabela `group_shared_quiz` tem o grupo, o quiz, quem compartilhou e quando.

Tudo o que o grupo mostra é uma leitura feita no momento, com a mesma ideia do anexo da atribuição (ADR 0016):
- o título, a capa e as perguntas vêm da **versão publicada em vigor**;
- um quiz na lixeira não aparece, mas a linha continua, então ele volta ao ser restaurado (RN-23).

**O que tira o quiz do grupo para sempre é o banco** (RN-22), por meio de chaves estrangeiras com `on delete cascade`:
- para `quiz`, quando o dono exclui o quiz para sempre;
- para `group_member` pelo par (grupo, quem compartilhou), quando o dono sai ou é removido. Só se compartilha quiz próprio, então quem compartilhou é sempre o dono.
- para `group`, quando o grupo é excluído.

Nenhum caso de uso de quiz ou de grupo precisa lembrar de limpar nada.

**A permissão de usar o quiz de outra pessoa é uma porta nova do núcleo compartilhado, `QuizShareGrants`.** Ela responde "esta pessoa pode usar este quiz?": sim quando o quiz está compartilhado num grupo de que ela é membro. Três contextos a consultam, e nenhum deles importa `groups`:
- `game`: Organizar ao vivo, Atribuir e Jogar novamente;
- `quiz`: Duplicar;
- `reports`: Jogar novamente.

O índice que limita a uma partida ao vivo aberta passa a ser **por quiz e anfitrião** (RN-19).

O compartilhamento cria publicações de dois tipos novos: `quizShare`, de um quiz e com texto opcional, e `quizzesShare`, de vários. A publicação aponta para a linha do compartilhamento, não para o quiz. Assim, "Remover do grupo" seguido de um novo compartilhamento não devolve o anexo à publicação antiga (RN-13).

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Quiz compartilhado | `SharedQuiz` (`group_shared_quiz`) | sim |
| Compartilhar com o grupo | `shareQuizzesInGroup` | sim |
| Remover do grupo | `unshareQuiz` | sim |
| Página do quiz compartilhado | `getSharedQuiz` / `SharedQuizView` | sim |
| Duplique para editar / Duplicar | `duplicateSharedQuiz` | sim |
| Permissão de usar o quiz | `QuizShareGrants` | sim |
| Publicação de um kahoot / de vários | `GroupPostKind` `quizShare` / `quizzesShare` | sim |
| Ordenar por | `SharedQuizSort` (`recent` \| `oldest` \| `nameAsc` \| `nameDesc`) | sim |

## Domínio

### `packages/core/src/groups/domain`

**`shared-quiz.ts`** (novo):
```ts
export interface SharedQuiz {
	id: string;          // a linha, não o quiz (RN-13)
	groupId: string;
	quizId: string;
	sharedById: string;  // sempre o dono do quiz (RN-02)
	sharedAt: Date;
}
export const SHARED_QUIZ_SORTS = ["recent", "oldest", "nameAsc", "nameDesc"] as const;
export const SHARED_QUIZZES_PAGE_SIZE = 20;               // RN-15
export function sharedQuizzesPostKind(count: number): "quizShare" | "quizzesShare"; // RN-06
```

**`group-post.ts`**:
- `GROUP_POST_KINDS` ganha `quizShare` e `quizzesShare`.
- `GroupPost` ganha `sharedQuizId: string | null`, a linha do compartilhamento, só em `quizShare`.
- `postHeadlineOf` passa a devolver:
  - `quizShare` com o anexo vivo → `"quiz"` ("compartilhou um kahoot");
  - `quizShare` com o anexo morto → `"file"`, como a atribuição;
  - `quizzesShare` → `"quizzes"` ("compartilhou múltiplos kahoots"), sempre (RN-13).
- `GroupPostHeadline` ganha `"quiz"` e `"quizzes"`.

**`group-permissions.ts`**:
- `canShare(membership, permissions)`: o administrador sempre, ou o membro com `membersCanShare` (RN-01);
- `assertCanShare` lança `GROUP.SHARE_NOT_ALLOWED`;
- `canUnshare(membership, shared)`: quem compartilhou ou o administrador (RN-11, RN-13);
- `GroupView.abilities` ganha `canShare`.

### `packages/core/src/shared`

**`application/ports/quiz-share-grants.ts`** (novo, ADR 0018):
```ts
/** Who may use a quiz they do not own: a member of a group it is shared in (spec 037). */
export interface QuizShareGrants {
	canUse(userId: string, quizId: string): Promise<boolean>;
}
```
O fake em memória vai em `shared/testing/in-memory-quiz-share-grants.ts`, com `grant(userId, quizId)`.

### `packages/core/src/quiz/domain`

`copyQuiz(source, { id, ownerId, coverImageKey, now })` passa a receber o dono da cópia. O `duplicateQuiz` de sempre passa o mesmo dono.

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `ShareNotAllowedError` | `GROUP.SHARE_NOT_ALLOWED` | membro sem a chave compartilha (RN-01) |
| `QuizNotShareableError` | `GROUP.QUIZ_NOT_SHAREABLE` | quiz de outra pessoa, rascunho, na lixeira ou inexistente (RN-02); nada é compartilhado (RN-06) |
| `QuizAlreadySharedError` | `GROUP.QUIZ_ALREADY_SHARED` | quiz já no grupo (RN-04) |
| `SharedQuizNotFoundError` (`NotFoundError`) | `GROUP.SHARED_QUIZ_NOT_FOUND` | página ou ação de um quiz que não está (vivo) no grupo (RN-25) |
| `UnshareNotAllowedError` | `GROUP.UNSHARE_NOT_ALLOWED` | quem não compartilhou nem administra remove (RN-13) |

O `hostGame` e o `createAssignment` continuam respondendo `GameQuizNotFoundError` quando não há permissão. O `duplicateSharedQuiz` responde `QuizNotFoundError` (o "outros donos = inexistente" de sempre).

## Aplicação

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `groups/shareQuizzesInGroup` | `{ userId, groupId, quizIds (1..50), message? }` | `{ postId }` | membership, `SHARE_NOT_ALLOWED`, `QUIZ_NOT_SHAREABLE`, `QUIZ_ALREADY_SHARED`, `INVALID_MESSAGE` | `groupSharedQuizzes`, `sharedQuizReads`, `ids`, `clock` |
| `groups/unshareQuiz` | `{ userId, groupId, quizId }` | `void` | membership, `SHARED_QUIZ_NOT_FOUND`, `UNSHARE_NOT_ALLOWED` | `groupSharedQuizzes` |
| `groups/listSharedQuizzes` | `{ userId, groupId, sort, limit }` | `{ items: SharedQuizCardView[], hasMore }` | membership | `sharedQuizReads`, `storage` |
| `groups/listSharedQuizIds` | `{ userId, groupId }` | `string[]` (para "Já compartilhado") | membership | `groupSharedQuizzes` |
| `groups/getSharedQuiz` | `{ userId, groupId, quizId }` | `SharedQuizView` | membership, `SHARED_QUIZ_NOT_FOUND` | `sharedQuizReads`, `storage` |
| `quiz/duplicateSharedQuiz` | `{ userId, quizId }` | `QuizDetailsView` | `QUIZ.NOT_FOUND` | `quizzes`, `quizVersions`, `quizShareGrants`, `storage`, `ids`, `clock` |
| `game/hostGame` (alterado) | — | — | — | `+ quizShareGrants` |
| `game/createAssignment` (alterado) | — | — | — | `+ quizShareGrants` |
| `groups/postViewsOf` (alterado) | — | `+ quiz: SharedQuizCardView \| null` | — | `+ sharedQuizReads` |
| `reports/getReport`, `listReports` (alterados) | — | `quizId` só do dono; `playQuizId` | — | `+ quizShareGrants` |

Detalhes:

- **`shareQuizzesInGroup`**:
  1. Começa por `requireMembership` e `assertCanShare`.
  2. Os ids sem repetição passam por `parseOptionalPostMessage`. Só vale com **um** quiz; o Compart. não manda texto.
  3. `sharedQuizReads.shareable(userId, quizIds)` devolve os que são do usuário, publicados e fora da lixeira. Faltou algum → `QUIZ_NOT_SHAREABLE`.
  4. **Uma transação** (`groupSharedQuizzes.shareWithPost`) insere as linhas e a publicação. Ela é `quizShare` com `sharedQuizId` quando há um quiz, e `quizzesShare` sem texto quando há vários.
  5. A transação devolve `"alreadyShared"` se o índice único `(group_id, quiz_id)` recusar, e nada fica gravado (RN-06).
- **`unshareQuiz`**: lê a linha e confere `canUnshare`. Apagar a linha basta: a publicação `quizShare` perde o anexo na leitura.
- **`getSharedQuiz`**:
  - responde `SHARED_QUIZ_NOT_FOUND` quando o quiz não está compartilhado no grupo ou está na lixeira;
  - devolve a versão publicada (`QuizVersion`: as perguntas, como em `PlayableQuizQuery.questions`), os dados do quiz, `ownerName`, `sharedByName`, `games` e `participants` (RN-16), as URLs das imagens (`imageUrls`, como no editor) e `ownedByViewer`;
  - as respostas certas vão na resposta, porque o membro pode ver a versão inteira ("Mostrar respostas" é só tela).
- **`duplicateSharedQuiz`**:
  - exige `quizShareGrants.canUse` e uma versão publicada fora da lixeira;
  - copia **as perguntas da versão em vigor** (`quizVersions.find(quizId, version)`), não a cópia de trabalho do dono (RN-17, RN-21);
  - copia a capa e as imagens para chaves do novo dono, como o `duplicateQuiz`;
  - tira daí uma função `copyQuizContent` para os dois casos.
- **`hostGame` / `createAssignment`**:
  - `quiz.ownerId !== ownerId && !(await deps.quizShareGrants.canUse(ownerId, quiz.id))` → `GameQuizNotFoundError`;
  - o `hostGame` encerra só as partidas ao vivo abertas **do mesmo anfitrião** (`endGamesOfQuiz({ quizId, ownerId, … })`, RN-19). Excluir o quiz para sempre continua encerrando as de todos.
- **Relatórios**:
  - o link do título (`quizId`) só aparece quando quem vê é o dono do quiz;
  - "Jogar novamente" usa o novo `playQuizId`: `quizId` quando `canPlayAgain(header)` e o leitor é o dono ou `canUse` (RN-24). O `ReportHeader.quiz` ganha `ownerId`.

### Portas novas ou alteradas

```ts
// groups/application/ports/group-shared-quiz-repository.ts
export interface GroupSharedQuizRepository {
	/** The rows and the post in one transaction (RN-06, RN-08). */
	shareWithPost(rows: SharedQuiz[], post: GroupPost): Promise<"created" | "alreadyShared">;
	findSharedQuiz(groupId: string, quizId: string): Promise<SharedQuiz | null>;
	removeSharedQuiz(id: string): Promise<void>;
	sharedQuizIdsOf(groupId: string): Promise<string[]>;
}

// groups/application/ports/shared-quiz-reads.ts — read model over quiz, game and user tables
export interface SharedQuizCard {
	sharedQuizId: string; quizId: string; title: string; coverImageKey: string | null;
	questionCount: number; visibility: "private" | "unlisted"; ownerId: string; ownerName: string;
	sharedById: string; sharedAt: Date; games: number;   // "N partidas" (RN-15)
}
export interface SharedQuizReads {
	/** Of these, the quizzes of `ownerId` that can be played (RN-02). */
	shareable(ownerId: string, quizIds: string[]): Promise<{ id: string }[]>;
	/** Alive shares only: published and out of the trash (RN-23). */
	list(groupId: string, sort: SharedQuizSort, limit: number): Promise<{ items: SharedQuizCard[]; hasMore: boolean }>;
	cards(sharedQuizIds: string[]): Promise<SharedQuizCard[]>;   // the feed's attachments
	detail(groupId: string, quizId: string): Promise<SharedQuizDetail | null>; // + description, version questions, participants
}

// game/application/ports/game-repository.ts
listUnendedByQuiz(quizId: string, modes?: readonly GameMode[], ownerId?: string): Promise<Game[]>;
```

Os fakes:
- o `InMemoryGroupStore` implementa `GroupSharedQuizRepository`, com nomes distintos dos de outras portas, como na 036;
- o `InMemorySharedQuizReads` recebe os quizzes num `seed`;
- o `InMemoryQuizShareGrants` fica no núcleo compartilhado.

## Adapters

### Banco — `packages/db`

`schema/groups.ts`:
- **`group_shared_quiz`**:
  - colunas `id` (pk), `group_id` (fk `group`, cascade), `quiz_id` (fk `quiz`, cascade), `shared_by_id`, `shared_at`;
  - fk composta `(group_id, shared_by_id)` → `group_member (group_id, user_id)`, cascade (RN-22);
  - índice único `(group_id, quiz_id)` (RN-04) e índice `(group_id, shared_at desc, id desc)` para a aba.
- **`group_post_kind`** ganha `quizShare` e `quizzesShare`.
- **`group_post.shared_quiz_id`**: text, **sem fk**, porque a publicação vive mais que o compartilhamento.
- **check `group_post_shared_quiz`**: `shared_quiz_id` só com `kind = 'quizShare'`, e `quizShare` exige `shared_quiz_id`.

`schema/game.ts`: `game_unended_quiz_idx` passa a ser `on (quiz_id, owner_id) where ended_at is null and mode = 'live'`.

Repositórios:
- `repositories/groups/drizzle-group-shared-quiz-repository.ts` (novo): `shareWithPost` com `db.transaction`, em que a violação do índice único vira `"alreadyShared"`.
- `repositories/groups/drizzle-shared-quiz-reads.ts` (novo):
  - faz o join de `group_shared_quiz`, `quiz` (`status = 'published'`, `trashed_at is null`), `quiz_version` em vigor (contagem e perguntas), `user` (nomes) e `game`;
  - "N partidas" e "N jogos" contam as partidas começadas: as ao vivo com `status <> 'lobby'` e as atribuições;
  - "N participantes" conta `game_player` dessas partidas;
  - a ordem por nome usa a mesma normalização da pesquisa (`lower(unaccent)` não existe no PGlite; ordenar em SQL por `lower(title)` e desempatar por `id`, testado com acentos);
- `repositories/shared/drizzle-quiz-share-grants.ts` (novo): `exists (group_shared_quiz join group_member on group_id where quiz_id = $quiz and user_id = $user)`.
- `drizzle-game-repository.ts`: `listUnendedByQuiz` com o filtro opcional de dono.
- `drizzle-report-game-query.ts`: `ReportHeader.quiz.ownerId`.
- `drizzle-group-post-repository.ts` e `drizzle-group-feed-query.ts`: a coluna nova.

### Real-time

Nenhum. As telas do grupo já são lidas de novo a cada acesso (ADR 0015).

### Storage

O `duplicateSharedQuiz` copia a capa e as imagens com `storage.copy` para `media/{novoDono}/…`. Nada muda no bucket.

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `group.share` | mutation | protegida | `{ groupId, quizIds: string[1..50], message?: string }` | `{ postId }` | `GROUP.SHARE_NOT_ALLOWED`, `QUIZ_NOT_SHAREABLE`, `QUIZ_ALREADY_SHARED`, `INVALID_MESSAGE` |
| `group.unshare` | mutation | protegida | `{ groupId, quizId }` | `void` | `SHARED_QUIZ_NOT_FOUND`, `UNSHARE_NOT_ALLOWED` |
| `group.shared.list` | query | protegida | `{ groupId, sort: enum(SHARED_QUIZ_SORTS), limit }` | `{ items, hasMore }` | `GROUP.NOT_FOUND` |
| `group.shared.ids` | query | protegida | `{ groupId }` | `string[]` | `GROUP.NOT_FOUND` |
| `group.shared.get` | query | protegida | `{ groupId, quizId }` | `SharedQuizView` | `SHARED_QUIZ_NOT_FOUND` |
| `quiz.duplicateShared` | mutation | protegida | `{ quizId }` | `QuizDetailsView` | `QUIZ.NOT_FOUND` |

As procedures que mudam de comportamento sem mudar de forma são `game.host`, `assignment.create`, `group.feed` (o `quiz` no anexo) e `report.*` (`playQuizId`).

`container.ts`:
- liga `groupSharedQuizzes`, `sharedQuizReads` e `quizShareGrants` aos casos de uso novos;
- passa `quizShareGrants` a `hostGame`, `createAssignment`, `duplicateSharedQuiz`, `getReport` e `listReports`.

`composition-root.ts` monta os adapters Drizzle, e `test-context.ts` monta os fakes.

## UI — `apps/web`

- **Rota nova** `routes/_auth/_shell/groups.$groupId.quizzes.$quizId.tsx`: a página do quiz compartilhado (RN-16).
  - Para o dono, `ownedByViewer` redireciona para `/quizzes/$quizId`.
  - `GROUP.SHARED_QUIZ_NOT_FOUND` mostra "Este quiz não está mais disponível no grupo." com o link para `?tab=shared` (RN-25).
- **`components/groups/shared/`**:
  - `ShareQuizzesDialog`: a variante de seleção múltipla do "Selecionar kahoot", em que **`SelectQuizDialog` ganha `mode: "single" | "multiple"` e `sharedIds`**, mostra "Já compartilhado", "✓ Selecionado" e "Compartilhar N kahoots", e tem as regras de seleção num reducer puro `lib/share-quizzes-state.ts`;
  - `SharedQuizzesTab`: "Kahoots", "Ordenar por" (`sort` no endereço, `validateSearch` da rota do grupo), a troca entre cartões e lista guardada em `localStorage` (com a mesma chave e o mesmo padrão de `GroupAssignmentsTab`), "Mostrar mais" (o `limit`), o vazio e o Compart.;
  - `SharedQuizCard`, `SharedQuizRow`, `SharedQuizMenu` (Duplicar; "Remover do grupo" com `AlertDialog`), `SharedQuizPage` (topo, "Organizar ao vivo", Atribuir, Editar → `DuplicateToEditDialog`);
  - `SharedQuestionList` com "Mostrar respostas", que reaproveita o desenho das perguntas do relatório onde servir.
- **Mural**:
  - `GroupPost` desenha os títulos `quiz` e `quizzes`; "múltiplos kahoots" é um `Link` para `?tab=shared`;
  - o cartão `SharedQuizAttachment` tem Iniciar, que leva à rota nova, e `SharedQuizMenu`;
  - os rótulos ficam em `lib/group-post-labels.ts`.
- **Caixa e faixa**:
  - o `Compart.` da caixa e da aba abre `ShareQuizzesDialog`;
  - o "Compartilhar kahoot" da faixa vira `attachment: { kind: "sharedQuiz" }` no `lib/group-post-state.ts`, com `SelectQuizDialog` `single` e sem as configurações;
  - Publicar chama `group.share` com o texto;
  - os botões somem sem `abilities.canShare`.
- **Ações da página**:
  - Organizar ao vivo usa o `game.host` de sempre (`usePlayAgain`/`useHostQuiz`);
  - Atribuir usa `useAssignQuiz()`;
  - Duplicar chama `quiz.duplicateShared` e navega para `/creator/$quizId`.
- **Mutações** em `lib/group-mutations.ts`: `share`, `unshare` e `duplicateShared`, que invalidam `group.feed`, `group.shared.*` e a biblioteca.
- **Mensagens** em `lib/group-error-messages.ts`:
  - `QUIZ_NOT_SHAREABLE`: "Um dos kahoots não pode mais ser compartilhado.";
  - `QUIZ_ALREADY_SHARED`: "Um dos kahoots já está no grupo.";
  - `SHARE_NOT_ALLOWED`: "Você não pode compartilhar neste grupo.";
  - `UNSHARE_NOT_ALLOWED`: "Você não pode remover este kahoot.".
- **Relatórios**: "Jogar novamente" passa a usar `playQuizId`, e o título linka só com `quizId`.

Nenhuma variante nova em `packages/ui`.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | domínio + aplicação + componente | `canShare follows membersCanShare`; `refuses a member without the switch`; `hides Compart. without canShare` | `groups/domain/group-permissions.test.ts`, `groups/application/share-quizzes-in-group.test.ts`, `components/groups/group-activity.test.tsx` |
| CA-02 | aplicação + componente | `shares several quizzes with one quizzesShare post`; `selects many and says Compartilhar 2 kahoots`; `links múltiplos kahoots to the shared tab` | `share-quizzes-in-group.test.ts`, `shared/share-quizzes-dialog.test.tsx`, `group-post.test.tsx` |
| CA-03 | aplicação + componente | `one quiz makes a quizShare post with its card`; `disables the button with nothing selected` | idem |
| CA-04 | componente + router | `the post's Compartilhar kahoot returns with the card, no settings`; `group.share with a message` | `post/create-post-flow.test.tsx`, `api/routers/group-shared.test.ts` |
| CA-05 | aplicação + repositório | `refuses drafts, trashed and foreign quizzes`; `refuses a second share and writes nothing` (PGlite: índice único na transação); `marks Já compartilhado` | `share-quizzes-in-group.test.ts`, `drizzle-group-shared-quiz.test.ts`, `share-quizzes-dialog.test.tsx` |
| CA-06 | repositório + componente | `sorts by recent, oldest and name with accents`; `counts started games`; `keeps the sort in the address and the view in localStorage` | `drizzle-shared-quiz-reads.test.ts`, `shared/shared-quizzes-tab.test.tsx` |
| CA-07 | aplicação + componente | `pages 20 with hasMore`; `empty state with and without Compart.` | `list-shared-quizzes.test.ts`, `shared-quizzes-tab.test.tsx` |
| CA-08 | aplicação + repositório + componente | `getSharedQuiz returns the version, games and participants`; `hides answers until Mostrar respostas`; `owner is redirected` | `get-shared-quiz.test.ts`, `drizzle-shared-quiz-reads.test.ts`, `shared/shared-quiz-page.test.tsx` |
| CA-09 | aplicação | `reads the published version, not the working copy` | `get-shared-quiz.test.ts`, `duplicate-shared-quiz.test.ts` |
| CA-10 | componente | `Editar opens Duplique para editar; Cancelar closes` | `shared-quiz-page.test.tsx` |
| CA-11 | aplicação + repositório | `a member hosts a shared quiz`; `does not end the owner's game`; `one open live game per quiz and host` (PGlite) | `game/application/host-game.test.ts`, `drizzle-game-repositories.test.ts` |
| CA-12 | aplicação | `a member assigns a shared quiz`; `refuses without a grant` | `game/application/create-assignment.test.ts` |
| CA-13 | aplicação | `copies the version's questions, cover and images under the member` | `quiz/application/duplicate-shared-quiz.test.ts` |
| CA-14 | aplicação + componente | `admin and sharer unshare, others are refused`; `the quizShare post loses its card` | `unshare-quiz.test.ts`, `group-post-view.test.ts`, `shared/shared-quiz-menu.test.tsx` |
| CA-15 | aplicação | `deleting a quizzesShare post keeps the shares` | `group-shared-posts.test.ts` |
| CA-16 | repositório | `a trashed quiz disappears and comes back`; `deleting the quiz removes the share` (cascade) | `drizzle-group-shared-quiz.test.ts` |
| CA-17 | repositório | `leaving or being removed removes the member's shares` (fk composta) | `drizzle-group-shared-quiz.test.ts` |
| CA-18 | aplicação + router + repositório | `outsider gets GROUP.NOT_FOUND, removed quiz SHARED_QUIZ_NOT_FOUND`; `grants: only members of a group with the share`; `play again only with a grant` | `get-shared-quiz.test.ts`, `drizzle-quiz-share-grants.test.ts`, `reports/application/get-report.test.ts` |
| CA-02, 08, 11, 13, 14 | E2E | `admin shares two quizzes; member opens, hosts and duplicates; sharer removes` | `apps/web/e2e/group-shared.spec.ts` |

## Dados e migração

`pnpm db:generate` (0012), que cria:
- a tabela `group_shared_quiz`;
- dois valores novos no enum `group_post_kind` (`ALTER TYPE … ADD VALUE`, fora de transação; conferir o SQL gerado);
- a coluna `group_post.shared_quiz_id` e o check;
- o índice `game_unended_quiz_idx` refeito com `(quiz_id, owner_id)`.

Não há preenchimento de dados: nada foi compartilhado ainda.

A mudança é **compatível com o código anterior** (`vercel.json` migra antes do build):
- o índice novo é mais permissivo que o antigo;
- o código anterior nunca lê os tipos novos de publicação.

Localmente, `db:push` não refaz um índice parcial que já existe (memória da máquina), então aplicar o `DROP`/`CREATE` à mão. O teste em PGlite cobre o índice novo.

## Riscos e decisões

- **ADR 0018 (aceito): quizzes compartilhados no grupo**:
  1. o compartilhamento é uma referência, e o grupo lê a versão publicada em vigor;
  2. a remoção é feita por chaves estrangeiras com cascata (quiz, membro, grupo), e não por casos de uso;
  3. `QuizShareGrants` fica no núcleo compartilhado, e é a única porta pela qual `game`, `quiz` e `reports` sabem de grupos;
  4. uma partida ao vivo aberta passa a ser por quiz e **anfitrião** (atualiza o ADR 0009, RN-07 da spec 008).
- **Um quiz fica visível a quem não é o dono**: a página mostra as respostas certas a todo membro. É intencional (RN-16): o grupo é fechado, e o dono escolheu compartilhar.
- **"Jogar novamente" do host**: `usePlayAgain` chama `game.host` com o `quizId` do jogo, e o `hostGame` agora aceita quem tem a permissão. Um quiz que saiu do grupo responde "não encontrado", como hoje com um quiz excluído.
- **Custo da leitura**: a aba e o mural fazem um join por página (20 linhas), e a contagem de partidas usa o índice de `game.quiz_id`, que já existe para `deleteUnstartedByQuiz`. Se for preciso, um índice `(quiz_id)` filtrado por `status <> 'lobby'`.
- **"Mostrar respostas" no servidor**: a versão vai inteira para a página. Isso não toca nenhuma regra da partida ("a resposta certa nunca sai do servidor antes dos resultados" vale para os dispositivos dos jogadores, não para quem prepara a aula).
