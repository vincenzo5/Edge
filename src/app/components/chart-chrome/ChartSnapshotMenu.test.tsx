/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import ChartSnapshotMenu from './ChartSnapshotMenu';
import {
  ActiveChartProvider,
  useActiveChartBridge,
  type ActiveChartSnapshot,
} from '../ActiveChartContext';
import { DEFAULT_CELL } from '@/lib/chartConfig';
import { makeDrawingCommandsMock, makeDataWindowActionsMock, makeUICommandsMock, toActiveChartRegistration } from '@/test/activeChartMocks';

const mockRunSnapshotAction = vi.fn();
const mockPrepareSnapshotTab = vi.fn();
const mockBuildSnapshotFilename = vi.fn(() => 'AAPL_1d_test.png');

vi.mock('@/lib/chart/chartSnapshot', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chart/chartSnapshot')>();
  return {
    ...actual,
    buildSnapshotFilename: (...args: Parameters<typeof actual.buildSnapshotFilename>) =>
      mockBuildSnapshotFilename(...args),
    prepareSnapshotTab: () => mockPrepareSnapshotTab(),
    runSnapshotAction: (...args: Parameters<typeof actual.runSnapshotAction>) =>
      mockRunSnapshotAction(...args),
  };
});

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

function makeSnapshot(
  canCapture: boolean,
  captureSnapshot = vi.fn(async () => new Blob([new Uint8Array(32)], { type: 'image/png' })),
): ActiveChartSnapshot {
  return {
    chartId: 'cell-0',
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
      canCaptureSnapshot: vi.fn(() => canCapture),
      captureSnapshot,
    },
    drawingCommands: makeDrawingCommandsMock(),
    uiCommands: makeUICommandsMock(),
    dataWindowActions: makeDataWindowActionsMock(),
  };
}

function RegisterSnapshot({ snapshot }: { snapshot: ActiveChartSnapshot }) {
  const bridge = useActiveChartBridge();
  useEffect(() => {
    if (!bridge) return;
    bridge.register(snapshot.chartId, toActiveChartRegistration(snapshot));
    return () => bridge.unregister(snapshot.chartId);
  }, [bridge, snapshot]);
  return null;
}

function renderMenu(snapshot: ActiveChartSnapshot) {
  return render(
    <ActiveChartProvider>
      <RegisterSnapshot snapshot={snapshot} />
      <ChartSnapshotMenu theme="dark" />
    </ActiveChartProvider>,
  );
}

describe('ChartSnapshotMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunSnapshotAction.mockResolvedValue({ ok: true });
    mockPrepareSnapshotTab.mockReturnValue({ location: { href: '' }, close: vi.fn() });
  });

  it('opens the snapshot menu', () => {
    renderMenu(makeSnapshot(true));
    fireEvent.click(screen.getByTestId('snapshot-trigger'));
    expect(screen.getByRole('menuitem', { name: /Download image/i })).toBeInTheDocument();
  });

  it('enables download, copy, and open when chart can capture', () => {
    renderMenu(makeSnapshot(true));
    fireEvent.click(screen.getByTestId('snapshot-trigger'));

    expect(screen.getByRole('menuitem', { name: /Download image/i })).not.toBeDisabled();
    expect(screen.getByRole('menuitem', { name: /Copy image/i })).not.toBeDisabled();
    expect(screen.getByRole('menuitem', { name: /Open in new tab/i })).not.toBeDisabled();
  });

  it('disables capture actions when chart cannot capture', () => {
    renderMenu(makeSnapshot(false));
    fireEvent.click(screen.getByTestId('snapshot-trigger'));

    expect(screen.getByRole('menuitem', { name: /Download image/i })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: /Copy image/i })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: /Open in new tab/i })).toBeDisabled();
  });

  it('keeps copy link and tweet disabled', () => {
    renderMenu(makeSnapshot(true));
    fireEvent.click(screen.getByTestId('snapshot-trigger'));

    expect(screen.getByRole('menuitem', { name: /Copy link/i })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: /Tweet image/i })).toBeDisabled();
  });

  it('runs download action via captureSnapshot and runSnapshotAction', async () => {
    const captureSnapshot = vi.fn(async () => new Blob([new Uint8Array(32)], { type: 'image/png' }));
    renderMenu(makeSnapshot(true, captureSnapshot));
    fireEvent.click(screen.getByTestId('snapshot-trigger'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Download image/i }));

    await waitFor(() => {
      expect(captureSnapshot).toHaveBeenCalledWith({ includeCrosshair: false });
      expect(mockRunSnapshotAction).toHaveBeenCalledWith(
        'download',
        expect.any(Blob),
        'AAPL_1d_test.png',
        undefined,
      );
    });
  });

  it('prepares tab synchronously before open capture', async () => {
    const captureSnapshot = vi.fn(async () => new Blob([new Uint8Array(32)], { type: 'image/png' }));
    const tab = { location: { href: '' }, close: vi.fn() };
    mockPrepareSnapshotTab.mockReturnValue(tab);

    renderMenu(makeSnapshot(true, captureSnapshot));
    fireEvent.click(screen.getByTestId('snapshot-trigger'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Open in new tab/i }));

    await waitFor(() => {
      expect(mockPrepareSnapshotTab).toHaveBeenCalled();
      expect(captureSnapshot).toHaveBeenCalled();
    });

    const prepareOrder = mockPrepareSnapshotTab.mock.invocationCallOrder[0]!;
    const captureOrder = captureSnapshot.mock.invocationCallOrder[0]!;
    expect(prepareOrder).toBeLessThan(captureOrder);
  });

  it('shows error when runSnapshotAction fails', async () => {
    mockRunSnapshotAction.mockResolvedValue({ ok: false, reason: 'clipboard_denied' });
    renderMenu(makeSnapshot(true));
    fireEvent.click(screen.getByTestId('snapshot-trigger'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Copy image/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Clipboard access was denied/i);
    });
  });
});
