---
spec: "039"
status: approved # draft | approved
---

# Plano técnico — 039 Conta e perfil do criador

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0019](../../../docs/adr/0019-conta-perfil-e-exclusao.md)

## Abordagem

A spec junta quatro frentes. Cada uma se apoia no que já existe.

1. **O que o Better Auth já faz fica com ele**: trocar o nome (`updateUser`), trocar a senha (`changePassword` com `revokeOtherSessions`) e encerrar a sessão. O core entra pelas *hooks* que já validam o cadastro: o mesmo `normalizeCreatorName`/`assertValidName` passa a valer em `/update-user`, que também **recusa `image`**, e `/change-password` ganha o limite de 5 tentativas em 60 s (RN-13, RN-21 a RN-23).
2. **A foto é nossa, não do Better Auth.** Uma tabela `profile_photo` (uma linha por usuário, com a **chave**) e um prefixo próprio no storage, `profiles/{userId}/`. A coluna `user.image`, que o Google preenche, nunca é lida (RN-05). **O recorte é feito no navegador**: o canvas desenha o círculo escolhido num quadrado de 512 px (WebP) e só esse arquivo sobe. Assim cada foto é uma URL e nada mais; um GIF vira imagem parada, o que a spec aceita (ADR 0019). Cada envio tem uma chave nova, então a troca nunca esbarra em cache.
3. **Público é uma visibilidade, e o perfil é uma leitura.** `QUIZ_VISIBILITIES` passa a `["private", "public"]`, e uma migração leva os Não listados a Privado. **A porta `QuizShareGrants` passa a dizer sim também para um quiz público, publicado e fora da lixeira.** Com isso, Organizar ao vivo, Atribuir, Duplicar e Jogar novamente funcionam para o visitante sem tocar nos casos de uso de `game`, `quiz` e `reports` (spec 037, ADR 0018). O perfil e a página do quiz público são read models novos em `library`.
4. **Excluir a conta é um caso de uso do core (`identity`) que orquestra os outros contextos por uma porta.** Quase tudo já cai em cascata com a linha de `user` (quiz, partidas, grupos que administra, participação, publicações, curtidas, preferências e cota). O caso de uso faz o que a cascata não faz:
   - acaba as partidas abertas e publica o fim;
   - exclui os grupos que a pessoa administra pelo caminho de sempre;
   - apaga os arquivos: as chaves dos grupos e os prefixos `media/`, `sources/` e `profiles/` do usuário;
   - guarda o feedback anônimo.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Foto do perfil | `ProfilePhoto` (`profile_photo`, `profilePhotoKeyFor`) | sim |
| Pessoa como aparece | `PersonView` (`userId`, `name`, `photoUrl`) | sim |
| Conta | `AccountView` (`getAccount`) | sim |
| Acesso à IA | `GenerationAccessView` (`getGenerationAccess`) | sim |
| Perfil | `CreatorProfileView` (`getCreatorProfile`) | sim |
| Página do quiz público | `PublicQuizView` (`getPublicQuiz`) | sim |
| Visibilidade Público | `QuizVisibility` `"public"` | alterado (`unlisted` sai) |
| Mudar visibilidade | `setQuizVisibility` | sim |
| Excluir conta | `deleteAccount` | sim |
| Motivo / feedback de exclusão | `AccountDeletionReason` / `AccountDeletionFeedback` | sim |

## Domínio

### `packages/core/src/shared/domain`

- `media-key.ts`: `PROFILES_ROOT = "profiles"`, `profilePhotoKeyFor(userId, id, extension)` → `profiles/{userId}/{id}.{ext}` e `isProfilePhotoKeyOwnedBy(key, userId)`, no mesmo molde das chaves de mídia e de fonte.
- `person.ts` (novo): `PersonView { userId; name; photoUrl: string | null }` e `personView({ userId, name, photoKey }, storage)`, que monta a URL no servidor, nunca no cliente (ADR 0003).

### `packages/core/src/identity/domain`

**`account-deletion.ts`** (novo):
```ts
export const ACCOUNT_DELETION_REASONS = [
	"otherAccount", "newProfile", "thoughtNeededAccountToPlay", "missingFeatures",
	"technicalProblems", "notUsing", "notWhatExpected", "other",
] as const;                                   // RN-37, nesta ordem
export const DELETION_FEEDBACK_MAX_LENGTH = 1000; // RN-36
export type AccountDeletionConfirmation =
	| { kind: "password"; password: string }
	| { kind: "email"; email: string };        // conta só com Google (RN-38)
export function parseDeletionRequest(input): { reason; feedback: string | null };
```
`feedback` sai sem espaços nas pontas, e um texto vazio vira `null`. Mais de 1.000 caracteres (`characterCount`) é erro.

