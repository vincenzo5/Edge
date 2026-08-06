# Risk Management System Roadmap

Living track for a **shared RiskPolicy model** that every risk strategy must fill — Budget, Sizing, Geometry, Exits, Gates, Measurement — and for wiring that model across Edge’s Plan / Protect / Manage surfaces without duplicating those tracks.

**Last updated:** 2026-07-30

**Status:** Phase 0 **Passing** (2026-07-29). Phase 1 **Passing** (2026-07-30) — architecture spine + vocabulary sync. Phase 2 **Passing** (2026-07-29) — UX: drawing geometry strip. Phase 3 **Passing** (2026-07-29) — UX: Risk sidebar slot strip + unified bind + Use in Trade. Phase 4 **Passing** (2026-07-29) — UX: Trade ticket Risk plan summary. Phase 5 **Passing** (2026-07-30) — UX: open position Protect + Manage status chrome. Phase 6 **Passing** (2026-07-30) — UX: during-trade Manage progress chrome. Phase 7 **Passing** (2026-07-30) — UX: app down / gap failure mode. Phase 8 **Passing** (2026-07-30) — UX: journal review Measurement loop. Phase 9 **Passing** (2026-07-30) — UX: Copilot RiskPolicy compose + preview tool. Phase 10 **Passing** (2026-07-30) — UX: account day-loss / open-heat kills.

**Related:** [Risk Policy Data Model](./risk-policy-data-model-roadmap.md) (persisted Template / Instance spine — Phase 0 frozen), [Trading Execution](./trading-execution-roadmap.md) (**Protect** — brackets / OCO / trail), [Trade Management Playbook](./trade-management-playbook-roadmap.md) (**Manage**), [Alerts](./alerts-roadmap.md) (trade-plan notify only), [Journal](./journal-roadmap.md) (R / planned risk review), [AI Agent](./ai-agent-roadmap.md) (risk/order/playbook tools), [Trading Architecture](../../src/lib/trading/ARCHITECTURE.md), [Risk lib](../../src/lib/risk/), [Project Status](../PROJECT-STATUS.md), [Constraints](../CONSTRAINTS.md).

---

## Product goal

Give Edge one systematic answer to:

1. **How much are we risking?** (Budget → Sizing)
2. **Where is the plan?** (Geometry + locked R)
3. **When we’re in, what gets us out?** (Exits: protect, take-profit, time, trail, event…)
4. **What may we even do?** (Gates at trade / account / portfolio)
5. **What numbers are locked for review?** (Measurement)

**One-line framing:** *Every named risk strategy is a filled RiskPolicy — not a vibe.*

### Success criteria

- A frozen `RiskPolicy` slot vocabulary that Plan, Protect, Manage, Alerts, Journal, and AI tools can share in docs and (later) types.
- Every cataloged strategy maps to explicit slots (`value` or `none` / `inherits`).
- Every UX moment in the spine (draw → account kills) has a shipped phase with focused verification.
- Application plug-in map stays accurate: what Edge fills today vs gaps.
- New presets / gates / sizing methods must pass the completeness checklist before shipping.
- Does **not** replace Protect broker orders or Manage playbook runtime — this track owns the **system model**, UX completeness across moments, and cross-cutting Gates / Measurement sync.

### Non-goals

- Replacing `src/lib/risk/` Plan sizing UI with a second calculator.
- Moving hard stops off the broker into Edge-only mental stops.
- Turning Alerts into order executors.
- Implementing every catalog strategy (Kelly, VaR, collars, …) in v1.
- Portfolio optimization / risk-parity engine.
- Options multi-leg Manage (stays on playbook / exec backlogs).
- AI analysis “playbooks” (annotation packs — different concept).

---

## Naming (align with Plan / Protect / Manage)

| Term | Meaning | Owns |
|------|---------|------|
| **RiskPolicy** | Complete filled schema for one scope (trade / portfolio / account) | This track (model) |
| **Plan** | Pre-trade Budget + Sizing + Geometry | `src/lib/risk/` + chart drawings |
| **Protect** | Resting broker ExitRules that survive app death | Trading execution |
| **Manage** | Post-fill ExitRules that upgrade stops/qty over time | Trade management playbook |
| **Gate** | Pre-trade / in-trade / account block or kill | Safety + account caps (Phase 10) |
| **Trade-plan alerts** | Notify at geometry levels | Alerts (not exits) |
| **Bundle / recipe** | Named preset filling many slots | Playbook presets + future RiskPolicy presets |

UI copy stays: **Manage with…** for playbooks; Risk sidebar for Plan; **Protect with OCO** for open-position Protect.

---

## Shared schema: `RiskPolicy`

```text
RiskPolicy
├── Identity          name, intent, asset class, style
├── Scope             trade | portfolio sleeve | account
├── Budget            how much we are willing to lose
├── Sizing            how budget + geometry → quantity
├── Geometry          entry + initial invalidation (+ planned targets)
├── Exits[]           ordered exit rules (protect / TP / manage / flatten / hedge)
├── Adds[]            optional scale-in (risk-increasing; separate)
├── Gates             pre-trade / in-trade / account kill conditions
└── Measurement       what locks at attach/fill; audit / journal fields
```

