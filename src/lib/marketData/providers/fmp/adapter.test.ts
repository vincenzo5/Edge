import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFmpProvider } from "./adapter";

const fmpGet = vi.fn();

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return {
    ...actual,
    fmpApiKey: () => "test-key",
    fmpGet: (...args: unknown[]) => fmpGet(...args),
  };
});

describe("FMP adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns profile data with warnings", async () => {
    fmpGet.mockResolvedValueOnce({
      data: [{ companyName: "Apple Inc.", sector: "Technology", price: 200 }],
      warnings: [],
    });
    const provider = createFmpProvider();
    const result = await provider.getCompanyProfile("AAPL");
    expect(result.profile?.name).toBe("Apple Inc.");
    expect(result.warnings).toEqual([]);
  });

  it("returns empty news with subscription warnings on 402", async () => {
    fmpGet.mockResolvedValueOnce({
      data: [],
      warnings: ["FMP endpoint restricted (402): subscription required"],
    });
    const provider = createFmpProvider();
    const result = await provider.getNews({ symbol: "AAPL", limit: 3 });
    expect(result.news).toEqual([]);
    expect(result.warnings[0]).toContain("402");
  });

  it("merges earnings, dividends, and splits into corporate events", async () => {
    fmpGet
      .mockResolvedValueOnce({
        data: [{ date: "2026-06-23", epsEstimated: 1.2 }],
        warnings: [],
      })
      .mockResolvedValueOnce({
        data: [{ date: "2026-08-15", dividend: 0.25 }],
        warnings: [],
      })
      .mockResolvedValueOnce({
        data: [{ date: "2020-08-31", numerator: 4, denominator: 1 }],
        warnings: [],
      });

    const provider = createFmpProvider();
    const result = await provider.getCorporateEvents({
      symbol: "AAPL",
      from: "2020-01-01",
      to: "2026-12-31",
    });
    expect(result.events.map((event) => event.type)).toEqual([
      "earnings",
      "dividend",
      "split",
    ]);
    expect(fmpGet).toHaveBeenCalledWith(
      "/earnings-calendar",
      { symbol: "AAPL", from: "2020-01-01", to: "2026-12-31" },
      { allowPlanErrors: true },
    );
  });

  it("drops split rows for a different symbol", async () => {
    fmpGet
      .mockResolvedValueOnce({ data: [], warnings: [] })
      .mockResolvedValueOnce({ data: [], warnings: [] })
      .mockResolvedValueOnce({
        data: [{ symbol: "MSFT", date: "2020-08-31", numerator: 2, denominator: 1 }],
        warnings: [],
      });

    const provider = createFmpProvider();
    const result = await provider.getCorporateEvents({ symbol: "AAPL" });
    expect(result.events).toHaveLength(0);
  });

  it("returns economic calendar rows with warnings", async () => {
    fmpGet.mockResolvedValueOnce({
      data: [
        {
          date: "2026-06-12 14:30:00",
          country: "US",
          event: "Consumer Price Index (CPI) YoY",
          currency: "USD",
          previous: 2.5,
          estimate: 2.7,
          actual: null,
          impact: "High",
        },
      ],
      warnings: [],
    });
    const provider = createFmpProvider();
    const result = await provider.getEconomicCalendar({
      from: "2026-06-01",
      to: "2026-09-01",
    });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.event).toContain("CPI");
    expect(fmpGet).toHaveBeenCalledWith(
      "/economic-calendar",
      { from: "2026-06-01", to: "2026-09-01" },
      { allowPlanErrors: true },
    );
  });

  it("defaults SEC filing search dates when from/to are omitted", async () => {
    fmpGet.mockResolvedValueOnce({
      data: [
        {
          formType: "8-K",
          filingDate: "2026-01-15",
          link: "https://sec.gov/example",
        },
      ],
      warnings: [],
    });
    const provider = createFmpProvider();
    const result = await provider.getSecFilings({ symbol: "AAPL", limit: 5 });
    expect(result.filings).toHaveLength(1);
    expect(fmpGet).toHaveBeenCalledWith(
      "/sec-filings-search/symbol",
      expect.objectContaining({
        symbol: "AAPL",
        from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        limit: "5",
      }),
      { allowPlanErrors: true },
    );
  });

  it("builds a financials bundle from multiple endpoints", async () => {
    for (let i = 0; i < 6; i += 1) {
      fmpGet.mockResolvedValueOnce({
        data: [{ date: "2025-09-30", revenue: 100 + i }],
        warnings: [],
      });
    }
    const provider = createFmpProvider();
    const result = await provider.getFinancialsBundle({
      symbol: "AAPL",
      period: "annual",
      limit: 1,
    });
    expect(result.bundle.symbol).toBe("AAPL");
    expect(result.bundle.incomeStatements).toHaveLength(1);
    expect(result.bundle.balanceSheets).toHaveLength(1);
  });
});
