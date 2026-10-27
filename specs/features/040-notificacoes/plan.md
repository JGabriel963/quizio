---
spec: "040"
status: approved # draft | approved
---

# Plano técnico — 040 Notificações

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0020](../../../docs/adr/0020-notificacoes-como-leitura.md)

## Abordagem

**Uma notificação não é guardada: é uma leitura do que já existe nos grupos**, como o relatório é uma leitura da partida (ADR 0010). O banco já tem tudo:
- as publicações dos grupos (`group_post`), com autor, tipo e data;
- os membros, com a data de entrada (`group_member.joined_at`).

As notificações de uma pessoa são a união de duas leituras:
- **publicações dos outros** nos grupos de que ela é membro, feitas **depois da entrada dela** (RN-02 a RN-04, RN-08);
- **entradas de membros** nos grupos que ela administra (RN-05).

Assim, a cascata do banco cuida do RN-18 sem código nenhum: publicação excluída, saída do grupo, grupo excluído e conta excluída (spec 039) somem da leitura porque as linhas somem.

**Só o que não deixa rastro é guardado.** Ser removido de um grupo e o grupo ser excluído (RN-06) apagam justamente as linhas que a leitura usaria. Por isso viram um **aviso (`GroupNotice`)**, uma linha com o nome do grupo copiado, sem chave para o grupo.

**Lido e visto são marcas por pessoa, à parte.** São duas tabelas:
- `notification_inbox`: `seen_at`, quando abriu o painel pela última vez (RN-10), e `read_all_at`, de "Marcar todas como lidas" (RN-15);
- `notification_read`: uma linha por notificação aberta (RN-17).

Uma notificação está lida quando tem a sua linha ou quando é anterior ao `read_all_at`. Cada notificação tem um **id estável** derivado da origem:
- `post:{postId}`;
- `join:{groupId}:{userId}:{joinedAt}`, para que reentrar gere outra;
- `notice:{id}`.

**Tempo real é só uma dica, como no jogo.** Cada pessoa tem um **canal próprio de caixa de entrada**, cujo nome é um HMAC do id da conta com o segredo do Pusher (ADR 0020). Assim ninguém adivinha o canal de outra pessoa, mesmo que o id apareça no endereço do perfil, e não é preciso um endpoint de autorização de canal privado.

Os casos de uso dos grupos avisam, **depois de gravar e sem bloquear**, quem tem novidade. O evento `inbox-changed` vai sem dados. A tela pede o resumo de novo, e também a cada 60 s e ao voltar o foco, caso a dica se perca.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Notificação | `Notification` (`NotificationKind`: `post` \| `joined` \| `removed` \| `groupDeleted`) | sim |
| Aviso do grupo | `GroupNotice` (`group_notice`) | sim |
| Caixa de entrada | `NotificationInbox` (`notification_inbox`: `seenAt`, `readAllAt`) | sim |
| Canal da caixa de entrada | `InboxChannels.channelOf(userId)`, evento `inbox-changed` | sim |
| Sinal para a caixa | `GroupInbox` (porta dos grupos) | sim |
| Página da publicação | `getGroupPost` / `GroupPostPage` | sim |

## Domínio — `packages/core/src/notifications/domain` (contexto novo)

`notifications` é um contexto próprio, porque deve receber outras origens depois (pergunta em aberto da spec). Ele lê os grupos pela sua porta de consulta e reaproveita os tipos de valor (`GroupPostKind`), nunca as funções, como `reports` faz com `game`.

