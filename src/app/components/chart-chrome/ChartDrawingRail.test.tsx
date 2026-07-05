import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useEffect } from 'react';
import ChartDrawingRail from './ChartDrawingRail';
import {
  ActiveChartProvider,
  useActiveChartBridge,
  type ActiveChartSnapshot,
} from '../ActiveChartContext';
import { DEFAULT_CELL, DEFAULT_TOOLBAR_PREFS } from '@/lib/chartConfig';
import {
  makeDrawingCommandsMock,
  makeDrawingToolbarActionsMock,
  makeDrawingToolbarStateMock,
  makeDataWindowActionsMock,
  makeUICommandsMock,
  toActiveChartRegistration,
} from '@/test/activeChartMocks';

function makeSnapshot(
  overrides?: Partial<ActiveChartSnapshot>,
): ActiveChartSnapshot {
  return {
    chartId: 'cell-0',
    config: DEFAULT_CELL,
    theme: 'dark',
    overlays: [],
    drawingToolbarState: makeDrawingToolbarStateMock(),
    drawingToolbarActions: makeDrawingToolbarActionsMock(),
    headerState: { replayActive: false, canUndo: false, canRedo: false },
    dataWindow: {
      dataIndex: null,
      candles: [],
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
    chartCommands: {
      undo: vi.fn(() => false),
      redo: vi.fn(() => false),
      canUndo: vi.fn(() => false),
      canRedo: vi.fn(() => false),
      goTo: vi.fn(async () => ({ ok: true as const })),
      zoomIn: vi.fn(),
      resetChartView: vi.fn(),
      getCandles: () => [],
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
    ...overrides,
  };
}

function SeedSnapshot({ snapshot }: { snapshot: ActiveChartSnapshot }) {
  const bridge = useActiveChartBridge();

  useEffect(() => {
    if (!bridge) return;
    bridge.register(snapshot.chartId, toActiveChartRegistration(snapshot));
    return () => {
      bridge.unregister(snapshot.chartId);
    };
  }, [bridge, snapshot]);

  return null;
}

describe('ChartDrawingRail', () => {
  it('renders disabled when no active chart is registered', () => {
    render(
      <ActiveChartProvider>
        <ChartDrawingRail
          theme="dark"
          toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
          onToolbarPrefsChange={vi.fn()}
        />
      </ActiveChartProvider>,
    );

    expect(screen.getByTestId('chart-drawing-rail')).toBeInTheDocument();
    expect(screen.getByLabelText('Cursor')).toHaveAttribute('disabled');
  });

  it('calls selectTool on the active chart when a tool is chosen', () => {
    const selectTool = vi.fn();
    const snapshot = makeSnapshot({
      drawingToolbarActions: makeDrawingToolbarActionsMock({ selectTool }),
    });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={snapshot} />
        <ChartDrawingRail
          theme="dark"
          toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
          onToolbarPrefsChange={vi.fn()}
        />
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByLabelText('Lines — Trend Line'));

    expect(selectTool).toHaveBeenCalledWith('straightLine');
  });
});
