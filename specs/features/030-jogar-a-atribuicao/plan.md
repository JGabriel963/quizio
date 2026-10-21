---
spec: "030"
status: approved # draft | approved
---

# Plano técnico — 030 Atribuir quiz 2/2 — Jogar a atribuição

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md) · ADR: [0014](../../../docs/adr/0014-atribuicao-como-partida.md) (com a seção nova "Andamento por participante")

## Abordagem

A atribuição já é uma partida (ADR 0014) com as perguntas copiadas em `game_question`. Na partida ao vivo, **onde o jogo está** é da partida (`GameProgress`); na atribuição, é de **cada participante**. Por isso o andamento vai para a linha do jogador: `game_player` ganha a pergunta, a tela e o instante em que a pergunta foi mostrada a ele (`ParticipantProgress`), mais a ordem das alternativas sorteada para ele. Todo o resto é reaproveitado sem mudança: `Player` com apelido único e o limite de 200 na inserção (`players.add`), o avatar (spec 028), a resposta como uma linha de `game_answer` com acerto e pontos calculados no recebimento (`correctnessOf`, `answerPoints`), a classificação derivada das respostas (`rankPlayers`), e o relatório, que já lê jogadores e respostas (spec 015, ADR 0010).

Não há timers no servidor: o prazo de uma pergunta é `startedAt + tempo limite`, conferido por quem lê ou escreve (`settleParticipant`), como o prazo da partida (ADR 0009). Quem avança é o próprio aparelho (`advance` com a tela de onde parte, gravado com uma atualização condicional), então um clique repetido não pula duas telas. O aparelho pergunta a sua tela ao servidor (`play`), que manda **o tempo que falta, nunca um instante**. Não há eventos em tempo real: cada participante só depende de si, o placar é lido ao abrir "Pontuações", e o relatório do criador consulta de novo a cada 30 s.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Andamento do participante | `ParticipantProgress` (`questionIndex`, `phase`, `startedAt`) | sim |
| Tela do participante | `PARTICIPANT_PHASES` = `ready` \| `answering` \| `results` \| `scoreboard` \| `finished` | sim |
| Ordem das alternativas do participante | `Player.choiceOrder` | sim |
| Jogar a atribuição (visão) | `AssignmentPlayView` | sim |
| Pontuações da atribuição | `assignmentScoreboard` | sim |
| Capa da atividade | `AssignmentCoverView` | sim |

## Domínio — `packages/core/src/game/domain`

### `participant-progress.ts` (novo)

```ts
export const PARTICIPANT_PHASES = ["ready", "answering", "results", "scoreboard", "finished"] as const;
export interface ParticipantProgress {
	questionIndex: number;      // 0 em "ready"; a última em "finished"
	phase: ParticipantPhase;
	startedAt: Date;            // quando a tela começou; em "answering", o início da contagem (RN-09)
}

/** Ao entrar: "ready" com Personagens ligada (RN-06), senão a pergunta 0 já respondendo (RN-05). */
export function firstProgress(game: Game, now: Date): ParticipantProgress;

/** O prazo da pergunta; null com o timer desligado (RN-09). */
export function answerDeadline(game: Game, question: GameQuestion, progress: ParticipantProgress): Date | null;

/** Com o prazo vencido em "answering", vai para "results" no prazo (RN-08, RN-21). Idempotente. */
export function settleProgress(game: Game, question: GameQuestion, progress: ParticipantProgress, now: Date): ParticipantProgress;

/** A tela seguinte (RN-12): ready→answering(0); results→scoreboard; scoreboard→answering(n+1) ou finished. */
export function nextProgress(progress: ParticipantProgress, questionCount: number, now: Date): ParticipantProgress;

/** A atividade acabou no meio: finished, sem mexer nas respostas (RN-23). */
export function finishProgress(progress: ParticipantProgress, now: Date): ParticipantProgress;
```

### `Player` (alterado) — `player.ts`

- `progress: ParticipantProgress | null` — null na partida ao vivo.
- `choiceOrder: string[][] | null` — para cada pergunta, os IDs das alternativas na ordem do participante (RN-07); null sem a ordem aleatória (vale a da pergunta).
- `newAssignmentParticipant(input)` — o jogador de uma atribuição: `firstQuestionIndex` 0, `progress` de `firstProgress`, `choiceOrder` sorteada com o `Shuffler` só para perguntas Quiz quando `randomizeAnswers` (verdadeiro ou falso nunca, spec 012).

