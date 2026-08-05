# Trading Journal

IBKR-backed trading journal: durable fills, grouped round-trip trades, Flex CSV import, stats, and chart review links.

## Data flow

```
IB Gateway → tws-sidecar executions / summary / positions
         ↘
runBrokerageIngest (server) ← /api/brokerage/snapshot trigger + /api/cron/brokerage-ingest
         ↓
journal_fills + broker_ingest_cursors + account/position snapshots (Postgres)
         ↓
tradeGrouping → journal_trades + journal_trade_fills
         ↓
/journal UI (stats, table, notes, chart deep-link)

Legacy / fallback paths:
- Flex CSV or Flex API → import route → same journal tables
- `edge.journal.v1` localStorage mirrors server trades when Postgres is available; offline/503 uses local rebuild only
- JournalSyncProvider syncNow → triggers server ingest; `lastSyncedAt` (trades reload) only when ingest adds fills or Flex backfills; visibility-aware poll with exponential backoff on failure (`ingestPollSchedule.ts`)
```

## Ledger ingest (server)

Primary durable path for live fills. See [docs/roadmaps/broker-ledger-roadmap.md](../../../docs/roadmaps/broker-ledger-roadmap.md).

| Module | Role |
|--------|------|
| `src/lib/brokerage/ingest/runBrokerageIngest.ts` | Pull sidecar snapshot, upsert fills, update cursor, gap Flex backfill, reconcile |
| `src/lib/brokerage/ingest/resolveIngestAccountId.ts` | Prefer execution/position account over mis-pinned summary on ib-live |
| `src/lib/brokerage/ingest/ingestExecutions.ts` | Map executions → fill inputs; advance cursor; Flex gap keyed off lastExecTime |
| `src/lib/journal/reconcileJournalOpens.ts` | Compare journal open trades vs live IB positions using signed qty + conId-first matching (symbol fallback when journal lacks leg conId); per-leg spread contributions; `lookupLivePosition` / `resolveLiveUnrealizedPnL` share the same resolve rules |
| `src/lib/persistence/repositories/brokerIngestRepository.ts` | Postgres cursor + ingest status |
| `/api/cron/brokerage-ingest` | Cron or manual ingest (`EDGE_CRON_SECRET` header/Bearer or authenticated session cookie; anonymous requests **401**) |

## Modules

