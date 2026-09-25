---
spec: "002"
status: approved # draft | approved
---

# Plano técnico — 002 Página inicial

> Spec: [spec.md](spec.md) · Arquitetura: [docs/architecture.md](../../../docs/architecture.md) · Testes: [docs/testing.md](../../../docs/testing.md)

## Abordagem

A feature é quase toda de adapter de entrada: uma casca de aplicação (`AppShell`) com navegação principal e barra superior, compartilhada por `/` (com sessão) e pelo grupo `_auth`, mais a tela do painel. Do lado do domínio há uma única regra nova, e ela é do contexto **library**: "os N quizzes mais recentes fora da lixeira, mais o total" (RN-15, RN-17, RN-20). Ela vira um caso de uso `getHomeOverview` sobre o read model que já existe, com `limit` acrescentado ao critério e `count` acrescentado à porta `LibraryQuizQuery`, para que o limite chegue ao banco em vez de ser recortado no cliente. Nenhuma tabela nova, nenhuma migração, nenhum provedor novo — e portanto nenhum ADR.

Duas mudanças de comportamento já existentes caem junto, porque a spec as define: o destino padrão depois de entrar passa de `/library` para `/` (RN-02), e a ação **Criar** passa a levar à tela do quiz criado (RN-13), inclusive quando acionada da biblioteca.

## Linguagem ubíqua

| PT | EN (código) | Novo? |
| --- | --- | --- |
| Página inicial | `Home` | sim |
| Visão geral da página inicial | `HomeOverview` | sim |
| Limite de quizzes no painel | `HOME_RECENT_QUIZ_LIMIT` | sim |
| Navegação principal | `MainNav` | sim |
| Em breve | `comingSoon` | sim |
| Casca da aplicação | `AppShell` | sim |
| Item da biblioteca | `LibraryItem` | não (spec 001) |
| Seção da biblioteca | `LibrarySection` | não (spec 001) |

## Domínio — `packages/core/src/library/domain`

### Agregados e entidades

Nenhum agregado novo. A página inicial é uma **projeção de leitura** do contexto `library` sobre os quizzes do criador; ela não cria nem altera estado (docs/architecture.md, "Read models").

### Value objects

`library/domain/home.ts`:

```ts
/** Quantos quizzes o painel mostra antes do "Ver tudo" (spec 002, RN-15). */
export const HOME_RECENT_QUIZ_LIMIT = 6;
```

A seção usada pelo painel é a `recent` já existente (`LibrarySection`), o que garante a RN-20 (lixeira fora) sem regra nova.

### Serviços de domínio

Nenhum.

### Erros de domínio

| Classe | `code` | Quando |
| --- | --- | --- |
| — | — | Nenhum erro de domínio novo. A consulta é de leitura e sempre escopada pelo `ownerId` da sessão; um criador sem quizzes recebe lista vazia, não erro. |

## Aplicação — `packages/core/src/library/application`

### Casos de uso

| Caso de uso | Entrada | Saída | Erros | Portas |
| --- | --- | --- | --- | --- |
| `getHomeOverview` | `{ ownerId: string }` | `{ quizzes: LibraryItem[]; totalQuizCount: number }` | — | `LibraryQuizQuery`, `ObjectStorage` (só `getPublicUrl`) |

Comportamento: consulta `list({ ownerId, section: "recent", searchText: null, limit: HOME_RECENT_QUIZ_LIMIT })` e `count({ ownerId, section: "recent", searchText: null })`, e mapeia os registros para `LibraryItem` resolvendo a URL da capa. A ordem e o recorte de seção são contrato da porta (já testados na spec 001), então o caso de uso só acrescenta o limite e o total.

**Refatoração**: o mapeamento `LibraryQuizRecord → LibraryItem` hoje vive dentro de `createListLibrary`. Ele sai para `library/application/library-item.ts` (`LibraryItem` + `toLibraryItem(record, storage)`) e passa a ser usado pelos dois casos de uso. `list-library.ts` mantém a assinatura pública.

### Portas novas ou alteradas

`library/application/ports/library-quiz-query.ts` — a porta ganha `count` e o critério ganha `limit`:

```ts
export interface LibraryQuizCriteria {
	ownerId: string;
	section: LibrarySection;
	/** Already normalized; null lists the whole section. */
	searchText: string | null;
	/** At most this many records, newest first; undefined lists them all. */
	limit?: number;
}

export interface LibraryQuizQuery {
	list(criteria: LibraryQuizCriteria): Promise<LibraryQuizRecord[]>;
	/** How many records match, ignoring `limit`. */
	count(criteria: LibraryQuizCriteria): Promise<number>;
}
```

