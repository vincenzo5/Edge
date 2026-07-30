# Risk — Plan (Budget + Sizing + Geometry bind)

Pre-trade risk math and session budget settings. Protect (broker brackets/OCO) and Manage (playbook rules) live under `src/lib/trading/` — see [trading/ARCHITECTURE.md](../trading/ARCHITECTURE.md) RiskPolicy spine.

Full RiskPolicy slot definitions: [Risk Management System Roadmap](../../../docs/roadmaps/risk-management-system-roadmap.md).

## Module roles

| Module | RiskPolicy slot | Role |
|--------|-----------------|------|
| `riskSettings.ts` | **Budget** | Session `$` or `% NetLiq` → `resolveDollarRisk` |
| `equityPositionSize.ts` | **Sizing** | Shares from entry/stop + dollar risk (`stopDistance` method) |
| `riskPositionBinding.ts` | **Geometry (bind)** | Auto-bind newest long/short drawing on active chart → Risk panel |
| `marginContext.ts` | Gates / Measurement (soft) | Margin / liquidation helpers for chart overlay |
| `optionsStrategyRisk.ts` | Budget + Sizing (options) | Multi-leg max loss → contract count (calculator-only until options exec) |
| `createRiskRulerPreset.ts`, `premiumProjection.ts`, `optionPresetChain.ts` | Geometry helpers | Risk ruler / options chain presets |

## UI surfaces

| Surface | Path | Slots |
|---------|------|-------|
| Risk sidebar | `RiskSettingsPanel.tsx` | Budget + Sizing (bound geometry) |
| Chart overlay | `useRiskDrawingBinding.ts`, chart-core `risk/*` | Geometry labels, R targets, validation |
| Trade ticket | `TradeOrderForm.tsx` (via Trade setup bind) | Budget→Sizing handoff; separate bind from Risk panel |

## Dual geometry bind (open question #3)

Two independent binds feed Plan geometry today:

1. **Risk panel** — `RiskPositionBindingContext` + `riskPositionBinding.ts` (newest position drawing on active chart).
2. **Trade setup** — `TradeSetupBindingContext` + context-menu **Trade setup…** (explicit `{ cellId, drawingId }`).

Both should derive levels from live drawing points (`positionTradeSetup.ts`), not stale `metadata.fields.riskSetup`. Unifying to one source of truth is Phase 3 of the risk-management track.

## Measurement at Plan time

- **R unit** preview: chart-core risk labels from entry/stop distance.
- **Planned $ risk**: `resolveDollarRisk` × sized qty via `equityPositionSize`.
- **Lock at Manage attach**: `PositionPlan` in `playbook/types.ts` freezes entry, initialStop, qty, rUnit — used for R-multiple manage rules.

Journal planned-risk auto-sync from Plan/Protect attach is Phase 8.

## Failure mode (Plan layer)

Plan does not place protective orders. A trade sized in the Risk panel without Protect attached has **no** `restingBroker` exit until the ticket submits a bracket/OCO or the trader attaches Protect on an open position. Manage presets **inherit** Protect from the ticket — see `playbook/presetRiskPolicy.ts` and trading ARCHITECTURE hybrid failure mode.
