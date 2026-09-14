# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Quizio is a personal Kahoot clone with no paywalls. **Read before changing behavior:** `specs/constitution.md` (non-negotiables), `docs/architecture.md` (hexagonal rules), `docs/testing.md`. Docs/specs/UI text are PT-BR; code, tests and commits are English (`specs/glossary.md` maps terms).

## Workflow: Spec-Driven Development

No feature is implemented without an approved spec in `specs/features/NNN-slug/`. Use the project skills in order, waiting for human approval between steps: `/sdd-spec <idea>` → `/sdd-plan NNN` → `/sdd-tasks NNN` → `/sdd-implement NNN [Txx]`. The functional source of truth for rules is `specs/product/kahoot-reference.md` (long — Grep for sections); feature order and the deploy checklist are in `specs/roadmap.md`. Architectural decisions go in `docs/adr/`.

## Commands

```bash
pnpm install              # install (pnpm 12, workspaces required — do not use npm/yarn)
pnpm infra:up             # docker compose: postgres :5432, RustFS (S3) :9000/:9001, Soketi (Pusher) :6001 + bucket setup
pnpm infra:down
pnpm dev                  # all packages in dev (web on http://localhost:3001)
pnpm dev:web              # only the web app
pnpm build                # turbo build
pnpm check                # Biome format + lint, writes fixes
pnpm check-types          # tsc in every package except apps/web (see caveat)
pnpm test                 # unit + component + PGlite repository/auth tests, all packages (no infra needed)
pnpm test:watch           # Vitest watch across all projects from the root
pnpm test:int             # *.int.test.ts adapter tests against the containers (needs infra:up)
pnpm test:e2e             # Playwright (desktop + mobile), reuses/starts the dev server (needs infra:up)
pnpm vitest run <path>    # a single test file or directory
pnpm db:start             # only the postgres service
pnpm db:push              # push schema to DB (no migration files)
pnpm db:generate          # generate migration SQL into packages/db/src/migrations
pnpm db:migrate           # apply migrations
pnpm db:studio            # Drizzle Studio
```

Caveats:

- `apps/web` has no `check-types` script because it needs `apps/web/src/routeTree.gen.ts`, which only exists after the dev server has run once. Typecheck it with `pnpm -F web exec tsc --noEmit`.
- First E2E run on a machine: `pnpm -F web exec playwright install chromium`.
- Regenerating the Better Auth schema: the CLI version **must match the installed `better-auth`** (newer CLIs generate a different `account` table). From `apps/web`: `npx auth@<better-auth version> generate --config ../../packages/auth/src/index.ts --output ../../packages/db/src/schema/auth.ts --yes`, then `pnpm db:push`.

## Environment

Env lives in **`apps/web/.env`** (not the repo root; template in `apps/web/.env.example`, defaults match `docker-compose.yml`). `packages/db/drizzle.config.ts` and `packages/storage/scripts/setup-bucket.mjs` load that file explicitly. Server vars are validated at import time by `packages/env/src/server.ts` (t3-env + zod), so a missing var is a startup crash, not a runtime `undefined`:

- `DATABASE_URL`, `BETTER_AUTH_SECRET` (min 32 chars), `BETTER_AUTH_URL` (also the only trusted origin and the CORS origin for uploads)
- `AUTH_SIGN_UP_ENABLED` (default `true`) — instance switch for new creator accounts
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional, both or neither (checked in `packages/auth/src/index.ts`); without them the Google button is hidden
- `STORAGE_*` — S3-protocol object storage (Cloudflare R2 in prod, RustFS locally)
- `PUSHER_*` — Pusher-protocol realtime (Pusher cloud or Soketi); `PUSHER_HOST`/`PUSHER_PORT` only for self-hosted
- `VITE_PUSHER_*` — client half, validated in `packages/env/src/web.ts`

Set `SKIP_ENV_VALIDATION=1` to bypass server validation (e.g. in a build container).

## Architecture

Better-T-Stack monorepo (`bts.jsonc` records the generator config), pnpm workspaces + Turborepo, organized as a **hexagonal modular monolith**. **There is no separate server app** — the API runs inside the TanStack Start app as server routes, deployed to Vercel (serverless: no WebSockets, no in-memory state between requests).

```
apps/web            TanStack Start (React 19 + Vite 8), SSR, port 3001 — driving adapter (UI)
packages/core       domain + application: use cases, ports, in-memory fakes. NO infra imports
packages/api        tRPC routers (driving adapter) + container.ts + composition-root.ts
packages/db         Drizzle schema, repository/query adapters, PGlite test harness
packages/storage    ObjectStorage adapter over the S3 API (R2 / RustFS)
packages/realtime   RealtimePublisher (server, `pusher`) + RealtimeSubscriber port/adapter (client, `pusher-js`)
packages/auth       Better Auth built by createAuth({ db, ... }): email+password, Google, DB-backed rate limit
packages/env        t3-env validated env (server / web entrypoints)
packages/ui         design system: shadcn primitives on @base-ui/react + Tailwind v4, Kahoot look
packages/config     shared tsconfig.base.json
```

