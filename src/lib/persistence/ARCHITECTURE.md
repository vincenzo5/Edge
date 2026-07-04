# Persistence Architecture

Optional Postgres-backed persistence with localStorage fallback. App works without database.

## Responsibility

Sync chart workspaces, watchlist libraries, screener libraries, chart templates, and market research notes between client and server with optimistic concurrency.

## Layer Structure

```
Client (React hooks)
  ├── useChartWorkspaceRemoteSync
  ├── useWatchlistLibraryRemoteSync
  ├── useScreenerLibraryRemoteSync
  └── useChartTemplateLibraryRemoteSync
        ↓
Client API (persistence/client/*.ts)
        ↓
API Routes (/api/me/*)
        ↓
Repositories (persistence/repositories/*.ts)
        ↓
Drizzle ORM + Postgres
```

## Key Modules

| Module | Role |
|--------|------|
| `common.ts` | Schema version, sync envelope, error codes, JSON body parsing |
| `schemas/*.ts` | Zod schemas for workspace, watchlist, templates, notes |
| `repositories/*.ts` | Database CRUD with revision tracking |
| `client/*.ts` | Fetch wrappers for API routes |
| `sync/*.ts` | React hooks for bidirectional sync |
| `sync/syncMetadata.ts` | Local revision tracking for conflict detection |
| `auth/getCurrentUser.ts` | Resolve signed dev session cookie (no auto-create) |
| `auth/devSession.ts` | Establish/clear dev session; layout bootstrap |
| `auth/devSessionCookie.ts` | Signed cookie creation/verification |
| `auth/signedCookieCore.ts` | HMAC cookie helpers shared by server routes |

## Resources

| Resource | API Route | Schema |
|----------|-----------|--------|
| Chart workspace | `/api/me/chart-workspaces/default` | `chartWorkspace.ts` |
| Watchlist library | `/api/me/watchlist-library` | `watchlistLibrary.ts` |
| Screener library | `/api/me/screener-library` | `screenerLibrary.ts` |
| Chart templates | `/api/me/chart-template-library` | `chartTemplateLibrary.ts` |
| Research notes | `/api/me/market-research-notes` | `marketResearchNote.ts` |

## Auth Model

- Dev-only signed cookie auth (`EDGE_USER_COOKIE`).
- Requires `EDGE_AUTH_SECRET` and `DATABASE_URL` in environment.
- `POST /api/auth/dev-session` establishes a session (passphrase required when `EDGE_DEV_PASSPHRASE` is set).
- `GET /api/auth/dev-session` and `/api/me/*` route handlers bootstrap a session when no passphrase is configured and Postgres is reachable.
- When a passphrase is required, `DevPersistenceLoginBanner` prompts via `GET`/`POST /api/auth/dev-session` until authenticated.
- `getCurrentUser()` resolves a verified cookie only — it does not auto-create users.
- **Not production auth** — placeholder boundary for persistence routes.

## Sync Contract

- All writes include `schemaVersion: 1` and `baseRevision`.
- Server returns `syncRevision` and `updatedAt` on success.
- Conflicts return HTTP 409 with current server state.
- Client hooks compare revisions and apply remote if newer.

## Error Codes

| Code | Meaning |
|------|---------|
| `unauthorized` | No valid session |
| `validation` | Invalid request body |
| `not_found` | Resource missing |
| `conflict` | Revision mismatch |
| `database_unavailable` | Postgres not configured |

## Invariants

- Persistence is optional — `isPersistenceEnabled()` checks `DATABASE_URL`.
- localStorage remains primary for layout when Postgres unavailable.
- All request bodies MUST validate against Zod schemas.
- MUST NOT commit secrets (see `.env.example` for required vars).

## Setup

```bash
cp .env.example .env.local   # set DATABASE_URL, EDGE_AUTH_SECRET
npm run dev:with-db          # start Postgres, migrate, then dev server
```

Manual steps (equivalent):

```bash
npm run db:up
npm run db:wait
npm run db:migrate   # applies only pending migrations (tracked in edge_schema_migrations)
npm run dev
```

## Dev startup

- **`npm run dev:with-db`** — starts the Docker Postgres container, waits until `DATABASE_URL` accepts connections, applies SQL migrations, then runs `npm run dev`. Use this when cloud sync should work on first load.
- **`npm run dev`** — unchanged. Persistence sync hooks still run when `DATABASE_URL` is set, but without Postgres you get `401` on `/api/me/*` and localStorage remains the effective store.
- **Shutdown** — Ctrl+C stops only the Next.js dev server. Postgres keeps running (`restart: unless-stopped`). Stop the container with `npm run db:down`.
- **Requirements** — `DATABASE_URL`, `EDGE_AUTH_SECRET` (non-placeholder), and Docker. Optional `EDGE_DEV_PASSPHRASE` requires the login banner before sync works.

## Verification

```bash
npm test -- --run src/lib/persistence/
npm test -- --run src/app/api/me/
```

## Related Docs

- [docs/CONSTRAINTS.md](../../../docs/CONSTRAINTS.md) — security and persistence rules
