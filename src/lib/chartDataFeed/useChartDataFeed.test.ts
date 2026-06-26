import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChartDataFeed } from './useChartDataFeed';
import type { Candle, ChartDataFeed, ChartCandleStreamSink } from '@edge/chart-core';

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
    ...overrides,
  } satisfies StreamingTestFeed;
  return feed;
}

describe('useChartDataFeed', () => {
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
});
