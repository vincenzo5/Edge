/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useEffect } from 'react';
import ChartHeaderBar from './ChartHeaderBar';
import {
  ActiveChartProvider,
  useActiveChartBridge,
  type ActiveChartSnapshot,
} from '../ActiveChartContext';
import { DEFAULT_CELL } from '@/lib/chartConfig';
import { makeDrawingCommandsMock, makeDataWindowActionsMock, makeUICommandsMock, toActiveChartRegistration } from '@/test/activeChartMocks';
import { ShortcutUIProvider } from '../shortcuts/ShortcutUIContext';
import { DataHealthProvider } from '../data-health';

vi.mock('../MarketDataProvider', () => ({
  useMarketDataQuotes: () => ({
    quotesBySymbol: new Map(),
    quotesLoading: false,
    quoteError: null,
    quotesMeta: null,
    quotesTransport: 'rest',
    watchlistSymbolCount: 0,
    recoverySymbols: [],
    recoveryCandleRequests: [],
    recoveryOptionsSymbol: null,
    reloadToken: 0,
    reloadMarketData: vi.fn(),
  }),
}));

vi.mock('../SearchBar', () => ({
  default: ({ initial }: { initial: string }) => (
    <div data-testid="symbol-search-input">{initial}</div>
  ),
}));

vi.mock('./ChartIntervalMenu', () => ({
  default: ({ onChange }: { onChange: (v: string) => void }) => (
    <button type="button" data-testid="chart-interval-trigger" onClick={() => onChange('5m')}>
      D
    </button>
  ),
}));

vi.mock('./ChartTypeMenu', () => ({
  default: ({ onChange }: { onChange: (v: string) => void }) => (
    <button type="button" data-testid="chart-type-trigger" onClick={() => onChange('area')}>
      type
    </button>
  ),
}));

vi.mock('./ChartIndicatorFavoritesMenu', () => ({
  default: () => <button type="button" data-testid="indicator-favorites-trigger" />,
}));

vi.mock('./ChartTemplateMenu', () => ({
  default: () => <button type="button" data-testid="template-menu-trigger" />,
}));

vi.mock('./ChartLayoutMenu', () => ({
  default: () => (
    <>
      <button type="button" data-testid="layout-setup-trigger" />
      <button type="button" data-testid="layout-manage-trigger" />
    </>
  ),
}));

vi.mock('./ChartSnapshotMenu', () => ({
  default: () => <button type="button" data-testid="snapshot-trigger" />,
}));

vi.mock('./ChartFullscreenButton', () => ({
  default: () => <button type="button" data-testid="fullscreen-trigger" />,
}));

vi.mock('./ChartQuickSearchModal', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="quick-search-modal" /> : null,
}));

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

function makeSnapshot(overrides?: Partial<ActiveChartSnapshot>): ActiveChartSnapshot {
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
      canUndo: true,
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
      canUndo: true,
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
    ...overrides,
  };
}

function RegisterActiveChart({ snapshot }: { snapshot: ActiveChartSnapshot }) {
  const bridge = useActiveChartBridge();
  useEffect(() => {
    if (!bridge) return;
    bridge.register(snapshot.chartId, toActiveChartRegistration(snapshot));
    return () => bridge.unregister(snapshot.chartId);
  }, [bridge, snapshot]);
  return null;
}

const layoutActions = {
  onLayoutChange: vi.fn(),
  onLayoutSyncChange: vi.fn(),
};

const chartActions = {
  onSymbolSelect: vi.fn(),
  onIntervalChange: vi.fn(),
  onChartTypeChange: vi.fn(),
};

const baseProps = {
  layout: {
    layoutName: 'Default',
    layoutId: 'n1' as const,
    linkSymbol: false,
    linkInterval: false,
    linkCrosshair: false,
    linkDrawings: false,
    theme: 'dark' as const,
  },
  chart: {
    symbol: 'AAPL',
    interval: '1d' as const,
    chartType: 'candle_solid' as const,
    indicatorFavorites: [],
  },
  layoutActions,
  chartActions,
};

function renderHeader(
  snapshot?: ActiveChartSnapshot,
  density?: 'full' | 'compact' | 'minimal',
  symbolNav?: {
    canBack: boolean;
    canForward: boolean;
    onBack: () => void;
    onForward: () => void;
  },
) {
  const snap = snapshot ?? makeSnapshot();
  return render(
    <ShortcutUIProvider>
      <ActiveChartProvider>
        <DataHealthProvider>
          <RegisterActiveChart snapshot={snap} />
          <ChartHeaderBar {...baseProps} density={density} symbolNav={symbolNav} />
        </DataHealthProvider>
      </ActiveChartProvider>
    </ShortcutUIProvider>,
  );
}

