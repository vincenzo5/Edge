# Project Status

Single source for **current** progress. Historical harness dumps: [status-archive/](./status-archive/). For row-by-row feature detail, see [chart/features.md](./chart/features.md).

**Last updated:** 2026-08-05

## Current Verified State

- **Current task:** APP — Journal trade stop risk.
- **State:** **Passing** — APP — Journal trade stop risk closeout via harness:closeout
- **Latest verification:** # Journal trade stop risk — 2026-08-05; ## Focused tests; Command: `npm test -- --run src/app/components/journal/JournalTradeDetail.test.tsx src/lib/persistence/schemas/journal.test.ts src/lib/journal/tradeRiskGeometry.test.ts src/lib/journal/localJournalStore.test.ts`; ```; Test Files  4 passed (4); Tests  18 passed (18); ```; ## Broader journal suite; Command: `npm test -- --run src/lib/journal src/app/components/journal/JournalTradeDetail.test.tsx src/app/journal/JournalPage.test.tsx`; ```; Test Files  33 passed (33); Tests  227 passed (227); ```; ## Behavior; - Added `initial_stop` column on `journal_trades`; PATCH accepts `initialStop`; - Saving stop derives `plannedRiskMode=usd`, `plannedRiskValue`, `plannedRiskUsd` from entry→stop×qty; - Trade detail modal: Risk block under screenshot (entry auto, stop editable, live R preview); - Fills, excursion, chart snapshots, risk policy collapsed under Execution details; - Removed planned risk $/% from Review section
- **Evidence:** see Active Work row
- **Current blocker:** none
- **Next best step:** none
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
| APP — Journal trade stop risk | Trade detail modal: editable stop under screenshot defines 1R from entry geometry; `initial_stop` persisted and derives planned risk USD | **Passing** | # Journal trade stop risk — 2026-08-05; ## Focused tests; Command: `npm test -- --run src/app/components/journal/JournalTradeDetail.test.tsx src/lib/persistence/schemas/journal.test.ts src/lib/journal/tradeRiskGeometry.test.ts src/lib/journal/localJournalStore.test.ts`; ```; Test Files  4 passed (4); Tests  18 passed (18); ```; ## Broader journal suite; Command: `npm test -- --run src/lib/journal src/app/components/journal/JournalTradeDetail.test.tsx src/app/journal/JournalPage.test.tsx`; ```; Test Files  33 passed (33); Tests  227 passed (227); ```; ## Behavior; - Added `initial_stop` column on `journal_trades`; PATCH accepts `initialStop`; - Saving stop derives `plannedRiskMode=usd`, `plannedRiskValue`, `plannedRiskUsd` from entry→stop×qty; - Trade detail modal: Risk block under screenshot (entry auto, stop editable, live R preview); - Fills, excursion, chart snapshots, risk policy collapsed under Execution details; - Removed planned risk $/% from Review section | `src/lib/journal/tradeRiskGeometry.ts`, `src/app/components/journal/JournalTradeDetail.tsx`, `src/db/migrations/0042_journal_trade_initial_stop.sql`, `src/lib/persistence/repositories/journalRepository.ts` |
| TypeScript indicator scripting roadmap | Private AI-generated TypeScript indicators compile inside a guest WASM VM and render declarative chart plots without an application rebuild or access to Canvas, DOM, network, filesystem, or app state | **Pending** | superseded by Phase 0 Active row; Phases 1+ remain pending | `docs/roadmaps/typescript-indicator-scripting-roadmap.md`, `docs/roadmaps/README.md`, `docs/ROADMAP.md`, `docs/chart/{features,indicator-foundation-plan}.md` |
| IB Gateway native daily soft restart | Both Gateway containers perform an 11:45 PM ET native restart without a competing hard exit; sidecar reconnects both sockets on its worker event loop | **Blocked** | **Focused:** `Ran 4 tests in 0.007s` / `OK`; **Config:** live/paper resolve `AUTO_RESTART_TIME=11:45 PM`, `TZ=America/New_York`, cold/logoff blank; **Runtime:** both containers running with `restartCount=0`, both logins completed; **App-level:** paper/live sidecar connections `gatewayConnected: true`, `warnings: []`; **Blocker:** scheduled-cycle proof pending after 11:45 PM ET | `services/ib-gateway/docker-compose.yml`, `services/ib-gateway/.env.example`, `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `src/lib/marketData/ARCHITECTURE.md` |
| Screener observability + baseline | Perf phases on screener route/service/technical filter; dev Screener tab in latency panel; `screener.fetch` client telemetry; before-optimization baseline in `docs/perf/screener-baseline-latest.json` | **Pending** | **Focused:** 48 tests passed; **Build:** `npm run build` passed; **Baseline:** `npm run perf:market-data` captured cold technical presets (~29–51s, candle p50 ~930–1617ms); app-level screener latency panel check not yet recorded; **Architecture review:** self-review Passed | `src/app/api/screener/run/route.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/screener/technicalFilter.ts`, `src/lib/marketData/telemetry/screenerPerf.ts`, `src/lib/chartDataFeed/apiScreenerFeed.ts`, `src/app/components/data-health/MarketDataLatencyDiagnosticsView.tsx`, `scripts/run-market-data-perf.mts`, `docs/perf/screener-baseline-latest.json` |
| Screener technical rule builder (v1) | User constructs/edits custom technical screener rules in QueryBuilder using any implemented `@edge/chart-core` indicator; registry-aware `validateIndicatorRule` rejects invalid rules client- and server-side; presets and saved screens round-trip `query.technical`; named kinds read-only in UI | **Pending** | **Focused:** 71 tests passed (`compileQuery`, `validateIndicatorRule`, `QueryBuilder`, `ScreenerDialog`, `api/screener/run`); **Build:** `npm run build:packages` + `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); app-level technical rule walkthrough not yet recorded; **Architecture review:** self-review Passed | `src/lib/screener/{compileQuery.ts,validateIndicatorRule.ts}`, `src/app/components/screener/{QueryBuilder.tsx,ScreenerDialog.tsx}`, `src/app/api/screener/run/route.ts`, `src/lib/marketData/ARCHITECTURE.md`, `docs/screener-roadmap.md` |
| Stock screener Phase 3 (custom indicators + comparison + summarize_screen) | Indicator-plugin screener rules via presets (MACD hist, BOLL %B, RSI); candle-fingerprint technical cache; `meta.indicatorValues` sidecar; multi-select comparison table; read-only `summarize_screen` AI tool | **Pending** | **Focused:** 49 screener/AI tests passed; **Build:** `npm run build:packages` + `npm run build` passed; app-level indicator preset + compare walkthrough not yet recorded; **Architecture review:** self-review Passed | `packages/chart-core/src/indicatorCompute.ts`, `src/lib/screener/{technicalMath,technicalFilter,presets,summarizeScreen}.ts`, `src/lib/marketData/schemas/request.ts`, `src/app/components/screener/{ComparisonView,ComparisonDialog}.tsx`, `src/lib/ai/tools/screener.ts`, `docs/screener-roadmap.md` |
| APP — Journal policy replay | CLI replays closed journal STK trades through risk policies; writes evidence JSON + refreshes comparison canvas | **Passing** | # Journal policy replay — 2026-08-04; ## Focused tests; Command: `npm test -- --run src/lib/journal/policyReplay/`; ```; Test Files  4 passed (4); Tests  14 passed (14); Duration  787ms; ```; ## Live smoke; Command: `npm run journal:policy-replay`; Exit: 0; ```; Policy replay — 9 trades (8L / 1S); Wrote /Users/vincentn/TV AI/docs/evidence/policy-replay-latest.json; Canvas /Users/vincentn/.cursor/projects/Users-vincentn-TV-AI/canvases/ib-live-risk-policy-replay.canvas.tsx; Scoreboard (all) — top policies by net R:; Step trail 0.25R             +12.34R; Step trail 0.5R              +9.65R; Full trail 0.5R (continuous) +9.63R; Full trail 1R (continuous)   +8.59R; Step trail 1R                +8.29R; Fixed 3R TP                  +7.29R; Step trail 0.25R: net +12.34R · WR 66.7% · exp +1.37R; ```; tradeCount: 9 (>= 1). Step trail 0.25R row present in stdout. Canvas rewritten.; ## Artifacts; - Lib: `src/lib/journal/policyReplay/`; - CLI: `scripts/journal-policy-replay.mts` · `npm run journal:policy-replay`; - Skill: `.cursor/skills/journal-policy-replay/SKILL.md`; - JSON: `docs/evidence/policy-replay-latest.json` | src/lib/journal/policyReplay/,scripts/journal-policy-replay.mts,.cursor/skills/journal-policy-replay/SKILL.md |
| LIVE — Risk policy order recipes | Shared entry/manage order recipes on policies; native STP/STP LMT bracket parents; policy editor Entry section; ticket apply seeds order fields | **Passing** | Test Files  12 passed (12); Tests  96 passed (96); sidecar 9 passed; `docs/evidence/risk-policy-order-recipes-2026-08-04.txt` | src/lib/trading/orderExecutionRecipe.ts,src/lib/risk/policy/applyPolicyToTradeDraft.ts,src/lib/trading/playbook/promotePlannedInstances.ts,src/app/components/trading/PolicyEntryOrderEditor.tsx,services/tws-sidecar/tws_sidecar/trading/models.py |
| LIVE — Trade order modifier micro dropdown | Annotation-sized Fill/Type select at fixed left of price block; Market shares Order Price row | **Passing** | # LIVE — Trade order modifier micro dropdown evidence; # Date: 2026-08-04; ## Scope; Replace the under-tab EdgeSelect chip with a new annotation-sized EdgeMicroSelect. Fixed left position for every family: Market shares the Order Price row; Limit/Stop/Trail place the control just above the first price field. Short Close label for fill timing.; ## Delivered; - src/app/components/design-system/EdgeMicroSelect.tsx — 18px annotation dropdown + test; - src/app/components/design-system/index.ts — export; - src/app/components/trading/TradeOrderForm.tsx — relocate modifier into price block; - src/app/components/trading/TradeOrderForm.test.tsx — Close label + chip helpers; - src/lib/trading/ARCHITECTURE.md, src/lib/design-system/ARCHITECTURE.md — notes; ## Focused; Command:; npm test -- --run src/app/components/design-system/EdgeMicroSelect.test.tsx src/app/components/trading/TradeOrderForm.test.tsx src/lib/trading/orderTypeFamily.test.ts; Result:; Test Files  3 passed (3); Tests  45 passed (45); exit=0; ## App-level; Deferred — UI density/placement change; compose/decompose unchanged. | src/app/components/design-system/EdgeMicroSelect.tsx,src/app/components/design-system/EdgeMicroSelect.test.tsx,src/app/components/design-system/index.ts,src/app/components/trading/TradeOrderForm.tsx,src/app/components/trading/TradeOrderForm.test.tsx,src/lib/trading/ARCHITECTURE.md,src/lib/design-system/ARCHITECTURE.md,docs/evidence/trade-order-modifier-micro-dropdown-2026-08-04.txt |
| LIVE — Trade order type modifier chip | Fill/Type secondary rows replaced by compact EdgeSelect chip under the active Market/Limit/Stop/Trail tab | **Passing** | # LIVE — Trade order type modifier chip evidence; # Date: 2026-08-04; ## Scope; Replace the full-width Fill / Type secondary segmented rows under order-type tabs with a compact EdgeSelect chip aligned under the active family tab (Option A). Market/Limit → Fill (Now / On close); Stop/Trail → Type (Market / Limit). Compose/decompose OrderType mapping unchanged.; ## Delivered; - src/app/components/trading/TradeOrderForm.tsx — chip under active tab via 4-col grid; EdgeSelect variant=chip; - src/app/components/trading/TradeOrderForm.test.tsx — chip open/select helpers; assertions for Fill/Type chips; - src/lib/trading/ARCHITECTURE.md — ticket layout note updated for modifier chip; ## Focused; Command:; npm test -- --run src/app/components/trading/TradeOrderForm.test.tsx src/lib/trading/orderTypeFamily.test.ts; Result:; Test Files  2 passed (2); Tests  43 passed (43); exit=0; ## App-level; Deferred — UI-only regroup of existing Fill/Type controls; domain compose/decompose unchanged (orderTypeFamily tests still cover round-trip). | src/app/components/trading/TradeOrderForm.tsx,src/app/components/trading/TradeOrderForm.test.tsx,src/lib/trading/ARCHITECTURE.md,docs/evidence/trade-order-type-modifier-chip-2026-08-04.txt |
| ENGINE — Position TV place/drag parity | Long/short click-to-place at cursor; entry fixed after place; 4-handle resize with stop/target clamp; stick-to-last OFF by default | **Passing** | # ENGINE — Position TV place/drag parity evidence; # Date: 2026-08-04; ## Scope; TradingView-style long/short position place/drag/resize: click-to-place at cursor;; entry fixed after place (stick-to-last OFF by default); 4-handle resize with; stop/target clamped to valid side of entry; whole-tool rigid drag + magnet unchanged.; ## Delivered; - packages/chart-core/src/drawings/positionGeometry.ts — positionPointsFromClick, clampPositionPoints; stick default OFF; - packages/chart-core/src/drawings/position_tool.ts — one-point placement; create from click; - packages/chart-core/src/drawingStyles.ts — stickEntryToLastPrice default false; - packages/chart-core/src/drawingController.ts — selectsAfterOnePointCommit; - packages/chart-react/src/drawing/applyDrawingPointerTransition.ts — position select+disarm after click; - src/app/components/drawing/DrawingSettingsModal.tsx — stick toggle default off; - Tests: positionGeometry, position_tool, drawingFsm, applyDrawingPointerTransition, drawingStyles; - Docs: docs/chart/features.md, src/lib/chart/ARCHITECTURE.md; ## Focused; Command:; npm test -- --run packages/chart-core/src/drawings/positionGeometry.test.ts src/lib/chart/drawings/position_tool.test.ts src/lib/chart/drawingFsm.test.ts packages/chart-react/src/drawing/applyDrawingPointerTransition.test.ts src/lib/chart/drawingStyles.test.ts; Result:; Test Files  5 passed (5); Tests  74 passed (74); exit=0; ## Build; Command:; npm run build:packages; Result:; build:packages completed (tsc for chart-core, chart-react, ai-tools-chart); exit=0 | packages/chart-core/src/drawings/positionGeometry.ts,packages/chart-core/src/drawings/position_tool.ts,packages/chart-core/src/drawingStyles.ts,packages/chart-core/src/drawingController.ts,packages/chart-react/src/drawing/applyDrawingPointerTransition.ts,src/app/components/drawing/DrawingSettingsModal.tsx,docs/chart/features.md,src/lib/chart/ARCHITECTURE.md |
| UX — Trade session row toggles | Stacked TIF / AON / Extended hours rows; AON uses EdgeToggleSwitch like Extended hours | **Passing** | # LIVE — Trade session row toggles; # Date: 2026-08-04; ## Scope; Stack Time in Force / All or none / Extended hours as label-left control-right rows.; Replace All-or-None native checkbox with EdgeToggleSwitch (compact), matching Extended hours.; ## Delivered; - src/app/components/trading/TradeOrderForm.tsx — stacked session rows; AON → EdgeToggleSwitch; - src/app/components/trading/TradeOrderForm.test.tsx — assert both session booleans are role=switch; ## Focused; Command:; npm test -- --run src/app/components/trading/TradeOrderForm.test.tsx; Result:; Test Files  1 passed (1); Tests  33 passed (33); exit=0 | src/app/components/trading/TradeOrderForm.tsx,src/app/components/trading/TradeOrderForm.test.tsx,docs/evidence/trade-session-row-toggles-2026-08-04.txt |
| LIVE — Trade order type family UX | Four primary order-type tabs with Fill/Type secondary controls composing to existing OrderType values | **Passing** | # LIVE — Trade order type family UX evidence; # Date: 2026-08-04; ## Scope; Regroup eight flat order-type tabs into four primary families (Market / Limit / Stop / Trail) with secondary Fill (Now / On close) or Type (Market / Limit) controls composing to existing OrderType values.; ## Delivered; - src/lib/trading/orderTypeFamily.ts — compose/decompose helpers + segment constants; - src/lib/trading/orderTypeFamily.test.ts — round-trip all eight types; defaults; - src/app/components/trading/TradeOrderForm.tsx — 4 primary tabs + Fill/Type secondary row; - src/app/components/trading/TradeOrderForm.test.tsx — updated assertions for regrouped UX; - src/lib/trading/ARCHITECTURE.md — ticket UX mapping table; ## Focused; Command:; npm test -- --run src/lib/trading/orderTypeFamily.test.ts src/lib/trading/orderTicketOptions.test.ts src/app/components/trading/TradeOrderForm.test.tsx; Result:; Test Files  3 passed (3); Tests  48 passed (48); exit=0; ## Backend; No API/sidecar contract changes — UI maps to existing eight OrderType values. | src/lib/trading/orderTypeFamily.ts,src/lib/trading/orderTypeFamily.test.ts,src/app/components/trading/TradeOrderForm.tsx,src/app/components/trading/TradeOrderForm.test.tsx,src/lib/trading/ARCHITECTURE.md,docs/evidence/trade-order-type-family-ux-2026-08-04.txt |
| LIVE — Trade ticket order surface | Trail/Trail Lmt/MOC/LOC tabs; IOC/OPG TIF; AON; Price mgmt algo on ticket + sidecar | **Passing** | # LIVE — Trade ticket order surface evidence; # Date: 2026-08-04; ## Focused; Test Files  6 passed (6); Tests  73 passed (73); sidecar 8 passed; `docs/evidence/trade-ticket-order-surface-2026-08-04.txt` | src/lib/trading/types.ts,src/lib/trading/orderTicketOptions.ts,src/app/components/trading/TradeOrderForm.tsx,services/tws-sidecar/tws_sidecar/trading/orders.py |
| ENGINE — Magnet TV parity | Strong magnet CP drag: OHLC from cursor candle; long/short left handles Y-only | **Passing** | # ENGINE — Magnet TV parity evidence; # Date: 2026-08-04; ## Scope; TradingView-style strong magnet for CP drag: OHLC from candle under cursor; long/short left handles snap price only (no horizontal jump); role-aware price/time/xy axes.; ## Delivered; - packages/chart-core/src/drawingCoords.ts — resolveMagnetDragPlot (price/time/xy); - packages/chart-core/src/drawings/positionGeometry.ts — resolveMagnetDragAxisForCp; - packages/chart-react/src/drawing/applyDrawingPointerTransition.ts — role-aware CP magnet wiring; - Tests: drawingCoords, applyDrawingPointerTransition, position_tool; - Docs: docs/chart/features.md, src/lib/chart/ARCHITECTURE.md; ## Focused; Command:; npm test -- --run src/lib/chart/drawingCoords.test.ts packages/chart-react/src/drawing/applyDrawingPointerTransition.test.ts src/lib/chart/drawings/position_tool.test.ts; Result:; Test Files  3 passed (3); Tests  46 passed (46); exit=0 | packages/chart-core/src/drawingCoords.ts,packages/chart-core/src/drawings/positionGeometry.ts,packages/chart-react/src/drawing/applyDrawingPointerTransition.ts |
| ENGINE — Magnet strong snap | Magnet snaps to nearest OHLC; whole-tool drag uses entry anchor for long/short; CP drag snaps only dragged handle | **Passing** | # ENGINE — Magnet strong snap evidence; # Date: 2026-08-04; ## Scope; TradingView-style strong magnet: always snap to nearest OHLC on price pane; whole-tool drag snaps plugin magnet anchor and translates other points rigidly; CP drag snaps only the dragged handle.; ## Delivered; - packages/chart-core/src/drawingCoords.ts — strong nearest-OHLC snap; magnet-anchor translateDrawingPoints; - packages/chart-core/src/plugin-api.ts — optional magnetAnchorIndex hook; - packages/chart-core/src/drawings/position_tool.ts — entry anchor (index 0); - packages/chart-react/src/drawing/applyDrawingPointerTransition.ts — whole-tool drag magnet wiring; - Tests: drawingCoords, applyDrawingPointerTransition, position_tool; - Docs: docs/chart/features.md, src/lib/chart/ARCHITECTURE.md; ## Focused; Command:; npm test -- --run src/lib/chart/drawingCoords.test.ts packages/chart-react/src/drawing/applyDrawingPointerTransition.test.ts src/lib/chart/drawings/position_tool.test.ts; Result:; Test Files  3 passed (3); Tests  40 passed (40); exit=0 | packages/chart-core/src/drawingCoords.ts,packages/chart-core/src/plugin-api.ts,packages/chart-core/src/drawings/position_tool.ts,packages/chart-react/src/drawing/applyDrawingPointerTransition.ts |

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

- **2026-07-24 — Code organization Phase 4 Passing:** MarketDataService façade 358 LOC + ChartCell shell 258 LOC; focused MD 156 + ChartCell 85; build OK; evidence `docs/evidence/code-org-phase-4.txt`. Next: Phase 5 chart shim sunset.
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
