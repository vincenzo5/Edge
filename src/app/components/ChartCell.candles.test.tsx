import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import ChartCell from './ChartCell';
import { ActiveChartProvider, useActiveChart } from './ActiveChartContext';
import { SidebarProvider } from './SidebarContext';
import {
  DEFAULT_CELL,
  DEFAULT_TOOLBAR_PREFS,
} from '@/lib/chartConfig';

const mockCandles = [
  { t: 1000, o: 100, h: 110, l: 90, c: 105, v: 1000 },
  { t: 2000, o: 105, h: 115, l: 95, c: 110, v: 1100 },
];

vi.mock('./EdgeChart', () => ({
  default: forwardRef(function MockEdgeChart(
    props: {
      onCandlesChange?: (candles: typeof mockCandles) => void;
      onCrosshairMove?: (ev: {
        dataIndex: number | null;
        timestamp: number | null;
        valueLabel: string | null;
      }) => void;
    },
    ref,
  ) {
    useEffect(() => {
      props.onCandlesChange?.(mockCandles);
    }, [props.onCandlesChange]);

    useImperativeHandle(ref, () => ({
      getTrackedOverlays: () => [],
      subscribeOverlayChange: () => () => {},
      onSelectionChange: () => () => {},
      serializeDrawings: () => [],
      setMagnet: vi.fn(),
      setKeepDrawingMode: vi.fn(),
      stopDrawing: vi.fn(),
      startDrawing: vi.fn(),
      lockAllDrawings: vi.fn(),
      setAllDrawingsVisible: vi.fn(),
      zoomIn: vi.fn(),
      getCandles: () => mockCandles,
      clearDrawings: vi.fn(),
      removeOverlay: vi.fn(),
      setOverlayVisible: vi.fn(),
      setOverlayLocked: vi.fn(),
      renameOverlay: vi.fn(),
      bringForward: vi.fn(),
      sendBackward: vi.fn(),
      duplicateOverlay: vi.fn(),
      isViewportModified: () => false,
      resetChartView: vi.fn(),
      setCrosshairFromSync: vi.fn(),
      pasteDrawings: vi.fn(),
    }));

    return (
      <button
        type="button"
        data-testid="mock-crosshair"
        onClick={() =>
          props.onCrosshairMove?.({
            dataIndex: 1,
            timestamp: 2000,
            valueLabel: '110.00',
          })
        }
      >
        move crosshair
      </button>
    );
  }),
  indicatorKey: (ind: { id: string }) => ind.id,
}));

function SnapshotReader({
  onSnapshot,
}: {
  onSnapshot: (snapshot: ReturnType<typeof useActiveChart>) => void;
}) {
  const snap = useActiveChart();
  onSnapshot(snap);
  return null;
}

describe('ChartCell candle ref snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers candles from ref without storing duplicate React state', async () => {
    const onSnapshot = vi.fn();
    render(
      <SidebarProvider activePanel={null} onActivePanelChange={vi.fn()}>
        <ActiveChartProvider>
          <ChartCell
            chartId="cell-0"
            config={DEFAULT_CELL}
            theme="dark"
            compact
            isActive
            toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
            onConfigChange={vi.fn()}
            onToolbarPrefsChange={vi.fn()}
          />
          <SnapshotReader onSnapshot={onSnapshot} />
        </ActiveChartProvider>
      </SidebarProvider>,
    );

    await waitFor(() => {
      const latest = onSnapshot.mock.calls.at(-1)?.[0];
      expect(latest?.dataWindow.candles).toHaveLength(mockCandles.length);
      expect(latest?.dataWindow.candles[0]?.t).toBe(1000);
    });
  });
});
