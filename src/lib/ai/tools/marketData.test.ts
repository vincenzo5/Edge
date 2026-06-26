import { describe, it, expect, vi } from "vitest";
import {
  getOptionsChainTool,
  getOptionsExpirationsTool,
} from "./marketData";

describe("marketData options tools", () => {
  it("get_options_expirations delegates to marketData port", async () => {
    const getOptionExpirations = vi.fn().mockResolvedValue([
      { underlying: "AAPL", expiration: "2025-06-20" },
    ]);
    const result = await getOptionsExpirationsTool.execute(
      { underlying: "AAPL" },
      {
        clientSession: false,
        app: null,
        chart: null,
        watchlist: null,
        marketData: {
          searchSymbols: vi.fn(),
          getCandles: vi.fn(),
          getQuotes: vi.fn(),
          getFundamentals: vi.fn(),
          getOptionExpirations,
          getOptionsChain: vi.fn(),
        },
      },
    );
    expect(result.ok).toBe(true);
    expect(getOptionExpirations).toHaveBeenCalledWith("AAPL");
  });

  it("get_options_chain delegates to marketData port", async () => {
    const getOptionsChain = vi.fn().mockResolvedValue({
      underlying: "AAPL",
      expiration: "2025-06-20",
      contracts: [],
    });
    const result = await getOptionsChainTool.execute(
      { underlying: "AAPL", expiration: "2025-06-20" },
      {
        clientSession: false,
        app: null,
        chart: null,
        watchlist: null,
        marketData: {
          searchSymbols: vi.fn(),
          getCandles: vi.fn(),
          getQuotes: vi.fn(),
          getFundamentals: vi.fn(),
          getOptionExpirations: vi.fn(),
          getOptionsChain,
        },
      },
    );
    expect(result.ok).toBe(true);
    expect(getOptionsChain).toHaveBeenCalledWith("AAPL", "2025-06-20");
  });
});
