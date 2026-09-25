---
spec: "002"
status: done # todo | in-progress | done
---

# Tarefas — 002 Página inicial

> Spec: [spec.md](spec.md) · Plano: [plan.md](plan.md)
>
> Ordem de dentro para fora. Cada tarefa: **(1)** escrever o teste e vê-lo falhar pelo motivo certo, **(2)** implementar o mínimo, **(3)** refatorar com os testes verdes. Marque `[x]` só com o teste passando. `[P]` = pode ser feita em paralelo com as outras `[P]` da mesma fase, desde que as dependências indicadas estejam prontas.

## Fase 1 — Domínio

Nenhuma tarefa. A página inicial é uma projeção de leitura: não cria nem altera estado, não tem invariante nova e não tem erro de domínio (plano, "Domínio"). A única constante nova, `HOME_RECENT_QUIZ_LIMIT`, nasce junto do caso de uso que a usa, em T03, para não virar um teste tautológico.

## Fase 2 — Aplicação (casos de uso + portas + fakes)

- [x] **T01** `core/library` — a porta `LibraryQuizQuery` ganha `limit` e `count`
  - Teste: `packages/core/src/library/testing/in-memory-library-quiz-query.test.ts` (novo) › "returns only the newest records up to the limit"; "counts every match ignoring the limit"; "counts zero when nothing matches"
  - Implementar: `library/application/ports/library-quiz-query.ts` (`limit?` em `LibraryQuizCriteria`, `count` na porta, contrato no comentário); `library/testing/in-memory-library-quiz-query.ts`
  - Cobre: RN-15, RN-17

- [x] **T02** `core/library` — extrair o mapeamento `LibraryQuizRecord → LibraryItem` — depende de T01
  - Teste: refatoração coberta pelos testes existentes de `list-library.test.ts`, que devem continuar verdes sem edição
  - Implementar: `library/application/library-item.ts` (`LibraryItem`, `toLibraryItem`); `list-library.ts` passa a usá-lo mantendo a assinatura pública
  - Cobre: RN-16

- [x] **T03** `core/library` — caso de uso `getHomeOverview` — depende de T02
  - Teste: `packages/core/src/library/application/get-home-overview.test.ts` › "returns the six most recently updated quizzes with the total"; "leaves trashed quizzes out of the list and of the total"; "returns an empty list and a zero total for a creator with no quizzes"; "resolves cover URLs and keeps missing covers null"; "never returns another creator's quizzes"
  - Implementar: `library/domain/home.ts` (`HOME_RECENT_QUIZ_LIMIT = 6`); `library/application/get-home-overview.ts` (`createGetHomeOverview`, `GetHomeOverview`, `HomeOverview`)
  - Cobre: CA-13, CA-14, CA-17, RN-15, RN-16, RN-17, RN-18, RN-20

## Fase 3 — Adapters (repositórios, real-time, storage)

- [x] **T04** `db/library` — `limit` e `count` no adapter Drizzle — depende de T01
  - Teste: `packages/db/src/repositories/library/drizzle-library-quiz-query.test.ts` › "applies the limit keeping the newest first"; "counts every match ignoring the limit"; "counts zero for a creator without quizzes"; os testes existentes de `list` seguem verdes
  - Implementar: extrair `buildConditions(criteria)` no arquivo; `.limit()` condicional em `list`; `count` com `select({ value: count() })`; corrigir o comentário `questionCount … (spec 002)` para `(spec 003)` depois da renumeração do roadmap
  - Cobre: CA-13, CA-14
  - Sem `*.int.test.ts`: nenhum adapter de serviço externo muda (PGlite cobre este)

## Fase 4 — API (routers + composition root)

- [x] **T05** `api` — procedure `library.home` — depende de T03, T04
  - Teste: `packages/api/src/routers/library.test.ts` › "home returns the creator's newest quizzes with the total"; "home lists only the caller's quizzes"; "home refuses visitors"
  - Implementar: `container.ts` (`GetHomeOverview` no `Container`, `getHomeOverview: createGetHomeOverview(adapters)`); `routers/library.ts` (`home: protectedProcedure.query(...)`, sem input). `composition-root.ts` e `testing/test-context.ts` não mudam
  - Cobre: CA-14, RN-20

## Fase 5 — UI (design system → componentes do app → rotas)

- [x] **T06** `[P]` `ui` — variante `soon` do `Badge`
  - Teste: `packages/ui/src/components/badge.test.tsx` › "renders the soon variant for not yet available entry points"
  - Implementar: variante `soon` no `cva` de `badge.tsx`; entrada no catálogo `apps/web/src/routes/design-system.tsx`
  - Cobre: RN-05, RN-19

