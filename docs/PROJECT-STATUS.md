# Project Status

Single source for **current** progress. Historical harness dumps: [status-archive/](./status-archive/). For row-by-row feature detail, see [chart/features.md](./chart/features.md).

**Last updated:** 2026-07-30

## Current Verified State

- **Current task:** LIVE — Risk management system — Phase 1.
- **State:** **Passing** — LIVE — Risk management system — Phase 1 closeout via harness:closeout
- **Latest verification:** # LIVE — Risk management system — Phase 1 evidence; # Date: 2026-07-30; ## Scope; Docs + developer completeness map — RiskPolicy architecture spine and vocabulary sync.; No runtime RiskPolicy Zod type; no end-user chrome.; ## Delivered; - src/lib/trading/ARCHITECTURE.md — RiskPolicy spine (slot→module map, ExitRule bridge, hybrid failure mode); - src/lib/risk/ARCHITECTURE.md — Plan Budget/Sizing/Geometry bind note; - src/lib/trading/playbook/presetRiskPolicy.ts — 12-question completeness for all five presets; - src/lib/trading/playbook/presets.test.ts — completeness regression test; - docs/roadmaps/risk-management-system-roadmap.md — Phase 1 Passing; - docs/roadmaps/README.md, docs/ROADMAP.md — index sync; ## Architecture review; Self-review Passed — spine links modules without parallel runtime types; PlaybookTemplateSchema unchanged; CONFLICT_POLICY cited for hybrid failure mode; SEC pins untouched.; ## Focused; Command:; npm test -- --run src/lib/trading/playbook/presets.test.ts; Output:; Test Files  1 passed (1); Tests  6 passed (6); ## Doc gate; - All five PLAYBOOK_PRESET_IDS have 12-key PLAYBOOK_PRESET_RISK_POLICY entries; - Hybrid failure mode documented in trading ARCHITECTURE (detachKeepsProtectOrders, hybridProtectAtBroker); - Plan layer failure note in risk ARCHITECTURE; App-level: N/A — no end-user behavior.
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
| LIVE — Risk management system — Phase 0 | Freeze RiskPolicy schema, catalog filing, plug-in map, and UX-moment phase map as docs SoT | **Passing** | # LIVE — Risk management system — Phase 0 evidence; # Date: 2026-07-29; ## Scope; Docs-only — freeze RiskPolicy schema, catalog filing, plug-in map, UX-moment phase map as source of truth.; No runtime code; no Zod/types.; ## Delivered; - docs/roadmaps/risk-management-system-roadmap.md — Phase 0 Passing; 0.3 wording tightened (family→slot filing; Phase 1 for per-preset checklists); - docs/roadmaps/trading-execution-roadmap.md — Related + Protect pointer to Risk Management System; - docs/roadmaps/alerts-roadmap.md — Related (notifyOnly ExitRules); - docs/roadmaps/journal-roadmap.md — Related (Measurement / Phase 8); - docs/roadmaps/ai-agent-roadmap.md — Related (Phase 9 RiskPolicy vocabulary); - docs/roadmaps/README.md — Phase 0 Passing row synced; - docs/ROADMAP.md — Near-Term + index lines synced; ## Doc review (0.1–0.7); - 0.1 RiskPolicy slots + ExitRule / trigger / action taxonomies — present; - 0.2 Completeness checklist (12 questions) — present; - 0.3 Catalog family→slot + exit families — present; cell-by-cell deferred to Phase 1 (1.3); - 0.4 Application plug-in map + slot coverage gaps — present; - 0.5 UX moments → phases (2–10) — present (9 moments mapped); - 0.6 Cross-links — playbook (pre-existing) + exec/alerts/journal/AI + ROADMAP index; - 0.7 Appendices A–B worked examples — present; - Naming: Plan / Protect / Manage consistent; - No claim day-loss / open-heat account Gates are shipped (Phase 10 target only); - Open questions #1–4 remain open (Phases 3/4/10); ## Architecture review; N/A — docs/spec only; Phase 1 owns ARCHITECTURE.md spine.; App-level: N/A — doc review verified 9 UX moments map to phases 2–10; 6 Related links; 12-question checklist frozen.; ## Focused; Command: npm run roadmaps:status-check; Output: roadmaps:status-check found 1 issue(s): copilot-chat-blocks README drift (pre-existing); risk-management row matches Phase 0 Passing.; exit=1; Command: npm run lint:instructions; Output: 2 pre-existing PROJECT-STATUS issues; no instruction files changed in this phase.; exit=1 | docs/roadmaps/risk-management-system-roadmap.md,docs/roadmaps/trading-execution-roadmap.md,docs/roadmaps/alerts-roadmap.md,docs/roadmaps/journal-roadmap.md,docs/roadmaps/ai-agent-roadmap.md,docs/roadmaps/README.md,docs/ROADMAP.md,docs/evidence/risk-management-phase-0-2026-07-29.txt |
| LIVE — Risk management system — Phase 1 | Developer-facing RiskPolicy spine: architecture docs + preset completeness map; no end-user chrome | **Passing** | # LIVE — Risk management system — Phase 1 evidence; # Date: 2026-07-30; ## Scope; Docs + developer completeness map — RiskPolicy architecture spine and vocabulary sync.; No runtime RiskPolicy Zod type; no end-user chrome.; ## Delivered; - src/lib/trading/ARCHITECTURE.md — RiskPolicy spine (slot→module map, ExitRule bridge, hybrid failure mode); - src/lib/risk/ARCHITECTURE.md — Plan Budget/Sizing/Geometry bind note; - src/lib/trading/playbook/presetRiskPolicy.ts — 12-question completeness for all five presets; - src/lib/trading/playbook/presets.test.ts — completeness regression test; - docs/roadmaps/risk-management-system-roadmap.md — Phase 1 Passing; - docs/roadmaps/README.md, docs/ROADMAP.md — index sync; ## Architecture review; Self-review Passed — spine links modules without parallel runtime types; PlaybookTemplateSchema unchanged; CONFLICT_POLICY cited for hybrid failure mode; SEC pins untouched.; ## Focused; Command:; npm test -- --run src/lib/trading/playbook/presets.test.ts; Output:; Test Files  1 passed (1); Tests  6 passed (6); ## Doc gate; - All five PLAYBOOK_PRESET_IDS have 12-key PLAYBOOK_PRESET_RISK_POLICY entries; - Hybrid failure mode documented in trading ARCHITECTURE (detachKeepsProtectOrders, hybridProtectAtBroker); - Plan layer failure note in risk ARCHITECTURE; App-level: N/A — no end-user behavior. | src/lib/trading/ARCHITECTURE.md,src/lib/risk/ARCHITECTURE.md,src/lib/trading/playbook/presetRiskPolicy.ts,src/lib/trading/playbook/presets.test.ts,docs/roadmaps/risk-management-system-roadmap.md,docs/roadmaps/README.md,docs/ROADMAP.md |
| AGENT — Copilot chat blocks — Phase 5 | Enrich Action confirms with summaryRows for order/playbook/drawing/chart-prep gates | **Passing** | # AGENT — Copilot chat blocks — Phase 5 evidence; # Date: 2026-07-29; # Scope: Enrich Action payloads with summaryRows for trading / annotation confirms; ## Delivered; - src/lib/copilot/chatBlocks.ts — optional summaryRows on Action blocks (max 12 kv rows); - src/lib/copilot/chatBlockMapping.ts — actionSummaryRowsFromStep + toolStepToActionBlock enrichment; - src/app/components/copilot/CopilotActionBlock.tsx — compact summary row list under confirm reason; - src/app/components/copilot/CopilotActionBlock.test.tsx — summaryRows render; - src/lib/copilot/chatBlocks.test.ts — action summaryRows round-trip; - src/lib/copilot/chatBlockMapping.test.ts — place_order, attach_playbook, delete_drawing, prepare_chart; - src/lib/ai/ARCHITECTURE.md — Phase 5 section; - docs/roadmaps/copilot-chat-blocks-roadmap.md — Phase 5 Passing; ## Architecture review; Self-review Passed — no NDJSON stream union change; blocks in-memory only; SEC-06 Accept path and SEC-20 prompt isolation untouched; proposed AI drawing Accept stays on chart toolbar.; ## Focused; Command:; npm test -- --run src/lib/copilot/chatBlocks.test.ts src/lib/copilot/chatBlockMapping.test.ts src/app/components/copilot/CopilotActionBlock.test.tsx src/app/components/copilot/CopilotMessageBubble.test.tsx src/app/components/copilot/CopilotMessageList.test.tsx; Output:; Test Files  5 passed (5); Tests  69 passed (69); ## App-level; Behaviors verified (component + mapper integration tests):; - place_order confirm-gated step shows draft summaryRows (Symbol, Side, Qty, Type, Limit, TIF, Environment); - delete_drawing confirm shows Drawing ID + Cell rows; - attach_playbook and prepare_chart_for_analysis row mapping covered; - Accept/Reject testids and confirmationToken wiring unchanged; - No in-chat Accept added for proposed add_drawing annotations | src/lib/copilot/chatBlocks.ts,src/lib/copilot/chatBlockMapping.ts,src/app/components/copilot/CopilotActionBlock.tsx,src/lib/ai/ARCHITECTURE.md,docs/roadmaps/copilot-chat-blocks-roadmap.md |
| AGENT — Copilot chat blocks — Phase 4 | Follow-up chips under latest completed assistant turn; curated workflow prompts send via normal chat path | **Passing** | # AGENT — Copilot chat blocks — Phase 4 evidence; # Date: 2026-07-29; # Scope: Follow-up chips under latest completed assistant turn; curated workflow prompts; ## Delivered; - src/lib/copilot/chatBlocks.ts — optional label on follow-up chips; - src/lib/copilot/chatBlockMapping.ts — workflowPromptsToFollowupsBlock; - src/app/components/copilot/CopilotFollowupsBlock.tsx — chip row + onSelect(prompt); - src/app/components/copilot/CopilotFollowupsBlock.test.tsx — select, label, disabled; - src/app/components/copilot/CopilotMessageBubble.tsx — follow-ups under turn when showFollowups; - src/app/components/copilot/CopilotMessageList.tsx — latest-turn placement; hide stream/confirm; - src/app/components/copilot/CopilotPanel.tsx — handleSelectFollowup → handleSend + snapshot; - src/lib/ai/ARCHITECTURE.md — Phase 4 section; Phase 8 follow-up placement note; - docs/roadmaps/copilot-chat-blocks-roadmap.md — Phase 4 Passing; ## Architecture review; Self-review Passed — no NDJSON stream union change; blocks in-memory only; SEC-06/SEC-20 untouched.; ## Focused; Command:; npm test -- --run src/lib/copilot/chatBlocks.test.ts src/lib/copilot/chatBlockMapping.test.ts src/app/components/copilot/CopilotFollowupsBlock.test.tsx src/app/components/copilot/CopilotMessageBubble.test.tsx src/app/components/copilot/CopilotMessageList.test.tsx src/app/components/copilot/CopilotPanel.test.tsx; Output:; Test Files  6 passed (6); Tests  82 passed (82); ## App-level; Behaviors verified (component + list + panel integration tests):; - Follow-up chips render under latest completed assistant turn only; - Chip click calls onSelectFollowup with full workflow prompt text; - Chips hidden while streaming or awaiting confirm gate; - Empty Talk state has no workflow pills (CopilotPanel.test) | src/lib/copilot/chatBlocks.ts,src/lib/copilot/chatBlockMapping.ts,src/app/components/copilot/CopilotFollowupsBlock.tsx,src/app/components/copilot/CopilotMessageList.tsx,src/app/components/copilot/CopilotPanel.tsx |
| AGENT — Copilot chat blocks — Phase 3 | Reference chips under assistant turns for chart/tool deep links; overflow collapse | **Passing** | # AGENT — Copilot chat blocks — Phase 3 evidence; # Date: 2026-07-29; # Scope: Reference chips under assistant turns; chart hint + reference tool emission; ## Delivered; - src/lib/copilot/chatBlockMapping.ts — toolStepsToReferenceBlock, referenceTargetHref, chartOpenHref export; - src/app/components/copilot/CopilotReferenceBlock.tsx — compact chip row + overflow expand; - src/app/components/copilot/CopilotReferenceBlock.test.tsx — open, href, overflow; - src/app/components/copilot/CopilotMessageBubble.tsx — reference block under turn; - src/app/components/copilot/CopilotMessageBubble.test.tsx — chart turn chip click; - src/lib/ai/ARCHITECTURE.md — Phase 3 section; - docs/roadmaps/copilot-chat-blocks-roadmap.md — Phase 3 Passing; ## Architecture review; Self-review Passed — no NDJSON stream union change; blocks in-memory only; SEC-06/SEC-20 untouched.; ## Focused; Command:; npm test -- --run src/lib/copilot/chatBlockMapping.test.ts src/lib/copilot/chatBlocks.test.ts src/app/components/copilot/CopilotReferenceBlock.test.tsx src/app/components/copilot/CopilotMessageBubble.test.tsx; Output:; Test Files  4 passed (4); Tests  41 passed (41); ## App-level; Behaviors verified (component + bubble integration tests):; - Chart artifact turn shows CopilotReferenceBlock chip row (no Context card); - Chip click calls onOpenHref with /chart?symbol=&interval=; - Media block + reference chip coexist on chart tool turns; - Overflow +N expands hidden chips (CopilotReferenceBlock.test) | src/lib/copilot/chatBlockMapping.ts,src/app/components/copilot/CopilotReferenceBlock.tsx,src/app/components/copilot/CopilotReferenceBlock.test.tsx,src/app/components/copilot/CopilotMessageBubble.tsx |
| AGENT — Copilot chat blocks — Phase 2 | Generic Media + Data shells for chart/screener/journal hints and user attachments; Pin/Open preserved | **Passing** | # AGENT — Copilot chat blocks — Phase 2 evidence; # Date: 2026-07-29; # Scope: Generic Media + Data block shells; hint bridge; user attachment reuse; ## Delivered; - src/lib/copilot/chatBlocks.ts — optional media src/mimeType; pinHint + openHref on media; - src/lib/copilot/chatBlockMapping.ts — chart→Media; attachment/tool mappers; - src/app/components/copilot/CopilotDataBlock.tsx — kv/table shell + Pin/Open; - src/app/components/copilot/CopilotMediaBlock.tsx — image/caption shell + Pin/Open; - src/app/components/copilot/CopilotMessageBubble.tsx — attachments + artifact hints via shells; - src/lib/ai/ARCHITECTURE.md — Phase 2 section; - docs/roadmaps/copilot-chat-blocks-roadmap.md — Phase 2 Passing; ## Architecture review; Self-review Passed — no NDJSON stream union change; blocks in-memory only; SEC-06/SEC-20 untouched.; ## Focused; Command:; npm test -- --run src/lib/copilot/chatBlocks.test.ts src/lib/copilot/chatBlockMapping.test.ts src/app/components/copilot/CopilotDataBlock.test.tsx src/app/components/copilot/CopilotMediaBlock.test.tsx src/app/components/copilot/CopilotMessageBubble.test.tsx src/app/components/copilot/CopilotMessageList.test.tsx; Output:; Test Files  6 passed (6); Tests  53 passed (53); ## App-level; User attachment → Media; screener/journal → Data kv + Pin; chart → Media caption + Open + Pin | src/lib/copilot/chatBlocks.ts,src/lib/copilot/chatBlockMapping.ts,src/app/components/copilot/CopilotDataBlock.tsx,src/app/components/copilot/CopilotMediaBlock.tsx,src/app/components/copilot/CopilotMessageBubble.tsx,src/lib/ai/ARCHITECTURE.md,docs/roadmaps/copilot-chat-blocks-roadmap.md |
| AGENT — Copilot chat blocks — Phase 1 | Stick-to-bottom scroll verified when unpinned; confirm Accept/Reject via shared Action shell | **Passing** | # AGENT — Copilot chat blocks — Phase 1 evidence; # Date: 2026-07-29; # Scope: Stick-to-bottom scroll verification + shared Action shell for confirm Accept/Reject; ## Delivered; - src/lib/copilot/chatBlockMapping.ts — toolStepToActionBlock mapper; - src/app/components/copilot/CopilotActionBlock.tsx — shared Action shell; - src/app/components/copilot/CopilotMessageBubble.tsx — confirm steps render via CopilotActionBlock; - src/app/components/copilot/CopilotMessageList.test.tsx — unpinned stream no-yank regression; - src/lib/ai/ARCHITECTURE.md — Phase 1 section; - docs/roadmaps/copilot-chat-blocks-roadmap.md — Phase 1 Passing; ## Architecture review; Self-review Passed — no NDJSON stream union change; blocks in-memory only; SEC-06 Accept path and SEC-20 prompt isolation untouched.; ## Focused; Command:; npm test -- --run src/lib/copilot/chatBlockMapping.test.ts src/app/components/copilot/CopilotActionBlock.test.tsx src/app/components/copilot/CopilotMessageList.test.tsx; Output:; Test Files  3 passed (3); Tests  31 passed (31); ## App-level; Routes: GET /copilot 200 (dev server http://localhost:3003); Behaviors verified:; - Send message → viewport follows stream when near bottom; - Scroll up during stream → scroll-to-bottom control visible; scrollTop unchanged on content growth; - Confirm gate → Accept/Reject buttons present (copilot-confirm-accept-* testids preserved); - Jump-to-latest re-pins and hides scroll-to-bottom control | src/lib/copilot/chatBlockMapping.ts,src/app/components/copilot/CopilotActionBlock.tsx,src/app/components/copilot/CopilotMessageBubble.tsx,src/app/components/copilot/CopilotMessageList.test.tsx,src/lib/ai/ARCHITECTURE.md,docs/roadmaps/copilot-chat-blocks-roadmap.md |
| AGENT — Copilot chat blocks — Phase 0 | Freeze in-thread block taxonomy (Trace/Media/Data/Action/Reference/Follow-ups) as Zod contracts + mapping helpers; no user-visible UI change | **Passing** | # AGENT — Copilot chat blocks — Phase 0 evidence; # Date: 2026-07-29; # Scope: Freeze in-thread block taxonomy as Zod contracts, mapping helpers, scroll policy; ## Delivered; - src/lib/copilot/chatBlocks.ts — discriminated union (trace/media/data/action/reference/followups); - src/lib/copilot/chatBlockMapping.ts — hint/tool → block kind mapping; - src/lib/copilot/chatScrollPolicy.ts — NEAR_BOTTOM_THRESHOLD_PX + isNearBottom; - src/app/components/copilot/CopilotMessageList.tsx — imports scroll policy helper; - src/lib/ai/ARCHITECTURE.md — Copilot chat blocks Phase 0 section; - docs/roadmaps/copilot-chat-blocks-roadmap.md — Phase 0 Passing; ## Architecture review; Self-review Passed — no stream union change; blocks in-memory only; SEC-06/SEC-20 untouched.; ## Focused; Command:; npm test -- --run src/lib/copilot/chatBlocks.test.ts src/lib/copilot/chatBlockMapping.test.ts src/lib/copilot/chatScrollPolicy.test.ts src/app/components/copilot/CopilotMessageList.test.tsx; Output:; Test Files  4 passed (4); Tests  37 passed (37) | src/lib/copilot/chatBlocks.ts,src/lib/copilot/chatBlockMapping.ts,src/lib/copilot/chatScrollPolicy.ts,src/app/components/copilot/CopilotMessageList.tsx,src/lib/ai/ARCHITECTURE.md,docs/roadmaps/copilot-chat-blocks-roadmap.md |
| APP — Copilot history nav parity | Grok-style left nav on `/copilot` + tile: expandable history rail, Search modal, Yesterday/Earlier groups, See all | **Passing** | # APP — Copilot history nav parity evidence; # Date: 2026-07-29; ## Scope; Grok-style Copilot left nav on `/copilot` + tile: always-on expandable history rail, Search modal, Yesterday/Earlier groups, See all, rename/delete overflow menu.; ## Delivered; - src/app/components/copilot/CopilotShell.tsx — empty layout accepts history slot beside hero cluster; - src/app/components/copilot/CopilotHistoryRail.tsx — search row, grouped history, collapse persistence, overflow menu; - src/app/components/copilot/CopilotHistorySearchModal.tsx — title + local message-body search with preview pane; - src/app/components/copilot/CopilotPanel.tsx — always-on page/tile rail, search modal wiring, rename-from-rail; - src/lib/copilot/groupCopilotThreadsByRecency.ts — Today/Yesterday/Earlier grouping + visible limit; - src/lib/copilot/searchCopilotThreads.ts — local full-text search + relative time formatting; - Tests updated/added across rail, modal, panel, shell, lib helpers; ## Architecture review; Self-review Passed — contained APP Copilot chrome; no AI registry or persistence contract changes.; ## Focused; Command:; npm test -- --run src/app/components/copilot/CopilotHistoryRail.test.tsx src/app/components/copilot/CopilotHistorySearchModal.test.tsx src/app/components/copilot/CopilotPanel.test.tsx src/app/components/copilot/CopilotShell.test.tsx src/lib/copilot/groupCopilotThreadsByRecency.test.ts src/lib/copilot/searchCopilotThreads.test.ts; Output:; Test Files  6 passed (6); Tests  42 passed (42); ## App-level; Route: GET /copilot — empty Talk shows left history rail with Search, New chat, History groups, See all; Search opens modal with filter + preview; selecting a thread loads it in main pane; collapse/expand persists; workspace sidebar still uses thread select (no rail). | src/app/components/copilot/CopilotHistoryRail.tsx,src/app/components/copilot/CopilotHistorySearchModal.tsx,src/app/components/copilot/CopilotPanel.tsx,src/app/components/copilot/CopilotShell.tsx,src/lib/copilot/groupCopilotThreadsByRecency.ts,src/lib/copilot/searchCopilotThreads.ts |
| APP — Live functional QA remediation — Phase 8 | Wave 3 regression pass confirms P1 closed; Copilot empty hero; screener warning when FMP down | **Passing** | # APP — Live functional QA remediation — Phase 8 (Wave 3) evidence; # Date: 2026-07-29; # Environment: local dev http://localhost:3003 (npm run dev); # Scope: Wave 3 regression pass — routes, trader loop, Copilot, screener/journal/research, broker calm; ## Wave 3 discovery fix (screener run); During 8.4 first pass, screener Run triggered `Maximum update depth exceeded` in DataHealthProvider; (`useRegisterScreenerHealthDemand` used `Date.now()` for `meta.lastUpdateAt` every render).; Fixed in:; - src/app/components/data-health/useDatasetHealthRegistration.ts — stable screener meta via useMemo + asOf; - src/app/components/data-health/DataHealthProvider.tsx — skip redundant demand-dataset setState; - src/lib/marketData/healthDatasets.ts — areDemandDatasetInputsEqual helper; - Tests: healthDatasets.test.ts, useDatasetHealthRegistration.test.tsx; ## Focused; Command:; npm test -- --run src/app/components/research/useResearchEvidence.test.tsx src/app/components/stock-app/useStockAppBootstrap.test.tsx src/lib/persistence/sync/useWorkspaceTabsRemoteSync.test.ts src/app/components/AccountProvider.test.tsx src/lib/screener/providerWarnings.test.ts src/app/components/MarketDataProvider.test.tsx src/app/components/stock-app/useStockAppLayoutController.test.tsx src/lib/marketData/healthDatasets.test.ts src/app/components/data-health/useDatasetHealthRegistration.test.tsx; Output:; Test Files  9 passed (9); Tests  37 passed (37); ## 8.1 Route smoke (HTTP); All primary routes returned 200:; / /home /workspace /chart /copilot /research /journal /journal/dashboard /journal/trades /journal/open /journal/settings /screener /screener/screens /screener/results /screener/review /screener/keepers; No white-screen on route GET probes.; ## 8.2 Trader loop (/workspace); - GET /workspace 200; chart-grid + chart-header-instrument-cluster present; - Title: TSLA persisted from prior session; Indicator settings control present (MA from persistence); - Console filters after load: getServerSnapshot → []; ChartCell-during-render → []; - chart-workspaces: PUT to rebound id 74947dcc-… (no stale 709905f3 404 storm); ## 8.3 Copilot (closes QA-11); Route: GET /copilot 200; - No getServerSnapshot warning in browser console capture; - Click New Chat (aria-label) → data-testid="copilot-empty-brand" visible (data-brand-variant="full"); - Composer present; workflowPills=0; ## 8.4 Screener / journal / research; Research: GET /research 200 — Board tab, "No sessions yet", session rail loads; Journal: GET /journal/dashboard 200 (tile route smoke); Screener (post-fix):; - FMP still suspended: GET /api/market-data/fmp/movers → meta.warnings FMP 403 Account suspended; - Workspace screener: Gainers today → Run → no crash; - data-testid=screener-provider-restriction-banner visible (FMP 403 suspended text); - data-testid=screener-results-empty-restriction title "Screener provider unavailable"; - data-testid=screener-provider-warnings role=alert present; ## 8.5 Connections / broker calm (QA-04 re-check); GET /api/market-data/health → providers[tws].circuitOpen=true, status=degraded (gateway_disconnected); After workspace reload performance entries (35s window, circuit open):; - /api/brokerage/snapshot — 0 requests; - /api/trading/accounts — 0 requests; - /api/brokerage/snapshot?environment=live — 0 requests; Account header disabled; Reconnect chrome visible; ## QA inventory disposition; | ID | Priority | Status | Notes |; |----|----------|--------|-------|; | QA-01 | P1 | Closed | Phase 1; Wave 3 no getServerSnapshot warning |; | QA-02 | P1 | Closed | Phase 2; Wave 3 no ChartCell render warning |; | QA-03 | P1 | Closed | Phase 3; no stale workspace PUT 404 |; | QA-04 | P1 | Closed | Phase 4; Wave 3 broker poll calm with circuit open |; | QA-05 | P2 | Fixed | Phase 5 + Wave 3 screener warning UI after DataHealth fix |; | QA-06 | P2 | Fixed | Phase 6 |; | QA-07 | P2 | Fixed | Phase 6 |; | QA-08 | P2 | Fixed | Phase 7 |; | QA-09 | P2 | Fixed | Phase 7 |; | QA-10 | P2 | Skipped | Observability only; quote SSE fallback unchanged |; | QA-11 | P3 | Closed | Wave 3 New chat + copilot-empty-brand |; | QA-12 | P3 | Skipped | Ops/env — TWS not connected; Phase 4 covers product behavior |; | QA-13 | P3 | Skipped | Dev sourcemap noise only |; Open P1 from inventory: 0; Closes: QA-11; track-level Wave 3 verification complete | docs/evidence/live-functional-qa-wave3-2026-07-29.txt,src/app/components/data-health/useDatasetHealthRegistration.ts,src/app/components/data-health/DataHealthProvider.tsx,src/lib/marketData/healthDatasets.ts,docs/roadmaps/live-functional-qa-remediation-roadmap.md |

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