**`notification.ts`**:
```ts
export type NotificationSource =
	| { kind: "post"; postId: string; postKind: GroupPostKind }   // RN-02 a RN-04
	| { kind: "joined" }                                           // RN-05
	| { kind: "removed" } | { kind: "groupDeleted" };             // RN-06
export interface NotificationRecord {
	id: string;              // post:… | join:… | notice:…
	at: Date;
	source: NotificationSource;
	actor: { userId: string; name: string } | null;   // null nos avisos
	group: { id: string | null; name: string };       // id null nos avisos
	readAt: Date | null;     // da linha de notification_read
}
export const NOTIFICATIONS_PAGE_SIZE = 20;                     // RN-13
export function isRead(n, readAllAt: Date | null): boolean;    // RN-13, RN-15
export function isKept(n, now, readRetentionMs): boolean;      // RN-21: lida há mais do prazo some
export function hasNews(latestAt: Date | null, seenAt: Date | null): boolean; // RN-10
export function postHeadlineKind(postKind, sharedCount?): "post" | "quiz" | "quizzes" | "assignment"; // RN-02 a RN-04
```
`message` → `post`; `quizShare` → `quiz`; `quizzesShare` → `quizzes`; `assignment` → `assignment`. Os textos em português ficam na web.

**`notification-errors.ts`**: não há erro de domínio novo. Marcar como lida uma notificação que não existe (ou de outra pessoa) é inofensivo e não revela nada: o id não leva a nenhum dado.

## Aplicação — `packages/core/src/notifications/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Portas |
| --- | --- | --- | --- |
| `getInboxSummary` | `userId` | `{ hasNews, channel }` | `NotificationQuery`, `NotificationInboxRepository`, `InboxChannels` |
| `listNotifications` | `userId`, `limit` | `{ items: NotificationView[], hasMore }` | `NotificationQuery`, `NotificationInboxRepository`, `ProfilePhotoKeys`, `ObjectStorage`, `Clock`, `notificationSettings` |
| `markInboxSeen` | `userId` | `void` | `NotificationInboxRepository`, `Clock` |
| `markNotificationRead` | `userId`, `notificationId` | `void` | `NotificationInboxRepository`, `Clock` |
| `markAllNotificationsRead` | `userId` | `void` | `NotificationInboxRepository`, `Clock` |

`NotificationView` tem `id`, `kind`, `headline`, `actor` (`PersonView`, com a foto da spec 039) ou `null`, `group` (`{ id, name }`), `postId`, `read`, `section: "new" | "earlier"` e `ageMs` (o tempo vai como duração, nunca como instante, como nos jogos).

### Avisos dos grupos — `packages/core/src/groups/application`

Uma porta nova dos grupos, `GroupInbox`, é implementada no container sobre o realtime e o repositório de avisos. Os casos de uso a chamam **depois de gravar**, em melhor esforço, como `publishToGame`:

| Caso de uso existente | Chamada |
| --- | --- |
| `createGroupPost` (texto, imagem, PDF, atividade) | `signal(membros − autor)` |
| `shareQuizzesInGroup` | `signal(membros − quem compartilhou)` |
| `assignInGroup`, `assignToGroups` | `signal(membros − quem atribuiu)` em cada grupo |
| `acceptGroupInvite` | `signal([admin])` |
| `removeGroupMember` | `noticeRemoved(removido, nome do grupo, agora)` |
| `deleteGroup` | `noticeDeleted(membros − admin, nome do grupo, agora)`, **antes** de apagar (precisa da lista) |

`leaveGroup` não avisa ninguém (RN-06).

### Portas novas

```ts
// groups/application/ports/group-inbox.ts
export interface GroupInbox {
	signal(userIds: readonly string[]): Promise<void>;
	noticeRemoved(userId: string, groupName: string, at: Date): Promise<void>;
	noticeDeleted(userIds: readonly string[], groupName: string, at: Date): Promise<void>;
}

// notifications/application/ports/
export interface NotificationQuery {
	/** Mais novas primeiro; `limit + 1` diz se há mais. */
	list(userId: string, limit: number): Promise<NotificationRecord[]>;
	latestAt(userId: string): Promise<Date | null>;  // a mais nova de outra pessoa
}
export interface NotificationInboxRepository {
	find(userId: string): Promise<{ seenAt: Date | null; readAllAt: Date | null }>;
	markSeen(userId: string, at: Date): Promise<void>;
	markRead(userId: string, notificationId: string, at: Date): Promise<void>;  // idempotente
	markAllRead(userId: string, at: Date): Promise<void>;
}
export interface GroupNoticeRepository {
	add(notices: readonly GroupNotice[]): Promise<void>;
}
export interface InboxChannels {
	channelOf(userId: string): string;
}
```

