import type { EquityCandle } from "../contracts/equities";
import type { FmpScreenerRow } from "../contracts/fmp";
import type { ScreenQuery } from "../schemas/request";
import { buildCacheKey, globalDataCache } from "../cache/dataCache";
import { cacheTtlMs } from "../cache/ttlPolicy";
import type { PerfPhaseCollector } from "../telemetry/perfPhases";
import type { MassiveProvider } from "../providers/massive/adapter";
import type { createFmpProvider } from "../providers/fmp/adapter";
import { formatUtcDate, recentTradingDays } from "../marketCalendar";

export type UniverseDailyStorePayload = {
  /** date YYYY-MM-DD → symbol → candle */
  byDate: Record<string, Record<string, EquityCandle>>;
  tradingDates: string[];
  asOf: number;
};

const UNIVERSE_STORE_CACHE_KEY = "rolling-1d-us";

export function massiveUniverseLookbackDays(): number {
  const raw = process.env.MASSIVE_UNIVERSE_LOOKBACK_DAYS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 252;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 252;
}

export function massiveUniverseMaxWarmCalls(): number {
  const raw = process.env.MASSIVE_UNIVERSE_MAX_WARM_CALLS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 252;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 252;
}

export { formatUtcDate } from "../marketCalendar";

/** Walk backward to collect completed US trading dates (delegates to marketCalendar). */
export function recentTradingDateCandidates(count: number, fromDate = new Date()): string[] {
  return recentTradingDays(count, fromDate);
}

export function readUniverseDailyStore(): UniverseDailyStorePayload | null {
  const cached = globalDataCache.read<UniverseDailyStorePayload>(
    "universe_daily",
    UNIVERSE_STORE_CACHE_KEY,
  );
  return cached.hit && cached.value ? cached.value : null;
}

export function writeUniverseDailyStore(payload: UniverseDailyStorePayload): void {
  globalDataCache.write(
    "universe_daily",
    UNIVERSE_STORE_CACHE_KEY,
    payload,
    cacheTtlMs("universe_daily"),
    Date.now(),
  );
}

export function mergeDailyBarsIntoStore(
  store: UniverseDailyStorePayload,
  dateStr: string,
  bySymbol: Map<string, EquityCandle>,
): UniverseDailyStorePayload {
  if (bySymbol.size === 0) return store;
  const dateMap: Record<string, EquityCandle> = store.byDate[dateStr] ?? {};
  for (const [symbol, candle] of bySymbol) {
    dateMap[symbol] = candle;
  }
  const tradingDates = store.tradingDates.includes(dateStr)
    ? store.tradingDates
    : [...store.tradingDates, dateStr].sort();
  return {
    byDate: { ...store.byDate, [dateStr]: dateMap },
    tradingDates,
    asOf: Date.now(),
  };
}

export function getCandlesFromUniverseStore(
  symbol: string,
  minBars: number,
  store: UniverseDailyStorePayload | null,
): { candles: EquityCandle[]; found: boolean } {
  if (!store) return { candles: [], found: false };
  const sym = symbol.trim().toUpperCase();
  const lookback = massiveUniverseLookbackDays();
  const dates = store.tradingDates.slice(-lookback);
  const candles: EquityCandle[] = [];
  for (const dateStr of dates) {
    const dayMap = store.byDate[dateStr];
    const candle = dayMap?.[sym];
    if (candle) candles.push(candle);
  }
  candles.sort((a, b) => a.t - b.t);
  if (candles.length === 0) return { candles: [], found: false };
  if (candles.length < minBars) return { candles, found: true };
  return { candles: candles.slice(-lookback), found: true };
}

type FmpProvider = ReturnType<typeof createFmpProvider>;

const FMP_UNIVERSE_PAGE_SIZE = 1000;

export async function fetchUniverseDescriptors(
  fmp: FmpProvider,
): Promise<{ rows: FmpScreenerRow[]; warnings: string[] }> {
  const cacheKey = buildCacheKey(["descriptors", "us-all"]);
  const cached = globalDataCache.read<FmpScreenerRow[]>("screener_universe", cacheKey);
  if (cached.hit && cached.value) {
    return { rows: cached.value, warnings: [] };
  }

  if (!fmp.isConfigured()) {
    return { rows: [], warnings: ["FMP_API_KEY is not configured"] };
  }

  const warnings: string[] = [];
  const bySymbol = new Map<string, FmpScreenerRow>();
  let offset = 0;
  const maxPages = 10;

  for (let page = 0; page < maxPages; page += 1) {
    const result = await fmp.runStockScreener({
      limit: FMP_UNIVERSE_PAGE_SIZE,
      ...(offset > 0 ? { offset } : {}),
    } as ScreenQuery);
    warnings.push(...result.warnings);
    for (const row of result.rows) {
      bySymbol.set(row.symbol.toUpperCase(), row);
    }
    if (result.rows.length < FMP_UNIVERSE_PAGE_SIZE) break;
    offset += FMP_UNIVERSE_PAGE_SIZE;
  }

  const rows = [...bySymbol.values()];
  globalDataCache.write(
    "screener_universe",
    cacheKey,
    rows,
    cacheTtlMs("screener_universe"),
    Date.now(),
  );
  return { rows, warnings };
}

