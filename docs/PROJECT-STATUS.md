# Project Status

Single source for **current** progress. Historical harness dumps: [status-archive/](./status-archive/). For row-by-row feature detail, see [chart/features.md](./chart/features.md).

**Last updated:** 2026-08-06

## Current Verified State

- **Current task:** Journal capital baseline wiring.
- **State:** **Passing** — Account equity $/% and max drawdown % use Settings → Capital net deposits as starting base when set
- **Latest verification:** # Journal capital baseline wiring — 2026-08-06; Task: Journal capital baseline wiring; Branch: APP; ## Behavior; - Account equity $/% use Journal Settings → Capital net deposits as starting base when set; - Dollar secondary = live NetLiquidation − capital base (fallback: scoped trade net P&L); - Percent and max drawdown % use the same capital starting base; - Without capital events, inferred starting equity (equity − scoped net P&L) remains; ## Focused tests; Command:; npm test -- --run src/lib/journal/journalStats.test.ts src/app/components/journal/JournalSummaryCards.test.tsx; ```; Test Files  2 passed (2); Tests  77 passed (77); ```; ## Files; - src/lib/journal/journalStats.ts; - src/lib/journal/journalStats.test.ts; - src/app/components/journal/JournalSummaryCards.tsx; - src/app/components/journal/JournalSummaryCards.test.tsx; - src/app/components/journal/JournalDashboardView.tsx; - src/app/components/journal/JournalTradesView.tsx; - src/lib/journal/ARCHITECTURE.md
- **Evidence:** `src/lib/journal/journalStats.ts`, `src/lib/journal/journalStats.test.ts`, `src/app/components/journal/JournalSummaryCards.tsx`, `src/app/components/journal/JournalSummaryCards.test.tsx`, `src/app/components/journal/JournalDashboardView.tsx`, `src/app/components/journal/JournalTradesView.tsx`, `src/lib/journal/ARCHITECTURE.md`, `docs/evidence/journal-capital-baseline-wiring-2026-08-06.txt`
- **Current blocker:** none
- **Next best step:** Refresh Journal Trades/Dashboard in prod to confirm ~$8.65K / +30.9% vs $28k capital
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
| Market data foundation | **Done** | Provider-neutral layer in `src/lib/marketData/`; Yahoo + SEC/FRED/FMP/Massive/TWS/IBKR adapters; registry-driven event system with chart pins |

## Harness Retention

`PROJECT-STATUS.md` is the **hot operational dashboard**, not the full ledger. Full history lives in [status-archive/](./status-archive/).

| Content | Hot retention | Archive when |
|---------|---------------|--------------|
| Current Verified State | 1 block only | On closeout: displaced block → `status-archive/` (not stacked in hot file) |
| Previous Verified State | **0** in hot file | All displaced/historical blocks → `status-archive/` via `harness:closeout` + `status:prune` |
| Active Work | Active/Pending/Blocked + last ≤10 Passing | Older Passing rows → `status-archive/` |
| Task Contract | Incomplete / in-flight only | Complete → archive |
| Session Log | Last ~15 entries | Older entries → monthly archive file |

Prune when this file exceeds ~300 lines, on session exit after marking Passing, or weekly. Manual overflow: `npm run status:prune` (see `.cursor/rules/harness-steward.mdc`).

## Active Work

Use states: **Pending**, **Active**, **Blocked**, **Passing**, **Skipped**. Keep only one item **Active** at a time.
Use verification levels: **Focused** (targeted Vitest), **Build** (`npm run build`), **App-level** (dev server or browser/manual flow), **Full** (`npm run check`).

