# Edge Roadmap

Single roadmap for where Edge is going and how current work fits together.

**Last updated:** 2026-07-24

## Product Direction

Edge is a private financial charting workspace built around a custom Canvas chart engine, broker-backed market data, and AI-native analysis tools.

The goal is not to clone all of TradingView. The goal is a fast, controllable charting app where an AI copilot can inspect the same market data and chart state as the user, propose analysis, place semantic annotations, and help maintain trade playbooks.

**Primary use case (product gravity):** edge **research** — multi-symbol / multi-timeframe investigation with AI — more than day-to-day execution. Shell direction: Talk + Research Board as research home, while the tiled `/workspace` **Desk remains a permanent density**. Living track: [Research UX Roadmap](./roadmaps/research-ux-roadmap.md).

## Current State

| Area | State | Notes |
|------|-------|-------|
| Custom chart engine | Shipped foundation | Canvas 2D renderer, pan/zoom, range presets, indicators, drawings, panes, templates, context menus, TradingView-style layout templates, single-layout workspace persistence, and browser-tab live quote are in place. |
| App shell | Shipped foundation | Faster bootstrap (`resolveAppBootstrap`), floating sidebar panels, TV-style price legend, age-based Data Health chrome, `/workspace` tiling shell (Chart/Screener/Journal/Scripts/Alerts tiles), responsive module home hub at `/home` with charts at `/chart`, `/screener` review app, smart `/` entry (24h last-module redirect), and `/journal` module (Dashboard / Trades / Settings). Desk tiling + cloud sync shipped via [Workspace State Persistence](./roadmaps/workspace-state-persistence-roadmap.md). Research-first Talk/Board densities (Desk kept) tracked in [Research UX Roadmap](./roadmaps/research-ux-roadmap.md). |
| Trading journal | Shipped foundation | IBKR fill sync + Flex CSV import → grouped round-trip trades; Postgres + localStorage fallback; dashboard KPIs, calendar P&L, equity curve, tag/setup and time reports, R-multiple, filters, chart deep links with execution markers, trade rating, compare reports, STK MFE/MFA. **Server-side broker ledger ingest** (fills + account/position snapshots while Next+sidecar up) in [Broker Ledger Roadmap](./roadmaps/broker-ledger-roadmap.md). Full tiers in [Journal Roadmap](./roadmaps/journal-roadmap.md). |
| Trading execution | Phase 0–5 **Passing** | Paper + live via in-app mode; registry `ib-paper`/`ib-live`; Trade sidebar + confirm; AccountPanel cancel; journal orderRef; AI place_order; Postgres `order_intents` when `DATABASE_URL` set. Dual-connection **display preference ≠ order account** shipped (`edge:marketData:connectionId`); remaining Docker both-Gateway ops in [Dual Connection Roadmap](./roadmaps/dual-connection-roadmap.md). Brackets/OCO/trail shipped (Phases 6–9). Backlog: options; post-fill manage → [Trade Management Playbook Roadmap](./roadmaps/trade-management-playbook-roadmap.md). [Trading Execution Roadmap](./roadmaps/trading-execution-roadmap.md). |
| Trade management | Phase 0–7 **Passing** | Post-fill **Manage** on broker **Protect**; Phase 8 **Pending** (rule editor). [Trade Management Playbook Roadmap](./roadmaps/trade-management-playbook-roadmap.md). |
| Market data foundation | Shipped foundation | Provider-neutral service exists in `src/lib/marketData/` with Yahoo, SEC, FRED, FMP, Massive, TWS, and IBKR adapters; age-based display freshness and trust-event logging for transport recovery; ChartDataFeed/watchlist thread TWS `connectionId` display preference. Client TTL reuse / poll hygiene / serving-cost gaps closed in [Data Serving Efficiency Roadmap](./roadmaps/data-serving-efficiency-roadmap.md) (Phases 0–6 **Passing**; Phase 7 Redis **Skipped** — superseded for prod topology by [Shared Cache Topology](./roadmaps/shared-cache-topology-roadmap.md)). Resident-bar / clone / process-heap retention Phases 0–14 **Passing** in [Memory Efficiency Roadmap](./roadmaps/memory-efficiency-roadmap.md) (Phase 12 flagged Redis adapters). Prod Redis fail-loud / ops flip → [Shared Cache Topology Roadmap](./roadmaps/shared-cache-topology-roadmap.md). Settings Connections / provider prefs / local Gateway connect → [Connections & Providers Roadmap](./roadmaps/connections-providers-roadmap.md); hosted IB OAuth → [IBKR Hosted OAuth Roadmap](./roadmaps/ibkr-hosted-oauth-roadmap.md). |
| Local deployment | Host-native track complete; containerization Phase 2 **Passing** | Phases 0–5 of the dual-environment local deployment are Passing. Development remains host-native; containerization Phases 0–2 add immutable image + Compose app-prod wiring. [Local Development and Production](./roadmaps/local-dev-production-roadmap.md) · [Local Production Containerization](./roadmaps/local-production-containerization-roadmap.md). |
| IBKR provider | Shipped in main routing | IBKR-first candles and quotes in `MarketDataService` with Yahoo fallback; probe routes remain for diagnostics. Requires daily Gateway login for live IBKR data. |
| AI tools | Shipped foundation | Shared tool registry, HTTP adapter, MCP adapter, and in-app tool context exist. Market-data and trading tools (`preview_order` / `place_order`) run server-side; stateful chart, watchlist, screener, risk, account, and options session tools require an app session. |
| Semantic annotations | Phase A shipped | Drawings can carry thesis, invalidation, target, and note metadata; AI drawing tools can read/write/filter metadata. |
| Alerts | Shipped foundation (Phase 0–4) | Price/drawing/indicator/script-condition alerts, trade-plan bundles, screener match notifications, watchlist-wide scope, 2-leg AND/OR. External delivery (email/push/webhook) deferred. Semantic kind alerts + AI create deferred. Cron walks closed in Wave 1; MCP alert tools closed on [Wave 2](./roadmaps/app-level-verification-wave-2-roadmap.md) Phase 4. |
| Copilot UI | Shipped (Grok parity) | Functional agent Phases 0–8 + Grok UX parity Phases 0–5 **Passing** ([AI Agent](./roadmaps/ai-agent-roadmap.md), [Grok Copilot UX Parity](./roadmaps/grok-copilot-parity-roadmap.md)). Light-theme Copilot tokens deferred. Agent/chrome walks closed on [Wave 2](./roadmaps/app-level-verification-wave-2-roadmap.md) Phases 1–2. |

