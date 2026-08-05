import type { DailyBar } from "./types";

const ATR_PERIOD = 14;

function trueRange(prev: DailyBar, curr: DailyBar): number {
  return Math.max(
    curr.high - curr.low,
    Math.abs(curr.high - prev.close),
    Math.abs(curr.low - prev.close),
  );
}

/** Wilder-style simple mean TR over the last `period` bars ending at `index`. */
export function computeAtr14(bars: DailyBar[], index: number, period = ATR_PERIOD): number {
  if (bars.length < 2 || index < 1) return 0;
  const start = Math.max(1, index - period + 1);
  let sum = 0;
  let count = 0;
  for (let i = start; i <= index; i++) {
    sum += trueRange(bars[i - 1]!, bars[i]!);
    count++;
  }
  if (count === 0) return bars[index]!.high - bars[index]!.low;
  return sum / count;
}

export function findEntryBarIndex(bars: DailyBar[], openedAtMs: number): number {
  const entryIdx = bars.findIndex((b) => b.timestamp * 1000 >= openedAtMs - 6 * 3600_000);
  if (entryIdx >= ATR_PERIOD) return entryIdx;
  const fallback = bars.findIndex((b, i) => i >= ATR_PERIOD && b.timestamp * 1000 >= openedAtMs - 86_400_000);
  return fallback;
}

export type ResolvedRUnit = {
  rUnitPrice: number;
  source: "planned_risk" | "atr14";
  atr14: number | null;
  entryBarIndex: number;
};

/** Price distance for 1R: plannedRiskUsd/openQty when set, else ATR(14) near entry. */
export function resolveRUnit(args: {
  plannedRiskUsd: number | null;
  openQty: number;
  bars: DailyBar[];
  openedAtMs: number;
}): ResolvedRUnit | null {
  const { plannedRiskUsd, openQty, bars, openedAtMs } = args;
  if (!(openQty > 0)) return null;

  const entryBarIndex = findEntryBarIndex(bars, openedAtMs);
  if (entryBarIndex < ATR_PERIOD) return null;

  const atr = computeAtr14(bars, Math.min(entryBarIndex, bars.length - 1));

  if (plannedRiskUsd != null && plannedRiskUsd > 0) {
    return {
      rUnitPrice: plannedRiskUsd / openQty,
      source: "planned_risk",
      atr14: atr > 0 ? atr : null,
      entryBarIndex,
    };
  }

  if (!(atr > 0)) return null;
  return {
    rUnitPrice: atr,
    source: "atr14",
    atr14: atr,
    entryBarIndex,
  };
}

export function actualRFromPnl(args: {
  netPnl: number;
  openQty: number;
  rUnitPrice: number;
  plannedRiskUsd: number | null;
}): number {
  const { netPnl, openQty, rUnitPrice, plannedRiskUsd } = args;
  if (plannedRiskUsd != null && plannedRiskUsd > 0) {
    return netPnl / plannedRiskUsd;
  }
  return netPnl / (openQty * rUnitPrice);
}
