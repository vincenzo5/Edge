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
  ├── useChartTemplateLibraryRemoteSync (subscribe-mode adapter wrapper)
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
| `schemas/*.ts` | Zod schemas for workspace, watchlist, screener, templates, script library, notes, journal |
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
| My scripts | `/api/me/scripts` (GET list, POST create), `/api/me/scripts/import`, `/api/me/scripts/[scriptId]` (GET, PATCH, DELETE), `/api/me/scripts/[scriptId]/revisions` (POST), `/api/me/scripts/[scriptId]/revisions/[revision]` (GET) | `scripts.ts` + `scriptsRepository.ts` |
| Research notes | `/api/me/market-research-notes` | `marketResearchNote.ts` |
| Research sessions | `/api/me/research-sessions` | `src/lib/research/sessionSketch.ts`, `boardSessionStore.ts`, `researchSessionsClient.ts` |
| Broker connections | `/api/me/connections` (GET list), `/api/me/connections/[id]` (GET, PATCH), `/api/me/connections/[id]/reconnect`, `/api/me/connections/[id]/disconnect` | `connections.ts` + `connectionsRepository.ts` + `src/lib/connections/ARCHITECTURE.md` |
| Trading journal | `/api/me/journal/fills`, `/api/me/journal/trades`, `/api/me/journal/trades/[id]`, `/api/me/journal/trades/rebuild`, `/api/me/journal/import` | `journal.ts` + `journalClient.ts` + `src/lib/journal/ARCHITECTURE.md` |
| Order intents | No `/api/me/*` route — server-only via `TradingService` / `resolveServerIntentStore()` | Migration `0005_order_intents.sql` + `intentRepository.ts`; consumed by `src/lib/trading/postgresIntentStore.ts` (memory fallback when `DATABASE_URL` unset) |
| Broker ledger ingest | `/api/cron/brokerage-ingest` (GET/POST); `/api/me/brokerage-ingest/status`; `/api/me/account-snapshots` | Migrations `0006`–`0008`; `brokerIngestRepository.ts`, `accountSnapshotRepository.ts`, `positionSnapshotRepository.ts`; consumed by `src/lib/brokerage/ingest/` |

## Auth Model

- Dev-only signed cookie auth (`EDGE_USER_COOKIE`).
- Requires `EDGE_AUTH_SECRET` and `DATABASE_URL` in environment.
- Cookie payload: HMAC-signed `userId|iat|jti` (base64url + signature); server enforces **14-day** max age (`SESSION_MAX_AGE_SEC`); browser `Max-Age` matches server TTL.
- Rotating `EDGE_AUTH_SECRET` invalidates all existing session cookies (global logout).
- Legacy `userId.sig` cookies are rejected; users must re-establish via `POST /api/auth/dev-session`.
- `POST /api/auth/dev-session` establishes a session (passphrase required when `EDGE_DEV_PASSPHRASE` is set).
- Silent bootstrap (`GET /api/auth/dev-session`, `/api/me/*`) runs only when `EDGE_ALLOW_OPEN_DEV_SESSION=1` (or `true`) **and** `NODE_ENV !== "production"`, and no passphrase is configured.
- When a passphrase is required, `DevPersistenceLoginBanner` prompts via `GET`/`POST /api/auth/dev-session` until authenticated.
- When persistence is on but neither open-dev nor passphrase is configured, routes return **401** until `POST /api/auth/dev-session` succeeds.
- `getCurrentUser()` resolves a verified cookie only — it does not auto-create users.
- **Not production auth** — placeholder boundary for persistence routes.

## Sync Contract

- All writes include `schemaVersion: 1` and `baseRevision`.
- Server returns `syncRevision` and `updatedAt` on success.
- Conflicts return HTTP 409 with current server state.
- Client hooks compare revisions and apply remote if newer.
- **My scripts:** DB-first normalized rows (`user_scripts`, `user_script_revisions`); browser holds memory cache only; Postgres required under `npm run dev`.

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
- localStorage remains primary for layout when Postgres unavailable (`tv-ai:workspace-tabs:v1`; legacy `tv-ai:layout:v1` is migrate-on-load read-only — production must not write it).
- Each workspace tab stores embedded `remote` sync metadata (`resourceId`, `syncRevision`, `updatedAt`); active tab debounced PUT (800 ms) via `useWorkspaceTabsRemoteSync`.
- Closing a workspace tab calls `reconcileChartWorkspacesAfterTabClose()` to archive remote chart workspaces no longer linked to open tabs (records dismissed IDs in `tv-ai:workspace-tabs:dismissed-remotes:v1` so they are not auto-reopened).
- Chart workspace sidebar schema includes panel id `trade` (Trade sidebar) alongside existing panels.
- Order intents are keyed by `(userId, idempotencyKey)` unique index; trading owns the store API, persistence owns the rows.
- All request bodies MUST validate against Zod schemas.
- MUST NOT commit secrets (see `.env.example` for required vars).

