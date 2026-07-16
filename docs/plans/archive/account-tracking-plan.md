# Account Tracking — Implementation Plan

> **Superseded** by trading execution Phases 0–5 and [dual-connection roadmap](../../roadmaps/dual-connection-roadmap.md). Kept for historical checklist detail.

Interactive Brokers account tracking in Edge: pull live account data from IB Gateway (positions, PnL, orders, executions, margin, buying power) via the TWS sidecar, surface it in a new Account sidebar panel, and wire real positions into the active chart. Includes what-if order **preview** (read-only — no order execution).

Reference inventory: [ib-api-account-data.md](../../ib-api-account-data.md).

**Created:** 2026-06-30

---

## 1. Intent Classification

- **Primary:** Feature — new user-visible capability (account panel, position overlays, what-if preview), new API vertical, new sidecar endpoints, new provider integration.
- **Secondary:** none (no refactor bundled; no bug being fixed).
- **Checklists applied:**
  - [docs/checklists/harness-status-checklist.md](../../checklists/harness-status-checklist.md)
  - [docs/checklists/architecture-review-checklist.md](../../checklists/architecture-review-checklist.md)
  - [docs/checklists/feature-planning-checklist.md](../../checklists/feature-planning-checklist.md)
  - [docs/checklists/testing-verification-checklist.md](../../checklists/testing-verification-checklist.md)
- **Assumptions:**
  - User runs **IB Gateway paper** (port 4002) via the existing TWS sidecar; Web API (Client Portal Gateway) is out of scope for this iteration.
  - **Single account** only (no FA / linked-account switcher in v1).
  - **Read-only brokerage posture preserved.** `whatIfOrder` is a preview (returns margin/commission impact without transmitting). No `placeOrder`. The existing marketData read-only contract ([src/lib/marketData/ARCHITECTURE.md:185](../../../src/lib/marketData/ARCHITECTURE.md)) is **not** violated — no account mutations, no order execution.
  - Phase 1 keeps `TWS_READONLY=true` (positions, summary, PnL, executions are all readable in readonly mode). Orders/executions reads are also available readonly. Only **placing** orders would require `readonly=False`, and that is explicitly out of scope.

---

## 2. Checklist Review

### Architecture review

- **Applicability:** **Required** — work touches multiple triggers in [architecture-review-checklist.md](../../checklists/architecture-review-checklist.md):
  - Package/app boundaries (new `src/lib/brokerage/` vertical; sidecar Python; optional `packages/chart-core` position-marker types).
  - New abstraction / service / adapter (`BrokerageService`, `AccountStreamSession`, `useAccount` hook).
  - API + provider + schema contracts (new `/api/brokerage/*` routes, new sidecar endpoints, new Zod contracts).
  - Cross-component flow (sidecar → API → React context → sidebar panel + chart overlays).
  - Performance-sensitive paths (SSE account stream; chart position markers must not cause per-tick React re-renders).
  - Public exports / stable interfaces (new sidebar panel id; new `SidebarPanelId` union member).
- **Reviewer:** `self-review` (architect agent optional — recommend running the architect review before implementation given the new vertical; decision deferred to user).
- **Result:** `Pending` (this plan is the Phase 1 + 2 design review; Phase 3 implementation review and Phase 4 exit review happen during execution).
- **Deferred risks:**
  - Whether `BrokerageService` lives under `src/lib/marketData/` or a new `src/lib/brokerage/` vertical (decision: **new vertical** — see §3; brokerage ≠ market data, keeps read-only contract boundary clean).
  - Whether `whatIfOrder` requires `TWS_READONLY=false` (resolved during implementation: IB requires a non-read-only API session for what-if preview, while read-only account data stays on the readonly connection).

### Harness status (harness-status-checklist.md)

- **Pre-Plan Read:** ✅ `docs/PROJECT-STATUS.md` Current Verified State read; Active Work table scanned (latest row: Screener sort + column picker — **Passing** 2026-06-29); recent Task Contracts and Session Log scanned; `AGENTS.md` WIP=1 and Definition of Done reviewed.
- **WIP=1 discipline:** ✅ No row currently **Active** (most recent is **Passing**). Two rows are **Pending** with only app-level verification outstanding (TWS sidecar in-app recovery, TWS extended-hours price alignment) — these are not blocked and not being touched by this plan. New Account Tracking row will be the single **Active** item during implementation.
- **Active Work row:** planned — see §5.
- **Task Contract:** will be created (work is cross-component: Python sidecar + Node API + React UI + chart engine) — see §5.
- **Session Log:** yes — append on each verification checkpoint.
- **Definition of Done:** evidence tier defined in §4 (Focused + Build + App-level + Full). Code/tests alone insufficient; app-level live check with IB Gateway connected required before **Passing**.
- **Current Verified State block:** will be updated at session exit — see §5.

