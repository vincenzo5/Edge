# Trading Execution Roadmap

Single roadmap for **placing and managing stock orders** through Interactive Brokers (first broker), with a broker-neutral foundation for multiple brokers and multiple accounts per broker. Excludes options execution, bracket/OCO orders, and trade ticket UI in early phases.

**Last updated:** 2026-07-08

**Current focus:** Phase 5 **Passing** — connection registry + in-app paper/live switch.

**Phase 5 passed 2026-07-08** — registry (`ib-paper`/`ib-live`), dual sidecar sockets, Paper/Live UI toggle, `liveConfirmation: LIVE` gate.

**Phase 4 passed 2026-07-08** — chart trade ticket, what-if confirm modal, AccountPanel cancel, journal orderRef correlation, AI `preview_order`/`place_order`.

**Phase 3 passed 2026-07-08** — STP/STP LMT orders, preview expiry (30s), short-sale block, PDT warnings, kill switch, audit log.

**Phase 2 passed 2026-07-08** — modify MKT/LMT, active account selection, account-scoped orders, lost-response reconciler.

**Phase 1 passed 2026-07-08** — `TradingService`, `IbTwsTradingAdapter`, `/api/trading/*` on paper `DUP586813`.

## Product Goal

Let Edge place and manage stock orders (market, limit, stop) on a **per-account** basis, with the same safety posture as the rest of the app: broker truth from TWS, no Yahoo fallbacks for trading decisions, explicit confirmation before live money, and durable intent tracking for idempotency and reconciliation.

Journal already ingests fills (`fillSync.ts`). Execution should link outbound orders to journal via `orderRef`.

## Verified Today vs Assumed

| Capability | Status | Notes |
|------------|--------|-------|
| Read account data (positions, summary, PnL) | **Partially verified** | TWS sidecar + Account panel; app-level walkthrough still pending |
| What-if preview (MKT/LMT, no transmit) | **Verified on paper** | `POST /account/whatif` HTTP 200 on `DUP586813`; commission/margin null on paper cash (expected) |
| Place / cancel orders (MKT/LMT) | **Verified on paper** | `POST /trading/orders` + `DELETE /trading/orders/{id}` on port 4002; see Phase 0 evidence |
| Stop orders | **Verified on paper** | `STP` + `STP LMT` via `/api/trading/*`; `stopPrice` → IB `auxPrice` |
| Multi-account per order | **Partially implemented** | `PlaceOrderRequest.accountId` required; `_validate_account_id` enforces managed accounts |
| IB Client Portal / Web API execution | **Excluded** | TWS sidecar only; no execution adapter |

**Phase 0 passed 2026-07-08** on IB Gateway paper (`DUP586813`, port 4002). Proceed to Phase 1.

References: [ib-api-account-data.md](./ib-api-account-data.md), [account-tracking-plan.md](./account-tracking-plan.md), `src/lib/tradingSafety/tradingReadiness.ts`.

## Domain Model (4 new types)

Keep broker stream types (`AccountOrder`, `AccountExecution`) — do not duplicate.

| Type | Purpose |
|------|---------|
| `TradingAccount` | `{ broker, connectionId, accountId, environment }` — where to trade |
| `OrderDraft` | Side, qty, symbol/conId, orderType, prices, tif, orderRef — what to trade |
| `OrderPreview` | Commission, margin impact, warnings — broker what-if result |
| `OrderIntent` | Durable Edge record: intentId, idempotencyKey, status, permId link |

Order types in model: `MKT`, `LMT`, `STP`, `STP LMT`. TIF: `DAY`, `GTC`.

Planned module layout: `src/lib/trading/types.ts`, `validateOrder.ts`, `intentStore.ts`, `tradingService.ts`, `adapters/ibTws.ts`.

## Architecture

**Phase 0 (shipped)** — sidecar command path only:

```
curl / future adapter
  → services/tws-sidecar
      POST /account/whatif     (preview, transmit=false)
      POST /trading/orders     (place, transmit=true)
      DELETE /trading/orders/{orderId}
      GET /account/orders      (reconciliation)
      /stream/account          (orderStatus + fills)
```

**Phase 1+ (planned)** — app-owned trading layer:

```
API /api/trading/*
  → TradingService (readiness + preview + submit + reconcile)
  → OrderIntentStore (idempotency + audit)
  → BrokerTradingPort (listAccounts, preview, place, modify, cancel)
  → IbTwsTradingAdapter → sidecar /trading/* + /account/*
```

Read-only `BrokerageService` stays separate. Reconciliation matches `orderRef` / `permId` on account stream when submit response is lost.

### Shipped in Phase 0

| Artifact | Location |
|----------|----------|
| Paper-only gate (`TWS_PORT=4002`, `TWS_READONLY=false`) | `_require_trading_enabled()` in `main.py` |
| Explicit `accountId` on place | `PlaceOrderRequest`, `_validate_account_id()` |
| MKT/LMT order builder | `_build_stock_order()` (shared with what-if) |
| Place + cancel endpoints | `POST /trading/orders`, `DELETE /trading/orders/{order_id}` |
| Unit tests | `test_main.py` — `TradingGuardTests` (15 tests total) |

Evidence: `PROJECT-STATUS.md` Active Work row **Passing** (2026-07-08, paper `DUP586813`).

## Roadmap Phases

Execute **one phase at a time** (WIP=1). Each phase gets focused tests, build when touching shared wiring, and an Active Work row in [PROJECT-STATUS.md](./PROJECT-STATUS.md) before implementation.

### Phase 0 — Proof of life (paper IB only)

**Outcome:** Prove this stack can place and cancel at least one stock order on IB Gateway **paper** before building the full trading layer.

**Status:** **Passing** (2026-07-08).

| Step | Deliverable | Verification |
|------|-------------|--------------|
| 0.1 | Paper Gateway + env (`TWS_PORT=4002`, `TWS_READONLY=false`) | `/account/status` `readOnly: false`, `accountId: DUP586813` |
| 0.2 | What-if MKT + LMT | HTTP 200, no 403 (commission null on paper cash) |
| 0.3 | `POST /trading/orders` MKT 1-share | `orderId: 9`, `permId: 1306430087` (F BUY MKT) |
| 0.4 | `DELETE /trading/orders/10` LMT cancel | `status: "Cancelled"` (`permId: 1306430088`) |
| 0.5 | Harness evidence | `PROJECT-STATUS.md` Active Work row **Passing** |

**Out of scope for Phase 0:** UI, `OrderIntent` persistence, multi-broker, stops, Next.js API routes.

### Phase 1 — Domain + adapter foundation

**Outcome:** Broker-neutral types, `BrokerTradingPort`, `TradingService`, intent store, paper-only gates.

**Status:** **Passing** (2026-07-08).

| # | Deliverable | Touch points |
|---|-------------|--------------|
| 1.1 | `src/lib/trading/types.ts` + `validateOrder.ts` | Zod schemas (`TradingAccount`, `OrderDraft`, `OrderPreview`, `OrderIntent`) |
| 1.2 | `OrderIntentStore` — localStorage first, optional Postgres later | Idempotency dedupe |
| 1.3 | `IbTwsTradingAdapter` wrapping sidecar trade endpoints | Maps `OrderDraft` ↔ sidecar `PlaceOrderRequest` |
| 1.4 | `TradingService` — readiness → preview → submit → reconcile | Uses `tradingReadiness.ts`, `dataTrust.ts` |
| 1.5 | `/api/trading/preview`, `/api/trading/orders`, `/api/trading/accounts` | Auth + Zod |
| 1.6 | Wire cancel through adapter (sidecar endpoint already exists) | `BrokerTradingPort.cancelOrder` |

**Order types:** MKT, LMT only. **Environment:** paper only (`environment: "paper"` gate).

### Phase 2 — Manage orders + account selection

**Outcome:** Modify open orders per account; active trading account persisted in app.

**Status:** **Passing** (2026-07-08).

| # | Deliverable |
|---|-------------|
| 2.1 | Modify via `BrokerTradingPort` + sidecar `PATCH /trading/orders/{id}` |
| 2.2 | Active `TradingAccount` selection (`activeAccount.ts`, `defaultAccountId` on accounts API) |
| 2.3 | Account-scoped order list (`GET /account/orders?accountId=`, `ordersForActiveAccount` on `AccountProvider`) |
| 2.4 | Reconciler: lost-response recovery via `orderRef` / `permId` (`reconcile.ts`) |

