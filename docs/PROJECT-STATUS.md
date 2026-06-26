# Project Status

Single source for current progress. For row-by-row feature detail, see [chart/features.md](./chart/features.md).

**Last updated:** 2026-06-26

## Current Verified State

- **Current task:** None active — event overlay data + bottom rail shipped.
- **State:** **Passing** — corporate events filter by symbol/date at ingest; badges render in a reserved bottom event rail grouped by calendar day and screen proximity; click opens grouped detail card.
- **Latest verification:** **Focused:** 57 event/market-data/chart badge tests passed; **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests).
- **Evidence:** `src/lib/marketData/providers/fmp/adapter.ts`, `src/lib/chartDataFeed/apiChartDataFeed.ts`, `packages/chart-core/src/layout.ts`, `packages/chart-react/src/engine/eventBadges.ts`, `packages/chart-react/src/components/EventDetailCard.tsx`.
- **Current blocker:** none.
- **Next best step:** Corporate events / news / fundamentals / macro workflow panels (Phase 2) per [ROADMAP.md](./ROADMAP.md).

## Previous Verified State (event badge overlay strategy)

- **State:** **Passing** — dense event overlays now use bottom-axis badges by default, app settings filter requested event kinds before fetch, news/options expirations remain opt-in, and the Settings modal exposes event toggles.
- **Latest verification:** **Focused:** 22 event/settings/feed tests passed; **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests).

## Previous Verified State (Edge design system)

- **State:** **Passing** — renamed token module to Edge-owned names; added `EdgeButton`, `EdgeModalShell`, `EdgeSearchInput`, etc.; converted context menu, indicator picker, settings modal, quick search, symbol search, object tree empty state.
- **Latest verification:** **Focused:** 37 tests passed; **Fast:** `npm run check:startup` passed (26 tests).

## Previous Verified State (market data first-paint)

- **Current task:** None active — market data first-paint performance improvements shipped.
- **State:** **Passing** — warmup no longer blocks on cold options-chain fetch; IBKR auth probe skips unauthenticated hops; partial hot quotes and TWS Gateway status probe improve first paint; Gateway-down fallback preserved.
- **Latest verification:** **Focused:** 42 market-data routing tests passed (service + TWS/IBKR health gates); **Collection:** `npm run perf:market-data` passed (warmup 309 ms, watchlist 825 ms, cold chart 184 ms); **Fast:** `npm run lint:instructions` passed.
- **Evidence:** `src/lib/marketData/service/marketDataService.ts`, `src/lib/marketData/providers/ibkr/healthGate.ts`, `src/lib/marketData/stream/twsQuoteStreamSession.ts`, `docs/perf/market-data-baseline-2026-06-26T02-11-28-095Z.json`.
- **Current blocker:** None for TWS-first path; IBKR Client Portal still unauthenticated for Web API timing comparison.
- **Next best step:** Lazy-load options chain in Options panel UI; re-run baseline after Client Portal login.

## Previous Verified State (hot data architecture)

- **State:** **Passing** — stale-while-revalidate hot store + `MarketDataProvider` coordinator serve warmed watchlist quotes, chart candles, and active-symbol options.
- **Latest verification:** **Focused:** hotStore + marketDataService 33 tests passed; chartDataFeed 24 tests passed; stream 2 tests passed; WatchlistPanel + OptionsPanel tests passed after fix; **Fast:** `npm run check:startup` passed (26 tests).
- **Evidence:** `src/lib/marketData/hotStore.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/app/components/MarketDataProvider.tsx`, `services/tws-sidecar/main.py`, `src/lib/chartDataFeed/`, `src/app/components/watchlist/`, `src/app/components/sidebar/panels/OptionsPanel.tsx`.
- **Current blocker:** IB Gateway paper not running locally (port 4002) for full live instant-revisit probe pass.
- **Next best step:** Corporate events / news / fundamentals / macro workflow panels (Phase 2) per [ROADMAP.md](./ROADMAP.md).

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
| Drawings | **Done** | 12 tools, typed styles, undo/redo, multi-pane routing |
| Context menus | **Done** | Blank + drawing + price-axis menus; ⌥R reset, crosshair lock toggle, bulk remove — see [context-menu-reference.md](./context-menu-reference.md) |
| Layout persistence | **Done** | localStorage + optional Postgres workspace sync |
| AI tool registry | **Done** | Shared registry; HTTP + MCP + in-app adapters |
| Watchlists / templates | **Done** | localStorage + optional remote sync |
| Rich annotation metadata | **Done** | Phase A — thesis/invalidation/target kinds on drawings |
| Market data foundation | **Done** | Provider-neutral layer in `src/lib/marketData/`; Yahoo + SEC/FRED/FMP/Tradier/IBKR adapters; registry-driven event system with chart pins |

## Active Work

Use states: **Pending**, **Active**, **Blocked**, **Passing**. Keep only one item **Active** at a time.
Use verification levels: **Focused** (targeted Vitest), **Build** (`npm run build`), **App-level** (dev server or browser/manual flow), **Full** (`npm run check`).