### Feature planning (feature-planning-checklist.md)

#### Scope and Behavior
- [x] One-sentence user-visible behavior: **"User sees their live IB account — positions, PnL, buying power, margin, open orders, today's fills — in an Account sidebar panel, with held positions overlaid on the active chart, and a read-only what-if order preview showing margin/commission impact without sending the order."**
- [x] In scope / out of scope — listed in §3.
- [x] Success criteria — see §4 completion evidence.
- [x] No adjacent polish bundled.

#### Harness and WIP
- [x] Current Active Work reviewed; WIP=1 respected.
- [x] Active Work row planned with behavior, state, evidence, files.
- [x] Task Contract planned (cross-component).

#### Ownership and Integration
- [x] Primary ownership area: **new brokerage vertical** `src/lib/brokerage/` + sidecar account endpoints + `src/app/api/brokerage/*` + `src/app/components/sidebar/panels/AccountPanel.tsx` + chart overlay wiring.
- [x] Architecture review applicability decided: **Required** (see above).
- [x] Closest architecture docs: `src/lib/marketData/ARCHITECTURE.md` (sidecar contract — must be updated to add the brokerage read-only section), `src/lib/design-system/ARCHITECTURE.md` (panel chrome), `docs/ai-tools-architecture.md` (if AI account tools added later — out of scope v1).
- [x] Plugs into existing foundation: TWS sidecar single-IB-worker-thread + priority queue, `SidebarPanelShell`, `SidebarPanelId` union, `Edge*` design primitives, `priceAxisAnnotations.ts` engine, `MarketDataProvider` coordinator pattern (mirrored as `AccountProvider`).
- [x] Package vs app boundary: new types live in `src/lib/marketData/contracts/brokerage.ts` (app-level contracts, not package public API). Chart position-marker rendering stays in `packages/chart-react/` engine (extends `priceAxisAnnotations.ts`) only if it needs engine-level support; otherwise app-level overlay via existing annotation channel. **Decision:** keep v1 position markers app-side through the existing typed overlay channel — no package change in v1.

#### Area-Specific Constraints
- **Market data features** (applies to sidecar + service layer):
  - [x] Provider-neutral routing: N/A for v1 — brokerage is TWS-only (single provider). `BrokerageService` is a thin client to the sidecar, not a multi-provider router. If a second provider (Web API) is added later, refactor into the same registry pattern as `MarketDataService`.
  - [x] Zod-validated request/response schemas — planned for all sidecar responses and API routes.
  - [x] Fallback / timeout / circuit-breaker — planned: reuse `healthGate` pattern; account stream degrades gracefully when IB Gateway down (panel shows "disconnected" state, does not crash chart).
  - [x] Source/freshness metadata exposed — `reqAccountSummary` 3-min throttle marker surfaced in UI ("updated Xm ago").
  - [x] Hot store / cache invalidation — account snapshot cached in `AccountProvider` (in-memory); invalidated on reconnect.
- **UI chrome features**:
  - [x] Uses `--edge-*` tokens and `Edge*` primitives (`SidebarPanelShell`, `EdgeButton`, etc.).
  - [x] No ad-hoc Tailwind palette / hardcoded hex.
  - [x] Loading / empty / error / disabled states defined — see §3 UX states.
- **Chart features** (position overlays):
  - [x] Uses custom Edge canvas engine — position markers rendered through the existing typed overlay/annotation channel, no TradingView/klinecharts.
  - [x] Viewport updates stay imperative — position marker updates ride the existing annotation invalidation path, not a per-tick React re-render.
- **AI tool features**: out of scope v1 (no `get_account_summary` tool). Deferred to a later phase per [docs/ai-tools-architecture.md](../../ai-tools-architecture.md).
- **Persistence features**: out of scope v1 — account data is ephemeral (in-memory + SSE stream), not persisted to Postgres/localStorage. No schema migration.

#### API and Data Contracts
- [x] New `/api/brokerage/*` routes validated with Zod.
- [x] Error responses do not leak internal details (reuse existing route-helper pattern).
- [x] SSR-safe: `AccountProvider` defers sidecar fetch to client mount (mirrors `MarketDataProvider`); no SSR fetch of `localhost:8765`.
- [x] Optional-service fallback: when the sidecar is unreachable, panel shows an error/retry state; rest of app unaffected.

