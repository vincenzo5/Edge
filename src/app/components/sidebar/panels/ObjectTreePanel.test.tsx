import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { ObjectTreePanel } from './ObjectTreePanel';
import {
  ActiveChartProvider,
  useActiveChartBridge,
  type ActiveChartSnapshot,
} from '../../ActiveChartContext';
import { DEFAULT_CELL, type TrackedOverlay } from '@/lib/chartConfig';
import type { Candle } from '@/lib/chart/contracts';

const candles: Candle[] = [
  { t: 1, o: 10, h: 12, l: 9, c: 11, v: 1000 },
  { t: 2, o: 11, h: 13, l: 10, c: 12, v: 2000 },
];

const overlayActions = {
  remove: vi.fn(),
  setVisible: vi.fn(),
  setLocked: vi.fn(),
  rename: vi.fn(),
  bringForward: vi.fn(),
  sendBackward: vi.fn(),
  duplicate: vi.fn(),
  subscribe: () => () => {},
};

function makeSnapshot(): ActiveChartSnapshot {
  return {
    chartId: 'cell-0',
    config: DEFAULT_CELL,
    theme: 'dark',
    overlays: [],
    dataWindow: {
      dataIndex: 1,
      candles,
      indicators: [],
      symbol: 'AAPL',
      interval: '1d',
      theme: 'dark',
    },
    overlayActions,
    onConfigChange: vi.fn(),
    openIndicatorPicker: vi.fn(),
  };
}

function SeedSnapshot({ snapshot }: { snapshot: ActiveChartSnapshot }) {
  const bridge = useActiveChartBridge();

  useEffect(() => {
    if (!bridge) return;
    bridge.register(snapshot.chartId, snapshot);
    return () => {
      bridge.unregister(snapshot.chartId);
    };
  }, [bridge, snapshot]);

  return null;
}

describe('ObjectTreePanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  it('shows placeholder when no active chart', () => {
    render(
      <ActiveChartProvider>
        <ObjectTreePanel />
      </ActiveChartProvider>,
    );

    expect(
      screen.getByText('Focus a chart to inspect objects and data.'),
    ).toBeInTheDocument();
  });

  it('renders OHLCV values from active chart snapshot', () => {
    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <ObjectTreePanel />
      </ActiveChartProvider>,
    );

    expect(screen.getByText('OHLCV')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Data Window')).toBeInTheDocument();
  });

  it('shows pane labels on drawing rows', () => {
    window.localStorage.setItem(
      'tv-ai:object-tree-section:cell-0',
      JSON.stringify({ symbol: true, indicators: true, drawings: false, data: true }),
    );
    const overlays: TrackedOverlay[] = [
      {
        id: 'd-price',
        name: 'trend_line',
        label: 'Trend',
        visible: true,
        locked: false,
        zLevel: 1,
        paneId: 'price',
      },
      {
        id: 'd-rsi',
        name: 'horizontal_line',
        label: 'H-Line',
        visible: true,
        locked: false,
        zLevel: 0,
        paneId: 'rsi1',
      },
    ];
    const snapshot = makeSnapshot();
    snapshot.overlays = overlays;
    snapshot.config = {
      ...DEFAULT_CELL,
      indicators: [
        {
          id: 'rsi1',
          name: 'RSI',
          pane: 'sub',
          params: { period: 14 },
          visible: true,
        },
      ],
    };

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={snapshot} />
        <ObjectTreePanel />
      </ActiveChartProvider>,
    );

    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('RSI')).toBeInTheDocument();
    expect(screen.getByText('Trend')).toBeInTheDocument();
    expect(screen.getByText('H-Line')).toBeInTheDocument();
  });
});