describe('ChartHeaderBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a single chart header toolbar with layout and action controls', () => {
    renderHeader();

    expect(screen.getByRole('toolbar', { name: 'Chart header' })).toBeTruthy();
    expect(screen.getByTestId('layout-setup-trigger')).toBeTruthy();
    expect(screen.getByTestId('layout-manage-trigger')).toBeTruthy();
    expect(screen.getByTestId('symbol-search-input')).toHaveTextContent('AAPL');
    expect(screen.queryByTestId('options-chain-trigger')).toBeNull();
    expect(screen.queryByTestId('screener-trigger')).toBeNull();
    expect(screen.getByTestId('indicators-trigger')).toBeTruthy();
    expect(screen.getByTestId('settings-trigger')).toBeTruthy();
    expect(screen.queryByTestId('theme-toggle-trigger')).toBeNull();
    expect(screen.getByTestId('quick-search-trigger')).toBeTruthy();
    expect(screen.getByTestId('fullscreen-trigger')).toBeTruthy();
    expect(screen.getByTestId('snapshot-trigger')).toBeTruthy();
    expect(screen.getByTestId('replay-trigger')).toBeTruthy();
    expect(screen.getByTestId('undo-trigger')).toBeTruthy();
    expect(screen.getByTestId('redo-trigger')).toBeTruthy();

    expect(screen.getByTestId('layout-manage-trigger').nextElementSibling).toContainElement(
      screen.getByTestId('quick-search-trigger'),
    );
  });

  it('wires interval and chart type changes', () => {
    renderHeader();

    fireEvent.click(screen.getByTestId('chart-interval-trigger'));
    expect(chartActions.onIntervalChange).toHaveBeenCalledWith('5m');

    fireEvent.click(screen.getByTestId('chart-type-trigger'));
    expect(chartActions.onChartTypeChange).toHaveBeenCalledWith('area');
  });

  it('renders symbol history arrows immediately after ticker search', () => {
    const onBack = vi.fn();
    const onForward = vi.fn();
    renderHeader(makeSnapshot(), 'full', {
      canBack: true,
      canForward: false,
      onBack,
      onForward,
    });

    const search = screen.getByTestId('symbol-search-input');
    const arrows = screen.getByTestId('symbol-nav-arrows');
    expect(search.nextElementSibling).toBe(arrows);
    expect(screen.getByTestId('symbol-nav-back')).not.toBeDisabled();
    expect(screen.getByTestId('symbol-nav-forward')).toBeDisabled();

    fireEvent.click(screen.getByTestId('symbol-nav-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onForward).not.toHaveBeenCalled();
  });

  it('opens quick search modal', () => {
    renderHeader();

    expect(screen.queryByTestId('quick-search-modal')).toBeNull();
    fireEvent.click(screen.getByTestId('quick-search-trigger'));
    expect(screen.getByTestId('quick-search-modal')).toBeTruthy();
  });

  it('disables chart commands when no active chart is registered', () => {
    render(
      <ShortcutUIProvider>
        <ActiveChartProvider>
          <DataHealthProvider>
            <ChartHeaderBar {...baseProps} />
          </DataHealthProvider>
        </ActiveChartProvider>
      </ShortcutUIProvider>,
    );

    expect(screen.getByTestId('indicators-trigger')).toBeDisabled();
    expect(screen.queryByTestId('options-chain-trigger')).toBeNull();
    expect(screen.getByTestId('settings-trigger')).toBeDisabled();
    expect(screen.getByTestId('replay-trigger')).toBeDisabled();
  });

  it('calls active chart header commands', () => {
    const snapshot = makeSnapshot();
    renderHeader(snapshot);

    fireEvent.click(screen.getByTestId('indicators-trigger'));
    expect(snapshot.openIndicatorPicker).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('settings-trigger'));
    expect(snapshot.headerCommands.openSettings).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('replay-trigger'));
    expect(snapshot.headerCommands.toggleReplay).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('undo-trigger'));
    expect(snapshot.headerCommands.undo).toHaveBeenCalled();
  });

  it('shows More menu and hides tertiary controls in compact density', () => {
    renderHeader(makeSnapshot(), 'compact');

    expect(screen.getByTestId('header-more-trigger')).toBeTruthy();
    expect(screen.queryByTestId('replay-trigger')).toBeNull();
    expect(screen.queryByTestId('undo-trigger')).toBeNull();
    expect(screen.getByTestId('indicators-trigger')).toBeTruthy();
  });

  it('shows More menu and hides primary inline controls in minimal density', () => {
    renderHeader(makeSnapshot(), 'minimal');

    expect(screen.getByTestId('header-more-trigger')).toBeTruthy();
    expect(screen.queryByTestId('indicators-trigger')).toBeNull();
    expect(screen.queryByTestId('theme-toggle-trigger')).toBeNull();
    expect(screen.getByTestId('layout-setup-trigger')).toBeTruthy();
  });
});
