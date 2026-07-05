# Stock Screener Roadmap

Single roadmap for the Edge stock screener: filter the full US-listed universe (equities + ETFs) by technical, fundamental, and descriptive criteria, then load results into the chart or watchlists.

**Last updated:** 2026-07-05

A solo-trader tool for two workflows:

1. **Find tickers to load into the chart.** Filter the universe, click a row, see it on the active chart cell.
2. **Build watchlists.** Add a single ticker or a full result group to an existing watchlist or a new one.

The screener is **not** an alerting engine, a backtester, or a multi-asset scanner. It is a fast, composable filter surface that feeds the existing chart and watchlist workflows.

## Requirements Summary

| Area | Requirement |
|------|-------------|
| User | Solo retail trader (single user) |
| Universe | US equities + ETFs, full US-listed (~8k symbols) |
| Providers | Provider-agnostic; primary FMP, fallback Yahoo / IBKR / TWS per category |
| Freshness | Real-time preferred; delayed / EOD acceptable for fundamentals |
| Filter categories | Technical (incl. custom indicators), Fundamental, Descriptive |
| Filter UX | Both fixed presets and a composable query-builder (AND/OR rule stacking) |
| Output | Configurable-column table with leading-rule default sort, cog column picker, per-saved-screen sort persistence, indicator columns for technical screens; sort, filter-in-results, pagination, export |
| Per-row actions | Load ticker into chart; add ticker to watchlist |
| Group actions | Add full result set to existing watchlist; create new watchlist from result set |
| Surface | Sidebar rail (`screener` panel in `sidebar/registry.tsx`); optional **Pop out** to floating window via `FloatingPanelHost` / `useFloatingPanel`; legacy header modal via thin `ScreenerDialog` wrapper |
| Saved screens | Named, persistent, reusable (localStorage + optional Postgres) |

## Architecture Decisions

### Provider strategy — tiered, provider-agnostic

Follows the same fallback-chain pattern as `MarketDataService`. The screener service routes each filter category to the most efficient provider.

| Filter category | Primary | Fallback | Notes |
|---|---|---|---|
| **Descriptive** (sector, industry, exchange, market cap, country, ETF flag) | FMP `/stock-screener` | Yahoo | FMP exposes a server-side screener endpoint — one HTTP call returns a filtered universe. Avoids fetching 8k profiles client-side. |
| **Fundamental** (P/E, EPS, margins, growth, ratios, ratings, dividend yield, beta) | FMP `getFinancialsBundle` + `/key-metrics` + `/ratios` | Yahoo summary | Reuse the existing `createFmpProvider` bundle shape (`src/lib/marketData/providers/fmp/adapter.ts`). |
| **Technical** (price, SMA/EMA, RSI, ATR, 52-wk distance, gap %, volume) | FMP `/stock-screener` server-side + Yahoo historical + Edge indicator math | FMP `/technical-indicator` endpoint | Custom indicators reuse the existing `IndicatorPlugin` DSL in `packages/chart-core` and `src/lib/chart` so "custom indicator" rule means "same indicator contract as the chart." |
| **Real-time price/volume on result rows** | TWS / IBKR `HotStore` | Yahoo quote | Stream only for visible rows (pagination) to respect rate limits. |

### Latency strategy — hybrid with caching

- **Server-side filtering on FMP** for descriptive + most fundamentals → ~200–800ms per query.
- **Client-side ranking/sorting** on returned rows → instant.
- **Cache result sets** in the existing `dataCache` (`src/lib/marketData/cache/dataCache.ts`) with category-aware TTL:
  - Live price/volume: 60s
  - Fundamentals: 15min (intraday) / end-of-day after close
  - Descriptive universe: 24h
- **Stream real-time prices** for the visible page of results via `HotStore` subscriptions (same pattern as the watchlist quote stream).
- **Precompute a daily snapshot** of fundamentals once per trading day so re-running a saved screen during market hours only re-fetches price/volume.

Target: first paint < 1s for cached screens, < 3s for fresh complex queries. Sufficient for solo use without a heavy infra investment.

### Persistence — extend existing patterns

- **Saved screens** → new Drizzle schema `screen_definitions` mirroring the `watchlistLibrary` schema pattern (`src/lib/persistence/schemas/watchlistLibrary.ts`):
  - `id`, `name`, `description`, `filters` (JSON), `columns` (JSON), `createdAt`, `updatedAt`
- **Result snapshots** (optional Phase 2) → `screen_runs` table: `screenId`, `runAt`, `resultCount`, `snapshot` (JSON). Lets reopening a saved screen paint previous results immediately while refreshing in the background.
- **localStorage fallback** for screen definitions (no DB required) — mirrors `layoutStorage.ts` so the screener works without Postgres.
- **Remote sync** via the existing persistence sync layer so screens roam across devices when DB is enabled.

