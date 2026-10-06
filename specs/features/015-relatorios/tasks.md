---
spec: "015"
status: done # todo | in-progress | done
---

# Tarefas — 015 Relatórios

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.

## Fechamento (2026-10-06)

- Testes: `pnpm test` 1967 ✅ (core 856, db 127, api 103, ui 32, web 825, auth 15, realtime 6, storage 3); `pnpm check-types` e `pnpm -F web exec tsc --noEmit` limpos; Biome limpo.
- E2E: `reports` (novo), as cinco specs de jogo, `home` e `library`, 34 ✅ no total, desktop e celular, com o `.env` no Soketi local. As specs de `auth`, do editor e do design system não foram rodadas: nada delas mudou.
- `pnpm test:int` não foi rodado: `packages/realtime` e `packages/storage` não mudaram.
- Banco: `pnpm -F @quizio/db db:push` aplicado no banco local (coluna `game.started_at`, tabela `report`, índice `game_owner_ended_idx`, retirada da chave estrangeira de `game.quiz_id`). Outras máquinas precisam rodar o mesmo comando.
- **Testes antigos que mudaram por causa das regras desta spec** (nenhum por regressão):
  - `drizzle-game-repositories.test.ts`: "a quiz deleted for good takes its games and players" deixou de valer (RN-05); no lugar, três testes: o quiz excluído mantém as partidas, `deleteUnstartedByQuiz` apaga só as não iniciadas, e uma não iniciada leva os jogadores junto. Os quatro arquivos de teste de repositório do jogo passaram a limpar a tabela `game` no `beforeEach`, que antes ia embora pela cascata do quiz.
  - `routers/game.test.ts`: "deleting the quiz for good ends its open game" virou dois: o lobby é avisado e a partida some; a partida em andamento é encerrada e fica.
  - `main-nav.test.tsx` e `e2e/home.spec.ts`: Relatórios deixou de ser "Em breve" (RN-22, RN-31).
  - `podium.test.tsx`: a lista de ações ganhou "Ver relatório".
- **Defeito pego pelos testes no caminho**: o início da partida não era gravado, porque `startGame` salva pelo salvamento condicional (`saveIfAt`), que só escrevia algumas colunas. O teste de `startGame` falhou e `startedAt` entrou no `saveIfAt` do fake e do adapter.
- Conferido num navegador de verdade (T31), com um roteiro do Playwright e uma carga de dados, rodados uma vez e apagados: a página inicial com o cartão; a lista com quatro relatórios (um até o pódio, um encerrado no meio, um encerrado antes da primeira revelação, um de quiz excluído); o menu da linha; todos selecionados; a lixeira; o Resumo; Participantes em "Todos" e "Ajuda necessária"; o detalhe de um participante; Perguntas em "Todos" e "Perguntas difíceis"; o detalhe de uma pergunta; o nome em edição; o relatório encerrado no meio ("7 de 15"); o relatório do quiz excluído (sem "Jogar de novo" e sem "Ver quiz"). Tudo em tela larga e de celular, olhando as capturas ao lado das do Kahoot. Ajustes feitos depois de olhar: colunas mais largas na lista e nos participantes, e o selo "N perguntas" numa linha só.
- Só nos testes, não no navegador: renomear com falha (CA-35); excluir de vez (CA-43); o relatório aberto estando na lixeira (CA-44); a pesquisa da lista (CA-19); "Mostrar mais" da lista (CA-20); leitor de tela (CA-46).
- TDD: nas fases de domínio, aplicação, banco e API os testes foram escritos antes do código e vistos falhar (por o módulo ainda não existir, no caso dos arquivos novos). Exceções: na T05 o campo `startedAt` foi escrito antes do teste de domínio. Na Fase 5, só os textos (T17), a lista (T20) e os diálogos (T21) tiveram o teste antes; do cabeçalho em diante (T23 a T29) os componentes foram escritos primeiro e os testes depois.
- Sobrou no banco local: as contas, os quizzes e as partidas criados pelos E2E e pela carga da conferência.
- `ComingSoonCard` (spec 002) ficou sem uso na página inicial; o componente e o teste dele continuam no repositório para os próximos "Em breve".
- **Ajuste de layout pedido pelo usuário depois de ver a lista** (sem spec, como combinado para ajustes de layout): em tela larga, a barra superior e a barra lateral do `AppShell` ficam fixas e só o conteúdo rola, como no Kahoot; vale para a página inicial, a biblioteca, a página do quiz e os relatórios. No celular a página inteira continua rolando. Conferido num navegador com a janela baixa. A primeira versão deixava a página com duas barras de rolagem numa lista longa: a entrada oculta de cada caixa de seleção, posicionada de forma absoluta, escapava da área de rolagem e esticava a página. O usuário viu, o caso foi reproduzido (página com 3570 px numa janela de 600) e corrigido com `relative` no conteúdo (600 px depois).
- Desvios do plano: no fim de [plan.md](plan.md).

