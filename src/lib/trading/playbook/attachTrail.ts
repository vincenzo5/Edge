import type { BracketStopLeg, OrderDraft } from "../types";

import type { PlaybookInstance, PlaybookRule } from "./types";

export function buildTrailOrderDraft(args: {
  instance: PlaybookInstance;
  stopLeg: BracketStopLeg;
  quantity: number;
}): OrderDraft {
  const plan = args.instance.positionPlan;
  const stopLeg = args.stopLeg;
  const draft: OrderDraft = {
    accountId: plan.accountId,
    symbol: plan.symbol,
    side: plan.side === "BUY" ? "SELL" : "BUY",
    quantity: args.quantity,
    orderType: "TRAIL",
    environment: plan.environment,
    outsideRth: false,
    tif: "DAY",
  };
  if (stopLeg.trailPercent != null) {
    draft.trailPercent = stopLeg.trailPercent;
  } else if (stopLeg.trailAmount != null) {
    draft.stopPrice = stopLeg.trailAmount;
  }
  return draft;
}

export function resolveAttachTrailRule(rule: PlaybookRule): BracketStopLeg | null {
  if (rule.then.kind !== "attachTrail") return null;
  return rule.then.stopLeg;
}
