# Copilot Instructions for Findarr

## Project Overview

Findarr is a full-stack TypeScript monorepo for discovering movies and TV shows. It integrates with TMDB (metadata), Radarr/Sonarr (media requests), and Jellyfin (library availability). Users can search, vote, and request media; the app tracks download and availability status via background schedulers.

---

## Monorepo Structure

pnpm workspaces monorepo (`pnpm-workspace.yaml`). Build order is topological: `shared` → `web` + `api`.

```
findarr/
├── packages/shared/      # @findarr/shared — Zod schemas, DB schema, types, helpers
├── apps/api/             # @findarr/api — Fastify backend, SQLite via Drizzle ORM
├── apps/web/             # @findarr/web — React + Vite frontend
├── vite.config.ts        # Root Vite+ config — shared fmt + lint settings for all packages
└── package.json          # Root scripts (build, check, test, db:generate, …)
```

---

## Shared Package (`@findarr/shared`)

Single source of truth for types, schemas, and helpers shared across api and web. Split into **subpath modules** (no root barrel) — always import from the specific subpath, never from `@findarr/shared` directly. Each module co-locates its Zod schemas with the types inferred from them. Subpath names mirror the `apps/api/src` feature modules.

| Subpath                       | Source               | Contents                                                                                                                                                                                                                                              |
| ----------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@findarr/shared/db`          | `src/db.ts`          | Drizzle ORM table definitions + relations (SQLite) and the `Db*` row types inferred from them (plus `SeasonRecord`, the `media.seasons` JSON column shape). When modifying the DB schema, update this file then run `pnpm run db:generate` from root. |
| `@findarr/shared/media`       | `src/media.ts`       | Media domain types (Movie, TVShow, details, scoring, response wrappers) + DB-derived media composites (`MediaRecord`, `MediaUser`, `MediaInteraction`, `MediaInteractionWithUser`).                                                                   |
| `@findarr/shared/catalog`     | `src/catalog.ts`     | Catalog/browse request schemas + inferred types (search, discover, popular, details, genres).                                                                                                                                                         |
| `@findarr/shared/settings`    | `src/settings.ts`    | User settings + integration settings schemas/types (TMDB, Radarr, Sonarr, Jellyfin) plus admin settings such as the community request threshold.                                                                                                      |
| `@findarr/shared/preferences` | `src/preferences.ts` | DB-derived user preference types (`UserGenrePreference`, `UserKeywordPreference`).                                                                                                                                                                    |
| `@findarr/shared/auth`        | `src/auth.ts`        | Auth + user schemas/types (login, password, user CRUD) and the `User` entity type (`Omit<DbUser, 'passwordHash'>`).                                                                                                                                   |
| `@findarr/shared/interaction` | `src/interaction.ts` | Like/dislike interaction schemas/types.                                                                                                                                                                                                               |
| `@findarr/shared/scheduler`   | `src/scheduler.ts`   | Scheduler config/state types + name/param schemas.                                                                                                                                                                                                    |
| `@findarr/shared/constants`   | `src/constants.ts`   | Region groups, unified genres, and their keys/types.                                                                                                                                                                                                  |
| `@findarr/shared/utils`       | `src/utils.ts`       | Pure utility helpers (`isDefined`, `getErrorMessage`, object helpers).                                                                                                                                                                                |
| `@findarr/shared/env`         | `src/env.ts`         | Server environment schema + type.                                                                                                                                                                                                                     |

Build entries are declared in `packages/shared/vite.config.ts` (`pack.entry`) and exposed via the `exports` map in `package.json`. When adding a new module, add it to both.

Timestamps are stored as **unix epoch milliseconds** (integer in SQLite).

---

## API Package (`@findarr/api`)

**Stack**: Fastify 5 · Drizzle ORM + better-sqlite3 · Zod · argon2 · axios · vitest

### Fastify Plugin Architecture

Services are registered as Fastify plugins via `fastify.decorate()`. Plugin dependencies declared with `fp(plugin, { dependencies: [...] })`.

Plugin registration order (`src/index.ts`):

1. `databasePlugin` → `fastify.db`
2. `authPlugin` → session management
3. `tmdbPlugin` → `fastify.tmdb`
4. `jellyfinPlugin` → `fastify.jellyfin`
5. `arrPlugin` → `fastify.radarr`, `fastify.sonarr`
6. `catalogPlugin` → `fastify.catalog`
7. `schedulerPlugin` → `fastify.scheduler`

### Feature Module Structure

Every feature module under `apps/api/src/` follows this file layout. Add only the files that are needed.

| File              | What belongs here                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin.ts`       | Registers the service on the Fastify instance via `fastify.decorate()`. Declares the `FastifyInstance` type extension. Lists plugin dependencies.                           |
| `service.ts`      | All business logic. Factory function (e.g. `createXxxService(db, ...)`) that returns a service object. No direct HTTP or DB access — calls `repository.ts` and `client.ts`. |
| `repository.ts`   | All database queries. Plain functions that take `db: DB` as first argument. No business logic.                                                                              |
| `routes.ts`       | Fastify route handlers. Thin layer — delegates to service. Wrap protected routes with `protectedRoute()`.                                                                   |
| `schemas.ts`      | Zod schemas for **external** API responses (e.g. Radarr, Sonarr, TMDB JSON shapes). Not for internal DB types.                                                              |
| `client.ts`       | HTTP client for a third-party service (Radarr, Sonarr, Jellyfin, TMDB). Uses axios. Handles auth headers, base URL, retries.                                                |
| `transformers.ts` | Pure functions that map external API shapes (from `client.ts`) to internal types.                                                                                           |
| `schedulers.ts`   | Scheduler task definitions for this domain. Registered in `scheduler/registry.ts`.                                                                                          |
| `sync.ts`         | Sync logic — pulling state from an external service into the local DB (e.g. Sonarr library → media table). Called by schedulers.                                            |
| `config.ts`       | Static configuration for this module (e.g. endpoint paths, service names).                                                                                                  |