| Path | Role |
|------|------|
| `src/lib/journal/types.ts` | Domain types |
| `src/lib/journal/mapExecutionToFill.ts` | Broker execution → journal fill |
| `src/lib/journal/fillSync.ts` | Live sync helpers |
| `src/lib/journal/ingestPollSchedule.ts` | Client poll backoff + ledger-changed detection for JournalSyncProvider |
| `src/lib/journal/correlateOrderRef.ts` | `orderRef` → fill/trade lookup (`edge-intent-{intentId}`) |
| `src/lib/journal/tradeGrouping.ts` | STK FIFO, OPT conId, multi-leg spread grouping |
| `src/lib/journal/rebuildTrades.ts` | Idempotent regroup + note preservation |
| `src/lib/journal/flexImport/parseFlexCsv.ts` | IB Flex Trades CSV parser |
| `src/lib/journal/flexImport/flexWebService.ts` | Optional server Flex Web Service pull |
| `src/lib/journal/journalStats.ts` | Win rate, P&L, profit factor, filters, daily P&L, equity curve, intraday curve, day summary stats, breakdown reports, time breakdown, calendar builder |
| `src/lib/journal/rMultiple.ts` | Planned risk ($/%) and R-multiple math |
| `src/lib/journal/policyReplay/` | CLI-backed journal→policy replay (daily close paths, scoreboards) — `npm run journal:policy-replay` |
| `src/lib/journal/chartDeepLink.ts` | Chart deep-link with journalTrade + goto params |
| `src/lib/journal/journalExecutionMarkers.ts` | Entry/exit annotation markers from fills |
| `src/app/components/journal/JournalCalendar.tsx` | Mon–Fri month P&L grid with week column, heatmap intensity, month rollup, today/selected chrome; day click opens day summary modal |
| `src/app/components/journal/JournalDaySummaryModal.tsx` | TradeZella-style daily dashboard modal (intraday chart, stat grid, trades table) |
| `src/app/components/journal/JournalPnLAreaChart.tsx` | Reusable P&L area chart (equity curve + day modal) |
| `src/app/components/journal/JournalMetricGrid.tsx` | Reusable label/value metric grid |
| `src/app/components/journal/JournalDayTradesTable.tsx` | Day summary trades table |
| `src/app/components/journal/JournalEquityChart.tsx` | Daily cumulative P&L area chart (TradeZella-style axes, gradient fill, hover tooltip) |
| `src/app/components/journal/JournalSummaryCards.tsx` | Dashboard hero KPI cards — density-safe 3-row stack; account equity (live IB NetLiquidation) with filter-scoped net P&L on secondary row + direction flash on update; trade win %, profit factor, avg win/loss |
| `src/app/components/journal/JournalHistorySyncChip.tsx` | Compact chrome chip when journal open trades ≠ live IB positions (`History lagging` / `Catching up`); tooltip holds full sync explanation |
| `src/app/components/journal/useJournalHistoryOutOfSync.ts` | Hook wrapping `reconcileJournalOpensWithPositions` for sync chip |
| `src/app/components/journal/JournalTradeListCard.tsx` | Dashboard recent closed trades list card |
| `src/app/components/journal/JournalLivePositionsCard.tsx` | Dashboard open positions from live IB book — qty / symbol / unrealized PnL with flash (not fill-rebuild) |
| `src/app/components/journal/JournalBreakdownReport.tsx` | Setup/tag breakdown tables |
| `src/app/components/journal/JournalTimeReport.tsx` | Hour/weekday ET breakdown tables |
| `src/app/components/journal/JournalChartOverlayProvider.tsx` | Heavy journal overlay provider — fetches trades/fills + execution markers when URL has `journalTrade` (dynamic import from `ChartTileHost`) |
| `src/app/components/journal/journalChartOverlayContext.ts` | Light overlay context + `useJournalChartOverlay` (default empty markers — safe without provider) |
| `src/app/components/journal/useChartDeepLinkBootstrap.ts` | Thin URL bootstrap for symbol/interval/goto (no journal fetch on chart-only load) |
| `src/lib/journal/journalFilterHelpers.ts` | Scope bar helpers — period labels, active filter chips/count, default scope state |
| `src/app/components/journal/JournalScopeBar.tsx` | Compact header scope bar — period select, symbol search, filter drawer trigger, chips |
| `src/app/components/journal/JournalFilterDrawer.tsx` | Advanced filters slide-over (setup, tag, outcome, status on Trades, custom date range) |
| `src/lib/journal/localJournalStore.ts` | localStorage mirror when Postgres unavailable; mirrors server trade ids when online |
| `src/lib/persistence/repositories/journalRepository.ts` | Postgres CRUD |
| `src/app/api/me/journal/*` | REST routes |
| `src/app/components/journal/JournalModuleShell.tsx` | Journal layout: `AppModuleShell` (`AccountProvider`) → sync/trades providers → sub-nav |
| `src/app/components/journal/JournalSubNav.tsx` | Journal module sub-nav (Dashboard / Trades / Open Positions; settings via workspace cog or deep link) |
| `src/app/components/app-workspace/JournalTileChrome.tsx` | Workspace tile title button + Sync/Import/settings action cluster for the single-row module header |
| `src/app/components/journal/JournalModuleHeader.tsx` | Single-row chrome: **Journal** title → view tabs → scope/filters → tile actions |
| `src/app/components/journal/JournalViewTabs.tsx` | Underline Dashboard/Trades/Open Positions tabs in merged scope header (workspace tile only); stays visible while settings is open using remembered `listView` |
| `src/app/components/journal/JournalTradesProvider.tsx` | Shared trade list state for journal views (`loading`, `error`, `retryLoadTrades`, stale-while-revalidate refresh); **bounded load** — open + closed windows (`JOURNAL_PROVIDER_TRADE_LIMIT` 500) + compact fill-account index (not full fills) |
| `src/lib/journal/journalProviderConstants.ts` | `JOURNAL_PROVIDER_TRADE_LIMIT` (500) |
| `src/lib/journal/journalProviderLoad.ts` | Merge open/closed provider trades; collect `fillExecIds`; map compact account index |
| `src/lib/persistence/client/journalClient.ts` | `fetchJournalProviderTrades`, `fetchJournalFillAccountIndex` (POST `/api/me/journal/fills/account-index`) |
| `src/lib/journal/journalDataPhase.ts` | Page phase helper — `loading` \| `empty` \| `error` \| `ready` |
| `src/lib/journal/journalEmptyCopy.ts` | Shared empty-state copy (global, scoped, filtered, list cards) |
| `src/app/components/journal/JournalContentGate.tsx` | Page content gate — skeleton, global empty, error retry, or children |
| `src/app/components/journal/JournalPageLoadingSkeleton.tsx` | Dashboard/trades skeleton placeholders (`journal-page-loading`) |
| `src/app/components/journal/JournalGlobalEmptyState.tsx` | Global onboarding empty with Sync + Import icon CTAs (`journal-global-empty`) |
| `src/app/components/journal/JournalImportDialog.tsx` | Import icon → action-first modal (CSV drop zone hero, collapsed IB export help, busy/success/error states) |
| `src/app/components/journal/JournalDashboardView.tsx` | Dashboard reporting view |
| `src/app/components/journal/JournalTradesView.tsx` | Full trade list view (`variant="trades"`) and open-positions list (`variant="open"`) — both keep summary KPI cards above the table |
| `src/lib/journal/journalTradesTableControls.ts` | Trades table sort/paginate helpers, column metadata, column order/visibility prefs, result labels, localStorage prefs |
| `src/app/components/journal/JournalTradesTableControls.tsx` | Trades table toolbar — result count, columns popover (toggle + reorder + reset) |
| `src/app/components/journal/JournalTradesTable.tsx` | Virtualized trades table (`@tanstack/react-virtual`); sortable headers (click); column reorder (header hold-drag); configurable visibility/order |
| `src/app/components/journal/JournalTradeDetailModal.tsx` | Centered modal wrapper for trade review |
| `src/app/components/journal/JournalTradeDetail.tsx` | Trade review panel — primary Risk block (entry from fills + editable stop → derived 1R), outcome strip, review fields; execution details collapsed |
| `src/lib/journal/tradeRiskGeometry.ts` | Stop validation + `initialStop` → planned risk USD derivation |
| `src/app/components/journal/JournalTradeDetailHeaderTitle.tsx` | Clickable symbol in modal header → chart deep-link |
| `src/app/components/design-system/EdgeSlideOver.tsx` | Reusable right overlay detail panel |
| `src/lib/journal/journalTradeDisplay.ts` | Trade outcome status + day summary + dashboard list display helpers |
| `src/app/journal/{layout,dashboard,trades,open,settings}/` | Journal module routes |
| `src/app/components/journal/*` | UI + sync provider |
| `src/app/journal/page.tsx` | Redirect to `/journal/dashboard` |