## Setup

```bash
cp .env.example .env.local   # set DATABASE_URL (edge_dev), EDGE_AUTH_SECRET
npm run dev                  # start shared Postgres + Redis, provision databases, migrate, dev server
```

Manual steps (equivalent):

```bash
npm run local:infra:up
npm run local:infra:provision
npm run db:wait
npm run db:migrate   # applies only pending migrations (tracked in edge_schema_migrations)
npm run dev:lite
```

## Dev startup

- **`npm run dev`** — starts shared Docker Postgres and Redis (`local:infra:up`), provisions `edge_dev` and `edge_prod`, waits until `DATABASE_URL` accepts connections, applies SQL migrations, then runs the Next.js dev server. Use this when cloud sync (workspaces, journal, libraries) should work on first load.
- **`npm run dev:lite`** — app only, no infrastructure bootstrap. Persistence sync hooks still run when `DATABASE_URL` is set, but without Postgres you get `401` on `/api/me/*` and localStorage remains the effective store (including `edge.journal.v1` for the trading journal).
- **Shutdown** — Ctrl+C stops only the Next.js dev server. Postgres and Redis keep running (`restart: unless-stopped`). Stop containers with `npm run db:down`.
- **Requirements** — `DATABASE_URL` targeting `edge_dev`, `EDGE_AUTH_SECRET` (non-placeholder), and Docker. Optional `EDGE_DEV_PASSPHRASE` requires the login banner before sync works. Local dev may set `EDGE_ALLOW_OPEN_DEV_SESSION=1` for silent bootstrap (non-production only).
- **Isolation proof** — `npm run local:infra:verify` checks Postgres and Redis separation for concurrent dev/prod profiles.

## Verification

```bash
npm test -- --run src/lib/persistence/
npm test -- --run src/app/api/me/
```

## Related Docs

- [docs/CONSTRAINTS.md](../../../docs/CONSTRAINTS.md) — security and persistence rules
- [src/lib/trading/ARCHITECTURE.md](../trading/ARCHITECTURE.md) — Postgres intent store consumer (`resolveServerIntentStore`)
- [docs/roadmaps/workspace-state-persistence-roadmap.md](../../../docs/roadmaps/workspace-state-persistence-roadmap.md) — per-tile charts, app-workspace cloud sync, user prefs, viewport restore
- [src/lib/research/ARCHITECTURE.md](../research/ARCHITECTURE.md) — Research Session contracts + cloud API (`/api/me/research-sessions`)

## Workspace state persistence (Phase 0–5 shipped)

Phase 0 freezes what is durable vs ephemeral and which roadmap phase owns each key. Phases 1–5 shipped: per-tile chart layouts, app-workspace shell cloud sync, user preference pack, modified viewport restore, and workflow continuity (screener review resume + user-scoped pattern library).

### Persist vs ephemeral matrix

| Category | Persist | Ephemeral |
|----------|---------|-----------|
| App workspace shell | Split tree, tile surfaces, active document (`tv-ai:app-workspaces:v1` + `/api/me/app-workspaces`) | Layout edit mode, unsaved edit draft |
| Chart per tile | `ChartLayout` per chart tile via scoped workspace-tabs + optional `chartWorkspaceId` (Phase 1); modified viewport on cell (Phase 4) | Candles, quotes, fundamentals, overlay fetch results |
| Libraries | Watchlist, screener screens, chart templates, scripts, journal, alerts, notifications (existing `/api/me/*`) | Screener result rows, indicator compute caches |
| User prefs pack | Theme, TZ, data connection, trading account/env, risk, journal table prefs (`/api/me/user-preferences` + local cache keys) | Recent commands/symbols (local only) |
| Workflow resume | Screener review resume on `tv-ai:screener:v1` / screener library (Phase 5); user-scoped pattern captures via `/api/me/pattern-library/*` (Phase 5); Copilot threads via `tv-ai:copilot-threads:v1` / `/api/me/copilot-threads` (ai-agent Phase 6) | Drawing undo/redo stack, session bridge queue, toasts/modals; screener result rows |

### Ephemeral allowlist (review gate)

**Do not persist** as user state: live market data payloads; screener result grids; drawing undo/redo history; layout edit drafts; interaction chrome (toasts, modals, crosshair, selection); options chain chatter; derived margin/journal execution overlays.

