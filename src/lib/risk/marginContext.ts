import type { AccountSummaryTag, WhatIfResult } from "@/lib/marketData/contracts/brokerage";
import { parseSummaryTagNumber } from "@/lib/marketData/contracts/brokerage";

export type MarginSnapshot = {
  netLiquidation: number | null;
  initMarginReq: number | null;
  maintMarginReq: number | null;
  availableFunds: number | null;
  excessLiquidity: number | null;
  /** InitMarginReq / NetLiquidation when both are finite and netLiq !== 0. */
  utilization: number | null;
};

export type MarginImpact = {
  initMarginChange: number | null;
  maintMarginChange: number | null;
  projectedUtilization: number | null;
  headroomAfter: number | null;
  warningText: string | null;
  /** True when IB what-if omitted margin deltas and we estimated from notional. */
  estimated: boolean;
};

export type MarginStatus = "ok" | "tight" | "over";

export type EquityMarginDirection = "long" | "short";

export type IbkrStockMarginRates = {
  /** Overnight / Reg T end-of-day binding initial margin ratio. */
  initRatio: number;
  /** House maintenance margin ratio. */
  maintRatio: number;
};

/**
 * IBKR US stock margin ratios (Reg T / house), matching published Stock Margins:
 * - Long: Reg T EOD initial 50%; maintenance 25%.
 * - Short (> $16.67): Reg T EOD initial 50%; maintenance 30%.
 * - Short ($5–$16.67]: max(Reg T 50%, $5/share); maint $5/share.
 * - Short ($2.50–$5]: 100% MV.
 * - Short (≤ $2.50): $2.50/share.
 */
export function resolveIbkrStockMarginRates(input: {
  direction: EquityMarginDirection;
  pricePerShare: number;
}): IbkrStockMarginRates {
  const price = input.pricePerShare;
  if (!Number.isFinite(price) || price <= 0) {
    return input.direction === "short"
      ? { initRatio: 0.5, maintRatio: 0.3 }
      : { initRatio: 0.5, maintRatio: 0.25 };
  }

  if (input.direction === "long") {
    return { initRatio: 0.5, maintRatio: 0.25 };
  }

  if (price > 16.67) {
    return { initRatio: 0.5, maintRatio: 0.3 };
  }
  if (price > 5) {
    const perShareRatio = 5 / price;
    return {
      initRatio: Math.max(0.5, perShareRatio),
      maintRatio: perShareRatio,
    };
  }
  if (price > 2.5) {
    return { initRatio: 1, maintRatio: 1 };
  }
  const perShareRatio = 2.5 / price;
  return { initRatio: perShareRatio, maintRatio: perShareRatio };
}

export function parseMarginSnapshot(
  tags: Record<string, AccountSummaryTag> | undefined,
): MarginSnapshot {
  const netLiquidation = parseSummaryTagNumber(tags ?? {}, "NetLiquidation");
  const initMarginReq = parseSummaryTagNumber(tags ?? {}, "InitMarginReq");
  const maintMarginReq = parseSummaryTagNumber(tags ?? {}, "MaintMarginReq");
  const availableFunds = parseSummaryTagNumber(tags ?? {}, "AvailableFunds");
  const excessLiquidity = parseSummaryTagNumber(tags ?? {}, "ExcessLiquidity");

  const utilization =
    initMarginReq != null && netLiquidation != null && netLiquidation !== 0
      ? initMarginReq / netLiquidation
      : null;

  return {
    netLiquidation,
    initMarginReq,
    maintMarginReq,
    availableFunds,
    excessLiquidity,
    utilization,
  };
}

export function computeMarginImpact(
  current: MarginSnapshot,
  whatIf: Pick<WhatIfResult, "initMarginChange" | "maintMarginChange" | "warningText">,
): MarginImpact {
  const initMarginChange = whatIf.initMarginChange ?? null;
  const maintMarginChange = whatIf.maintMarginChange ?? null;

  const projectedInit =
    current.initMarginReq != null && initMarginChange != null
      ? current.initMarginReq + initMarginChange
      : null;

  const projectedUtilization =
    projectedInit != null &&
    current.netLiquidation != null &&
    current.netLiquidation !== 0
      ? projectedInit / current.netLiquidation
      : null;

  const headroomAfter =
    current.excessLiquidity != null && maintMarginChange != null
      ? current.excessLiquidity - Math.max(0, maintMarginChange)
      : null;

  return {
    initMarginChange,
    maintMarginChange,
    projectedUtilization,
    headroomAfter,
    warningText: whatIf.warningText ?? null,
    estimated: false,
  };
}

function hasUsableMarginDelta(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value !== 0;
}

