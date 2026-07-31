# Risk — Plan (Budget + Sizing + Geometry bind)

Pre-trade risk math and session budget settings. Protect (broker brackets/OCO) and Manage (playbook rules) live under `src/lib/trading/` — see [trading/ARCHITECTURE.md](../trading/ARCHITECTURE.md) RiskPolicy spine.

Full RiskPolicy slot definitions: [Risk Management System Roadmap](../../../docs/roadmaps/risk-management-system-roadmap.md).

## Module roles

| Module | RiskPolicy slot | Role |
|--------|-----------------|------|
| `riskSettings.ts` | **Budget** | Session `$` or `% NetLiq` → `resolveDollarRisk` |
| `equityPositionSize.ts` | **Sizing** | Shares from entry/stop + dollar risk (`stopDistance` method) |
| `computePositionRiskPreview.ts` | **Geometry + Sizing preview** | Live drawing points + `resolveDollarRisk` → strip/summary (Phase 2) |
| `riskPositionBinding.ts` | **Geometry (bind)** | Auto-bind newest long/short drawing on active chart → Risk panel |
| `marginContext.ts` | Gates / Measurement (soft) | Margin / liquidation helpers for chart overlay |
| `optionsStrategyRisk.ts` | Budget + Sizing (options) | Multi-leg max loss → contract count (calculator-only until options exec) |
| `createRiskRulerPreset.ts`, `premiumProjection.ts`, `optionPresetChain.ts` | Geometry helpers | Risk ruler / options chain presets |

## UI surfaces

| Surface | Path | Slots |
|---------|------|-------|
| Risk sidebar | `RiskSettingsPanel.tsx` | Budget + Sizing (bound geometry) |
| Chart selection strip | `PositionPlanPanel.tsx` via `DrawingSelectionChrome.tsx` | Editable entry/stop/target + derived Measurement preview (Budget/Sizing read-only) |
| Chart overlay | `useRiskDrawingBinding.ts`, chart-core `risk/*` | Geometry labels, R targets, validation |
| Trade ticket | `TradeOrderForm.tsx`, `ProtectiveOcoForm.tsx` | Budget→Sizing handoff; pre-submit Risk plan summary (Phase 4) |
| Open position | `OpenRiskPositionsMenu.tsx`, `AccountPanel.tsx` | Protect + Manage Exit binding chrome (Phase 5); during-trade progress (Phase 6) |

## Plan geometry bind (Phase 3)

**Plan Geometry source of truth = Risk bind** (`RiskPositionBindingContext` + `riskPositionBinding.ts` persistence).

Trade setup bind (`TradeSetupBindingContext`) is the **ticket consumer**: it mirrors the same `{ cellId, drawingId }` when the trader uses **Trade setup…** on a drawing or **Use in Trade** from the Risk sidebar. Risk auto-bind on newest drawing does **not** push into Trade (avoids clobbering an in-progress ticket).

Both binds derive levels from live drawing points via `positionTradeSetup.ts` — not stale `metadata.fields.riskSetup`.

| Action | Risk bind | Trade bind |
|--------|-----------|------------|
| Auto-bind newest long/short on active chart | yes | no |
| Chart **Trade setup…** | sync same drawing | yes + open Trade panel |
| Risk **Use in Trade** | uses current bind | yes + seed qty from sizing |

Sidebar slot summary: `summarizeRiskPlanSlots.ts` + `RiskPlanSlotStrip.tsx` (Budget / Sizing / Geometry + gaps).

## Phase 4 — Trade ticket Risk plan summary (shipped)

- **Summarizer:** `summarizeSubmitRiskPlan.ts` — Budget / Size / Protect / Manage / warnings / failure-mode one-liner from bracket plan + manage preset.
- **UI:** `SubmitRiskPlanSummary.tsx` on `TradeOrderForm` (compose + confirm) and `ProtectiveOcoForm`.
- **Live without Protect:** soft warn only (`live_unprotected`); submit not blocked (hard reject deferred).
- **Failure mode copy:** `"Broker stop stays live if Edge is down"` when Protect attached — aligns with trading ARCHITECTURE hybrid failure mode.
- **Gap guidance:** `"Stop-market can fill through a gap; stop-limit may not fill if price jumps past the limit."` when Protect attached (Phase 7).