### `assignment-scoreboard.ts` (novo)

```ts
/** Os cinco primeiros e a linha de quem vê, se estiver fora (RN-14, RN-15). */
export function assignmentScoreboard(
	standings: readonly Standing[],          // rankPlayers sobre o total atual de todos
	previous: readonly Standing[],           // os mesmos, sem a última resposta de quem vê (a seta de subida)
	viewerId: string,
): { top: ScoreboardEntry[]; viewer: ScoreboardEntry | null };
```

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| `ParticipantNotAtStageError` | `ASSIGNMENT.NOT_AT_STAGE` | `answer`/`advance` de uma tela que não é a atual do participante (RN-12, RN-13) |
| `AnswersClosedError` (existente) | `GAME.ANSWERS_CLOSED` | resposta depois do prazo da pergunta (RN-09, RN-21) |
| `AlreadyAnsweredError` (existente) | `GAME.ALREADY_ANSWERED` | segunda resposta à mesma pergunta |
| `GameEndedError` (existente) | `GAME.ENDED` | jogar depois de a atribuição acabar (RN-23) |
| `GamePinNotRecognizedError`, `NicknameTakenError`, `GameFullError` (existentes) | | entrar (RN-03, RN-04) |

## Aplicação — `packages/core/src/game/application`

### Casos de uso (todos públicos; o participante prova quem é com `playerId` + `secret`, como na partida)

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `createGetAssignmentCover` | `{ gameId }` | `AssignmentCoverView` (aberta: nome, capa, perguntas, criador, `remainingMs`, participantes; ou encerrada) | `GAME.NOT_FOUND` | `assignmentLanding` (+ capa e contagem de perguntas na consulta), `storage`, `clock` |
| `createJoinAssignment` | `{ gameId, nickname, avatar? }` | `{ playerId, secret, nickname }` | `GAME.NOT_FOUND`, `GAME.ENDED`, `GAME.FULL`, `GAME.NICKNAME_TAKEN`, `GAME.INVALID_NICKNAME` | `games`, `players`, `gameQuestions`, `shuffler`, `ids`, `clock` |
| `createGetAssignmentPlay` | `{ gameId, playerId, secret }` | `AssignmentPlayView` | `GAME.NOT_FOUND` | `games`, `players`, `gameQuestions`, `answers`, `storage`, `clock` |
| `createStartAssignmentPlay` | `{ …participante }` | `AssignmentPlayView` | `ASSIGNMENT.NOT_AT_STAGE`, `GAME.ENDED` | idem |
| `createAnswerAssignmentQuestion` | `{ …participante, questionIndex, choiceIds }` | `AssignmentPlayView` | `ASSIGNMENT.NOT_AT_STAGE`, `GAME.ANSWERS_CLOSED`, `GAME.ALREADY_ANSWERED`, `GAME.INVALID_ANSWER`, `GAME.ENDED` | idem |
| `createAdvanceAssignmentPlay` | `{ …participante, from: { questionIndex, phase } }` | `AssignmentPlayView` | `ASSIGNMENT.NOT_AT_STAGE`, `GAME.ENDED` | idem |
| `createChangeAssignmentAvatar` | `{ …participante, avatar }` | `{ avatar }` | `GAME.AVATAR_FIXED` fora de `ready` | `players` |

Detalhes:

- **Um carregamento comum** (`loadParticipant`): `loadGame` (prazo da atribuição) → `requireAssignment` → jogador com o segredo → pergunta atual → `settleProgress` no relógio do servidor; se mudou, grava com `players.saveProgressIfAt`. Com a atribuição acabada e o participante não em `finished`, `finishProgress` (RN-23).
- **`answer`**: confere `progress` em (`questionIndex`, `answering`); tempo de resposta = `now - startedAt` (servidor, RN-13); depois do prazo → `GAME.ANSWERS_CLOSED` e a tela vai para o resultado; `choiceIds` na ordem da pergunta (a ordem do participante é só de apresentação); pontos com `answerPoints(question, choiceIds, questionTimer ? responseTimeMs : 0)` — **com o timer desligado, tempo zero, pontos cheios** (RN-10); `answers.add` (a chave impede duas) e então `saveProgressIfAt(from: answering → results)`.
- **`advance`**: só sai da tela de onde o aparelho diz que parte (`saveProgressIfAt`); um pedido repetido devolve a tela atual sem erro, como `advanceGame`.
- **`AssignmentPlayView`** (o que o aparelho desenha):

