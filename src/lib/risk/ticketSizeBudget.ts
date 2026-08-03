import { computeEquityPositionSize } from "./equityPositionSize";
import type { TicketBudgetUnit } from "./policy/resolvePolicyTicketBudget";

export function qtyFromTicketDollarRisk(args: {
  entry: number;
  stop: number;
  dollarRisk: number;
}): number | null {
  const result = computeEquityPositionSize({
    entry: args.entry,
    stop: args.stop,
    dollarRisk: args.dollarRisk,
  });
  return result.ok ? result.shares : null;
}

export function ticketRiskFromQty(args: {
  entry: number;
  stop: number;
  qty: number;
  unit: TicketBudgetUnit;
  accountBasisValue: number | null;
}): { riskPercent: number | null; absoluteRisk: number | null } {
  const riskPerShare = Math.abs(args.entry - args.stop);
  if (!Number.isFinite(riskPerShare) || riskPerShare <= 0 || args.qty <= 0) {
    return { riskPercent: null, absoluteRisk: null };
  }
  const absoluteRisk = Math.round(args.qty * riskPerShare);
  if (args.unit === "absolute") {
    return { riskPercent: null, absoluteRisk };
  }
  const basis = args.accountBasisValue;
  if (basis == null || basis <= 0) {
    return { riskPercent: null, absoluteRisk };
  }
  const riskPercent = Math.round((absoluteRisk / basis) * 10_000) / 100;
  return { riskPercent, absoluteRisk };
}

export function dollarRiskFromTicketRiskInput(args: {
  unit: TicketBudgetUnit;
  riskPercent: number | null;
  absoluteRisk: number | null;
  accountBasisValue: number | null;
}): number | null {
  if (args.unit === "absolute") {
    const value = args.absoluteRisk;
    return value != null && Number.isFinite(value) && value > 0 ? value : null;
  }
  const percent = args.riskPercent;
  const basis = args.accountBasisValue;
  if (
    percent == null ||
    !Number.isFinite(percent) ||
    percent <= 0 ||
    basis == null ||
    basis <= 0
  ) {
    return null;
  }
  return Math.round(basis * (percent / 100));
}
