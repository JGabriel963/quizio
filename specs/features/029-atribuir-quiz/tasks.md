---
spec: "029"
status: done # todo | in-progress | done
---

# Tarefas — 029 Atribuir quiz 1/2 — Criar, compartilhar e acompanhar a atribuição

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md) · ADR: [0014](../../../docs/adr/0014-atribuicao-como-partida.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.

## Fechamento (2026-10-19)

- Testes: `pnpm vitest run` pela raiz: 2540 ✅ em 252 arquivos; todos os pacotes verdes. `pnpm check-types` e `pnpm -F web exec tsc --noEmit` limpos; Biome limpo nos arquivos alterados (`--line-ending=crlf`).
- E2E: `assignment` (novo) passou em desktop e celular; `reports`, `library` e `game-lobby` também. Três testes do desktop falharam na primeira tentativa com o servidor de dev ainda frio (o Vite recarrega a página enquanto otimiza as dependências) e passaram na nova tentativa. `pnpm test:int` não foi rodado: nenhum teste de integração cobre os adapters que mudaram (os do banco são testados com PGlite).
- Banco: migration `0003_complex_the_hood.sql` (enum `game_mode`, colunas `game.mode` e `game.question_timer` com default, índice `game_unended_quiz_idx` só do ao vivo, índice `game_assignment_pin_idx`, tabela `assignment_preferences`) e `pnpm -F @quizio/db db:push` no banco local.
- Conferido num navegador de verdade, em celular (375 px) e tela larga, com uma conta de teste local (`verificacao-029@quizio.test`, senha das fixtures do E2E) e o quiz "Capitais", que ficaram no banco local: "O quiz está pronto", "Configurar atividade" com "Mais opções" e o calendário, o compartilhamento, o relatório da atribuição aberta, a tela da atividade e a linha da biblioteca com o mouse por cima. **Achados e corrigidos**: "O quiz está pronto" ficava aberto por baixo de "Configurar atividade" (teste de regressão em `quiz-editor.test.tsx`); o cartão de convite do relatório estourava a largura no celular e se sobrepunha ao texto em telas médias (o QR, o PIN e a URL agora ficam abaixo do texto, e ao lado só em telas muito largas).
- **Desvios do plano**:
  - O `Calendar` foi escrito à mão sobre uma tabela, sem `react-day-picker` nem a CLI do shadcn: nenhuma dependência nova.
  - Os casos de uso ao vivo recusam a atribuição por um `loadLiveGame` em `game-lifecycle.ts` (em vez de um `requireLiveGame` em cada um), e um só arquivo de teste os percorre todos (T09).
  - "Atribuir" na web é o hook `useAssignQuiz()` com o componente `AssignFlow` (configurar → compartilhar), em vez de um `assign-button`; `useHostGame` aceita o quiz no `start`, para as linhas da biblioteca.
  - As mensagens de erro da atribuição ficaram em `lib/assignment-error-messages.ts`.
  - Não há teste do schema do `packages/env` (o pacote não tem testes); a variável está em `.env.example` e no `CLAUDE.md`.
  - Os testes da T13 ficaram num arquivo só, `drizzle-assignment-reads.test.ts`, e a T10 não precisou de teste na página inicial: o cartão lê `report.list` e foi coberto na T23.
- **Testes antigos que mudaram por causa das regras desta spec** (nenhum por regressão): `findGameByPin` e `game.join.find` respondem também o `mode`; os objetos inteiros do cabeçalho e da linha de relatório ganharam `mode`, `open`, `remainingMs`, `assignment`, `deadline` e `pin`, e `outcome` virou `status`; o campo do PIN guarda até 8 dígitos; "O quiz está pronto" tem cinco opções.
- TDD: domínio, aplicação, API e a maior parte dos componentes tiveram o teste escrito antes e visto falhar. Exceções, em que o código foi escrito logo depois do teste, sem rodar o vermelho antes: os repositórios da T13, `assignment-error-messages`, `DeadlinePicker` e `AssignFlow`. O ajuste de layout do cartão de convite não tem teste automatizado (é CSS): foi conferido no navegador e pelo E2E no celular.

## Fase 1 — Domínio

- [x] **T01** `core/game` — a partida tem modo e timer da pergunta
  - Teste: `game/domain/game.test.ts` › "a new game is live, with the question timer on", "requireLiveGame treats an assignment as missing", "requireAssignment treats a live game as missing", "an assignment past its deadline expires at the deadline"
  - Implementar: `game/domain/game.ts` (`GAME_MODES`, `GameMode`, `Game.mode`, `Game.questionTimer`, `requireLiveGame`, `requireAssignment`); `testing/a-game.ts` com `mode: "live"`, `questionTimer: true`
  - Cobre: CA-36 · RN-01, RN-40

- [x] **T02** `core/game` — regras do prazo e a partida de uma atribuição
  - Teste: `game/domain/assignment.test.ts` › "accepts a deadline later than now and up to the maximum days", "rejects a deadline at or before now", "rejects a deadline past the maximum days", "follows a configured maximum", "a new assignment is playing, without stage, started now, with every question counted", "shows questions on devices and never randomizes the questions", "keeps the chosen characters, question timer and answer order", "changes the deadline of an open assignment, earlier or later", "does not change the deadline of an ended assignment", "defaults: characters off, timer on, answers in order"
  - Implementar: `game/domain/assignment.ts` (`ASSIGNMENT_DEFAULT_MAX_DEADLINE_DAYS`, `AssignmentOptions`, `DEFAULT_ASSIGNMENT_OPTIONS`, `assertAssignmentDeadline`, `newAssignment`, `changeAssignmentDeadline`, `AssignmentDeadlinePassedError`, `AssignmentDeadlineTooFarError`)
  - Cobre: CA-10, CA-12 (padrões), CA-13, CA-32, CA-33 · RN-07, RN-08, RN-13, RN-14, RN-15, RN-36 a RN-38

- [x] **T03** `core/game` — o PIN da atribuição e a entrada por PIN `[P]`
  - Teste: `game/domain/game-pin.test.ts` › "parseJoinPin reads six digits as live", "parseJoinPin reads eight digits as an assignment, leading zero included", "parseJoinPin rejects other lengths and a live PIN starting with zero", "formats an eight-digit PIN in two groups"
  - Implementar: `game/domain/game-pin.ts` (`ASSIGNMENT_PIN_LENGTH`, `parseJoinPin`)
  - Cobre: CA-40, CA-41 · RN-18, RN-20

- [x] **T04** `core/reports` — o cabeçalho conhece o modo e a atribuição aberta `[P]`
  - Teste: `reports/domain/report.test.ts` › "every question of an assignment counts as played", "an open assignment cannot go to the trash", "an ended assignment can go to the trash", "an ended live game is still the only one that ended early"
  - Implementar: `reports/domain/report.ts` (`ReportHeader.mode`, `status: "finished" | "ended" | "open"` no lugar de `outcome`, `deadline`, `endedAt: Date | null`, `pin`; `playedQuestionCount`, `endedEarly`, `assertCanTrash`, `ReportAssignmentOpenError`); ajustar `report-stats.ts`, `testing/a-report-game.ts` e os testes que usavam `outcome`
  - Cobre: CA-37 · RN-34, RN-35, RN-41

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T05** `core/game` — portas e fakes da atribuição
  - Teste: `game/testing/in-memory-game-repository.test.ts` › "two open assignments of one quiz are created", "a live game and an assignment of one quiz are both created", "a second open live game of one quiz is taken", "listUnendedByQuiz filters by mode", "findLatestAssignmentByPin finds the newest assignment with the PIN, ended or not", "saveDeadline writes only the deadline of a game that did not end"; `in-memory-assignment-preferences-repository.test.ts` › "is null until saved", "returns what was saved"
  - Implementar: `ports/assignment-pin-generator.ts`, `ports/assignment-preferences-repository.ts`, `ports/assignment-landing-query.ts`, `ports/game-repository.ts` (`listUnendedByQuiz(quizId, modes?)`, `findLatestAssignmentByPin`, `saveDeadline`, regra do `create` por modo); `testing/in-memory-game-repository.ts`, `in-memory-assignment-preferences-repository.ts`, `in-memory-assignment-landing-query.ts`, `sequential-assignment-pin-generator.ts`, `game-deps.ts`
  - Cobre: CA-21, CA-22 · RN-05, RN-18

- [x] **T06** `core/game` — `createAssignment` e `getAssignmentSetup`
  - Teste: `game/application/create-assignment.test.ts` › "creates an open assignment with an eight-digit PIN and the quiz's current title", "copies the playable version's questions in order, unshuffled", "keeps the chosen options and saves them as the creator's preferences", "leaves the live game of the quiz open", "a second assignment of the same quiz stays open beside the first", "draws again when the PIN is taken", "refuses a draft", "refuses a quiz in the trash", "refuses another creator's quiz as missing", "refuses a deadline in the past or past the maximum days, creating nothing", "later edits of the quiz do not reach the assignment"; `get-assignment-setup.test.ts` › "gives the defaults to a creator who never assigned", "gives the options saved last", "gives the configured maximum days"
  - Implementar: `game/application/create-assignment.ts`, `get-assignment-setup.ts`
  - Cobre: CA-04, CA-05, CA-10, CA-13, CA-14, CA-16, CA-21, CA-22, CA-23 · RN-03 a RN-05, RN-08, RN-13, RN-14, RN-17, RN-18

- [x] **T07** `core/game` — alterar o prazo e encerrar `[P]`
  - Teste: `game/application/change-assignment-deadline.test.ts` › "stores a later deadline", "stores an earlier deadline", "refuses a deadline out of bounds and keeps the old one", "refuses an assignment that ended by its deadline", "refuses an assignment ended meanwhile (saveDeadline false)", "refuses another creator's assignment and a live game as missing"; `end-assignment.test.ts` › "ends the assignment now, by its owner", "ending twice keeps the first instant", "refuses a live game as missing"
  - Implementar: `game/application/change-assignment-deadline.ts`, `end-assignment.ts`
  - Cobre: CA-29, CA-31, CA-32, CA-33, CA-34 · RN-36 a RN-40, RN-43

- [x] **T08** `core/game` — a tela da atividade e a entrada por PIN
  - Teste: `game/application/get-assignment-landing.test.ts` › "an open assignment gives its name, its creator, the time left and the participants", "past its deadline it is ended, without writing", "an ended assignment gives only its name", "a renamed report renames the activity", "gives nothing about the questions", "an unknown id or a live game is missing"; `find-game-by-pin.test.ts` › "eight digits of an open assignment give its id and the assignment mode", "eight digits of an ended assignment give its id, and the attempt is released", "eight digits of no assignment count as a wrong PIN", "six digits still find live games only"
  - Implementar: `game/application/get-assignment-landing.ts`, `find-game-by-pin.ts`
  - Cobre: CA-30, CA-39, CA-40, CA-41, CA-42 · RN-20, RN-28, RN-40, RN-44, RN-46 a RN-48

- [x] **T09** `core/game` — os casos de uso ao vivo não tocam atribuições
  - Teste: `game/application/live-use-cases-and-assignments.test.ts` › "%s treats an assignment as missing" (um caso por caso de uso: `getHostGame`, `startGame`, `advanceGame`, `setGameLocked`, `setGameOptions`, `signalHost`, `removePlayer`, `endGame`, `joinGame`, `getPlayerSession`, `submitAnswer`, `changeAvatar`), "hosting does not end the quiz's open assignments", "a deleted quiz ends its assignments too"
  - Implementar: `loadLiveGame` em `game-lifecycle.ts` (atribuição → null), usado nesses casos de uso; `end-games-of-quiz.ts` com `modes`; `host-game.ts` só com `live`
  - Cobre: CA-22, CA-38 · RN-05, RN-42

- [x] **T10** `core/reports` — listas, relatório aberto e lixeira
  - Teste: `reports/application/list-reports.test.ts` › "an open assignment is listed as an assignment with the time left and no accuracy", "open assignments come first, the one ending first on top", `get-report.test.ts` › "an open assignment's report has its deadline, time left and PIN", "an open assignment lists every question with no accuracy"; `change-reports.test.ts` › "moving an open assignment to the trash is refused and nothing moves", "an ended assignment moves to the trash"; `list-reports.test.ts` › "an ended assignment has no time left"; `get-report.test.ts` › "a live report has no assignment part" (a página inicial lê `report.list`, então o cartão já recebe as atribuições: coberto na T23)
  - Implementar: `list-reports.ts`, `get-report.ts`, `report-view.ts`, `move-reports-to-trash.ts`; `ports/report-game-query.ts` (contrato); `testing/in-memory-report-store.ts` (modo, ordem)
  - Cobre: CA-24, CA-25, CA-26, CA-36, CA-37 · RN-27, RN-29 a RN-35, RN-41

## Fase 3 — Adapters (banco)

- [x] **T11** `db` — schema e migration
  - Teste: `repositories/game/drizzle-assignment.test.ts` › "stores and reads back an assignment's mode and question timer", "old rows read as live with the timer on", "two open assignments of one quiz are created", "an open live game and an open assignment of one quiz are both created", "a second open live game of one quiz is taken"
  - Implementar: `schema/game.ts` (`gameMode`, `mode`, `question_timer`, índice `game_unended_quiz_idx` só `live`, `game_assignment_pin_idx`, tabela `assignment_preferences`); `drizzle-game-repository.ts` (mapear as colunas, `create` por modo); `pnpm db:generate` (commitar a migration) e `pnpm -F @quizio/db db:push`
  - Cobre: CA-13, CA-21, CA-22 · RN-05, RN-13

- [x] **T12** `db` — repositório de partidas: prazo, PIN e modos `[P]`
  - Teste: `drizzle-assignment.test.ts` › "saveDeadline writes only the deadline", "saveDeadline does nothing to an ended assignment", "findLatestAssignmentByPin finds the newest one, ended or not", "listUnendedByQuiz filters by mode", "deleteUnstartedByQuiz keeps assignments"
  - Implementar: `drizzle-game-repository.ts`
  - Cobre: CA-33, CA-38, CA-42 · RN-38, RN-42

- [x] **T13** `db` — preferências de atribuição e tela da atividade `[P]`
  - Teste: `drizzle-assignment-preferences-repository.test.ts` › "is null for a creator who never assigned", "saves and replaces the options", "leaves host_preferences alone"; `drizzle-assignment-landing-query.test.ts` › "gives the game's title and the creator's name", "gives the report's name once renamed", "counts players who were not removed", "is null for a live game"
  - Implementar: `drizzle-assignment-preferences-repository.ts`, `drizzle-assignment-landing-query.ts`
  - Cobre: CA-14, CA-30, CA-39 · RN-14, RN-28, RN-46

- [x] **T14** `db` — a consulta dos relatórios com atribuições
  - Teste: `drizzle-report-game-query.test.ts` › "an assignment is a report from its creation", "an open assignment has no end, its deadline and its PIN", "past its deadline an assignment ended at the deadline, without its PIN", "open assignments come first by deadline, then reports by end", "a live game in the lobby or being played is still not a report", "tallies of an assignment without players have no accuracy"
  - Implementar: `drizzle-report-game-query.ts`
  - Cobre: CA-24, CA-25, CA-36 · RN-27, RN-29, RN-30, RN-40

## Fase 4 — API (routers + composition root)

- [x] **T15** `api` — gerador de PIN, configuração e container
  - Teste: `random-assignment-pin-generator.test.ts` › "draws eight digits", "may start with zero"; `packages/env` › o schema aceita `ASSIGNMENT_MAX_DEADLINE_DAYS` ausente (28) e recusa fora de 1–365
  - Implementar: `random-assignment-pin-generator.ts`; `packages/env/src/server.ts`; `apps/web/.env.example`; `container.ts` (adapters, casos de uso, `quizGames` com os dois modos, `hostGame` só ao vivo, `assignmentMaxDeadlineDays`); `composition-root.ts`; `testing/test-context.ts`
  - Cobre: RN-08, RN-18, RN-42

- [x] **T16** `api` — procedures da atribuição
  - Teste: `routers/game.test.ts` › "assignment.setup gives the creator's options and the maximum days", "assignment.create returns the gameId and an eight-digit PIN", "assignment.create maps a past deadline to ASSIGNMENT.DEADLINE_PASSED", "assignment.changeDeadline and end of another creator are NOT_FOUND", "assignment.landing is public and gives no questions", "join.find gives the assignment mode for eight digits", "the host's procedures treat an assignment as missing"; `routers/report.test.ts` › "report.get of an open assignment has its PIN and deadline", "moveToTrash of an open assignment is BAD_REQUEST with REPORT.ASSIGNMENT_OPEN", "renaming the report renames the landing"; `routers/quiz.test.ts` › "deleting a quiz for good ends its assignments and keeps their reports", "trashing a quiz keeps its assignments open"
  - Implementar: `routers/game.ts` (sub-router `assignment`, `join.find` com `mode`), `routers/report.ts` se preciso
  - Cobre: CA-10, CA-16, CA-29, CA-30, CA-38, CA-40 · RN-08, RN-27, RN-41, RN-42

## Fase 5 — UI (design system → componentes do app → rotas)

- [x] **T17** `ui` — primitivo `Calendar` `[P]`
  - Teste: `packages/ui/src/components/calendar.test.tsx` › "weeks start on Monday, in Portuguese", "disabled days cannot be picked", "picking a day calls onSelect"
  - Implementar: `npx shadcn@latest add calendar -c packages/ui` (responder **não** aos overwrites; mover o arquivo se cair na raiz do checkout principal), converter ao estilo do projeto; `react-day-picker` no catálogo do pnpm; exemplo em `/design-system`
  - Cobre: CA-08 · RN-09

- [x] **T18** `web/lib` — prazo, tempo até o prazo, link e destinos `[P]`
  - Teste: `lib/assignment-deadline.test.ts` › "the default deadline is three days ahead at noon", "bounds go from now to the maximum days", "today offers only the full hours still ahead", "formats the long date"; `lib/time-until.test.ts` › "rounds to the nearest day, hour or minute", "singular forms", "openFor says Aberto por"; `lib/share-targets.test.ts` › "builds the WhatsApp, Telegram, Facebook, X and e-mail links with the message"; `lib/assignment-link.test.ts` › "builds the activity link and the share message"; `lib/game-error-messages.test.ts` e `report-error-messages` › os códigos novos
  - Implementar: `lib/assignment-deadline.ts`, `time-until.ts`, `share-targets.ts`, `assignment-link.ts`, mensagens de erro
  - Cobre: CA-01, CA-07, CA-08, CA-11, CA-18 · RN-07, RN-09, RN-10, RN-23

- [x] **T19** `web` — seletor de prazo
  - Teste: `components/assignment/deadline-picker.test.tsx` › "shows the month with days out of bounds disabled", "today lists only the hours ahead", "Definir applies the day and the hour", "Cancelar keeps the deadline"
  - Implementar: `components/assignment/deadline-picker.tsx`
  - Cobre: CA-07, CA-08 · RN-09

- [x] **T20** `web` — "Configurar atividade"
  - Teste: `components/assignment/assign-dialog.test.tsx` › "opens with the default deadline, Em 3 dias, and Mais opções closed", "Mais opções shows the four switches with their descriptions and the setup's options", "the nickname generator is off, disabled and marked Em breve", "there is no participant limit, upgrade, question order, autoplay or lock", "Cancelar and the X close without creating", "Criar uma tarefa sends the deadline and the options", "a passed deadline keeps the dialog open with the reason on the card", "while creating, the button is busy and cannot be pressed again"
  - Implementar: `components/assignment/assign-dialog.tsx`; `lib/assignment-mutations.ts`
  - Cobre: CA-01, CA-06, CA-09, CA-12, CA-13, CA-15 · RN-06 a RN-17

- [x] **T21** `web` — "Compartilhe com os participantes"
  - Teste: `components/assignment/share-assignment-dialog.test.tsx` › "shows the activity card, the actions and the eight-digit PIN", "Copiar link copies the link and says so", "the PIN's icon copies the PIN", "Compartilhar uses the device's share when there is one", "without it, Compartilhar offers WhatsApp, Telegram, Facebook, X, E-mail and Copiar link", "Adicionar participantes lists groups and e-mail as Em breve, without upgrade", "the activity card links to the report"; `assign-button.test.tsx` › "closing the share dialog says Atividade criada with Ver relatório"
  - Implementar: `components/assignment/share-assignment-dialog.tsx`, `assign-button.tsx`, ilustração em `apps/web/public/`
  - Cobre: CA-16, CA-17, CA-18, CA-19, CA-20 · RN-19, RN-21 a RN-26

- [x] **T22** `web` — pontos de entrada: página do quiz, biblioteca e "O quiz está pronto"
  - Teste: `quiz-details-view.test.tsx` › "Atribuir sits beside Organizar ao vivo and opens Configurar atividade", "Atribuir is unavailable for a draft, with the hint", "there is no Atribuir in the trash"; `quiz-list-item.test.tsx` › "a published row shows Atribuir and Organizar ao vivo on hover and focus", "a draft row shows neither", "the row's menu has both on a narrow screen"; `quiz-ready-dialog.test.tsx` › "Atribuir is available after Organizar ao vivo"
  - Implementar: `quiz-details-view.tsx`, `quiz-list-item.tsx` (+ rota `library.tsx` com as ações), `quiz-ready-dialog.tsx`, `quiz-editor.tsx`, `routes/_auth/_shell/quizzes.$quizId.tsx`
  - Cobre: CA-01, CA-02, CA-03, CA-04, CA-05 · RN-02, RN-03

- [x] **T23** `web` — atribuições em Relatórios: lista e cabeçalho
  - Teste: `report-list.test.tsx` › "an open assignment's row says Atribuição and Termina: em 3 dias, with — accuracy", "an ended assignment's row shows its end date", "Mover para a lixeira is disabled on an open assignment, with the hint", "the selection bar cannot trash a selection with an open assignment"; `report-header.test.tsx` › "an open assignment shows Atribuição, Termina, the start and end dates and Organizado por", "an ended assignment shows Encerrada"; o cartão "Relatórios mais recentes" da página inicial com "Termina: …"
  - Implementar: `report-list-item.tsx`, `report-selection-bar.tsx`, `report-header.tsx`, `lib/report-labels.ts`, cartão da página inicial
  - Cobre: CA-24, CA-26, CA-33, CA-37 · RN-29, RN-31, RN-41

- [x] **T24** `web` — Resumo da atribuição, alterar prazo e encerrar
  - Teste: `components/reports/assignment-summary.test.tsx` › "shows the participants ring, Convide mais participantes and Compartilhar atividade atribuída", "shows the QR, the PIN and the URL with Copiar", "Baixar downloads a PNG of the QR", "Compartilhar atividade atribuída opens the share dialog with the same link and PIN", "Jogue este quiz is marked Em breve", "the three cards of the summary show their empty states", "an ended assignment has no invite or control cards"; `change-deadline-dialog.test.tsx` › "opens with the current deadline", "Salvar sends the new deadline", "a failure keeps the old deadline and says so"; `end-assignment-dialog.test.tsx` › "asks before ending", "Cancelar keeps it open", "Encerrar agora ends it"
  - Implementar: `components/reports/assignment-summary.tsx`, `change-deadline-dialog.tsx`, `end-assignment-dialog.tsx`, `report-summary.tsx`, `routes/_auth/_shell/reports.$gameId.tsx`
  - Cobre: CA-26, CA-27, CA-28, CA-31, CA-33, CA-34, CA-35 · RN-32 a RN-39, RN-43

- [x] **T25** `web` — a tela da atividade e a entrada por PIN
  - Teste: `components/assignment/assignment-landing.test.tsx` › "an open activity shows Atividade por, Aberto por, its name and its participants", "the nickname and Ok, vamos lá! are disabled and marked Em breve", "an ended activity says Esta atividade foi encerrada with the way to the PIN", "a missing activity goes to the PIN entry with the message"; `join-flow.test.tsx` › "an eight-digit PIN of an assignment goes to the activity", "the PIN field takes eight digits"
  - Implementar: `routes/assignment.$gameId.tsx` (pública, só no cliente, em `GameScreen`), `components/assignment/assignment-landing.tsx`, `routes/join.tsx`, `components/game/player/join-flow.tsx`
  - Cobre: CA-39, CA-40, CA-41, CA-42 · RN-19, RN-20, RN-44 a RN-48

## Fase 6 — E2E e fechamento

- [x] **T26** E2E — atribuir de ponta a ponta
  - Teste: `apps/web/e2e/assignment.spec.ts` (desktop + celular) › "a creator assigns a quiz, shares it, changes the deadline and ends it": publica um quiz, atribui com o prazo padrão, copia o PIN, abre o link num contexto anônimo (tela "Em breve"), entra pelo PIN em `/join`, abre o relatório pela lista, altera o prazo, encerra e vê "Esta atividade foi encerrada" no link; rodar também `reports`, `game-lobby` e `library` para conferir que nada do ao vivo mudou
  - Cobre: CA-24, CA-31, CA-34, CA-39, CA-40, CA-42

- [x] **T27** Fechamento
  - `pnpm check` (Biome só nos arquivos alterados, com `--line-ending=crlf`), `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`; `pnpm test:int` (adapters do banco mudaram); `pnpm test:e2e` das specs da T26
  - Conferir as telas num navegador de verdade (celular e tela larga): diálogos, calendário, linha da biblioteca, relatório e tela da atividade
  - Atualizar `spec.md` (status `done`, changelog), changelog da spec 015 (RN-01/02, ordem e lixeira), `glossary.md` (status ✅), `roadmap.md`, `CLAUDE.md` (variável `ASSIGNMENT_MAX_DEADLINE_DAYS` e um parágrafo da atribuição na arquitetura), `docs/design-system.md` (Calendar)

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T18, T20, T22 |
| CA-02 | T22 |
| CA-03 | T22 |
| CA-04 | T06, T22 |
| CA-05 | T06, T22 |
| CA-06 | T20 |
| CA-07 | T18, T19 |
| CA-08 | T17, T18, T19 |
| CA-09 | T20 |
| CA-10 | T02, T06, T16 |
| CA-11 | T18 |
| CA-12 | T02, T20 |
| CA-13 | T02, T06, T11, T20 |
| CA-14 | T06, T13 |
| CA-15 | T20 |
| CA-16 | T06, T16, T21 |
| CA-17 | T21 |
| CA-18 | T18, T21 |
| CA-19 | T21 |
| CA-20 | T21 |
| CA-21 | T05, T06, T11 |
| CA-22 | T05, T06, T09, T11 |
| CA-23 | T06 |
| CA-24 | T10, T14, T23, T26 |
| CA-25 | T10, T14 |
| CA-26 | T10, T23, T24 |
| CA-27 | T24 |
| CA-28 | T24 |
| CA-29 | T07, T16 |
| CA-30 | T08, T13, T16 |
| CA-31 | T07, T24, T26 |
| CA-32 | T02, T07 |
| CA-33 | T02, T07, T12, T23, T24 |
| CA-34 | T07, T24, T26 |
| CA-35 | T24 |
| CA-36 | T01, T10, T14 |
| CA-37 | T04, T10, T23 |
| CA-38 | T09, T12, T16 |
| CA-39 | T08, T13, T25, T26 |
| CA-40 | T03, T08, T16, T25, T26 |
| CA-41 | T03, T08, T25 |
| CA-42 | T08, T12, T25, T26 |

Todos os 42 critérios aparecem em ao menos uma tarefa.
