import { beforeEach, describe, expect, it } from 'vitest';
import { clearHeikinAshiCache, toHeikinAshi } from '@edge/chart-core';
import { clearEphemeralMarketDataCaches } from './clearEphemeralMarketDataCaches';
import {
  CHART_CLIENT_SESSION_STORAGE_PREFIX,
  clearChartClientCacheForTests,
  readChartClientCache,
  writeChartClientCache,
} from '@/lib/chartDataFeed/chartClientCache';

describe('clearEphemeralMarketDataCaches', () => {
  beforeEach(() => {
    clearChartClientCacheForTests();
    clearHeikinAshiCache();
  });

  it('clears chart client cache entries and sessionStorage on logout', () => {
    const key = 'AAPL||1d|1mo|regular';
    writeChartClientCache(key, {
      candles: [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }],
      meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
      hasMore: true,
      asOf: Date.now(),
    });
    expect(readChartClientCache(key)).not.toBeNull();

    clearEphemeralMarketDataCaches();

    expect(readChartClientCache(key)).toBeNull();
    expect(window.sessionStorage.getItem(`${CHART_CLIENT_SESSION_STORAGE_PREFIX}${key}`)).toBeNull();
  });

  it('clears Heikin Ashi transform cache on logout', () => {
    const candles = [{ t: 1, o: 10, h: 12, l: 9, c: 11, v: 100 }];
    const first = toHeikinAshi(candles);
    const secondBefore = toHeikinAshi(candles);
    expect(secondBefore).toBe(first);

    clearEphemeralMarketDataCaches();

    const secondAfter = toHeikinAshi(candles);
    expect(secondAfter).not.toBe(first);
    expect(secondAfter).toEqual(first);
  });
});