export type EstimateMarginFromNotionalOptions = {
  direction?: EquityMarginDirection;
  /** Entry / mark price — required for short price-tier house rules. */
  pricePerShare?: number;
};

/** Estimate margin hit when IB what-if omits deltas, using IBKR Reg T / house stock rules. */
export function estimateMarginImpactFromNotional(
  current: MarginSnapshot,
  notional: number,
  options?: EstimateMarginFromNotionalOptions,
): MarginImpact {
  const direction = options?.direction ?? "long";
  // Missing price → high-priced stock tier (Reg T 50% / house maint).
  const pricePerShare =
    options?.pricePerShare != null &&
    Number.isFinite(options.pricePerShare) &&
    options.pricePerShare > 0
      ? options.pricePerShare
      : Number.POSITIVE_INFINITY;

  const rates = resolveIbkrStockMarginRates({ direction, pricePerShare });
  const initMarginChange = notional * rates.initRatio;
  const maintMarginChange = notional * rates.maintRatio;

  const projectedInit =
    current.initMarginReq != null ? current.initMarginReq + initMarginChange : null;

  const projectedUtilization =
    projectedInit != null &&
    current.netLiquidation != null &&
    current.netLiquidation !== 0
      ? projectedInit / current.netLiquidation
      : null;

  // Prefer excess-liquidity vs maintenance (margin-call headroom); fall back to available vs init.
  const headroomAfter =
    current.excessLiquidity != null
      ? current.excessLiquidity - Math.max(0, maintMarginChange)
      : current.availableFunds != null
        ? current.availableFunds - initMarginChange
        : null;

  return {
    initMarginChange,
    maintMarginChange,
    projectedUtilization,
    headroomAfter,
    warningText: null,
    estimated: true,
  };
}

export function resolveMarginImpact(
  current: MarginSnapshot,
  whatIf: Pick<WhatIfResult, "initMarginChange" | "maintMarginChange" | "warningText"> | null,
  notional: number | null,
  options?: EstimateMarginFromNotionalOptions,
): MarginImpact | null {
  if (whatIf != null) {
    const fromWhatIf = computeMarginImpact(current, whatIf);
    if (
      hasUsableMarginDelta(fromWhatIf.initMarginChange) ||
      hasUsableMarginDelta(fromWhatIf.maintMarginChange)
    ) {
      return fromWhatIf;
    }
  }

  if (notional != null && notional > 0) {
    return estimateMarginImpactFromNotional(current, notional, options);
  }

  return whatIf != null ? computeMarginImpact(current, whatIf) : null;
}

export function classifyMarginStatus(
  initMarginChange: number | null,
  availableFunds: number | null,
  extras?: {
    projectedUtilization?: number | null;
    headroomAfter?: number | null;
  },
): MarginStatus {
  if (extras?.headroomAfter != null && Number.isFinite(extras.headroomAfter) && extras.headroomAfter < 0) {
    return "over";
  }

  if (
    extras?.projectedUtilization != null &&
    Number.isFinite(extras.projectedUtilization) &&
    extras.projectedUtilization >= 0.9
  ) {
    return "over";
  }

  if (
    initMarginChange != null &&
    availableFunds != null &&
    Number.isFinite(initMarginChange) &&
    Number.isFinite(availableFunds)
  ) {
    if (initMarginChange > availableFunds) return "over";
    if (initMarginChange > 0.5 * availableFunds) return "tight";
  }

  if (
    extras?.projectedUtilization != null &&
    Number.isFinite(extras.projectedUtilization) &&
    extras.projectedUtilization >= 0.65
  ) {
    return "tight";
  }

  if (
    extras?.headroomAfter != null &&
    availableFunds != null &&
    Number.isFinite(extras.headroomAfter) &&
    Number.isFinite(availableFunds) &&
    availableFunds > 0 &&
    extras.headroomAfter < 0.25 * availableFunds
  ) {
    return "tight";
  }

  return "ok";
}

export function classifyUtilizationStatus(utilization: number | null): MarginStatus {
  if (utilization == null || !Number.isFinite(utilization)) return "ok";
  if (utilization >= 0.85) return "over";
  if (utilization >= 0.55) return "tight";
  return "ok";
}

export function marginStatusTextClass(status: MarginStatus): string {
  if (status === "over") return "text-[var(--edge-negative)]";
  if (status === "tight") return "text-[var(--edge-warning)]";
  return "text-[var(--edge-positive)]";
}

export function marginStatusBarColor(status: MarginStatus): string {
  if (status === "over") return "var(--edge-negative)";
  if (status === "tight") return "var(--edge-warning)";
  return "var(--edge-positive)";
}

export function formatUtilizationPercent(utilization: number | null): string {
  if (utilization == null || !Number.isFinite(utilization)) return "—";
  return `${Math.round(utilization * 100)}%`;
}