| Feature | Behavior | State | Completion evidence / latest result | Files |
|---------|----------|-------|-------------------------------------|-------|
| Project status harness | Fresh agents can identify current work from one authoritative status block, and stale status placeholders fail instruction validation | **Passing** | **Focused:** `npm run check:startup` passed (3 files, 22 tests) after validator updates | `docs/PROJECT-STATUS.md`, `scripts/validate-agent-instructions.mts` |
| Internal package boundaries | Package workspaces and examples validate reusable chart/AI boundaries without driving a public release effort | **Passing** | **Full:** `npm run check` passed (776 tests, `check:examples`, package boundaries, `typecheck:packages`, build) | `packages/`, `examples/`, `scripts/validate-package-boundaries.mts`, `src/test/package-api-snapshot.test.ts` |
| Chart copy menu | User can copy chart and drawing data from the context menu without breaking existing menu behavior | **Passing** | **Focused:** included in `npm run check:startup`; rerun `npm test -- --run src/app/components/chartCopyMenu.test.ts src/app/components/chartContextMenu.test.ts` if changed | `chartCopyMenu.ts`, `chartContextMenu.ts`, `ChartCell.tsx` |
| Watchlist hydration / MCP-created lists | Saved watchlists created through AI/MCP hydrate after mount without reading browser storage during SSR hydration, and row clicks fetch and render fresh chart/indicator data | **Passing** | **Focused:** `npm test -- --run packages/chart-core/src/indicatorCompute.test.ts packages/chart-react/src/EdgeChart.test.tsx src/app/components/watchlist/WatchlistPanel.test.tsx src/lib/watchlist/storage.test.ts`; **App-level:** Trinity list row clicks updated active chart data from `UNH` to `TSLA` to `IBM` | `WatchlistContext.tsx`, `WatchlistPanel.test.tsx`, `watchlist/storage.ts`, `packages/chart-react/src/EdgeChart.tsx`, `packages/chart-core/src/indicatorCompute.ts` |
| Context menu polish | User can access remaining chart context-menu actions with parity documented against the TradingView reference | **Passing** | **Focused:** 40 tests passed across 5 context-menu files; **Build:** `npm run build:packages` passed; parity rows updated in `context-menu-reference.md` + `features.md` | `chartContextMenu.ts`, `ChartCell.tsx`, `packages/chart-react/src/engine/canvas.tsx`, `docs/chart/context-menu-reference.md` |
| Crosshair time-lock toggle | User can toggle "Lock vertical cursor line by time"; ON freezes the vertical line at the captured plot X, OFF restores free cursor-follow, open context menus suppress crosshair movement, and the menu checkmark reflects persisted `chartSettings.canvas.lockCrosshairToTime` | **Passing** | **Build:** `npm run build:packages` passed; **Focused:** `chartContextMenu.test.ts`, package `canvas.test.tsx`, and `crosshair.test.ts` passed (36 tests); **Fast:** `npm run check:startup` passed (26 tests) | `packages/chart-react/src/engine/chartSettings.ts`, `packages/chart-react/src/engine/canvas.tsx`, `packages/chart-react/src/engine/canvas.test.tsx`, `src/lib/chart/chartSettings.ts`, `src/lib/chart/canvas.tsx`, `ChartCell.tsx`, `ContextMenu.tsx` |
| Object Tree / Data Window parity | TradingView-style two-tab object panel with flat object tree, data window crosshair values, and visibility toggles synced to chart state | **Passing** | **Focused:** `ObjectTreePanel.test.tsx` + `SidebarRail.test.tsx` + `packages/chart-react/src/EdgeChart.test.tsx`; **Fast:** `npm run check:startup` | `ObjectTree.tsx`, `ActiveChartContext.tsx`, `ChartCell.tsx`, `ObjectTreePanel.tsx`, `packages/chart-react/src/EdgeChart.tsx` |
| Percept-style chart platform | Layered renderer with WebGL2 candle + indicator backends (opt-in), browser validation report, typed overlay channels (events/news/options/referenceLines/annotations), and Canvas-only overlay rendering | **Passing** | **Focused:** 45 webgl/layer/overlay tests passed; **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (22 tests) | `packages/chart-react/src/engine/webgl/`, `packages/chart-react/src/engine/layers.ts`, `src/lib/chartDataFeed/`, `src/lib/chart/ARCHITECTURE.md` |
| Declarative indicator expansion (batch 1) | VWAP, ATR, KDJ (stochastic), CCI, OBV enabled via `IndicatorPlugin` contract — picker, legend, y-scale, settings, and restore behave like existing studies | **Passing** | **Focused:** `batch1.test.ts` + catalog tests + 964 total tests passed; **Build:** `npm run build:packages` + `check:packages` passed | `packages/chart-core/src/indicators/{vwap,atr,kdj,cci,obv}.ts`, `math.ts`, `registry.ts`, `catalog.ts`, `docs/chart/features.md` |
| Declarative indicator expansion (batch 2) | DMI (+DI/-DI/ADX), WR, ROC, Supertrend enabled via `IndicatorPlugin` contract — picker, legend, y-scale, settings, and restore behave like existing studies | **Passing** | **Focused:** `batch2.test.ts` (5 tests) + catalog tests (3 tests) + package snapshot passed; **Build:** `npm run build:packages` passed | `packages/chart-core/src/indicators/{dmi,wr,roc,supertrend}.ts`, `math.ts`, `registry.ts`, `catalog.ts`, `docs/chart/features.md` |
| Granular layout sync | Independent symbol, interval/range, crosshair, and drawing sync toggles in layout setup menu; per-field propagation and legacy `linked` migration | **Passing** | **Focused:** 20 layout/sync + drawing propagation tests passed; **Build:** `npm run build:packages` passed | `src/lib/chartConfig.ts`, `StockApp.tsx`, `ChartLayoutMenu.tsx`, `ChartSyncContext.tsx`, `layoutStorage.ts`, `chartConfig.link.test.ts` |
| Market data foundation | Provider-neutral stocks/options/event data layer with validated API routes, shared cache, registry-driven events, and multi-provider adapters | **Passing** | **Focused:** 43 event/macro tests passed; **Live:** macro coverage required=5/5; `fmp:gap-probe` economic-calendar + news unlocked; `check:startup` passed | `src/lib/marketData/events/`, `src/lib/marketData/providers/fmp/`, `src/lib/chartDataFeed/`, `scripts/events-coverage-probe.mts` |
| Live browser WebGL validation | Dev server with `NEXT_PUBLIC_WEBGL_CANDLES=1` + `NEXT_PUBLIC_WEBGL_INDICATORS=1` exercises real GL candle + indicator backends; price-pane mount logs validation report; no runtime GL errors; Canvas fallback and overlays unchanged | **Passing** | **App-level:** confirmed complete per user direction; **Focused:** 45 webgl/layer tests pass in jsdom (Canvas fallback) | `packages/chart-react/src/engine/webgl/webglBrowserValidation.ts`, `candleWebGL.ts`, `indicatorWebGL.ts`, `layers.ts`, `canvas.tsx`, `.env.example` |
| Drawing sync across layout cells | Drawing add/update/delete/visibility propagates across linked layout cells with stable IDs when `linkDrawings` is enabled; layout persistence round-trips synced state | **Passing** | **Focused:** `chartConfig.link.test.ts` + `ChartSyncContext.test.tsx` passed (20 tests); **Build:** `npm run build:packages` passed | `src/lib/chartConfig.ts`, `ChartSyncContext.tsx`, `StockApp.tsx`, `ChartCell.tsx`, `ChartLayoutMenu.tsx`, `packages/chart-react/src/EdgeChart.tsx`, `chartConfig.link.test.ts` |
| Options sidebar panel + AI read tools | Active-chart scoped Options panel shows expirations/chain for focused symbol with provenance badge; pin expiration adds vertical_line drawing; read-only `get_options_expirations` / `get_options_chain` tools in registry | **Passing** | **Focused:** 21 tests passed (registry, OptionsPanel, pinExpirationDrawing, marketData tools, execute); **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests) | `src/app/components/sidebar/panels/OptionsPanel.tsx`, `src/lib/options/`, `src/app/components/sidebar/registry.tsx`, `src/lib/ai/tools/marketData.ts`, `src/lib/ai/marketDataPort.ts`, `src/lib/chartConfig.ts` |
| IBKR market data performance | Watchlist quotes load via batched IBKR snapshots with partial Yahoo fill-in; live smd stream for watchlist; options expirations/ATM chain via secdef-first resolver; greek fields 7308–7311 | **Passing** | **Focused:** 57 tests passed; **Fast:** `check:startup` passed (26); **Live:** `ibkr:probe` + `ibkr:options-probe` passed | `src/lib/marketData/providers/ibkr/*`, `src/lib/marketData/stream/*`, `WatchlistPanel.tsx`, `OptionsPanel.tsx`, `.env.example` |
| Risk ruler core (equity MVP) | Array-based `TradeSetup` with Zod validation, pure position-size/R-multiple compute, and `risk_ruler` DrawingPlugin (entry/stop + default 1R/2R/3R targets) | **Passing** | **Focused:** 13 tests passed (`packages/chart-core/src/risk/*`); **Build:** `npm run build:packages` passed | `packages/chart-core/src/risk/*`, `packages/chart-core/src/drawings/risk_ruler.ts`, `DrawingToolbar.tsx`, `toolGroups.ts` |
| Options risk ruler presets via OptionsPanel | Preset buttons in OptionsPanel create pre-filled `risk_ruler` drawings for Long Call, Bull Call Spread, Bear Put Spread, and Iron Condor using current spot price as entry | **Passing** | **Focused:** 20 tests passed (`riskRulerPreset.test.ts`, `OptionsPanel.test.tsx`, `riskValidation.test.ts`); **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests) | `src/lib/risk/createRiskRulerPreset.ts`, `src/lib/options/riskRulerPreset.test.ts`, `src/app/components/sidebar/panels/OptionsPanel.tsx`, `packages/chart-core/src/risk/riskTypes.ts`, `packages/chart-core/src/risk/riskValidation.ts` |
| Options risk ruler chain-derived presets | Preset buttons use real loaded options chain contracts, preview selected legs, and create risk rulers with chain-derived max loss/profit/breakevens | **Passing** | **Focused:** 34 tests passed (`riskRulerPreset.test.ts`, `OptionsPanel.test.tsx`, `riskValidation.test.ts`); **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests) | `src/lib/risk/optionPresetChain.ts`, `src/lib/risk/createRiskRulerPreset.ts`, `src/lib/options/riskRulerPreset.test.ts`, `src/app/components/sidebar/panels/OptionsPanel.tsx`, `docs/PROJECT-STATUS.md` |
| TWS market data performance | Fresh chart loads use health-aware TWS-first routing with fast fallback (3s candle/quote timeouts + circuit breaker); sidecar priority lanes + persistent quote subscriptions; overlays deferred after candle paint | **Passing** | **Focused:** 117 market-data tests passed; **Fast:** `check:startup` passed (26); **Live:** `tws:probe` + `tws:options-probe` passed; **Collection:** `perf:market-data` passed with 260 ms cold TWS candles and 0 ms hot revisit | `src/lib/marketData/providers/tws/healthGate.ts`, `src/lib/marketData/providers/tws/client.ts`, `src/lib/marketData/service/marketDataService.ts`, `services/tws-sidecar/main.py`, `src/lib/chartDataFeed/useChartOverlays.ts`, `src/lib/chartDataFeed/apiChartDataFeed.ts`, `.env.example` |
| Hot data architecture | Watchlist quotes, active chart candles, and active-symbol options are warmed ahead of UI reads and served stale-while-revalidate from in-process hot store + app-level coordinator | **Passing** | **Focused:** hotStore + marketDataService 33 tests passed; chartDataFeed 24 tests passed; stream 2 tests passed; WatchlistPanel + OptionsPanel tests passed after fix; **Fast:** `npm run check:startup` passed (26 tests) | `src/lib/marketData/hotStore.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/app/components/MarketDataProvider.tsx`, `services/tws-sidecar/main.py`, `src/lib/chartDataFeed/`, `src/app/components/watchlist/`, `src/app/components/sidebar/panels/OptionsPanel.tsx` |
| Market data performance snapshots | Dev telemetry exports correlated trace snapshots for chart candles, watchlist quotes, warmup, options, cache tier, and provider routing with repeatable baseline JSON + report | **Passing** | **Focused:** 42 routing tests passed; **Collection:** `npm run perf:market-data` → warmup 309 ms / watchlist 825 ms / cold chart 184 ms (`docs/perf/market-data-baseline-2026-06-26T02-11-28-095Z.json`); **Fast:** `npm run lint:instructions` passed | `src/lib/marketData/telemetry/`, `scripts/run-market-data-perf.mts`, `docs/perf/market-data-performance.md` |
| Market data first-paint performance | Warmup preloads expirations only; IBKR auth probe skips unauthenticated hops; partial hot quote serve + TWS stream fill-in; Gateway status probe opens circuit before slow TWS attempts | **Passing** | **Focused:** 42 tests passed; **Collection:** `npm run perf:market-data` passed (warmup 6518→309 ms, watchlist 2581→825 ms); **Fast:** `npm run lint:instructions` passed | `src/lib/marketData/service/marketDataService.ts`, `src/lib/marketData/providers/ibkr/healthGate.ts`, `src/lib/marketData/stream/twsQuoteStreamSession.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| Watchlist TradingView visual parity | Right rail and watchlist panel visually align with TradingView reference; left drawing rail shares unified slim icon-rail styling | **Passing** | **Focused:** 24 watchlist/sidebar tests + 12 rail/layout tests passed; **Fast:** `npm run check:startup` passed (26 tests) | `DrawingToolbar.tsx`, `DrawingToolGroup.tsx`, `toolbarButtonStyles.ts`, `SidebarRail.tsx`, watchlist components |
| Edge design system | Shared Edge tokens and UI primitives keep chart chrome, sidebars, menus, and modals visually consistent with reference screenshots | **Passing** | **Focused:** 37 tests passed (`edge.test.ts`, `styles.test.ts`, context menu, settings, watchlist, chart header); **Fast:** `npm run check:startup` passed (26 tests) | `src/lib/design-system/edge.ts`, `src/app/globals.css`, `src/app/components/design-system/`, `ContextMenu.tsx`, `IndicatorPicker.tsx`, `ChartSettingsModal.tsx`, `WatchlistSearch.tsx` |
| TradingView visual parity pass | Chart chrome, canvas styling, rails, Object Tree/Data Window, and bottom range bar visually align with TradingView reference screenshots | **Passing** | **Focused:** 31 tests passed (edge, styles, ObjectTreePanel, SidebarRail, EdgeChart, chartSettings); **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests); **App-level:** manual screenshot comparison recommended against TV reference | `src/lib/design-system/edge.ts`, `src/app/globals.css`, `src/app/components/chart-chrome/`, `ChartRangeBar.tsx`, `ObjectTree.tsx`, `packages/chart-react/src/components/PaneLegendBar.tsx`, `packages/chart-react/src/engine/renderer.ts`, `packages/chart-core/src/themeTokens.ts` |
| Chart architecture cleanup | Package chart runtime is canonical; legacy `src/lib/chart` engine paths are compatibility re-exports; oversized `EdgeChart` / `ChartCell` split through behavior-preserving controllers and hooks | **Passing** | **Focused:** 123 tests passed (package engine + EdgeChart + ChartCell + ActiveChart + AI); **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests) | `packages/chart-react/src/drawing/useDrawingController.ts`, `packages/chart-react/src/createEdgeChartHandle.ts`, `packages/chart-react/src/engine/`, `src/lib/chart/`, `src/app/components/chart-cell/`, `ActiveChartContext.tsx`, `src/lib/ai/tools/_helpers.ts` |
| App console/build overlay cleanup | App loads without the range-preset export build overlay; optional persistence and unavailable options providers no longer emit server-error stacks during local fallback flows | **Passing** | **Focused:** 19 tests passed (range preset + options route + persistence route smoke); **App-level:** refreshed dev app and confirmed `Stock Charts` loads | `packages/chart-react/src/engine/rangePresetTransition.ts`, `src/app/api/options/expirations/route.ts`, `src/lib/persistence/server/routeHelpers.ts` |
| Event badge overlay strategy | Corporate, filing, macro, news, and options expiration overlays render as grouped bottom-axis badges; hover/selected badges may show guides; dense news/options feeds are disabled by default and opt in through chart settings | **Passing** | **Focused:** 22 event/settings/feed tests passed; **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests); **App-level:** compact badges, badge detail card, and Settings → Events defaults/toggle verified in browser | `packages/chart-react/src/engine/eventBadges.ts`, `packages/chart-react/src/engine/renderer.ts`, `src/app/components/EdgeChart.tsx`, `src/app/components/ChartSettingsModal.tsx`, `src/lib/chartDataFeed/` |
| Watchlist organization + resizable side panels | Watchlist rows support pin/tag/note organization with filter chips, column picker, sorting, and tag/sector grouping; Watchlist/Object Tree/Options panels share a draggable left-edge resize handle with per-panel persisted widths | **Passing** | **Focused:** 68 tests passed (watchlist storage/viewModel/panel, sidebar shell, layout storage, chart workspace schema, sidebar width); **Fast:** `npm run check:startup` passed (26 tests) | `src/lib/watchlist/`, `src/app/components/watchlist/`, `src/app/components/sidebar/SidebarPanelShell.tsx`, `src/lib/chartConfig.ts`, `src/lib/layoutStorage.ts`, `src/lib/responsive/sidebarWidth.ts` |
| Event overlay data + bottom rail | Corporate events fetch/filter correctly; event badges render in a reserved bottom rail grouped by date with expandable detail list instead of stacking through candles | **Passing** | **Focused:** 57 tests passed (FMP adapter/mappers, apiChartDataFeed, eventBadges, marketDataService.events, /api/events); **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests) | `src/lib/marketData/providers/fmp/adapter.ts`, `src/lib/chartDataFeed/apiChartDataFeed.ts`, `packages/chart-core/src/layout.ts`, `packages/chart-react/src/engine/eventBadges.ts`, `packages/chart-react/src/engine/renderer.ts`, `packages/chart-react/src/components/EventDetailCard.tsx` |

## Task Contract — Event overlay data + bottom rail

- **Status:** Complete — row marked **Passing** 2026-06-26.
- **Delivered:** FMP corporate calendar passes `from`/`to`, validates row-level symbol, date-only events map to noon UTC; reserved `EVENT_RAIL_HEIGHT` strip; horizontal proximity grouping with count badges; grouped event detail card with date header.
- **Verification:** focused event/market-data/chart tests + `npm run build:packages` + `npm run check:startup` passed.

## Task Contract — Watchlist organization + resizable side panels

- **Status:** Complete — row marked **Passing** 2026-06-26.
- **Delivered:** Extended watchlist item metadata (`pinned`, `tags`, `note`) and per-list view prefs; added derived view model for grouping/filtering/sorting; watchlist controls UI; symbol note editor in details panel; shared sidebar resize handle with keyboard support; persisted `sidebar.panelWidths` in chart layout.
- **Verification:** focused watchlist/sidebar/layout tests + `npm run check:startup` passed.

## Task Contract — Event badge overlay strategy

- **Status:** Complete — row marked **Passing** 2026-06-26.
- **Delivered:** Replaced noisy default full-height event rendering with grouped bottom-axis badges; preserved hover/selection guide affordances and click detail cards; wired app `EdgeChart` to derive `eventKinds` from per-cell settings; added Settings modal toggles for earnings, dividends, splits, SEC filings, macro events, news, and dense options expirations.
- **Verification:** focused badge/settings/feed tests + `npm run build:packages` + `npm run check:startup` passed; browser compact badge rendering, badge detail card, and Settings → Events defaults/toggle verified.

## Task Contract — Chart architecture cleanup

- **Status:** Complete — row marked **Passing** 2026-06-26.
- **Delivered:** Canonical `@edge/chart-react` / `@edge/chart-core` runtime; legacy `src/lib/chart` engine files converted to re-exports; engine tests moved to `packages/chart-react/src/engine/`; extracted `useDrawingController`, `createEdgeChartHandle`, `paneRenderer`/`paneGesture`; extracted `ChartCell` hooks/dialogs; ActiveChart bridge split + throttled registration; AI tool helpers deduped.
- **Verification:** focused tests + `npm run build:packages` + `npm run check:startup` passed.

## Task Contract — TradingView visual parity pass

- **Status:** Complete — row marked **Passing** 2026-06-26.
- **Delivered:** TradingView-aligned dark palette (`#131722` chart surface); subtler grid (18% opacity); tighter viewport margins; legend/price-badge polish; header symbol pill; Object Tree `EdgeSegmentedTabs` + token migration; range bar styling; rail active-state rings.
- **Verification:** focused tests + `npm run build:packages` + `npm run check:startup` passed.