### Slot definitions

#### 1. Budget — “How much are we risking?”

| Field | Meaning | Examples |
|-------|---------|----------|
| `riskUnit` | Unit of the budget | `$`, `% equity`, `R`, `VaR` |
| `perTradeBudget` | Max planned loss if initial invalidation hits | `1% equity`, `$250` |
| `openHeatCap` | Max concurrent risk | `6R open`, `6% equity` |
| `periodLossCap` | Daily/weekly kill | `−3% day → flatten + halt` |
| `drawdownCap` | Peak-to-trough kill | `−10% from equity high` |

Budget ≠ size. Size is derived from budget + stop distance (or another sizing method).

#### 2. Sizing — “How big is the bet?”

| Field | Meaning |
|-------|---------|
| `method` | `stopDistance` · `fixedNotional` · `fixedShares` · `volTarget` · `kelly` · `equalRisk` · `liquidityCapped` · `portfolioVaR` · … |
| `inputs` | ATR, win-rate, ADV, Kelly fraction, … |
| `constraints` | Max notional, max % ADV, min/max shares, margin |
| `output` | `qty` (+ optional notional, actual risk $) |

#### 3. Geometry — “Where is the plan?”

| Field | Meaning |
|-------|---------|
| `side` | long / short |
| `entry` | price or entry rule |
| `initialStop` | first hard invalidation (defines `R` when using R) |
| `plannedTargets[]` | optional TP levels for R:R gating / OCO |
| `rUnit` | usually `|entry − initialStop|` (Edge locks this on Manage attach) |

#### 4. Exits — “When we’re in, what gets us out?”

Every exit is the same object:

```text
ExitRule
├── id / label
├── role              protect | takeProfit | manage | flatten | hedge
├── trigger           WHEN it fires
├── action            THEN what we do
├── qtyScope          full | fraction f | remainder | fixedQty
├── binding           restingBroker | managedApp | discretionary | notifyOnly
├── once              true/false
├── requires[]        other rule ids that must have fired
└── priority / ocoGroup
```

**Stop loss** and **take profit** are not separate systems — they are `ExitRule`s with different `role` (and usually opposite sides of entry).

##### Trigger taxonomy (WHEN)

| Trigger kind | Meaning | Examples |
|--------------|---------|----------|
| `priceLevel` | Absolute / structure price | Hard stop, swing invalidation |
| `rMultiple` | ±N × locked R | +1R scale, −1R stop |
| `pctFromEntry` | % from entry | % stop / % target |
| `volatilityDistance` | ATR / σ offset | ATR stop, chandelier |
| `trail` | Path-dependent from MFE / extreme | Trailing stop, ratchet |
| `timeInTrade` | Duration since fill | Time stop |
| `sessionClock` | Session / clock boundary | Flatten 5m before close |
| `event` | News / earnings / fill event | Event flatten, `protectiveFill`, `scaleFill` |
| `pnlState` | Open P&L $ / % / R | Often expressed as `rMultiple` |
| `marketState` | Vol regime, correlation spike | Regime cut |
| `portfolioState` | Heat / daily loss / drawdown | Account kill |
| `modelState` | Greeks, VaR, signal flip | Options / quant exits |
| `manual` | Human override | Panic flatten |

##### Action taxonomy (THEN)

| Action | Meaning |
|--------|---------|
| `flatten` | Close full remaining qty |
| `reduce` | Close fraction / fixed qty |
| `modifyStop` | Move protective stop (incl. break-even) |
| `attachTrail` / `updateTrail` | Switch to / tighten trail |
| `placeTarget` / `modifyTarget` | Resting limit TP |
| `hedge` | Add offsetting exposure |
| `cancelWorking` | Cancel resting legs as part of a transition |
| `notify` | Alert only |
| `haltTrading` | Account/strategy pause |

#### 5. Gates — “May we even do this?”

| Phase | Examples |
|-------|----------|
| Pre-trade | Min R:R, liquidity, max positions, correlation / sector cap, regime filter |
| At submit | Live confirm, kill switch off, margin OK, readiness |
| In-trade | Pause Manage after manual stop drag; no revenge size |
| Account | Daily loss → flatten + block new entries |

#### 6. Measurement — “What numbers are locked?”

| Field | Why it matters |
|-------|----------------|
| `rDefinition` | Edge Manage: `|entry − initialStop|` at lock |
| `riskDollarsPlanned` | Budget used for sizing |
| `fillBasis` | Manage off filled qty |
| `costsIncluded?` | Fees/slippage in BE / R math |
| `audit` | Every mutate recorded |

### Lifecycle

```text
GATES (pre-trade)
  → BUDGET chosen
  → GEOMETRY chosen (entry + initial stop [+ targets])
  → SIZING computes qty
  → SUBMIT
       ├─ PROTECT: resting ExitRules (hard stop / OCO TP)
       └─ MANAGE: ExitRules armed for later triggers
  → IN TRADE: evaluate ExitRules on quotes / fills / time / state
  → GATES (account): may force flatten / halt
  → FLAT → MEASURE / journal
```

