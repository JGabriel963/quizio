---
spec: "012"
status: done # todo | in-progress | done
---

# Tarefas — 012 Opções de jogo 1/3: Configurações, entrada durante o jogo, perguntas no celular e ordem aleatória

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando.

## Fechamento (2026-10-02)

- Testes: `pnpm test` 1535 ✅ (core 696, db 88, api 82, ui 32, web 613, auth 15, realtime 6, storage 3); `pnpm check-types` e `pnpm -F web exec tsc --noEmit` limpos; Biome limpo nos arquivos alterados.
- E2E: 96 ✅ (desktop + celular), na rodada completa. `game-options.spec.ts` é novo: painel no lobby e durante o jogo, opção que falha ao salvar e volta, perguntas e textos no celular com as alternativas sorteadas iguais às da tela do anfitrião, PIN no cabeçalho, entrada com as respostas abertas, múltipla escolha com marcadores e "Enviar", e a pergunta seguinte jogada por quem entrou no meio. `game-play.spec.ts` deixou de esperar "Este jogo já começou.".
- `pnpm test:int` não foi rodado: `packages/realtime` e `packages/storage` não mudaram.
- Banco: `pnpm -F @quizio/db db:push` aplicado no banco local (três colunas em `game`, uma em `game_player`, tabela `host_preferences`). Outras máquinas precisam rodar o mesmo comando.
- Conferido no navegador, numa partida de verdade: o painel no lobby, com as chaves gravando na hora e o cadeado do lobby fechando junto com "Bloquear jogo"; o painel durante o jogo, com as duas chaves de ordem aleatória desabilitadas e a explicação; o cabeçalho com o QR e o PIN; o celular com a abertura da pergunta (enunciado e barra de leitura) e com as respostas (imagem, enunciado, aviso da múltipla escolha, marcadores, "Enviar" e barra de tempo); as alternativas sorteadas iguais no anfitrião e no celular; marcar sem enviar e ver "Tempo esgotado"; e, pela API, um jogador entrando na revelação e ficando à espera, com 0 pontos e sem resultado.
- Só nos testes, não no navegador: a tela "Você entrou!"; as perguntas em ordem aleatória; Verdadeiro ou falso com os textos; textos longos e seis alternativas no celular; o cabeçalho bloqueado durante o jogo; a falha ao salvar uma opção; o QR expandido a partir do cabeçalho.
- TDD: os testes do domínio, dos casos de uso, dos repositórios, da API, do lado do anfitrião e das telas e do fluxo do jogador foram escritos e vistos falhar antes do código. Os de `Switch`, `Sheet` e `AnswerButtons` foram escritos junto com os componentes, sem a rodada vermelha. Na API, a rodada vermelha foi do arquivo inteiro (o contêiner ainda não tinha as portas novas), não teste a teste.
- Testes das specs 008 e 009 ajustados: os que esperavam a recusa de quem entra com o jogo em andamento passaram a esperar a entrada; os que comparavam o palco público e as visões por igualdade ganharam os campos novos.
- Desvios do plano: no fim de [plan.md](plan.md).
- Visto uma vez no console do navegador, na página do quiz, logo depois de o servidor de desenvolvimento reotimizar as dependências por causa dos imports novos: "Invalid hook call", com `react` e `react-dom` servidos de duas versões do cache do Vite na mesma página. Sumiu ao recarregar e não voltou; não é do produto.
- Sobrou no banco local: duas partidas encerradas do quiz de teste "Capitais do mundo (cópia)", além da terminada que já existia. As preferências do usuário, ligadas durante a conferência, foram devolvidas a tudo desligado.

## Fase 1 — Domínio

- [x] **T01** `core/game` — opções de jogo como valor da partida
  - Teste: `game-options.test.ts` › "every option starts off"; "changes an option in the lobby"; "changes showing the questions while the game is on"; "refuses the random orders once the game started"; "refuses an ended game"; `game.test.ts` › "a new game carries the options it was given"
  - Implementar: `domain/game-options.ts` (`GameOptions`, `DEFAULT_GAME_OPTIONS`, `changeGameOptions`, `GameOptionsFixedError`), `domain/game.ts` (`Game.options`, `newGame`), `testing/` (construtores de partida com `options`)
  - Cobre: CA-05, CA-31, RN-05, RN-07, RN-21, RN-25