## Provider tree

```
AppModuleShell (AccountProvider)
  └── JournalSyncProvider
        └── JournalTradesProvider
              └── journal views (filter by activeTradingAccountId via fills)
```

Journal providers must stay **inside** `AccountProvider` so `useAccountOptional()` receives the header account context.

### Provider retention (memory efficiency Phase 7)

`JournalTradesProvider` does **not** load the full fills ledger into React state. It loads:

1. **Trades:** parallel `status: "open"` + `status: "closed"` fetches with `limit: 500` each, merged by trade id.
2. **Account scoping:** compact `{ execId, account }[]` for the loaded trades’ `fillExecIds` only (`fetchJournalFillAccountIndex` → `filterTradesByAccount` with a `Map`).

Trade detail, import, and rebuild paths that need full fill bodies continue to use `fetchJournalFills` or scoped fetches outside the provider hot path. Dashboard KPIs operate over the loaded trade window (≤500 closed + all opens in window).

## Risk policy Measurement handoff (Risk track Phase 8)

Manage attach / fire / detach → `syncManagePlaybookToJournal` (`playbook/journalRecipe.ts`):

- Fill-if-empty `plannedRiskMode` / `plannedRiskValue` from `PositionPlan` via `journalRiskHandoff`
- Sync `managePlaybook` jsonb with geometry snapshot, protect summary, and rule timeline
- Manual override preserved — sync never overwrites non-null planned risk
- User-defined `initialStop` on `journal_trades` derives planned risk USD on patch (`tradeRiskGeometry.ts`)

UI: `JournalTradeDetail` Risk block is the primary stop editor; saving stop writes `initialStop` and derived planned risk. Risk policy / manage playbook details live under collapsed Execution details.

