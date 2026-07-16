# Trading Execution Roadmap

Single roadmap for **placing and managing stock orders** through Interactive Brokers (first broker), with a broker-neutral foundation for multiple brokers and multiple accounts per broker. Excludes options execution, bracket/OCO orders, and trade ticket UI in early phases.

**Last updated:** 2026-07-13

**Current focus:** Trade execution reliability track **Passing** (2026-07-13). Phases 0–5 code + API bake complete; operational cleanup and feature backlog remain — see [LLM handoff](#trade-execution-reliability-track--llm-handoff) below.

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

References: [ib-api-account-data.md](../ib-api-account-data.md), [account-tracking-plan.md](../plans/archive/account-tracking-plan.md), `src/lib/tradingSafety/tradingReadiness.ts`.

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

Execute **one phase at a time** (WIP=1). Each phase gets focused tests, build when touching shared wiring, and an Active Work row in [PROJECT-STATUS.md](../PROJECT-STATUS.md) before implementation.

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

## Trade Execution Reliability Track — LLM Handoff

**Track status:** **Passing** (2026-07-13) — all five plan phases completed with quoted evidence in [PROJECT-STATUS.md](../PROJECT-STATUS.md) Current Verified State and Active Work row. **Operational items remain** (resting live order, RTH fill proof, UI walkthrough).

**Plan reference:** `.cursor/plans/trade_execution_reliability_9e20fbfb.plan.md` (do not edit; execution record lives here and in harness).

### What was done

| Phase | Goal | Result | Key evidence |
|-------|------|--------|--------------|
| 1 — Ops | Dual Gateway + 2FA + `TWS_READONLY=false` | **Done** | Both containers up (`4002` paper, `4001` live); sidecar `connections.ib-paper` + `ib-live` `gatewayConnected: true` |
| 2 — Paper bake | LMT/STP/cancel/idempotency/kill switch | **Done** | LMT `orderId=24` `permId=438990727` cancel `Cancelled`; STP `12`/`16` cancelled; idempotency `24==24`; kill switch blocked preview |
| 3 — Recovery | Gateway failure + reconnect proof | **Done** (partial UI) | `docker stop edge-ib-gateway-paper` → degraded; gateway restart + sidecar reconnect → both sockets healthy; **Reconnect TWS** UI blocked in dev when port `8765` owned by another instance |
| 4 — Postgres intents | Durable idempotency across Next restart | **Done** | Migration `0005_order_intents.sql`; restart resubmit same key → `orderId=31` (no duplicate) |
| 5 — Live bake | Preview + far LMT + 1-share order | **Done** (fill deferred) | Live `U25026894` LMT `orderId=9` `permId=703230888`; GTC 1-share SPY `orderId=15` `permId=703230889` `orderRef=edge-intent-c8d60b75-cc16-4e71-8193-a1cf1f56140c` @ limit **650** resting |

### Engineering changes shipped (2026-07-13)

| Change | Files |
|--------|-------|
| After-hours pre-trade readiness — stale quote only blocks when age exceeds threshold; fresh fetch timestamps on account/quote | `src/lib/marketData/trust/dataTrust.ts`, `src/lib/trading/tradingService.ts` |
| Postgres-backed intent store; async `resolveServerIntentStore()` (Postgres when `DATABASE_URL`, else memory) | `src/db/migrations/0005_order_intents.sql`, `src/db/schema.ts`, `src/lib/persistence/repositories/intentRepository.ts`, `src/lib/trading/postgresIntentStore.ts`, `src/lib/trading/intentStore.ts`, `src/lib/persistence/repositories/appUserRepository.ts` (`ensureDevAppUser`) |
| Dev sidecar handoff | `.env.local`: `TWS_MANAGED=external` (standalone sidecar does not fight dev-managed spawn) |

**Verification (last run):** `npm test -- --run src/lib/trading/` → `Test Files 13 passed (13)`, `Tests 61 passed (61)`; `npm run build` passed.

### Runtime setup (next session)

```bash
# 1. Gateways (Docker preferred)
npm run ib:gateway:up          # paper :4002, live :4001 — approve live 2FA on IBKR Mobile

# 2. Postgres (if not already up)
npm run db:up && npm run db:migrate

# 3. Sidecar — separate terminal (required with TWS_MANAGED=external)
npm run tws:sidecar            # :8765

# 4. App
npm run dev                    # :3003
```

**Required `.env.local` keys:**

| Variable | Value | Notes |
|----------|-------|-------|
| `TWS_ENABLED` | `true` | |
| `TWS_READONLY` | `false` | Required for preview/place/cancel |
| `TWS_MANAGED` | `external` | When sidecar run via `npm run tws:sidecar` |
| `DATABASE_URL` | `postgres://...` | Enables Postgres intent store |
| `EDGE_AUTH_SECRET` | set | Dev auth |
| `EDGE_TRADING_KILL_SWITCH` | unset or `false` | Was tested; remove after test |

**Sanity curls:**

```bash
curl -s http://127.0.0.1:8765/status | jq '.connections'
curl -s 'http://127.0.0.1:8765/account/status?connectionId=ib-paper'  # e.g. DUP586813
curl -s 'http://127.0.0.1:8765/account/status?connectionId=ib-live'   # e.g. U25026894
```

**Account ids from bake session:** paper `DUP586813`, live `U25026894` (verify via curls above — ids are account-specific).

### Open items (pick up here)

Priority order for the next agent or developer:

1. ~~**Resting live GTC**~~ — **Cancelled 2026-07-13.** `DELETE /trading/orders/15?connectionId=ib-live` → detail quirk `Order 15 not found after cancel`; `GET /account/orders?connectionId=ib-live` → `orders: []`.
2. **UI walkthrough (in progress)** — Manual UI pass: `/chart` → header account picker → Trade ticket → Account **Open orders** cancel → journal **View in journal** (if fill). Prefer paper far LMT off-hours. Record orderIds in harness.
3. **Live 1-share fill proof** — During **RTH**: place **MKT** qty 1 on live with `liveConfirmation: LIVE`, confirm fill in Account **Today's fills** + journal `orderRef` correlation. If closed, use marketable **GTC Limit** (document resting state).
4. **Live 2FA** — Re-approve on IBKR Mobile after `edge-ib-gateway-live` container restarts.
5. **Paper MKT fill + journal** — If off-hours blocked paper MKT fill during bake, repeat in RTH for journal `orderRef` proof.
6. **Reconnect TWS full UI walkthrough** — Only reproducible when sidecar port ownership is clean (single dev instance owns `8765`); partial evidence already recorded.

### Known limitations / gotchas

- **Dev port conflict:** In-app **Reconnect TWS** (`data-health-recover-tws`) can fail when port `8765` is owned by another dev/sidecar instance. Workaround: restart sidecar standalone + `TWS_MANAGED=external`.
- **Live cancel "not found":** Far LMT `orderId=9` cancel returned `Order 9 not found after cancel` — order may have already cleared; not a blocker.
- **No outside-RTH UI:** Trade ticket forces `outsideRth: false`; GTC at next open is the closed-market path (by design for this track).
- **TWS recovery Task Contract** in harness still mentions "walkthrough pending" in prose — Active Work row is **Passing** with partial dev evidence.

### Feature backlog (explicit non-goals of reliability track)

Do **not** start until operational items above are closed or explicitly deferred by user:

| Item | Notes |
|------|-------|
| Brackets / OCO / trailing stops | After single-leg lifecycle stable |
| Options execution | Separate contract model |
| Outside-RTH UI toggle | Only if GTC path unacceptable |
| Second real broker adapter | Stub exists; not wired in UI |
| Account tracking app-level walkthrough | Parallel track; see `account-tracking-plan.md` |

### Related docs

- Harness: [PROJECT-STATUS.md](../PROJECT-STATUS.md) — Current Verified State, Active Work row, Session Log 2026-07-13
- Architecture: [src/lib/trading/ARCHITECTURE.md](../../src/lib/trading/ARCHITECTURE.md) — Postgres intents, readiness, dual connection
- Dual Gateway ops: [dual-connection-roadmap.md](./dual-connection-roadmap.md)
- IB account data: [ib-api-account-data.md](../ib-api-account-data.md)

---

## Next Session Entry Point

**Start here:** [Trade Execution Reliability Track — LLM Handoff](#trade-execution-reliability-track--llm-handoff) above.

**Immediate actions:** (1) UI walkthrough via Trade sidebar panel (header or position drawing **Trade setup…**); (2) live 1-share MKT fill during RTH for journal proof. **Drawing-bound Trade panel shipped** — entry-only MKT/LMT with live plan sync; brackets still backlog (WIP=1).