**Fakes**: `RecordingGroupInbox` (registra as chamadas), `InMemoryNotificationQuery` (lê as `InMemoryGroupStore` e os avisos, para os testes de API), `InMemoryNotificationInbox`, `InMemoryGroupNoticeRepository` e `FixedInboxChannels` (`inbox-${userId}`).

## Adapters

### Banco — `packages/db`

`schema/notifications.ts` (novo):
- `notification_inbox`: `user_id` PK, FK `user` com cascata; `seen_at`; `read_all_at`.
- `notification_read`: `user_id` (FK com cascata), `notification_id` text, `read_at`; PK (`user_id`, `notification_id`). Uma linha que sobra de uma publicação excluída não aponta para nada e não aparece.
- `group_notice`: `id`; `user_id` (FK com cascata); `kind` (`removed` \| `groupDeleted`); `group_name`; `created_at`; índice (`user_id`, `created_at desc`). **Sem FK para `group`** (RN-06).

`repositories/notifications/drizzle-notification-query.ts` faz uma **`union all` em SQL** de três partes, ordenada por `at desc` com `limit`:
1. publicações: `group_post` ⋈ `group_member` (eu, `created_at >= joined_at`, `author_id <> eu`), mais `group` (nome) e `user` (autor);
2. entradas: `group_member` (outro, `role = 'member'`) ⋈ `group_member` (eu, `role = 'admin'`), mais `group` e `user`;
3. avisos: `group_notice` (eu).

Tudo com `left join notification_read` para o `readAt`. Os índices que existem bastam: `group_post_feed_idx` (grupo, data), `group_member_user_idx` e a PK de `group_member`.

`latestAt` é o `max` das três partes.

Repositórios: `drizzle-notification-inbox.ts` (upsert de `seen_at` e `read_all_at`; `insert … on conflict do nothing` em `markRead`) e `drizzle-group-notice-repository.ts`.

Migração: `pnpm db:generate`. Só tabelas novas, compatível com o código anterior.

### Real-time — `packages/realtime`

| Canal | Evento | Payload | Publicado por | Assinado por |
| --- | --- | --- | --- | --- |
| `inbox-{hmac(userId)}` | `inbox-changed` | `{}` | `GroupInbox` (container), após os casos de uso da tabela acima | o sino (`NotificationBell`) |

`hmac-inbox-channels.ts`: `createHmacInboxChannels(secret)` (`node:crypto`, HMAC-SHA256 do id, 32 hex), com o `PUSHER_SECRET`. A composition root o liga. O container implementa `GroupInbox.signal` com `realtime.publishMany` (lotes de 10, como o adapter já faz).

## API — `packages/api`

Router novo, `routers/notification.ts`:

| Procedure | Tipo | Entrada | Saída |
| --- | --- | --- | --- |
| `notification.summary` | query | — | `{ hasNews, channel }` |
| `notification.list` | query | `{ limit?: number }` (20, 40, …) | `{ items, hasMore }` |
| `notification.seen` | mutation | — | `void` |
| `notification.read` | mutation | `{ id: string }` | `void` |
| `notification.readAll` | mutation | — | `void` |

Mais `group.post.get` (`{ groupId, postId }` → `GroupPostView`, com `requireMembership` e `GroupPostNotFoundError`), num caso de uso `getGroupPost` que usa `postViewsOf`.

**Container**:
- os cinco casos de uso de `notifications` e `getGroupPost`;
- o `groupInbox`:
  - `signal`: `publishMany` no canal de cada um;
  - os avisos: `groupNotices.add` e depois `signal`;
