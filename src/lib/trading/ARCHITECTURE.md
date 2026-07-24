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
  playbook/             # Phase 0 Manage contracts — templates, presets, pure planners (no runtime manager)
  tradingClient.ts      # Browser fetch wrappers for /api/trading/*
  orderStatus.ts        # Open vs terminal status; Cancel only for open orders

src/app/components/trading/
  TradeSetupBindingContext.tsx  # { cellId, drawingId } bind + live levels feed from ChartCell (context-menu initiated)
  TradeOrderForm.tsx              # Shared preview/confirm/submit form (MKT default; plan risk display)
  TradeTicketModal.tsx            # Modal wrapper (tests); primary UX is Trade sidebar panel

src/app/components/risk/
  RiskPositionBindingContext.tsx  # Auto-bind newest long/short on active chart → Risk Position size entry/stop (independent of Trade setup bind)

src/app/components/sidebar/panels/
  TradeSidebarPanel.tsx           # Docked Trade panel; drawing-bound or header-open unbound ticket

src/app/components/chart-cell/
  useRiskDrawingBinding.ts        # Overlay feed for RiskPositionBindingContext
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
| Brokerage snapshot (positions, summary, PnL) | Environment only | Paper (`ib-paper`): sidecar event cache via `reqAccountUpdates` + `reqPnL`. Live (`ib-live`): persistent `reqAccountUpdates` + `reqPnL` on the extra Gateway socket (not torn down each poll); positions backfill MKT/PnL via `reqMktData` when portfolio is cold; 15s client poll; no live SSE. |
| Journal trades/stats | Yes | `filterTradesByAccount` via fill `account` + `JournalTradesProvider` under `AccountProvider` |

Picker shows Gateway-discovered paper/live accounts only. When live discovery fails, `TWS_LIVE_ACCOUNT_ID` seeds one offline live row (`availability: offline`, label `(live, offline)`) for journal filter — trading remains disabled. Legacy `connectionId: journal` selections remap to gateway/offline live by `accountId` on load.

**Display aliases:** User-defined labels live in `edge:trading:accountAliases.v1` (keyed by `connectionId::accountId`). IB `accountId` remains the execution identity for orders, intents, and journal filters. Header picker labels are `Label (accountId)` — alias when set, else Paper/Live — so the IB id stays visible in parentheses. Account panel header shows alias or Live/Paper as the title with account id on the subtitle line; Trade form account row and Data Health resolve display text via `resolveAccountDisplayName` / `AccountAliasesProvider.displayNameFor`. Configure aliases from the settings rail inside the header account picker dropdown (gear on the right).

**Account panel PnL flash:** Daily and position unrealized PnL use shared `useValueFlash` (journal equity parity): green/red flash on change, 2s duration, skip first paint. Journal dashboard live positions card and Open Positions tab reuse the same snapshot feed and flash helper for per-position unrealized (display-only join via `resolveLiveUnrealizedPnL`).

**Open-risk header chrome:** When live IB `positions.length > 0`, `AppTopHeader` shows a flat open-positions status chip (`● N open · ±$unrealized`, no border-legend label) with green/red tone from unrealized P&L. The chip opens a positions popover (Close + chart load per row; **Open Account** + **Journal opens** footers). Protective OCO stays in the Account panel only. Source of truth is `AccountProvider` only — not journal open trades. Workspace registers `OpenRiskWorkspaceBridge` so Account/chart actions work from the header; off-workspace routes queue pending sidebar/symbol via `pendingWorkspaceActions`. Account rail shows a count badge; command palette entry **Open positions** when the chip is visible. Chart-native order management remains separate backlog.

API routes: `src/app/api/trading/{accounts,preview,orders,orders/[orderId]}`.

**Mutate auth (Security Phase 3):** After middleware API-key gate, `POST /orders`, `PATCH|DELETE /orders/[orderId]`, `POST /brackets`, and `POST /oco` require a persistence session cookie or `EDGE_TRADING_SERVICE_SECRET` when Postgres is configured (`tradingMutateAuth.ts`). Read routes (`GET /accounts`, `POST /preview`) and all `/api/brokerage/*` remain API-key-only. When persistence is disabled (`dev:lite`), paper mutations work with API key alone.

**Confirm policy:** AI `place_order` uses server-minted HMAC `confirmationToken` for paper and live. HTTP live mutations require `liveConfirmation: "LIVE"`; paper HTTP relies on session (or service secret) + API key — no HTTP confirm token in Phase 3.

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
- **Live submit gate:** `liveConfirmation: "LIVE"` required server-side on submit/cancel/modify when `environment === "live"`. Close-position UI confirms with a single Confirm click (token sent automatically); Trade ticket / protective OCO still ask the user to type `LIVE`.
- **Kill switch** (`EDGE_TRADING_KILL_SWITCH`) remains operator emergency stop — not the normal mode control.
- **`TWS_READONLY=false`** still required for mutations on any connection.

