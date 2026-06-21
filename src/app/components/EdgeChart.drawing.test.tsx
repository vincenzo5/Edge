import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import EdgeChart from './EdgeChart';
import type { CellConfig } from '@/lib/chartConfig';

vi.mock('@/lib/chart/series', () => ({
  fetchYahooCandles: vi.fn().mockResolvedValue([
    { t: 1000, o: 100, h: 110, l: 90, c: 105 },
    { t: 2000, o: 105, h: 115, l: 95, c: 110 },
    { t: 3000, o: 110, h: 120, l: 100, c: 115 },
  ]),
  toHeikinAshi: (x: unknown[]) => x,
  applyVisibleSlice: (x: unknown[]) => x,
}));

const config: CellConfig = {
  symbol: 'AAPL',
  range: '1y',
  interval: '1d',
  chartType: 'candle_solid',
  indicators: [],
  drawings: [],
};

describe('EdgeChart drawing handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes selection and magnet APIs on ref', async () => {
    const ref = { current: null as import('./EdgeChart').ChartHandle | null };
    render(
      <EdgeChart ref={ref} config={config} theme="dark" chartId="t1" />
    );
    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(ref.current!.getSelectedDrawingId()).toBeNull();
    expect(ref.current!.getMagnetEnabled()).toBe(false);
    ref.current!.setMagnet(true);
    expect(ref.current!.getMagnetEnabled()).toBe(true);
    ref.current!.startDrawing('straightLine');
    expect(ref.current!.serializeDrawings()).toEqual([]);
  });
});