## Fase 1 — Domínio

- [x] **T01** `core/reports` — o cabeçalho do relatório: perguntas jogadas, dono, lixeira e nome
  - Teste: `reports/domain/report.test.ts` › "a finished game played every question", "an ended game counts only the questions that reached their results", "another owner's report is not found", "a report in the trash cannot be opened", "rejects an empty name and one with 96 characters", "trims the name and counts graphemes"
  - Implementar: `reports/domain/report.ts` (`ReportHeader`, `REPORT_SECTIONS`, `playedQuestionCount`, `requireOwnedReport`, `assertOutOfTrash`, `assertInTrash`, `parseReportName`, `REPORT_NAME_MAX_LENGTH` e os quatro erros)
  - Cobre: CA-02, CA-06, CA-34, CA-44 · RN-03, RN-09, RN-46, RN-51

- [x] **T02** `core/reports` — o percentual como dois inteiros `[P]`
  - Teste: `reports/domain/accuracy.test.ts` › "rounds to the nearest integer", "has no percent without a total", "is low below 35%, not at 35%", "compares the exact value, not the rounded one"
  - Implementar: `reports/domain/accuracy.ts` (`Accuracy`, `LOW_ACCURACY_PERCENT`, `accuracyPercent`, `isLowAccuracy`)
  - Cobre: CA-11, CA-12 · RN-16, RN-17, RN-18

- [x] **T03** `core/reports` — as contas dos participantes
  - Teste: `reports/domain/report-stats.test.ts` › "overall accuracy is right answers over possible ones", "a participant's accuracy and unanswered questions", "questions before a late player's arrival do not count for them", "a partially correct answer is not a right one", "ranks by total, ties by arrival", "a participant needs help below 35%, not at 35%", "who had no question does not need help", "did not finish lists who left questions unanswered, most first", "duration goes from the start to the end"
  - Implementar: `reports/domain/report-game.ts` (os tipos da partida lida) e `reports/domain/report-stats.ts` (`questionsOf`, `participantStats`, `overallAccuracy`, `needsHelp`, `didNotFinish`, `durationMs`); `reports/testing/a-report-game.ts` (construtor de partidas para os testes)
  - Cobre: CA-07, CA-08, CA-09, CA-10, CA-12, CA-13, CA-15 · RN-10 a RN-13, RN-15, RN-18 a RN-21

- [x] **T04** `core/reports` — as contas das perguntas
  - Teste: `report-stats.test.ts` › "a question's accuracy counts who could answer it", "a question is difficult below 35%, not at 35%", "difficult questions come hardest first, ties by order played", "counts who chose each answer and who did not answer", "the average time is of who answered", "no average when nobody answered"
  - Implementar: `report-stats.ts` (`questionStats`, `difficultQuestions`)
  - Cobre: CA-09, CA-11, CA-31 · RN-14, RN-17, RN-21

- [x] **T05** `core/game` — a partida guarda quando foi iniciada `[P]`
  - Teste: `game/domain/game-progress.test.ts` › "starting records when the game started"; `game/domain/game.test.ts` › "a new game has not started"
  - Implementar: `game/domain/game.ts` (`Game.startedAt`), `game/domain/game-progress.ts` (`startGame`), `game/testing/a-game.ts`
  - Cobre: CA-15, CA-22 · RN-21, RN-32

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T06** `core/reports` — as portas e o fake
  - Teste: `reports/testing/in-memory-report-store.test.ts` › "lists the owner's reports of a section, newest end first", "the name is the report's own, or the game's title", "tallies give each game's participants and right answers", "saveName keeps the trash and saveTrashed keeps the name", "delete removes the games"
  - Implementar: `reports/application/ports/report-game-query.ts`, `reports/application/ports/report-repository.ts`, `reports/testing/in-memory-report-store.ts`
  - Cobre: CA-17, CA-33 · RN-23, RN-45

