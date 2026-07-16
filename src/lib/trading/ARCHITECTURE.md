# Trading Execution Architecture

Broker-neutral order placement layer for Edge. Phase 5 adds connection registry, dual paper/live Gateway routing, global header account picker, and stepped live confirmation on top of Phase 4 UI + journal + AI tools.

## Separation from Brokerage

| Layer | Path | Responsibility |
|-------|------|----------------|
| Read-only account | `src/lib/brokerage/` | Positions, summary, PnL, stream, what-if (legacy preview route) |
| Execution commands | `src/lib/trading/` | Preview, submit, modify, cancel with intent tracking |

`BrokerageService` must not place or cancel orders. All mutations go through `TradingService`.

## Module Layout

```
src/lib/trading/
  types.ts              # TradingAccount, OrderDraft, OrderModifyPatch, OrderIntent
  connectionRegistry.ts # ib-paper / ib-live → port + adapter dispatch
  tradingEnvironment.ts # edge:trading:environment localStorage
  validateOrder.ts      # Zod + connection gate + kill switch + live confirm
  safetyGuards.ts       # Short-sale block, PDT warnings
  auditLog.ts           # Append-only in-memory audit ring
  ports.ts              # BrokerTradingPort interface
  adapters/
    ibTws.ts            # IbTwsTradingAdapter → sidecar /trading/* + /account/*
    stub.ts             # StubTradingAdapter (registry test surface)
  intentStore.ts        # Idempotency + orderRef (`edge-intent-{intentId}`)
  activeAccount.ts      # localStorage active account + resolveTradingAccountId
  accountAliases.ts     # edge:trading:accountAliases.v1 display-name overlay
  accountPickerOptions.ts # Composite picker keys; offline live seed labels; legacy journal rematch
  reconcile.ts          # Lost-response recovery via orderRef / permId
  tradingService.ts     # Readiness → preview/submit/modify/cancel orchestration
  routeHelpers.ts       # API error mapping
  positionTradeSetup.ts # Live entry/stop/target from position drawing points (ignores stale riskSetup metadata)
  tradingClient.ts      # Browser fetch wrappers for /api/trading/*
  orderStatus.ts        # Open vs terminal status; Cancel only for open orders

src/app/components/trading/
  TradeSetupBindingContext.tsx  # { cellId, drawingId } bind + live levels feed from ChartCell
  TradeOrderForm.tsx              # Shared preview/confirm/submit form (MKT default; plan risk display)
  TradeTicketModal.tsx            # Modal wrapper (tests); primary UX is Trade sidebar panel

src/app/components/sidebar/panels/
  TradeSidebarPanel.tsx           # Docked Trade panel; drawing-bound or header-open unbound ticket

src/app/components/chart-cell/
  overlayContextMenu.ts           # buildOverlayContextMenuItems (+ Trade setup… for position drawings)

src/app/components/home/
  AppTopHeader.tsx      # Global account picker (Gateway paper/live + offline live seed); composite connectionId::accountId keys; dropdown includes settings rail for display names
  AccountPickerMenu.tsx # Custom account dropdown with right-side settings rail
  AccountAliasEditor.tsx # Display-name editor panel inside picker dropdown

src/app/components/
  AccountAliasesProvider.tsx # React context for alias map + displayNameFor()

src/lib/brokerage/
  filterOrders.ts       # filterOrdersByAccount helper (stream + REST)
```

## Account scoping matrix

| Surface | Scoped to active account? | Mechanism |
|---------|---------------------------|-----------|
| Header picker | Sets full `TradingAccount` | `edge:trading:activeAccount` localStorage |
| Trade ticket / order cancel | Yes (online Gateway only) | `activeTradingAccount` + `isGatewayTradingAccount` |
| AccountPanel orders | Yes — Open = working only; History = all session orders | `filterOrdersByAccount` + `filterOpenOrders` / history tab |
| Brokerage snapshot (positions, summary, PnL) | Environment only | Sidecar `reqAccountUpdates` per connection |
| Journal trades/stats | Yes | `filterTradesByAccount` via fill `account` + `JournalTradesProvider` under `AccountProvider` |

