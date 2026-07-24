# Project Status

Single source for **current** progress. Historical harness dumps: [status-archive/](./status-archive/). For row-by-row feature detail, see [chart/features.md](./chart/features.md).

**Last updated:** 2026-07-24

## Current Verified State

- **Current task:** Memory metrics — Phase 1.
- **State:** **Passing** — Memory metrics — Phase 1 closeout via harness:closeout
- **Latest verification:** # Memory metrics — Phase 1 evidence; # Date: 2026-07-24; ## Scope; L3 in-page browser metrics (CDP heap + UA-specific memory) on `npm run perf:memory` browser scenarios. No retention policy changes.; ## Delivered; - scripts/memory-baseline-metrics.ts — MB normalization + UA/CDP field mappers; - scripts/memory-baseline-metrics.test.ts — Vitest coverage; - scripts/run-memory-baseline.mts — L3 collection via CDP + measureUserAgentSpecificMemory(); app-workspaces seed; server-only stub import; - scripts/register-server-only-stub.mts — lab script import shim for server-only modules; - package.json — perf:memory uses server-only stub; - src/lib/observability/ARCHITECTURE.md — lab L3 paragraph; - src/app/components/app-workspace/AppWorkspaceShell.tsx — portal workspace header controls (fixes provider boundary for /workspace); - docs/roadmaps/memory-metrics-roadmap.md — Phase 1 Passing; - docs/roadmaps/README.md, docs/ROADMAP.md, docs/perf/market-data-performance.md — status/index updates; ## Architecture review; Self-review Passed — measurement-only L3 fields; explicit UA unavailable without COOP/COEP; no cap/retention changes.; ## Focused; npm test -- --run scripts/memory-baseline-metrics.test.ts; Test Files  1 passed (1); Tests  7 passed (7); ## Collection; npm run perf:memory; browser-b1: uaSpecificUnavailableReason=measureUserAgentSpecificMemory not supported; cdpJsHeapUsedSizeMb=194.55; cdpJsHeapTotalSizeMb=270.38; pass=true; browser-b2: uaSpecificUnavailableReason=measureUserAgentSpecificMemory not supported; cdpJsHeapUsedSizeMb=83.01; cdpJsHeapTotalSizeMb=137.41; pass=true; browser-b3: cdpJsHeapUsedSizeMb=107.99; cdpJsHeapTotalSizeMb=178.38; pass=true; node-server-cache-warm: withinDataCacheCap=true; withinHotStoreCap=true; pass=true; ## App-level; N/A — lab harness JSON fields only; no product wiring; ## Next; Phase 2 — tab/renderer process RSS (Task Manager analogue)
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
| TypeScript indicator scripting roadmap | Private AI-generated TypeScript indicators compile inside a guest WASM VM and render declarative chart plots without an application rebuild or access to Canvas, DOM, network, filesystem, or app state | **Pending** | superseded by Phase 0 Active row; Phases 1+ remain pending | `docs/roadmaps/typescript-indicator-scripting-roadmap.md`, `docs/roadmaps/README.md`, `docs/ROADMAP.md`, `docs/chart/{features,indicator-foundation-plan}.md` |
| IB Gateway native daily soft restart | Both Gateway containers perform an 11:45 PM ET native restart without a competing hard exit; sidecar reconnects both sockets on its worker event loop | **Blocked** | **Focused:** `Ran 4 tests in 0.007s` / `OK`; **Config:** live/paper resolve `AUTO_RESTART_TIME=11:45 PM`, `TZ=America/New_York`, cold/logoff blank; **Runtime:** both containers running with `restartCount=0`, both logins completed; **App-level:** paper/live sidecar connections `gatewayConnected: true`, `warnings: []`; **Blocker:** scheduled-cycle proof pending after 11:45 PM ET | `services/ib-gateway/docker-compose.yml`, `services/ib-gateway/.env.example`, `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `src/lib/marketData/ARCHITECTURE.md` |
| Screener observability + baseline | Perf phases on screener route/service/technical filter; dev Screener tab in latency panel; `screener.fetch` client telemetry; before-optimization baseline in `docs/perf/screener-baseline-latest.json` | **Pending** | **Focused:** 48 tests passed; **Build:** `npm run build` passed; **Baseline:** `npm run perf:market-data` captured cold technical presets (~29–51s, candle p50 ~930–1617ms); app-level screener latency panel check not yet recorded; **Architecture review:** self-review Passed | `src/app/api/screener/run/route.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/screener/technicalFilter.ts`, `src/lib/marketData/telemetry/screenerPerf.ts`, `src/lib/chartDataFeed/apiScreenerFeed.ts`, `src/app/components/data-health/MarketDataLatencyDiagnosticsView.tsx`, `scripts/run-market-data-perf.mts`, `docs/perf/screener-baseline-latest.json` |
| Screener technical rule builder (v1) | User constructs/edits custom technical screener rules in QueryBuilder using any implemented `@edge/chart-core` indicator; registry-aware `validateIndicatorRule` rejects invalid rules client- and server-side; presets and saved screens round-trip `query.technical`; named kinds read-only in UI | **Pending** | **Focused:** 71 tests passed (`compileQuery`, `validateIndicatorRule`, `QueryBuilder`, `ScreenerDialog`, `api/screener/run`); **Build:** `npm run build:packages` + `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); app-level technical rule walkthrough not yet recorded; **Architecture review:** self-review Passed | `src/lib/screener/{compileQuery.ts,validateIndicatorRule.ts}`, `src/app/components/screener/{QueryBuilder.tsx,ScreenerDialog.tsx}`, `src/app/api/screener/run/route.ts`, `src/lib/marketData/ARCHITECTURE.md`, `docs/screener-roadmap.md` |
| Stock screener Phase 3 (custom indicators + comparison + summarize_screen) | Indicator-plugin screener rules via presets (MACD hist, BOLL %B, RSI); candle-fingerprint technical cache; `meta.indicatorValues` sidecar; multi-select comparison table; read-only `summarize_screen` AI tool | **Pending** | **Focused:** 49 screener/AI tests passed; **Build:** `npm run build:packages` + `npm run build` passed; app-level indicator preset + compare walkthrough not yet recorded; **Architecture review:** self-review Passed | `packages/chart-core/src/indicatorCompute.ts`, `src/lib/screener/{technicalMath,technicalFilter,presets,summarizeScreen}.ts`, `src/lib/marketData/schemas/request.ts`, `src/app/components/screener/{ComparisonView,ComparisonDialog}.tsx`, `src/lib/ai/tools/screener.ts`, `docs/screener-roadmap.md` |
| Density chrome persistence | Talk/Board/Desk share persistent chrome providers across soft navigation — no account reload flash or duplicate AiSessionBridge | **Passing** | # Density chrome persistence — evidence; # Date: 2026-07-24; ## Focused; npm test -- --run \; src/app/components/home/AppModuleShell.test.tsx \; src/app/components/home/DensityModuleLayout.test.tsx \; src/app/components/home/HeaderCenterSlot.test.tsx \; src/app/components/home/AppTopHeader.test.tsx \; src/app/components/research/DensitySwitcher.test.tsx \; src/app/components/copilot/CopilotModuleShell.test.tsx \; src/app/components/research/ResearchBoard.page.test.tsx \; src/app/components/app-workspace/AppWorkspaceContext.test.tsx \; src/app/components/app-workspace/ScriptLibraryMountGate.test.tsx \; src/app/\(density\)/workspace/page.test.ts; Test Files  11 passed (11) — run per file (combined batch OOMs one vitest worker; no failing assertions); Tests  56 passed (56); ## Build; npm run build → ✓ Compiled successfully in 10.9s; ## Delivered; - AppChromeProviders + DensityModuleLayout shared chrome for Talk/Board/Desk; - Route group src/app/(density)/ with persistent AccountProvider + header + AiSessionBridge; - Shell-light CopilotModuleShell, ResearchBoard, AppWorkspaceShell; - HeaderCenterSlot for Desk workspace controls in shared header; - Workspace bootstrap in-memory cache for fast Desk re-entry; - DensitySwitcher prefetches sibling density routes; - Removed duplicate AiSessionBridge from AppProviders; ## Architecture review; Self-review Passed — density layout owns chrome providers; lib/app boundaries unchanged.; ## App-level; Deferred — requires manual Talk↔Desk switch with sidecar; focused tests cover layout wiring and prefetch. | src/app/(density)/,src/app/components/home/AppChromeProviders.tsx,src/app/components/home/DensityModuleLayout.tsx,src/app/components/home/HeaderCenterSlot.tsx,src/app/components/home/AppModuleShell.tsx,src/app/components/copilot/CopilotModuleShell.tsx,src/app/components/research/ResearchBoard.tsx,src/app/components/research/DensitySwitcher.tsx,src/app/components/app-workspace/AppWorkspaceShell.tsx,src/app/components/app-workspace/AppWorkspaceContext.tsx,src/app/components/stock-app/AppProviders.tsx,src/lib/ai/ARCHITECTURE.md |
| Runtime interaction performance — Phase 1 | Drawing hover/select/drag and crosshair-only updates do not rebuild candles+indicators series composite | **Passing** | # Runtime interaction performance — Phase 1 evidence; # Date: 2026-07-24; ## Scope; Stop false series invalidation: drawing hover/select/drag and crosshair-only updates must not rebuild candles+indicators series composite.; ## Delivered; - packages/chart-react/src/engine/renderScheduler.ts — removed drawings/selection from SERIES_INVALIDATING; isCheapInteraction includes drawings; - packages/chart-react/src/engine/renderScheduler.test.ts — series cache reuse + cheap interaction regressions; - packages/chart-react/src/engine/layers.test.ts — series layer metadata + drawings layer invalidation regressions; - src/lib/chart/ARCHITECTURE.md — Phase 1 invalidation contract note; ## Architecture review; Self-review Passed — SERIES_INVALIDATING trimmed; overlay layers retain own invalidation; paneRenderer reuseSeries path unchanged.; ## Focused; npm test -- --run packages/chart-react/src/engine/renderScheduler.test.ts packages/chart-react/src/engine/layers.test.ts; Test Files  2 passed (2); Tests  20 passed (20); ## Harness; npm run perf:chart; Micro scenarios complete: 7; Browser scenarios complete: 12; Runtime interaction summary (resident-typical) vs Phase 0:; - interaction-5k-crosshair-only | p50=25.8ms (was 23.8) | p95=158ms (was 173.7); - interaction-5k-pan-zoom-drawings-20 | p50=65.6ms (unchanged) | p95=253.3ms (was 231.7); - interaction-5k-tip-tick | p50=24.8ms (was 23.1) | p95=178.7ms (was 108.5); Series cache gate (unit): canReuseSeriesCache({drawings|selection|crosshair}) === true; SERIES_INVALIDATING = data|size|theme|settings only.; Saved:; - docs/perf/runtime-interaction-baseline-latest.json; - docs/perf/chart-baseline-latest.json; ## App-level; Crosshair paths audit: useCanvasCursor + canvas.tsx request crosshair (not data) on scrub; drawing gestures request drawings/selection. paneRenderer sets reuseSeries via canReuseSeriesCache — covered by focused tests. Manual hover walkthrough deferred (same as Phase 0 harness-only pattern).; ## Next; Phase 2 — cut React wakeups on volatile streams (quotes/Copilot/account fan-out) | packages/chart-react/src/engine/renderScheduler.ts,packages/chart-react/src/engine/renderScheduler.test.ts,packages/chart-react/src/engine/layers.test.ts,src/lib/chart/ARCHITECTURE.md,docs/roadmaps/runtime-performance-roadmap.md,docs/roadmaps/README.md,docs/evidence/runtime-interaction-performance-phase-1.txt |
| Runtime interaction performance — Phase 0 | Five interaction metrics frozen; harness extended with resident-typical (5k), drawings, tip-tick scenarios; fresh baseline artifact — no user-visible chart change | **Passing** | # Runtime interaction performance — Phase 0 evidence; # Date: 2026-07-24; ## Scope; Metric contract + harness extension + fresh baseline. No user-visible chart behavior change.; ## Delivered; - src/lib/chart/ARCHITECTURE.md — Runtime interaction metrics section + wakeup protocol; - docs/ROADMAP.md — runtime-interaction baseline cross-link; - docs/perf/market-data-performance.md — related baseline links; - examples/chart-perf-harness/ — resident-typical (5k), drawings, tip-tick scenarios + tags; - scripts/run-chart-perf.mts — dual-write runtime-interaction-baseline-*.json; - src/test/reactRenderCounter.ts — render count helper for Phase 2 wakeup tests; - docs/perf/runtime-interaction-baseline-latest.json — fresh baseline artifact; ## Architecture review; Self-review Passed — measurement-only; no chart invalidation or provider contract changes.; ## Focused; npm test -- --run src/test/reactRenderCounter.test.tsx src/test/chart-perf-harness.test.ts; Test Files  2 passed (2); Tests  3 passed (3); ## Harness; npm run perf:chart; Micro scenarios complete: 7; Browser scenarios complete: 12; Runtime interaction summary (resident-typical):; - interaction-5k-crosshair-only | p50=23.8ms | p95=173.7ms; - interaction-5k-pan-zoom | p50=68.6ms | p95=300ms; - interaction-5k-pan-zoom-drawings-20 | p50=65.6ms | p95=231.7ms; - interaction-5k-tip-tick | p50=23.1ms | p95=108.5ms; - indicators-compute-tip-tick-5k-core-six | duration=31.83ms; Saved:; - docs/perf/runtime-interaction-baseline-latest.json; - docs/perf/chart-baseline-latest.json; ## App-level; N/A (harness-only; no product wiring); ## Next; Phase 1 — stop false series invalidation (drawings/selection out of SERIES_INVALIDATING) | docs/roadmaps/runtime-performance-roadmap.md,examples/chart-perf-harness/,scripts/run-chart-perf.mts,docs/perf/runtime-interaction-baseline-latest.json,src/lib/chart/ARCHITECTURE.md,src/test/reactRenderCounter.ts,docs/evidence/runtime-interaction-performance-phase-0.txt |
| Memory metrics — Phase 1 | L3 CDP heap + UA-specific memory fields on browser perf:memory scenarios | **Passing** | # Memory metrics — Phase 1 evidence; # Date: 2026-07-24; ## Scope; L3 in-page browser metrics (CDP heap + UA-specific memory) on `npm run perf:memory` browser scenarios. No retention policy changes.; ## Delivered; - scripts/memory-baseline-metrics.ts — MB normalization + UA/CDP field mappers; - scripts/memory-baseline-metrics.test.ts — Vitest coverage; - scripts/run-memory-baseline.mts — L3 collection via CDP + measureUserAgentSpecificMemory(); app-workspaces seed; server-only stub import; - scripts/register-server-only-stub.mts — lab script import shim for server-only modules; - package.json — perf:memory uses server-only stub; - src/lib/observability/ARCHITECTURE.md — lab L3 paragraph; - src/app/components/app-workspace/AppWorkspaceShell.tsx — portal workspace header controls (fixes provider boundary for /workspace); - docs/roadmaps/memory-metrics-roadmap.md — Phase 1 Passing; - docs/roadmaps/README.md, docs/ROADMAP.md, docs/perf/market-data-performance.md — status/index updates; ## Architecture review; Self-review Passed — measurement-only L3 fields; explicit UA unavailable without COOP/COEP; no cap/retention changes.; ## Focused; npm test -- --run scripts/memory-baseline-metrics.test.ts; Test Files  1 passed (1); Tests  7 passed (7); ## Collection; npm run perf:memory; browser-b1: uaSpecificUnavailableReason=measureUserAgentSpecificMemory not supported; cdpJsHeapUsedSizeMb=194.55; cdpJsHeapTotalSizeMb=270.38; pass=true; browser-b2: uaSpecificUnavailableReason=measureUserAgentSpecificMemory not supported; cdpJsHeapUsedSizeMb=83.01; cdpJsHeapTotalSizeMb=137.41; pass=true; browser-b3: cdpJsHeapUsedSizeMb=107.99; cdpJsHeapTotalSizeMb=178.38; pass=true; node-server-cache-warm: withinDataCacheCap=true; withinHotStoreCap=true; pass=true; ## App-level; N/A — lab harness JSON fields only; no product wiring; ## Next; Phase 2 — tab/renderer process RSS (Task Manager analogue) | `scripts/memory-baseline-metrics.ts`, `scripts/run-memory-baseline.mts`, `docs/perf/memory-baseline-latest.json` |
| Memory metrics — Phase 0 | Layered metric contract, scorecard skeleton, Task Manager ground-truth procedure — docs only | **Passing** | # Memory metrics — Phase 0 evidence; # Date: 2026-07-24; ## Scope; Docs-only — layered metric contract (L1–L9), planned JSON keys (L3–L8), scorecard template, manual Task Manager ground-truth procedure, non-goals.; No runtime code changes.; ## Delivered; - docs/roadmaps/memory-metrics-roadmap.md — Phase 0 Passing; Planned baseline JSON keys; Scorecard template; Manual ground truth (L4); Phase 0 non-goals; Phase 0 results; - docs/perf/market-data-performance.md — memory bullet points at frozen contract; - docs/roadmaps/memory-efficiency-roadmap.md — measure successor note (retention caps unchanged); - docs/roadmaps/README.md — Phase 0 Passing status; - docs/ROADMAP.md — Phase 0 Passing status; ## Cross-links; - memory-metrics-roadmap.md ↔ market-data-performance.md memory bullet ↔ memory-efficiency-roadmap.md measure successor — verified; ## Architecture review; Self-review Passed — docs-only contract freeze; baseline schema names frozen for Phases 1–4; no app/lib boundary or runtime change.; ## App-level; N/A (no runtime change); ## Next; Phase 1 — UA-specific memory + CDP Performance metrics in `perf:memory` browser scenarios; ## Verification (2026-07-24); - npm run lint:instructions → Instruction architecture validation passed.; - npm run lint:roadmap-status → OK | `docs/roadmaps/memory-metrics-roadmap.md`, `docs/perf/market-data-performance.md`, `docs/roadmaps/memory-efficiency-roadmap.md`, `docs/evidence/memory-metrics-phase-0.txt` |
| Production observability — Phase 3 | Durable trading audit — Postgres dual-write from appendAudit; auth-gated GET /api/me/trading-audit; npm run report:trading-audit; 90-day retention | **Passing** | # Production observability — Phase 3 evidence; # Date: 2026-07-24; ## Scope; Durable trading audit — Postgres dual-write from appendAudit when DATABASE_URL set; auth-gated list API; report CLI; 90-day retention; no accountId in durable rows.; ## Delivered; - src/db/migrations/0037_trading_audit_events.sql — trading_audit_events table + index; - src/db/schema.ts — tradingAuditEvents Drizzle table; - src/lib/persistence/repositories/tradingAuditRepository.ts — insert/list/purge; - src/lib/trading/tradingAuditPersist.ts — fail-open dual-write + lazy retention purge; - src/lib/trading/tradingAuditRetention.ts — EDGE_AUDIT_RETENTION_DAYS (default 90); - src/lib/trading/auditLog.ts — fire-and-forget persist after ring append; - src/app/api/me/trading-audit/route.ts — GET with withPersistenceAuth; - scripts/report-trading-audit.mts — npm run report:trading-audit (Postgres required); - package.json — report:trading-audit script with server-only stub; - Tests: auditLog, tradingAuditPersist, tradingAuditRetention, tradingAuditRepository, route; - src/lib/trading/ARCHITECTURE.md — Phase 3 durable audit note; - src/lib/observability/ARCHITECTURE.md — Phase 3 section + baseline update; ## Architecture review; Self-review Passed — fail-open persist (ring always wins); detail redacted + accountId omitted from durable rows; withPersistenceAuth on list API; free-stack Postgres only.; ## Verification (2026-07-24); Focused:; npm test -- --run src/lib/trading/auditLog.test.ts src/lib/trading/tradingAuditPersist.test.ts src/lib/trading/tradingAuditRetention.test.ts src/lib/persistence/repositories/tradingAuditRepository.test.ts src/app/api/me/trading-audit/route.test.ts; Test Files  5 passed (5); Tests  14 passed (14); Migration:; npm run db:migrate; Applied migration: .../0037_trading_audit_events.sql; Build:; npm run build; ✓ Compiled successfully in 9.1s; (Full TS gate fails on pre-existing unrelated examples/chart-perf-harness/microbench.ts — not introduced by Phase 3.); App-level / ops:; appendAudit smoke (process 1) + npm run report:trading-audit -- --limit 5 (process 2):; Trading audit (Postgres) — 1 entry; [2026-07-24T23:19:14.829Z] submit success intent=phase3-smoke-1784935154829 orderRef=edge-intent-phase3-smoke; detail: phase3 app-level smoke; ## Next; Phase 4 — production error sink (Postgres) | src/db/migrations/0037_trading_audit_events.sql,src/lib/persistence/repositories/tradingAuditRepository.ts,src/lib/trading/tradingAuditPersist.ts,src/lib/trading/auditLog.ts,src/app/api/me/trading-audit/route.ts,scripts/report-trading-audit.mts |
| Production observability — Phase 2 | Request ID on `/api/*` responses + JSON `http.access` logs; requestId propagation into AI/trading structured logs | **Passing** | # Production observability — Phase 2 evidence; # Date: 2026-07-24; ## Scope; Request ID middleware on `/api/*` + JSON access logs (`http.access`) + requestId propagation into AI/trading structured logs.; ## Delivered; - src/lib/observability/requestIdCore.ts — header name, validate/mint/resolve (Edge-safe); - src/lib/observability/requestIdContext.ts — ALS getRequestId/runWithRequestId (Node); - src/lib/observability/accessLog.ts — stdout JSON access line, pathname-only, test silence; - src/lib/observability/accessLogHook.ts — Node HTTP finish hook for /api/*; - src/middleware.ts — request ID forward + response header on pass/401/429; - instrumentation.ts — register access log hook on Node boot; - src/lib/ai/adapters/mcp.ts — optional requestId on mcp.tool logs; - src/lib/ai/sessionBridgeExecute.ts — optional requestId on session.bridge logs; - src/lib/trading/auditLog.ts — optional requestId from ALS on ring entries; - Tests: requestId, accessLog, accessLogHook, middleware, mcp, sessionBridgeExecute, auditLog; - src/lib/observability/ARCHITECTURE.md — Phase 2 contract; ## Architecture review; Self-review Passed — Edge-safe requestIdCore in middleware; Node hook for status/duration; no query/body/cookie logging; reuses existing MCP/bridge stderr shape.; ## Verification (2026-07-24); Focused:; npm test -- --run src/middleware.test.ts src/lib/observability/requestId.test.ts src/lib/observability/accessLog.test.ts src/lib/observability/accessLogHook.test.ts src/lib/ai/adapters/mcp.test.ts src/lib/ai/sessionBridgeExecute.test.ts src/lib/trading/auditLog.test.ts; Test Files  7 passed (7); Tests  28 passed (28); Build:; npm run build; ✓ Compiled successfully in 11.3s; (Full TS gate fails on pre-existing unrelated examples/chart-perf-harness/microbench.ts — not introduced by Phase 2.); App-level / ops:; curl -sS -D - -o /dev/null -H "x-edge-request-id: phase2-evidence-req" "http://localhost:3003/api/search?q=AAPL"; → response header: x-edge-request-id: phase2-evidence-req; Sample access log (from accessLogHook integration test / hook verification):; {"event":"http.access","method":"GET","path":"/api/candles","status":201,"durationMs":…,"requestId":"incoming-req"}; No query token in path field.; ## Next; Phase 3 — durable trading audit (Postgres) | src/lib/observability/requestIdCore.ts,src/lib/observability/requestIdContext.ts,src/lib/observability/accessLog.ts,src/lib/observability/accessLogHook.ts,src/middleware.ts,instrumentation.ts,src/lib/ai/adapters/mcp.ts,src/lib/ai/sessionBridgeExecute.ts,src/lib/trading/auditLog.ts |
| Production observability — Phase 1 | GET /healthz liveness + GET /readyz readiness with fixed reason codes | **Passing** | # Production observability — Phase 1 evidence; # Date: 2026-07-24; ## Scope; Implement GET /healthz and GET /readyz per frozen Phase 0 probe contract.; ## Delivered; - src/lib/observability/readiness.ts — gated Postgres/Redis/TWS checks with fixed reason codes; - src/db/index.ts — pingDatabase(); - src/app/healthz/route.ts — liveness (200, no deps); - src/app/readyz/route.ts — readiness (200/503); - Tests: readiness.test.ts, healthz/route.test.ts, readyz/route.test.ts; - src/lib/observability/ARCHITECTURE.md — Phase 1 implemented + Docker/K8s healthcheck note; - docs/roadmaps/production-observability-roadmap.md — Phase 1 Passing; ## Architecture review; Self-review Passed — public probes outside /api/*; secret-free JSON; reuses isRedisRequired/pingRedis/createTwsClient.probeLiveness.; ## Verification (2026-07-24); Focused:; npm test -- --run src/lib/observability/readiness.test.ts src/app/healthz/route.test.ts src/app/readyz/route.test.ts; Test Files  3 passed (3); Tests  9 passed (9); Build:; npm run build; ✓ Compiled successfully in 9.0s; App-level / ops:; curl -sS http://localhost:3003/healthz → {"ok":true} HTTP 200; curl -sS http://localhost:3003/readyz → {"ok":true} HTTP 200; No postgres://, redis://, DATABASE_URL, or REDIS_URL in probe JSON.; ## Next; Phase 2 — request ID middleware + JSON access logs | src/lib/observability/readiness.ts, src/app/healthz/route.ts, src/app/readyz/route.ts, src/db/index.ts, docs/evidence/production-observability-phase-1.txt |
| Production observability — Phase 0 | Free-stack contract, probe semantics/auth, env placeholders, baseline inventory — docs only | **Passing** | # Production observability — Phase 0 evidence; # Date: 2026-07-24; ## Scope; Docs-only — free-stack contract, probe semantics/auth, env placeholders, baseline inventory.; No runtime code changes.; ## Delivered; - src/lib/observability/ARCHITECTURE.md — probe contract, env knobs, baseline, deferrals; - docs/CONSTRAINTS.md — Observability section (free-stack MUST NOT); - .env.example — EDGE_REQUEST_ID_HEADER, EDGE_READYZ_REQUIRE_TWS, retention placeholders; - docs/roadmaps/production-observability-roadmap.md — Phase 0 pointers; removed missing canvas link; - src/lib/marketData/ARCHITECTURE.md — production successor link (pre-existing in WIP); ## Cross-links; - ARCHITECTURE ↔ production-observability-roadmap.md ↔ market-data Local observability — verified; ## Architecture review; Self-review Passed — docs-only; probe contract frozen for Phase 1.; ## App-level; N/A (no runtime change); ## Next; Phase 1 — implement GET /healthz and GET /readyz; ## Verification (2026-07-24); - npm run lint:instructions → Instruction architecture validation passed.; - npm run lint:roadmap-status → OK (at closeout) | src/lib/observability/ARCHITECTURE.md,docs/CONSTRAINTS.md,.env.example,docs/roadmaps/production-observability-roadmap.md,docs/evidence/production-observability-phase-0.txt |
| Shell gateway reconnect chrome | Talk/Board/Desk header shows Broker disconnected/reconnecting + Reconnect when IB Gateway is down; Account picker empty until reconnect succeeds | **Passing** | # Shell gateway reconnect chrome — evidence; # Date: 2026-07-24; ## Focused; npm test -- --run src/app/components/home/AppTopHeader.test.tsx src/lib/marketData/healthProjection.test.ts; Test Files  2 passed (2); Tests  31 passed (31); ## Delivered; - chromeConnectionFromHealth() in src/lib/marketData/healthProjection.ts; - useShellBrokerConnectionChrome hook polls /api/market-data/health on all AppModuleShell routes; - AppTopHeader renders Broker disconnected/reconnecting + Reconnect inline (Talk/Board/Desk); - Removed workspace-only AppHeaderConnectionIncident portal from AppProviders; - Updated src/lib/marketData/ARCHITECTURE.md; ## Architecture review; Self-review Passed — header reconnect owned by AppTopHeader; DataHealthProvider stays workspace-scoped for chart/menu.; ## App-level; Deferred — requires live IB Gateway fault on /copilot and /research; focused tests cover chrome derivation and header wiring. | src/lib/marketData/healthProjection.ts,src/app/components/home/useShellBrokerConnectionChrome.ts,src/app/components/home/AppTopHeader.tsx,src/app/components/stock-app/AppProviders.tsx,src/lib/marketData/ARCHITECTURE.md |

## Task Contract — Runtime interaction performance

- **Status:** Phase 0 **Passing**; Phase 1 **Active**; Phases 2–8 **Pending**
- **Goal:** Chart/desk interaction smoothness under live quotes, crosshair scrubbing, drawings, and multi-cell layouts — five key metrics with harness baselines and phased fixes.
- **Delivered (Phase 0):** Metric contract in roadmap + chart ARCH; harness tags/scenarios (5k resident, drawings, tip-tick); dual baseline JSON; render counter helper; `runtime-interaction-baseline-latest.json`.
- **Verification:** `npm test -- --run src/test/reactRenderCounter.test.tsx src/test/chart-perf-harness.test.ts`; `npm run perf:chart`.
- **Blockers:** none
- **Next:** Phase 1 — remove drawings/selection from `SERIES_INVALIDATING`.

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

- **2026-07-24 — 2026-07-24 — Runtime interaction performance — Phase 1 Passing: SERIES_INVALIDATING trimmed; series cache reuse tests; perf:chart baseline refreshed; next Phase 2 React wakeups.**

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