- [x] **T07** `core/reports` — listar os relatórios
  - Teste: `reports/application/list-reports.test.ts` › "lists a finished game with its title, counts, accuracy and end", "a game ended before any results has no accuracy", "marks a game that ended early", "two games of the same quiz are two reports, each with its own numbers", "search ignores case and accents", "limit cuts the list and total tells how many there are", "the trash section lists only trashed reports", "play again needs a quiz out of the trash with a playable version", "the cover is the quiz's while it exists"
  - Implementar: `reports/application/list-reports.ts`
  - Cobre: CA-01, CA-03, CA-05a, CA-19, CA-20, CA-37, CA-38, CA-40 · RN-22 a RN-28, RN-48

- [x] **T08** `core/reports` — abrir um relatório
  - Teste: `reports/application/get-report.test.ts` › "tells the header, the totals and the overall accuracy", "a game ended in the middle tells how many were played", "a game ended before any results has an empty summary", "another creator's report is not found", "a trashed report does not open", "the summary has the hardest question and who needs help, in order", "participants come by rank and questions in the order they were played", "without its quiz, a report has no images and no play again", "a quiz in the trash cannot be played again or viewed"
  - Implementar: `reports/application/get-report.ts` (`ReportView`)
  - Cobre: CA-02, CA-03, CA-06, CA-22, CA-24, CA-27, CA-28, CA-30, CA-37, CA-38, CA-44 · RN-05, RN-06, RN-32 a RN-41, RN-43

- [x] **T09** `core/reports` — os detalhes do participante e da pergunta
  - Teste: `reports/application/get-report-participant.test.ts` › "a participant's answers, question by question", "a question without an answer comes as unanswered", "a late player has only their questions", "an unknown participant is not found"; `reports/application/get-report-question.test.ts` › "a question's answers, counts and participants", "leaves out who could not answer it", "a question that was not played is not found"
  - Implementar: `reports/application/get-report-participant.ts`, `reports/application/get-report-question.ts`
  - Cobre: CA-09, CA-10, CA-29, CA-31 · RN-42, RN-44

- [x] **T10** `core/reports` — renomear `[P]`
  - Teste: `reports/application/rename-report.test.ts` › "renaming changes the report's name only", "another report of the same quiz keeps its name", "rejects an invalid name", "a trashed report cannot be renamed", "another creator's report is not found"
  - Implementar: `reports/application/rename-report.ts`
  - Cobre: CA-05a, CA-33, CA-34 · RN-45, RN-46, RN-51

- [x] **T11** `core/reports` — lixeira, restaurar e excluir de vez `[P]`
  - Teste: `reports/application/trash-reports.test.ts` › "a trashed report leaves the list and shows in the trash", "moves several at once", "one foreign report fails them all and changes nothing", "trashing twice keeps the first instant", "restoring puts it back", "deleting for good needs the trash", "deleting removes the game"
  - Implementar: `reports/application/move-reports-to-trash.ts`, `restore-reports.ts`, `delete-reports-permanently.ts`
  - Cobre: CA-40, CA-41, CA-42, CA-43 · RN-50, RN-52, RN-53

- [x] **T12** `core/game` — apagar as partidas não iniciadas de um quiz `[P]`
  - Teste: `game/testing/in-memory-game-repository.test.ts` (ou o arquivo de testes do fake que já existir) › "deletes the games of a quiz that never started and keeps the started ones"
  - Implementar: `game/application/ports/game-repository.ts` (`deleteUnstartedByQuiz`), o fake em `game/testing`
  - Cobre: CA-37 · RN-05

## Fase 3 — Adapters (repositórios, real-time, storage)

- [x] **T13** `db` — o schema e o repositório do jogo
  - Teste: `repositories/game/drizzle-game-repositories.test.ts` › "stores when the game started", "deleting the quiz keeps its games", "deleteUnstartedByQuiz drops the games that never started and keeps the others"
  - Implementar: `schema/game.ts` (`started_at`, `quiz_id` sem a chave estrangeira, índice `game_owner_ended_idx`), `schema/reports.ts` (tabela `report`), `schema/index.ts`, `repositories/game/drizzle-game-repository.ts`
  - Rodar: `pnpm -F @quizio/db db:push`
  - Cobre: CA-15, CA-37 · RN-05, RN-21

