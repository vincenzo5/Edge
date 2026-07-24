import type { FmpScreenerRow } from "../contracts/fmp";
import { createDataResult, type DataResult, type MarketDataPerfPhase } from "../contracts/result";
import type { ScreenQuery } from "../schemas/request";
import { runTechnicalFilter, TECHNICAL_FILTER_CONCURRENCY, TECHNICAL_FILTER_MASSIVE_FALLBACK_CONCURRENCY, TECHNICAL_FILTER_MAX_CANDIDATES, TECHNICAL_FILTER_UNIVERSE_CONCURRENCY } from "@/lib/screener/technicalFilter";
import { minCandlesForTechnicalRule, rangeForTechnicalRule } from "@/lib/screener/technicalMath";
import {
  applyDescriptiveFilters,
  ensureScreenerUniverseWarm,
  fetchUniverseDescriptors,
  readUniverseDailyStore,
} from "../screenerUniverse/universeDailyStore";
import { createScreenerDailyCandleFetcher } from "../screenerUniverse/resolveScreenerDailyCandles";
import { buildCacheKey, cacheTtlMs } from "../cache";
import { globalDataCache } from "../cache/serverCacheBackends";
import { recordServiceDelivery } from "../state/serviceInstrumentation";
import { getCandles } from "./candlesFetch";
import { attachPerfMeta, recentIsoDate, type MarketDataReadOptions } from "./marketDataServiceShared";
import type { MarketDataServiceHost } from "./marketDataServiceHost";

