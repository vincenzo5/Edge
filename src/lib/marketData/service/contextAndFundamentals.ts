import type { CandleRequest, CandleResponse, EquityQuote } from "../contracts/equities";
import type { FundamentalsSnapshot, SecCompanyFacts, SecFiling } from "../contracts/fundamentals";
import type { DerivedMetric, DerivedMetricKind, DerivedUpstreamRef } from "../contracts/derived";
import type { MacroSeries, EconomicRelease } from "../contracts/macro";
import type { MarketContext } from "../contracts/marketContext";
import type { FmpCompanyProfile } from "../contracts/fmp";
import { createDataResult, type DataResult } from "../contracts/result";
import { buildCacheKey, cacheTtlMs } from "../cache";
import { globalDataCache } from "../cache/serverCacheBackends";
import { buildMarketContext } from "../context/buildMarketContext";
import type { IbkrProvider } from "../providers/ibkr/adapter";
import type { TwsProvider } from "../providers/tws/adapter";
import { evaluateDatasetPolicy } from "../trust/policyEvaluator";
import { recordServiceDelivery } from "../state/serviceInstrumentation";
import type { FundamentalsSnapshot as WatchlistFundamentals } from "@/lib/watchlist/types";
import { fundamentalsToWatchlist } from "../validation/mappers";
import { getCandles } from "./candlesFetch";
import { getFmpCompanyProfile } from "./fmpRoutes";
import {
  ibkrRoutingDecision,
  recordIbkrFailure,
  recordIbkrSuccess,
  recordTwsFailure,
  recordTwsSuccess,
  twsRoutingDecision,
} from "./providerRouting";
import { getQuotes } from "./quotesFetch";
import type { MarketDataServiceHost } from "./marketDataServiceHost";

export async function getFundamentals(svc: MarketDataServiceHost, symbol: string): Promise<DataResult<FundamentalsSnapshot>> {
  const requestedAt = Date.now();
  const sym = symbol.trim().toUpperCase();
  const cacheKey = buildCacheKey(["fundamentals", sym]);
  const cached = await Promise.resolve(globalDataCache.read<FundamentalsSnapshot>("fundamentals", cacheKey));
  if (cached.hit && cached.value) {
    return recordServiceDelivery(
      createDataResult(cached.value, "yahoo", { requestedAt, asOf: cached.asOf, cacheTier: "cold" }),
      "fundamentals_display",
      { transport: "cache" },
    );
  }
  const data = await svc.yahoo.getFundamentals(sym);
  await Promise.resolve(globalDataCache.write("fundamentals", cacheKey, data, cacheTtlMs("fundamentals"), Date.now()));
  return recordServiceDelivery(
    createDataResult(data, "yahoo", { requestedAt }),
    "fundamentals_display",
    { transport: "request" },
  );
}


export async function getWatchlistFundamentals(svc: MarketDataServiceHost, 
  symbol: string,
): Promise<DataResult<WatchlistFundamentals>> {
  const result = await getFundamentals(svc, symbol);
  return createDataResult(fundamentalsToWatchlist(result.data), result.source, {
    requestedAt: result.requestedAt,
    receivedAt: result.receivedAt,
    asOf: result.asOf,
    stale: result.stale,
    warnings: result.warnings,
  });
}


export async function getWatchlistFundamentalsBatch(svc: MarketDataServiceHost, 
  symbols: string[],
): Promise<
  DataResult<{
    bySymbol: Record<string, WatchlistFundamentals>;
    errors: Record<string, string>;
  }>
> {
  const requestedAt = Date.now();
  const normalized = [
    ...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
  ];
  const bySymbol: Record<string, WatchlistFundamentals> = {};
  const errors: Record<string, string> = {};
  const concurrency = 6;

  for (let offset = 0; offset < normalized.length; offset += concurrency) {
    const chunk = normalized.slice(offset, offset + concurrency);
    await Promise.all(
      chunk.map(async (symbol) => {
        try {
          const result = await getWatchlistFundamentals(svc, symbol);
          bySymbol[symbol] = result.data;
        } catch (error) {
          errors[symbol] =
            error instanceof Error ? error.message : "Failed to fetch fundamentals";
        }
      }),
    );
  }

  return createDataResult({ bySymbol, errors }, "yahoo", { requestedAt });
}


