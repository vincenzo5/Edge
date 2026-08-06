# Step trail 0.25R — Paper functional test plan (LLM handoff)

**Purpose:** Verify trade lifecycle automation on a **paper IBKR account** using only the **Step trail 0.25R** risk policy.

**Audience:** Another LLM (or agent) executing the test. Follow steps in order. Record pass/fail and evidence for each test case.

**Out of scope:** Live trading, other policies, journal replay (counterfactual only), UI polish.

---

## 0. Agent instructions (read first)

You are executing a **manual functional test** against a running Edge dev stack + IB Gateway paper. You must:

1. **Preflight** — Run §1 commands. Do not start UI tests until all preflight checks pass.
2. **Execute test cases** — TC-01 … TC-05 in order. TC-06 is optional cleanup verification.
3. **Record evidence** — After each TC, append results to `docs/evidence/step-trail-025r-paper-functional-YYYY-MM-DD.txt` using the template in §8.
4. **Pass criteria** — All **required** TCs (01–05) must pass for overall **PASS**. Any required TC failure → overall **FAIL** with blocker notes.
5. **Tools you may use:**
   - Shell (`npm`, `curl`, `psql`, `npx tsx`)
   - **Browser automation** (Cursor browser MCP): navigate `http://127.0.0.1:3003`, click trade ticket, Open Risk menu, Account panel
   - **Do not** edit production code unless a TC documents an explicit bug and user asked for fixes
6. **Safety:** Paper only. Use **1–10 shares**. Flatten or kill at end of session. Never enable live auto-manage.

If blocked (TWS down, auth failure, no fill), stop that TC, document the blocker, and continue only if the plan allows skip (noted per TC).

---

## 1. Preflight checklist

Run from repo root: `/Users/vincentn/TV AI`

### 1.1 Environment

| Check | Command / action | Pass if |
|-------|------------------|---------|
| `.env.local` exists | `test -f .env.local` | exit 0 |
| Database URL set | `grep DATABASE_URL .env.local` | non-empty |
| Auth secret set | `grep EDGE_AUTH_SECRET .env.local` | non-empty |
| TWS enabled | `grep TWS_ENABLED .env.local` | `true` |
| Kill switch off | `grep EDGE_TRADING_KILL_SWITCH .env.local` or unset | not `true` |
| Manage worker on | `grep EDGE_MANAGE_WORKER .env.local` or unset | not `0` / `false` |
| Paper lock (if shared sidecar) | `grep EDGE_TRADING_ENVIRONMENT_LOCK .env.local` | `paper` or unset |

### 1.2 Services

```bash
cd "/Users/vincentn/TV AI"
npm run check:startup          # readiness gate
curl -sf http://127.0.0.1:8765/health   # sidecar healthy
curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:3003   # expect 200 or 307
```

