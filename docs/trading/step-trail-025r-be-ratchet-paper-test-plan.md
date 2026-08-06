# Step trail 0.25R — Break-even ratchet paper test plan

**Purpose:** Prove that the real paper manage evaluator modifies a real IBKR protective stop to break-even at the first `+0.25R` milestone.

**Scope:** Design only. Execute later in a short regular-trading-hours session.

**Safety:** Paper account only. Long stock only. One share. Never enable live auto-manage. Never weaken the kill switch or trading guards.

## Intent Classification

- What: Prove the first Step trail milestone can move a paper broker stop to break-even.
- Roadmap: Trade management verification — close the live ratchet evidence gap left by the prior paper run.
- Why: The policy is not functionally proven until the broker stop itself moves.
- Branch: LIVE (secondary: DATA for quote availability only).
- Primary: Testing. Arch: Required (self-review, Passed — the plan follows the existing ticket, evaluator, persistence, and broker mutation paths without contract changes).
- Assumptions: Run during US regular trading hours with an active paper Gateway and a liquid one-cent-tick US stock. **Dual-Gateway constraint:** live Gateway owns IBKR market data; paper quotes are typically null. Manage automation prices from **live** (`ib-live`); all orders, stops, and flattens stay on **paper** (`DUP…`).

## Checklist Review

- Decision: Use **AAPL**, a **1-minute chart**, and **Size = 1**. AAPL is usually more active than F while retaining a one-cent stock tick.
- Decision: The standard path uses an eight-cent initial stop width. Its ideal break-even trigger is two cents above the locked entry.
- Decision: Recompute from the armed database row. The evaluator locks entry from the broker position `avgCost`, not necessarily the entry order's `avgFillPrice`.
- Risk: The prior F run locked `14.405603` from broker `avgCost` although the order reported `avgFillPrice=14.26`. A one-share paper average-cost adjustment can move the locked baseline away from the tape. Do not claim a two-cent market move until the post-arm values prove it.
- Risk: A very tight stop can execute before the evaluator sees the favorable quote. Use one standard attempt and at most one forced-favorable retry.
- Decision: Do not inject quotes, patch database geometry, or add production test hooks.

## Why this should hit when the old test did not

The old F trade used a locked `R_UNIT` of about `$0.4356`, so its first milestone was `$0.1089` above the locked entry and, because the locked broker average cost was above the reported fill, about `$0.2545` above the actual fill. This plan starts with an eight-cent stop width, uses a more active symbol on a one-minute chart, and rejects any armed setup whose trigger is more than five cents from the current tape. If the broker average-cost adjustment prevents that gate, the optional forced-favorable path waits until the real quote is already above the computed trigger before it attaches the existing paper playbook to a real resting stop. Both paths use the production evaluator and broker modify call.

## System behavior used by this test

- `TradeOrderForm.tsx` sends the edited stop value as the fixed bracket stop and as `playbookInitialStop`.
- A pending instance arms in `runPlaybookEvaluation.ts`. It replaces the planned entry with the broker position `avgCost` and recomputes `rUnit = abs(fillPrice - initialStop)`.
- Manage evaluation quotes always use the **live** Gateway (`resolveManageQuoteConnectionId` → `ib-live`). Paper orders, positions, and stop modifies stay on paper.
- For a long position, `stepTrailRatchet.ts` computes:

```text
R_UNIT = abs(LOCKED_ENTRY - INITIAL_STOP)
CURRENT_R = (LAST_PRICE - LOCKED_ENTRY) / R_UNIT
BE_TRIGGER = LOCKED_ENTRY + 0.25 * R_UNIT
EXPECTED_STOP_AFTER = LOCKED_ENTRY
```

- The manage worker polls in about 2 seconds while an active instance exists. Its first discovery can take up to the 15-second idle cadence.
- At or above the first milestone, the evaluator calls `TradingService.modifyOrder(..., { stopPrice: LOCKED_ENTRY })`, then persists `highestMilestoneR` and `lastAppliedStopPrice`.

## Quick math card

For a hypothetical locked F entry of exactly `$14.00`:

- Stop `$13.96`: `R=$0.04`; BE trigger `$14.01` — one cent or one tick.
- Stop `$13.92`: `R=$0.08`; BE trigger `$14.02` — two cents or two ticks.
- Stop `$13.80`: `R=$0.20`; BE trigger `$14.05` — five cents or five ticks.

The general recipe is:

```text
desired BE move $0.01 -> stop width $0.04
desired BE move $0.02 -> stop width $0.08
desired BE move $0.05 -> stop width $0.20
```

These examples use the **locked entry**, not the ticket estimate or order fill display. After arming, the database is authoritative.

## Recommended setup