- [x] **T02** `core/game` — entrar com a partida em andamento e a primeira pergunta de quem entra
  - Teste: `game.test.ts` › "a game in progress can be joined"; "a locked game in progress cannot be joined"; "a finished game cannot be joined"; `player.test.ts` › "who joins in the lobby starts at the first question"; "who joins before the answers open plays that question"; "who joins from the answers on starts at the next question"; "who joins at the last answers has no question to play"; "may answer from the first question on"
  - Implementar: `domain/game.ts` (`assertJoinable`), `domain/player.ts` (`Player.firstQuestionIndex`, `firstQuestionFor`, `canAnswer`)
  - Cobre: CA-11, CA-12, CA-15, CA-18, CA-19, RN-10, RN-12, RN-13, RN-17
- [x] **T03** `core/game` — perguntas e alternativas na ordem da partida
  - Teste: `game-question.test.ts` › "keeps the editor's order with both options off"; "shuffles the questions and numbers them in the drawn order"; "shuffles the positions among the filled answers"; "the right answer goes with its answer to the new shape"; "true or false is never shuffled"; "shuffling the answers leaves the questions in order"
  - Implementar: `domain/game-question.ts` (`arrangeGameQuestions`)
  - Cobre: CA-26 a CA-29, CA-33, RN-22 a RN-24
- [x] **T04** `core/game` — palco público com o enunciado, os textos e a imagem
  - Teste: `public-stage.test.ts` › "sends no text and no image with the option off"; "sends the statement in the question's intro"; "sends the statement, the texts and the image while answering"; "true or false sends its two labels"; "an image set as background goes like any other"; "never tells the right answer"
  - Implementar: `domain/public-stage.ts` (`PublicStage.question.text`, `image`, `choices[].text`, `publicStageOf(game, question, imageUrlOf)`)
  - Cobre: CA-20 a CA-23, CA-22a, CA-22b, RN-18 a RN-20

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T05** opções salvas para o criador
  - Teste: `host-game.test.ts` › "a first game starts with every option off"; "a new game starts with the options the host saved"; "a new game is never locked"; `set-game-options.test.ts` › "changes the game and saves it for the next one"; "another host's options are untouched"; "another owner's game does not exist"; "refuses the random orders while the game is on"; "does not move the game's stage"; "does not save the lock"
  - Implementar: `application/ports/host-preferences-repository.ts`, `testing/in-memory-host-preferences-repository.ts`, `application/ports/game-repository.ts` + fake (`saveSettings`), `application/host-game.ts`, `application/set-game-options.ts`, `application/host-game-view.ts` (`options`)
  - Cobre: CA-04 a CA-06, CA-08, CA-31, RN-04 a RN-07
- [x] **T06** bloquear e desbloquear durante o jogo
  - Teste: `set-game-locked.test.ts` › "locks a game in progress"; "unlocks a game in progress"; "locking does not undo an advance written meanwhile"
  - Implementar: `application/set-game-locked.ts` (grava por `saveSettings`)
  - Cobre: CA-09, CA-15, CA-16, RN-08, RN-09
- [x] **T07** iniciar com o sorteio
  - Teste: `start-game.test.ts` › "plays the questions in the drawn order"; "plays the answers in the drawn positions"; "the same order is read again after the start"; "leaves the quiz as it was"; "both options off keep the editor's order"; "playing again draws again with the same options"
  - Implementar: `shared/application/ports/shuffler.ts`, `shared/testing/fixed-shuffler.ts`, `application/start-game.ts`
  - Cobre: CA-26 a CA-28, CA-30, CA-32, CA-33, RN-22, RN-23, RN-26, RN-27
- [x] **T08** entrar durante o jogo
  - Teste: `find-game-by-pin.test.ts` › "finds a game in progress"; "a locked game in progress tells it is locked"; "a finished game's PIN is not recognized"; `join-game.test.ts` › "joins before the answers open and plays that question"; "joins with the answers open and waits for the next"; "joins at the last answers"; "a nickname in use is refused while the game is on"; "a full game is refused while the game is on"; "a removed nickname stays blocked"; "tells the host's screen about who joined"
  - Implementar: `application/find-game-by-pin.ts`, `application/join-game.ts`; ajustar os testes das specs 008 e 009 que esperam `GAME.ALREADY_STARTED` na entrada
  - Cobre: CA-11, CA-12, CA-15 a CA-19, RN-10, RN-12, RN-13, RN-17
