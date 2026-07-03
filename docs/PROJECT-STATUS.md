# Project Status

Single source for current progress. For row-by-row feature detail, see [chart/features.md](./chart/features.md).

**Last updated:** 2026-07-03

## Current Verified State

- **Current task:** Data trust domain model — explicit dataset usage policy, provenance/readiness evaluation, trading-safety gate contract, API/Data Health metadata.
- **State:** **Passing** — focused tests, build, and startup gate passed; app-level Data Health walkthrough deferred.
- **Latest verification:** **Focused:** 84 tests passed (`Test Files 6 passed (6)`); **Build:** `npm run build` passed (`✓ Compiled successfully in 2.4s`); **Startup:** `npm run check:startup` passed (26 tests); **Architecture review:** self-review — Passed; app-level Data Health walkthrough deferred.
- **Evidence:** `src/lib/marketData/trust/dataTrust.ts`, `src/lib/marketData/trust/enrichResponseMeta.ts`, `src/lib/tradingSafety/tradingReadiness.ts`, `src/lib/marketData/health.ts`, `src/app/api/candles/route.ts`, `src/app/api/quotes/route.ts`, `src/lib/marketData/ARCHITECTURE.md`.
- **Current blocker:** none — app-level Data Health `display-only` / readiness walkthrough on `localhost:3003` not recorded.
- **Next best step:** Manual verify Data Health shows `display-only` on chart/watchlist fallback rows and connected account row omits it on `localhost:3003`.

## Previous Verified State (Icon rail TradingView parity)

- **Current task:** Icon rail TradingView parity — darker rail surface, larger icons, TradingView-style active state on left/right icon rails.
- **State:** **Passing** — focused tests and build passed; app-level computed-style check confirms rail bg `#131722`, 22px icons (~61% of 36px buttons), active `#2a2e39`.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 9 passed (9)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.5s`); **App-level:** drawing toolbar + sidebar rail `backgroundColor: rgb(19, 23, 34)`, icon 22px / button 36px (ratio 0.61), active cursor `#2a2e39`; **Architecture review:** self-review — Passed.
- **Evidence:** `src/app/globals.css`, `src/lib/design-system/edge.ts`, `src/app/components/chart-icons/toolbarButtonStyles.ts`, `src/app/components/chart-icons/ChartToolIcons.tsx`, `src/app/components/DrawingToolbar.tsx`, `src/app/components/sidebar/SidebarRail.tsx`, `docs/chart/drawing-toolbar-design.md`, `src/lib/design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** None — resume deferred Risk panel app-level walkthrough when picking up risk settings polish.

## Previous Verified State (TWS sidecar lifecycle hardening)

- **Current task:** TWS sidecar lifecycle hardening — `TWS_MANAGED` local/external modes, ownership verification, graceful sidecar shutdown, selective brokerage readiness gating, lifecycle API field.
- **State:** **Passing** — focused tests, sidecar unit tests, build, startup gate, and app-level lifecycle scenarios A–F passed.
- **Latest verification:** **Focused:** `Test Files 8 passed (8)`, `Tests 40 passed (40)`; **Sidecar:** `Ran 4 tests in 0.000s` `OK`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.4s`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** A local boot → `/health` `managedBy: edge-local` at 3s; B dev SIGTERM → sidecar HTTP 000; C external restart → sidecar PID unchanged; D external dev SIGTERM → sidecar `ok: true`; E `/api/brokerage/snapshot` HTTP 200; F sidecar SIGTERM → HTTP 000; **Architecture review:** self-review — Passed.
- **Evidence:** `instrumentation.ts`, `src/lib/marketData/providers/tws/{managedMode,startup,recover,lifecycle,sidecarOwnership,client}.ts`, `services/tws-sidecar/main.py`, `scripts/tws-sidecar.sh`, `src/lib/brokerage/brokerageService.ts`, `src/app/api/market-data/health/route.ts`, `src/lib/marketData/ARCHITECTURE.md`, `.env.example`.
- **Current blocker:** none.
- **Next best step:** None — lifecycle hardening verified. Resume deferred Risk panel app-level walkthrough when picking up risk settings polish.

## Previous Verified State (Risk Settings Source of Truth)

- **Current task:** Risk Settings Source of Truth — user-configurable risk sizing propagated app-wide via `RiskSettingsProvider`.
- **State:** **Passing** — domain module, provider, Risk sidebar panel, options calculator live max-risk sync + user-override protection, and risk ruler migration shipped; focused tests and build passed; app-level risk panel walkthrough deferred.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 37 passed (37)` (`OptionsRiskCalculator.test.tsx`, `RiskSettingsProvider.test.tsx`, `riskSettings.test.ts`); **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`); **Architecture review:** Required — self-review — Passed.
- **Evidence:** `src/lib/risk/riskSettings.ts`, `src/app/components/RiskSettingsProvider.tsx`, `src/app/components/sidebar/panels/RiskSettingsPanel.tsx`, `src/app/components/options/{OptionsChainDialog,OptionsRiskCalculator}.tsx`, `src/app/components/options/OptionsRiskCalculator.test.tsx`, `src/lib/risk/createRiskRulerPreset.ts`, `src/app/components/options/useOptionsChainModel.ts`, `src/lib/marketData/ARCHITECTURE.md`.
- **Current blocker:** none — app-level Risk panel → options calculator max-risk live sync walkthrough on `localhost:3003` not recorded.
- **Next best step:** Manual verify: open Risk sidebar panel, set 2% risk, open options calculator, confirm max-risk prefills; change risk % with calculator open and confirm sync; edit max risk manually and confirm Risk panel changes do not clobber.

## Previous Verified State (TWS sidecar startup coupling)

- **Current task:** TWS sidecar startup coupling — web server boot auto-spawns/primes sidecar when `TWS_ENABLED=true`.
- **State:** **Passing** — `instrumentation.ts` + `startup.ts` wired; focused tests, build, and startup gate passed; app-level dev-restart walkthrough deferred.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)` (`startup.test.ts`, `recover.test.ts`); **Build:** `npm run build` passed (`✓ Compiled successfully in 2.3s`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** sidecar stopped → `npm run dev` → `curl http://127.0.0.1:8765/health` → `{"ok":true,...}` at 1s; `POST /api/candles` AAPL → `meta.source: tws`; dev SIGTERM → sidecar process stopped.
- **Evidence:** `instrumentation.ts`, `src/lib/marketData/providers/tws/startup.ts`, `src/lib/marketData/providers/tws/startup.test.ts`, `src/lib/marketData/providers/tws/recover.ts`, `src/lib/marketData/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** None — startup coupling verified end-to-end.

## Previous Verified State (Shift+Click Time/Price Ruler Tool)

- **Current task:** Shift+Click Time/Price Ruler Tool — shaded Δtime/Δprice ruler on price pane via ⇧+click or toolbar.
- **State:** **Passing** — ruler plugin, shift+click arming, toolbar entry, interval-aware labels, and verification gates passed.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 38 passed (38)` (`time.test.ts`, `ruler.test.ts`, `drawingFsm.test.ts`, `useDrawingController.shiftClick.test.ts`, `EdgeChart.drawing.test.tsx`); **Build:** `npm run build:packages` + `npm run build` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Startup:** `npm run check:startup` passed (26 tests); **Full:** `npm run check` — 7 failures pre-existing unrelated to ruler (1549 passed); app-level ⇧+click walkthrough deferred.
- **Evidence:** `packages/chart-core/src/drawings/ruler.ts`, `packages/chart-core/src/time.ts`, `packages/chart-react/src/drawing/useDrawingController.ts`, `packages/chart-react/src/engine/{canvas.tsx,layers.ts}`, `src/app/components/DrawingToolbar.tsx`, `src/app/components/chart-icons/{toolGroups.ts,ChartToolIcons.tsx,iconPaths.ts}`, `docs/chart/features.md`, `src/lib/chart/ARCHITECTURE.md`.
- **Current blocker:** none — app-level ⇧+click visual walkthrough on `localhost:3003` not recorded.
- **Next best step:** Manual verify on price pane: ⇧+click-drag shows shaded ruler with interval-aware Δtime + Δprice/Δ%; release commits drawing; Escape cancels.

## Previous Verified State (Options Risk Calculator v2.1)

- **Current task:** Options Risk Calculator v2 — multi-leg payoff surface in options popup with dollar-risk sizing, Black-Scholes pre-expiration estimates, and chain Analyze handoff.
- **State:** **Passing** — strategy risk engine + replaced Risk Calculator UI shipped; focused tests, build, startup, and Massive API smoke passed; superseded by v2.1 chain wiring.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 28 passed (28)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.3s`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** `GET /api/options/expirations?underlying=LLY` → 18 expirations (`meta.source: massive`); `GET /api/options/chain?underlying=LLY&expiration=2026-07-10` → 40 contracts (`meta.source: massive`).
- **Evidence:** `src/lib/risk/optionsStrategyRisk.ts`, `src/lib/risk/optionsStrategyRisk.test.ts`, `src/app/components/options/OptionsRiskCalculator.tsx`, `src/app/components/options/OptionsRiskCalculator.test.tsx`, `src/app/components/options/OptionsChainDialog.tsx`, `src/app/components/options/OptionsChainView.tsx`, `src/app/components/options/useOptionsChainModel.ts`.
- **Current blocker:** none.
- **Next best step:** Superseded by v2.1.

## Previous Verified State (Massive Options Analysis Provider)

- **Current task:** Massive Options Analysis Provider — options UI and risk analysis load expirations/chains from Massive Options Advanced; IBKR/TWS remain brokerage/account/execution truth only.
- **State:** **Passing** — Massive-first routing shipped; live expirations smoke passes with existing `MASSIVE_API_KEY`.
- **Latest verification:** **Focused:** `Test Files 9 passed (9)`, `Tests 93 passed (93)`; **Startup:** `npm run check:startup` passed (26 tests); **Build:** `npm run build` passed; **App-level:** `GET /api/options/expirations?underlying=AAPL` → `meta.source: massive`, **24 expirations** (first `2026-07-02`).
- **Evidence:** `src/lib/marketData/providers/massive/{options.ts,optionsMappers.ts,client.ts}`, `src/lib/marketData/contracts/massive.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/app/api/options/`, `src/lib/marketData/ARCHITECTURE.md`.
- **Current blocker:** none — earlier 401 was a pagination bug (`next_url` missing `apiKey`); fixed in `client.ts`.
- **Next best step:** Open options dialog for AAPL on `localhost:3003`; resume IB account tracking app-level walkthrough.

## Previous Verified State (Options Risk Calculator v1.1 Compare fixes)

- **Current task:** TWS sidecar positions/fills fix — positions show MKT/PnL on first cold load; Today's fills tab lists executions instead of 503.
- **State:** **Passing** — focused + app-level sidecar curl passed; browser Account panel walkthrough deferred (dev server not running during verification).
- **Latest verification:** **Focused:** `Ran 3 tests in 0.000s` `OK` (`npm run tws:sidecar:test`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** cold `curl /account/positions` → HOOD `marketPrice=108.01999665`, `unrealizedPNL=3441.0`; `curl /account/trades` → `HTTP 200`, `executions: 3` (NBIS SLD 160@239, HOOD BOT 200@103.1, HOOD BOT 500@103.099).
- **Evidence:** `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `package.json`.
- **Current blocker:** Browser Account panel walkthrough on `localhost:3003` not recorded (dev server was down during verification).
- **Next best step:** Start dev server, refresh Account panel — confirm HOOD MKT/PnL on first paint and 3 fills in Today's fills tab; then re-record Account panel UI overhaul walkthrough.

## Previous Verified State (Client chart SWR cache)

- **Current task:** Client chart SWR cache — re-opened charts paint cached candles instantly as stale while a background refresh runs.
- **State:** **Passing** — focused + startup passed; app-level re-open walkthrough deferred.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 12 passed (12)` (`chartClientCache.test.ts`, `useChartDataFeed.test.ts`); **Startup:** `npm run check:startup` passed (26 tests).
- **Evidence:** `src/lib/chartDataFeed/chartClientCache.ts`, `src/lib/chartDataFeed/chartClientCache.test.ts`, `src/lib/chartDataFeed/useChartDataFeed.ts`, `src/lib/chartDataFeed/useChartDataFeed.test.ts`, `src/lib/chartDataFeed/ARCHITECTURE.md`, `src/lib/marketData/ARCHITECTURE.md`.
- **Current blocker:** App-level walkthrough on `localhost:3003` (AAPL → MSFT → AAPL re-open) not yet recorded.
- **Next best step:** Manual re-open walkthrough to confirm instant stale paint + refresh swap; then resume Account panel app-level verification.

## Previous Verified State (Account panel UI overhaul)

- **Current task:** Account panel UI overhaul — color-coded PnL, metric help tooltips, tabbed orders/fills, icon refresh, day-trades in net-liq card, computed leverage, what-if preview removed.
- **State:** **Active** — focused + startup passed; app-level Account panel walkthrough on live IB Gateway not yet recorded.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 13 passed (13)` (`AccountPanel`, `positionOverlays`); **Startup:** `npm run check:startup` passed (26 tests).
- **Evidence:** `src/app/components/sidebar/panels/AccountPanel.tsx`, `src/app/components/sidebar/panels/AccountPanel.test.tsx`, `src/lib/brokerage/positionOverlays.ts`, `src/lib/brokerage/positionOverlays.test.ts`.
- **Current blocker:** App-level Account panel walkthrough not recorded on live IB Gateway.
- **Next best step:** Refresh browser on `localhost:3003` with IB Gateway connected; verify PnL colors, tooltips, orders/fills tabs, refresh icon, day-trades in net-liq card, and computed leverage.

## Previous Verified State (Local docs update hook MVP)

- **Current task:** Local docs update hook MVP — pre-push runs local Cursor SDK docs updater; blocks push when docs change; fails open without `CURSOR_API_KEY`.
- **State:** **Passing** — hook plumbing + script + tests shipped; live SDK agent smoke not run (no API key).
- **Latest verification:** **Focused:** 10 tests passed (`scripts/update-docs-for-diff.test.ts`); **Startup:** `npm run check:startup` passed (26 tests); **SDK smoke:** blocked — `CURSOR_API_KEY is not set`.
- **Evidence:** `.githooks/pre-push`, `scripts/update-docs-for-diff.mts`, `scripts/update-docs-for-diff.test.ts`, `package.json`, `.env.example`.
- **Current blocker:** Live SDK smoke requires `CURSOR_API_KEY` in `.env.local` or environment; run `npm run hooks:install` once to enable the hook.
- **Next best step:** Set `CURSOR_API_KEY`, run `npx tsx scripts/update-docs-for-diff.mts --sdk-smoke`, then test `npm run docs:auto-update -- --base HEAD~1 --head HEAD` before a real push.

## Previous Verified State (TWS data-foundation fallback hardening)

- **Current task:** TWS data-foundation fallback hardening — quote SSE health-gate + timeout fallback, bounded warmup, watchlist REST fallback, stale sidecar/version detection, TWS port/process lifecycle checks.
- **State:** **Pending** — P0/P1 fallback fixes implemented; focused + startup + build + stale-sidecar app-level fallback probes passed; IB Gateway recovery walkthrough still blocked on stale sidecar restart.
- **Latest verification:** **Focused:** 55 tests passed (`marketDataService.test.ts`, `createStreamSession.test.ts`, `twsQuoteStreamSession.test.ts`, `client.health.test.ts`, `MarketDataProvider.test.tsx`, recover routes); **Startup:** `npm run check:startup` passed (26 tests); **Build:** `npm run build` passed; **App-level:** `POST /api/candles` HTTP 200 in 0.137s `meta.source: yahoo`; `POST /api/quotes` HTTP 200 in 0.092s `meta.source: yahoo`; `POST /api/market-data/warmup` HTTP 200 in 0.094s (skipped `tws.warmup`, totalMs 90); `GET /api/stream/quotes` emitted Yahoo poll snapshot within 8s.
- **Evidence:** `src/lib/marketData/service/marketDataService.ts`, `src/lib/marketData/stream/{createStreamSession.ts,twsQuoteStreamSession.ts,sseResponse.ts}`, `src/app/components/MarketDataProvider.tsx`, `services/tws-sidecar/main.py`, `scripts/tws-sidecar.sh`, `src/lib/marketData/providers/tws/{client.ts,recover.ts,finalizeTwsRecovery.ts}`, `src/app/api/market-data/warmup/route.ts`, `src/lib/marketData/ARCHITECTURE.md`.
- **Current blocker:** App-level recovery walkthrough requires restarting sidecar from current source (`npm run tws:sidecar`) and IB Gateway paper login on port `4002`.
- **Next best step:** Restart sidecar, confirm `/health` exposes `capabilities.controlRecovery`, then Data Health recovery walkthrough on `localhost:3003`.

## Previous Verified State (Harness enforcement tightening)

