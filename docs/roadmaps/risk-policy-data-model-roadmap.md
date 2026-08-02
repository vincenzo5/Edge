# Risk Policy Data Model Roadmap

Living track for the **persisted RiskPolicy spine**: a named, reusable, composable policy that applies **one-at-a-time** to a trade from planning through entry, automated management, and flat — with a manual off switch — without making broker orders the source of policy truth.

**Last updated:** 2026-07-30

**Status:** Phase 0 **Passing** (2026-07-30) — data model + apply UX intent frozen (this document). Phase 1 **Passing** (2026-07-31) — Zod spine + completeness/integrity helpers + last-used preference stub. Phase 2 **Passing** (2026-07-31) — additive schema M2–M4, stores/repos, `applyRiskPolicy`, partial unique indexes. Phase 3 **Passing** (2026-07-31) — evaluator binding filter, protect reconcile persistence, cancel-protect verb, journal M5 link, schedule promote on playbook-evaluate cron. Phase 4 **Passing** (2026-07-31) — Risk sidebar Policies library + sectioned template editor. Phase 5 **Passing** (2026-07-31) — chart Apply UX (Plan panel + Trade ticket promote/arm).

**Related:** [Risk Management System](./risk-management-system-roadmap.md) (slot vocabulary + UX moments 0–10), [Trade Management Playbook](./trade-management-playbook-roadmap.md) (Manage runtime — evolves into this spine), [Trading Execution](./trading-execution-roadmap.md) (**Protect** effects + entry orders), [Journal](./journal-roadmap.md) (Measurement sink), [AI Agent](./ai-agent-roadmap.md), [Trading Architecture](../../src/lib/trading/ARCHITECTURE.md), [Risk lib](../../src/lib/risk/), [Project Status](../PROJECT-STATUS.md), [Constraints](../CONSTRAINTS.md).

**Design basis:** Product intent + dual design pass (GPT 5.6 + Opus 5) for the persisted spine; apply UX + `EntrySchedule` locked with product owner 2026-07-30. Prefer **evolution of playbook tables** over a greenfield parallel system.

---

## Product intent

A **risk policy** is a named pack of composable rules (budget, sizing, geometry shape, exits). The trader can create configurations, interchange them, and plug **exactly one** into a given trade. There is always a manual off switch. The policy is tied to the trade **start to finish** and is the contract for automation that manages orders until the trade is flat (unless the trader takes over).

**One-line framing:** *One frozen policy per trade — compose, apply, automate, or turn off.*

### Success criteria

- Reusable `RiskPolicyTemplate` library (builtins + user).
- Applied `RiskPolicyInstance` with immutable snapshot from plan → flat.
- Unified `exits[]` (Protect + Manage + TP + time) discriminated by `binding`.
- At most one active policy per trade (DB-enforced); zero only after explicit detach/manual.
- Pause / Detach never cancel Protect; Cancel Protect is a separate confirmed action.
- Broker orders remain **effects** linked by id — not reconstructed policy truth.
- Additive migration from `PlaybookTemplate` / `PlaybookInstance` with no dual-write rewrite of live Manage.
- **Apply UX:** long/short drawing is the policy apply surface; Trade panel is entry + schedule + confirm only; Application settings **Risk policies** tab is the template library.
- **Scheduled entry:** `EntrySchedule` is first-class (immediate / session event / clock); “at open” is one preset, not a one-off feature.

### Non-goals (v1)

- Portfolio / account policies as trade templates.
- Scale-in `adds[]`, hedges, options multi-leg, Kelly / VaR engines.
- New `TradeLifecycle` / `TradeEpisode` entity (instance *is* the spine in v1).
- Moving Protect evaluation into Edge (Protect stays `restingBroker`).
- Treating open broker orders as the policy record.
- Auto-cancel Protect on Pause or Detach.
- Full event-sourcing of every quote evaluation.
- Physical SQL rename of `playbook_*` tables (type/module rename only in early phases).
- Price-armed entry (`become live when price touches X`) — deferred after schedule v1.
- Requiring native broker GTD/good-after for v1 schedule — Edge-held schedule that submits when due is acceptable.
- Second full policy composer on the Trade ticket (summary + Change… only when drawing-bound).