### Auth — follow existing dev-auth gate

- Behind the same dev-auth gate as other persistence and AI tools (per `AGENTS.md`).
- Read-only screen execution usable without auth; saved-screen mutation requires auth when persistence is enabled, falls back to localStorage otherwise.

## UI Surface

- **Entry point:** `screener` icon in `SidebarRail.tsx` (main group between options and object-tree). Opens the docked sidebar panel; **Pop out** in the panel header moves it to a floating window (`FloatingPanelShell` + `FloatingPanelHost`). Presentation state persists in `layout.sidebar.presentation` / `floatingGeometry`.
- **Shared body:** `ScreenerPanelContent.tsx` renders query builder, saved screens, and results for `variant="sidebar" | "floating" | "modal"`. `ScreenerSessionProvider` holds ephemeral session state (last run, UI collapse) separate from persisted `ScreenerState`.
- **Legacy modal:** `ScreenerDialog.tsx` is a thin wrapper around `ScreenerPanelContent` (`variant="modal"`) for tests and any header-triggered flows; primary surface is sidebar/floating.
- **Layout:**
  - **Left rail:** saved screens list, presets.
  - **Custom query panel:** `Run screen` primary button top-right with `⌘↵` shortcut; collapsible rule rows with expand-all/collapse-all inside a bounded scroll region (`max-h-[40vh]`).
  - **Header row:** save-name input + Save button (sidebar/floating panel header; modal variant uses `EdgeModalShell` `headerActions` when opened).
  - **Footer row:** limit control (1–1000).
  - **Body:** results table.
- **Styling:** Edge design tokens and primitives per `src/lib/design-system/ARCHITECTURE.md`.

## Roadmap Phases

### Phase 1 — MVP (Lean): FMP-native screener modal with presets + saved screens

**Status:** Shipped in code — FMP `/company-screener` filters, mover presets, query-builder, results table, localStorage saved screens, header-bar entry.

**Outcome:** A usable screener that filters the US universe and feeds the chart and current watchlist.

Scope (implemented):

1. **Backend: FMP screener route** — `/api/screener/run` POST with `screenQuerySchema`; `MarketDataService.getScreenerResults()`; FMP `/company-screener` via `runStockScreener()`. Empty rows + warning when FMP is not configured.
2. **Filter model** — descriptive + range rules supported server-side: sector, industry, country, exchange, ETF flag, market cap, price, beta, volume, dividend. Flat AND combinator via query-builder rules.
3. **Presets** — gainers / losers / most actives (movers API); large-cap dividend payers; high-beta momentum; small-cap under $5.
4. **Query-builder UI** — flat rule stacker with add/remove; limit control (1–1000).
5. **Results table** — default columns (symbol, name, price, change %, volume, sector, market cap, beta); sortable; paginated 50/page.
6. **Per-row actions** — load into chart; add to current watchlist.
7. **Saved screens (localStorage)** — save / load / delete named screens in `tv-ai:screener:v1`.
8. **Sidebar entry** — `screener` panel in `sidebar/registry.tsx` + shared `ScreenerPanelContent`; optional floating pop-out via `FloatingPanelHost`.

**Deferred from original Phase 1 scope (see Phase 1.5):**
- RSI, SMA50/200, 52-week proximity, golden cross presets (require per-symbol technical fetches).
- P/E, EPS, revenue growth, margin filters (not exposed on FMP `/company-screener` in one call).

**Out of scope for Phase 1:**
- Custom-indicator rules (chart DSL reuse).
- Group actions (add all results / create new watchlist from results).
- Live price streaming on visible rows.
- CSV / clipboard export.
- AND/OR group nesting.
- Postgres persistence (localStorage only in Phase 1).
- Scheduled re-runs and alerts.

### Phase 1.5 — Technical presets via 2-step pipeline

**Status:** Shipped in code — FMP prefilter + Yahoo daily candles + `@edge/chart-core/indicators/math` technical pass; four presets (RSI oversold/overbought, golden cross, near 52-week high); two-phase progress UI; per-symbol `screener_technical` cache (15 min TTL).

**Outcome:** RSI, SMA cross, 52-week distance, and golden-cross presets work without abandoning FMP prefilter efficiency.

Scope (implemented):

1. **Step 1:** FMP `/company-screener` prefilter (same as Phase 1).
2. **Step 2:** For candidate symbols (max 200, concurrency 6), fetch Yahoo daily candles via `MarketDataService.getCandles()` and evaluate rules with `@edge/chart-core/indicators/math`; cache keyed by `symbol + interval + indicator fingerprint` in namespace `screener_technical`.
3. **Presets:** RSI oversold (≤30), RSI overbought (≥70), golden cross (SMA50 > SMA200), near 52-week high (≤5%).
4. **UI:** Preset rail entries added; loading label and post-run phase summary driven by `meta.phases`.