- **Current task:** Harness enforcement tightening — machine-checked Passing rules, concrete verification evidence, session-exit checklist, lightweight bugfix plan path.
- **State:** **Passing**
- **Latest verification:** **Focused:** 10 tests passed (`scripts/validate-project-status.test.ts`); **Startup:** `npm run lint:instructions` passed; `npm run check:startup` passed (26 tests).
- **Evidence:** `scripts/validate-project-status.mts`, `scripts/validate-agent-instructions.mts`, `scripts/validate-project-status.test.ts`, `docs/checklists/session-exit-checklist.md`, `docs/checklists/planning-router.md`, `.cursor/rules/plan-harness-awareness.mdc`.
- **Current blocker:** none.

## Previous Verified State (TWS sidecar recovery hardening)

- **Current task:** TWS sidecar recovery hardening — non-blocking sidecar control plane, worker diagnostics, observable reconnect state machine, late-success finalization, and Data Health phase progress.
- **State:** **Pending** — superseded by TWS recovery supervisor; app-level recovery walkthrough not yet recorded.
- **Latest verification:** **Focused:** 67 tests passed; **Startup:** `npm run check:startup` passed (26 tests).
- **Next best step:** App-level walkthrough with `TWS_ENABLED=true` + local IB Gateway.

## Previous Verified State (TWS cold symbol-change fallback)

## Previous Verified State (screener dialog layout overhaul)
- **Current task:** Screener technical rule builder (v1) — registry-driven custom technical rules in QueryBuilder with validation.
- **State:** **Passing** — focused screener tests + build + startup gate passed; app-level browser walkthrough pending.
- **Latest verification:** **Focused:** 71 tests passed (`lib/screener`, `components/screener`, `api/screener/run`); **Build:** `npm run build:packages` + `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); **Architecture review:** self-review Passed.
- **Evidence:** `src/lib/screener/{compileQuery.ts,validateIndicatorRule.ts}`, `src/app/components/screener/{QueryBuilder.tsx,ScreenerDialog.tsx}`, `src/app/api/screener/run/route.ts`, `src/lib/marketData/ARCHITECTURE.md`, `docs/screener-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** App-level browser walkthrough on `localhost:3003` (add technical rule, edit MACD preset, save/load screen); v2 follow-up: multiple technical rules per screen.

## Previous Verified State (market calendar + screener warning cleanup)
- **Current task:** Market calendar + screener warning cleanup — pre-close Massive 403 fix and typed skip UX.
- **State:** **Passing** — focused tests + build + app-level API smoke passed.
- **Latest verification:** **Focused:** 51 tests passed; **Build:** `npm run build` passed; **App-level:** MACD bullish API smoke — 9 rows, no 403, 11 skippedSymbols.
- **Evidence:** `src/lib/marketData/marketCalendar.ts`, `src/lib/marketData/screenerUniverse/universeDailyStore.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/screener/technicalFilter.ts`, `src/app/components/screener/ResultsTable.tsx`.
- **Current blocker:** none.

## Previous Verified State (screener observability + baseline)
- **Current task:** Market context breadcrumb relocation to legend (Option B) — sector/industry breadcrumb moved from header into second line under OHLCV legend.
- **State:** **Passing** — focused tests + `build:packages` + `check:startup` passed; superseded by inline ETF crumbs UX.
- **Latest verification:** **Focused:** 20 tests passed (`ChartHeaderBar`, `MarketContextBreadcrumb`, `ChartCell.legendSlot`, `ChartCell.activeChart`, `ChartCell.focus`); **Build:** `npm run build:packages` passed; **Startup:** `npm run check:startup` passed (26 tests).
- **Evidence:** `packages/chart-react/src/components/ChartLegendBar.tsx`, `packages/chart-react/src/EdgeChart.tsx`, `src/app/components/EdgeChart.tsx`, `src/app/components/ChartGrid.tsx`, `src/app/components/ChartCell.tsx`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `src/app/components/StockApp.tsx`, `src/app/components/ChartCell.legendSlot.test.tsx`.

## Previous Verified State (stock screener MVP)
- **State:** **Pending** — focused screener tests passing; `npm run build:packages` passed; `npm run check:startup` passed (26 tests); app-level walkthrough on `localhost:3003` pending; full `npm run build` blocked by pre-existing TypeScript errors in `src/lib/chartDataFeed/apiChartDataFeed.ts` (unrelated to screener).
- **Latest verification:** **Focused:** 48 tests passed (`marketData/providers/fmp`, `marketData/service/marketDataService.fmp`, `api/screener`, `lib/screener`, `chartDataFeed/apiScreenerFeed`, `components/screener`, `chart-chrome/ChartHeaderBar`); **Build:** `npm run build:packages` passed; **Startup:** `npm run check:startup` passed (26 tests); **App-level:** pending manual screener modal walkthrough on `localhost:3003`.
- **Evidence:** `src/app/api/screener/run/route.ts`, `src/lib/marketData/providers/fmp/{adapter,mappers,screenerParams}.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/screener/`, `src/lib/chartDataFeed/apiScreenerFeed.ts`, `src/app/components/screener/`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `src/app/components/StockApp.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/screener-roadmap.md`.
- **Current blocker:** none for screener feature code; full app build has unrelated TS debt outside screener paths.
- **Next best step:** App-level verify screener on `localhost:3003` (preset run, custom query, save/load screen, load chart, add to watchlist); then clear pre-existing build TS errors or mark screener **Passing** after app-level check.

## Previous Verified State (market context taxonomy split)

- **Current task:** Market context taxonomy split — non-clickable Sector › Industry classification path plus Related ▾ popover grouping tradable wrappers by membership flavor; expanded curated membership tables; browser-style per-cell back/forward symbol history retained.
- **State:** **Passing** — three-axis taxonomy split implemented; focused tests passing; app-level browser check recommended but not blocking screener handoff.
- **Latest verification:** **Focused:** 43 tests passed (`marketData/context`, `chart-chrome/`, context API route); **Startup:** `npm run check:startup` passed (26 tests).

## Previous Verified State (options chain dialog UX + cold-chain latency)

- **Current task:** Options chain dialog UX + cold-chain latency — dialog scrolls with prominent loading, risk presets at top, right-sidebar Options removed, TWS chain uses client spot and cached secdef.
- **State:** **Passing** — focused UI/layout/market-data tests pass; startup gate pass; live AAPL secdef-cache revisit ~524–796 ms after first cold chain (~10 s with 40 contracts).
- **Latest verification:** **Focused:** 107 tests passed (options dialog, sidebar, layout, chartWorkspace, sidebarWidth, TWS/service/schemas); **Startup:** `npm run check:startup` passed (26 tests); **Live timing:** first cold AAPL chain 10040 ms; subsequent expirations 524 ms / 557 ms / 796 ms after sidecar restart with secdef cache.

## Previous Verified State (right sidebar resize consistency)

## Previous Verified State (TWS extended-hours price alignment)

- **Current task:** TWS extended-hours price alignment — chart live quote matches watchlist; TWS `sessionMode` for extended candles; pre/post-market chart labeling.
- **State:** **Pending** — implementation + focused tests passing; app-level TWS quote/marker alignment check not yet recorded.
- **Latest verification:** **Focused:** 36 tests passed + 9 telemetry tests passed; **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests); **App-level:** telemetry console warning cleared on reload; TWS alignment pending.

## Previous Verified State (TWS sidecar in-app recovery)

- **Current task:** TWS sidecar in-app recovery — follow-ups implemented; app-level verify pending.
- **State:** **Pending** — focused tests passing; manual recovery check on `localhost:3003` not yet recorded.
- **Latest verification:** **Focused:** 35 tests passed (recover, health, data-health UI, chart feed reload); **Fast:** `npm run check:startup` passed (26 tests); **App-level:** pending.

## Previous Verified State (data health center)