---

## Naming

| Term | Meaning |
|------|---------|
| **RiskPolicyTemplate** | Reusable named pack (library) |
| **RiskPolicyInstance** | Frozen policy bound to one trade (spine) |
| **ExitRule** | One composable exit (stop, TP, BE, scale, trail, time, …) |
| **binding** | `restingBroker` \| `managedApp` \| `discretionary` \| `notifyOnly` |
| **EntrySchedule** | When the entry order becomes working: immediate / session event / clock |
| **Playbook*** | Legacy names for Manage-only slices; evolve into RiskPolicy* |

UI copy may say **Risk policy**. Manage playbook remains valid copy for the Manage slice until UX unify.

---

## Thesis

```text
RiskPolicyTemplate  (library — compose & swap)
        │ apply → freeze snapshot
        ▼
RiskPolicyInstance  (the trade’s policy contract)
   ├── positionPlan          (locked geometry / R / qty)
   ├── exits[] + exitRuntimes
   ├── protect bindings      (expected legs → observed order refs)
   ├── orderIntentId         (entry link)
   └── → journal when flat
```

`PlaybookInstance` is already ~80% of an applied policy. Gaps to close: **trade identity columns**, **Protect representation**, **template slots for Budget / Sizing / Geometry**, and **unified exits**.

---

## Frozen data model

### 1. `RiskPolicyTemplate` — reusable pack

Evolve `PlaybookTemplate` / table `playbook_templates`.

| Field | Purpose |
|-------|---------|
| `id`, `name`, `description` | Identity |
| `schemaVersion` | Forward-compatible parsing (default `1`) |
| `scope` | `"trade"` in v1 (`account` / `sleeve` reserved) |
| `budget?` | Per-trade budget, or `{ kind: "inherits" }` session |
| `sizing?` | Method + caps, or inherits |
| `geometry?` | **Recipe**, not live prices: N stops, N targets (e.g. R multiples), optional time horizon |
| `exits[]` | One ordered list — Protect, TP, Manage, flatten, notify — by `binding` |
| `gates?` | Policy-local only (e.g. min R:R). Account kills stay session-level |
| `adds[]` | Present in type; empty in v1 |

**Back-compat:** keep `rules` column; readers use `exits ?? rules.map(withDefaults)` where default `binding` is `managedApp` and `role` is inferred from `then.kind`.

#### ExitRule (composable unit)

```text
ExitRule
  id, label
  role        protect | takeProfit | manage | flatten | hedge
  trigger     priceLevel | rMultiple | timeInTrade | sessionClock | event | …
  action      flatten | reduce | modifyStop | attachTrail | placeTarget | notify | …
  qtyScope    full | fraction | remainder | fixedQty
  binding     restingBroker | managedApp | discretionary | notifyOnly
  requires[]  other rule ids
  once, priority, ocoGroup?
```

Stop, target, break-even, scale, and trail are the **same shape**. `binding` decides broker-resting vs Edge-managed.

Geometry recipe may declare multiple stops/targets and a time horizon; only the first hard stop maps to `PositionPlan.initialStop` for R lock. Broker support for multiple resting legs may lag the model — flag via completeness / support warnings.

### 2. `RiskPolicyInstance` — one policy on one trade

Evolve `PlaybookInstance` / table `playbook_instances`. **This row is the spine** from plan → entry → manage → flat.

