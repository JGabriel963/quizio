---
spec: "040"
status: done # todo | in-progress | done
---

# Tarefas — 040 Notificações

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0020](../../../docs/adr/0020-notificacoes-como-leitura.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.
>
> O realtime ganha um adapter novo (`hmac-inbox-channels`), testado como unidade: ele não fala com o Pusher. O envio aos canais usa o `publishMany` que já tem `*.int.test.ts`.

## Fase 1 — Domínio

- [x] **T01** `core/notifications` — notificação, lida, guardada e novidade
  - Teste: `notifications/domain/notification.test.ts`:
    - "isRead: read row or before readAllAt"
    - "isKept: a read notification older than the retention goes, an unread one stays"
    - "hasNews: something newer than seenAt, or anything when never seen"
    - "postHeadlineKind: message is post, quizShare quiz, quizzesShare quizzes, assignment assignment"
    - "notification ids: post:, join: with the join time, notice:"
  - Implementar: `notification.ts` (`NotificationSource`, `NotificationRecord`, `NOTIFICATIONS_PAGE_SIZE`, `isRead`, `isKept`, `hasNews`, `postHeadlineKind`, `notificationIdOf`)
  - Cobre: CA-02, CA-07, CA-09, CA-15 · RN-02 a RN-06, RN-10, RN-13, RN-15, RN-21

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T02** `core/notifications` — listar e resumir
  - Teste: `notifications/application/list-notifications.test.ts`:
    - "lists newest first with headline, group, actor photo and age"
    - "splits Novo and Anteriores"
    - "returns 20 and tells there is more"
    - "drops read ones past the retention"
  - Teste: `notifications/application/get-inbox-summary.test.ts`:
    - "hasNews until the panel is seen"
    - "returns the user's inbox channel"
  - Implementar: portas `NotificationQuery`, `NotificationInboxRepository` e `InboxChannels`; fakes `InMemoryNotificationQuery` (registros dados à mão), `InMemoryNotificationInbox` e `FixedInboxChannels`; `list-notifications.ts` (`NotificationView`, com `PersonView` por `loadPhotoUrls`) e `get-inbox-summary.ts`
  - Cobre: CA-01, CA-07, CA-11, CA-14, CA-15 · RN-10, RN-13, RN-14, RN-21

- [x] **T03** [P] `core/notifications` — marcar visto e lido
  - Teste: `notifications/application/mark-notifications.test.ts`:
    - "markInboxSeen stores now"
    - "markNotificationRead is idempotent"
    - "markAllNotificationsRead sets readAllAt"
  - Implementar: `mark-inbox-seen.ts`, `mark-notification-read.ts` e `mark-all-notifications-read.ts`
  - Cobre: CA-07, CA-08, CA-09 · RN-10, RN-15, RN-17

- [x] **T04** `core/groups` — os grupos avisam a caixa de entrada
  - Teste: `groups/application/group-inbox-signals.test.ts`:
    - "a message post signals every member but its author"
    - "sharing and assigning signal the other members"
    - "assigning to several groups signals each group"
    - "accepting the invite signals the admin"
    - "removing a member leaves a removed notice for them"
    - "deleting the group leaves a groupDeleted notice for every member but the admin, before the rows go"
    - "leaving the group signals nobody"
    - "a failing inbox does not undo the write"
  - Implementar: porta `GroupInbox` e `RecordingGroupInbox`; `groupInbox` nos deps dos grupos (`groupsTestDeps`); as chamadas em `createGroupPost`, `shareQuizzesInGroup`, `assignInGroup`, `assignToGroups`, `acceptGroupInvite`, `removeGroupMember` e `deleteGroup` (em melhor esforço: erro registrado e ignorado)
  - Cobre: CA-01, CA-02, CA-03, CA-04, CA-05, CA-07 · RN-01 a RN-06, RN-11

- [x] **T05** [P] `core/groups` — página da publicação
  - Teste: `groups/application/get-group-post.test.ts`:
    - "returns the post as the feed shows it"
    - "a deleted post is GROUP.POST_NOT_FOUND"
    - "somebody outside the group gets GROUP.NOT_FOUND"
  - Implementar: `get-group-post.ts` sobre `postViewsOf`, mais `findPostRecord` na porta do feed (com fake)
  - Cobre: CA-08, CA-12, CA-13 · RN-19, RN-20

## Fase 3 — Adapters

- [x] **T06** `packages/db` — schema e migração
  - Teste: `repositories/notifications/drizzle-notification-inbox.test.ts`:
    - "markSeen and markAllRead upsert one row per user"
    - "markRead twice keeps one row"
    - "group notices are stored without a group key and go with the user"
  - Implementar:
    - `schema/notifications.ts` (`notification_inbox`, `notification_read`, `group_notice`);
    - `drizzle-notification-inbox.ts` e `drizzle-group-notice-repository.ts`;
    - `pnpm db:generate`, com o `INSERT INTO notification_inbox … SELECT id, now(), now() FROM "user"` à mão no SQL gerado (plano, "Dados e migração");
    - SQL da migração aplicado no banco local, como na spec 039.
  - Cobre: CA-05, CA-07, CA-09 · RN-06, RN-10, RN-15

- [x] **T07** `packages/db` — consulta das notificações
  - Teste: `repositories/notifications/drizzle-notification-query.test.ts`:
    - "a member gets the others' posts after joining, not their own nor earlier ones"
    - "an assignment post and a quiz share carry their post kind"
    - "only the admin gets the members' joins"
    - "removed and groupDeleted notices come with the copied group name"
    - "a deleted post, a left group and a deleted group drop their notifications"
    - "readAt comes from the read rows; limit + 1 pages; latestAt is the newest"
  - Implementar: `drizzle-notification-query.ts` (`union all` das três partes, `left join notification_read`)
  - Cobre: CA-01, CA-03, CA-04, CA-05, CA-06, CA-12 · RN-02 a RN-08, RN-18

- [x] **T08** [P] `packages/realtime` — canal da caixa de entrada
  - Teste: `hmac-inbox-channels.test.ts`:
    - "the same user gets the same channel"
    - "the channel is not the user id and differs by secret"
  - Implementar: `hmac-inbox-channels.ts` (`node:crypto`, prefixo `inbox-`)
  - Cobre: CA-07 · RN-11, RN-22

## Fase 4 — API

- [x] **T09** `packages/api` — router `notification`, `group.post.get` e a ligação
  - Teste: `routers/notification.test.ts`:
    - "summary, list, seen, read and readAll for the session's user"
    - "a post by Bruno signals Ana's inbox channel"
    - "requires a session"
  - Teste: `routers/group-posts.test.ts`:
    - "post.get returns a member's post"
    - "post.get is NOT_FOUND outside the group and after deletion"
  - Implementar:
    - `routers/notification.ts` e `group.post.get`;
    - no container: os casos de uso, o `groupInbox` (`publishMany` em lotes, avisos e depois sinal) e `notificationSettings`;
    - na composition root: os repositórios, `createHmacInboxChannels(env.PUSHER_SECRET)` e `NOTIFICATION_READ_RETENTION_DAYS` (padrão 90, de 1 a 365) em `packages/env/src/server.ts` e `.env.example`;
    - no test context: as notificações sobre a `InMemoryGroupStore`.
  - Cobre: CA-01, CA-08, CA-12, CA-13 · RN-11, RN-17, RN-19, RN-21, RN-22

## Fase 5 — UI

- [x] **T10** `packages/ui` — primitivo `Popover`
  - Teste: `components/popover.test.tsx` › "opens from its trigger, closes with Escape and outside clicks"
  - Implementar: `popover.tsx` (shadcn base-lyra sobre `@base-ui/react`, no estilo do projeto, com `data-slot`), mais o exemplo em `/design-system`
  - Cobre: CA-16 · RN-12

- [x] **T11** `apps/web` — textos e destinos
  - Teste: `lib/notification-labels.test.ts`:
    - "texts of a post, a quiz, quizzes, an assignment, a join, a removal and a deletion"
    - "where each one goes: the post page, the members, nowhere"
  - Implementar: `lib/notification-labels.ts`
  - Cobre: CA-01 a CA-05 · RN-02 a RN-06, RN-17

- [x] **T12** `apps/web` — painel
  - Teste: `components/notifications/notification-panel.test.tsx`:
    - "Novo and Anteriores, unread with the dot and blue time, read in gray"
    - "the actor's photo with the group mark; the group icon for notices"
    - "opening one reads it and calls onOpen with its destination; a notice only reads"
    - "Marcar todas como lidas, disabled without unread"
    - "empty, loading and error with Tentar de novo"
    - "the end of the list asks for more"
  - Implementar: `notification-panel.tsx`
  - Cobre: CA-04, CA-07, CA-08, CA-09, CA-10, CA-11, CA-14 · RN-12 a RN-17

- [x] **T13** `apps/web` — sino na barra superior
  - Teste: `components/notifications/notification-bell.test.tsx`:
    - "the red dot with hasNews and the label Notificações, há novidades"
    - "opening marks seen and the dot goes while the items stay new"
    - "an inbox-changed event refetches"
  - Implementar: `notification-bell.tsx` (`Popover`, `notification.summary` com `refetchInterval: 60_000` e `refetchOnWindowFocus`, `useRealtimeEvent`, a lista com `limit` crescente, as mutações e a navegação); o sino em `top-bar.tsx` depois da `AccountMenu`
  - Cobre: CA-07, CA-08, CA-16 · RN-09 a RN-11

- [x] **T14** `apps/web` — página da publicação
  - Teste: `components/groups/group-post-page.test.tsx`:
    - "back to Atividade and the post with likes"
    - "a deleted post says Esta publicação não está mais disponível. with Voltar ao grupo"
  - Implementar: `routes/_auth/_shell/groups.$groupId.posts.$postId.tsx` e `group-post-page.tsx`, que reaproveita `GroupPost` e as mutações do mural (excluir volta ao mural)
  - Cobre: CA-08, CA-12, CA-13 · RN-19, RN-20

## Fase 6 — E2E e fechamento

- [x] **T15** E2E — notificações
  - Teste: `apps/web/e2e/notifications.spec.ts`:
    - "a member's post lights the bell of the other members, opens the post and turns read"
    - "the admin is told about a new member and Marcar todas como lidas clears Novo"
    - "on a phone the panel takes the width and closes with the bell" (projeto mobile)
  - Cobre: CA-01, CA-04, CA-07, CA-08, CA-09, CA-16

- [x] **T16** Fechamento
  - Biome só nos arquivos alterados, com `--line-ending=crlf`. **Nunca `pnpm check` no repositório inteiro**: nesta máquina ele reescreve tudo para LF.
  - `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, `pnpm test:int` e `pnpm test:e2e` (com o preview parado).
  - Atualizar:
    - a spec 040 (status `done` e changelog);
    - os changelogs das specs 034 a 038, que deixavam as notificações para o sino;
    - `glossary.md` (✅), `roadmap.md` (040 ✅) e `CLAUDE.md` (notificações e página da publicação);
    - `docs/deploy.md` (`NOTIFICATION_READ_RETENTION_DAYS`).

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T02, T04, T07, T09, T11, T15 |
| CA-02 | T01, T04, T11 |
| CA-03 | T04, T07, T11 |
| CA-04 | T04, T07, T11, T12, T15 |
| CA-05 | T04, T06, T07, T11 |
| CA-06 | T07 |
| CA-07 | T01, T02, T03, T04, T06, T08, T12, T13, T15 |
| CA-08 | T03, T05, T09, T12, T13, T14, T15 |
| CA-09 | T01, T03, T06, T12, T15 |
| CA-10 | T12 |
| CA-11 | T02, T12 |
| CA-12 | T05, T07, T09, T14 |
| CA-13 | T05, T09, T14 |
| CA-14 | T02, T12 |
| CA-15 | T01, T02 |
| CA-16 | T10, T13, T15 |

Todos os 16 critérios (CA-01 a CA-16) aparecem em ao menos uma tarefa.
