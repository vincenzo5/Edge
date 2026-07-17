import type { Candle, Range, Interval } from './contracts';
import type { ChartType } from '@/lib/chartConfig';
import {
  applyIntervalResample,
  applyVisibleSlice,
  ensureCandlesCover,
  mergeCandlesPrepend,
  resolveFetchInterval,
  toHeikinAshi,
  transformCandlesForChartType,
  EDGE_FETCH_BAR_COUNT,
  HISTORY_FETCH_BAR_COUNT,
  PREFETCH_START_INDEX_THRESHOLD,
  shouldPrefetchEdge,
} from '@edge/chart-core';

export type { Candle, Range, Interval };
export type { EnsureCandlesCoverResult } from '@edge/chart-core';

export {
  toHeikinAshi,
  applyVisibleSlice,
  transformCandlesForChartType,
  mergeCandlesPrepend,
  ensureCandlesCover,
  EDGE_FETCH_BAR_COUNT,
  HISTORY_FETCH_BAR_COUNT,
  PREFETCH_START_INDEX_THRESHOLD,
  shouldPrefetchEdge,
};

// Minimal Yahoo fetch wrapper (matches existing /api/candles contract)
export async function fetchYahooCandles(
  symbol: string,
  range: Range,
  interval: Interval,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const { providerInterval, resampleTo } = resolveFetchInterval(interval);
  const res = await fetch('/api/candles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, range, interval: providerInterval }),
    signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  const { candles: raw } = (await res.json()) as { candles: unknown[] };
  const normalized = validateCandles(raw);
  return applyIntervalResample(normalized, resampleTo);
}

export async function fetchOlderCandles(
  symbol: string,
  interval: Interval,
  beforeTimestampMs: number,
  barCount = EDGE_FETCH_BAR_COUNT,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const { providerInterval, resampleTo } = resolveFetchInterval(interval);
  const fetchBarCount = resampleTo === '2h' ? barCount * 2 : barCount;
  const res = await fetch('/api/candles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol,
      interval: providerInterval,
      before: beforeTimestampMs,
      barCount: fetchBarCount,
    }),
    signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  const { candles: raw } = (await res.json()) as { candles: unknown[] };
  const normalized = validateCandles(raw);
  return applyIntervalResample(normalized, resampleTo);
}

// Simple range filter (future use for edge prefetch)
export function filterByTimeRange(candles: Candle[], startTs: number, endTs: number): Candle[] {
  return candles.filter((c) => c.t >= startTs && c.t <= endTs);
}

// --- Normalization & Validation (canonical short-form Candle from contracts) ---

/** Yahoo / KLineChart use Unix seconds; chart contract uses milliseconds. */
export function toTimestampMs(t: number): number {
  return t > 0 && t < 1e12 ? t * 1000 : t;
}

type RawCandle = {
  timestamp?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  t?: number;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  v?: number;
};

export function normalizeCandle(raw: RawCandle | Record<string, unknown>): Candle {
  const r = raw as Record<string, unknown>;
  const rawT = (r.t as number) ?? (r.timestamp as number) ?? 0;
  return {
    t: toTimestampMs(rawT),
    o: (r.o as number) ?? (r.open as number) ?? 0,
    h: (r.h as number) ?? (r.high as number) ?? 0,
    l: (r.l as number) ?? (r.low as number) ?? 0,
    c: (r.c as number) ?? (r.close as number) ?? 0,
    v: (r.v as number) ?? (r.volume as number),
  };
}

export function isValidCandle(c: unknown): c is Candle {
  if (typeof c !== 'object' || c === null) return false;
  const k = c as Record<string, unknown>;
  return (
    typeof k.t === 'number' &&
    typeof k.o === 'number' &&
    typeof k.h === 'number' &&
    typeof k.l === 'number' &&
    typeof k.c === 'number'
  );
}

export function validateCandles(input: unknown): Candle[] {
  if (!Array.isArray(input)) {
    throw new Error('validateCandles: expected array of candles');
  }
  return input.map((raw, idx) => {
    const norm = normalizeCandle(raw as RawCandle);
    if (!isValidCandle(norm)) {
      throw new Error(
        `validateCandles: invalid candle at index ${idx} (missing/invalid t/o/h/l/c)`,
      );
    }
    return norm;
  });
}
