import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import ChartCell from './ChartCell';
import { AppTimeZoneProvider } from './AppTimeZoneProvider';
import {
  DEFAULT_CELL,
  DEFAULT_TOOLBAR_PREFS,
} from '@/lib/chartConfig';

const stopDrawing = vi.fn();
const startDrawing = vi.fn();

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
      startDrawing,
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

describe('ChartCell focus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disarms drawing when isActive becomes false', async () => {
    const { rerender, getByTestId } = render(
      <AppTimeZoneProvider>
        <ChartCell
          chartId="test-chart"
          config={DEFAULT_CELL}
          theme="dark"
          compact
          isActive
          toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
          onConfigChange={vi.fn()}
          onToolbarPrefsChange={vi.fn()}
        />
      </AppTimeZoneProvider>,
    );

    await waitFor(() => expect(getByTestId('edge-chart-mock')).toBeInTheDocument());

    stopDrawing.mockClear();

    rerender(
      <AppTimeZoneProvider>
        <ChartCell
          chartId="test-chart"
          config={DEFAULT_CELL}
          theme="dark"
          compact
          isActive={false}
          showDrawingRail={false}
          toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
          onConfigChange={vi.fn()}
          onToolbarPrefsChange={vi.fn()}
        />
      </AppTimeZoneProvider>,
    );

    expect(stopDrawing).toHaveBeenCalledTimes(1);
  });
});
