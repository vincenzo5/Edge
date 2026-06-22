import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import EdgeChart from './EdgeChart';
import type { CellConfig } from '@/lib/chartConfig';
import { fetchOlderCandles } from '@/lib/chart/series';

const { mockCandles } = vi.hoisted(() => ({
  mockCandles: [
    { t: 1000, o: 100, h: 110, l: 90, c: 105, v: 1000 },
    { t: 2000, o: 105, h: 115, l: 95, c: 110, v: 1100 },
    { t: 3000, o: 110, h: 120, l: 100, c: 115, v: 1200 },
    { t: 4000, o: 115, h: 125, l: 105, c: 120, v: 1300 },
    { t: 5000, o: 120, h: 130, l: 110, c: 125, v: 1400 },
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
    const onCandlesChange = vi.fn();
    render(
      <EdgeChart
        config={baseConfig}
        theme="dark"
        chartId="t1"
        onCandlesChange={onCandlesChange}
      />,
    );

    await waitFor(() => {
      const lastNonEmpty = [...onCandlesChange.mock.calls]
        .map((call) => call[0])
        .filter((candles) => candles.length > 0)
        .at(-1);
      expect(lastNonEmpty).toHaveLength(mockCandles.length);
    });

    const lastNonEmpty = [...onCandlesChange.mock.calls]
      .map((call) => call[0])
      .filter((candles) => candles.length > 0)
      .at(-1);
    expect(lastNonEmpty?.[0].t).toBe(1000);
    expect(lastNonEmpty?.at(-1)?.t).toBe(5000);
  });

  it('fires onCandlesChange with sliced array when visibleCount changes', async () => {
    const onCandlesChange = vi.fn();
    const { rerender } = render(
      <EdgeChart
        config={baseConfig}
        theme="dark"
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
        chartId="t1"
        visibleCount={2}
        onCandlesChange={onCandlesChange}
      />,
    );

    await waitFor(() => {
      expect(onCandlesChange).toHaveBeenCalled();
      const sliced = onCandlesChange.mock.calls.at(-1)?.[0];
      expect(sliced?.length).toBe(2);
    });

    const sliced = onCandlesChange.mock.calls.at(-1)?.[0];
    expect(sliced?.[0].t).toBe(1000);
    expect(sliced?.[1].t).toBe(2000);
  });

  it('returns an out-of-range result when GoTo history fetch fails', async () => {
    vi.mocked(fetchOlderCandles).mockRejectedValueOnce(new Error('history unavailable'));
    const chartRef = { current: null as import('./EdgeChart').ChartHandle | null };

    render(
      <EdgeChart
        ref={chartRef}
        config={baseConfig}
        theme="dark"
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
    vi.mocked(fetchOlderCandles).mockResolvedValueOnce(olderCandles);
    const chartRef = { current: null as import('./EdgeChart').ChartHandle | null };

    const { container } = render(
      <EdgeChart
        ref={chartRef}
        config={baseConfig}
        theme="dark"
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
});