## Task Contract — Edge design system

- **Status:** Complete — row marked **Passing** 2026-06-26.
- **Delivered:** Edge token module + CSS variables; `Edge*` primitive layer; converted context menu, modals, indicator picker, settings, symbol search.
- **Verification:** focused tests + `npm run check:startup` passed.

## Session Log

Append one entry before handing off long-running or interrupted work. Keep the current state above short and authoritative; keep historical detail here.

### 2026-06-26 — Event overlay data + bottom rail

- **Goal:** Fix incorrect split-only event data and stop event badges from stacking through the price chart.
- **Completed:** FMP corporate calendars pass date bounds and filter cross-symbol rows; date-only events align to noon UTC; `EVENT_RAIL_HEIGHT` reserved between plot and time axis; badges cluster by screen proximity with count glyphs; detail card shows grouped events with date header.
- **Verification run:** **Focused:** 57 tests passed; **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests).
- **Next best step:** Phase 2 workflow panels (corporate events, news, fundamentals, macro).

### 2026-06-26 — Watchlist organization + resizable side panels

- **Goal:** Ship first-batch watchlist organization (pins, tags, notes, filters, columns, sorting, grouping) and horizontal resize for all right sidebar panels.
- **Completed:** Extended watchlist schema/storage with `pinned`, `tags`, `note`, and per-list `viewPrefs`; added pure view-model helpers; watchlist controls UI with group modes, column picker, filter chips, and sort toggles; row actions for pin/tags; note editor in details panel; shared `SidebarResizeHandle` with drag + keyboard resize; persisted per-panel widths in `sidebar.panelWidths`.
- **Verification run:** **Focused:** 68 tests passed; **Fast:** `npm run check:startup` passed (26 tests).
- **Next best step:** Phase 2 workflow panels (corporate events, news, fundamentals, macro).