- [x] **T14** `db` — a consulta dos relatórios
  - Teste: `repositories/reports/drizzle-report-game-query.test.ts` › "a finished game is a report header", "a game ended in the lobby is not a report", "a game in progress is not a report; one past its deadline is, ended at the deadline", "headers come by end, newest first", "only the owner's games", "the name is the report's own, or the game's title", "tells the quiz's state, or none once it was deleted", "a player removed in the lobby is not a participant", "tallies count right answers to played questions only", "the report reads the game's questions, not the quiz's", "leaves out the question that was on the screen when the game ended", "a game played with the game's use cases ranks as its podium does"
  - Implementar: `repositories/reports/drizzle-report-game-query.ts`
  - Cobre: CA-01, CA-02, CA-04, CA-05, CA-14, CA-17, CA-32, CA-37 · RN-01, RN-02, RN-04, RN-08, RN-09, RN-20

- [x] **T15** `db` — o que o relatório grava `[P]`
  - Teste: `repositories/reports/drizzle-report-repository.test.ts` › "saveName keeps the trash, saveTrashed keeps the name", "renaming or trashing one report leaves the other of the same quiz alone", "restoring clears the trash", "delete removes the game with players, questions and answers, and no quiz"
  - Implementar: `repositories/reports/drizzle-report-repository.ts`
  - Cobre: CA-05a, CA-33, CA-42, CA-43 · RN-45, RN-50 a RN-53

## Fase 4 — API (routers + composition root)

- [x] **T16** `api` — o router `report` e as ligações
  - Teste: `routers/report.test.ts` › "report.list needs a session", "lists the reports of who asks", "report.get answers NOT_FOUND for another owner", "report.get tells REPORT.IN_TRASH for a trashed report", "report.rename tells REPORT.INVALID_NAME", "trash, restore and delete take several ids", "deleting a quiz for good keeps its reports and drops its unstarted games"
  - Implementar: `routers/report.ts`, `routers/index.ts`, `container.ts` (adapters `reportGames` e `reports`, os oito casos de uso, `quizGames.endGamesOfDeletedQuiz` chamando `deleteUnstartedByQuiz`), `composition-root.ts`, `testing/test-context.ts`
  - Cobre: CA-06, CA-34, CA-37, CA-41, CA-44 · RN-03, RN-05

## Fase 5 — UI (design system → componentes do app → rotas)

- [x] **T17** `web` — textos e formatos dos relatórios
  - Teste: `lib/report-labels.test.ts` › "picks the sentence by band", "formats minutes and 'menos de 1 min'", "formats the average time in seconds", "formats the date as in the list", "names each result"
  - Implementar: `lib/report-labels.ts`, `lib/report-error-messages.ts`, `lib/api-types.ts` (as visões dos relatórios)
  - Cobre: CA-15, CA-25, CA-46 · RN-21, RN-35, RN-56

- [x] **T18** `web` — o anel de percentual `[P]`
  - Teste: `components/reports/accuracy-ring.test.tsx` › "shows the number beside the ring", "shows a dash without a percent", "the drawing is hidden from screen readers"
  - Implementar: `components/reports/accuracy-ring.tsx`
  - Cobre: CA-46 · RN-16, RN-55

- [x] **T19** `web` — Relatórios na navegação principal `[P]`
  - Teste: `components/layout/main-nav.test.tsx` › "Relatórios is a link to /reports", "is marked on /reports and on a report's page"
  - Implementar: `components/layout/main-nav.tsx`
  - Cobre: CA-16 · RN-22

- [x] **T20** `web` — a lista de relatórios
  - Teste: `components/reports/report-list.test.tsx` › "shows each report's cover, name, participants, accuracy and end", "marks a game that ended early", "the row's menu offers open, play again, rename and trash", "hides play again when the quiz cannot be played", "the trash offers restore and delete", "the header checkbox selects every row shown", "the action for the selected shows with one marked", "'Mostrar mais' shows while there are more", "error state with 'Tentar novamente'"; `components/reports/report-empty-state.test.tsx` › "explains where reports come from when there is none", "tells that nothing was found for the term", "tells the trash is empty"
  - Implementar: `components/reports/report-tabs.tsx`, `report-list.tsx`, `report-list-item.tsx`, `report-selection-bar.tsx`, `report-empty-state.tsx`
  - Cobre: CA-01, CA-18, CA-19, CA-20, CA-38, CA-41, CA-47 · RN-24 a RN-30