Implementações a atualizar: `InMemoryLibraryQuizQuery` (`packages/core/src/library/testing/`) e `createDrizzleLibraryQuizQuery` (`packages/db`). Como `limit` é opcional, `listLibrary` continua igual.

## Adapters

### Banco — `packages/db`

Sem schema novo, sem migração. Só `repositories/library/drizzle-library-quiz-query.ts`:

- `list` aplica `.limit(criteria.limit)` quando presente, depois do `orderBy` já existente;
- `count` reusa a montagem de condições (extrair `buildConditions(criteria)` no próprio arquivo) e faz `select({ value: count() })`, devolvendo `0` quando não há linhas.

Aproveitar para corrigir o comentário `// questionCount becomes a real count when questions exist (spec 002)`, que depois da renumeração aponta para a spec **003**.

### Real-time

| Canal | Evento | Payload | Publicado por (caso de uso) | Assinado por (tela) |
| --- | --- | --- | --- | --- |
| — | — | — | — | Nenhum. O painel é leitura sob demanda; nada nele é ao vivo. |

### Storage / outros

Nenhuma mudança. `getPublicUrl` já é usado pelo `listLibrary` para resolver capas.

## API — `packages/api`

| Procedure | query/mutation | Auth | Entrada (forma) | Saída | Erros de domínio |
| --- | --- | --- | --- | --- | --- |
| `library.home` | query | `protectedProcedure` | — (sem input) | `{ quizzes: LibraryItem[]; totalQuizCount: number }` | — |

O router continua fino: só passa `ownerId: ctx.session.user.id` ao caso de uso.

Ligações novas em `container.ts` / `composition-root.ts`:

- `container.ts`: `getHomeOverview: createGetHomeOverview(adapters)` em `useCases`, com o tipo `GetHomeOverview` no `Container`.
- `composition-root.ts`: nada — o adapter `libraryQuizzes` já está lá; só ganha o método `count`.
- `testing/test-context.ts`: nada — `InMemoryLibraryQuizQuery` continua sendo construído do mesmo jeito.

## UI — `apps/web` e `packages/ui`

### Design system (`packages/ui`)

- `badge.tsx`: nova variante `soon` no `cva` (fundo neutro, texto esmaecido), usada por todo ponto de entrada marcado "Em breve" (RN-05, RN-19). Entra no catálogo `/design-system`.
- `tab-nav.tsx` (novo): `TabNav` + `TabNavItem` para as seções de uma área (RN-22). **São links, não abas ARIA**: a seção mora na URL, o voltar do navegador precisa funcionar e cada seção é um destino (RN-23). Por isso o componente renderiza um `nav` com `render={<Link …/>}` e `aria-current="page"` no item ativo, com a aparência de aba segmentada, como a biblioteca do Kahoot: trilho em `muted`, item ativo em cartão branco com texto `primary`. Um `role="tablist"` com painéis alternados seria mentira semântica aqui. Entra no catálogo `/design-system`.
- Nada mais. A navegação em tela estreita (RN-08) é uma **divulgação simples** (botão com `aria-expanded`/`aria-controls` alternando o painel dentro da casca), não um modal — evita introduzir um primitivo `Sheet` só para isso. Os demais elementos usam `Card`, `Button`, `Input`/`InputGroup`, `Skeleton` e `Empty`, que já existem.

### Casca e navegação (`apps/web/src/components/layout/`)

| Arquivo | Papel |
| --- | --- |
| `app-shell.tsx` | Grade navegação + barra superior + conteúdo; estado da navegação em tela estreita; hospeda o `QuizFormDialog` e o provider de criação |
| `main-nav.tsx` | `MAIN_NAV_ITEMS` (Início, Biblioteca, Relatórios, Descobrir, Grupos) com `to` ou `comingSoon`; item ativo derivado do `pathname` recebido por prop (RN-04, RN-05, RN-06) |
| `top-bar.tsx` | Marca → `/`, `GlobalSearch`, botão **Criar**, `UserMenu` (RN-09) |
| `global-search.tsx` | Formulário que navega para `/library?section=recent&q=…`; texto vazio ou só espaços não navega (RN-10, RN-11) |
| `create-quiz-context.tsx` | Provider + `useCreateQuiz()` para que qualquer tela abra o mesmo diálogo (RN-13, CA-17) |
| `public-header.tsx` | Cabeçalho mínimo da apresentação pública: marca e "Entrar" (RN-07) |

Itens "Em breve" renderizam como `<span aria-disabled="true">` com `Badge variant="soon"`, fora da ordem de tabulação — não são `Link` (RN-05). Ativo: **Início** só em `/`; **Biblioteca** em `/library` e `/quizzes/$quizId` (RN-06). A `top-bar.tsx` não recebe nenhum `Link` de navegação — só a marca, a pesquisa, Criar e o `UserMenu` (RN-09).

