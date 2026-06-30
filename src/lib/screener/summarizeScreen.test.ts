import { describe, it, expect } from "vitest";
import { buildScreenSummary } from "./summarizeScreen";
import type { ScreenerResultRow } from "./types";

const row = (symbol: string, changePercent: number, sector: string): ScreenerResultRow => ({
  symbol,
  name: symbol,
  price: 100,
  change: changePercent,
  changePercent,
  exchange: "NASDAQ",
  volume: 500_000,
  sector,
  industry: "Software",
  country: "US",
  beta: 1.1,
  marketCap: 5_000_000_000,
  dividendYield: 0.01,
});

describe("buildScreenSummary", () => {
  it("builds sector concentration and thesis summary", () => {
    const summary = buildScreenSummary({
      screenName: "Momentum",
      query: { limit: 200, volume: { min: 500_000 } },
      rows: [
        row("AAPL", 2.5, "Technology"),
        row("MSFT", 1.2, "Technology"),
        row("XOM", -0.8, "Energy"),
      ],
      meta: {
        source: "fmp",
        warnings: [],
        skippedSymbols: [],
        stale: false,
        indicatorValues: {
          AAPL: { histogram: 0.5 },
          MSFT: { histogram: 0.2 },
        },
      },
    });

    expect(summary.resultCount).toBe(3);
    expect(summary.sectorConcentration[0]?.sector).toBe("Technology");
    expect(summary.topGainers[0]?.symbol).toBe("AAPL");
    expect(summary.technicalSignals.length).toBeGreaterThan(0);
    expect(summary.thesisSummary).toContain("Momentum");
  });
});