Picker shows Gateway-discovered paper/live accounts only. When live discovery fails, `TWS_LIVE_ACCOUNT_ID` seeds one offline live row (`availability: offline`, label `(live, offline)`) for journal filter — trading remains disabled. Legacy `connectionId: journal` selections remap to gateway/offline live by `accountId` on load.

**Display aliases:** User-defined labels live in `edge:trading:accountAliases.v1` (keyed by `connectionId::accountId`). IB `accountId` remains the execution identity for orders, intents, and journal filters. UI surfaces (header picker, Account panel title, Trade form account row, Data Health account line) resolve display text via `resolveAccountDisplayName` / `AccountAliasesProvider.displayNameFor`. Configure aliases from the settings rail inside the header account picker dropdown (gear on the right).

API routes: `src/app/api/trading/{accounts,preview,orders,orders/[orderId]}`.

Brokerage snapshot/stream accept `?environment=paper|live` and route to the matching sidecar `connectionId`.

## Data Flow

```
/api/trading/*
  → TradingService
      → kill switch + evaluateTradingReadiness + safetyGuards (preview/submit)
      → connectionRegistry → IbTwsTradingAdapter(connectionId)
      → OrderIntentStore (idempotency)
          → TWS sidecar (per connectionId)
              POST /account/whatif?connectionId=
              POST /trading/orders  { connectionId }
              PATCH /trading/orders/{id}
              DELETE /trading/orders/{id}?connectionId=
              GET /account/*?connectionId=
```

Market-data routes on the sidecar accept optional `connectionId` on `/candles`, `/quotes`, `/warmup`, and `/stream/quotes`. Display preference is persisted separately at `edge:marketData:connectionId` (header chip in `AppTopHeader`); order routing and brokerage still follow `edge:trading:activeAccount`.

**Live account panel:** paper uses SSE via `/stream/account`; live uses a 15s poll in `AccountProvider` (labeled in Account panel).

## Connection registry (Phase 5)

| connectionId | environment | Default port | client id env |
|--------------|-------------|--------------|---------------|
| `ib-paper` | paper | `TWS_PAPER_PORT` / `TWS_PORT` (4002) | `TWS_PAPER_CLIENT_ID` / `TWS_CLIENT_ID` |
| `ib-live` | live | `TWS_LIVE_PORT` (4001) | `TWS_LIVE_CLIENT_ID` |

`StubTradingAdapter` (`broker: "stub"`) proves multi-adapter dispatch; not exposed in UI.

## Paper / live mode (Phase 5)

- **Account-as-context.** Selecting an account in `AppTopHeader` persists `edge:trading:activeAccount` and sets `edge:trading:environment` from that account’s `environment` field.
- **Trade sidebar panel + Account panel** display the globally selected account only — no Paper/Live toggle or account picker in those surfaces.
- **Live submit gate:** `liveConfirmation: "LIVE"` required server-side on submit/cancel/modify when `environment === "live"`.
- **Kill switch** (`EDGE_TRADING_KILL_SWITCH`) remains operator emergency stop — not the normal mode control.
- **`TWS_READONLY=false`** still required for mutations on any connection.

## Drawing-bound trade setup (v1)

- **Bind key:** `{ cellId, drawingId }` — only the origin long/short position drawing updates the panel.
- **Context menu:** Right-click position drawing → **Trade setup…** opens docked `trade` sidebar panel.
- **Live sync:** `ChartCell` re-reads `serializeDrawings()` on overlay change; levels derived from live points via `positionOrderLevelsFromDrawing` (not stale `metadata.fields.riskSetup`).
- **Entry-only submit:** Default **MKT**; stop/TP shown as plan (preview what-if margin on confirm). Brackets deferred.
- **Header Trade:** Opens same panel unbound (generic ticket for active chart symbol).

## Order Types (Phase 3+)

| Edge `orderType` | IB mapping | Required prices |
|------------------|------------|-----------------|
| `MKT` | MarketOrder | — |
| `LMT` | LimitOrder | `limitPrice` |
| `STP` | StopOrder | `stopPrice` → `auxPrice` |
| `STP LMT` | StopLimitOrder | `stopPrice` + `limitPrice` |

`outsideRth` defaults **false** on all drafts.

