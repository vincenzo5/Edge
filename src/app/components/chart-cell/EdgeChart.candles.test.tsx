import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import EdgeChart from './EdgeChart';
import type { CellConfig } from '@/lib/chartConfig';
import { createTestChartDataFeed, defaultTestCandles } from '@/test/chartDataFeedTestUtils';

vi.mock('@/lib/chart/series', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chart/series')>();
  return {
    ...actual,
    shouldPrefetchEdge: () => false,
  };
});

const baseConfig: CellConfig = {
  symbol: 'AAPL',
  range: '1y',
  interval: '1d',
  chartType: 'candle_solid',
  indicators: [],
  drawings: [],
};

describe('EdgeChart onCandlesChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fires onCandlesChange with full array after load', async () => {
    const testFeed = createTestChartDataFeed();
    const onCandlesChange = vi.fn();
    render(
      <EdgeChart
        config={baseConfig}
        theme="dark"
        feed={testFeed}
        chartId="t1"
        onCandlesChange={onCandlesChange}
      />,
    );

    await waitFor(() => {
      const lastNonEmpty = [...onCandlesChange.mock.calls]
        .map((call) => call[0])
        .filter((candles) => candles.length > 0)
        .at(-1);
      expect(lastNonEmpty).toHaveLength(defaultTestCandles.length);
    });
  });

  it('fires onCandlesChange with sliced array when visibleCount changes', async () => {
    const testFeed = createTestChartDataFeed();
    const onCandlesChange = vi.fn();
    const { rerender } = render(
      <EdgeChart
        config={baseConfig}
        theme="dark"
        feed={testFeed}
        chartId="t1"
        visibleCount={null}
        onCandlesChange={onCandlesChange}
      />,
    );

    await waitFor(() => {
      expect(onCandlesChange).toHaveBeenCalled();
    });
    onCandlesChange.mockClear();

    rerender(
      <EdgeChart
        config={baseConfig}
        theme="dark"
        feed={testFeed}
        chartId="t1"
        visibleCount={2}
        onCandlesChange={onCandlesChange}
      />,
    );

    await waitFor(() => {
      const sliced = onCandlesChange.mock.calls.at(-1)?.[0];
      expect(sliced?.length).toBe(2);
    });
  });

  it('returns an out-of-range result when GoTo history fetch fails', async () => {
    const testFeed = createTestChartDataFeed(defaultTestCandles, {
      loadMoreCandles: vi.fn().mockRejectedValue(new Error('history unavailable')),
    });
    const chartRef = { current: null as import('./EdgeChart').ChartHandle | null };

    render(
      <EdgeChart
        ref={chartRef}
        config={baseConfig}
        theme="dark"
        feed={testFeed}
        chartId="t1"
      />,
    );

    await waitFor(() => {
      expect(chartRef.current?.getCandles().length).toBeGreaterThan(0);
    });

    await expect(chartRef.current!.goTo({ mode: 'date', at: 0 })).resolves.toEqual({
      ok: false,
      reason: 'out_of_range',
    });
  });

  it('loads leading history before GoTo target and keeps horizontal pan working', async () => {
    const olderCandles = Array.from({ length: 20 }, (_, i) => ({
      t: -19_000 + i * 1000,
      o: 90,
      h: 100,
      l: 80,
      c: 95,
      v: 900,
    }));
    const testFeed = createTestChartDataFeed(defaultTestCandles, {
      loadMoreCandles: vi.fn().mockResolvedValue({
        symbol: 'AAPL',
        interval: '1d',
        candles: olderCandles,
        hasMore: false,
        meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
      }),
    });
    const chartRef = { current: null as import('./EdgeChart').ChartHandle | null };

    const { container } = render(
      <EdgeChart
        ref={chartRef}
        config={baseConfig}
        theme="dark"
        feed={testFeed}
        chartId="t1"
      />,
    );

    await waitFor(() => {
      expect(chartRef.current?.getCandles().length).toBeGreaterThan(0);
    });

    await expect(chartRef.current!.goTo({ mode: 'date', at: 1000 })).resolves.toEqual({ ok: true });

    await waitFor(() => {
      expect(chartRef.current!.getCandles()[0]!.t).toBeLessThan(1000);
    });

    const chartArea = container.querySelector('[data-edge-chart]');
    if (!chartArea) throw new Error('chart area not found');
    expect(() => {
      fireEvent.wheel(chartArea, { deltaX: 80, deltaY: 0, deltaMode: 0 });
    }).not.toThrow();
  });

  it('forwards live metadata through onDataMetaChange', async () => {
    let sinkRef: import('@edge/chart-core').ChartCandleStreamSink | null = null;
    const testFeed = createTestChartDataFeed(defaultTestCandles, {
      subscribeCandles(_request, sink) {
        sinkRef = sink;
        return () => {
          sinkRef = null;
        };
      },
    });
    const onDataMetaChange = vi.fn();

    render(
      <EdgeChart
        config={baseConfig}
        theme="dark"
        feed={testFeed}
        chartId="t1"
        onDataMetaChange={onDataMetaChange}
      />,
    );

    await waitFor(() => {
      expect(onDataMetaChange).toHaveBeenCalled();
      const latest = onDataMetaChange.mock.calls.at(-1)?.[0];
      expect(latest?.streaming).toBe(true);
    });

    sinkRef?.({
      type: 'replace-latest',
      candle: { t: 3000, o: 3, h: 3, l: 3, c: 3 },
      meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
    });

    await waitFor(() => {
      const latest = onDataMetaChange.mock.calls.at(-1)?.[0];
      expect(latest?.lastUpdateAt).toBeTruthy();
    });
  });
});