**`profile-photo.ts`** (novo): `PROFILE_PHOTO_SIZE = 512` (o lado do quadrado gerado no navegador). Formatos e tamanho: a `media-policy` de sempre (RN-08).

### `packages/core/src/quiz/domain`

- `quiz-details.ts`: `QUIZ_VISIBILITIES = ["private", "public"]` (RN-25). `parseVisibility` recusa `unlisted`.
- `copyQuizContent` (usado por duplicar) recebe a visibilidade da cópia: a do original em `duplicateQuiz`, `"private"` em `duplicateSharedQuiz` (RN-26). **Muda a spec 037, RN-21**; o changelog dela registra.

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `InvalidDeletionRequestError` | `IDENTITY.INVALID_DELETION_REQUEST` | motivo fora da lista, feedback acima de 1.000 |
| `WrongPasswordError` | `IDENTITY.WRONG_PASSWORD` | senha da confirmação errada (RN-38) |
| `EmailMismatchError` | `IDENTITY.EMAIL_MISMATCH` | e-mail digitado não é o da conta (RN-38) |
| `TooManyAttemptsError` | `IDENTITY.TOO_MANY_ATTEMPTS` | 6ª tentativa em 60 s (RN-23) |
| `InvalidProfilePhotoError` | `IDENTITY.INVALID_PHOTO` | chave de outro usuário ou que não existe no storage |
| `CreatorProfileNotFoundError` (`NotFoundError`) | `IDENTITY.PROFILE_NOT_FOUND` | perfil inexistente (RN-27) |
| `PublicQuizNotFoundError` (`NotFoundError`) | `LIBRARY.PUBLIC_QUIZ_NOT_FOUND` | quiz que não é (mais) público (RN-34) |

`UnsupportedMediaTypeError` e `InvalidMediaSizeError` continuam valendo para a foto.

## Aplicação

### Casos de uso

| Caso de uso | Contexto | Entrada | Saída | Portas |
| --- | --- | --- | --- | --- |
| `requestProfilePhotoUpload` | identity | `userId`, `contentType`, `sizeBytes` | URL pré-assinada + `key` | `ObjectStorage`, `IdGenerator` |
| `setProfilePhoto` | identity | `userId`, `key` | `AccountView` | `ProfilePhotoRepository`, `ObjectStorage` (`exists`, `delete` da anterior, RN-11) |
| `removeProfilePhoto` | identity | `userId` | `AccountView` | idem |
| `getAccount` | identity | `userId` | `AccountView { name, email, photoUrl, hasPassword }` | `AccountRepository`, `AccountCredentials`, `ProfilePhotoRepository` |
| `getGenerationAccess` | quiz | `userId` | `{ enabled: false }` ou `{ enabled: true, used, limit, nextFreeInMs }` | `GenerationQuota.usage`, gerador (nulo = desligado), `Clock` |
| `setQuizVisibility` | quiz | `userId`, `quizId`, `visibility` | `QuizDetailsView` | `QuizRepository` (`saveVisibility`, só a coluna) |
| `getCreatorProfile` | library | `viewerId`, `userId` | `CreatorProfileView` | `CreatorProfileQuery`, `ObjectStorage` |
| `getPublicQuiz` | library | `viewerId`, `ownerId`, `quizId` | `PublicQuizView` | `CreatorProfileQuery`, `ObjectStorage` |
| `deleteAccount` | identity | `userId`, `reason`, `feedback`, `confirmation` | `void` | `AccountCredentials`, `AttemptLimiter`, `AccountRepository`, `AccountClosure`, `AccountDeletionFeedbackRepository`, `ObjectStorage`, `Clock`, `IdGenerator` |

`getGenerationAccess` usa o `nextFreeInMs = oldestAt + 24 h − agora` só quando `used > 0` (RN-17).

`deleteAccount`, em ordem. Cada passo pode ser repetido, então uma falha no meio deixa tentar de novo:
1. confere a confirmação:
   - com senha: reserva uma tentativa no `AttemptLimiter` com a chave `account-delete:{userId}`, verifica a senha e solta a reserva se acertou;
   - só com Google: compara o e-mail normalizado com o da conta.
