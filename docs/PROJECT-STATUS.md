# Project Status

Single source for **current** progress. Historical harness dumps: [status-archive/](./status-archive/). For row-by-row feature detail, see [chart/features.md](./chart/features.md).

**Last updated:** 2026-07-28

## Current Verified State

- **Current task:** APP — Live functional QA remediation — Phase 2.
- **State:** **Passing** — No setState during render violation when workspace/chart loads or symbol changes (QA-02)
- **Latest verification:** # APP — Live functional QA remediation — Phase 2 evidence; # Date: 2026-07-28; # Scope: QA-02 — move cellLayoutStore sync out of StockApp setState updaters; ## Delivered; - src/app/components/stock-app/useStockAppBootstrap.ts — removed syncCellLayoutStoreFromLayout from setLayout/handleApplyWorkspaceTabs updaters; added useLayoutEffect mirror after hydrate; - src/app/components/stock-app/useStockAppBootstrap.test.tsx — regression test for render-time ChartCell update warning; ## Architecture review; Self-review Passed — cellLayoutStore ownership unchanged; sync timing moved to post-commit layout effect only.; ## Focused; Command:; npm test -- --run src/app/components/stock-app/useStockAppBootstrap.test.tsx src/lib/chart/cellLayoutStore.test.ts; Output:; Test Files  2 passed (2); Tests  5 passed (5); ## App-level; Route: GET /workspace 200; Symbol change: SPYM → AAPL via symbol search (same setLayout path as SPY → AAPL); Browser console capture (CDP addScriptToEvaluateOnNewDocument + reload): chartCellWarnings → []; Dev-server terminal grep after change: no `Cannot update a component (ChartCell) while rendering a different component (StockApp)` line; Closes: QA-02
- **Evidence:** `src/app/components/stock-app/useStockAppBootstrap.ts`, `src/app/components/stock-app/useStockAppBootstrap.test.tsx`
- **Current blocker:** none
- **Next best step:** APP — Live functional QA remediation — Phase 3
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
| APP — Live functional QA remediation — Phase 2 | No setState during render violation when workspace/chart loads or symbol changes (QA-02) | **Passing** | # APP — Live functional QA remediation — Phase 2 evidence; # Date: 2026-07-28; # Scope: QA-02 — move cellLayoutStore sync out of StockApp setState updaters; ## Delivered; - src/app/components/stock-app/useStockAppBootstrap.ts — removed syncCellLayoutStoreFromLayout from setLayout/handleApplyWorkspaceTabs updaters; added useLayoutEffect mirror after hydrate; - src/app/components/stock-app/useStockAppBootstrap.test.tsx — regression test for render-time ChartCell update warning; ## Architecture review; Self-review Passed — cellLayoutStore ownership unchanged; sync timing moved to post-commit layout effect only.; ## Focused; Command:; npm test -- --run src/app/components/stock-app/useStockAppBootstrap.test.tsx src/lib/chart/cellLayoutStore.test.ts; Output:; Test Files  2 passed (2); Tests  5 passed (5); ## App-level; Route: GET /workspace 200; Symbol change: SPYM → AAPL via symbol search (same setLayout path as SPY → AAPL); Browser console capture (CDP addScriptToEvaluateOnNewDocument + reload): chartCellWarnings → []; Dev-server terminal grep after change: no `Cannot update a component (ChartCell) while rendering a different component (StockApp)` line; Closes: QA-02 | src/app/components/stock-app/useStockAppBootstrap.ts,src/app/components/stock-app/useStockAppBootstrap.test.tsx |
| APP — Live functional QA remediation — Phase 1 | Copilot surfaces load without `getServerSnapshot` infinite-loop warnings (QA-01) | **Passing** | # APP — Live functional QA remediation — Phase 1 evidence; # Date: 2026-07-28; # Scope: QA-01 — cache stable empty getServerSnapshot in useResearchEvidence; ## Delivered; - src/app/components/research/useResearchEvidence.ts — EMPTY_EVIDENCE_CARDS + named getServerSnapshot; - src/app/components/research/useResearchEvidence.test.tsx — snapshot stability regression tests; ## Architecture review; Self-review Passed — contained hook fix; no AI registry or persistence contract changes.; ## Focused; Command:; npm test -- --run src/app/components/research/useResearchEvidence.test.tsx; Output:; Test Files  1 passed (1); Tests  3 passed (3); ## App-level; Routes: GET /copilot 200; workspace Copilot sidebar opened via aria-label "Copilot".; Dev-server [browser] logs after reload (terminal 1.txt, 2026-07-28T21:09:39Z session): no `getServerSnapshot should be cached` line; only unrelated image aspect-ratio warning.; Browser console capture (CDP addScriptToEvaluateOnNewDocument + reload): snapshot filter `getServerSnapshot` → [].; Closes: QA-01. | src/app/components/research/useResearchEvidence.ts,src/app/components/research/useResearchEvidence.test.tsx |
| APP — Talk empty composer UX | Talk empty hero: no workflow pills; centered brand + composer; SuperGrok-relative logo; idle rotating placeholder; auto-grow textarea | **Passing** | # APP — Talk empty composer UX evidence; # Date: 2026-07-27; ## Scope; Talk empty-state composer UX: remove workflow pills, center hero cluster, SuperGrok-relative Edge logo sizing, idle rotating placeholder questions, auto-grow textarea.; ## Delivered; - src/app/components/copilot/CopilotPanel.tsx — removed CopilotPromptLibrary footer; - src/app/components/copilot/CopilotShell.tsx — overlay topChrome; copilot-empty-cluster centers brand + composer; - src/app/components/copilot/CopilotEmptyBrand.tsx — wordmark ~55% bar height; gap = one bar height; - src/app/components/copilot/CopilotComposer.tsx — hero idle placeholder rotator (3s), auto-grow textarea, items-end bar; - src/lib/ai/agent/promptLibrary.ts — COPILOT_HERO_DEFAULT_PLACEHOLDER, COPILOT_IDLE_QUESTIONS; - src/app/globals.css — copilot hero placeholder slide animations + reduced-motion; - Deleted src/app/components/copilot/CopilotPromptLibrary.tsx; - Tests updated across copilot panel/shell/composer + promptLibrary; ## Architecture review; Self-review Passed — contained APP surface UX; no AI registry or persistence contract changes.; ## Focused; Command:; npm test -- --run src/app/components/copilot/CopilotComposer.test.tsx src/app/components/copilot/CopilotPanel.test.tsx src/app/components/copilot/CopilotShell.test.tsx src/app/components/copilot/CopilotModuleShell.test.tsx src/lib/ai/agent/promptLibrary.test.ts; Output:; Test Files  5 passed (5); Tests  44 passed (44); ## App-level; Empty /copilot Talk: no workflow pills; brand + bar centered; idle placeholder rotates to workflow questions after 3s; multiline input grows the query bar. | src/app/components/copilot/, src/lib/ai/agent/promptLibrary.ts, src/app/globals.css |
| Sub-harness tree — Phase 0 | Lock target tree, intent→branch router, and security invariant ledger skeleton under docs/harness/; no agent behavior change | **Passing** | # Sub-harness tree — Phase 0 evidence; # Date: 2026-07-27; ## Scope; Docs-only — spec lock for thin parent + routed domain sub-harnesses.; Target tree, router table, security invariant ledger skeleton.; No agent behavior change; no branch packs; no rule or AGENTS.md edits.; ## Delivered; - docs/harness/README.md — topology, seam rules, Plan-mode branch flow, intent→branch router, specialty side doors, non-goals; - docs/harness/security-invariant-ledger.md — SEC-01..SEC-23 stubs (Security + Observability security-adjacent MUSTs); - docs/roadmaps/sub-harness-tree-roadmap.md — Phase 0 Passing; phase summary table; - docs/roadmaps/README.md — Sub-harness row synced; - docs/ROADMAP.md — Near-Term line synced; ## Architecture review; N/A — docs/spec only; no runtime or instruction contract change (Phase 1+).; ## Manual smoke; Tree matches locked decisions: DATA peer present; BRAND side door (not peer); SECURITY laminated (not peer); HARNESS quarantined.; ## App-level; N/A (no runtime change); ## Next; Phase 1 — Branch field in Plan mode (plan-harness-awareness Intent Classification template); ## Focused; Command: npm run lint:instructions; Result: npm run lint:instructions passed — Instruction architecture validation passed.; exit=0; Command: npm run roadmaps:status-check; Result: roadmaps:status-check OK — README table matches track Status lines.; exit=0 | docs/harness/README.md, docs/harness/security-invariant-ledger.md, docs/roadmaps/sub-harness-tree-roadmap.md, docs/roadmaps/README.md, docs/ROADMAP.md, docs/evidence/sub-harness-tree-phase-0.txt, docs/PROJECT-STATUS.md |
| Sub-harness tree — Phase 1 | Wire Branch: into Plan-mode Intent Classification; execute reads Branch from approved plan | **Passing** | # Sub-harness tree — Phase 1 evidence; # Date: 2026-07-27; ## Scope; Instruction contract only — wire Branch: into Plan-mode Intent Classification; execute reads Branch from approved plan.; No branch packs; no AGENTS.md trim; no runtime change.; ## Delivered; - .cursor/rules/plan-harness-awareness.mdc — Branch: first bullet in Intent Classification template; classify after Plan vs Execute; no pack load until Phase 2; - .cursor/rules/plan-execute-routing.mdc — Plan turns classify Branch before deep topic loads; - docs/checklists/planning-router.md — Branch classify pointer; template + compact example updated; - .cursor/rules/execute-from-plan.mdc — read Branch from plan; no re-classify unless wrong/incomplete; - docs/checklists/execute-from-plan-checklist.md — Pre-Execute + Gate Branch notes; - docs/harness/README.md — Phase 1 live on classify step; pack load still Phase 2; - docs/roadmaps/sub-harness-tree-roadmap.md — Phase 1 Passing; - docs/roadmaps/README.md — Sub-harness row synced; - docs/ROADMAP.md — Near-Term line synced; ## Architecture review; Self-review Passed — instruction contract change only; emit/read Branch without pack loads; BRAND excluded from enum (side door).; ## Manual smoke; - This phase plan: Branch: HARNESS (secondary: none) — harness rules/checklists/steward work; - Router example: chart drawing/indicator → Branch: ENGINE; - Router example: container deploy/rollback → Branch: OPS; Template language usable without loading docs/harness/branches/*.; ## App-level; N/A (no runtime change); ## Next; Phase 2 — Branch packs under docs/harness/branches/; ## Focused; Command: npm run lint:instructions; Result: npm run lint:instructions passed — Instruction architecture validation passed.; exit=0; Command: npm run roadmaps:status-check; Result: roadmaps:status-check OK — README table matches track Status lines.; exit=0 | .cursor/rules/plan-harness-awareness.mdc,.cursor/rules/plan-execute-routing.mdc,.cursor/rules/execute-from-plan.mdc,docs/checklists/planning-router.md,docs/checklists/execute-from-plan-checklist.md,docs/harness/README.md,docs/roadmaps/sub-harness-tree-roadmap.md,docs/roadmaps/README.md,docs/ROADMAP.md,docs/evidence/sub-harness-tree-phase-1.txt |
| Sub-harness tree — Phase 2 | Branch packs under docs/harness/branches/; Plan loads primary pack after Branch:; execute prefers pack Sensors | **Passing** | # Sub-harness tree — Phase 2 evidence; # Date: 2026-07-27; ## Scope; Branch packs under docs/harness/branches/; Plan mode loads primary pack after Branch:; execute prefers pack Sensors.; No AGENTS.md trim; no ledger fill; no runtime change.; ## Delivered; - docs/harness/branches/ENGINE.md — 45 lines; - docs/harness/branches/DATA.md — 47 lines; - docs/harness/branches/LIVE.md — 48 lines; - docs/harness/branches/AGENT.md — 42 lines; - docs/harness/branches/APP.md — 48 lines; - docs/harness/branches/OPS.md — 53 lines; - docs/harness/branches/HARNESS.md — 44 lines; - .cursor/rules/plan-harness-awareness.mdc — Read primary pack after Branch:; no unrelated lane packs; - .cursor/rules/execute-from-plan.mdc — Read pack; prefer Sensors for focused verify; - docs/checklists/execute-from-plan-checklist.md — Pre-Execute pack Read + Sensors note; - docs/harness/README.md — Phase 2 live; branch pack index table; BRAND side door only; - docs/roadmaps/sub-harness-tree-roadmap.md — Phase 2 Passing; - docs/roadmaps/README.md — Sub-harness row synced; - docs/ROADMAP.md — Near-Term line synced; ## Architecture review; Self-review — instruction contract change; seven packs ≤80 lines; link-only CONSTRAINTS; security pins stub ids until Phase 4.; ## Spot-check; - All seven packs exist; max line count 53 (OPS.md); no full CONSTRAINTS paste; - Pack links resolve to real ARCHITECTURE.md paths and skills; - BRAND has no peer pack file (README side door only); ## Manual smoke; - This execute session: Branch HARNESS → HARNESS.md is first domain doc after classification; - DATA, LIVE, OPS packs exist for Plan-mode load per router examples; - plan-harness language requires Read docs/harness/branches/<PRIMARY>.md before architecture deep-dives; ## App-level; N/A (no runtime change); ## Next; Phase 3 — Thin parent (AGENTS.md trim); ## Focused; Command: npm run lint:instructions; Result: npm run lint:instructions passed — Instruction architecture validation passed.; exit=0; Command: npm run roadmaps:status-check; Result: roadmaps:status-check OK — README table matches track Status lines.; exit=0 | docs/harness/branches/, .cursor/rules/plan-harness-awareness.mdc, .cursor/rules/execute-from-plan.mdc, docs/checklists/execute-from-plan-checklist.md, docs/harness/README.md, docs/roadmaps/sub-harness-tree-roadmap.md, docs/roadmaps/README.md, docs/ROADMAP.md, docs/evidence/sub-harness-tree-phase-2.txt |
| Sub-harness tree — Phase 3 | Thin parent — AGENTS.md Branch routing fans out through harness router + branch packs | **Passing** | # Sub-harness tree — Phase 3 evidence; # Date: 2026-07-27; ## Scope; Thin parent — AGENTS.md sheds Key Docs encyclopedia; Branch routing fans out through harness router + branch packs.; No ledger fill; no runtime change; no Phase 5 specialty cutover.; ## Delivered; - AGENTS.md — 120 lines (≤150); Key Docs table replaced with Branch routing section; Session Continuity + Doc Maintenance collapsed into Session Exit; OPS/BRAND/HARNESS specialty pointers in Instruction Hygiene; - scripts/validate-agent-instructions.mts — required link docs/harness/README.md; error message updated for Branch routing section; - docs/harness/README.md — Phase 3 live; parent fan-out step in Plan-mode flow; - docs/roadmaps/sub-harness-tree-roadmap.md — Phase 3 Passing; - docs/roadmaps/README.md — Sub-harness row synced; - docs/ROADMAP.md — Near-Term line synced; ## Architecture review; Self-review — instruction contract change; parent routes via Branch routing; packs specialize; CONSTRAINTS not restated.; ## Manual diff check; - Init commands (setup, check:startup, dev) present; - WIP=1 and Definition of Done intact; - Layering gate (lint:app-lib-boundaries) intact; - Secrets rule (never commit .env.local) intact; - Branch routing: AGENTS.md → docs/harness/README.md → docs/harness/branches/<LANE>.md → ARCHITECTURE.md; ## App-level; N/A (no runtime change); ## Next; Phase 4 — Security ledger + sensors; ## Focused; Command: npm run lint:instructions; Result: npm run lint:instructions passed — Instruction architecture validation passed.; exit=0; Command: npm run roadmaps:status-check; Result: roadmaps:status-check OK — README table matches track Status lines.; exit=0 | AGENTS.md, scripts/validate-agent-instructions.mts, docs/harness/README.md, docs/roadmaps/sub-harness-tree-roadmap.md, docs/roadmaps/README.md, docs/ROADMAP.md, docs/evidence/sub-harness-tree-phase-3.txt |
| Sub-harness tree — Phase 4 | Fill security invariant ledger SEC-01..SEC-23; sync pack Security pins; document SECURITY campaign mode; add lint:harness-ledger gate | **Passing** | # Sub-harness tree — Phase 4 evidence; # Date: 2026-07-27; ## Scope; Security ledger + sensors — fill SEC-01..SEC-23 owners and pinning tests; sync pack Security pins; document SECURITY campaign mode; add lint:harness-ledger gate.; No runtime change; no Phase 5 specialty cutover.; ## Delivered; - docs/harness/security-invariant-ledger.md — SEC-01..SEC-23 filled (owning lane + pin path + status pinned); - docs/harness/branches/*.md — Security pins footers point to ledger (Phase 4 stub text removed); - docs/harness/README.md — Phase 4 live; SECURITY campaign protocol documented; - scripts/validate-harness-ledger.mts — SEC-01..SEC-23 completeness gate; - scripts/validate-agent-instructions.mts — calls validateHarnessLedger; - package.json — lint:harness-ledger script; - docs/roadmaps/sub-harness-tree-roadmap.md — Phase 4 Passing; - docs/roadmaps/README.md — Sub-harness row synced; - docs/ROADMAP.md — Near-Term line synced; ## Architecture review; Self-review — instruction contract change; ledger ownership matches Phase 2 pack assignments; CONSTRAINTS not restated.; ## Manual spot-check; - LIVE owns SEC-12 (tradingMutateAuth), SEC-17 (sidecarAuth); - AGENT owns SEC-06 (parseExecuteBody), SEC-11 (session.routes), SEC-20 (promptBoundaries); - OPS owns SEC-04 (apiAuth), SEC-22 (redactDiagnostic), SEC-23 (healthz/readyz); - Ledger rows cover CONSTRAINTS Security + Observability MUSTs (SEC-01..SEC-23); ## App-level; N/A (no runtime change); ## Next; Phase 5 — Router enforcement + specialty cutover; ## Focused; Command: npm run lint:harness-ledger; Result: npm run lint:harness-ledger passed — Harness ledger validation passed.; exit=0; Command: npm run lint:instructions; Result: npm run lint:instructions passed — Instruction architecture validation passed.; exit=0; Command: npm run roadmaps:status-check; Result: roadmaps:status-check OK — README table matches track Status lines.; exit=0 | docs/harness/security-invariant-ledger.md,docs/harness/README.md,docs/harness/branches/,scripts/validate-harness-ledger.mts,scripts/validate-agent-instructions.mts,package.json,docs/roadmaps/sub-harness-tree-roadmap.md,docs/roadmaps/README.md,docs/ROADMAP.md,docs/evidence/sub-harness-tree-phase-4.txt |
| Sub-harness tree — Phase 5 | Router enforcement + specialty cutover — OPS-forced deploy; BRAND side door; HARNESS quarantine; soft branch-prefixed Active Work | **Passing** | # Sub-harness tree — Phase 5 evidence; # Date: 2026-07-27; ## Scope; Router enforcement + specialty cutover — OPS-forced deploy entry; BRAND visual side door; HARNESS quarantine in steward; soft branch-prefixed Active Work preference.; No runtime change; no fail-closed Branch lint (YAGNI).; ## Delivered; - .cursor/rules/deploy-local-prod.mdc — OPS-forced entry; Branch: OPS + OPS.md pack pointer; - .cursor/skills/deploy-local-prod/SKILL.md — OPS specialty entry block; - .cursor/rules/visual-assets.mdc — BRAND side door pointer; - .cursor/skills/visual-assets/SKILL.md — BRAND side door pointer; - .cursor/skills/visual-production/SKILL.md — BRAND side door pointer; - .cursor/rules/harness-steward.mdc — HARNESS quarantine section; - docs/checklists/harness-status-checklist.md — quarantine line in WIP section; - docs/harness/README.md — Phase 5 live; router-owned side doors; Active Work naming; router matrix; - docs/harness/branches/HARNESS.md — closeout note for branch-prefixed Active Work; - docs/roadmaps/sub-harness-tree-roadmap.md — Phase 5 Passing; track complete; - docs/roadmaps/README.md — Sub-harness row synced; - docs/ROADMAP.md — Near-Term line synced; ## Architecture review; Self-review — instruction cutover only; specialty doors aligned with branch router; no CONSTRAINTS restatement.; ## Manual router matrix; - /deploy-prod → OPS (deploy-local-prod rule/skill + OPS.md); - Chart plan → ENGINE (router table + ENGINE.md); - Order isolation → LIVE (router table + LIVE.md); - Market-data freshness → DATA (router table + DATA.md); - Harness rule edit → HARNESS only (steward quarantine + HARNESS pack); - Landing visuals → BRAND side door (visual-assets/visual-production skills); ## App-level; N/A (no runtime change); ## Focused; Command: npm run lint:instructions; Result: npm run lint:instructions passed — Instruction architecture validation passed.; exit=0; Command: npm run lint:harness-ledger; Result: npm run lint:harness-ledger passed — Harness ledger validation passed.; exit=0 | .cursor/rules/deploy-local-prod.mdc,.cursor/skills/deploy-local-prod/SKILL.md,.cursor/rules/visual-assets.mdc,.cursor/skills/visual-assets/SKILL.md,.cursor/skills/visual-production/SKILL.md,.cursor/rules/harness-steward.mdc,docs/checklists/harness-status-checklist.md,docs/harness/README.md,docs/harness/branches/HARNESS.md,docs/roadmaps/sub-harness-tree-roadmap.md,docs/roadmaps/README.md,docs/ROADMAP.md,docs/evidence/sub-harness-tree-phase-5.txt |
| Shared sidecar paper/live isolation | Dev (:3003) paper-only and container prod (:3000) live-only share one host TWS sidecar + dual IB Gateways via server env lock and external control-only recover | **Passing** | Test Files 10 passed (10); Tests 127 passed (127); sidecar Ran 55 tests OK; app-level deferred (requires TWS + locks in env) | `src/lib/trading/validateOrder.ts`, `src/lib/trading/tradingService.ts`, `src/lib/marketData/providers/tws/{managedMode,recover,client}.ts`, `scripts/validate-local-deploy.mts`, `scripts/verify-local-environments.mts`, `src/app/components/AccountProvider.tsx`, `.env.example`, `docs/evidence/shared-sidecar-paper-live-isolation.txt` |

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

- **2026-07-24 — Code organization Phase 3 Passing:** Feature folders (chart-cell/chrome/drawing/stock-app/object-tree); root 87→37; focused 188; build OK; evidence `docs/evidence/code-org-phase-3.txt`.
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