### Completeness checklist

For any named strategy or preset, answer:

1. **Scope?** trade / portfolio / account
2. **Budget?** unit + number + aggregate caps (`none` if N/A)
3. **Sizing method?** + constraints
4. **Geometry?** how entry & initial invalidation are chosen
5. **Protect exit?** trigger + action + binding + qty
6. **Profit exits?** 0..N rules with qty fractions that sum ≤ 1
7. **Other exits?** time / session / event / signal
8. **Manage migrations?** BE / trail / ratchet (`requires` chain)
9. **Adds?** scale-in rules or `none`
10. **Gates?** pre-trade + account kills
11. **Measurement?** what locks at fill
12. **Failure mode?** if app down / gap / partial fill — what still protects?

If #5 is empty for a trade-scoped policy, it is incomplete (unless scope is portfolio-only).  
If #2–3 are empty but it claims “risk managed,” it is only an exit heuristic.

### Primitive vs bundle

- **Primitive:** fills one slot (e.g. ATR stop, half-Kelly, sector cap).
- **Bundle / recipe:** fills many slots (e.g. 1% risk, 2R target, BE at 1R, trail runner).

Edge playbook presets are **Manage bundles**. Full trade RiskPolicy bundles also need Plan + Protect filled.

---

## Strategy catalog → slots

Use this to re-file catalog items. Phase 0 freezes family→slot filing below; per-preset 12-question checklists shipped in Phase 1 (1.3).

| Catalog family | Primary slot(s) |
|----------------|-----------------|
| Fixed fractional / daily loss / DD kill / leverage caps | Budget + Gates |
| Stop-distance, Kelly, ATR sizing, liquidity sizing | Sizing (+ Budget) |
| Hard / soft / ATR / % / structure stops | Exits `role:protect` |
| Targets, scale-outs, R:R filters | Exits `role:takeProfit` + Gates |
| BE, trail, ratchet, runners | Exits `role:manage` |
| Time / session / event exits | Exits `role:flatten` |
| Diversification, sector caps, rebalance | Gates / portfolio Budget |
| Hedging, collars, puts, futures overlay | Exits `role:hedge` or hedge geometry |
| VaR / stress / Greeks limits | Measurement + Gates + portfolio Exits |
| Checklists, journal, kill-switch UX | Gates + Measurement (process) |

### Exit families (classification key)

| Family | Primary trigger | Typical action | Role |
|--------|-----------------|----------------|------|
| Hard stop | price / R / ATR | flatten / stop fill | protect |
| Soft / mental stop | same | flatten discretionary | protect |
| Break-even migrate | +N R / level | modifyStop → entry | manage |
| Partial TP | +N R / price ladder | reduce fraction | takeProfit |
| Full TP | +N R / price | flatten | takeProfit |
| Trail / chandelier | trail from extreme | modifyStop / trail | manage |
| Time exit | duration / bars | flatten / reduce | flatten |
| Session exit | clock | flatten | flatten |
| Event exit | news / earnings | flatten / hedge | flatten / hedge |
| Signal exit | model flip | flatten | flatten |
| Regime cut | vol / corr state | reduce / flatten / halt | manage / gate |
| Account kill | daily / DD breach | flatten all + halt | gate |
| Hedge overlay | portfolio / state | add hedge | hedge |

---

## Application plug-in map (where this is useful)

Edge already implements large parts of RiskPolicy under Plan / Protect / Manage. Phases 0–10 **Passing** (2026-07-30) ship the UX spine and account kills; this document tracks the model, plug-in map, and **remaining** gaps (not a live phase backlog).

```text
Chart position / risk_ruler drawing
  → Risk panel sizes qty                 (Plan — Budget + Sizing + Geometry)
  → Trade setup / ticket
       ├─ Attach bracket / OCO / trail   (Protect — Exits restingBroker)
       └─ Attach manage playbook         (Manage — Exits managedApp)
  → Open-risk chip / Account             (Measurement + Manage controls)
  → Trade-plan / manage-notify alerts    (notifyOnly — not exits)
  → Journal plannedRisk / R              (Measurement review)
```

### Slot coverage today

| Slot | Strongest surfaces today | Current gaps |
|------|--------------------------|--------------|
| **Budget** | `riskSettings` + Risk panel; options `maxRisk`; account `periodLossCapPercent` / `openHeatCapPercent` (Phase 10) | Weekly loss cap; R-only open-heat unit deferred |
| **Sizing** | `equityPositionSize`, Trade ticket auto-qty, `optionsStrategyRisk` | Not enforced on every unbound ticket path |
| **Geometry** | Position drawings + `positionTradeSetup` + chart-core risk | Dual binds (Risk panel vs Trade setup) documented in Phase 3; stale metadata if not live-derived |
| **Exits** | Brackets / trail / protective OCO; playbook BE / scale / trail / session flatten | Chart-native order management backlog; options Manage excluded |
| **Gates** | Kill switch, readiness, short block, PDT soft, live confirm; account day-loss / open-heat block via `accountRiskGates` + `assertPreTrade` (Phase 10) | Sector / correlation caps; min R:R hard reject; live Protect hard-reject deferred; auto-flatten on breach deferred (10.3) |
| **Measurement** | Journal R, open-risk unrealized $, plan risk rows, options summary; journal `plannedRisk*` fill-if-empty from `PositionPlan` (Phase 8); account heat / day P&L chrome (Phase 10) | Open heat incomplete without Manage attach; no runtime RiskPolicy Zod merge type (compose view only, Phase 9) |

