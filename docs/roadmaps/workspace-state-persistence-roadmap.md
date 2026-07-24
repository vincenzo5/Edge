# Workspace State Persistence Roadmap

Close the gaps between “survives refresh on this browser” and “my desk follows me” — without persisting live market data or ephemeral interaction chrome.

**Last updated:** 2026-07-20

**Status:** Phase 0 **Passing** (2026-07-20) — contracts frozen; Phase 1 **Passing** (2026-07-21); Phase 2 **Passing** (2026-07-21); Phase 3 **Passing** (2026-07-21); Phase 4 **Passing** (2026-07-21); Phase 5 **Passing** (2026-07-21). **Track complete.** Residual chrome walks → [app-level-verification-roadmap.md](./app-level-verification-roadmap.md) Phase 6.

**Related:** [Persistence Architecture](../../src/lib/persistence/ARCHITECTURE.md), [App Workspace Architecture](../../src/lib/appWorkspace/ARCHITECTURE.md), [Chart Architecture](../../src/lib/chart/ARCHITECTURE.md), [Data State Hardening](./data-state-hardening-roadmap.md), [Project Status](../PROJECT-STATUS.md), [Repository Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Feature — durable workspace shell, per-tile chart identity, user prefs, and selective viewport/workflow resume across refresh and (where Postgres is configured) devices.
- **Secondary:** Refactor — chart bootstrap must stop assuming a single global `WorkspaceTabsState` when multiple Chart tiles exist; Testing — sync/conflict and hydrate contracts need deterministic coverage.
- **Checklists applied:** `feature-planning-checklist.md`, `refactor-planning-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Assumptions:** Persistence remains optional (`DATABASE_URL` unset → localStorage-only). Dev session cookie auth stays the `/api/me/*` boundary until production auth lands. Live candles/quotes are never treated as user state.

---

## Checklist Review

- **Architecture review:** **Required** — self-review, **Passed for roadmap**. Implementation phases change shared state ownership (app workspace ↔ chart workspace), persistence schemas/API routes, chart hydrate/bootstrap, and cross-tile StockApp instances. Each phase needs its own exit review.
- **Aligned:** Chart `ChartLayout`, watchlist/screener/template libraries, journal, scripts, alerts, and notifications already have local + (mostly) Postgres paths; app workspace already autosaves shell geometry to localStorage; `risk_settings` is cataloged as deferred Postgres in data-state hardening.
- **Missing:** Per-tile chart layout binding; app-workspace cloud sync; unified user-preferences document; modified-viewport persistence; lightweight screener-review resume; user-scoped pattern library storage.
- **Misalignments:** Multiple Chart tiles each mount `StockApp` against one shared `tv-ai:workspace-tabs:v1` key — multi-chart desks cannot hold independent symbols/drawings. `docs/ROADMAP.md` Explicit Deferrals still says “cross-device cloud sync beyond optional Postgres foundation,” which this track partially supersedes for desk/prefs gaps only.
- **Risks:** Dual StockApp instances writing the same storage key; revision conflicts when shell + per-tile charts sync independently; viewport restore fighting range-preset / interval-change reset rules; preference merge overwriting device-local data-connection choices.
- **Recommendations:** Ship Phase 1 (per-tile charts) before cloud-syncing the shell (Phase 2). Keep a hard “ephemeral allowlist.” Prefer one revisioned preferences resource over many tiny keys. Do not persist screener result rows or undo stacks.

---

## Product goal

After refresh — and, when Postgres + session are available, on another browser — the user should recover:

1. Which workspace document was active and how tiles were split.
2. Independent chart content per Chart tile (symbol, drawings, indicators, cell grid).
3. Desk-defining prefs (theme, timezone, data connection, trading account, risk settings).
4. A *modified* chart viewport when they had zoomed/panned away from the default fit.
5. Enough screener-review / UI chrome continuity to resume work without reconfiguring tables.

Edge is **not** trying to snapshot the entire React tree or cache market data as durable state.

### Success criteria

- Two Chart tiles can show different symbols and drawing sets; each survives refresh independently.
- App workspace documents round-trip through localStorage and optional `/api/me/app-workspaces` with optimistic concurrency.
- User preference pack syncs when Postgres is configured; localStorage remains the offline/dev:lite path.
- Modified viewport restores; unmodified charts still open at the current default fit / live-edge behavior.
- Documented ephemeral allowlist stays enforced in code review and schemas (no accidental candle/result persistence).

---

## Current state (gap inventory)

### Already durable (baseline — out of scope except as consumers)

| Resource | Local | Postgres |
|----------|-------|----------|
| Chart layout (single global tab today) | `tv-ai:workspace-tabs:v1` | `/api/me/chart-workspaces` |
| Watchlist library | `tv-ai:watchlists:v1` | `/api/me/watchlist-library` |
| Screener saved screens | `tv-ai:screener:v1` | `/api/me/screener-library` |
| Chart/study templates | `tv-ai:presets:v1` | `/api/me/chart-template-library` |
| My scripts | browser cache only | `/api/me/scripts*` (required under `npm run dev`) |
| Journal fills/trades/screenshots/forks | `edge.journal.v1` + IndexedDB | `/api/me/journal/*` |
| Alerts + notifications | `edge:alerts:v1` / `edge:notifications:v1` | `/api/me/alerts`, `/api/me/notifications` |
| Research notes | — | `/api/me/market-research-notes` |
| App workspace shell | `tv-ai:app-workspaces:v1` | **none** |
| Theme / TZ / trading / data connection / risk | various `edge:*` keys | **none** (risk marked deferred) |

### Gaps this track closes

| Priority | Gap | User impact |
|----------|-----|-------------|
| P0 | Per-tile chart layouts | Multi-Chart desks share one layout; tiles fight over the same store |
| P0 | App workspace cloud sync | Desk tiling lost on new browser / cleared storage even when chart content syncs |
| P1 | User preference pack (+ risk Postgres) | Theme, TZ, accounts, risk do not follow the user |
| P1 | Modified viewport restore | Zoom/pan lost every refresh; “reset chart view” implies restore should exist |
| P2 | Screener review resume | In-progress review index/keepers die on refresh (rows stay ephemeral) |
| P2 | Journal table prefs in preference pack | Column order/visibility already local; should ride with prefs |
| P2 | Pattern library user scope | Filesystem `data/pattern-library/` is single-dev, not portable |
| P2 | Options calculator draft (optional) | Multi-leg drafts lost; only if usage warrants |

### Explicitly ephemeral (do not persist)

| State | Reason |
|-------|--------|
| Candles, quotes, fundamentals, overlays | Refetch; caching ≠ user state |
| Screener result tables / lastRun rows | Stale on reload; re-run is correct |
| Drawing undo/redo stack | Reconstruct from persisted drawings |
| Layout edit mode / unsaved edit draft | Explicit Save / Discard / Done |
| Options live chain chatter / AI session | Transient tooling |
| Toasts, modals, crosshair, selection | Interaction chrome |
| Margin-call / journal execution overlays | Derived or session-scoped |

---

## Target architecture

```
/workspace AppWorkspaceDocument (shell)
  tiles[] → surfaceId + surfaceState
    chart tile → chartWorkspaceId | embedded ChartLayout
    other tiles → library/session consumers (unchanged)

UserPreferences (revisioned singleton)
  theme, timeZone, dataConnectionId, tradingEnvironment,
  activeAccount, accountAliases, riskSettings,
  journalTradesTablePrefs, …

Viewport (per cell, optional)
  only when isViewportModified — logical/bar window + price scale hints
```

Sync pattern: reuse `useRevisionedRemoteSync` / workspace-tabs remote sync conventions (`schemaVersion`, `baseRevision`, 409 conflict → adopt newer remote or merge policy documented per resource).

---

## Phasing

### Phase 0 — Contracts and inventory freeze

**Outcome:** One authoritative matrix of persist vs ephemeral; schema sketches; no user-visible behavior change.

**Status:** **Passing** (2026-07-20)

| Work item | Scope |
|-----------|--------|
| Matrix | Codify the tables above in persistence + appWorkspace architecture docs |
| Keys map | List all `tv-ai:*` / `edge:*` keys and which phase owns migration |
| Chart tile contract | **Frozen:** optional `chartWorkspaceId` on tile; per-tile scoped workspace-tabs; no inline `ChartLayout` in shell |
| Prefs contract | Single `userPreferencesSnapshot` Zod schema sketch |
| Viewport contract | Persist only when modified; clear on symbol/interval change (align with existing `viewportRevision` reset) |
| Ephemeral allowlist | Architecture note + review checklist bullet |

**Exit:** Docs + schema sketches reviewed; harness Task Contract active; inventory lock tests pass.

### Phase 1 — Per-tile chart layouts (P0)

**Outcome:** Each Chart tile owns an independent `ChartLayout` (and remote id when synced).

**Status:** **Passing** (2026-07-21)

| Work item | Scope |
|-----------|--------|
| Tile binding | `TileInstance` gains `chartWorkspaceId` and/or embedded layout ref |
| StockApp scope | Bootstrap/storage keyed by tile id — stop sharing one global workspace-tabs write from every Chart tile |
| Hydrate | Primary chart tile still drives browser-tab quote; secondary tiles load their own layout |
| Migration | Existing single `tv-ai:workspace-tabs:v1` attaches to the primary Chart tile; other chart tiles clone or create fresh defaults |
| Sync | Each tile’s layout continues to use chart-workspace PUT path (or batch later); no orphaned remotes on tile close (extend reconcile helpers) |

**Out of scope:** Cloud-syncing the shell document (Phase 2); viewport restore (Phase 4).

**Verification:** Two Chart tiles → different symbols + drawings → refresh → both restore independently; closing a tile archives/dismisses its remote when appropriate.

### Phase 2 — App workspace cloud sync (P0)

**Outcome:** Shell documents sync via Postgres when configured; localStorage remains primary offline path.

**Status:** **Passing** (2026-07-21)

| Work item | Scope |
|-----------|--------|
| Schema | `app_workspaces` (or singleton library snapshot of `AppWorkspacesState`) migration |
| API | `/api/me/app-workspaces` GET/PUT with revision |
| Client | `useAppWorkspacesRemoteSync` (revisioned hydrate → debounce → conflict) |
| Bootstrap | Load local → merge remote (timeout pattern like `resolveAppBootstrap`) |
| Edit mode | Unchanged: no autosave while editing; Save still writes local then remote |

**Depends on:** Phase 1 preferred (shell sync without per-tile charts re-creates the shared-layout bug across devices).

**Verification:** Arrange multi-tile desk → Save → other profile/`localStorage.clear` with same session → desk geometry + tile surfaces restore; chart content restores via per-tile remotes.

### Phase 3 — User preference pack (P1)

**Outcome:** Desk-defining prefs are one revisioned resource with localStorage fallback.

**Status:** **Passing** (2026-07-21)

| Work item | Scope |
|-----------|--------|
| Schema | `user_preferences` + Zod snapshot covering theme, timeZone, dataConnection (+ explicit flag), tradingEnvironment, activeAccount, accountAliases, riskSettings, journal trades table prefs |
| API | `/api/me/user-preferences` |
| Clients | Migrate readers/writers behind a small preferences module; keep existing keys as cache/migration sources |
| Risk | Close catalog “deferred Postgres” for `risk_settings` |
| Conflicts | Last-write-wins by revision; document device-local overrides if any (none by default) |

**Out of scope:** Production multi-user auth; pushing recent-commands/recent-symbols to cloud (optional later; low value).

**Verification:** Change theme/TZ/risk/account → refresh and second browser with session → prefs match; `dev:lite` still works from localStorage.

### Phase 4 — Modified viewport restore (P1)

**Outcome:** Zoom/pan survives refresh when the user has left the default fit; reset chart view clears persisted viewport.

**Status:** **Passing** (2026-07-21)

| Work item | Scope |
|-----------|--------|
| Cell fields | Optional viewport snapshot on `CellConfig` (bar/logical window + price scale hints) |
| Write path | Debounced persist only when `isViewportModified` |
| Clear path | Symbol/interval/range-preset changes and **Reset chart view** clear snapshot |
| Sync | Travels inside chart workspace snapshot (no separate API) |

**Guardrails:** Do not restore across interval changes; do not block live-edge follow when unmodified; keep wheel/pan path imperative (CONSTRAINTS).

**Verification:** Zoom in → refresh → same window; Reset chart view → refresh → default fit; change interval → no stale viewport.

### Phase 5 — Workflow continuity (P2)

**Outcome:** Resume in-progress workflows without persisting stale market tables.

**Status:** **Passing** (2026-07-21)

| Work item | Scope |
|-----------|--------|
| Screener review | Persist review index, keepers symbol list, active screen id / query fingerprint — **not** result rows |
| Pattern library | Move from repo filesystem toward user-scoped Postgres (or object storage) + API; local FS remains seed/dev fallback |
| Options draft | **Deferred** — roadmap-optional; floating panel resets on symbol/expiration |
| Journal columns | **Closed in Phase 3** — `edge.journal.tradesTable.v1` already in user preference pack |

**Verification:** Mid-review refresh resumes index/keepers; pattern capture survives across machines when Postgres on; options draft only if implemented.

---

## Explicit deferrals

- Persisting candle/quote/fundamentals payloads as user state
- Persisting screener result grids or indicator compute caches as durable truth
- Drawing undo/redo history across sessions
- Production auth / multi-tenant isolation beyond current dev session cookie
- Full multi-device realtime CRDT collaboration (revisioned sync is enough)
- Copilot thread / AI chat history persistence — [ai-agent-roadmap.md](./ai-agent-roadmap.md) Phase 6
- Bar Replay position in `CellConfig` (already noted on product roadmap; can join Phase 4 if desired)

---

## Verification plan

| Tier | When | Scope |
|------|------|--------|
| **Focused** | Every phase | Schema/migrate tests; storage keying by tile; sync conflict tests; viewport modified/clear tests |
| **Build** | Phases 1–3 (API/schema) | `npm run build` |
| **App-level** | Phases 1–4 | Multi-tile desk on `/workspace`; refresh; second browser with Postgres session; viewport zoom/refresh/reset |
| **Full** | After Phase 2 or 3 | `npm run check` when shared persistence contracts change |

---

## Harness update

When this track is activated under WIP=1:

| Section | Change |
|---------|--------|
| **Active Work** | One row **Active** per phase (e.g. “Workspace state persistence — Phase 1”); prior phase **Passing** with quoted evidence |
| **Task Contract** | Keep open for the track until Phase 5 exit or explicit pause |
| **Session Log** | Append on phase start/complete |
| **Current Verified State** | Update only when a phase completes with evidence |

Roadmap authoring (this doc) records a **Pending** Active Work row and Session Log entry without marking the track **Active**.

---

## Touch points (implementation)

| Area | Path |
|------|------|
| App workspace | `src/lib/appWorkspace/`, `AppWorkspaceContext.tsx`, `ChartTileHost.tsx` |
| Chart bootstrap / tabs | `src/lib/app/workspaceTabs*.ts`, `useStockAppBootstrap.ts`, `StockApp.tsx` |
| Persistence | `src/lib/persistence/schemas/`, `repositories/`, `sync/`, `/api/me/*` |
| Prefs today | `appThemePreference.ts`, `appTimeZonePreference.ts`, `dataConnectionPreference.ts`, `activeAccount.ts`, `riskSettings.ts`, `journalTradesTableControls.ts` |
| Viewport | `packages/chart-react/src/engine/viewport.ts`, `ChartCell.tsx`, `cellConfigSchema` |
| Screener review | `src/lib/screener/reviewSession.ts`, `screenerSession.ts` |
| Pattern library | `src/lib/patternLibrary/storage.ts`, `/api/pattern-library/*` |
| Catalog | `src/lib/marketData/state/catalog.ts` (`risk_settings`, new rows) |

---

## Related docs

- [ROADMAP.md](../ROADMAP.md) — product direction; near-term tracks index
- [roadmaps/README.md](./README.md) — feature-track status table
- [persistence/ARCHITECTURE.md](../../src/lib/persistence/ARCHITECTURE.md) — sync contracts
- [appWorkspace/ARCHITECTURE.md](../../src/lib/appWorkspace/ARCHITECTURE.md) — shell model
- [chart/features.md](../chart/features.md) — viewport / layout feature rows
- [data-state-hardening-roadmap.md](./data-state-hardening-roadmap.md) — `risk_settings` deferred Postgres