### Trades list virtualization (memory efficiency Phase 10)

`JournalTradesView` passes the full filtered/sorted trade list to `JournalTradesTable` (no page pagination). The table virtualizes rows with `@tanstack/react-virtual` inside a dedicated vertical scroll region (`min-h-0 flex-1`); only visible rows (+ overscan) mount in the DOM. Filter, sort, and column visibility/order prefs are unchanged. Toolbar shows total result count only.

## Trade grouping rules

1. **Stocks:** FIFO per `conId`; trade opens when net position leaves zero and closes when it returns to zero. Flex fills that omit `conId` are aliased onto the sole known STK `conId` for that symbol so live closes match Flex opens (ambiguous multi-conId symbols stay unaliased).
2. **Single-leg options:** Same as stocks, keyed by full option `conId`.
3. **Multi-leg spreads:** Fills sharing `orderId` within 2s (or shared `orderRef`) form one spread trade; close event matches a later cluster with the same key.
4. **P&L:** Prefer IB `realizedPNL` on fills; otherwise derive gross from entry/exit prices. Commissions are treated as cost magnitude (Flex signed-negative and live positive both work). `netPnL = gross - |commissions|`.

## Flex CSV import

Required columns (aliases supported): Execution ID (`IBExecID` / `ExecID`), Symbol, Buy/Sell, Quantity, TradePrice/Price, Trade Date/Time (`DateTime` or Flex CONF `Date/Time`).

Optional: Conid, Order ID (`IBOrderID` / `OrderID`), Order Ref (`OrderReference`), IB Commission / `Commission`, Realized P/L (`FifoPnlRealized`), Put/Call, Strike, Expiry, Sec Type (`AssetClass`), Account (`ClientAccountID`). Signed quantities (negative for sells) are normalized to absolute size.

**CONF query tip:** include `FifoPnlRealized` and `Conid` in the Flex query template — without them, P&L falls back to price math and options may group by symbol only.

Fixtures: `src/lib/journal/flexImport/fixtures/`.

Optional server pull env (`.env.local`, not committed):

- `IB_FLEX_TOKEN`
- `IB_FLEX_QUERY_ID`

Server Flex pull uses IB Flex Web Service v3 (`ndcdyn` Client Portal URL), parses XML `ReferenceCode`, and sends a `User-Agent`. Live ingest only (not paper).

## Trade screenshots

Attach one or more PNG/JPEG/WebP images per trade from the detail drawer.

| Piece | Path |
|-------|------|
| Validation | `screenshotValidation.ts` — MIME/size/count limits |
| Filesystem (server) | `screenshotStorage.ts` — `data/journal-screenshots/{userId}/{tradeId}/{id}.{ext}` |
| Metadata | `journal_trade_screenshots` table |
| Repository | `journalScreenshotRepository.ts` |
| API | `GET/POST /api/me/journal/trades/[id]/screenshots`; `GET/PATCH/DELETE .../[shotId]` |
| Client | `journalClient.ts` screenshot helpers |
| Offline fallback | `localScreenshotStore.ts` — IndexedDB `edge.journal.screenshots.v1` |
| UI | `JournalTradeScreenshots.tsx` in `JournalTradeDetail` — hero preview, upload, paste, windowed chart capture, lightbox; raw exec IDs under collapsed Tech details |

Limits: **10** images/trade, **5 MB**/image. **Capture chart** opens `/journal/capture` in a popup window seeded from the active workspace cell (cloned `CellConfig`, trade symbol forced). The capture studio saves PNG + chart fork via `captureTradeChartFork`; completion returns through `edge-journal-capture-v1` BroadcastChannel and refreshes the trade screenshot gallery. Seed handoff uses `sessionStorage` (`captureSeed.ts`); popup blocked surfaces an inline error.

Fill sync rebuilds (`rebuildJournalTrades`) delete/reinsert trade rows; screenshot and chart-fork metadata are snapshotted first and restored onto remapped trade ids (`preserveTradeAttachments.ts`) so attachments survive ingest rebuilds. Lightbox preview portals to `document.body` above the trade detail slide-over.

## Trade list source of truth

When Postgres is available, the journal UI loads trades from `GET /api/me/journal/trades` and mirrors those rows (including server UUIDs) into `edge.journal.v1`. Client-side regrouping still runs during fill sync, but the returned list always uses server ids so trade-scoped APIs (screenshots, chart forks, PATCH notes) resolve correctly.