### Surface → slot detail

#### Plan / sizing

| Path | Role today | Slots |
|------|------------|-------|
| `src/lib/risk/riskSettings.ts` | `$` or % of NetLiq → dollar risk | Budget |
| `src/lib/risk/equityPositionSize.ts` | Shares from entry/stop + dollar risk | Sizing |
| `src/lib/risk/riskPositionBinding.ts` | Bind newest long/short drawing to Risk panel | Geometry (bind) |
| `src/lib/risk/marginContext.ts` | Margin / liquidation helpers | Soft Gates / Measurement |
| `src/lib/risk/optionsStrategyRisk.ts` | Multi-leg max loss → contracts | Budget + Sizing (options calc) |
| `src/app/components/sidebar/panels/RiskSettingsPanel.tsx` | Risk calculator UI | Budget + Sizing |
| `packages/chart-core/src/risk/*` | TradeSetup, R targets, labels, validation | Geometry + Measurement |
| `src/lib/trading/positionTradeSetup.ts` | Live entry/stop/target for Trade ticket | Geometry + Measurement |

#### Protect

| Path | Role today | Slots |
|------|------------|-------|
| `src/lib/trading/bracketPlan.ts` | Bracket / protective OCO plans | Exits + Geometry check |
| `src/lib/trading/tradingService.ts` | Preview/submit/modify + kill switch | Exits + Gates |
| `TradeOrderForm.tsx` / `ProtectiveOcoForm.tsx` | Ticket + open-position Protect | Budget→Sizing, Geometry, Exits, Manage attach |
| Exec roadmap Phases **6–9 Passing** | Outside RTH, brackets, trail, protective OCO | Protect complete for STK v1 |

#### Manage

| Path | Role today | Slots |
|------|------------|-------|
| `src/lib/trading/playbook/types.ts` | `PositionPlan` R lock; when/then rules | Geometry (R) + ExitRule model |
| `src/lib/trading/playbook/presets.ts` | BE, half→BE, half+trail, scale 3×, daytrade flatten | Manage Exit bundles |
| Playbook evaluator + `TradingService` | Mutate stop/qty/trail through broker path | Exits `binding:managedApp` |
| Hybrid safety | If Edge down, last Protect remains | Failure-mode design |

Maps cleanly to Edge playbook vocabulary already shipped:

| RiskPolicy | Playbook today |
|------------|----------------|
| Trigger `rMultiple` | `when.kind: multipleOfR` |
| Trigger `priceLevel` | `when.kind: priceCross` |
| Trigger `sessionClock` | `when.kind: sessionFlatten` |
| Trigger `event` (fills) | `protectiveFill` / `scaleFill` |
| Action `modifyStop` / `reduce` / `attachTrail` / `flatten` / `notify` | matching `then.kind` |

#### Open-risk / Account

| Path | Role today | Slots |
|------|------------|-------|
| `OpenRiskPositionsMenu.tsx` | Header chip: Close, chart, Pause/Resume/Skip/Detach | Measurement + Manage controls |
| `AccountPanel.tsx` | Positions, Protect with OCO, playbook menu | Exits + Manage + Measurement |
| `openRiskSummary.ts` | Count + unrealized $ | Measurement (unrealized $; planned heat via `AccountRiskGateStrip` when Manage plans present) |

#### Alerts (notify only)

| Path | Role today | Slots |
|------|------------|-------|
| `src/lib/alerts/tradePlanAlerts.ts` | Entry/stop/target notify bundles | Geometry → `binding:notifyOnly` |
| `manageNotifyAlerts.ts` | Optional manage-level notify twin | Notify — **not** exits |

#### Journal

| Path | Role today | Slots |
|------|------------|-------|
| `src/lib/journal/rMultiple.ts` | plannedRisk → R multiples | Measurement |
| `JournalTradeDetail.tsx` | Edit planned risk; MFE/MFA in R | Measurement |
| `playbook/journalRecipe.ts` | Manage recipe → journal linkage | Measurement (partial) |

#### AI tools

| Tool | Role | Slots |
|------|------|-------|
| `get_risk_settings` | Read session budget | Budget (read) |
| `preview_order` / `place_order` | What-if / submit | Gates + single-leg Exits |
| `preview_playbook` / `attach_playbook` | Manage plan / attach | Manage Exits |

#### Gates — shipped vs remaining

