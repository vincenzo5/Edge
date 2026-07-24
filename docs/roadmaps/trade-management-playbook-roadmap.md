# Trade Management Playbook Roadmap

Phased track for **automated post-fill trade management** — reusable rule recipes attached at entry that move stops, scale out, and trail runners under defined conditions — without duplicating Risk sizing, broker Protect orders, or Alerts.

**Last updated:** 2026-07-24

**Status:** Phase 0 **Passing** (2026-07-24); Phase 1 **Passing** (2026-07-24); Phase 2 **Passing** (2026-07-24); Phase 3 **Passing** (2026-07-24); Phase 4 **Passing** (2026-07-24); Phase 5 **Passing** (2026-07-24); Phase 6 **Passing** (2026-07-24); Phase 7 **Passing** (2026-07-24); Phase 8 **Pending**.

**Related:** [Trading Execution](./trading-execution-roadmap.md) (brackets / OCO / trail — **Protect**), [Alerts](./alerts-roadmap.md) (trade-plan bundles — **notify only**), [Journal](./journal-roadmap.md) (review; strategy docs deferred), [AI Agent](./ai-agent-roadmap.md) (annotation “playbooks” Phase D — **different concept**), [Trading Architecture](../../src/lib/trading/ARCHITECTURE.md), [Risk](../../src/lib/risk/), [Project Status](../PROJECT-STATUS.md), [Constraints](../CONSTRAINTS.md).

---

## Product goal

Let the trader attach a **management playbook** when entering (or protecting) a stock position so Edge automatically executes the plan they would run by hand: break-even, scale-outs, trails, and related stop/qty updates — while **hard protective stops remain at the broker**.

**One-line framing:** *Protect keeps you alive; Manage runs your plan.*

### Success criteria

- At Trade setup / ticket, user can pick a playbook (or preset) alongside bracket/OCO attach.
- Initial risk R is locked from entry + stop at fill (or attach) time and used for R-based rules.
- Armed instances survive app reload (Postgres when configured; local fallback acceptable for paper-only early phases).
- All mutations go through `TradingService` (same readiness, kill switch, live confirm, intents, audit).
- Open-risk chrome shows playbook status and Pause / Flatten / Detach.
- Worst case if Edge is down: last broker protective stop/OCO still protects the position (hybrid model).

### Non-goals

- Replacing Risk panel position sizing (Plan stays in `src/lib/risk/`).
- Replacing brackets / protective OCO / trail legs (Protect stays broker-native).
- Turning trade-plan **alerts** into silent order executors (Alerts remain notify-only).
- Journal “strategy playbook documents” or notebooks ([journal-roadmap.md](./journal-roadmap.md) exclusion).
- AI rich-annotation playbooks / `playbookId` chart packs ([ai-agent-roadmap.md](./ai-agent-roadmap.md) Phase D).
- Options / multi-leg management in v1.
- Fully expressing every rule as IB-native orders with no Edge runtime (hybrid is intentional).
- Scale-in / pyramiding in early phases.
- Portfolio-level risk caps as playbook rules (day loss kill may reuse existing safety later; separate concern).

---

## Naming (avoid collisions)

| Term in this track | Meaning | Do not confuse with |
|--------------------|---------|---------------------|
| **Trade management playbook** | Recipe of post-fill manage rules | — |
| **Protect** | Broker bracket / OCO / trail at fill or on open position | “Playbook stop” as the only stop |
| **Plan** | Pre-trade sizing + chart entry/stop/target geometry | Runtime manager |
| **Trade-plan alerts** | Notify at entry/stop/target | Auto-exits |
| **Analysis playbook** | Deferred AI/drawing pack | This track |

UI copy preference: **Manage with…** / **Management playbook** — not bare “Playbook” alone.

---

## How it fits (reuse map)

