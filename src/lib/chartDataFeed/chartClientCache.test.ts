import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildChartClientCacheKey,
  CHART_CLIENT_CACHE_MAX_AGE_MS,
  CHART_CLIENT_CACHE_MAX_ENTRIES,
  CHART_CLIENT_SESSION_STORAGE_MAX_BARS,
  CHART_CLIENT_SESSION_STORAGE_PREFIX,
  clearChartClientCache,
  clearChartClientCacheForTests,
  freezeCandleSeries,
  patchChartClientCacheHasMore,
  readChartClientCache,
  writeChartClientCache,
  writeMergedChartClientCache,
} from './chartClientCache';
import { RESIDENT_BAR_SOFT_MAX } from '@edge/chart-core';

const sampleEntry = {
  candles: [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }],
  meta: { source: 'yahoo' as const, asOf: 1, stale: false, warnings: [] },
  hasMore: true,
  asOf: 1,
};

describe('chartClientCache', () => {
  beforeEach(() => {
    clearChartClientCacheForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('buildChartClientCacheKey normalizes identical tuples and differs on field change', () => {
    const base = {
      symbol: 'AAPL',
      exchange: 'NASDAQ',
      interval: '1d' as const,
      range: '1y' as const,
      sessionMode: 'regular' as const,
    };
    const same = buildChartClientCacheKey(base);
    expect(buildChartClientCacheKey({ ...base })).toBe(same);
    expect(
      buildChartClientCacheKey({ ...base, sessionMode: 'extended' }),
    ).not.toBe(same);
    expect(buildChartClientCacheKey({ ...base, symbol: 'MSFT' })).not.toBe(same);
  });

  it('evicts oldest entry when exceeding MAX_ENTRIES', () => {
    const now = Date.now();
    for (let i = 0; i < CHART_CLIENT_CACHE_MAX_ENTRIES; i++) {
      writeChartClientCache(`key-${i}`, {
        ...sampleEntry,
        asOf: now + i,
      });
    }
    expect(readChartClientCache('key-0')).not.toBeNull();
    writeChartClientCache('key-new', {
      ...sampleEntry,
      asOf: now + CHART_CLIENT_CACHE_MAX_ENTRIES + 10,
    });
    expect(readChartClientCache('key-0')).toBeNull();
    expect(readChartClientCache('key-new')).not.toBeNull();
  });

  it('returns null after max age expires', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    writeChartClientCache('AAPL||1d|1mo|regular', {
      ...sampleEntry,
      asOf: Date.now(),
    });
    expect(readChartClientCache('AAPL||1d|1mo|regular')).not.toBeNull();
    vi.advanceTimersByTime(CHART_CLIENT_CACHE_MAX_AGE_MS + 1);
    expect(readChartClientCache('AAPL||1d|1mo|regular')).toBeNull();
  });

  it('returns shared immutable candle refs on read', () => {
    writeChartClientCache('key', {
      ...sampleEntry,
      asOf: Date.now(),
    });
    const first = readChartClientCache('key');
    const second = readChartClientCache('key');
    expect(first).not.toBe(second);
    expect(first?.candles).toBe(second?.candles);
    expect(Object.isFrozen(first?.candles)).toBe(true);
    expect(Object.isFrozen(first?.candles[0])).toBe(true);
  });

  it('does not structuredClone candles on memory cache hit', () => {
    const cloneSpy = vi.spyOn(globalThis, 'structuredClone');
    writeChartClientCache('key', {
      ...sampleEntry,
      asOf: Date.now(),
    });
    cloneSpy.mockClear();
    readChartClientCache('key');
    expect(cloneSpy).not.toHaveBeenCalled();
    cloneSpy.mockRestore();
  });

  it('rejects in-place mutation of returned candles', () => {
    writeChartClientCache('key', {
      ...sampleEntry,
      asOf: Date.now(),
    });
    const cached = readChartClientCache('key');
    expect(() => {
      cached!.candles[0] = { t: 9999, o: 9, h: 9, l: 9, c: 9 };
    }).toThrow();
    expect(() => {
      (cached!.candles as Candle[]).push({ t: 2000, o: 2, h: 2, l: 2, c: 2 });
    }).toThrow();
    expect(readChartClientCache('key')?.candles[0]?.t).toBe(1000);
  });

  it('freezeCandleSeries is idempotent', () => {
    const candles = [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }];
    const frozenOnce = freezeCandleSeries(candles);
    const frozenTwice = freezeCandleSeries(frozenOnce);
    expect(frozenOnce).toBe(frozenTwice);
    expect(Object.isFrozen(frozenOnce)).toBe(true);
  });

  it('round-trips through sessionStorage when memory store is empty', () => {
    const key = 'AAPL||1d|1mo|regular';
    const entry = {
      ...sampleEntry,
      asOf: Date.now(),
    };
    writeChartClientCache(key, entry);
    clearChartClientCache();
    window.sessionStorage.setItem(
      `${CHART_CLIENT_SESSION_STORAGE_PREFIX}${key}`,
      JSON.stringify(entry),
    );

    const restored = readChartClientCache(key);
    expect(restored?.candles).toEqual(entry.candles);
    expect(Object.isFrozen(restored?.candles)).toBe(true);
  });

  it('skips sessionStorage when series exceeds max bars', () => {
    const key = 'AAPL||1d|1mo|regular';
    const oversized = Array.from({ length: CHART_CLIENT_SESSION_STORAGE_MAX_BARS + 1 }, (_, i) => ({
      t: i * 1000,
      o: 1,
      h: 2,
      l: 0.5,
      c: 1.5,
    }));
    writeChartClientCache(key, {
      candles: oversized,
      meta: sampleEntry.meta,
      hasMore: true,
      asOf: Date.now(),
    });
    expect(
      window.sessionStorage.getItem(`${CHART_CLIENT_SESSION_STORAGE_PREFIX}${key}`),
    ).toBeNull();
    expect(readChartClientCache(key)?.candles).toHaveLength(
      CHART_CLIENT_SESSION_STORAGE_MAX_BARS + 1,
    );
  });

  it('falls back to memory when sessionStorage write fails', () => {
    const key = 'MSFT||1d|1mo|regular';
    const setItem = vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    writeChartClientCache(key, {
      ...sampleEntry,
      asOf: Date.now(),
    });

    expect(readChartClientCache(key)?.candles).toEqual(sampleEntry.candles);
    setItem.mockRestore();
  });

  it('writeMergedChartClientCache prepends left history and returns stored frozen entry', () => {
    const key = 'AAPL||1d|1mo|regular';
    const rightEdge = [{ t: 2000, o: 2, h: 2, l: 2, c: 2 }];
    const leftHistory = [{ t: 1000, o: 1, h: 1, l: 1, c: 1 }];
    const returned = writeMergedChartClientCache(key, {
      rightEdgeCandles: rightEdge,
      leftHistoryCandles: leftHistory,
      meta: sampleEntry.meta,
      hasMore: true,
      asOf: Date.now(),
    });
    const cached = readChartClientCache(key);
    expect(cached?.candles.map((c) => c.t)).toEqual([1000, 2000]);
    expect(cached?.hasMore).toBe(true);
    expect(returned.candles).toBe(cached?.candles);
    expect(Object.isFrozen(returned.candles)).toBe(true);
  });

  it('patchChartClientCacheHasMore updates hasMore without dropping candles', () => {
    const key = 'AAPL||1d|1mo|regular';
    writeChartClientCache(key, {
      ...sampleEntry,
      hasMore: true,
      asOf: Date.now(),
    });
    const before = readChartClientCache(key);
    patchChartClientCacheHasMore(key, false);
    const cached = readChartClientCache(key);
    expect(cached?.hasMore).toBe(false);
    expect(cached?.candles).toBe(before?.candles);
    expect(cached?.candles).toEqual(sampleEntry.candles);
  });

  it('writeChartClientCache trims series to RESIDENT_BAR_SOFT_MAX', () => {
    const key = 'AAPL||1d|1mo|regular';
    const oversized = Array.from({ length: RESIDENT_BAR_SOFT_MAX + 250 }, (_, i) => ({
      t: i * 1000,
      o: 1,
      h: 2,
      l: 0.5,
      c: 1.5,
    }));
    writeChartClientCache(key, {
      candles: oversized,
      meta: sampleEntry.meta,
      hasMore: true,
      asOf: Date.now(),
    });
    const cached = readChartClientCache(key);
    expect(cached?.candles).toHaveLength(RESIDENT_BAR_SOFT_MAX);
    expect(cached?.candles[0]?.t).toBe(250_000);
    expect(cached?.candles.at(-1)?.t).toBe(oversized.at(-1)?.t);
    expect(
      window.sessionStorage.getItem(`${CHART_CLIENT_SESSION_STORAGE_PREFIX}${key}`),
    ).toBeNull();
  });
});

type Candle = { t: number; o: number; h: number; l: number; c: number };
