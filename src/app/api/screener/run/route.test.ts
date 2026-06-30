import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const getScreenerResults = vi.fn(async () => ({
  data: [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      price: 200,
      change: 1,
      changePercent: 0.5,
      exchange: "NASDAQ",
      volume: 1_000_000,
      sector: "Technology",
      industry: "Consumer Electronics",
      country: "US",
      beta: 1.2,
      marketCap: 3_000_000_000_000,
      dividendYield: 0.005,
    },
  ],
  source: "fmp" as const,
  requestedAt: Date.now(),
  receivedAt: Date.now(),
  stale: false,
  warnings: [],
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({
    getScreenerResults,
  }),
}));

describe("POST /api/screener/run", () => {
  beforeEach(() => {
    getScreenerResults.mockClear();
  });

  it("returns validation error for invalid body", async () => {
    const res = await POST(
      new Request("http://localhost/api/screener/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 5000 }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns screener results with meta envelope", async () => {
    const res = await POST(
      new Request("http://localhost/api/screener/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector: "Technology",
          marketCap: { min: 10_000_000_000 },
          limit: 50,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toHaveLength(1);
    expect(json.results[0].symbol).toBe("AAPL");
    expect(json.meta.source).toBe("fmp");
    expect(getScreenerResults).toHaveBeenCalledWith(
      expect.objectContaining({
        sector: "Technology",
        marketCap: { min: 10_000_000_000 },
        limit: 50,
      }),
      expect.objectContaining({
        traceId: expect.any(String),
        perf: expect.any(Object),
      }),
    );
  });

  it("returns validation error for invalid indicator technical rule", async () => {
    const res = await POST(
      new Request("http://localhost/api/screener/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: 50,
          technical: {
            kind: "indicator",
            indicator: "NOT_REAL",
            series: "rsi",
            bar: "last",
            op: ">",
            threshold: 0,
          },
        }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid technical rule/i);
    expect(getScreenerResults).not.toHaveBeenCalled();
  });

  it("returns provider error on service failure", async () => {
    getScreenerResults.mockRejectedValueOnce(new Error("FMP down"));
    const res = await POST(
      new Request("http://localhost/api/screener/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      }),
    );
    expect(res.status).toBe(500);
  });
});