## Roadmap Phases

### Phase 1 - Charting Core

**Outcome:** Edge works as a real charting app before AI or broker features carry product weight.

Status: mostly complete.

Completed foundations:

- Custom Canvas chart engine replaces third-party chart embeds.
- Candles, OHLC, area, Heikin Ashi, axes, crosshair, pan/zoom, pinch, range presets, and infinite history prepend work.
- Six implemented indicators: MA, EMA, BOLL, MACD, RSI, VOL.
- Twelve drawing tools, undo/redo, object tree, data window, drawing metadata, and basic context menus are in place.
- Layouts, templates, watchlists, workspace layout storage, and chart settings persist locally with optional remote persistence.

Remaining chart work:

- ~~Batch the next 5-10 disabled indicator catalog entries.~~ **Deferred** — batches 1–2 shipped (15 studies); further catalog expansion deferred per product direction.
- ~~Split linked-layout behavior into separate symbol, interval/range, and crosshair sync toggles.~~ **Done** — `linkSymbol`, `linkInterval`, `linkCrosshair` on `ChartLayout`.
- ~~Sync drawings across linked layout cells with stable IDs and clear propagation rules.~~ **Done** — `linkDrawings` toggle; `applyLinkPropagation` + `ChartSyncContext` drawing broadcast.
- Persist Bar Replay position in `CellConfig`.
- Finish low-risk TradingView parity polish where it improves daily use.

### Charting Platform Acceleration Track

**Outcome:** Move Edge toward a Percept-class charting platform without turning the app into a third-party chart dependency. The goal is to copy the useful interface and platform patterns: a clean chart data-feed boundary, declarative studies, live update contracts, layer-based rendering, and GPU-backed dense series rendering where it actually helps.

This track is intentionally staged. Percept-style parity is not a single WebGL rewrite. The API contract comes first, then a renderer-layer boundary, then selective WebGL backends for heavy series/heatmap layers while Canvas/DOM continue to own drawings, labels, menus, and interaction chrome.

Stage 1 - Measurement and constraints:

- **Shipped:** `examples/chart-perf-harness`, `npm run perf:chart`, and saved baseline at [perf/chart-baseline-latest.json](./perf/chart-baseline-latest.json). Interaction metric contract + tagged baseline at [perf/runtime-interaction-baseline-latest.json](./perf/runtime-interaction-baseline-latest.json) (Runtime Interaction Performance Phase 0).
- Add a chart performance harness for representative datasets: 10k, 100k, and 1M candles; multiple panes; common indicators; drawing-heavy charts.
- Measure initial render time, pan/zoom FPS, crosshair latency, memory use, indicator recompute cost, and multi-pane redraw cost.
- Use the results to decide whether the first bottleneck is renderer fill rate, data structures, indicator math, React state churn, hit-testing, or API/data loading.
- **Initial baseline (2026-06-24):** 100k + six indicators mount ~1.8s; pan/zoom sample p95 ~894ms with 80% dropped frames; indicator cache-key fingerprint on 100k candles ~243ms (similar to cold compute), pointing to cache-key/compute and interaction repaint as first optimization targets.
- **Interaction optimization track:** [Runtime Interaction Performance Roadmap](./roadmaps/runtime-performance-roadmap.md) — Phases 0–8 **Passing** (2026-07-25); track complete — metric contract through CI budgets.