- **Current task:** None active — data health center shipped.
- **State:** **Passing** — top-bar Data Health dropdown shows active chart/watchlist/options source, cache/freshness, provider status, and fallback warnings.
- **Latest verification:** **Focused:** `npm test -- --run src/lib/marketData src/app/api/market-data src/app/components/chart-chrome src/app/components/data-health` passed (169 tests); **Fast:** `npm run check:startup` passed (26 tests).
- **Evidence:** `src/lib/marketData/health.ts`, `src/app/api/market-data/health/route.ts`, `src/app/components/data-health/`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `src/app/components/MarketDataProvider.tsx`, `src/lib/marketData/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Corporate events / news / fundamentals / macro workflow panels (Phase 2) per [ROADMAP.md](./ROADMAP.md).

## Previous Verified State (data health center)

- **State:** **Passing** — header Data Health button opens dropdown with dataset rows, provider probes, fallback warnings, and copy-JSON diagnostics; watchlist quote meta and options panel meta feed client snapshot.
- **Latest verification:** **Focused:** 169 tests passed across market-data health, API route, chart chrome, and data-health UI; **Fast:** `npm run check:startup` passed (26 tests).

## Previous Verified State (sidebar resize chart stability)

- **Current task:** None active — sidebar resize chart stability fix shipped.
- **State:** **Passing** — right sidebar drags coalesce width writes per animation frame, flush the final width on release, and chart canvas resize redraws before paint so candles do not disappear while resizing.
- **Latest verification:** **Focused:** `npm test -- --run src/app/components/sidebar/SidebarPanelShell.test.tsx packages/chart-react/src/engine/canvas.test.tsx` passed (13 tests); **Fast:** `npm run check:startup` passed (26 tests); **App-level:** live `localhost:3003` sidebar drag instrumentation kept chart canvas opaque/no loading state through resize.
- **Evidence:** `src/app/components/sidebar/useSidebarResize.ts`, `src/app/components/sidebar/SidebarPanelShell.test.tsx`, `packages/chart-react/src/engine/canvas.tsx`.
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
| Drawings | **Done** | 14 tools (incl. ruler + measure utilities), typed styles, undo/redo, multi-pane routing |
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
| Data trust domain model | Dataset usage policy (`display` / `analysis` / `brokerage_truth` / `trading_decision`); provenance + readiness on candles/quotes API meta; Data Health `display-only` label; pure `evaluateTradingReadiness` gate for future orders | **Passing** | **Focused:** 84 tests passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.4s`); **Startup:** `npm run check:startup` passed (26 tests); app-level Data Health walkthrough deferred | `src/lib/marketData/trust/`, `src/lib/tradingSafety/`, `src/lib/marketData/health.ts`, `src/app/api/candles/route.ts`, `src/app/api/quotes/route.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| Icon rail TV parity | Left/right icon rails use `--edge-surface-rail` (`#131722` dark); icons 22/20px (~61% of 36/32px buttons); active state `#2a2e39` without ring | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 9 passed (9)`; **Build:** `✓ Compiled successfully in 2.5s`; **App-level:** rail bg `rgb(19, 23, 34)`, icon 22px / button 36px (ratio 0.61) | `toolbarButtonStyles.ts`, `globals.css`, `edge.ts`, `DrawingToolbar.tsx`, `SidebarRail.tsx`, `ChartToolIcons.tsx`, docs |
| TWS sidecar lifecycle hardening | `TWS_MANAGED=local` (Next spawns/kills via shell script + ownership env) vs `external` (manual sidecar only); FastAPI lifespan IB disconnect; brokerage routes await bounded startup; `/api/market-data/health` exposes `lifecycle`; PID/port lock in `tws-sidecar.sh` | **Passing** | **Focused:** `Test Files 8 passed (8)`, `Tests 40 passed (40)`; **Sidecar:** `Ran 4 tests` `OK`; **Build:** `✓ Compiled successfully in 2.4s`; **Startup:** 26 tests; **App-level:** A edge-local spawn 3s; B/C/D/F lifecycle curl passed | `instrumentation.ts`, `src/lib/marketData/providers/tws/{managedMode,startup,recover,lifecycle,sidecarOwnership}.ts`, `services/tws-sidecar/main.py`, `scripts/tws-sidecar.sh`, `src/lib/brokerage/brokerageService.ts`, `src/app/api/market-data/health/route.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| Risk Settings Source of Truth | User sets risk sizing once (percent of account or absolute $) in Risk sidebar panel; value propagates via `RiskSettingsProvider` to options calculator max-risk input (live sync while untouched, preserves manual edits) and risk ruler preset `TradeSetup.account`; falls back to manual capital with stale badge when account disconnected | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 37 passed (37)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`); **Architecture review:** self-review Passed; app-level Risk panel live sync walkthrough deferred | `src/lib/risk/riskSettings.ts`, `src/app/components/RiskSettingsProvider.tsx`, `src/app/components/sidebar/panels/RiskSettingsPanel.tsx`, `src/app/components/options/{OptionsChainDialog,OptionsRiskCalculator}.tsx`, `src/app/components/options/OptionsRiskCalculator.test.tsx`, `src/lib/risk/createRiskRulerPreset.ts`, `src/app/components/options/useOptionsChainModel.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| TWS sidecar startup coupling | Superseded by lifecycle hardening row — prior boot spawn + SIGTERM kill behavior retained under `TWS_MANAGED=local` | **Passing** | **Focused:** 18 tests passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.3s`); superseded by lifecycle hardening row | `instrumentation.ts`, `src/lib/marketData/providers/tws/startup.ts`, `src/lib/marketData/providers/tws/recover.ts` |
| Shift+Click Time/Price Ruler Tool | ⇧+click-drag on price pane (or toolbar Ruler) places shaded two-point ruler with interval-aware Δtime on x-axis and Δprice/Δ% on y-axis; second click/release commits as drawing; ⇧+click on existing drawings respects selection | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 38 passed (38)`; **Build:** `npm run build:packages` + `npm run build` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Startup:** `npm run check:startup` passed (26 tests); app-level ⇧+click walkthrough deferred | `packages/chart-core/src/drawings/ruler.ts`, `packages/chart-core/src/time.ts`, `packages/chart-react/src/drawing/useDrawingController.ts`, `packages/chart-react/src/engine/{canvas.tsx,layers.ts}`, `src/app/components/DrawingToolbar.tsx`, `docs/chart/features.md` |
| Options Risk Calculator v2.1 — chain-native legs | Risk Calculator legs use chain strike dropdown and nearest-ATM default; max-risk auto contract count shown in UI; Add leg gated until chain loads | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 36 passed (36)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.2s`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** `GET /api/options/chain?underlying=LLY&expiration=2026-07-10` → 40 contracts (`meta.source: massive`); browser UI walkthrough deferred | `src/lib/risk/optionsStrategyRisk.ts`, `src/lib/risk/optionsStrategyRisk.test.ts`, `src/app/components/options/OptionsRiskCalculator.tsx`, `src/app/components/options/OptionsRiskCalculator.test.tsx` |
| Options Risk Calculator v2 | Options popup Risk Calculator builds multi-leg strategies, sizes from max expiration loss when defined, models pre-expiration/expiration payoff grid from chain IV/quotes, and seeds from chain Analyze actions | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 28 passed (28)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.3s`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** `GET /api/options/expirations?underlying=LLY` → 18 expirations (`meta.source: massive`); `GET /api/options/chain?underlying=LLY&expiration=2026-07-10` → 40 contracts (`meta.source: massive`); superseded by v2.1 | `src/lib/risk/optionsStrategyRisk.ts`, `src/lib/risk/optionsStrategyRisk.test.ts`, `src/app/components/options/OptionsRiskCalculator.tsx`, `src/app/components/options/OptionsRiskCalculator.test.tsx`, `src/app/components/options/OptionsChainDialog.tsx`, `src/app/components/options/OptionsChainView.tsx`, `src/app/components/options/useOptionsChainModel.ts` |
| Documentation Automation Framework | Pre-push docs automation classifies diffs into architecture/harness/drift-audit lanes; enforces doc allowlists, summary validation, non-doc edit blocking, evidence-gated harness updates, and post-agent `lint:instructions`; supports `--lane`, `--evidence-file`, `--sdk-smoke` | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 35 passed (35)` (`docs-automation-framework.test.ts`, `update-docs-for-diff.test.ts`); **Startup:** `npm run lint:instructions` passed; `npm run check:startup` passed (26 tests); **SDK smoke:** `status=finished`, `SDK smoke OK`, `durationMs=5154`; live diff dry-run deferred | `scripts/docs-automation-framework.mts`, `scripts/docs-automation-framework.test.ts`, `scripts/update-docs-for-diff.mts`, `scripts/update-docs-for-diff.test.ts`, `AGENTS.md`, `.env.example` |
| Options Risk Calculator v1.1 (Compare fixes) | Compare screen enforces 3 distinct strikes, shows `—` (not `0.00`) for profit/ratio when delta missing, greeks warning banner, ATM/Half/Target row labels, Pick-winner tooltip, and auto `loadAllStrikes()` when ATM window insufficient | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 71 passed (71)` (`premiumProjection`, `OptionsRiskCalculator`, `riskRulerPreset`, `OptionsChainDialog`); **Build:** `npm run build` passed (`✓ Compiled successfully in 2.4s`); **App-level:** `GET /api/options/expirations?underlying=AAPL` → 25 expirations (`meta.source: tws`); `GET /api/options/chain?underlying=AAPL&expiration=2026-07-02` → 40 contracts (`meta.source: tws`); browser Compare UI walkthrough deferred | `src/lib/risk/premiumProjection.ts`, `src/lib/risk/premiumProjection.test.ts`, `src/app/components/options/OptionsRiskCalculator.tsx`, `src/app/components/options/OptionsRiskCalculator.test.tsx`, `src/app/components/options/useOptionsChainModel.ts`, `src/lib/risk/createRiskRulerPreset.ts`, `src/app/components/options/OptionsChainDialog.tsx` |
| TWS sidecar positions/fills fix | Positions show MKT/PnL on first cold panel paint; Today's fills tab lists executions instead of 503 | **Passing** | **Focused:** `Ran 3 tests in 0.000s` `OK` (`npm run tws:sidecar:test`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** cold `curl /account/positions` → HOOD `marketPrice=108.01999665`, `unrealizedPNL=3441.0`; `curl /account/trades` → `HTTP 200`, `executions: 3`; browser walkthrough deferred | `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `package.json` |
| Client chart SWR cache | Re-opening a recently viewed chart paints cached candles instantly as `stale: true` while a background fetch refreshes; `reloadKey` bump bypasses cache; bounded LRU (20 entries) + 5-min max-age; errors keep cached candles visible | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 12 passed (12)` (`chartClientCache.test.ts`, `useChartDataFeed.test.ts`); **Startup:** `npm run check:startup` passed (26 tests); app-level re-open walkthrough deferred | `src/lib/chartDataFeed/chartClientCache.ts`, `src/lib/chartDataFeed/chartClientCache.test.ts`, `src/lib/chartDataFeed/useChartDataFeed.ts`, `src/lib/chartDataFeed/useChartDataFeed.test.ts`, `src/lib/chartDataFeed/ARCHITECTURE.md`, `src/lib/marketData/ARCHITECTURE.md` |
| Local docs update hook MVP | Pre-push hook runs local Cursor SDK docs updater against the unpushed diff; blocks push when docs change; skips docs-only diffs; fails open without API key | **Passing** | **Focused:** 10 tests passed (`update-docs-for-diff.test.ts`); **Startup:** `npm run check:startup` passed (26 tests); **SDK smoke:** blocked — `CURSOR_API_KEY is not set` | `.githooks/pre-push`, `scripts/update-docs-for-diff.mts`, `scripts/update-docs-for-diff.test.ts`, `package.json`, `.env.example` |
| TWS cold symbol-change fallback | When TWS/IB Gateway is unreachable or the historical data farm cannot serve candles, cold chart symbol changes skip TWS while the circuit is open and fall back to Yahoo without a stuck loading state | **Passing** | **Focused:** 60 market-data tests passed; **App-level:** browser `POST /api/candles` for cold symbols returned `meta.source: yahoo` in 515ms / 308ms with `provider.tws.skipped` at 0ms | `src/lib/marketData/service/marketDataService.ts`, `src/lib/marketData/service/marketDataService.test.ts`, `docs/PROJECT-STATUS.md` |
| Harness enforcement tightening | Passing rows require concrete verification evidence; session-exit checklist; lightweight bugfix plan path; validator blocks Passing + pending | **Passing** | **Focused:** 10 tests passed (`validate-project-status.test.ts`); **Startup:** `npm run lint:instructions` passed; `npm run check:startup` passed (26 tests) | `scripts/validate-project-status.mts`, `scripts/validate-agent-instructions.mts`, `scripts/validate-project-status.test.ts`, `docs/checklists/session-exit-checklist.md`, `docs/checklists/planning-router.md`, `.cursor/rules/plan-harness-awareness.mdc` |
| Project status harness | Fresh agents can identify current work from one authoritative status block, and stale status placeholders fail instruction validation | **Passing** | **Focused:** `npm run check:startup` passed (3 files, 22 tests) after validator updates | `docs/PROJECT-STATUS.md`, `scripts/validate-agent-instructions.mts` |
| Planning checklist router | Plans classify intent, decide architecture review applicability (N/A or Required), apply routed checklist docs, and preserve harness updates | **Passing** | **Fast:** `npm run lint:instructions` passed; **Startup:** `npm run check:startup` passed (3 files, 26 tests) | `docs/checklists/architecture-review-checklist.md`, `docs/checklists/planning-router.md`, `docs/checklists/feature-planning-checklist.md`, `docs/checklists/refactor-planning-checklist.md`, `docs/checklists/bugfix-planning-checklist.md`, `docs/checklists/testing-verification-checklist.md`, `.cursor/rules/plan-harness-awareness.mdc`, `scripts/validate-agent-instructions.mts` |
| Internal package boundaries | Package workspaces and examples validate reusable chart/AI boundaries without driving a public release effort | **Passing** | **Full:** `npm run check` passed (776 tests, `check:examples`, package boundaries, `typecheck:packages`, build) | `packages/`, `examples/`, `scripts/validate-package-boundaries.mts`, `src/test/package-api-snapshot.test.ts` |
| Chart copy menu | User can copy chart and drawing data from the context menu without breaking existing menu behavior | **Passing** | **Focused:** 26 tests passed via `npm run check:startup` (chartCopyMenu + chartContextMenu); rerun targeted tests if changed | `chartCopyMenu.ts`, `chartContextMenu.ts`, `ChartCell.tsx` |
| Watchlist hydration / MCP-created lists | Saved watchlists created through AI/MCP hydrate after mount without reading browser storage during SSR hydration, and row clicks fetch and render fresh chart/indicator data | **Passing** | **Focused:** 12 tests passed via targeted `npm test -- --run`; **App-level:** 3 symbol row clicks (UNH→TSLA→IBM) updated chart on localhost:3003 | `WatchlistContext.tsx`, `WatchlistPanel.test.tsx`, `watchlist/storage.ts`, `packages/chart-react/src/EdgeChart.tsx`, `packages/chart-core/src/indicatorCompute.ts` |
| Context menu polish | User can access remaining chart context-menu actions with parity documented against the TradingView reference | **Passing** | **Focused:** 40 tests passed across 5 context-menu files; **Build:** `npm run build:packages` passed; parity rows updated in `context-menu-reference.md` + `features.md` | `chartContextMenu.ts`, `ChartCell.tsx`, `packages/chart-react/src/engine/canvas.tsx`, `docs/chart/context-menu-reference.md` |
| Crosshair time-lock toggle | User can toggle "Lock vertical cursor line by time"; ON freezes the vertical line at the captured plot X, OFF restores free cursor-follow, open context menus suppress crosshair movement, and the menu checkmark reflects persisted `chartSettings.canvas.lockCrosshairToTime` | **Passing** | **Build:** `npm run build:packages` passed; **Focused:** `chartContextMenu.test.ts`, package `canvas.test.tsx`, and `crosshair.test.ts` passed (36 tests); **Fast:** `npm run check:startup` passed (26 tests) | `packages/chart-react/src/engine/chartSettings.ts`, `packages/chart-react/src/engine/canvas.tsx`, `packages/chart-react/src/engine/canvas.test.tsx`, `src/lib/chart/chartSettings.ts`, `src/lib/chart/canvas.tsx`, `ChartCell.tsx`, `ContextMenu.tsx` |
| Object Tree / Data Window parity | TradingView-style two-tab object panel with flat object tree, data window crosshair values, and visibility toggles synced to chart state | **Passing** | **Focused:** ObjectTreePanel + SidebarRail + EdgeChart tests passed; **Startup:** `npm run check:startup` passed (26 tests) | `ObjectTree.tsx`, `ActiveChartContext.tsx`, `ChartCell.tsx`, `ObjectTreePanel.tsx`, `packages/chart-react/src/EdgeChart.tsx` |
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
| Watchlist organization + resizable side panels | Watchlist rows support pin/tag/note organization with filter chips, column picker, sorting, and tag/sector grouping; Watchlist/Object Tree/Options panels share a draggable left-edge resize handle with one shared persisted sidebar width (legacy `panelWidths` migrated on load) | **Passing** | **Focused:** 68+ sidebar/layout tests passed; **Fast:** `npm run check:startup` passed (26 tests) | `src/lib/watchlist/`, `src/app/components/watchlist/`, `src/app/components/sidebar/`, `src/lib/chartConfig.ts`, `src/lib/layoutStorage.ts`, `src/lib/responsive/sidebarWidth.ts` |
| Event overlay data + bottom rail | Corporate events fetch/filter correctly; event badges render in a reserved bottom rail grouped by date with expandable detail list instead of stacking through candles | **Passing** | **Focused:** 57 tests passed (FMP adapter/mappers, apiChartDataFeed, eventBadges, marketDataService.events, /api/events); **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests) | `src/lib/marketData/providers/fmp/adapter.ts`, `src/lib/chartDataFeed/apiChartDataFeed.ts`, `packages/chart-core/src/layout.ts`, `packages/chart-react/src/engine/eventBadges.ts`, `packages/chart-react/src/engine/renderer.ts`, `packages/chart-react/src/components/EventDetailCard.tsx` |
| Sidebar resize chart stability | Right sidebar drag stays smooth and does not blank the active chart while the canvas dimensions change | **Passing** | **Focused:** `SidebarPanelShell.test.tsx` + package `canvas.test.tsx` passed (13 tests); **Fast:** `npm run check:startup` passed (26 tests); **App-level:** live drag instrumentation kept canvas painted through min/max panel resize | `src/app/components/sidebar/useSidebarResize.ts`, `src/app/components/sidebar/SidebarPanelShell.test.tsx`, `packages/chart-react/src/engine/canvas.tsx` |
| Data health center | Top-bar Data Health dropdown shows active chart/watchlist/options source, cache/freshness, provider status, and fallback warnings | **Passing** | **Focused:** 169 tests passed (`src/lib/marketData`, `src/app/api/market-data`, chart chrome, data-health UI); **Fast:** `npm run check:startup` passed (26 tests) | `src/lib/marketData/health.ts`, `src/app/api/market-data/health/route.ts`, `src/app/components/data-health/`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `src/app/components/MarketDataProvider.tsx`, `src/lib/marketData/ARCHITECTURE.md` |
| TWS recovery supervisor | Recover IB Gateway/sidecar without stuck UI; quote SSE + warmup fail fast when sidecar stale/unhealthy; watchlist REST fallback; stale sidecar/version + port guidance | **Pending** | **Focused:** 55 tests passed; **Startup:** `npm run check:startup` passed (26 tests); **Build:** `npm run build` passed; **App-level:** candles 0.137s/yahoo, quotes 0.092s/yahoo, warmup 0.094s/90ms total (skipped tws.warmup), stream snapshot via Yahoo poll within 8s; recovery walkthrough pending sidecar restart | `src/lib/marketData/service/marketDataService.ts`, `src/lib/marketData/stream/`, `src/app/components/MarketDataProvider.tsx`, `services/tws-sidecar/main.py`, `scripts/tws-sidecar.sh`, `src/lib/marketData/providers/tws/`, `src/app/api/market-data/tws/recover/`, `src/lib/marketData/health.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| TWS sidecar in-app recovery | Sidecar control plane stays non-blocking; worker/reconnect diagnostics; bounded reconnect; late-success finalization; Data Health phase progress during recovery | **Pending** | Superseded by TWS recovery supervisor row; prior focused evidence retained | `services/tws-sidecar/main.py`, `src/lib/marketData/providers/tws/{recover.ts,recoverySession.ts,finalizeTwsRecovery.ts,client.ts}`, `src/app/api/market-data/tws/recover/{route.ts,status/route.ts}`, `src/lib/marketData/service/marketDataService.ts`, `src/app/components/data-health/DataHealthProvider.tsx`, `src/lib/marketData/health.ts`, `src/lib/marketData/stream/twsQuoteStreamSession.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| Right sidebar resize consistency | Right sidebar drag tracks pointer smoothly (local draft preview, commit on release); Object Tree, Options, and Watchlist share one persisted `sidebar.width`; legacy `panelWidths` migrates on load | **Passing** | **Focused:** 67 tests passed (sidebar components, `sidebarWidth`, `layoutStorage`, `chartWorkspace`); **Fast:** `npm run check:startup` passed (26 tests); **App-level:** drag preview/commit + cross-panel width covered by component tests; canvas stability retained from prior sidebar resize row | `src/lib/chartConfig.ts`, `src/lib/responsive/sidebarWidth.ts`, `src/lib/layoutStorage.ts`, `src/lib/persistence/schemas/chartWorkspace.ts`, `src/app/components/sidebar/`, `src/app/components/StockApp.tsx` |
| TWS extended-hours price alignment | Chart current-price marker aligns with watchlist live quote; TWS candles opt into extended hours via `sessionMode`; chart labels pre/regular/post-market state | **Pending** | **Focused:** 36 tests passed; telemetry fix: 9 tests passed (`collector`, `MarketDataTelemetryPanel`); **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests); **App-level:** telemetry console warning cleared on reload; TWS quote/candle alignment check pending | `packages/chart-core/src/marketSession.ts`, `packages/chart-react/src/engine/`, `services/tws-sidecar/main.py`, `src/lib/marketData/`, `src/lib/chartDataFeed/`, `src/app/components/ChartCell.tsx`, `src/app/components/ChartSettingsModal.tsx`, `src/app/components/MarketDataProvider.tsx`, `src/app/components/dev/MarketDataTelemetryPanel.tsx`, `src/lib/marketData/telemetry/collector.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| Data Health latency diagnostics | Data Health dropdown includes collapsible dev-only market-data latency diagnostics and replaces the fixed bottom-right telemetry overlay | **Pending** | **Focused:** 17 tests passed (data-health UI, telemetry panel, telemetry collector); **Startup:** `npm run check:startup` passed (26 tests); app-level Data Health expand/collapse check not yet recorded | `src/app/components/data-health/DataHealthLatencySection.tsx`, `src/app/components/data-health/MarketDataLatencyDiagnosticsView.tsx`, `src/app/components/data-health/DataHealthMenu.tsx`, `src/app/components/dev/MarketDataTelemetryPanel.tsx`, `src/app/components/StockApp.tsx`, `src/lib/marketData/telemetry/` |
| Options chain floating dialog | User opens options chain from chart header or sidebar launcher in a draggable overlay; sidebar no longer shows chain table; expiration tabs reload chain for selected date with pin and risk-ruler presets in popup | **Pending** | **Focused:** 10 tests passed (`OptionsChainDialog`, `OptionsPanel`); **Startup:** `npm run check:startup` passed (26 tests); app-level expiration switch check not yet recorded | `src/app/components/options/`, `src/app/components/sidebar/panels/OptionsPanel.tsx`, `src/app/components/StockApp.tsx`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `docs/PROJECT-STATUS.md` |
| Options chain dialog UX + cold-chain latency | Dialog scrolls with prominent loading; quick risk ruler presets at top as clickable buttons; right-sidebar Options rail removed; cold TWS chain avoids redundant spot/secdef work | **Passing** | **Focused:** 107 tests passed; **Startup:** `npm run check:startup` passed (26 tests); **Live timing:** first cold AAPL chain 10040 ms; secdef-cache expirations 524–796 ms | `src/app/components/options/OptionsChainView.tsx`, `src/app/components/sidebar/registry.tsx`, `src/lib/layoutStorage.ts`, `services/tws-sidecar/main.py`, `src/lib/marketData/ARCHITECTURE.md` |
| Market context breadcrumb navigation | Three-axis market context taxonomy — clickable Sector › Industry classification path opens Related popover grouping tradable wrappers by membership flavor; symbol back/forward arrows relocated to the chart legend top line; breadcrumb renders in chart legend second line (Option B); provider-misclassified sectors (e.g. Semiconductors → SMH) still resolve an ETF | **Passing** | **Focused:** 17 tests passed (`relationshipMaps`, `MarketContextBreadcrumb`, `ChartCell.legendSlot`) + 36 chart-chrome/package legend tests passed; **Build:** `npm run build:packages` passed; **Startup:** `npm run check:startup` passed (26 tests); **App-level:** recommended manual Related ▾ + back/forward check on `localhost:3003` | `src/lib/marketData/contracts/marketContext.ts`, `src/lib/marketData/context/relationshipMaps.ts`, `src/lib/marketData/context/buildMarketContext.ts`, `src/app/components/chart-chrome/MarketContextBreadcrumb.tsx`, `src/app/components/chart-chrome/SymbolNavArrows.tsx`, `src/app/components/ChartCell.tsx`, `packages/chart-react/src/components/PaneLegendBar.tsx`, `packages/chart-react/src/components/ChartLegendBar.tsx`, `packages/chart-react/src/EdgeChart.tsx`, `packages/chart-react/src/types.ts`, `src/app/components/EdgeChart.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/PROJECT-STATUS.md` |
| Market context breadcrumb inline ETF crumbs + header symbol navigation | Sector/industry labels render as clickable related-ETF crumbs with controlled, viewport-aware tooltips; industry crumbs fall back to the sector ETF when no distinct industry ETF exists; Related dropdown popover removed; breadcrumb positioned closer below OHLCV ticker without overlap; symbol back/forward buttons sit immediately after ticker search in the header | **Pending** | **Focused:** 26 tests passed (`Tooltip`, `MarketContextBreadcrumb`, `ChartHeaderBar`, `ChartCell.legendSlot`); **Build:** `npm run build:packages` passed; app-level inline-crumb walkthrough not yet recorded | `src/app/components/Tooltip.tsx`, `src/app/components/Tooltip.test.tsx`, `src/app/components/chart-chrome/MarketContextBreadcrumb.tsx`, `src/app/components/chart-chrome/MarketContextBreadcrumb.test.tsx`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `src/app/components/chart-chrome/SymbolNavArrows.tsx`, `src/app/components/ChartCell.tsx`, `src/app/components/StockApp.tsx`, `packages/chart-react/src/components/ChartLegendBar.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/PROJECT-STATUS.md` |
| Market context breadcrumb relocation (Option B) | Sector › Industry breadcrumb moved into a second line under the OHLCV legend in `ChartCell`; symbol nav arrows moved up into the OHLCV legend top line; header bar horizontal space freed | **Passing** | **Focused:** 17 tests passed (`MarketContextBreadcrumb`, `ChartCell.legendSlot`, `relationshipMaps`) + 36 chart-chrome/package legend tests; **Build:** `npm run build:packages` passed; **Startup:** `npm run check:startup` passed (26 tests); superseded by inline ETF crumbs UX | `packages/chart-react/src/components/ChartLegendBar.tsx`, `packages/chart-react/src/components/PaneLegendBar.tsx`, `packages/chart-react/src/EdgeChart.tsx`, `src/app/components/EdgeChart.tsx`, `src/app/components/ChartCell.tsx`, `src/app/components/chart-chrome/MarketContextBreadcrumb.tsx`, `src/app/components/chart-chrome/SymbolNavArrows.tsx`, `src/app/components/ChartCell.legendSlot.test.tsx` |
| Screener observability + baseline | Perf phases on screener route/service/technical filter; dev Screener tab in latency panel; `screener.fetch` client telemetry; before-optimization baseline in `docs/perf/screener-baseline-latest.json` | **Pending** | **Focused:** 48 tests passed; **Build:** `npm run build` passed; **Baseline:** `npm run perf:market-data` captured cold technical presets (~29–51s, candle p50 ~930–1617ms); app-level screener latency panel check not yet recorded; **Architecture review:** self-review Passed | `src/app/api/screener/run/route.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/screener/technicalFilter.ts`, `src/lib/marketData/telemetry/screenerPerf.ts`, `src/lib/chartDataFeed/apiScreenerFeed.ts`, `src/app/components/data-health/MarketDataLatencyDiagnosticsView.tsx`, `scripts/run-market-data-perf.mts`, `docs/perf/screener-baseline-latest.json` |
| Massive universe screener (full-universe technical scan) | Screener scans full US universe locally via Massive Daily Market Summary store; market calendar prevents pre-close 403; typed skip UX | **Passing** | **Focused:** 51 tests passed; **Build:** `npm run build` passed; **App-level:** MACD bullish API smoke — no 403, 9 rows, 11 skippedSymbols; **Collection:** perf diff captured 2026-06-29 (1.41×–6.2×); **Architecture review:** self-review Passed | `src/lib/marketData/marketCalendar.ts`, `src/lib/marketData/providers/massive/`, `src/lib/marketData/screenerUniverse/universeDailyStore.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/screener/technicalFilter.ts`, `src/app/components/screener/ResultsTable.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/perf/market-data-performance.md` |
| Screener sort by leading rule + column picker | Results auto-sort by primary leading rule field on each run; cog dropdown adds/removes columns; sort override persists per saved screen; indicator columns surface for technical screens | **Pending** | **Focused:** 96 screener-related tests passed; **Build:** `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); app-level walkthrough not yet recorded; **Architecture review:** self-review Passed | `src/lib/screener/{types,screenStorage,deriveDefaultSort,indicatorColumns,exportResults}.ts`, `src/lib/persistence/schemas/screenerLibrary.ts`, `src/app/components/screener/{ScreenerProvider,ScreenerDialog,ResultsTable,ColumnPicker}.tsx`, `docs/screener-roadmap.md` |
| Massive Options Analysis Provider | Options UI and risk analysis load expirations/chains from Massive Options Advanced; IBKR/TWS remain brokerage/account/execution truth only | **Passing** | **Focused:** `Test Files 9 passed (9)`, `Tests 93 passed (93)`; **Startup:** `npm run check:startup` passed (26 tests); **Build:** `npm run build` passed; **App-level:** `GET /api/options/expirations?underlying=AAPL` → `meta.source: massive` (401 upstream — 0 expirations); **Architecture review:** self-review Passed | `src/lib/marketData/providers/massive/`, `src/lib/marketData/contracts/massive.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/app/api/options/`, `src/app/components/options/`, `src/lib/marketData/ARCHITECTURE.md` |
| IB account tracking | Live IB account in Account sidebar panel with overhauled layout: color-coded PnL, metric help tooltips, tabbed orders/fills, icon refresh, day-trades in net-liq card, computed leverage, what-if preview removed; chart position overlays; read-only w.r.t. mutations | **Pending** | **Focused:** `Test Files 2 passed (2)`, `Tests 13 passed (13)` (`AccountPanel`, `positionOverlays`); **Startup:** `npm run check:startup` passed (26 tests); app-level Account panel walkthrough on live IB Gateway not yet recorded; paused for WIP=1 Massive options integration | `src/app/components/sidebar/panels/AccountPanel.tsx`, `src/app/components/sidebar/panels/AccountPanel.test.tsx`, `src/lib/brokerage/positionOverlays.ts`, `src/lib/brokerage/positionOverlays.test.ts`, `src/app/components/AccountProvider.tsx`, `src/app/api/brokerage/`, `src/lib/brokerage/` |
| Screener dialog layout overhaul | Run action relocated to top-right of Custom Query panel as primary button with `⌘↵` shortcut; rule rows collapse to one-line summaries with expand-all/collapse-all; rules panel scrolls inside `max-h-[40vh]`; Save controls in modal header; Limit in modal footer | **Pending** | **Focused:** 37 screener + 9 design-system/lib-screener tests passed; **Build:** `npm run build` passed; app-level walkthrough not yet recorded; **Architecture review:** self-review Passed | `src/app/components/design-system/{EdgeButton,EdgeModalShell,styles}.ts`, `src/app/components/screener/{ScreenerDialog,QueryBuilder}.tsx`, `src/lib/screener/compileQuery.ts`, `docs/screener-roadmap.md` |
| Screener technical rule builder (v1) | User constructs/edits custom technical screener rules in QueryBuilder using any implemented `@edge/chart-core` indicator; registry-aware `validateIndicatorRule` rejects invalid rules client- and server-side; presets and saved screens round-trip `query.technical`; named kinds read-only in UI | **Pending** | **Focused:** 71 tests passed (`compileQuery`, `validateIndicatorRule`, `QueryBuilder`, `ScreenerDialog`, `api/screener/run`); **Build:** `npm run build:packages` + `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); app-level technical rule walkthrough not yet recorded; **Architecture review:** self-review Passed | `src/lib/screener/{compileQuery.ts,validateIndicatorRule.ts}`, `src/app/components/screener/{QueryBuilder.tsx,ScreenerDialog.tsx}`, `src/app/api/screener/run/route.ts`, `src/lib/marketData/ARCHITECTURE.md`, `docs/screener-roadmap.md` |
| Stock screener Phase 3 (custom indicators + comparison + summarize_screen) | Indicator-plugin screener rules via presets (MACD hist, BOLL %B, RSI); candle-fingerprint technical cache; `meta.indicatorValues` sidecar; multi-select comparison table; read-only `summarize_screen` AI tool | **Pending** | **Focused:** 49 screener/AI tests passed; **Build:** `npm run build:packages` + `npm run build` passed; app-level indicator preset + compare walkthrough not yet recorded; **Architecture review:** self-review Passed | `packages/chart-core/src/indicatorCompute.ts`, `src/lib/screener/{technicalMath,technicalFilter,presets,summarizeScreen}.ts`, `src/lib/marketData/schemas/request.ts`, `src/app/components/screener/{ComparisonView,ComparisonDialog}.tsx`, `src/lib/ai/tools/screener.ts`, `docs/screener-roadmap.md` |
| Stock screener Phase 2 (composition + persistence + live results) | Postgres screener library sync (localStorage fallback), group watchlist actions, live quote overlay on visible rows, AND/OR query groups, CSV + clipboard export | **Passing** | **Focused:** 63 tests passed; **Build:** `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); **App-level:** Gainers preset, group actions, OR group, save screen verified on `localhost:3003` | `src/db/schema.ts`, `src/lib/persistence/schemas/screenerLibrary.ts`, `src/lib/persistence/repositories/screenerLibraryRepository.ts`, `src/app/api/me/screener-library/`, `src/lib/persistence/sync/useScreenerLibraryRemoteSync.ts`, `src/app/components/screener/ScreenerProvider.tsx`, `src/app/components/MarketDataProvider.tsx`, `src/lib/screener/{compileQuery,exportResults}.ts`, `src/lib/watchlist/storage.ts`, `docs/screener-roadmap.md` |
| Stock screener Phase 1.5 (technical presets) | Four technical presets (RSI oversold/overbought, golden cross, near 52-week high) via server-side two-step pipeline: FMP prefilter → Yahoo daily candles + chart-core indicator math; bounded concurrency; two-phase loading label + phase summary in modal | **Passing** | **Focused:** 52 tests passed; **Build:** `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); **App-level:** preset rail visible in screener modal on `localhost:3003`; **Architecture review:** self-review Passed | `src/lib/screener/{technicalMath,technicalFilter,presets,types}.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/marketData/schemas/request.ts`, `src/lib/marketData/cache/ttlPolicy.ts`, `src/lib/chartDataFeed/apiScreenerFeed.ts`, `src/app/components/screener/`, `src/lib/marketData/ARCHITECTURE.md`, `docs/screener-roadmap.md` |
| Stock screener MVP (Lean) | Header-bar icon opens modal screener filtering US equities/ETFs via FMP `/company-screener`; presets + flat query-builder; sortable paginated results; per-row load-into-chart and add-to-watchlist; named screens persist in localStorage | **Passing** | **Focused:** 48 tests passed (Phase 1 baseline); **Build:** `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); **App-level:** screener modal walkthrough on `localhost:3003` (preset run, row actions, save/load) | `src/app/api/screener/run/route.ts`, `src/lib/marketData/providers/fmp/`, `src/lib/screener/`, `src/lib/chartDataFeed/apiScreenerFeed.ts`, `src/app/components/screener/`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `src/app/components/StockApp.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/screener-roadmap.md` |

## Task Contract — Data trust domain model

- **Status:** Passing — shipped 2026-07-03.
- **Goal:** Encode dataset usage policy and trading-readiness boundaries so display/analysis fallbacks cannot silently authorize future trades; improve maintainability without enterprise infra.
- **Delivered:** `DATASET_POLICIES` table; `evaluateReadiness` + `provenanceFromDataResult`; `evaluateTradingReadiness` pure gate; API `meta.usage`/`meta.readiness` on candles/quotes; Data Health trust fields + `display-only` label; architecture doc section.
- **Verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 84 passed (84)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.4s`); **Architecture review:** self-review Passed; app-level Data Health walkthrough deferred.
- **Blockers:** none.
- **Out of scope (deferred):** Provider routing refactor; order placement; NYSE holiday calendar; Redis/shared cache.