export async function getMarketContext(svc: MarketDataServiceHost, symbol: string): Promise<DataResult<MarketContext>> {
  const requestedAt = Date.now();
  const sym = symbol.trim().toUpperCase();
  const cacheKey = buildCacheKey(["market-context", sym]);
  const cached = await Promise.resolve(globalDataCache.read<MarketContext>("market_context", cacheKey));
  if (cached.hit && cached.value) {
    return createDataResult(cached.value, "mixed", {
      requestedAt,
      asOf: cached.asOf,
    });
  }

  const warnings: string[] = [];
  let source: DataResult<MarketContext>["source"] = "mixed";
  let twsDetails = null as Awaited<ReturnType<TwsProvider["getContractDetails"]>>;
  let ibkrInfo = null as Awaited<ReturnType<IbkrProvider["getContractClassification"]>>;

  if (svc.tws.isConfigured()) {
    const twsDecision = twsRoutingDecision(svc, "quotes");
    if (twsDecision.shouldTry) {
      try {
        twsDetails = await svc.tws.getContractDetails(sym);
        if (twsDetails) {
          source = "tws";
          recordTwsSuccess(svc, );
        }
      } catch (error) {
        recordTwsFailure(svc, error);
        warnings.push(
          error instanceof Error ? error.message : "TWS contract details unavailable",
        );
      }
    } else if (twsDecision.warning) {
      warnings.push(twsDecision.warning);
    }
  }

  if (!twsDetails?.category && !twsDetails?.industry && svc.ibkr.isConfigured()) {
    const ibkrDecision = ibkrRoutingDecision(svc, "quotes");
    if (ibkrDecision.shouldTry) {
      try {
        ibkrInfo = await svc.ibkr.getContractClassification(sym);
        if (ibkrInfo) {
          source = source === "tws" ? "mixed" : "ibkr";
          recordIbkrSuccess(svc, );
        }
      } catch (error) {
        recordIbkrFailure(svc, error);
        warnings.push(
          error instanceof Error ? error.message : "IBKR contract classification unavailable",
        );
      }
    } else if (ibkrDecision.warning) {
      warnings.push(ibkrDecision.warning);
    }
  }

  const needsFallback =
    !twsDetails?.category &&
    !twsDetails?.industry &&
    !twsDetails?.subcategory &&
    !ibkrInfo?.category &&
    !ibkrInfo?.industry &&
    !ibkrInfo?.subcategory;

  let fmpProfile = null as FmpCompanyProfile | null;
  let fundamentals = null as FundamentalsSnapshot | null;

  if (needsFallback) {
    const fmpResult = await getFmpCompanyProfile(svc, sym);
    fmpProfile = fmpResult.data;
    warnings.push(...(fmpResult.warnings ?? []));
    if (fmpProfile?.sector || fmpProfile?.industry) {
      source = source === "mixed" ? "fmp" : "mixed";
    }

    if (!fmpProfile?.sector && !fmpProfile?.industry) {
      const yahooResult = await getFundamentals(svc, sym);
      fundamentals = yahooResult.data;
      if (fundamentals.sector || fundamentals.industry) {
        source = source === "mixed" ? "yahoo" : "mixed";
      }
    }
  }

  const context = buildMarketContext({
    symbol: sym,
    twsDetails,
    ibkrInfo,
    fmpProfile,
    fundamentals,
    warnings,
  });

  await Promise.resolve(globalDataCache.write(
    "market_context",
    cacheKey,
    context,
    cacheTtlMs("market_context"),
    Date.now(),
  ));

  return recordServiceDelivery(
    createDataResult(context, source, {
      requestedAt,
      warnings: warnings.length > 0 ? warnings : undefined,
    }),
    "market_context",
    { transport: "request" },
  );
}


export async function getSecCompanyFacts(svc: MarketDataServiceHost, symbol: string): Promise<DataResult<SecCompanyFacts | null>> {
  const requestedAt = Date.now();
  if (!svc.sec.isConfigured()) {
    return createDataResult(null, "sec", {
      requestedAt,
      warnings: ["SEC provider unavailable"],
    });
  }
  const sym = symbol.trim().toUpperCase();
  const cacheKey = buildCacheKey(["sec-facts", sym]);
  const cached = await Promise.resolve(globalDataCache.read<SecCompanyFacts | null>("sec", cacheKey));
  if (cached.hit) {
    return createDataResult(cached.value, "sec", { requestedAt, asOf: cached.asOf });
  }
  const data = await svc.sec.getCompanyFacts(sym);
  await Promise.resolve(globalDataCache.write("sec", cacheKey, data, cacheTtlMs("sec"), Date.now()));
  return createDataResult(data, "sec", { requestedAt });
}


export async function getSecFilings(svc: MarketDataServiceHost, symbol: string, limit = 10): Promise<DataResult<SecFiling[]>> {
  const requestedAt = Date.now();
  const sym = symbol.trim().toUpperCase();
  const cacheKey = buildCacheKey(["sec-filings", sym, limit]);
  const cached = await Promise.resolve(globalDataCache.read<SecFiling[]>("sec", cacheKey));
  if (cached.hit && cached.value) {
    return createDataResult(cached.value, "sec", { requestedAt, asOf: cached.asOf });
  }
  const data = await svc.sec.getRecentFilings(sym, limit);
  await Promise.resolve(globalDataCache.write("sec", cacheKey, data, cacheTtlMs("sec"), Date.now()));
  return recordServiceDelivery(
    createDataResult(data, "sec", { requestedAt }),
    "sec_filings_direct",
    { transport: "request" },
  );
}