Stage 2 - Declarative indicator platform:

- Promote the existing `IndicatorPlugin` pattern into a stronger study authoring contract: id/name/category, placement, typed inputs, outputs, compute, default styles, legend/crosshair behavior, and serialization.
- Keep custom `draw()` as an escape hatch; most indicators should only define math and output metadata.
- Batch the next studies only through this declarative path so picker UI, settings UI, y-scale, legend, crosshair values, and restore behavior stay consistent.
- **Shipped (batch 1):** VWAP, ATR, KDJ (stochastic %K/%D/%J), CCI, OBV — 11 total implemented plugins.
- Initial target batches: ~~VWAP, ATR, Stochastic, CCI, OBV~~ (batch 1 done); ~~ADX/DMI, Williams %R, Momentum/ROC, Supertrend~~ (batch 2 done); then volume-derived studies.

Stage 3 - Unified chart data-feed and live update boundary:

- **Shipped:** Static `ChartDataFeed` contract, app REST adapter, provider source/freshness metadata, and typed event/reference overlay channels.
- Extend the Edge chart-level data-feed interface so it can serve candles, quotes, events, news, fundamentals, options overlays, and future order-flow channels from one stable chart entry point.
- Add `subscribeCandles` / `subscribeQuotes` plus a polling fallback for providers without real streaming.
- **Shipped:** Pluggable `StreamTransport` (`polling` default, `server-proxied` SSE opt-in via `NEXT_PUBLIC_STREAM_TRANSPORT=server-proxied`); SSE routes at `/api/stream/candles` and `/api/stream/quotes`; shared diff logic in `streamDiff.ts`. Native provider push (e.g. IBKR live ticks) plugs into server session adapters without changing chart contracts.
- Model live feed events explicitly: `snapshot`, `append`, `replace-latest`, `stale`, `reconnect`, and `error`.
- Make symbol, exchange, interval, and range changes automatically refetch/resubscribe through the feed boundary.
- Keep provider routing app-owned: TWS, IBKR, Yahoo, SEC, FRED, FMP, Massive, local annotations, and AI-generated overlays remain behind the Edge market-data and tool boundaries.
- Add explicit source/freshness metadata so the chart and AI tools can explain where each piece of market context came from.

Stage 4 - Renderer-layer boundary:

- **Shipped:** `LayerRegistry` + `ChartLayer` contract in `packages/chart-react/src/engine/layers.ts`; six ordered Canvas layers (background, grid, candles, indicators, drawings, axes) with explicit invalidation metadata; `canvas.tsx` draw loop delegates to the registry.
- Split rendering into logical layers: static grid, candles/bars, indicator plots, drawings, crosshair, axes, labels, reference lines, and event overlays.
- Give each layer explicit invalidation rules so interaction updates do not force unrelated redraw work.
- Keep a stable layer contract that can support multiple backends: Canvas 2D first, then WebGL for heavy series layers.
- Keep Canvas/DOM paths for text, axis badges, editable drawings, context menus, dialogs, and other UI that is not a good fit for WebGL.

Stage 5 - Selective WebGL backend:

- **Shipped (proof):** WebGL2 behind the `candles` layer for main-pane OHLC (`candle_solid`, `heikin_ashi`, `ohlc`, `area`); offscreen GL composited into the pane 2D canvas; Canvas fallback; event/reference/annotation overlays remain Canvas. Opt-in via `NEXT_PUBLIC_WEBGL_CANDLES=1`.
- **Shipped (indicators):** WebGL2 behind the `indicators` layer for declarative `line`/`histogram` outputs (no `fillBetween`); mixed panes render WebGL-compatible series first, Canvas-only indicators (e.g. BOLL bands) on top. Opt-in via `NEXT_PUBLIC_WEBGL_INDICATORS=1`.
- **Shipped (validation):** `webglBrowserValidation.ts` dev report logged on price-pane mount when WebGL candles flag is enabled.
- Move large candle and indicator series toward typed arrays and cache reusable geometry that both Canvas and WebGL backends can consume.
- Offload expensive indicator/order-flow transforms to workers when measurement shows main-thread compute is the bottleneck.
- Add WebGL heatmap/volume-profile/order-flow style visuals later; do not block DataFeed or indicator-platform work on these advanced visuals.

Stage 6 - Advanced market-context overlays:

- **Shipped:** Typed overlay channels via `ChartDataFeed.loadOverlays` — `events` (registry + news + options expirations), `referenceLines` (priced events), `annotations` (feed + local drawing metadata). Canvas rendering for all overlay markers.
- Keep overlays data-driven rather than hard-coded into the renderer so AI tools and future providers can add context through the same contract.

Guardrails:

- Do not replace the custom Edge chart engine with a third-party chart widget.
- Do not start Pine/community-indicator compatibility before the internal declarative study contract is stable.
- Do not treat WebGL as the product API; it is a rendering backend behind Edge's chart contracts.
- Do not move interactive drawings, labels, dialogs, or context menus into WebGL unless a measured need appears.
- Treat Percept's public `10M+` points / `60fps` claims as directional until Edge has comparable benchmark data.

### Trading Execution Track

**Outcome:** Place and manage stock orders (market, limit, stop) per account through IB TWS, with a broker-neutral foundation for multiple brokers later. Journal already ingests fills; execution links back via `orderRef`.

Full phasing: [Trading Execution Roadmap](./roadmaps/trading-execution-roadmap.md).

| Phase | Status | Summary |
|-------|--------|---------|
| **0 — Paper proof-of-life** | **Passing** (2026-07-08) | Sidecar `POST/DELETE /trading/orders`, what-if, paper-only gate, explicit `accountId` |
| **1 — Domain + adapter** | **Passing** (2026-07-08) | `src/lib/trading/`, `TradingService`, `/api/trading/*` (no UI) |
| **2 — Manage + account picker** | **Passing** (2026-07-08) | Modify orders, active account selection, reconciler |
| **3 — Stops + safety** | **Passing** (2026-07-08) | STOP/STOP_LIMIT, preview expiry, kill switch |
| **4 — UI + journal** | **Passing** (2026-07-08) | Chart ticket, confirm modal, AccountPanel cancel, AI tool |
| **5 — Multi-broker + live** | **Passing** (2026-07-08) | Connection registry, in-app paper/live, live `LIVE` confirm (TWS sidecar only) |
| **Dual connection (post-5)** | **Partial** | Display preference ≠ order account shipped (`edge:marketData:connectionId`); remaining Docker paper+live Gateways + ops. [Dual Connection Roadmap](./roadmaps/dual-connection-roadmap.md) |

Guardrails:

- In-app paper/live mode (default paper); live mutations require typing `LIVE`.
- Read-only `BrokerageService` unchanged — execution is a separate command path.
- No options execution, brackets, or AI trades without confirmation in v1.
- Market-data connection preference must not silently authorize trading decisions (trust model).

### Phase 2 - Broker-Backed Market Data

**Outcome:** The app stops behaving like a Yahoo demo chart and routes through a provider-neutral market data layer.

Current focus: confirm IBKR routing in the running app with an authenticated Gateway.

Shipped in this pass:

- `/api/candles` and `/api/quotes` prefer IBKR when `IBKR_ENABLED=true` and the Gateway returns data.
- Yahoo fallback for unauthenticated Gateway, missing entitlements, unsupported symbols, or IBKR outages.
- Optional `meta: { source, warnings, stale, asOf }` on candle and quote API responses.
- Per-provider cache keys so Yahoo fallback does not mask later IBKR success after login.
- Focused tests for IBKR-primary, Yahoo-fallback, unauthenticated Gateway, and empty/provider-error responses.

Next work:

- App-level confirmation: authenticated Gateway → `meta.source: "ibkr"` on chart load.

Later market data work:

- Add provider preference configuration beyond hard-coded service behavior → [Connections & Providers Roadmap](./roadmaps/connections-providers-roadmap.md) Phase 2.
- Expand options, corporate events, news, fundamentals, and macro usage into first-class app workflows (defined below). These build directly on the shipped ChartDataFeed overlay channels (events, referenceLines, annotations), event registry, provenance metadata, and AI tool registry so new surfaces remain consistent with chart pins, watchlist context, drawings, and future copilot usage.
  - **Options workflows**: Dedicated Options Panel (sidebar or per-cell) with symbol-driven expirations selector and full chain table (strikes, bid/ask, volume, OI, greeks, IV); selected expirations render as vertical reference lines or event pins on the main chart; one-click actions to overlay, create semantic annotation, or send chain summary to AI tools for analysis.
  - **Corporate Events & Earnings Calendar workflows**: Sidebar/drawer or bottom panel listing upcoming earnings, dividends, splits, and SEC filings (FMP + SEC sources); click loads symbol into active chart cell, centers range on event date, and prompts a semantic annotation or reference line; status badges ("earnings in 3d", "ex-div tomorrow") visible in watchlist rows and chart header; filterable by impact.
  - **News workflows**: Symbol-scoped or watchlist-wide News Feed panel with headlines, publish times, and detail view; direct actions to create drawing annotations from a headline or trigger AI sentiment/thesis analysis tied to current chart state; high-impact items automatically surface as chart event pins via the existing overlay mappers. Provider economics and cost-efficient stack (Benzinga Basic + EDGAR + gov feeds; FMP needs display license) in [News Flow Roadmap](./roadmaps/news-flow-roadmap.md).
  - **Fundamentals workflows**: Expanded SymbolDetailsPanel (tabbed: profile, financial statements with trend charts, estimates, executives, ownership, valuation metrics) beyond the current snapshot; watchlist enrichment via hover cards or columns (e.g., "EPS growth +12% YoY"); multi-symbol comparison mode (table or radar); deeper AI tool integration so `summarize_chart` and analysis tools pull live fundamentals context.
  - **Macro & Economic Calendar workflows**: Global or layout-aware Macro Calendar view (FMP Premium + FRED) showing releases with expected/actual values and impact flags; ability to add macro series as secondary panes, comparison overlays, or priced reference lines; watchlist-aware filtering ("releases affecting my holdings"); AI workflows such as "list macro events this week relevant to tech names in my watchlist".
  - **Stock Screener workflows**: Sidebar/floating screener (legacy modal wrapper) filters the US-listed universe (equities + ETFs) by technical, fundamental, and descriptive criteria using FMP as primary and Yahoo / IBKR / TWS / Massive as configured. Presets + composable query-builder; wide dock Expand; results as table or treemap heat map; row/group actions to chart and watchlists; saved screens via localStorage with optional Postgres sync. Full scope, phasing, and touch points in [Screener Roadmap](./roadmaps/screener-roadmap.md).
  - **Trading journal & reporting workflows**: IBKR fill sync and Flex CSV import → grouped round-trip trades (STK + multi-leg OPT), stats, tags/notes, and chart deep links on `/journal` (**v1 + Tiers 1–3 shipped** — calendar P&L, tag/setup reports, equity curve, filters, time-of-day/week analysis, chart execution overlay, R-multiple, trade rating, compare reports, STK MFE/MFA). Excludes replay, AI agents, playbooks/notebook, and multi-broker consolidation. Full phasing in [Journal Roadmap](./roadmaps/journal-roadmap.md).
  - **Trading execution workflows**: Phases 0–5 **shipped** (paper + live via in-app mode, connection registry, chart ticket, journal `orderRef`, AI `preview_order` / `place_order`). Dual-connection **chart/watchlist data preference** split from order account **shipped**; remaining Docker both-Gateway ops in [Dual Connection Roadmap](./roadmaps/dual-connection-roadmap.md). Full phasing in [Trading Execution Roadmap](./roadmaps/trading-execution-roadmap.md). Post-fill Manage playbooks → [Trade Management Playbook Roadmap](./roadmaps/trade-management-playbook-roadmap.md).
- Add entitlement-aware warnings for broker data delays or missing market subscriptions.
- Consider streaming quotes/candles only after REST provider routing is reliable.

### Phase 3 - AI Tooling As Product Infrastructure

**Outcome:** AI actions use the same safe, validated app paths as the UI.

Completed foundations:

- One shared tool registry in `src/lib/ai/`.
- Runtime Zod validation for tool arguments.
- Permission metadata for read, write, and destructive tools.
- Destructive tools require explicit confirmation.
- HTTP, MCP, and in-app adapters all call the same registry.
- Market-data tools can run server-side without a browser session.

Next work:

- Keep expanding tools only through the registry and `ToolContext` facades.
- Improve chart summaries with richer indicator, drawing, and market-data context.
- Make provider metadata available to AI responses so the agent can explain freshness and source.
- Build stronger stateful-session support for tools that need live chart/layout context.

### Phase 4 - Semantic Chart Analysis

**Outcome:** Drawings become structured analysis, not just pixels.

Phase A is shipped:

- Drawings support metadata for `thesis`, `invalidation`, `target`, and `note`.
- Metadata includes status, source, rationale, confidence, timestamps, and tags.
- AI tools can add, update, list, and filter semantic drawing metadata.
- Object tree and drawing UI expose semantic labels/status.

Next work:

- Add computed payloads that keep annotations truthful as market data changes.
- Show live footers/details for selected annotations, such as touch count, slope, percent change, or risk/reward.
- Add a risk-box workflow that links entry, stop, and target geometry.
- Upgrade `summarize_chart` to make semantic annotations central to its output.

Later work:

- Add chart-to-copilot linkage: clicking an AI annotation opens the rationale and related thread.
- Add playbook/layer grouping for complete analysis sets.
- Store snapshots and diffs of annotation sets over time.
- Tie annotations to event pins, invalidation triggers, and eventually alerts.