### Phase 3 — Stop orders + safety hardening

**Status:** **Passing** (2026-07-08).

| # | Deliverable |
|---|-------------|
| 3.1 | STOP + STP LMT in draft, preview, submit |
| 3.2 | Preview expiry + re-read quote/account at submit |
| 3.3 | Short-sale guard, PDT warning, extended-hours default off |
| 3.4 | Kill switch + audit log on intents |

### Phase 4 — UI + journal wiring

**Status:** **Passing** (2026-07-08).

| # | Deliverable |
|---|-------------|
| 4.1 | Chart trade ticket (no options) |
| 4.2 | Confirm modal with what-if summary |
| 4.3 | Cancel from AccountPanel |
| 4.4 | `orderRef` → journal fill correlation |
| 4.5 | AI `place_order` tool with mandatory confirmation |

### Phase 5 — Multi-broker + runtime paper/live

**Status:** **Passing** (2026-07-08).

**Outcome:** Support more than one broker adapter and let the user switch **paper ↔ live in the app** — no `TWS_PORT` flip and no Next.js restart.

| # | Deliverable |
|---|-------------|
| 5.1 | Second adapter stub + connection registry (`TradingAccount` → adapter + Gateway connection) |
| 5.2 | In-app paper/live mode switch — UI toggle in trade ticket / account chrome; `OrderDraft.environment` routes to the correct TWS connection (paper `4002` vs live `4001`); live submits require stepped confirmation (beyond normal what-if confirm); default remains **paper** |

**Design rules (Phase 5):**

- **User mode, not env mode.** Paper vs live is a persisted in-app choice (`edge:trading:environment` or equivalent), not `TWS_PORT` on the Next.js process.
- **Sidecar routes by connection.** Registry maps `environment: "paper" | "live"` to the right Gateway socket (same sidecar process may hold both connections, or separate connection ids — implementation detail).
- **Interim safety rail (Phases 1–4).** `validateOrder` rejecting `environment: "live"` and `isPaperTradingConfigured()` were deliberate guardrails until UI existed; Phase 5 removes the schema/env **live block** and replaces it with UI + confirm gates.
- **Kill switch stays.** `EDGE_TRADING_KILL_SWITCH` remains an operator emergency stop (blocks all mutations), not the normal paper/live control.

**Out of scope for Phase 5:** IBKR Web API / Client Portal execution adapter — TWS sidecar only.

## Explicit Exclusions (v1)

| Excluded | Reason |
|----------|--------|
| Options execution | Separate contract model; journal grouping already handles OPT fills |
| Bracket / OCO / trailing stops | Complexity; add after single-leg lifecycle is stable |
| AI-initiated trades without confirmation | Violates destructive-tool policy |
| Yahoo or display-only quotes for submit | `trading_decision` policy requires TWS |
| IB Client Portal / Web API execution adapter | TWS sidecar is the only execution path |
| Env-flip to enable live (`TWS_PORT` restart) | Paper/live is an in-app mode switch (Phase 5) |

## Dependencies

- IB Gateway **paper** on port **4002** and/or **live** on **4001** — sidecar connects to whichever sockets are running; user picks mode in app (Phase 5)
- `TWS_READONLY=false` + Gateway **Read-Only API off** on the active connection for what-if, place, cancel
- Shipped: `services/tws-sidecar/` trade endpoints, `src/lib/brokerage/`, `src/lib/tradingSafety/`, journal `fillSync.ts`
- Account tracking app-level walkthrough still **Pending** — parallel, does not block Phase 5

## Next Session Entry Point

Phase 5 complete. **Next track:** [Dual Connection Roadmap](./dual-connection-roadmap.md) — Docker paper+live Gateways, honest `connectionId` discovery, remove journal-only picker rows, decouple live market-data preference from order account.

Deferred backlog (after dual connection): Postgres intent store, options execution, or brackets. App-level paper/live walkthrough still deferred on localhost:3003 until dual Gateways are up.
