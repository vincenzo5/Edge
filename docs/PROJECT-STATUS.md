# Project Status

Single source for **current** progress. Historical harness dumps: [status-archive/](./status-archive/). For row-by-row feature detail, see [chart/features.md](./chart/features.md).

**Last updated:** 2026-07-12

## Current Verified State

- **Current task:** Heat map data hardening.
- **State:** **Passing** — Movers enriched via universe descriptors; screener `changePercent` mapping fixed; heat-map quote cap 200; partial size-metric banner.
- **Latest verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 31 passed (31)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review — Passed; app-level Gainers/Large-cap heat map walkthrough deferred.
- **Evidence:** `enrichMoversWithDescriptors.ts`, `marketDataService.ts`, `mappers.ts`, `apiScreenerFeed.ts`, `screenerHeatMapAdapter.ts`, `ResultsTable.tsx`, `useScreenerSessionModel.ts`.
- **Current blocker:** none.
- **Next best step:** App-level — Gainers heat map Size=market cap + Group=sector; Large-cap Color=change % across full result set.

## Previous Verified State (Dual connection Phase D)

- **Current task:** Screener layout + right-panel UX.
- **State:** **Passing** — screener-only wide dock (panel-aware max + Expand/Collapse); never-run vs no-match empty states; edit/scan filter modes with chip summary; narrow horizontal preset chips; Limit beside Run.
- **Latest verification:** **Focused:** `Test Files 20 passed (20)`, `Tests 105 passed (105)` (`sidebarWidth`, sidebar shell, screener); **Build:** `npm run build` passed; **Architecture review:** self-review — Passed.
- **Evidence:** `src/lib/responsive/{sidebarWidth,layoutConstants}.ts`, `src/app/components/sidebar/{SidebarPanelWidthContext,PanelChromeActions,RightSidebar}.tsx`, `src/app/components/StockApp.tsx`, `src/app/components/screener/{ScreenerPanelContent,ResultsTable,FilterChipSummary}.tsx`, `src/lib/screener/{screenerSession,useScreenerSessionModel,compileQuery}.ts`, `docs/screener-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by right panel overlay layout row.

## Previous Verified State (Dual connection Phase C)

- **Current task:** Dual connection — Phase C data preference split.
- **State:** **Passing** — chart/quote IB connection decoupled from order account via `edge:marketData:connectionId`; header data chip; pre-trade quotes follow order env.
- **Latest verification:** **Focused:** Sidecar `Ran 35 tests OK`; App `Test Files 4 passed (4)`, `Tests 71 passed (71)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 4.2s`); **Architecture review:** self-review — Passed.
- **Evidence:** `services/tws-sidecar/main.py`, `dataConnectionPreference.ts`, `useDataConnectionPreference.ts`, `MarketDataProvider.tsx`, `AppTopHeader.tsx`, `tradingService.ts`, `marketDataService.ts`, `src/lib/marketData/ARCHITECTURE.md`, `src/lib/trading/ARCHITECTURE.md`, `docs/dual-connection-roadmap.md`.
- **Current blocker:** App-level Phase C proof needs both Gateways up (`services/ib-gateway/.env` + 2FA).
- **Next best step:** Phase D abstraction hardening — or app-level walkthrough: live data chip while paper order account selected.

## Previous Verified State (Position 1R yard lines)

- **Current task:** Position 1R yard lines.
- **State:** **Passing** — long/short position drawings show always-on left-edge 1R ticks with in-box `NR` labels in the profit zone.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)`; **Build:** `npm run build:packages` passed; **Architecture review:** self-review — Passed.
- **Evidence:** `packages/chart-core/src/drawings/{positionGeometry,position_tool}.ts`, `positionGeometry.test.ts`, `docs/chart/features.md`, `src/lib/chart/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level walkthrough on `/chart` — draw long + short with ≥2R target; confirm left ticks + in-box `1R`/`2R` update on resize.

## Startup Readiness

Fresh agent or developer sessions should initialize before feature work. See [AGENTS.md](../AGENTS.md) for constraints and topic docs.

| Step | Command |
|------|---------|
| Install dependencies | `npm run setup` |
| Start dev server | `npm run dev` → http://localhost:3003 |
| Fast startup verification | `npm run check:startup` |
| Full verification | `npm run check` |
| One-shot init script | `scripts/init.sh` (add `--full` for full check) |

Optional persistence: copy `.env.example` → `.env.local`, then `npm run db:up` and `npm run db:migrate`.

### Fresh-Session Acceptance Checklist

- [ ] `npm run setup` succeeds from a clean clone
- [ ] `npm run check:startup` passes (harness + active-area smoke tests)
- [ ] Active work and next priorities are visible below without verbal context
- [ ] Area-specific tests pass for the task being picked up

## Shipped Foundations

| Area | Status | Notes |
|------|--------|-------|
| Chart engine (V1) | **Done** | Custom Canvas 2D; pan/zoom/pinch, 5 chart types, crosshair sync |
| Indicators | **Done** | 15 implemented (MA, EMA, BOLL, MACD, RSI, VOL, VWAP, ATR, KDJ, CCI, OBV, DMI, WR, ROC, Supertrend); 15 catalog entries disabled |
| Drawings | **Done** | 14 tools (incl. ruler + measure utilities), typed styles, undo/redo, multi-pane routing |
| Context menus | **Done** | Blank + drawing + price-axis menus; ⌥R reset, crosshair lock toggle, bulk remove — see [context-menu-reference.md](./context-menu-reference.md) |
| Layout persistence | **Done** | localStorage + optional Postgres workspace sync |
| AI tool registry | **Done** | Shared registry; HTTP + MCP + in-app adapters |
| Watchlists / templates | **Done** | localStorage + optional remote sync |
| Rich annotation metadata | **Done** | Phase A — thesis/invalidation/target kinds on drawings |
| Market data foundation | **Done** | Provider-neutral layer in `src/lib/marketData/`; Yahoo + SEC/FRED/FMP/Tradier/IBKR adapters; registry-driven event system with chart pins |

## Harness Retention

`PROJECT-STATUS.md` is the **hot operational dashboard**, not the full ledger. Full history lives in [status-archive/](./status-archive/).

| Content | Hot retention | Archive when |
|---------|---------------|--------------|
| Current Verified State | 1 block only | Replace in place on task change; do **not** stack `## Previous Verified State` |
| Active Work | Active/Pending/Blocked + last ≤10 Passing | Older Passing rows → `status-archive/` |
| Task Contract | Incomplete / in-flight only | Complete → archive |
| Session Log | Last ~15 entries | Older entries → monthly archive file |

Prune when this file exceeds ~300 lines, on session exit after marking Passing, or weekly.

## Active Work

Use states: **Pending**, **Active**, **Blocked**, **Passing**. Keep only one item **Active** at a time.
Use verification levels: **Focused** (targeted Vitest), **Build** (`npm run build`), **App-level** (dev server or browser/manual flow), **Full** (`npm run check`).

