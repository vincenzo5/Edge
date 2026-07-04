import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildChartClientCacheKey,
  CHART_CLIENT_CACHE_MAX_AGE_MS,
  CHART_CLIENT_CACHE_MAX_ENTRIES,
  CHART_CLIENT_SESSION_STORAGE_PREFIX,
  clearChartClientCache,
  clearChartClientCacheForTests,
  readChartClientCache,
  writeChartClientCache,
} from './chartClientCache';

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

  it('returns cloned data on read', () => {
    writeChartClientCache('key', {
      ...sampleEntry,
      asOf: Date.now(),
    });
    const first = readChartClientCache('key');
    const second = readChartClientCache('key');
    expect(first).not.toBe(second);
    expect(first?.candles).not.toBe(second?.candles);
    expect(first?.candles).toEqual(second?.candles);
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
});
