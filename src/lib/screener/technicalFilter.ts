import type { FmpScreenerRow } from "@/lib/marketData/contracts/fmp";
import type { EquityCandle } from "@/lib/marketData/contracts/equities";
import type { DataCacheTier } from "@/lib/marketData/contracts/result";
import type { MarketDataPerfPhase } from "@/lib/marketData/contracts/result";
import { buildCacheKey, globalDataCache } from "@/lib/marketData/cache/dataCache";
import { cacheTtlMs } from "@/lib/marketData/cache/ttlPolicy";
import type { TechnicalRule } from "@/lib/marketData/schemas/request";
import type { PerfPhaseCollector } from "@/lib/marketData/telemetry/perfPhases";
import {
  evaluateTechnicalRule,
  minCandlesForTechnicalRule,
  technicalCacheFingerprint,
} from "./technicalMath";

export const TECHNICAL_FILTER_MAX_CANDIDATES = 200;
export const TECHNICAL_FILTER_CONCURRENCY = 6;
export const TECHNICAL_FILTER_UNIVERSE_CONCURRENCY = 16;
export const TECHNICAL_FILTER_MASSIVE_FALLBACK_CONCURRENCY = 20;

export type TechnicalFilterPhaseMeta = {
  phases: MarketDataPerfPhase[];
};

export type TechnicalCacheEntry = {
  passes: boolean;
  value: number | null;
  seriesKey?: string;
};

export type IndicatorValuesSidecar = Record<string, Record<string, number>>;

export type ScreenerCandleFetchResult = {
  candles: EquityCandle[];
  source?: string;
  cacheTier?: DataCacheTier;
};

export type GetCandlesForSymbol = (
  symbol: string,
) => Promise<ScreenerCandleFetchResult | EquityCandle[]>;

export type RunTechnicalFilterOptions = {
  perf?: PerfPhaseCollector | null;
  traceId?: string;
  prefilterCount?: number;
  prefilterMs?: number;
  maxCandidates?: number;
  concurrency?: number;
  maxResults?: number;
};

function normalizeCandleFetch(
  result: ScreenerCandleFetchResult | EquityCandle[],
): ScreenerCandleFetchResult {
  if (Array.isArray(result)) {
    return { candles: result };
  }
  return result;
}

