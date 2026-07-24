import { inferDirection, type RiskDirection } from "@edge/chart-core";

export type EquityPositionSizeFailureReason =
  | "invalid_prices"
  | "missing_risk"
  | "zero_shares";

export type EquityPositionSizeInput = {
  entry: number;
  stop: number;
  dollarRisk: number | null;
};

export type EquityPositionSizeResult =
  | {
      ok: true;
      direction: RiskDirection;
      entryPrice: number;
      stopPrice: number;
      riskPerShare: number;
      shares: number;
      targetRiskDollars: number;
      actualRiskDollars: number;
      notional: number;
    }
  | {
      ok: false;
      reason: EquityPositionSizeFailureReason;
    };

export function computeEquityPositionSize(
  input: EquityPositionSizeInput,
): EquityPositionSizeResult {
  const entryPrice = input.entry;
  const stopPrice = input.stop;

  if (
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(stopPrice) ||
    entryPrice <= 0 ||
    stopPrice <= 0 ||
    entryPrice === stopPrice
  ) {
    return { ok: false, reason: "invalid_prices" };
  }

  if (input.dollarRisk == null || !Number.isFinite(input.dollarRisk) || input.dollarRisk <= 0) {
    return { ok: false, reason: "missing_risk" };
  }

  const riskPerShare = Math.abs(entryPrice - stopPrice);
  const shares = Math.floor(input.dollarRisk / riskPerShare);

  if (shares <= 0) {
    return { ok: false, reason: "zero_shares" };
  }

  const actualRiskDollars = shares * riskPerShare;

  return {
    ok: true,
    direction: inferDirection(entryPrice, stopPrice),
    entryPrice,
    stopPrice,
    riskPerShare,
    shares,
    targetRiskDollars: input.dollarRisk,
    actualRiskDollars,
    notional: shares * entryPrice,
  };
}

export function equityPositionSizeErrorMessage(
  reason: EquityPositionSizeFailureReason,
): string {
  switch (reason) {
    case "invalid_prices":
      return "Entry and stop must be positive and different.";
    case "missing_risk":
      return "Set a risk budget above before sizing.";
    case "zero_shares":
      return "Stop is too wide for this risk budget (0 shares).";
  }
}