## Intent Lifecycle

| Status | Meaning |
|--------|---------|
| `draft` | Created, not yet previewed |
| `previewed` | What-if completed |
| `submitted` | `placeOrder` returned `orderId` / `permId` (or reconciled) |
| `cancelled` | Cancel confirmed |
| `failed` | Place threw and reconciler found no broker match |

Preview expiry: submit with `previewIntentId` must be within **30s** (`PREVIEW_INTENT_MAX_AGE_MS`).

## Safety (Phase 3+)

| Guard | Behavior |
|-------|----------|
| Readiness | TWS quote ≤ 5s, account ≤ 30s, risk sizing resolved |
| Short-sale | Hard block: `SELL` qty > long position for symbol |
| PDT | Soft warning on preview when `DayTradesRemaining` ≤ 0 |
| Kill switch | `EDGE_TRADING_KILL_SWITCH=true` blocks all mutations (503) |
| Live confirm | `liveConfirmation: "LIVE"` on live mutations |
| Audit log | In-memory ring (500 entries) on preview/submit/modify/cancel/block |

## Journal Correlation

Outbound `orderRef` is `edge-intent-{intentId}`. See `correlateOrderRef.ts`.

## AI Trading Tools (Phase 4+)

| Tool | Permission | Confirmation | Notes |
|------|------------|--------------|-------|
| `preview_order` | write | no | Respects `environment` input (default paper) |
| `place_order` | destructive | **yes** | Requires `previewIntentId`; live needs `liveConfirmation` |

## Verification

```bash
npm test -- --run src/lib/trading/
npm test -- --run src/app/components/trading/
npm test -- --run src/app/api/trading/
npm test -- --run src/lib/ai/tools/trading.test.ts
npm test -- --run src/app/components/sidebar/panels/AccountPanel.test.tsx
cd services/tws-sidecar && python -m unittest test_main.py
npm run build
```

## Post–Phase 5 backlog (not shipped)

- Options execution, brackets, OCO
- Second real broker adapter (beyond stub)

**Shipped 2026-07-13:** Postgres-backed `order_intents` table + `resolveServerIntentStore()` when `DATABASE_URL` is set. Handoff for open operational items: [docs/roadmaps/trading-execution-roadmap.md](../../../docs/roadmaps/trading-execution-roadmap.md#trade-execution-reliability-track--llm-handoff).

## Dual connection (Phases A–D)

Phases A–C shipped: Docker paper+live Gateways, honest account discovery, decoupled chart data preference from order account. Phase D hardens TWS-only preference threading and splits Data Health into paper socket, live socket, and active data preference. Full track: [docs/roadmaps/dual-connection-roadmap.md](../../../docs/roadmaps/dual-connection-roadmap.md).

### Submit readiness vs display data

Chart and watchlist meta (`usage: display`) never authorizes order submit. `TradingService.assertPreTrade` fetches a fresh quote via the **order** environment's TWS connection, then `evaluateTradingReadiness` applies `trading_decision` trust policy — only TWS/IBKR sources pass; Yahoo, mixed, and other display-only sources block submit.

## Local dual Gateway (Phase A infra)

Run paper (4002) and live (4001) IB Gateways simultaneously for connection registry testing.

**Docker (preferred):** `services/ib-gateway/docker-compose.yml` — `ghcr.io/gnzsnz/ib-gateway:stable`, `TRADING_MODE=both`. Copy `services/ib-gateway/.env.example` → `.env`, set live + paper credentials, then `npm run ib:gateway:up`. Complete 2FA via VNC at `localhost:5900`. Stop desktop Gateway first if ports conflict.

**Scripts:** `npm run ib:gateway:up` / `npm run ib:gateway:down`

**Sidecar proof:** After both ports listen, restart `npm run tws:sidecar` and curl `/account/status?connectionId=ib-paper` vs `ib-live` — managed account ids must differ.

**Desktop fallback:** Two IB Gateway processes (live 4001, paper 4002); same sidecar env (`TWS_PAPER_PORT`, `TWS_LIVE_PORT`).

Full ops: [docs/roadmaps/dual-connection-roadmap.md](../../../docs/roadmaps/dual-connection-roadmap.md) Phase A.
