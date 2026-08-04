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
  auditLog.ts           # In-memory audit ring (500) + Postgres dual-write when DATABASE_URL set
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
  TradeOrderForm.tsx              # Shared preview/confirm/submit form (MKT default; compose Review)
  TradeOrderImpact.tsx            # Compose economics: notional, margin affordability, stop risk / reward / R:R
  TradeTicketModal.tsx            # Modal wrapper (tests); primary UX is Trade sidebar panel

src/lib/trading/computeOrderImpact.ts  # Pure notional + protect outcome dollars for compose Review

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
- **Environment lock** (`EDGE_TRADING_ENVIRONMENT_LOCK=paper|live`) pins each Next process to one trading environment when dev and container prod share one sidecar. Server routes reject mismatched `environment` / draft env with **403**; market-data `connectionId` stays independent (live quotes while paper trading remain valid). Sidecar lifecycle target: Compose service beside Gateways — [Persistent TWS Sidecar Roadmap](../../../docs/roadmaps/persistent-tws-sidecar-roadmap.md).
- **Sidecar connect** always uses a writable IB API session (`readonly=False`). IB Gateway **Read-Only API** (Gateway UI) remains the broker-side hard stop for what-if / place / cancel.

## Drawing-bound trade setup (v1)

- **Bind key:** `{ cellId, drawingId }` — only the origin long/short position drawing updates the panel.
- **Context menu:** Right-click position drawing → **Trade setup…** opens docked `trade` sidebar panel.
- **Live sync:** `ChartCell` re-reads `serializeDrawings()` on overlay change; levels derived from live points via `positionOrderLevelsFromDrawing` (not stale `metadata.fields.riskSetup`).
- **Bracket attach:** Trade setup can submit entry + stop + take-profit as IB bracket with OCA children (`POST /api/trading/brackets`). Fixed or trail stop leg; preview what-if on entry only.
- **Protective OCO:** Open position → Account panel **Protect with OCO** (`POST /api/trading/oco`) attaches stop + TP without a new entry.
- **Outside RTH:** Trade ticket toggle; preview + submit honor `outsideRth` (default off).
- **Header Trade:** Opens same panel unbound (generic ticket for active chart symbol). Long/short position drawings are optional — they seed entry/stop/TP and enable policy persist; **Unlink** or drawing delete falls back to manual ticket.
- **Ticket layout (compose):** TradingView-style stack — symbol row includes **Risk policy** picker (user templates; hover = recipe). `BuySellToggle`, order-type tabs, quantity, linked TP/SL editor with **per-leg Qty** plus Offset/Price/USD/%, runner strip when policy scales at TP. Time in Force + Extended hours. **Advanced** when bracket on (non-policy): stop leg + Manage preset. **Review** + side-tinted CTA → preview → confirm.
- **Bracket qty:** `BracketPlan` / `ProtectiveOcoPlan` optional `takeProfitQuantity` + `stopQuantity` (default entry qty). Split exits use IBKR OCA **reduce** when TP qty &lt; stop qty; Manage skips duplicate `reduceQty` when resting TP covers the scale rule (`restingScaleTp.ts`).

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
| Audit log | In-memory ring (500 entries) on preview/submit/modify/cancel/block; **Postgres dual-write** when `DATABASE_URL` set — see [Production observability Phase 3](../../../docs/roadmaps/production-observability-roadmap.md) |

## Journal Correlation

Outbound `orderRef` is `edge-intent-{intentId}`. See `correlateOrderRef.ts`.

## AI Trading Tools (Phase 4+)

| Tool | Permission | Confirmation | Notes |
|------|------------|--------------|-------|
| `preview_order` | write | no | Respects `environment` input (default paper) |
| `place_order` | destructive | **yes** | Requires `previewIntentId`; live needs `liveConfirmation` |
| `preview_playbook` | write | no | Pure planner — `planPlaybookSteps` from template + locked entry/stop |
| `attach_playbook` | destructive | **yes** | Routes through `TradingService.attachManagementPlaybook`; live needs `liveConfirmation` |

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

