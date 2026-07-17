import { describe, it, expect } from "vitest";
import { summarizeScreenTool } from "./screener";
import type { ToolContext } from "../context";
import type { ScreenerState } from "@/lib/screener/types";

const baseState: ScreenerState = {
  version: 1,
  activeScreenId: "screen-1",
  query: { limit: 200, volume: { min: 500_000 } },
  columns: ["symbol", "price"],
  savedScreens: [
    {
      id: "screen-1",
      name: "Tech momentum",
      kind: "screener",
      query: { limit: 200 },
      columns: ["symbol", "price"],
      createdAt: 1,
      updatedAt: 1,
    },
  ],
};

describe("summarizeScreenTool", () => {
  it("returns thesis summary for loaded screener results", async () => {
    const ctx: ToolContext = {
      clientSession: true,
      app: null,
      chart: null,
      watchlist: null,
      screener: {
        getState: () => baseState,
        getLastRun: () => ({
          rows: [
            {
              symbol: "AAPL",
              name: "Apple",
              price: 200,
              change: 2,
              changePercent: 1.5,
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
          meta: {
            source: "fmp",
            warnings: [],
            stale: false,
            indicatorValues: { AAPL: { histogram: 0.4 } },
          },
        }),
      },
      risk: null,
      account: null,
      options: null,
      marketData: {
        searchSymbols: async () => [],
        getCandles: async () => [],
        getQuotes: async () => [],
        getFundamentals: async () => ({ symbol: "AAPL", updatedAt: Date.now() }),
        getOptionExpirations: async () => [],
        getOptionsChain: async () => ({
          underlying: "AAPL",
          expiration: "2025-06-20",
          contracts: [],
        }),
      },
    };

    const result = await summarizeScreenTool.execute({}, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.screenName).toBe("Tech momentum");
    expect(result.data.resultCount).toBe(1);
    expect(result.data.thesisSummary).toContain("Tech momentum");
    expect(result.data.technicalSignals.length).toBeGreaterThan(0);
  });

  it("returns empty-state message when no results are loaded", async () => {
    const ctx: ToolContext = {
      clientSession: true,
      app: null,
      chart: null,
      watchlist: null,
      screener: {
        getState: () => baseState,
        getLastRun: () => null,
      },
      risk: null,
      account: null,
      options: null,
      marketData: {
        searchSymbols: async () => [],
        getCandles: async () => [],
        getQuotes: async () => [],
        getFundamentals: async () => ({ symbol: "AAPL", updatedAt: Date.now() }),
        getOptionExpirations: async () => [],
        getOptionsChain: async () => ({
          underlying: "AAPL",
          expiration: "2025-06-20",
          contracts: [],
        }),
      },
    };

    const result = await summarizeScreenTool.execute({}, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.resultCount).toBe(0);
    expect(result.data.thesisSummary).toContain("No screener results");
  });
});