| Field | Purpose |
|-------|---------|
| `id` | Stable for the whole trade life |
| `templateId` | Provenance (may dangle if template deleted) |
| `policySnapshot` | **Immutable** full template at apply (widened `templateSnapshot`) |
| `bindingRef` | Apply surface: `{ kind: "drawing" \| "ticket" \| "position", id }` |
| `environment`, `accountId`, `symbol`, `side` | Denormalized trade key (uniqueness + SQL queries) |
| `positionPlan` | Locked entry, initialStop, qty, rUnit (existing math) |
| resolved budget / planned risk $ | Frozen at apply from budget + size |
| `status` | Lifecycle (below) |
| `controlMode` | `automated` \| `paused` \| `manual` |
| `offReason?` | Why automation stopped |
| `exitRuntimes[]` | Per-exit runtime (today’s `ruleRuntimes`) |
| `protect` | Expected resting legs + last observed broker refs |
| `protectState` | `unknown` \| `resting` \| `partial` \| `missing` \| `cancelled` |
| `protectCheckedAt` | Staleness for fail-closed cron |
| `orderIntentId`, `orderRef`, `stopOrderId`, `filledQty`, `alertBundleId` | Existing links |
| `entrySchedule` | When entry should become working (see below) |
| `entryOrder` | Planned entry intent: side, type (MKT/LMT/…), limit price if any |
| timestamps | applied / armed / scheduled / detached / closed |

#### EntrySchedule (first-class)

Scheduled / future entry is fundamental — not a one-off “at open” feature. RTH open is one `sessionEvent` preset.

| Kind | Example | Notes |
|------|---------|-------|
| `immediate` | Submit now | Default |
| `sessionEvent` | `nextRthOpen` / `nextRthClose` | Timezone = instrument calendar |
| `clock` | `2026-07-31T09:35:00` + IANA tz | Absolute wall clock |

Template may carry an optional **default** `entrySchedule` (copied on apply; per-trade override on instance). Instance holds the authoritative schedule while `planned`.

**v1 execution:** Edge-held schedule is OK — instance stays `planned` with `scheduledFor` until due, then submit creates OrderIntent / Protect and promotes to `pending_fill`. Native broker GTD/good-after is a later optimization, not a blocker.

**Deferred:** `priceArmed` (become live when price touches X).

#### Lifecycle status

```text
planned ──(schedule due or Submit now)──► pending_fill → armed ⇄ paused
   │                                         → completed | closed | detached
   │                              (also: superseded on swap)
   └── still planned while waiting on EntrySchedule
```

| Status | Meaning |
|--------|---------|
| `planned` | Applied while planning; **no working entry yet** (includes scheduled-not-due) |
| `pending_fill` | Entry order working at broker |
| `armed` | Live Manage/Protect contract active |
| `paused` | Automation paused; policy still bound |
| `completed` | All exits terminal (runner may still be open) |
| `closed` | Position flat |
| `detached` | Policy removed; Protect may still live |
| `superseded` | Replaced by a swap |

**Snapshots never mutate** after promote to `pending_fill`. While `planned`, geometry + schedule sync from the apply surface (see UX). Runtime + protect observations mutate after arm.

#### Protect binding (embedded, not a table)

Broker orders are effects. Persist intent + pointer, never truth:

```text
{
  exitId, role,
  expected: { kind: "stop" | "takeProfit" | "trail", stopLeg?, price?, qtyScope },
  observed: { orderId?, ocaGroup?, orderRef?, seenAt? } | null
}
```

Reconciler (extending `summarizeOpenPositionExits`) writes `protectState` + `protectCheckedAt`. Persisting the verdict — rather than deriving it only in the UI — lets the headless cron fail closed.

### 3. Optional `RiskPolicyEvent` (Measurement audit)

Thin append-only table for policy lifecycle (applied, swapped, armed, exit_fired, protect_missing, paused, detached, closed, …). Prefer over overloading order-centric `trading_audit_events`. Can ship after core instance columns if needed for journal review.

### 4. What is *not* a policy entity

| Stays outside | Why |
|---------------|-----|
| Session `riskSettings` (day-loss, heat, display) | Account safety must override any trade recipe |
| Auto-manage paper/live master switch | Operator / env gate |
| Broker orders / OrderIntent bodies | Effects linked by id |
| Chart drawing points | Apply surface; resolved into `positionPlan` on promote |
| Separate `TradeLifecycle` table (v1) | Instance *is* the spine; trade key = `(env, accountId, symbol)` |

---

## Relationships

```text
Template 1 ──N Instance          (snapshot on apply)
Instance  1 ──1 active trade     (partial unique index)
Instance  1 ──N exitRuntimes     (embedded)
Instance  1 ──N protect bindings (embedded → broker effects)
Instance  0..1 OrderIntent       (entry)
Instance  0..1 JournalTrade      (riskPolicyInstanceId)
Instance  1 ──N RiskPolicyEvent  (optional)
```

