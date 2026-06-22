import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import RightSidebar from './RightSidebar';
import {
  ActiveChartProvider,
  useActiveChartBridge,
  type ActiveChartSnapshot,
} from '../ActiveChartContext';
import { DEFAULT_CELL } from '@/lib/chartConfig';
import type { Candle } from '@/lib/chart/contracts';

const candles: Candle[] = [
  { t: 1, o: 10, h: 12, l: 9, c: 11, v: 1000 },
];

function SeedActiveChart() {
  const bridge = useActiveChartBridge();

  useEffect(() => {
    if (!bridge) return;
    const snapshot: ActiveChartSnapshot = {
      chartId: 'cell-0',
      config: DEFAULT_CELL,
      theme: 'dark',
      overlays: [],
      dataWindow: {
        dataIndex: 0,
        candles,
        indicators: [],
        symbol: 'AAPL',
        interval: '1d',
        theme: 'dark',
      },
      overlayActions: {
        remove: vi.fn(),
        setVisible: vi.fn(),
        setLocked: vi.fn(),
        rename: vi.fn(),
        bringForward: vi.fn(),
        sendBackward: vi.fn(),
        duplicate: vi.fn(),
        subscribe: () => () => {},
      },
      onConfigChange: vi.fn(),
      openIndicatorPicker: vi.fn(),
    };
    bridge.register('cell-0', snapshot);
    return () => bridge.unregister('cell-0');
  }, [bridge]);

  return null;
}

describe('RightSidebar active chart integration', () => {
  it('renders object tree data when sidebar shares ActiveChartProvider with grid', () => {
    render(
      <ActiveChartProvider>
        <SeedActiveChart />
        <RightSidebar
          theme="dark"
          activePanel="object-tree"
          onTogglePanel={vi.fn()}
          onClosePanel={vi.fn()}
        />
      </ActiveChartProvider>,
    );

    expect(screen.getByText('OHLCV')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
  });
});
