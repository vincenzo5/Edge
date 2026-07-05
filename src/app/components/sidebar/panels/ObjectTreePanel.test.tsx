import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useEffect } from 'react';
import { ObjectTreePanel } from './ObjectTreePanel';
import {
  ActiveChartProvider,
  useActiveChartBridge,
  type ActiveChartSnapshot,
} from '../../ActiveChartContext';
import { DEFAULT_CELL, DEFAULT_TOOLBAR_PREFS, type TrackedOverlay } from '@/lib/chartConfig';
import {
  makeDrawingCommandsMock,
  makeDrawingToolbarActionsMock,
  makeDrawingToolbarStateMock,
  makeDataWindowActionsMock,
  makeUICommandsMock,
  toActiveChartRegistration,
} from '@/test/activeChartMocks';
import type { Candle } from '@/lib/chart/contracts';
import { AppActionsProvider } from '../../AppActionsContext';
import type { ChartLayout } from '@/lib/chartConfig';

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

const defaultHeaderCommands = {
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
};

function makeSnapshot(overrides?: Partial<ActiveChartSnapshot>): ActiveChartSnapshot {
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
      chartSettings: DEFAULT_CELL.chartSettings,
      mainSeriesVisible: true,
    },
    overlayActions,
    dataWindowActions: makeDataWindowActionsMock(),
    onConfigChange: vi.fn(),
    openIndicatorPicker: vi.fn(),
    headerCommands: defaultHeaderCommands,
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
    drawingToolbarState: makeDrawingToolbarStateMock(),
    drawingToolbarActions: makeDrawingToolbarActionsMock(),
    uiCommands: makeUICommandsMock(),
    ...overrides,
  };
}

function makeLayout(overrides?: Partial<ChartLayout>): ChartLayout {
  return {
    layoutId: 'n2-cols',
    cells: [
      { ...DEFAULT_CELL, symbol: 'AAPL' },
      { ...DEFAULT_CELL, symbol: 'MSFT' },
    ],
    activeCellIndex: 0,
    theme: 'dark',
    linkSymbol: false,
    linkInterval: false,
    linkCrosshair: true,
    linkDrawings: false,
    toolbarPrefs: DEFAULT_TOOLBAR_PREFS,
    ...overrides,
  } as ChartLayout;
}