2. guarda o feedback **sem userId** (RN-41);
3. `closure.endGames(userId)`: as partidas e atribuições abertas dos quizzes dele, de qualquer anfitrião (como excluir o quiz para sempre, `quizGames.endGamesOfDeletedQuiz`), e as abertas em que ele é o anfitrião, com `closeGame` + `publishToGame` (RN-39, RN-40);
4. `closure.deleteManagedGroups(userId)`: `deleteGroup` para cada grupo que administra, com os arquivos;
5. `closure.groupFileKeys(userId)`: as chaves dos arquivos das publicações e dos envios dele nos outros grupos (a linha cai em cascata, o arquivo não);
6. `accounts.delete(userId)`: a cascata leva o resto, incluindo sessões e contas;
7. `storage.delete` das chaves do passo 5 e `storage.deletePrefix` de `media/{id}/`, `sources/{id}/` e `profiles/{id}/`.

### Portas novas ou alteradas

```ts
// shared/application/ports/object-storage.ts — alterada
deletePrefix(prefix: string): Promise<void>; // lista e apaga em lotes; prefixo termina em "/"

// shared/application/ports/quiz-share-grants.ts — semântica alterada (doc)
// "pode usar um quiz que não é seu": compartilhado num grupo dele OU público,
// publicado e fora da lixeira (spec 039, RN-33)

// identity/application/ports/
export interface AccountRepository {
	find(userId: string): Promise<{ id: string; name: string; email: string } | null>;
	delete(userId: string): Promise<void>;
}
export interface AccountCredentials {          // adapter em packages/auth
	hasPassword(userId: string): Promise<boolean>;
	verifyPassword(userId: string, password: string): Promise<boolean>;
}
export interface ProfilePhotoRepository {
	keyOf(userId: string): Promise<string | null>;
	save(userId: string, key: string): Promise<string | null>;   // devolve a anterior
	remove(userId: string): Promise<string | null>;
}
export interface AccountDeletionFeedbackRepository {
	add(entry: { id: string; reason: AccountDeletionReason; feedback: string | null; at: Date }): Promise<void>;
}
export interface AccountClosure {               // ligada em container.ts
	endGames(userId: string): Promise<void>;
	deleteManagedGroups(userId: string): Promise<void>;
	groupFileKeys(userId: string): Promise<string[]>;
}

// library/application/ports/creator-profile-query.ts
export interface CreatorProfileQuery {
	creator(userId: string): Promise<{ userId; name; photoKey: string | null } | null>;
	publicQuizzes(ownerId: string): Promise<PublicQuizCard[]>;    // publicados, fora da lixeira, por publishedAt desc
	publicQuiz(ownerId: string, quizId: string): Promise<PublicQuizDetail | null>;
}
// PublicQuizCard { quizId, title, coverImageKey, questionCount, games, participants }
// PublicQuizDetail = card + description + questions (versão em vigor)
```

**Fakes**: `InMemoryAccountRepository`, `FakeAccountCredentials`, `InMemoryProfilePhotoRepository`, `InMemoryAccountDeletionFeedback`, `FakeAccountClosure` (registra as chamadas), `InMemoryCreatorProfileQuery`, e `deletePrefix` no `InMemoryObjectStorage`.

**Fotos nas telas dos grupos (RN-06).** Os read models que já devolvem `{ userId, name }` passam a devolver `photoKey`, com um `left join profile_photo`. Os casos de uso os convertem em `PersonView` com `personView(...)`. São eles:
- `drizzle-group-reads` (cabeçalho e membros);
- `drizzle-group-feed-query` (autor);
- `drizzle-shared-quiz-reads` (dono e quem compartilhou);
- `drizzle-group-assignment-query` (quem atribuiu).

## Adapters

### Banco — `packages/db`

`schema/identity.ts` (novo):
- `profile_photo`: `user_id` (PK, FK `user` com `on delete cascade`), `key` text not null, `updated_at`.
- `account_deletion_feedback`: `id`, `reason` text not null, `feedback` text, `created_at`. **Sem FK nem userId** (RN-41).

`schema/quiz.ts`: o enum `quiz_visibility` passa a `["private", "unlisted", "public"]`. O valor `unlisted` fica **só no tipo do banco**, porque o Postgres não remove valores de enum. Um comentário explica, e o repositório lê qualquer valor que não seja `public` como `private`.