Phase 5 — template library + journal link (shipped):

```
playbookTemplateStore + playbook_templates (Postgres + memory/local fallback)
  → GET|POST /api/trading/playbooks/templates
  → PATCH|DELETE /api/trading/playbooks/templates/[id]
  → POST /api/trading/playbooks/templates/[id]/duplicate
Attach snapshots templateSnapshot on PlaybookInstance (immutable recipe for armed instances)
  → resolvePlaybookTemplateFromInstance for eval/display/manageLevels
Rule fire / detach / complete → syncManagePlaybookToJournal
  → journal_trades.manage_playbook jsonb (template name + ruleTimeline + adherence counts)
  → JournalTradeDetail Manage section (read-only)
ManagePlaybookPicker lists presets + user templates with Duplicate / Rename / Delete
```

Phase 6 — notify twin at manage levels (shipped):

```
ManagePlaybookPicker opt-in "Notify at manage levels" → playbookNotifyAtManageLevels on bracket/OCO submit
  → TradingService.attachPlaybook → buildManageNotifyAlertInputs (planPlaybookSteps price levels)
  → createAlertDefinition per level (shared bundleId; notify-only — no alert-evaluate order mutation)
  → PlaybookInstance.alertBundleId persisted (migration 0036)
Detach playbook → expireAlertsForBundleId (best-effort cleanup)
```

Phase 7 — AI playbook tools (shipped):

```
Copilot preview_playbook → TradingPort.previewPlaybook → TradingService.previewPlaybook
Copilot attach_playbook (confirm gate) → TradingPort.attachPlaybook → attachManagementPlaybook
  → playbookInstanceStore create (armed or pending_fill; idempotent by orderIntentId/orderRef)
API: POST /api/trading/playbooks/preview, POST /api/trading/playbooks/attach
```

Phase 8 — full rule editor (shipped):

```
ManagePlaybookPicker "Edit template…" for user_* templates only (builtins → Duplicate)
PlaybookTemplateEditor modal → structured when/then rule fields + requires/priority/once
  → validatePlaybookTemplateDraft (PlaybookTemplateSchema) + planPlaybookSteps preview
PATCH /api/trading/playbooks/templates/[id] accepts rules (name/description/rules)
  → playbookTemplateStore + playbook_templates.rules jsonb
Armed instances keep templateSnapshot — template edits apply to future attaches only
```

API: `GET /api/trading/playbooks`, `POST /api/trading/playbooks/preview`, `POST /api/trading/playbooks/attach`, `POST /api/trading/playbooks/[id]/{detach,pause,resume,skip}`, `GET|PATCH /api/trading/playbooks/auto-manage`, `GET|POST /api/trading/playbooks/templates`, `PATCH|DELETE /api/trading/playbooks/templates/[id]`, `POST /api/trading/playbooks/templates/[id]/duplicate` (mutate auth parity). Cron: `GET|POST /api/cron/playbook-evaluate` (cron auth; in-process TradingService).

UI copy: **Manage with…** / **Management playbook** — not bare “Playbook” (distinct from AI annotation playbooks).

Full track: [Trade Management Playbook Roadmap](../../../docs/roadmaps/trade-management-playbook-roadmap.md).

## RiskPolicy spine (Plan / Protect / Manage / Gates / Measurement)