**Deferred from Phase 1.5 scope (see Phase 2 / technical rule builder v1):**
- ~~Composable technical rules in query-builder (presets only in 1.5).~~ **Shipped (v1):** registry-driven technical rule editor in `QueryBuilder`; `validateIndicatorRule` semantic gate; one `indicator` rule per screen; named kinds read-only in UI.
- P/E, EPS, revenue growth, margin filters (still not on FMP `/company-screener` in one call).

### Phase 2 — Composition, persistence, and live results

**Status:** Shipped in code — Postgres `user_screener_library` sync (localStorage fallback), group watchlist actions, live quote overlay on visible rows via `MarketDataProvider` SSE coalescing, AND/OR query-builder groups, CSV + clipboard export. `screen_runs` snapshots deferred to Phase 3.

**Outcome:** Saved screens roam across devices; results stay live during market hours; full table and watchlist composition actions.

Scope:

1. **Postgres persistence for saved screens** — `screen_definitions` schema + repository + sync via existing persistence layer. localStorage remains the fallback.
2. **Group actions** — "Add all results to existing watchlist" and "Create new watchlist from results" using the existing `watchlistLibrary` API.
3. **Live price streaming** on visible result rows via `HotStore` subscriptions and the existing quote SSE transport (`/api/stream/quotes`).
4. **Result snapshots** — `screen_runs` table; reopening a saved screen paints the last run immediately and refreshes in the background.
5. **AND/OR group nesting** — query-builder supports nested rule groups, not just a flat AND stack.
6. **Export** — CSV download and "copy symbols to clipboard" for the result set or selection.
7. **Result snapshots in `PROJECT-STATUS.md`** — screener row added to Active Work when Phase 2 starts.

### Phase 3 — Custom indicators and analytics

**Status:** Shipped in code — `kind: "indicator"` technical rules via chart-core `IndicatorPlugin` (presets: MACD bullish, BOLL %B overbought, RSI via plugin); candle-fingerprint `screener_technical` cache; `meta.indicatorValues` sidecar; multi-select comparison table; read-only `summarize_screen` AI tool. Scheduled re-runs + alerts deferred until alerts infra in `ROADMAP.md` Phase 4/5.

**Outcome:** Screener rules can reference the same indicator DSL as the chart, and results feed deeper analysis.

Scope:

1. **Custom-indicator rules** — reuse the `IndicatorPlugin` contract from `packages/chart-core` so any indicator shipped to the chart can be used as a screener rule (e.g., "MACD histogram > 0," "BOLL %B > 0.8").
   - Computed locally on Yahoo historical pulls for visible result candidates (post FMP prefilter).
   - Caching keyed by `symbol + interval + indicator fingerprint`, mirroring the chart indicator cache.
2. **Multi-symbol comparison** from a result set — table or radar view comparing selected tickers across chosen metrics.
3. **AI tool integration** — `summarize_screen` tool in `src/lib/ai/tools/` that produces a thesis summary for a saved screen's result set, routed through the existing tool registry.
4. **Scheduled re-runs + alerts** — opt-in scheduled re-run of saved screens with notification when new symbols match. Deferred until semantic annotations and alerts infrastructure from `ROADMAP.md` Phase 4 / Phase 5 is in place.

### Phase 4 — Massive full-universe technical scan

**Status:** Shipped in code — when `MASSIVE_API_KEY` (or `POLYGON_API_KEY`) is configured, technical screens use Massive Daily Market Summary grouped daily bars (rolling ~252 trading days, cache namespace `universe_daily`, 24h TTL) plus FMP paginated descriptors (~8k, namespace `screener_universe`) for local descriptive filtering and `@edge/chart-core` indicator evaluation. Removes the 200-candidate cap; target cold ~1–2s after daily warm-up, ~0ms warm (60s screener query cache).

**Outcome:** Full US universe technical scans without per-symbol TWS/Yahoo candle fetches; cross-preset universe reuse is free after warm-up.

Scope (implemented):

1. **Massive provider** — `src/lib/marketData/providers/massive/` (`getDailyMarketSummary`, `getAggregates`, `getSnapshotAllTickers`; grouped daily `adjusted=true`).
2. **Universe daily store** — `src/lib/marketData/screenerUniverse/universeDailyStore.ts` (lazy warm on first screen, background backfill capped by `MASSIVE_UNIVERSE_MAX_WARM_CALLS`).
3. **Service routing** — `MarketDataService.getScreenerResults()` Massive path when `technical` + Massive configured; FMP fallback path preserved.
4. **Perf layers** — universe-backed scan concurrency 16; optional `maxResults` early-exit; per-symbol fallback range tailoring via `rangeForTechnicalRule`; Massive Custom Bars fallback concurrency 20.

