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
| Chart selection strip | `PositionGeometryStrip.tsx` via `DrawingSelectionChrome.tsx` | Geometry + Measurement preview (Budget/Sizing read-only) |
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

- **Selection strip:** `computePositionRiskPreview` + `PositionGeometryStrip` show entry/stop/target, R unit, R:R, and (when budget resolves) planned $ risk + qty on selected long/short drawings.
- **Canvas labels:** `position_tool` uses live `boxFromPoints` for geometry; qty/$ amounts only when `metadata.fields.qty` is explicitly set — no `DEFAULT_RISK_ACCOUNT` fallback on the label path.
- **Sizing math:** strip uses `computeEquityPositionSize` (same as Risk sidebar), not chart-core `computeRiskMetrics`.

## Measurement at Plan time

- **R unit** preview: chart-core risk labels from entry/stop distance.
- **Planned $ risk**: `resolveDollarRisk` × sized qty via `equityPositionSize`.
- **Lock at Manage attach**: `PositionPlan` in `playbook/types.ts` freezes entry, initialStop, qty, rUnit — used for R-multiple manage rules.

Journal planned-risk auto-sync from PositionPlan on Manage journal sync (Phase 8 **Passing**): `playbook/journalRiskHandoff.ts` derives USD mode/value; `syncManagePlaybookToJournal` fill-if-empty; `JournalTradeDetail` Risk policy section.

## Failure mode (Plan layer)

Plan does not place protective orders. A trade sized in the Risk panel without Protect attached has **no** `restingBroker` exit until the ticket submits a bracket/OCO or the trader attaches Protect on an open position. Manage presets **inherit** Protect from the ticket — see `playbook/presetRiskPolicy.ts` and trading ARCHITECTURE hybrid failure mode.
