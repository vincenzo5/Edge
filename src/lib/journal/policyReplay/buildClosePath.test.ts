import { describe, expect, it } from "vitest";

import { buildClosePath } from "./buildClosePath";
import type { DailyBar } from "./types";

function bar(day: number, close: number, spread = 1): DailyBar {
  return {
    timestamp: day,
    open: close,
    high: close + spread,
    low: close - spread,
    close,
  };
}

describe("buildClosePath", () => {
  const bars: DailyBar[] = [];
  for (let i = 0; i < 20; i++) {
    bars.push(bar(1_700_000_000 + i * 86_400, 100 + i));
  }

  it("builds daily close R path for a long trade", () => {
    const path = buildClosePath({
      direction: "long",
      entry: 100,
      avgExit: 104,
      rUnitPrice: 2,
      bars,
      openedAtMs: bars[14]!.timestamp * 1000,
      closedAtMs: bars[18]!.timestamp * 1000,
      netPnl: 400,
      openQty: 100,
      plannedRiskUsd: 200,
    });

    expect(path.pathR.length).toBeGreaterThan(0);
    expect(path.actualR).toBe(2);
    expect(path.mfeR).toBeGreaterThan(0);
  });

  it("uses ATR fallback actual R when no planned risk", () => {
    const path = buildClosePath({
      direction: "short",
      entry: 50,
      avgExit: 48,
      rUnitPrice: 2,
      bars,
      openedAtMs: bars[14]!.timestamp * 1000,
      closedAtMs: bars[17]!.timestamp * 1000,
      netPnl: 200,
      openQty: 100,
      plannedRiskUsd: null,
    });

    expect(path.actualR).toBe(1);
  });
});
