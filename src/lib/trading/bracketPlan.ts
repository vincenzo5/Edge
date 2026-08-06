import type { BracketPlan, BracketStopLeg, OrderDraft, ProtectiveOcoPlan } from "./types";
import type { PositionOrderLevels } from "./positionTradeSetup";

export function resolveBracketExitQuantities(plan: BracketPlan): {
  takeProfitQuantity: number;
  stopQuantity: number;
} {
  const entryQty = plan.entry.quantity;
  return {
    takeProfitQuantity: plan.takeProfitQuantity ?? entryQty,
    stopQuantity: plan.stopQuantity ?? entryQty,
  };
}

export function resolveProtectiveOcoExitQuantities(plan: ProtectiveOcoPlan): {
  takeProfitQuantity: number;
  stopQuantity: number;
} {
  return {
    takeProfitQuantity: plan.takeProfitQuantity ?? plan.quantity,
    stopQuantity: plan.stopQuantity ?? plan.quantity,
  };
}

export function exitSideForEntry(entrySide: OrderDraft["side"]): OrderDraft["side"] {
  return entrySide === "BUY" ? "SELL" : "BUY";
}

export function buildFixedStopLeg(stopPrice: number): BracketStopLeg {
  return { mode: "fixed", stopPrice };
}

export function buildTrailStopLeg(args: {
  trailAmount?: number;
  trailPercent?: number;
  trailRMultiple?: number;
}): BracketStopLeg {
  return {
    mode: "trail",
    trailAmount: args.trailAmount,
    trailPercent: args.trailPercent,
    trailRMultiple: args.trailRMultiple,
  };
}

export function buildBracketPlanFromLevels(args: {
  entry: OrderDraft;
  planLevels: PositionOrderLevels;
  stopLeg?: BracketStopLeg;
  stopPrice?: number;
  takeProfitPrice?: number;
}): BracketPlan {
  return buildBracketPlanWithPrices({
    entry: args.entry,
    stopPrice: args.stopPrice ?? args.planLevels.stop,
    takeProfitPrice: args.takeProfitPrice ?? args.planLevels.target,
    stopLeg: args.stopLeg,
  });
}

export function buildBracketPlanWithPrices(args: {
  entry: OrderDraft;
  stopPrice: number;
  takeProfitPrice?: number;
  stopLeg?: BracketStopLeg;
  takeProfitQuantity?: number;
  stopQuantity?: number;
}): BracketPlan {
  return {
    entry: args.entry,
    stopLeg: args.stopLeg ?? buildFixedStopLeg(args.stopPrice),
    ...(args.takeProfitPrice != null ? { takeProfitPrice: args.takeProfitPrice } : {}),
    ...(args.takeProfitQuantity != null ? { takeProfitQuantity: args.takeProfitQuantity } : {}),
    ...(args.stopQuantity != null ? { stopQuantity: args.stopQuantity } : {}),
  };
}

export function buildProtectiveOcoFromLevels(args: {
  accountId: string;
  symbol: string;
  quantity: number;
  planLevels: PositionOrderLevels;
  environment: OrderDraft["environment"];
  outsideRth?: boolean;
  tif?: OrderDraft["tif"];
  stopLeg?: BracketStopLeg;
  takeProfitPrice?: number;
  takeProfitQuantity?: number;
  stopQuantity?: number;
}): ProtectiveOcoPlan {
  const takeProfitPrice = args.takeProfitPrice ?? args.planLevels.target;
  return {
    accountId: args.accountId,
    symbol: args.symbol.trim().toUpperCase(),
    quantity: args.quantity,
    side: exitSideForEntry(args.planLevels.side),
    stopLeg: args.stopLeg ?? buildFixedStopLeg(args.planLevels.stop),
    ...(takeProfitPrice != null && Number.isFinite(takeProfitPrice)
      ? { takeProfitPrice }
      : {}),
    ...(args.takeProfitQuantity != null ? { takeProfitQuantity: args.takeProfitQuantity } : {}),
    ...(args.stopQuantity != null ? { stopQuantity: args.stopQuantity } : {}),
    outsideRth: args.outsideRth ?? false,
    tif: args.tif ?? "DAY",
    environment: args.environment,
  };
}

export function validateBracketGeometry(plan: BracketPlan): string | null {
  const { entry, stopLeg, takeProfitPrice } = plan;
  const stopPrice = stopLeg.stopPrice;
  if (stopLeg.mode === "fixed" && stopPrice == null) {
    return "Fixed stop leg requires stopPrice";
  }
  if (takeProfitPrice == null) return null;
  if (entry.side === "BUY") {
    if (stopPrice != null && takeProfitPrice <= stopPrice) {
      return "Take profit must be above stop for long bracket";
    }
  } else if (stopPrice != null && takeProfitPrice >= stopPrice) {
    return "Take profit must be below stop for short bracket";
  }
  return null;
}