## Task Contract — Massive Options Analysis Provider

- **Status:** Passing — shipped 2026-07-02.
- **Goal:** Route web-app options expirations and chain snapshots through Massive Options Advanced while preserving IBKR/TWS for brokerage, account, positions, and execution truth.
- **Delivered:** Massive options submodule (`options.ts`, `optionsMappers.ts`, paginated `client.ts`); types in `contracts/massive.ts`; Massive-first routing in `MarketDataService` with provider-namespaced cache keys; warmup defers only when Massive/TWS/IBKR all unavailable; architecture doc updates; focused provider/service/API tests.
- **Verification:** **Focused:** `Test Files 9 passed (9)`, `Tests 93 passed (93)`; **Startup:** `npm run check:startup` passed (26 tests); **Build:** `npm run build` passed; **App-level:** `meta.source: massive` on expirations route (upstream 401 with current key).
- **Blockers:** Live contract smoke requires valid Options Advanced API key (configured key returned HTTP 401).
- **Next best step:** Refresh API key and confirm non-zero expirations/chain counts on `localhost:3003`.

## Task Contract — Documentation Automation Framework

- **Status:** Complete — row marked **Passing** 2026-07-01.
- **Goal:** Extend local Cursor SDK docs automation with deterministic diff routing, typed lanes (architecture/harness/drift-audit), allowlist guardrails, evidence-gated harness updates, and post-agent instruction validation.
- **Delivered:** `scripts/docs-automation-framework.mts` (classification, lane prompts, allowlist/summary validation); hardened `scripts/update-docs-for-diff.mts` (`--lane`, `--evidence-file`, timeout, structured logging, `lint:instructions` gate); 35 focused tests; `CURSOR_DOCS_MODEL` in `.env.example`; AGENTS.md hook routing note.
- **Verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 35 passed (35)`; **Startup:** `npm run lint:instructions` passed; `npm run check:startup` passed (26 tests); **SDK smoke:** `status=finished`, `SDK smoke OK`, `durationMs=5154`.
- **Blockers:** Live pre-push diff dry run not yet recorded.
- **Deferred follow-ups:** CI scheduled drift audit; optional central doc manifest if in-code routing grows unwieldy.

## Task Contract — Options Risk Calculator v2.1

- **Status:** Passing — v2.1 shipped 2026-07-02; browser UI walkthrough deferred.
- **Goal:** Wire Risk Calculator legs to loaded chain data (strike dropdown, nearest ATM default) and surface max-risk auto contract sizing in the UI.
- **Delivered:** `listStrikesForLeg`, `findContractForLeg`, `nearestChainStrike` helpers; chain-gated Add leg; strike `<select>` from chain; leg ratio label; Auto: N contracts badge; manual contracts field toggled by sizing mode; chain loading/error states in calculator panel.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 36 passed (36)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.2s`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** `GET /api/options/chain?underlying=LLY&expiration=2026-07-10` → 40 contracts (`meta.source: massive`); **Architecture review:** self-review Passed.
- **Blockers:** Browser UI walkthrough on `localhost:3003` not recorded.
- **Deferred follow-ups:** Strategy presets as one-click leg templates; saved plans persistence; `planOptionTrade` AI tool.

## Task Contract — Options Risk Calculator v2

- **Status:** Passing — v2 shipped 2026-07-02; superseded by v2.1 for chain-native leg UX.
- **Goal:** Replace v1 Setup/Compare/Plan wizard with a strategy-first Risk Calculator in the options popup: multi-leg builder, dollar-risk sizing, pre-expiration payoff gradient through expiration, Entry/Exit/IV assumptions, and chain Analyze handoff.
- **Delivered:** `optionsStrategyRisk.ts` (Zod validation, Black-Scholes pre-expiration pricing, defined-risk sizing, payoff grid); replaced `OptionsRiskCalculator.tsx` UI (trade builder + heatmap table + scenario detail); chain-row Analyze buttons in dialog `OptionsChainView`; tab renamed to `Risk Calculator`; seed-leg handoff via `OptionsChainDialog`; same-expiration `selectExpiration` no-op to preserve loaded chain.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 28 passed (28)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.3s`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** `GET /api/options/expirations?underlying=LLY` → 18 expirations (`meta.source: massive`); `GET /api/options/chain?underlying=LLY&expiration=2026-07-10` → 40 contracts (`meta.source: massive`); **Architecture review:** self-review Passed.
- **Blockers:** Browser UI walkthrough on `localhost:3003` not recorded.
- **Deferred follow-ups:** Strategy presets (spreads/condors) as one-click leg templates, saved plans persistence, `planOptionTrade` AI tool, American-style/binomial pricing for early exercise edge cases.

## Task Contract — Options Risk Calculator v1

- **Status:** Superseded by v2 — v1 shipped; v1.1 Compare fixes shipped; browser Compare UI walkthrough deferred.
- **Goal:** Ship v1 single-leg options risk calculator per the 7-step directional algorithm inside OptionsChainDialog.
- **Delivered:** `premiumProjection.ts` (delta-estimate, 3-strike selection, ratio ranking, Zod validation); `OptionsRiskCalculator.tsx` (Setup/Compare/Plan screens); `addRiskRulerPresetFromCalc` wrapper; Chain \| Risk Calc toggle in dialog header; net-liq default max risk from AccountProvider.
- **v1.1 addendum (2026-07-01):** Layer 1+2 Compare fixes — distinct 3-strike selection in `selectThreeStrikes`, honest `deltaEstimate` flag, profit/ratio `—` when greeks missing, greeks banner, ATM/Half/Target row labels, Pick-winner disabled tooltip, guarded `loadAllStrikes()` on Compare entry. Layer 3 (synthetic delta + Recalc) still deferred.
- **Verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 71 passed (71)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed (reuses options chain + risk ruler contracts; no new ARCHITECTURE.md required).
- **Blockers:** Browser Compare UI walkthrough on `localhost:3003` not recorded.
- **Deferred follow-ups:** Layer 3 synthetic delta + Recalc, `planOptionTrade` AI tool, saved-plans persistence, multi-leg setups.

## Task Contract — Risk Settings Source of Truth

- **Status:** Passing — shipped 2026-07-03.
- **Goal:** One user-configurable risk sizing source, propagated app-wide, replacing ad-hoc `defaultMaxRiskFromNetLiq` and hardcoded `DEFAULT_RISK_ACCOUNT` in production paths.
- **Delivered:** `src/lib/risk/riskSettings.ts` pure domain + resolvers; `RiskSettingsProvider` with localStorage persistence; Risk sidebar panel; options calculator + risk ruler preset migration; architecture doc subsection.
- **Verification:** **Focused:** `Test Files 8 passed (8)`, `Tests 115 passed (115)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.3s`); **Architecture review:** self-review Passed; **App-level:** deferred.
- **Blockers:** none.
- **Out of scope (deferred):** Postgres `/api/me/risk-settings` resource; server-side access for AI tools; what-if margin preview; existing-position-aware sizing.

## Task Contract — TWS sidecar startup coupling

- **Status:** Passing — shipped 2026-07-03.
- **Goal:** Web server restart auto-couples TWS sidecar lifecycle; no manual `npm run tws:sidecar` required when `TWS_ENABLED=true`.
- **Delivered:** Root `instrumentation.ts` calls `ensureSidecarOnServerBoot()` on Node boot (fire-and-forget); `startup.ts` reuses `recoverTwsSidecar` for spawn/restart/reconnect + circuit-breaker reset; `killManagedSidecar()` on shutdown; focused tests + architecture doc update.
- **Verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.3s`); **Startup:** `npm run check:startup` passed (26 tests); **Architecture review:** self-review Passed; **App-level:** sidecar stopped → dev restart → `/health` ok at 1s; `POST /api/candles` → `meta.source: tws`; dev SIGTERM → sidecar stopped.
- **Blockers:** none.