### Key Patterns

- **Route protection**: `protectedRoute()` from `src/utils/routes.ts` — throws `Unauthorized` if no session user.
- **Error utilities**: `src/utils/errors.ts` — use `Unauthorized()`, `NotFound()`, etc.
- **ESM imports**: always use `.js` extension for local imports (source is `.ts`, but Node ESM requires `.js`).
- **No barrel `index.ts`** in feature modules — import directly from the specific file.
- **Environment**: validated at startup via `ServerEnvSchema.parse(process.env)` (Zod schema from shared).

### Scheduler System

Background tasks in `apps/api/src/scheduler/`:

- **`registry.ts`** — creates all scheduler instances, pulling in domain schedulers.
- **`service.ts`** — orchestrates start/stop, exposes `fastify.scheduler`.
- **`routes.ts`** — API endpoints to query/trigger scheduler state.

Domain modules define their own tasks in `schedulers.ts` and register them in the registry.

---

## Web Package (`@findarr/web`)

**Stack**: React 19 · React Router DOM 7 · Vite · Tailwind CSS v4 · axios · vitest

### Folder Structure

The app-shell/composition layer lives at the `src/` root (above `pages/`), so the dependency graph flows strictly downward: `main → App → AppShell → AppRoutes → pages → components → ui`. `components/` never imports from `pages/`.

