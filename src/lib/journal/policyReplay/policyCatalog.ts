import type { PolicyId } from "./types";

export const SIMULATED_POLICY_IDS: PolicyId[] = [
  "fixed_1r",
  "fixed_2r",
  "fixed_3r",
  "be_only",
  "half_be",
  "half_trail",
  "scale_3x",
  "full_trail_tight",
  "full_trail_wide",
  "swing_harvest",
  "step_trail_025",
  "step_trail_05",
  "step_trail_1",
];

export const ALL_POLICY_IDS: PolicyId[] = ["actual", ...SIMULATED_POLICY_IDS];

export const POLICY_NAMES: Record<PolicyId, string> = {
  actual: "Actual (what you did)",
  fixed_1r: "Fixed 1R TP",
  fixed_2r: "Fixed 2R TP",
  fixed_3r: "Fixed 3R TP",
  be_only: "BE at +1R",
  half_be: "Half then BE",
  half_trail: "Half + 0.75R trail",
  scale_3x: "Scale 3×",
  full_trail_tight: "Full trail 0.5R (continuous)",
  full_trail_wide: "Full trail 1R (continuous)",
  swing_harvest: "Swing harvest",
  step_trail_025: "Step trail 0.25R",
  step_trail_05: "Step trail 0.5R",
  step_trail_1: "Step trail 1R",
};

export const POLICY_LEVERS: Record<PolicyId, string> = {
  actual: "Your real exits from IB fills",
  fixed_1r: "Hard TP @ +1R · stop −1R",
  fixed_2r: "Hard TP @ +2R · stop −1R",
  fixed_3r: "Hard TP @ +3R · stop −1R",
  be_only: "No TP · stop → BE at +1R",
  half_be: "50% @ +1R · remainder BE",
  half_trail: "50% @ +1R · continuous trail 0.75R",
  scale_3x: "⅓@1R · BE · ⅓@2R · trail runner",
  full_trail_tight: "After +1R: stop = peak − 0.5R on every new high close",
  full_trail_wide: "After +1R: stop = peak − 1R on every new high close",
  swing_harvest: "40% @1R · BE · continuous 0.75R trail on 60%",
  step_trail_025: "At +0.25R → BE; each next +0.25R milestone → stop up 0.25R",
  step_trail_05: "At +0.5R → BE; each next +0.5R milestone → stop up 0.5R",
  step_trail_1: "At +1R → BE; each next +1R milestone → stop up 1R",
};

const STEP_TRAIL_R: Partial<Record<PolicyId, number>> = {
  step_trail_025: 0.25,
  step_trail_05: 0.5,
  step_trail_1: 1,
};

export function stepTrailRForPolicy(policyId: PolicyId): number | null {
  return STEP_TRAIL_R[policyId] ?? null;
}

/** Same milestone math as `buildStepTrailRules`: stop locks one step behind peak milestone. */
export function stepTrailStopR(peakR: number, stepR: number): number {
  const k = Math.floor(peakR / stepR + 1e-12);
  if (k < 1) return -1;
  return (k - 1) * stepR;
}

export const REPLAY_NOTE =
  "1R = plannedRiskUsd/openQty when present, else ATR(14) near entry. Paths = Yahoo daily CLOSES only (confirmed moves). Step trail: at +step → BE; each further step milestone moves stop up by step (stop = lastMilestone − step). Continuous trails arm after +1R and follow peak − width on every new high close.";
