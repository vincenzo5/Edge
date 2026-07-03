import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMassiveProvider } from "./adapter";

describe("createMassiveProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, MASSIVE_API_KEY: "test-key" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: "OK",
            results: [{ T: "AAPL", o: 190, h: 195, l: 189, c: 194, v: 1, t: 1_700_000_000_000 }],
          }),
      })),
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("isConfigured when MASSIVE_API_KEY set", () => {
    expect(createMassiveProvider().isConfigured()).toBe(true);
  });

  it("falls back to POLYGON_API_KEY", () => {
    delete process.env.MASSIVE_API_KEY;
    process.env.POLYGON_API_KEY = "polygon-key";
    expect(createMassiveProvider().isConfigured()).toBe(true);
  });

  it("getDailyMarketSummary fetches grouped daily with adjusted=true", async () => {
    const provider = createMassiveProvider();
    const result = await provider.getDailyMarketSummary("2024-06-03");
    expect(result.bySymbol.get("AAPL")?.c).toBe(194);
    const url = String((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
    expect(url).toContain("/v2/aggs/grouped/locale/us/market/stocks/2024-06-03");
    expect(url).toContain("adjusted=true");
  });

  it("delegates options expirations to Massive options submodule", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: "OK",
            results: [
              {
                ticker: "O:AAPL250620C00150000",
                underlying_ticker: "AAPL",
                expiration_date: "2025-06-20",
                contract_type: "call",
                strike_price: 150,
              },
            ],
          }),
      })),
    );
    const provider = createMassiveProvider();
    const result = await provider.getOptionExpirationsWithWarnings("AAPL");
    expect(result.expirations).toEqual([{ underlying: "AAPL", expiration: "2025-06-20" }]);
  });

  it("handles plan errors gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 403,
        text: async () => "not authorized",
      })),
    );
    const provider = createMassiveProvider();
    const result = await provider.getDailyMarketSummary("2024-06-03");
    expect(result.bySymbol.size).toBe(0);
    expect(result.warnings[0]).toContain("403");
    expect(result.warnings[0]).not.toContain("not authorized");
  });
});