| Feature | Behavior | State | Completion evidence / latest result | Files |
|---------|----------|-------|-------------------------------------|-------|
| TypeScript indicator scripting roadmap | Private AI-generated TypeScript indicators compile inside a guest WASM VM and render declarative chart plots without an application rebuild or access to Canvas, DOM, network, filesystem, or app state | **Pending** | superseded by Phase 0 Active row; Phases 1+ remain pending | `docs/roadmaps/typescript-indicator-scripting-roadmap.md`, `docs/roadmaps/README.md`, `docs/ROADMAP.md`, `docs/chart/{features,indicator-foundation-plan}.md` |
| IB Gateway native daily soft restart | Both Gateway containers perform an 11:45 PM ET native restart without a competing hard exit; sidecar reconnects both sockets on its worker event loop | **Blocked** | **Focused:** `Ran 4 tests in 0.007s` / `OK`; **Config:** live/paper resolve `AUTO_RESTART_TIME=11:45 PM`, `TZ=America/New_York`, cold/logoff blank; **Runtime:** both containers running with `restartCount=0`, both logins completed; **App-level:** paper/live sidecar connections `gatewayConnected: true`, `warnings: []`; **Blocker:** scheduled-cycle proof pending after 11:45 PM ET | `services/ib-gateway/docker-compose.yml`, `services/ib-gateway/.env.example`, `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `src/lib/marketData/ARCHITECTURE.md` |
| Screener observability + baseline | Perf phases on screener route/service/technical filter; dev Screener tab in latency panel; `screener.fetch` client telemetry; before-optimization baseline in `docs/perf/screener-baseline-latest.json` | **Pending** | **Focused:** 48 tests passed; **Build:** `npm run build` passed; **Baseline:** `npm run perf:market-data` captured cold technical presets (~29–51s, candle p50 ~930–1617ms); app-level screener latency panel check not yet recorded; **Architecture review:** self-review Passed | `src/app/api/screener/run/route.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/screener/technicalFilter.ts`, `src/lib/marketData/telemetry/screenerPerf.ts`, `src/lib/chartDataFeed/apiScreenerFeed.ts`, `src/app/components/data-health/MarketDataLatencyDiagnosticsView.tsx`, `scripts/run-market-data-perf.mts`, `docs/perf/screener-baseline-latest.json` |
| Screener technical rule builder (v1) | User constructs/edits custom technical screener rules in QueryBuilder using any implemented `@edge/chart-core` indicator; registry-aware `validateIndicatorRule` rejects invalid rules client- and server-side; presets and saved screens round-trip `query.technical`; named kinds read-only in UI | **Pending** | **Focused:** 71 tests passed (`compileQuery`, `validateIndicatorRule`, `QueryBuilder`, `ScreenerDialog`, `api/screener/run`); **Build:** `npm run build:packages` + `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); app-level technical rule walkthrough not yet recorded; **Architecture review:** self-review Passed | `src/lib/screener/{compileQuery.ts,validateIndicatorRule.ts}`, `src/app/components/screener/{QueryBuilder.tsx,ScreenerDialog.tsx}`, `src/app/api/screener/run/route.ts`, `src/lib/marketData/ARCHITECTURE.md`, `docs/screener-roadmap.md` |
| Stock screener Phase 3 (custom indicators + comparison + summarize_screen) | Indicator-plugin screener rules via presets (MACD hist, BOLL %B, RSI); candle-fingerprint technical cache; `meta.indicatorValues` sidecar; multi-select comparison table; read-only `summarize_screen` AI tool | **Pending** | **Focused:** 49 screener/AI tests passed; **Build:** `npm run build:packages` + `npm run build` passed; app-level indicator preset + compare walkthrough not yet recorded; **Architecture review:** self-review Passed | `packages/chart-core/src/indicatorCompute.ts`, `src/lib/screener/{technicalMath,technicalFilter,presets,summarizeScreen}.ts`, `src/lib/marketData/schemas/request.ts`, `src/app/components/screener/{ComparisonView,ComparisonDialog}.tsx`, `src/lib/ai/tools/screener.ts`, `docs/screener-roadmap.md` |
| Journal capital baseline wiring | Account equity $/% and max drawdown % use Settings → Capital net deposits as starting base when set | **Passing** | # Journal capital baseline wiring — 2026-08-06; Task: Journal capital baseline wiring; Branch: APP; ## Behavior; - Account equity $/% use Journal Settings → Capital net deposits as starting base when set; - Dollar secondary = live NetLiquidation − capital base (fallback: scoped trade net P&L); - Percent and max drawdown % use the same capital starting base; - Without capital events, inferred starting equity (equity − scoped net P&L) remains; ## Focused tests; Command:; npm test -- --run src/lib/journal/journalStats.test.ts src/app/components/journal/JournalSummaryCards.test.tsx; ```; Test Files  2 passed (2); Tests  77 passed (77); ```; ## Files; - src/lib/journal/journalStats.ts; - src/lib/journal/journalStats.test.ts; - src/app/components/journal/JournalSummaryCards.tsx; - src/app/components/journal/JournalSummaryCards.test.tsx; - src/app/components/journal/JournalDashboardView.tsx; - src/app/components/journal/JournalTradesView.tsx; - src/lib/journal/ARCHITECTURE.md | src/lib/journal/journalStats.ts,src/lib/journal/journalStats.test.ts,src/app/components/journal/JournalSummaryCards.tsx,src/app/components/journal/JournalSummaryCards.test.tsx,src/app/components/journal/JournalDashboardView.tsx,src/app/components/journal/JournalTradesView.tsx,src/lib/journal/ARCHITECTURE.md,docs/evidence/journal-capital-baseline-wiring-2026-08-06.txt |
| APP — Journal UI state retention | Journal filters/period/sort/EV unit/compare preset/calendar month persist across refresh via edge.journal.uiState.v1 | **Passing** | # APP — Journal UI state retention — 2026-08-06; Task: APP — Journal UI state retention; Branch: APP; ## Behavior; - Period window + filters (symbol, setup, tag, outcome, rating, status, custom dates) persist across refresh via edge.journal.uiState.v1; - Also retained: trades table sort, EV unit toggle, compare preset, calendar month; - Shared scope across Dashboard / Trades / Open; - Catalog of non-retained (ephemeral) state recorded in src/lib/journal/ARCHITECTURE.md; ## Focused tests; Command:; npm test -- --run \; src/lib/journal/journalUiStatePreference.test.ts \; src/lib/journal/journalFilterHelpers.test.ts \; src/lib/journal/journalTradesTableControls.test.ts \; src/app/components/journal/JournalScopeBar.test.tsx \; src/app/components/journal/JournalFilterDrawer.test.tsx \; src/app/components/journal/JournalSummaryCards.test.tsx \; src/app/components/journal/JournalCompareReport.test.tsx \; src/app/components/journal/JournalTradesTable.test.tsx; ```; Test Files  8 passed (8); Tests  83 passed (83); ```; ## Files; - src/lib/journal/journalUiStatePreference.ts; - src/lib/journal/journalUiStatePreference.test.ts; - src/app/components/journal/useJournalUiState.ts; - src/app/components/journal/JournalDashboardView.tsx; - src/app/components/journal/JournalTradesView.tsx; - src/app/components/journal/JournalSummaryCards.tsx; - src/app/components/journal/JournalSummaryCards.test.tsx; - src/app/components/journal/JournalCompareReport.tsx; - src/app/components/journal/JournalCompareReport.test.tsx; - src/lib/journal/ARCHITECTURE.md | src/lib/journal/journalUiStatePreference.ts,src/lib/journal/journalUiStatePreference.test.ts,src/app/components/journal/useJournalUiState.ts,src/app/components/journal/JournalDashboardView.tsx,src/app/components/journal/JournalTradesView.tsx,src/app/components/journal/JournalSummaryCards.tsx,src/app/components/journal/JournalCompareReport.tsx,src/lib/journal/ARCHITECTURE.md,docs/evidence/journal-ui-state-retention-2026-08-06.txt |
| Journal trade pace KPI | Account equity KPI shows observed closed-trade pace (/wk · /mo) from scoped window | **Passing** | # Journal trade pace KPI — 2026-08-06; Task: Journal trade pace KPI; Branch: APP; ## Behavior; - Account equity KPI shows observed pace: `{n}/wk · {n}/mo` from scoped closed trades; - Denominator: Today=1d, 7d=7, 30d=30; custom closedFrom/To span; All = first close → now; - Wired on Dashboard and Trades summary cards; ## Focused tests; Command:; npm test -- --run src/lib/journal/journalStats.test.ts src/app/components/journal/JournalSummaryCards.test.tsx; ```; Test Files  2 passed (2); Tests  73 passed (73); ```; ## Files; - src/lib/journal/journalStats.ts; - src/lib/journal/journalStats.test.ts; - src/app/components/journal/JournalSummaryCards.tsx; - src/app/components/journal/JournalSummaryCards.test.tsx; - src/app/components/journal/JournalDashboardView.tsx; - src/app/components/journal/JournalTradesView.tsx; - src/lib/journal/ARCHITECTURE.md | src/lib/journal/journalStats.ts,src/lib/journal/journalStats.test.ts,src/app/components/journal/JournalSummaryCards.tsx,src/app/components/journal/JournalSummaryCards.test.tsx,src/app/components/journal/JournalDashboardView.tsx,src/app/components/journal/JournalTradesView.tsx,src/lib/journal/ARCHITECTURE.md,docs/evidence/journal-trade-pace-kpi-2026-08-06.txt |
| OPS — deploy ship pipeline | LLM "deploy" ships clean main via local:prod:ship; promote-only path unchanged; early tsc gate before Docker build | **Passing** | # OPS — deploy ship pipeline — evidence; # Date: 2026-08-06; ## Scope; Ship script, early typecheck gate, and LLM skill/rule/command updates for deploy-to-prod.; ## Delivered; - scripts/ship-local-prod.mts + ship-local-prod.sh + local:prod:ship; - deploy-local-prod-container.mts — tsc gate before image build (--skip-typecheck); - .cursor/skills/deploy-local-prod/SKILL.md — ship/promote/rollback + gate playbooks; - .cursor/rules/deploy-local-prod.mdc, .cursor/commands/deploy-prod.md; - docs/harness/branches/OPS.md, src/lib/observability/ARCHITECTURE.md; ## Focused; Command: npm test -- --run scripts/ship-local-prod.test.ts scripts/deploy-local-prod-container.test.ts; Result: Test Files  2 passed (2); Tests  31 passed (31); Command: npm run lint:instructions; Result: Instruction architecture validation passed. | scripts/ship-local-prod.mts,scripts/ship-local-prod.sh,scripts/ship-local-prod.test.ts,scripts/deploy-local-prod-container.mts,scripts/deploy-local-prod-container.test.ts,package.json,.cursor/skills/deploy-local-prod/SKILL.md,.cursor/rules/deploy-local-prod.mdc,.cursor/commands/deploy-prod.md,docs/harness/branches/OPS.md,src/lib/observability/ARCHITECTURE.md,docs/evidence/deploy-ship-pipeline-2026-08-06.txt |
| Journal qty + Flex TZ fix | Closed-trade risk qty uses open size (not max exit fill); Flex `YYYYMMDD;HHMMSS` imports as America/New_York→UTC; rebuild preserves `initialStop`; edge_prod Flex times repaired | **Passing** | # Journal Flex time + qty repair evidence; generated_at: 2026-08-06T18:12:40.000Z; ## Verification; ```; npm test -- --run \; src/lib/journal/tradeRiskGeometry.test.ts \; src/lib/journal/flexImport/parseFlexCsv.test.ts \; src/lib/journal/flexImport/flexDateTime.test.ts \; src/lib/journal/flexImport/repairFlexFillTimes.test.ts \; src/lib/journal/mapExecutionToFill.test.ts \; src/lib/journal/rebuildTrades.test.ts \; src/lib/journal/tradeGrouping.test.ts \; src/lib/journal/preserveTradeAttachments.test.ts \; src/app/components/journal/JournalTradeDetail.test.tsx \; src/lib/persistence/repositories/journalRepository.patchStop.test.ts; ```; Result: Test Files 10 passed (10) / Tests 58 passed (58); App-level edge_prod: LQDA net_quantity 0→400; flex fills ET hour band [4,8] 32→0; screenshots 12 preserved.; database: postgres://tvai:***@localhost:5432/edge_prod; account: U25026894; user_id: e30ce874-c305-40a5-b581-bc14d257cfa4; apply: true; mode: all-flex; fill_time_repairs_applied: 92; trades_rebuilt: 14; planned_risk_recomputed: 0; screenshots_preserved: 12; chart_snapshots_preserved: 12; idempotent_rerun_candidates: 0; ## Heuristic; - Only source=flex_csv (never live).; - Default: America/New_York hour of stored instant in [4,8] and repaired ET hour in [8,17].; - --all-flex: reinterpret UTC clock digits as Eastern for every flex_csv row; state file blocks re-run.; - Reinterpret: UTC y-m-d h:mi:s components → America/New_York wall → real UTC ISO.; - State: docs/evidence/journal-flex-time-repair-state.json; ## Before → after (sample); - 2026-05-22T09:30:01.000Z → 2026-05-22T13:30:01.000Z (RTH open; displays 09:30 ET); - LQDA entries: 2026-08-03T15:43:09.000Z → 2026-08-03T19:43:09.000Z (displays 15:43 ET); - Live fills unchanged (e.g. LQDA exits stay 2026-08-05T18:35:35.000Z = 14:35 ET); ## LQDA after repair; trade_id: a074a348-cf6e-491a-95aa-df4e8c850396; status: closed; net_quantity: 400; avg_entry: 83.56985; avg_exit: 89.58695; net_pnl: 2401.205208; planned_risk_usd: 1187.9703000000018 (stale; initial_stop was null so not recomputed); initial_stop: null; opened_at: 2026-08-03T19:43:09.000Z; closed_at: 2026-08-05T18:35:35.000Z; r_multiple_with_stale_risk: 2.0213; expected_after_stop_77.57: planned_risk ≈ $2400, R ≈ 1.0; fills:; 2026-08-03T19:43:09.000Z BOT 100 flex_csv (×4); 2026-08-05T18:35:35.000Z SLD 198/122/80 live; ## Manual follow-up; - Re-save LQDA initial stop at 77.57 in the UI (or patch) so planned_risk recomputes to ~$2400 / ~1.0R.; - Qty display is already correct (400) after rebuild; R stays ~2.02 until stop/risk is updated.; - Review notes/tags/screenshots preserved across rebuild. | src/lib/journal/tradeRiskGeometry.ts,src/lib/journal/tradeGrouping.ts,src/lib/journal/flexImport/,src/lib/journal/rebuildTrades.ts,src/lib/journal/mapExecutionToFill.ts,src/lib/persistence/repositories/journalRepository.ts,src/lib/persistence/repositories/journalIngestRepository.ts,src/app/components/journal/JournalTradeDetail.tsx,scripts/repair-journal-flex-times.mts |
| APP — Journal filters functional QA | App-level filter pack: period, symbol, drawer (setup/tag/outcome/rating/date/status), chips, clear-all across Dashboard/Trades/Open | **Passing** | # Journal filters functional QA — 2026-08-05; App: http://localhost:3003; Tooling: Playwright headless (chromium); Data: live journal API (GET /api/me/journal/trades) — rich demo history present; ## Focused tests; Command:; npm test -- --run src/lib/journal/journalFilterHelpers.test.ts src/lib/journal/journalStats.test.ts src/app/components/journal/JournalFilterDrawer.test.tsx src/app/components/journal/JournalScopeBar.test.tsx; ```; Test Files  4 passed (4); Tests  65 passed (65); ```; ## App-level; **App-level:** Playwright pack on http://localhost:3003 — 18/18 filter checks PASS.; 1. Dashboard scope bar present — PASS — journal-scope-bar; 2. Period preset Today vs All — PASS — All=131 trades; Today=0 trades; 3. Symbol filter AAPL (dashboard) — PASS — closed=17 trades; clearAll=true; chipsAbsent=true; 4. Drawer draft discard on backdrop (dashboard) — PASS — panel=true; noStatus=true; chipsAfterBackdrop=0; 5. Setup=breakout apply + chip — PASS — chip=breakout; trigger=Filters (1); closed=25 trades; 6. AND setup+outcome chips — PASS — trigger=Filters (2); closed=17 trades; outcomeChip=Wins; 7. Dismiss outcome chip keeps setup — PASS — outcomeChips=0; setupChips=1; 8. Tag=fomo filter — PASS — chip=fomo; closed=21 trades; 9. Rating=5 filter — PASS — chip=Rating 5; closed=35 trades; 10. Custom date range Jul 2026 — PASS — chip=Jul 1 – Jul 31; periodCtrl=Custom range; closed=31 trades; 11. Period All clears custom range — PASS — dateChips=0; 12. Clear all resets filters — PASS — chips=0; clearGone=true; 13. Trades status=open filter — PASS — statusField=true; baseline=137; openRows=4; chip=Open; 14. Trades closed+spread AND — PASS — baseline=137; closed+spread=31; 15. Drawer Clear resets draft — PASS — setup=All setups; tag=""; 16. Open view: no status; setup=pullback — PASS — noStatus=true; baseline=4; filtered=2; 17. Trades symbol=SPY exact — PASS — total=22; visible=22; allVisibleSPY=true; 18. Trades outcome=loss — PASS — rows=42; chip=Losses; Totals: 18 PASS / 0 FAIL / 0 SKIP; ## Bugs; - none; ## Notes; - Symbol filter is not rendered as a dismissible chip; Clear all covers it.; - Status field only on Trades mode (not Dashboard / Open).; - Custom date range overrides period preset; choosing a preset clears custom range.; - Trades table is virtualized; pack uses journal-trades-result-count for totals. | docs/evidence/journal-filters-functional-qa-2026-08-05.txt,src/app/components/journal/JournalScopeBar.tsx,src/app/components/journal/JournalFilterDrawer.tsx,src/lib/journal/journalFilterHelpers.ts,src/lib/journal/journalStats.ts |
| APP — Journal dashboard metrics | Reshape journal dashboard top KPI row: equity %/R secondary lines, expected value card with $/%/R toggle, max drawdown card | **Passing** | # Journal dashboard metrics — 2026-08-05; ## Focused tests; Command:; npm test -- --run src/lib/journal/journalStats.test.ts src/lib/journal/rMultiple.test.ts src/app/components/journal/JournalSummaryCards.test.tsx; ```; Test Files  3 passed (3); Tests  75 passed (75); ```; ## Broader journal suite; Command:; npm test -- --run src/lib/journal src/app/components/journal/JournalSummaryCards.test.tsx; ```; Test Files  37 passed (37); Tests  251 passed (251); ```; ## Behavior; - Account equity card: $ primary + scoped net P&L, % change from inferred starting equity, net R when planned risk exists; - Expected value card replaces profit factor; $/%/R unit toggle rescales EV and avg win/loss bar; - Max drawdown card replaces standalone avg win/loss; shows $ hero with % and R secondary + current-vs-max bar; - Win % card unchanged; profit factor remains in breakdown/compare reports only | src/lib/journal/journalStats.ts, src/lib/journal/rMultiple.ts, src/app/components/journal/JournalSummaryCards.tsx, src/app/components/journal/JournalDashboardView.tsx, src/app/components/journal/JournalTradesView.tsx, src/lib/journal/ARCHITECTURE.md |
| APP — Desk motion five | Restrained enter/exit motion on sidebar, overlays, trade success, drawing toolbar, workspace tiles | **Passing** | # APP — Desk motion five — 2026-08-05; ## Foundation; - Fixed `popoverEnterClass()` → `"edge-popover-enter"` only; - Added `usePresence` hook (180ms exit, reduced-motion instant unmount); - `EdgeSlideOver` uses presence for exit slide; ## Surfaces; - Sidebar docked/floating: translate-x + opacity enter/exit via presence; - Overlays: `EdgeModalShell` + `ContextMenu` popover enter; - Trade success + drawing toolbar: popover enter settle; - Workspace tiles: `edge-app-enter` on surface swap; split settle pulse; ## Focused tests; Command:; npm test -- --run src/app/components/design-system/styles.test.ts src/app/components/design-system/usePresence.test.ts src/app/components/design-system/EdgeSlideOver.test.tsx src/app/components/design-system/EdgeModalShell.test.tsx src/app/components/ContextMenu.test.tsx src/app/components/trading/TradeOrderForm.test.tsx src/app/components/drawing/DrawingSelectionToolbar.test.tsx src/app/components/sidebar/RightSidebar.test.tsx src/app/components/sidebar/SidebarPanelShell.test.tsx src/app/components/sidebar/FloatingPanelShell.test.tsx src/app/components/sidebar/FloatingPanelHost.test.tsx src/app/components/app-workspace/SplitPane.test.tsx; ```; Test Files  12 passed (12); Tests  100 passed (100); ```; ## App-level; Deferred: manual glance on http://localhost:3003 (sidebar open/close, command palette, drawing toolbar, trade submit success, tile surface swap, split release pulse, reduced-motion once) | `src/app/components/design-system/usePresence.ts`, `src/app/components/sidebar/`, `src/app/components/design-system/EdgeModalShell.tsx`, `src/app/components/ContextMenu.tsx`, `src/app/components/trading/TradeOrderForm.tsx`, `src/app/components/drawing/DrawingSelectionToolbar.tsx`, `src/app/components/app-workspace/` |
| APP — Journal QA bugfixes | Offline PATCH localStorage fallback; chart deep-link preserves journalTrade; closed-trade stop risk qty from fills | **Passing** | # Journal QA bugfixes — 2026-08-05; Task: APP — Journal QA bugfixes; Branch: APP; ## Fixes; 1. **HIGH — Offline trade PATCH fallback**; - Server: `PATCH /api/me/journal/trades/:id` maps DB-unavailable errors to 503 (not 400 validation).; - Client: `patchJournalTradeRemote` falls back to localStorage on 503, 404 (local trade), or 400 with DB-unavailable body/legacy "Failed query" message.; 2. **MEDIUM — Chart deep-link loses journalTrade query**; - `ModuleToWorkspaceRedirect` forwards chart deep-link params (`symbol`, `interval`, `journalTrade`, `goto`) from `/chart` to `/workspace`.; - `workspacePathAfterIngress` preserves `symbol` when `journalTrade` is present.; 3. **MEDIUM — Stop risk quantity on closed short**; - Added `resolveTradeRiskQuantity` (netQuantity → plan qty → legs → fill quantities).; - `JournalTradeDetail` draft risk preview uses fill-derived qty when closed trade netQuantity is 0.; ## Verification; ```bash; npm test -- --run \; src/lib/persistence/client/journalClient.test.ts \; src/app/api/me/journal/ \; src/lib/journal/tradeRiskGeometry.test.ts \; src/app/components/journal/JournalTradeDetail.test.tsx \; src/lib/journal/chartDeepLink.test.ts \; src/lib/appWorkspace/deepLinks.test.ts \; src/app/components/app-workspace/ModuleToWorkspaceRedirect.test.tsx; ```; ```; Test Files  8 passed (8); Tests  56 passed (56); Duration  3.17s; ```; ## Residual; - Browser re-check Packs C/D/E with Postgres up recommended for full green (review-save + deep-link marker bootstrap).; - Server-side `patchJournalTrade` still uses trade.netQuantity=0 for closed trades when computing stop risk on API path; client preview fixed; API path may need fill context in a follow-up if stop-save hits server with zero qty. | src/lib/persistence/client/journalClient.ts,src/app/api/me/journal/trades/[id]/route.ts,src/lib/journal/chartDeepLink.ts,src/lib/journal/tradeRiskGeometry.ts,src/app/components/journal/JournalTradeDetail.tsx,src/app/components/app-workspace/ModuleToWorkspaceRedirect.tsx,src/lib/appWorkspace/deepLinks.ts |
| APP — Input affordance ladder | Editable vs read-only affordance ladder across design system and product chrome | **Passing** | # APP — Input affordance ladder — 2026-08-05; ## Foundation (Wave A); - Added `--edge-surface-input` / `surfaceInput` token (edge.ts + globals.css all palettes); - fieldClass + searchInputShellClass → recessed input well + strong border; - compactSearchFieldClass → inherits recessed fill (no bg-transparent override); - New EdgeReadout primitive + Affordance Ladder in ARCHITECTURE.md; ## Focused DS tests; Command:; npm test -- --run src/app/components/design-system/EdgeReadout.test.tsx src/app/components/design-system/styles.test.ts src/app/components/design-system/EdgeMetricTile.test.tsx src/app/components/design-system/CompactSearchFieldShell.test.tsx src/app/components/design-system/EdgeLabeledInput.test.tsx; ```; Test Files  5 passed (5); Tests  17 passed (17); ```; ## Token sync; Command:; npm test -- --run src/lib/design-system/edge.test.ts -t edgeTokens; ```; Test Files  1 passed (1); Tests  5 passed | 5 skipped (10); ```; ## Product surfaces (Waves B–D); Command:; npm test -- --run src/app/components/trading/TradeOrderForm.test.tsx src/app/components/trading/TradeSizeBudgetField.test.tsx src/app/components/trading/PlaybookTemplateEditor.test.tsx src/app/components/trading/TradeOrderImpact.test.tsx src/app/components/options/OptionsRiskCalculator.test.tsx src/app/components/expectancy src/app/components/sidebar/panels/AccountMarginSummary.test.tsx src/app/components/screener/QueryBuilder.test.tsx; ```; Test Files  8 passed (8); Tests  82 passed (82); ```; ## Behavior; - Editable controls use recessed `--edge-surface-input` wells; - MKT entry, policy view mode, alerts drawing-bound fields, scoreboard entry/exit/pnl, options auto-contracts use EdgeReadout (no fake fields); - Policy view mode no longer uses disabled inputs; - Bordered EdgeMetricTile removed from expectancy + account margin; - TradeOrderImpact derived metrics are flush readouts; ## App-level; Deferred: manual glance test on http://localhost:3003 (trade ticket MKT vs LMT, policy view/edit, alerts from drawing, journal scoreboard) | src/lib/design-system/edge.ts,src/app/globals.css,src/app/components/design-system/styles.ts,src/app/components/design-system/EdgeReadout.tsx,src/lib/design-system/ARCHITECTURE.md |

