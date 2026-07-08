import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { DEFAULT_LAYOUT } from '@/lib/chartConfig';
import {
  createDefaultWorkspaceTabs,
  createTab,
  resetWorkspaceTabIdCounterForTests,
} from '@/lib/app/workspaceTabs';
import { WORKSPACE_TABS_STORAGE_KEY } from '@/lib/app/workspaceTabsStorage';
import StockApp from './StockApp';

const reconcileMock = vi.hoisted(() => ({
  reconcileChartWorkspacesAfterTabClose: vi.fn(async () => ({ archived: [], failed: [] })),
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

vi.mock('./ChartCell', () => ({
  default: ({ chartId, onFocus }: { chartId: string; onFocus?: () => void }) => (
    <div
      data-edge-chart={chartId}
      data-testid={`chart-${chartId}`}
      onPointerDown={() => onFocus?.()}
    />
  ),
}));

vi.mock('@/lib/persistence/sync/useWorkspaceTabsRemoteSync', () => ({
  useWorkspaceTabsRemoteSync: () => ({ flushActiveTabSave: async () => {} }),
}));

vi.mock('@/lib/persistence/sync/reconcileChartWorkspaces', () => ({
  reconcileChartWorkspacesAfterTabClose:
    reconcileMock.reconcileChartWorkspacesAfterTabClose,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

let flushHydrationFrame: (() => void) | null = null;

function flushHydration() {
  act(() => {
    flushHydrationFrame?.();
  });
}

beforeEach(() => {
  flushHydrationFrame = null;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    flushHydrationFrame = () => callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('StockApp', () => {
  beforeEach(() => {
    resetWorkspaceTabIdCounterForTests();
    localStorageMock.clear();
    reconcileMock.reconcileChartWorkspacesAfterTabClose.mockClear();
    document.documentElement.className = '';
  });

  it('shows hydration shell before layout is restored', async () => {
    render(<StockApp />);
    expect(screen.getByTestId('app-hydration-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-cell-0')).toBeNull();

    flushHydration();

    await waitFor(() => {
      expect(screen.getByTestId('chart-cell-0')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('app-hydration-shell')).toBeNull();
  });

  it('renders a single chart header, chart grid, and sidebar rail after hydration', async () => {
    render(<StockApp />);
    flushHydration();

    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: 'Chart header' })).toBeInTheDocument();
    });

    expect(screen.getAllByRole('toolbar', { name: 'Chart header' })).toHaveLength(1);
    expect(screen.getByTestId('chart-cell-0')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
    expect(screen.queryByText(/Stock Charts/i)).toBeNull();
  });

  it('applies theme class to html element after hydration', async () => {
    document.documentElement.classList.add('custom-root-class');
    render(<StockApp />);
    flushHydration();
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
    expect(document.documentElement.classList.contains('custom-root-class')).toBe(true);
  });

  it('applies persisted light theme and removes dark class', async () => {
    document.documentElement.classList.add('dark', 'custom-root-class');
    localStorageMock.setItem(
      'tv-ai:layout:v1',
      JSON.stringify({ ...DEFAULT_LAYOUT, theme: 'light' }),
    );
    render(<StockApp />);
    flushHydration();
    await waitFor(() => {
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
    expect(document.documentElement.classList.contains('custom-root-class')).toBe(true);
  });

  it('falls back to dark for invalid persisted theme without adding invalid class', async () => {
    localStorageMock.setItem(
      'tv-ai:layout:v1',
      JSON.stringify({ ...DEFAULT_LAYOUT, theme: 'neon' }),
    );
    render(<StockApp />);
    flushHydration();
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('neon')).toBe(false);
    });
  });

  it('renders one header in multi-cell layout', async () => {
    localStorageMock.setItem(
      'tv-ai:layout:v1',
      JSON.stringify({
        version: 1,
        gridMode: '2x1',
        linked: false,
        activeCellIndex: 0,
        theme: 'dark',
        cells: [
          { symbol: 'AAPL', range: '1y', interval: '1d', chartType: 'candle_solid', indicators: [], drawings: [] },
          { symbol: 'MSFT', range: '1y', interval: '1d', chartType: 'candle_solid', indicators: [], drawings: [] },
        ],
      }),
    );

    render(<StockApp />);
    flushHydration();

    await waitFor(() => {
      expect(screen.getByTestId('chart-cell-0')).toBeInTheDocument();
      expect(screen.getByTestId('chart-cell-1')).toBeInTheDocument();
    });

    expect(screen.getAllByRole('toolbar', { name: 'Chart header' })).toHaveLength(1);
  });

  it('updates header symbol when active cell changes', async () => {
    localStorageMock.setItem(
      'tv-ai:layout:v1',
      JSON.stringify({
        version: 1,
        gridMode: '2x1',
        linked: false,
        activeCellIndex: 0,
        theme: 'dark',
        cells: [
          { symbol: 'AAPL', range: '1y', interval: '1d', chartType: 'candle_solid', indicators: [], drawings: [] },
          { symbol: 'MSFT', range: '1y', interval: '1d', chartType: 'candle_solid', indicators: [], drawings: [] },
        ],
      }),
    );

    render(<StockApp />);
    flushHydration();

    await waitFor(() => {
      expect(screen.getByTestId('symbol-search-input')).toHaveValue('AAPL');
    });

    fireEvent.pointerDown(screen.getByTestId('chart-cell-1'));

    await waitFor(() => {
      expect(screen.getByTestId('symbol-search-input')).toHaveValue('MSFT');
    });
  });

  it('does not flash default symbol before persisted layout hydrates', async () => {
    localStorageMock.setItem(
      'tv-ai:layout:v1',
      JSON.stringify({
        ...DEFAULT_LAYOUT,
        cells: [{ ...DEFAULT_LAYOUT.cells[0], symbol: 'MSFT' }],
      }),
    );

    render(<StockApp />);
    expect(screen.getByTestId('app-hydration-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('symbol-search-input')).toBeNull();

    flushHydration();

    await waitFor(() => {
      expect(screen.getByTestId('symbol-search-input')).toHaveValue('MSFT');
    });
    expect(screen.queryByTestId('symbol-search-input')).not.toHaveValue('AAPL');
  });

  it('persists workspace tabs to localStorage and renders tab bar', async () => {
    render(<StockApp />);
    flushHydration();

    await waitFor(() => {
      expect(screen.getByTestId('workspace-tab-bar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('workspace-tab-create'));

    await waitFor(() => {
      const raw = localStorageMock.getItem('tv-ai:workspace-tabs:v1');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.tabs.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('saves a closed remote tab immediately so refresh does not restore it', async () => {
    let tabs = createDefaultWorkspaceTabs(DEFAULT_LAYOUT, {
      resourceId: 'ws-1',
      syncRevision: 1,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    tabs = createTab(tabs, {
      id: 'tab-2',
      title: 'Apple',
      layout: {
        ...DEFAULT_LAYOUT,
        cells: [{ ...DEFAULT_LAYOUT.cells[0], symbol: 'AAPL' }],
      },
      remote: {
        resourceId: 'ws-2',
        syncRevision: 1,
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    });
    localStorageMock.setItem(WORKSPACE_TABS_STORAGE_KEY, JSON.stringify(tabs));

    render(<StockApp />);
    flushHydration();

    await waitFor(() => {
      expect(screen.getByTestId('workspace-tab-close-tab-2')).toBeInTheDocument();
    });

    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(screen.getByTestId('workspace-tab-close-tab-2'));
      await Promise.resolve();
    });

    const raw = localStorageMock.getItem(WORKSPACE_TABS_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const saved = JSON.parse(raw!);
    expect(saved.tabs).toHaveLength(1);
    expect(saved.tabs[0].remote.resourceId).toBe('ws-1');
    expect(
      saved.tabs.some(
        (tab: { remote?: { resourceId?: string } }) =>
          tab.remote?.resourceId === 'ws-2',
      ),
    ).toBe(false);
    expect(reconcileMock.reconcileChartWorkspacesAfterTabClose).toHaveBeenCalledWith(
      expect.objectContaining({
        tabs: expect.arrayContaining([expect.objectContaining({ title: 'Default' })]),
      }),
      'ws-2',
    );
  });

  it('expands layout by cloning the active cell into new panes', async () => {
    const tabs = createDefaultWorkspaceTabs({
      ...DEFAULT_LAYOUT,
      layoutId: 'n1',
      cells: [
        {
          ...DEFAULT_LAYOUT.cells[0],
          symbol: 'XLF',
          symbolName: 'Financial Services sector',
        },
      ],
    });
    localStorageMock.setItem(WORKSPACE_TABS_STORAGE_KEY, JSON.stringify(tabs));

    render(<StockApp />);
    flushHydration();

    await waitFor(() => {
      expect(screen.getByTestId('symbol-search-input')).toHaveValue('XLF');
    });
    expect(screen.queryByTestId('chart-cell-1')).toBeNull();

    fireEvent.click(screen.getByTestId('layout-setup-trigger'));
    fireEvent.click(screen.getByTestId('layout-template-n2-cols'));

    await waitFor(() => {
      expect(screen.getByTestId('chart-cell-1')).toBeInTheDocument();
    });
    expect(screen.getByTestId('symbol-search-input')).toHaveValue('XLF');
  });
});
