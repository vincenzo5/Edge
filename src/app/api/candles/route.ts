import { NextResponse } from "next/server";
import {
  getChartCandles,
  getChartCandlesBefore,
  type Candle,
  type Interval,
} from "@/lib/yahoo";

export const runtime = "nodejs";

const VALID_RANGES = new Set(["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "ytd", "max"]);
const VALID_INTERVALS = new Set(["1m", "1d", "1wk", "1mo", "1h", "5m", "15m", "30m"]);

type CandlesResponse = { candles: Candle[] } | { error: string };

type CacheEntry = {
  candles: Candle[];
  expiresAt: number;
};

const candleCache = new Map<string, CacheEntry>();

const INTRADAY_INTERVALS = new Set(["1m", "5m", "15m", "30m", "1h"]);

function cacheTtlMs(interval: Interval): number {
  return INTRADAY_INTERVALS.has(interval) ? 30_000 : 60_000;
}

function cloneCandles(candles: Candle[]): Candle[] {
  return candles.map((candle) => ({ ...candle }));
}

function buildCacheKey(args: {
  symbol: string;
  range: string;
  interval: Interval;
  before?: number;
  barCount?: number;
}): string {
  const beforePart = args.before != null ? String(args.before) : "";
  const barCountPart = args.barCount != null ? String(args.barCount) : "";
  return `${args.symbol}|${args.range}|${args.interval}|${beforePart}|${barCountPart}`;
}

function readCache(key: string): Candle[] | null {
  const entry = candleCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    candleCache.delete(key);
    return null;
  }
  return cloneCandles(entry.candles);
}

function writeCache(key: string, candles: Candle[], ttlMs: number): void {
  candleCache.set(key, {
    candles: cloneCandles(candles),
    expiresAt: Date.now() + ttlMs,
  });
}

/** Test-only helper to reset the in-memory response cache. */
export function clearCandleCacheForTests(): void {
  candleCache.clear();
}

export async function POST(request: Request): Promise<Response> {
  let body: {
    symbol?: unknown;
    range?: unknown;
    interval?: unknown;
    before?: unknown;
    barCount?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const symbol = typeof body.symbol === "string" ? body.symbol.trim() : "";
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const interval =
    typeof body.interval === "string" && VALID_INTERVALS.has(body.interval)
      ? (body.interval as Interval)
      : "1d";

  const ttlMs = cacheTtlMs(interval);

  try {
    if (typeof body.before === "number" && Number.isFinite(body.before)) {
      const barCount =
        typeof body.barCount === "number" && body.barCount > 0
          ? Math.min(body.barCount, 500)
          : 200;
      const cacheKey = buildCacheKey({
        symbol,
        range: "",
        interval,
        before: body.before,
        barCount,
      });
      const cached = readCache(cacheKey);
      if (cached) {
        const payload: CandlesResponse = { candles: cached };
        return NextResponse.json(payload);
      }

      const candles = await getChartCandlesBefore(symbol, body.before, interval, barCount);
      writeCache(cacheKey, candles, ttlMs);
      const payload: CandlesResponse = { candles: cloneCandles(candles) };
      return NextResponse.json(payload);
    }

    const range = typeof body.range === "string" && VALID_RANGES.has(body.range) ? body.range : "1y";
    const cacheKey = buildCacheKey({ symbol, range, interval });
    const cached = readCache(cacheKey);
    if (cached) {
      const payload: CandlesResponse = { candles: cached };
      return NextResponse.json(payload);
    }

    const candles = await getChartCandles(symbol, range as never, interval);
    writeCache(cacheKey, candles, ttlMs);
    const payload: CandlesResponse = { candles: cloneCandles(candles) };
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch candles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