### 2026-06-26 — Event badge overlay strategy

- **Goal:** Finish TradingView-style event badges so dense event feeds no longer flood charts with full-height vertical lines.
- **Completed:** Wired app `EdgeChart` to pass `eventKinds` from `eventKindsFromChartSettings`; added chart Settings → Events toggles; added coverage for event defaults, SPY/AAPL macro gating, API fetch suppression for excluded news/options expirations, and modal persistence; updated chart architecture and feature inventory docs.
- **Verification run:** **Focused:** 22 tests passed across badge/settings/feed coverage; **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests); **App-level:** loaded the dev app, confirmed compact bottom badges without full-height line spam, clicked a badge to open the detail card with a transient guide, opened Settings → Events, confirmed News and Options expirations are unchecked by default, toggled Options expirations on, then cancelled without saving.
- **Next best step:** App-level browser check with a dense options symbol when convenient: default badges should omit options expirations, then show grouped option badges after enabling Options expirations in Settings.

### 2026-06-26 — Chart architecture cleanup

- **Goal:** Make package chart code canonical, eliminate duplicate engine drift, and shrink `EdgeChart` / `ChartCell` through behavior-preserving extractions without regressions.
- **Completed:** Converted duplicate `src/lib/chart` engine modules to `@edge/chart-react` / `@edge/chart-core` re-exports; moved engine tests to `packages/chart-react/src/engine/`; added vitest `@edge/chart-react/*` alias; extracted `useDrawingController`, `createEdgeChartHandle`, `paneGesture`, `paneRenderer`; extracted `useDrawingLayoutSync`, `useRegisterActiveChart`, `ChartCellDialogs`; tightened ActiveChart bridge (stable command refs + dataWindow-only throttle); added `src/lib/ai/tools/_helpers.ts`.
- **Verification run:** **Focused:** 123 tests passed across package engine, EdgeChart, ChartCell, ActiveChart, AI tools; **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests).
- **Next best step:** Phase 2 workflow panels (corporate events, news, fundamentals, macro).

### 2026-06-26 — App console/build overlay cleanup