- Symbol: **AAPL**. F remains a fallback only when its one-minute tape is visibly active.
- Session: US regular trading hours. Preferred window is 09:45–15:30 ET. Do not use extended hours for the primary proof.
- Monitoring: 1-minute chart plus sidecar order/quote checks. The timeframe does not change order behavior.
- Direction: Long.
- Quantity: **1 share exactly**.
- Entry: Marketable `LMT` buy at the current ask or at ask plus one cent. Do not chase more than one cent.
- Initial stop: `ENTRY_LIMIT - $0.08`, rounded to the valid one-cent tick.
- Take profit: Off.
- Policy: `Step trail 0.25R`.
- Expected ideal `R_UNIT`: about `$0.08`.
- Expected ideal `BE_TRIGGER`: locked entry plus `$0.02`.
- Expected stop after ratchet: locked entry.
- Budget: 15 minutes total. Allow 5 minutes for fill/arm and 5 minutes for the ratchet. Reserve the remainder for cleanup.

**Critical size instruction:** Selecting the policy or editing the Risk field can auto-size the ticket. After all policy, entry, and stop edits, type **`1`** into **Size → Qty**. Also set the stop leg quantity to **`1`**. Recheck both values on Preview. Do not submit any quantity that risk sizing auto-inflates.

## Execution variables

Record these values. Do not infer them later:

```text
ACCOUNT_ID=
POLICY_TEMPLATE_ID=
SYMBOL=AAPL
QTY=1
ENTRY_LIMIT=
ENTRY_ORDER_ID=
BROKER_AVG_FILL_PRICE=
LOCKED_ENTRY=
INITIAL_STOP=
R_UNIT=
BE_TRIGGER=
EXPECTED_STOP_AFTER=
STOP_ORDER_ID=
INSTANCE_ID=
QUOTE_AT_ARM=
SESSION_HIGH_AFTER_ARM=
```

## Test cases

Run the test cases in order.

### TC-PREFLIGHT — Reuse the proven paper preflight

Reuse §1 of `docs/trading/step-trail-025r-paper-functional-test-plan.md`, with these additional gates:

1. Confirm the selected account is Paper IB and the account id starts with the expected paper identifier.
2. Confirm the account is flat in AAPL and F.
3. Confirm paper auto-manage is on, paper kill is off, and live auto-manage is off.
4. Confirm current time is regular trading hours and the test symbol has a current bid and ask on the **live** feed (`connectionId=ib-live` via `/api/quotes` or sidecar `POST /quotes` with `connectionId=ib-live`). Paper quote null is expected and not a blocker when live quote is good.
5. Confirm no old armed or pending Step trail instance exists for AAPL.
6. Run the existing focused sanity tests:

```bash
cd "/Users/vincentn/TV AI"
npm test -- --run \
  src/lib/trading/playbook/stepTrailRatchet.test.ts \
  src/lib/trading/playbook/runPlaybookEvaluation.test.ts \
  src/lib/trading/manageWorker.test.ts
```

Use environment checks that print only variable names and boolean presence. Never print secret values.

Abort before ordering if any paper/live isolation, kill, auto-manage, **live** quote, account, or sidecar check fails. Do not abort solely because paper `connectionId=ib-paper` quotes are null.

### TC-ATTACH — Submit one-share stop-only bracket

1. Open AAPL on the 1-minute chart.
2. Open the Trade ticket.
3. Select `Step trail 0.25R`.
4. Select Buy and `LMT`.
5. Set the limit to current ask or ask plus `$0.01`.
6. Enable the fixed stop and set it to `ENTRY_LIMIT - $0.08`.
7. Disable take profit.
8. Set **Size → Qty = 1** and stop quantity `= 1` after all other edits.
9. Keep Extended hours off.
10. Preview. Confirm the review shows one-share entry, one-share fixed stop, no TP, and Paper.
11. Submit once.

Pass oracles:

- `POST /api/trading/brackets` returns 200 and includes a `playbookInstance`.
- The instance starts as `pending_fill` or is already `armed`.
- The sidecar shows one entry and one `STP` child. It shows no TP child.
- Entry quantity and stop quantity are both one.
- `manage_state.kind = stepTrailR` and `stepR = 0.25`.

Useful database query:

```sql
SELECT id, status, template_id, manage_state, position_plan,
       stop_order_id, take_profit_order_id, filled_qty, created_at
FROM playbook_instances
WHERE account_id = '<ACCOUNT_ID>' AND symbol = 'AAPL'
ORDER BY created_at DESC
LIMIT 1;
```

### TC-ARM — Lock actual R and apply the proximity gate

Wait up to 60 seconds for the entry fill and up to 20 seconds for the worker to arm the instance.

Read the same instance:

```sql
SELECT id, status, armed_at, filled_qty,
       (position_plan->>'entry')::numeric AS locked_entry,
       (position_plan->>'initialStop')::numeric AS initial_stop,
       (position_plan->>'rUnit')::numeric AS r_unit,
       manage_state
FROM playbook_instances
WHERE id = '<INSTANCE_ID>';
```

Compute from database values:

```text
BE_TRIGGER = LOCKED_ENTRY + 0.25 * R_UNIT
EXPECTED_STOP_AFTER = LOCKED_ENTRY
DISTANCE_FROM_TAPE = BE_TRIGGER - CURRENT_ASK
```

Pass oracles:

- Status is `armed`.
- `filled_qty = 1`.
- `R_UNIT > 0`.
- Sidecar still shows a working stop with `auxPrice ≈ INITIAL_STOP`.

Proximity gate:

- Continue to TC-BE-RATCHET only when `DISTANCE_FROM_TAPE <= $0.05`.
- If the trigger is already below the current bid, continue immediately.
- If the trigger is more than five cents above the current ask, do not wait indefinitely. Flatten this attempt and use the optional forced-favorable path.

Record both the entry order's `avgFillPrice` and the position's `avgCost`. A material difference is evidence, not a reason to rewrite the values.

### TC-BE-RATCHET — Critical broker stop modification

1. Keep the one-minute AAPL chart visible.
2. Record a real quote at or above `BE_TRIGGER`.
3. Allow up to 20 seconds for the worker's initial discovery and at least two active ticks.
4. Re-fetch the stop order from the sidecar.
5. Re-read the instance from the database.
6. If the quote stayed above the trigger for 20 seconds but no evaluation occurred, call the cron evaluator once as a watchdog and record that worker proof is inconclusive:

```bash
curl -sS -X POST http://127.0.0.1:3003/api/cron/playbook-evaluate \
  -H "x-edge-cron-secret: $EDGE_CRON_SECRET" | jq .
```

Sidecar order check:

```bash
curl -sS \
  "http://127.0.0.1:8765/account/orders?accountId=<ACCOUNT_ID>" \
  -H "Authorization: Bearer $TWS_SIDECAR_SECRET" \
  | jq '.[] | select(.orderId == <STOP_ORDER_ID>)'
```

Database oracle:

```sql
SELECT status,
       (manage_state->>'highestMilestoneR')::numeric AS highest_milestone_r,
       (manage_state->>'lastAppliedStopPrice')::numeric AS last_applied_stop_price,
       (position_plan->>'entry')::numeric AS locked_entry,
       (position_plan->>'rUnit')::numeric AS r_unit
FROM playbook_instances
WHERE id = '<INSTANCE_ID>';
```

Critical PASS requires all of:

- A real observed quote reached or exceeded `BE_TRIGGER`.
- Sidecar stop `auxPrice` is within two valid ticks of `EXPECTED_STOP_AFTER`.
- Database `lastAppliedStopPrice` is within two valid ticks of `EXPECTED_STOP_AFTER`.
- Database `highestMilestoneR >= 0.25`.
- Stop quantity remains one and the order is still a protective sell stop.

Do not accept a clean evaluator response by itself as ratchet proof.

### TC-FLATTEN — Close through managed cleanup

1. Use Open Risk → AAPL → **Flatten now**.
2. Confirm the paper flatten.
3. Wait until the broker position is zero.

Pass oracles:

- Position is flat.
- Protective stop is cancelled.
- Instance is `closed`.
- `stop_order_id` is null.
- `off_reason` is `manual_flatten` or the documented cleanup reason.
- Audit includes the correlated `exitAndCleanup` result.

### TC-TEARDOWN — Restore a safe idle state

1. Confirm no AAPL or F position remains.
2. Confirm no working AAPL or F entry, stop, or TP remains.
3. Confirm no Step trail instance remains `pending_fill`, `armed`, or `paused`.
4. Confirm `paper_kill_active=false` unless the operator intentionally left it on.
5. Leave live auto-manage off.
6. Record all order ids, instance ids, computed prices, and observed quotes in one evidence file during execution.

## Optional forced-favorable path

Use this only if the standard bracket arms with its trigger more than five cents from the tape or stops out before the milestone. It uses existing production endpoints. It does not inject or fake a quote.

1. Ensure the first attempt is fully flat and closed.
2. Buy exactly one AAPL share in paper without a management policy.
3. Read the paper position `avgCost`; call it `E`.
4. Wait up to five minutes for the real bid to reach at least `E + $0.05`.
5. Set `S = E - $0.08`, rounded to a valid cent.
6. Submit a standalone one-share protective `SELL STP` at `S`. Preview must classify it as reducing the existing one-share long, not opening a short. Record its real broker `STOP_ORDER_ID`.
7. Export the observed values for the attach command:

```bash
export LOCKED_ENTRY='<E from paper position avgCost>'
export INITIAL_STOP='<S>'
export STOP_ORDER_ID='<real paper stop order id>'
```

8. Attach `Step trail 0.25R` as an already-armed playbook to that real stop:

```bash
curl -sS -X POST http://127.0.0.1:3003/api/trading/playbooks/attach \
  -H "Content-Type: application/json" \
  -H "x-edge-trading-service-secret: $EDGE_TRADING_SERVICE_SECRET" \
  --data "$(jq -n \
    --arg templateId "$POLICY_TEMPLATE_ID" \
    --arg accountId "$ACCOUNT_ID" \
    --arg symbol "AAPL" \
    --argjson entryPrice "$LOCKED_ENTRY" \
    --argjson initialStop "$INITIAL_STOP" \
    --argjson stopOrderId "$STOP_ORDER_ID" \
    '{
      templateId: $templateId,
      accountId: $accountId,
      symbol: $symbol,
      side: "BUY",
      entryPrice: $entryPrice,
      initialStop: $initialStop,
      qty: 1,
      environment: "paper",
      status: "armed",
      stopOrderId: $stopOrderId,
      filledQty: 1
    }')" | jq .
```

9. The computed trigger is `E + $0.02`. Because attachment occurs only after the real bid is at least `E + $0.05`, the first milestone has a three-cent favorable margin.
10. Wait up to 20 seconds for the real worker. Apply the same sidecar and database oracles from TC-BE-RATCHET.
11. Flatten through managed cleanup.

This path is honest but narrower than the standard path. It proves armed playbook evaluation and real broker stop modification. It does not re-prove pending-entry promotion, which the prior paper run already passed.

## Abort rules and failure modes

- **Stop executes before ratchet:** Record FAIL for that attempt. Do not widen a working paper stop. Flatten any remainder and permit at most one forced-favorable retry.
- **IB rejects price increment:** Recalculate to the contract's minimum tick. For ordinary US stock prices above `$1`, the expected tick is one cent, but broker acceptance is authoritative.
- **Trigger not reached in five minutes:** Mark the standard ratchet attempt INCONCLUSIVE and use the optional path or stop.
- **Outside RTH or stale/wide quote:** Abort. Do not enable extended hours to rescue the run.
- **Quote null during arming:** The fixed fallback may arm from position `marketPrice` or `avgCost`; record the source. Quote-null arming alone is not ratchet proof.
- **Quote null after armed:** Manage prices from the live feed. Abort as INCONCLUSIVE only when **live** quote is null/stale and position `marketPrice` is also unusable. Do not treat `avgCost` as a favorable live price for ratchet evaluation.
- **Broker `avgCost` materially differs from `avgFillPrice`:** Use the database locked entry for all policy math. Apply the five-cent proximity gate.
- **Worker does not modify but cron does:** The evaluator/modify path passed, but the overall result is INCONCLUSIVE for the requested worker proof. Record both facts.
- **Any live account, live auto-manage, or quantity above one appears:** Emergency abort and flatten paper only. Do not submit.
- **Kill switch blocks entry:** Keep the safety behavior. Do not bypass it; resolve the paper test state before another session.

## Result definitions

**PASS**

- Preflight, attach, arm, flatten, and teardown pass.
- The critical ratchet has a real qualifying quote.
- Both sidecar and database prove the stop moved to locked entry within two ticks.
- `highestMilestoneR >= 0.25`.

**FAIL**

- The quote reaches the trigger while the instance is armed, but the broker stop does not move and no documented broker rejection explains it.
- The database claims a ratchet that the sidecar stop does not show.
- Cleanup leaves a position or protective order working.
- Paper/live or quantity safety is violated.

**INCONCLUSIVE**

- The market never reaches the trigger.
- The position stops out before a qualifying quote.
- Quotes become unavailable or stale.
- Only the cron watchdog, not the worker cadence, can be proven.
- Broker/session conditions prevent observing a real stop modification.

Attach/arm/flatten success does not upgrade an inconclusive ratchet to PASS.

## Verification Plan

- Focused sanity: run the three trading tests in TC-PREFLIGHT.
- App-level: one-share paper flow through ticket, database, manage evaluator, sidecar stop modification, and cleanup.
- Evidence: capture exact quote, locked entry, R unit, trigger, pre/post stop `auxPrice`, and manage-state values.
- No production code changes, mock quote injection, or full paper suite in the design turn.

## Harness Update

During execution, activate `LIVE — Step trail 0.25R BE ratchet paper proof`; WIP=1; mark Passing only with quoted sidecar and database ratchet evidence; Commit: skip (operator requested no commit).
