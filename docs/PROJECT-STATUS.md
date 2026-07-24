# Project Status

Single source for **current** progress. Historical harness dumps: [status-archive/](./status-archive/). For row-by-row feature detail, see [chart/features.md](./chart/features.md).

**Last updated:** 2026-07-24

## Current Verified State

- **Current task:** Production observability — Phase 0.
- **State:** **Passing** — Free-stack contract, probe semantics/auth, env placeholders, baseline inventory — docs only
- **Latest verification:** # Production observability — Phase 0 evidence; # Date: 2026-07-24; ## Scope; Docs-only — free-stack contract, probe semantics/auth, env placeholders, baseline inventory.; No runtime code changes.; ## Delivered; - src/lib/observability/ARCHITECTURE.md — probe contract, env knobs, baseline, deferrals; - docs/CONSTRAINTS.md — Observability section (free-stack MUST NOT); - .env.example — EDGE_REQUEST_ID_HEADER, EDGE_READYZ_REQUIRE_TWS, retention placeholders; - docs/roadmaps/production-observability-roadmap.md — Phase 0 pointers; removed missing canvas link; - src/lib/marketData/ARCHITECTURE.md — production successor link (pre-existing in WIP); ## Cross-links; - ARCHITECTURE ↔ production-observability-roadmap.md ↔ market-data Local observability — verified; ## Architecture review; Self-review Passed — docs-only; probe contract frozen for Phase 1.; ## App-level; N/A (no runtime change); ## Next; Phase 1 — implement GET /healthz and GET /readyz; ## Verification (2026-07-24); - npm run lint:instructions → Instruction architecture validation passed.; - npm run lint:roadmap-status → OK (at closeout)
- **Evidence:** `src/lib/observability/ARCHITECTURE.md`, `docs/CONSTRAINTS.md`, `.env.example`, `docs/roadmaps/production-observability-roadmap.md`, `docs/evidence/production-observability-phase-0.txt`
- **Current blocker:** none
- **Next best step:** Phase 1 — implement GET /healthz and GET /readyz
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
| Production observability — Phase 0 | Free-stack contract, probe semantics/auth, env placeholders, baseline inventory — docs only | **Passing** | # Production observability — Phase 0 evidence; # Date: 2026-07-24; ## Scope; Docs-only — free-stack contract, probe semantics/auth, env placeholders, baseline inventory.; No runtime code changes.; ## Delivered; - src/lib/observability/ARCHITECTURE.md — probe contract, env knobs, baseline, deferrals; - docs/CONSTRAINTS.md — Observability section (free-stack MUST NOT); - .env.example — EDGE_REQUEST_ID_HEADER, EDGE_READYZ_REQUIRE_TWS, retention placeholders; - docs/roadmaps/production-observability-roadmap.md — Phase 0 pointers; removed missing canvas link; - src/lib/marketData/ARCHITECTURE.md — production successor link (pre-existing in WIP); ## Cross-links; - ARCHITECTURE ↔ production-observability-roadmap.md ↔ market-data Local observability — verified; ## Architecture review; Self-review Passed — docs-only; probe contract frozen for Phase 1.; ## App-level; N/A (no runtime change); ## Next; Phase 1 — implement GET /healthz and GET /readyz; ## Verification (2026-07-24); - npm run lint:instructions → Instruction architecture validation passed.; - npm run lint:roadmap-status → OK (at closeout) | src/lib/observability/ARCHITECTURE.md,docs/CONSTRAINTS.md,.env.example,docs/roadmaps/production-observability-roadmap.md,docs/evidence/production-observability-phase-0.txt |
| Shell gateway reconnect chrome | Talk/Board/Desk header shows Broker disconnected/reconnecting + Reconnect when IB Gateway is down; Account picker empty until reconnect succeeds | **Passing** | # Shell gateway reconnect chrome — evidence; # Date: 2026-07-24; ## Focused; npm test -- --run src/app/components/home/AppTopHeader.test.tsx src/lib/marketData/healthProjection.test.ts; Test Files  2 passed (2); Tests  31 passed (31); ## Delivered; - chromeConnectionFromHealth() in src/lib/marketData/healthProjection.ts; - useShellBrokerConnectionChrome hook polls /api/market-data/health on all AppModuleShell routes; - AppTopHeader renders Broker disconnected/reconnecting + Reconnect inline (Talk/Board/Desk); - Removed workspace-only AppHeaderConnectionIncident portal from AppProviders; - Updated src/lib/marketData/ARCHITECTURE.md; ## Architecture review; Self-review Passed — header reconnect owned by AppTopHeader; DataHealthProvider stays workspace-scoped for chart/menu.; ## App-level; Deferred — requires live IB Gateway fault on /copilot and /research; focused tests cover chrome derivation and header wiring. | src/lib/marketData/healthProjection.ts,src/app/components/home/useShellBrokerConnectionChrome.ts,src/app/components/home/AppTopHeader.tsx,src/app/components/stock-app/AppProviders.tsx,src/lib/marketData/ARCHITECTURE.md |
| Trade management playbook — Phase 8 | Full rule editor for user templates — when/then rules, live preview, PATCH rules; Edit template… for user_* only | **Passing** | Trade management playbook — Phase 8 verification (2026-07-24); Focused: Test Files 6 passed (6), Tests 23 passed (23); Build: ✓ Compiled successfully; Architecture review: self-review Passed; App-level: create/edit custom template → attach on paper deferred; track Phase 0–8 complete | playbookTemplateStore.ts, PlaybookTemplateEditor.tsx, ManagePlaybookPicker.tsx, templates API, trading/ARCHITECTURE.md, `docs/evidence/trade-management-playbook-phase-8.txt` |
| Code organization — Phase 0 | Baseline inventory, size budgets, allowlist lib→app boundary gate; no product behavior change | **Passing** | Code organization Phase 0 (2026-07-24); Focused: Test Files 2 passed (2), Tests 6 passed (6); Boundary: lint:app-lib-boundaries 0 new violations; lint:package-boundaries passed; Architecture review: self-review Passed; App-level: N/A | `docs/evidence/code-org-baseline.txt`, `scripts/validate-app-lib-boundaries.mts`, `src/test/app-lib-boundaries.test.ts`, `code-organization-roadmap.md` |
| Code organization — Phase 1 | Layer inversion — shared types in lib; fail-closed app-lib boundary gate | **Passing** | Code organization Phase 1 (2026-07-24); Focused: Test Files 67 passed (67), Tests 383 passed (383); Boundary: lint:app-lib-boundaries 0 imports fail-closed; lint:package-boundaries passed; Build: ✓ Compiled successfully; Architecture review: self-review Passed; App-level: N/A | `docs/evidence/code-org-phase-1.txt`, `src/lib/chart/activeChartTypes.ts`, `src/lib/copilot/types.ts`, `scripts/package-boundary-policy.mts`, `package.json` |
| Code organization — Phase 2 | Harness & index hygiene — hot dashboard, archive automation, roadmap/AGENTS alignment | **Passing** | Code organization Phase 2 — Harness & index hygiene (2026-07-24); Focused:; - npm test -- --run scripts/harness-closeout.test.ts scripts/harness-archive.test.ts scripts/validate-harness-retention.test.ts scripts/check-roadmap-status.test.ts → Test Files 4 passed (4), Tests 24 passed (24); - npm run lint:harness-retention → OK; - npm run lint:roadmap-status → OK — README table matches track Status lines; - npm run lint:instructions → Instruction architecture validation passed.; Spot-check:; - wc -l docs/PROJECT-STATUS.md → 215 (from ~4519); - rg -c '^## Previous Verified State' docs/PROJECT-STATUS.md → 0 (closeout archives displaced Current; status:prune moves overflow); Architecture review: N/A (docs/harness); App-level: N/A; Delivered:; - harness:closeout replace-and-archive (no Previous stacks in hot file); - npm run status:prune + lint:harness-retention fail-closed gates wired into npm run check; - .cursor/rules/harness-steward.mdc — exclusive harness mutator; - One-time prune: Previous Verified, Active Work Passing rows, Task Contracts, Session Log → docs/status-archive/2026-07.md; - Retention policy: Previous keep = 0 documented in PROJECT-STATUS, status-archive README, harness checklist; - AGENTS Repo Layout refreshed (packages, marketData, trading/journal, design-system split); - ROADMAP + roadmaps/README index sync; roadmaps:status-check wired | docs/PROJECT-STATUS.md, docs/status-archive/, scripts/harness-archive.mts, scripts/harness-closeout.mts, AGENTS.md, docs/ROADMAP.md, docs/roadmaps/README.md |
| Code organization — Phase 3 | Components tree completion — feature folders; root composition-only | **Passing** | Code organization — Phase 3 (2026-07-24); Focused:; npm test -- --run src/app/components/chart-cell src/app/components/chart-chrome/ChartGrid src/app/components/stock-app/StockApp.test.tsx src/app/components/drawing src/app/components/object-tree; → Test Files 28 passed (28), Tests 188 passed (188); Build: npm run build → ✓ Compiled successfully; Boundary: npm run lint:app-lib-boundaries → 0 violations (fail-closed); Root components: 87 → 37 files at src/app/components/*.{ts,tsx}; Ban note: src/lib/chart/ARCHITECTURE.md components root policy; Architecture review: self-review Passed; App-level: N/A | src/app/components/chart-cell/,src/app/components/chart-chrome/,src/app/components/drawing/,src/app/components/stock-app/,src/app/components/object-tree/,src/lib/chart/ARCHITECTURE.md |
| Code organization — Phase 4 | God-module decomposition — MarketDataService façade split + ChartCell shell ≤400 LOC | **Passing** | Code organization — Phase 4 (2026-07-24); ## 4A — MarketDataService; Focused:; npm test -- --run src/lib/marketData/service src/lib/chartDataFeed src/app/api/candles; → Test Files 17 passed (17), Tests 156 passed (156); Build: npm run build → ✓ Compiled successfully; Budget: wc -l src/lib/marketData/service/marketDataService.ts → 358 (baseline 3120, target ≤ ~800); ## 4B — ChartCell shell; Focused:; npm test -- --run src/app/components/chart-cell src/app/components/ChartCell; → Test Files 19 passed (19), Tests 85 passed (85); Budget: wc -l src/app/components/chart-cell/ChartCell.tsx → 258 (baseline 1202, target ≤ ~400); Architecture review: self-review Passed; App-level: deferred — cold candle + feed chip walk | src/lib/marketData/service/,src/app/components/chart-cell/ChartCell.tsx,src/lib/marketData/ARCHITECTURE.md |
| Code organization — Phase 5 | Chart shim sunset — migrate to @edge/chart-*; delete pure re-exports; CI ban | **Passing** | # Code organization — Phase 5 evidence (chart shim sunset); # Date: 2026-07-24; ## Inventory; Pure re-export shims (2-line export * / default from @edge/*): 63; Real app adapters (keep): 20; ### Adapters (keep in src/lib/chart/); - series.ts — Yahoo /api/candles fetch + core series re-exports; - intervalAdapter.ts — Yahoo interval typing + core re-exports; - scriptSeriesResolver.ts — script series key resolution; - resolveChartLiveQuotePrice.ts — live quote price glue; - chartSnapshot.ts — workspace snapshot persistence; - viewportPersistSketch.ts — viewport debounce sketch; - stateMapping.ts — layout ↔ engine state mapping; - chartClipboard.ts — chart copy/paste clipboard; - layoutTemplates.ts — layout template catalog; - layoutTemplateGrid.ts — template grid helpers; - presets/apply.ts, presets/types.ts, presets/validate.ts — chart presets; - activeChartTypes.ts — ActiveChart snapshot types (Phase 1); - objectTreeModel.ts — object tree model; - chartHeaderMetadata.ts — header metadata helpers; - dataWindow.ts — data window panel model; - indicatorFavorites.ts — indicator favorites persistence; - chartTheme.ts — chart theme tokens; - scriptFixtureDev.ts — dev script fixtures; ### Pure shims (delete after consumer migration); Root: annotationMetadata, contracts, crosshair, crosshairMode, drawingClone, drawingController,; drawingCoords, drawingSettingsCapabilities, drawingStore, drawingStyles, format, index, layout,; indicatorCompute, indicatorInputs, paneLabels, panes, pinch, plugin-api, pluginHost,; priceAxisTypes, priceScaleTransform, time, timeAxis, timeZone, wheel; React engine: canvas, CrosshairOverlay, chartSettings, goTo, indicatorScale, legend, paneHandle,; priceAxisAnnotations, rangeInterval, rangePresetTransition, rangePresets, renderer, viewport; Drawings: annotation, annotationBadge, channels, drawingUtils, fib_retracement, hline, measure,; primitives, ray, rect, registry, trend_line, vertical_line; Indicators: boll, catalog, draw, ema, ma, macd, math, registry, rsi, vol; Legend: legend/types; ## Baseline import counts (pre-migration); - src/app → @/lib/chart/*: ~279 import lines; - src/app → @edge/chart-*: ~38 import lines; - src/lib (excl chart) → @/lib/chart/*: ~119 import lines; ## Phase 0.5; examples/chart-perf-harness already in package-boundary scan (closed Phase 0).; ## Sunset; Pure re-export shims sunset date: 2026-07-24 (Phase 5 closeout).; New pure shims under src/lib/chart/ banned via lint:chart-shims (fail-closed).; ## Post-migration (2026-07-24); - Pure shims deleted: 63; - Adapters remaining: 20; - src/app → @edge/chart-*: ~128 import lines (was ~38 direct + migrated from shims); - src → @/lib/chart/* (adapters only): ~53 import lines; - Codemod migrated files: 140; ## Verification (2026-07-24); Boundary:; - npm run lint:package-boundaries → Package boundary validation passed.; - npm run lint:app-lib-boundaries → App-lib boundary validation passed (fail-closed).; - npm run lint:chart-shims → Chart shim scan: 20 production module(s); 0 violation(s).; Focused:; - npm test -- --run src/test/chart-shims.test.ts src/test/app-lib-boundaries.test.ts → Test Files 2 passed (2), Tests 6 passed (6); - npm test -- --run src/lib/chart src/app/components/chart-cell src/app/components/chart-chrome src/app/components/drawing → Test Files 115 passed (116), Tests 849 passed (850) — 1 pre-existing ChartGoToModal DOM flake; Build:; - npm run build:packages → OK; - npm run build → ✓ Compiled successfully; Architecture review: self-review Passed; App-level: N/A (import-path only) | docs/evidence/code-org-phase-5.txt,scripts/validate-chart-shims.mts,scripts/package-boundary-policy.mts,scripts/migrate-chart-shim-imports.mts,src/test/chart-shims.test.ts,src/lib/chart/ARCHITECTURE.md,package.json |
| Execute-from-plan git commit closeout | After Passing with quoted evidence, one git commit for task changes; plan `Commit: yes\ | **Passing** | Instructions: npm run lint:instructions → Instruction architecture validation passed.; Delivered: execute-from-plan Commit once after Passing; checklist Git commit after Passing; plan Commit: yes|skip; session-exit + AGENTS; lint asserts. | .cursor/rules/execute-from-plan.mdc, docs/checklists/execute-from-plan-checklist.md, docs/checklists/session-exit-checklist.md, plan-harness-awareness.mdc, planning-router.md, AGENTS.md, scripts/validate-agent-instructions.mts |

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

- **Status:** Active — Phase 0–4 **Passing** (2026-07-24); Phase 5 **Pending** (Path A chosen); Phases 6–7 **Pending**
- **Goal:** Productize broker/data management as **Connections + platform market data** (Settings console → preference store → ConfigSource → durable connections → connect path → optional BYO vault → multi-broker ledger).
- **Delivered (Phase 0–4):** Contracts, Settings console, provider prefs, ConfigSource, durable `connections` table + `/api/me/connections` — see roadmap + session log 2026-07-24.
- **Phase 5 decision (2026-07-24):** **Path A — hosted IB OAuth.** Connect in Settings; tokens server-side; `local_gateway` sidecar retained for self-host. Not Path B (second broker) or Path C (wizard only).
- **Blockers:** none
- **Next:** Activate Phase 5 under WIP=1 — IB OAuth adapter, Connect/Disconnect UI, account/trade path, trust gates (5.2–5.6).

## Session Log


- **2026-07-24 — Production observability — Phase 0 Passing: ARCHITECTURE probe contract + CONSTRAINTS free-stack + .env placeholders; npm run lint:instructions passed; no runtime change. Next: Phase 1 probes.**

### 2026-07-24 — Production observability — Phase 0

- **2026-07-24 — Harness reconcile:** Phase 8 playbook marked Passing (evidence on file); code-org Phase 3–4 session log + next-step/verify-path sync; playbook Task Contract → track complete.

- **2026-07-24 — Code organization Phase 4 Passing:** MarketDataService façade 358 LOC + ChartCell shell 258 LOC; focused MD 156 + ChartCell 85; build OK; evidence `docs/evidence/code-org-phase-4.txt`. Next: Phase 5 chart shim sunset.

- **2026-07-24 — Code organization Phase 3 Passing:** Feature folders (chart-cell/chrome/drawing/stock-app/object-tree); root 87→37; focused 188; build OK; evidence `docs/evidence/code-org-phase-3.txt`.

- **2026-07-24 — Code organization Phase 2 Passing: steward rule, retention gates, PROJECT-STATUS 4519→215 lines**

- **2026-07-24 — Code organization Phase 2 Passing: harness prune + index sync; PROJECT-STATUS 4519→306 lines**

- **2026-07-24 — Research UX — Phase 8 Passing: research-default entry** (evidence `docs/evidence/research-ux-phase-8.txt`)

- **2026-07-24 — Research UX Phase 7 session reel shipped**

- **2026-07-24 — Wave 2 Phase 3 browser walks on :3003; dev session via EDGE_ALLOW_OPEN_DEV_SESSION=1 for connection PATCH**

- **2026-07-24 — Execute-from-plan git commit closeout — Commit after Passing on execute; lint:instructions passed.**

- **2026-07-24 — Wave 2 Phase 2 Grok chrome walks 2.1–2.4 Passing; next Phase 3 Connections prefs**

- **2026-07-24 — Wave 2 Phase 1 Copilot agent walks closed — 7/8 App-level items quoted; 1.5 Skipped (browser hydration); next Phase 2 Grok chrome walks.**

- **2026-07-24 — Research UX Phase 2 Passing:** artifactHint on tool-result stream; pinable artifact cards + Talk evidence rail; session-local `tv-ai:research-evidence:v1`; focused Tests 101 passed (101); Arch self-review Passed. Next: Phase 3 Board v1.

- **2026-07-24 — Research UX Phase 1 Passing:** densityNav + DensitySwitcher + Board stub + home hub elevation; focused Tests 33 passed (33); app-level Talk↔Desk switch + Board stub verified; Arch self-review Passed. Next: Phase 2 evidence rail.
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
