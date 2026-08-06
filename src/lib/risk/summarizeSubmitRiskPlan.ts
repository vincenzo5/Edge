import { resolvePlaybookPresetName } from "@/lib/trading/playbook/display";
import type { AccountGateStatus } from "./accountRiskGates";
import type { BracketPlan, BracketStopLeg, TradingEnvironment } from "@/lib/trading/types";

export type SubmitRiskPlanWarning =
  | "live_unprotected"
  | "account_heat_would_breach"
  | "account_heat_incomplete";

export type SubmitRiskPlanSummary = {
  budget: {
    dollarRisk: number | null;
    resolved: boolean;
    label: string;
  };
  size: {
    quantity: number | null;
    plannedRiskDollars: number | null;
    label: string;
  };
  protect: {
    attached: boolean;
    label: string;
  };
  manage: {
    presetId: string;
    label: string;
  };
  warnings: SubmitRiskPlanWarning[];
  failureMode: string | null;
  gapGuidance: string | null;
};

export type SummarizeSubmitRiskPlanInput = {
  environment: TradingEnvironment;
  quantity: number | null;
  dollarRisk: number | null;
  plannedRiskDollars: number | null;
  protectAttached: boolean;
  stopLeg: BracketStopLeg | null;
  takeProfitPrice: number | null;
  managePresetId: string;
  accountGates?: AccountGateStatus | null;
  side?: "BUY" | "SELL";
};

export const SUBMIT_RISK_FAILURE_MODE_COPY =
  "Broker stop stays live if Edge is down";

export const SUBMIT_RISK_GAP_GUIDANCE_COPY =
  "Stop-market can fill through a gap; stop-limit may not fill if price jumps past the limit.";

function formatPrice(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatProtectStopLegLabel(stopLeg: BracketStopLeg, fallbackStop?: number): string {
  if (stopLeg.mode === "trail") {
    if (stopLeg.trailAmount != null) {
      return `TRAIL $${stopLeg.trailAmount}`;
    }
    if (stopLeg.trailPercent != null) {
      return `TRAIL ${stopLeg.trailPercent}%`;
    }
    if (stopLeg.trailRMultiple != null) {
      return `TRAIL ${stopLeg.trailRMultiple}R`;
    }
    return "TRAIL";
  }
  const stopPrice = stopLeg.stopPrice ?? fallbackStop;
  if (stopPrice == null || !Number.isFinite(stopPrice)) return "STP";
  return `STP ${formatPrice(stopPrice)}`;
}

export function formatProtectLabel(args: {
  attached: boolean;
  stopLeg: BracketStopLeg | null;
  takeProfitPrice: number | null;
  fallbackStop?: number;
}): string {
  if (!args.attached) return "Off";
  if (!args.stopLeg) return "Incomplete";
  const stopLabel = formatProtectStopLegLabel(args.stopLeg, args.fallbackStop);
  if (args.takeProfitPrice != null && Number.isFinite(args.takeProfitPrice)) {
    return `${stopLabel} · TP ${formatPrice(args.takeProfitPrice)}`;
  }
  return stopLabel;
}

export function formatManageLabel(managePresetId: string): string {
  if (managePresetId === "off") return "Off";
  return resolvePlaybookPresetName(managePresetId);
}

export function submitRiskWarningLabel(warning: SubmitRiskPlanWarning): string {
  switch (warning) {
    case "live_unprotected":
      return "Live order without Bracket — no resting broker stop will be attached.";
    case "account_heat_would_breach":
      return "Next entry would exceed open heat cap.";
    case "account_heat_incomplete":
      return "Open heat is partial — attach Manage to track all open positions.";
    default:
      return warning;
  }
}

/** Pre-submit RiskPolicy summary for Trade ticket and Protective OCO. */
export function summarizeSubmitRiskPlan(
  input: SummarizeSubmitRiskPlanInput,
): SubmitRiskPlanSummary {
  const budgetResolved =
    input.dollarRisk != null && Number.isFinite(input.dollarRisk) && input.dollarRisk > 0;

  const quantity =
    input.quantity != null && Number.isFinite(input.quantity) && input.quantity > 0
      ? input.quantity
      : null;

  const plannedRiskDollars =
    input.plannedRiskDollars != null && Number.isFinite(input.plannedRiskDollars)
      ? input.plannedRiskDollars
      : null;

  const protectLabel = formatProtectLabel({
    attached: input.protectAttached,
    stopLeg: input.stopLeg,
    takeProfitPrice: input.takeProfitPrice,
  });

  const manageLabel = formatManageLabel(input.managePresetId);

  const sizeLabel =
    quantity != null
      ? plannedRiskDollars != null
        ? `${quantity} sh · ${formatMoney(plannedRiskDollars)} planned`
        : `${quantity} sh`
      : "—";

  const warnings: SubmitRiskPlanWarning[] = [];
  if (input.environment === "live" && !input.protectAttached) {
    warnings.push("live_unprotected");
  }
  if (input.accountGates && (input.side ?? "BUY") === "BUY") {
    const heat = input.accountGates.openHeat;
    if (heat.incomplete) {
      warnings.push("account_heat_incomplete");
    }
    const proposed =
      plannedRiskDollars != null && plannedRiskDollars > 0
        ? plannedRiskDollars
        : input.dollarRisk;
    if (
      heat.enabled &&
      !heat.breached &&
      heat.capDollars != null &&
      proposed != null &&
      Number.isFinite(proposed) &&
      proposed > 0 &&
      (heat.currentDollars ?? 0) + proposed > heat.capDollars
    ) {
      warnings.push("account_heat_would_breach");
    }
  }

  return {
    budget: {
      dollarRisk: input.dollarRisk,
      resolved: budgetResolved,
      label: budgetResolved ? formatMoney(input.dollarRisk!) : "Not resolved",
    },
    size: {
      quantity,
      plannedRiskDollars,
      label: sizeLabel,
    },
    protect: {
      attached: input.protectAttached,
      label: protectLabel,
    },
    manage: {
      presetId: input.managePresetId,
      label: manageLabel,
    },
    warnings,
    failureMode: input.protectAttached ? SUBMIT_RISK_FAILURE_MODE_COPY : null,
    gapGuidance: input.protectAttached ? SUBMIT_RISK_GAP_GUIDANCE_COPY : null,
  };
}

export function summarizeSubmitRiskPlanFromBracket(args: {
  environment: TradingEnvironment;
  quantity: number | null;
  dollarRisk: number | null;
  plannedRiskDollars: number | null;
  attachProtect: boolean;
  bracketPlan: BracketPlan | null;
  managePresetId: string;
  accountGates?: AccountGateStatus | null;
  side?: "BUY" | "SELL";
}): SubmitRiskPlanSummary {
  const protectAttached = args.attachProtect && args.bracketPlan != null;
  return summarizeSubmitRiskPlan({
    environment: args.environment,
    quantity: args.quantity,
    dollarRisk: args.dollarRisk,
    plannedRiskDollars: args.plannedRiskDollars,
    protectAttached,
    stopLeg: protectAttached ? args.bracketPlan!.stopLeg : null,
    takeProfitPrice: protectAttached ? args.bracketPlan!.takeProfitPrice : null,
    managePresetId: protectAttached ? args.managePresetId : "off",
    accountGates: args.accountGates,
    side: args.side,
  });
}