- `notificationSettings: { readRetentionDays }`.

**Composition root**: `NOTIFICATION_READ_RETENTION_DAYS` (padrão 90, de 1 a 365), validada em `packages/env/src/server.ts`, mais os repositórios e `createHmacInboxChannels(env.PUSHER_SECRET)`.

## UI — `apps/web` e `packages/ui`

- **`packages/ui`: primitivo `Popover`** (shadcn base-lyra sobre `@base-ui/react`, convertido ao estilo do projeto). O painel não é um menu: tem lista, rolagem e um ⋮ próprio.
- `components/notifications/notification-bell.tsx`:
  - o sino (`BellIcon`) com o ponto vermelho, `aria-label` "Notificações" ou "Notificações, há novidades" (RN-09, RN-10);
  - abrir chama `notification.seen` e invalida o resumo;
  - assina `useRealtimeEvent(channel, "inbox-changed", …)` e faz `refetchInterval: 60_000`.
- `notification-panel.tsx`: recebe as notificações e as ações por props.
  - cabeçalho "Notificações" e ⋮ "Marcar todas como lidas";
  - seções "Novo" e "Anteriores";
  - cada item é um `<button>` com `UserAvatar` e a marca de grupo (`UsersIcon` num círculo branco), o texto e o tempo de `lib/format-relative-time.ts`;
  - não lidas com fundo `bg-primary/10`, ponto e tempo em `text-primary`;
  - "Mostrar mais" pelo fim da rolagem (`IntersectionObserver`) ou um botão de reserva;
  - estados vazio, carregando e erro (RN-12 a RN-16);
  - em telas estreitas, o `Popover` ocupa a largura (`w-screen sm:w-96`).
- `lib/notification-labels.ts` (puro): o texto de cada `kind`/`headline` (RN-02 a RN-06) e para onde vai (`linkOf`: publicação, membros ou nada).
- `top-bar.tsx`: o sino depois da `AccountMenu` (RN-09), só com sessão.
- Rota `routes/_auth/_shell/groups.$groupId.posts.$postId.tsx`: voltar à aba Atividade, a `GroupPost` de sempre (com curtir, ⋮ e anexo) e o estado "Esta publicação não está mais disponível." (RN-19, RN-20). Excluir pela página volta ao mural.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | PGlite + core | publicação de outro aparece para os membros; a própria não | `drizzle-notification-query.test.ts`, `notifications/application/list-notifications.test.ts` |
| CA-02 | core + unit | `postHeadlineKind` para `quizShare` e `quizzesShare`; textos | `notification.test.ts`, `lib/notification-labels.test.ts` |
| CA-03 | PGlite | publicação de atribuição para os membros, não para quem atribuiu | `drizzle-notification-query.test.ts` |
| CA-04 | PGlite + componente | entrada só para o administrador; leva a Membros | `drizzle-notification-query.test.ts`, `notification-panel.test.tsx` |
| CA-05 | core + PGlite | `removeGroupMember` e `deleteGroup` gravam avisos; publicações do grupo excluído somem | `groups/application/group-inbox-signals.test.ts`, `drizzle-notification-query.test.ts` |
| CA-06 | PGlite | publicação anterior à entrada não aparece | `drizzle-notification-query.test.ts` |
| CA-07 | core + componente | `hasNews` antes e depois de `seen`; ponto some ao abrir; continua "Novo" | `get-inbox-summary.test.ts`, `notification-bell.test.tsx` |
| CA-08 | core + componente + E2E | abrir marca como lida e navega para a publicação | `mark-notification-read.test.ts`, `notification-panel.test.tsx`, `e2e/notifications.spec.ts` |
| CA-09 | core + componente | "Marcar todas como lidas" e o item indisponível | `mark-all-notifications-read.test.ts`, `notification-panel.test.tsx` |
| CA-10 | componente | textos do vazio | `notification-panel.test.tsx` |
| CA-11 | core + componente | 20 e `hasMore`; o fim da lista pede mais | `list-notifications.test.ts`, `notification-panel.test.tsx` |
| CA-12 | PGlite + API + componente | publicação excluída some; `group.post.get` é `NOT_FOUND`; tela indisponível | `drizzle-notification-query.test.ts`, `routers/notification.test.ts`, `group-post-page.test.tsx` |
| CA-13 | API | quem não é membro recebe `NOT_FOUND` na publicação | `routers/group-posts.test.ts` |
| CA-14 | core | `actor.photoUrl` com e sem foto | `list-notifications.test.ts` |
| CA-15 | core | lida há 91 dias some; não lida fica | `notification.test.ts` (`isKept`) |
| CA-16 | E2E (mobile) | painel na largura da tela, fecha com o sino | `e2e/notifications.spec.ts` |

