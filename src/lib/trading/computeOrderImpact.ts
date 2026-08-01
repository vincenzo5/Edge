/**
 * Compose-step order economics: notional + optional stop/target outcome dollars.
 * Margin affordability stays in marginContext / useRiskMarginContext.
 */

export type OrderImpactEconomics = {
  /** abs(qty × executable entry). */
  notional: number | null;
  /** Dollar loss if stop hits at current size. */
  riskDollars: number | null;
  /** Dollar gain if target hits at current size. Hidden when no target. */
  rewardDollars: number | null;
  /** reward / risk when both finite and risk > 0. */
  riskRewardRatio: number | null;
  /** Why risk is absent — never imply $0 unprotected risk. */
  riskMissingReason: "needs_stop" | null;
  rewardVisible: boolean;
  rrVisible: boolean;
};

function finitePositive(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

function finitePrice(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

/** Live compose economics from executable entry, size, and optional protect levels. */
export function computeOrderImpactEconomics(args: {
  quantity: number | null;
  /** Market last or limit — the price used for notional / risk / reward. */
  executableEntry: number | null;
  stop: number | null;
  target: number | null;
  /** True when bracket/protect is attached with a plan stop. */
  protectionEnabled: boolean;
}): OrderImpactEconomics {
  const qty = finitePositive(args.quantity) ? args.quantity : null;
  const entry = finitePrice(args.executableEntry) ? args.executableEntry : null;

  const notional = qty != null && entry != null ? qty * entry : null;

  if (!args.protectionEnabled || !finitePrice(args.stop) || qty == null || entry == null) {
    return {
      notional,
      riskDollars: null,
      rewardDollars: null,
      riskRewardRatio: null,
      riskMissingReason: "needs_stop",
      rewardVisible: false,
      rrVisible: false,
    };
  }

  const riskDollars = Math.abs(entry - args.stop) * qty;
  const hasTarget = finitePrice(args.target);
  const rewardDollars = hasTarget ? Math.abs(args.target - entry) * qty : null;
  const riskRewardRatio =
    hasTarget && riskDollars > 0 && rewardDollars != null ? rewardDollars / riskDollars : null;

  return {
    notional,
    riskDollars,
    rewardDollars,
    riskRewardRatio,
    riskMissingReason: null,
    rewardVisible: hasTarget,
    rrVisible: riskRewardRatio != null && Number.isFinite(riskRewardRatio),
  };
}

export function formatOrderImpactMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatOrderImpactRatio(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return `1:${value.toFixed(1)}`;
}