## Task Contract — Grok Copilot UX parity

- **Status:** Phase 0–3 **Passing** (2026-07-24); Phases 4–5 **Pending**
- **Goal:** Match grok.com Copilot chat shell/composer across sidebar, `/copilot`, and tile; in-bar model picker (models only); keep agent/registry/confirms.
- **Delivered (Phase 0):** Live 1440 captures (empty, mode menu open, history logged-out gate); measured query-bar/menu CSS; signed-in UX inventory (§ G); keyboard matrix (§ H); token map (§ I); model chip rules (§ J); frozen Visual contract + resolved product questions; design-system Copilot alias pointer.
- **Delivered (Phase 1):** `CopilotShell` + `CopilotEmptyBrand` + `CopilotPromptLibrary`; host variants (`sidebar` / `page` / `tile`); empty hero (brand + centered composer + chips); minimal top chrome on empty; active thread keeps dense header; `.copilot-shell` CSS aliases in `globals.css`; `/copilot` module header removed.
- **Delivered (Phase 2):** Pill `query-bar` `CopilotComposer` (+ attach stub, model chip stub, circular ↑/stop); `--copilot-query-bar-*` token consumption; wide-host docked centering; `CopilotComposer.test.tsx`; header `EdgeSelect` retained until Phase 3.
- **Delivered (Phase 3):** In-bar model chip + `EdgeAnchoredPopover` menu (`--copilot-menu-*`); enabled models with checkmark + subtitle; `modelMenuSubtitle` helper; header `EdgeSelect` removed; `CopilotPanel` wires `setModelId`.
- **Verification (Phase 3):** **Focused:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **Architecture review:** self-review **Passed**.
- **Blockers:** Authenticated grok.com screenshots deferred (no sign-in in capture session).
- **Next:** Phase 4 under WIP=1 — active thread chrome (history rail, Thoughts disclosure).

