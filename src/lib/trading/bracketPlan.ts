import type { BracketPlan, BracketStopLeg, OrderDraft, ProtectiveOcoPlan } from "./types";
import type { PositionOrderLevels } from "./positionTradeSetup";

export function exitSideForEntry(entrySide: OrderDraft["side"]): OrderDraft["side"] {
  return entrySide === "BUY" ? "SELL" : "BUY";
}

export function buildFixedStopLeg(stopPrice: number): BracketStopLeg {
  return { mode: "fixed", stopPrice };
}

export function buildTrailStopLeg(args: {
  trailAmount?: number;
  trailPercent?: number;
}): BracketStopLeg {
  return {
    mode: "trail",
    trailAmount: args.trailAmount,
    trailPercent: args.trailPercent,
  };
}

export function buildBracketPlanFromLevels(args: {
  entry: OrderDraft;
  planLevels: PositionOrderLevels;
  stopLeg?: BracketStopLeg;
}): BracketPlan {
  return {
    entry: args.entry,
    stopLeg: args.stopLeg ?? buildFixedStopLeg(args.planLevels.stop),
    takeProfitPrice: args.planLevels.target,
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
}): ProtectiveOcoPlan {
  return {
    accountId: args.accountId,
    symbol: args.symbol.trim().toUpperCase(),
    quantity: args.quantity,
    side: exitSideForEntry(args.planLevels.side),
    stopLeg: args.stopLeg ?? buildFixedStopLeg(args.planLevels.stop),
    takeProfitPrice: args.planLevels.target,
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
  if (entry.side === "BUY") {
    if (stopPrice != null && takeProfitPrice <= stopPrice) {
      return "Take profit must be above stop for long bracket";
    }
  } else if (stopPrice != null && takeProfitPrice >= stopPrice) {
    return "Take profit must be below stop for short bracket";
  }
  return null;
}