**Frozen in snapshot:** budget method, sizing, geometry recipe, exits, policy-local gates, resolved $ risk / qty / R.

**Always live (not frozen):** account day-loss / open-heat, kill switch, auto-manage master switch, readiness, quotes, broker order state.

---

## One policy per trade

```sql
-- Live trade: at most one controlling policy
CREATE UNIQUE INDEX playbook_instances_one_active_per_trade
ON playbook_instances (user_id, environment, account_id, symbol)
WHERE status IN ('pending_fill', 'armed', 'paused');

-- Planning: at most one policy per apply surface
CREATE UNIQUE INDEX playbook_instances_one_planned_per_binding
ON playbook_instances (user_id, binding_ref_kind, binding_ref_id)
WHERE status = 'planned';
```

**Swap** = one transaction: detach incumbent (`offReason: swapped`, status `superseded` / `detached`) → insert new instance with new snapshot. Default apply = **reject** on conflict (no silent overwrite).

Zero current policy is allowed only after explicit **Detach** / manual takeover.

**Known limit:** natural key cannot represent two independent same-symbol positions or a hedged long/short pair on one symbol. Acceptable for v1 stock scope (IB nets). Escape hatch later: additive trade-episode id.

---

## Manual off (three verbs)

| Verb | Automation | Protect | Default “off”? |
|------|------------|---------|----------------|
| **Pause** | Stops `managedApp` eval | Untouched | Yes — temporary |
| **Detach** | Unbinds policy from trade | Untouched | “Remove policy” |
| **Cancel Protect** | Independent | Cancels broker legs | Never implied; confirm |

`conflictPolicy.pauseAffectsProtectOrders()` / detach-keeps-Protect remain **model invariants** with tests.

Manual stop drag → pause conflicting exits + `offReason: "manual_stop_drag"` (shipped behavior, now recorded on the row).

---

## Type sketches (concise)

```ts
type RiskPolicyTemplate = {
  id: string;
  name: string;
  description?: string;
  schemaVersion: 1;
  scope: "trade";
  budget?: BudgetSlot | { kind: "inherits" };
  sizing?: SizingSlot | { kind: "inherits" };
  geometry?: GeometryRecipe; // stops[], targets[], timeHorizon?
  exits: ExitRule[];
  gates?: PolicyGates;
  adds: []; // v1 empty
};

type EntrySchedule =
  | { kind: "immediate" }
  | { kind: "sessionEvent"; event: "nextRthOpen" | "nextRthClose" }
  | { kind: "clock"; at: string; timeZone: string }; // ISO + IANA

type RiskPolicyInstance = {
  id: string;
  templateId: string;
  policySnapshot: RiskPolicyTemplate; // frozen at pending_fill+
  bindingRef: { kind: "drawing" | "ticket" | "position"; id: string };
  environment: "paper" | "live";
  accountId: string;
  symbol: string;
  side: "BUY" | "SELL";
  positionPlan: PositionPlan;
  entrySchedule: EntrySchedule;
  entryOrder: {
    type: "MKT" | "LMT" | "STP" | "STP_LMT";
    limitPrice?: number;
  };
  status:
    | "planned"
    | "pending_fill"
    | "armed"
    | "paused"
    | "completed"
    | "closed"
    | "detached"
    | "superseded";
  controlMode: "automated" | "paused" | "manual";
  offReason?:
    | "manual"
    | "manual_stop_drag"
    | "gate_breach"
    | "swapped"
    | "template_missing";
  exitRuntimes: Array<{ ruleId: string; status: RuntimeStatus }>;
  protect: ProtectBinding[];
  protectState: "unknown" | "resting" | "partial" | "missing" | "cancelled";
  orderIntentId?: string;
  orderRef?: string;
  stopOrderId?: number | null;
  filledQty?: number | null;
  alertBundleId?: string;
  scheduledFor?: string; // resolved fire time when schedule is not immediate
};
```

