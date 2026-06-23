import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import EdgeChart from './EdgeChart';
import type { CellConfig } from '@/lib/chartConfig';
import { fetchYahooCandles } from '@/lib/chart/series';

async function flushAnimationFrames(frames = 2) {
  for (let i = 0; i < frames; i += 1) {
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });
  }
}

const { mockCandles } = vi.hoisted(() => ({
  mockCandles: [
    { t: 1000, o: 100, h: 110, l: 90, c: 105, v: 1000 },
    { t: 2000, o: 105, h: 115, l: 95, c: 110, v: 1100 },
  ],
}));

vi.mock('@/lib/chart/series', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chart/series')>();
  return {
    ...actual,
    fetchYahooCandles: vi.fn().mockResolvedValue(mockCandles),
    fetchOlderCandles: vi.fn().mockResolvedValue([]),
    shouldPrefetchEdge: () => false,
  };
});

vi.mock('@/lib/chart/canvas', () => ({
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
    const onCrosshairMove = vi.fn();
    render(
      <EdgeChart
        config={baseConfig}
        theme="dark"
        chartId="t1"
        onCrosshairMove={onCrosshairMove}
      />,
    );

    await waitFor(() => {
      expect(fetchYahooCandles).toHaveBeenCalled();
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

  it('passes AbortSignal and ignores stale fetch results after symbol change', async () => {
    let resolveFirst!: (value: typeof mockCandles) => void;
    const firstPromise = new Promise<typeof mockCandles>((resolve) => {
      resolveFirst = resolve;
    });
    const msftCandles = [{ t: 9000, o: 300, h: 310, l: 290, c: 305, v: 1000 }];

    vi.mocked(fetchYahooCandles)
      .mockImplementationOnce((_symbol, _range, _interval, signal) => {
        return new Promise((resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
          firstPromise.then(resolve).catch(reject);
        });
      })
      .mockResolvedValueOnce(msftCandles);

    const chartRef = { current: null as import('./EdgeChart').ChartHandle | null };
    const { rerender } = render(
      <EdgeChart
        ref={chartRef}
        config={{ ...baseConfig, symbol: 'AAPL' }}
        theme="dark"
        chartId="t1"
      />,
    );

    expect(fetchYahooCandles).toHaveBeenCalledWith(
      'AAPL',
      '1y',
      '1d',
      expect.any(AbortSignal),
    );

    rerender(
      <EdgeChart
        ref={chartRef}
        config={{ ...baseConfig, symbol: 'MSFT' }}
        theme="dark"
        chartId="t1"
      />,
    );

    await waitFor(() => {
      expect(fetchYahooCandles).toHaveBeenCalledWith(
        'MSFT',
        '1y',
        '1d',
        expect.any(AbortSignal),
      );
    });

    resolveFirst(mockCandles);

    await waitFor(() => {
      expect(chartRef.current?.getCandles().at(-1)?.t).toBe(9000);
    });
  });
});