| Existing piece | Role | Playbook relationship |
|----------------|------|------------------------|
| `src/lib/risk/` + Risk panel | Size qty from $ risk + stop | **Plan only** — supplies initial R / qty; not the manager |
| Position drawings + `positionTradeSetup` | Entry / stop / target levels | Shared level source for rules |
| Brackets / trail / protective OCO (exec Phases 6–9) | Hard Protect at broker | Always place/keep; playbook **modifies** over time |
| `TradingService` + intents + audit | Place / modify / cancel | **Only** mutation path for manage actions |
| Open-risk header chip | Ambient open positions | Status + Pause / Flatten / Detach |
| Trade-plan alert bundles | Notify on levels | Optional notify twin; separate runtime |
| Alerts evaluator / cron | Server condition watch | Pattern inspiration for `when`; **do not** bolt order mutate onto alert-evaluate |
| Journal tags / setup | Review taxonomy | Later: record template + rules fired |
| AI annotation playbooks | Chart analysis packs | Out of scope — keep names distinct |

```
Chart position drawing
  → Risk panel sizes qty                 (Plan — exists)
  → Trade setup / ticket
       ├─ Attach bracket / OCO / trail   (Protect — exists)
       └─ Attach manage playbook         (Manage — this track)
  → Open-risk chip / Account             (monitor + controls)
  → Journal                              (review link — later)
```

---

## Domain model (target)

| Type | Purpose |
|------|---------|
| `PlaybookTemplate` | Named reusable recipe (presets + user-saved) |
| `PlaybookRule` | `{ when, then, once?, requires?, priority? }` |
| `PlaybookInstance` | Template bound to a position / intent; runtime state |
| `RuleRuntime` | per-rule: `pending` → `armed` → `fired` \| `skipped` \| `cancelled` |
| `PositionPlan` | Locked entry, initial stop, side, qty, **R unit** at attach/fill |

### Condition / action vocabulary (v1 target)

**When:** price cross · +N × R · time in trade / session flatten · protective fill / scale fill  
**Then:** `modifyStop` (incl. break-even) · `reduceQty` · `attachTrail` / tighten trail · `flatten` · `notify` (optional mirror)

Actions map to existing broker primitives via `TradingService` — no parallel order client.

---

## Architecture (target)

```
Trade ticket / Protect with OCO
  → create PlaybookInstance (+ optional BracketPlan / ProtectiveOcoPlan)
  → persist instance (Postgres + local fallback)

Playbook manager (server)
  ← quotes / fills / account stream (order environment, trading_decision trust)
  ← freshness / readiness guards (same spirit as TradingService)
  → evaluate RuleRuntime
  → TradingService.modify / reduce / OCO / trail
  → audit + intent linkage

Open-risk / Account / chart
  → status, Pause, Skip next, Flatten, Detach (keep Protect)
```

**Hybrid safety:** Protect orders always rest at IB. Edge manager only upgrades management. If manager is down, last stop/OCO remains.

**Separation from Alerts:** Shared *levels* (and optionally a conceptual bundle id) are fine; **separate evaluators**. Alert cron notifies; playbook manager mutates orders.

---

## Touch points (when implementation begins)

| Area | Path |
|------|------|
| Domain + runtime | `src/lib/trading/` (new playbook modules beside `bracketPlan.ts`, `tradingService.ts`) |
| Persist | `src/db/schema.ts` + migration; localStore fallback pattern from intents/alerts |
| API | `/api/trading/playbooks*` or nested under trading (mutate auth parity with orders) |
| Manager job | Dedicated route/cron — **not** `/api/cron/alert-evaluate` |
| Trade UI | `TradeOrderForm.tsx`, Trade sidebar, optional Trade setup bind |
| Live chrome | `OpenRiskPositionsMenu.tsx`, Account panel |
| Levels | `positionTradeSetup.ts`, Risk position binding (read-only for R) |
| Docs | this file; `src/lib/trading/ARCHITECTURE.md` on ship |

---

## Phasing

Execute **one phase at a time** (WIP=1). Each phase gets focused tests, an Active Work row in [PROJECT-STATUS.md](../PROJECT-STATUS.md), and architecture notes in `trading/ARCHITECTURE.md` when behavior ships.

### Phase 0 — Contracts + presets (no live automation)

**Outcome:** Frozen types, R locking rules, and 3–5 preset recipes expressible against existing Protect primitives — no server manager yet.