Keep existing playbook `when` / `then` vocabulary on rules during migration; add optional `role`, `binding`, `qtyScope`, `ocoGroup` with defaults. Renaming to `trigger` / `action` is deferred (evaluator / presets / display churn).

---

## Account / session vs policy

| Inside trade policy | Outside (session / account / operator) |
|---------------------|----------------------------------------|
| Per-trade budget method + value (or inherits) | Day-loss / open-heat caps |
| Sizing method + constraints | Kill switch, readiness, live confirm |
| Geometry recipe + resolved plan at apply | Connection availability, PDT / short safety |
| Exits (Protect + Manage + time + notify) | Global auto-manage enablement |
| Policy-local gates (min R:R, max qty) | Display prefs |

At apply: snapshot NetLiq (or basis) used for sizing. Keep referencing account gates **live** so a tightened day-loss kill still wins.

---

## Migration path (additive)

Nothing dropped; no dual-write window that risks missing armed instances.

| Step | Deliverable |
|------|-------------|
| **M1** | Types only: optional `role` / `binding` / `qtyScope` / `ocoGroup` on rules; defaults = today’s Manage |
| **M2** | Template slots jsonb (`budget`, `sizing`, `geometry`, `exits`) beside `rules` |
| **M3** | Instance columns: denormalized trade key, `protect` / `protectState` / `protectCheckedAt`, `controlMode` / `offReason`, `planned` status, timestamps; backfill from `positionPlan` |
| **M4** | Partial unique indexes; `applyRiskPolicy({ onConflict: "reject" \| "swap" })` |
| **M5** | Journal `riskPolicyInstanceId`; keep `manage_playbook` during transition; type/module rename to RiskPolicy* (SQL tables stay `playbook_*`) |

Evaluator: filter `binding === managedApp` for cron; Protect stays `TradingService` brackets / OCO. Promote `planned` → `pending_fill` on entry submit **or** when `EntrySchedule` fires (same `id`).

---

## Fail-closed integrity

Derived (and preferably persisted) verdict:

| `policyIntegrity` | Meaning |
|-------------------|---------|
| `ok` | Trade scope + ≥1 `restingBroker` protect exit + `protectState: resting` |
| `protect_missing` | Manage/automation without resting Protect |
| `protect_unknown` | Stale / unchecked reconcile |
| `incomplete_template` | Missing Budget / Geometry / Protect for trade scope |

Incomplete templates remain **representable** (Manage-only migration). They must not claim completeness. Managed-app rules should not arm while `blocked_missing_protect` unless user explicitly chooses manual control.

---

## Apply UX intent (frozen 2026-07-30)

Do **not** re-litigate surface ownership or the locked recommendations below without product owner input. Implementation phases implement this intent; they do not redesign it.

### Trader process (source of truth for happy path)

1. Read the chart for a technical pattern / direction.
2. Place **long_position** or **short_position** — plan entry, stop(s), target(s); optionally use box width as time horizon later.
3. **Apply a risk policy** on that drawing (or accept last-used auto-apply) so Protect + Manage + sizing contract are attached as a `planned` instance.
4. Adjust levels on the chart while still planning (instance stays in sync).
5. Open **Trade** for *how/when* to enter (MKT / LMT, schedule), confirm, submit — or leave scheduled overnight.
6. After fill: policy automates per exits until flat, unless Pause / Detach / manual exit.

**One-line UX framing:** *Chart owns what + which policy; Trade owns how/when to enter; Application settings owns the recipe library.*

### Surface ownership

| Surface | Owns | Must not own |
|---------|------|--------------|
| Long/short + Plan panel | Geometry; apply/swap policy; R/qty preview; integrity chips; **Trade setup…** | Order type, live confirm, account picker, full recipe editor |
| Trade panel | Entry type (MKT/LMT/…); **EntrySchedule**; preview/submit; promote planned → pending_fill; read-only policy summary | Second full policy composer when drawing-bound |
| Application settings → Risk policies | Create / edit / duplicate / archive templates | Day-to-day apply on a live trade (apply is on chart) |

Applying a policy on the drawing:

1. Projects drawable levels (extra TPs, time edge if recipe says so).
2. Shows chips for non-visual rules (trail, BE chain, etc.).
3. Creates/updates `RiskPolicyInstance` with `status: planned`, `bindingRef: { kind: "drawing", id }`.

Trade does **not** pick a second policy by default — it submits *this* planned instance. Unbound ticket (no drawing) may host the policy picker as the exception path.

### Mental model

```text
CHART (geometry + policy apply)     TRADE PANEL (how / when to enter)
───────────────────────────────     ────────────────────────────────
Long/Short drawing                  Order type: MKT / LMT / …
  entry / stop(s) / TP(s)           Qty (from policy sizing)
  [optional time width]             EntrySchedule: Now | Session | Clock
  + Risk policy applied  ────────►  seeds Protect + Manage from snapshot
       status: planned                    │
                                   Submit now or wait until schedule
                                          ▼
                                   pending_fill → armed → … → closed
```

### Primary flow (ASCII)

```text
┌──────────────────────────────── chart ────────────────────────────────┐
│                                                                        │
│   [==== LONG box ====]                                                 │
│    stop ── entry ── target(s)                                          │
│                                                                        │
│   ┌─ Plan ─────────────────────────────┐                               │
│   │ Long · AAPL                        │                               │
│   │ entry / stop / target (editable)   │                               │
│   │ R · R:R · Qty (budget/policy)      │                               │
│   │ Policy [ Half + trail      ▾ ]     │  ← APPLY → planned instance   │
│   │  ✓ Protect  ✓ TP  ✓ Manage         │                               │
│   │  ! Trail = Manage only             │                               │
│   │ [ Trade setup… ]                   │  ← opens Trade, same bind     │
│   └────────────────────────────────────┘                               │
└────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ Trade ─────────────────────────────────────┐
│ AAPL  BUY   qty …                            │
│ Entry: ○ Market  ● Limit @ drawn entry       │
│ When:  ○ Now  ● Schedule ▾                   │
│          Next RTH open | Specific time…      │
│ Risk policy: {name} (from drawing)           │
│ Protect / Manage summary (read-only)         │
│ [Change…] → returns to chart Plan picker     │
│ [ Preview ]  [ Submit / Arm schedule ]       │
└──────────────────────────────────────────────┘
```

### Lifecycle in UI terms

```text
  draw long/short
       │
       ▼
  apply policy (+ optional default schedule from template)
       │
       ▼
  PLANNED  ←── levels sync; overnight OK; schedule may wait here
       │
       │ Trade: Submit now  OR  schedule fires
       ▼
  PENDING_FILL ── fill ──► ARMED ──► … ──► CLOSED
       │                     │
       │ cancel entry        │ Pause / Detach (Protect stays)
       ▼                     ▼
    cancelled              manual / flat
```

### Locked product recommendations (do not guess)

These answers are **decided**. Future implementers should follow them unless the product owner changes them explicitly.

| Topic | Decision |
|-------|----------|
| **Default policy on new long/short** | Auto-apply **last-used policy for that side** (long vs short). Plan panel always shows the name. First-ever draw → prompt once or built-in Classic Protect. Explicit **None** / change control. Redrawing levels does **not** switch policies. |
| **Entry default from the tool** | Drawn entry = planned **limit** price. Trade defaults to **Limit @ drawn entry**. One-click **Market** (or Market-at-schedule). Stick-to-last is for drawing/chase, not the default after levels are committed / policy applied. |
| **Protect required on submit** | **Soft warn on paper.** **Hard block on live** if trade-scoped policy has no `restingBroker` protect (or would be missing). Escape: explicit “Submit unprotected” confirm on live → manual readiness path. |
| **Where to change policy** | **Chart Plan panel is primary.** Trade shows read-only summary + **Change…** back to drawing/picker. Trade hosts picker only when **unbound** (no drawing). |
| **Redraw after apply** | **Live sync while `planned`.** Freeze snapshot + positionPlan on promote to `pending_fill`. After `armed`, drawing edits are not the policy (stop-drag pauses conflicting Manage — existing behavior). |
| **Scheduled / future entry** | First-class **`EntrySchedule`** on the instance (template may supply default). Kinds: `immediate`, `sessionEvent` (incl. next RTH open/close), `clock`. “At open” is one preset. v1 may Edge-hold until due. `priceArmed` deferred. |