### Alerts Track

**Outcome:** Reliable server-side notifications when price or analysis conditions are met — price alerts, drawing-bound alerts, trade-plan bundles, screener matches, indicator conditions, and watchlist-wide scope.

**Status:** Phase 0–4 **Passing** (2026-07-22). External delivery channels deferred. App-level walks → [Wave 1](./roadmaps/app-level-verification-roadmap.md) Phase 2 (complete); MCP tools → [Wave 2](./roadmaps/app-level-verification-wave-2-roadmap.md) Phase 4.

Full phasing, industry patterns, best practices, and touch points: [Alerts Roadmap](./roadmaps/alerts-roadmap.md).

| Phase | Summary |
|-------|---------|
| **0 — Foundation** | Price cross/touch alerts; server evaluator; stale-data guard; in-app delivery + audit log |
| **1 — Drawing-bound** | Horizontal line, zone, trendline; context menu create; geometry follows edits |
| **2 — Semantic & Edge-specific** | Trade-plan bundles; screener match notifications; thesis/invalidation/AI create deferred |
| **3 — Power-user conditions** | Indicator conditions (RSI/MACD/MA/EMA); watchlist-wide; 2-leg AND/OR; delivery channels deferred |
| **4 — Script conditions** | Script manifest alerts + client snapshot → shared cron (no server guest) |

Guardrails:

- Server-side evaluation only — alerts must fire when the browser is closed.
- No trigger on stale quotes or unhealthy data sessions.
- Default fire-once; recurring alerts are explicit opt-in.
- Do not ship screener scheduling or Pine-style custom logic before Phase 0 is proven.

### Phase 5 - In-App Copilot

**Outcome:** The user can collaborate with an AI inside the charting workspace.

**Living tracks:**

- [AI Agent / In-App Copilot Roadmap](./roadmaps/ai-agent-roadmap.md) — Phases 0–8 **Passing** (contracts → OpenRouter agent → chat shell → session bridge → confirmed writes → chart↔chat → thread persistence → model picker → workflows).
- [Grok Copilot UX Parity Roadmap](./roadmaps/grok-copilot-parity-roadmap.md) — Copilot shell/composer match **grok.com**; Phases 0–5 **Passing** (track complete).
- [Research UX Roadmap](./roadmaps/research-ux-roadmap.md) — AI-first research desk: Talk / Board / Desk densities; pinable artifacts; Research Board; session reel; research-default entry. Phases 0–8 **Passing** (track complete); **tiled Desk kept forever**.

Future work (residual agent polish — research shell track complete):
- No response modes — models only. Keep workspace-native tools, confirm gates, and OpenRouter allowlist — do not clone SuperGrok/Companions/Imagine as requirements.
- Do **not** remove `/workspace` tiling; Desk stays a first-class density beside Talk and Board.

## Near-Term Execution Order

**Authoritative priority:** [Project Status](./PROJECT-STATUS.md) — Current Verified State and Active Work.

**Verification queue (shipped work, deferred walks):**
- ~~[App-level verification Wave 1](./roadmaps/app-level-verification-roadmap.md)~~ — Phases 0–8 **Passing** (2026-07-22) — track complete.
- ~~[App-level verification Wave 2](./roadmaps/app-level-verification-wave-2-roadmap.md)~~ — Phases 0–4 **Passing** (2026-07-24) — track complete.

Living feature tracks (phase detail in each file):