## Drawing-bound trade setup (v1)

- **Bind key:** `{ cellId, drawingId }` — only the origin long/short position drawing updates the panel.
- **Context menu:** Right-click position drawing → **Trade setup…** opens docked `trade` sidebar panel.
- **Live sync:** `ChartCell` re-reads `serializeDrawings()` on overlay change; levels derived from live points via `positionOrderLevelsFromDrawing` (not stale `metadata.fields.riskSetup`).
- **Bracket attach:** Trade setup can submit entry + stop + take-profit as IB bracket with OCA children (`POST /api/trading/brackets`). Fixed or trail stop leg; preview what-if on entry only.
- **Protective OCO:** Open position → Account panel **Protect with OCO** (`POST /api/trading/oco`) attaches stop + TP without a new entry.
- **Outside RTH:** Trade ticket toggle; preview + submit honor `outsideRth` (default off).
- **Header Trade:** Opens same panel unbound (generic ticket for active chart symbol).

## Order Types (Phase 3+)

| Edge `orderType` | IB mapping | Required prices |
|------------------|------------|-----------------|
| `MKT` | MarketOrder | — |
| `LMT` | LimitOrder | `limitPrice` |
| `STP` | StopOrder | `stopPrice` → `auxPrice` |
| `STP LMT` | StopLimitOrder | `stopPrice` + `limitPrice` |
| `TRAIL` | IB TRAIL | `stopPrice` (trail $) or `trailPercent` |
| `TRAIL LIMIT` | IB TRAIL LIMIT | trail amount/% + `limitPrice` offset |

`outsideRth` defaults **false** on all drafts; Trade ticket exposes toggle.

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
```

**Sidecar package (2026-07-23):** HTTP contracts unchanged; implementation is split under `services/tws-sidecar/tws_sidecar/` with a thin `main.py` facade for tests (`main._ib`, `main._account_lock`, etc.). Trading routes live in `tws_sidecar/routes/trading.py`; order builders in `tws_sidecar/trading/orders.py`.

## Post–Phase 5 depth track (Phases 6–9)

| Phase | Outcome | Status |
|-------|---------|--------|
| **6 — Outside RTH** | Trade ticket toggle; what-if + place honor flag | **Passing** |
| **7 — Brackets + OCA** | Trade setup transmits entry + stop + TP | **Passing** |
| **8 — Trailing stops** | Fixed/trail stop leg on brackets; TRAIL types in domain/sidecar | **Passing** |
| **9 — Protective OCO** | Account position → stop + TP OCO without entry | **Passing** |

Sidecar: `POST /trading/brackets`, `POST /trading/oco`. Account orders expose `parentId`, `ocaGroup`, `outsideRth`.

## Plan / Protect / Manage (Trade management)

| Layer | Meaning | Owner |
|-------|---------|-------|
| **Plan** | Pre-trade sizing + chart entry/stop/target geometry | `src/lib/risk/` + position drawings |
| **Protect** | Hard broker bracket / OCO / trail at fill or on open position | `TradingService` + sidecar |
| **Manage** | Post-fill playbook rules (BE, scale, trail) that upgrade management over time | `src/lib/trading/playbook/` + `playbookInstanceStore` |

**One-line framing:** *Protect keeps you alive; Manage runs your plan.*

Phase 0 — frozen contracts (`src/lib/trading/playbook/`): PositionPlan R lock, presets, `planPlaybookSteps`, conflict policy.

Phase 1 — attach + persist (shipped):

```
Trade ticket Manage with… picker → SubmitBracketRequest.playbookTemplateId
  → TradingService.submitBracket (after Protect place)
  → playbookInstanceStore (Postgres + memory fallback)
  → Open-risk / Account read-only status + Detach (status only; Protect untouched)
```

Phase 2 — paper manager BE + scale-out (shipped):

```
/api/cron/playbook-evaluate → runPlaybookEvaluation (paper + live when auto-manage enabled)
  → getQuotes + brokerage snapshot (position/fill/stop reconcile)
  → evaluate RuleRuntime (multipleOfR / priceCross / scaleFill)
  → TradingService.modifyOrder (BE) / submitOrder (reduceQty / attachTrail TRAIL)
  → playbookInstanceStore.patch (ruleRuntimes, stopOrderId, filledQty)
  → Open-risk / Account Pause · Resume · Skip · Detach · next-rule distance · Flatten now