## Phase 5 — Open position Protect + Manage chrome (shipped)

- **Summarizer:** `src/lib/trading/summarizeOpenPositionExits.ts` — derives Protect from open `AccountOrder` rows (closing-side STP/TRAIL + OCO TP peer) and Manage from active playbook instance.
- **UI:** `OpenPositionExitsStrip.tsx` on open-risk popover rows and Account position rows — Protect label, Manage label/distance, unprotected warning, Protect-with-OCO action (Account opens `ProtectiveOcoForm`; open-risk deep-links to Account).
- **Manage controls:** Pause/Resume/Detach labeled **Manage** only; tooltips note broker Protect stays live.

## Phase 6 — During-trade Manage progress (shipped)

- **Display helpers:** `playbook/display.ts` — `formatNextManageActionPreview`, `formatCompletedManageRules`, `resolveManagePauseMessage` (manual stop → `"Manage paused — stop moved manually"`).
- **Summarizer:** `summarizeOpenPositionExits` extended with `nextActionPreview`, `completedLabels`, `pauseMessage` on the manage slot.
- **UI:** `OpenPositionExitsStrip` — next rule line (distance · action preview), `Done:` fired rules, pause warning; same open-risk / Account surfaces as Phase 5.
- **Chart markers:** armed manage levels already render via `manageLevelsForSymbol` in `ChartCell` (playbook track); Phase 6 verifies reuse only.

## Phase 7 — App down / gap failure mode (shipped)

- **Summarizer:** `summarizeOpenPositionExits` — `isActiveManageInstance`, warning `manage_without_protect` when active Manage has no resting broker stop; re-exports `OPEN_POSITION_FAILURE_MODE_COPY` from submit summary.
- **UI:** `OpenPositionExitsStrip` — failure-mode line when Protect attached; critical `--edge-negative` callout for Manage-without-Protect; bare unprotected keeps `--edge-warning`.
- **Submit summary:** `summarizeSubmitRiskPlan` — `gapGuidance` one-liner when Protect attached (`SUBMIT_RISK_GAP_GUIDANCE_COPY`); `SubmitRiskPlanSummary` renders under failure mode.
- **Policy:** `conflictPolicy.pauseAffectsProtectOrders()` — Pause never cancels Protect; service test asserts `mockPort.cancel` not called on pause/detach.

## Phase 2 — Drawing geometry strip (shipped)

- **Selection strip:** `computePositionRiskPreview` + `PositionPlanPanel` show editable entry/stop/target plus derived R unit, R:R, and (when budget resolves) planned $ risk + qty on selected long/short drawings.
- **Canvas labels:** `position_tool` uses live `boxFromPoints` for geometry; qty/$ amounts only when `metadata.fields.qty` is explicitly set — no `DEFAULT_RISK_ACCOUNT` fallback on the label path.
- **Sizing math:** strip uses `computeEquityPositionSize` (same as Risk sidebar), not chart-core `computeRiskMetrics`.

## Measurement at Plan time

- **R unit** preview: chart-core risk labels from entry/stop distance.
- **Planned $ risk**: `resolveDollarRisk` × sized qty via `equityPositionSize`.
- **Lock at Manage attach**: `PositionPlan` in `playbook/types.ts` freezes entry, initialStop, qty, rUnit — used for R-multiple manage rules.

Journal planned-risk auto-sync from PositionPlan on Manage journal sync (Phase 8 **Passing**): `playbook/journalRiskHandoff.ts` derives USD mode/value; `syncManagePlaybookToJournal` fill-if-empty; `JournalTradeDetail` Risk policy section.

## Phase 9 — Copilot RiskPolicy compose (shipped)

- **Compose:** `composeRiskPolicyView.ts` — view-only RiskPolicy from Plan + Protect + Manage inputs; Zod input schema; reuses `summarizeSubmitRiskPlan` for Phase 4 slot parity.
- **AI tool:** `preview_risk_policy` in `src/lib/ai/tools/trading.ts` — read-only slot summary for Copilot; fills Budget from `get_risk_settings` when `dollarRisk` omitted.
- **Vocabulary:** tool descriptions + `SYSTEM_PROMPT_BASE` use Budget, Sizing, Geometry, Exits, Gates, Measurement slot names.

## Phase 10 — Account kills (shipped)