- [x] **T07** `[P]` `web` — `questionCountLabel` sai para `lib/`
  - Teste: refatoração coberta por `components/library/quiz-list-item.test.tsx`, que continua verde apenas trocando o import
  - Implementar: `apps/web/src/lib/quiz-labels.ts`; atualizar os imports em `quiz-list-item.tsx` e `quiz-details-view.tsx` se houver
  - Cobre: RN-16

- [x] **T08** `[P]` `ui` — primitivo `TabNav` (abas com semântica de navegação)
  - Teste: `packages/ui/src/components/tab-nav.test.tsx` › "renders each item as a link"; "marks the current item with aria-current"
  - Implementar: `packages/ui/src/components/tab-nav.tsx` (`TabNav`, `TabNavItem` com `cva`, `data-slot` e `render`; `nav` + links, nunca `role="tablist"` — plano, "Abas como links"); entrada no catálogo `/design-system`
  - Cobre: RN-22, RN-23

- [x] **T09** `web` — `MainNav` — depende de T06
  - Teste: `apps/web/src/components/layout/main-nav.test.tsx` › "renders Início, Biblioteca, Relatórios, Descobrir and Grupos in order"; "renders coming soon items as non-links labelled Em breve"; "marks Início active only on the home"; "marks Biblioteca active on every library section and on a quiz page"
  - Implementar: `components/layout/main-nav.tsx` (`MAIN_NAV_ITEMS`, item ativo derivado do `pathname` recebido por prop). Itens "Em breve" são `span` com `aria-disabled` e o texto no nome acessível, fora da ordem de tabulação
  - Cobre: CA-06, CA-07, CA-08, RN-04, RN-05, RN-06

- [x] **T10** `[P]` `web` — `GlobalSearch`
  - Teste: `apps/web/src/components/layout/global-search.test.tsx` › "goes to the recent library section carrying the typed text"; "does not navigate when the field is empty or only spaces"
  - Implementar: `components/layout/global-search.tsx` (formulário com `InputGroup`, navega para `/library?section=recent&q=…`)
  - Cobre: CA-10, CA-11, RN-10, RN-11, RN-12

- [x] **T11** `web` — `AppShell`, barra superior e contexto de criação — depende de T09, T10
  - Teste: `apps/web/src/components/layout/app-shell.test.tsx` › "toggles the main nav on narrow screens and closes it after navigating"; "opens the create dialog from anywhere inside the shell"; "keeps the top bar free of navigation links"
  - Implementar: `components/layout/app-shell.tsx` (grade barra lateral + barra superior + conteúdo, estado da navegação estreita com `aria-expanded`/`aria-controls`, hospeda `QuizFormDialog`), `top-bar.tsx` (só marca, pesquisa, Criar e `UserMenu`), `create-quiz-context.tsx` (`useCreateQuiz`), `public-header.tsx`; `__root.tsx` deixa de renderizar `Header`; `routes/_auth/route.tsx` envolve o `Outlet`; remover `components/header.tsx`
  - Cobre: CA-06, CA-09, RN-04, RN-07, RN-08, RN-09

- [x] **T12** `web` — seções da biblioteca viram abas — depende de T08, T11
  - Teste: `apps/web/src/components/library/library-tabs.test.tsx` (novo) › "renders Recentes, Rascunhos and Lixeira as links to their sections"; "marks the open section as current"
  - Implementar: `components/library/library-tabs.tsx` sobre `TabNav` (substitui `library-nav.tsx`, mantendo `LIBRARY_SECTION_LABELS`); `routes/_auth/library.tsx` perde a grade `md:grid-cols-[13rem_1fr]` e o `<aside>`, ficando abas → título e ação → pesquisa → lista. Reverificar `apps/web/e2e/library.spec.ts`, que aciona as seções pelo nome
  - Cobre: CA-21, CA-22, RN-22, RN-23

- [x] **T13** `web` — item de quiz do painel — depende de T07
  - Teste: `apps/web/src/components/home/home-quiz-item.test.tsx` › "shows the untitled label, the default cover, the question count and the relative time"; "links to the quiz page"
  - Implementar: `components/home/home-quiz-item.tsx` (reusa `QuizCover`, `displayQuizTitle`, `questionCountLabel`, `formatRelativeTime`; só a ação de abrir)
  - Cobre: CA-15, CA-16, RN-16

- [x] **T14** `web` — cartão "Seus quizzes" — depende de T05, T11, T13
  - Teste: `apps/web/src/components/home/recent-quizzes-card.test.tsx` › "lists the quizzes with a see all link carrying the total"; "offers creating the first quiz when the creator has none"; "shows placeholders while loading"; "shows an error with a retry action"
  - Implementar: `components/home/recent-quizzes-card.tsx` (`useQuery(trpc.library.home…)`, estados de carregando/vazio/erro, link "Ver tudo (N)" para `/library?section=recent`); `lib/api-types.ts` (`HomeOverviewView`)
  - Cobre: CA-13, CA-17, CA-19, CA-20, RN-15, RN-17, RN-18