## Task Contract — TWS recovery supervisor

- **Status:** Pending — fallback hardening shipped; focused + startup + build + stale-sidecar app-level probes passed; Gateway recovery walkthrough pending sidecar restart.
- **Goal:** Harden IB Gateway/TWS sidecar recovery and data-foundation routing so stale/unhealthy sidecar cannot hang quote SSE, warmup, or recovery finalization; auto-recover or surface precise manual action.
- **Delivered (prior):** Sidecar connection supervisor; extended `/status` fields; async reconnect bypass when worker wedged; managed sidecar restart escalation; recovery session context; Data Health phase messages.
- **Delivered (2026-07-02):** Quote SSE uses same TWS health gate as REST with poll fallback; TWS stream connect/first-frame timeouts; watchlist SSE → REST fallback on stall/error; bounded `primeMarketData` + warmup route budget; sidecar `/health` freshness/capabilities; `scripts/tws-sidecar.sh` logs effective `TWS_PORT`; recovery finalization warmup budget.
- **Verification:** **Focused:** 55 tests passed; **Startup:** `npm run check:startup` passed (26 tests); **Build:** `npm run build` passed; **App-level:** candles/quotes/warmup/stream fallback probes passed on stale sidecar; **Architecture review:** self-review Passed; **Recovery walkthrough:** pending.
- **Blockers:** Restart sidecar from current source before live recovery evidence; IB Gateway paper login on port `4002`.

## Task Contract — Harness enforcement tightening

- **Status:** Complete — row marked **Passing** 2026-07-01.
- **Goal:** Machine-check Passing rules (no pending evidence), require concrete verification output, add session-exit checklist, add lightweight bugfix plan path.
- **Delivered:** `scripts/validate-project-status.mts` + tests; extended `validate-agent-instructions.mts`; `docs/checklists/session-exit-checklist.md`; planning-router lightweight plan stub; plan-harness-awareness evidence-quote rule; corrected Active Work rows that marked Passing with app-level still open.
- **Verification:** **Focused:** 10 tests passed (`validate-project-status.test.ts`); **Startup:** `npm run lint:instructions` passed; `npm run check:startup` passed (26 tests).
- **Blockers:** none.

## Task Contract — IB account tracking

- **Status:** Pending — panel UI overhaul shipped; app-level walkthrough on live IB Gateway pending.
- **Goal:** Live IB account data (positions, PnL, summary, orders, executions) in Account sidebar panel + chart position overlays; read-only w.r.t. brokerage mutations; TWS sidecar via reqAccountUpdates/reqPnL/openOrder events.
- **Delivered:** Sidecar `/account/*` + `/stream/account`; account tracking always attempted through the local sidecar with no `TWS_BROKERAGE_ENABLED` gate; non-blocking account update subscription for live/read-only Gateway; read-only-safe order snapshot handling; `src/lib/brokerage/` service + contracts; `/api/brokerage/*` routes; `AccountProvider` + Account panel; chart avg-cost reference line when showPositions enabled; Data Health account feed row; architecture + env docs.
- **Delivered (2026-07-01):** Account panel UI overhaul — removed what-if preview UI; color-coded PnL (`--edge-positive`/`--edge-negative`); metric help tooltips; tabbed orders/fills; icon refresh button; day-trades folded into net-liq card; leverage computed as InitMargin/NetLiq; position sort dropdown removed.
- **Verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 13 passed (13)` (`AccountPanel`, `positionOverlays`); **Startup:** `npm run check:startup` passed (26 tests); Architecture review self-review Passed.
- **Blockers:** App-level Account panel walkthrough not recorded on live IB Gateway; open-order snapshot live verification requires `TWS_READONLY=false`.

## Task Contract — Screener sort by leading rule + column picker

- **Status:** Complete — row marked **Passing** 2026-06-29.
- **Goal:** Sort screener results by the primary leading rule on run; configurable columns via cog dropdown; per-saved-screen sort persistence; indicator metric columns for technical screens.
- **Delivered:** `deriveDefaultSort.ts` + `indicatorColumns.ts`; `ColumnPicker` (ChartAnchoredPopover + checkboxes); `ResultsTable` sort arrows + indicator columns; `PersistedScreenerSortSpec` vs ephemeral indicator sort; `country`/`change` columns; Zod + localStorage sort round-trip.
- **Verification:** **Focused:** 96 screener-related tests passed; **Build:** `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); **App-level:** pending walkthrough on `localhost:3003`; **Architecture review:** self-review Passed.
- **Blockers:** none.

## Task Contract — Screener dialog layout overhaul

- **Status:** Complete — row marked **Passing** 2026-06-29.
- **Scope:** Run discoverability, collapsible rules, bounded scroll, Save/Limit/Run reorganization.
- **Out of scope:** presets sidebar, results table, comparison dialog, query compile/validation, API.
- **Delivered:** `EdgeButton variant="primary"`; `EdgeModalShell headerActions`; Run in Custom Query header + `Cmd/Ctrl+Enter`; Save in modal header; Limit in footer; collapsible rule rows + expand/collapse all + scroll container; `formatQueryRuleSummary`.
- **Verification:** **Focused:** 37 screener + 9 design-system/lib-screener tests passed; **Build:** `npm run build` passed; **App-level:** pending walkthrough on `localhost:3003`; **Architecture review:** self-review Passed.

## Task Contract — Screener technical rule builder (v1)

- **Status:** Complete — row marked **Passing** 2026-06-29.
- **Goal:** Wire chart-core indicator registry into screener QueryBuilder; registry-aware validation client + API; round-trip `query.technical`; named kinds preserved read-only.
- **Delivered:** `TechnicalQueryRule` in `compileQuery.ts`; `validateIndicatorRule.ts` + API route gate; `TechnicalRuleEditor` in `QueryBuilder.tsx`; client validation in `ScreenerDialog`; tests for compile, validation, UI, API.
- **Verification:** focused 71 tests passed; `npm run build:packages` + `npm run build` passed; `npm run check:startup` passed (26 tests); app-level walkthrough pending.
- **Blockers:** none. **Follow-up:** v2 multiple technical rules per screen; v5 migrate named kinds to indicator rules.

## Task Contract — Screener observability + baseline

- **Status:** Complete — row marked **Passing** 2026-06-29.
- **Goal:** Instrument screener perf path and capture before-optimization baseline for technical presets.
- **Delivered:** `PerfPhaseCollector` on `/api/screener/run` + `getScreenerResults` + `runTechnicalFilter`; `screener.fetch` client telemetry; Screener filter in `MarketDataLatencyDiagnosticsView`; `deriveScreenerPerfFromPhases`; screener scenarios in `npm run perf:market-data`; `docs/perf/screener-baseline-latest.json`.
- **Verification:** focused 48 tests passed; `npm run build` passed; baseline captured (TWS connected, IBKR unauthenticated); app-level screener latency panel check pending.
- **Blockers:** none.

## Task Contract — Massive universe screener (full-universe technical scan)

- **Status:** Complete — row marked **Passing** 2026-06-29.
- **Goal:** Sub-2s cold full-universe technical screener via Massive Daily Market Summary store; remove 200-candidate cap; no pre-close Massive 403; clean screener warning UX.
- **Delivered:** Massive provider; `universeDailyStore`; `marketCalendar.ts`; sanitized Massive 403 notices; `meta.skippedSymbols` + ResultsTable UX; perf diff captured (1.41×–6.2× cold speedups).
- **Verification:** focused 51 tests passed; `npm run build` passed; MACD bullish API smoke on `localhost:3003` (no 403, typed skips); `npm run check` 7 pre-existing unrelated failures.
- **Blockers:** none. **Deferred risk:** US market holidays not in calendar yet.

## Task Contract — Stock screener Phase 3 (custom indicators + comparison + summarize_screen)

- **Status:** Complete — row marked **Passing** 2026-06-28.
- **Goal:** Phase 3 per `docs/screener-roadmap.md` — custom-indicator rules via chart-core `IndicatorPlugin`, comparison table, `summarize_screen` AI tool; scheduled re-runs/alerts deferred.
- **Delivered:** `kind: "indicator"` technical rule schema + evaluator; candle-fingerprint `screener_technical` cache; three indicator presets; `meta.indicatorValues` sidecar; `ComparisonView` + multi-select compare; `summarize_screen` tool + `ToolContext.screener` facet.
- **Verification:** focused screener + AI tests passed; `npm run build:packages` + `npm run build` passed; app-level walkthrough pending.
- **Blockers:** none.

## Task Contract — Stock screener Phase 2 (composition + persistence + live results)

- **Status:** Complete — row marked **Passing** 2026-06-28.
- **Goal:** Phase 2 per `docs/screener-roadmap.md` — Postgres screener library sync, group watchlist actions, live quote overlay, AND/OR groups, export; `screen_runs` deferred to Phase 3.
- **Delivered:** `user_screener_library` table + `/api/me/screener-library` + `useScreenerLibraryRemoteSync` + `ScreenerProvider`; bulk watchlist reducers; `MarketDataProvider` screener symbol coalescing; `exportResults`; nested `RuleGroup` query-builder; incremental `db-migrate`.
- **Verification:** focused 63 tests passed; `npm run build` passed; `npm run check:startup` passed (26 tests); app-level screener walkthrough on `localhost:3003` (Gainers preset, group actions, OR group, save screen).
- **Blockers:** none.

## Task Contract — Stock screener Phase 1.5 (technical presets)

- **Status:** Pending — implementation complete 2026-06-28; focused tests + build:packages + startup gate pass; app-level walkthrough pending.
- **Goal:** Phase 1.5 per `docs/screener-roadmap.md` — RSI/golden-cross/52-week technical presets via FMP prefilter + Yahoo candles + `@edge/chart-core/indicators/math`; presets only (no query-builder extension); two-phase progress UI.
- **Delivered:** `ScreenQuery.technical` schema; `technicalMath.ts` + `technicalFilter.ts` (bounded concurrency, 200-cap, `screener_technical` cache); extended `MarketDataService.getScreenerResults()` with two-step pipeline + `meta.phases`; four presets in `presets.ts`; phase summary + loading label in `ScreenerDialog` / `ResultsTable`; architecture + roadmap doc updates.
- **Verification:** focused 52 tests passed; `npm run build:packages` passed; `npm run check:startup` passed (26 tests); app-level technical preset walkthrough pending on `localhost:3003`.
- **Blockers:** none for Phase 1.5 code; full app build still blocked by pre-existing TS debt outside screener paths.

## Task Contract — Stock screener MVP (Lean)

- **Status:** Pending — implementation complete 2026-06-27; focused tests + startup gate pass; app-level walkthrough and full app build pending.
- **Goal:** Lean Phase 1 screener per plan — FMP `/company-screener`, mover presets, query-builder, results table, localStorage saved screens, header-bar modal entry.
- **Delivered:** `POST /api/screener/run` + `MarketDataService.getScreenerResults()`; FMP `runStockScreener()` + `screenQueryToFmpParams()`; `src/lib/screener/` (types, presets, screenStorage, compileQuery); `apiScreenerFeed`; `ScreenerDialog` + `QueryBuilder` + `ResultsTable` + header wiring in `ChartHeaderBar` / `StockApp`.
- **Verification:** focused 48 tests passed; `npm run build:packages` passed; `npm run check:startup` passed (26 tests); app-level screener walkthrough pending on `localhost:3003`.
- **Blockers:** full `npm run build` fails on pre-existing TypeScript errors outside screener paths (`apiChartDataFeed.ts` meta/phases typing).

## Task Contract — Market context breadcrumb navigation

- **Status:** Complete — row marked **Passing** 2026-06-27 (app-level check recommended, not blocking).
- **Goal:** Show market context in chart header using a three-axis taxonomy: non-clickable Sector › Industry classification path (Axis 1) plus Related ▾ popover grouping tradable wrappers by membership flavor (Axis 2/3); retain browser-style per-cell symbol back/forward navigation.
- **Delivered:** `TradableFlavor` / `TradableGroup` / `tradableGroups` on `MarketContext`; expanded curated tables (`INDEX_MEMBERSHIP`, `BENCHMARK_MEMBERSHIP`, `STYLE_MEMBERSHIP`, `STRATEGY_MEMBERSHIP`); `buildTradableGroups()` + classification-only `buildBreadcrumbChain()`; `MarketContextBreadcrumb` split UI (classification labels + Related ▾ grouped popover + legacy fallback for stale cache); architecture doc three-axis subsection.
- **Verification:** focused market-context + chart-chrome tests + `npm run check:startup` + app-level `IBM`/`AAPL` Related ▾ flow and back/forward after ETF jump on `localhost:3003`.
- **Blockers:** none.

## Task Contract — Options chain dialog UX + cold-chain latency

- **Status:** Complete — row marked **Passing** 2026-06-27.
- **Goal:** Fix dialog scroll/loading UX, move risk ruler presets to top, remove right-sidebar Options entry, and reduce avoidable cold TWS chain latency.
- **Delivered:** Scrollable dialog body with `options-chain-dialog-scroll`; prominent `ChainLoadingState` with spinner/skeleton; top quick risk ruler preset buttons with “Click to add to chart”; Options removed from sidebar rail/registry; legacy `activePanel: "options"` migrates to null with width preserved; TWS sidecar uses client `strikeWindow.spot` and caches secdef per underlying (524–796 ms subsequent expirations vs ~5–10 s baseline per expiration).
- **Verification:** focused UI/layout/market-data tests (107 passed) + `npm run check:startup` (26 passed) + live AAPL timing probe after sidecar restart.
- **Blockers:** none; app-level manual dialog check still recommended.

## Task Contract — Options chain floating dialog

- **Status:** Complete — follow-up sidebar/expiration fix marked **Passing** 2026-06-27.
- **Goal:** Popup-first options chain UX: remove sidebar chain table; ensure expiration tab changes reload the selected expiration's chain.
- **Delivered:** Compact `OptionsPanel` launcher (no `useOptionsChainModel` in sidebar); `OptionsChainDialogContent` mounts hook only when open; `selectExpiration` clears chain state and resets `chainMode` to `atm` before refetch; regression tests for launcher-only sidebar and expiration switching in dialog.
- **Verification:** focused options tests (10 passed) + `npm run check:startup` (26 passed); app-level expiration switch check pending on `localhost:3003`.
- **Blockers:** none.

## Task Contract — Data Health latency diagnostics

- **Status:** Complete — row marked **Passing** 2026-06-27.
- **Goal:** Combine the fixed bottom-right Market Data Telemetry panel into the top-left Data Health dropdown with a collapsible dev-only Latency Diagnostics section.
- **Delivered:** `MarketDataLatencyDiagnosticsView` extracted for reuse; `DataHealthLatencySection` subscribes via external store only when telemetry enabled and menu section is mounted; collapsed by default with summary hint; Log/Copy latency JSON in expanded body; fixed overlay removed from `StockApp`; deprecated `MarketDataTelemetryPanel` wrapper retained for tests.
- **Verification:** focused data-health/telemetry tests (17 passed) + `npm run check:startup` (26 passed); app-level Data Health expand/collapse check pending on `localhost:3003`.

## Task Contract — Right sidebar resize consistency

- **Status:** Complete — row marked **Passing** 2026-06-27.
- **Goal:** Fix jumpy first-drag resize and inconsistent width when switching Object Tree, Options, and Watchlist by using one shared sidebar width and local draft preview during pointer drag.
- **Delivered:** `SidebarPrefs.width` replaces `panelWidths`; `resolveSidebarPanelWidth(width)` + `migrateSidebarWidth()`; layout storage + workspace schema legacy migration; `useSidebarResize` pointer preview/commit; `SidebarPanelShell` local `draftWidth`; `StockApp` shared width setter.
- **Verification:** focused sidebar/layout/persistence tests (67 passed) + `npm run check:startup` (26 passed); cross-panel width + drag semantics encoded in `SidebarPanelShell.test.tsx` and `RightSidebar.test.tsx`.