- **Goal:** Fix the live dev app build overlay and reduce console/server noise from unavailable local services.
- **Completed:** Restored `applyRangePresetSelect` in the canonical package range-preset module; options expirations now return empty data with warnings when providers are unavailable; persistence auth catches DB connection refusal and returns the unavailable contract instead of throwing a stack.
- **Verification run:** **Focused:** 19 tests passed across range preset, options route, and persistence route smoke; **App-level:** refreshed `http://localhost:3003/` and confirmed `Stock Charts` loads.
- **Known local condition:** Configured Postgres is still unavailable locally, so `/api/me/*` correctly returns the fallback `503` contract until `npm run db:up` / migrations are run.

### 2026-06-26 — TradingView visual parity pass

- **Goal:** Bring Edge web app visually closer to TradingView reference screenshots — chart chrome, canvas, rails, Object Tree/Data Window, and bottom range bar.
- **Completed:** Updated dark Edge tokens to TradingView `#131722` palette; system font stack; subtler grid (18% opacity) and tighter viewport margins; polished header symbol pill, pane legend, price-axis badges, range bar, and rail active states; migrated Object Tree to `EdgeSegmentedTabs` and `--edge-*` tokens; aligned `themeTokens.ts` and renderer typography.
- **Verification run:** **Focused:** 31 tests passed; **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests).
- **Next best step:** Phase 2 workflow panels (corporate events, news, fundamentals, macro).

### 2026-06-26 — Edge design system

- **Goal:** Code-backed Edge design system with typed tokens, CSS variables, reusable primitives, and converted high-traffic surfaces.
- **Completed:** Renamed `tradingView` → `edge` token module; migrated `--tv-*` → `--edge-*` CSS variables and utility classes; added `EdgeButton`, `EdgeIconButton`, `EdgeMenuItem`, `EdgeModalShell`, `EdgeSearchInput`, `EdgeSegmentedTabs`, `EdgeToggle`, `EdgePanelHeader`, `EdgeEmptyState`; converted `ContextMenu`, `IndicatorPicker`, `ChartSettingsModal`, `ChartQuickSearchModal`, `WatchlistSearch`, `ObjectTreePanel`.
- **Verification run:** **Focused:** 37 tests passed; **Fast:** `npm run check:startup` passed (26 tests).
- **Next best step:** Phase 2 workflow panels (corporate events, news, fundamentals, macro).

Append one entry before handing off long-running or interrupted work. Keep the current state above short and authoritative; keep historical detail here.

### 2026-06-25 — Watchlist TradingView visual parity

- **Goal:** Match TradingView watchlist aesthetic — slimmer right rail, tighter icon spacing, denser table rows, selected-row outline, refined details panel.
- **Completed:** Reduced rail width 60→44px (compact 48→40px); added `sidebarRail*` button/icon helpers separate from left drawing toolbar; tightened watchlist header/table/row padding; TV-like selected row ring; inline price/change/currency in details panel; updated layout math tests.
- **Verification run:** **Focused:** 24 tests passed; **Fast:** `npm run check:startup` passed (26 tests).
- **Next best step:** Phase 2 workflow panels (corporate events, news, fundamentals, macro).

### 2026-06-25 — Market data first-paint performance

- **Goal:** Reduce startup and watchlist latency using live TWS baseline findings — defer cold options-chain warmup, skip unauthenticated IBKR hops, improve partial quote first paint, preserve Gateway-down fallback.
- **Completed:** Removed blocking `options.chain` from `primeMarketData`; added IBKR auth health gate + proactive auth probe; partial hot quote merge in `getQuotes`; TWS Gateway status probe before candle/quote attempts; TWS SSE stream missing-symbol fill-in; tests + architecture/perf doc updates.
- **Verification run:** **Focused:** 42 tests passed; **Collection:** `npm run perf:market-data` passed — warmup 309 ms (was 6518 ms), watchlist 825 ms (was 2581 ms), cold chart 184 ms; **Fast:** `npm run lint:instructions` passed.
- **Next best step:** Lazy-load options chain in Options panel; authenticated IBKR baseline after Client Portal login.

### 2026-06-25 — IB Gateway sidecar reconnect

- **Goal:** Reset the TWS sidecar after IB Gateway login and verify the local Gateway socket connection.
- **Completed:** Restarted `npm run tws:sidecar`; fixed the sidecar quote mapper to tolerate `ib_insync` ticker objects without a `change` attribute.
- **Verification run:** **Live:** `npm run tws:probe` passed (Gateway connected on `127.0.0.1:4001`, AAPL contract resolved, 21 candles, quote batch completed); `npm run tws:options-probe` passed (25 AAPL expirations, 20 contracts for nearest expiry); **Collection:** `npm run perf:market-data` passed and saved `docs/perf/market-data-baseline-2026-06-26T02-03-39-189Z.json`.
- **Key findings:** Cold AAPL 1y candles improved to 260 ms via TWS; warm revisit and hot options reads were 0 ms; watchlist cold quote batch was 2581 ms mixed TWS/Yahoo due to one missing TWS symbol plus IBKR 401; cold options-chain warmup dominated at 6080 ms.
- **Note:** Some off-hours quote and option fields are still null/partial, but the Gateway connection and TWS data paths are working.

### 2026-06-25 — Market data performance snapshots

- **Goal:** Collect correlated market-data performance snapshots across client, API, service, cache, and provider layers to diagnose slow loads.
- **Completed:** Extended telemetry with trace IDs, scenario grouping, trace summaries, JSON export; API route + `MarketDataService` phase metadata; client trace propagation; `npm run perf:market-data`; report at `docs/perf/market-data-performance.md`.
- **Verification run:** **Focused:** 50 tests passed; **Collection:** `npm run perf:market-data` succeeded (TWS/IBKR unavailable — fallback paths captured); **Fast:** `npm run check:startup` passed (26 tests).
- **Key findings:** Cold chart load ~3.5s dominated by TWS 3s timeout when Gateway down; warm revisit ~264ms; watchlist 10 symbols ~1s cold; options fail without IBKR auth.
- **Next best step:** Health-aware skip before TWS timeout; serve hot Yahoo immediately when brokers configured; re-run baseline with IB Gateway + Client Portal authenticated.

### 2026-06-25 — Hot data architecture

- **Goal:** Eliminate visible cold loading for watchlist quotes, chart candles, and active-symbol options via in-process hot store and app-level warmup/quote stream.
- **Completed:** Added `HotStore` with stale-while-revalidate reads in `MarketDataService`; `MarketDataProvider` for quote SSE + prefetch from `StockApp`; cache-first chart feed; options prewarm on active symbol; sidecar `/warmup` retains quote subscriptions; fixed WatchlistPanel + OptionsPanel test regressions.
- **Verification run:** **Focused:** hotStore + marketDataService 33 tests passed; chartDataFeed 24 tests passed; stream 2 tests passed; WatchlistPanel + OptionsPanel tests passed after fix; **Fast:** `npm run check:startup` passed (26 tests).
- **Next best step:** Corporate events / news / fundamentals / macro workflow panels (Phase 2); live Gateway login for instant-revisit validation when IB Gateway paper is available on port 4002.

### 2026-06-25 — TWS market data performance

- **Goal:** Bound fresh chart load latency when TWS/Gateway is slow or unavailable; reduce sidecar contention and overlay-induced delays.
- **Completed:** Added `TwsHealthGate` circuit breaker; chart-critical `TWS_CANDLES_TIMEOUT_MS` / `TWS_QUOTES_TIMEOUT_MS` (default 3s); health-aware routing in `MarketDataService`; sidecar priority job queue, `/warmup`, persistent quote subscriptions; deferred overlay fetch + sequential options-expiration enrichment.
- **Verification run:** **Focused:** 117 market-data tests passed; **Fast:** `npm run check:startup` passed (26 tests).
- **Next best step:** Live Gateway login → confirm healthy TWS chart load and fast fallback when Gateway is stopped.