- [x] **T09** respostas de quem pode responder
  - Teste: `submit-answer.test.ts` › "refuses an answer to a question before the player's first"; "closes the answers without waiting for who joined late"; "waits for who joined before the answers opened"; e conferir o caso que já existe das três certas, duas certas e duas certas com a errada (2600, 1733, 0)
  - Implementar: `application/ports/player-repository.ts` + fake (`countEligible`), `application/submit-answer.ts`
  - Cobre: CA-13, CA-37, RN-16, RN-32
- [x] **T10** o que cada tela recebe
  - Teste: `get-player-session.test.ts` › "who joined late sits out the question in course"; "sits out without a result and without time over"; "plays the next question normally"; "is in the standings with zero, after who was there"; "goes to the end with zero and the last place"; "gets the statement, the texts and the image with the option on"; "gets shapes only with the option off"; "an option changed in the middle shows at the next stage"; `get-host-game.test.ts` › "tells the game's options"; "counts who joined in the middle"; `advance-game.test.ts` › "the stage sent to the devices follows the option"
  - Implementar: `application/get-player-session.ts` (`sittingOut`, `storage`), `application/publish-stage.ts` (recebe o storage), `application/host-game-view.ts`
  - Cobre: CA-12, CA-14, CA-18, CA-20 a CA-24, CA-30, RN-13 a RN-15, RN-21

## Fase 3 — Adapters (repositórios)

- [x] **T11** `packages/db` — colunas, preferências e gravações novas
  - Teste: `drizzle-game-repository.test.ts` › "stores and reads the options"; "saveSettings writes the lock and the options only"; "saveSettings does not undo an advance"; `drizzle-player-repository.test.ts` › "stores the first question of who joined"; "counts who may answer a question"; `drizzle-host-preferences-repository.test.ts` › "has nothing for a host who never saved"; "saves and reads"; "saves again over what was there"; "goes away with the user"
  - Implementar: `schema/game.ts` (três colunas em `game`, `first_question_index` em `game_player`, tabela `host_preferences`), `drizzle-game-repository.ts`, `drizzle-player-repository.ts`, `drizzle-host-preferences-repository.ts`
  - Banco: `pnpm -F @quizio/db db:push`
  - Cobre: CA-04, CA-09, CA-13, CA-30

## Fase 4 — API (routers + composition root)

- [x] **T12** `game.setOptions` e as ligações
  - Teste: `random-shuffler.test.ts` › "keeps every item exactly once"; "does not change the list it was given"; `routers/game.test.ts` › "changes the options and keeps them for the next game"; "another creator's game is not found"; "refuses the random orders after the start"; "needs a session"; "a player joins a game in progress (spec 012)"; "the device gets the texts and no right answer with the option on"
  - Implementar: `random-shuffler.ts`, `routers/game.ts` (`setOptions`), `container.ts` (`setGameOptions`, `preferences`, `shuffler`), `composition-root.ts`, `testing/test-context.ts`
  - Cobre: CA-08, CA-11, CA-23, CA-31

## Fase 5 — UI (design system → componentes do app → rotas)

- [x] **T13** [P] `packages/ui` — `Switch` e `Sheet`
  - Teste: `switch.test.tsx` › "turns on and off"; "does nothing when disabled"; "tells its state to assistive technology"; `sheet.test.tsx` › "opens with its title"; "closes with the button and with Escape"
  - Implementar: `components/switch.tsx`, `components/sheet.tsx` (CLI do shadcn, convertidos ao padrão do projeto), catálogo `/design-system`, `docs/design-system.md`
  - Cobre: RN-02, RN-03
- [x] **T14** painel de configurações
  - Teste: `host/game-settings.test.tsx` › "shows the four switches with their explanations and the footer"; "every switch is off for a first game"; "shows what the game has"; "asks for the change at once"; "the lock switch follows the lobby's lock"; "the random orders are disabled while the game is on, with the reason"; "closes with the button"
  - Implementar: `host/game-settings.tsx`, `lib/api-types.ts`
  - Cobre: CA-01, CA-05, CA-09, CA-31, RN-01 a RN-03