function makeAppActions(layout: ChartLayout) {
  return {
    getLayout: () => layout,
    isHydrated: () => true,
    applyCellUpdate: vi.fn(),
    patchActiveCell: vi.fn(),
    setActiveCellIndex: vi.fn(),
    setLayoutId: vi.fn(),
    setGridMode: vi.fn(),
    setLayoutSync: vi.fn(),
    setTheme: vi.fn(),
    setSidebarPanel: vi.fn(),
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

describe('ObjectTreePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('renders OHLC values on the Data window tab', () => {
    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <ObjectTreePanel />
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Data window' }));
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('AAPL · 1d')).toBeInTheDocument();
  });

  it('does not render a Volume section until VOL is added to the chart', () => {
    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <ObjectTreePanel />
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Data window' }));
    expect(screen.queryByText('Volume')).not.toBeInTheDocument();
  });

  it('renders all value rows for an added indicator on the Data window tab', () => {
    const snapshot = makeSnapshot({
      dataWindow: {
        ...makeSnapshot().dataWindow,
        indicators: [
          {
            id: 'boll1',
            name: 'BOLL',
            pane: 'main',
            params: { period: 2, std: 1 },
            visible: true,
          },
        ],
      },
    });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={snapshot} />
        <ObjectTreePanel />
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Data window' }));
    expect(screen.getByText('Upper')).toBeInTheDocument();
    expect(screen.getByText('Middle')).toBeInTheDocument();
    expect(screen.getByText('Lower')).toBeInTheDocument();
    expect(screen.getByText('11.5')).toBeInTheDocument();
  });

  it('keeps an added Volume section collapsed when VOL is hidden', () => {
    const snapshot = makeSnapshot({
      dataWindow: {
        ...makeSnapshot().dataWindow,
        indicators: [
          {
            id: 'vol1',
            name: 'VOL',
            pane: 'sub',
            params: {},
            visible: false,
          },
        ],
      },
    });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={snapshot} />
        <ObjectTreePanel />
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Data window' }));
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByTitle('Show volume')).toBeInTheDocument();
  });

  it('switches tabs and persists active tab in localStorage', () => {
    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <ObjectTreePanel />
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Data window' }));
    expect(window.localStorage.getItem('tv-ai:object-panel-tab:cell-0')).toBe('data-window');

    fireEvent.click(screen.getByRole('tab', { name: 'Object tree' }));
    expect(screen.getByText('AAPL · 1d')).toBeInTheDocument();
    expect(window.localStorage.getItem('tv-ai:object-panel-tab:cell-0')).toBe('object-tree');
  });

  it('shows drawing rows on the Object tree tab', () => {
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
    const snapshot = makeSnapshot({
      overlays,
      config: {
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
      },
    });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={snapshot} />
        <ObjectTreePanel />
      </ActiveChartProvider>,
    );

    expect(screen.getByText('Trend')).toBeInTheDocument();
    expect(screen.getByText('H-Line')).toBeInTheDocument();
    expect(screen.getByText('RSI')).toBeInTheDocument();
  });

  it('drawing row actions call overlay actions', () => {
    const overlays: TrackedOverlay[] = [
      {
        id: 'd1',
        name: 'trend_line',
        label: 'My trend',
        visible: true,
        locked: false,
        zLevel: 0,
        paneId: 'price',
      },
    ];
    const snapshot = makeSnapshot({ overlays });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={snapshot} />
        <ObjectTreePanel />
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByTitle('Hide drawing'));
    expect(overlayActions.setVisible).toHaveBeenCalledWith('d1', false);

    fireEvent.click(screen.getByTitle('Lock drawing'));
    expect(overlayActions.setLocked).toHaveBeenCalledWith('d1', true);

    fireEvent.click(screen.getByTitle('Remove drawing'));
    expect(overlayActions.remove).toHaveBeenCalledWith('d1');
  });

  it('indicator eye toggles onConfigChange', () => {
    const onConfigChange = vi.fn();
    const snapshot = makeSnapshot({
      onConfigChange,
      config: {
        ...DEFAULT_CELL,
        indicators: [
          {
            id: 'ma1',
            name: 'MA',
            pane: 'main',
            params: { period: 20 },
            visible: true,
          },
        ],
      },
    });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={snapshot} />
        <ObjectTreePanel />
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByTitle('Hide indicator'));
    expect(onConfigChange).toHaveBeenCalled();
    const next = onConfigChange.mock.calls[0][0];
    expect(next.indicators[0].visible).toBe(false);
  });

  it('data window section eye calls dataWindowActions', () => {
    const setPriceVisible = vi.fn();
    const snapshot = makeSnapshot({
      dataWindowActions: makeDataWindowActionsMock({ setPriceVisible }),
    });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={snapshot} />
        <ObjectTreePanel />
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Data window' }));
    fireEvent.click(screen.getByTitle('Hide price series'));
    expect(setPriceVisible).toHaveBeenCalledWith(false);
  });

  it('lists all panes in multi-pane layouts', () => {
    const layout = makeLayout();

    render(
      <AppActionsProvider value={makeAppActions(layout)}>
        <ActiveChartProvider>
          <SeedSnapshot snapshot={makeSnapshot()} />
          <ObjectTreePanel />
        </ActiveChartProvider>
      </AppActionsProvider>,
    );

    expect(screen.getByText(/AAPL/)).toBeInTheDocument();
    expect(screen.getByText(/MSFT/)).toBeInTheDocument();
  });

  it('focuses pane when pane header is clicked in multi-pane layout', () => {
    const layout = makeLayout();
    const setActiveCellIndex = vi.fn();
    const appActions = { ...makeAppActions(layout), setActiveCellIndex };

    render(
      <AppActionsProvider value={appActions}>
        <ActiveChartProvider>
          <SeedSnapshot snapshot={makeSnapshot()} />
          <ObjectTreePanel />
        </ActiveChartProvider>
      </AppActionsProvider>,
    );

    fireEvent.click(screen.getByText(/MSFT/));
    expect(setActiveCellIndex).toHaveBeenCalledWith(1);
  });

  it('updates inactive pane indicators through applyCellUpdate', () => {
    const layout = makeLayout({
      cells: [
        {
          ...DEFAULT_CELL,
          symbol: 'AAPL',
          indicators: [
            {
              id: 'ma1',
              name: 'MA',
              pane: 'main',
              params: { period: 20 },
              visible: true,
            },
          ],
        },
        {
          ...DEFAULT_CELL,
          symbol: 'MSFT',
          indicators: [
            {
              id: 'ma2',
              name: 'MA',
              pane: 'main',
              params: { period: 20 },
              visible: true,
            },
          ],
        },
      ],
    });
    const applyCellUpdate = vi.fn();
    const appActions = { ...makeAppActions(layout), applyCellUpdate };

    render(
      <AppActionsProvider value={appActions}>
        <ActiveChartProvider>
          <SeedSnapshot snapshot={makeSnapshot()} />
          <ObjectTreePanel />
        </ActiveChartProvider>
      </AppActionsProvider>,
    );

    fireEvent.click(screen.getByText(/MSFT/));
    const hideButtons = screen.getAllByTitle('Hide indicator');
    fireEvent.click(hideButtons[hideButtons.length - 1]!);

    expect(applyCellUpdate).toHaveBeenCalledWith(1, expect.objectContaining({
      indicators: [expect.objectContaining({ id: 'ma2', visible: false })],
    }));
  });
});