Offline / 503: `fetchJournalTrades` falls back to locally rebuilt trades from mirrored fills. [`adoptServerJournalTrades.ts`](adoptServerJournalTrades.ts) rematches local-only review metadata and migrates IndexedDB screenshot/fork rows when local ids differ from server ids for the same fill set.

## Ignore from stats

Per-trade review flag for excluding verification or test round-trips from performance metrics without deleting IBKR fills.

| Piece | Behavior |
|-------|----------|
| Column | `journal_trades.ignored` boolean, default `false` (`0024_journal_trade_ignored.sql`) |
| Patch | `PATCH /api/me/journal/trades/[id]` with `{ ignored: true \| false }`; immediate toggle in `JournalTradeDetail` |
| Stats | `matchesJournalFilters` excludes `ignored === true` unless `filters.includeIgnored === true`; dashboard/reporting uses default exclude; trades list passes `includeIgnored: true` so rows stay visible with **Ignored** badge |
| Rebuild | `rebuildTrades` / `adoptServerJournalTrades` preserve `ignored` across fill regroup (same as tags/rating) |
| AI | `update_journal_trade_review` accepts `ignored` |

## Trade chart forks

Attach an editable, live-data chart fork to a journal trade — independent from the main workspace cell. Primary workflow: mark up a chart in Edge, then attach to an existing IBKR-synced trade (portal fills already in journal).

| Piece | Path |
|-------|------|
| Validation | `chartSnapshotValidation.ts` — JSON size/count limits (5/trade, 512 KB) |
| Metadata | `journal_trade_chart_snapshots` table (`cell_config`, `cell_config_original`, optional `plan_levels`, optional `screenshot_id`) |
| Repository | `journalChartSnapshotRepository.ts` |
| API | `GET/POST /api/me/journal/trades/[id]/chart-snapshots`; `GET/PATCH/DELETE .../[snapshotId]` |
| Client | `journalClient.ts` chart-snapshot helpers |
| Offline fallback | `localChartSnapshotStore.ts` — IndexedDB `edge.journal.chartSnapshots.v1` |
| Capture | `captureTradeChartFork.ts` — deep-clones `CellConfig`, optional screenshot upload, position plan levels |
| Windowed capture | `captureSeed.ts`, `captureChannel.ts`, `openJournalCaptureWindow.ts`, `JournalCaptureStudio.tsx` — popup markup studio at `/journal/capture` |
| Attach UX | `ChartSnapshotMenu` → **Attach to journal trade…** (`AttachJournalTradeModal.tsx`) |
| Review UX | `JournalTradeChartSnapshots.tsx` in trade detail — capture active chart, list/open/delete forks |
| Fork viewer | `TradeChartForkModal.tsx` — isolated `ChartCell` (`isActive={false}`), live feed, entry/exit markers, debounced save, reset-to-capture |

Fork edits persist only to the snapshot row. Entry/exit markers come from `buildJournalExecutionMarkers` (transient overlay, not baked into drawings).

## Dashboard scope bar + filter drawer

Header controls (`JournalScopeBar`):

- **Period** preset (`today` / `7d` / `30d` / `all`) or **Custom range** via drawer (`closedFrom` / `closedTo` overrides preset)
- **Symbol search** — live filter in header
- **Filters drawer** — setup, tag, outcome; **Status** on Trades view only; Apply/Clear draft pattern

Scoping rules (`journalStats.ts`):

- **Closed analytics** (KPIs, calendar, equity, recent trades, day summary): `scopeClosedTradesForReporting`
- **Live open positions** (dashboard card): `JournalLivePositionsCard` from IB account book via `AccountProvider` (paper SSE / live 15s poll); shows `unrealizedPNL` with `useValueFlash`
- **Open Positions tab**: `filterOpenJournalTrades` — journal open trades list; Net P&L column shows live unrealized via `resolveLiveUnrealizedPnL` (display-only; ignores period; status filter hidden)
- **Trades table**: `scopeTradesForTradesView` — open rows ignore period; closed rows respect period/custom range

## Loading and empty states

Data phases (`journalDataPhase.ts`) derive from `JournalTradesProvider`:

| Phase | Condition | UX |
|-------|-----------|-----|
| `loading` | `loading && allTrades.length === 0` | `JournalPageLoadingSkeleton` — header/scope bar stay interactive |
| `empty` | `!loading && allTrades.length === 0` | `JournalGlobalEmptyState` — Sync + Import icon CTAs |
| `error` | `error && allTrades.length === 0` | `JournalContentGate` error panel + Retry |
| `ready` | otherwise | Widgets render; scoped empty when filters/period exclude data |

Page gates: `JournalDashboardView` and `JournalTradesView` wrap main content in `JournalContentGate`. Widgets (`JournalEquityChart`, list cards, breakdown/time reports) show **scoped** empty only when parent is `ready`. Copy lives in `journalEmptyCopy.ts`.

Key test ids: `journal-page-loading`, `journal-global-empty`, `journal-content-error`, `journal-equity-empty`, `journal-trades-filtered-empty`.

## Verification

```bash
npm test -- --run src/lib/journal src/lib/persistence/schemas/journal src/app/api/me/journal src/app/components/journal src/app/journal
python3 -m unittest services/tws-sidecar/test_main.py
npm run build
```

App-level: `npm run dev:with-db` → import Flex CSV → calendar/breakdown/time reports visible → set R on trade → open chart with entry/exit markers → filters still scope reports.

## Roadmap (post-v1)

Tiers 1–3 journal reporting (calendar, tag/setup breakdown, equity curve, time analysis, chart execution overlay, R-multiple, trade rating, compare reports, STK MFE/MFA) are **Passing** — see [docs/roadmaps/journal-roadmap.md](../../../docs/roadmaps/journal-roadmap.md).

**Tier 3 review metadata:** `rating` (1–5), `mfeUsd`/`mfaUsd` with optional `excursionInterval` — patch via `PATCH /api/me/journal/trades/[id]`; preserved across trade rebuild via `rebuildTrades` + `adoptServerJournalTrades`. MFE/MFA computed on demand in trade detail via `tradeExcursion.ts` + `/api/candles` (STK closed trades only in v1).

**Dashboard reports:** `JournalBreakdownReport` (setup/tag/rating), `JournalCompareReport` (preset slices), `JournalTimeReport` (hour/weekday ET) — scoped to `scopeClosedTradesForReporting`.

Ingest poll hygiene (hidden-tab skip, exponential backoff, no-op reload avoidance) ships in `JournalSyncProvider` + `ingestPollSchedule.ts` (data-serving-efficiency Phase 2). Home remote workspace merge uses `resolveHomeWorkspaceTabs` — see [docs/roadmaps/data-serving-efficiency-roadmap.md](../../../docs/roadmaps/data-serving-efficiency-roadmap.md).

Unscheduled deferrals (not on that roadmap):

- Assignment/exercise-specific events
- Sidebar journal panel (home hub panel shipped)

## AI journal tools

Registry tools in `src/lib/ai/tools/journal.ts` expose journal analytics and chart open via `JournalPort` → `journalClient` → `/api/me/journal/*`, plus pure helpers from `journalStats.ts` / `chartDeepLink.ts` (no new REST APIs). All require a live browser session (`requiresClientSession: true`); MCP uses the session bridge when `EDGE_APP_URL` is set.

| Tool | Permission | Notes |
|------|------------|-------|
| `list_journal_trades` | read | Compact summaries; API list filters |
| `get_journal_trade` | read | Full trade + review fields |
| `get_journal_stats` | read | `computeJournalStats` on filtered trades |
| `update_journal_trade_review` | write | setup, tags, reviewNote, rating, planned risk, ignored-from-stats |
| `get_journal_breakdown` | read | `computeBreakdownReport` (setup/tag/rating) on `scopeClosedTradesForReporting` |
| `get_journal_time_report` | read | `computeTimeBreakdownReport` (hour/weekday, America/New_York) |
| `get_journal_equity_curve` | read | `computeEquityCurve` on scoped closed trades |
| `get_journal_daily_pnl` | read | `computeDailyPnL` on scoped closed trades |
| `compare_journal_slices` | read | presets or custom slices via `buildComparePresetSlices` + `computeCompareReport` |
| `open_journal_trade_on_chart` | write | `chartDeepLink` + load symbol/interval + `goTo` open time |

Shared helper `loadFilteredTrades` / `loadScopedClosedTrades` avoids duplicated list+filter wiring across stats and analytics tools.
