import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StockApp from './StockApp';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => {
      store[k] = v;
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

describe('StockApp', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('renders a single chart header, chart grid, and sidebar rail', async () => {
    render(<StockApp />);

    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: 'Chart header' })).toBeInTheDocument();
    });

    expect(screen.getAllByRole('toolbar', { name: 'Chart header' })).toHaveLength(1);
    expect(screen.getByTestId('chart-cell-0')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
    expect(screen.queryByText(/Stock Charts/i)).toBeNull();
  });

  it('applies theme class to html element after hydration', async () => {
    render(<StockApp />);
    await waitFor(() => {
      expect(document.documentElement.className).toMatch(/dark|light/);
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

    await waitFor(() => {
      expect(screen.getByTestId('symbol-search-input')).toHaveValue('AAPL');
    });

    fireEvent.pointerDown(screen.getByTestId('chart-cell-1'));

    await waitFor(() => {
      expect(screen.getByTestId('symbol-search-input')).toHaveValue('MSFT');
    });
  });
});