### 2026-06-25 — TWS market data provider migration

- **Goal:** Add IB Gateway/TWS market-data path via local Python sidecar; prefer TWS over Client Portal when configured; preserve Yahoo/FMP gap-fill providers.
- **Completed:** Python sidecar (`services/tws-sidecar/`) with dedicated IB worker thread; TypeScript `tws` provider + TWS-first routing in `MarketDataService`; quote SSE stream session; diagnostic `/api/market-data/tws/*` routes; `tws:probe` / `tws:options-probe` scripts; env + architecture docs.
- **Verification run:** **Focused:** 108 market-data tests passed; **Fast:** `npm run check:startup` passed (26 tests); **Live:** sidecar `/health` + `/status` OK; `tws:probe` correctly reports sidecar reachable + Gateway disconnected without IB Gateway on 4002.
- **Next best step:** IB Gateway paper login → `npm run tws:sidecar` → `npm run tws:probe` → `npm run tws:options-probe`.

### 2026-06-25 — Options risk ruler chain-derived presets

- **Goal:** Connect risk ruler presets to real options chain data — auto-select legs, preview selection, compute premiums from bid/ask/mark.
- **Completed:** Added `optionPresetChain.ts` with conservative leg pricing and auto-selection for all four strategies; extended `createRiskRulerPreset.ts` with chain-derived setup builder and `chainDerived` metadata; OptionsPanel shows leg preview per preset, disables invalid chain selections, and falls back to spot estimates when chain is empty; 34 focused tests pass.
- **Verification run:** **Focused:** 34 tests passed; **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests).
- **Next best step:** Floating risk panel UI, manual leg selection from chain table, or payoff diagram overlay.

### 2026-06-25 — Options risk ruler presets via OptionsPanel

- **Goal:** Add preset buttons in OptionsPanel that overlay a pre-filled `risk_ruler` on the active chart for common options setups using current spot as entry.
- **Completed:** Extended `TradeSetup` with optional `instrument`, `setupType`, `legs`, `maxLoss`, `maxProfit`, `breakevens`; added `createRiskRulerPreset.ts` builder for Long Call, Bull Call Spread, Bear Put Spread, Iron Condor; wired Quick risk ruler preset grid in OptionsPanel with `onConfigChange` + `restoreDrawings` flow; focused tests for builder + panel integration.
- **Verification run:** **Focused:** 20 tests passed; **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests).
- **Next best step:** Floating risk panel UI, chain-derived strike/premium selection, or payoff diagram overlay.

### 2026-06-25 — Risk ruler core (equity MVP)

- **Goal:** Ship core position-sizing / R-multiple ruler — composable `TradeSetup` model, Zod validation, pure compute, and `risk_ruler` DrawingPlugin skeleton.
- **Completed:** Added `packages/chart-core/src/risk/{riskTypes,riskCompute,riskValidation,riskDrawing}.ts`; registered `risk_ruler` drawing plugin with entry/stop geometry, default 1R/2R/3R targets, shaded risk zone, and summary labels; toolbar icon + button wiring.
- **Verification run:** **Focused:** 13 tests passed; **Build:** `npm run build:packages` passed.
- **Next best step:** Floating risk panel UI, click-to-add explicit target points, or options payoff extension.

### 2026-06-25 — IBKR market data performance & reliability

- **Goal:** Fix slow watchlist quotes (~15s for 17 symbols), slow/unreliable IBKR options, and add live smd watchlist stream per plan (IBKR-only options; no Tradier fallback).
- **Completed:** Request throttle (8 req/s); contract cache + secdef-first resolver; allowlist fix for `/iserver/accounts`; batch `getMarketSnapshots`; greek fields 7308–7311; partial quote batch with Yahoo fill-in; `extractOptionMonths` FRO fix; ATM-first options chain + OptionsPanel "Load all strikes"; IBKR WebSocket `smdSession` + quote stream adapter; `useWatchlistQuoteStream` hook; architecture + harness updates.
- **Verification run:** **Focused:** 57 tests passed; **Fast:** `npm run check:startup` passed (26 tests); **Live:** `ibkr:probe` (~11s AAPL quote/candles) + `ibkr:options-probe` (~37s AAPL 26 expirations + 94-contract chain) passed.
- **Next best step:** Bar Replay persistence or Phase 2 workflow panels (corporate events, news, fundamentals, macro).

### 2026-06-24 — Options sidebar panel + AI read tools

- **Goal:** Ship Phase 2 options workflow — active-chart scoped sidebar panel with expirations/chain viewer, pin-to-chart action, and read-only AI tools.
- **Completed:** Extended `SidebarPanelId` with `options`; registered panel in sidebar registry; created `OptionsPanel` (expirations chips, chain table, pin expiration via vertical_line drawing, add-another select); `optionsClient` + `pinExpirationDrawing` helpers; extended `MarketDataPort` + `get_options_expirations` / `get_options_chain` tools; focused tests (21 passed); build + check:startup passed.
- **Verification run:** `npm run build:packages` passed; focused options tests passed (21); `npm run check:startup` passed (26 tests).
- **Next best step:** Corporate events / news / fundamentals / macro workflow panels, or Bar Replay persistence.

### 2026-06-24 — Drawing sync across layout cells

- **Goal:** Propagate drawing mutations across linked layout cells with `linkDrawings` toggle, runtime broadcast, and persistence round-trip.
- **Completed:** Added `linkDrawings` to `LayoutSyncPrefs` + layout menu; extended `applyLinkPropagation` with `pickLinkDrawingFields`; extended `ChartSyncContext` with drawing broadcast/subscribe; wired `ChartCell` persist + peer restore with loop guard; updated package `EdgeChart` external drawing hydration; AI `set_linked_mode` + persistence schema; focused tests (20 passed); WebGL validation marked **Passing** per user; indicator batch marked deferred/skipped on roadmap.
- **Verification run:** `npm run build:packages` passed; `npm test -- --run src/lib/chartConfig.link.test.ts src/app/components/ChartSyncContext.test.tsx` passed (20 tests).
- **Next best step:** Persist Bar Replay position in `CellConfig` or next post-V1 polish from [chart/features.md](./chart/features.md).

### 2026-06-24 — WebGL validation + drawing sync planning

- **Goal:** Plan two post-V1 charting tasks: live browser WebGL validation and drawing sync across layout cells.
- **Completed:** Roadmap plan with Task Contracts, file paths, verification tiers, and WIP=1 sequencing (WebGL first, drawings second); harness updated with two Pending Active Work rows.
- **Next best step:** Start live browser WebGL validation — copy flags from `.env.example` to `.env.local`, run `npm run dev`, load multi-pane chart, capture console validation report.

### 2026-06-24 — Crosshair time-lock toggle bug

- **Goal:** Fix the blank-chart context menu toggle so "Lock vertical cursor line by time" changes crosshair X behavior.
- **Completed:** Replaced crosshair snap semantics with fixed-X lock semantics: default unchecked, toggle ON captures `lockedCrosshairPlotX`, canvas ignores mouse X while locked, toggle OFF clears the stored X, and context-menu hover suppresses crosshair updates.
- **Verification run:** `npm run build:packages` passed; `npm test -- --run packages/chart-react/src/engine/canvas.test.tsx src/app/components/chartContextMenu.test.ts src/lib/chart/crosshair.test.ts` passed (36 tests); `npm run check:startup` passed (26 tests). `ReadLints` reported one pre-existing Tailwind shorthand warning in `ChartCell.tsx`.
- **Next best step:** Manual browser retest: open a chart, confirm the menu is unchecked by default, move crosshair, right-click blank chart area, toggle lock on, move the mouse and confirm the vertical line stays fixed, right-click again and toggle off, then confirm free cursor-follow resumes.

