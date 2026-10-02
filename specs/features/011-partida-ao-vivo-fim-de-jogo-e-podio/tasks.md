---
spec: "011"
status: done # todo | in-progress | done
---

# Tarefas — 011 Partida ao vivo 4/4: Fim de jogo, pódio e animações

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: teste falhando pelo motivo certo → mínimo para passar → refatorar.

## Fechamento (2026-10-01)

- Testes: `pnpm test` 1359 ✅ (core 621, db 78, api 71, ui 25, web 540, auth 15, realtime 6, storage 3); `pnpm check-types` e `pnpm -F web exec tsc --noEmit` limpos; Biome limpo nos arquivos alterados.
- E2E: 94 ✅ (desktop + celular). `game-play.spec.ts` vai até o pódio, a tela final de cada jogador, a classificação e "Jogar novamente". Uma primeira rodada completa, feita junto com `pnpm test` e um build, teve 3 falhas por tempo em testes do lobby e da biblioteca (desktop); sozinhos e na rodada completa seguinte, com a máquina livre, passaram.
- `pnpm test:int` não foi rodado: `packages/realtime` e `packages/storage` não mudaram. Sem mudança de schema.
- Conferido no navegador, numa partida de três perguntas e seis jogadores: o salto dos apelidos no lobby; as barras da revelação; o primeiro placar contando de 0; o segundo placar medido quadro a quadro (estado anterior, faixa nova subindo com os pontos contando, as outras deslizando, quem saiu sumindo, a seta no fim); o pódio com o 3º aos 2 s, o 2º aos 4 s e o 1º aos 7 s, com confete, brilho e as ações; a classificação; a tela final do celular ("Imbatível!"); e "Jogar novamente" abrindo um lobby com outro PIN.
- Só nos testes, não no navegador: movimento reduzido; a espera "Rufem os tambores…" e o confete no celular; a contagem de "+ N" e do total no celular; pódio com um e com dois jogadores; "Este quiz não pode mais ser jogado."
- Desvios do plano e o tamanho das rotas do jogo antes e depois da `motion`: no fim de [plan.md](plan.md).
- TDD: os testes de domínio (T01 a T03) foram escritos e vistos falhar antes do código; na aplicação, na API e nas telas, teste e implementação foram escritos juntos. Testes das specs 009 e 010 foram ajustados: o fim passou a ser na revelação da última pergunta, e os que liam o placar ao abrir passaram a esperar o estado final.
- Dependência nova: `motion` em `apps/web` (`pnpm install` em outras máquinas).
- Sobrou no banco local um quiz de teste, "Capitais do mundo (cópia)", com três perguntas e uma partida terminada, criado para conferir o placar entre perguntas.

## Fase 1 — Domínio

- [x] **T01** `core/game` — a última revelação termina a partida
  - Teste: `game-progress.test.ts` › "the last results finish the game, without a scoreboard"; "the other results lead to the scoreboard"; "a scoreboard always leads to the next question"
  - Implementar: `domain/game-progress.ts` (`nextStage`)
  - Cobre: CA-01 a CA-04, RN-01, RN-02
- [x] **T02** `core/game` — tempo da revelação do pódio
  - Teste: `podium.test.ts` › "counts the reveal from the instant the game finished"; "is over after the first place shows"; "is zero for a game that is not finished"
  - Implementar: `domain/podium.ts` (`PODIUM_SIZE`, `PODIUM_REVEAL_MS`, `podiumRevealRemainingMs`)
  - Cobre: CA-07, CA-13, RN-10, RN-11
- [x] **T03** `core/game` — de onde cada faixa do placar parte, e quem saiu dos cinco
  - Teste: `standings.test.ts` › "tells where each row comes from"; "the first scoreboard has no previous"; "lists who left the first five"; "nobody left when the five are the same"
  - Implementar: `domain/standings.ts` (`ScoreboardEntry.previous`, `scoreboardLeavers`)
  - Cobre: CA-28 a CA-31, RN-28, RN-31

## Fase 2 — Aplicação

- [x] **T04** visão do anfitrião: classificação final e quem saiu do placar
  - Teste: `get-host-game.test.ts` › "a finished game has the final standings and the reveal's time left"; "ties, zeros and removed players in the final standings"; "plays the reference game to the podium"; "an ended game has no final"; "the scoreboard tells who left the first five"; `advance-game.test.ts` › "the last results finish the game"; "a repeated request after the end changes nothing"
  - Implementar: `application/host-game-view.ts` (`final`, `scoreboardLeavers`)
  - Cobre: CA-01, CA-04 a CA-06, CA-08 a CA-14, CA-30
- [x] **T05** sessão do jogador: tela final
  - Teste: `get-player-session.test.ts` › "a finished game tells the place, the total and the title"; "a removed player has no final"; "the final stays the same when asked again"
  - Implementar: `application/get-player-session.ts` (`final`)
  - Cobre: CA-21 a CA-24, CA-26, CA-27

## Fase 3 — API

- [x] **T06** saídas de `game.view`, `game.advance` e `game.join.session`; jogar novamente
  - Teste: `routers/game.test.ts` › "finishes at the last results and shows the podium (spec 011)"; "hosts the same quiz again after the end"; "refuses to host again a quiz in the trash"
  - Implementar: ajustes nos testes da spec 010 que passavam pelo placar final; nenhum código novo no roteador
  - Cobre: CA-01, CA-17, CA-18