**Baseline before optimization:** [docs/perf/screener-baseline-latest.json](./perf/screener-baseline-latest.json) (cold ~29–51s, 200 candidates, 0% cache hit). Re-run `npm run perf:market-data` with `MASSIVE_API_KEY` for after snapshot.

## Explicit Deferrals

Intentionally not in scope:

- Cross-asset scanning (options, crypto, futures, international).
- Real-time tick-level scanning — refresh cadence stays at the result-page level.
- Backtesting screener rules over historical windows.
- Public / community screen sharing.
- Alerts before the broader alerts infrastructure in `ROADMAP.md` is shipped.

## Touch Points (when implementation begins)

| Layer | Files / modules |
|---|---|
| Backend route | `src/app/api/screener/run/route.ts` (new), `src/app/api/screener/presets/route.ts` (new) |
| Domain logic | `src/lib/screener/` (new): `querySchema.ts`, `fmpScreenerAdapter.ts`, `presets.ts`, `normalizeResults.ts` |
| Storage | `src/lib/screener/screenStorage.ts` (localStorage, Phase 1), `src/lib/persistence/schemas/screenDefinitions.ts` (Phase 2) |
| UI | `src/app/components/screener/` — `ScreenerPanelContent.tsx`, `ScreenerProvider.tsx`, `QueryBuilder.tsx`, `ResultsTable.tsx`; `ScreenerDialog.tsx` (modal wrapper) |
| Sidebar entry | `src/app/components/sidebar/registry.tsx`, `panels/ScreenerSidebarPanel.tsx`, `FloatingPanelHost.tsx` |
| Design system | `EdgeModalShell`, `EdgeButton`, `EdgeSearchInput` per `src/lib/design-system/ARCHITECTURE.md` |
| Provider reuse | `src/lib/marketData/providers/fmp/adapter.ts` (`getMarketMovers`, `getFinancialsBundle`, `getCompanyProfile`) |
| Cache reuse | `src/lib/marketData/cache/dataCache.ts`, `src/lib/marketData/hotStore.ts` |
| Watchlist reuse | `src/lib/watchlist/`, `src/lib/persistence/repositories/watchlistLibraryRepository.ts` |

## Verification Plan

Per `docs/checklists/testing-verification-checklist.md`, layered by phase:

- **Phase 1 focused:** Zod schema tests for `ScreenQuery`, FMP adapter translation tests, preset resolution tests, `screenStorage` round-trip tests, query-builder component tests, results-table rendering and per-row action tests.
- **Phase 1 build:** `npm run build:packages` plus `npm run build` since the new API route and modal touch shared app wiring.
- **Phase 1 app-level:** live `localhost:3003` walkthrough — preset runs, custom query, save/load a screen, load a result row into the chart, add a row to the current watchlist.
- **Phase 2 focused:** persistence repository tests, sync tests, group-action tests, streaming subscription tests, AND/OR group nesting tests, export tests.
- **Phase 3 focused:** custom-indicator rule evaluation tests (reusing chart indicator test fixtures), `summarize_screen` tool registry tests, scheduled re-run tests.
- **Full readiness gate:** `npm run check` before each phase is marked `Passing` in `docs/PROJECT-STATUS.md`.

## Harness Update (when implementation begins)

When Phase 1 implementation starts, add to `docs/PROJECT-STATUS.md`:

- **Active Work row:** Stock screener MVP — FMP-backed screener modal with presets + saved screens (localStorage).
- **State:** Active — in progress.
- **Completion evidence:** focused screener tests passing, build passing, app-level walkthrough recorded.
- **Task Contract:** long-running cross-component work (API + storage + UI + header wiring) → write a Task Contract before editing code.

Until implementation starts, this document is the canonical source for screener scope and phasing.

## Source Docs

- [Roadmap](./ROADMAP.md) — overall Edge roadmap; screener entry lives under Phase 2 market-data work.
- [Project Status](./PROJECT-STATUS.md) — current verified state and active work.
- [Market Data Architecture](../src/lib/marketData/ARCHITECTURE.md) — provider-neutral data layer the screener builds on.
- [Persistence Architecture](../src/lib/persistence/ARCHITECTURE.md) — schema and repository patterns to mirror for `screen_definitions`.
- [Design System Architecture](../src/lib/design-system/ARCHITECTURE.md) — Edge tokens and primitives for the modal and table chrome.
