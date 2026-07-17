import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import ChartCell from './ChartCell';
import { ActiveChartProvider, useActiveChart, type ActiveChartUICommands } from './ActiveChartContext';
import { SidebarProvider } from './SidebarContext';
import {
  DEFAULT_CELL,
  DEFAULT_TOOLBAR_PREFS,
} from '@/lib/chartConfig';
import type { CaptureViewport } from '@/lib/patternCapture/slice';

const MOCK_CANDLES = Array.from({ length: 20 }, (_, i) => ({
  t: 1_700_000_000_000 + i * 86_400_000,
  o: 100 + i,
  h: 101 + i,
  l: 99 + i,
  c: 100.5 + i,
  v: 1_000_000,
}));

function makeCaptureViewport(): CaptureViewport {
  const width = 800;
  const startIndex = 0;
  const endIndex = 9;
  const barWidth = 75;
  return {
    startIndex,
    endIndex,
    width,
    xForIndex: (index: number) => (index - startIndex) * barWidth,
    indexForX: (plotX: number) =>
      Math.min(endIndex, Math.max(startIndex, Math.floor(plotX / barWidth))),
  };
}

function clientXForBar(barIndex: number): number {
  return barIndex * 75 + 30;
}

type EdgeChartProps = {
  onChartContextMenu?: (pos: { x: number; y: number }) => void;
  onPriceScaleContextMenu?: (pos: {
    clientX: number;
    clientY: number;
    priceScaleMode: 'auto' | 'manual';
  }) => void;
};

let capturedEdgeChartProps: EdgeChartProps | null = null;

vi.mock('./EdgeChart', () => ({
  default: forwardRef(function MockEdgeChart(props: EdgeChartProps, ref) {
    capturedEdgeChartProps = props;
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
      getCandles: () => MOCK_CANDLES,
      getVisibleRange: () => makeCaptureViewport(),
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
      resetPriceScaleWindow: vi.fn(),
      setCrosshairFromSync: vi.fn(),
      restoreDrawings: vi.fn(),
    }));
    return <div data-testid="edge-chart-mock" />;
  }),
  indicatorKey: (ind: { id: string }) => ind.id,
}));

function UICommandsProbe({
  onCommands,
}: {
  onCommands: (commands: ActiveChartUICommands | undefined) => void;
}) {
  const snap = useActiveChart();
  useEffect(() => {
    onCommands(snap?.uiCommands);
  }, [snap, onCommands]);
  return null;
}

function renderCell() {
  const onCommands = vi.fn();
  const view = render(
    <SidebarProvider activePanel={null} onActivePanelChange={vi.fn()}>
      <ActiveChartProvider>
        <ChartCell
          chartId="cell-capture"
          config={DEFAULT_CELL}
          theme="dark"
          compact
          isActive
          toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
          onConfigChange={vi.fn()}
          onToolbarPrefsChange={vi.fn()}
        />
        <UICommandsProbe onCommands={onCommands} />
      </ActiveChartProvider>
    </SidebarProvider>,
  );
  return { ...view, onCommands };
}

async function enterCapture(onCommands: ReturnType<typeof vi.fn>) {
  await waitFor(() => {
    const latest = onCommands.mock.calls.at(-1)?.[0] as ActiveChartUICommands | undefined;
    expect(latest?.togglePatternCapture).toBeTypeOf('function');
  });
  const commands = onCommands.mock.calls.at(-1)?.[0] as ActiveChartUICommands;
  commands.togglePatternCapture();
  await waitFor(() => {
    expect(screen.getByTestId('pattern-capture-click-layer')).toBeInTheDocument();
  });
}

function clickCaptureBar(barIndex: number) {
  const layer = screen.getByTestId('pattern-capture-click-layer');
  fireEvent.pointerDown(layer, { clientX: clientXForBar(barIndex), clientY: 200 });
}

describe('ChartCell pattern capture', () => {
  const originalFetch = global.fetch;
  let rectSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    capturedEdgeChartProps = null;
    vi.clearAllMocks();
    rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 400,
      right: 800,
      width: 800,
      height: 400,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    rectSpy?.mockRestore();
    global.fetch = originalFetch;
  });

  it('shows capture click layer after togglePatternCapture', async () => {
    const { onCommands } = renderCell();
    await enterCapture(onCommands);
    expect(screen.getByTestId('pattern-capture-panel')).toBeInTheDocument();
  });

  it('advances capture FSM through start/end clicks and preset label', async () => {
    const { onCommands } = renderCell();
    await enterCapture(onCommands);

    clickCaptureBar(2);
    await waitFor(() => {
      expect(screen.getByText(/Click section end/i)).toBeInTheDocument();
    });

    clickCaptureBar(5);
    await waitFor(() => {
      expect(screen.getByText(/Label this section/i)).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: '1' });
    await waitFor(() => {
      expect(screen.getByText(/Sections ready/i)).toBeInTheDocument();
    });
  });

  it('posts capture save payload and shows success message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'capture-test-001' }),
    }) as typeof fetch;

    const { onCommands } = renderCell();
    await enterCapture(onCommands);
    clickCaptureBar(2);
    clickCaptureBar(5);
    await waitFor(() => {
      expect(screen.getByText(/Label this section/i)).toBeInTheDocument();
    });
    fireEvent.keyDown(window, { key: '1' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/pattern-library/captures',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByTestId('pattern-capture-click-layer')).not.toBeInTheDocument();
    });
  });

  it('surfaces save errors from the API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Pattern library unavailable' }),
    }) as typeof fetch;

    const { onCommands } = renderCell();
    await enterCapture(onCommands);
    clickCaptureBar(2);
    clickCaptureBar(5);
    await waitFor(() => {
      expect(screen.getByText(/Label this section/i)).toBeInTheDocument();
    });
    fireEvent.keyDown(window, { key: '1' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pattern library unavailable/i)).toBeInTheDocument();
    });
  });
});

describe('ChartCell context menus', () => {
  beforeEach(() => {
    capturedEdgeChartProps = null;
    vi.clearAllMocks();
  });

  it('opens chart context menu with expected top-level items', async () => {
    renderCell();
    await waitFor(() => expect(capturedEdgeChartProps?.onChartContextMenu).toBeTypeOf('function'));
    capturedEdgeChartProps!.onChartContextMenu!({ x: 120, y: 80 });

    await waitFor(() => {
      expect(screen.getByText('Reset chart view')).toBeInTheDocument();
      expect(screen.getByText('Go to date…')).toBeInTheDocument();
    });
  });

  it('opens price-scale context menu with scale actions', async () => {
    renderCell();
    await waitFor(() =>
      expect(capturedEdgeChartProps?.onPriceScaleContextMenu).toBeTypeOf('function'),
    );
    capturedEdgeChartProps!.onPriceScaleContextMenu!({
      clientX: 760,
      clientY: 120,
      priceScaleMode: 'auto',
    });

    await waitFor(() => {
      expect(screen.getByText(/Auto \(fits data to screen\)/i)).toBeInTheDocument();
    });
  });
});