## Task Contract — Connections & providers

- **Status:** Active — Phase 0–4 **Passing** (2026-07-24); Phase 5 **Pending** (Path C — local Gateway polish); Phases 6–7 **Pending**
- **Goal:** Productize broker/data management as **Connections + platform market data** (Settings console → preference store → ConfigSource → durable connections → local Gateway polish → optional BYO vault → multi-broker ledger).
- **Delivered (Phase 0–4):** Contracts, Settings console, provider prefs, ConfigSource, durable `connections` table + `/api/me/connections` — see roadmap + session log 2026-07-24.
- **Phase 5 (2026-07-25):** **Path C — local Gateway connect polish** (status/reconnect/Disconnect UX). Former Path A (hosted IB OAuth) **extracted** to [IBKR Hosted OAuth Roadmap](./roadmaps/ibkr-hosted-oauth-roadmap.md).
- **Blockers:** none
- **Next:** Activate Connections Phase 5 under WIP=1 when prioritized — Gateway connect chrome (5.2–5.5).

## Session Log

### 2026-08-06 — Production promote prep

- **Completed:** Committed WIP batch (`d7eae23`); harness gate fix for session-exit lint; push `main` then `local:prod:container:deploy -- --revision HEAD`.
- **Next best step:** Confirm `:3000` `/healthz` + `/readyz` after container promote.

