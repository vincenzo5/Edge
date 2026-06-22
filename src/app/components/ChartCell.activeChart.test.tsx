import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import ChartCell from './ChartCell';
import { ActiveChartProvider, useActiveChart } from './ActiveChartContext';
import { SidebarProvider } from './SidebarContext';
import {
  DEFAULT_CELL,
  DEFAULT_TOOLBAR_PREFS,
} from '@/lib/chartConfig';

const stopDrawing = vi.fn();

vi.mock('./EdgeChart', () => ({
  default: forwardRef(function MockEdgeChart(_props, ref) {
    useImperativeHandle(ref, () => ({
      getTrackedOverlays: () => [],
      subscribeOverlayChange: () => () => {},
      onSelectionChange: () => () => {},
      serializeDrawings: () => [],
      setMagnet: vi.fn(),
      setKeepDrawingMode: vi.fn(),
      stopDrawing,
      startDrawing: vi.fn(),
      lockAllDrawings: vi.fn(),
      setAllDrawingsVisible: vi.fn(),
      zoomIn: vi.fn(),
      getCandles: () => [],
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
    }));
    return <div data-testid="edge-chart-mock" />;
  }),
  indicatorKey: (ind: { id: string }) => ind.id,
}));

function SnapshotReader({ onSnapshot }: { onSnapshot: (id: string | undefined) => void }) {
  const snap = useActiveChart();
  onSnapshot(snap?.chartId);
  return null;
}

function renderChartCell(isActive: boolean) {
  const onSnapshot = vi.fn();
  const view = render(
    <SidebarProvider activePanel={null} onActivePanelChange={vi.fn()}>
      <ActiveChartProvider>
        <ChartCell
          chartId="cell-0"
          config={DEFAULT_CELL}
          theme="dark"
          compact
          isActive={isActive}
          toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
          onConfigChange={vi.fn()}
          onToolbarPrefsChange={vi.fn()}
        />
        <SnapshotReader onSnapshot={onSnapshot} />
      </ActiveChartProvider>
    </SidebarProvider>,
  );
  return { ...view, onSnapshot };
}

describe('ChartCell active chart bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers snapshot when active', async () => {
    const { onSnapshot } = renderChartCell(true);

    await waitFor(() => {
      expect(onSnapshot.mock.calls.at(-1)?.[0]).toBe('cell-0');
    });
  });

  it('clears snapshot when inactive', async () => {
    const { onSnapshot, rerender } = renderChartCell(true);

    await waitFor(() => {
      expect(onSnapshot.mock.calls.at(-1)?.[0]).toBe('cell-0');
    });

    rerender(
      <SidebarProvider activePanel={null} onActivePanelChange={vi.fn()}>
        <ActiveChartProvider>
          <ChartCell
            chartId="cell-0"
            config={DEFAULT_CELL}
            theme="dark"
            compact
            isActive={false}
            toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
            onConfigChange={vi.fn()}
            onToolbarPrefsChange={vi.fn()}
          />
          <SnapshotReader onSnapshot={onSnapshot} />
        </ActiveChartProvider>
      </SidebarProvider>,
    );

    await waitFor(() => {
      expect(onSnapshot.mock.calls.at(-1)?.[0]).toBeUndefined();
    });
  });
});