### Why not today’s three-knob path

Today: draw → Risk bind / Use in Trade → ticket Manage picker → brackets — policy assembled in pieces.

Target: **draw → pick/keep policy → Trade setup → entry type + when → submit/arm.**  
Policy already encodes Protect + Manage. Ticket shows a summary, not a second composer.

### Authoring UX (library) — intent

Application settings tab **Risk policies**:

- List builtins + user templates; row actions Open / Duplicate / Delete (user only).
- Editor sections: Identity → Budget → Sizing → Geometry shape → Exits (unified) → Gates → optional default EntrySchedule → Review (completeness strip + failure-mode one-liner).
- Builtins read-only → Duplicate to edit.
- Armed instances keep snapshot; template edits apply to future attaches only.

---

## Phasing

### Phase 0 — Freeze data model + apply UX intent

**Outcome:** This document is the source of truth for entities, relationships, one-policy invariant, manual-off verbs, EntrySchedule, migration, apply UX surface ownership, and locked recommendations.

| # | Deliverable |
|---|-------------|
| 0.1 | Product intent + thesis |
| 0.2 | Template + Instance + ExitRule + Protect binding + EntrySchedule fields |
| 0.3 | Lifecycle, uniqueness, manual-off contract |
| 0.4 | Migration M1–M5 + non-goals |
| 0.5 | Apply UX intent (surfaces, ASCII flows, locked recommendations) |
| 0.6 | Cross-links from Risk Management System, Playbook, ROADMAP index |

**Status:** **Passing** (2026-07-30)

**Verification:** Doc review — intent matches; UX recommendations locked; no claim that persistence or apply UI is shipped; Related links resolve.

---

### Phase 1 — Types + completeness helpers

**Outcome:** Zod / TS types for `RiskPolicyTemplate` / `RiskPolicyInstance` / `ExitRule` / `EntrySchedule` in `src/lib` (prefer `src/lib/risk/policy/` or evolved playbook modules); completeness + integrity helpers; presets map to incomplete Manage-only templates; default last-used policy id preference key sketched.

**Status:** **Passing** (2026-07-31)

**Verification:** Focused `npm test -- --run src/lib/risk/policy/ src/lib/trading/playbook/presets.test.ts` — Test Files 3 passed (3), Tests 20 passed (20); no playbook schema break; no persistence/UI.

---

### Phase 2 — Persistence + indexes

**Outcome:** Additive schema (M2–M4) including `entrySchedule` / `entryOrder` / `scheduledFor`; stores/repos; unique indexes; apply/swap/reject; backfill denormalized columns.

**Status:** **Passing** (2026-07-31)

**Verification:** Focused `npm test -- --run src/lib/risk/policy/ src/lib/trading/playbookInstanceStore.test.ts src/lib/trading/playbook/presets.test.ts` — Test Files 6 passed (6), Tests 32 passed (32); `npm run db:migrate` applied `0039_risk_policy_spine.sql`; no UI/evaluator/schedule worker.

---

### Phase 3 — Runtime wire (Manage + Protect + schedule)

**Outcome:** Evaluator reads binding; protect reconciler persists `protectState`; pause/detach/cancel-protect verbs honor invariants; journal link field; schedule worker/cron promotes due `planned` instances to submit → `pending_fill` (Edge-held schedule OK).

**Status:** **Passing** (2026-07-31)

**Verification:** Focused `npm test -- --run src/lib/risk/policy/ src/lib/trading/playbook/ src/lib/trading/playbookInstanceStore.test.ts src/lib/trading/tradingService.test.ts src/lib/trading/summarizeOpenPositionExits.test.ts src/app/api/cron/playbook-evaluate/ src/app/api/trading/playbooks/` — Test Files 31 passed (31), Tests 165 passed (165); `npm run db:migrate` applied `0040_journal_risk_policy_instance_id.sql`; no apply UX.

---

### Phase 4 — Authoring UX (library)

