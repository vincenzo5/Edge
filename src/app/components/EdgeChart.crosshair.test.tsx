import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import EdgeChart from './EdgeChart';
import type { CellConfig } from '@/lib/chartConfig';
import { createTestChartDataFeed, defaultTestCandles } from '@/test/chartDataFeedTestUtils';

async function flushAnimationFrames(frames = 2) {
  for (let i = 0; i < frames; i += 1) {
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });
  }
}

vi.mock('@/lib/chart/series', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chart/series')>();
  return {
    ...actual,
    shouldPrefetchEdge: () => false,
  };
});

vi.mock('../../../packages/chart-react/src/engine/canvas', () => ({
  default: function MockChartCanvas({
    onCrosshairMove,
    paneId = 'price',
  }: {
    onCrosshairMove?: (event: {
      paneId: string;
      plotX: number;
      plotY: number;
      localY: number;
      timestamp: number | null;
      dataIndex: number;
      valueLabel: string;
      timeLabel: string;
    } | null) => void;
    paneId?: string;
  }) {
    useEffect(() => {
      if (!onCrosshairMove || paneId !== 'price') return;
      const event = {
        paneId: 'price',
        plotX: 100,
        plotY: 50,
        localY: 50,
        timestamp: 1000,
        dataIndex: 0,
        valueLabel: '105.00',
        timeLabel: 'Jan 1',
      };
      onCrosshairMove(event);
      onCrosshairMove({ ...event });
    }, [onCrosshairMove, paneId]);
    return <div data-testid={`canvas-${paneId}`} />;
  },
}));

const baseConfig: CellConfig = {
  symbol: 'AAPL',
  range: '1y',
  interval: '1d',
  chartType: 'candle_solid',
  indicators: [],
  drawings: [],
};

describe('EdgeChart crosshair coalescing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('coalesces duplicate crosshair moves within one animation frame', async () => {
    const testFeed = createTestChartDataFeed();
    const onCrosshairMove = vi.fn();
    render(
      <EdgeChart
        config={baseConfig}
        theme="dark"
        feed={testFeed}
        chartId="t1"
        onCrosshairMove={onCrosshairMove}
      />,
    );

    await waitFor(() => {
      expect(onCrosshairMove).toHaveBeenCalled();
    });

    await flushAnimationFrames();

    await waitFor(() => {
      const moveCalls = onCrosshairMove.mock.calls.filter(
        (call) => call[0]?.dataIndex === 0,
      );
      expect(moveCalls).toHaveLength(1);
      expect(moveCalls[0]?.[0]).toEqual({
        timestamp: 1000,
        dataIndex: 0,
        valueLabel: '105.00',
      });
    });
  });
});

describe('EdgeChart fetch abort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores stale fetch results after symbol change', async () => {
    let resolveFirst!: (value: typeof defaultTestCandles) => void;
    const firstPromise = new Promise<typeof defaultTestCandles>((resolve) => {
      resolveFirst = resolve;
    });
    const msftCandles = [{ t: 9000, o: 300, h: 310, l: 290, c: 305, v: 1000 }];
    const loadCandles = vi
      .fn()
      .mockImplementationOnce(async (request) => {
        const candles = await firstPromise;
        return {
          symbol: request.symbol,
          interval: request.interval,
          candles,
          meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
        };
      })
      .mockImplementationOnce(async (request) => ({
        symbol: request.symbol,
        interval: request.interval,
        candles: msftCandles,
        meta: { source: 'yahoo', asOf: Date.now(), stale: false, warnings: [] },
      }));

    const testFeed = createTestChartDataFeed(defaultTestCandles, { loadCandles });
    const chartRef = { current: null as import('./EdgeChart').ChartHandle | null };
    const { rerender } = render(
      <EdgeChart
        ref={chartRef}
        config={{ ...baseConfig, symbol: 'AAPL' }}
        theme="dark"
        feed={testFeed}
        chartId="t1"
      />,
    );

    rerender(
      <EdgeChart
        ref={chartRef}
        config={{ ...baseConfig, symbol: 'MSFT' }}
        theme="dark"
        feed={testFeed}
        chartId="t1"
      />,
    );

    resolveFirst(defaultTestCandles);

    await waitFor(() => {
      expect(chartRef.current?.getCandles().at(-1)?.t).toBe(9000);
    });
  });
});