| Gate | Status |
|------|--------|
| Operator kill switch (`EDGE_TRADING_KILL_SWITCH`) | Shipped |
| Trading readiness (fresh quote/account, resolved dollar risk) | Shipped |
| Uncovered short hard block; PDT soft warning | Shipped |
| Live confirm for live mutates | Shipped |
| User daily loss kill (`periodLossCapPercent`) | Shipped (Phase 10) — block new BUY entries; auto-flatten deferred (10.3) |
| Open-heat cap (`openHeatCapPercent`, % NetLiq from Manage `PositionPlan`) | Shipped (Phase 10) — R-only heat unit deferred |
| Weekly loss kill | Not shipped |
| Sector / correlation caps | Not shipped |
| Min R:R hard reject on submit | Soft / display only |
| Live submit without Protect — hard reject | Deferred (Phase 4 soft warn only) |

### UX moments → phases (product spine)

Every product moment below has a dedicated phase. Phases 0–10 are **Passing** (model frozen + UX spine + account kills shipped).

| # | UX moment | Phase | Outcome in one line |
|---|-----------|-------|---------------------|
| 1 | Drawing a position on chart | **2** | Geometry + R:R (+ planned $ risk) readable on the drawing before size |
| 2 | Risk sidebar | **3** | Budget → Sizing with one bound geometry; slot completeness visible |
| 3 | Trade ticket submit | **4** | Pre-submit RiskPolicy summary: Budget / Size / Protect / Manage / failure mode |
| 4 | Open position | **5** | Protect + Manage bindings clear on open-risk / Account; unprotected callout |
| 5 | During trade | **6** | Live ExitRule status (next rule, R distance, binding) while position is open |
| 6 | App down / gap | **7** | Failure-mode UX: Protect-first copy + checks that resting broker exits remain |
| 7 | Journal review | **8** | Planned risk / R / recipe auto from Plan+Manage; compare to policy |
| 8 | Copilot | **9** | Tools preview/compose RiskPolicy in the same vocabulary |
| 9 | Account kills | **10** | Day-loss / open-heat Gates in settings, enforce path, and chrome |

---

## How this track relates to others

| Track | Relationship |
|-------|--------------|
| [Trading execution](./trading-execution-roadmap.md) | Owns Protect primitives; this track references them as `binding:restingBroker` Exits; Phase 5–7 UX sits on shipped brackets/OCO |
| [Trade management playbook](./trade-management-playbook-roadmap.md) | Owns Manage runtime; Phase 6 chrome + Phase 8 journal recipe consume instances; presets declare completeness (Phase 1) |
| [Alerts](./alerts-roadmap.md) | Notify-only ExitRules; never mutate |
| [Journal](./journal-roadmap.md) | Measurement sink for Phase 8 |
| [AI agent](./ai-agent-roadmap.md) | Phase 9 extends risk/order/playbook tools |
| Options exec (exec backlog) | Options RiskPolicy execution when options place exists |

**Boundary rule:** Portfolio-level heat / day-loss kills are **account Gates** (Phase 10 **Passing**) — not playbook rules on one symbol (playbook roadmap non-goal stands).

---

## Phasing

Phases 0–10 are **Passing** (2026-07-30). Future work (deferred items in Open questions and slot gaps above) should still follow WIP=1 with focused tests and architecture notes when behavior ships.

### Phase 0 — Freeze schema + catalog + UX-moment map

**Outcome:** This document is the source of truth for RiskPolicy slots, exit taxonomy, completeness checklist, strategy→slot filing, plug-in map, and the UX-moment → phase table.

| # | Deliverable |
|---|-------------|
| 0.1 | RiskPolicy slots + ExitRule / trigger / action taxonomies (above) |
| 0.2 | Completeness checklist (12 questions) |
| 0.3 | Catalog → slot filing table + exit families |
| 0.4 | Application plug-in map (paths + slot coverage + gaps) |
| 0.5 | UX moments → phases table (above) |
| 0.6 | Cross-links from playbook, exec, alerts, journal, AI agent, and ROADMAP index |
| 0.7 | Appendix: worked examples (classic 1% trade; half+trail preset; day-loss gate) |

**Status:** **Passing** (2026-07-29)

**Verification:** Doc review — every UX moment maps to a phase; Related links resolve; naming matches Plan/Protect/Manage; no claim that portfolio kills are shipped.

---

### Phase 1 — Architecture spine + vocabulary sync

**Outcome:** Developer-facing spine so UX phases share one vocabulary. No end-user behavior required.

| # | Deliverable |
|---|-------------|
| 1.1 | `src/lib/trading/ARCHITECTURE.md`: RiskPolicy slots ↔ Plan/Protect/Manage/Gates modules |
| 1.2 | Short risk note (ARCHITECTURE subsection or `src/lib/risk` doc pointer) for Budget/Sizing |
| 1.3 | Each `PLAYBOOK_PRESET` documents inherited Plan/Protect assumptions + Manage ExitRules (checklist form) |
| 1.4 | Document hybrid failure mode: Protect `restingBroker` survives if Manage/app is down |

**UX moments:** foundation for all (no single chrome change).

**Depends on:** Phase 0 accepted.

**Status:** **Passing** (2026-07-30)