Shared vocabulary for every risk surface — full slot taxonomies and UX-moment phases live in the [Risk Management System Roadmap](../../../docs/roadmaps/risk-management-system-roadmap.md). Persisted Zod spine + Postgres columns: `src/lib/risk/policy/` (Phase 1–3). `applyRiskPolicy` creates `planned` instances with reject/swap conflict policy; `evaluatePlaybooks` promotes due schedules and evaluates `managedApp` exits only. **Phase 4 (shipped):** Application settings **Risk policies** tab (`RiskPoliciesSection.tsx`) + sectioned `PlaybookTemplateEditor` with completeness strip; template slot PATCH via `playbookTemplateMutations.ts`. **Phase 5 (shipped):** Trade ticket seeds from planned instance with LMT default, EntrySchedule, live Protect gate, and promote/arm via `/api/trading/playbooks/apply` + `/planned`; chart Plan panel removed. **Trade apply UX (2026-08):** header policy picker + split Protect qty + runner strip; **dual-mode apply** — unbound chart ticket uses `applyPolicyToTradeDraft` (local draft); drawing-bound uses `applyRiskPolicyToBinding` on shared `drawingId`; `useTradePolicyApply` / retained `usePositionPlanPolicy`. **Trade size row (2026-08):** `TradeSizeBudgetField` (Qty + Risk %/$); policy budget via `resolvePolicyTicketBudget`; auto-bind new drawings when Trade sidebar open (`useTradeDrawingBinding`). View-only compose: `composeRiskPolicyView.ts` (Phase 9).

**One-line framing:** *Every named risk strategy is a filled RiskPolicy — not a vibe.*

| RiskPolicy slot | Primary modules | Notes |
|-----------------|-----------------|-------|
| **Budget** | `src/lib/risk/riskSettings.ts` (`resolveDollarRisk`) | `$` or `% NetLiq`; optional `periodLossCapPercent` / `openHeatCapPercent` account caps (Phase 10) |
| **Sizing** | `src/lib/risk/equityPositionSize.ts`, Trade ticket auto-qty | `stopDistance` from entry/stop + dollar risk |
| **Geometry** | `positionTradeSetup.ts`, chart-core `risk/*`, position drawings | Live points preferred; `PositionPlan` locks R at Manage attach |
| **Exits — Protect** | `bracketPlan.ts`, `TradingService` brackets/OCO/trail | `binding:restingBroker` — hard stop / TP / trail at broker |
| **Exits — Manage** | `playbook/*`, `playbookInstanceStore`, `runPlaybookEvaluation` | `binding:managedApp` — BE, scale, trail, session flatten |
| **Exits — notifyOnly** | `alerts/tradePlanAlerts.ts`, `manageNotifyAlerts.ts` | Geometry / manage-level notify — never mutates orders |
| **Gates** | `validateOrder.ts`, `safetyGuards.ts`, readiness, kill switch, `accountRiskGates.ts` | Operator kill, short block, PDT soft, live confirm; account day-loss / open-heat kill on new entries (Phase 10) |
| **Measurement** | `PositionPlan`, journal `rMultiple`, `openRiskSummary`, playbook `journalRecipe` | R lock at attach; planned risk auto-sync from PositionPlan on Manage journal sync (Phase 8) |

Plan detail: [src/lib/risk/ARCHITECTURE.md](../risk/ARCHITECTURE.md).

### ExitRule vocabulary bridge (roadmap ↔ playbook)

Manage playbook rules are ExitRules with `binding:managedApp`. Shipped `when` / `then` kinds map to the roadmap trigger/action taxonomy:

| Roadmap trigger | Playbook `when.kind` | Typical `then.kind` |
|-----------------|----------------------|---------------------|
| `priceLevel` | `priceCross` | `modifyStop`, `flatten`, `reduceQty` |
| `rMultiple` | `multipleOfR` | `modifyStop`, `reduceQty`, `attachTrail` |
| `sessionClock` | `sessionFlatten` | `flatten` |
| `event` (fill) | `scaleFill`, `protectiveFill` | `modifyStop`, `attachTrail`, `reduceQty` |

Preset completeness (12-question checklist): `playbook/presetRiskPolicy.ts` — one record per shipped `PLAYBOOK_PRESET`.

### Hybrid failure mode (Protect survives Manage / app down)

