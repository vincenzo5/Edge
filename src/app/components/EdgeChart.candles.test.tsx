import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import EdgeChart from './EdgeChart';
import type { CellConfig } from '@/lib/chartConfig';

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
});
