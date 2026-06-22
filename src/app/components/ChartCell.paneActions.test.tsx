import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import ChartCell from './ChartCell';
import {
  DEFAULT_CELL,
  DEFAULT_TOOLBAR_PREFS,
  PRICE_PANE_KEY,
  type CellConfig,
} from '@/lib/chartConfig';

type EdgeChartProps = {
  onMoveIndicatorUp?: (key: string) => void;
  onMoveIndicatorDown?: (key: string) => void;
  onCollapseIndicator?: (key: string) => void;
  onMaximizeIndicator?: (key: string) => void;
  onRemoveIndicator?: (name: string, pane: 'main' | 'sub') => void;
};

let capturedEdgeChartProps: EdgeChartProps | null = null;

vi.mock('./EdgeChart', () => ({
  default: forwardRef(function MockEdgeChart(props: EdgeChartProps, ref) {
    capturedEdgeChartProps = props;
    useImperativeHandle(ref, () => ({
      getTrackedOverlays: () => [],
      subscribeOverlayChange: () => () => {},
      serializeDrawings: () => [],
      setMagnet: vi.fn(),
      setKeepDrawingMode: vi.fn(),
      stopDrawing: vi.fn(),
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

const macdId = 'macd-id';
const rsiId = 'rsi-id';

const multiPaneConfig: CellConfig = {
  ...DEFAULT_CELL,
  indicators: [
    { id: macdId, name: 'MACD', pane: 'sub', visible: true },
    { id: rsiId, name: 'RSI', pane: 'sub', visible: true },
  ],
  paneOrder: [PRICE_PANE_KEY, macdId, rsiId],
  collapsedPanes: [],
  maximizedPane: null,
};

function renderCell(config: CellConfig = multiPaneConfig) {
  const onConfigChange = vi.fn();
  render(
    <ChartCell
      chartId="test-chart"
      config={config}
      theme="dark"
      compact
      isActive
      toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
      onConfigChange={onConfigChange}
      onToolbarPrefsChange={vi.fn()}
    />,
  );
  return { onConfigChange };
}

describe('ChartCell pane actions', () => {
  beforeEach(() => {
    capturedEdgeChartProps = null;
    vi.clearAllMocks();
  });

  it('wires EdgeChart pane callbacks', async () => {
    renderCell();
    await waitFor(() => expect(capturedEdgeChartProps).not.toBeNull());
    expect(capturedEdgeChartProps!.onMoveIndicatorUp).toBeTypeOf('function');
    expect(capturedEdgeChartProps!.onMoveIndicatorDown).toBeTypeOf('function');
    expect(capturedEdgeChartProps!.onCollapseIndicator).toBeTypeOf('function');
    expect(capturedEdgeChartProps!.onMaximizeIndicator).toBeTypeOf('function');
    expect(capturedEdgeChartProps!.onRemoveIndicator).toBeTypeOf('function');
  });

  it('swaps paneOrder on move up', async () => {
    const { onConfigChange } = renderCell();
    await waitFor(() => expect(capturedEdgeChartProps?.onMoveIndicatorUp).toBeTypeOf('function'));
    capturedEdgeChartProps!.onMoveIndicatorUp!(rsiId);
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        paneOrder: [PRICE_PANE_KEY, rsiId, macdId],
      }),
    );
  });

  it('swaps paneOrder on move down', async () => {
    const { onConfigChange } = renderCell();
    await waitFor(() => expect(capturedEdgeChartProps?.onMoveIndicatorDown).toBeTypeOf('function'));
    capturedEdgeChartProps!.onMoveIndicatorDown!(macdId);
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        paneOrder: [PRICE_PANE_KEY, rsiId, macdId],
      }),
    );
  });

  it('toggles collapsedPanes on collapse', async () => {
    const { onConfigChange } = renderCell();
    await waitFor(() => expect(capturedEdgeChartProps?.onCollapseIndicator).toBeTypeOf('function'));
    capturedEdgeChartProps!.onCollapseIndicator!(macdId);
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        collapsedPanes: [macdId],
      }),
    );
  });

  it('clears maximizedPane when collapsing the maximized pane', async () => {
    const { onConfigChange } = renderCell({
      ...multiPaneConfig,
      maximizedPane: macdId,
    });
    await waitFor(() => expect(capturedEdgeChartProps?.onCollapseIndicator).toBeTypeOf('function'));
    capturedEdgeChartProps!.onCollapseIndicator!(macdId);
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        collapsedPanes: [macdId],
        maximizedPane: null,
      }),
    );
  });

  it('sets maximizedPane and uncollapses target on maximize', async () => {
    const { onConfigChange } = renderCell({
      ...multiPaneConfig,
      collapsedPanes: [rsiId],
    });
    await waitFor(() => expect(capturedEdgeChartProps?.onMaximizeIndicator).toBeTypeOf('function'));
    capturedEdgeChartProps!.onMaximizeIndicator!(rsiId);
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        maximizedPane: rsiId,
        collapsedPanes: [],
      }),
    );
  });

  it('clears maximizedPane when toggling maximize off', async () => {
    const { onConfigChange } = renderCell({
      ...multiPaneConfig,
      maximizedPane: rsiId,
    });
    await waitFor(() => expect(capturedEdgeChartProps?.onMaximizeIndicator).toBeTypeOf('function'));
    capturedEdgeChartProps!.onMaximizeIndicator!(rsiId);
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        maximizedPane: null,
      }),
    );
  });

  it('removes indicator via onRemoveIndicator', async () => {
    const { onConfigChange } = renderCell();
    await waitFor(() => expect(capturedEdgeChartProps?.onRemoveIndicator).toBeTypeOf('function'));
    capturedEdgeChartProps!.onRemoveIndicator!('RSI', 'sub');
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        indicators: [expect.objectContaining({ id: macdId, name: 'MACD' })],
      }),
    );
  });
});
