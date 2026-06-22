import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import EdgeChart from './EdgeChart';
import { createIndicatorInstance, type CellConfig } from '@/lib/chartConfig';

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

vi.mock('@/lib/chart/canvas', () => ({
  default: ({ paneId }: { paneId: string }) => <div data-testid={`canvas-${paneId}`} />,
}));

const baseConfig: CellConfig = {
  symbol: 'AAPL',
  range: '1y',
  interval: '1d',
  chartType: 'candle_solid',
  indicators: [],
  drawings: [],
};

describe('EdgeChart pane controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a control bar on price and sub panes after load', async () => {
    const macd = createIndicatorInstance('MACD', 'sub');
    render(
      <EdgeChart
        config={{ ...baseConfig, indicators: [macd] }}
        theme="dark"
        chartId="t1"
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('pane-control-bar')).toHaveLength(2);
    });
  });

  it('calls onMaximizeIndicator when maximize is clicked on sub pane', async () => {
    const macd = createIndicatorInstance('MACD', 'sub');
    const onMaximizeIndicator = vi.fn();
    render(
      <EdgeChart
        config={{ ...baseConfig, indicators: [macd] }}
        theme="dark"
        chartId="t1"
        onMaximizeIndicator={onMaximizeIndicator}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Maximize pane' }).length).toBeGreaterThan(0);
    });

    const maximizeButtons = screen.getAllByRole('button', { name: 'Maximize pane' });
    fireEvent.mouseDown(maximizeButtons[maximizeButtons.length - 1]);

    expect(onMaximizeIndicator).toHaveBeenCalledWith(macd.id);
  });

  it('does not render pane controls when only the price pane exists', async () => {
    render(<EdgeChart config={baseConfig} theme="dark" chartId="t1" />);

    await waitFor(() => {
      expect(screen.getByTestId('canvas-price')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('pane-control-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pane-control-header')).not.toBeInTheDocument();
  });

  it('keeps pane controls on a collapsed price pane after the last indicator is removed', async () => {
    const onCollapseIndicator = vi.fn();
    render(
      <EdgeChart
        config={baseConfig}
        theme="dark"
        chartId="t1"
        collapsedKeys={new Set(['price'])}
        onCollapseIndicator={onCollapseIndicator}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('pane-control-bar')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('canvas-price')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore pane' })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Restore pane' }));
    expect(onCollapseIndicator).toHaveBeenCalledWith('price');
  });
});