- **Settings:** `RiskSettingsSchema` optional `periodLossCapPercent` / `openHeatCapPercent` (% NetLiq; null = off) — localStorage + cloud prefs embed.
- **Pure gates:** `accountRiskGates.ts` — day P&L vs cap; open heat = Σ Manage `PositionPlan` planned `$` / NetLiq; proposed-trade projection for soft warn.
- **Enforce:** `TradingService.assertPreTrade` fail-closed on day-loss / heat breach for **BUY** (new risk); `resolveServerRiskSettings` loads caps from prefs when Postgres configured.
- **Chrome:** `AccountRiskGateStrip` on Risk sidebar, open-risk popover, Account panel; soft warn via `summarizeSubmitRiskPlan` (`account_heat_would_breach`, `account_heat_incomplete`).
- **Deferred:** auto-flatten on breach (roadmap 10.3) — block new entries only this phase.

## Phase 1 — RiskPolicy Zod spine (shipped)

- **Module:** `src/lib/risk/policy/` — `RiskPolicyTemplate` / `RiskPolicyInstance` / `ExitRule` / `EntrySchedule` Zod schemas; `fromPlaybook` adapter (Manage presets → incomplete templates); structural completeness + `derivePolicyIntegrity`; last-used-by-side preference stub (`edge:risk:lastUsedPolicyBySide:v1`).
- **Playbook runtime unchanged:** Manage attach/evaluate still uses `rules`; policy slots persist beside `rules`.
- **Roadmap:** [Risk Policy Data Model Phase 1](../../../docs/roadmaps/risk-policy-data-model-roadmap.md).

## Phase 2 — RiskPolicy persistence (shipped)

- **Migration:** `src/db/migrations/0039_risk_policy_spine.sql` — template slot jsonb columns; instance denormalized trade key, protect/schedule fields; partial unique indexes (one active per trade, one planned per binding); backfill from `position_plan`.
- **Stores/repos:** `playbookTemplateRepository`, `playbookInstanceRepository`, memory/postgres playbook stores — read/write spine columns; snapshot parse via `instancePersistence.ts` (RiskPolicy or Playbook template).
- **Apply:** `applyRiskPolicy({ onConflict: "reject" | "swap" })` in `src/lib/risk/policy/applyRiskPolicy.ts` — creates `planned` instances; swap supersedes/detaches incumbent with `offReason: swapped`.
- **Template dual-write:** `templatePersistence.ts` — managedApp exits → `rules` column for evaluator back-compat.
- **Not shipped:** evaluator binding filter, protect reconciler persistence, schedule worker, apply UX (Phases 3–5).
- **Roadmap:** [Risk Policy Data Model Phase 2](../../../docs/roadmaps/risk-policy-data-model-roadmap.md).

## Phase 3 — RiskPolicy runtime wire (shipped)

- **Evaluator:** `runPlaybookEvaluation.ts` — skips non-`managedApp` exits (`bindingFilter.ts`); persists `protectState` via `reconcileProtect.ts` each evaluate tick.
- **Manual-off:** `pausePlaybookInstance` / `detachPlaybookInstance` assert conflict-policy invariants; `cancelProtectForInstance` + `POST .../playbooks/[id]/cancel-protect` cancels broker Protect only.
- **Schedule:** `resolveEntrySchedule.ts`, `promotePlannedInstances.ts` — materialize `scheduledFor`, promote due `planned` → `pending_fill` inside `evaluatePlaybooks()` (reuses `/api/cron/playbook-evaluate`).
- **Journal M5:** migration `0040_journal_risk_policy_instance_id.sql` — `journal_trades.risk_policy_instance_id`; sync from `managePlaybook.instanceId` on journal recipe write.
- **Not shipped:** Policies library UI, chart apply UX (Phases 4–5).
- **Roadmap:** [Risk Policy Data Model Phase 3](../../../docs/roadmaps/risk-policy-data-model-roadmap.md).

## Failure mode (Plan layer)

Plan does not place protective orders. A trade sized in the Risk panel without Protect attached has **no** `restingBroker` exit until the ticket submits a bracket/OCO or the trader attaches Protect on an open position. Manage presets **inherit** Protect from the ticket — see `playbook/presetRiskPolicy.ts` and trading ARCHITECTURE hybrid failure mode.