#### Verification
- [x] Completion evidence defined before implementation — §4.
- [x] Focused tests planned per layer — §4.
- [x] Build tier included (new routes + new vertical + sidebar registry change).
- [x] App-level verification planned (live IB Gateway connected).

#### Documentation
- [x] Closest architecture doc update planned: `src/lib/marketData/ARCHITECTURE.md` (new "Brokerage / account tracking" section clarifying it is read-only w.r.t. mutations and separate from market-data routing).
- [x] `docs/PROJECT-STATUS.md` harness update planned — §5.
- [x] No duplicate docs with suffixes.

### Testing and verification (testing-verification-checklist.md)

- [x] Evidence defined before implementation — §4.
- [x] Evidence matches Definition of Done.
- [x] Work not marked **Passing** until evidence passes.
- Tier selection (see §4): **Focused** + **Build** + **App-level** + **Full** (multiple ownership areas + package-adjacent + new API vertical + live sidecar).

---

## 3. Proposed Plan

### Decisions locked from research

| Decision | Choice | Rationale |
|---|---|---|
| Realtime transport | TWS socket via `ib_insync` sidecar (existing) | Already running; sub-second push via `reqAccountUpdates`/`reqPnL`/`openOrder` events |
| Web API (Client Portal) | **Out of scope** v1 | Requires second gateway process; allocation + `/pa/performance` deferred |
| Account model | Single account (first managed account) | User-selected; FA switcher deferred |
| Brokerage posture | Read-only — `whatIfOrder` preview only, **no `placeOrder`** | Honors existing read-only contract; no account mutation |
| `TWS_READONLY` flag | Keep `true` for Phase 1+2 | Positions/summary/PnL/executions all readable readonly. What-if preview requires `TWS_READONLY=false`; keep the rest on the readonly connection |
| Vertical placement | New `src/lib/brokerage/` (not under `marketData/`) | Clean separation; brokerage ≠ market data routing |

### Phase 1 — Sidecar account endpoints (Python)

Extend `services/tws-sidecar/main.py` on the existing single-IB-worker-thread + priority queue. All account calls serialized via `run_on_ib_thread`.

**New subscriptions (open on connect):**
- `reqManagedAccts()` → cache account id list.
- `ib.client.reqAccountUpdates(True, account)` → maintain per-position portfolio cache (`marketPrice`, `marketValue`, `averageCost`, `unrealizedPNL`, `realizedPNL`) + per-currency `updateAccountValue` cache without blocking the single IB worker on live/read-only Gateway sessions.
- `reqPnL(account)` → latest `dailyPnL` / `unrealizedPnL` / `realizedPnL` push.
- `reqOpenOrders()` + `openOrder`/`orderStatus`/`execDetails`/`commissionReport` events → live orders/fills cache when `TWS_READONLY=false`; skip open-order snapshots when `TWS_READONLY=true` because IB Gateway returns read-only API error 321 and the sync wrapper can hang.

**New HTTP endpoints (mirror existing `/candles`, `/quotes` style):**
- `GET /account/status` — connection state + managed accounts + last summary refresh time.
- `GET /account/summary` — cached `reqAccountSummary("All", AllTags)` result with `updatedAt` marker (3-min throttle respected; do NOT subscribe twice).
- `GET /account/positions` — merge `reqPositions()` (contract/qty/avgCost) with `reqAccountUpdates` portfolio cache (mktPrice/mktValue/PnL).
- `GET /account/pnl` — latest `reqPnL` snapshot.
- `GET /account/orders` — `reqOpenOrders()` snapshot + live status when `TWS_READONLY=false`; returns cached/empty orders in read-only mode.
- `GET /account/trades` — `reqExecutions()` + commissions (today + recent).
- `POST /account/whatif` — `whatIfOrder(order)` → `OrderState` (initMarginChange, maintMarginChange, commission). **No transmit.** Gated by `TWS_READONLY=false`.
- `GET /stream/account` — SSE pushing deltas: `updatePortfolio`, `pnl`, `orderStatus`, `execDetails` (matches existing `/stream/quotes` pattern).

**Throttle discipline:**
- One `reqAccountSummary` subscription, refresh marker every 3 min (do not re-subscribe).
- `reqAccountUpdates` + `reqPnL` are sub-second push — primary realtime source.
- `reqPnLSingle(account, conid)` subscribed on demand for the active chart symbol only.

