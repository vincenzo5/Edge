import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEffect } from 'react';
import {
  ActiveChartProvider,
  useActiveChart,
  useActiveChartBridge,
  type ActiveChartRegistration,
  type ActiveChartSnapshot,
} from './ActiveChartContext';
import { DEFAULT_CELL } from '@/lib/chartConfig';
import {
  makeDrawingCommandsMock,
  makeDrawingToolbarActionsMock,
  makeDrawingToolbarStateMock,
  makeDataWindowActionsMock,
  makeHeaderActionsMock,
  makeUICommandsMock,
  toActiveChartRegistration,
} from '@/test/activeChartMocks';

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

function makeSnapshot(chartId: string, overrides?: Partial<ActiveChartSnapshot>): ActiveChartSnapshot {
  const headerCommands = makeHeaderActionsMock();
  return {
    chartId,
    config: DEFAULT_CELL,
    theme: 'dark',
    overlays: [],
    headerState: {
      replayActive: headerCommands.replayActive,
      canUndo: headerCommands.canUndo,
      canRedo: headerCommands.canRedo,
    },
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
    headerCommands,
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
    drawingToolbarState: makeDrawingToolbarStateMock({ activeTool: 'trend_line' }),
    drawingToolbarActions: makeDrawingToolbarActionsMock(),
    uiCommands: makeUICommandsMock(),
    dataWindowActions: makeDataWindowActionsMock(),
    ...overrides,
  };
}

function makeRegistration(
  chartId: string,
  overrides?: Partial<ActiveChartSnapshot>,
): ActiveChartRegistration {
  return toActiveChartRegistration(makeSnapshot(chartId, overrides));
}

function RegisterProbe({ chartId, active }: { chartId: string; active: boolean }) {
  const bridge = useActiveChartBridge();

  useEffect(() => {
    if (!bridge || !active) return;
    bridge.register(chartId, makeRegistration(chartId));
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

  it('updates snapshot when config read state changes', () => {
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

    const callsBefore = onSnapshot.mock.calls.length;

    act(() => {
      bridgeRef.current?.register('cell-0', makeRegistration('cell-0'));
    });

    act(() => {
      const reg = makeRegistration('cell-0');
      reg.readState.config = { ...DEFAULT_CELL, symbol: 'MSFT' };
      bridgeRef.current?.register('cell-0', reg);
    });

    const latest = onSnapshot.mock.calls.at(-1)?.[0];
    expect(latest?.config.symbol).toBe('MSFT');
    expect(onSnapshot.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('does not notify subscribers when only dataWindow read state changes', () => {
    const bridgeRef: { current: ReturnType<typeof useActiveChartBridge> } = { current: null };
    const onSnapshot = vi.fn();
    const registration = makeRegistration('cell-0');

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
      bridgeRef.current?.register('cell-0', registration);
    });

    const callsAfterInitial = onSnapshot.mock.calls.length;

    act(() => {
      const reg = makeRegistration('cell-0');
      reg.chartCommands = registration.chartCommands;
      reg.drawingCommands = registration.drawingCommands;
      reg.drawingToolbarActions = registration.drawingToolbarActions;
      reg.overlayActions = registration.overlayActions;
      reg.dataWindowActions = registration.dataWindowActions;
      reg.uiCommands = registration.uiCommands;
      reg.headerActions = registration.headerActions;
      reg.onConfigChange = registration.onConfigChange;
      reg.openIndicatorPicker = registration.openIndicatorPicker;
      reg.readState = {
        ...registration.readState,
        dataWindow: {
          ...registration.readState.dataWindow,
          dataIndex: 42,
        },
      };
      bridgeRef.current?.register('cell-0', reg);
    });

    expect(onSnapshot.mock.calls.length).toBe(callsAfterInitial);

    act(() => {
      const reg = makeRegistration('cell-0');
      reg.chartCommands = registration.chartCommands;
      reg.drawingCommands = registration.drawingCommands;
      reg.drawingToolbarActions = registration.drawingToolbarActions;
      reg.overlayActions = registration.overlayActions;
      reg.dataWindowActions = registration.dataWindowActions;
      reg.uiCommands = registration.uiCommands;
      reg.headerActions = registration.headerActions;
      reg.onConfigChange = registration.onConfigChange;
      reg.openIndicatorPicker = registration.openIndicatorPicker;
      reg.readState = {
        ...registration.readState,
        dataWindow: {
          ...registration.readState.dataWindow,
          dataIndex: 99,
        },
      };
      bridgeRef.current?.register('cell-0', reg);
    });

    expect(onSnapshot.mock.calls.length).toBe(callsAfterInitial);

    const viaGetSnapshot = bridgeRef.current?.getSnapshot();
    expect(viaGetSnapshot?.dataWindow.dataIndex).toBe(99);
  });

  it('does not notify when register payload is unchanged', () => {
    const bridgeRef: { current: ReturnType<typeof useActiveChartBridge> } = { current: null };
    const onSnapshot = vi.fn();
    const registration = makeRegistration('cell-0');

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
      bridgeRef.current?.register('cell-0', registration);
    });

    const callsAfterInitial = onSnapshot.mock.calls.length;

    act(() => {
      bridgeRef.current?.register('cell-0', registration);
    });

    expect(onSnapshot.mock.calls.length).toBe(callsAfterInitial);
  });

  it('notifies when overlay read state changes with stable command refs', () => {
    const bridgeRef: { current: ReturnType<typeof useActiveChartBridge> } = { current: null };
    const onSnapshot = vi.fn();
    const registration = makeRegistration('cell-0');

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
      bridgeRef.current?.register('cell-0', registration);
    });

    const callsAfterInitial = onSnapshot.mock.calls.length;

    act(() => {
      const reg = makeRegistration('cell-0');
      reg.chartCommands = registration.chartCommands;
      reg.drawingCommands = registration.drawingCommands;
      reg.drawingToolbarActions = registration.drawingToolbarActions;
      reg.overlayActions = registration.overlayActions;
      reg.dataWindowActions = registration.dataWindowActions;
      reg.uiCommands = registration.uiCommands;
      reg.headerActions = registration.headerActions;
      reg.onConfigChange = registration.onConfigChange;
      reg.openIndicatorPicker = registration.openIndicatorPicker;
      reg.readState.overlays = [{ id: 'o1', name: 'trend_line', label: 'TL', zLevel: 1, visible: true, locked: false }];
      bridgeRef.current?.register('cell-0', reg);
    });

    expect(onSnapshot.mock.calls.length).toBeGreaterThan(callsAfterInitial);
    expect(onSnapshot.mock.calls.at(-1)?.[0]?.overlays).toHaveLength(1);
  });

  it('includes drawing toolbar state in the active snapshot', () => {
    const onSnapshot = vi.fn();

    render(
      <ActiveChartProvider>
        <RegisterProbe chartId="cell-0" active />
        <SnapshotProbe onSnapshot={onSnapshot} />
      </ActiveChartProvider>,
    );

    const snap = onSnapshot.mock.calls.at(-1)?.[0];
    expect(snap?.drawingToolbarState.activeTool).toBe('trend_line');
    expect(snap?.drawingToolbarActions.selectTool).toBeTypeOf('function');
  });
});