Protect orders always rest at the broker; the Manage evaluator only upgrades management over time. Policy is frozen in `playbook/conflictPolicy.ts`:

| Policy flag | Behavior |
|-------------|----------|
| `hybridProtectAtBroker` | Last broker stop / OCO / trail remains the survival layer |
| `detachKeepsProtectOrders` | Detach playbook → instance `detached`; **never** cancels Protect legs |
| `manualStopDragPausesRules` | User stop drag → pause conflicting BE/trail manage rules |

**Pause** stops Manage evaluation; it does not cancel Protect. **Detach** expires manage-notify alerts (best-effort) but leaves broker exits untouched. If Edge or Manage is down, resting Protect exits still protect the position — Manage is additive, not the primary stop.

Gap / stop-market vs stop-limit risk is acknowledged in ticket copy (Phase 7 UX); order types unchanged here.

**Phase 4 (Risk track):** Pre-submit checklist chrome on `TradeOrderForm` and `ProtectiveOcoForm` via `summarizeSubmitRiskPlan` + `SubmitRiskPlanSummary` — Budget, Size, Protect, Manage, failure-mode line; live without Protect → soft warn only.

**Phase 5 (Risk track):** Open-position Exit binding chrome on `OpenRiskPositionsMenu` and `AccountPanel` via `summarizeOpenPositionExits` + `OpenPositionExitsStrip` — Protect state from open orders (stop/trail/OCO/TP), Manage preset + next-rule distance, unprotected callout + Protect-with-OCO affordance; Detach/Pause copy clarifies Manage-only (Protect stays at broker per `detachKeepsProtectOrders`).

**Phase 6 (Risk track):** During-trade Manage progress on the same strip — next-rule distance + action preview (`formatNextManageActionPreview`), completed fired rules (`formatCompletedManageRules`), pause/conflict copy (`resolveManagePauseMessage` for manual stop drag); chart manage-level markers reuse `manageLevelsForSymbol` → `ChartCell` price-axis annotations (playbook track — no new marker work).

**Phase 7 (Risk track):** Failure-mode UX — `summarizeOpenPositionExits` warns `manage_without_protect` when active Manage (`armed` | `paused` | `pending_fill`) has no resting stop; `OpenPositionExitsStrip` shows persistent failure-mode copy when Protect attached + critical callout for Manage-without-Protect; `summarizeSubmitRiskPlan` adds gap guidance when Protect attached; `conflictPolicy.pauseAffectsProtectOrders()` documents Pause never cancels Protect (mirrors detach policy + service tests).

**Phase 8 (Risk track):** Journal Measurement loop — `journalRiskHandoff` derives USD planned risk from `PositionPlan`; `syncManagePlaybookToJournal` fill-if-empty patches `plannedRisk*` + syncs manage recipe with geometry snapshot and protect summary; attach path calls `syncPlaybookJournal`; `JournalTradeDetail` Risk policy section (Budget, R, Geometry, Protect, Manage timeline) with manual override preserved in Review.

**Phase 9 (Risk track):** Copilot RiskPolicy compose — `composeRiskPolicyView` view-only slot summary; `preview_risk_policy` AI tool returns Budget/Sizing/Geometry/Protect/Manage/Gates/Measurement; pairs with `get_risk_settings` for session Budget; tool descriptions + system prompt use RiskPolicy vocabulary.

**Phase 10 (Risk track):** Account kills — optional day-loss / open-heat caps (% NetLiq) on `RiskSettings`; `accountRiskGates` + `TradingService.assertPreTrade` fail-closed block new BUY entries; `AccountRiskGateStrip` Measurement on open-risk / Account / Risk sidebar; ticket soft-warn when next entry would breach heat; auto-flatten deferred (10.3).

UX chrome for RiskPolicy slots **shipped** in roadmap Phases 2–10 (all **Passing**): chart draw → Risk sidebar → ticket → open position → during trade → failure mode → journal → copilot → account kills.