Repositórios:
- `repositories/identity/`: `drizzle-account-repository.ts` (`delete` apaga a linha de `user`), `drizzle-profile-photo-repository.ts` (`save` com `onConflictDoUpdate` devolvendo a chave anterior) e `drizzle-account-deletion-feedback.ts`;
- `repositories/library/drizzle-creator-profile-query.ts`: os números usam a mesma contagem de jogos e participantes de `sharedQuizDetail` (partidas com `questionCount > 0`, de qualquer anfitrião), num subselect por quiz;
- `drizzle-quiz-repository`: `saveVisibility(quizId, visibility)`;
- `drizzle-quiz-share-grants`: `canUse` com `OR` público: `visibility = 'public' and trashed_at is null and published_version is not null`;
- `drizzle-group-*-reads/query` com `photoKey`;
- `drizzle-group-post-repository` e `drizzle-group-upload-repository`: `fileKeysByAuthor(userId, exceptGroupsAdminedBy)`.

### Storage

`s3-object-storage.ts`: `deletePrefix` com `ListObjectsV2` + `DeleteObjects` (até 1.000 por chamada, paginado). Precisa de teste de integração (`*.int.test.ts`, RustFS).

### Auth — `packages/auth`

- `create-auth.ts`:
  - a hook `before` cobre `/update-user`: normaliza e valida `name` como no cadastro e lança `BAD_REQUEST` `IMAGE_NOT_ALLOWED` se `image` vier no corpo;
  - `customRules["/change-password"] = SIGN_IN_RATE_LIMIT`.
- `account-credentials.ts` (novo): `createBetterAuthAccountCredentials(auth)` usa `(await auth.$context).internalAdapter.findAccounts(userId)`. `hasPassword` procura a conta `credential`; `verifyPassword` usa `ctx.password.verify`.

### Real-time

Nada novo. As partidas encerradas pela exclusão publicam o evento de fim que já existe (`publishToGame`, specs 013 e 029).

## API — `packages/api`

Router novo `routers/account.ts`:

| Procedure | Tipo | Auth | Entrada | Saída | Erros |
| --- | --- | --- | --- | --- | --- |
| `account.get` | query | protegida | — | `AccountView` | — |
| `account.requestPhotoUpload` | mutation | protegida | `{ contentType, sizeBytes }` | `{ key, upload }` | `MEDIA.*` |
| `account.setPhoto` | mutation | protegida | `{ key }` | `AccountView` | `IDENTITY.INVALID_PHOTO` |
| `account.removePhoto` | mutation | protegida | — | `AccountView` | — |
| `account.delete` | mutation | protegida | `{ reason: enum, feedback?, confirmation: { kind, password \| email } }` | `void` | `IDENTITY.*` |
| `account.profile` | query | protegida | `{ userId }` | `CreatorProfileView` | `NOT_FOUND` |
| `account.publicQuiz` | query | protegida | `{ userId, quizId }` | `PublicQuizView` | `NOT_FOUND` |

Em `quiz` entram duas procedures:
- `quiz.setVisibility` (mutation, `{ quizId, visibility: enum }`);
- `quiz.assistant.access` (query, `GenerationAccessView`).

`quiz.duplicateShared` e `game.host`/`assign` já aceitam o quiz público pela porta de permissão.

**Container e composition root**:
- `container.ts` liga `accountClosure`:
  - `endGames`: `quizzes.listIdsByOwner(userId, { includeTrashed })` → `quizGames.endGamesOfDeletedQuiz`, mais `games.listOpenByOwner` → `closeGame`;
  - `deleteManagedGroups`: `groups.listManagedIds` → `deleteGroup`;
  - `groupFileKeys`.
- `composition-root.ts` cria `accountCredentials` com a instância do `auth` e os repositórios de `identity`.

## UI — `apps/web` e `packages/ui`

**Rotas** (em `_auth/_shell`):
- `settings.tsx`, `/settings?section=profile|ai|password|delete`, com `section` validada (padrão `profile`);
- `profile.$userId.index.tsx`;
- `profile.$userId.quizzes.$quizId.tsx`.

`activeMainNavLabel` não marca nenhum item nessas rotas (RN-03).