```ts
type AssignmentPlayView = {
	nickname: string;
	avatar: Avatar | null;
	questionCount: number;
	activity: { name: string; creatorName: string; remainingMs: number | null }; // null acabada
	endedEarly: boolean;                    // a atividade acabou com o participante no meio (RN-23)
	screen:
		| { phase: "ready" }
		| { phase: "answering"; question: PublicQuestion; remainingMs: number | null }
		| { phase: "results"; result: QuestionResultView; total: number }
		| { phase: "scoreboard"; questionIndex: number; scoreboard: AssignmentScoreboardView }
		| { phase: "finished"; place: number; total: number; scoreboard: AssignmentScoreboardView };
	/** As perguntas já com resultado, para o ← (RN-12, RN-17); só leitura. */
	history: QuestionResultView[];
};
// QuestionResultView: a pergunta pública (enunciado, imagem, alternativas na ordem do participante com forma e texto)
// + as escolhidas + quais são certas + correctness | "unanswered" + points.
```

  A alternativa certa só vai ao aparelho **no resultado** daquela pergunta, nunca em `answering` (constituição, artigo V; spec 009). O `history` só traz perguntas já com resultado.

- **`assignmentScoreboard`** usa `answers.totalsThrough(gameId, questionCount - 1)` (o total atual de todos, RN-14) e `players.listActive`, com `shownPlayers` (avatares só com Personagens, spec 028).

### Portas alteradas

```ts
// player-repository.ts
interface PlayerRepository {
	/**
	 * Grava só o andamento, se o guardado ainda é `from`; false se outro pedido
	 * mudou antes (RN-12). Como `games.saveIfAt`.
	 */
	saveProgressIfAt(playerId: string, from: ParticipantProgress, next: ParticipantProgress): Promise<boolean>;
}

// assignment-landing-query.ts — o registro ganha o que a capa mostra (RN-01)
interface AssignmentLandingRecord { /* … */ coverImageKey: string | null; questionCount: number; }
```

`add` já grava o jogador inteiro (com `progress` e `choiceOrder`). Fakes: `InMemoryPlayerRepository.saveProgressIfAt`; `InMemoryAssignmentLandingQuery` com capa e contagem.

### `reports` (alterado)

- `getReport`: numa atribuição, `summary.durationMs` vira `null` e o Resumo não mostra "Tempo" (RN-27). O resto já vale: as perguntas de cada participante são todas (`playedQuestionCount` da atribuição = todas, spec 029), então a que ele não respondeu é "não respondida" (RN-26).
- `ReportGameQuery`/adapter: sem mudança de contrato (já lê participantes e respostas de atribuições).

## Adapters

### Banco — `packages/db`

`schema/game.ts`, `game_player`:

- `participant_phase` (enum `participant_phase`, nulo), `progress_question_index integer` (nulo), `progress_started_at timestamptz` (nulo) — os três juntos, nulos na partida ao vivo.
- `choice_order jsonb` (nulo).

`drizzle-player-repository.ts`: mapear as colunas; `saveProgressIfAt` com `update … where id and participant_phase = from.phase and progress_question_index = from.questionIndex and progress_started_at = from.startedAt returning id`.

`drizzle-assignment-landing-query.ts`: junta `quiz.cover_image_key` (o quiz pode não existir mais: null) e `game.question_count`.

Migration nova (`pnpm db:generate`): enum + 4 colunas nulas. Compatível com o código anterior.

### Real-time

Nenhum evento novo. O que muda para um participante só depende dele; o placar e o relatório são lidos de novo.

### Storage

As imagens das perguntas e a capa saem por `storage.getPublicUrl` (chaves, nunca URLs guardadas, ADR 0003), como em `publicStageOf`.

## API — `packages/api`

No sub-router `game.assignment` (spec 029), procedures públicas para o participante:

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `game.assignment.cover` | query | pública | `{ gameId }` | `AssignmentCoverView` | `GAME.NOT_FOUND` |
| `game.assignment.join` | mutation | pública | `{ gameId, nickname, avatar? }` | `{ playerId, secret, nickname }` | ver acima |
| `game.assignment.play` | query | pública | `participante` | `AssignmentPlayView` | `GAME.NOT_FOUND` |
| `game.assignment.start` | mutation | pública | `participante` | `AssignmentPlayView` | `ASSIGNMENT.NOT_AT_STAGE` |
| `game.assignment.answer` | mutation | pública | `participante + { questionIndex, choiceIds }` | `AssignmentPlayView` | ver acima |
| `game.assignment.advance` | mutation | pública | `participante + { from: { questionIndex, phase } }` | `AssignmentPlayView` | `ASSIGNMENT.NOT_AT_STAGE` |
| `game.assignment.setAvatar` | mutation | pública | `participante + { avatar }` | `{ avatar }` | `GAME.AVATAR_FIXED`, `GAME.UNKNOWN_AVATAR` |

