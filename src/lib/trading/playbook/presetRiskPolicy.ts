import type { PlaybookPresetId } from "./presets";

/**
 * 12-question RiskPolicy completeness checklist (roadmap Phase 0 § Completeness).
 * Developer map only — not part of PlaybookTemplateSchema or UI.
 * @see docs/roadmaps/risk-management-system-roadmap.md
 */
export const RISK_POLICY_COMPLETENESS_KEYS = [
  "scope",
  "budget",
  "sizing",
  "geometry",
  "protectExit",
  "profitExits",
  "otherExits",
  "manageMigrations",
  "adds",
  "gates",
  "measurement",
  "failureMode",
] as const;

export type RiskPolicyCompletenessKey = (typeof RISK_POLICY_COMPLETENESS_KEYS)[number];

export type PresetRiskPolicyCompleteness = Record<RiskPolicyCompletenessKey, string>;

/** Shared Plan/Protect inherit text for Manage-only presets. */
const INHERIT_PLAN_PROTECT = {
  scope: "trade",
  budget: "inherits Plan — riskSettings resolveDollarRisk ($ or % NetLiq)",
  sizing: "inherits Plan — stopDistance via equityPositionSize from entry/stop + dollar risk",
  geometry:
    "inherits Plan — PositionPlan lock at attach: entry, initialStop, qty, rUnit = |entry − initialStop|",
  protectExit:
    "inherits Protect — resting stop (and optional TP) from bracket/OCO at submit; binding:restingBroker, full qty",
  gates:
    "inherits Plan/Protect — trading readiness, kill switch, short block, PDT soft, live confirm on live mutates",
  measurement:
    "inherits Plan/Protect — PositionPlan locks R + qty at Manage attach; journal recipe sync on fire/detach",
  failureMode:
    "hybrid Protect-at-broker — last broker stop/OCO/trail survives if Manage/app down; detach never cancels Protect (CONFLICT_POLICY)",
  adds: "none",
} as const satisfies Partial<PresetRiskPolicyCompleteness>;

export const PLAYBOOK_PRESET_RISK_POLICY: Record<
  PlaybookPresetId,
  PresetRiskPolicyCompleteness
> = {
  break_even: {
    ...INHERIT_PLAN_PROTECT,
    profitExits: "none — Manage preset; optional resting TP from Protect OCO if attached at ticket",
    otherExits: "none",
    manageMigrations:
      "ExitRule manage: +1R (multipleOfR) → modifyStop breakEven; binding:managedApp; once",
  },
  half_then_be: {
    ...INHERIT_PLAN_PROTECT,
    profitExits:
      "ExitRule takeProfit (Manage): +1R → reduceQty 50%; fraction 0.5 of filled qty; binding:managedApp",
    otherExits: "none",
    manageMigrations:
      "requires chain: scale-half-1r (+1R reduce 50%) → be-after-half (scaleFill → modifyStop BE); binding:managedApp",
  },
  half_plus_trail: {
    ...INHERIT_PLAN_PROTECT,
    profitExits:
      "ExitRule takeProfit (Manage): +1R → reduceQty 50%; fraction 0.5; binding:managedApp",
    otherExits: "none",
    manageMigrations:
      "requires chain: scale-half-1r (+1R reduce 50%) → trail-remainder (scaleFill → attachTrail $1 trail on remainder); binding:managedApp",
  },
  scale_3x: {
    ...INHERIT_PLAN_PROTECT,
    profitExits:
      "ExitRules takeProfit (Manage): ⅓ at +1R, ⅓ at +2R (reduceQty fractions ⅓ each); sum ≤ 1; binding:managedApp",
    otherExits: "none",
    manageMigrations:
      "requires chain: scale-third-1r → be-after-first-scale (BE) → scale-third-2r → trail-runner (attachTrail on runner); binding:managedApp",
  },
  daytrade_flatten: {
    ...INHERIT_PLAN_PROTECT,
    profitExits: "none",
    otherExits:
      "ExitRule flatten: sessionFlatten (5m before close) → flatten full remainder; binding:managedApp",
    manageMigrations:
      "ExitRule manage: +1R → modifyStop BE; then session-flatten rule (priority 2); binding:managedApp",
  },
};

export function getPresetRiskPolicyCompleteness(
  id: PlaybookPresetId,
): PresetRiskPolicyCompleteness {
  return PLAYBOOK_PRESET_RISK_POLICY[id];
}