**Componentes**:
- `components/user-menu.tsx` → `components/account/account-menu.tsx`:
  - o gatilho é `<UserAvatar size="md">` com o rótulo do nome;
  - o cabeçalho tem o avatar grande, o nome, o e-mail e Ver perfil;
  - os itens são Configurações e Encerrar sessão (`variant="destructive"`);
  - os dados vêm de `account.get` (RN-01, RN-02).
- `components/groups/user-avatar.tsx` sobe para `components/account/user-avatar.tsx` e recebe `photoUrl?: string | null`: com foto, um `<img>` redondo com `alt=""` (o nome já está ao lado); sem foto, o ícone de hoje. Os 9 usos passam `photoUrl` das views. Há também a variante `shape="square"` (cartão de Seu perfil) e o tamanho `xl`.
- `components/account/`:
  - `settings-layout.tsx`: a coluna de seções, que vira `Tabs` em telas estreitas, no molde de `groups-column`;
  - `profile-section.tsx`: foto, Nome com Alterar via `authClient.updateUser`, E-mail só leitura e Ver perfil;
  - `profile-photo-dialog.tsx`: a máquina de estados pura em `lib/profile-photo-state.ts` (`empty` → `cropping` → `uploading` → `error`), arrastar e soltar, zoom com `Slider` e o recorte desenhado com `lib/image-crop.ts`;
  - `lib/crop-to-square.ts` (canvas → WebP de 512 px).
- `lib/upload-file.ts` ganha `signal` (`AbortSignal`, que chama `request.abort()`) para o Cancelar de RN-10.
- Mais `components/account/`:
  - `ai-access-section.tsx`: `Progress` e `lib/time-until.ts`;
  - `password-section.tsx`: `authClient.changePassword({ revokeOtherSessions: true })`, com os erros mapeados em `lib/auth-error-messages.ts` (`INVALID_PASSWORD` e 429); para quem não tem senha, só o aviso (RN-24);
  - `delete-account-section.tsx` + `delete-account-dialog.tsx`: depois de `account.delete`, `router.invalidate()` e navegação para `/` com o toast (RN-42). A sessão já não existe no servidor.
- `components/profile/`:
  - `creator-profile.tsx`: cabeçalho, números, `Opções de perfil` com Copiar link e Editar perfil, a grade de `PublicQuizCard` e os estados vazio e inexistente;
  - `public-quiz-page.tsx`: reaproveita o miolo de `groups/shared/shared-quiz-page.tsx`, extraído para `components/quiz/quiz-preview.tsx` (topo com o dono, Editar/Duplicar, perguntas com "Mostrar respostas", Organizar ao vivo e Atribuir). Cada página passa o seu "voltar" e o seu estado indisponível.
- **Visibilidade**:
  - `quiz-details-dialog` passa a ter dois `RadioGroup` com as descrições de RN-25;
  - `visibility-badge` e a `Badge` (`packages/ui`) trocam a variante `unlisted` por `public`, na raiz do `cva`;
  - `quiz-list-item` ganha `DropdownMenuSub` "Visibilidade" com `DropdownMenuRadioGroup` e o ⓘ (`Tooltip`), chamando `quiz.setVisibility` por `lib/quiz-mutations.ts` com atualização otimista (RN-25a);
  - `select-quiz-dialog` e `shared-quizzes-tab` mostram Público.
