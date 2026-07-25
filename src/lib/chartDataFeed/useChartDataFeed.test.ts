import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChartDataFeed } from './useChartDataFeed';
import { clearChartClientCacheForTests, readChartClientCache } from './chartClientCache';
import {
  buildChartClientCacheKey,
  CHART_CLIENT_SESSION_STORAGE_PREFIX,
} from './chartClientCache';
import type { Candle, ChartDataFeed, ChartCandleStreamSink, ChartDataMeta } from '@edge/chart-core';
import { RESIDENT_BAR_SOFT_MAX } from '@edge/chart-core';
import {
  getSharedCandleStreamCountForTests,
  resetSharedCandleStreamRegistryForTests,
} from './sharedCandleStreamRegistry';
import { resetCoalesceInFlightForTests } from './coalesceInFlight';

const baseCandles: Candle[] = [
  { t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 },
  { t: 2000, o: 1.5, h: 2.5, l: 1, c: 2 },
];

type StreamingTestFeed = ChartDataFeed & {
  emitAppend: (candle: Candle) => void;
  emitReplaceLatest: (candle: Candle) => void;
};

function createStreamingFeed(overrides?: Partial<ChartDataFeed>): StreamingTestFeed {
  let sinkRef: ChartCandleStreamSink | null = null;
  const feed = {
    async loadCandles(request) {
      return {
        symbol: request.symbol,
        interval: request.interval,
        candles: baseCandles,
        hasMore: true,
        meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
      };
    },
    async loadMoreCandles(request) {
      return {
        symbol: request.symbol,
        interval: request.interval,
        candles: [{ t: 500, o: 0.5, h: 0.5, l: 0.5, c: 0.5 }],
        hasMore: true,
        meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
      };
    },
    subscribeCandles(_request, sink) {
      sinkRef = sink;
      return () => {
        sinkRef = null;
      };
    },
    emitAppend(candle: Candle) {
      sinkRef?.({
        type: 'append',
        candle,
        meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
      });
    },
    emitReplaceLatest(candle: Candle) {
      sinkRef?.({
        type: 'replace-latest',
        candle,
        meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
      });
    },
    emitRefresh(meta: Partial<ChartDataMeta>) {
      sinkRef?.({
        type: 'refresh',
        meta: {
          source: 'yahoo',
          asOf: Date.now(),
          stale: false,
          warnings: [],
          ...meta,
        },
      });
    },
    ...overrides,
  } satisfies StreamingTestFeed;
  return feed;
}

