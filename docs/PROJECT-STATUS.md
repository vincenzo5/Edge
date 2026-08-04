# Project Status

Single source for **current** progress. Historical harness dumps: [status-archive/](./status-archive/). For row-by-row feature detail, see [chart/features.md](./chart/features.md).

**Last updated:** 2026-08-04

## Current Verified State

- **Current task:** LIVE — Unbound trade ticket.
- **State:** **Passing** — LIVE — Unbound trade ticket closeout via harness:closeout
- **Latest verification:** # LIVE — Unbound trade ticket evidence; # Date: 2026-08-04; ## Scope; Long/short position drawing is optional for the Trade panel. Manual chart ticket always available; Unlink + drawing delete fall back to unbound mode.; ## Delivered; - src/app/components/trading/TradeSetupBindingContext.tsx — clearTradeBind API; openTradePanel refactored; - src/app/components/sidebar/panels/TradeSidebarPanel.tsx — always show ticket; Unlink control; - src/app/components/trading/TradeOrderForm.tsx — remove boundActive empty-state gate; - src/app/components/chart-cell/useTradeDrawingBinding.ts — clearTradeBind when bound drawing missing; - src/lib/trading/ARCHITECTURE.md, src/lib/risk/ARCHITECTURE.md — contract notes; ## Focused; Command:; npm test -- --run src/app/components/sidebar/panels/TradeSidebarPanel.test.tsx src/app/components/chart-cell/useTradeDrawingBinding.test.ts src/app/components/trading/TradeOrderForm.test.tsx; Result:; Test Files  3 passed (3); Tests  35 passed (35); ## App-level (manual); - Header Trade with no long/short → compose ticket usable; - Trade setup… link → Unlink → manual ticket restored; - Delete linked drawing → manual ticket remains usable
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
| LIVE — Unbound trade ticket | Manual chart trade ticket without long/short drawing; Unlink and drawing delete fall back to unbound mode | **Passing** | # LIVE — Unbound trade ticket evidence; # Date: 2026-08-04; ## Scope; Long/short position drawing is optional for the Trade panel. Manual chart ticket always available; Unlink + drawing delete fall back to unbound mode.; ## Delivered; - src/app/components/trading/TradeSetupBindingContext.tsx — clearTradeBind API; openTradePanel refactored; - src/app/components/sidebar/panels/TradeSidebarPanel.tsx — always show ticket; Unlink control; - src/app/components/trading/TradeOrderForm.tsx — remove boundActive empty-state gate; - src/app/components/chart-cell/useTradeDrawingBinding.ts — clearTradeBind when bound drawing missing; - src/lib/trading/ARCHITECTURE.md, src/lib/risk/ARCHITECTURE.md — contract notes; ## Focused; Command:; npm test -- --run src/app/components/sidebar/panels/TradeSidebarPanel.test.tsx src/app/components/chart-cell/useTradeDrawingBinding.test.ts src/app/components/trading/TradeOrderForm.test.tsx; Result:; Test Files  3 passed (3); Tests  35 passed (35); ## App-level (manual); - Header Trade with no long/short → compose ticket usable; - Trade setup… link → Unlink → manual ticket restored; - Delete linked drawing → manual ticket remains usable | src/app/components/trading/TradeSetupBindingContext.tsx,src/app/components/sidebar/panels/TradeSidebarPanel.tsx,src/app/components/trading/TradeOrderForm.tsx,src/app/components/chart-cell/useTradeDrawingBinding.ts |
| TypeScript indicator scripting roadmap | Private AI-generated TypeScript indicators compile inside a guest WASM VM and render declarative chart plots without an application rebuild or access to Canvas, DOM, network, filesystem, or app state | **Pending** | superseded by Phase 0 Active row; Phases 1+ remain pending | `docs/roadmaps/typescript-indicator-scripting-roadmap.md`, `docs/roadmaps/README.md`, `docs/ROADMAP.md`, `docs/chart/{features,indicator-foundation-plan}.md` |
| IB Gateway native daily soft restart | Both Gateway containers perform an 11:45 PM ET native restart without a competing hard exit; sidecar reconnects both sockets on its worker event loop | **Blocked** | **Focused:** `Ran 4 tests in 0.007s` / `OK`; **Config:** live/paper resolve `AUTO_RESTART_TIME=11:45 PM`, `TZ=America/New_York`, cold/logoff blank; **Runtime:** both containers running with `restartCount=0`, both logins completed; **App-level:** paper/live sidecar connections `gatewayConnected: true`, `warnings: []`; **Blocker:** scheduled-cycle proof pending after 11:45 PM ET | `services/ib-gateway/docker-compose.yml`, `services/ib-gateway/.env.example`, `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `src/lib/marketData/ARCHITECTURE.md` |
| Screener observability + baseline | Perf phases on screener route/service/technical filter; dev Screener tab in latency panel; `screener.fetch` client telemetry; before-optimization baseline in `docs/perf/screener-baseline-latest.json` | **Pending** | **Focused:** 48 tests passed; **Build:** `npm run build` passed; **Baseline:** `npm run perf:market-data` captured cold technical presets (~29–51s, candle p50 ~930–1617ms); app-level screener latency panel check not yet recorded; **Architecture review:** self-review Passed | `src/app/api/screener/run/route.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/screener/technicalFilter.ts`, `src/lib/marketData/telemetry/screenerPerf.ts`, `src/lib/chartDataFeed/apiScreenerFeed.ts`, `src/app/components/data-health/MarketDataLatencyDiagnosticsView.tsx`, `scripts/run-market-data-perf.mts`, `docs/perf/screener-baseline-latest.json` |
| Screener technical rule builder (v1) | User constructs/edits custom technical screener rules in QueryBuilder using any implemented `@edge/chart-core` indicator; registry-aware `validateIndicatorRule` rejects invalid rules client- and server-side; presets and saved screens round-trip `query.technical`; named kinds read-only in UI | **Pending** | **Focused:** 71 tests passed (`compileQuery`, `validateIndicatorRule`, `QueryBuilder`, `ScreenerDialog`, `api/screener/run`); **Build:** `npm run build:packages` + `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); app-level technical rule walkthrough not yet recorded; **Architecture review:** self-review Passed | `src/lib/screener/{compileQuery.ts,validateIndicatorRule.ts}`, `src/app/components/screener/{QueryBuilder.tsx,ScreenerDialog.tsx}`, `src/app/api/screener/run/route.ts`, `src/lib/marketData/ARCHITECTURE.md`, `docs/screener-roadmap.md` |
| Stock screener Phase 3 (custom indicators + comparison + summarize_screen) | Indicator-plugin screener rules via presets (MACD hist, BOLL %B, RSI); candle-fingerprint technical cache; `meta.indicatorValues` sidecar; multi-select comparison table; read-only `summarize_screen` AI tool | **Pending** | **Focused:** 49 screener/AI tests passed; **Build:** `npm run build:packages` + `npm run build` passed; app-level indicator preset + compare walkthrough not yet recorded; **Architecture review:** self-review Passed | `packages/chart-core/src/indicatorCompute.ts`, `src/lib/screener/{technicalMath,technicalFilter,presets,summarizeScreen}.ts`, `src/lib/marketData/schemas/request.ts`, `src/app/components/screener/{ComparisonView,ComparisonDialog}.tsx`, `src/lib/ai/tools/screener.ts`, `docs/screener-roadmap.md` |
| LIVE — Policy geometry on drawings | Settings default policy seeds new long/short target R; Trade apply reshapes bound drawing target from recipe | **Passing** | Test Files  10 passed (10); Tests  102 passed (102); `docs/evidence/policy-geometry-drawings-2026-08-03.txt` | src/lib/risk/policy/defaultPolicyPreference.ts,packages/chart-core/src/drawings/positionGeometry.ts,src/app/components/risk/RiskPoliciesSection.tsx,src/app/components/trading/useTradePolicyApply.ts |
| Position tool price-axis labels | Long/short position drawings show entry, stop, and take-profit price badges on the price axis | **Passing** | # LIVE — Position tool price-axis labels evidence; # Date: 2026-08-03; ## Scope; Long/short position drawings emit price-axis badges at entry, stop, and take-profit; so those levels are readable on the right scale (same path as hline axisAnnotations).; ## Delivered; - packages/chart-core/src/drawings/position_tool.ts — positionAxisAnnotations + plugin.axisAnnotations; - src/lib/chart/drawings/position_tool.test.ts — long/short/incomplete cases; - src/lib/chart/priceAxisAnnotations.test.ts — collectDrawingAnnotations for long_position; - src/lib/chart/ARCHITECTURE.md — document axis badges; ## Focused; Command:; npm test -- --run src/lib/chart/drawings/position_tool.test.ts src/lib/chart/priceAxisAnnotations.test.ts packages/chart-core/src/risk/positionLabels.test.ts; Result:; Test Files  3 passed (3); Tests  31 passed (31); exit=0; ## App-level; Deferred — place long/short on /chart; confirm green TP / gray Entry / red Stop badges on price axis;; toggle Scales → Drawing price labels hidden to confirm they disappear. | packages/chart-core/src/drawings/position_tool.ts,src/lib/chart/drawings/position_tool.test.ts,src/lib/chart/priceAxisAnnotations.test.ts,src/lib/chart/ARCHITECTURE.md |
| APP — Expectancy workspace surface | Workspace Expectancy tile: toggle WR, risk %, R-multiples, trade frequency; deterministic + Monte Carlo equity projection | **Passing** | # APP — Expectancy workspace surface evidence; # Date: 2026-08-03; ## Scope; Add Expectancy as a first-class workspace tile surface with deterministic and Monte Carlo equity projection.; ## Delivered; - src/lib/trading/expectancyProjector.ts — compound math, presets, deterministic + Monte Carlo; - src/app/components/expectancy/ExpectancyApp.tsx — params-left / projection-right UI; - src/app/components/app-workspace/ExpectancyTileSurface.tsx — workspace tile host; - SurfaceId "expectancy" wired through types, schema, SurfaceHost, choosers, deep links; ## Focused; Command:; npm test -- --run src/lib/trading/expectancyProjector.test.ts src/app/components/expectancy/ src/app/components/app-workspace/ExpectancyTileSurface.test.tsx src/lib/appWorkspace/deepLinks.test.ts; Result:; Test Files  4 passed (4); Tests  20 passed (20); Command:; npm run lint:app-lib-boundaries; Result:; App-lib boundary validation passed (fail-closed).; ## App-level; Manual: open /workspace?surface=expectancy, assign via Change panel, tweak risk 1% vs 10%, confirm ending equity + curve update; narrow tile for compact layout. | src/lib/trading/expectancyProjector.ts,src/app/components/expectancy/ExpectancyApp.tsx,src/app/components/app-workspace/ExpectancyTileSurface.tsx |
| LIVE — Trade size budget row | Policy budget sizes ticket qty; Size row Qty+Risk %/$; auto-bind drawing when Trade open | **Passing** | # LIVE — Trade size budget row evidence; # Date: 2026-08-03; ## Scope; Policy budget drives trade ticket sizing; TradeSizeBudgetField (Qty + Risk %/$); auto-bind drawing when Trade panel open.; ## Delivered; - src/lib/risk/policy/resolvePolicyTicketBudget.ts — policy/session budget resolution; - src/lib/risk/ticketSizeBudget.ts — qty ↔ risk helpers; - src/lib/risk/policy/applyPolicyToTradeDraft.ts — sized entryQty on apply; - src/app/components/trading/TradeSizeBudgetField.tsx — combined Size row; - src/app/components/trading/TradeOrderForm.tsx — wire size row; remove Size for risk; - src/app/components/trading/useTradePolicyApply.ts — policy-resolved dollar risk; - src/app/components/trading/TradeSetupBindingContext.tsx — bindToDrawing helper; - src/app/components/chart-cell/useTradeDrawingBinding.ts — auto-bind when Trade open; - src/lib/risk/ARCHITECTURE.md, src/lib/trading/ARCHITECTURE.md — sync; ## Focused; Command:; npm test -- --run src/lib/risk/policy/resolvePolicyTicketBudget.test.ts src/lib/risk/ticketSizeBudget.test.ts src/lib/risk/policy/applyPolicyToTradeDraft.test.ts src/app/components/trading/TradeSizeBudgetField.test.tsx src/app/components/trading/TradeOrderForm.test.tsx src/app/components/trading/useTradePolicyApply.test.tsx src/app/components/sidebar/panels/TradeSidebarPanel.test.tsx src/app/components/chart-cell/useTradeDrawingBinding.test.ts; Result:; Test Files  8 passed (8); Tests  50 passed (50) | src/lib/risk/policy/resolvePolicyTicketBudget.ts,src/app/components/trading/TradeSizeBudgetField.tsx,src/app/components/trading/TradeOrderForm.tsx,src/app/components/chart-cell/useTradeDrawingBinding.ts |
| LIVE — Trade policy dual-mode apply | Picker on every chart ticket; draft apply unbound; drawing persist + bind-upgrade | **Passing** | Test Files  10 passed (10); Tests  55 passed (55); `docs/evidence/trade-policy-dual-mode-2026-08-03.txt` | src/lib/risk/policy/applyPolicyToTradeDraft.ts,src/app/components/trading/useTradePolicyApply.ts,src/app/components/trading/TradeOrderForm.tsx |
| LIVE — Trade panel risk policy picker | Header policy picker; split TP/stop qty; runner strip; OCA reduce + Manage dedupe | **Passing** | # LIVE — Trade panel risk policy picker evidence; # Date: 2026-08-03; ## Focused; Test Files  7 passed (7); Tests  42 passed (42) | src/app/components/trading/TradeOrderForm.tsx,src/app/components/trading/TradePolicyPicker.tsx,src/lib/risk/policy/deriveProtectExitQuantities.ts |
| LIVE — Remove Plan panel | Remove floating chart Plan panel; keep Trade + apply APIs for later | **Passing** | # LIVE — Remove Plan panel evidence; # Date: 2026-08-02; ## Scope; Remove floating chart Plan panel and chart-side policy apply wiring.; Trade panel and risk-policy apply APIs unchanged for a future session.; ## Delivered; - src/app/components/drawing/DrawingSelectionChrome.tsx — toolbar only; no Plan panel; - src/app/components/chart-cell/ChartCellView.tsx — drop policyApply props; - src/app/components/chart-cell/buildChartCellViewProps.ts — drop policyApply; - src/app/components/chart-cell/ChartCell.tsx — drop policyApply wiring; - Deleted PositionPlanPanel.tsx + PositionPlanPanel.test.tsx; - src/app/components/drawing/drawingSelectionToolbarPosition.ts — remove plan panel positioning; - src/app/components/risk/RiskPoliciesSection.tsx — apply blurb updated; - src/lib/risk/ARCHITECTURE.md, src/lib/trading/ARCHITECTURE.md — Plan panel removed note; - Kept usePositionPlanPolicy.ts for future Trade panel reuse; ## Focused; Command:; npm test -- --run src/app/components/drawing/drawingSelectionToolbarPosition.test.ts src/app/components/risk/RiskPoliciesSection.test.tsx src/app/components/chart-cell/overlayContextMenu.test.ts src/app/components/chart-cell/tradeSetupRiskBindSync.test.ts src/app/components/chart-cell/buildChartCellViewProps.test.ts; Result:; Test Files  4 passed (4); Tests  16 passed (16) | src/app/components/drawing/DrawingSelectionChrome.tsx,src/app/components/chart-cell/ChartCellView.tsx,src/app/components/chart-cell/ChartCell.tsx |
| LIVE — User risk policies not presets | Two editable user policies (long/short); removed from builtins; tab user-only again | **Passing** | # LIVE — User risk policies not presets evidence; # Date: 2026-08-02; ## Scope; User wanted only two editable account-owned policies (not read-only builtins).; Revert Risk policies tab to user-only; remove long/short from PLAYBOOK_PRESET_IDS;; seed editable user templates into Postgres for app_users.; ## Delivered; - Reverted RiskPoliciesSection to user templates only; - Removed long_half_be_trail_05r / short_full_tp_1r from built-in presets; - CreatePlaybookTemplateSchema accepts inline definition (no preset source); - scripts/seed-user-risk-policies.mts — seeded both policies for local users; - Kept trailRMultiple support for 0.5R trail distance; ## Seed; Command:; npx tsx scripts/seed-user-risk-policies.mts; Result (abridged):; create Long half → BE → 0.5R trail; create Short full TP 1R (for each app_users row); ## Focused; Command:; npm test -- --run src/lib/trading/playbook/ src/lib/trading/playbookTemplateStore.test.ts src/lib/trading/playbookTemplateMutations.test.ts src/app/components/risk/RiskPoliciesSection.test.tsx src/lib/risk/policy/policy.test.ts; Result:; Test Files  22 passed (22); Tests  109 passed (109) | src/lib/trading/playbook/presets.ts,src/app/components/risk/RiskPoliciesSection.tsx,scripts/seed-user-risk-policies.mts |
| LIVE — Risk policies tab show built-in presets | Risk policies tab lists Built-in presets (view/duplicate) plus Yours | **Passing** | # LIVE — Risk policies tab show built-in presets evidence; # Date: 2026-08-02; ## Scope; Risk policies settings tab only listed user templates, so new built-in presets; (long_half_be_trail_05r, short_full_tp_1r, etc.) were invisible. Show Built-in; section from API presets; Yours for user templates.; ## Delivered; - src/app/components/risk/RiskPoliciesSection.tsx — fetch presets + userTemplates;; Built-in (view/duplicate) and Yours (full CRUD) sections; - src/app/components/risk/RiskPoliciesSection.test.tsx — assert builtins visible; ## Focused; Command:; npm test -- --run src/app/components/risk/RiskPoliciesSection.test.tsx src/app/components/home/AppSettingsShell.test.tsx src/app/api/trading/playbooks/templates/templates.routes.test.ts; Result:; Test Files  3 passed (3); Tests  22 passed (22) | src/app/components/risk/RiskPoliciesSection.tsx |
| LIVE — Risk policies — long half-BE-trail + short full TP | Built-in Manage presets: long 50%@1R→BE→0.5R trail; short full flatten@1R; trailRMultiple support | **Passing** | # Risk policies — long half-BE-trail + short full TP evidence; # Date: 2026-08-02; ## Scope; Ship two Manage presets matching trader recipe:; - Long: 1R/1R geometry; 50% at +1R → BE → 0.5R trail after +1.5R; - Short: 1R/1R geometry; flatten full at +1R; Plus trailRMultiple on BracketStopLeg resolved to dollars at attach.; ## Delivered; - src/lib/trading/types.ts — trailRMultiple on BracketStopLeg; - src/lib/trading/playbook/attachTrail.ts — resolveTrailAmountDollars; - src/lib/trading/playbook/presets.ts — long_half_be_trail_05r, short_full_tp_1r; - src/lib/trading/playbook/presetRiskPolicy.ts — completeness map; - src/lib/risk/policy/fromPlaybook.ts — pass geometry through; - src/app/components/trading/PlaybookTemplateEditor.tsx — Trail (R) field; ## Focused; Command:; npm test -- --run src/lib/trading/playbook/ src/lib/risk/policy/ src/app/components/trading/ManagePlaybookPicker.test.tsx src/app/components/risk/RiskPoliciesSection.test.tsx; Result:; Test Files  29 passed (29); Tests  129 passed (129) | src/lib/trading/playbook/presets.ts,src/lib/trading/playbook/attachTrail.ts,src/lib/trading/types.ts,src/app/components/trading/PlaybookTemplateEditor.tsx |
| APP — Risk policies settings tab | Policies library in Application settings Risk policies tab; removed from Risk calculator | **Passing** | # APP — Risk policies settings tab evidence; # Date: 2026-08-02; ## Scope; Move risk Policies library from Risk calculator sidebar to Application settings → Risk policies tab.; ## Delivered; - src/lib/app/appSettingsTabPreference.ts — add risk-policies tab id; - src/app/components/home/AppSettingsShell.tsx — Risk policies tab + RiskPoliciesSection mount; - src/app/components/home/AppSettingsShell.test.tsx — tab + library test; fetch mock for templates API; - src/app/components/sidebar/panels/RiskSettingsPanel.tsx — remove Policies section; - src/app/components/risk/RiskPoliciesSection.tsx — update apply blurb; - src/lib/risk/ARCHITECTURE.md, src/lib/trading/ARCHITECTURE.md, docs/roadmaps/risk-policy-data-model-roadmap.md — location sync; ## Focused; Command:; npm test -- --run src/app/components/home/AppSettingsShell.test.tsx src/app/components/risk/RiskPoliciesSection.test.tsx src/app/components/sidebar/panels/RiskSettingsPanel.test.tsx; Result:; Test Files  3 passed (3); Tests  33 passed (33); exit=0 | src/app/components/home/AppSettingsShell.tsx,src/app/components/risk/RiskPoliciesSection.tsx,src/app/components/sidebar/panels/RiskSettingsPanel.tsx |

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
