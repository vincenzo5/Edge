import {
  resolveDollarRisk,
  type RiskSettings,
} from "@/lib/risk/riskSettings";
import type { BudgetSlotOrInherits } from "./slotSchemas";

export type TicketBudgetUnit = "percent" | "absolute";

export type ResolvedPolicyTicketBudget = {
  unit: TicketBudgetUnit;
  riskPercent: number | null;
  absoluteRisk: number | null;
  dollarRisk: number | null;
};

/** Resolve per-trade budget from policy slot + session Risk settings. */
export function resolvePolicyTicketBudget(args: {
  budget?: BudgetSlotOrInherits | null;
  sessionSettings: RiskSettings;
  accountBasisValue: number | null;
  sessionDollarRisk?: number | null;
}): ResolvedPolicyTicketBudget {
  const { budget, sessionSettings, accountBasisValue, sessionDollarRisk } = args;

  if (budget?.kind === "percentNetLiq") {
    const basis = accountBasisValue;
    const dollarRisk =
      basis != null && basis > 0
        ? Math.round(basis * (budget.value / 100))
        : null;
    return {
      unit: "percent",
      riskPercent: budget.value,
      absoluteRisk: dollarRisk,
      dollarRisk,
    };
  }

  if (budget?.kind === "dollar") {
    return {
      unit: "absolute",
      riskPercent: null,
      absoluteRisk: budget.value,
      dollarRisk: budget.value,
    };
  }

  const unit: TicketBudgetUnit =
    sessionSettings.sizingMode === "percent" ? "percent" : "absolute";

  if (unit === "percent") {
    const basis = accountBasisValue;
    const dollarRisk =
      sessionDollarRisk ??
      (basis != null && basis > 0
        ? Math.round(basis * (sessionSettings.riskPercent / 100))
        : null);
    return {
      unit: "percent",
      riskPercent: sessionSettings.riskPercent,
      absoluteRisk: dollarRisk,
      dollarRisk,
    };
  }

  const dollarRisk =
    sessionDollarRisk ?? resolveDollarRisk(sessionSettings, null);
  return {
    unit: "absolute",
    riskPercent: null,
    absoluteRisk: sessionSettings.absoluteRisk,
    dollarRisk,
  };
}