| # | Deliverable |
|---|-------------|
| 0.1 | Zod schemas: `PlaybookTemplate`, `PlaybookRule`, `PlaybookInstance`, `PositionPlan` (R lock) |
| 0.2 | Preset library (code constants): e.g. BE at +1R; ½ at +1R then BE; ½ at +1R + trail remainder; session flatten |
| 0.3 | Pure planners: preset + PositionPlan → intended stop/TP/scale steps (unit-tested, no broker I/O) |
| 0.4 | Naming + ARCHITECTURE stub section: Plan / Protect / Manage boundaries |
| 0.5 | Conflict policy draft: manual stop drag pauses conflicting rules; Protect never removed by Detach |

**Status:** **Passing** (2026-07-24)

**Out of scope:** UI attach, server evaluator, live mutations.

**Verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 27 passed (27)`; **Architecture review:** self-review **Passed**; **App-level:** N/A

---

### Phase 1 — Attach at entry (Protect + Manage declaration)

**Outcome:** Trade ticket can select a preset; submit creates Protect (existing bracket/OCO path) **and** a persisted `PlaybookInstance` in `armed` (or `pending_fill`) state. No automatic post-fill actions yet beyond what the bracket already does.

| # | Deliverable |
|---|-------------|
| 1.1 | Trade ticket **Manage with…** picker (presets + Off); plain-English preview of steps |
| 1.2 | On submit: link instance → `order_intent` / bracket group / symbol+account |
| 1.3 | Persist instances (Postgres when `DATABASE_URL`; memory/local fallback) |
| 1.4 | Open-risk / Account: show “Manage: {preset} · pending/armed” (read-only) |
| 1.5 | Detach playbook (cancel instance; leave Protect orders) |

**Status:** **Passing** (2026-07-24)

**Depends on:** Phase 0; trading exec Phases 6–9 (shipped).

**Verification:** **Focused:** Test Files 8 passed (8), Tests 39 passed (39) + service playbook 2 passed (2); **Build:** compile OK; **Architecture review:** self-review **Passed**; **App-level:** deferred

---

### Phase 2 — Manager runtime (paper): BE + scale-out

**Outcome:** Server-side manager evaluates armed instances on paper and executes **break-even** and **scale-out % at +N R (or price)** via `TradingService`.

| # | Deliverable |
|---|-------------|
| 2.1 | Dedicated evaluator job (poll or stream-driven); stale/readiness guards |
| 2.2 | Actions: `modifyStop` → BE; `reduceQty` at R/price; update RuleRuntime |
| 2.3 | Qty basis = **filled** qty; R locked at attach/fill |
| 2.4 | Audit entries for every manage mutation; idempotent fire (once rules) |
| 2.5 | Pause / resume instance; Skip next rule |
| 2.6 | Kill switch + trading mutate auth honored |

**Status:** **Passing** (2026-07-24)

**Out of scope:** live account automation; indicator/script conditions; scale-in.

**Verification:** **Focused:** playbook evaluator + store patch + pause/skip routes; **Build:** compile OK; **Architecture review:** self-review **Passed**; **App-level:** paper BE/scale proof deferred

---

### Phase 3 — Trail remainder + live gates

**Outcome:** After scale (or standalone), attach/tighten **trail** on remainder; enable live with explicit auto-manage consent + existing `LIVE` confirmation posture.

| # | Deliverable |
|---|-------------|
| 3.1 | `attachTrail` / tighten using existing TRAIL types |
| 3.2 | Account/prefs: **Auto-manage enabled** (per environment or account) |
| 3.3 | Live: stepped confirm / token policy aligned with `place_order` / OCO (no silent first enable) |
| 3.4 | Open-risk: next rule distance (“+0.3R to BE”), Flatten now |
| 3.5 | Manual override: user-modified stop → pause conflicting trail/BE rules |

**Status:** **Passing** (2026-07-24)

**Verification:** **Focused:** Test Files 14 passed (14), Tests 74 passed (74); **Build:** compile OK; **Architecture review:** self-review **Passed**; **App-level:** paper trail + live manage deferred

---

### Phase 4 — Chart + protective-OCO parity

**Outcome:** Same attach/manage UX from chart Trade setup and from Account **Protect with OCO** on an already-open position; optional chart markers for pending manage levels.

| # | Deliverable |
|---|-------------|
| 4.1 | Protect with OCO + Manage attach on open position |
| 4.2 | Chart markers / labels for BE / scale levels (reuse position drawing roles where possible) |
| 4.3 | Drag stop on chart → modify broker stop + pause conflicting rules |
| 4.4 | ~~Optional notify twin~~ → **Phase 6** |

**Status:** **Passing** (2026-07-24)

**Verification:** **Focused:** Test Files 16 passed (16), Tests 80 passed (80); **Build:** compile OK (pre-existing BoardScreenerCardHost TS); **Architecture review:** self-review **Passed**; **App-level:** OCO+Manage + chart markers + stop-drag deferred

---

### Phase 5 — Template library + journal link

**Outcome:** User-saved templates (not just code presets); journal records which playbook ran and which rules fired.

| # | Deliverable |
|---|-------------|
| 5.1 | Save / rename / duplicate templates (prefs or Postgres) |
| 5.2 | Journal open/closed trade: playbook name + rule fire timeline |
| 5.3 | Simple adherence stats (optional): planned vs fired |
| 5.4 | ~~AI tools~~ → **Phase 7** |

**Status:** **Passing** (2026-07-24)

**Verification:** **Focused:** playbook template store + resolve/snapshot + journal recipe + templates API + journal UI tests; **Build:** compile OK; **Architecture review:** self-review **Passed**; **App-level:** save template → attach → journal Manage section deferred

**Note:** This is **execution recipe** persistence — not journal strategy documents excluded in the journal roadmap.

---

### Phase 6 — Trade-plan alert notify twin

**Outcome:** Optional notify-only alerts at Manage levels (BE, scale, trail triggers) when attaching a playbook — separate from order mutation; alerts never auto-exit.

| # | Deliverable |
|---|-------------|
| 6.1 | Attach opt-in: create trade-plan alert bundle from `planPlaybookSteps` levels (ticket + Protective OCO + chart paths) |
| 6.2 | Link bundle / alert ids to `PlaybookInstance` metadata for detach/cleanup |
| 6.3 | Alerts remain notify-only — no changes to alert-evaluate order execution |
| 6.4 | UI: checkbox or toggle on Manage attach (“Notify at manage levels”) with plain-English summary |

**Status:** **Passing** (2026-07-24)

**Verification:** **Focused:** Test Files 21 passed (21), Tests 104 passed (104); **Build:** `npm run build` — ✓ Compiled successfully; **Architecture review:** self-review **Passed**; **App-level:** attach Manage + notify → notification at level (no order from alert cron) deferred

**Note:** Fulfills deferred Phase 4.4 optional deliverable.

---

### Phase 7 — AI playbook tools

**Outcome:** Copilot can preview and attach management playbooks through the shared AI registry with explicit confirmation — no direct React state mutation.

| # | Deliverable |
|---|-------------|
| 7.1 | `preview_playbook` — describe preset/user template + planned steps from `PositionPlan` / chart context |
| 7.2 | Attach tool (e.g. `attach_playbook` or extend trade tools) with confirmation gate; routes through `TradingService` |
| 7.3 | Tool contracts in `src/lib/ai/` + rows in [ai-tools-architecture.md](../ai-tools-architecture.md) |
| 7.4 | Registry permissions aligned with `place_order` / live posture |

**Status:** **Passing** (2026-07-24)

**Verification:** **Focused:** registry + adapter + service + route tests — Test Files 5 passed (5), Tests 49 passed (49); **Build:** `npm run build` — ✓ Compiled successfully; **Architecture review:** self-review **Passed**; **App-level:** Copilot preview → confirm attach on paper ticket deferred

**Note:** Fulfills deferred Phase 5.4 optional deliverable.

---

### Phase 8 — Full rule editor

**Outcome:** User can author and edit custom management recipes (when/then rules) in the UI — not only duplicate/rename presets.

| # | Deliverable |
|---|-------------|
| 8.1 | Structured editor for `PlaybookRule` fields: `when` (price/R/time kinds shipped in v1), `then`, `once`, `requires`, `priority` |
| 8.2 | Live preview via `planPlaybookSteps` + validation through `PlaybookTemplateSchema` / `PlaybookRuleSchema` |
| 8.3 | Save/update user templates via existing `playbookTemplateStore` + templates API |
| 8.4 | ManagePlaybookPicker entry: “Edit template…” for `user_*` ids; block editing builtins (duplicate instead) |
| 8.5 | Instance safety unchanged — armed instances keep `templateSnapshot`; edits apply to future attaches only |

**Status:** **Pending**

**Depends on:** Phase 5 template library.

**Verification:** **Focused:** editor validation + save round-trip tests; **Build:** compile OK; **Architecture review:** self-review; **App-level:** create custom template → attach → manager respects edited rules on paper

**Out of scope for Phase 8:** indicator/script `when`, options legs, scale-in rules (see exclusions below).

---

## Explicit exclusions (v1 track)

| Excluded | Reason |
|----------|--------|
| Alert-evaluate executes orders | Safety + separation of concerns |
| Bypass `TradingService` | Intents, readiness, audit, live gates |
| Options / multi-leg manage | Separate contract; exec backlog |
| Scale-in / pyramid | Risk model complexity; later |
| Indicator/script `when` | After price/R/time proven |
| Portfolio max-loss playbook rules | Prefer account-level safety / kill patterns |
| Renaming AI annotation playbooks | Keep Phase D distinct |
| Client-only manager as sole engine | Must work with tab closed (server manager) |

---

## Dependencies

- Trading execution Phases 0–9 **Passing** (brackets, trail, protective OCO)
- `TradingService` mutate auth + kill switch + live confirmation
- Risk sizing / position drawings for Plan levels (read)
- Open-risk header chrome for ambient status
- Postgres optional for durable instances (mirror `order_intents` pattern)
- Alerts track **Passing** — required for Phase 6 notify twin; not required for Phases 0–5
- AI agent tool patterns — required for Phase 7

---

## Verification expectations

| Tier | When |
|------|------|
| Focused unit/UI tests | Every phase |
| Sidecar / paper order proof | Phase 2+ manage mutations |
| `npm run build` | Shared trading API / schema wiring |
| Architecture self-review | Each phase exit; required for Phase 0 contracts |
| App-level walkthrough | Phase 2+ paper; Phase 3 live — queue on [app-level-verification-wave-2-roadmap.md](./app-level-verification-wave-2-roadmap.md) (or a later wave) when shipping |

---

## Suggested presets (Phase 0 constants)

| Preset | Rules (sketch) |
|--------|----------------|
| **Break-even** | At +1R → stop to entry |
| **Half then BE** | At +1R → reduce 50%; then stop to entry |
| **Half + trail** | At +1R → reduce 50%; trail remainder (ATR$ or fixed $) |
| **Scale 3×** | ⅓ at 1R, ⅓ at 2R, runner trail; BE after first scale |
| **Daytrade flatten** | BE at +1R; flatten flat before session close (time rule) |

Exact parameters tunable per attach; presets are starting points.

---

## Near-term execution order

1. Phase 0 — contracts + presets ✓
2. Phase 1 — ticket attach + persist ✓
3. Phase 2 — paper manager BE + scale ✓
4. Phase 3 — trail + live gates ✓
5. Phase 4 — chart / OCO parity ✓
6. Phase 5 — library + journal ✓
7. **Phase 6** — trade-plan alert notify twin ✓
8. **Phase 7** — AI playbook tools ✓
9. **Phase 8** — full rule editor

Do not start Phase 6 until Phase 5 **Passing** (met). Execute Phases 6–8 one at a time (WIP=1).

---

## Harness update (when activating)

When implementation starts:

- Add Active Work row: **Trade management playbook — Phase N**
- Behavior / evidence fields per [harness-status-checklist.md](../checklists/harness-status-checklist.md)
- Task Contract if cross-session or UI + API + manager
- Update this file phase **Status** + [README.md](./README.md) table on each phase exit
- Close out via `npm run harness:closeout` when evidence ready
