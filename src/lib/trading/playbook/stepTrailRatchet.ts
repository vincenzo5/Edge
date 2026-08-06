import { stepTrailStopR } from "@/lib/journal/policyReplay/policyCatalog";

import type { ManageState, PlaybookTemplate, PositionPlan } from "./types";
import { priceAtMultipleOfR } from "./types";

const EPS = 1e-9;

/** Detect step-trail step size from template name or first step-be rule. */
export function resolveStepTrailRFromTemplate(template: PlaybookTemplate): number | null {
  const nameMatch = template.name.match(/step\s*trail\s*([\d.]+)\s*r/i);
  if (nameMatch?.[1]) {
    const parsed = Number.parseFloat(nameMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const firstStep = template.rules.find((rule) => rule.id.startsWith("step-be-"));
  if (firstStep?.when.kind === "multipleOfR") {
    return firstStep.when.multiple;
  }
  return null;
}

export function initialManageStateForTemplate(template: PlaybookTemplate): ManageState | null {
  const stepR = resolveStepTrailRFromTemplate(template);
  if (stepR == null) return null;
  return { kind: "stepTrailR", stepR, highestMilestoneR: 0 };
}

export function currentRFromPrice(plan: PositionPlan, lastPrice: number): number {
  if (plan.rUnit <= 0) return -1;
  if (plan.side === "BUY") {
    return (lastPrice - plan.entry) / plan.rUnit;
  }
  return (plan.entry - lastPrice) / plan.rUnit;
}

export function lockPositionPlanOnFill(plan: PositionPlan, fillPrice: number): PositionPlan {
  const rUnit = Math.abs(fillPrice - plan.initialStop);
  if (!(rUnit > 0)) return plan;
  return {
    ...plan,
    entry: fillPrice,
    rUnit,
  };
}

export function stopPriceForLockedR(plan: PositionPlan, stopR: number): number {
  return priceAtMultipleOfR(plan, stopR);
}

export function computeStepTrailRatchet(args: {
  plan: PositionPlan;
  manageState: ManageState;
  lastPrice: number;
}): { nextStopPrice: number; nextMilestoneR: number } | null {
  if (args.manageState.kind !== "stepTrailR") return null;
  const stepR = args.manageState.stepR;
  const peakR = currentRFromPrice(args.plan, args.lastPrice);
  const stopR = stepTrailStopR(peakR, stepR);
  if (stopR <= -1 + EPS) return null;
  const nextStopPrice = stopPriceForLockedR(args.plan, stopR);
  const k = Math.floor(peakR / stepR + EPS);
  const nextMilestoneR = k >= 1 ? k * stepR : 0;
  return { nextStopPrice, nextMilestoneR };
}

export function shouldTightenStop(
  plan: PositionPlan,
  lastAppliedStopPrice: number | undefined,
  nextStopPrice: number,
): boolean {
  if (lastAppliedStopPrice == null) return true;
  if (plan.side === "BUY") {
    return nextStopPrice > lastAppliedStopPrice + EPS;
  }
  return nextStopPrice < lastAppliedStopPrice - EPS;
}
