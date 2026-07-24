import type { DataResult } from "@/lib/marketData/contracts/result";
import type { Interval as ChartInterval } from "@edge/chart-core/contracts";
import type { Candle, Range } from "@/lib/yahoo";
import type { FundamentalsSnapshot, QuoteSnapshot } from "@/lib/watchlist/types";
import type { MarketDataService } from "@/lib/marketData/service/marketDataService";
import type {
  OptionExpiration,
  OptionsChainResponse,
} from "@/lib/marketData/contracts/options";
import { buildTrustMeta, defaultUsageForDataset } from "@/lib/marketData/trust/dataTrust";
import type { DatasetKind } from "@/lib/marketData/trust/dataTrust";
import { provenanceFromMeta } from "@/lib/marketData/trust/dataTrust";
import {
  buildClientCacheKey,
  normalizeClientCacheQuery,
  normalizeClientCacheSymbol,
} from "@/lib/marketData/cache/clientCachePolicy";
import { getOrFetchClientTtl } from "@/lib/marketData/cache/getOrFetchClientTtl";
import { candleCacheTtlMs } from "@/lib/marketData/cache/ttlPolicy";

export type StockSearchResult = {
  symbol: string;
  name: string;
  exchange: string;
};

export type MarketDataTrustMeta = {
  source: string;
  stale?: boolean;
  isFallback?: boolean;
  warnings?: string[];
  readiness: {
    status: "ok" | "blocked";
    reasons?: string[];
    allowedForTradingDecision: boolean;
  };
};

export type PortDelivery<T> = {
  data: T;
  meta: MarketDataTrustMeta;
};

const DATASET_BY_PORT: Record<string, DatasetKind> = {
  search: "watchlist_quotes",
  candles: "chart_candles",
  quotes: "watchlist_quotes",
  fundamentals: "watchlist_quotes",
  optionsExpirations: "options_expirations",
  optionsChain: "options_chain",
};

function toTrustMeta<T>(result: DataResult<T>, dataset: DatasetKind): MarketDataTrustMeta {
  const provenance = provenanceFromMeta({
    source: result.source,
    stale: result.stale,
    warnings: result.warnings,
    cacheTier: result.cacheTier,
    asOf: result.asOf,
    receivedAt: result.receivedAt,
  });
  const usage = defaultUsageForDataset(dataset);
  const trust = buildTrustMeta(dataset, usage, provenance);
  return {
    source: result.source,
    stale: result.stale,
    isFallback: provenance.isFallback,
    warnings: result.warnings?.slice(0, 4),
    readiness: {
      status: trust.readiness.status,
      reasons: trust.readiness.reasons,
      allowedForTradingDecision: trust.readiness.allowedForTradingDecision,
    },
  };
}

function wrapResult<T>(result: DataResult<T>, dataset: DatasetKind): PortDelivery<T> {
  return {
    data: result.data,
    meta: toTrustMeta(result, dataset),
  };
}

export type MarketDataPort = {
  searchSymbols: (query: string, limit?: number) => Promise<PortDelivery<StockSearchResult[]>>;
  getCandles: (args: {
    symbol: string;
    range: Range;
    interval: ChartInterval;
    before?: number;
    barCount?: number;
  }) => Promise<PortDelivery<Candle[]>>;
  getQuotes: (symbols: string[]) => Promise<PortDelivery<QuoteSnapshot[]>>;
  getFundamentals: (symbol: string) => Promise<PortDelivery<FundamentalsSnapshot>>;
  getOptionExpirations: (underlying: string) => Promise<PortDelivery<OptionExpiration[]>>;
  getOptionsChain: (
    underlying: string,
    expiration: string,
  ) => Promise<PortDelivery<OptionsChainResponse>>;
};

/** Server-side port backed by MarketDataService. */
export function createServiceMarketDataPort(service: MarketDataService): MarketDataPort {
  return {
    async searchSymbols(query, limit = 8) {
      const result = await service.searchInstruments(query, limit);
      return wrapResult(
        {
          ...result,
          data: result.data.map((row) => ({
            symbol: row.symbol,
            name: row.name,
            exchange: row.exchange ?? "",
          })),
        },
        DATASET_BY_PORT.search,
      );
    },
    async getCandles({ symbol, range, interval, before, barCount }) {
      const result = await service.getLegacyCandles({
        symbol,
        range,
        interval,
        beforeTimestamp: before,
        barCount,
      });
      return wrapResult({ ...result, data: result.data as Candle[] }, DATASET_BY_PORT.candles);
    },
    async getQuotes(symbols) {
      const result = await service.getWatchlistQuotes(symbols);
      return wrapResult(result, DATASET_BY_PORT.quotes);
    },
    async getFundamentals(symbol) {
      const result = await service.getWatchlistFundamentals(symbol);
      return wrapResult(result, DATASET_BY_PORT.fundamentals);
    },
    async getOptionExpirations(underlying) {
      const result = await service.getOptionExpirations(underlying);
      return wrapResult(result, DATASET_BY_PORT.optionsExpirations);
    },
    async getOptionsChain(underlying, expiration) {
      const result = await service.getOptionsChain({
        underlying,
        expiration,
        strikeWindow: { mode: "full" },
      });
      return wrapResult(result, DATASET_BY_PORT.optionsChain);
    },
  };
}

