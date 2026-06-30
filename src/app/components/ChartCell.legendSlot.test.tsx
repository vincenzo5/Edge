/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import ChartCell from './ChartCell';
import { DEFAULT_CELL, DEFAULT_TOOLBAR_PREFS } from '@/lib/chartConfig';

vi.mock('./EdgeChart', () => ({
  default: forwardRef(function MockEdgeChart(
    {
      legendContextSlot,
      legendLeadingSlot,
    }: {
      legendContextSlot?: React.ReactNode;
      legendLeadingSlot?: React.ReactNode;
    },
    ref,
  ) {
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
    return (
      <div data-testid="edge-chart-mock">
        {legendLeadingSlot ? (
          <div data-testid="legend-leading-slot">{legendLeadingSlot}</div>
        ) : null}
        {legendContextSlot ? (
          <div data-testid="legend-context-slot">{legendContextSlot}</div>
        ) : null}
      </div>
    );
  }),
  indicatorKey: (ind: { id: string }) => ind.id,
}));

vi.mock('./chart-chrome/MarketContextBreadcrumb', () => ({
  default: () => (
    <div data-testid="market-context-breadcrumb">breadcrumbs</div>
  ),
}));

describe('ChartCell legend context slot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders market context breadcrumb in the legend slot and nav arrows in the leading slot when symbol is set', async () => {
    render(
      <ChartCell
        chartId="test-chart"
        config={DEFAULT_CELL}
        theme="dark"
        isActive
        toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
        onConfigChange={vi.fn()}
        onToolbarPrefsChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('legend-context-slot')).toBeTruthy();
    });
    expect(screen.getByTestId('market-context-breadcrumb')).toBeTruthy();
    // No symbolNav provided → no leading slot rendered.
    expect(screen.queryByTestId('legend-leading-slot')).toBeNull();
    expect(screen.queryByRole('toolbar', { name: 'Chart header' })).toBeNull();
  });

  it('keeps symbol nav arrows out of the legend leading slot when symbolNav is provided', async () => {
    render(
      <ChartCell
        chartId="test-chart"
        config={DEFAULT_CELL}
        theme="dark"
        isActive
        toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
        symbolNav={{
          canBack: true,
          canForward: false,
          onBack: vi.fn(),
          onForward: vi.fn(),
          onSymbolSelect: vi.fn(),
        }}
        onConfigChange={vi.fn()}
        onToolbarPrefsChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('edge-chart-mock')).toBeTruthy();
    });

    expect(screen.queryByTestId('legend-leading-slot')).toBeNull();
    expect(screen.queryByTestId('symbol-nav-arrows')).toBeNull();
    expect(screen.getByTestId('market-context-breadcrumb')).toBeTruthy();
  });

  it('does not render breadcrumb when symbol is empty', async () => {
    render(
      <ChartCell
        chartId="test-chart"
        config={{ ...DEFAULT_CELL, symbol: '' }}
        theme="dark"
        isActive
        toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
        onConfigChange={vi.fn()}
        onToolbarPrefsChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('edge-chart-mock')).toBeTruthy();
    });

    expect(screen.queryByTestId('legend-context-slot')).toBeNull();
  });
});