If sidecar unhealthy: `npm run ib:gateway:up` (or user's existing Gateway stack), wait 30s, retry health.

### 1.3 Database

```bash
npm run db:migrate
npx tsx scripts/seed-user-risk-policies.mts
```

Confirm policy exists:

```bash
psql "$DATABASE_URL" -c "
  SELECT id, name
  FROM playbook_templates
  WHERE name = 'Step trail 0.25R'
  LIMIT 1;
"
```

Expect **one row**. Note `id` as `POLICY_TEMPLATE_ID` for later.

Confirm migration 0041 columns:

```bash
psql "$DATABASE_URL" -c "
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'playbook_instances' AND column_name IN ('manage_state','take_profit_order_id');
"
```

Expect **2 rows**.

### 1.4 Dev app + login

```bash
npm run dev   # if not already running on :3003
```

Open `http://127.0.0.1:3003` in browser. Complete dev login if prompted.

Confirm in UI:

- Header/environment shows **Paper IB** (not Live)
- Account panel shows paper account id (note as `PAPER_ACCOUNT_ID`, e.g. `DU…`)

### 1.5 Paper auto-manage

Account panel → **Auto-manage** section:

- [ ] **Paper auto-manage** checkbox is **ON**

API check (requires session cookie from browser, or `EDGE_TRADING_SERVICE_SECRET`):

```bash
# Option A: service secret (if EDGE_TRADING_SERVICE_SECRET set in .env.local)
curl -s http://127.0.0.1:3003/api/trading/playbooks/auto-manage \
  -H "x-edge-trading-service-secret: $EDGE_TRADING_SERVICE_SECRET"
```

Pass if `"paperEnabled": true`.

### 1.6 Unit tests (sanity, non-blocking but run once)

```bash
npm test -- --run \
  src/lib/trading/bracketPlan.test.ts \
  src/lib/trading/playbook/stepTrailRatchet.test.ts \
  src/lib/trading/manageWorker.test.ts \
  src/lib/trading/exitAndCleanup.test.ts \
  src/lib/risk/policy/applyPolicyToTradeDraft.test.ts
```

Expect all pass. If fail, file bug — do not proceed with paper tests until user fixes.

**Preflight complete** when §1.1–1.5 pass.

---

## 2. Policy under test — Step trail 0.25R

| Field | Value |
|-------|-------|
| Display name | `Step trail 0.25R` |
| Template id | Dynamic `user_<uuid>` from DB (not `step_trail_025` — that id is replay-only) |
| Protect geometry | Stop at 1R only — **no hard TP** (`geometry.stops`, no `targets`) |
| Ticket | `takeProfitEnabled: false`, bracket attach allowed with stop only |
| Runtime manage | **Parametric** `manageState.kind = "stepTrailR"`, `stepR: 0.25` |
| Declarative rules | 24 `step-*` rules exist in template but are **skipped** at runtime when parametric state is set |
| Ratchet math (long) | At peak R, stop locks at `floor(peakR / 0.25) * 0.25 - 0.25` in R-space (BE at first +0.25R) |
| Worker cadence | ~2s when armed instances exist (`manageWorker.ts`) |

**Reference unit test oracle (long):** entry 100, stop 95 → rUnit 5 → price 101.25 (+0.25R) → stop moves to **100** (BE).

Code anchors:

- Ratchet: `src/lib/trading/playbook/stepTrailRatchet.ts`
- Evaluation: `src/lib/trading/playbook/runPlaybookEvaluation.ts`
- Exit: `src/lib/trading/exitAndCleanup.ts`, `TradingService.exitAndCleanup`

---

## 3. Test symbols and sizing

| Symbol | Qty | Notes |
|--------|-----|-------|
| **F** (Ford) | **1–5** | Low notional; good first pass |
| **AAPL** | **1–10** | Used in unit tests; liquid |

**Recommended first run:** **F**, qty **1**, **Market Buy** during RTH for fast fill.

**Stop placement:** Set stop **1R below entry** (long) or **1R above entry** (short). Example long: if last ≈ $12.00, stop ≈ $11.40 when rUnit ≈ $0.60 — pick round numbers you can mental-math for +0.25R triggers.

Record for each TC: `SYMBOL`, `QTY`, `ENTRY_FILL`, `INITIAL_STOP`, computed `R_UNIT = |fill - initialStop|`.

---

## 4. Test cases

### TC-01 — Policy binds stop-only bracket on ticket

**Goal:** Ticket applies Step trail 0.25R and submits entry + stop **without TP**.

**Steps:**

1. Open Trade ticket for active chart symbol (**F**).
2. Open **Risk policy** picker → select **Step trail 0.25R**.
3. Verify ticket state:
   - Stop loss **enabled** with a price set (from drawing or manual)
   - Take profit **disabled** / off
   - Bracket / attach protect **on** (policy-bound submit path)
4. Choose **Market** + **Buy**, qty **1**.
5. Preview → Confirm → Submit.

**Oracles:**

| Layer | Check | Pass if |
|-------|-------|---------|
| UI | Success toast / modal closes without attach error | no `playbookAttachError` surfaced |
| API | `POST /api/trading/brackets` returns 200 | response includes `playbookInstance` |
| DB | New `playbook_instances` row | see SQL below |
| Sidecar | Open orders for symbol | entry + **stop child**; **no TP/limit exit** leg |

**DB query** (replace `F`):

```sql
SELECT id, status, template_id, manage_state, stop_order_id, take_profit_order_id, order_ref
FROM playbook_instances
WHERE symbol = 'F' AND account_id = '<PAPER_ACCOUNT_ID>'
ORDER BY created_at DESC LIMIT 1;
```

Pass if:

- `status = 'pending_fill'`
- `manage_state->>'kind' = 'stepTrailR'`
- `(manage_state->>'stepR')::float = 0.25`
- `take_profit_order_id IS NULL`

**Sidecar orders:**

```bash
curl -s "http://127.0.0.1:8765/account/orders?accountId=<PAPER_ACCOUNT_ID>" \
  -H "Authorization: Bearer $TWS_SIDECAR_SECRET" | jq '[.[] | select(.symbol=="F")]'
```

Pass if protective order is **STP** (or stop-type) only; no separate TP limit for this policy.

---

### TC-02 — Fill arms instance and locks R

**Goal:** After entry fills, instance becomes `armed` with R locked from fill.

**Steps:**

1. Wait up to **60s** for paper entry fill (Market should fill quickly in RTH).
2. Optionally trigger one evaluation tick:

```bash
curl -X POST http://127.0.0.1:3003/api/cron/playbook-evaluate \
  -H "x-edge-cron-secret: $EDGE_CRON_SECRET"
```

(Skip if `EDGE_CRON_SECRET` unset — worker should tick within ~2–15s anyway.)

**Oracles:**

| Layer | Check | Pass if |
|-------|-------|---------|
| UI Open Risk | Header chip → row for **F** shows manage label containing `Step trail 0.25R` and status **armed** | visible |
| DB | Same instance id as TC-01 | `status = 'armed'`, `armed_at` set |
| DB | `manage_state` | contains `entryFillPrice` |
| DB | `position_plan` JSON | `entry` equals fill; `rUnit = |entry - initialStop| > 0` |
| Sidecar | Position qty | `position != 0` for F |

**DB:**

```sql
SELECT id, status, armed_at, manage_state, position_plan->>'entry' AS entry,
       position_plan->>'rUnit' AS r_unit, filled_qty
FROM playbook_instances
WHERE id = '<INSTANCE_ID_FROM_TC01>';
```

Pass if `status = armed` and `r_unit > 0`.

---

### TC-03 — Stop ratchets to break-even at +0.25R (critical)

**Goal:** Parametric worker moves stop to **entry (BE)** when price reaches **entry + 0.25 × rUnit**.

**Prerequisite:** TC-02 passed. Note `ENTRY_FILL`, `R_UNIT`, `STOP_ORDER_ID` from TC-01/02.

Compute triggers (long):

```
BE_TRIGGER = ENTRY_FILL + 0.25 * R_UNIT
EXPECTED_STOP_AFTER = ENTRY_FILL
```

**Steps:**

1. Watch live quote for **F** (chart or `GET /api/quotes` if available).
2. When market price **≥ BE_TRIGGER** (or simulate by waiting during favorable move):
   - Wait **5–10s** (≥2 worker ticks).
3. Re-fetch stop order from sidecar.

**Oracles:**

| Layer | Check | Pass if |
|-------|-------|---------|
| Sidecar | Stop order `auxPrice` or stop price | ≈ `EXPECTED_STOP_AFTER` (± $0.02 or 2 ticks) |
| DB | `manage_state->>'lastAppliedStopPrice'` | ≈ BE price |
| DB | `manage_state->>'highestMilestoneR'` | ≥ `0.25` |
| Audit | Recent modify/submit entries | optional; ratchet may appear as `modify` action |

**Sidecar single order:**

```bash
curl -s "http://127.0.0.1:8765/account/orders?accountId=<PAPER_ACCOUNT_ID>" \
  -H "Authorization: Bearer $TWS_SIDECAR_SECRET" \
  | jq '.[] | select(.orderId==<STOP_ORDER_ID>)'
```

**If price does not reach BE_TRIGGER during test session:**

- Mark TC-03 as **SKIP (market)** with recorded high price and trigger level.
- Run **TC-03b (cron forced evaluation)** only if user approves placing a **limit entry** closer to market on a **new** 1-share test — otherwise overall test remains **INCONCLUSIVE** for ratchet.

**TC-03b optional (API-only sanity):** Call cron evaluate while in profit; confirm no errors:

```bash
curl -X POST http://127.0.0.1:3003/api/cron/playbook-evaluate \
  -H "x-edge-cron-secret: $EDGE_CRON_SECRET"
# Response: evaluated >= 1, errors: []
```

---

### TC-04 — Flatten now runs exitAndCleanup

**Goal:** Manual flatten cancels protective orders, closes position, closes instance.

**Steps:**

1. Open **Open Risk** menu (header chip).
2. On **F** row with active manage instance, click **Flatten now**.
3. Confirm in modal (**Confirm flatten**).

**Oracles:**

| Layer | Check | Pass if |
|-------|-------|---------|
| UI | Position row disappears or qty 0 | flat |
| Sidecar | No open protective orders for F | stop cancelled |
| Sidecar | Position F | 0 |
| DB | Instance | `status = 'closed'`, `closed_at` set, `stop_order_id` null |
| DB | `off_reason` | `manual_flatten` or `exit_cleanup` |
| Audit | Latest entries | detail contains `exitAndCleanup:` |

**DB:**

```sql
SELECT id, status, closed_at, off_reason, stop_order_id, take_profit_order_id
FROM playbook_instances WHERE id = '<INSTANCE_ID>';
```

**API alternative** (if UI blocked):

```bash
curl -X POST "http://127.0.0.1:3003/api/trading/playbooks/<INSTANCE_ID>/exit-cleanup" \
  -H "Content-Type: application/json" \
  -H "x-edge-trading-service-secret: $EDGE_TRADING_SERVICE_SECRET" \
  -d '{"reason":"llm_functional_test"}'
```

Pass if response `instance.status === "closed"` and `flattened === true` when position existed.

---

### TC-05 — Env kill blocks new entry (after flat)

**Goal:** Paper kill switch blocks new risk entries; emergency flatten path still works.

**Precondition:** No open managed positions (TC-04 complete).

**Steps:**

1. Account panel → **Auto-manage** → click **Kill paper & flatten** (should be no-op on positions if already flat).
2. Verify kill flag set.
3. Attempt **new** Market Buy 1 F with Step trail 0.25R on ticket → Submit.

**Oracles:**

| Layer | Check | Pass if |
|-------|-------|---------|
| UI | Kill paper message / button state | `paperKillActive` shown |
| API | `GET /api/trading/playbooks/auto-manage` | `"paperKillActive": true` |
| Submit | Bracket or order submit | **blocked** with error mentioning kill / new entries |
| DB | `playbook_auto_manage.paper_kill_active` | `true` |

**Reset after test** (document; user may reset manually):

```sql
UPDATE playbook_auto_manage SET paper_kill_active = false WHERE user_id = (
  SELECT id FROM app_users LIMIT 1
);
```

Or PATCH auto-manage if a clear-kill UI is added later — for now SQL or user toggle.

Pass if new entry blocked while kill active.

---

### TC-06 — Optional: second +0.25R ratchet (+0.5R peak)

Only if TC-03 passed and position still open (skip if TC-04 already flattened).

At **entry + 0.5 × rUnit**, expect stop at **entry + 0.25 × rUnit** (long).

Same sidecar/DB oracles as TC-03 with updated expected stop.

---

## 5. Helper commands (copy-paste)

### List active playbook instances

```bash
curl -s "http://127.0.0.1:3003/api/trading/playbooks?accountId=<PAPER_ACCOUNT_ID>&activeOnly=true" \
  -H "x-edge-trading-service-secret: $EDGE_TRADING_SERVICE_SECRET" | jq .
```

### Trading audit (last 30)

```bash
npm run report:trading-audit -- --limit 30
```

Or:

```bash
curl -s "http://127.0.0.1:3003/api/me/trading-audit?limit=30" \
  -H "Cookie: <session-cookie>"
```

### Force evaluator (watchdog)

```bash
curl -X POST http://127.0.0.1:3003/api/cron/playbook-evaluate \
  -H "x-edge-cron-secret: $EDGE_CRON_SECRET"
```

### Kill flatten all (emergency — use in TC-05 or teardown)

```bash
curl -X POST http://127.0.0.1:3003/api/trading/playbooks/kill-flatten \
  -H "Content-Type: application/json" \
  -H "x-edge-trading-service-secret: $EDGE_TRADING_SERVICE_SECRET" \
  -d '{"environment":"paper"}'
```

---

## 6. UI element map (browser automation)

| Action | Location | test id / hint |
|--------|----------|----------------|
| Open trade ticket | Chart / header Trade | trade ticket modal |
| Risk policy picker | Trade ticket | policy picker / Step trail 0.25R |
| Submit bracket | Trade ticket | Review → Confirm |
| Open positions | Header | `data-testid="app-header-open-risk"` |
| Flatten managed position | Open Risk row | `data-testid="open-risk-flatten-{SYMBOL}"` |
| Auto-manage settings | Account sidebar panel | `data-testid="playbook-auto-manage-settings"` |
| Paper auto-manage toggle | Auto-manage | `data-testid="playbook-auto-manage-paper"` |
| Kill paper | Auto-manage | `data-testid="playbook-kill-paper"` |

**Open Risk manage label:** should include `Step trail 0.25R` and `armed` when TC-02 passed.

---

## 7. Failure triage

| Symptom | Likely cause | Next step |
|---------|--------------|-----------|
| No playbook instance after submit | Attach failed silently | Check bracket response `playbookAttachError`; DB insert errors |
| Stuck `pending_fill` | No position at broker | Confirm entry filled in TWS; check sidecar positions |
| Stop never modifies | Worker off, no quote, or price below trigger | `EDGE_MANAGE_WORKER`; logs; quote via chart; wait for +0.25R |
| TP leg appears at broker | Wrong policy or old template | Confirm template name; `take_profit_order_id` should stay null |
| Flatten leaves working stop | exitAndCleanup not wired | Check API route; correlated order filter in `exitAndCleanup.ts` |
| Submit works while kill active | `assertNewRiskAllowed` not hit | Bug — file issue |
| 401 on API | Missing auth | Use session cookie or `EDGE_TRADING_SERVICE_SECRET` |

---

## 8. Evidence file template

Create: `docs/evidence/step-trail-025r-paper-functional-YYYY-MM-DD.txt`

```
Step trail 0.25R — paper functional test — YYYY-MM-DD
Tester: <agent id or name>
Environment: paper / http://127.0.0.1:3003
Account: <PAPER_ACCOUNT_ID>
Policy template id: <POLICY_TEMPLATE_ID>

Preflight: PASS | FAIL — <notes>

TC-01 stop-only bracket: PASS | FAIL | SKIP — instance_id=… stop_order_id=…
TC-02 fill arm: PASS | FAIL — armed_at=… r_unit=…
TC-03 BE ratchet at +0.25R: PASS | FAIL | SKIP — trigger=… observed_stop=… expected=…
TC-04 flatten cleanup: PASS | FAIL — closed_at=… orders_after=0
TC-05 kill blocks entry: PASS | FAIL — paper_kill_active=true submit_blocked=true
TC-06 second ratchet (optional): PASS | FAIL | SKIP

Overall: PASS | FAIL | INCONCLUSIVE

Commands run:
<paste curl/npm/psql outputs>

Audit excerpt:
<paste report:trading-audit last 10 lines>

Blockers / follow-ups:
- …
```

---

## 9. Teardown

1. Ensure **no open positions** on paper (flatten or kill).
2. Reset `paper_kill_active = false` if TC-05 ran.
3. Leave `paperEnabled = true` unless user requested otherwise.
4. Commit evidence file only if user asks.

---

## 10. Overall pass definition

| Result | Condition |
|--------|-----------|
| **PASS** | TC-01, TC-02, TC-04, TC-05 pass; TC-03 pass **or** SKIP with documented favorable market attempt + TC-03b cron clean |
| **INCONCLUSIVE** | TC-01–02 pass but TC-03 SKIP (price never reached +0.25R) — automation partially verified |
| **FAIL** | Any required setup failure, attach failure, flatten/cleanup failure, or kill gate failure |

---

## 11. Related docs

- Implementation evidence: `docs/evidence/trade-lifecycle-automation-2026-08-04.txt`
- Architecture: `src/lib/trading/ARCHITECTURE.md` (manage worker, exitAndCleanup, kill)
- Seed script: `scripts/seed-user-risk-policies.mts`
- Unit tests: see §1.6

---

## 12. Quick math card (long)

Given fill **E**, initial stop **S**, rUnit **R = |E − S|**:

| Peak price | Peak R | Expected stop (long) |
|------------|--------|---------------------|
| E + 0.25R | 0.25 | E (BE) |
| E + 0.50R | 0.50 | E + 0.25R |
| E + 0.75R | 0.75 | E + 0.50R |
| E + 1.00R | 1.00 | E + 0.75R |

Short: mirror (stop moves down as price falls).

Worker never **loosens** stop — each modify must tighten or match; never reduce protection.