- **2026-07-30 — Gateway 1s quotes: sidecar fire-and-forget refresh; client SSE rejoin with REST bridge; server TWS SSE retry before poll fallback.**

### 2026-07-27 — Prod TWS binding + shared-sidecar deploy prep

- **Completed:** Committed and pushed static `EnvConfigSource` TWS bindings, sidecar state_mod/config ROOT fixes, deploy chart-perf gate, and dual-connection docs sync (`30685a7` on `main`).
- **Verification run:** Focused: pushed commits `f7a68ff` / `86ba53e` / `30685a7`; `npm run lint:instructions` after this Session Log entry; chart-perf strict gate re-run for container deploy.
- **Next best step:** `npm run local:prod:container:deploy -- --revision HEAD` after chart-perf + startup gates pass.

### 2026-07-26 — Local production containerization — Phase 2

- **Passing:** Compose app-prod + migrate services, compose:validate, health/readiness on :3000, isolation, durable mounts, migrate one-shot (`docs/evidence/local-production-containerization-phase-2.txt`).

### 2026-07-26 — Local development and production — Phase 5

- **Passing:** verify-local-environments orchestrator + 118 focused tests + app-level scenario matrix (`docs/evidence/local-dev-production-phase-5.txt`).

- **2026-07-25 — Phase 0 contract/preflight shipped; 38 focused tests and safe/unsafe CLI smoke passed; startup passed; roadmap status gate retains 3 unrelated pre-existing inconsistencies.**

