import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EquityCandle } from "@/lib/marketData/contracts/equities";
import { resetCoalesceInFlightForTests } from "@/lib/chartDataFeed/coalesceInFlight";
import {
  createScreenerDailyCandleFetcher,
  ProviderMissBudgetExhaustedError,
  TECHNICAL_FILTER_PROVIDER_MISS_BUDGET,
} from "./resolveScreenerDailyCandles";
import {
  resetUniverseStoreForTests,
  writeUniverseDailyStore,
  type UniverseDailyStorePayload,
} from "./universeDailyStore";

function dailyCandles(count: number, close = 97): EquityCandle[] {
  return Array.from({ length: count }, (_, index) => ({
    t: index,
    o: close,
    h: close,
    l: close - 1,
    c: close,
    v: 1,
  }));
}

function warmStore(symbols: string[], barCount = 20): UniverseDailyStorePayload {
  const byDate: UniverseDailyStorePayload["byDate"] = {};
  const tradingDates: string[] = [];
  for (let i = 0; i < barCount; i += 1) {
    const date = `2024-05-${String(i + 1).padStart(2, "0")}`;
    tradingDates.push(date);
    byDate[date] = {};
    for (const symbol of symbols) {
      byDate[date]![symbol] = {
        t: Date.parse(`${date}T00:00:00.000Z`),
        o: 100,
        h: 100,
        l: 99,
        c: 97,
        v: 1,
      };
    }
  }
  return { byDate, tradingDates, asOf: Date.now() };
}

describe("createScreenerDailyCandleFetcher", () => {
  beforeEach(() => {
    resetCoalesceInFlightForTests();
    resetUniverseStoreForTests();
  });

  it("returns universe store candles without calling providers", async () => {
    const store = warmStore(["AAPL"]);
    const fetchProviderCandles = vi.fn(async () => ({
      candles: dailyCandles(20),
      source: "yahoo",
      cacheTier: "cold" as const,
    }));
    const massive = { getAggregates: vi.fn(async () => ({ candles: [] })) };

    const fetcher = createScreenerDailyCandleFetcher({
      store,
      minBars: 14,
      range: "3mo",
      massive,
      fetchProviderCandles,
    });

    const result = await fetcher.fetch("AAPL");

    expect(result.cacheTier).toBe("universe");
    expect(result.source).toBe("massive-universe");
    expect(result.candles.length).toBeGreaterThanOrEqual(14);
    expect(fetchProviderCandles).not.toHaveBeenCalled();
    expect(massive.getAggregates).not.toHaveBeenCalled();
    expect(fetcher.providerMisses).toBe(0);
  });

  it("prefers readUniverseDailyStore on fallback when store is warm", async () => {
    writeUniverseDailyStore(warmStore(["AAPL"]));
    const fetchProviderCandles = vi.fn(async () => ({
      candles: dailyCandles(20),
      source: "yahoo",
      cacheTier: "cold" as const,
    }));

    const fetcher = createScreenerDailyCandleFetcher({
      store: warmStore(["AAPL"]),
      minBars: 14,
      range: "3mo",
      fetchProviderCandles,
    });

    await fetcher.fetch("AAPL");
    expect(fetchProviderCandles).not.toHaveBeenCalled();
  });

  it("coalesces identical in-flight provider fetches", async () => {
    let providerCalls = 0;
    const fetchProviderCandles = vi.fn(async () => {
      providerCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        candles: dailyCandles(20),
        source: "yahoo",
        cacheTier: "cold" as const,
      };
    });

    const fetcher = createScreenerDailyCandleFetcher({
      store: null,
      minBars: 14,
      range: "3mo",
      fetchProviderCandles,
    });

    await Promise.all([fetcher.fetch("AAPL"), fetcher.fetch("AAPL")]);

    expect(providerCalls).toBe(1);
    expect(fetcher.providerMisses).toBe(1);
  });

  it("caps provider misses at TECHNICAL_FILTER_PROVIDER_MISS_BUDGET", async () => {
    const fetchProviderCandles = vi.fn(async () => ({
      candles: dailyCandles(20),
      source: "yahoo",
      cacheTier: "cold" as const,
    }));

    const fetcher = createScreenerDailyCandleFetcher({
      store: null,
      minBars: 14,
      range: "3mo",
      fetchProviderCandles,
      providerMissBudget: 2,
    });

    await fetcher.fetch("AAPL");
    await fetcher.fetch("MSFT");
    await expect(fetcher.fetch("NVDA")).rejects.toBeInstanceOf(ProviderMissBudgetExhaustedError);

    expect(fetchProviderCandles).toHaveBeenCalledTimes(2);
    expect(fetcher.providerMisses).toBe(2);
    expect(fetcher.warnings).toContain(
      "Provider miss budget reached; raise descriptive prefilter or wait for universe warm.",
    );
  });

  it("defaults provider miss budget to TECHNICAL_FILTER_PROVIDER_MISS_BUDGET", () => {
    expect(TECHNICAL_FILTER_PROVIDER_MISS_BUDGET).toBe(50);
  });
});