`landing` (spec 029) é substituída por `cover`. `participante` = `{ gameId, playerId, secret }`, o mesmo `playerReference` do `joinRouter`. `container.ts`: os sete casos de uso.

## UI — `apps/web`

- **`lib/assignment-session.ts`** — o que o navegador guarda por atividade (`{ gameId, playerId, secret }`, chave por `gameId`), como `lib/player-session.ts` (RN-20).
- **Rota `routes/assignment.$gameId.tsx`** — passa a ser o jogo: sem sessão guardada, a capa (`game.assignment.cover`), "Iniciar", o apelido (`join`); com sessão, `game.assignment.play`, consultado de novo quando a tela pede (fim do tempo pelo `useCountdown`) e ao voltar a ficar visível. As ações (`start`, `answer`, `advance`, `setAvatar`) devolvem a visão nova, que substitui o cache.
- **Componentes `components/assignment/play/`**, todos com as ações por props (testáveis sem tRPC), dentro de `GameScreen`:
  - `assignment-cover.tsx` (RN-01), e o apelido reaproveitando o formulário da tela da atividade (sem o "Em breve");
  - `ready-screen.tsx` — o `AvatarEditor` da spec 028 e "Começar" (RN-06);
  - `play-question.tsx` — progresso no topo, a pergunta pelo `question-on-device.tsx` da spec 012 (imagem, enunciado, alternativas e barra de tempo, em telas largas também), múltipla escolha com "Enviar";
  - `play-result.tsx` — alternativas apagadas menos a escolhida e a certa, faixa "Correto"/"Incorreto"/"Tempo esgotado" e depois "+ N" (`CountUp`, `motion`) (RN-11);
  - `play-scoreboard.tsx` — os cinco primeiros e a linha de quem vê, reaproveitando as linhas e a animação de `host/scoreboard.tsx` (RN-15);
  - `play-final.tsx` — cabeçalho da atividade, medalha com a posição e confetes, classificação, "Entrar em outro jogo" (RN-16, RN-18); "Esta atividade foi encerrada" quando `endedEarly`;
  - `play-arrows.tsx` — as setas ← → (RN-12), com o ← andando pelo `history` no próprio aparelho (RN-17).