/** Client-side port that calls existing Next.js API routes. */
export function createFetchMarketDataPort(baseUrl = ""): MarketDataPort {
  const unknownMeta = (source = "unknown"): MarketDataTrustMeta => ({
    source,
    readiness: {
      status: "ok",
      allowedForTradingDecision: false,
    },
  });

  return {
    async searchSymbols(query, limit = 8) {
      const normalized = normalizeClientCacheQuery(query);
      if (!normalized) {
        return { data: [], meta: unknownMeta("yahoo") };
      }

      const key = buildClientCacheKey("search", [normalized, String(limit)]);
      return getOrFetchClientTtl("search", key, async () => {
        const res = await fetch(`${baseUrl}/api/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) throw new Error("Search failed");
        const json = (await res.json()) as { results: StockSearchResult[] };
        return { data: json.results.slice(0, limit), meta: unknownMeta("yahoo") };
      });
    },
    async getCandles({ symbol, range, interval, before, barCount }) {
      const sym = normalizeClientCacheSymbol(symbol);
      const key = buildClientCacheKey("ai_candles", [
        sym,
        range,
        interval,
        String(before ?? ""),
        String(barCount ?? ""),
      ]);
      return getOrFetchClientTtl(
        "ai_candles",
        key,
        async () => {
          const res = await fetch(`${baseUrl}/api/candles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol, range, interval, before, barCount }),
          });
          if (!res.ok) throw new Error("Candles fetch failed");
          const json = (await res.json()) as { candles: Candle[]; meta?: { source?: string } };
          return {
            data: json.candles,
            meta: unknownMeta(json.meta?.source ?? "mixed"),
          };
        },
        { ttlMs: candleCacheTtlMs(interval) },
      );
    },
    async getQuotes(symbols) {
      const normalized = [...new Set(symbols.map((s) => normalizeClientCacheSymbol(s)))].sort();
      if (normalized.length === 0) {
        return { data: [], meta: unknownMeta("mixed") };
      }

      const key = buildClientCacheKey("quotes", [normalized.join(",")]);
      return getOrFetchClientTtl("quotes", key, async () => {
        const res = await fetch(`${baseUrl}/api/quotes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols: normalized }),
        });
        if (!res.ok) throw new Error("Quotes fetch failed");
        const json = (await res.json()) as { quotes: QuoteSnapshot[]; meta?: { source?: string } };
        return {
          data: json.quotes,
          meta: unknownMeta(json.meta?.source ?? "mixed"),
        };
      });
    },
    async getFundamentals(symbol) {
      const res = await fetch(
        `${baseUrl}/api/fundamentals?symbol=${encodeURIComponent(symbol)}`,
      );
      if (!res.ok) throw new Error("Fundamentals fetch failed");
      const data = (await res.json()) as FundamentalsSnapshot;
      return { data, meta: unknownMeta("yahoo") };
    },
    async getOptionExpirations(underlying) {
      const params = new URLSearchParams({ underlying });
      const res = await fetch(`${baseUrl}/api/options/expirations?${params.toString()}`);
      if (!res.ok) throw new Error("Options expirations fetch failed");
      const json = (await res.json()) as {
        expirations: OptionExpiration[];
        meta?: { source?: string };
      };
      return {
        data: json.expirations,
        meta: unknownMeta(json.meta?.source ?? "mixed"),
      };
    },
    async getOptionsChain(underlying, expiration) {
      const params = new URLSearchParams({ underlying, expiration });
      const res = await fetch(`${baseUrl}/api/options/chain?${params.toString()}`);
      if (!res.ok) throw new Error("Options chain fetch failed");
      const json = (await res.json()) as {
        chain: OptionsChainResponse;
        meta?: { source?: string };
      };
      return {
        data: json.chain,
        meta: unknownMeta(json.meta?.source ?? "mixed"),
      };
    },
  };
}
