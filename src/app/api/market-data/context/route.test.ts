import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const getMarketContext = vi.fn(async () => ({
  data: {
    symbol: "AAPL",
    name: "Apple Inc.",
    assetClass: "equity" as const,
    exchange: "NASDAQ",
    sector: { label: "Technology", source: "tws" as const, confidence: "provider" as const },
    industry: {
      label: "Consumer Electronics",
      source: "tws" as const,
      confidence: "provider" as const,
    },
    relationships: [
      {
        kind: "sector" as const,
        label: "Technology",
        source: "tws" as const,
        confidence: "provider" as const,
      },
    ],
    tradableGroups: [
      {
        flavor: "sector_etf" as const,
        label: "Sector ETF",
        members: [
          {
            flavor: "sector_etf" as const,
            label: "Technology sector",
            symbol: "XLK",
            source: "curated" as const,
            confidence: "curated" as const,
          },
        ],
      },
    ],
    updatedAt: Date.now(),
  },
  source: "tws" as const,
  requestedAt: Date.now(),
  receivedAt: Date.now(),
  stale: false,
  warnings: [],
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({
    getMarketContext,
  }),
}));

describe("/api/market-data/context GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns market context with meta", async () => {
    const res = await GET(new Request("http://localhost/api/market-data/context?symbol=AAPL"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.context.symbol).toBe("AAPL");
    expect(json.context.tradableGroups).toHaveLength(1);
    expect(json.meta.source).toBe("tws");
    expect(getMarketContext).toHaveBeenCalledWith("AAPL");
  });

  it("rejects missing symbol", async () => {
    const res = await GET(new Request("http://localhost/api/market-data/context"));
    expect(res.status).toBe(400);
  });
});
