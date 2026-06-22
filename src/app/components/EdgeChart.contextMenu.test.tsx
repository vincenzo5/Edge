import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import EdgeChart from './EdgeChart';
import type { CellConfig } from '@/lib/chartConfig';
import { hitTestAll } from '@/lib/chart/pluginHost';

vi.mock('@/lib/chart/series', () => ({
  fetchYahooCandles: vi.fn().mockResolvedValue([
    { t: 1000, o: 100, h: 110, l: 90, c: 105 },
    { t: 2000, o: 105, h: 115, l: 95, c: 110 },
    { t: 3000, o: 110, h: 120, l: 100, c: 115 },
  ]),
  toHeikinAshi: (x: unknown[]) => x,
  applyVisibleSlice: (x: unknown[]) => x,
  transformCandlesForChartType: (candles: unknown[]) => candles,
  mergeCandlesPrepend: (base: unknown[], older: unknown[]) => [...older, ...base],
  fetchOlderCandles: vi.fn().mockResolvedValue([]),
  shouldPrefetchEdge: () => false,
}));

vi.mock('@/lib/chart/pluginHost', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chart/pluginHost')>();
  return {
    ...actual,
    hitTestAll: vi.fn(),
  };
});

const persistedDrawing = {
  id: 'd1',
  name: 'trend_line',
  label: 'Trend Line',
  points: [
    { timestamp: 1000, value: 100 },
    { timestamp: 3000, value: 115 },
  ],
  visible: true,
  locked: false,
  zLevel: 1,
  paneId: 'price',
};

const baseConfig: CellConfig = {
  symbol: 'AAPL',
  range: '1y',
  interval: '1d',
  chartType: 'candle_solid',
  indicators: [],
  drawings: [persistedDrawing],
};

describe('EdgeChart context menu routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hitTestAll).mockReturnValue(null);
  });

  it('dispatches overlay menu without blank menu when drawing is hit', async () => {
    vi.mocked(hitTestAll).mockReturnValue('d1');
    const onOverlayRightClick = vi.fn();
    const onChartContextMenu = vi.fn();
    const chartRef = { current: null as import('./EdgeChart').ChartHandle | null };

    const { container } = render(
      <EdgeChart
        ref={chartRef}
        config={baseConfig}
        theme="dark"
        chartId="t1"
        onOverlayRightClick={onOverlayRightClick}
        onChartContextMenu={onChartContextMenu}
      />,
    );

    await waitFor(() => {
      expect(chartRef.current?.getTrackedOverlays()).toHaveLength(1);
      expect(chartRef.current?.getCandles().length).toBeGreaterThan(0);
    });

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    fireEvent.contextMenu(canvas, { clientX: 200, clientY: 150 });

    expect(onOverlayRightClick).toHaveBeenCalledTimes(1);
    expect(onOverlayRightClick.mock.calls[0][0].id).toBe('d1');
    expect(onChartContextMenu).not.toHaveBeenCalled();
  });

  it('dispatches blank menu when plot miss has no drawing hit', async () => {
    vi.mocked(hitTestAll).mockReturnValue(null);
    const onOverlayRightClick = vi.fn();
    const onChartContextMenu = vi.fn();
    const chartRef = { current: null as import('./EdgeChart').ChartHandle | null };

    const { container } = render(
      <EdgeChart
        ref={chartRef}
        config={baseConfig}
        theme="dark"
        chartId="t1"
        onOverlayRightClick={onOverlayRightClick}
        onChartContextMenu={onChartContextMenu}
      />,
    );

    await waitFor(() => {
      expect(chartRef.current?.getCandles().length).toBeGreaterThan(0);
    });

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    fireEvent.contextMenu(canvas, { clientX: 200, clientY: 150 });

    expect(onOverlayRightClick).not.toHaveBeenCalled();
    expect(onChartContextMenu).toHaveBeenCalledTimes(1);
  });
});