**Verification:** Architecture self-review; `PLAYBOOK_PRESET_RISK_POLICY` completeness for all five presets; hybrid failure mode in trading ARCHITECTURE + `CONFLICT_POLICY` cite.

---

### Phase 2 — UX: Drawing a position on chart

**Moment:** Trader draws / selects a long/short (or risk ruler) and sees Geometry + planned R:R before sizing.

| # | Deliverable |
|---|-------------|
| 2.1 | Selected position drawing shows RiskPolicy Geometry strip: entry, stop, targets, R unit, planned R:R |
| 2.2 | When Budget is resolved, show planned risk $ and sized qty preview on/near the drawing (or selection chrome) — same math as `equityPositionSize` |
| 2.3 | Prefer live points via `positionTradeSetup` / drawing points; do not trust stale `riskSetup` metadata for displayed levels |
| 2.4 | Focused tests for label/preview derivation from drawing + budget |

**Slots:** Geometry, Measurement (preview); Budget/Sizing read-only preview.

**Touch points:** `packages/chart-core/src/risk/*`, `positionLabels`, `positionTradeSetup`, ChartCell selection chrome.

**Depends on:** Phase 0–1.

**Status:** **Passing** (2026-07-29)

**Verification:** Focused tests — `computePositionRiskPreview`, `positionLabels`, `PositionGeometryStrip`, `position_tool`; app-level: draw/select position with budget set → R:R + $ risk + qty visible on selection strip without Trade ticket.

---

### Phase 3 — UX: Risk sidebar

**Moment:** Risk calculator is clearly Plan (Budget → Sizing) bound to one Geometry source.

| # | Deliverable |
|---|-------------|
| 3.1 | Risk sidebar shows which drawing is bound + slot strip: Budget, Sizing result, Geometry (entry/stop), gaps (e.g. “no stop”) |
| 3.2 | Unify or explicitly sync Risk-panel bind with Trade-setup bind (one Geometry source of truth; document if dual remains) |
| 3.3 | Sizing result always reflects live bound levels + current `resolveDollarRisk` (no silent stale qty) |
| 3.4 | Deep link / affordance: “Use in Trade” carries Budget+Geometry into ticket |
| 3.5 | Focused tests for bind sync + sidebar slot summary |

**Slots:** Budget, Sizing, Geometry.

**Touch points:** `RiskSettingsPanel`, `riskPositionBinding`, `RiskPositionBindingContext`, Trade sidebar handoff.

**Depends on:** Phase 2 (drawing levels trustworthy).

**Status:** **Passing** (2026-07-29)

**Verification:** Focused tests — `summarizeRiskPlanSlots`, bind sync, `RiskSettingsPanel`, `TradeOrderForm` seed qty; app-level: bind drawing → change stop → sidebar qty updates; Use in Trade → ticket geometry + qty match; Trade setup on drawing B → Risk sidebar shows B.

---

### Phase 4 — UX: Trade ticket submit

**Moment:** Before submit, one checklist: Budget / Size / Protect / Manage / failure mode.

