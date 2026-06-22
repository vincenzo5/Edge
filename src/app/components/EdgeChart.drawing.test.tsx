import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
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
  transformCandlesForChartType: (candles: unknown[]) => candles,
  mergeCandlesPrepend: (base: unknown[], older: unknown[]) => [...older, ...base],
  fetchOlderCandles: vi.fn().mockResolvedValue([]),
  shouldPrefetchEdge: () => false,
}));

const baseConfig: CellConfig = {
  symbol: 'AAPL',
  range: '1y',
  interval: '1d',
  chartType: 'candle_solid',
  indicators: [],
  drawings: [],
};

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

describe('EdgeChart drawing handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes selection and magnet APIs on ref', async () => {
    const ref = { current: null as import('./EdgeChart').ChartHandle | null };
    render(
      <EdgeChart ref={ref} config={baseConfig} theme="dark" chartId="t1" />
    );
    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(ref.current!.getSelectedDrawingId()).toBeNull();
    expect(ref.current!.getMagnetEnabled()).toBe(false);
    ref.current!.setMagnet(true);
    expect(ref.current!.getMagnetEnabled()).toBe(true);
    ref.current!.startDrawing('straightLine');
    expect(ref.current!.serializeDrawings()).toEqual([]);
  });

  it('hydrates tracked overlays from persisted config after candles load', async () => {
    const ref = { current: null as import('./EdgeChart').ChartHandle | null };
    const config: CellConfig = { ...baseConfig, drawings: [persistedDrawing] };
    render(<EdgeChart ref={ref} config={config} theme="dark" chartId="t1" />);

    await waitFor(() => {
      expect(ref.current?.getTrackedOverlays()).toHaveLength(1);
    });

    const [overlay] = ref.current!.getTrackedOverlays();
    expect(overlay.id).toBe('d1');
    expect(overlay.name).toBe('trend_line');
  });

  it('disarms toolbar when selecting a drawing while a tool is armed', async () => {
    const onDrawingDisarmed = vi.fn();
    const ref = { current: null as import('./EdgeChart').ChartHandle | null };
    render(
      <EdgeChart
        ref={ref}
        config={baseConfig}
        theme="dark"
        chartId="t1"
        onDrawingDisarmed={onDrawingDisarmed}
      />
    );
    await waitFor(() => expect(ref.current).not.toBeNull());

    ref.current!.startDrawing('straightLine');
    ref.current!.selectDrawing('d1');

    expect(onDrawingDisarmed).toHaveBeenCalledTimes(1);
  });

  it('fires onDrawingDisarmed once when stopping an armed tool', async () => {
    const onDrawingDisarmed = vi.fn();
    const ref = { current: null as import('./EdgeChart').ChartHandle | null };
    render(
      <EdgeChart
        ref={ref}
        config={baseConfig}
        theme="dark"
        chartId="t1"
        onDrawingDisarmed={onDrawingDisarmed}
      />
    );
    await waitFor(() => expect(ref.current).not.toBeNull());

    ref.current!.startDrawing('straightLine');
    ref.current!.stopDrawing();

    expect(onDrawingDisarmed).toHaveBeenCalledTimes(1);
  });

  it('updateDrawingStyles patches serialized styles', async () => {
    const ref = { current: null as import('./EdgeChart').ChartHandle | null };
    const config: CellConfig = { ...baseConfig, drawings: [persistedDrawing] };
    render(<EdgeChart ref={ref} config={config} theme="dark" chartId="t1" />);
    await waitFor(() => expect(ref.current?.getTrackedOverlays()).toHaveLength(1));

    ref.current!.updateDrawingStyles('d1', { lineColor: '#00FF88' });
    const serialized = ref.current!.serializeDrawings();
    expect(serialized[0].styles?.lineColor).toBe('#00FF88');
  });

  it('undo removes added drawing', async () => {
    const ref = { current: null as import('./EdgeChart').ChartHandle | null };
    const config: CellConfig = { ...baseConfig, drawings: [persistedDrawing] };
    render(<EdgeChart ref={ref} config={config} theme="dark" chartId="t1" />);
    await waitFor(() => expect(ref.current?.getTrackedOverlays()).toHaveLength(1));

    // hydrate (via config load) clears undo history; duplicate uses execute/add
    let duplicateId: string | null = null;
    act(() => {
      duplicateId = ref.current!.duplicateOverlay('d1');
    });
    expect(duplicateId).not.toBeNull();
    await waitFor(() => expect(ref.current!.serializeDrawings()).toHaveLength(2));

    act(() => {
      expect(ref.current!.undo()).toBe(true);
    });
    expect(ref.current!.serializeDrawings()).toHaveLength(1);
    expect(ref.current!.serializeDrawings()[0].id).toBe('d1');
  });

  it('undo reverts updateDrawingStyles', async () => {
    const ref = { current: null as import('./EdgeChart').ChartHandle | null };
    const config: CellConfig = { ...baseConfig, drawings: [persistedDrawing] };
    render(<EdgeChart ref={ref} config={config} theme="dark" chartId="t1" />);
    await waitFor(() => expect(ref.current?.getTrackedOverlays()).toHaveLength(1));

    act(() => {
      ref.current!.updateDrawingStyles('d1', { lineColor: '#00FF88' });
    });
    expect(ref.current!.serializeDrawings()[0].styles?.lineColor).toBe('#00FF88');

    act(() => {
      expect(ref.current!.undo()).toBe(true);
    });
    expect(ref.current!.serializeDrawings()[0].styles?.lineColor).toBeUndefined();
  });

  it('undo reverts lockAllDrawings and redo restores it', async () => {
    const ref = { current: null as import('./EdgeChart').ChartHandle | null };
    const config: CellConfig = { ...baseConfig, drawings: [persistedDrawing] };
    render(<EdgeChart ref={ref} config={config} theme="dark" chartId="t1" />);
    await waitFor(() => expect(ref.current?.getTrackedOverlays()).toHaveLength(1));

    act(() => {
      ref.current!.lockAllDrawings(true);
    });
    expect(ref.current!.serializeDrawings()[0].locked).toBe(true);
    expect(ref.current!.canUndo()).toBe(true);

    act(() => {
      expect(ref.current!.undo()).toBe(true);
    });
    expect(ref.current!.serializeDrawings()[0].locked).toBe(false);
    expect(ref.current!.canRedo()).toBe(true);

    act(() => {
      expect(ref.current!.redo()).toBe(true);
    });
    expect(ref.current!.serializeDrawings()[0].locked).toBe(true);
  });

  it('undo reverts bringForward z-order change', async () => {
    const ref = { current: null as import('./EdgeChart').ChartHandle | null };
    const d2 = {
      ...persistedDrawing,
      id: 'd2',
      label: 'Trend Line 2',
      zLevel: 0,
    };
    const d1 = { ...persistedDrawing, zLevel: 1 };
    const config: CellConfig = { ...baseConfig, drawings: [d2, d1] };
    render(<EdgeChart ref={ref} config={config} theme="dark" chartId="t1" />);
    await waitFor(() => expect(ref.current?.getTrackedOverlays()).toHaveLength(2));

    act(() => {
      ref.current!.bringForward('d2');
    });
    const afterForward = ref.current!.serializeDrawings().sort((a, b) => a.zLevel - b.zLevel);
    expect(afterForward[0].id).toBe('d1');
    expect(afterForward[1].id).toBe('d2');

    act(() => {
      expect(ref.current!.undo()).toBe(true);
    });
    const afterUndo = ref.current!.serializeDrawings().sort((a, b) => a.zLevel - b.zLevel);
    expect(afterUndo[0].id).toBe('d2');
    expect(afterUndo[1].id).toBe('d1');
  });
});