- **Conexão** (RN-24): `useConnectionWatch` e "Sua resposta não foi enviada." como em `join-flow`.
- **Relatório**: `refetchInterval` de 30 s em `report.get` e `report.list` enquanto a atribuição está aberta (RN-28); "Jogue este quiz" vira um link para `/assignment/{id}` em nova aba (RN-29); o Resumo de uma atribuição acabada não mostra "Tempo" (RN-27).

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | aplicação + componente + E2E | `join` cria o participante e o põe na pergunta 0; capa → apelido → pergunta | `join-assignment.test.ts`, `assignment-cover.test.tsx`, `e2e/assignment-play.spec.ts` |
| CA-02 | E2E | PIN leva à capa | `e2e/assignment-play.spec.ts` |
| CA-03 | aplicação | apelido em uso (sem diferenciar acento e maiúscula) → `GAME.NICKNAME_TAKEN` | `join-assignment.test.ts` |
| CA-04 | aplicação + repositório | 200 → `GAME.FULL`; encerrada → `GAME.ENDED` | `join-assignment.test.ts`, `drizzle-player-repository` (já existe o limite) |
| CA-05 | domínio + aplicação + componente | `firstProgress` com Personagens → `ready`; `start`; `setAvatar` só em `ready` | `participant-progress.test.ts`, `assignment-play.test.ts`, `ready-screen.test.tsx` |
| CA-06 | aplicação | resposta certa em 2 s de 20 → 950, `results` | `answer-assignment-question.test.ts` |
| CA-07 | aplicação + componente | errada → 0, a certa revelada só no resultado | `answer-assignment-question.test.ts`, `play-result.test.tsx` |
| CA-08 | domínio + aplicação | prazo vencido → `results` sem resposta; resposta tardia → `GAME.ANSWERS_CLOSED` | `participant-progress.test.ts`, `answer-assignment-question.test.ts` |
| CA-09 | domínio + aplicação | timer desligado: sem prazo, `remainingMs` null, 1000 pontos | `participant-progress.test.ts`, `answer-assignment-question.test.ts` |
| CA-10 | domínio + aplicação | `nextProgress` e `advance`; sem `advance`, a tela fica | `participant-progress.test.ts`, `advance-assignment-play.test.ts` |
| CA-11 | componente | ← mostra o resultado anterior, sem alternativas acionáveis | `play-arrows.test.tsx` |
| CA-12 | aplicação + repositório | resposta a outra pergunta → `ASSIGNMENT.NOT_AT_STAGE`; `saveProgressIfAt` condicional | `answer-assignment-question.test.ts`, `drizzle-player-progress.test.ts` |
| CA-13 | domínio + aplicação | ordem sorteada por participante, fixa; V/F sem sorteio; a resposta é avaliada pelos IDs | `player.test.ts`, `assignment-play.test.ts` |
| CA-14, CA-15, CA-16 | domínio + aplicação + componente | `assignmentScoreboard`: sozinho; total atual de todos; cinco primeiros + linha de quem vê | `assignment-scoreboard.test.ts`, `assignment-play.test.ts`, `play-scoreboard.test.tsx` |
| CA-17 | aplicação + componente | `finished` com a posição; "Entrar em outro jogo" leva a `/join` | `advance-assignment-play.test.ts`, `play-final.test.tsx` |
| CA-18 | aplicação + componente | `history` com todas as perguntas; ← percorre do fim ao começo | `assignment-play.test.ts`, `play-arrows.test.tsx` |
| CA-19, CA-20 | domínio + aplicação | `play` depois de 10 s e de 1 min: `remainingMs` e `results` sem resposta | `assignment-play.test.ts` |
| CA-21 | aplicação + componente | `finished` volta ao fim; a rota com sessão vai direto ao fim | `assignment-play.test.ts`, `lib/assignment-session.test.ts` |
| CA-22 | aplicação + repositório (relatório) | encerrada no meio → `finished`, `endedEarly`; respostas recusadas; 4 não respondidas no relatório | `assignment-play.test.ts`, `drizzle-report-game-query.test.ts` |
| CA-23 | aplicação (reports) | atribuição com 3 de 5 respondidas → 40%, "John 2" em Não concluiu | `get-report.test.ts` |
| CA-24 | componente (rota) | relatório de atribuição aberta consulta de novo a cada 30 s | `report-summary` / teste da opção de consulta em `lib/report-queries.test.ts` |
| CA-25 | componente | "Jogue este quiz" é um link para a atividade em nova aba | `assignment-summary.test.tsx` |
| CA-26 | E2E (celular) | capa, apelido, pergunta, resultado, placar e fim sem rolagem horizontal | `e2e/assignment-play.spec.ts` |

## Dados e migração

`pnpm db:generate`: enum `participant_phase` e as colunas `game_player.participant_phase`, `progress_question_index`, `progress_started_at`, `choice_order`, todas nulas. **Lembrete local**: o `db:push` não cria bem enums novos em colunas existentes às vezes; conferir o banco local depois (memória da máquina). Nenhum backfill.

## Riscos e decisões

- **Andamento na linha do jogador** (extensão do ADR 0014, seção nova "Andamento por participante"): a alternativa era uma tabela `assignment_progress`; a linha do jogador já é por participante e por atividade, e o relatório já a lê. As colunas são nulas na partida ao vivo.
- **O tempo de resposta conta do momento em que a pergunta foi gravada como mostrada**, não do momento em que o aparelho a desenhou: a latência do primeiro carregamento come um pouco do tempo (dezenas de ms). Aceitável e igual à partida ao vivo.
- **`settleProgress` grava ao ler**: uma leitura (`play`) pode escrever, como `loadGame` faz com o prazo da partida.
- **Sem eventos em tempo real**: o placar de quem joga junto só muda quando a pessoa abre "Pontuações" de novo; é o que os vídeos mostram (cada tela é uma leitura).
- **Placar do fim muda depois** (RN-19): é lido de novo a cada abertura; nada é congelado.
- **`landing` some** em troca de `cover` (mesma consulta, mais campos); a rota é a única que a usava.