## Fase 4 — UI: base das animações

- [x] **T07** dependência `motion` e utilidades
  - Teste: `lib/count-up.test.tsx` › "ends at the target value"; "shows the target at once with reduced motion"
  - Implementar: `motion` no catálogo do pnpm e em `apps/web`; `MotionGlobalConfig.skipAnimations` no setup do Vitest; `lib/game-motion.tsx`, `lib/count-up.tsx`, `lib/use-elapsed.ts`; keyframes em `packages/ui/src/styles/globals.css`; `components/game/confetti.tsx`, `components/game/stage-transition.tsx`; `GameMotion` em `GameScreen`
  - Medir o tamanho dos pedaços de `/join` e `/host` antes de adicionar a dependência
  - Cobre: RN-25 a RN-27
- [x] **T08** `lib`: etapas do placar, lugares revelados e frases finais
  - Teste: `scoreboard-animation.test.ts` › "starts from the previous five and totals"; "ends at the current five"; "the first scoreboard starts from zero"; "has nothing to animate when nothing changed"; `podium.test.ts` › "reveals third, second and first by time"; "places the first three on the steps"; `game-stage.test.ts` › "tells the final message by place"
  - Implementar: `lib/scoreboard-animation.ts`, `lib/podium.ts`, `lib/game-stage.ts` (`finalMessage`), `lib/api-types.ts`
  - Cobre: CA-07, CA-15, CA-22, CA-23, CA-28 a CA-32

## Fase 5 — UI: telas

- [x] **T09** placar animado
  - Teste: `host/scoreboard.test.tsx` › "opens as it was before the question"; "ends with the new totals, order and arrows"; "a row comes in and another leaves"; "stays still when nothing changed"; "advances in the middle of the animation"; "shows the new state at once with reduced motion"
  - Implementar: `host/scoreboard.tsx`; ajustar `host/host-stage.test.tsx`
  - Cobre: CA-28 a CA-34, CA-36
- [x] **T10** pódio e classificação do anfitrião
  - Teste: `host/podium.test.tsx` › "shows nobody before two seconds"; "reveals third, second and first in order"; "leaves the steps without a player empty"; "offers the actions after the reveal"; "shows the full standings and goes back"; "shows the whole podium when reopened"; "confetti comes only with the first"; "leaves without asking"
  - Implementar: `host/podium.tsx`, `host/final-standings.tsx`; remover `host/game-finished.tsx`
  - Cobre: CA-06 a CA-09, CA-13, CA-15, CA-16, CA-19, CA-35, CA-36
- [x] **T11** jogar novamente e rota do anfitrião
  - Teste: `host/podium.test.tsx` › "plays again"; "tells when the quiz cannot be played anymore"
  - Implementar: `lib/game-mutations.ts` (`usePlayAgain`), `lib/game-error-messages.ts`, `routes/_auth/host.$gameId.tsx` (pódio, sem consulta periódica depois do fim)
  - Cobre: CA-17, CA-18
- [x] **T12** tela final do jogador
  - Teste: `player/final-screen.test.tsx` › "waits while the podium is revealed"; "shows the medal and the phrase of each place"; "shows the place outside the podium"; "shows the final at once when reopened"; `player/join-flow.test.tsx` › "goes from the last results to the final screen"; "catches up when the event was missed"; "enters another game"; "a removed player gets no final screen"
  - Implementar: `player/final-screen.tsx`, `player/join-flow.tsx`
  - Cobre: CA-20 a CA-27
- [x] **T13** microtransições nas telas que já existem
  - Teste: `player/player-stage.test.tsx` › "the points and the total end at the right values"; `host/host-stage.test.tsx` › "a new phase shows at once"; "the result bars end at their heights"
  - Implementar: `player/player-stage.tsx` (salto do sinal, contagem de "+ N" e do total), `host/stage-screens.tsx` e `host/stage-choices.tsx` (barras, entrada das fases), `host/player-grid.tsx` (apelido novo)
  - Cobre: CA-37, CA-38, RN-35

## Fase 6 — E2E e fechamento

- [x] **T14** E2E: a partida até o pódio
  - Teste: `apps/web/e2e/game-play.spec.ts` — a última revelação leva ao pódio; os dois jogadores nos degraus; a tela final de cada um, inclusive depois de recarregar; "Classificação"; "Jogar novamente" abre um lobby com outro PIN
  - Cobre: CA-01, CA-06, CA-16, CA-17, CA-20, CA-21, CA-24
- [x] **T15** Fechamento
  - `pnpm test`, `pnpm check-types`, `pnpm -F web exec tsc --noEmit`, Biome, `pnpm test:e2e`
  - Conferir as animações no navegador, com e sem movimento reduzido; medir de novo os pedaços de `/join` e `/host`
  - Atualizar `spec.md`, `plan.md` (desvios), `glossary.md`, `roadmap.md`, `CLAUDE.md`, ADR 0009, `docs/design-system.md` (animações do jogo)

Cobertura: CA-01 a CA-38 aparecem em ao menos uma tarefa.