- [x] **T21** `web` — renomear e excluir de vez
  - Teste: `components/reports/rename-report-dialog.test.tsx` › "starts with the current name", "tells why the name is not accepted", "sends the trimmed name"; `components/reports/delete-report-dialog.test.tsx` › "tells that the game and its answers will be deleted", "cancelling the confirmation changes nothing"
  - Implementar: `components/reports/rename-report-dialog.tsx`, `delete-report-dialog.tsx`, `lib/report-mutations.ts` (renomear otimista, lixeira com "Desfazer", restaurar, excluir)
  - Cobre: CA-34, CA-35, CA-40, CA-43 · RN-45 a RN-47, RN-50, RN-53

- [x] **T22** `web` — a rota `/reports`
  - Sem teste de componente: é a ligação entre o tRPC e os componentes das T20 e T21; o comportamento é conferido na T30 e na T31
  - Implementar: `routes/_auth/_shell/reports.index.tsx` (`section` e `q` no endereço, `limit` de 20 em 20, seleção, ações)
  - Cobre: CA-16 a CA-20, CA-40 a CA-43 · RN-22, RN-27, RN-28

- [x] **T23** `web` — o cabeçalho do relatório
  - Teste: `components/reports/report-header.test.tsx` › "shows the name, the start, the host and the three tabs with counts", "marks a game that ended early", "the pencil turns the name into a field", "tells why the name is not accepted", "a failed rename keeps the old name and warns", "the options hide 'Ver quiz' without a quiz"
  - Implementar: `components/reports/report-header.tsx`
  - Cobre: CA-22, CA-33, CA-34, CA-35, CA-37 · RN-32 a RN-34, RN-45 a RN-47

- [x] **T24** `web` — o Resumo `[P]`
  - Teste: `components/reports/report-summary.test.tsx` › "draws the five cards", "tells played of total when the game ended early", "tells that the game ended before the first results", "'Ver tudo' and the card's title point to the flagged views", "empty messages of the two cards", "shows 'Excelente! Todos concluíram' when nobody is listed", "everybody who needs help is readable", "each '?' explains its rule"
  - Implementar: `components/reports/report-summary.tsx`
  - Cobre: CA-03, CA-13, CA-24, CA-26, CA-27 · RN-35 a RN-39

- [x] **T25** `web` — participantes `[P]`
  - Teste: `components/reports/participants-table.test.tsx` › "shows ten rows and the rest on 'Mostrar mais'", "the flagged view lists who needs help, lowest first", "a dash when nothing was left unanswered"; `components/reports/participant-detail.test.tsx` › "shows each answer, its result, points and time", "tells 'Sem resposta'", "results are told in text"
  - Implementar: `components/reports/participants-table.tsx`, `participant-detail.tsx`
  - Cobre: CA-08, CA-12, CA-28, CA-29, CA-46 · RN-40 a RN-42

- [x] **T26** `web` — perguntas `[P]`
  - Teste: `components/reports/questions-table.test.tsx` › "shows ten rows in the order played", "filters by the statement", "the flagged view lists the difficult ones"; `components/reports/question-detail.test.tsx` › "shows the answers with shape, text, the right one and the counts", "tells how many did not answer and the average time", "lists who answered what"
  - Implementar: `components/reports/questions-table.tsx`, `question-detail.tsx`
  - Cobre: CA-11, CA-30, CA-31 · RN-43, RN-44

- [x] **T27** `web` — a rota `/reports/$gameId`
  - Teste: `components/reports/report-trashed.test.tsx` › "tells the report is in the trash and offers restore"
  - Implementar: `components/reports/report-trashed.tsx`, `routes/_auth/_shell/reports.$gameId.tsx` (`tab`, `view`, `participant` e `question` no endereço; os detalhes num `Sheet`; "não encontrado"; "Jogar de novo" com `usePlayAgain`)
  - Cobre: CA-06, CA-23, CA-26, CA-36, CA-44, CA-47 · RN-33, RN-48, RN-51

