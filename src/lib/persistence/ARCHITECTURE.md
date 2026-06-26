# Persistence Architecture

Optional Postgres-backed persistence with localStorage fallback. App works without database.

## Responsibility

Sync chart workspaces, watchlist libraries, chart templates, and market research notes between client and server with optimistic concurrency.

## Layer Structure

```
Client (React hooks)
  ├── useChartWorkspaceRemoteSync
  ├── useWatchlistLibraryRemoteSync
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
| `auth/getCurrentUser.ts` | Dev session cookie auth boundary |
| `auth/devSessionCookie.ts` | Signed cookie creation/verification |

## Resources

| Resource | API Route | Schema |
|----------|-----------|--------|
| Chart workspace | `/api/me/chart-workspaces/default` | `chartWorkspace.ts` |
| Watchlist library | `/api/me/watchlist-library` | `watchlistLibrary.ts` |
| Chart templates | `/api/me/chart-template-library` | `chartTemplateLibrary.ts` |
| Research notes | `/api/me/market-research-notes` | `marketResearchNote.ts` |

## Auth Model

- Dev-only signed cookie auth (`EDGE_USER_COOKIE`).
- Requires `EDGE_AUTH_SECRET` and `DATABASE_URL` in environment.
- `getCurrentUser()` auto-creates dev user on first request.
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
npm run db:up                # start Postgres container
npm run db:migrate           # apply Drizzle migrations
```

## Verification

```bash
npm test -- --run src/lib/persistence/
npm test -- --run src/app/api/me/
```

## Related Docs

- [docs/CONSTRAINTS.md](../../../docs/CONSTRAINTS.md) — security and persistence rules
