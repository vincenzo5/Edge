import { describe, expect, it } from "vitest";
import { computeAtr, cosineSimilarity, extractOhlcvFeatures } from "./features";
import type { OhlcvBar } from "./types";

function makeTrendBars(n: number, start = 100, step = 0.5): OhlcvBar[] {
  const bars: OhlcvBar[] = [];
  let price = start;
  const ts = Date.parse("2025-01-01T00:00:00Z");
  for (let i = 0; i < n; i++) {
    const open = price;
    price += step;
    bars.push({
      timestamp: ts + i * 3600000,
      open,
      high: price + 0.3,
      low: open - 0.2,
      close: price,
      volume: 1_000_000,
    });
  }
  return bars;
}

describe("patternLibrary features", () => {
  it("computes positive trend slope on uptrend bars", () => {
    const f = extractOhlcvFeatures(makeTrendBars(30));
    expect(f.trendSlope).toBeGreaterThan(0);
    expect(f.atr14).toBeGreaterThan(0);
  });

  it("returns cosine 1 for identical vectors", () => {
    const v = [1, 2, 3, 4];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("computes ATR from bar series", () => {
    const atr = computeAtr(makeTrendBars(20), 14);
    expect(atr).toBeGreaterThan(0);
  });
});