function isCandleCacheHit(cacheTier: DataCacheTier | undefined): boolean {
  return (
    cacheTier === "hot-fresh" ||
    cacheTier === "hot-stale" ||
    cacheTier === "universe"
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
  shouldStop?: () => boolean,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let stopped = false;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      if (shouldStop?.()) {
        stopped = true;
        return;
      }
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
      if (shouldStop?.()) {
        stopped = true;
        return;
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  if (stopped) {
    return results.filter((entry) => entry !== undefined);
  }
  return results;
}

function readTechnicalCache(
  symbol: string,
  rule: TechnicalRule,
  candles: EquityCandle[],
): TechnicalCacheEntry | null {
  const cacheKey = buildCacheKey([
    symbol,
    "1d",
    technicalCacheFingerprint(rule, candles),
  ]);
  const cached = globalDataCache.read<TechnicalCacheEntry>("screener_technical", cacheKey);
  return cached.hit && cached.value != null ? cached.value : null;
}

function writeTechnicalCache(
  symbol: string,
  rule: TechnicalRule,
  candles: EquityCandle[],
  entry: TechnicalCacheEntry,
): void {
  const cacheKey = buildCacheKey([
    symbol,
    "1d",
    technicalCacheFingerprint(rule, candles),
  ]);
  globalDataCache.write(
    "screener_technical",
    cacheKey,
    entry,
    cacheTtlMs("screener_technical"),
    Date.now(),
  );
}

function recordIndicatorValue(
  sidecar: IndicatorValuesSidecar,
  symbol: string,
  seriesKey: string | undefined,
  value: number | null,
): void {
  if (seriesKey == null || value == null || !Number.isFinite(value)) return;
  const key = symbol.trim().toUpperCase();
  if (!sidecar[key]) sidecar[key] = {};
  sidecar[key][seriesKey] = value;
}

export async function runTechnicalFilter(
  candidates: FmpScreenerRow[],
  rule: TechnicalRule,
  getCandles: GetCandlesForSymbol,
  options: RunTechnicalFilterOptions = {},
): Promise<{
  rows: FmpScreenerRow[];
  warnings: string[];
  skippedSymbols: string[];
  phaseMeta: TechnicalFilterPhaseMeta;
  indicatorValues: IndicatorValuesSidecar;
}> {
  const {
    perf = null,
    traceId,
    prefilterCount,
    prefilterMs,
    maxCandidates = TECHNICAL_FILTER_MAX_CANDIDATES,
    concurrency = TECHNICAL_FILTER_CONCURRENCY,
    maxResults,
  } = options;
  const warnings: string[] = [];
  const skippedSymbols: string[] = [];
  const indicatorValues: IndicatorValuesSidecar = {};
  const step1Count = prefilterCount ?? candidates.length;
  let pool = candidates;

  if (Number.isFinite(maxCandidates) && pool.length > maxCandidates) {
    pool = pool.slice(0, maxCandidates);
    warnings.push(
      `Truncated technical pass to ${maxCandidates} candidates; raise prefilter specificity.`,
    );
  }

  const technicalStart = Date.now();
  const minBars = minCandlesForTechnicalRule(rule);
  let candleCacheHits = 0;
  let indicatorCacheHits = 0;
  let matchedCount = 0;
  let scannedCount = 0;
  let earlyExit = false;

  const evaluations = await mapWithConcurrency(
    pool,
    concurrency,
    async (row) => {
      if (earlyExit) {
        return {
          row,
          passes: false,
          warning: null,
          value: null,
          seriesKey: undefined,
        };
      }

      const candleStart = Date.now();
      let candleFetch: ScreenerCandleFetchResult;
      try {
        candleFetch = normalizeCandleFetch(await getCandles(row.symbol));
      } catch {
        perf?.record("screener.technical.candle", candleStart, false, "provider", {
          symbol: row.symbol,
          traceId,
        });
        scannedCount += 1;
        return {
          row,
          passes: false,
          warning: null,
          skippedSymbol: row.symbol.trim().toUpperCase(),
          value: null,
          seriesKey: undefined,
        };
      }

      const { candles, source, cacheTier } = candleFetch;
      scannedCount += 1;
      if (isCandleCacheHit(cacheTier)) {
        candleCacheHits += 1;
      }

      perf?.record("screener.technical.candle", candleStart, true, "provider", {
        symbol: row.symbol,
        source,
        cacheTier,
        barCount: candles.length,
        traceId,
      });

      if (candles.length < minBars) {
        return { row, passes: false, warning: null, value: null, seriesKey: undefined };
      }

      const computeStart = Date.now();
      const cached = readTechnicalCache(row.symbol, rule, candles);
      if (cached != null) {
        indicatorCacheHits += 1;
        perf?.record("screener.technical.compute", computeStart, true, "service", {
          symbol: row.symbol,
          rule: rule.kind,
          cacheHit: true,
          traceId,
        });
        recordIndicatorValue(indicatorValues, row.symbol, cached.seriesKey, cached.value);
        if (cached.passes) {
          matchedCount += 1;
          if (maxResults != null && matchedCount >= maxResults) {
            earlyExit = true;
          }
        }
        return {
          row,
          passes: cached.passes,
          warning: null,
          value: cached.value,
          seriesKey: cached.seriesKey,
        };
      }

      const evaluation = evaluateTechnicalRule(rule, candles);
      perf?.record("screener.technical.compute", computeStart, true, "service", {
        symbol: row.symbol,
        rule: rule.kind,
        cacheHit: false,
        traceId,
      });
      writeTechnicalCache(row.symbol, rule, candles, {
        passes: evaluation.passes,
        value: evaluation.value,
        seriesKey: evaluation.seriesKey,
      });
      recordIndicatorValue(
        indicatorValues,
        row.symbol,
        evaluation.seriesKey,
        evaluation.value,
      );
      if (evaluation.passes) {
        matchedCount += 1;
        if (maxResults != null && matchedCount >= maxResults) {
          earlyExit = true;
        }
      }
      return {
        row,
        passes: evaluation.passes,
        warning: null,
        value: evaluation.value,
        seriesKey: evaluation.seriesKey,
      };
    },
    () => earlyExit,
  );

  for (const evaluation of evaluations) {
    if (evaluation.warning) warnings.push(evaluation.warning);
    if (evaluation.skippedSymbol) skippedSymbols.push(evaluation.skippedSymbol);
  }

  const rows = evaluations
    .filter((entry) => entry.passes)
    .map((entry) => entry.row)
    .slice(0, maxResults ?? undefined);
  const technicalMs = Date.now() - technicalStart;

  perf?.record("screener.technical.aggregate", technicalStart, true, "service", {
    candidates: pool.length,
    scanned: scannedCount,
    matched: rows.length,
    candleCacheHits,
    indicatorCacheHits,
    concurrency,
    earlyExit: maxResults != null ? earlyExit : undefined,
    traceId,
  });

  return {
    rows,
    warnings,
    skippedSymbols,
    indicatorValues,
    phaseMeta: {
      phases: [
        {
          name: "screener.prefilter",
          ms: prefilterMs ?? 0,
          ok: true,
          layer: "service",
          detail: { count: step1Count, candidates: step1Count },
        },
        {
          name: "screener.technical.aggregate",
          ms: technicalMs,
          ok: true,
          layer: "service",
          detail: {
            candidates: pool.length,
            scanned: scannedCount,
            matched: rows.length,
            candleCacheHits,
            indicatorCacheHits,
            concurrency,
            ...(maxResults != null ? { earlyExit } : {}),
          },
        },
      ],
    },
  };
}