- [x] **T15** `[P]` `web` — cartão "Relatórios mais recentes" — depende de T06
  - Teste: `apps/web/src/components/home/coming-soon-card.test.tsx` › "marks the card as coming soon and shows no data"
  - Implementar: `components/home/coming-soon-card.tsx`
  - Cobre: CA-18, RN-19

- [x] **T16** `web` — rota `/`: apresentação pública ou painel — depende de T11, T14, T15
  - Teste: `apps/web/e2e/home.spec.ts` (novo, escrito antes da implementação) › "a visitor sees the public landing with sign-in actions and no main nav"; "a signed-in creator lands on the dashboard and opens a quiz from it"
  - Implementar: `routes/index.tsx` (`beforeLoad` com `getUser()`, ramo visitante/criador), `components/public-landing.tsx` (marca, apresentação, Entrar e Criar conta; sai o indicador de `healthCheck`), `components/home/home-greeting.tsx`
  - Cobre: CA-01, CA-02, CA-16, RN-01, RN-14

## Fase 6 — E2E e fechamento

- [x] **T17** `web` — destino padrão ao entrar e ao sair — depende de T16
  - Teste: `apps/web/src/lib/safe-redirect.test.ts` › "falls back to the home when no destination is given"; `apps/web/e2e/auth.spec.ts` › "signs up and lands on the home"; "signing out returns to the public landing"; o teste existente de retorno à página pedida segue verde
  - Implementar: `lib/safe-redirect.ts` (`DEFAULT_REDIRECT = "/"`); `e2e/support.ts` (`signUp` espera `/`, os testes que precisavam da biblioteca navegam explicitamente)
  - Cobre: CA-03, CA-04, CA-05, RN-02, RN-03

- [x] **T18** `web` — Criar leva à tela do quiz e atualiza o painel — depende de T11, T14
  - Teste: `apps/web/e2e/home.spec.ts` › "creating from the top bar opens the new quiz and puts it on top of the dashboard"; ajustar `apps/web/e2e/library.spec.ts` para voltar à biblioteca antes de afirmar o topo de Recentes e Rascunhos (CA-14 da spec 001 continua valendo)
  - Implementar: `components/quiz/quiz-form-dialog.tsx` navega para `/quizzes/$quizId` após criar; `lib/quiz-mutations.ts` invalida também `trpc.library.home.pathKey()`
  - Cobre: CA-12, RN-13

- [x] **T19** `web` — E2E de tela estreita, abas e pesquisa — depende de T12, T16
  - Teste: `apps/web/e2e/home.spec.ts` (projeto mobile) › "opens the main nav on a narrow screen and reaches the library"; "searching from the dashboard filters the library"; `apps/web/e2e/library.spec.ts` › "switching section tabs changes the URL and going back returns to the previous one"
  - Implementar: ajustes de leiaute que os testes revelarem; nenhum arquivo novo previsto
  - Cobre: CA-09, CA-10, CA-22

- [x] **T20** Fechamento
  - `pnpm check`, `pnpm test`, `pnpm check-types` e `pnpm -F web exec tsc --noEmit`, `pnpm test:e2e` (desktop + mobile). **Sem `pnpm test:int`**: nenhum adapter de serviço externo mudou
  - Atualizar `spec.md` (status `done`, changelog com o que a implementação revelou), `tasks.md` (status `done`), `roadmap.md` (002 → ✅), `glossary.md` (`Home`, `MainNav`, `comingSoon` → ✅), `docs/design-system.md` (variante `soon` do `Badge` e o componente `TabNav`)
  - Acrescentar ao changelog da `001` que a ação Criar passou a navegar para o quiz criado (RN-13 da 002) e que as seções da biblioteca passaram de coluna lateral para abas (RN-22 da 002)

## Cobertura dos critérios de aceite

| CA | Tarefas |
| --- | --- |
| CA-01 | T16 |
| CA-02 | T16 |
| CA-03 | T17 |
| CA-04 | T17 |
| CA-05 | T17 |
| CA-06 | T09, T11 |
| CA-07 | T09 |
| CA-08 | T09 |
| CA-09 | T11, T19 |
| CA-10 | T10, T19 |
| CA-11 | T10 |
| CA-12 | T18 |
| CA-13 | T03, T04, T14 |
| CA-14 | T03, T04, T05 |
| CA-15 | T13 |
| CA-16 | T13, T16 |
| CA-17 | T03, T14 |
| CA-18 | T15 |
| CA-19 | T14 |
| CA-20 | T14 |
| CA-21 | T12 |
| CA-22 | T12, T19 |

Os 22 critérios da spec aparecem em ao menos uma tarefa.