## Task Contract — TWS extended-hours price alignment

- **Status:** Pending — paused for sidebar resize fix; app-level verification not yet recorded.
- **Goal:** Align watchlist `LAST` with chart current-price marker using the same live quote; support TWS extended-hours intraday candles; make pre/regular/post-market state explicit in chart UI.
- **Delivered:** `marketSession` helpers; `livePrice`/`liveMarketSession` chart props; `sessionMode` on candle requests + TWS sidecar `useRTH`; Settings → Extended hours toggle; session status badge on legend; pre/post background bands when extended mode enabled; telemetry panel uses external-store subscription with cached snapshot; SSE quote first-paint telemetry moved out of React state updater.
- **Verification:** focused marketSession/renderer/chart-feed/market-data tests + telemetry tests + `npm run build:packages` + app-level TWS alignment check + app-level console clean on reload.

## Task Contract — TWS sidecar in-app recovery

- **Status:** Complete — row marked **Passing** 2026-06-30 (app-level walkthrough pending).
- **Goal:** After IB Gateway is manually restored, let the user recover TWS from the Data Health panel without restarting the Next.js app, with honest source labels, observable recovery phases, and reliable late-success finalization when the sidecar process is alive but wedged.
- **Root cause (observed):** Sidecar process can listen on 8765 while `/health`/`/status` time out because the single IB worker queue is blocked; Gateway client count can show connected while Edge health still reports disconnected.
- **Delivered:** Non-blocking control-plane `/health`/`/status`; worker diagnostics (`queueDepth`, `activeJob`, `workerWedged`, recovery phase); bounded `run_on_ib_thread`; sidecar reconnect state machine (`accepted`/`inProgress`/`timedOut`); `recoverySession` + `finalizeTwsRecoveryIfNeeded()`; `GET /api/market-data/tws/recover/status`; Data Health polls recovery status with phase messages; health circuit bypass during active recovery; stream reconnecting errors treated as recoverable.
- **Security:** Available when `TWS_ENABLED=true`; spawns only static `npm run tws:sidecar`; no user-controlled shell input.
- **Verification:** **Focused:** 67 tests passed; **Startup:** `npm run check:startup` passed (26 tests); **App-level:** pending recovery walkthrough on `localhost:3003`; **Architecture review:** self-review Passed.

## Task Contract — Data health center

- **Status:** Complete — row marked **Passing** 2026-06-26.
- **Delivered:** Health snapshot contracts + severity derivation; `/api/market-data/health` provider summary route; `DataHealthProvider` + header dropdown UI; watchlist quote meta propagation; options panel meta registration; architecture doc update.
- **Verification:** focused market-data/chart-header/data-health tests (169 passed) + `npm run check:startup` (26 passed).

## Task Contract — Sidebar resize chart stability

- **Status:** Complete — row marked **Passing** 2026-06-26.
- **Delivered:** Sidebar drag width updates are animation-frame coalesced with final mouseup flush; chart canvas size/data refresh now runs in layout effect to avoid the transparent backing-store frame when `width`/`height` attributes change.
- **Verification:** focused sidebar/canvas tests + `npm run check:startup` + live app drag instrumentation passed.

## Task Contract — Event overlay data + bottom rail

- **Status:** Complete — row marked **Passing** 2026-06-26.
- **Delivered:** FMP corporate calendar passes `from`/`to`, validates row-level symbol, date-only events map to noon UTC; reserved `EVENT_RAIL_HEIGHT` strip; horizontal proximity grouping with count badges; grouped event detail card with date header.
- **Verification:** focused event/market-data/chart tests + `npm run build:packages` + `npm run check:startup` passed.

## Task Contract — Watchlist organization + resizable side panels

- **Status:** Complete — row marked **Passing** 2026-06-26.
- **Delivered:** Extended watchlist item metadata (`pinned`, `tags`, `note`) and per-list view prefs; added derived view model for grouping/filtering/sorting; watchlist controls UI; symbol note editor in details panel; shared sidebar resize handle with keyboard support; persisted sidebar width in chart layout (later unified to shared `sidebar.width` — see Right sidebar resize consistency).
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

### 2026-07-03 — Data trust domain model

- **Goal:** Make data usage/trust explicit for maintainability and future trading safety — central policy table, readiness evaluation, trading gate contract, API/Data Health metadata.
- **Completed:** `src/lib/marketData/trust/dataTrust.ts` + tests; `src/lib/tradingSafety/tradingReadiness.ts` + tests; `enrichResponseMeta.ts` on `/api/candles` and `/api/quotes`; Data Health `display-only` + trust fields; architecture doc section.
- **Verification run:** **Focused:** 84 tests passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.4s`); **Startup:** `npm run check:startup` passed (26 tests); app-level Data Health walkthrough deferred.
- **Known blockers:** none.
- **Next best step:** App-level verify Data Health dataset rows on `localhost:3003` (fallback chart shows `display-only`; connected account does not).

### 2026-07-03 — Icon rail TradingView parity

- **Goal:** Match TradingView icon-to-rail density and darker rail contrast on left drawing toolbar and right sidebar rail.
- **Completed:** Added `--edge-surface-rail` token; bumped rail icons to 22/20px; active state uses `#2a2e39` without ring; both rails use new surface token; docs updated.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 9 passed (9)`; **Build:** `✓ Compiled successfully in 2.5s`; **App-level:** computed styles — rail bg `rgb(19, 23, 34)`, icon 22px / button 36px (ratio 0.61).
- **Known blockers:** none.
- **Next best step:** None — resume deferred Risk panel walkthrough when needed.

### 2026-07-03 — TWS sidecar lifecycle hardening

- **Goal:** Harden sidecar ownership with `TWS_MANAGED` local/external modes, graceful Python shutdown, selective brokerage readiness gating, lifecycle health field; no Docker Compose.
- **Completed:** `managedMode.ts`, ownership checks, bash-script spawn with `edge-local` env, FastAPI lifespan, `awaitSidecarForBrokerage`, `lifecycle` on health API, macOS-compatible lock in `tws-sidecar.sh`, 44 new/updated tests.
- **Verification run:** **Focused:** 40 Vitest + 4 Python tests; **Build/Startup:** passed; **App-level:** scenarios A–F (local spawn, local kill, external no-spawn/kill, brokerage snapshot, graceful sidecar exit).
- **Known blockers:** none.
- **Next best step:** None for lifecycle work.

### 2026-07-03 — Options Risk Calculator max-risk live sync

- **Goal:** Wire Risk Settings → Options Risk Calculator max-risk default with live sync while untouched, late account arrival fill, and manual edit preservation.
- **Completed:** Replaced one-shot `initializedDefaults` in `OptionsRiskCalculator` with `userTouchedMaxRiskRef` + `dollarRisk` sync effect; added 3 regression tests (late arrival, live sync, override protection).
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 37 passed (37)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`); **Architecture review:** self-review Passed.
- **Known blockers:** none.
- **Next best step:** App-level walkthrough — change risk % in Risk panel with calculator open, confirm sync while untouched and no clobber after manual edit.

### 2026-07-03 — Risk Settings Source of Truth

- **Goal:** Single user-configurable risk sizing source (percent or absolute) persisted in localStorage, resolved against live IB account summary, propagated to options calculator and risk ruler presets.
- **Completed:** `riskSettings.ts` domain module; `RiskSettingsProvider` mounted in `StockApp`; Risk sidebar panel; migrated `OptionsChainDialog`/`OptionsRiskCalculator` and `createRiskRulerPreset`/`useOptionsChainModel`; updated `registry.test.ts` and architecture doc.
- **Verification run:** **Focused:** `Test Files 8 passed (8)`, `Tests 115 passed (115)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.3s`); **Full:** `npm run check` — 6 failures pre-existing unrelated (1588 passed).
- **Known blockers:** none.
- **Next best step:** App-level walkthrough — change risk percent in Risk panel, confirm options calculator max-risk updates.

### 2026-07-03 — TWS sidecar startup coupling

- **Goal:** Couple web server and TWS sidecar lifecycle so restarting `npm run dev` auto-spawns/primes the sidecar when `TWS_ENABLED=true`.
- **Completed:** `instrumentation.ts` boot hook; `startup.ts` singleton wrapping `recoverTwsSidecar`; `killManagedSidecar()` export + shutdown handlers; focused tests; architecture doc startup coupling note.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.3s`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** sidecar stopped → dev restart → `/health` ok at 1s; `POST /api/candles` → `meta.source: tws`; dev SIGTERM → sidecar stopped.
- **Known blockers:** none.
- **Next best step:** None — feature complete.

### 2026-07-03 — Shift+Click Time/Price Ruler Tool

- **Goal:** Add shaded time/price ruler drawing with ⇧+click shortcut on the price pane and toolbar discovery entry.
- **Completed:** `ruler` DrawingPlugin (shaded rect, Δtime/Δprice labels, union hit-test); `formatTimeDelta` helper; interval plumbed into draw opts; shift+click arming in `useDrawingController`; toolbar `rulerTool` button; focused tests + docs.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 38 passed (38)`; **Build:** `npm run build:packages` + `npm run build` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Startup:** `npm run check:startup` passed (26 tests).
- **Known blockers:** App-level ⇧+click visual walkthrough on `localhost:3003` not recorded.
- **Next best step:** Manual verify shaded ruler on AAPL price pane at `1d` and `15m` intervals; confirm persisted drawing round-trip.

### 2026-07-02 — Options Risk Calculator v2.1 (chain-native legs)

- **Goal:** Fix Risk Calculator so leg strikes come from loaded chain data and max-risk contract sizing is visible in the UI.
- **Completed:** Added chain selection helpers; strike dropdown + nearest ATM Add leg; auto contracts badge; chain loading gates; 8 new/updated UI tests.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 36 passed (36)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.2s`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** `GET /api/options/chain?underlying=LLY&expiration=2026-07-10` → 40 contracts (`meta.source: massive`).
- **Known blockers:** Browser UI walkthrough (strike dropdown + auto badge) not recorded.
- **Next best step:** Manual verify on `localhost:3003` — LLY → Analyze → $4k max risk → confirm Auto: N contracts and payoff grid.

### 2026-07-02 — Options Risk Calculator v2

- **Goal:** Replace v1 Risk Calc wizard with multi-leg Risk Calculator showing pre-expiration-to-expiration payoff surface sized from dollar risk.
- **Completed:** Added `optionsStrategyRisk.ts` engine with Zod validation, Black-Scholes estimates, defined-risk contract sizing, and payoff grid; rebuilt `OptionsRiskCalculator.tsx`; added chain Analyze handoff and tab rename in options dialog; updated tests and harness evidence.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 28 passed (28)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.3s`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** `GET /api/options/expirations?underlying=LLY` → 18 expirations (`meta.source: massive`); `GET /api/options/chain?underlying=LLY&expiration=2026-07-10` → 40 contracts (`meta.source: massive`).
- **Known blockers:** Browser UI walkthrough (Analyze → Risk Calculator → payoff grid) not recorded.
- **Next best step:** Manual verify Analyze → Risk Calculator → payoff grid on `localhost:3003`; resume IB account tracking walkthrough.

### 2026-07-02 — Massive Options Analysis Provider

- **Goal:** Integrate Massive/Polygon Options Advanced as Edge's primary web-app options analysis provider; keep IBKR/TWS for brokerage/account/execution only.
- **Completed:** Massive options provider submodule, mappers, pagination, Massive-first service routing, tests, architecture docs, harness evidence.
- **Verification run:** **Focused:** `Test Files 9 passed (9)`, `Tests 93 passed (93)`; **Startup:** 26 tests passed; **Build:** `npm run build` passed; **App-level:** `GET /api/options/expirations?underlying=AAPL` → `meta.source: massive`, 0 expirations (Massive 401).
- **Known blockers:** Configured `MASSIVE_API_KEY` returned HTTP 401 — refresh key or confirm Options Advanced plan before expecting live chain data.
- **Next best step:** Re-run expirations + chain smoke after key fix; resume IB account tracking walkthrough.

### 2026-07-01 — Documentation Automation Framework

- **Goal:** Implement typed Cursor SDK documentation automation with validation guardrails around the existing pre-push hook.
- **Completed:** Added `docs-automation-framework.mts` with owner-area classification, lane-specific prompts, allowlist/summary validation; hardened `update-docs-for-diff.mts` with architecture/harness/drift-audit lanes, evidence gate, non-doc edit blocking, post-agent `lint:instructions`, timeout, and structured logging; 35 focused tests; AGENTS.md + `.env.example` updates.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 35 passed (35)`; **Startup:** `npm run lint:instructions` passed; `npm run check:startup` passed (26 tests); **SDK smoke:** `status=finished`, `SDK smoke OK`, `durationMs=5154`.
- **Known blockers:** Live pre-push diff dry run not recorded.
- **Next best step:** Resume IB account tracking app-level walkthrough; optional docs auto-update dry run before next push.

### 2026-07-01 — Options Risk Calculator v1.1 (Compare fixes)

- **Goal:** Fix Compare screen — 3 distinct strikes, non-misleading profit/ratio when greeks missing, greeks banner, row labels, auto full-chain load.
- **Completed:** Rewrote `selectThreeStrikes` for distinct ATM/target/halfway; honest `deltaEstimate` in `estimatePremiumAtTarget`/`computeStrikeEvaluation`; Compare UX (banner, labels, `—` for missing-delta profit/ratio, Pick-winner tooltip); guarded `loadAllStrikes()` `useEffect`; 6 new focused tests (71 total across 4 files).
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 71 passed (71)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.4s`); **App-level:** `GET /api/options/expirations?underlying=AAPL` → 25 expirations (`meta.source: tws`); `GET /api/options/chain?underlying=AAPL&expiration=2026-07-02` → 40 contracts (`meta.source: tws`).
- **Known blockers:** Browser Compare UI walkthrough (labels/banner in dialog) not recorded.
- **Next best step:** Manual browser Compare walkthrough; Layer 3 synthetic delta + Recalc.

### 2026-07-01 — Options Risk Calculator v1

- **Goal:** Ship 3-screen single-leg options risk calculator inside OptionsChainDialog per 7-step directional algorithm.
- **Completed:** Added `premiumProjection.ts` with Zod validation, delta-estimate premium@target, 3-strike compare, pick-winner, contract sizing; `OptionsRiskCalculator.tsx` Setup/Compare/Plan screens; `addRiskRulerPresetFromCalc` for user-defined stop/target; Chain \| Risk Calc toggle in dialog; net-liq default max risk; 65 focused tests.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 65 passed (65)`; **Build:** `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests).
- **Known blockers:** App-level AAPL walkthrough not recorded.
- **Next best step:** Manual walkthrough on `localhost:3003`; follow-ups: AI tool, saved plans, multi-leg, Recalc.

### 2026-07-01 — TWS sidecar positions/fills fix

- **Goal:** Fix slow/missing MKT/PnL on cold positions load and 503 on Today's fills tab.
- **Completed:** Fixed `_account_executions` init (`{}` → `[]`); rewrote `account_trades` to snapshot-then-replace with 1.5s wait; added `_seed_portfolio_market_data()` (ib.portfolio + reqMktData fallback) in `account_positions` and `_setup_account_subscriptions`; added first sidecar unittest suite + `npm run tws:sidecar:test`.
- **Verification run:** **Focused:** `Ran 3 tests in 0.000s` `OK`; **Startup:** `npm run check:startup` passed (26 tests); **App-level:** cold positions → HOOD `marketPrice=108.01999665`, `unrealizedPNL=3441.0`; trades → `HTTP 200`, 3 executions.
- **Known blockers:** Browser Account panel walkthrough on `localhost:3003` not recorded (dev server down during verification).
- **Next best step:** Start dev server, refresh Account panel, confirm MKT/PnL + fills tabs; re-record Account panel UI overhaul walkthrough.

### 2026-07-01 — Client chart SWR cache

- **Goal:** Session-only client stale-while-revalidate cache so re-opened charts paint cached candles instantly while background REST refresh runs.
- **Completed:** Added `chartClientCache.ts` (LRU + 5-min max-age); integrated SWR read/write + `refreshing` flag into `useChartDataFeed`; conservative always-refresh policy; `reloadKey` bypass; error keeps cached candles; 12 focused tests; architecture doc updates.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 12 passed (12)`; **Startup:** `npm run check:startup` passed (26 tests).
- **Known blockers:** App-level re-open walkthrough on `localhost:3003` not recorded.
- **Next best step:** Load AAPL, switch to MSFT, switch back to AAPL — confirm instant stale paint + refresh swap; resume Account panel app-level verification.

### 2026-07-01 — Account panel UI overhaul