### 2026-06-24 — Granular layout sync

- **Goal:** Replace single `linked` boolean with independent symbol, interval/range, and crosshair sync toggles.
- **Completed:** `linkSymbol`, `linkInterval`, `linkCrosshair` on `ChartLayout`; `applyLinkPropagation` + `migrateLayoutSync`; layout menu toggles; `ChartSyncProvider` gated on `linkCrosshair`; AI `set_linked_mode` supports granular flags; Postgres snapshot schema preprocess migration.
- **Verification run:** 43 focused layout/sync tests passed; `npm run check:startup` passed (25 tests).
- **Next best step:** Declarative indicator batch 3 or live-browser WebGL validation.

### 2026-06-24 — Declarative indicator batch 2

- **Goal:** Enable DMI (+DI/-DI/ADX), Williams %R, ROC, and Supertrend through the declarative `IndicatorPlugin` contract.
- **Completed:** Math helpers (`computeDmi`, `computeWilliamsR`, `computeRoc`, `computeSupertrend`); four new plugins + Supertrend catalog entry; `batch2.test.ts`; catalog test count updated (30 catalog / 15 implemented).
- **Verification run:** 10 batch tests + 3 catalog tests + package API snapshot passed; `npm run build:packages` passed.
- **Next best step:** Granular layout sync; optional live-browser WebGL validation.

### 2026-06-24 — Context menu polish

- **Goal:** Close remaining P2 blank-chart context-menu parity: ⌥R shortcut label, crosshair lock toggle, combined bulk remove, doc sync.
- **Completed:** Reset menu item shows `getShortcutLabel("resetChartView")`; blank menu toggle for `lockCrosshairToTime` (persisted in `chartSettings.canvas`); combined "Remove drawings and indicators" action; canvas respects lock setting; updated `context-menu-reference.md` and `features.md` price-axis/blank-menu rows.
- **Verification run:** 40 focused context-menu tests passed (5 files); `npm run build:packages` passed; `npm run lint:instructions` + `npm run check:startup` passed.
- **Next best step:** Declarative indicator batch 2 (ADX/DMI, WR, ROC, Supertrend).

### 2026-06-24 — Declarative indicator batch 1 + WebGL flag validation

- **Goal:** App-level WebGL flag validation; enable VWAP, ATR, KDJ (stochastic), CCI, OBV through the declarative `IndicatorPlugin` contract.
- **Completed:** Math helpers (`computeVwap`, `computeAtr`, `computeStochastic`, `computeCci`, `computeObv`); five new plugins + catalog entries (VWAP, ATR); `batch1.test.ts`; example ResizeObserver setup fix for Next typecheck collision; package API snapshot updates.
- **Verification run:** 24 WebGL-focused tests with `NEXT_PUBLIC_WEBGL_*=1` (jsdom Canvas fallback); 964 Vitest tests passed; `npm run build:packages` + `npm run check:packages` passed. Live browser WebGL GL path not exercised in CI.
- **Note:** Build/typecheck fixes applied in follow-up (`marketIntervalSchema` → `Interval`, `ObjectTree` param order, `marketData/index.ts` paths, assorted market-data strictness).
- **Next best step:** Context menu polish; batch 2 studies (ADX/DMI, WR, ROC, Supertrend).

### 2026-06-24 — Percept Stages 5–6 (WebGL validation, indicators, overlays)

- **Goal:** Validate WebGL candle path in browser/dev, extend WebGL to declarative indicator lines/histograms, and flesh out Stage 6 typed overlay channels.
- **Completed:** `webglBrowserValidation.ts` dev report + console logging; `IndicatorWebGLRenderer` + shared `seriesGeometry.ts`; `createIndicatorsLayer` / `registerWebGLIndicatorsLayer`; overlay mappers + merged events (registry + news + options expirations), priced reference lines, annotation channel from drawing metadata; `drawAnnotationMarkers` on Canvas.
- **Verification run:** 45 focused webgl/layer/overlay tests passed; `npm run build:packages` passed; `npm run check:startup` passed (22 tests).
- **Next best step:** App-level browser validation with `NEXT_PUBLIC_WEBGL_CANDLES=1` + `NEXT_PUBLIC_WEBGL_INDICATORS=1`; optional perf baseline re-run.

### 2026-06-24 — WebGL2 Candle Proof (Stage 5)

- **Goal:** Scoped WebGL2 backend for main-pane OHLC geometry behind the existing `ChartLayer` contract; Canvas fallback when GL unavailable; event/reference overlays stay Canvas.
- **Completed:** `CandleWebGLRenderer` + typed-array geometry path; `createCandlesLayer` / `registerWebGLCandlesLayer`; offscreen WebGL blit into 2D pane canvas; `NEXT_PUBLIC_WEBGL_CANDLES` dev flag; architecture doc updated.
- **Verification run:** 28 focused layer/webgl/scheduler/chart tests passed; `npm run check:startup` passed (22 tests). Perf baseline re-run not required for proof (no mandated improvement vs p95 ~840ms / 80% dropped frames).
- **Next best step:** Browser validation with `NEXT_PUBLIC_WEBGL_CANDLES=1`; optional `npm run perf:chart` comparison when WebGL enabled.

### 2026-06-24 — Renderer-Layer Boundary

- **Goal:** Formalize chart draw phases into an explicit layer contract with invalidation metadata, preparing for future WebGL backends.
- **Completed:** `LayerRegistry` + `ChartLayer` types; six ordered Canvas layers (background, grid, candles, indicators, drawings, axes); `canvas.tsx` draw loop refactored to iterate registry; shared invalidation sets in `renderScheduler.ts`; architecture doc updated.
- **Verification run:** 17 focused layer/scheduler/chart tests passed; `npm run check:startup` passed (22 tests).
- **Next best step:** Scoped WebGL candle proof for main-pane candles only.

### 2026-06-24 — FMP Premium Macro Events

- **Goal:** Wire FMP Premium economic-calendar into the registry-driven event system with full macro cards, FRED fallback, probe upgrades, and benchmark chart macro pins.
- **Completed:** `getEconomicCalendar()` adapter; FMP macro name mapping + normalizer; `getMarketEvents()` FMP-first macro routing with dedupe over FRED; upgraded `fmp:gap-probe` and `events:coverage-probe`; benchmark/index macro pins in `apiChartDataFeed`.
- **Verification run:** 43 focused tests passed; `events:coverage-probe` macro required=5/5 fmpFull=14; `fmp:gap-probe` economic-calendar (3923 rows) + news unlocked; `check:startup` passed (22 tests).
- **Note:** FMP symbol-scoped earnings calendar still returns 400 on live probe — corporate/filing path unchanged; macro cards no longer depend on FRED when Premium calendar is available.

### 2026-06-24 — Event System Architecture

- **Goal:** Registry-driven normalized event layer for corporate, filing, and partial macro events with chart pin consumption and extensible provider slots.
- **Completed:** `MarketEvent` contract; canonical registry + provider mappings; FMP/SEC/FRED normalizers; dedupe/source ranking; `getMarketEvents()` service; `/api/events` filters; chart feed corporate/filing pin mapping; `events:coverage-probe`.
- **Verification run:** 29 focused event-system tests passed; `npm run check:startup` passed (22 tests).
- **Note:** Macro events are partial via FRED release metadata; dedicated economic-calendar provider slot reserved in registry.

### 2026-06-24 — Percept-Style Chart Platform

