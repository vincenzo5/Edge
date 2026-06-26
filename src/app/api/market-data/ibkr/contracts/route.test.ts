import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

const getIbkrContractProbe = vi.fn(async () => ({
  data: { symbol: "AAPL", conid: 265598, exchange: "NASDAQ" },
  source: "ibkr",
  requestedAt: Date.now(),
  receivedAt: Date.now(),
  stale: false,
  warnings: [],
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({
    getIbkrContractProbe,
  }),
}));

describe("/api/market-data/ibkr/contracts GET", () => {
  it("returns contract for valid symbol", async () => {
    const res = await GET(new Request("http://localhost/api/market-data/ibkr/contracts?symbol=AAPL"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.contract.conid).toBe(265598);
  });

  it("rejects missing symbol", async () => {
    const res = await GET(new Request("http://localhost/api/market-data/ibkr/contracts"));
    expect(res.status).toBe(400);
  });
});
