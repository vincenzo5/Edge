import { describe, it, expect } from "vitest";
import { mapFmpScreenerRow } from "./mappers";

describe("mapFmpScreenerRow", () => {
  it("maps FMP screener row with field aliases", () => {
    const row = mapFmpScreenerRow({
      symbol: "aapl",
      companyName: "Apple Inc.",
      price: 200,
      changesPercentage: 1.5,
      exchange: "NASDAQ",
      volume: 50_000_000,
      sector: "Technology",
      industry: "Consumer Electronics",
      country: "US",
      beta: 1.2,
      mktCap: 3_000_000_000_000,
      dividendYield: 0.005,
    });

    expect(row).toEqual({
      symbol: "AAPL",
      name: "Apple Inc.",
      price: 200,
      change: null,
      changePercent: 1.5,
      exchange: "NASDAQ",
      volume: 50_000_000,
      sector: "Technology",
      industry: "Consumer Electronics",
      country: "US",
      beta: 1.2,
      marketCap: 3_000_000_000_000,
      dividendYield: 0.005,
    });
  });

  it("returns null when symbol is missing", () => {
    expect(mapFmpScreenerRow({ companyName: "No Symbol Co." })).toBeNull();
  });

  it("reads changePercentage alias and derives percent from change and price", () => {
    const fromAlias = mapFmpScreenerRow({
      symbol: "MSFT",
      changePercentage: 2.5,
    });
    expect(fromAlias?.changePercent).toBe(2.5);

    const derived = mapFmpScreenerRow({
      symbol: "AAPL",
      price: 105,
      change: 5,
    });
    expect(derived?.changePercent).toBeCloseTo(5, 5);
  });
});
