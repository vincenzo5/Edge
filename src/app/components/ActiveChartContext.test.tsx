import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEffect } from 'react';
import {
  ActiveChartProvider,
  useActiveChart,
  useActiveChartBridge,
  type ActiveChartSnapshot,
} from './ActiveChartContext';
import { DEFAULT_CELL } from '@/lib/chartConfig';
import { makeDrawingCommandsMock, makeUICommandsMock } from '@/test/activeChartMocks';

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

function makeSnapshot(chartId: string): ActiveChartSnapshot {
  return {
    chartId,
    config: DEFAULT_CELL,
    theme: 'dark',
    overlays: [],
    dataWindow: {
      dataIndex: null,
      candles: [],
      indicators: [],
      symbol: 'AAPL',
      interval: '1d',
      theme: 'dark',
    },
    overlayActions,
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
  };
}

function RegisterProbe({ chartId, active }: { chartId: string; active: boolean }) {
  const bridge = useActiveChartBridge();

  useEffect(() => {
    if (!bridge || !active) return;
    bridge.register(chartId, makeSnapshot(chartId));
    return () => {
      bridge.unregister(chartId);
    };
  }, [bridge, chartId, active]);

  return null;
}

function SnapshotProbe({ onSnapshot }: { onSnapshot: (snap: ReturnType<typeof useActiveChart>) => void }) {
  const snap = useActiveChart();
  useEffect(() => {
    onSnapshot(snap);
  }, [snap, onSnapshot]);
  return null;
}

describe('ActiveChartContext', () => {
  it('returns null when nothing is registered', () => {
    const onSnapshot = vi.fn();
    render(
      <ActiveChartProvider>
        <SnapshotProbe onSnapshot={onSnapshot} />
      </ActiveChartProvider>,
    );
    expect(onSnapshot).toHaveBeenCalledWith(null);
  });

  it('exposes snapshot for the active registered cell', () => {
    const onSnapshot = vi.fn();
    render(
      <ActiveChartProvider>
        <RegisterProbe chartId="cell-0" active />
        <SnapshotProbe onSnapshot={onSnapshot} />
      </ActiveChartProvider>,
    );

    const latest = onSnapshot.mock.calls.at(-1)?.[0];
    expect(latest?.chartId).toBe('cell-0');
  });

  it('clears snapshot when cell unregisters', () => {
    const onSnapshot = vi.fn();
    const { rerender } = render(
      <ActiveChartProvider>
        <RegisterProbe chartId="cell-0" active />
        <SnapshotProbe onSnapshot={onSnapshot} />
      </ActiveChartProvider>,
    );

    rerender(
      <ActiveChartProvider>
        <RegisterProbe chartId="cell-0" active={false} />
        <SnapshotProbe onSnapshot={onSnapshot} />
      </ActiveChartProvider>,
    );

    const latest = onSnapshot.mock.calls.at(-1)?.[0];
    expect(latest).toBeNull();
  });

  it('swaps snapshot when a different cell registers', () => {
    const onSnapshot = vi.fn();
    const { rerender } = render(
      <ActiveChartProvider>
        <RegisterProbe chartId="cell-0" active />
        <SnapshotProbe onSnapshot={onSnapshot} />
      </ActiveChartProvider>,
    );

    rerender(
      <ActiveChartProvider>
        <RegisterProbe chartId="cell-0" active={false} />
        <RegisterProbe chartId="cell-1" active />
        <SnapshotProbe onSnapshot={onSnapshot} />
      </ActiveChartProvider>,
    );

    const latest = onSnapshot.mock.calls.at(-1)?.[0];
    expect(latest?.chartId).toBe('cell-1');
  });

  it('exposes header commands on snapshot', () => {
    const onSnapshot = vi.fn();
    render(
      <ActiveChartProvider>
        <RegisterProbe chartId="cell-0" active />
        <SnapshotProbe onSnapshot={onSnapshot} />
      </ActiveChartProvider>,
    );

    const latest = onSnapshot.mock.calls.at(-1)?.[0];
    expect(latest?.headerCommands).toBeDefined();
    expect(typeof latest?.headerCommands.undo).toBe('function');
  });

  it('updates snapshot when register is called again', () => {
    const bridgeRef: { current: ReturnType<typeof useActiveChartBridge> } = { current: null };
    const onSnapshot = vi.fn();

    function BridgeCapture() {
      bridgeRef.current = useActiveChartBridge();
      return null;
    }

    render(
      <ActiveChartProvider>
        <BridgeCapture />
        <SnapshotProbe onSnapshot={onSnapshot} />
      </ActiveChartProvider>,
    );

    act(() => {
      bridgeRef.current?.register('cell-0', makeSnapshot('cell-0'));
    });

    act(() => {
      const snap = makeSnapshot('cell-0');
      snap.config = { ...DEFAULT_CELL, symbol: 'MSFT' };
      bridgeRef.current?.register('cell-0', snap);
    });

    const latest = onSnapshot.mock.calls.at(-1)?.[0];
    expect(latest?.config.symbol).toBe('MSFT');
  });
});
