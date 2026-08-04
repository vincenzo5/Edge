import type { BracketStopLeg, OrderDraft } from "../types";
import {
  defaultManagePlacementRecipe,
  entryOrderToDraftFields,
  type OrderExecutionRecipe,
} from "../orderExecutionRecipe";

import type { PlaybookInstance, PlaybookRule } from "./types";

/** Resolve trail distance in dollars from amount, percent, or R multiple. */
export function resolveTrailAmountDollars(
  stopLeg: BracketStopLeg,
  rUnit: number,
): number | null {
  if (stopLeg.trailPercent != null) return null;
  if (stopLeg.trailAmount != null && Number.isFinite(stopLeg.trailAmount)) {
    return stopLeg.trailAmount;
  }
  if (
    stopLeg.trailRMultiple != null &&
    Number.isFinite(stopLeg.trailRMultiple) &&
    Number.isFinite(rUnit) &&
    rUnit > 0
  ) {
    return stopLeg.trailRMultiple * rUnit;
  }
  return null;
}

export function buildTrailOrderDraft(args: {
  instance: PlaybookInstance;
  stopLeg: BracketStopLeg;
  quantity: number;
  placement?: OrderExecutionRecipe;
}): OrderDraft {
  const plan = args.instance.positionPlan;
  const stopLeg = args.stopLeg;
  const recipe = args.placement ?? defaultManagePlacementRecipe();
  const fields = entryOrderToDraftFields({
    ...recipe,
    orderType: "TRAIL",
    tif: recipe.tif,
  });
  const draft: OrderDraft = {
    accountId: plan.accountId,
    symbol: plan.symbol,
    side: plan.side === "BUY" ? "SELL" : "BUY",
    quantity: args.quantity,
    orderType: "TRAIL",
    environment: plan.environment,
    outsideRth: fields.outsideRth,
    tif: fields.tif,
    allOrNone: fields.allOrNone,
    usePriceMgmtAlgo: fields.usePriceMgmtAlgo,
  };
  if (stopLeg.trailPercent != null) {
    draft.trailPercent = stopLeg.trailPercent;
  } else {
    const amount = resolveTrailAmountDollars(stopLeg, plan.rUnit);
    if (amount != null) {
      draft.stopPrice = amount;
    }
  }
  return draft;
}

export function resolveAttachTrailRule(rule: PlaybookRule): BracketStopLeg | null {
  if (rule.then.kind !== "attachTrail") return null;
  return rule.then.stopLeg;
}