**Env additions (sidecar reads same `.env.local`):**
- `TWS_ACCOUNT_ID=` (optional — defaults to first managed account).

### Phase 2 — Node contracts + service + API routes

**Contracts** — `src/lib/marketData/contracts/brokerage.ts` (app-level, not package export):
- `AccountSummary` (NetLiq, BuyingPower, AvailableFunds, ExcessLiquidity, Cushion, InitMarginReq, MaintMarginReq, Leverage, DayTradesRemaining, GrossPositionValue, TotalCashValue, SettledCash, look-ahead margin tags) + `updatedAt`.
- `AccountPosition` (account, contract {conId,symbol,secType,currency,exchange,strike,right,expiry,multiplier}, position signed, avgCost, mktPrice, mktValue, unrealizedPnL, realizedPnL, accountName).
- `AccountPnL` (dailyPnL, unrealizedPnL, realizedPnL).
- `AccountOrder` (orderId, permId, status, action, totalQuantity, orderType, lmtPrice, auxPrice, tif, filled, remaining, avgFillPrice, lastFillPrice, whyHeld).
- `AccountExecution` (execId, time, side, shares, price, cumQuantity, avgPrice, commission, currency, realizedPNL, orderId, symbol).
- `WhatIfResult` (initMarginChange, maintMarginChange, equityWithLoanChange, commission, minCommission, maxCommission).
- Zod schemas for each, mirroring `contracts/equities.ts` patterns.

**Service** — `src/lib/brokerage/brokerageService.ts`:
- HTTP client to sidecar (mirrors `providers/tws/client.ts`), env config (`TWS_SIDECAR_URL` reuse).
- Methods: `getSummary()`, `getPositions()`, `getPnL()`, `getOrders()`, `getTrades()`, `whatIfOrder(order)`, `getStatus()`.
- Circuit breaker (`brokerageHealthGate.ts`) reusing the `healthGate` pattern — degrades gracefully.

**Stream** — `src/lib/brokerage/accountStreamSession.ts`:
- SSE consumer for `/stream/account` (mirrors `twsQuoteStreamSession.ts`).
- Emits typed deltas to subscribers.

**API routes** — `src/app/api/brokerage/`:
- `GET /api/brokerage/status`
- `GET /api/brokerage/summary`
- `GET /api/brokerage/positions`
- `GET /api/brokerage/pnl`
- `GET /api/brokerage/orders`
- `GET /api/brokerage/trades`
- `POST /api/brokerage/whatif` (Zod-validated order body; gated by `TWS_READONLY=false` at the sidecar).
- `GET /api/brokerage/stream` (SSE proxy to sidecar — matches `/api/stream/quotes` pattern).
- Each route validates with Zod, never leaks internal errors, returns `DataResult`-shaped envelope.

**Env additions** (`.env.example`):
- `TWS_ACCOUNT_ID=`

### Phase 3 — React context + Account sidebar panel

**Context** — `src/app/components/AccountProvider.tsx`:
- Mirrors `MarketDataProvider`: client-mount-only fetch, in-memory snapshot, subscribes to account stream, exposes `useAccount()` hook.
- States: `disconnected` | `connecting` | `connected` | `error`.
- Reuses `data-health` pattern for connection state registration (so Data Health can show "Account feed: connected/stale").

**Panel** — `src/app/components/sidebar/panels/AccountPanel.tsx`:
- Register in `src/app/components/sidebar/registry.tsx` with `id: "account"`, `scope: "app"`.
- Add `"account"` to `SidebarPanelId` union in `src/lib/chartConfig.ts` (and `LegacySidebarPanelId` migration if needed — none expected).
- Sections ( collapsible, `Edge*` primitives, `--edge-*` tokens):
  1. **Header** — account id, alias (if available), paper/live badge, connection chip, "updated Xm ago" for summary.
  2. **Summary tiles** — NetLiq (large) + Daily PnL ($ + %); BuyingPower · AvailableFunds · ExcessLiquidity (Cushion %); InitMargin · MaintMargin · Leverage; DayTradesRemaining.
  3. **Positions table** — Symbol · Qty (signed, red short) · AvgCost · MktPrice · MktValue · UnrealizedPnL ($+%) · RealizedPnL · %ofBook. Click row → load symbol into active chart (reuses `StockApp` symbol nav). Sort by MktValue / UnrealizedPnL. Filter long/short/all.
  4. **Open Orders + Today's Fills** — Open: Symbol · Side · Qty · Type · Limit · TIF · Status · Filled/Remaining. Fills: Symbol · Side · Qty · AvgPrice · Commission · Net · Time.