| Folder / File     | What belongs here                                                                                                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main.tsx`        | Entry point only.                                                                                                                                                                                                                                                 |
| `App.tsx`         | Root component: `AuthProvider` + `BrowserRouter` + the auth gate (login / TMDB setup / loading).                                                                                                                                                                  |
| `AppShell.tsx`    | Authenticated chrome: `Navigation` + the routed content.                                                                                                                                                                                                          |
| `AppRoutes.tsx`   | The `<Routes>` table — one `<Route>` per page. Admin routes guarded by `isAdmin`.                                                                                                                                                                                 |
| `Navigation.tsx`  | Top-level app navigation.                                                                                                                                                                                                                                         |
| `pages/`          | One file per route (flat — no `admin/` subfolder). Page components own data fetching and compose components.                                                                                                                                                      |
| `components/`     | Reusable UI components with no route-level concerns. Generic primitives in `components/ui/`; the rest grouped by domain (`media/`, `catalog/`, `dashboard/`, `explore/`, `activity/`, `vote/`, `settings/`, `administration/`, `schedulers/`, `users/`, `auth/`). |
| `contexts/`       | React contexts. `AuthContext` provides `isAuthenticated`, `isAdmin`, `user`, `tmdbConfigured`. Use `useAuth()` hook.                                                                                                                                              |
| `hooks/`          | Custom React hooks shared across pages/components.                                                                                                                                                                                                                |
| `services/api.ts` | Single axios instance (`baseURL: '/api'`, `withCredentials: true`). All API calls grouped into service objects (e.g. `searchService`, `authService`).                                                                                                             |
| `utils/`          | Pure utility helpers.                                                                                                                                                                                                                                             |

### Key Patterns

- **All API types** imported from `@findarr/shared/*` subpaths (e.g. `@findarr/shared/media`) — never redeclare shapes that exist in shared, and never import from the bare `@findarr/shared` root.
- **Local imports** use bare relative paths (e.g. `'../components/ui/Button'`) — **no** `.js` extension (the `.js` rule is `apps/api` only).
- **Admin routes** guarded by `isAdmin` from `useAuth()`. The admin area page is `AdministrationPage` and its primary route is `/admin/administration`.
- **Styling**: Tailwind CSS utility classes. Dark theme (gray-900 base, amber-500 accents).

---

## Code Conventions

- **TypeScript ESM**: `"type": "module"` in all packages. In `apps/api` and `packages/shared`, use the `.js` extension in local imports (source is `.ts`, but Node ESM requires `.js`). `apps/web` (bundled by Vite) uses bare relative imports with no extension.
- **Zod**: validate all external data — API responses, env vars, request bodies.
- **Comments**: only where logic is non-obvious. No redundant comments.
- **Linting & formatting**: configured once in the root `vite.config.ts` (`lint` + `fmt` blocks, Oxlint + Oxfmt under the hood) and applied to every package via `vp check`. There are no per-package `oxlint.config.ts`/`oxfmt.config.ts` files.

# Using Vite+, the Unified Toolchain for the Web

This project uses Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Commands used in this repo

Prefer the root `package.json` scripts (which wrap `vp`); run them from the repo root.

| Task                  | Root script        | Underlying `vp` command                                   |
| --------------------- | ------------------ | --------------------------------------------------------- |
| Dev (all packages)    | `pnpm dev`         | builds `@findarr/shared`, then `vp run -r --parallel dev` |
| Build everything      | `pnpm build`       | `vp run -r build` (topological)                           |
| Lint + format + types | `pnpm check`       | `vp check`                                                |
| Auto-fix lint/format  | `pnpm fix`         | `vp check --fix`                                          |
| Run tests             | `pnpm test`        | `vp test` (Vitest)                                        |
| CI (build+check+test) | `pnpm ci`          | `vp run -r build && vp check && vp test`                  |
| Generate migrations   | `pnpm db:generate` | `vp run -r db:generate` (Drizzle Kit)                     |

Notes:

- `vp check` runs lint, formatting, and type-checking together — there is no separate `tsc`/`oxlint`/`oxfmt` step.
- The `@findarr/shared` library is bundled with `vp pack` (tsdown). Each entry in `packages/shared/vite.config.ts` `pack.entry` emits a matching `dist/<name>.mjs` + `dist/<name>.d.mts`; `pack` does **not** auto-derive entries from `package.json` exports, so add new modules to both.
- `apps/web` (Vite app) uses `vp dev` / `vp build`; `apps/api` builds with `tsc`.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.