- **Barra lateral**: sai o item Descobrir de `main-nav.tsx` (RN-43).
- **Grupos**: `members-table` (o ⋮ "Ver perfil" vira link para `/profile/$userId`).
- `/design-system`: as variantes novas do avatar e da badge.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | componente | menu mostra avatar, nome, e-mail, Ver perfil, Configurações, Encerrar sessão | `apps/web/src/components/account/account-menu.test.tsx` |
| CA-02 | E2E | encerrar sessão leva à página pública | `apps/web/e2e/account.spec.ts` |
| CA-03 | componente | seções e seção do endereço | `components/account/settings-layout.test.tsx` |
| CA-04 | core + componente + E2E | `setProfilePhoto` guarda a chave; diálogo vai de vazio a recorte e enviando; foto no botão sem recarregar | `identity/application/profile-photo.test.ts`, `profile-photo-dialog.test.tsx`, `e2e/account.spec.ts` |
| CA-05 | componente | Carregar indisponível sem imagem; Cancelar fecha | `profile-photo-dialog.test.tsx` |
| CA-06 | core + componente | formato e tamanho recusados no cliente e em `requestProfilePhotoUpload`; chave de outro usuário em `setPhoto` | `profile-photo.test.ts`, `profile-photo-dialog.test.tsx` |
| CA-07 | unit + componente | `uploadFile` aborta com o sinal; Cancelar volta ao recorte | `lib/upload-file.test.ts`, `profile-photo-dialog.test.tsx` |
| CA-08 | core | trocar apaga a anterior; remover apaga e devolve `photoUrl: null` | `profile-photo.test.ts` |
| CA-09 | core + PGlite | views do grupo trazem `photoUrl`; read models fazem o join | `groups/application/*-photo.test.ts`, `drizzle-group-reads.test.ts` |
| CA-10 | auth (PGlite) | usuário do Google com `image` tem `getAccount().photoUrl === null` | `packages/api/src/routers/account.test.ts` |
| CA-11 | auth + componente | `/update-user` salva nome normalizado; Alterar desabilitado até mudar | `packages/auth/src/create-auth.test.ts`, `profile-section.test.tsx` |
| CA-12 | auth + componente | nome de 1 e 51 recusado, espaços tirados | `create-auth.test.ts`, `profile-section.test.tsx` |
| CA-13 | componente | e-mail sem Alterar, só leitura | `profile-section.test.tsx` |
| CA-14 | core + componente | uso, limite e próxima livre; cota esgotada | `quiz/application/get-generation-access.test.ts`, `ai-access-section.test.tsx` |
| CA-15 | core + componente | sem gerador → `enabled: false` | idem |
| CA-16 | auth (PGlite) + E2E | `/change-password` com `revokeOtherSessions` encerra a outra sessão; entra com a nova | `create-auth.test.ts`, `e2e/account.spec.ts` |
| CA-17 | componente + auth | mensagens de campo; 6ª tentativa → 429 | `password-section.test.tsx`, `create-auth.test.ts` |
| CA-18 | auth + componente | `hasPassword` falso para conta Google; aviso sem formulário | `account-credentials.test.ts`, `password-section.test.tsx` |
| CA-19 | core + componente | `setQuizVisibility("public")`; badge "Público" | `quiz/application/set-quiz-visibility.test.ts`, `visibility-badge.test.tsx` |
| CA-19a | componente | submenu Visibilidade com ⓘ e troca otimista | `quiz-list-item.test.tsx` |
| CA-19b | PGlite | linha `unlisted` lida como `private`; `parseVisibility("unlisted")` recusa | `drizzle-quiz-repository.test.ts`, `quiz-details.test.ts` |
| CA-20 | PGlite + core | perfil só com o publicado, público e fora da lixeira; jogos e participantes | `drizzle-creator-profile-query.test.ts`, `library/application/get-creator-profile.test.ts` |
| CA-21 | componente | textos do vazio para dono e visitante | `creator-profile.test.tsx` |
| CA-22 | componente | Opções de perfil por papel; Copiar link avisa | `creator-profile.test.tsx` |
| CA-23 | componente | "Ver perfil" do membro é link | `members-table.test.tsx` |
| CA-24 | API + E2E | perfil inexistente → `NOT_FOUND`; sem sessão vai a entrar e volta | `routers/account.test.ts`, `e2e/account.spec.ts` |
| CA-25 | PGlite + API + E2E | grants aceitam público; visitante organiza ao vivo; cópia Privada | `drizzle-quiz-share-grants.test.ts`, `quiz/application/duplicate-shared-quiz.test.ts`, `e2e/public-profile.spec.ts` |
| CA-26 | core + componente | quiz que virou privado → `PUBLIC_QUIZ_NOT_FOUND`; tela indisponível; cópia fica | `get-public-quiz.test.ts`, `public-quiz-page.test.tsx` |
| CA-27 | componente | formulário: motivos na ordem, botão, 1.000 caracteres, Cancelar | `delete-account-section.test.tsx` |
| CA-28 | core + API (PGlite) + E2E | ordem dos passos e o que cada um apaga; feedback sem userId; participante vê fim; não entra mais | `identity/application/delete-account.test.ts`, `routers/account.test.ts`, `e2e/account.spec.ts` |
| CA-29 | core + componente | senha errada, limite, e-mail diferente | `delete-account.test.ts`, `delete-account-dialog.test.tsx` |
| CA-30 | API (PGlite) | relatório do membro continua depois da exclusão do dono | `routers/account.test.ts` |
| CA-31 | auth (PGlite) | cadastro com o mesmo e-mail começa vazio | `create-auth.test.ts` |
| CA-32 | componente | barra lateral: Início, Biblioteca, Relatórios, Grupos | `main-nav.test.tsx` |