export async function getMacroSeries(svc: MarketDataServiceHost, 
  seriesId: string,
  limit = 120,
): Promise<DataResult<MacroSeries | null>> {
  const requestedAt = Date.now();
  if (!svc.fred.isConfigured()) {
    return createDataResult(null, "fred", {
      requestedAt,
      warnings: ["FRED_API_KEY is not configured"],
    });
  }
  const cacheKey = buildCacheKey(["macro", seriesId, limit]);
  const cached = await Promise.resolve(globalDataCache.read<MacroSeries | null>("macro", cacheKey));
  if (cached.hit) {
    return createDataResult(cached.value, "fred", { requestedAt, asOf: cached.asOf });
  }
  const data = await svc.fred.getSeries(seriesId, limit);
  await Promise.resolve(globalDataCache.write("macro", cacheKey, data, cacheTtlMs("macro"), Date.now()));
  return recordServiceDelivery(
    createDataResult(data, "fred", { requestedAt }),
    "macro_series",
    { transport: "request" },
  );
}


export async function getMacroReleases(svc: MarketDataServiceHost, limit = 20): Promise<DataResult<EconomicRelease[]>> {
  const requestedAt = Date.now();
  if (!svc.fred.isConfigured()) {
    return createDataResult([], "fred", {
      requestedAt,
      warnings: ["FRED_API_KEY is not configured"],
    });
  }
  const cacheKey = buildCacheKey(["macro-releases", limit]);
  const cached = await Promise.resolve(globalDataCache.read<EconomicRelease[]>("macro", cacheKey));
  if (cached.hit && cached.value) {
    return createDataResult(cached.value, "fred", { requestedAt, asOf: cached.asOf });
  }
  const data = await svc.fred.getReleases(limit);
  await Promise.resolve(globalDataCache.write("macro", cacheKey, data, cacheTtlMs("macro"), Date.now()));
  return createDataResult(data, "fred", { requestedAt });
}


export async function getDerivedMetric(svc: MarketDataServiceHost, 
  symbol: string,
  kind: DerivedMetricKind,
): Promise<DataResult<DerivedMetric | null>> {
  const requestedAt = Date.now();
  const sym = symbol.trim().toUpperCase();

  const upstreamRef = (
    datasetId: string,
    result: DataResult<unknown>,
  ): DerivedUpstreamRef => {
    const evaluation = evaluateDatasetPolicy({
      datasetId: datasetId as "watchlist_quotes",
      receivedAt: result.receivedAt,
      providerAsOf: result.asOf,
      transportStale: result.stale,
      cacheTier: result.cacheTier,
    });
    return {
      datasetId,
      source: result.source,
      receivedAt: result.receivedAt,
      asOf: result.asOf,
      stale: result.stale,
      displayFresh: evaluation.displayFresh,
    };
  };

  if (kind === "rvol") {
    const quoteResult = await getQuotes(svc, [sym]);
    const quote = quoteResult.data[0];
    const fundamentals = await getFundamentals(svc, sym);
    const upstream: DerivedUpstreamRef[] = [
      upstreamRef("watchlist_quotes", quoteResult),
      upstreamRef("fundamentals_display", fundamentals),
    ];
    const avg = fundamentals.data.averageVolume;
    const current = quote?.volume;
    if (avg == null || current == null || avg <= 0) {
      return createDataResult(null, "edge-derived", {
        requestedAt,
        warnings: ["Insufficient volume data for RVOL"],
      });
    }
    const blockedUpstream = upstream.find((row) => row.displayFresh === false);
    const warnings = blockedUpstream
      ? [`Upstream ${blockedUpstream.datasetId} is not display-fresh`]
      : [];
    return createDataResult(
      {
        symbol: sym,
        kind,
        value: current / avg,
        asOf: quoteResult.asOf ?? quoteResult.receivedAt,
        source: "edge-derived",
        upstream,
      },
      "edge-derived",
      { requestedAt, warnings },
    );
  }

  if (kind === "gap_percent") {
    const candlesResult = await getCandles(svc, {
      symbol: sym,
      range: "5d",
      interval: "1d",
    });
    const upstream: DerivedUpstreamRef[] = [upstreamRef("chart_candles", candlesResult)];
    const candles = candlesResult.data.candles;
    if (candles.length < 2) {
      return createDataResult(null, "edge-derived", {
        requestedAt,
        warnings: ["Insufficient candle history for gap percent"],
      });
    }
    const prev = candles[candles.length - 2]!;
    const last = candles[candles.length - 1]!;
    const gap = prev.c !== 0 ? ((last.o - prev.c) / prev.c) * 100 : 0;
    const blockedUpstream = upstream.find((row) => row.displayFresh === false);
    const warnings = blockedUpstream
      ? [`Upstream ${blockedUpstream.datasetId} is not display-fresh`]
      : [];
    return createDataResult(
      {
        symbol: sym,
        kind,
        value: gap,
        asOf: last.t,
        source: "edge-derived",
        upstream,
      },
      "edge-derived",
      { requestedAt, warnings },
    );
  }

  return createDataResult(null, "edge-derived", {
    requestedAt,
    warnings: [`Derived metric '${kind}' is not implemented yet`],
  });
}