**UX states:**
- Sidecar unreachable / Gateway down → panel body shows an account connection error with retry.
- Sidecar unreachable / Gateway down → "IB Gateway not connected" + retry button (reuses `data-health` recover action).
- No positions → empty state.
- Loading → skeleton tiles.

### Phase 4 — Chart position overlays

- When active chart symbol matches a held position, render:
  - **Position badge** on price axis: qty + unrealized PnL (via existing `priceAxisAnnotations.ts`).
  - **Avg-cost line**: horizontal line at `avgCost` with PnL shading between current price and cost (via existing typed overlay/annotation channel — no engine package change in v1).
- Source: `useAccount()` filtered by active chart symbol.
- Updates ride the existing annotation invalidation path (no per-tick React re-render — honors chart engine constraint).

### Phase 5 — What-if order preview (read-only)

- A "Preview order" affordance (initially in AccountPanel or a small dialog) lets the user construct a hypothetical order (action, qty, type, limit) and call `POST /api/brokerage/whatif`.
- Result panel shows: margin impact (init/maint change), commission estimate, post-order cushion projection.
- **No submit / transmit button.** Explicit copy: "Preview only — no order is sent."
- Gated by `TWS_READONLY=false`; IB requires a non-read-only API session for what-if preview even though Edge never transmits an order.

### Phase 6 — Data Health integration + docs

- Extend `src/app/components/data-health/` to register an "Account feed" row (connected/stale/disabled) alongside TWS/IBKR.
- Update `src/lib/marketData/ARCHITECTURE.md` — new "Brokerage / account tracking" subsection clarifying:
  - Separate vertical (`src/lib/brokerage/`), not part of market-data routing.
  - Read-only w.r.t. brokerage mutations; `whatIfOrder` preview only.
  - Always attempted through the local TWS sidecar.
- Update `.env.example` with new vars + comments.
- Update `docs/PROJECT-STATUS.md` per §5.

### Out of scope (deferred)

- Order placement / execution / cancel / modify.
- Client Portal Web API (`/portfolio/*`, `/pa/performance`, `/portfolio/allocation`).
- Multi-account / FA switcher.
- AI account tools (`get_account_summary`, `get_positions` in `src/lib/ai/`).
- Persistence of account snapshots (Postgres / localStorage).
- Historical performance curves.
- Sector/industry enrichment of positions (requires Web API).

---

## 4. Verification Plan

**Completion evidence (must pass before marking Passing):**

| Tier | Command / action | When |
|---|---|---|
| **Focused** | `npm test -- --run src/lib/brokerage src/app/api/brokerage src/app/components/sidebar/panels/AccountPanel.test.tsx src/app/components/AccountProvider.test.tsx` | After each layer; unit tests for Zod contracts, service client, stream session, panel rendering, what-if route |
| **Focused** | `npm test -- --run src/lib/marketData/providers/tws services/tws-sidecar` (sidecar account-endpoint unit tests via mocked `ib_insync`) | After Phase 1 |
| **Build** | `npm run build` (new routes + new vertical + sidebar registry change) | Before app-level check |
| **Startup** | `npm run check:startup` | After harness/instruction-affecting changes |
| **App-level** | Manual flow on `localhost:3003` with IB Gateway paper/live connected: (1) Account panel opens, shows live positions/PnL/summary; (2) clicking a position loads that symbol into the chart with avg-cost line + position badge; (3) open orders + today's fills render when `TWS_READONLY=false`; (4) what-if preview shows margin/commission without transmitting when `TWS_READONLY=false`; (5) Data Health shows Account feed row; (6) sidecar unavailable shows error/retry state and rest of app unaffected | Before **Passing** |
| **Full** | `npm run check` | Pre-merge confidence (multiple ownership areas + new API vertical) |
| **Live** | `npm run tws:probe` extended with account endpoints (new probe script `npm run tws:account-probe` optional) | Confirms sidecar ↔ IB Gateway account path |

**Definition of Done mapping:**
- Focused tests pass for every new layer.
- `npm run build` passes.
- App-level live check recorded in Active Work row with concrete results (account id, position count, sample PnL, what-if output).
- Architecture review result recorded (self-review Passed, or architect-agent Passed if invoked).
- Architecture doc + `.env.example` + PROJECT-STATUS updated.

