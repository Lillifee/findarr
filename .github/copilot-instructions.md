# Copilot Instructions for Findarr

## Project Overview

Findarr is a full-stack TypeScript monorepo for discovering movies and TV shows. It integrates with TMDB (metadata), Radarr/Sonarr (media requests), and Jellyfin (library availability). Users can search, vote, and request media; the app tracks download and availability status via background schedulers.

---

## Monorepo Structure

npm workspaces monorepo. Build order: `shared` → `client` + `server`.

```
findarr/
├── shared/      # @findarr/shared — Zod schemas, DB schema, types, helpers
├── server/      # @findarr/server — Fastify backend, SQLite via Drizzle ORM
├── client/      # @findarr/client — React + Vite frontend
└── package.json # Root scripts, oxfmt, oxlint, vitest TypeScript
```

---

## Shared Package (`@findarr/shared`)

Single source of truth for types shared across server and client.

- **`src/db-schema.ts`** — Drizzle ORM table definitions (SQLite). When modifying the DB schema, update this file then run `npm run db:generate` from root.
- **`src/db-types.ts`** — TypeScript types inferred from the Drizzle schema.
- **`src/schemas.ts`** — Zod schemas for API request/response shapes.
- **`src/types.ts`** — Shared TypeScript types.
- **`src/constants.ts`** — Shared constants.
- **`src/helper.ts`** — Shared utility helpers.

Timestamps are stored as **unix epoch milliseconds** (integer in SQLite).

---

## Server Package (`@findarr/server`)

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

Every feature module under `server/src/` follows this file layout. Add only the files that are needed.

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

Background tasks in `server/src/scheduler/`:

- **`registry.ts`** — creates all scheduler instances, pulling in domain schedulers.
- **`service.ts`** — orchestrates start/stop, exposes `fastify.scheduler`.
- **`routes.ts`** — API endpoints to query/trigger scheduler state.

Domain modules define their own tasks in `schedulers.ts` and register them in the registry.

---

## Client Package (`@findarr/client`)

**Stack**: React 19 · React Router DOM 7 · Vite · Tailwind CSS v4 · axios · vitest

### Folder Structure

| Folder / File     | What belongs here                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`         | Root component: `AuthProvider` + `BrowserRouter` + all route definitions.                                                                             |
| `main.tsx`        | Entry point only.                                                                                                                                     |
| `pages/`          | One file per route. Page components own data fetching and compose components. Admin pages in `pages/admin/`.                                          |
| `components/`     | Reusable UI components with no route-level concerns. Generic primitives in `components/ui/`, admin-specific in `components/admin/`.                   |
| `contexts/`       | React contexts. `AuthContext` provides `isAuthenticated`, `isAdmin`, `user`, `tmdbConfigured`. Use `useAuth()` hook.                                  |
| `hooks/`          | Custom React hooks shared across pages/components.                                                                                                    |
| `services/api.ts` | Single axios instance (`baseURL: '/api'`, `withCredentials: true`). All API calls grouped into service objects (e.g. `searchService`, `authService`). |
| `utils/`          | Pure utility helpers.                                                                                                                                 |

### Key Patterns

- **All API types** imported from `@findarr/shared` — never redeclare shapes that exist in shared.
- **Admin routes** guarded by `isAdmin` from `useAuth()`.
- **Styling**: Tailwind CSS utility classes. Dark theme (gray-900 base, amber-500 accents).

---

## Code Conventions

- **TypeScript ESM**: `"type": "module"` in all packages. Use `.js` extension in all local imports.
- **Zod**: validate all external data — API responses, env vars, request bodies.
- **Comments**: only where logic is non-obvious. No redundant comments.
- **Linting**: oxlint config at root (`oxlint.config.ts`).
- **Formatting**: oxfmt config at root (`oxfmt.config.ts`).
