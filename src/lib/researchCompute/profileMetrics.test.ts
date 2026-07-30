import { describe, expect, it } from "vitest";

import { computeProfileMetrics } from "./profileMetrics";

describe("computeProfileMetrics", () => {
  it("returns compact metrics and preview table without raw bars", () => {
    const bars = Array.from({ length: 30 }, (_, index) => ({
      t: 1_700_000_000_000 + index * 86_400_000,
      o: 100 + index,
      h: 101 + index,
      l: 99 + index,
      c: 100.5 + index,
      v: 1_000 + index,
    }));

    const result = computeProfileMetrics({
      barsBySymbol: { AAPL: bars, MSFT: bars },
      interval: "1d",
      options: { rollingWindow: 10, correlationMaxSymbols: 2 },
    });

    expect(result.keyMetrics.Symbols).toBe(2);
    expect(result.keyMetrics["Total bars"]).toBe(60);
    expect(result.previewTable.rows.length).toBe(2);
    expect(result.previewTable.rows[0]?.[0]).toBe("AAPL");
    expect(result.warnings).toEqual([]);
    expect(result).not.toHaveProperty("candles");
  });
});