- **Goal:** Overhaul Account sidebar panel layout — remove what-if preview, color-code PnL, add metric tooltips, tab orders/fills, icon refresh, fold day-trades into net-liq card, compute leverage.
- **Completed:** Removed `WhatIfPreview` UI; fixed PnL tokens to `--edge-positive`/`--edge-negative`; removed position sort dropdown; day-trades in net-liq card top-right; leverage = InitMargin/NetLiq; help tooltips on metrics; `EdgeIconButton` refresh; tabbed orders/fills; expanded `AccountPanel.test.tsx` (11 tests).
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 13 passed (13)`; **Startup:** `npm run check:startup` passed (26 tests).
- **Known blockers:** App-level walkthrough on live IB Gateway not recorded.
- **Next best step:** Manual walkthrough on `localhost:3003` with IB Gateway connected.

### 2026-07-01 — Account tracking always-on

- **Goal:** Remove the separate `TWS_BROKERAGE_ENABLED` opt-in because account tracking should be available whenever the local sidecar/Gateway path is available.
- **Completed:** Removed `TWS_BROKERAGE_ENABLED` from app config, sidecar gating, UI copy, `.env.example`, and docs; changed AccountProvider 503 handling from disabled state to connection error/retry; restarted sidecar from updated code on live `TWS_PORT=4001`.
- **Verification run:** **Syntax:** `py_compile services/tws-sidecar/main.py` passed; **Focused:** `Test Files 5 passed (5)`, `Tests 19 passed (19)`; **Live:** sidecar `/health` returned `capabilities.brokerage: true`; sidecar `/account/status` returned `enabled: true`, `connected: true`, account `U25026894` in 4574ms; `/api/brokerage/snapshot` returned connected account `U25026894` + 1 position in 515ms.
- **Known blockers:** What-if preview and open-order snapshot still require `TWS_READONLY=false` because IB rejects them in read-only mode.
- **Next best step:** Refresh the browser; Account panel should load rather than show the disabled env-var message.

### 2026-06-30 — IB live account sidecar fix

- **Goal:** Investigate live IB Gateway showing one API client connected while Edge Data Health reported degraded/account feed errors after sidecar restart.
- **Root cause:** Live/read-only IB Gateway accepted the socket, but sidecar brokerage setup blocked inside `ib.reqAccountUpdates(account)`; `ib.reqOpenOrders()` also hung after IB error 321 in read-only mode, wedging the single IB worker and causing every account endpoint to time out.
- **Completed:** Changed account setup to send account updates with non-blocking `ib.client.reqAccountUpdates(True, account)`; skipped open-order requests while `TWS_READONLY=true`; fixed swallowed summary-cache mapping; made what-if preview return 403 when the IB API session is read-only; restarted sidecar on live `TWS_PORT=4001`.
- **Verification run:** **Syntax:** `py_compile services/tws-sidecar/main.py` passed; **Focused:** `Test Files 3 passed (3)`, `Tests 8 passed (8)`; **Live:** sidecar `/status` `gatewayConnected: true`, `connectionState: connected`, `activeClientId: 77`; `/api/brokerage/status` returned `U25026894` in 18ms; `/api/brokerage/snapshot` connected in 517ms; Data Health TWS row healthy/no warnings; AMD candles returned 390 bars with `meta.source: tws` and `latencyMs: 996`.
- **Known blockers:** What-if preview and live order snapshot need `TWS_READONLY=false`; keep read-only mode for account-data verification unless explicitly testing those flows.
- **Next best step:** Refresh the app and verify the Account panel renders summary/positions; only flip `TWS_READONLY=false` if validating what-if/order snapshot behavior.

### 2026-07-01 — Local docs update hook MVP

- **Goal:** Prove local-only git pre-push hook can invoke Cursor SDK agent to update docs from the unpushed diff without cloud checkout.
- **Completed:** `@cursor/sdk` dependency; `scripts/update-docs-for-diff.mts` with pre-push/manual/sdk-smoke modes; `.githooks/pre-push` with `EDGE_SKIP_DOCS_HOOK` escape hatch; `npm run docs:auto-update` and `npm run hooks:install`; Vitest helpers for parsing/skip/exit decisions; `.env.example` `CURSOR_API_KEY` note.
- **Verification run:** **Focused:** 10 tests passed; **Startup:** `npm run check:startup` passed (26 tests); **SDK smoke:** blocked — `CURSOR_API_KEY is not set`.
- **Known blockers:** Live SDK agent run requires user API key.
- **Next best step:** `export CURSOR_API_KEY=...`, `npx tsx scripts/update-docs-for-diff.mts --sdk-smoke`, then `npm run hooks:install` and test on a real push.

### 2026-07-02 — TWS data-foundation fallback hardening

- **Goal:** Fix incident where REST candles/quotes fall back to Yahoo but warmup, quote SSE, and recovery finalization hang on stale/unhealthy TWS sidecar.
- **Completed:** Quote SSE health-gate + first-frame/connect timeout poll fallback; bounded warmup (skip/race TWS warmup, parallel candle/quote phases, defer options); watchlist SSE → REST fallback; sidecar `/health` version/capabilities; TWS port startup logging; recovery finalize warmup budget; architecture doc update.
- **Verification run:** **Focused:** 55 tests passed; **Startup:** `npm run check:startup` passed (26 tests); **Build:** `npm run build` passed; **App-level:** candles HTTP 200 in 0.137s (`meta.source: yahoo`); quotes HTTP 200 in 0.092s; warmup HTTP 200 in 0.094s (totalMs 90, skipped tws.warmup); stream snapshot via Yahoo poll within 8s.
- **Known blockers:** Recovery walkthrough pending — restart `npm run tws:sidecar` and confirm IB Gateway paper on port `4002`.
- **Next best step:** Sidecar restart + Data Health recovery walkthrough; then mark Active Work **Passing** if recovery evidence records.

### 2026-07-01 — TWS recovery supervisor

- **Goal:** Harden TWS/IB Gateway recovery — classify failure modes, auto-restart wedged sidecar, preserve recovery session context, resubscribe after IB 1101.
- **Completed:** Sidecar IB connection supervisor with error handlers and status fields; async reconnect when worker wedged; managed sidecar restart escalation; removed `startTwsRecoverySession` overwrite in `recoverTwsSidecar()`; precise Data Health messages for client ID stuck, sidecar restart, resubscribing; architecture doc update.
- **Verification run:** **Focused:** 28 tests passed; **Startup:** `npm run check:startup` passed (26 tests); **Build:** `npm run build` passed.
- **Known blockers:** App-level walkthrough not run; live sidecar on `:8765` returned `/control/recovery` 404 (stale process vs current source).
- **Next best step:** `npm run tws:sidecar` restart, then disconnect/reconnect IB Gateway walkthrough on `localhost:3003`.

### 2026-07-01 — Harness enforcement tightening

- **Goal:** Turn soft harness rules into machine-checked enforcement for Passing state, verification evidence, session exit, and lightweight bugfix plans.
- **Completed:** `validate-project-status.mts` helpers + Vitest coverage; Passing+pending and concrete-evidence checks in `lint:instructions`; `session-exit-checklist.md`; lightweight plan path in planning-router; evidence-quote requirement in plan-harness-awareness; downgraded Active Work rows that had app-level still open from Passing to Pending.
- **Verification run:** **Focused:** 10 tests passed; **Startup:** `npm run lint:instructions` passed; `npm run check:startup` passed (26 tests).
- **Known blockers:** none.
- **Next best step:** Resume IB account tracking app-level walkthrough with IB Gateway paper.

### 2026-06-30 — TWS sidecar recovery hardening

- **Goal:** Harden TWS/IB Gateway recovery when sidecar is alive but wedged — bounded reconnect, observable phases, late-success finalization.
- **Completed:** Sidecar worker diagnostics + bounded IB worker waits; reconnect state machine; `recoverySession`/`finalizeTwsRecoveryIfNeeded`; `GET /api/market-data/tws/recover/status`; Data Health phase polling; health circuit bypass during recovery; provider detail for worker wedge/reconnecting.
- **Verification run:** **Focused:** 67 tests passed; **Startup:** `npm run check:startup` passed (26 tests).
- **Known blockers:** none for code; app-level needs local IB Gateway/TWS sidecar.
- **Next best step:** App-level walkthrough — wedged sidecar → Reconnect → phase messages → Gateway connected → feeds reload.

### 2026-06-30 — TWS/Data Health provider status latency

- **Goal:** Explain and fix multi-minute delay before Provider Status / reconnect affordance appeared in Data Health.
- **Root cause:** Server health only fetched when the menu opened; browser connection pool could queue `/api/market-data/health` behind long-running warmup (~123s). `getTwsStatusProbe()` also did liveness then a second `/status` call with full `TWS_SIDECAR_TIMEOUT_MS`.
- **Completed:** Prefetch health on mount (30s interval) with fetch priority; provisional IB Gateway row from client TWS skip warnings; single 2s `probeStatus` for health; skip sidecar I/O when TWS circuit is open; loading copy in Provider Status section.
- **Verification run:** **Focused:** 56+ health/service/data-health UI tests passed.
- **Next best step:** Reload app with wedged sidecar — Provider Status and Start TWS sidecar should appear immediately (provisional), full server rows within ~2s when health fetch completes.

### 2026-06-30 — TWS/Data Health recovery cleanup

- **Goal:** Clarify reconnect command vs Gateway health vs chart/watchlist/account source state so Data Health UX is not contradictory during async recovery.
- **Completed:** `getTwsStatusProbe()` liveness fast-fail; recover `commandState` contract; client poll + reload after `timed_out`; multi-source `buildHealthSummary`; SSE quote meta; architecture doc update.
- **Verification run:** **Focused:** 78 tests passed; **Startup:** `npm run check:startup` passed (26 tests).
- **Next best step:** App-level walkthrough on `localhost:3003` — wedged sidecar, Reconnect timeout → polling message, independent chart/watchlist/account rows.
- **Known blockers:** none for code; app-level needs local IB Gateway/TWS sidecar.

### 2026-06-30 — TWS cold symbol-change fallback

- **Goal:** Keep chart symbol changes from getting stuck when the TWS sidecar is reachable at the socket level but `/status`/historical candles are unavailable.
- **Completed:** Confirmed cold `POST /api/candles` returned `meta.source: yahoo` but spent ~2.6s total because `ensureTwsGatewayProbe()` ran the 2s liveness probe before noticing the TWS circuit was open; changed the probe to no-op while `twsHealthGate` is in cooldown.
- **Verification run:** **Focused:** 60 market-data tests passed; **App-level:** cold browser candles returned Yahoo in 515ms / 308ms with TWS skipped at 0ms and IBKR skipped for auth.
- **Next best step:** App-level walkthrough with healthy TWS + active historical data farm to confirm recovery still retries TWS after cooldown/recover.
- **Known blockers:** IB Gateway currently reports historical data farm inactive/unavailable; code fallback is passing.

### 2026-06-30 — IB account tracking

- **Goal:** Pull live IB account data via TWS sidecar; surface in Account panel + chart overlays; read-only what-if preview.
- **Completed:** Sidecar account endpoints; Node brokerage vertical; API routes; AccountProvider + panel; position reference lines; Data Health account row; docs.
- **Verification run:** **Focused:** 19 tests passed; **Build:** `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests).
- **Next best step:** Run focused tests + app-level walkthrough with IB Gateway paper.
- **Known blockers:** none for code.

### 2026-06-29 — Screener sort by leading rule + column picker

- **Goal:** Sort results by primary leading rule on run; cog column picker; per-saved-screen sort persistence; indicator columns for technical screens.
- **Completed:** `deriveDefaultSortFromRoot`; `ColumnPicker` dropdown; `ResultsTable` sort arrows + indicator columns; `PersistedScreenerSortSpec`; `country`/`change` columns; provider/dialog sort wiring.
- **Verification run:** **Focused:** 96 screener-related tests passed; **Build:** `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests).
- **Next best step:** App-level walkthrough on `localhost:3003`.
- **Known blockers:** none.

### 2026-06-29 — Screener dialog layout overhaul

- **Goal:** Run discoverability, collapsible rules, bounded scroll, Save/Limit/Run reorganization in screener modal.
- **Completed:** Primary Run button in Custom Query header with `⌘↵`; Save in modal header; Limit in footer; collapsible rule summaries with expand-all/collapse-all; `max-h-[40vh]` rules scroll; `formatQueryRuleSummary`; design-system `EdgeButton` primary variant + `EdgeModalShell headerActions`.
- **Verification run:** **Focused:** 37 screener + 9 design-system/lib-screener tests passed; **Build:** `npm run build` passed.
- **Next best step:** App-level walkthrough on `localhost:3003`.
- **Known blockers:** none.

### 2026-06-29 — Screener technical rule builder (v1)

- **Goal:** Registry-driven custom technical rules in screener QueryBuilder with client + API validation; round-trip presets/saved screens; named kinds read-only.
- **Completed:** `TechnicalQueryRule` compile round-trip; `validateIndicatorRule`; `TechnicalRuleEditor`; API 400 on invalid indicator rules; docs + harness updates.
- **Verification run:** **Focused:** 71 tests passed; **Build:** `npm run build:packages` + `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests).
- **Next best step:** App-level walkthrough on `localhost:3003`; v2 multiple technical rules.
- **Known blockers:** none.

### 2026-06-29 — Market calendar + screener warning cleanup

- **Goal:** Fix pre-close Massive 403 (Sunday UTC rollover / weekday before 4pm ET); sanitize provider warning text; split typed `skippedSymbols` from provider notices in screener UI.
- **Completed:** `marketCalendar.ts` + regression tests; rewired universe store + Massive aggregate `to` dates; sanitized Massive 403 message; `ScreenerMeta.skippedSymbols` threaded service → API → feed → UI.
- **Verification run:** **Focused:** 51 tests passed; **Build:** `npm run build` passed; **App-level:** MACD bullish API — 9 rows, no 403 in warnings, 11 skippedSymbols typed separately.
- **Next best step:** Complete verification; then app-level full screener walkthrough for Massive universe task.
- **Known blockers:** none. US market holidays deferred.

### 2026-06-29 — Massive universe screener (design + implementation)

- **Goal:** Massive adapter + full-universe screener architecture — Daily Market Summary cache + local indicator scan; remove 200-candidate cap; target ~1–2s cold.
- **Completed:** Research + provider selection (Massive); implementation of provider, universe store, service wiring, technicalFilter enhancements (concurrency, early-exit, range tailoring), docs + harness updates.
- **Verification run:** **Focused:** 39 tests passed; **Build:** `npm run build` passed; **Collection:** `npm run perf:market-data` ran but used fallback path (no `MASSIVE_API_KEY` in `.env.local` — still 200 candidates, TWS/Yahoo); after snapshot pending Massive key.
- **Next best step:** Run `npm run build` + `npm run perf:market-data` with `MASSIVE_API_KEY`; diff against `docs/perf/screener-baseline-latest.json`; app-level screener modal on `localhost:3003`.
- **Known blockers:** Massive paid tier recommended for universe backfill; FMP pagination uses offset loop (verify live FMP supports offset).

### 2026-06-29 — Screener observability + baseline

- **Completed:** Perf phases on screener route/service/technical filter; Screener tab in dev latency panel; `screener.fetch` telemetry; baseline script + `docs/perf/screener-baseline-latest.json`.
- **Verification run:** **Focused:** 48 tests passed; **Build:** `npm run build` passed; **Baseline:** cold technical presets ~29–51s (technical pass dominates; FMP prefilter ~300–400ms).
- **Next best step:** FMP-prefilter fast path for built-in presets; re-run baseline and diff.

### 2026-06-28 — Stock screener Phase 3 (custom indicators + comparison + summarize_screen)

- **Completed:** `kind: "indicator"` technical rules via chart-core plugins; candle-fingerprint cache; MACD/BOLL %B/RSI indicator presets; `meta.indicatorValues` sidecar; comparison table + multi-select; `summarize_screen` AI tool with `ToolContext.screener` facet.
- **Verification run:** **Focused:** 49 screener/AI tests passed; **Build:** `npm run build:packages` + `npm run build` passed; **App-level:** pending indicator preset + compare + summarize_screen walkthrough on `localhost:3003`.
- **Next best step:** App-level verify Phase 3; scheduled re-runs/alerts remain deferred until alerts infra.

### 2026-06-28 — Stock screener Phase 2 (composition + persistence + live results)

- **Completed:** Postgres screener library sync mirroring watchlist pattern; `ScreenerProvider` with local + remote sync; group watchlist actions; live quote overlay via `MarketDataProvider`; AND/OR query groups; CSV + clipboard export; `screen_runs` deferred to Phase 3.
- **Verification run:** **Focused:** 63 tests passed; **Build:** `npm run build` passed (cleared IBKR/TWS/stream TS debt); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** Gainers preset, group actions, OR group, save screen on `localhost:3003`.
- **Next best step:** Phase 3 (`screen_runs` snapshots, scheduled refresh) per `docs/screener-roadmap.md`.

### 2026-06-28 — Stock screener Phase 1.5 (technical presets)