```

Phase 3 — trail remainder + live gates (shipped):

```
playbookAutoManageStore (paper default on; live requires LIVE enable)
  → GET|PATCH /api/trading/playbooks/auto-manage
  → runPlaybookEvaluation gates per environment + passes liveConfirmation
  → attachTrail: cancel protective stop + submit TRAIL on remainder
  → modifyOrder stopPrice → conflictPolicy pauses conflicting BE/trail rules
```

Phase 4 — chart + protective-OCO parity (shipped):

```
ProtectiveOcoForm Manage with… → SubmitProtectiveOcoRequest playbook fields
  → TradingService.submitProtectiveOco → attachPlaybook (armed + stopOrderId + filledQty)
ChartCell playbook instances → manageLevels price-axis annotations (BE / scale markers)
Position drawing stop drag → syncPlaybookStopOnDrawingChange → modifyOrder + pause rules
Shared ManagePlaybookPicker on Trade ticket + Protect with OCO forms
```

API: `GET /api/trading/playbooks`, `POST /api/trading/playbooks/[id]/{detach,pause,resume,skip}`, `GET|PATCH /api/trading/playbooks/auto-manage` (mutate auth parity). Cron: `GET|POST /api/cron/playbook-evaluate` (cron auth; in-process TradingService).

UI copy: **Manage with…** / **Management playbook** — not bare “Playbook” (distinct from AI annotation playbooks).

Full track: [Trade Management Playbook Roadmap](../../../docs/roadmaps/trade-management-playbook-roadmap.md).

## Post–Phase 5 backlog (not shipped)

- Options execution
- Chart drag-to-modify scale-out (stop drag shipped Phase 4)
- AI bracket tool
- Second real broker adapter (beyond stub) — [Connections & Providers Roadmap](../../../docs/roadmaps/connections-providers-roadmap.md) Phase 5

**Shipped 2026-07-13:** Postgres-backed `order_intents` table + `resolveServerIntentStore()` when `DATABASE_URL` is set. Handoff for open operational items: [docs/roadmaps/trading-execution-roadmap.md](../../../docs/roadmaps/trading-execution-roadmap.md#trade-execution-reliability-track--llm-handoff).

## Dual connection (Phases A–D)

Phases A–C shipped: Docker paper+live Gateways, honest account discovery, decoupled chart data preference from order account. Phase D hardens TWS-only preference threading and splits Data Health into paper socket, live socket, and active data preference. Full track: [docs/roadmaps/dual-connection-roadmap.md](../../../docs/roadmaps/dual-connection-roadmap.md). Settings productization of paper/live controls → [Connections & Providers Roadmap](../../../docs/roadmaps/connections-providers-roadmap.md) Phase 1; contracts frozen in [`src/lib/connections/`](../connections/ARCHITECTURE.md).

### Submit readiness vs display data

Chart and watchlist meta (`usage: display`) never authorizes order submit. `TradingService.assertPreTrade` fetches a fresh quote via the **order** environment's TWS connection, then `evaluateTradingReadiness` applies `trading_decision` trust policy — only TWS/IBKR sources pass; Yahoo, mixed, and other display-only sources block submit.

**Content-timestamp gates (Phase 4):** Pre-trade quote freshness uses the provider quote's `updatedAt`/`asOf`, not the fetch/request time. Account readiness uses broker-reported account timestamps from `DATASET_POLICIES` (`account_summary.maxAgeMs`), not `preTradeFetchedAt` or other request-time substitutes.

## Local dual Gateway (Phase A infra)

Run paper (4002) and live (4001) IB Gateways simultaneously for connection registry testing.

**Docker (preferred):** `services/ib-gateway/docker-compose.yml` — separate `ib-gateway-live` + `ib-gateway-paper` (`ghcr.io/gnzsnz/ib-gateway:stable`). Copy `services/ib-gateway/.env.example` → `.env`, set live + paper credentials, then `npm run ib:gateway:up`. Complete 2FA via VNC at `localhost:5901` (live) / `localhost:5902` (paper). Weekday soft restart at 11:45 PM ET; Sunday cold restart at 08:00 ET (full 2FA). Stop desktop Gateway first if ports conflict.

**Scripts:** `npm run ib:gateway:up` / `npm run ib:gateway:down`

**Sidecar proof:** After both ports listen, restart `npm run tws:sidecar` and curl `/account/status?connectionId=ib-paper` vs `ib-live` — managed account ids must differ.

**Desktop fallback:** Two IB Gateway processes (live 4001, paper 4002); same sidecar env (`TWS_PAPER_PORT`, `TWS_LIVE_PORT`).

Full ops: [docs/roadmaps/dual-connection-roadmap.md](../../../docs/roadmaps/dual-connection-roadmap.md) Phase A.