**Failure / blocker handling:**
- What-if requires `readonly=False`: gate what-if behind `TWS_READONLY=false`, ship read-only account data under `TWS_READONLY=true` first.
- If IB Gateway paper not running locally: ship Focused + Build + Startup evidence; record app-level as **Pending** with blocker "IB Gateway paper not running" (matches existing TWS rows' pattern).

---

## 5. Harness Update

### Active Work row (add as the single Active item; existing rows stay Passing/Pending)

| Feature | Behavior | State | Completion evidence / latest result | Files |
|---|---|---|---|---|
| IB account tracking | Live IB account (positions, PnL, summary, orders, fills, what-if preview) in Account sidebar panel + chart position overlays; read-only w.r.t. brokerage mutations | **Active** | *(pending — Phase 1 sidecar endpoints)* | `services/tws-sidecar/main.py`, `src/lib/brokerage/`, `src/lib/marketData/contracts/brokerage.ts`, `src/app/api/brokerage/`, `src/app/components/AccountProvider.tsx`, `src/app/components/sidebar/panels/AccountPanel.tsx`, `src/app/components/sidebar/registry.tsx`, `src/lib/chartConfig.ts`, `.env.example`, `src/lib/marketData/ARCHITECTURE.md` |

### Task Contract (create — cross-component, long-running)

```
## Task Contract — IB account tracking

- **Status:** Active — started 2026-06-30.
- **Goal:** Live IB account data (positions, PnL, summary, orders, executions, what-if preview) in an Account sidebar panel + chart position overlays; read-only w.r.t. brokerage mutations; TWS sidecar realtime via reqAccountUpdates/reqPnL/openOrder events.
- **Delivered:** (populated per phase)
- **Verification:** Focused (brokerage contracts + service + stream + panel + what-if route) + Build + Startup + App-level (live IB Gateway paper) + Full — see §4.
- **Blockers:** none yet.
- **Out of scope:** order placement/execution, Client Portal Web API, multi-account, AI account tools, persistence, historical performance.
```

### Session Log entry

Append on each verification checkpoint:

```
### 2026-06-30 — IB account tracking

- **Goal:** Pull live IB account data via TWS sidecar; surface in Account panel + chart overlays; read-only what-if preview.
- **Completed:** (per phase)
- **Verification run:** (Focused N tests / Build / Startup / App-level results)
- **Next best step:** (next phase or app-level walkthrough)
- **Known blockers:** (none / IB Gateway paper not running / whatIfOrder readonly ambiguity)
```

### Current Verified State block (after completion)

```
- **Current task:** IB account tracking — live account panel + chart position overlays + read-only what-if preview.
- **State:** Passing | Pending (app-level) | Active
- **Latest verification:** Focused: N tests; Build: npm run build passed; Startup: check:startup passed (26); App-level: <results>; Full: npm run check passed; Architecture review: self-review Passed.
- **Evidence:** <primary paths>
- **Current blocker:** none | IB Gateway paper not running for live probe
- **Next best step:** <app-level walkthrough or next deferred phase>
- **Last updated:** 2026-06-30
```

### Architecture doc update

- `src/lib/marketData/ARCHITECTURE.md` — add "Brokerage / account tracking" subsection (separate vertical, read-only posture, gating flag, sidecar endpoint inventory).
- `.env.example` — `TWS_ACCOUNT_ID` with comments.
- `docs/PROJECT-STATUS.md` — Active Work row + Task Contract + Session Log + Current Verified State.

---

## 6. Implementation sequencing (suggested)

1. **Phase 1** — Sidecar endpoints + subscriptions (Python, mocked `ib_insync` tests). Evidence: Focused sidecar tests.
2. **Phase 2** — Node contracts + `BrokerageService` + API routes + stream session. Evidence: Focused brokerage tests + Build.
3. **Phase 3** — `AccountProvider` + `AccountPanel` + sidebar registry. Evidence: Focused panel tests + Build + Startup.
4. **Phase 4** — Chart position overlays. Evidence: Focused overlay tests + App-level (live).
5. **Phase 5** — What-if preview. Evidence: Focused what-if route test + App-level (live, no transmit).
6. **Phase 6** — Data Health integration + doc updates + Full `npm run check`. Evidence: Full + Architecture review Passed.

Each phase keeps the Active Work row as the single **Active** item; state transitions Pending → Active → Passing per Definition of Done.
