import { actualRFromPnl } from "./resolveRUnit";
import type { DailyBar, TradeDirection, TradePath } from "./types";

function signedCloseDelta(direction: TradeDirection, entry: number, close: number): number {
  return direction === "long" ? close - entry : entry - close;
}

/**
 * Build a daily-close R path: one point per session close while the trade is open,
 * plus the actual fill exit as the final point.
 */
export function buildClosePath(args: {
  direction: TradeDirection;
  entry: number;
  avgExit: number;
  rUnitPrice: number;
  bars: DailyBar[];
  openedAtMs: number;
  closedAtMs: number;
  netPnl: number;
  openQty: number;
  plannedRiskUsd: number | null;
}): TradePath {
  const {
    direction,
    entry,
    avgExit,
    rUnitPrice,
    bars,
    openedAtMs,
    closedAtMs,
    netPnl,
    openQty,
    plannedRiskUsd,
  } = args;

  const windowBars = bars.filter((b) => {
    const t = b.timestamp * 1000;
    return t >= openedAtMs - 6 * 3600_000 && t <= closedAtMs + 20 * 3600_000;
  });
  const useBars = windowBars.length > 0 ? windowBars : bars;

  const pathR: number[] = [];
  for (const bar of useBars) {
    pathR.push(signedCloseDelta(direction, entry, bar.close) / rUnitPrice);
  }

  const exitDelta = signedCloseDelta(direction, entry, avgExit);
  pathR.push(exitDelta / rUnitPrice);

  const favorable = useBars.map((b) => signedCloseDelta(direction, entry, b.high) / rUnitPrice);
  const adverse = useBars.map((b) => signedCloseDelta(direction, entry, b.low) / rUnitPrice);
  const exitR = exitDelta / rUnitPrice;

  const mfeR = Math.max(...favorable, exitR, 0);
  const maeR = Math.max(...adverse.map((r) => -r), 0);

  const actualR = actualRFromPnl({ netPnl, openQty, rUnitPrice, plannedRiskUsd });

  return {
    pathR,
    mfeR: round2(mfeR),
    maeR: round2(maeR),
    actualR: round2(actualR),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