- [Trading execution](./roadmaps/trading-execution-roadmap.md) — Phases 0–5 + **6–9 Passing**; options backlog
- [Trade management playbook](./roadmaps/trade-management-playbook-roadmap.md) — Phase 0–7 **Passing**; Phase 8 **Pending** (rule editor)
- [Dual connection](./roadmaps/dual-connection-roadmap.md) — Phases A–D product complete; ops proof on Wave 1 Phase 1
- [Connections & providers](./roadmaps/connections-providers-roadmap.md) — Phase 0–4 **Passing**; Phase 5 **Pending** (local Gateway polish); Settings/prefs walks closed on Wave 2 Phase 3
- [IBKR hosted OAuth](./roadmaps/ibkr-hosted-oauth-roadmap.md) — Phase 0 **Pending** (feasibility + IB vendor/first-party onboarding); browser Connect IB — separate from Connections
- [Stock screener](./roadmaps/screener-roadmap.md) — Phases 1–5 shipped; product deferrals remain
- [Trading journal](./roadmaps/journal-roadmap.md) — Tier 3 **Passing** (rating, compare, MFE/MFA); import chrome closed on Wave 2 Phase 4
- [Alerts](./roadmaps/alerts-roadmap.md) — Phases 0–4 **Passing**; external delivery / semantic AI deferred; MCP tools closed on Wave 2 Phase 4
- [AI agent / in-app copilot](./roadmaps/ai-agent-roadmap.md) — Phases 0–8 **Passing**; agent walks closed on Wave 2 Phase 1
- [Grok Copilot UX parity](./roadmaps/grok-copilot-parity-roadmap.md) — Phases 0–5 **Passing** (track complete); chrome walks closed on Wave 2 Phase 2
- ~~[Research UX (AI-first desk)](./roadmaps/research-ux-roadmap.md)~~ — Phases 0–8 **Passing** (track complete); Desk tiling retained
- [TypeScript indicator scripting](./roadmaps/typescript-indicator-scripting-roadmap.md) — Phases 0–5B + Scripts tile **Passing**
- [Script depth](./roadmaps/script-depth-roadmap.md) — Phases 0–5 **Passing** — track complete
- ~~[Workspace state persistence](./roadmaps/workspace-state-persistence-roadmap.md)~~ — **Complete**
- ~~[Data serving & caching efficiency](./roadmaps/data-serving-efficiency-roadmap.md)~~ — **Complete** (Phases 0–6 **Passing**; Phase 7 Redis **Skipped** — prod topology → [shared-cache-topology-roadmap.md](./roadmaps/shared-cache-topology-roadmap.md))
- ~~[Memory efficiency](./roadmaps/memory-efficiency-roadmap.md)~~ — Phases 0–14 **Passing** (track complete; Phase 12 adapters)
- [Comprehensive memory metrics](./roadmaps/memory-metrics-roadmap.md) — Phase 0–6 **Passing** (2026-07-25); track complete (soak dual-delta gate; measurement only)
- [Runtime interaction performance](./roadmaps/runtime-performance-roadmap.md) — Phase 0–8 **Passing** (2026-07-25); track complete
- [Shared cache topology](./roadmaps/shared-cache-topology-roadmap.md) — Phase 0–4 **Passing** (2026-07-24); Phase 5 **Pending** (multi-instance coordination)
- [Local development and production](./roadmaps/local-dev-production-roadmap.md) — Phase 0–3 **Passing** (2026-07-25); Phase 4 next (promotion and rollback)
- ~~[Security hardening](./roadmaps/security-hardening-roadmap.md)~~ — Phases 0–6 **Passing** (2026-07-24); track complete
- [Production observability (free stack)](./roadmaps/production-observability-roadmap.md) — Phase 0–5 **Passing** (2026-07-25); track complete
- [Plan → execute token efficiency](./roadmaps/plan-execute-token-efficiency-roadmap.md) — Phase 0–7 **Passing** (track complete)

Broader product backlog (not feature-track owned):

- WebGL candle proof — backend-pluggable main-pane candles only; keep drawings, labels, menus, and interaction chrome on Canvas/DOM
- Advanced market-context overlays — earnings, dividends, filings, news, options expirations, semantic AI annotations
- TrendSpider competitive review — inventory started; prioritize Adopt/Adapt/Defer/Skip → [TrendSpider Competitive Roadmap](./roadmaps/trendspider-competitive-roadmap.md)
- News flow — research captured; implementation not started → [News Flow Roadmap](./roadmaps/news-flow-roadmap.md)
- Day classification — Phases 1–3 **Passing** (2026-07-23); Phase 4 in-app review UI **Pending** → [Day Classification Roadmap](./roadmaps/day-classification-roadmap.md)
- ~~Structural refactor~~ — Tiers A–E **Passing** → [Structural Refactor Roadmap](./refactor-roadmap.md)
- Code organization — Phase 0–2 **Passing** (2026-07-24); Phase 3 **Pending** (components tree, god modules, chart shims) → [Code Organization Roadmap](./roadmaps/code-organization-roadmap.md)

## Explicit Deferrals

These are intentionally not near-term roadmap items:

- Pine Script syntax and public/community indicator compatibility. Private chart-only TypeScript scripting foundation is in the [TypeScript Indicator Scripting Roadmap](./roadmaps/typescript-indicator-scripting-roadmap.md); Pine-*like capability* (not Pine syntax) is phased in the [Script Depth Roadmap](./roadmaps/script-depth-roadmap.md).
- Full TradingView feature parity.
- Chart trade ticket UI and in-app paper/live — **shipped** (Phases 4–5). Data≠order account preference — **shipped**; dual paper+live Gateway ops proof — [App-level Verification Roadmap](./roadmaps/app-level-verification-roadmap.md) Phase 1.
- Alerts v1 (price/drawing/indicator/script/screener) — **shipped**; external delivery and semantic AI create still deferred — [Alerts Roadmap](./roadmaps/alerts-roadmap.md).
- Non-time charts such as Renko, Point and Figure, or Kagi.
- Volume footprint, TPO, and session profile.
- Public package release work for the internal chart/AI packages.
- Broad cross-device collaboration / CRDT sync. Desk shell, per-tile charts, and user prefs cloud sync are phased in [Workspace State Persistence Roadmap](./roadmaps/workspace-state-persistence-roadmap.md); libraries/journal/scripts/alerts already use optional Postgres.
- Paid observability SaaS (Sentry, Datadog, PagerDuty, etc.). Production ops use the free stack in [Production Observability Roadmap](./roadmaps/production-observability-roadmap.md).