describe('useChartDataFeed', () => {
  beforeEach(() => {
    clearChartClientCacheForTests();
    resetSharedCandleStreamRegistryForTests();
    resetCoalesceInFlightForTests();
  });

  it('loads candles and starts streaming when supported', async () => {
    const feed = createStreamingFeed();
    const { result, unmount } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
      }),
    );

    await waitFor(() => {
      expect(result.current.candles).toHaveLength(2);
      expect(result.current.streaming).toBe(true);
      expect(result.current.meta?.streaming).toBe(true);
    });

    unmount();
  });

  it('shares one candle stream transport for identical live tuples', async () => {
    const subscribe = vi.fn((_request, _sink) => () => {});
    const feed = createStreamingFeed({ subscribeCandles: subscribe });
    const options = {
      feed,
      symbol: 'SPY',
      interval: '5m' as const,
      range: '1d' as const,
      live: true,
    };

    const first = renderHook(() => useChartDataFeed(options));
    const second = renderHook(() => useChartDataFeed(options));

    await waitFor(() => expect(subscribe).toHaveBeenCalledTimes(1));
    expect(getSharedCandleStreamCountForTests()).toBe(1);

    first.unmount();
    expect(getSharedCandleStreamCountForTests()).toBe(1);

    second.unmount();
    await waitFor(() => expect(getSharedCandleStreamCountForTests()).toBe(0));
  });

  it('clears stale state on metadata-only refresh events', async () => {
    const feed = createStreamingFeed();
    const { result } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
      }),
    );

    await waitFor(() => expect(result.current.candles).toHaveLength(2));

    act(() => {
      feed.emitRefresh({
        source: 'yahoo',
        asOf: Date.now(),
        stale: true,
        warnings: [],
      });
    });

    await waitFor(() => {
      expect(result.current.stale).toBe(false);
      expect(result.current.meta?.lastUpdateAt).toBeTruthy();
    });
  });

  it('applies append stream events without dropping prepended history', async () => {
    const feed = createStreamingFeed();
    const { result } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
      }),
    );

    await waitFor(() => expect(result.current.candles).toHaveLength(2));

    await act(async () => {
      await result.current.loadMore(1000);
    });
    expect(result.current.candles[0]?.t).toBe(500);

    act(() => {
      feed.emitAppend({ t: 3000, o: 3, h: 3, l: 3, c: 3 });
    });

    await waitFor(() => {
      expect(result.current.candles.map((candle) => candle.t)).toEqual([500, 1000, 2000, 3000]);
    });
  });

  it('replaces tip when replace-latest remaps the forming bar timestamp', async () => {
    const feed = createStreamingFeed();
    const { result } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
      }),
    );

    await waitFor(() => expect(result.current.candles).toHaveLength(2));

    act(() => {
      feed.emitReplaceLatest({ t: 2500, o: 9, h: 9, l: 9, c: 9 });
    });

    await waitFor(() => {
      expect(result.current.candles).toHaveLength(2);
      expect(result.current.candles.map((candle) => candle.t)).toEqual([1000, 2500]);
      expect(result.current.candles.at(-1)?.c).toBe(9);
    });
  });

  it('appends when replace-latest is a full interval ahead of the chart tip', async () => {
    const day = 86_400_000;
    const feed = createStreamingFeed();
    const { result } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
      }),
    );

    await waitFor(() => expect(result.current.candles).toHaveLength(2));

    act(() => {
      feed.emitReplaceLatest({ t: 2000 + day, o: 3, h: 3, l: 3, c: 3 });
    });

    await waitFor(() => {
      expect(result.current.candles.map((candle) => candle.t)).toEqual([1000, 2000, 2000 + day]);
    });
  });

  it('resubscribes when symbol changes', async () => {
    const subscribe = vi.fn((_request, _sink) => () => {});
    const feed = createStreamingFeed({ subscribeCandles: subscribe });
    const { rerender } = renderHook(
      (props: { symbol: string }) =>
        useChartDataFeed({
          feed,
          symbol: props.symbol,
          interval: '1d',
          range: '1mo',
        }),
      { initialProps: { symbol: 'AAPL' } },
    );

    await waitFor(() => expect(subscribe).toHaveBeenCalledTimes(1));
    rerender({ symbol: 'MSFT' });
    await waitFor(() => expect(subscribe).toHaveBeenCalledTimes(2));
  });

  it('does not subscribe when live is false', async () => {
    const subscribe = vi.fn((_request, _sink) => () => {});
    const feed = createStreamingFeed({ subscribeCandles: subscribe });
    renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
        live: false,
      }),
    );

    await waitFor(() => expect(subscribe).not.toHaveBeenCalled());
  });

  it('unsubscribes when live flips from true to false and keeps candle snapshot', async () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);
    const feed = createStreamingFeed({ subscribeCandles: subscribe });
    const { result, rerender } = renderHook(
      (props: { live: boolean }) =>
        useChartDataFeed({
          feed,
          symbol: 'AAPL',
          interval: '1d',
          range: '1mo',
          live: props.live,
        }),
      { initialProps: { live: true } },
    );

    await waitFor(() => expect(subscribe).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.streaming).toBe(true));

    rerender({ live: false });

    await waitFor(() => expect(unsubscribe).toHaveBeenCalled());
    await waitFor(() => expect(result.current.streaming).toBe(false));
    expect(result.current.candles).toHaveLength(2);
  });

  it('resubscribes when live flips from false to true without clearing candles', async () => {
    const subscribe = vi.fn((_request, _sink) => () => {});
    const feed = createStreamingFeed({ subscribeCandles: subscribe });
    const { result, rerender } = renderHook(
      (props: { live: boolean }) =>
        useChartDataFeed({
          feed,
          symbol: 'AAPL',
          interval: '1d',
          range: '1mo',
          live: props.live,
        }),
      { initialProps: { live: false } },
    );

    await waitFor(() => expect(result.current.candles).toHaveLength(2));
    expect(subscribe).not.toHaveBeenCalled();

    rerender({ live: true });

    await waitFor(() => expect(subscribe).toHaveBeenCalledTimes(1));
    expect(result.current.candles).toHaveLength(2);
  });

  it('resubscribes when reloadKey bumps for the same symbol', async () => {
    const loadCandles = vi.fn(async (request) => ({
      symbol: request.symbol,
      interval: request.interval,
      candles: baseCandles,
      hasMore: true,
      meta: { source: 'tws', asOf: Date.now(), stale: false, warnings: [] },
    }));
    const feed = createStreamingFeed({ loadCandles });
    const { result, rerender } = renderHook(
      (props: { reloadKey: number }) =>
        useChartDataFeed({
          feed,
          symbol: 'AAPL',
          interval: '1d',
          range: '1mo',
          reloadKey: props.reloadKey,
        }),
      { initialProps: { reloadKey: 0 } },
    );

    await waitFor(() => expect(result.current.candles).toHaveLength(2));
    expect(loadCandles).toHaveBeenCalledTimes(1);

    rerender({ reloadKey: 1 });
    await waitFor(() => expect(loadCandles).toHaveBeenCalledTimes(2));
    expect(result.current.meta?.source).toBe('tws');
  });

  it('reloads when sessionMode changes', async () => {
    const loadCandles = vi.fn(async (request) => ({
      symbol: request.symbol,
      interval: request.interval,
      candles: baseCandles,
      hasMore: true,
      meta: { source: 'tws', asOf: Date.now(), stale: false, warnings: [] },
    }));
    const feed = createStreamingFeed({ loadCandles });
    const { rerender } = renderHook(
      (props: { sessionMode: 'regular' | 'extended' }) =>
        useChartDataFeed({
          feed,
          symbol: 'AAPL',
          interval: '5m',
          range: '1d',
          sessionMode: props.sessionMode,
        }),
      { initialProps: { sessionMode: 'regular' as const } },
    );

    await waitFor(() => expect(loadCandles).toHaveBeenCalledTimes(1));
    expect(loadCandles.mock.calls[0]?.[0]?.sessionMode).toBe('regular');

    rerender({ sessionMode: 'extended' });
    await waitFor(() => expect(loadCandles).toHaveBeenCalledTimes(2));
    expect(loadCandles.mock.calls[1]?.[0]?.sessionMode).toBe('extended');
  });

  it('paints cached candles instantly on re-open then refreshes in background', async () => {
    const loadCandles = vi.fn(async (request) => ({
      symbol: request.symbol,
      interval: request.interval,
      candles: baseCandles,
      hasMore: true,
      meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
    }));
    const feed = createStreamingFeed({ loadCandles, subscribeCandles: undefined });

    const { unmount } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
        live: false,
      }),
    );
    await waitFor(() => expect(loadCandles).toHaveBeenCalledTimes(1));

    unmount();

    const { result } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
        live: false,
      }),
    );

    expect(result.current.candles).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(true);
    expect(result.current.stale).toBe(true);
    expect(result.current.meta?.stale).toBe(true);

    await waitFor(() => {
      expect(result.current.refreshing).toBe(false);
      expect(result.current.stale).toBe(false);
    });
    expect(loadCandles).toHaveBeenCalledTimes(2);
  });

  it('paints from sessionStorage on simulated hard reload', async () => {
    const key = buildChartClientCacheKey({
      symbol: 'AAPL',
      interval: '1d',
      range: '1mo',
      sessionMode: 'regular',
    });
    window.sessionStorage.setItem(
      `${CHART_CLIENT_SESSION_STORAGE_PREFIX}${key}`,
      JSON.stringify({
        candles: baseCandles,
        meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
        hasMore: true,
        asOf: Date.now(),
      }),
    );

    const loadCandles = vi.fn(async (request) => ({
      symbol: request.symbol,
      interval: request.interval,
      candles: baseCandles,
      hasMore: true,
      meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
    }));
    const feed = createStreamingFeed({ loadCandles, subscribeCandles: undefined });

    const { result } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
        live: false,
      }),
    );

    expect(result.current.candles).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(true);
    expect(result.current.stale).toBe(true);

    await waitFor(() => {
      expect(result.current.refreshing).toBe(false);
    });
    expect(loadCandles).toHaveBeenCalledTimes(1);
  });

  it('bypasses cache when reloadKey bumps', async () => {
    const loadCandles = vi.fn(async (request) => ({
      symbol: request.symbol,
      interval: request.interval,
      candles: baseCandles,
      hasMore: true,
      meta: { source: 'tws', asOf: Date.now(), stale: false, warnings: [] },
    }));
    const feed = createStreamingFeed({ loadCandles, subscribeCandles: undefined });
    const { result, rerender } = renderHook(
      (props: { reloadKey: number }) =>
        useChartDataFeed({
          feed,
          symbol: 'AAPL',
          interval: '1d',
          range: '1mo',
          reloadKey: props.reloadKey,
          live: false,
        }),
      { initialProps: { reloadKey: 0 } },
    );

    await waitFor(() => expect(result.current.candles).toHaveLength(2));
    expect(loadCandles).toHaveBeenCalledTimes(1);

    rerender({ reloadKey: 1 });
    expect(result.current.candles).toHaveLength(0);
    expect(result.current.loading).toBe(true);
    expect(result.current.refreshing).toBe(false);

    await waitFor(() => expect(result.current.candles).toHaveLength(2));
    expect(loadCandles).toHaveBeenCalledTimes(2);
  });

  it('keeps cached candles when background refresh fails', async () => {
    let shouldFail = false;
    const loadCandles = vi.fn(async (request) => {
      if (shouldFail) {
        throw new Error('network down');
      }
      return {
        symbol: request.symbol,
        interval: request.interval,
        candles: baseCandles,
        hasMore: true,
        meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
      };
    });
    const feed = createStreamingFeed({ loadCandles, subscribeCandles: undefined });

    const { unmount } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
        live: false,
      }),
    );
    await waitFor(() => expect(loadCandles).toHaveBeenCalledTimes(1));
    unmount();

    shouldFail = true;
    const { result } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
        live: false,
      }),
    );

    expect(result.current.candles).toHaveLength(2);
    expect(result.current.refreshing).toBe(true);

    await waitFor(() => {
      expect(result.current.error).toBe('network down');
      expect(result.current.refreshing).toBe(false);
      expect(result.current.stale).toBe(true);
      expect(result.current.candles).toHaveLength(2);
      expect(result.current.loading).toBe(false);
    });
  });

  it('writes loadMore history into chartClientCache for remount reuse', async () => {
    const feed = createStreamingFeed({ subscribeCandles: undefined });
    const cacheKey = buildChartClientCacheKey({
      symbol: 'AAPL',
      interval: '1d',
      range: '1mo',
      sessionMode: 'regular',
    });

    const { result, unmount } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
        live: false,
      }),
    );

    await waitFor(() => expect(result.current.candles).toHaveLength(2));

    await act(async () => {
      await result.current.loadMore(1000);
    });

    const cachedAfterLoadMore = readChartClientCache(cacheKey);
    expect(cachedAfterLoadMore?.candles.map((c) => c.t)).toEqual([500, 1000, 2000]);

    unmount();

    const { result: remounted } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
        live: false,
      }),
    );

    expect(remounted.current.candles.map((c) => c.t)).toEqual([500, 1000, 2000]);
    expect(remounted.current.loading).toBe(false);
    expect(remounted.current.refreshing).toBe(true);
  });

  it('preserves prepended history when background refresh completes', async () => {
    const loadCandles = vi.fn(async (request) => ({
      symbol: request.symbol,
      interval: request.interval,
      candles: baseCandles,
      hasMore: true,
      meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
    }));
    const feed = createStreamingFeed({ loadCandles, subscribeCandles: undefined });

    const { result } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
        live: false,
      }),
    );

    await waitFor(() => expect(result.current.candles).toHaveLength(2));

    await act(async () => {
      await result.current.loadMore(1000);
    });
    expect(result.current.candles.map((c) => c.t)).toEqual([500, 1000, 2000]);

    await waitFor(() => expect(loadCandles).toHaveBeenCalledTimes(1));
    expect(result.current.candles.map((c) => c.t)).toEqual([500, 1000, 2000]);
  });

  it('reloadKey refresh replaces cache without merging prior prepended history', async () => {
    const loadCandles = vi.fn(async (request) => ({
      symbol: request.symbol,
      interval: request.interval,
      candles: baseCandles,
      hasMore: true,
      meta: { source: 'tws', asOf: Date.now(), stale: false, warnings: [] },
    }));
    const feed = createStreamingFeed({ loadCandles, subscribeCandles: undefined });
    const { result, rerender } = renderHook(
      (props: { reloadKey: number }) =>
        useChartDataFeed({
          feed,
          symbol: 'AAPL',
          interval: '1d',
          range: '1mo',
          reloadKey: props.reloadKey,
          live: false,
        }),
      { initialProps: { reloadKey: 0 } },
    );

    await waitFor(() => expect(result.current.candles).toHaveLength(2));

    await act(async () => {
      await result.current.loadMore(1000);
    });
    expect(result.current.candles.map((c) => c.t)).toEqual([500, 1000, 2000]);

    rerender({ reloadKey: 1 });
    await waitFor(() => expect(result.current.candles.map((c) => c.t)).toEqual([1000, 2000]));
  });

  it('caps resident bars at RESIDENT_BAR_SOFT_MAX after loadMore', async () => {
    const initial = Array.from({ length: RESIDENT_BAR_SOFT_MAX - 100 }, (_, i) => ({
      t: 1000 + i * 1000,
      o: 1,
      h: 2,
      l: 0.5,
      c: 1.5,
    }));
    const olderPage = Array.from({ length: 500 }, (_, i) => ({
      t: i * 1000,
      o: 0.5,
      h: 0.5,
      l: 0.5,
      c: 0.5,
    }));
    const feed = createStreamingFeed({
      subscribeCandles: undefined,
      async loadCandles(request) {
        return {
          symbol: request.symbol,
          interval: request.interval,
          candles: initial,
          hasMore: true,
          meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
        };
      },
      async loadMoreCandles() {
        return {
          symbol: 'AAPL',
          interval: '1d',
          candles: olderPage,
          hasMore: true,
          meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
        };
      },
    });
    const cacheKey = buildChartClientCacheKey({
      symbol: 'AAPL',
      interval: '1d',
      range: '1mo',
      sessionMode: 'regular',
    });

    const { result } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
        live: false,
      }),
    );

    await waitFor(() => expect(result.current.candles).toHaveLength(RESIDENT_BAR_SOFT_MAX - 100));

    await act(async () => {
      await result.current.loadMore(initial[0]!.t);
    });

    expect(result.current.candles.length).toBeLessThanOrEqual(RESIDENT_BAR_SOFT_MAX);
    expect(readChartClientCache(cacheKey)?.candles.length).toBeLessThanOrEqual(RESIDENT_BAR_SOFT_MAX);
    expect(result.current.candles.at(-1)?.t).toBe(initial.at(-1)?.t);
  });

  it('sets cache hasMore false when loadMore returns an empty page', async () => {
    const feed = createStreamingFeed({
      subscribeCandles: undefined,
      async loadMoreCandles() {
        return {
          symbol: 'AAPL',
          interval: '1d',
          candles: [],
          hasMore: false,
          meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
        };
      },
    });
    const cacheKey = buildChartClientCacheKey({
      symbol: 'AAPL',
      interval: '1d',
      range: '1mo',
      sessionMode: 'regular',
    });

    const { result } = renderHook(() =>
      useChartDataFeed({
        feed,
        symbol: 'AAPL',
        interval: '1d',
        range: '1mo',
        live: false,
      }),
    );

    await waitFor(() => expect(result.current.candles).toHaveLength(2));

    await act(async () => {
      await result.current.loadMore(1000);
    });

    expect(result.current.hasMore).toBe(false);
    expect(readChartClientCache(cacheKey)?.hasMore).toBe(false);
  });

  it('aborts in-flight load when chart symbol changes', async () => {
    let resolveAapl: ((value: unknown) => void) | undefined;
    const loadCandles = vi.fn((request) => {
      if (request.symbol === 'AAPL') {
        return new Promise((resolve) => {
          resolveAapl = resolve;
        });
      }
      return Promise.resolve({
        symbol: request.symbol,
        interval: request.interval,
        candles: [{ t: 2000, o: 2, h: 3, l: 1, c: 2.5 }],
        hasMore: false,
        meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
      });
    });
    const feed = createStreamingFeed({ loadCandles, subscribeCandles: undefined });

    const { rerender } = renderHook(
      ({ symbol }: { symbol: string }) =>
        useChartDataFeed({
          feed,
          symbol,
          interval: '1d',
          range: '1mo',
          live: false,
        }),
      { initialProps: { symbol: 'AAPL' } },
    );

    const firstSignal = loadCandles.mock.calls[0]?.[0]?.signal as AbortSignal;
    expect(firstSignal).toBeInstanceOf(AbortSignal);

    rerender({ symbol: 'MSFT' });
    expect(firstSignal.aborted).toBe(true);

    resolveAapl?.({
      symbol: 'AAPL',
      interval: '1d',
      candles: [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }],
      hasMore: false,
      meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
    });

    await waitFor(() => expect(loadCandles).toHaveBeenCalledTimes(2));
  });
});
