import { describe, expect, it } from "vitest";

import { computeAtr14, resolveRUnit } from "./resolveRUnit";
import type { DailyBar } from "./types";

function bar(day: number, o: number, h: number, l: number, c: number): DailyBar {
  return { timestamp: day, open: o, high: h, low: l, close: c };
}

describe("resolveRUnit", () => {
  const bars: DailyBar[] = [];
  for (let i = 0; i < 20; i++) {
    bars.push(bar(1_700_000_000 + i * 86_400, 100, 102, 98, 100 + i * 0.1));
  }

  it("prefers planned risk over ATR", () => {
    const resolved = resolveRUnit({
      plannedRiskUsd: 500,
      openQty: 100,
      bars,
      openedAtMs: bars[15]!.timestamp * 1000,
    });
    expect(resolved?.source).toBe("planned_risk");
    expect(resolved?.rUnitPrice).toBe(5);
  });

  it("falls back to ATR(14) when planned risk missing", () => {
    const resolved = resolveRUnit({
      plannedRiskUsd: null,
      openQty: 100,
      bars,
      openedAtMs: bars[15]!.timestamp * 1000,
    });
    expect(resolved?.source).toBe("atr14");
    expect(resolved!.rUnitPrice).toBeGreaterThan(0);
  });
});

describe("computeAtr14", () => {
  it("returns positive ATR for volatile bars", () => {
    const bars = [
      bar(1, 10, 12, 9, 11),
      bar(2, 11, 13, 10, 12),
      bar(3, 12, 14, 11, 13),
    ];
    expect(computeAtr14(bars, 2)).toBeGreaterThan(0);
  });
});
