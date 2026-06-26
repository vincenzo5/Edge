import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

const getOptionsChain = vi.fn(async () => ({
  data: {
    underlying: "AAPL",
    expiration: "2025-06-20",
    contracts: [
      {
        contractSymbol: "AAPL250620C00150000",
        underlying: "AAPL",
        type: "call",
        expiration: "2025-06-20",
        strike: 150,
        bid: 1,
        ask: 1.2,
        updatedAt: Date.now(),
      },
    ],
  },
  source: "ibkr",
  requestedAt: Date.now(),
  receivedAt: Date.now(),
  stale: false,
  warnings: [],
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({
    getOptionsChain,
  }),
}));

describe("/api/options/chain GET", () => {
  it("returns chain and meta for valid query", async () => {
    const res = await GET(
      new Request(
        "http://localhost/api/options/chain?underlying=AAPL&expiration=2025-06-20",
      ),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.chain.contracts).toHaveLength(1);
    expect(json.meta.source).toBe("ibkr");
  });

  it("rejects invalid expiration format", async () => {
    const res = await GET(
      new Request(
        "http://localhost/api/options/chain?underlying=AAPL&expiration=06/20/2025",
      ),
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing expiration", async () => {
    const res = await GET(
      new Request("http://localhost/api/options/chain?underlying=AAPL"),
    );
    expect(res.status).toBe(400);
  });
});
