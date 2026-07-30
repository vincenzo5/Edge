import { plannedRiskDollars } from "../positionTradeSetup";

import type { PositionPlan } from "./types";

export type PositionPlanRiskInput = Pick<PositionPlan, "entry" | "initialStop" | "qty">;

export type DerivedPlannedRisk = {
  mode: "usd";
  value: number;
};

export type PositionPlanJournalSnapshot = {
  entry: number;
  initialStop: number;
  qty: number;
  rUnit: number;
  side: PositionPlan["side"];
};

export function derivePlannedRiskFromPositionPlan(
  plan: PositionPlanRiskInput,
): DerivedPlannedRisk | null {
  const value = plannedRiskDollars(plan.entry, plan.initialStop, plan.qty);
  if (!Number.isFinite(value) || value <= 0) return null;
  return { mode: "usd", value };
}

export function buildPositionPlanJournalSnapshot(
  plan: PositionPlan,
): PositionPlanJournalSnapshot {
  return {
    entry: plan.entry,
    initialStop: plan.initialStop,
    qty: plan.qty,
    rUnit: plan.rUnit,
    side: plan.side,
  };
}

export function formatProtectSummaryFromPositionPlan(plan: PositionPlanRiskInput): string {
  return `Stop @ ${plan.initialStop}`;
}

export function tradePlannedRiskIsEmpty(trade: {
  plannedRiskMode?: string | null;
  plannedRiskValue?: number | null;
}): boolean {
  return (trade.plannedRiskMode ?? null) == null && (trade.plannedRiskValue ?? null) == null;
}

export function plannedRiskMatchesPositionPlanSnapshot(
  trade: {
    plannedRiskMode?: string | null;
    plannedRiskValue?: number | null;
  },
  snapshot: PositionPlanRiskInput | null | undefined,
): boolean {
  if (!snapshot) return false;
  const derived = derivePlannedRiskFromPositionPlan(snapshot);
  if (!derived) return false;
  return trade.plannedRiskMode === derived.mode && trade.plannedRiskValue === derived.value;
}