### Seções da biblioteca viram abas (RN-22, RN-23)

`components/library/library-nav.tsx` é reescrito como `library-tabs.tsx`: as mesmas três seções (`LIBRARY_SECTION_LABELS` permanece), agora sobre `TabNav`/`TabNavItem`, com os mesmos `Link to="/library" search={{ section }}`. Em `routes/_auth/library.tsx` a grade `md:grid-cols-[13rem_1fr]` e o `<aside>` somem: o conteúdo passa a ser uma coluna com abas → título e ação → pesquisa → lista.

### Telas (`apps/web/src/routes` e `components/home/`)

- `__root.tsx`: deixa de renderizar `Header`; passa a renderizar só o `Outlet` no invólucro de altura total. `components/header.tsx` é removido (substituído por `top-bar.tsx` + `public-header.tsx`).
- `routes/index.tsx`: `beforeLoad` resolve a sessão com `getUser()` e a expõe no contexto da rota; o componente renderiza `PublicLanding` (sem sessão) ou `AppShell` + `HomePage` (com sessão) — RN-01.
- `routes/_auth/route.tsx`: envolve o `Outlet` no `AppShell`.
- `components/public-landing.tsx`: o conteúdo atual de `index.tsx` mais as ações **Entrar** e **Criar conta** (CA-01). O indicador de `healthCheck` sai.
- `components/home/`: `home-greeting.tsx` (RN-14), `recent-quizzes-card.tsx` (lista, skeleton, vazio, erro — RN-15 a RN-18), `home-quiz-item.tsx` (capa, título, perguntas, tempo relativo, link para o quiz — RN-16), `coming-soon-card.tsx` (RN-19).
- Dados: `useQuery(trpc.library.home.queryOptions())` no componente, sem prefetch no `loader` — igual à biblioteca, e é o que dá os estados observáveis de CA-19 e CA-20.
- `lib/api-types.ts`: `export type HomeOverviewView = RouterOutputs["library"]["home"]`.
- `lib/quiz-labels.ts`: `questionCountLabel` sai de `components/library/quiz-list-item.tsx` para cá, porque agora serve biblioteca e painel.

### Mudanças de comportamento já existente

- `lib/safe-redirect.ts`: `DEFAULT_REDIRECT` passa de `"/library"` para `"/"` (RN-02). A proteção contra destino externo não muda.
- `components/quiz/quiz-form-dialog.tsx`: depois de criar, navega para `/quizzes/$quizId` com o id devolvido pela mutation (RN-13). Editar continua sem navegar.
- `lib/quiz-mutations.ts`: `invalidate` passa a invalidar também `trpc.library.home.pathKey()`, senão o painel não reflete criar/duplicar/excluir (CA-12).
- `e2e/support.ts`: `signUp` deixa de esperar `/library` e espera `/`; os testes que dependiam de cair na biblioteca navegam explicitamente.

## Estratégia de testes

| CA | Camada | Teste | Arquivo |
| --- | --- | --- | --- |
| CA-01 | E2E | visitor sees the public landing with sign-in actions and no main nav | `apps/web/e2e/home.spec.ts` |
| CA-02 | E2E | signed-in creator lands on the dashboard with greeting and cards | `apps/web/e2e/home.spec.ts` |
| CA-03 | unidade + E2E | defaults to the home when no redirect is given · sign-in without redirect lands on the home | `apps/web/src/lib/safe-redirect.test.ts` · `apps/web/e2e/auth.spec.ts` |
| CA-04 | E2E | sign-in keeps the requested destination | `apps/web/e2e/auth.spec.ts` (já existe, reverificar) |
| CA-05 | E2E | signing out returns to the public landing | `apps/web/e2e/auth.spec.ts` |
| CA-06 | componente | renders the five main nav items in order | `apps/web/src/components/layout/main-nav.test.tsx` |
| CA-07 | componente | coming soon items are not links and are marked unavailable | `apps/web/src/components/layout/main-nav.test.tsx` |
| CA-08 | componente | marks Biblioteca active on library sections and quiz pages | `apps/web/src/components/layout/main-nav.test.tsx` |
| CA-09 | componente + E2E | narrow screens toggle the nav and close it on navigation | `apps/web/src/components/layout/app-shell.test.tsx` · projeto mobile do Playwright |
| CA-10 | componente | submitting the search goes to the library with the query | `apps/web/src/components/layout/global-search.test.tsx` |
| CA-11 | componente | blank search does not navigate | `apps/web/src/components/layout/global-search.test.tsx` |
| CA-12 | E2E | creating from the top bar opens the quiz and tops the dashboard list | `apps/web/e2e/home.spec.ts` |
| CA-13 | aplicação + repositório | returns at most six quizzes, newest first, with the total · applies limit and counts all matches | `packages/core/src/library/application/get-home-overview.test.ts` · `packages/db/src/repositories/library/drizzle-library-quiz-query.test.ts` |
| CA-14 | aplicação + repositório + API | leaves trashed quizzes out of the overview and of the total · home lists only the caller's quizzes | `packages/core/src/library/application/get-home-overview.test.ts` · `.../drizzle-library-quiz-query.test.ts` · `packages/api/src/routers/library.test.ts` |
| CA-15 | componente | falls back to the untitled label, default cover and relative time | `apps/web/src/components/home/home-quiz-item.test.tsx` |
| CA-16 | componente + E2E | links to the quiz page | `apps/web/src/components/home/home-quiz-item.test.tsx` · `apps/web/e2e/home.spec.ts` |
| CA-17 | componente | empty overview offers creating the first quiz | `apps/web/src/components/home/recent-quizzes-card.test.tsx` |
| CA-18 | componente | reports card is marked as coming soon with no data | `apps/web/src/components/home/coming-soon-card.test.tsx` |
| CA-19 | componente | shows placeholders while loading | `apps/web/src/components/home/recent-quizzes-card.test.tsx` |
| CA-20 | componente | shows an error with retry without breaking the shell | `apps/web/src/components/home/recent-quizzes-card.test.tsx` |
| CA-21 | componente | renders the three library sections as tabs with the open one marked | `apps/web/src/components/library/library-tabs.test.tsx` |
| CA-22 | componente + E2E | each tab is a link to its section · switching tabs changes the URL and back returns | `apps/web/src/components/library/library-tabs.test.tsx` · `apps/web/e2e/library.spec.ts` |