Dependency rule — enforce it in every change:

- `packages/core` imports nothing outside itself (no drizzle, pusher, aws-sdk, react, zod, env). Needs something external → define a port in `core/src/<context>/application/ports` (or `core/src/shared/application/ports`) and implement it in an adapter package.
- Core is organized by bounded context: `quiz`, `library`, `game`, `reports`, `media`, `identity` (sign-up rules only), plus `shared` (shared kernel). Each has `domain/`, `application/`, `testing/`. Contexts reference each other by ID; a read model (e.g. `library`'s `LibraryQuizQuery`) may reuse another context's value types but not its functions.
- Use cases are factory functions: `createCreateQuiz({ quizzes, storage, ids, clock })` returns `(input) => Promise<output>`. Business errors extend `DomainError` with a stable `code` (`QUIZ.IN_TRASH`); the tRPC middleware maps `NotFoundError` to `NOT_FOUND`, other domain errors to `BAD_REQUEST`, and exposes `data.domainCode`. Other owners' resources are indistinguishable from missing ones (`requireOwnedQuiz`).
- Character limits use `characterCount` (graphemes) from the shared kernel, both on the server and in forms.
- Adapters take explicit config objects (never read env) and are named `<tech>-<port>.ts`. **Only `packages/api/src/composition-root.ts`** and `packages/auth/src/index.ts` (server) and `apps/web/src/lib/realtime-subscriber.ts` (client) know concrete providers. `container.ts` wires use cases to adapters without env so tests build it from fakes.
- Routers are thin: zod validates input *shape* (enums come from core constants), the session provides identity, a use case does the work. No `db` queries in routers.
- Game state is server-authoritative and persisted (response times measured server-side, no server timers); clients never publish realtime events.

**Workspace packages ship raw TypeScript.** Their `exports` map straight to `./src/*.ts` (import as `@quizio/core/quiz/domain/quiz`) — there is no build step for them, Vite compiles them in place. Never add a `dist` import path or expect `pnpm build` to produce package output.

**Dependency versions are centralized in the pnpm catalog** (`pnpm-workspace.yaml`). Shared deps (react, zod, trpc, better-auth, tailwind, typescript, vitest, testing-library…) are declared as `"catalog:"` in each package.json. When adding a dep that more than one package uses, add it to the catalog and reference `catalog:`; bumping a version means editing the catalog, not each package.

### Request flow

- `apps/web/src/routes/api/trpc/$.ts` mounts the tRPC fetch handler at `/api/trpc`, using `appRouter` and `createContext` from `@quizio/api`.
- `apps/web/src/routes/api/auth/$.ts` mounts `auth.handler` at `/api/auth/*`.
- `packages/api/src/context.ts` resolves the Better Auth session and attaches the lazily-built `container`; `protectedProcedure` (in `packages/api/src/index.ts`) throws `UNAUTHORIZED` when `ctx.session` is null and narrows the type.
- Routers live one file per context in `packages/api/src/routers/` (`auth`, `library`, `media`, `quiz`), combined in `routers/index.ts`. `AppRouter` is exported as a type and consumed by the client — no codegen.
- Uploads: `media.requestUpload` returns a presigned PUT URL; the browser uploads straight to storage (bytes never pass through Vercel), then sends the key (`quiz.create` / `quiz.updateDetails` with `cover: { type: "set", key }`).

### Client data layer

`apps/web/src/router.tsx` builds the tRPC client (`httpBatchLink` → `/api/trpc`, `credentials: "include"`, **no transformer — `Date`s arrive as ISO strings**; use the view types in `apps/web/src/lib/api-types.ts`), a QueryClient whose `QueryCache.onError` toasts failures unless the query sets `meta: { suppressErrorToast: true }`, and wires `setupRouterSsrQueryIntegration`. `trpc` and `queryClient` are on the router context. In components use `useTRPC()` from `@/utils/trpc` with TanStack Query. Quiz mutations (with cache invalidation, toasts and the "Desfazer" undo) live in `apps/web/src/lib/quiz-mutations.ts`; domain codes map to Portuguese in `lib/quiz-error-messages.ts`.

Routes: `/login?mode=&redirect=&error=`, `/library?section=recent|drafts|trash&q=`, `/quizzes/$quizId` (the last two under the `_auth` group), `/design-system`.

Realtime in components: `useRealtimeEvent(channel | null, event, handler)` from `apps/web/src/lib/realtime.tsx`, under the `RealtimeProvider` mounted in `__root.tsx`. The socket opens lazily on first subscription, never during SSR.

### Auth flow

Client-side calls go through `authClient` (`apps/web/src/lib/auth-client.ts`, Better Auth React); `routes/login.tsx` wires them into `components/auth/*` forms, which receive actions as props (testable without Better Auth) and map error codes with `lib/auth-error-messages.ts`. The `_auth` route group (`routes/_auth/route.tsx`) guards its children in `beforeLoad` and redirects to `/login?redirect=<href>`; after signing in, `safeRedirect` only allows internal paths. Server-side, `getUser` (`apps/web/src/functions/get-user.ts`) returns the session. Game players are anonymous (nickname only) and do not use Better Auth sessions.

`packages/auth/src/create-auth.ts` holds all Better Auth options: sign-up rules hook, `disableSignUp` plus a `databaseHooks.user.create.before` guard (closed sign-up on every path), Google with `accountLinking.requireLocalEmailVerified: false` (accepted risk, ADR 0007), and rate limiting stored in the `rate_limit` table (5 attempts/60 s per IP on email sign-in/sign-up, enabled in dev too). Auth tables live in `packages/db/src/schema/auth.ts` and are generated — regenerate (see caveat) rather than hand-editing.

## Testing

TDD is the default (red → green → refactor). Details in `docs/testing.md`.

- Vitest 5, `globals: false` (import `describe/it/expect` from `vitest`); `clearMocks` is on by default. Each package has its own `vitest.config.ts` (`defineProject`); adapters with real-service tests also have `vitest.int.config.ts`.
- Tests sit next to the code: `*.test.ts(x)` for unit/component, `*.int.test.ts` for adapter integration, `apps/web/e2e/*.spec.ts` for Playwright.
- Isolate ports with the in-memory fakes (`packages/core/src/*/testing/*`, `packages/realtime/src/testing/*`), not `vi.fn()`; inject `Clock`/`IdGenerator` instead of `Date.now()`/`crypto.randomUUID()` in core. `aQuiz()` builds test quizzes.
- Router tests: `createTestApi()` from `packages/api/src/testing/test-context.ts` (real routers and use cases over fakes; `callerFor(userId | null)`).
- Repository tests: `createTestDb()` from `packages/db/src/testing/create-test-db.ts` (PGlite + `drizzle-kit/api` pushSchema; no Docker). Repositories accept the driver-agnostic `Database` type from `packages/db/src/types.ts`.
- Auth tests (`packages/auth/src/create-auth.test.ts`) drive the real `auth.handler` over PGlite; Google is exercised through ID-token sign-in with stubbed `verifyIdToken`/`getUserInfo`. Give each client a distinct `x-forwarded-for`, or the per-IP rate limit leaks between tests.
- Web components that render router `Link`s use `renderWithRouter` from `apps/web/src/testing/render-with-router.tsx`.
- E2E helpers are in `apps/web/e2e/support.ts` (`signUp` sets a unique client IP per test for the same rate-limit reason).

## UI conventions

- Design tokens (Kahoot palette, `answer-red/blue/yellow/green`, `brand`, `success`, `shadow-press*`, Montserrat) and `@source` globs live in `packages/ui/src/styles/globals.css`; `apps/web/src/index.css` only re-imports it. There is no `tailwind.config`. Reference: `docs/design-system.md`, live catalog at `/design-system`.
- Shared primitives live in `packages/ui/src/components` and are imported as `@quizio/ui/components/<name>`; app-only components go in `apps/web/src/components` (`auth/`, `library/`, `quiz/`) and import via the `@/` alias.
- Primitives wrap **`@base-ui/react`**, not Radix (shadcn style `base-lyra`). Match the pattern: `cva` variants + `cn()` (from `@quizio/ui/lib/utils`) + a `data-slot` attribute. **Customize at the root**: new Kahoot-style variants go into the component's `cva` (e.g. `Badge` `private`/`unlisted`), not wrappers. Primitives use `rounded-md` (not lyra's `rounded-none`).
- Answer alternatives: `AnswerOption`/`AnswerShape` — color is derived from shape, fixed order via `answerShapeAt(index)`.
- Add shared primitives from the repo root: `npx shadcn@latest add <component> -c packages/ui` — **it prompts to overwrite existing files such as the customized `button.tsx`; answer no** — then convert the generated file to the project style (imports, tabs, Kahoot look). Run the CLI from `apps/web` only for app-specific blocks.
- The app is light-themed (`<html lang="pt-BR">`); the `.dark` class is reserved for in-game screens. `next-themes` is available but not wired up.
- Links styled as buttons: `<Button render={<Link to="…" />} nativeButton={false}>`.

## Formatting & generated files

Biome (`biome.json`) is the only formatter/linter: **tabs** for indentation, double quotes, import organization on. `useSortedClasses` auto-sorts classes inside `cn`/`clsx`/`cva`. Run `pnpm check` before finishing a change.

`apps/web/src/routeTree.gen.ts` is generated by the TanStack Start Vite plugin and gitignored — never edit it; add a file under `apps/web/src/routes/` and let the dev server regenerate.