- [x] **T15** cabeçalho do anfitrião
  - Teste: `host/game-header.test.tsx` › "has the settings button in the lobby and during the game"; "has no settings button on the podium"; "shows the address and the PIN during the game"; "shows the lock and no PIN when locked"; "shows the PIN again when unlocked"; "expands the QR code"; "shows no PIN on the podium"
  - Implementar: `host/game-header.tsx`, `host/join-qr.tsx` (o QR expandido, tirado de `join-instructions.tsx`), `host/host-lobby.tsx`, `host/host-stage.tsx`
  - Cobre: CA-03, CA-10, CA-15, CA-16, RN-01, RN-11, RN-12
- [x] **T16** rota do anfitrião: mudar na hora, voltar se falhar
  - Teste: `host/host-stage.test.tsx` › "opens the settings during the answers"; "the results show behind the open panel"; `host/host-lobby.test.tsx` › "the panel's lock closes the lobby's padlock"; `lib/game-mutations.test.tsx` › "shows the change before the server answers"; "goes back and warns when the change fails"
  - Implementar: `lib/game-mutations.ts` (`useSetGameOptions`, bloqueio durante o jogo), `lib/game-error-messages.ts` (`GAME.OPTIONS_FIXED`, aviso de falha), `routes/_auth/host.$gameId.tsx`
  - Cobre: CA-01, CA-02, CA-07, CA-09, RN-04
- [x] **T17** [P] botões de resposta do celular
  - Teste: `player/answer-buttons.test.tsx` › "shows shapes only without the texts"; "shows the shape in the corner and the text"; "true or false shows its two labels"; "long texts wrap inside the button"; "a single selection answers with one tap"; "a multiple selection marks and unmarks without sending"; "sends everything marked"; "send is disabled with nothing marked"; "shows the notice of the multiple selection"
  - Implementar: `player/answer-buttons.tsx`
  - Cobre: CA-20 a CA-22, CA-25, CA-34 a CA-36, CA-39, RN-28, RN-29, RN-31
- [x] **T18** telas do celular
  - Teste: `player/player-stage.test.tsx` › "who joined in the middle waits for the next question"; "shows the total zero and no time over to who joined in the middle"; "the intro shows the statement and the reading bar"; "the answers show the image with its crop above the statement"; "shows no image and no statement with the option off"; "the time bar counts the seconds left"; "the texts fit a narrow screen"
  - Implementar: `player/player-stage.tsx`, `player/question-on-device.tsx` (imagem, faixa do enunciado, barra de tempo), `lib/game-stage.ts`
  - Cobre: CA-12, CA-14, CA-22a a CA-22c, CA-25, RN-18a, RN-18b
- [x] **T19** fluxo do jogador
  - Teste: `player/join-flow.test.tsx` › "joins a game in progress and plays the question"; "joins with the answers open and waits"; "a nickname in use is told during the game"; "sends the marked answers and waits"; "the marks do not count as an answer"; "time over with marks and nothing sent"; "the marks do not go on to the next question"
  - Implementar: `player/join-flow.tsx`, `lib/game-error-messages.ts` (sai "Este jogo já começou.")
  - Cobre: CA-11, CA-17, CA-34, CA-35, CA-38, RN-30

## Fase 6 — E2E e fechamento

- [x] **T20** E2E: opções de jogo
  - Teste: `apps/web/e2e/game-options.spec.ts` — o painel abre no lobby e durante o jogo; com "Mostrar perguntas nos dispositivos" e "Mostrar respostas em ordem aleatória" ligados, o celular mostra o enunciado e os textos, e a alternativa de cada forma é a mesma da tela do anfitrião; um jogador entra pelo PIN do cabeçalho com as respostas abertas, espera e joga a pergunta seguinte; numa pergunta de múltipla escolha, marca duas, envia e vê a espera
  - Ajustar `game-play.spec.ts` e `game-lobby.spec.ts` onde esperam "Este jogo já começou."
  - Cobre: CA-01, CA-10 a CA-12, CA-20, CA-27, CA-34, CA-35
