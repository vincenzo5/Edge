import type { EquityCandle } from "../contracts/equities";
import type { DataCacheTier } from "../contracts/result";
import { coalesceInFlight } from "@/lib/chartDataFeed/coalesceInFlight";
import { latestCompletedTradingDate } from "../marketCalendar";
import type { ScreenerCandleFetchResult } from "@/lib/screener/technicalFilter";
import { TECHNICAL_FILTER_PROVIDER_MISS_BUDGET } from "@/lib/screener/technicalFilter";
import {
  getCandlesFromUniverseStore,
  type UniverseDailyStorePayload,
} from "./universeDailyStore";

export { TECHNICAL_FILTER_PROVIDER_MISS_BUDGET };

export class ProviderMissBudgetExhaustedError extends Error {
  readonly name = "ProviderMissBudgetExhaustedError";
}

export type ScreenerMassiveAggregatesClient = {
  getAggregates: (params: {
    ticker: string;
    multiplier: number;
    timespan: "day";
    from: string;
    to: string;
    adjusted: boolean;
  }) => Promise<{ candles: EquityCandle[] }>;
};

export type ScreenerDailyCandleFetcher = {
  fetch: (symbol: string) => Promise<ScreenerCandleFetchResult>;
  warnings: string[];
  providerMisses: number;
};

export type CreateScreenerDailyCandleFetcherOptions = {
  store: UniverseDailyStorePayload | null;
  minBars: number;
  range: "3mo" | "1y";
  massive?: ScreenerMassiveAggregatesClient | null;
  fetchProviderCandles: (
    symbol: string,
    range: "3mo" | "1y",
  ) => Promise<{ candles: EquityCandle[]; source: string; cacheTier: DataCacheTier }>;
  providerMissBudget?: number;
  recentIsoDate?: (offsetDays: number) => string;
};

function recentIsoDateDefault(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function buildScreenerCandleCoalesceKey(
  symbol: string,
  range: "3mo" | "1y",
): string {
  return `screener-candles:${symbol.trim().toUpperCase()}:1d:${range}`;
}

export function createScreenerDailyCandleFetcher(
  options: CreateScreenerDailyCandleFetcherOptions,
): ScreenerDailyCandleFetcher {
  const {
    store,
    minBars,
    range,
    massive = null,
    fetchProviderCandles,
    providerMissBudget = TECHNICAL_FILTER_PROVIDER_MISS_BUDGET,
    recentIsoDate = recentIsoDateDefault,
  } = options;

  const warnings: string[] = [];
  let providerMisses = 0;
  let budgetWarned = false;

  function consumeProviderMiss(symbol: string): void {
    if (providerMisses >= providerMissBudget) {
      if (!budgetWarned) {
        budgetWarned = true;
        warnings.push(
          "Provider miss budget reached; raise descriptive prefilter or wait for universe warm.",
        );
      }
      throw new ProviderMissBudgetExhaustedError(symbol);
    }
    providerMisses += 1;
  }

  async function fetchFromMassive(symbol: string): Promise<ScreenerCandleFetchResult | null> {
    if (!massive) return null;
    const key = buildScreenerCandleCoalesceKey(symbol, range);
    return coalesceInFlight(key, async () => {
      consumeProviderMiss(symbol);
      const agg = await massive.getAggregates({
        ticker: symbol,
        multiplier: 1,
        timespan: "day",
        from: range === "1y" ? recentIsoDate(-400) : recentIsoDate(-120),
        to: latestCompletedTradingDate(),
        adjusted: true,
      });
      if (agg.candles.length > 0) {
        return {
          candles: agg.candles,
          source: "massive",
          cacheTier: "cold" as const,
        };
      }
      return null;
    });
  }

  async function fetchFromProvider(symbol: string): Promise<ScreenerCandleFetchResult> {
    const key = buildScreenerCandleCoalesceKey(symbol, range);
    return coalesceInFlight(key, async () => {
      consumeProviderMiss(symbol);
      const result = await fetchProviderCandles(symbol, range);
      return {
        candles: result.candles,
        source: result.source,
        cacheTier: result.cacheTier,
      };
    });
  }

  async function fetch(symbol: string): Promise<ScreenerCandleFetchResult> {
    const fromStore = getCandlesFromUniverseStore(symbol, minBars, store);
    if (fromStore.found && fromStore.candles.length >= minBars) {
      return {
        candles: fromStore.candles,
        source: "massive-universe",
        cacheTier: "universe",
      };
    }
    if (fromStore.found && fromStore.candles.length > 0) {
      return {
        candles: fromStore.candles,
        source: "massive-universe",
        cacheTier: "universe",
      };
    }

    const massiveResult = await fetchFromMassive(symbol);
    if (massiveResult != null) {
      return massiveResult;
    }

    return fetchFromProvider(symbol);
  }

  return {
    fetch,
    get warnings() {
      return warnings;
    },
    get providerMisses() {
      return providerMisses;
    },
  };
}