- **Goal:** Improve chart interaction rendering and introduce a Percept-style unified chart data-feed boundary with source/freshness metadata.
- **Completed:** Render invalidation scheduler + background layer cache; extended perf harness scenarios; `ChartDataFeed` contracts; `createApiChartDataFeed` + `useChartDataFeed` + `useChartOverlays`; app `EdgeChart` refactor; header/data-window source badge; event/reference-line overlay rendering.
- **Verification run:** `npm run check` passed (875 tests); `npm run check:startup` passed (22 tests); focused chart/data-feed tests passed. `npm run perf:chart` captured post-optimization baseline (interaction p95 ~840ms pan-zoom sample, 80% dropped frames; indicators-100k mount 2.61s; cache-key 215ms). Saved to chart-baseline-latest.json + timestamped file.
- **Next best step:** Renderer-layer boundary (formalize chart layers + invalidation rules for Canvas/WebGL).

### 2026-06-24 — FMP Gap-Fill Data Foundation

- **Goal:** Wire FMP only for datasets IBKR does not provide: profile, estimates, financials, executives, calendars, filings, movers.
- **Completed:** Normalized contracts + Zod schemas; expanded FMP adapter with restricted-endpoint warnings; service cache/routes under `/api/market-data/fmp/*`; news returns empty + 402 warning instead of 500.
- **Verification run:** 67 focused market-data tests passed; `npm run fmp:gap-probe` → `FMP_GAP_VALIDATION: 8/8`; `npm run check:startup` passed (22 tests).
- **Note:** FMP news endpoints remain subscription-blocked on current plan; IBKR still owns live quotes/candles/options.

### 2026-06-24 — IBKR Options Data

- **Goal:** Serve options expirations and chains from IBKR Client Portal with Tradier fallback; no UI changes.
- **Completed:** Read-only secdef client methods + allowlist; `optionsProvider.ts` normalization; IBKR-first routing in `MarketDataService`; YYYY-MM-DD request validation; focused tests; `npm run ibkr:options-probe`.
- **Verification run:** 46 focused tests passed; `npm run check:startup` passed (22 tests). `npm run ibkr:options-probe` → `LIVE_OPTIONS_VALIDATION: PASS` (23 AAPL expirations, 94 contracts for nearest expiry).
- **Note:** Full chain fetch iterates strikes sequentially (~25s for AAPL); bid/ask may be null off-hours.

### 2026-06-24 — IBKR Provider Routing

- **Goal:** Promote live-validated IBKR from probe endpoints into primary candle/quote routing with Yahoo fallback.
- **Completed:** IBKR-first `getCandles()` / `getQuotes()` in `MarketDataService`; per-provider cache keys; `getQuotes()` on IBKR adapter; optional `meta` on `/api/candles` and `/api/quotes`; focused routing tests.
- **Verification run:** IBKR provider tests 11 passed; service + API routing tests 27 passed; `npm run check:startup` passed (22 tests). `npm run ibkr:probe` failed — Gateway reachable but not logged in (expected daily 2FA).
- **Next best step:** Log in at `https://localhost:5001`, confirm `meta.source: "ibkr"` on chart load.

### 2026-06-24 — IBKR live end-to-end verification

- **Goal:** Confirm IBKR-first routing with authenticated Client Portal Gateway.
- **Verification run:** `npm run ibkr:probe` → `LIVE_VALIDATION: PASS` (authenticated, connected, AAPL contract/21 bars). POST `/api/candles` `{"symbol":"AAPL","range":"1mo","interval":"1d"}` → 21 candles, `meta.source: "ibkr"`. POST `/api/quotes` `{"symbols":["AAPL"]}` → `meta.source: "ibkr"`. `IBKR_ENABLED=true` in `.env.local`.
- **Note:** IBKR quote fields may be null off-hours; candles route validated.

### 2026-06-23 — Internal Package Boundary Work

- **Goal:** Separate reusable chart and AI modules from app-specific code while keeping Edge private.
- **Completed:** `check:examples`, browser/lifecycle React example, `chart-plugins-basic`, `ai-tools-chart` package and example, API export cleanup (`CellConfig` -> contracts), internal package validation.
- **Verification run:** `npm run check` passed (776 tests, `check:examples`, package boundaries, `typecheck:packages`, build).
- **Evidence captured:** Package workspaces, examples, API snapshots, startup harness docs, and package-boundary checks are present in the working tree.
- **Files or artifacts updated:** `packages/`, `examples/`, `scripts/`, `src/test/`, `AGENTS.md`, `docs/CONSTRAINTS.md`.
- **Known risk or unresolved issue:** The workspace package split adds maintenance surface; keep package checks only where they protect app boundaries.
- **Next best step:** Use the package/examples harness for internal regression coverage, not release preparation.

### 2026-06-23 — Project Status Harness

- **Goal:** Make `docs/PROJECT-STATUS.md` a reliable operational record instead of stale session notes.
- **Completed:** Added `Current Verified State`; converted `Session Continuity` into an append-only `Session Log`; moved stale chart-copy active work to passing; added project-status consistency checks to the instruction validator.
- **Verification run:** `npm run lint:instructions` passed; `npm run check:startup` passed (3 files, 22 tests).
- **Evidence captured:** Instruction architecture validation now checks exact `Last updated` dates, required current-state fields, stale placeholder text, active-row count, and passing/pending verification contradictions.
- **Files or artifacts updated:** `docs/PROJECT-STATUS.md`, `scripts/validate-agent-instructions.mts`.
- **Known risk or unresolved issue:** The validator catches common stale-state patterns but does not infer semantic drift from arbitrary git changes.
- **Next best step:** Keep recording exact verification results here before handoff; extend the validator if another repeated stale-status pattern appears.

### 2026-06-23 — Watchlist Hydration

- **Goal:** Fix the console hydration error encountered when using an MCP-created watchlist and verify row clicks still load charts.
- **Completed:** Made default watchlist state deterministic, deferred localStorage watchlist hydration until after mount in `WatchlistProvider`, fixed `@edge/chart-react` candle sync so symbol changes with identical first/last timestamps still replace the displayed series, and fixed indicator compute cache keys so MA/EMA/etc recompute from changed candle values.
- **Verification run:** `npm test -- --run packages/chart-core/src/indicatorCompute.test.ts packages/chart-react/src/EdgeChart.test.tsx src/app/components/watchlist/WatchlistPanel.test.tsx src/lib/watchlist/storage.test.ts` passed (38 tests); browser check clicked `UNH` → `TSLA` → `IBM` from `Trinity Trading Partners 2026-06-23` and updated active chart OHLC data.
- **Evidence captured:** Saved watchlists hydrate after mount via a regression test; chart package regression covers same-timestamp different-OHLC candle replacement; indicator regression covers same-timestamp MA recomputation and integrated MA legend update; browser row clicks issued `/api/candles` for the clicked symbol and updated the legend data.
- **Known risk or unresolved issue:** Cursor browser automation can still trigger a dev-only hydration warning from injected `data-cursor-ref` attributes; it is not from the app code path.
- **Next best step:** Recheck manually in a normal browser tab if the Cursor-injected dev overlay is distracting during UI testing.

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

- [chart/features.md](./chart/features.md) — full feature inventory with status per row
- [ROADMAP.md](./ROADMAP.md) — consolidated product and engineering roadmap
- [chart/context-menu-reference.md](./chart/context-menu-reference.md) — TV vs Edge menu parity
- [ai-tools-architecture.md](./ai-tools-architecture.md) — AI tool design and rollout phases
- [chart/drawing-platform-plan.md](./chart/drawing-platform-plan.md) — drawing platform (complete)
