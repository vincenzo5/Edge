import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

const getIbkrStatusProbe = vi.fn(async () => ({
  data: {
    configured: true,
    authenticated: true,
    connected: true,
    competing: false,
    warnings: [],
  },
  source: "ibkr",
  requestedAt: Date.now(),
  receivedAt: Date.now(),
  stale: false,
  warnings: [],
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({
    getIbkrStatusProbe,
  }),
}));

describe("/api/market-data/ibkr/status GET", () => {
  it("returns IBKR status probe", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status.authenticated).toBe(true);
  });
});