`deletePrefix` também ganha um teste de integração no adapter: `packages/storage/src/s3-object-storage.int.test.ts`.

## Dados e migração

- `pnpm db:generate` para `profile_photo`, `account_deletion_feedback` e o valor novo `public` no enum.
- O SQL da migração ganha, à mão, `UPDATE quiz SET visibility = 'private' WHERE visibility = 'unlisted';` (RN-25, CA-19b), depois do `ALTER TYPE … ADD VALUE`. O update usa um valor antigo, então não esbarra na regra do Postgres sobre usar um valor novo na mesma transação.
- **Compatível com o código anterior** (o deploy aplica a migração antes do build): o código antigo nunca encontra `public`, e Privado já existe para ele.
- A cota (`generation_usage`) e os dados das partidas já existem; nada a preencher.

## Riscos e decisões

- **ADR 0019 (proposto) — Conta, perfil e exclusão.** Decide:
  - a foto recortada no navegador, em arquivo próprio e prefixo `profiles/`, e não `user.image`;
  - Público pela porta `QuizShareGrants`;
  - a exclusão como orquestração de `identity` sobre a cascata do banco, com `deletePrefix` no storage;
  - o nome e a senha pelo Better Auth, com as regras do core nas hooks.
- **A exclusão não é uma transação só**: o storage e o real-time ficam fora do banco. A ordem deixa o pior caso seguro, porque a linha de `user` só some depois de partidas e grupos, e cada passo pode ser repetido. Uma falha nos arquivos depois da linha deixa lixo no bucket, que não está ligado a ninguém; isso fica registrado como risco aceito.
- **A cascata de `game.owner_id`** apaga as partidas e os relatórios do criador, como a spec quer. As partidas de outros com os quizzes dele não têm FK para o quiz (spec 015) e ficam.
- **`/update-user` pode receber `image`** de um cliente qualquer. A hook recusa, e a coluna nunca é lida.
- **Uma URL de foto por pessoa em toda view de grupo**: são até centenas de chamadas a `getPublicUrl`, que é só concatenação de texto, sem custo de rede.
- **GIF vira estático** na foto (só a foto; capa e perguntas não mudam). Registrar no changelog da spec.
- **`/profile/$userId` expõe o id da conta na URL**. O id já aparece nos grupos (spec 034), e o e-mail nunca aparece no perfil.
- A spec 037, RN-21 (cópia mantém a visibilidade) muda para quizzes de outra pessoa; atualizar o changelog da 037 na implementação.

## Desvios na implementação

- **Fotos nos grupos**: em vez de um `join` com `profile_photo` em cada leitura dos grupos, uma porta compartilhada `ProfilePhotoKeys.keysOf(userIds)` (que o `ProfilePhotoRepository` de identity estende) e `loadPhotoUrls` (`shared/application/person-view.ts`). Os seis casos de uso dos grupos põem `photoUrl` nas pessoas depois de ler.
- **Acesso à IA**: sem `getGenerationAccess` nem `quiz.assistant.access`. `getAssistantStatus` (spec 027) ganhou `used` e `nextFreeInMs`, e a seção lê `quiz.assistant.status`.
- **`setProfilePhoto`/`removeProfilePhoto`** devolvem `{ photoUrl }`; a tela recarrega `account.get`.
- **Erros do perfil** ficam em `library` (`LIBRARY.PROFILE_NOT_FOUND`, `LIBRARY.PUBLIC_QUIZ_NOT_FOUND`); identity tem os seus para a conta.
- **Página do quiz público**: reaproveita `SharedQuizPage` (o tipo aceita `PublicQuizPageData`, sem "Compartilhado por") em vez de extrair um `quiz-preview`.
- **Leituras para excluir a conta**: `QuizRepository.listIdsByOwner`, `GameRepository.listUnendedByOwner`, `GroupPostRepository.fileKeysByAuthor` e `GroupUploadRepository.uploadKeysOfUser`; a contagem de jogos saiu de `drizzle-shared-quiz-reads` para `repositories/game/quiz-game-counts.ts`, usada também pelo perfil.
