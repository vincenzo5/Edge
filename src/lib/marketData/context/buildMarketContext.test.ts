import { describe, it, expect } from "vitest";
import { buildMarketContext } from "./buildMarketContext";

describe("buildMarketContext", () => {
  it("prefers TWS classification over fallback profile", () => {
    const context = buildMarketContext({
      symbol: "AAPL",
      twsDetails: {
        symbol: "AAPL",
        conid: 265598,
        secType: "STK",
        exchange: "SMART",
        primaryExchange: "NASDAQ",
        companyName: "Apple Inc.",
        industry: "Technology",
        category: "Technology",
        subcategory: "Consumer Electronics",
      },
      fmpProfile: {
        symbol: "AAPL",
        name: "Apple Inc.",
        exchange: "NASDAQ",
        currency: "USD",
        sector: "Old Sector",
        industry: "Old Industry",
        country: "US",
        website: null,
        description: null,
        ceo: null,
        beta: null,
        marketCap: null,
        price: null,
        updatedAt: Date.now(),
      },
    });

    expect(context.sector?.label).toBe("Technology");
    expect(context.industry?.label).toBe("Consumer Electronics");
    expect(context.relationships.find((r) => r.kind === "sector")?.symbol).toBeUndefined();
    expect(context.tradableGroups.find((g) => g.flavor === "sector_etf")?.members[0]?.symbol).toBe(
      "XLK",
    );
    expect(context.tradableGroups.find((g) => g.flavor === "benchmark")?.members.some((m) => m.symbol === "QQQ")).toBe(true);
  });

  it("falls back to Yahoo fundamentals when provider metadata is missing", () => {
    const context = buildMarketContext({
      symbol: "IBM",
      fundamentals: {
        symbol: "IBM",
        shortName: "IBM",
        longName: "International Business Machines",
        exchange: "NYSE",
        currency: "USD",
        regularMarketPrice: 180,
        regularMarketChange: 1,
        regularMarketChangePercent: 0.5,
        marketCap: 1,
        volume: 1,
        averageVolume: 1,
        sector: "Technology",
        industry: "Information Technology Services",
        website: null,
        description: null,
        updatedAt: Date.now(),
      },
    });

    expect(context.sector?.source).toBe("yahoo");
    expect(context.industry?.source).toBe("yahoo");
    expect(context.name).toBe("International Business Machines");
    expect(context.relationships.map((r) => r.kind)).toEqual(["sector", "industry"]);
    expect(context.tradableGroups.map((g) => g.flavor)).toEqual([
      "sector_etf",
      "broad_market",
      "benchmark",
      "style",
      "strategy",
    ]);
  });
});
