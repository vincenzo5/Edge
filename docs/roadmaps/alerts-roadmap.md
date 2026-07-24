# Alerts Roadmap

Single roadmap for Edge price, drawing, and semantic annotation alerts — how the industry handles them, best practices, and phased implementation.

**Last updated:** 2026-07-21

**Status:** Phase 0 **Passing** — Phase 1 **Passing** (2026-07-21) — Phase 2 **Passing** (2026-07-21) — Phase 3 **Passing** (2026-07-21) — Phase 4 **Passing** (2026-07-22): script condition alerts (Script Depth Phase 4 handoff). **Product complete for v1** (external delivery / semantic AI tools still deferred). Deferred app-level walks → [app-level-verification-roadmap.md](./app-level-verification-roadmap.md) Phase 2 (Wave 1, complete); MCP alert tool walk → [app-level-verification-wave-2-roadmap.md](./app-level-verification-wave-2-roadmap.md) Phase 4.

## Product goal

Give solo traders reliable notifications when market conditions match their chart analysis — without requiring the app tab to stay open.

Edge is **not** trying to clone TradingView's full alert platform (Pine Script alerts, 13+ condition types, multi-condition combinatorics on day one). The differentiator is **semantic annotation alerts** tied to thesis / invalidation / target metadata and AI-assisted trade plans.

## How other trading software handles alerts

Most platforms split alerts into three layers:

| Layer | Role |
|-------|------|
| **Condition** | What to watch — price, indicator, drawing level, screener rule, time |
| **Engine** | Who evaluates — browser (unreliable) vs server (standard) |
| **Delivery** | How the user is notified — in-app, push, email, webhook |

| Platform | Typical pattern |
|----------|-----------------|
| **TradingView** | Price / drawing / indicator / Pine alerts; multi-condition; watchlist-wide; **cloud execution** so alerts fire when offline. Reference: [tradingview-reference.md § alerts](../chart/tradingview-reference.md) |
| **thinkorswim** | Study-based (thinkScript) + price/time alerts; desktop/mobile push |
| **Retail brokers** | Simple price above/below push notifications |
| **MetaTrader** | Mostly client-side price alerts; EAs for custom logic |
| **Institutional (Bloomberg, etc.)** | Monitors on any field; heavy audit/logging |

**Industry standard:** server-evaluated conditions, precise trigger semantics, multiple delivery channels, audit log.

## Best practices (non-negotiable for Edge)

1. **Evaluate server-side** — alerts must fire when the browser tab is closed.
2. **Precise trigger semantics** — "crosses above" ≠ "touches" ≠ "closes above on interval X". Document and test each operator.
3. **One-shot vs recurring** — default to fire-once then expire or require re-arm; recurring is explicit opt-in.
4. **Never fire on stale data** — respect `meta.stale` / freshness from `MarketDataService` and quote streams before triggering.
5. **Dedupe and rate-limit** — same condition must not spam every tick; short cooldown after fire (pattern: `healthEvents.ts` 30s dedupe window).
6. **Persist + sync** — alert definitions in Postgres (localStorage fallback) alongside watchlists and layouts.
7. **Audit trail** — log created → armed → triggered → dismissed so users can answer "why did I get this?"
8. **Start narrow** — price + drawing alerts first; indicator / screener / custom logic after the condition engine is proven.

## Requirements summary (MVP)

| Area | Requirement |
|------|-------------|
| User | Solo retail trader (single user) |
| Condition types (v1) | Price cross/touch above/below; horizontal line / drawing level |
| Create UX | Chart crosshair, price scale, drawing context menu (stubs in [context-menu-reference.md](../chart/context-menu-reference.md)) |
| Engine | Server-side evaluator fed by existing quote/candle streams (`subscribeQuotes`, TWS/SSE/polling) |
| Delivery (v1) | In-app toast + alerts panel/history |
| Lifecycle | active → triggered → expired; manual dismiss; optional expiration date |
| Data guard | Suppress trigger when feed is stale or provider errors exceed threshold |
| Persistence | Drizzle schema + localStorage fallback (mirror watchlist library pattern) |

## Architecture (target)

```
UI (chart / watchlist / AI tools)
    → Alert definitions (Postgres + localStorage)
    → Server alert evaluator
        ← Quote + candle streams (MarketDataService / SSE / TWS)
        → Freshness guard (skip if stale)
        → Delivery (in-app → push → webhook)
        → Trigger audit log
```

### Touch points (when implementation begins)

| Area | Path |
|------|------|
| Market data / streams | `src/lib/marketData/`, `src/lib/chartDataFeed/`, `/api/stream/quotes` |
| Freshness / stale | `meta.stale`, `DataHealthProvider`, stream `stale` events |
| Drawings / geometry | `packages/chart-core/src/drawings/`, drawing context menus |
| Semantic metadata | `SerializedDrawing.metadata`, [rich-annotations-vision.md](../chart/rich-annotations-vision.md) |
| Persistence | `src/lib/persistence/schemas/`, watchlist library pattern |
| AI tools | `src/lib/ai/tools/alerts.ts` — lifecycle + high-level create + chart workflow (16 tools via `AlertsPort`; `requiresClientSession`) |
| Screener | Scheduled re-run + "new symbols match" notification ([screener-roadmap.md](./screener-roadmap.md)) |

## Phasing

### Phase 0 — Foundation (platform)

**Outcome:** Reliable price alerts with in-app delivery.

