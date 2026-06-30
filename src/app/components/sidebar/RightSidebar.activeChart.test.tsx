import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useEffect } from 'react';
import RightSidebar from './RightSidebar';
import {
  ActiveChartProvider,
  useActiveChartBridge,
  type ActiveChartSnapshot,
} from '../ActiveChartContext';
import { DEFAULT_CELL } from '@/lib/chartConfig';
import { makeDrawingCommandsMock, makeDataWindowActionsMock, makeUICommandsMock, toActiveChartRegistration } from '@/test/activeChartMocks';
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
      headerCommands: {
        replayActive: false,
        canUndo: false,
        canRedo: false,
        openSettings: vi.fn(),
        openStudyTemplate: vi.fn(),
        openChartTemplate: vi.fn(),
        toggleReplay: vi.fn(),
        undo: vi.fn(),
        redo: vi.fn(),
        addFavoriteIndicator: vi.fn(),
      },
      headerState: {
        replayActive: false,
        canUndo: false,
        canRedo: false,
      },
      chartCommands: {
        undo: vi.fn(() => false),
        redo: vi.fn(() => false),
        canUndo: vi.fn(() => false),
        canRedo: vi.fn(() => false),
        goTo: vi.fn(async () => ({ ok: true as const })),
        zoomIn: vi.fn(),
        resetChartView: vi.fn(),
        getCandles: vi.fn(() => []),
        selectDrawing: vi.fn(),
        getSelectedDrawingId: vi.fn(() => null),
        updateDrawingStyles: vi.fn(),
        restoreDrawings: vi.fn(),
        canCaptureSnapshot: vi.fn(() => true),
        captureSnapshot: vi.fn(async () => new Blob([new Uint8Array(32)], { type: 'image/png' })),
      },
      drawingCommands: makeDrawingCommandsMock(),
      uiCommands: makeUICommandsMock(),
      dataWindowActions: makeDataWindowActionsMock(),
    };
    bridge.register('cell-0', toActiveChartRegistration(snapshot));
    return () => bridge.unregister('cell-0');
  }, [bridge]);

  return null;
}

describe('RightSidebar active chart integration', () => {
  it('renders object tree data when sidebar shares ActiveChartProvider with grid', () => {
    render(
      <ActiveChartProvider>
        <SeedActiveChart />
        <RightSidebar activePanel="object-tree" mode="inline" width={300} />
      </ActiveChartProvider>,
    );

    expect(screen.getByText('AAPL · 1d')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Data window' }));
    expect(screen.getByText('11')).toBeInTheDocument();
  });
});