function matchesTextFilter(
  value: string | null | undefined,
  filter: string | string[] | undefined,
): boolean {
  if (!filter) return true;
  const hay = (value ?? "").trim().toLowerCase();
  if (Array.isArray(filter)) {
    return filter.some((entry) => hay.includes(entry.trim().toLowerCase()));
  }
  return hay.includes(filter.trim().toLowerCase());
}

function matchesRange(
  value: number | null | undefined,
  range?: { min?: number; max?: number },
): boolean {
  if (!range) return true;
  if (value == null || !Number.isFinite(value)) return false;
  if (range.min != null && value < range.min) return false;
  if (range.max != null && value > range.max) return false;
  return true;
}

/** Dollar volume = last price × share volume (null if either leg is missing). */
export function rowDollarVolume(row: {
  price: number | null | undefined;
  volume: number | null | undefined;
}): number | null {
  const price = row.price;
  const volume = row.volume;
  if (price == null || volume == null) return null;
  if (!Number.isFinite(price) || !Number.isFinite(volume)) return null;
  return price * volume;
}

/** Apply descriptive ScreenQuery filters locally on descriptor rows. */
export function applyDescriptiveFilters(
  rows: FmpScreenerRow[],
  query: ScreenQuery,
): FmpScreenerRow[] {
  return rows.filter((row) => {
    if (!matchesTextFilter(row.sector, query.sector)) return false;
    if (!matchesTextFilter(row.industry, query.industry)) return false;
    if (!matchesTextFilter(row.country, query.country)) return false;
    if (!matchesTextFilter(row.exchange, query.exchange)) return false;
    if (!matchesRange(row.marketCap, query.marketCap)) return false;
    if (!matchesRange(row.price, query.price)) return false;
    if (!matchesRange(row.beta, query.beta)) return false;
    if (!matchesRange(row.volume, query.volume)) return false;
    if (!matchesRange(rowDollarVolume(row), query.dollarVolume)) return false;
    if (!matchesRange(row.dividendYield, query.dividend)) return false;
    return true;
  });
}

let backgroundWarmInFlight = false;

export async function ensureScreenerUniverseWarm(args: {
  massive: MassiveProvider;
  perf?: PerfPhaseCollector | null;
  traceId?: string;
}): Promise<{ store: UniverseDailyStorePayload; warnings: string[] }> {
  const { massive, perf, traceId } = args;
  const warmStart = Date.now();
  const warnings: string[] = [];

  if (!massive.isConfigured()) {
    return {
      store: readUniverseDailyStore() ?? { byDate: {}, tradingDates: [], asOf: Date.now() },
      warnings: ["MASSIVE_API_KEY is not configured"],
    };
  }

  let store = readUniverseDailyStore() ?? {
    byDate: {},
    tradingDates: [],
    asOf: Date.now(),
  };

  const lookback = massiveUniverseLookbackDays();
  const candidates = recentTradingDateCandidates(1);
  const latestDate = candidates[0]!;

  if (!store.tradingDates.includes(latestDate)) {
    const fetchStart = Date.now();
    const daily = await massive.getDailyMarketSummary(latestDate);
    warnings.push(...daily.warnings);
    store = mergeDailyBarsIntoStore(store, latestDate, daily.bySymbol);
    writeUniverseDailyStore(store);
    perf?.record("screener.universe.warm", fetchStart, true, "provider", {
      date: latestDate,
      symbols: daily.bySymbol.size,
      incremental: true,
      traceId,
    });
  }

  perf?.record("screener.universe.warm", warmStart, true, "service", {
    tradingDates: store.tradingDates.length,
    lookback,
    traceId,
  });

  if (store.tradingDates.length < lookback && !backgroundWarmInFlight) {
    backgroundWarmInFlight = true;
    void backfillUniverseDailyStore(massive, store, lookback).finally(() => {
      backgroundWarmInFlight = false;
    });
  }

  return { store, warnings };
}

async function backfillUniverseDailyStore(
  massive: MassiveProvider,
  initialStore: UniverseDailyStorePayload,
  lookback: number,
): Promise<void> {
  let store = initialStore;
  const maxCalls = massiveUniverseMaxWarmCalls();
  const candidates = recentTradingDateCandidates(lookback + 5);
  let calls = 0;

  for (const dateStr of candidates) {
    if (store.tradingDates.length >= lookback) break;
    if (calls >= maxCalls) break;
    if (store.tradingDates.includes(dateStr)) continue;

    const daily = await massive.getDailyMarketSummary(dateStr);
    if (daily.bySymbol.size === 0) continue;
    store = mergeDailyBarsIntoStore(store, dateStr, daily.bySymbol);
    writeUniverseDailyStore(store);
    calls += 1;
  }
}

export function resetUniverseStoreForTests(): void {
  globalDataCache.delete("universe_daily", UNIVERSE_STORE_CACHE_KEY);
  globalDataCache.clear("screener_universe");
  backgroundWarmInFlight = false;
}