| # | Deliverable |
|---|-------------|
| 4.1 | Read-only **Risk plan** summary on `TradeOrderForm`: Budget, qty, Protect exits (stop/TP/trail), Manage recipe or Off |
| 4.2 | Same summary on `ProtectiveOcoForm` when attaching Protect (+ optional Manage) to an open position |
| 4.3 | Warn when Protect missing on **live** (policy: soft warn vs hard reject — resolve open question #1) |
| 4.4 | Failure-mode one-liner in summary: “Broker stop stays live if Edge is down” when Protect attached |
| 4.5 | Tests for summary derivation from bracket plan + playbook template |

**Slots:** Budget, Sizing, Geometry, Exits (Protect+Manage), Gates (warn), Measurement (planned risk rows).

**Touch points:** `TradeOrderForm`, `ProtectiveOcoForm`, `ManagePlaybookPicker`, `bracketPlan`.

**Depends on:** Phase 1; Phase 3 handoff preferred but not hard-blocked if ticket already binds geometry.

**Status:** **Passing** (2026-07-29)

**Verification:** Focused UI/unit tests; paper walk: summary matches attached bracket + preset before submit; live without Protect shows soft warn, submit still enabled.

---

### Phase 5 — UX: Open position

**Moment:** An open position shows Protect + Manage as filled ExitRules with clear binding — not a mystery chip.

| # | Deliverable |
|---|-------------|
| 5.1 | Open-risk row + Account position row: **Protect** state (stop/TP/trail/OCO present or “unprotected”) |
| 5.2 | Same rows: **Manage** state (preset/template name, armed/paused, next rule label) |
| 5.3 | Unprotected callout + affordance to **Protect with OCO** (Account; optional deep-link from open-risk) |
| 5.4 | Detach/Pause copy distinguishes “remove Manage” vs “cancel Protect” |
| 5.5 | Focused tests for status derivation from orders + playbook instance |

**Slots:** Exits (binding display), Measurement (open state).

**Touch points:** `OpenRiskPositionsMenu`, `AccountPanel`, `orderGroups`, playbook instance store.

**Depends on:** Phase 4 summary vocabulary; Protect/Manage already shipped.

**Status:** **Passing** (2026-07-30)

**Verification:** Focused tests — `summarizeOpenPositionExits`, `OpenPositionExitsStrip`, `OpenRiskPositionsMenu`, `AccountPanel`; paper: position with OCO+playbook shows both Protect + Manage; bare position shows unprotected + Protect affordance.

---

### Phase 6 — UX: During trade

**Moment:** While in a trade, the same ExitRule model is visible for BE / scale / trail / session flatten progress.

| # | Deliverable |
|---|-------------|
| 6.1 | Live **next Manage rule** chrome: trigger (e.g. +1R / price), distance, action preview |
| 6.2 | After fires: show completed ExitRules (scale filled, BE moved, trail attached) in open-risk / Account / optional chart markers |
| 6.3 | Manual stop drag → conflict policy surfaced (“Manage paused”) in the same chrome |
| 6.4 | Optional: chart markers for armed manage levels (align with manage-notify prices; markers ≠ alerts) |
| 6.5 | Focused tests for next-rule distance + pause messaging |

**Slots:** Exits `role:manage` runtime visibility; Geometry R lock.

**Touch points:** playbook evaluator status, `OpenRiskPositionsMenu`, Account playbook menu, optional chart overlay.

**Depends on:** Phase 5 status chrome; Manage runtime Phases 0–7 shipped.

**Status:** **Passing** (2026-07-30)

**Verification:** Focused playbook+chrome tests; paper: attach half_then_be → chip shows “Scale 50% at +1R”; after scale → “BE” or done state.

---

### Phase 7 — UX: App down / gap (failure mode)

**Moment:** Trader understands (and we verify) that Protect keeps them alive if Edge/Manage dies; gaps are acknowledged.

| # | Deliverable |
|---|-------------|
| 7.1 | Persistent failure-mode copy wherever Protect+Manage attach: broker resting exit is source of survival |
| 7.2 | Readiness / open-risk: if Manage instance armed but no resting protective stop found → **critical** unprotected warning |
| 7.3 | Doc + test: Detach Manage never cancels Protect; Pause never cancels Protect |
| 7.4 | Gap guidance in summary: stop-market vs stop-limit / outdoor gap risk (short factual note, not a new order type) |
| 7.5 | Focused tests for “Manage without Protect” detector |

**Slots:** Exits `binding:restingBroker` primacy; Gates (warn).

**Touch points:** Trade/Protect forms, open-risk, Account, conflict/detach policy tests.

**Depends on:** Phase 5–6 chrome; hybrid model already in architecture.

**Status:** **Passing** (2026-07-30)

**Verification:** Focused safety tests; app-level: detach playbook → broker stop still listed; simulate missing stop → critical warning.

---

### Phase 8 — UX: Journal review

**Moment:** After the trade, Measurement shows planned risk, R, and Manage recipe vs outcome.

| # | Deliverable |
|---|-------------|
| 8.1 | Handoff fields: PositionPlan / ticket risk rows / playbook recipe → journal `plannedRisk*` + manage recipe |
| 8.2 | Auto-fill on journal-linked fills when plan present; keep manual override |
| 8.3 | Trade detail: **Risk policy** section — planned Budget, R, Protect summary, Manage rules fired/skipped |
| 8.4 | Stats remain R-aware (existing); ensure auto-filled planned risk feeds them |
| 8.5 | Focused tests for plannedRiskUsd / R derivation + recipe sync |

**Slots:** Measurement (full loop).

**Touch points:** `rMultiple`, `journalRecipe`, `JournalTradeDetail`, fill → journal link path.

**Depends on:** Phase 1 vocabulary; Phase 4 planned risk rows preferred.

**Status:** **Passing** (2026-07-30)

**Verification:** Focused journal + trading tests; app-level: paper trade with Manage plan → journal Risk policy shows planned risk + recipe without manual edit; manual override preserved on re-sync.

---

### Phase 9 — UX: Copilot

**Moment:** Copilot speaks Budget / Geometry / Protect / Manage in one RiskPolicy vocabulary — no parallel model.

| # | Deliverable |
|---|-------------|
| 9.1 | Compose view: `RiskPolicy` (Zod or plain) from Plan + Protect + Manage inputs — **view only**, no runtime merge |
| 9.2 | `preview_risk_policy` tool **or** extend `preview_order` / `preview_playbook` to return the same slot summary as Phase 4 UI |
| 9.3 | Tool descriptions / agent guidance use Budget, Sizing, Geometry, Exits, Gates, Measurement names |
| 9.4 | Optional: `get_risk_settings` paired with read of bound geometry for a “current plan” answer |
| 9.5 | Focused AI tool tests |

**Slots:** all (read/preview).

**Touch points:** `src/lib/ai/tools/trading.ts`, `sessionState.ts`, new `riskPolicy` compose module.

**Depends on:** Phase 1; Phase 4 summary derivation reusable; do not block Phases 5–8.

**Status:** **Passing** (2026-07-30)

**Verification:** Unit tests for compose/preview; tool test returns slot-complete summary for a fixture bracket+preset.

---

### Phase 10 — UX: Account kills (day loss / open heat)

**Moment:** Account-level Gates stop new risk (and optionally flatten) using the same RiskPolicy Budget/Gates slots — not per-symbol playbook rules.

| # | Deliverable |
|---|-------------|
| 10.1 | Settings model + persistence: max daily loss and/or max open heat (% equity — open Q #2 resolved) |
| 10.2 | Enforce in `TradingService` / readiness (fail closed on breach for **new** entries) |
| 10.3 | Optional flatten / halt on breach (live confirm) — **deferred**; block-only shipped |
| 10.4 | Open-risk chrome: heat vs cap + day P&L vs cap |
| 10.5 | Trade ticket / Risk sidebar: soft warning when next trade would breach heat |
| 10.6 | Focused tests + paper proof |

**Slots:** Budget (caps), Gates (account), Measurement (chrome).

**Touch points:** settings prefs, `tradingReadiness`, `validateOrder` / safety, open-risk, Risk sidebar, Trade ticket.

**Depends on:** Phase 0 vocabulary; Phase 5 chrome for heat display; reuses kill-switch patterns.

**Status:** **Passing** (2026-07-30)

**Verification:** Focused safety tests; paper: breach blocks new entry; chrome shows heat/day loss vs cap.

---

## Appendix A — Worked examples

### A1. Classic 1% stop-distance trade (Edge Plan + Protect)

| Slot | Value |
|------|-------|
| Scope | trade |
| Budget | `1% equity` per trade |
| Sizing | `stopDistance` from entry/stop |
| Geometry | entry + initialStop; optional TP at +2R |
| Exits | (1) protect `priceLevel=initialStop` → flatten, `restingBroker`, full · (2) takeProfit `rMultiple=+2` → flatten, `restingBroker`, full, OCO with stop |
| Adds | none |
| Gates | readiness + kill switch; optional min R:R |
| Measurement | lock R + planned $ risk at entry |
| Failure mode | Broker OCO/stop remains if Edge down |

### A2. Half + trail Manage preset (`half_plus_trail`)

| Slot | Value |
|------|-------|
| Budget / Sizing / Geometry | **inherits Plan** |
| Protect | **inherits** resting stop (and optional TP) from bracket/OCO |
| Exits (Manage) | (1) at `+1R` → `reduce 50%` · (2) requires #1 → `attachTrail` on remainder |
| Binding | Manage via app evaluator; Protect still resting |
| Failure mode | Last Protect stop/trail at broker if manager down |

### A3. Day-loss account Gate (Phase 10 shipped)

| Slot | Value |
|------|-------|
| Scope | account |
| Budget | `periodLossCap = −3%` day |
| Sizing / Geometry / trade Exits | none (inherits per-trade policies) |
| Exits | on breach → optional flatten all |
| Gates | block new entries; `haltTrading` |
| Measurement | day P&L vs cap in chrome |

---

## Appendix B — Mapping to shipped playbook presets

| Preset id | Manage ExitRules (summary) | Still requires from Plan/Protect |
|-----------|----------------------------|----------------------------------|
| `break_even` | +1R → modifyStop BE | Budget, size, resting stop |
| `half_then_be` | +1R → reduce 50%; scaleFill → BE | same |
| `half_plus_trail` | +1R → reduce 50%; scaleFill → attachTrail | same |
| `scale_3x` | ⅓ at 1R / 2R; BE after first; trail runner | same |
| `daytrade_flatten` | sessionFlatten → flatten | same |

Phase 1 pastes the 12-question checklist onto each preset in `playbook/presetRiskPolicy.ts` (developer map; not UI schema).

---

## Open questions

1. Hard-reject submit without Protect on **live** — **Phase 4:** soft warn only; hard reject deferred.
2. Open heat unit: **% equity** (sum of Manage `PositionPlan` planned `$` / NetLiq) — **Phase 10 resolved**; R-only deferred.
3. Risk panel bind vs Trade-setup bind — unify to one Geometry source? (**Phase 3**; prefer unify)
4. Options: keep calculator-only until options execution exists, then extend RiskPolicy compose? (**after Phase 9**)

---

## Source / touch points (by phase)

| Area | Path | Phases |
|------|------|--------|
| Plan / chart Geometry | `src/lib/risk/`, chart-core `risk/`, `positionTradeSetup` | 2–3 |
| Risk sidebar | `RiskSettingsPanel`, bind contexts | 3 |
| Protect / ticket | `bracketPlan.ts`, `TradeOrderForm`, `ProtectiveOcoForm` | 4–5, 7 |
| Manage / during | `src/lib/trading/playbook/`, open-risk chrome | 5–7 |
| Journal Measurement | `rMultiple`, `journalRecipe`, `JournalTradeDetail` | 8 |
| Copilot | `src/lib/ai/tools/trading.ts`, compose module | 9 |
| Account Gates | settings, `tradingReadiness`, `validateOrder` | 10 |
| Docs | this file; `src/lib/trading/ARCHITECTURE.md` | 0–1 |