| Feature | Behavior | State | Completion evidence / latest result | Files |
|---------|----------|-------|-------------------------------------|-------|
| Heat map data hardening | Movers join universe descriptors for marketCap/sector/volume/beta; screener changePercent alias+derive; heat-map quote cap 200; partial size-metric banner | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 31 passed (31)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review Passed; app-level Gainers/Large-cap walkthrough deferred | `enrichMoversWithDescriptors.ts`, `marketDataService.ts`, `mappers.ts`, `apiScreenerFeed.ts`, `screenerHeatMapAdapter.ts`, `ResultsTable.tsx`, `useScreenerSessionModel.ts`, `ARCHITECTURE.md` |
| Heat map live config updates | Size / Color / Group toolbar changes re-layout and recolor immediately (adapter remaps metrics; view re-squarifies) | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 21 passed (21)` (`HeatMapView`, `ResultsTable`, `screenerHeatMapAdapter`); **App-level:** large-cap heat map sizeChanged/groupChanged/colorChanged true in browser | `HeatMapView.test.tsx`, `ResultsTable.test.tsx`, `screenerHeatMapAdapter.test.ts`, `src/lib/heatmap/ARCHITECTURE.md` |
| Screener scroll containment + heat map size contrast | Presets rail stays fixed while list/heat map scrolls; default size scale linear; Scale Linear/Log in heat map toolbar | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 41 passed (41)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **Architecture review:** self-review Passed; app-level scroll/size walkthrough deferred | `src/app/components/sidebar/SidebarPanelShell.tsx`, `src/app/components/screener/{ScreenerPanelContent,ResultsTable}.tsx`, `src/lib/heatmap/{defaults,squarify}.ts`, `src/app/components/heatmap/HeatMapToolbar.tsx`, `docs/screener-roadmap.md` |
| Screener heat map (reusable treemap foundation) | After a screen run, toggle List / Heat map; configure size, color, group; click cell loads chart; full result set treemap with live quotes on top 64 by size | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 27 passed (27)`; **ScreenerDialog:** `Test Files 1 passed (1)`, `Tests 14 passed (14)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.9s`); **Architecture review:** self-review Passed; app-level heat map walkthrough deferred | `src/lib/heatmap/`, `src/app/components/heatmap/`, `src/lib/screener/{screenerSession,screenerHeatMapAdapter,useScreenerSessionModel}.ts`, `src/app/components/screener/{ResultsTable,ScreenerPanelContent}.tsx`, `docs/screener-roadmap.md` |
| Dual connection — Phase D abstraction + Data Health split | TWS-only preference docs/tests; chart loadQuotes connectionId; sidecar `/status` connections map; Data Health Connections section (paper, live, preference); trust blocks display-only submit | **Passing** | **Focused:** Sidecar `Ran 36 tests OK`; App `Test Files 12 passed (12)`, `Tests 141 passed (141)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.7s`); **App-level:** Data Health Connections paper+live connected; data chip Live while account paper; quotes `ib-live` → `tws`; **Architecture review:** self-review Passed | `services/tws-sidecar/main.py`, `src/lib/marketData/health.ts`, `src/app/components/data-health/`, `docs/dual-connection-roadmap.md` |
| Right panel overlay layout | Docked right panel overlays chart from the right without changing chart width; resizable via left-edge handle; no dimmed backdrop; Escape + rail close; screener Expand/Pop out on overlay | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Architecture review:** self-review Passed; app-level overlay resize walkthrough deferred | `src/lib/responsive/responsiveLayout.ts`, `src/app/components/StockApp.tsx`, `src/app/components/sidebar/SidebarPanelShell.tsx`, `src/lib/design-system/ARCHITECTURE.md` |
| Screener layout + right-panel UX | Screener docked panel uses panel-aware max width + Expand/Collapse; never-run vs no-match results; edit/scan filter modes with chip summary; narrow horizontal preset chips; Limit beside Run | **Passing** | **Focused:** `Test Files 20 passed (20)`, `Tests 105 passed (105)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed; app-level docked expand/scan walkthrough deferred | `src/lib/responsive/sidebarWidth.ts`, `src/app/components/sidebar/SidebarPanelWidthContext.tsx`, `src/app/components/StockApp.tsx`, `src/app/components/screener/{ScreenerPanelContent,ResultsTable,FilterChipSummary}.tsx`, `src/lib/screener/screenerSession.ts`, `docs/screener-roadmap.md` |
| TWS recovery supervisor | Recover IB Gateway/sidecar without stuck UI; quote SSE + warmup fail fast when sidecar stale/unhealthy; watchlist REST fallback; stale sidecar/version + port guidance | **Pending** | **Focused:** 55 tests passed; **Startup:** `npm run check:startup` passed (26 tests); **Build:** `npm run build` passed; **App-level:** candles 0.137s/yahoo, quotes 0.092s/yahoo, warmup 0.094s/90ms total (skipped tws.warmup), stream snapshot via Yahoo poll within 8s; recovery walkthrough pending sidecar restart | `src/lib/marketData/service/marketDataService.ts`, `src/lib/marketData/stream/`, `src/app/components/MarketDataProvider.tsx`, `services/tws-sidecar/main.py`, `scripts/tws-sidecar.sh`, `src/lib/marketData/providers/tws/`, `src/app/api/market-data/tws/recover/`, `src/lib/marketData/health.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| TWS sidecar in-app recovery | Sidecar control plane stays non-blocking; worker/reconnect diagnostics; bounded reconnect; late-success finalization; Data Health phase progress during recovery | **Pending** | Superseded by TWS recovery supervisor row; prior focused evidence retained | `services/tws-sidecar/main.py`, `src/lib/marketData/providers/tws/{recover.ts,recoverySession.ts,finalizeTwsRecovery.ts,client.ts}`, `src/app/api/market-data/tws/recover/{route.ts,status/route.ts}`, `src/lib/marketData/service/marketDataService.ts`, `src/app/components/data-health/DataHealthProvider.tsx`, `src/lib/marketData/health.ts`, `src/lib/marketData/stream/twsQuoteStreamSession.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| TWS extended-hours price alignment | Chart current-price marker aligns with watchlist live quote; TWS candles opt into extended hours via `sessionMode`; chart labels pre/regular/post-market state | **Pending** | **Focused:** 36 tests passed; telemetry fix: 9 tests passed (`collector`, `MarketDataTelemetryPanel`); **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests); **App-level:** telemetry console warning cleared on reload; TWS quote/candle alignment check pending | `packages/chart-core/src/marketSession.ts`, `packages/chart-react/src/engine/`, `services/tws-sidecar/main.py`, `src/lib/marketData/`, `src/lib/chartDataFeed/`, `src/app/components/ChartCell.tsx`, `src/app/components/ChartSettingsModal.tsx`, `src/app/components/MarketDataProvider.tsx`, `src/app/components/dev/MarketDataTelemetryPanel.tsx`, `src/lib/marketData/telemetry/collector.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| Data Health latency diagnostics | Data Health dropdown includes collapsible dev-only market-data latency diagnostics and replaces the fixed bottom-right telemetry overlay | **Pending** | **Focused:** 17 tests passed (data-health UI, telemetry panel, telemetry collector); **Startup:** `npm run check:startup` passed (26 tests); app-level Data Health expand/collapse check not yet recorded | `src/app/components/data-health/DataHealthLatencySection.tsx`, `src/app/components/data-health/MarketDataLatencyDiagnosticsView.tsx`, `src/app/components/data-health/DataHealthMenu.tsx`, `src/app/components/dev/MarketDataTelemetryPanel.tsx`, `src/app/components/StockApp.tsx`, `src/lib/marketData/telemetry/` |
| Options chain floating dialog | User opens options chain from chart header or sidebar launcher in a draggable overlay; sidebar no longer shows chain table; expiration tabs reload chain for selected date with pin and risk-ruler presets in popup | **Pending** | **Focused:** 10 tests passed (`OptionsChainDialog`, `OptionsPanel`); **Startup:** `npm run check:startup` passed (26 tests); app-level expiration switch check not yet recorded | `src/app/components/options/`, `src/app/components/sidebar/panels/OptionsPanel.tsx`, `src/app/components/StockApp.tsx`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `docs/PROJECT-STATUS.md` |
| Market context breadcrumb inline ETF crumbs + header symbol navigation | Sector/industry labels render as clickable related-ETF crumbs with controlled, viewport-aware tooltips; industry crumbs fall back to the sector ETF when no distinct industry ETF exists; Related dropdown popover removed; breadcrumb positioned closer below OHLCV ticker without overlap; symbol back/forward buttons sit immediately after ticker search in the header | **Pending** | **Focused:** 26 tests passed (`Tooltip`, `MarketContextBreadcrumb`, `ChartHeaderBar`, `ChartCell.legendSlot`); **Build:** `npm run build:packages` passed; app-level inline-crumb walkthrough not yet recorded | `src/app/components/Tooltip.tsx`, `src/app/components/Tooltip.test.tsx`, `src/app/components/chart-chrome/MarketContextBreadcrumb.tsx`, `src/app/components/chart-chrome/MarketContextBreadcrumb.test.tsx`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `src/app/components/chart-chrome/SymbolNavArrows.tsx`, `src/app/components/ChartCell.tsx`, `src/app/components/StockApp.tsx`, `packages/chart-react/src/components/ChartLegendBar.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/PROJECT-STATUS.md` |
| Screener observability + baseline | Perf phases on screener route/service/technical filter; dev Screener tab in latency panel; `screener.fetch` client telemetry; before-optimization baseline in `docs/perf/screener-baseline-latest.json` | **Pending** | **Focused:** 48 tests passed; **Build:** `npm run build` passed; **Baseline:** `npm run perf:market-data` captured cold technical presets (~29–51s, candle p50 ~930–1617ms); app-level screener latency panel check not yet recorded; **Architecture review:** self-review Passed | `src/app/api/screener/run/route.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/screener/technicalFilter.ts`, `src/lib/marketData/telemetry/screenerPerf.ts`, `src/lib/chartDataFeed/apiScreenerFeed.ts`, `src/app/components/data-health/MarketDataLatencyDiagnosticsView.tsx`, `scripts/run-market-data-perf.mts`, `docs/perf/screener-baseline-latest.json` |
| Screener sort by leading rule + column picker | Results auto-sort by primary leading rule field on each run; cog dropdown adds/removes columns; sort override persists per saved screen; indicator columns surface for technical screens | **Pending** | **Focused:** 96 screener-related tests passed; **Build:** `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); app-level walkthrough not yet recorded; **Architecture review:** self-review Passed | `src/lib/screener/{types,screenStorage,deriveDefaultSort,indicatorColumns,exportResults}.ts`, `src/lib/persistence/schemas/screenerLibrary.ts`, `src/app/components/screener/{ScreenerProvider,ScreenerDialog,ResultsTable,ColumnPicker}.tsx`, `docs/screener-roadmap.md` |
| IB account tracking | Live IB account in Account sidebar panel with overhauled layout: color-coded PnL, metric help tooltips, tabbed orders/fills, icon refresh, day-trades in net-liq card, computed leverage, what-if preview removed; chart position overlays; read-only w.r.t. mutations | **Pending** | **Focused:** `Test Files 2 passed (2)`, `Tests 13 passed (13)` (`AccountPanel`, `positionOverlays`); **Startup:** `npm run check:startup` passed (26 tests); app-level Account panel walkthrough on live IB Gateway not yet recorded; paused for WIP=1 Massive options integration | `src/app/components/sidebar/panels/AccountPanel.tsx`, `src/app/components/sidebar/panels/AccountPanel.test.tsx`, `src/lib/brokerage/positionOverlays.ts`, `src/lib/brokerage/positionOverlays.test.ts`, `src/app/components/AccountProvider.tsx`, `src/app/api/brokerage/`, `src/lib/brokerage/` |
| Screener dialog layout overhaul | Superseded by **Screener layout + right-panel UX** row — prior Run/⌘↵/collapse-all work retained in QueryBuilder | **Passing** | **Focused:** `Test Files 20 passed (20)`, `Tests 105 passed (105)` (screener layout row); **Build:** `npm run build` passed | `src/app/components/screener/QueryBuilder.tsx` |
| Screener technical rule builder (v1) | User constructs/edits custom technical screener rules in QueryBuilder using any implemented `@edge/chart-core` indicator; registry-aware `validateIndicatorRule` rejects invalid rules client- and server-side; presets and saved screens round-trip `query.technical`; named kinds read-only in UI | **Pending** | **Focused:** 71 tests passed (`compileQuery`, `validateIndicatorRule`, `QueryBuilder`, `ScreenerDialog`, `api/screener/run`); **Build:** `npm run build:packages` + `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); app-level technical rule walkthrough not yet recorded; **Architecture review:** self-review Passed | `src/lib/screener/{compileQuery.ts,validateIndicatorRule.ts}`, `src/app/components/screener/{QueryBuilder.tsx,ScreenerDialog.tsx}`, `src/app/api/screener/run/route.ts`, `src/lib/marketData/ARCHITECTURE.md`, `docs/screener-roadmap.md` |
| Stock screener Phase 3 (custom indicators + comparison + summarize_screen) | Indicator-plugin screener rules via presets (MACD hist, BOLL %B, RSI); candle-fingerprint technical cache; `meta.indicatorValues` sidecar; multi-select comparison table; read-only `summarize_screen` AI tool | **Pending** | **Focused:** 49 screener/AI tests passed; **Build:** `npm run build:packages` + `npm run build` passed; app-level indicator preset + compare walkthrough not yet recorded; **Architecture review:** self-review Passed | `packages/chart-core/src/indicatorCompute.ts`, `src/lib/screener/{technicalMath,technicalFilter,presets,summarizeScreen}.ts`, `src/lib/marketData/schemas/request.ts`, `src/app/components/screener/{ComparisonView,ComparisonDialog}.tsx`, `src/lib/ai/tools/screener.ts`, `docs/screener-roadmap.md` |
| Dual connection — Phase C data preference split | Persisted `edge:marketData:connectionId`; sidecar MD routes accept `connectionId`; header data chip; pre-trade quotes follow order env; live account panel poll hint | **Passing** | **Focused:** Sidecar `Ran 35 tests OK`; App `Test Files 4 passed (4)`, `Tests 71 passed (71)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 4.2s`); **Architecture review:** self-review Passed; app-level live-data-while-paper-order walkthrough deferred | `services/tws-sidecar/main.py`, `dataConnectionPreference.ts`, `MarketDataProvider.tsx`, `AppTopHeader.tsx`, `tradingService.ts`, `marketDataService.ts`, `ARCHITECTURE.md`, `dual-connection-roadmap.md` |
| Position 1R yard lines | Long/short position drawings show always-on left-edge 1R ticks with in-box `NR` labels in profit zone | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)`; **Build:** `npm run build:packages` passed; **Architecture review:** self-review Passed; app-level chart walkthrough deferred | `positionGeometry.ts`, `position_tool.ts`, `positionGeometry.test.ts`, `features.md`, `ARCHITECTURE.md` |
| Dual connection — Phase B account discovery honesty | Sidecar `connectionId` on all account routes; `listAccounts` paper+live with offline live seed; no `(journal)` picker rows; journal scopes by account id | **Passing** | **Focused:** Sidecar `Ran 32 tests OK`; App `Test Files 5 passed (5)`, `Tests 29 passed (29)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.8s`); **Architecture review:** self-review Passed; app-level dual-port picker walkthrough deferred | `services/tws-sidecar/main.py`, `test_main.py`, `src/lib/trading/{types,tradingService,accountPickerOptions}.ts`, `AppTopHeader.tsx`, `TradeTicketModal.tsx`, `.env.example`, `ARCHITECTURE.md` |
| Dual connection — Phase A dual Gateway infra | Docker `TRADING_MODE=both` compose (4001/4002); `npm run ib:gateway:up|down`; sidecar honest `connectionId` routing | **Passing** | **Focused:** `Ran 26 tests OK`; **App-level (partial):** `ib-paper` → `DUP586813` HTTP 200; `ib-live` → HTTP 503; compose validates; A.5 dual-port app proof deferred on credentials | `services/ib-gateway/*`, `package.json`, `.env.example`, `docs/dual-connection-roadmap.md`, `src/lib/trading/ARCHITECTURE.md` |
| Account context wiring | Journal providers under `AccountProvider`; composite picker keys; journal-only accounts from fills; journal filter reacts to picker; trade ticket Gateway-only | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 23 passed (23)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`); **Architecture review:** self-review Passed; app-level journal/chart walkthrough deferred | `JournalModuleShell.tsx`, `JournalTradesProvider.nesting.test.tsx`, `AppTopHeader.tsx`, `accountPickerOptions.ts`, `AccountProvider.tsx`, `TradeTicketModal.tsx`, `filterTradesByAccount.ts`, `src/lib/journal/ARCHITECTURE.md`, `src/lib/trading/ARCHITECTURE.md` |
| Global account header + single account context | Persistent content-column header with `edge` + app-wide account picker; selecting account sets `environment`; trade modal/AccountPanel display-only; journal filtered by active account | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 26 passed (26)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.9s`); **Architecture review:** self-review Passed; nesting bug fixed in account context wiring row | `AppModuleShell.tsx`, `AppTopHeader.tsx`, `AccountProvider.tsx`, `TradeTicketModal.tsx`, `AccountPanel.tsx`, `JournalTradesProvider.tsx`, `filterTradesByAccount.ts`, `src/lib/trading/ARCHITECTURE.md`, `src/lib/design-system/ARCHITECTURE.md` |
| Trading execution — Phase 5 connection registry + paper/live | Connection registry (`ib-paper`/`ib-live`); dual sidecar Gateway sockets; global header account picker (replaces in-modal/panel Paper/Live toggle); `liveConfirmation: LIVE` on live mutations; stub second adapter | **Passing** | **Focused:** `Test Files 15 passed (15)`, `Tests 76 passed (76)`; **Sidecar:** `Ran 26 tests OK`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed; app-level paper/live walkthrough deferred | `src/lib/trading/connectionRegistry.ts`, `src/lib/trading/adapters/{ibTws,stub}.ts`, `src/lib/trading/tradingEnvironment.ts`, `services/tws-sidecar/main.py`, `TradeTicketModal.tsx`, `AccountPanel.tsx`, `AccountProvider.tsx`, `docs/trading-execution-roadmap.md`, `src/lib/trading/ARCHITECTURE.md` |
| Trading execution — Phase 4 UI + journal | Chart trade ticket + what-if confirm; AccountPanel cancel on `ordersForActiveAccount`; journal `orderRef` correlation; AI `preview_order`/`place_order` with mandatory confirmation | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 36 passed (36)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`); **Architecture review:** self-review Passed; app-level paper walkthrough deferred | `src/lib/trading/tradingClient.ts`, `src/app/components/trading/TradeTicketModal.tsx`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `src/app/components/sidebar/panels/AccountPanel.tsx`, `src/lib/journal/correlateOrderRef.ts`, `src/lib/ai/tools/trading.ts`, `src/lib/ai/tradingPort.ts`, `docs/trading-execution-roadmap.md` |
| Trading execution — Phase 3 stops + safety | STP/STP LMT preview+submit; previewIntentId 30s expiry; short-sale hard block; PDT soft warning; `EDGE_TRADING_KILL_SWITCH`; audit log | **Passing** | **Focused:** `Test Files 10 passed (10)`, `Tests 52 passed (52)`; **Sidecar:** `Ran 25 tests OK`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`); **Architecture review:** self-review Passed | `src/lib/trading/{types,validateOrder,safetyGuards,auditLog,tradingService}.ts`, `src/lib/trading/adapters/ibTws.ts`, `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `src/app/api/trading/**`, `.env.example`, `src/lib/trading/ARCHITECTURE.md`, `docs/trading-execution-roadmap.md` |
| Trading execution — Phase 2 manage + account | Modify MKT/LMT; active account persistence; account-scoped orders; lost-response reconciler | **Passing** | **Focused:** `Test Files 8 passed (8)`, `Tests 32 passed (32)`; **Sidecar:** `Ran 19 tests OK`; **Build:** `npm run build` passed; **App-level:** `defaultAccountId: DUP586813`; LMT `orderId: 38` `permId: 1306430116`; PATCH `lmtPrice: 8.95`; scoped orders include `orderRef`; cancel `status: "Cancelled"`; **Architecture review:** self-review Passed | `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `src/lib/trading/**`, `src/lib/brokerage/filterOrders.ts`, `src/app/api/trading/**`, `src/app/components/AccountProvider.tsx`, `docs/trading-execution-roadmap.md` |
| Trading execution — Phase 1 domain + adapter | Broker-neutral `TradingService`, `IbTwsTradingAdapter`, intent store, `/api/trading/*` on paper only (MKT/LMT); no UI | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 14 passed (14)`; **Build:** `npm run build` passed; **App-level:** preview MKT HTTP 200; MKT `orderId: 17` `permId: 1306430090`; LMT `orderId: 19` `permId: 1306430091`; cancel `status: "Cancelled"`; idempotent retry same intent; **Architecture review:** self-review Passed | `src/lib/trading/**`, `src/app/api/trading/**`, `src/lib/api/apiAuth.ts`, `src/lib/trading/ARCHITECTURE.md` |

Older Passing rows: [status-archive/](./status-archive/).

## Task Contract — Heat map data hardening

- **Status:** Complete (Passing) 2026-07-12.
- **Goal:** Heat-map Size/Color/Group defaults work on mover presets and FMP company-screener rows.
- **Delivered:** `enrichMoversWithDescriptors` + `getFmpMarketMovers` descriptor join; `moverToScreenerRow` pass-through; `mapFmpScreenerRow` `changePercentage` alias + derive; `HEAT_MAP_QUOTE_STREAM_CAP` 200; `heatMapSizeMetricCoverageWarning` banner.
- **Verification:** `Test Files 6 passed (6)`, `Tests 31 passed (31)`; `npm run build` `✓ Compiled successfully in 3.0s`; **Architecture review:** self-review Passed. **Deferred:** app-level Gainers/Large-cap walkthrough.
- **Blockers:** none.

## Task Contract — Screener heat map

- **Status:** Complete (Passing)
- **Goal:** Reusable treemap heat-map foundation + screener List / Heat map toggle with size, color, and group controls.
- **Delivered:** `src/lib/heatmap/` (types, colorScale, squarify, defaults, tests); `HeatMapView` + `HeatMapToolbar`; `screenerHeatMapAdapter`; session `resultsViewMode` + `heatMapConfig`; `ResultsTable` toggle + heat map pane; `ARCHITECTURE.md` + roadmap update.
- **Verification:** `Test Files 5 passed (5)`, `Tests 27 passed (27)`; `ScreenerDialog` `Tests 14 passed (14)`; `npm run build` `✓ Compiled successfully in 2.9s`.
- **Blockers:** none.

## Task Contract — Right panel overlay layout

- **Status:** **Passing** 2026-07-12.
- **Goal:** Docked right panel overlays chart without reflowing chart width; resize drags panel over chart; chart stays interactive under uncovered area.
- **Delivered:** `resolveSidebarMode` always `overlay`; `StockApp` overlay mount inside chart row; `absolute right-0` positioning (fixes `relative`+`fixed` conflict); auto-dock floating panels only below tablet breakpoint; screener Expand + Pop out enabled on overlay; backdrop removed; design-system doc updated.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Architecture review:** self-review Passed. **Deferred:** app-level overlay resize walkthrough.
- **Next:** App-level confirmation on `/chart`; then resume Dual connection Phase D.

## Task Contract — Screener layout + right-panel UX

- **Status:** **Passing** 2026-07-12.
- **Goal:** Widen docked screener horizontally; fix never-run empty state; add edit/scan filter modes; responsive preset chips.
- **Delivered:** Panel-aware sidebar max + Expand/Collapse; `filterViewMode` session field; `FilterChipSummary`; never-run starters; narrow chip scroller; modal `full` ≈ `min(96vw,1400px)`.
- **Verification:** **Focused:** `Test Files 20 passed (20)`, `Tests 105 passed (105)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed. **Deferred:** app-level docked expand/scan walkthrough.
- **Next:** App-level confirmation on `/chart`; then resume Dual connection Phase D.

## Task Contract — Dual connection (live data + paper/live orders)

- **Status:** Phase D **Passing** 2026-07-12; dual-connection track complete (app-level verified).
- **Goal:** Run paper+live IB Gateways simultaneously (Docker preferred); keep live market data stable while switching order account paper↔live; fold journal fills into real Gateway accounts (no `(journal)` picker rows); preserve pluggable market-data providers; harden TWS-only preference boundaries; split Data Health connection diagnostics.
- **Delivered:** Phases A–D — dual Gateway infra; honest account discovery; `edge:marketData:connectionId` decoupled from order account; sidecar MD `connectionId`; header data chip; order-scoped pre-trade quotes; live account poll hint; TWS-only preference docs/tests; chart `loadQuotes` preference parity; sidecar `/status` `connections` map; Data Health Connections section.
- **Verification:** **Focused:** Sidecar `Ran 36 tests OK`; App `Test Files 12 passed (12)`, `Tests 141 passed (141)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.7s`); **App-level:** `localhost:3003/chart` — Connections panel paper+live connected; data chip toggled to Live data while account remained `DUP586813 (paper)`; `/api/quotes` `connectionId=ib-live` → `meta.source: tws`; **Architecture review:** self-review Passed.
- **Out of scope:** Postgres intents, options/brackets, Client Portal dual-session substitute, fill account remapping, new market-data plugin framework, dual-socket TWS recovery.
- **Blockers:** none.
- **Next:** Pick next backlog item (WIP=1).

## Task Contract — TWS recovery supervisor

- **Status:** Pending — fallback hardening shipped; focused + startup + build + stale-sidecar app-level probes passed; Gateway recovery walkthrough pending sidecar restart.
- **Goal:** Harden IB Gateway/TWS sidecar recovery and data-foundation routing so stale/unhealthy sidecar cannot hang quote SSE, warmup, or recovery finalization; auto-recover or surface precise manual action.
- **Delivered (prior):** Sidecar connection supervisor; extended `/status` fields; async reconnect bypass when worker wedged; managed sidecar restart escalation; recovery session context; Data Health phase messages.
- **Delivered (2026-07-02):** Quote SSE uses same TWS health gate as REST with poll fallback; TWS stream connect/first-frame timeouts; watchlist SSE → REST fallback on stall/error; bounded `primeMarketData` + warmup route budget; sidecar `/health` freshness/capabilities; `scripts/tws-sidecar.sh` logs effective `TWS_PORT`; recovery finalization warmup budget.
- **Verification:** **Focused:** 55 tests passed; **Startup:** `npm run check:startup` passed (26 tests); **Build:** `npm run build` passed; **App-level:** candles/quotes/warmup/stream fallback probes passed on stale sidecar; **Architecture review:** self-review Passed; **Recovery walkthrough:** pending.
- **Blockers:** Restart sidecar from current source before live recovery evidence; IB Gateway paper login on port `4002`.

## Task Contract — IB account tracking

- **Status:** Pending — panel UI overhaul shipped; app-level walkthrough on live IB Gateway pending.
- **Goal:** Live IB account data (positions, PnL, summary, orders, executions) in Account sidebar panel + chart position overlays; read-only w.r.t. brokerage mutations; TWS sidecar via reqAccountUpdates/reqPnL/openOrder events.
- **Delivered:** Sidecar `/account/*` + `/stream/account`; account tracking always attempted through the local sidecar with no `TWS_BROKERAGE_ENABLED` gate; non-blocking account update subscription for live/read-only Gateway; read-only-safe order snapshot handling; `src/lib/brokerage/` service + contracts; `/api/brokerage/*` routes; `AccountProvider` + Account panel; chart avg-cost reference line when showPositions enabled; Data Health account feed row; architecture + env docs.
- **Delivered (2026-07-01):** Account panel UI overhaul — removed what-if preview UI; color-coded PnL (`--edge-positive`/`--edge-negative`); metric help tooltips; tabbed orders/fills; icon refresh button; day-trades folded into net-liq card; leverage computed as InitMargin/NetLiq; position sort dropdown removed.
- **Verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 13 passed (13)` (`AccountPanel`, `positionOverlays`); **Startup:** `npm run check:startup` passed (26 tests); Architecture review self-review Passed.
- **Blockers:** App-level Account panel walkthrough not recorded on live IB Gateway; open-order snapshot live verification requires `TWS_READONLY=false`.

## Task Contract — TWS extended-hours price alignment

- **Status:** Pending — paused for sidebar resize fix; app-level verification not yet recorded.
- **Goal:** Align watchlist `LAST` with chart current-price marker using the same live quote; support TWS extended-hours intraday candles; make pre/regular/post-market state explicit in chart UI.
- **Delivered:** `marketSession` helpers; `livePrice`/`liveMarketSession` chart props; `sessionMode` on candle requests + TWS sidecar `useRTH`; Settings → Extended hours toggle; session status badge on legend; pre/post background bands when extended mode enabled; telemetry panel uses external-store subscription with cached snapshot; SSE quote first-paint telemetry moved out of React state updater.
- **Verification:** focused marketSession/renderer/chart-feed/market-data tests + telemetry tests + `npm run build:packages` + app-level TWS alignment check + app-level console clean on reload.

## Session Log

Append one entry before handing off long-running or interrupted work. Older entries: [status-archive/](./status-archive/).

### 2026-07-12 — Heat map data hardening

- **Goal:** Heat-map defaults (size market cap, color change %, group sector) work on movers and company-screener results.
- **Completed:** Server-side mover enrichment via `fetchUniverseDescriptors`; `changePercent` mapper fix; quote stream cap 200; partial size-metric banner; architecture + roadmap + harness updates.
- **Verification run:** `npm test -- --run src/lib/marketData/screenerUniverse/enrichMoversWithDescriptors.test.ts src/lib/marketData/service/marketDataService.fmp.test.ts src/lib/marketData/providers/fmp/mappers.screener.test.ts src/lib/chartDataFeed/apiScreenerFeed.test.ts src/lib/screener/screenerHeatMapAdapter.test.ts src/app/components/screener/ResultsTable.test.tsx` → `Test Files 6 passed (6)`, `Tests 31 passed (31)`; `npm run build` `✓ Compiled successfully in 3.0s`.
- **Next best step:** App-level — Gainers heat map with Size=market cap and Group=sector; Large-cap with Color=change % on full set.

### 2026-07-12 — Screener heat map

- **Goal:** Reusable treemap heat-map foundation plugged into stock screener with List / Heat map toggle.
- **Completed:** `src/lib/heatmap/` pure layout + color scale; `HeatMapView`/`HeatMapToolbar`; screener adapter + session state; `ResultsTable` toggle and config controls; architecture doc + roadmap update.
- **Verification run:** `npm test -- --run src/lib/heatmap/ src/lib/screener/screenerHeatMapAdapter.test.ts src/app/components/heatmap/ src/app/components/screener/ResultsTable.test.tsx` → `Test Files 5 passed (5)`, `Tests 27 passed (27)`; `ScreenerDialog` `Tests 14 passed (14)`; `npm run build` `✓ Compiled successfully in 2.9s`.
- **Next best step:** App-level walkthrough — run preset, toggle Heat map, change Size/Color/Group, click cell loads chart.

### 2026-07-12 — Dual connection Phase D

- **Goal:** Harden TWS-only preference threading; split Data Health into paper socket, live socket, and active chart data preference.
- **Completed:** Sidecar `/status` `connections` map; health probe/merge + Connections UI section; `loadQuotes` connectionId parity; docs + trust/boundary tests; architecture + roadmap updates.
- **Verification run:** Sidecar `Ran 36 tests OK`; `npm test -- --run` (12 files) `Test Files 12 passed (12)`, `Tests 141 passed (141)`; `npm run build` `✓ Compiled successfully in 2.7s`; **App-level:** restarted sidecar; both Gateways on 4001/4002; Data Health Connections paper+live connected; data chip Live + account paper; quotes `ib-live` → `tws`.
- **Next best step:** Dual-connection track complete — pick next backlog item.

### 2026-07-12 — Right panel overlay layout

- **Goal:** Docked right panel overlays chart without changing chart width; no dimmed backdrop.
- **Completed:** `resolveSidebarMode` always overlay; `StockApp` overlay inside chart row; `absolute right-0` fix for full-cover bug; narrow-viewport auto-dock; screener Expand/Pop out gates; backdrop removed; design-system + harness updates.
- **Verification run:** `npm test -- --run src/lib/responsive/responsiveLayout.test.ts src/app/components/sidebar/SidebarPanelShell.test.tsx src/app/components/sidebar/RightSidebar.test.tsx` → `Test Files 3 passed (3)`, `Tests 15 passed (15)`.
- **Next best step:** App-level walkthrough — open watchlist at desktop width, confirm chart width unchanged; drag resize; Escape closes.

### 2026-07-12 — Screener layout + right-panel UX

- **Goal:** Widen docked screener; fix never-run empty state; edit/scan modes; responsive preset presentation.
- **Completed:** Panel-aware `sidebarWidth` + Expand/Collapse; `filterViewMode` + chip summary; never-run starters; narrow preset chips; Limit beside Run; harness + roadmap updates.
- **Verification run:** `npm test -- --run src/lib/responsive/sidebarWidth.test.ts src/app/components/sidebar/ src/app/components/screener/` → `Test Files 20 passed (20)`, `Tests 105 passed (105)`; `npm run build` passed.
- **Next best step:** App-level walkthrough — Expand docked screener, run preset, confirm scan mode + Watchlist width clamp.

### 2026-07-13 — Project status harness prune

- **Goal:** Cut `PROJECT-STATUS.md` from an unbounded ledger (~2.4k lines) to a hot operational dashboard; archive full history.
- **Completed:** Created `docs/status-archive/` (`README.md`, `2026-06.md`, `2026-07.md`); moved Previous Verified stacks, completed Task Contracts, older Session Log entries, and older Passing Active Work rows; added § Harness Retention; updated harness checklists.
- **Verification run:** `npm run lint:instructions` passed; `npm run check:startup` passed (`Test Files 3 passed (3)`, `Tests 26 passed (26)`).
- **Next best step:** Follow retention table on future session exits; optional later `npm run status:prune` automation.

### 2026-07-12 — Position 1R yard lines

- **Goal:** Add always-on left-edge 1R ticks with in-box `NR` labels in the profit zone of long/short position drawings.
- **Completed:** `profitRLevels` helper in `positionGeometry.ts`; `drawProfitRYardLines` in `position_tool.ts`; unit tests; `features.md` + `ARCHITECTURE.md` + harness update.
- **Verification run:** `npm test -- --run packages/chart-core/src/drawings/positionGeometry.test.ts src/lib/chart/drawings/position_tool.test.ts` → `Test Files 2 passed (2)`, `Tests 29 passed (29)`; `npm run build:packages` passed.
- **Next best step:** App-level walkthrough on `/chart` — draw long + short with ≥2R target; confirm ticks/labels update on resize.

### 2026-07-12 — Dual connection Phase C

- **Goal:** Decouple chart/quote IB connection from header order account (`dataConnectionPreference`).
- **Completed:** Sidecar MD routes accept `connectionId`; `edge:marketData:connectionId` + header chip; threaded through TWS client, MarketDataService, API, streams; pre-trade quotes use order env; live account poll hint + architecture docs.
- **Verification run:** Sidecar `Ran 35 tests OK`; `npm test -- --run` (4 files) `Test Files 4 passed (4)`, `Tests 71 passed (71)`; `npm run build` `✓ Compiled successfully in 4.2s`.
- **Next best step:** Phase D — or app-level: live data chip while paper order account + paper order preview.

### 2026-07-12 — Dual connection Phase B

- **Goal:** Honest sidecar `connectionId` routing; Gateway-only picker; offline live seed; journal filter unchanged.
- **Completed:** B.1–B.5 — `/account/trades` + `/stream/account` accept `connectionId`; unknown id → 400; removed journal-only picker union; `availability` + `TWS_LIVE_ACCOUNT_ID` offline seed; legacy journal rematch; tests + ARCHITECTURE + harness.
- **Verification run:** Sidecar `Ran 32 tests OK`; `npm test -- --run` (5 files) `Test Files 5 passed (5)`, `Tests 29 passed (29)`; `npm run build` `✓ Compiled successfully in 2.8s`.
- **Next best step:** Phase C — `dataConnectionPreference` split.

### 2026-07-09 — Dual connection Phase A infra

- **Goal:** Ship Docker dual Gateway compose (`TRADING_MODE=both`), npm scripts, env templates, ops docs; restart sidecar; prove honest `connectionId` routing.
- **Shipped:** `services/ib-gateway/docker-compose.yml` (`ghcr.io/gnzsnz/ib-gateway:stable`, localhost 4001/4002/5900); `services/ib-gateway/.env.example`; `ib:gateway:up|down` with `--project-directory`; `.env.example` + `.gitignore` for gateway secrets; Phase A ops in `dual-connection-roadmap.md`; local dual Gateway note in `src/lib/trading/ARCHITECTURE.md`.
- **Verification run:** **Focused:** `Ran 26 tests OK`; **App-level (partial):** sidecar restarted — `ib-paper` `DUP586813` HTTP 200; `ib-live` HTTP 503 when 4001 down (no paper clone); `docker compose config` OK.
- **Known blockers:** No `services/ib-gateway/.env` yet; desktop IB Gateway on 4002; Docker image pull not completed in session.
- **Next:** Copy `.env.example` → `.env`, stop desktop Gateway, `npm run ib:gateway:up`, VNC 2FA, confirm both ports, curl distinct live managed id → mark Phase A Passing → Phase B.

### 2026-07-08 — Dual connection roadmap (plan only)

- **Goal:** Document roadmap for Docker dual Gateway + decouple live market data from paper/live order routing; remove journal-only account workaround.
- **Shipped:** `docs/dual-connection-roadmap.md` (Phases A–D); links from `ROADMAP.md`, `trading-execution-roadmap.md`, `src/lib/trading/ARCHITECTURE.md`; harness Pending row + Task Contract.
- **Verification run:** Plan-only — no code/tests.
- **Next:** Phase A — Docker `TRADING_MODE=both`, map 4001/4002, restart sidecar, prove distinct paper/live account status.

### 2026-07-08 — Account context wiring

- **Goal:** Fix journal ignoring header account picker; composite account identity; journal-discovered accounts in picker.
- **Shipped:** Journal providers nested under `AccountProvider`; `accountPickerOptions.ts` + composite picker keys; journal-only accounts from fills; `activeTradingAccount` context; trade ticket Gateway-only guard; nesting regression test.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 23 passed (23)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`).
- **Next:** App-level walkthrough — `/journal/dashboard` switch `DUP586813` vs `U25026894 (journal)`; paper vs live distinct; `/chart` trade ticket with Gateway account.

### 2026-07-08 — Global account header + single account context

- **Goal:** Persistent content-column header with `edge` + app-wide account picker; single account drives trading, account panel, and journal.
- **Shipped:** `AppTopHeader.tsx` in `AppModuleShell`; lifted `AccountProvider` with `setActiveTradingAccount`; trade modal/AccountPanel display-only account; journal `filterTradesByAccount`.
- **Verification run:** **Focused:** `Test Files 6 passed (6)`, `Tests 26 passed (26)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.9s`).
- **Next:** App-level header/account walkthrough on localhost:3003.

### 2026-07-08 — Trading execution Phase 5 connection registry + paper/live

- **Goal:** Connection registry, dual Gateway sockets, in-app Paper/Live toggle, live `LIVE` confirm gate.
- **Shipped:** `connectionRegistry.ts`, `StubTradingAdapter`, `tradingEnvironment.ts`; sidecar `ib-paper`/`ib-live`; Trade ticket + Account panel mode toggle; `liveConfirmation` on submit/cancel/modify.
- **Verification run:** **Focused:** `Test Files 15 passed (15)`, `Tests 76 passed (76)`; **Sidecar:** `Ran 26 tests OK`; **Build:** `npm run build` passed.
- **Next:** App-level paper/live walkthrough; Postgres intent store backlog.

### 2026-07-08 — Trading execution Phase 4 UI + journal

- **Goal:** Chart trade ticket, confirm modal, AccountPanel cancel, journal orderRef correlation, AI place_order.
- **Shipped:** `TradeTicketModal`, `tradingClient.ts`, AccountPanel cancel + scoped orders, `correlateOrderRef.ts`, `preview_order`/`place_order` tools.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 36 passed (36)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`).
- **Next:** Superseded by Phase 5 row.

### 2026-07-08 — Trading execution Phase 3 stops + safety

- **Goal:** STP/STP LMT orders, preview expiry, short-sale/PDT guards, kill switch, audit log.
- **Shipped:** `STP`/`STP LMT` types + sidecar builders; `previewIntentId` 30s TTL; `safetyGuards.ts`; `auditLog.ts`; `EDGE_TRADING_KILL_SWITCH`; `outsideRth` default false.
- **Verification run:** **Focused:** `Test Files 10 passed (10)`, `Tests 52 passed (52)`; **Sidecar:** `Ran 25 tests OK`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`).
- **Next:** Phase 4 — chart ticket UI + journal wiring.

### 2026-07-08 — Trading execution Phase 2 manage + account

- **Goal:** Modify open orders, active account selection, account-scoped orders, lost-response reconciler.
- **Shipped:** sidecar `PATCH /trading/orders/{id}`; `reconcile.ts`, `activeAccount.ts`, `filterOrders.ts`; `TradingService.modifyOrder`; `PATCH /api/trading/orders/[orderId]`; `AccountProvider.ordersForActiveAccount`.
- **Verification run:** **Focused:** `Test Files 8 passed (8)`, `Tests 32 passed (32)`; **Sidecar:** `Ran 19 tests OK`; **Build:** `npm run build` passed; **App-level:** `orderId: 38` `permId: 1306430116`; PATCH `lmtPrice: 8.95`; scoped `orderRef: edge-phase2-api`.
- **Next:** Phase 3 — STOP orders + safety hardening.

### 2026-07-08 — Trading execution Phase 1 domain + adapter

- **Goal:** Broker-neutral trading layer on top of Phase 0 sidecar — types, service, adapter, `/api/trading/*`.
- **Shipped:** `src/lib/trading/**`, `src/app/api/trading/**`, `/api/trading` in `apiAuth` sensitive prefixes.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 14 passed (14)`; **Build:** `npm run build` passed; **App-level:** MKT `orderId: 17` `permId: 1306430090`; LMT `orderId: 19` `permId: 1306430091`; cancel `status: "Cancelled"`.
- **Next:** Phase 2 — modify orders + active account selection.

### 2026-07-08 — Trading execution Phase 0 paper spike

- **Goal:** Prove IB paper place + cancel via TWS sidecar before full trading layer.
- **Shipped:** `POST /trading/orders`, `DELETE /trading/orders/{order_id}`, trading guards/helpers, unit tests; `.env.local` paper pins (`TWS_PORT=4002`, `TWS_ACCOUNT_ID=DUP586813`, `TWS_READONLY=false`).
- **Verification run:** **Focused:** `Ran 15 tests OK`; **App-level:** MKT `orderId: 9` `permId: 1306430087`; LMT `orderId: 10` `permId: 1306430088`; cancel `status: "Cancelled"`.
- **Next:** Phase 1 — broker-neutral types, `TradingService`, `/api/trading/*`.

### 2026-07-08 — Journal loading + empty states

- **Goal:** Layered loading, global empty, scoped empty, and error states across journal Dashboard + Trades without duplicate fetches or flash-of-empty on initial load.
- **Shipped:** `journalDataPhase` + `journalEmptyCopy`; `JournalTradesProvider` error/retry; `JournalContentGate`, `JournalPageLoadingSkeleton`, `JournalGlobalEmptyState`; page gates on `JournalDashboardView` + `JournalTradesView`; scoped empty copy unified in equity/table/list/breakdown/time widgets.
- **Verification run:** **Focused:** `Test Files 24 passed (24)`, `Tests 136 passed (136)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.5s`); **Architecture review:** self-review Passed.
- **Next:** App-level walkthrough on localhost:3003 — skeleton on cold load, global empty with Import/Sync, scoped filtered empty when filters exclude rows.

### 2026-07-07 — Journal trades table controls

- **Goal:** Add P0/P1 table controls to `/journal/trades` — sortable headers, result count, filtered empty state, client pagination, column visibility, density prefs.
- **Shipped:** `journalTradesTableControls.ts`; `JournalTradesTableControls` toolbar; upgraded `JournalTradesTable` (sortable sticky headers, conditional columns, dual empty states); `JournalTradesView` sort → paginate pipeline with localStorage prefs.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 48 passed (48)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.7s`); **Architecture review:** self-review Passed.
- **Next:** App-level walkthrough on `/journal/trades` — sort, paginate, toggle columns/density, confirm prefs survive refresh.

### 2026-07-07 — Journal trades page hero summary cards

- **Goal:** Show the four dashboard hero KPI cards at the top of `/journal/trades` with the trades table below.
- **Shipped:** `JournalTradesView` renders `JournalSummaryCards` above `JournalTradesTable` using the same scoped closed-trade stats + account equity as dashboard.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 44 passed (44)`; **Architecture review:** self-review Passed.

### Session Exit Checklist

- [ ] Active Work state and latest result updated
- [ ] Task Contract updated or cleared
- [ ] Known blockers recorded
- [ ] Temporary/debug artifacts removed
- [ ] Next concrete action recorded
- [ ] Appropriate verification tier run

## Next Priorities (Post-V1)

Canonical roadmap: [ROADMAP.md](./ROADMAP.md). Immediate priorities:

1. **Corporate events / news / fundamentals / macro panels** — next Phase 2 market-data workflow expansions
2. **Bar Replay persistence** — persist position in `CellConfig`
3. ~~**Options sidebar panel**~~ — **shipped**

## Explicit Deferrals

- Pine Script / community indicators
- Price/drawing alerts
- Non-time charts (Renko, P&F, Kagi)
- Volume footprint, TPO, session profile
- 16-chart layouts, cloud sync

## Verification for Active Areas

```bash
# Internal package boundaries
npm run lint:package-boundaries
npm run typecheck:packages
npm run build:packages
npm run check:examples

# Package API snapshots
npm test -- --run src/test/package-api-snapshot.test.ts
npm test -- --run src/test/package-boundaries.test.ts

# Context menu / copy menu
npm test -- --run src/app/components/chartContextMenu.test.ts
npm test -- --run src/app/components/chartCopyMenu.test.ts

# Chart engine (canonical package paths)
npm test -- --run packages/chart-react/src/engine/
npm test -- --run packages/chart-react/src/EdgeChart.test.tsx
npm test -- --run src/app/components/chart-cell/
npm test -- --run src/app/components/ChartCell.activeChart.test.tsx
npm test -- --run src/lib/chart/

# AI tools
npm test -- --run src/lib/ai/
```

## Related Docs

- [status-archive/](./status-archive/) — pruned harness history (Session Log, Task Contracts, old Active Work)
- [chart/features.md](./chart/features.md) — full feature inventory with status per row
- [ROADMAP.md](./ROADMAP.md) — consolidated product and engineering roadmap
- [journal-roadmap.md](./journal-roadmap.md) — post-v1 journal reporting tiers (Tier 1–3)
- [chart/context-menu-reference.md](./chart/context-menu-reference.md) — TV vs Edge menu parity
- [ai-tools-architecture.md](./ai-tools-architecture.md) — AI tool design and rollout phases
- [chart/drawing-platform-plan.md](./chart/drawing-platform-plan.md) — drawing platform (complete)