## Post–Phase 5 backlog (not shipped)

- Options execution
- Chart drag-to-modify scale-out (stop drag shipped Phase 4)
- AI bracket tool
- Second real broker adapter (beyond stub) — [Connections & Providers Roadmap](../../../docs/roadmaps/connections-providers-roadmap.md) Phase 5

**Shipped 2026-07-13:** Postgres-backed `order_intents` table + `resolveServerIntentStore()` when `DATABASE_URL` is set. Handoff for open operational items: [docs/roadmaps/trading-execution-roadmap.md](../../../docs/roadmaps/trading-execution-roadmap.md#trade-execution-reliability-track--llm-handoff).

**Shipped 2026-07-24 (observability Phase 3):** Postgres-backed `trading_audit_events` dual-written from `appendAudit` when `DATABASE_URL` is set; in-memory ring retained for no-DB. Read via `GET /api/me/trading-audit` (session auth) and `npm run report:trading-audit`. Durable rows omit IB `accountId`; `detail` is redacted. Retention default 90 days (`EDGE_AUDIT_RETENTION_DAYS`).

## Dual connection (Phases A–D)

Phases A–C shipped: Docker paper+live Gateways, honest account discovery, decoupled chart data preference from order account. Phase D hardens TWS-only preference threading and splits Data Health into paper socket, live socket, and active data preference. Full track: [docs/roadmaps/dual-connection-roadmap.md](../../../docs/roadmaps/dual-connection-roadmap.md). Settings productization of paper/live controls → [Connections & Providers Roadmap](../../../docs/roadmaps/connections-providers-roadmap.md) Phase 1; contracts frozen in [`src/lib/connections/`](../connections/ARCHITECTURE.md).

### Submit readiness vs display data

Orders always route to the **selected account** (paper or live). Chart and watchlist prices are display-only and never gate submit.

`TradingService.assertPreTrade` checks brokerage connection, account snapshot freshness, and risk sizing — not market-data quotes. Missing broker prices or Yahoo/chart fallback must not block preview/submit. Ticket UI may still show estimated entry from display data; that is informational only.

**Content-timestamp gates (Phase 4):** Account readiness uses broker-reported account timestamps from `DATASET_POLICIES` (`account_summary.maxAgeMs`), not request-time substitutes.

## Local dual Gateway (Phase A infra)

Run paper (4002) and live (4001) IB Gateways simultaneously for connection registry testing.

**Docker (preferred):** `services/ib-gateway/docker-compose.yml` — separate `ib-gateway-live` + `ib-gateway-paper` (`ghcr.io/gnzsnz/ib-gateway:stable`). Copy `services/ib-gateway/.env.example` → `.env`, set live + paper credentials, then `npm run ib:gateway:up`. Complete 2FA via VNC at `localhost:5901` (live) / `localhost:5902` (paper). Weekday soft restart at 11:45 PM ET; Sunday cold restart at 08:00 ET (full 2FA). Stop desktop Gateway first if ports conflict.

**Scripts:** `npm run ib:gateway:up` / `npm run ib:gateway:down`

**Sidecar proof:** `npm run ib:gateway:up` starts Gateways and the Compose sidecar together. Emergency fallback only: `npm run tws:sidecar` (stop Compose sidecar first if port `:8765` conflicts). Then curl `/account/status?connectionId=ib-paper` vs `ib-live` — managed account ids must differ. See [Persistent TWS Sidecar Roadmap](../../../docs/roadmaps/persistent-tws-sidecar-roadmap.md).

**Desktop fallback:** Two IB Gateway processes (live 4001, paper 4002); same sidecar env (`TWS_PAPER_PORT`, `TWS_LIVE_PORT`).

Full ops: [docs/roadmaps/dual-connection-roadmap.md](../../../docs/roadmaps/dual-connection-roadmap.md) Phase A.