E mais:
- o sinal em tempo real: `group-inbox-signals.test.ts` verifica quem cada caso de uso avisa (`RecordingGroupInbox`);
- `hmac-inbox-channels.test.ts`: o canal é estável e não deixa reconstruir o id.

## Dados e migração

- `pnpm db:generate`: três tabelas novas, sem backfill.
- Na entrega, as publicações que já existem nos grupos aparecem como "Novo" (não há `seen_at` nem lidas). **Decisão**: a migração cria `notification_inbox` para cada usuário existente com `read_all_at = now()` e `seen_at = now()`, para ninguém receber de uma vez o histórico como novidade.

## Riscos e decisões

- **ADR 0020 — Notificações como leitura.** Decide:
  - a leitura em vez do fan-out de linhas;
  - os avisos guardados só para remoção e exclusão;
  - o canal por pessoa com nome HMAC, sem endpoint de autorização.
- **A consulta cresce com os grupos da pessoa.** O `union all` usa os índices que existem e o `limit`. Para a escala do Quizio (turmas e equipes) fica bem abaixo de um fan-out. Se um dia pesar, o ADR prevê materializar.
- **O sinal é melhor esforço.** Uma falha no Pusher não desfaz a publicação. A tela reconsulta a cada 60 s e ao voltar o foco (RN-11 fica "em poucos segundos" quando o evento chega, e no pior caso em um minuto).
- **`deleteGroup` precisa gravar os avisos antes de apagar o grupo.** Se falhar entre os dois, o grupo continua existindo e os avisos ficam "a mais" (o grupo ainda está lá); repetir a exclusão grava de novo. Para não duplicar, o id do aviso de exclusão é derivado de (grupo, membro).
- **Ids derivados** (`post:`, `join:`) não validados ao marcar como lida: não revelam nada e o pior caso é uma linha inútil em `notification_read`.

## Desvios na implementação

- **Consulta**: em vez de um `union all` em SQL, três consultas pelo query builder (publicações, entradas e avisos), cada uma já filtrada pela regra de RN-21, ordenada e limitada, juntadas e cortadas no adapter. O resultado é o mesmo, e a tipagem fica com o Drizzle.
- **`GroupFeedQuery.findPostRecord`**: o nome evita conflito com `GroupPostRepository.findPost`, que a mesma `InMemoryGroupStore` implementa. A procedure é `group.posts.get`.
- **`GroupInbox.noticeDeleted`** recebe o id do grupo, para derivar o id do aviso (`deleted:{grupo}:{membro}`) e não duplicar quando a exclusão é repetida.
- **O sino** fica dentro do ramo com sessão de `AccountMenu`, que já faz a consulta da conta; assim os testes do `AppShell` seguem sem provedor de tRPC.
- **Largura do painel**: `--available-width` do Base UI em vez de `100vw`, que conta a barra de rolagem e fazia a página rolar de lado.
- A amostra do `Popover` em `/design-system` ficou de fora.