| Work item | Scope |
|-----------|--------|
| Schema | `alert_definitions` + `alert_events` (trigger audit) |
| Trigger ops | `cross_above`, `cross_below`, `touch_above`, `touch_below` (price vs last/trade) |
| Server evaluator | Background job or stream-driven loop; symbol subscription set from active alerts |
| Stale guard | No fire when quote `meta.stale` or session unhealthy |
| Dedupe | Cooldown per alert after fire |
| UI | Alerts panel (list active/triggered); create from chart at crosshair price |
| Persistence | Postgres + localStorage; optional cloud sync |

**Out of scope:** email, push, webhooks, indicator conditions, screener alerts.

### Phase 1 — Drawing-bound alerts

**Outcome:** Alerts tied to chart geometry that moves with the drawing.

| Work item | Scope |
|-----------|--------|
| Drawing triggers | Horizontal line, trendline level, rectangle zone enter/exit |
| Context menu | "Add alert on drawing…" ([context-menu-reference.md §2](../chart/context-menu-reference.md)) |
| Geometry sync | Re-evaluate level when drawing is edited; invalidate if drawing deleted |
| Bar close (optional) | `close_above` / `close_below` on configured interval |

Reference parity: TradingView drawing alerts ([tradingview-reference.md](../chart/tradingview-reference.md)).

### Phase 2 — Trade plan + screener alerts

**Outcome:** Actionable alert workflows for trade setups and saved screen discovery.

| Work item | Scope | Status |
|-----------|--------|--------|
| Trade plan bundle | Long/short position → entry + stop + target price alerts (`drawingRole` + `bundleId`); overlay **Add trade plan alerts…**; role-aware sync on edit | **Passing** |
| Screener alerts | `screener_alerts` table + cron re-run; notify on **added** symbols; saved-screen **Notify** toggle (15m/60m); `source: "screener"` delivery | **Passing** |

**Deferred from original Phase 2 naming:**
- Semantic binding (`thesis` / `invalidation` / `target` kind alerts)
- Invalidation auto-status on annotation
- Semantic AI `create_alert` tools (lifecycle CRUD + high-level create **shipped** 2026-07-22 — see `src/lib/ai/tools/alerts.ts`)

Aligns partially with [rich-annotations-vision.md Phase E](../chart/rich-annotations-vision.md) (invalidation triggers still deferred).

### Phase 3 — Power-user conditions

**Outcome:** Advanced alert conditions without external delivery channels.

| Work item | Scope | Status |
|-----------|--------|--------|
| Indicator conditions | Reuse declarative `IndicatorPlugin` via server candle eval (RSI/MACD/MA/EMA starter set); level + cross modes | **Passing** |
| Watchlist-wide | One definition bound to `watchlistId`; per-symbol fire/cooldown via `symbol_state` | **Passing** |
| Multi-condition | AND/OR on 2 legs max; false→true combinator edge | **Passing** |

**Deferred from original Phase 3 naming:**
- Email / push / webhooks (external delivery)
- Semantic kind alerts (lifecycle alert AI tools shipped; semantic *kind* alerts still deferred)

### Phase 4 — Script condition alerts

**Outcome:** Private My scripts declare named condition series; client guest evaluates them; shared alerts engine arms/fires from freshness-guarded snapshots — never by running untrusted script on the server.

Joint ownership with [script-depth-roadmap.md](./script-depth-roadmap.md) Phase 4.

| Work item | Scope | Status |
|-----------|--------|--------|
| Manifest `alerts` | `ScriptManifest.alerts` maps condition id → `{ title, seriesId }`; SDK bump `edge-indicator-sdk-5` | **Passing** |
| `script_condition` leg | Alert schema + config pane + prefill from script settings | **Passing** |
| Snapshot ingest | `POST /api/me/alerts/[id]/snapshot` → `symbol_state` fields | **Passing** |
| Cron eval | `evaluateAlertLeg` reads snapshot with 5m freshness guard; no server guest | **Passing** |
| Chart bridge | Post snapshots after ready script results for armed alerts | **Passing** |

**Reliability contract:** Price/drawing/indicator alerts remain server-reliable with the tab closed. Script-condition alerts may miss or lag when no chart session is updating snapshots (v1 intentional).

**Out of scope:** Server QuickJS on cron; watchlist-wide script eval; Pine `alert()` syntax.

## Explicit deferrals

- Email / push / webhooks (external alert delivery)
- Pine Script syntax / arbitrary server-side guest execution
- Server-side script guest execution for alert cron (script conditions use client snapshots in Phase 4)
- Order execution tied to alert fire (alert → auto-trade)
- Complex multi-leg bracket alerts
- Screener scheduling before Phase 0 price alerts are proven *(Phase 2 screener alerts now Passing)*
- Client-only evaluation (browser tab must not be required for reliability)

## Verification plan (when active)

| Tier | Scope |
|------|--------|
| Focused | Trigger operator unit tests; stale-guard tests; dedupe tests |
| Build | `npm run build` when persistence schema + API routes land |
| App-level | Create price alert → close tab → simulate quote cross → in-app/history shows trigger with timestamp and source metadata |

## Related docs

- [ROADMAP.md](../ROADMAP.md) — product phases; alerts deferred in Explicit Deferrals until provenance stable
- [tradingview-reference.md § alerts](../chart/tradingview-reference.md) — industry reference inventory
- [context-menu-reference.md](../chart/context-menu-reference.md) — planned "Add alert…" menu items (currently out of scope)
- [rich-annotations-vision.md](../chart/rich-annotations-vision.md) — Phase E alert binding and invalidation triggers
- [screener-roadmap.md](./screener-roadmap.md) — scheduled re-runs blocked on this infra