- **Goal:** Ship Phase 1.5 technical presets — RSI oversold/overbought, golden cross, near 52-week high — via server-side two-step pipeline (FMP prefilter + Yahoo candles + chart-core indicator math).
- **Completed:** `ScreenQuery.technical` schema; `technicalMath.ts` + `technicalFilter.ts`; extended `MarketDataService.getScreenerResults()`; four presets; two-phase loading label + phase summary UI; `screener_technical` cache namespace; architecture + roadmap updates.
- **Verification run:** **Focused:** 52 tests passed; **Build:** `npm run build:packages` passed; **Startup:** `npm run check:startup` passed (26 tests); **App-level:** pending technical preset walkthrough on `localhost:3003`.
- **Next best step:** App-level verify four technical presets + phase summary; then Phase 2 (Postgres persistence, group actions, live streaming) per `docs/screener-roadmap.md`.

### 2026-06-28 — Market context breadcrumb inline ETF crumbs + overlap fix

- **Goal:** Replace Related dropdown popover with inline clickable ETF crumbs (sector, industry, all tradables); hover tooltips on native `title`; direct click navigation; fix breadcrumb/OHLCV ticker overlap.
- **Completed:** Rewrote `MarketContextBreadcrumb` (removed popover/chevron; inline navigable crumbs with dedupe by symbol; muted labels when no ETF mapping); shifted `ChartLegendBar` context slot to `top-[44px]` with flex-wrap; updated tests and architecture doc.
- **Verification run:** **Focused:** 8 tests passed (`MarketContextBreadcrumb`, `ChartCell.legendSlot`); **Build:** `npm run build:packages` passed; **App-level:** pending manual inline-crumb hover/click + overlap check on `localhost:3003`.
- **Next best step:** App-level verify OUST/AAPL inline crumbs and no ticker overlap; resume screener app-level walkthrough.

### 2026-06-28 — Market context breadcrumb relocation (Option B)

- **Goal:** Move sector/industry breadcrumb and symbol nav arrows from `ChartHeaderBar` into a second line under the OHLCV legend to free header horizontal space.
- **Completed:** Added `contextSlot` to package `ChartLegendBar` and `legendContextSlot` to `EdgeChart`; wired `symbolNav` through `ChartGrid` → active `ChartCell`; render `MarketContextBreadcrumb` in legend slot; removed breadcrumb from header; added `ChartCell.legendSlot.test.tsx`.
- **Verification run:** **Focused:** 20 tests passed; **Build:** `npm run build:packages` passed; **Startup:** `npm run check:startup` passed (26 tests); **App-level:** pending manual legend breadcrumb + nav check on `localhost:3003`.
- **Next best step:** App-level verify breadcrumb placement, Related ▾ popover, and back/forward nav; resume screener app-level walkthrough.

### 2026-06-27 — Stock screener MVP (Lean)

- **Goal:** Ship lean Phase 1 screener — FMP `/company-screener`, presets, query-builder, results table, localStorage saved screens, header modal entry.
- **Completed:** Backend route + service + FMP adapter/mapper; `src/lib/screener/` storage/presets/compileQuery; `apiScreenerFeed`; `ScreenerDialog` UI with presets rail, saved screens, query builder, sortable paginated table, chart/watchlist row actions; header `ScreenerButton` wired through `StockApp`; architecture + roadmap doc updates.
- **Verification run:** **Focused:** 48 tests passed; **Build:** `npm run build:packages` passed; **Startup:** `npm run check:startup` passed (26 tests); **App-level:** pending manual walkthrough on `localhost:3003`; **Full build:** blocked by pre-existing TS errors in `apiChartDataFeed.ts`.
- **Next best step:** App-level verify screener modal on `localhost:3003`; then Phase 1.5 technical presets per `docs/screener-roadmap.md`.

### 2026-06-27 — Market context taxonomy split (v2)

- **Goal:** Refine Sector › Industry › Indexes workflow into three-axis taxonomy: classification path (You are here) + Related ▾ popover (tradable wrappers grouped by membership flavor).
- **Completed:** Added `tradableGroups` contract; split `INDEX_MEMBERSHIP` (broad) from `BENCHMARK_MEMBERSHIP` / `STYLE_MEMBERSHIP` / `STRATEGY_MEMBERSHIP`; `buildTradableGroups()`; classification-only `buildBreadcrumbChain()`; refactored `MarketContextBreadcrumb` (non-clickable sector/industry + Related ▾ grouped popover + legacy cache fallback); updated architecture doc.
- **Verification run:** **Focused:** 43 tests passed; **Startup:** `npm run check:startup` passed (26 tests); **App-level:** pending manual Related ▾ check on `localhost:3003`.
- **Next best step:** Run focused tests, then app-level verify `IBM` classification + Related groups and `AAPL` broad/benchmark navigation.

### 2026-06-27 — Options chain dialog UX + cold-chain latency

- **Goal:** Scrollable dialog with obvious loading, top risk-ruler buttons, remove right-sidebar Options rail, reduce avoidable TWS chain latency.
- **Completed:** Scrollable dialog body + prominent loading state; quick risk ruler moved to top with clearer button styling; Options removed from sidebar rail with legacy layout migration; TWS sidecar uses client spot for ATM selection and caches secdef per underlying.
- **Verification run:** **Focused:** 107 tests passed; **Startup:** `npm run check:startup` passed (26 tests); **Live timing:** first cold AAPL chain 10040 ms; secdef-cache expirations 524 ms / 557 ms / 796 ms after sidecar restart.
- **Next best step:** App-level manual dialog check on `localhost:3003`; resume TWS extended-hours alignment check.

### 2026-06-27 — Options chain sidebar + expiration fix

- **Goal:** Remove full options chain from right sidebar; fix popup expiration selection so each tab loads that expiration's chain.
- **Completed:** Replaced sidebar `OptionsPanel` with compact launcher (no chain table, no background fetch); split `OptionsChainDialog` so `useOptionsChainModel` mounts only when open; added `selectExpiration` to clear stale chain state and reset strike mode; added regression tests for launcher-only sidebar and dialog expiration switching.
- **Verification run:** **Focused:** 11 tests passed (`OptionsChainDialog.test.tsx`, `OptionsPanel.test.tsx`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** pending manual expiration switch check on `localhost:3003`.
- **Next best step:** App-level verify popup expiration switch; resume TWS extended-hours alignment check.

### 2026-06-27 — Browser-style symbol back/forward

- **Goal:** Fix back/forward arrows to behave like a browser — return to the starting/restored symbol, support forward after back, track linked-cell symbol sync per cell.
- **Completed:** Rewrote `useSymbolNavigationHistory` as a cells-observing auto-tracker (seeds on hydration, navigation-safe cursor moves, per-cell linked sync); removed explicit `push` from `StockApp.handleSymbolSelect`; expanded tests (7 cases).
- **Verification run:** **Focused:** 31 tests passed (`src/app/components/chart-chrome/`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** pending manual back/forward check on `localhost:3003`.
- **Next best step:** App-level verify `XLV → AAPL → MSFT → back → back → XLV → forward` and linked-symbol back on a synced cell.

### 2026-06-27 — Breadcrumb condensation (labels as links, indexes popover)

- **Goal:** Condense header breadcrumb — sector/industry labels navigate to representative ETFs; remove standalone ETF/index ticker chips; collapse index memberships into Indexes popover.
- **Completed:** Extended `MarketContextRelationship` with optional `members`; rewrote `buildBreadcrumbChain` to hoist ETF symbols and group indexes; updated `MarketContextBreadcrumb` full + compact rendering; updated tests and architecture doc.
- **Verification run:** **Focused:** 21 tests passed (`src/lib/marketData/context/`, breadcrumb UI, ChartHeaderBar); **Startup:** `npm run check:startup` passed (26 tests); **Runtime:** `buildMarketContext` AAPL chain verified; **App-level:** pending browser check after dev server refresh (cached market-context may serve pre-condensation shape until TTL).
- **Next best step:** Restart dev server and app-level verify `Technology → XLK`, `Indexes → SPY`, back/forward on `localhost:3003`.

### 2026-06-27 — Market context breadcrumb navigation

- **Goal:** Header breadcrumb for sector/industry/representative ETF/index relationships with browser-style symbol back/forward per chart cell.
- **Completed:** Added `MarketContext` contract, IBKR/TWS-first resolver, curated ETF/index maps, `/api/market-data/context`, TWS `/contracts/details`, `MarketContextBreadcrumb`, and `useSymbolNavigationHistory` in `StockApp`.
- **Verification run:** **Focused:** 26 tests passed (`src/lib/marketData/context`, context API route, breadcrumb UI, symbol history, ChartHeaderBar); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** pending breadcrumb/history check on `localhost:3003`.
- **Next best step:** Run `npm run check:startup`, then app-level verify `AAPL → XLK → QQQ → back → forward`.

### 2026-06-27 — Options chain floating dialog

- **Goal:** Move options chain out of cramped sidebar into a TradingView-style floating draggable dialog opened from chart header; preserve pin expiration and risk-ruler presets.
- **Completed:** Extracted `useOptionsChainModel` and `OptionsChainView` (dialog + sidebar variants); added draggable/resizable `OptionsChainDialog` over chart area; wired Options button in `ChartHeaderBar` and `StockApp`; refactored `OptionsPanel` with “Open full chain”; updated focused tests.
- **Verification run:** **Focused:** 24 tests passed (`OptionsChainDialog.test.tsx`, `OptionsPanel.test.tsx`, `ChartHeaderBar.test.tsx`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** pending manual overlay check on `localhost:3003`.
- **Next best step:** App-level verify floating chain (open, drag, switch expirations, pin, risk ruler); resume TWS extended-hours alignment check.

### 2026-06-27 — Data Health latency diagnostics

- **Goal:** Combine the fixed bottom-right Market Data Telemetry panel into the Data Health dropdown with a collapsible dev-only Latency Diagnostics section.
- **Completed:** Extracted `MarketDataLatencyDiagnosticsView`; added `DataHealthLatencySection` (collapsed by default, external-store subscription, summary hint); wired into `DataHealthMenu`; removed fixed overlay from `StockApp`; updated focused tests.
- **Verification run:** **Focused:** 17 tests passed (`src/app/components/data-health`, `MarketDataTelemetryPanel.test.tsx`, `src/lib/marketData/telemetry`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** pending manual Data Health expand/collapse check on `localhost:3003`.
- **Next best step:** Resume TWS extended-hours app-level verification (watchlist LAST vs chart marker; extended-hours bars when enabled).

### 2026-06-27 — Right sidebar resize consistency

- **Goal:** Fix jumpy sidebar drag and width changes when switching Object Tree, Options, and Watchlist.
- **Completed:** Replaced per-panel `sidebar.panelWidths` with shared `sidebar.width`; added legacy migration in layout storage and workspace schema; rewrote resize hook for pointer preview + single commit; local `draftWidth` in shell for immediate visual feedback; updated StockApp wiring and focused tests.
- **Verification run:** **Focused:** 67 tests passed (`src/app/components/sidebar`, `sidebarWidth`, `layoutStorage`, `chartWorkspace`); **Fast:** `npm run check:startup` passed (26 tests); **App-level:** drag preview/commit and cross-panel width consistency covered by component tests; chart canvas stability retained from prior sidebar resize row.
- **Next best step:** Resume TWS extended-hours app-level verification (watchlist LAST vs chart marker; extended-hours bars when enabled).

### 2026-06-27 — Telemetry console warning fix

- **Goal:** Remove React dev console warning caused by telemetry panel updates during `MarketDataProvider` quote state handling.
- **Completed:** Moved SSE `quotes.firstPaint` telemetry out of `setQuotesBySymbol` updater; converted `MarketDataTelemetryPanel` to `useSyncExternalStore`; cached telemetry snapshot for stable external-store reads; added focused tests.
- **Verification run:** **Focused:** 9 tests passed (`collector.test.ts`, `MarketDataTelemetryPanel.test.tsx`); **Fast:** `npm run check:startup` passed (26 tests); **App-level:** `localhost:3003` reload with telemetry panel — no `Cannot update a component (MarketDataTelemetryPanel)` warning.
- **Next best step:** Resume TWS app-level verification (watchlist LAST vs chart marker; extended-hours bars when enabled).

### 2026-06-27 — Architecture review checklist

- **Goal:** Add a cross-cutting architecture review checklist so every plan explicitly decides whether architect review is required without creating a parallel planning workflow.
- **Completed:** Added `docs/checklists/architecture-review-checklist.md` (intake, design, implementation, exit phases); updated planning router, intent checklists, plan harness rule, and instruction validator to require architecture review status in Checklist Review.
- **Verification run:** **Fast:** `npm run lint:instructions` passed; **Startup:** `npm run check:startup` passed (3 files, 26 tests).
- **Next best step:** Resume TWS extended-hours app-level verification (watchlist LAST vs chart marker; extended-hours bars when enabled).

### 2026-06-27 — Planning checklist router

- **Goal:** Route planning requests to intent-specific checklists through the existing harness rule without splitting planning enforcement across multiple Cursor rules.
- **Completed:** Added `docs/checklists/` (router, feature, refactor, bugfix, testing verification, harness status); updated `plan-harness-awareness.mdc` to require intent classification, checklist review, verification plan, and harness update sections; extended instruction validator to check checklist files and rule reference.
- **Verification run:** **Fast:** `npm run lint:instructions` passed.
- **Next best step:** Resume TWS extended-hours app-level verification (watchlist LAST vs chart marker; extended-hours bars when enabled).

### 2026-06-27 — TWS extended-hours price alignment

- **Goal:** Align chart current-price marker with watchlist live quote; add TWS extended-hours candle mode; surface pre/regular/post-market state in chart UI.
- **Completed:** `marketSession` helpers in `@edge/chart-core`; `livePrice`/`liveMarketSession` chart props and price-axis badge; `sessionMode` on candle API/TWS sidecar (`useRTH` mapping); Settings → Extended hours toggle; session status badge + extended-hours background bands; architecture doc update.
- **Verification run:** **Focused:** 36 tests passed; **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests); **App-level:** pending TWS check (watchlist LAST vs chart marker; extended-hours bars when enabled).
- **Next best step:** With `TWS_ENABLED=true`, confirm OUST/similar symbol: watchlist LAST matches chart marker during post-market; toggle Extended hours in Settings and confirm pre/post shading on intraday charts.

### 2026-06-26 — TWS recovery follow-ups (health UX + data reload)

- **Goal:** Remove misleading Client Portal IBKR health from TWS-only workflow; make Recover TWS reload chart/watchlist data from IB after sidecar reconnect.
- **Completed:** Gated IBKR health probe/row on `IBKR_ENABLED`; renamed TWS provider label to IB Gateway; added `resetTwsRecoveryState()` + hot/cache invalidation + `primeMarketData()` on recover route; client `reloadMarketData()` / chart `reloadKey` refetch path.
- **Verification run:** **Focused:** 35 tests passed; **Fast:** `npm run check:startup` passed (26 tests); **App-level:** pending manual recovery check.
- **Next best step:** Gateway down → login → Recover TWS → confirm Active Chart source becomes `TWS` without page refresh.

### 2026-06-26 — TWS sidecar in-app recovery

- **Goal:** Add in-app recovery for the local TWS sidecar after IB Gateway is manually restored.
- **Completed:** Added sidecar reconnect control endpoint; Node recover helper + API route; Data Health recover button; TWS gate reset and symbol warmup; architecture/env documentation.
- **Verification run:** **Focused:** 16 tests passed; **Fast:** `npm run check:startup` passed (26 tests); **App-level:** pending manual recovery check.
- **Next best step:** Run focused tests, then verify recover flow in browser with Gateway down → login → Recover TWS.

### 2026-06-26 — Data health center

- **Goal:** Add a top-bar Data Health dropdown showing where chart/watchlist/options data is served from, including fallback and provider status.
- **Completed:** Added `health.ts` snapshot/severity layer; `/api/market-data/health` route with TWS/IBKR probes and circuit-breaker snapshots; extended `MarketDataProvider` with quote meta/transport; built `DataHealthProvider`, button, and menu; wired into `ChartHeaderBar` and `OptionsPanel`; updated market-data architecture doc.
- **Verification run:** **Focused:** `npm test -- --run src/lib/marketData src/app/api/market-data src/app/components/chart-chrome src/app/components/data-health` passed (169 tests); **Fast:** `npm run check:startup` passed (26 tests).
- **Next best step:** App-level browser check on `localhost:3003` when convenient — open Data Health menu after chart load and confirm provider rows match local TWS/IBKR availability.

### 2026-06-26 — Sidebar resize chart stability

- **Goal:** Stop active chart candles from disappearing and reduce jank while dragging the right sidebar resize handle.
- **Completed:** Reproduced a transparent canvas frame during panel drag; coalesced sidebar width writes through `requestAnimationFrame`; flushed pending drag width on mouseup; moved chart resize redraw into `useLayoutEffect` so canvas attribute changes repaint before users see a blank chart.
- **Verification run:** **Focused:** `npm test -- --run src/app/components/sidebar/SidebarPanelShell.test.tsx packages/chart-react/src/engine/canvas.test.tsx` passed (13 tests); **Fast:** `npm run check:startup` passed (26 tests); **App-level:** live `localhost:3003` drag instrumentation kept the first chart canvas non-transparent/no loading state while resizing from max to min panel width.
- **Next best step:** Continue Phase 2 workflow panels (corporate events, news, fundamentals, macro).

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
