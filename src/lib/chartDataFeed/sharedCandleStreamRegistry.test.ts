import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ChartCandleStreamEvent, ChartDataFeed } from '@edge/chart-core';
import {
  getSharedCandleStreamCountForTests,
  resetSharedCandleStreamRegistryForTests,
  subscribeSharedCandles,
} from './sharedCandleStreamRegistry';

function createFeed(subscribeImpl?: ChartDataFeed['subscribeCandles']): ChartDataFeed {
  return {
    async loadCandles() {
      return {
        symbol: 'SPY',
        interval: '5m',
        candles: [],
        hasMore: false,
        meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
      };
    },
    subscribeCandles: subscribeImpl,
  };
}

describe('sharedCandleStreamRegistry', () => {
  beforeEach(() => {
    resetSharedCandleStreamRegistryForTests();
  });

  it('shares one transport for identical tuples and fans out events', () => {
    let transportSink: ChartCandleStreamSink | null = null;
    const transportSubscribe = vi.fn((_request, sink) => {
      transportSink = sink;
      return vi.fn();
    });
    const feed = createFeed(transportSubscribe);
    const sinkA = vi.fn();
    const sinkB = vi.fn();
    const request = { symbol: 'SPY', interval: '5m' as const, range: '1d' as const, sessionMode: 'regular' as const };

    subscribeSharedCandles(feed, request, sinkA);
    subscribeSharedCandles(feed, request, sinkB);

    expect(transportSubscribe).toHaveBeenCalledTimes(1);
    expect(getSharedCandleStreamCountForTests()).toBe(1);

    transportSink!({
      type: 'append',
      candle: { t: 1000, o: 1, h: 1, l: 1, c: 1 },
      meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
    });

    expect(sinkA).toHaveBeenCalled();
    expect(sinkB).toHaveBeenCalled();
  });

  it('closes transport when final consumer unsubscribes', () => {
    const unsubscribeTransport = vi.fn();
    const transportSubscribe = vi.fn(() => unsubscribeTransport);
    const feed = createFeed(transportSubscribe);
    const request = { symbol: 'SPY', interval: '5m', range: '1d', sessionMode: 'regular' as const };

    const unsubA = subscribeSharedCandles(feed, request, vi.fn());
    const unsubB = subscribeSharedCandles(feed, request, vi.fn());

    unsubA();
    expect(unsubscribeTransport).not.toHaveBeenCalled();
    expect(getSharedCandleStreamCountForTests()).toBe(1);

    unsubB();
    expect(unsubscribeTransport).toHaveBeenCalledTimes(1);
    expect(getSharedCandleStreamCountForTests()).toBe(0);
  });

  it('isolates sink failures', () => {
    let transportSink: ChartCandleStreamSink | null = null;
    const transportSubscribe = vi.fn((_request, sink) => {
      transportSink = sink;
      return vi.fn();
    });
    const feed = createFeed(transportSubscribe);
    const goodSink = vi.fn();
    const badSink = vi.fn(() => {
      throw new Error('sink failure');
    });
    const request = { symbol: 'SPY', interval: '5m' as const, range: '1d' as const, sessionMode: 'regular' as const };

    subscribeSharedCandles(feed, request, badSink);
    subscribeSharedCandles(feed, request, goodSink);

    transportSink!({
      type: 'refresh',
      meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
    });

    expect(goodSink).toHaveBeenCalled();
  });
});