**Outcome:** Risk sidebar **Policies** list + editor per Authoring UX intent — create / duplicate / edit / archive; completeness strip; optional default EntrySchedule on template. No chart apply required to close this phase.

**Status:** **Passing** (2026-07-31)

**Verification:** Focused `npm test -- --run src/lib/trading/playbookTemplateStore.test.ts src/lib/trading/playbookTemplateMutations.test.ts src/lib/risk/policy/ src/app/components/trading/PlaybookTemplateEditor.test.tsx src/app/components/risk/RiskPoliciesSection.test.tsx src/app/api/trading/playbooks/templates/` — Test Files 13 passed (13), Tests 52 passed (52); no chart apply.

---

### Phase 5 — Apply UX (chart / Trade)

**Outcome:** Implement frozen apply UX:

| # | Deliverable |
|---|-------------|
| 5.1 | Plan panel: policy picker, integrity chips, last-used auto-apply by side, Trade setup… |
| 5.2 | Apply/swap creates/updates `planned` instance on drawing; levels sync until submit |
| 5.3 | Trade panel: seeded from planned instance; Limit @ drawn entry default; Market one-click; EntrySchedule Now / Session / Clock |
| 5.4 | Drawing-bound Trade: policy summary + Change… (no second composer); unbound ticket may pick policy |
| 5.5 | Live hard-block without Protect (soft warn paper); unprotected confirm escape |
| 5.6 | Submit now or arm schedule; promote planned → pending_fill; pause/detach chrome |

**Status:** **Passing** (2026-07-31)

---

## How this relates to Risk Management System (Phases 0–10)

That track froze **vocabulary** and shipped **UX moments** on today’s fragmented pieces (session budget, drawings, brackets, playbooks). This track owns the **persisted spine** and the **apply UX contract** those moments should eventually read/write as one policy.

Do not reopen slot vocabulary here — extend [risk-management-system-roadmap.md](./risk-management-system-roadmap.md) if catalog/slots change. Do not reopen apply-surface ownership without updating the locked recommendations table above.

---

## Open questions

1. When to introduce optional `RiskPolicyEvent` vs journal-only Measurement.
2. Whether `controlMode` stays separate from `status` long-term (v1: both — status = lifecycle, controlMode = who drives automation).
3. Escape hatch for multi-position same symbol (trade-episode id) — defer until needed.
4. Physical rename `playbook_*` → `risk_policy_*` — only after type rename + consumers migrated.
5. Schedule executor: dedicated cron vs reuse playbook-evaluate path — **resolved Phase 3:** reuse `/api/cron/playbook-evaluate`.
6. Whether template default `entrySchedule` appears in completeness checklist as optional always.

**Resolved (see locked recommendations):** default policy auto-apply; entry limit-from-drawing; live Protect hard-block; Plan panel primary for policy change; planned sync until submit; EntrySchedule first-class.

---

## Source / touch points

| Area | Path | Notes |
|------|------|-------|
| Manage types today | `src/lib/trading/playbook/types.ts` | Evolve |
| Templates store | `src/lib/trading/playbookTemplateStore.ts` | Evolve |
| Instances store | `playbookInstanceStore` / persistence repos | Evolve |
| Conflict policy | `src/lib/trading/playbook/conflictPolicy.ts` | Invariants |
| Protect summarize | `src/lib/trading/summarizeOpenPositionExits.ts` | Reconcile → `protectState` |
| Slot vocabulary | `docs/roadmaps/risk-management-system-roadmap.md` | Unchanged owner |
| Plan budget | `src/lib/risk/riskSettings.ts` | Session; inherit from template |
| Plan panel / drawing chrome | `PositionPlanPanel.tsx`, `DrawingSelectionChrome.tsx` | Phase 5 apply surface |
| Trade ticket | `TradeOrderForm.tsx`, `ManagePlaybookPicker.tsx` | Evolve to summary + schedule |
| Application settings | `AppSettingsShell.tsx` → **Risk policies** tab | Phase 4 Policies library |
| Position geometry | `packages/chart-core/.../positionGeometry.ts` | Levels + future multi-TP / time |
