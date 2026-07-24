import type { Candle } from "@edge/chart-core/contracts";
import { computePlannedRiskUsd } from "@/lib/journal/rMultiple";
import type { JournalTradeDirection } from "@/lib/journal/types";

export type TradeExcursionInput = {
  direction: JournalTradeDirection;
  avgEntry?: number | null;
  netQuantity?: number | null;
  secType?: string;
  legs?: { multiplier?: string | null }[];
  openedAt: string;
  closedAt: string;
  plannedRiskMode?: "usd" | "pct" | null;
  plannedRiskValue?: number | null;
  plannedRiskUsd?: number | null;
};

export type TradeExcursionResult = {
  mfeUsd: number;
  mfaUsd: number;
  mfeR: number | null;
  mfaR: number | null;
  interval: "1m" | "5m";
  barCount: number;
};

function resolveMultiplier(input: TradeExcursionInput): number {
  if (input.secType === "STK") return 1;
  const leg = input.legs?.[0];
  if (leg?.multiplier) {
    const parsed = Number.parseFloat(leg.multiplier);
    return Number.isFinite(parsed) ? parsed : 100;
  }
  return 100;
}

export function filterCandlesInTradeWindow(
  candles: Candle[],
  openedAt: string,
  closedAt: string,
): Candle[] {
  const openMs = Date.parse(openedAt);
  const closeMs = Date.parse(closedAt);
  if (!Number.isFinite(openMs) || !Number.isFinite(closeMs)) return [];
  return candles.filter((bar) => bar.t >= openMs && bar.t <= closeMs);
}

export function computeTradeExcursionFromCandles(
  input: TradeExcursionInput,
  candles: Candle[],
  interval: "1m" | "5m",
): TradeExcursionResult | null {
  const entry = input.avgEntry;
  const qty = input.netQuantity;
  if (entry == null || qty == null || !Number.isFinite(entry) || !Number.isFinite(qty)) {
    return null;
  }

  const windowBars = filterCandlesInTradeWindow(candles, input.openedAt, input.closedAt);
  if (windowBars.length === 0) return null;

  const mult = resolveMultiplier(input);
  const absQty = Math.abs(qty);
  let maxFavorable = 0;
  let maxAdverse = 0;

  for (const bar of windowBars) {
    if (input.direction === "long") {
      maxFavorable = Math.max(maxFavorable, Math.max(0, bar.h - entry));
      maxAdverse = Math.max(maxAdverse, Math.max(0, entry - bar.l));
    } else {
      maxFavorable = Math.max(maxFavorable, Math.max(0, entry - bar.l));
      maxAdverse = Math.max(maxAdverse, Math.max(0, bar.h - entry));
    }
  }

  const mfeUsd = maxFavorable * absQty * mult;
  const mfaUsd = maxAdverse * absQty * mult;
  const riskUsd =
    input.plannedRiskUsd ??
    computePlannedRiskUsd(input, input.plannedRiskMode ?? null, input.plannedRiskValue ?? null);

  return {
    mfeUsd,
    mfaUsd,
    mfeR: riskUsd != null && riskUsd > 0 ? mfeUsd / riskUsd : null,
    mfaR: riskUsd != null && riskUsd > 0 ? mfaUsd / riskUsd : null,
    interval,
    barCount: windowBars.length,
  };
}

export function canComputeTradeExcursion(input: {
  status?: string;
  secType?: string;
  avgEntry?: number | null;
  closedAt?: string | null;
}): boolean {
  return (
    input.status === "closed" &&
    input.secType === "STK" &&
    input.avgEntry != null &&
    Boolean(input.closedAt?.trim())
  );
}

export async function fetchExcursionCandlesForTrade(
  symbol: string,
  openedAt: string,
  closedAt: string,
  interval: "1m" | "5m",
): Promise<Candle[]> {
  const openMs = Date.parse(openedAt);
  const closeMs = Date.parse(closedAt);
  if (!Number.isFinite(openMs) || !Number.isFinite(closeMs)) {
    throw new Error("Invalid trade window");
  }

  const barMs = interval === "1m" ? 60_000 : 300_000;
  const durationMs = Math.max(closeMs - openMs, barMs);
  const barCount = Math.min(500, Math.ceil(durationMs / barMs) + 10);

  const response = await fetch("/api/candles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol: symbol.trim().toUpperCase(),
      interval,
      before: closeMs + barMs,
      barCount,
      sessionMode: "regular",
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error((payload as { error?: string }).error ?? `Candles request failed (${response.status})`);
  }

  const payload = (await response.json()) as { candles?: Candle[] };
  return Array.isArray(payload.candles) ? payload.candles : [];
}

export async function computeTradeExcursionForTrade(
  input: TradeExcursionInput & { symbol: string },
): Promise<TradeExcursionResult | null> {
  for (const interval of ["1m", "5m"] as const) {
    try {
      const candles = await fetchExcursionCandlesForTrade(
        input.symbol,
        input.openedAt,
        input.closedAt,
        interval,
      );
      const result = computeTradeExcursionFromCandles(input, candles, interval);
      if (result) return result;
    } catch {
      // try next interval
    }
  }
  return null;
}
