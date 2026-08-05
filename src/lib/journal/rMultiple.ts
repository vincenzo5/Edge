import type { JournalTradeLeg } from "@/lib/journal/types";

export type PlannedRiskMode = "usd" | "pct";

export type PlannedRiskTradeInput = {
  status?: "open" | "closed";
  avgEntry?: number | null;
  netQuantity?: number | null;
  secType?: string;
  legs?: JournalTradeLeg[];
  netPnL?: number | null;
  grossPnL?: number | null;
  plannedRiskMode?: PlannedRiskMode | null;
  plannedRiskValue?: number | null;
  plannedRiskUsd?: number | null;
};

function resolveMultiplier(trade: PlannedRiskTradeInput): number {
  if (trade.secType === "STK") return 1;
  const leg = trade.legs?.[0];
  if (leg?.multiplier) {
    const parsed = Number.parseFloat(leg.multiplier);
    return Number.isFinite(parsed) ? parsed : 100;
  }
  return 100;
}

function tradeNetPnL(trade: PlannedRiskTradeInput): number {
  return trade.netPnL ?? trade.grossPnL ?? 0;
}

export function computePositionNotional(trade: PlannedRiskTradeInput): number | null {
  const entry = trade.avgEntry;
  const qty = trade.netQuantity;
  if (entry == null || qty == null) return null;
  const mult = resolveMultiplier(trade);
  const notional = Math.abs(entry) * Math.abs(qty) * mult;
  return Number.isFinite(notional) && notional > 0 ? notional : null;
}

export function computePlannedRiskUsd(
  trade: PlannedRiskTradeInput,
  mode?: PlannedRiskMode | null,
  value?: number | null,
): number | null {
  const effectiveMode = mode !== undefined ? mode : (trade.plannedRiskMode ?? null);
  const effectiveValue = value !== undefined ? value : (trade.plannedRiskValue ?? null);

  if (effectiveMode == null || effectiveValue == null) return null;
  if (!Number.isFinite(effectiveValue) || effectiveValue <= 0) return null;

  if (effectiveMode === "usd") return effectiveValue;

  const notional = computePositionNotional(trade);
  if (notional == null) return null;
  return notional * (effectiveValue / 100);
}

export function computeRMultiple(trade: PlannedRiskTradeInput): number | null {
  if (trade.status !== "closed") return null;
  const riskUsd = trade.plannedRiskUsd ?? computePlannedRiskUsd(trade);
  if (riskUsd == null || riskUsd <= 0) return null;
  return tradeNetPnL(trade) / riskUsd;
}

export type JournalDashboardRStats = {
  netR: number | null;
  expectancyR: number | null;
  avgWinR: number | null;
  avgLossR: number | null;
  maxDdR: number | null;
  tradeCountWithR: number;
};

export function computeAggregateRStats(trades: PlannedRiskTradeInput[]): {
  avgR: number | null;
  tradeCountWithR: number;
} {
  const dashboard = computeJournalDashboardRStats(trades);
  return {
    avgR: dashboard.expectancyR,
    tradeCountWithR: dashboard.tradeCountWithR,
  };
}

export function computeJournalDashboardRStats(
  trades: PlannedRiskTradeInput[],
): JournalDashboardRStats {
  const closed = trades
    .filter((trade) => trade.status === "closed")
    .slice()
    .sort((a, b) => {
      const aTime = "closedAt" in a && a.closedAt ? Date.parse(String(a.closedAt)) : 0;
      const bTime = "closedAt" in b && b.closedAt ? Date.parse(String(b.closedAt)) : 0;
      return aTime - bTime;
    });

  const rValues = closed
    .map((trade) => computeRMultiple(trade))
    .filter((value): value is number => value != null);

  if (rValues.length === 0) {
    return {
      netR: null,
      expectancyR: null,
      avgWinR: null,
      avgLossR: null,
      maxDdR: null,
      tradeCountWithR: 0,
    };
  }

  const wins = rValues.filter((value) => value > 0);
  const losses = rValues.filter((value) => value < 0);
  const netR = rValues.reduce((sum, value) => sum + value, 0);
  const expectancyR = netR / rValues.length;
  const avgWinR =
    wins.length > 0 ? wins.reduce((sum, value) => sum + value, 0) / wins.length : null;
  const avgLossR =
    losses.length > 0 ? losses.reduce((sum, value) => sum + value, 0) / losses.length : null;

  let equity = 0;
  let peak = 0;
  let maxDdR = 0;
  for (const r of rValues) {
    equity += r;
    peak = Math.max(peak, equity);
    maxDdR = Math.max(maxDdR, peak - equity);
  }

  return {
    netR,
    expectancyR,
    avgWinR,
    avgLossR,
    maxDdR,
    tradeCountWithR: rValues.length,
  };
}