Complementos que não mapeiam um CA diretamente: `packages/api/src/routers/library.test.ts` cobre `home` exigindo sessão (RN, `UNAUTHORIZED` para visitante), e `packages/core/src/library/application/list-library.test.ts` continua verde depois da extração do `toLibraryItem`.

Componentes que renderizam `Link` usam `renderWithRouter` (`apps/web/src/testing/render-with-router.tsx`). Nada aqui precisa de `pnpm test:int`: nenhum adapter de serviço externo muda.

## Dados e migração

Nenhuma. Sem alteração de schema, sem `db:generate`, sem backfill. `questionCount` continua `0` até a feature 003.

## Riscos e decisões

- **Sem ADR.** Nenhum provedor novo, nenhuma porta de infraestrutura nova, nenhuma mudança na regra de dependência. As decisões desta feature são de produto (já na spec) e de organização de UI.
- **`limit` + `count` na porta em vez de recortar no cliente.** A alternativa — `list` sem limite e `slice(0, 6)` no caso de uso — economizaria a mudança em três implementações, mas faria toda carga da página inicial trazer a biblioteca inteira. Como o painel é a tela mais visitada, o limite desce até o banco. O custo é uma porta com dois métodos e um teste a mais no adapter Drizzle.
- **Destino padrão depois de entrar (RN-02).** Muda `DEFAULT_REDIRECT` e o helper `signUp` do E2E. O CA-12 da spec 001 (voltar à página pedida) continua valendo e é reverificado.
- **Criar passa a navegar para o quiz (RN-13).** Afeta também a biblioteca. O CA-14 da spec 001 ("o quiz aparece no topo de Recentes e de Rascunhos") continua verdadeiro, mas o E2E `library.spec.ts` precisa voltar à biblioteca para afirmá-lo. Registrar a mudança no changelog da spec 001 ao implementar.
- **Sair do `Header` no `__root`.** `/login` e `/design-system` deixam de ter cabeçalho. É o que a RN-07 pede para `/login`; para `/design-system` é indiferente (é página de catálogo interno).
- **Anúncio de "Em breve" (RN-05).** `aria-disabled` em elemento não interativo é invisível para parte dos leitores de tela se o texto "Em breve" não estiver no nome acessível. Por isso o rótulo textual fica dentro do mesmo elemento, e o teste de CA-07 verifica o texto, não só o atributo.
- **Duas navegações na mesma tela.** Com a barra lateral, manter a `LibraryNav` como segunda coluna deixaria duas listas verticais lado a lado. Por isso as seções viram abas (RN-22): lateral para *onde estou*, abas para *que fatia desta área estou vendo*. O `e2e/library.spec.ts` já aciona as seções pelo nome ("Rascunhos", "Lixeira"), que não muda — mas precisa ser reverificado, porque o elemento deixa de estar dentro de um `aside`.
- **Abas como links, não como `role="tablist"`.** A seção está na URL e precisa sobreviver ao voltar do navegador e a abrir em nova aba (RN-23). Abas ARIA de verdade alternariam painéis sem trocar o endereço, o que contradiz a spec 001. O componente entrega a aparência de aba com semântica de navegação.