export async function getScreenerResults(
  svc: MarketDataServiceHost,
  query: ScreenQuery,
  options: MarketDataReadOptions = {},
): Promise<DataResult<FmpScreenerRow[]>> {
  const requestedAt = Date.now();
  const totalStart = Date.now();
  const { traceId, perf = null } = options;
  if (!svc.fmp.isConfigured()) {
    return createDataResult([], "fmp", {
      requestedAt,
      warnings: ["FMP_API_KEY is not configured"],
    });
  }
  const cacheKey = buildCacheKey(["screener", JSON.stringify(query)]);
  type ScreenerCachePayload = {
    rows: FmpScreenerRow[];
    indicatorValues?: Record<string, Record<string, number>>;
  };
  const cached = await Promise.resolve(globalDataCache.read<ScreenerCachePayload>("screener", cacheKey));
  if (cached.hit && cached.value) {
    const cachedResult = createDataResult(cached.value.rows, "fmp", {
      requestedAt,
      asOf: cached.asOf,
      indicatorValues: cached.value.indicatorValues,
      traceId,
    });
    perf?.record("screener.total", totalStart, true, "service", {
      rows: cached.value.rows.length,
      hadTechnical: query.technical != null,
      cacheHit: true,
      traceId,
    });
    return attachPerfMeta(
      recordServiceDelivery(
        cachedResult,
        query.technical ? "screener_technical" : "screener_descriptive",
        { transport: "cache", traceId },
      ),
      traceId,
      perf,
    );
  }

  let rows: FmpScreenerRow[];
  let warnings: string[] = [];
  let phases: MarketDataPerfPhase[] | undefined;
  let indicatorValues: Record<string, Record<string, number>> | undefined;
  let skippedSymbols: string[] = [];
  let prefilterMs = 0;
  let prefilterCount = 0;

  if (query.technical && svc.massive.isConfigured()) {
    const warmStart = Date.now();
    const { store, warnings: warmWarnings } = await ensureScreenerUniverseWarm({
      massive: svc.massive,
      perf,
      traceId,
    });
    warnings.push(...warmWarnings);

    const descriptorStart = Date.now();
    const descriptorResult = await fetchUniverseDescriptors(svc.fmp);
    warnings.push(...descriptorResult.warnings);
    prefilterCount = descriptorResult.rows.length;
    prefilterMs = Date.now() - descriptorStart;
    perf?.record("screener.universe.descriptors", descriptorStart, true, "provider", {
      descriptors: descriptorResult.rows.length,
      traceId,
    });

    const filtered = applyDescriptiveFilters(descriptorResult.rows, query);
    prefilterCount = filtered.length;

    const minBars = minCandlesForTechnicalRule(query.technical);
    const range = rangeForTechnicalRule(query.technical) as "3mo" | "1y";
    const candleFetcher = createScreenerDailyCandleFetcher({
      store,
      minBars,
      range,
      massive: svc.massive.isConfigured() ? svc.massive : null,
      recentIsoDate,
      fetchProviderCandles: async (symbol, candleRange) => {
        const candleResult = await getCandles(svc, 
          { symbol, interval: "1d", range: candleRange },
          { traceId },
        );
        return {
          candles: candleResult.data.candles,
          source: candleResult.source,
          cacheTier: candleResult.cacheTier ?? "cold",
        };
      },
    });
    const technical = await runTechnicalFilter(
      filtered,
      query.technical,
      (symbol) => candleFetcher.fetch(symbol),
      {
        perf,
        traceId,
        prefilterCount,
        prefilterMs,
        maxCandidates: Number.POSITIVE_INFINITY,
        concurrency: TECHNICAL_FILTER_UNIVERSE_CONCURRENCY,
        maxResults: query.maxResults,
      },
    );
    if (candleFetcher.warnings.length > 0) {
      warnings.push(...candleFetcher.warnings);
    }
    rows = technical.rows;
    warnings = [...warnings, ...technical.warnings];
    if (!perf) {
      phases = technical.phaseMeta.phases;
    }
    indicatorValues = technical.indicatorValues;
    skippedSymbols = [...skippedSymbols, ...technical.skippedSymbols];
    perf?.record("screener.universe.warm", warmStart, true, "service", {
      path: "full-universe",
      traceId,
    });
  } else {
    const prefilterStart = Date.now();
    // dollarVolume is local-only (price×volume); over-fetch from FMP then trim.
    const fmpQuery =
      query.dollarVolume != null ? { ...query, limit: 1000 } : query;
    const result = await svc.fmp.runStockScreener(fmpQuery);
    perf?.record("screener.prefilter", prefilterStart, true, "provider", {
      candidates: result.rows.length,
      limit: fmpQuery.limit ?? 200,
      traceId,
    });
    rows =
      query.dollarVolume != null
        ? applyDescriptiveFilters(result.rows, {
            dollarVolume: query.dollarVolume,
            limit: query.limit ?? 200,
          })
        : result.rows;
    warnings = [...result.warnings];
    prefilterMs = Date.now() - prefilterStart;
    prefilterCount = rows.length;

    if (query.technical) {
      const range = rangeForTechnicalRule(query.technical) as "3mo" | "1y";
      const minBars = minCandlesForTechnicalRule(query.technical);
      const fallbackStore = await readUniverseDailyStore();
      const fallbackConcurrency = svc.massive.isConfigured()
        ? TECHNICAL_FILTER_MASSIVE_FALLBACK_CONCURRENCY
        : TECHNICAL_FILTER_CONCURRENCY;
      const candleFetcher = createScreenerDailyCandleFetcher({
        store: fallbackStore,
        minBars,
        range,
        massive: svc.massive.isConfigured() ? svc.massive : null,
        recentIsoDate,
        fetchProviderCandles: async (symbol, candleRange) => {
          const candleResult = await getCandles(svc, 
            { symbol, interval: "1d", range: candleRange },
            { traceId },
          );
          return {
            candles: candleResult.data.candles,
            source: candleResult.source,
            cacheTier: candleResult.cacheTier ?? "cold",
          };
        },
      });
      const technical = await runTechnicalFilter(
        rows,
        query.technical,
        (symbol) => candleFetcher.fetch(symbol),
        {
          perf,
          traceId,
          prefilterCount: result.rows.length,
          prefilterMs,
          maxCandidates: TECHNICAL_FILTER_MAX_CANDIDATES,
          concurrency: fallbackConcurrency,
          maxResults: query.maxResults,
        },
      );
      if (candleFetcher.warnings.length > 0) {
        warnings.push(...candleFetcher.warnings);
      }
      rows = technical.rows;
      warnings = [...warnings, ...technical.warnings];
      if (!perf) {
        phases = technical.phaseMeta.phases;
      }
      indicatorValues = technical.indicatorValues;
      skippedSymbols = [...skippedSymbols, ...technical.skippedSymbols];
    } else if (query.dollarVolume != null) {
      const cap = query.maxResults ?? query.limit ?? 200;
      if (rows.length > cap) rows = rows.slice(0, cap);
    }
  }

  await Promise.resolve(globalDataCache.write(
    "screener",
    cacheKey,
    { rows, indicatorValues },
    cacheTtlMs("screener"),
    Date.now(),
  ));
  perf?.record("screener.total", totalStart, true, "service", {
    rows: rows.length,
    hadTechnical: query.technical != null,
    traceId,
  });
  const dataResult = createDataResult(rows, "fmp", {
    requestedAt,
    warnings,
    phases,
    indicatorValues,
    skippedSymbols: skippedSymbols.length > 0 ? skippedSymbols : undefined,
    traceId,
  });
  return attachPerfMeta(
    recordServiceDelivery(
      dataResult,
      query.technical ? "screener_technical" : "screener_descriptive",
      { transport: "request", traceId },
    ),
    traceId,
    perf,
  );
}