### 2026-07-25 — IBKR hosted OAuth track extracted

- **2026-07-25 — Docs:** Hosted IB OAuth Path A moved from Connections Phase 5 into standalone [ibkr-hosted-oauth-roadmap.md](./roadmaps/ibkr-hosted-oauth-roadmap.md). Connections Phase 5 redefined as Path C (local Gateway polish). Indexes + Task Contracts updated.

### 2026-07-25 — Task efficiency ledger — Phase 8

- **2026-07-25 — Task efficiency ledger — Phase 8 Passing: concurrent registry + deferred spend reconcile**

- **2026-07-25 — Task efficiency ledger — Phase 7 Passing: ledger + closeout gate**

- **2026-07-24 — 2026-07-24 — Runtime interaction performance — Phase 1 Passing: SERIES_INVALIDATING trimmed; series cache reuse tests; perf:chart baseline refreshed; next Phase 2 React wakeups.**

- **2026-07-24 — Production observability — Phase 0 Passing: ARCHITECTURE probe contract + CONSTRAINTS free-stack + .env placeholders; npm run lint:instructions passed; no runtime change. Next: Phase 1 probes.**

### 2026-07-24 — Production observability — Phase 0

- **2026-07-24 — Harness reconcile:** Phase 8 playbook marked Passing (evidence on file); code-org Phase 3–4 session log + next-step/verify-path sync; playbook Task Contract → track complete.
## Next Priorities (Post-V1)

Canonical roadmap: [ROADMAP.md](./ROADMAP.md). Immediate priorities:

1. **Corporate events / news / fundamentals / macro panels** — next Phase 2 market-data workflow expansions; news provider economics in [News Flow Roadmap](./roadmaps/news-flow-roadmap.md)
2. **Bar Replay persistence** — persist position in `CellConfig`
3. ~~**Options sidebar panel**~~ — **shipped**

## Explicit Deferrals

- Pine Script syntax / public community indicators (private chart-only TypeScript scripting is **Pending**)
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
npm test -- --run src/app/components/chart-chrome/chartContextMenu.test.ts
npm test -- --run src/app/components/chart-chrome/chartCopyMenu.test.ts

# Chart engine (canonical package paths)
npm test -- --run packages/chart-react/src/engine/
npm test -- --run packages/chart-react/src/EdgeChart.test.tsx
npm test -- --run src/app/components/chart-cell/
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
