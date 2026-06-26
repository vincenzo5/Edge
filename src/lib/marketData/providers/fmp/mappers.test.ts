import { describe, it, expect } from "vitest";
import {
  mapFmpAnalystEstimate,
  mapFmpCompanyProfile,
  mapFmpExecutive,
  mapFmpIncomeStatement,
  mapFmpMarketMover,
  mapFmpSecFiling,
  mapFmpSplitEvent,
} from "./mappers";

describe("FMP mappers", () => {
  it("maps valid company profile rows", () => {
    const profile = mapFmpCompanyProfile("AAPL", {
      companyName: "Apple Inc.",
      exchange: "NASDAQ",
      currency: "USD",
      sector: "Technology",
      industry: "Consumer Electronics",
      country: "US",
      website: "https://apple.com",
      description: "Apple makes devices.",
      ceo: "Tim Cook",
      beta: 1.2,
      marketCap: 3_000_000_000_000,
      price: 200,
    });
    expect(profile?.symbol).toBe("AAPL");
    expect(profile?.name).toBe("Apple Inc.");
    expect(profile?.sector).toBe("Technology");
  });

  it("drops malformed income statement rows", () => {
    expect(mapFmpIncomeStatement("AAPL", { revenue: 100 })).toBeNull();
    const row = mapFmpIncomeStatement("AAPL", {
      date: "2025-09-30",
      fiscalYear: "2025",
      period: "FY",
      reportedCurrency: "USD",
      revenue: 100,
      netIncome: 25,
    });
    expect(row?.symbol).toBe("AAPL");
    expect(row?.revenue).toBe(100);
  });

  it("maps analyst estimates with nullable fields", () => {
    const estimate = mapFmpAnalystEstimate("AAPL", {
      date: "2026-06-30",
      revenueAvg: 95_000_000_000,
      epsAvg: 1.5,
    });
    expect(estimate?.symbol).toBe("AAPL");
    expect(estimate?.revenueLow).toBeNull();
    expect(estimate?.epsAvg).toBe(1.5);
  });

  it("maps executives and market movers", () => {
    const executive = mapFmpExecutive({
      name: "Tim Cook",
      title: "CEO",
      pay: 63_000_000,
      currencyPay: "USD",
    });
    expect(executive?.name).toBe("Tim Cook");

    const mover = mapFmpMarketMover({
      symbol: "NVDA",
      name: "NVIDIA Corporation",
      price: 120,
      change: 5,
      changesPercentage: 4.3,
      exchange: "NASDAQ",
      volume: 50_000_000,
    });
    expect(mover?.symbol).toBe("NVDA");
    expect(mover?.changePercent).toBe(4.3);
  });

  it("maps SEC filings and split events", () => {
    const filing = mapFmpSecFiling("AAPL", {
      cik: "0000320193",
      formType: "10-K",
      filingDate: "2025-11-01",
      acceptedDate: "2025-11-01",
      link: "https://example.com/filing",
    });
    expect(filing?.formType).toBe("10-K");

    const split = mapFmpSplitEvent("AAPL", {
      date: "2020-08-31",
      numerator: 4,
      denominator: 1,
      splitType: "stock-split",
    });
    expect(split?.type).toBe("split");
    expect(split?.details?.numerator).toBe(4);
  });

  it("rejects split rows for a different symbol", () => {
    const split = mapFmpSplitEvent("AAPL", {
      symbol: "MSFT",
      date: "2020-08-31",
      numerator: 4,
      denominator: 1,
    });
    expect(split).toBeNull();
  });
});
