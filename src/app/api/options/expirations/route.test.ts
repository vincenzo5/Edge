import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

const getOptionExpirations = vi.fn(async () => ({
  data: [{ underlying: "AAPL", expiration: "2025-06-20" }],
  source: "tradier",
  requestedAt: Date.now(),
  receivedAt: Date.now(),
  stale: false,
  warnings: [],
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({
    getOptionExpirations,
  }),
}));

describe("/api/options/expirations GET", () => {
  it("returns expirations for valid underlying", async () => {
    const res = await GET(new Request("http://localhost/api/options/expirations?underlying=AAPL"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.expirations).toHaveLength(1);
    expect(json.meta.source).toBe("tradier");
  });

  it("returns empty expirations with warnings when service throws", async () => {
    getOptionExpirations.mockRejectedValueOnce(new Error("MASSIVE_API_KEY is not configured"));
    const res = await GET(new Request("http://localhost/api/options/expirations?underlying=AAPL"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.expirations).toEqual([]);
    expect(json.meta.warnings[0]).toMatch(/MASSIVE_API_KEY/i);
  });

  it("rejects missing underlying", async () => {
    const res = await GET(new Request("http://localhost/api/options/expirations"));
    expect(res.status).toBe(400);
  });
});