- [x] **T21** Fechamento
  - `pnpm check`, `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, `pnpm test:e2e`
  - Conferir no navegador, com as capturas do Kahoot ao lado: o painel, o cabeçalho com o PIN e bloqueado, o celular com as perguntas (abertura, imagem, Verdadeiro ou falso, textos longos) e a múltipla escolha; as microtransições das telas novas
  - Atualizar `spec.md` (status `done`, changelog), `plan.md` (desvios), `glossary.md`, `roadmap.md`, `CLAUDE.md`, ADR 0009 (entrada durante o jogo, gravação das configurações), `docs/design-system.md`

Cobertura: CA-01 a CA-39, com CA-22a, CA-22b e CA-22c, aparecem em ao menos uma tarefa.

| CA | Tarefas | CA | Tarefas | CA | Tarefas |
| --- | --- | --- | --- | --- | --- |
| 01 | T14, T16, T20 | 15 | T02, T06, T08, T15 | 26 | T03, T07 |
| 02 | T16 | 16 | T06, T08, T15 | 27 | T03, T07, T20 |
| 03 | T15 | 17 | T08, T19 | 28 | T03, T07 |
| 04 | T05, T11 | 18 | T02, T08, T10 | 29 | T03 |
| 05 | T01, T05, T14 | 19 | T02, T08 | 30 | T07, T10, T11 |
| 06 | T05 | 20 | T04, T10, T17, T20 | 31 | T01, T05, T12, T14 |
| 07 | T16 | 21 | T04, T10, T17 | 32 | T07 |
| 08 | T05, T12 | 22 | T04, T10, T17 | 33 | T03, T07 |
| 09 | T06, T11, T14, T16 | 22a | T04, T18 | 34 | T17, T19, T20 |
| 10 | T15, T20 | 22b | T04, T18 | 35 | T17, T19, T20 |
| 11 | T02, T08, T12, T19, T20 | 22c | T18 | 36 | T17 |
| 12 | T02, T08, T10, T18, T20 | 23 | T04, T10, T12 | 37 | T09 |
| 13 | T09, T11 | 24 | T10 | 38 | T19 |
| 14 | T10, T18 | 25 | T17, T18 | 39 | T17 |

## Depois do fechamento (2026-10-02)

- Layout do celular e dos cartões de resposta refeito a pedido do usuário, pelas capturas do Kahoot (ver o changelog da spec). O palco público passou a levar a posição da imagem (`PublicImage.placement`). Conferido no navegador com imagens de fundo, em perguntas de duas e de quatro alternativas; a imagem ao centro no celular ficou só nos testes.
- Correção de uma atualização perdida nas configurações, pega pelo E2E de forma intermitente: duas chaves viradas em seguida podiam desfazer uma à outra, e o mesmo entre o bloqueio e uma opção, e nas preferências salvas. Cada configuração passou a ser gravada sozinha (`saveLocked`, `saveOptions`). Testes novos reproduzem a corrida no caso de uso e conferem as gravações no repositório.
- A contagem do celular não volta mais: quando o aparelho consulta de novo a mesma fase, fica com a leitura que termina primeiro (`earliestDeadline`). Antes, cada resposta do servidor reiniciava a contagem com o atraso da própria resposta, e a barra recuava um pouco.
- A contagem da tela do anfitrião segue a mesma regra (`useSteadyTimeLeft` em `HostStage`): a cada consulta da partida, a fase em curso continua de onde estava, e o pedido da próxima fase não é remarcado.
- Abertura da pergunta do anfitrião em dois passos, como no Kahoot (tipo animado, depois a pergunta; ver o changelog da spec 009), e o cabeçalho em telas largas mostrando "Entre em {endereço}" seguido do PIN, sem quebrar. Conferido no navegador. O tempo do tipo (1,5 s) soma-se aos 5 s de leitura, por decisão do usuário: a abertura da pergunta dura 6,5 s no servidor (`QUESTION_INTRO_MS`), para todas as telas.
- Aviso do navegador ao fechar ou recarregar a aba do anfitrião durante a partida (`useLeaveWarning`; ver o changelog da spec 008).