- [x] **T28** `web` — o cartão "Relatórios mais recentes" `[P]`
  - Teste: `components/home/recent-reports-card.test.tsx` › "lists the recent reports with name, date and accuracy", "links to all with the total", "explains when there is none, without 'Em breve'", "error state with 'Tentar novamente'"
  - Implementar: `components/home/recent-reports-card.tsx`, `routes/index.tsx`
  - Cobre: CA-21 · RN-31

- [x] **T29** `web` — "Ver relatório" no pódio `[P]`
  - Teste: `components/game/host/podium.test.tsx` › "the podium links to the report"
  - Implementar: `components/game/host/podium.tsx`
  - Cobre: CA-39 · RN-49

## Fase 6 — E2E e fechamento

- [x] **T30** E2E — do pódio ao relatório, um cenário curto
  - Teste: `apps/web/e2e/reports.spec.ts` › "do pódio ao relatório: resumo, abas, lixeira com desfazer e jogar de novo" (quiz de uma pergunta, um jogador; desktop e celular)
  - Cobre: CA-01, CA-23, CA-36, CA-39, CA-40, CA-45

- [x] **T31** Conferência no navegador
  - Com uma partida de várias perguntas e alguns jogadores: a lista, o Resumo, as duas abas e os dois detalhes, em tela larga e estreita, ao lado das capturas do Kahoot; uma partida encerrada no meio; um quiz excluído de vez com relatório; a lixeira com vários selecionados
  - Cobre: CA-02, CA-37, CA-41, CA-45, CA-46

- [x] **T32** Fechamento
  - `pnpm check`, `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`; os E2E de jogo e o novo (a suíte de relatórios lê as tabelas do jogo)
  - ADR 0010 → aceito; `docs/architecture.md` (contexto `reports`), `CLAUDE.md`, `specs/glossary.md`, `specs/roadmap.md`
  - `spec.md` e `tasks.md` → `done`, com o changelog e os desvios do plano

## Cobertura dos critérios de aceite

| CA | Tarefas | CA | Tarefas | CA | Tarefas |
| --- | --- | --- | --- | --- | --- |
| CA-01 | T07, T14, T20, T30 | CA-17 | T06, T14, T22 | CA-33 | T06, T10, T15, T23 |
| CA-02 | T01, T08, T14, T31 | CA-18 | T20, T22 | CA-34 | T01, T10, T16, T21, T23 |
| CA-03 | T07, T08, T24 | CA-19 | T07, T20, T22 | CA-35 | T21, T23 |
| CA-04 | T14 | CA-20 | T07, T20, T22 | CA-36 | T27, T30 |
| CA-05 | T14 | CA-21 | T28 | CA-37 | T07, T08, T12, T13, T14, T16, T23, T31 |
| CA-05a | T07, T10, T15 | CA-22 | T05, T08, T23 | CA-38 | T07, T08, T20 |
| CA-06 | T01, T08, T16, T27 | CA-23 | T27, T30 | CA-39 | T29, T30 |
| CA-07 | T03 | CA-24 | T08, T24 | CA-40 | T07, T11, T21, T22, T30 |
| CA-08 | T03, T25 | CA-25 | T17 | CA-41 | T11, T16, T20, T22, T31 |
| CA-09 | T03, T04, T09 | CA-26 | T24, T27 | CA-42 | T11, T15, T22 |
| CA-10 | T03, T09 | CA-27 | T08, T24 | CA-43 | T11, T15, T21, T22 |
| CA-11 | T02, T04, T26 | CA-28 | T08, T25 | CA-44 | T01, T08, T16, T27 |
| CA-12 | T02, T03, T25 | CA-29 | T09, T25 | CA-45 | T30, T31 |
| CA-13 | T03, T24 | CA-30 | T08, T26 | CA-46 | T17, T18, T25, T31 |
| CA-14 | T14 | CA-31 | T04, T09, T26 | CA-47 | T20, T27 |
| CA-15 | T03, T05, T13, T17 | CA-32 | T14 | | |
| CA-16 | T19, T22 | | | | |

Todos os 48 critérios (CA-01 a CA-47 e CA-05a) aparecem em ao menos uma tarefa.