export type MarginBarSegments = {
  existingPercent: number;
  tradePercent: number;
};

/** Widths for a single stacked utilization bar: existing use left, incremental trade after. */
export function computeMarginBarSegments(
  currentUtil: number | null,
  projectedUtil: number | null,
): MarginBarSegments {
  const existing =
    currentUtil != null && Number.isFinite(currentUtil)
      ? Math.min(Math.max(currentUtil, 0), 1)
      : 0;

  if (projectedUtil == null || !Number.isFinite(projectedUtil)) {
    return { existingPercent: existing * 100, tradePercent: 0 };
  }

  const projected = Math.max(projectedUtil, 0);
  const tradeRaw = Math.max(0, projected - existing);
  const tradeCapped = Math.min(tradeRaw, 1 - existing);

  return {
    existingPercent: existing * 100,
    tradePercent: tradeCapped * 100,
  };
}

export function marginStatusPlainLabel(status: MarginStatus | null): string | null {
  if (status == null) return null;
  if (status === "over") return "Over limit";
  if (status === "tight") return "Getting tight";
  return "Plenty of room";
}

export function formatMarginUtilRange(
  currentUtil: number | null,
  projectedUtil: number | null,
  showImpact: boolean,
): string {
  const currentLabel = formatUtilizationPercent(currentUtil);
  if (!showImpact || projectedUtil == null) {
    return `${currentLabel} now`;
  }
  return `${currentLabel} now → ${formatUtilizationPercent(projectedUtil)} after`;
}

export type HoldToStopVerdict = "stop_reachable" | "margin_call_first";

export type HoldToStopProjection = {
  liquidationPrice: number;
  verdict: HoldToStopVerdict;
  distanceFromStop: number;
  /** Liquidation price relative to stop on the price axis. */
  liqRelativeToStop: "below" | "above";
  maintRatio: number;
  estimated: boolean;
};

function resolveMaintRatio(
  maintMarginChange: number | null,
  notional: number,
  direction: EquityMarginDirection,
  entry: number,
): number {
  if (
    maintMarginChange != null &&
    Number.isFinite(maintMarginChange) &&
    maintMarginChange !== 0 &&
    notional > 0
  ) {
    const ratio = maintMarginChange / notional;
    return Math.min(Math.max(ratio, 0.01), 0.95);
  }
  return resolveIbkrStockMarginRates({ direction, pricePerShare: entry }).maintRatio;
}

/** Project approximate margin-call price vs stop for a sized equity trade. */
export function projectHoldToStop(input: {
  entry: number;
  stop: number;
  shares: number;
  direction: "long" | "short";
  impact: MarginImpact | null;
}): HoldToStopProjection | null {
  const { entry, stop, shares, direction, impact } = input;
  if (
    !Number.isFinite(entry) ||
    entry <= 0 ||
    !Number.isFinite(stop) ||
    stop <= 0 ||
    !Number.isFinite(shares) ||
    shares <= 0 ||
    impact == null ||
    impact.headroomAfter == null ||
    !Number.isFinite(impact.headroomAfter)
  ) {
    return null;
  }

  const cushion = impact.headroomAfter;
  const notional = shares * entry;
  const maintRatio = resolveMaintRatio(
    impact.maintMarginChange,
    notional,
    direction,
    entry,
  );
  // Long: margin req falls with price → (1 − m). Short: margin req rises with price → (1 + m).
  const denominator =
    direction === "long" ? shares * (1 - maintRatio) : shares * (1 + maintRatio);
  if (denominator <= 0) return null;

  const adversePerShare = cushion / denominator;
  const liquidationPrice =
    direction === "long" ? entry - adversePerShare : entry + adversePerShare;

  if (!Number.isFinite(liquidationPrice)) return null;

  const stopReachable =
    direction === "long" ? stop > liquidationPrice : stop < liquidationPrice;

  const liqRelativeToStop: "below" | "above" =
    liquidationPrice < stop ? "below" : "above";

  return {
    liquidationPrice,
    verdict: stopReachable ? "stop_reachable" : "margin_call_first",
    distanceFromStop: Math.abs(stop - liquidationPrice),
    liqRelativeToStop,
    maintRatio,
    estimated: impact.estimated,
  };
}

export function formatHoldToStopPrice(price: number): string {
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatHoldToStopDistance(distance: number): string {
  return distance.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatHoldToStopSummary(projection: HoldToStopProjection): string {
  if (projection.verdict === "stop_reachable") {
    return `Stop reachable · ${formatHoldToStopDistance(projection.distanceFromStop)} ${projection.liqRelativeToStop} stop`;
  }
  return `Margin call first · Liq ${formatHoldToStopPrice(projection.liquidationPrice)}`;
}