## Source Docs

- [Project Status](./PROJECT-STATUS.md) - current verified state, active work, and verification evidence.
- [Chart Feature Inventory](./chart/features.md) - row-level chart capability status and post-V1 backlog.
- [Market Data Architecture](../src/lib/marketData/ARCHITECTURE.md) - provider-neutral data layer and verification commands.
- [AI Tools Architecture](./ai-tools-architecture.md) - registry, adapters, permissions, and rollout phases.
- [Rich Annotations Vision](./chart/rich-annotations-vision.md) - semantic annotation product direction.
- [Feature Roadmaps index](./roadmaps/README.md) - living multi-phase tracks and status table.
- [App-level Verification Roadmap (Wave 1)](./roadmaps/app-level-verification-roadmap.md) - first deferred-walkthrough queue (complete).
- [App-level Verification Wave 2](./roadmaps/app-level-verification-wave-2-roadmap.md) - post–Wave 1 Copilot / Connections / ops walks.
- [Screener Roadmap](./roadmaps/screener-roadmap.md) - stock screener scope, phasing, and touch points.
- [Journal Roadmap](./roadmaps/journal-roadmap.md) - trading journal reporting tiers and explicit exclusions.
- [Trading Execution Roadmap](./roadmaps/trading-execution-roadmap.md) - IB order place/manage phases, domain model, verification gates.
- [Trade Management Playbook Roadmap](./roadmaps/trade-management-playbook-roadmap.md) - post-fill Manage rules (BE, scale, trail) on broker Protect; Plan/Protect/Manage separation.
- [Dual Connection Roadmap](./roadmaps/dual-connection-roadmap.md) - paper+live Gateways and market-data vs order-account split.
- [Connections & Providers Roadmap](./roadmaps/connections-providers-roadmap.md) - Settings Connections, provider prefs, ConfigSource, local Gateway polish.
- [IBKR Hosted OAuth Roadmap](./roadmaps/ibkr-hosted-oauth-roadmap.md) - Browser Connect IB / Web API OAuth (vendor or first-party); separate from Connections.
- [Alerts Roadmap](./roadmaps/alerts-roadmap.md) - industry patterns, best practices, and phased alert platform.
- [AI Agent Roadmap](./roadmaps/ai-agent-roadmap.md) - in-app copilot, OpenRouter model gateway, session bridge, chart↔chat linkage.
- [Research UX Roadmap](./roadmaps/research-ux-roadmap.md) - Talk / Board / Desk densities; Research Session + Board; tiled Desk kept forever.
- [Workspace State Persistence Roadmap](./roadmaps/workspace-state-persistence-roadmap.md) - per-tile charts, app-workspace sync, prefs, viewport, workflow resume.
- [Data Serving Efficiency Roadmap](./roadmaps/data-serving-efficiency-roadmap.md) - **Complete** — client cache reuse, poll hygiene, home remote truth, screener/AI serving cost; Redis multi-instance skipped.
- [Memory Efficiency Roadmap](./roadmaps/memory-efficiency-roadmap.md) - Phases 0–14 **Passing** (track complete; Redis shared cache optional behind `EDGE_MARKET_DATA_CACHE_BACKEND=redis`).
- [Runtime Interaction Performance Roadmap](./roadmaps/runtime-performance-roadmap.md) - frame time, crosshair cost, tip tick, React wakeups; CI budgets after interaction fixes.
- [Plan → Execute Token Efficiency Roadmap](./roadmaps/plan-execute-token-efficiency-roadmap.md) - Phase 0–7 **Passing** (track complete).
- [Production Observability Roadmap](./roadmaps/production-observability-roadmap.md) - free-stack probes, logs, durable audit/errors, and alerts (no paid SaaS).
- [Structural Refactor Roadmap](./roadmaps/refactor-roadmap.md) - sync/series consolidation and chart/app coordinator decomposition.
- [Code Organization Roadmap](./roadmaps/code-organization-roadmap.md) - follow-on structure: `lib`↛`app`, god-module budgets, components migration, chart shim sunset, harness hygiene.
- [Chart Performance Baseline](./perf/chart-baseline-latest.json) - latest harness output from `npm run perf:chart`.