Persistence PRs that introduce new localStorage keys or Postgres columns MUST be checked against this allowlist and [workspace-state-persistence-roadmap.md](../../../docs/roadmaps/workspace-state-persistence-roadmap.md).

### Keys ownership map

Programmatic mirror: [`workspaceStateStorageInventory.ts`](./workspaceStateStorageInventory.ts). Summary:

| Key | Owner | Phase | Postgres |
|-----|-------|-------|----------|
| `tv-ai:app-workspaces:v1` | appWorkspace/storage | **2** | `/api/me/app-workspaces` |
| `tv-ai:sync:app-workspaces:v1` | sync/syncMetadata | **2** | sync metadata |
| `tv-ai:workspace-tabs:v1` | workspaceTabsStorage | **1** per-tile scope | via chart-workspaces |
| `tv-ai:workspace-tabs:v1:tile:{tileId}` | workspaceTabsStorage (Phase 1) | **1** | via chart-workspaces |
| `edge:app:theme:v1`, `edge:app:timeZone:v1`, `edge:marketData:*`, `edge:trading:*`, `edge.riskSettings.v1`, `edge.journal.tradesTable.v1` | prefs modules | **3** user_preferences pack | `/api/me/user-preferences` |
| `tv-ai:sync:user-preferences:v1` | sync/syncMetadata | **3** | sync metadata |
| Viewport on `CellConfig` | chart workspace snapshot | **4** | inside chart-workspaces |
| `reviewResume` on screener snapshot | screener library / `tv-ai:screener:v1` | **5** | `/api/me/screener-library` |
| Pattern library records | patternLibraryStore; FS only when `DATABASE_URL` unset | **5** | `/api/me/pattern-library/*` |
| Copilot threads | `localCopilotThreadsStore` + `copilotThreadsClient` | ai-agent **6–7** | `/api/me/copilot-threads` (+ optional `modelId` per thread) |
| Copilot attachments | `copilotAttachmentsClient` + FS blobs under `data/copilot-attachments/` | Grok parity **5** | `/api/me/copilot/attachments` (multipart upload + auth GET); metadata in `copilot_attachments` |

Sketch schemas (not wired): [`chartTileBindingSketch.ts`](../appWorkspace/chartTileBindingSketch.ts). Viewport persist contract: [`viewportPersistSketch.ts`](../chart/viewportPersistSketch.ts) (wired on `CellConfig.viewport` via `cellConfigSchema`). Production prefs schema: [`userPreferences.ts`](./schemas/userPreferences.ts).

### User-state APIs

| Resource | API | Phase |
|----------|-----|-------|
| App workspaces | `/api/me/app-workspaces` | **2** (shipped) |
| User preferences | `/api/me/user-preferences` | **3** (shipped) |
| Viewport snapshot | inside chart workspace `CellConfig` | **4** (shipped) |
| Screener review resume | `reviewResume` on screener library snapshot | **5** (shipped) |
| Pattern library | `/api/me/pattern-library/*` (FS only when `DATABASE_URL` unset) | **5** (shipped) |

**Security Phase 0:** Unauthenticated public `/api/pattern-library/*` → **401** when Postgres is configured; see CONSTRAINTS.md Security.

**Security Phase 4 (tenant integrity + href safety):**

- **M1 — FK ownership:** Before create/update, repositories assert referenced rows belong to the same `userId`: `createMarketResearchNote` / `patchMarketResearchNote` → `getChartWorkspaceById`; `createJournalTradeChartSnapshot` → `getJournalTradeScreenshotById`; `createAlertTriggerEvent` → `getNotificationEventById`. Failures throw `PersistenceOwnershipError` → API **400**.
- **M2 — href allowlist:** `src/lib/security/safeHref.ts` (`isAllowedHref`, `sanitizeHref`, `normalizeExternalHref`); Zod `safeHrefSchema` on notification create; sanitize on `emitNotificationRecord` + `addLocalNotification`; defensive sanitize in `NotificationBellMenu`, `EdgeToastViewport`, and `SymbolDetailsPanel` website links.

| Copilot threads | `/api/me/copilot-threads` (+ `tv-ai:copilot-threads:v1` local fallback; optional `modelId` per thread) | ai-agent **6–7** (shipped) |

**Phase 6 client memo:** `journalClient.ts` caches GET trades/fills (15s TTL); `patternLibraryRecordsClient.ts` caches record list (60s). Helpers in `persistenceClientCache.ts`; bust on ingest ledger change and mutating writes. Layout legacy key `tv-ai:layout:v1` is read-only for migration — see `layoutStorage.layoutLegacyWriteLock.test.ts`.
