import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { WatchlistPanel } from './WatchlistPanel';
import { ChartActionsProvider } from '../ChartActionsContext';
import { WatchlistProvider } from './WatchlistContext';
import { clearWatchlistStorage, loadWatchlistState, saveWatchlistState } from '@/lib/watchlist/storage';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const loadSymbolIntoActiveChart = vi.fn();

function renderPanel() {
  return render(
    <ChartActionsProvider
      activeCellSymbol="AAPL"
      loadSymbolIntoActiveChart={loadSymbolIntoActiveChart}
    >
      <WatchlistProvider>
        <WatchlistPanel />
      </WatchlistProvider>
    </ChartActionsProvider>,
  );
}

function openWatchlistMenu() {
  fireEvent.click(screen.getByTestId('watchlist-list-menu-trigger'));
  expect(screen.getByTestId('watchlist-list-menu')).toBeInTheDocument();
}

async function addSymbolFromSearch(symbol = 'MSFT') {
  fireEvent.click(screen.getByTestId('watchlist-add-symbol-trigger'));
  const input = screen.getByLabelText('Search symbols to add');
  fireEvent.change(input, { target: { value: symbol } });
  await waitFor(() => {
    expect(screen.getByRole('option', { name: new RegExp(symbol, 'i') })).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole('option', { name: new RegExp(symbol, 'i') }));
  await waitFor(() => {
    expect(screen.getByTestId(`watchlist-row-${symbol}`)).toBeInTheDocument();
  });
}

describe('WatchlistPanel', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearWatchlistStorage();
    loadSymbolIntoActiveChart.mockClear();
    vi.stubEnv('NEXT_PUBLIC_WATCHLIST_STREAM', '0');
    vi.stubGlobal('confirm', vi.fn(() => false));
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/search')) {
          return {
            ok: true,
            json: async () => ({
              results: [
                { symbol: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ' },
                { symbol: 'AAPL', name: 'Apple', exchange: 'NASDAQ' },
              ],
            }),
          } as Response;
        }
        if (url.includes('/api/quotes')) {
          return {
            ok: true,
            json: async () => ({
              quotes: [
                {
                  symbol: 'MSFT',
                  regularMarketPrice: 400,
                  regularMarketChange: 2,
                  regularMarketChangePercent: 0.5,
                  regularMarketVolume: 1000,
                  updatedAt: Date.now(),
                },
                {
                  symbol: 'AAPL',
                  regularMarketPrice: 180,
                  regularMarketChange: 1,
                  regularMarketChangePercent: 0.2,
                  regularMarketVolume: 2000,
                  updatedAt: Date.now(),
                },
              ],
            }),
          } as Response;
        }
        if (url.includes('/api/fundamentals')) {
          const symbol = new URL(String(input), 'http://localhost').searchParams.get('symbol') ?? 'MSFT';
          return {
            ok: true,
            json: async () => ({
              symbol,
              shortName: symbol,
              longName: `${symbol} Corporation`,
              exchange: 'NASDAQ',
              currency: 'USD',
              regularMarketPrice: 400,
              regularMarketChange: 2,
              regularMarketChangePercent: 0.5,
              marketCap: 3e12,
              volume: 2e7,
              averageVolume: 1.5e7,
              sector: symbol === 'XOM' ? 'Energy' : 'Technology',
              industry: 'Software',
              website: `${symbol.toLowerCase()}.com`,
              description: `${symbol} builds software.`,
              updatedAt: Date.now(),
            }),
          } as Response;
        }
        return { ok: false, json: async () => ({ error: 'not found' }) } as Response;
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders without active chart context', () => {
    render(
      <WatchlistProvider>
        <WatchlistPanel />
      </WatchlistProvider>,
    );
    expect(screen.getByTestId('watchlist-panel')).toBeInTheDocument();
  });

  it('hydrates saved watchlists after mount', async () => {
    saveWatchlistState({
      version: 1,
      activeWatchlistId: 'trinity',
      selectedSymbol: 'IBM',
      watchlists: [
        {
          id: 'trinity',
          name: 'Trinity Trading Partners',
          items: [
            {
              symbol: 'IBM',
              addedAt: 1782263705255,
            },
          ],
          createdAt: 1782263558025,
          updatedAt: 1782263705255,
        },
      ],
    });

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId('watchlist-active-name')).toHaveTextContent(
        'Trinity Trading Partners',
      );
    });
    expect(screen.getByTestId('watchlist-row-IBM')).toHaveAttribute('data-selected', 'true');
  });

  it('adds symbol from search and selects it', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('watchlist-add-symbol-trigger'));
    const input = screen.getByLabelText('Search symbols to add');
    fireEvent.change(input, { target: { value: 'MSFT' } });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /MSFT/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('option', { name: /MSFT/i }));

    await waitFor(() => {
      expect(screen.getByTestId('watchlist-row-MSFT')).toBeInTheDocument();
    });
    expect(screen.getByTestId('watchlist-row-MSFT')).toHaveAttribute('data-selected', 'true');
  });

  it('loads chart when a watchlist row is clicked', async () => {
    renderPanel();
    await addSymbolFromSearch('MSFT');

    loadSymbolIntoActiveChart.mockClear();
    fireEvent.click(screen.getByTestId('watchlist-row-MSFT'));
    expect(loadSymbolIntoActiveChart).toHaveBeenCalledWith({
      symbol: 'MSFT',
      name: 'Microsoft',
      exchange: 'NASDAQ',
    });
    expect(screen.getByTestId('watchlist-row-MSFT')).toHaveAttribute('data-selected', 'true');
  });

  it('removes a symbol from the hover trash action without loading the chart', async () => {
    renderPanel();
    await addSymbolFromSearch('MSFT');

    loadSymbolIntoActiveChart.mockClear();
    fireEvent.click(screen.getByLabelText('Remove MSFT from watchlist'));

    await waitFor(() => {
      expect(screen.queryByTestId('watchlist-row-MSFT')).not.toBeInTheDocument();
    });
    expect(loadSymbolIntoActiveChart).not.toHaveBeenCalled();
  });

  it('shows fundamentals for selected symbol', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('watchlist-add-symbol-trigger'));
    const input = screen.getByLabelText('Search symbols to add');
    fireEvent.change(input, { target: { value: 'MSFT' } });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /MSFT/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: /MSFT/i }));

    await waitFor(() => {
      expect(screen.getByTestId('symbol-details-panel')).toBeInTheDocument();
    });
    expect(screen.getByText('MSFT Corporation')).toBeInTheDocument();
  });

  it('shows empty state when watchlist has no symbols', () => {
    renderPanel();
    expect(
      screen.getByText(/No symbols yet/i),
    ).toBeInTheDocument();
  });

  it('creates a new watchlist and switches the header', async () => {
    vi.stubGlobal('prompt', vi.fn(() => 'Growth'));
    renderPanel();
    openWatchlistMenu();
    fireEvent.click(screen.getByTestId('watchlist-create-list'));

    await waitFor(() => {
      expect(screen.getByTestId('watchlist-active-name')).toHaveTextContent('Growth');
    });
    expect(screen.getByText(/No symbols yet/i)).toBeInTheDocument();
  });

  it('keeps symbols independent when switching watchlists', async () => {
    vi.stubGlobal('prompt', vi.fn(() => 'Growth'));
    renderPanel();
    await addSymbolFromSearch('MSFT');

    openWatchlistMenu();
    fireEvent.click(screen.getByTestId('watchlist-create-list'));
    await waitFor(() => {
      expect(screen.getByTestId('watchlist-active-name')).toHaveTextContent('Growth');
    });
    expect(screen.queryByTestId('watchlist-row-MSFT')).not.toBeInTheDocument();

    const defaultListId = loadWatchlistState().watchlists.find((w) => w.name === 'Watchlist')!.id;
    openWatchlistMenu();
    fireEvent.click(screen.getByTestId('watchlist-open-list'));
    fireEvent.click(screen.getByTestId(`watchlist-switch-${defaultListId}`));

    await waitFor(() => {
      expect(screen.getByTestId('watchlist-active-name')).toHaveTextContent('Watchlist');
    });
    expect(screen.getByTestId('watchlist-row-MSFT')).toBeInTheDocument();
  });

  it('renames the active watchlist', async () => {
    vi.stubGlobal('prompt', vi.fn(() => 'Momentum'));
    renderPanel();
    openWatchlistMenu();
    fireEvent.click(screen.getByTestId('watchlist-rename-list'));

    await waitFor(() => {
      expect(screen.getByTestId('watchlist-active-name')).toHaveTextContent('Momentum');
    });
  });

  it('duplicates the active watchlist with copied symbols', async () => {
    renderPanel();
    await addSymbolFromSearch('MSFT');

    openWatchlistMenu();
    fireEvent.click(screen.getByTestId('watchlist-duplicate-list'));

    await waitFor(() => {
      expect(screen.getByTestId('watchlist-active-name')).toHaveTextContent('Watchlist Copy');
    });
    expect(screen.getByTestId('watchlist-row-MSFT')).toBeInTheDocument();
  });

  it('clears symbols from the active watchlist', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    renderPanel();
    await addSymbolFromSearch('MSFT');

    openWatchlistMenu();
    fireEvent.click(screen.getByTestId('watchlist-clear-list'));

    await waitFor(() => {
      expect(screen.queryByTestId('watchlist-row-MSFT')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/No symbols yet/i)).toBeInTheDocument();
  });

  it('deletes the active watchlist when more than one exists', async () => {
    vi.stubGlobal('prompt', vi.fn(() => 'Growth'));
    vi.stubGlobal('confirm', vi.fn(() => true));
    renderPanel();

    openWatchlistMenu();
    fireEvent.click(screen.getByTestId('watchlist-create-list'));
    await waitFor(() => {
      expect(screen.getByTestId('watchlist-active-name')).toHaveTextContent('Growth');
    });

    openWatchlistMenu();
    fireEvent.click(screen.getByTestId('watchlist-delete-list'));

    await waitFor(() => {
      expect(screen.getByTestId('watchlist-active-name')).toHaveTextContent('Watchlist');
    });
  });

  it('renders organization controls and pins a symbol', async () => {
    renderPanel();
    await addSymbolFromSearch('MSFT');

    expect(screen.getByTestId('watchlist-controls')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Pin MSFT'));
    await waitFor(() => {
      expect(screen.getByTestId('watchlist-row-MSFT')).toHaveAttribute('data-pinned', 'true');
    });
  });

  it('adds tags from the row action and filters by tag', async () => {
    vi.stubGlobal('prompt', vi.fn(() => 'Tech, AI'));
    renderPanel();
    await addSymbolFromSearch('MSFT');

    fireEvent.click(screen.getByLabelText('Edit tags for MSFT'));
    await waitFor(() => {
      expect(screen.getByTestId('watchlist-filter-Tech')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('watchlist-filter-Tech'));
    expect(screen.getByTestId('watchlist-row-MSFT')).toBeInTheDocument();
  });

  it('edits a symbol note in the details panel', async () => {
    renderPanel();
    await addSymbolFromSearch('MSFT');

    const note = screen.getByTestId('watchlist-symbol-note');
    fireEvent.change(note, { target: { value: 'Watch breakout above 420' } });
    expect(note).toHaveValue('Watch breakout above 420');
  });

  it('sorts from table header clicks', async () => {
    renderPanel();
    await addSymbolFromSearch('MSFT');

    expect(screen.queryByText(/^Sort$/)).not.toBeInTheDocument();
    const changeHeader = screen.getByTestId('watchlist-sort-changePct');
    fireEvent.click(changeHeader);
    expect(changeHeader).toHaveAttribute('aria-pressed', 'true');
    expect(changeHeader.textContent).toMatch(/[↑↓]/);
  });

  it('shows missing-context message when watchlist provider is absent', () => {
    render(
      <ChartActionsProvider
        activeCellSymbol="AAPL"
        loadSymbolIntoActiveChart={loadSymbolIntoActiveChart}
      >
        <WatchlistPanel />
      </ChartActionsProvider>,
    );

    expect(screen.getByTestId('watchlist-panel-missing-context')).toHaveTextContent(
      /Watchlist unavailable/i,
    );
  });

  it('shows quote error alert when quote fetch fails', async () => {
    saveWatchlistState({
      version: 1,
      activeWatchlistId: 'default-watchlist',
      selectedSymbol: null,
      watchlists: [
        {
          id: 'default-watchlist',
          name: 'Watchlist',
          items: [{ symbol: 'MSFT', addedAt: Date.now() }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/quotes')) {
          return {
            ok: false,
            json: async () => ({ error: 'Quotes unavailable' }),
          } as Response;
        }
        if (url.includes('/api/me/watchlist-library')) {
          return { ok: false, status: 503, json: async () => ({ error: 'offline' }) } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      }),
    );

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId('watchlist-panel')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Quotes unavailable');
    });
  });

  it('shows fundamentals error when details fetch fails', async () => {
    saveWatchlistState({
      version: 1,
      activeWatchlistId: 'default-watchlist',
      selectedSymbol: 'MSFT',
      watchlists: [
        {
          id: 'default-watchlist',
          name: 'Watchlist',
          items: [{ symbol: 'MSFT', addedAt: Date.now() }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/fundamentals')) {
          return {
            ok: false,
            json: async () => ({ error: 'Fundamentals unavailable' }),
          } as Response;
        }
        if (url.includes('/api/quotes')) {
          return {
            ok: true,
            json: async () => ({
              quotes: [
                {
                  symbol: 'MSFT',
                  regularMarketPrice: 420,
                  regularMarketChange: 1,
                  regularMarketChangePercent: 0.2,
                  regularMarketVolume: 1000,
                  updatedAt: Date.now(),
                },
              ],
            }),
          } as Response;
        }
        if (url.includes('/api/me/watchlist-library')) {
          return { ok: false, status: 503, json: async () => ({ error: 'offline' }) } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      }),
    );

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId('watchlist-panel')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('symbol-details-error')).toHaveTextContent('Fundamentals unavailable');
    });
  });
});
