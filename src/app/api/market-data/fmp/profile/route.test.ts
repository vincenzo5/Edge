import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const getFmpCompanyProfile = vi.fn(async () => ({
  data: {
    symbol: "AAPL",
    name: "Apple Inc.",
    exchange: "NASDAQ",
    currency: "USD",
    sector: "Technology",
    industry: "Consumer Electronics",
    country: "US",
    website: "apple.com",
    description: "desc",
    ceo: "Tim Cook",
    beta: 1.1,
    marketCap: 1,
    price: 200,
    updatedAt: Date.now(),
  },
  source: "fmp",
  requestedAt: Date.now(),
  receivedAt: Date.now(),
  stale: false,
  warnings: [],
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({
    getFmpCompanyProfile,
  }),
}));

describe("/api/market-data/fmp/profile GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns profile with meta", async () => {
    const res = await GET(new Request("http://localhost/api/market-data/fmp/profile?symbol=AAPL"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile.name).toBe("Apple Inc.");
    expect(json.meta.source).toBe("fmp");
  });

  it("rejects missing symbol", async () => {
    const res = await GET(new Request("http://localhost/api/market-data/fmp/profile"));
    expect(res.status).toBe(400);
  });
});
