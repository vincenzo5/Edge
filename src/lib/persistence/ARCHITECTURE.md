# Persistence Architecture

Optional Postgres-backed persistence with localStorage fallback. App works without database.

## Responsibility

Sync chart workspaces, watchlist libraries, screener libraries, chart templates, market research notes, and trading journal fills/trades between client and server with optimistic concurrency. Also owns the durable `order_intents` rows used by the trading intent store when Postgres is configured, and **broker ledger** tables (`broker_ingest_cursors`, `account_snapshots`, `position_snapshots`) written by server-side ingest — see [broker-ledger-roadmap.md](../../../docs/roadmaps/broker-ledger-roadmap.md).

## Layer Structure

```
Client (React hooks)
  ├── useWorkspaceTabsRemoteSync
  ├── useRevisionedRemoteSync (generic hydrate → debounce → conflict core)
  ├── useWatchlistLibraryRemoteSync (adapter wrapper)
  ├── useScreenerLibraryRemoteSync (adapter wrapper)
  └── useChartTemplateLibraryRemoteSync (subscribe-mode adapter wrapper)
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
| `schemas/*.ts` | Zod schemas for workspace, watchlist, screener, templates, notes, journal |
| `repositories/*.ts` | Database CRUD with revision tracking (includes `journalRepository.ts`, `intentRepository.ts`) |
| `repositories/revisionedLibraryRepository.ts` | Shared optimistic-revision save orchestration for singleton libraries (watchlist, screener, chart-template); resource repos supply typed `RevisionedLibraryOps` |
| `repositories/appUserRepository.ts` | Ensure app user rows; `ensureDevAppUser()` for server-side trading intents when no session cookie |
| `client/*.ts` | Fetch wrappers for API routes (includes `journalClient.ts` with localStorage fallback) |
| `client/revisionedLibraryClient.ts` | Shared GET/PUT + JSON parse helpers for singleton library routes; typed adapters keep snapshot field names |
| `sync/*.ts` | React hooks for bidirectional sync; `reconcileChartWorkspaces.ts` archives orphan remote workspaces on tab close |
| `sync/syncMetadata.ts` | Local revision tracking for conflict detection |
| `auth/getCurrentUser.ts` | Resolve signed dev session cookie (no auto-create) |
| `auth/devSession.ts` | Establish/clear dev session; layout bootstrap |
| `auth/devSessionCookie.ts` | Signed cookie creation/verification |
| `auth/signedCookieCore.ts` | HMAC cookie helpers shared by server routes |

## Resources

| Resource | API Route | Schema |
|----------|-----------|--------|
| Chart workspace | `/api/me/chart-workspaces` (GET list, POST create), `/api/me/chart-workspaces/default`, `/api/me/chart-workspaces/[id]` (GET, PUT, DELETE archive) | `chartWorkspace.ts` |
| Watchlist library | `/api/me/watchlist-library` | `watchlistLibrary.ts` |
| Screener library | `/api/me/screener-library` | `screenerLibrary.ts` |
| Chart templates | `/api/me/chart-template-library` | `chartTemplateLibrary.ts` |
| Research notes | `/api/me/market-research-notes` | `marketResearchNote.ts` |
| Trading journal | `/api/me/journal/fills`, `/api/me/journal/trades`, `/api/me/journal/trades/[id]`, `/api/me/journal/trades/rebuild`, `/api/me/journal/import` | `journal.ts` + `journalClient.ts` + `src/lib/journal/ARCHITECTURE.md` |
| Order intents | No `/api/me/*` route — server-only via `TradingService` / `resolveServerIntentStore()` | Migration `0005_order_intents.sql` + `intentRepository.ts`; consumed by `src/lib/trading/postgresIntentStore.ts` (memory fallback when `DATABASE_URL` unset) |
| Broker ledger ingest | `/api/cron/brokerage-ingest` (GET/POST); `/api/me/brokerage-ingest/status`; `/api/me/account-snapshots` | Migrations `0006`–`0008`; `brokerIngestRepository.ts`, `accountSnapshotRepository.ts`, `positionSnapshotRepository.ts`; consumed by `src/lib/brokerage/ingest/` |

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
- localStorage remains primary for layout when Postgres unavailable (`tv-ai:workspace-tabs:v1`; legacy `tv-ai:layout:v1` migrates on load).
- Each workspace tab stores embedded `remote` sync metadata (`resourceId`, `syncRevision`, `updatedAt`); active tab debounced PUT (800 ms) via `useWorkspaceTabsRemoteSync`.
- Closing a workspace tab calls `reconcileChartWorkspacesAfterTabClose()` to archive remote chart workspaces no longer linked to open tabs (records dismissed IDs in `tv-ai:workspace-tabs:dismissed-remotes:v1` so they are not auto-reopened).
- Chart workspace sidebar schema includes panel id `trade` (Trade sidebar) alongside existing panels.
- Order intents are keyed by `(userId, idempotencyKey)` unique index; trading owns the store API, persistence owns the rows.
- All request bodies MUST validate against Zod schemas.
- MUST NOT commit secrets (see `.env.example` for required vars).

## Setup

```bash
cp .env.example .env.local   # set DATABASE_URL, EDGE_AUTH_SECRET
npm run dev                  # start Postgres, migrate, then dev server
```

Manual steps (equivalent):

```bash
npm run db:up
npm run db:wait
npm run db:migrate   # applies only pending migrations (tracked in edge_schema_migrations)
npm run dev
```

## Dev startup

- **`npm run dev`** — starts the Docker Postgres container, waits until `DATABASE_URL` accepts connections, applies SQL migrations, then runs the Next.js dev server. Use this when cloud sync (workspaces, journal, libraries) should work on first load.
- **`npm run dev:lite`** — app only, no Postgres bootstrap. Persistence sync hooks still run when `DATABASE_URL` is set, but without Postgres you get `401` on `/api/me/*` and localStorage remains the effective store (including `edge.journal.v1` for the trading journal).
- **Shutdown** — Ctrl+C stops only the Next.js dev server. Postgres keeps running (`restart: unless-stopped`). Stop the container with `npm run db:down`.
- **Requirements** — `DATABASE_URL`, `EDGE_AUTH_SECRET` (non-placeholder), and Docker. Optional `EDGE_DEV_PASSPHRASE` requires the login banner before sync works.

## Verification

```bash
npm test -- --run src/lib/persistence/
npm test -- --run src/app/api/me/
```

## Related Docs

- [docs/CONSTRAINTS.md](../../../docs/CONSTRAINTS.md) — security and persistence rules
- [src/lib/trading/ARCHITECTURE.md](../trading/ARCHITECTURE.md) — Postgres intent store consumer (`resolveServerIntentStore`)
