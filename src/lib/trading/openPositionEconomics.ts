import type { AccountPosition, AccountSummaryTag } from "@/lib/marketData/contracts/brokerage";
import { parseSummaryTagNumber } from "@/lib/marketData/contracts/brokerage";
import { formatOrderImpactMoney } from "@/lib/trading/computeOrderImpact";
import { formatSignedMoney } from "@/lib/trading/openRiskSummary";
import type { OpenPositionProtectStop } from "@/lib/trading/summarizeOpenPositionExits";

export type OpenPositionEconomics = {
  avgCost: number | null;
  last: number | null;
  notional: number | null;
  costBasis: number | null;
  unrealizedPct: number | null;
  pctOfNlv: number | null;
  openRiskDollars: number | null;
  openR: number | null;
  riskMissingReason: "needs_stop" | null;
  currency: string;
  multiplier: number;
};

function resolveMultiplier(position: AccountPosition): number {
  const raw = position.contract.multiplier;
  const parsed = raw != null ? Number(raw) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function finiteNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

/** Live open-position economics from broker position + optional protect stop. */
export function computeOpenPositionEconomics(args: {
  position: AccountPosition;
  protectStop: OpenPositionProtectStop;
  netLiquidation?: number | null;
}): OpenPositionEconomics {
  const { position, protectStop } = args;
  const qty = position.position ?? 0;
  const absQty = Math.abs(qty);
  const mult = resolveMultiplier(position);
  const avgCost = position.avgCost ?? null;
  const last = position.marketPrice ?? null;
  const uPnL = position.unrealizedPNL ?? null;
  const currency = position.contract.currency?.trim() || "USD";

  const notional = finiteNumber(position.marketValue)
    ? position.marketValue
    : finiteNumber(last) && absQty > 0
      ? absQty * last * mult
      : null;

  const costBasis =
    finiteNumber(avgCost) && absQty > 0 ? absQty * avgCost * mult : null;

  const unrealizedPct =
    finiteNumber(uPnL) && finiteNumber(costBasis) && costBasis > 0 ? uPnL / costBasis : null;

  const pctOfNlv =
    finiteNumber(notional) && finiteNumber(args.netLiquidation) && args.netLiquidation > 0
      ? Math.abs(notional) / args.netLiquidation
      : null;

  let openRiskDollars: number | null = null;
  let openR: number | null = null;
  let riskMissingReason: "needs_stop" | null = null;

  if (
    protectStop.kind === "stop" &&
    finiteNumber(protectStop.stopPrice) &&
    finiteNumber(last) &&
    absQty > 0
  ) {
    openRiskDollars = Math.abs(last - protectStop.stopPrice) * absQty * mult;
    if (finiteNumber(avgCost)) {
      const oneR = Math.abs(avgCost - protectStop.stopPrice) * absQty * mult;
      if (oneR > 0 && finiteNumber(uPnL)) {
        openR = uPnL / oneR;
      }
    }
  } else if (
    protectStop.kind === "trail" &&
    finiteNumber(protectStop.trailAmount) &&
    absQty > 0
  ) {
    openRiskDollars = protectStop.trailAmount * absQty * mult;
  } else {
    riskMissingReason = "needs_stop";
  }

  return {
    avgCost,
    last,
    notional,
    costBasis,
    unrealizedPct,
    pctOfNlv,
    openRiskDollars,
    openR,
    riskMissingReason,
    currency,
    multiplier: mult,
  };
}

function formatPrice(value: number | null): string {
  if (!finiteNumber(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatEconomicsMoney(value: number | null, currency: string): string {
  if (!finiteNumber(value)) return "—";
  if (currency === "USD") {
    return formatOrderImpactMoney(value);
  }
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

/** Compact metadata line for Open Risk popover rows. */
export function formatOpenPositionEconomicsLine(economics: OpenPositionEconomics): string {
  const parts: string[] = [
    `Avg ${formatPrice(economics.avgCost)}`,
    `Last ${formatPrice(economics.last)}`,
    `Notional ${formatEconomicsMoney(economics.notional, economics.currency)}`,
    `Cost ${formatEconomicsMoney(economics.costBasis, economics.currency)}`,
  ];

  if (economics.riskMissingReason === "needs_stop") {
    parts.push("Risk —");
  } else if (finiteNumber(economics.openRiskDollars)) {
    let riskPart = `Risk ${formatEconomicsMoney(economics.openRiskDollars, economics.currency)}`;
    if (finiteNumber(economics.openR)) {
      riskPart += ` (${economics.openR.toFixed(1)}R)`;
    }
    parts.push(riskPart);
  }

  if (finiteNumber(economics.pctOfNlv)) {
    parts.push(`${(economics.pctOfNlv * 100).toFixed(1)}% NLV`);
  }

  return parts.join(" · ");
}

/** Account-level margin chip for Open Risk popover header. */
export function formatOpenRiskAccountMarginChip(
  tags: Record<string, AccountSummaryTag> | undefined,
): string | null {
  const excess = parseSummaryTagNumber(tags ?? {}, "ExcessLiquidity");
  const maint = parseSummaryTagNumber(tags ?? {}, "MaintMarginReq");
  const parts: string[] = [];
  if (finiteNumber(excess)) parts.push(`Excess ${formatSignedMoney(excess)}`);
  if (finiteNumber(maint)) parts.push(`Maint ${formatSignedMoney(maint)}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
