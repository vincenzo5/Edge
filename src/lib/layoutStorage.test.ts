import { describe, it, expect, beforeEach } from 'vitest';
import { migrateCellIndicators, legacyIndicatorKey, DEFAULT_LAYOUT, type CellConfig } from '@/lib/chartConfig';
import { mergeChartSettings } from '@/lib/chart/chartSettings';
import { loadLayout, saveLayout } from '@/lib/layoutStorage';

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

describe('loadLayout sidebar prefs', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('defaults sidebar when missing from saved layout', () => {
    saveLayout({ ...DEFAULT_LAYOUT, sidebar: undefined });
    const loaded = loadLayout();
    expect(loaded.sidebar).toEqual({ activePanel: null });
  });

  it('round-trips sidebar.activePanel', () => {
    saveLayout({
      ...DEFAULT_LAYOUT,
      sidebar: { activePanel: 'object-tree' },
    });
    const loaded = loadLayout();
    expect(loaded.sidebar?.activePanel).toBe('object-tree');
  });

  it('round-trips chartSettings priceScaleType and crosshairMode', () => {
    saveLayout({
      ...DEFAULT_LAYOUT,
      cells: [
        {
          ...DEFAULT_LAYOUT.cells[0],
          chartSettings: {
            scales: { priceScaleType: 'log' },
            canvas: { crosshairMode: 'dot' },
          },
        },
      ],
    });
    const loaded = loadLayout();
    const merged = mergeChartSettings(loaded.cells[0].chartSettings);
    expect(merged.scales.priceScaleType).toBe('log');
    expect(merged.canvas.crosshairMode).toBe('dot');
  });

  it('migrates legacy flat chartSettings on load', () => {
    saveLayout({
      ...DEFAULT_LAYOUT,
      cells: [
        {
          ...DEFAULT_LAYOUT.cells[0],
          chartSettings: { priceScaleType: 'log', crosshairMode: 'dot' },
        },
      ],
    });
    const loaded = loadLayout();
    const merged = mergeChartSettings(loaded.cells[0].chartSettings);
    expect(merged.scales.priceScaleType).toBe('log');
    expect(merged.canvas.crosshairMode).toBe('dot');
  });

  it('round-trips chartSettings timeZone', () => {
    saveLayout({
      ...DEFAULT_LAYOUT,
      cells: [
        {
          ...DEFAULT_LAYOUT.cells[0],
          chartSettings: { timeZone: 'America/Chicago' },
        },
      ],
    });
    const loaded = loadLayout();
    const merged = mergeChartSettings(loaded.cells[0].chartSettings);
    expect(merged.symbol.timeZone).toBe('America/Chicago');
  });

  it('accepts watchlist sidebar panel id', () => {
    localStorageMock.setItem(
      'tv-ai:layout:v1',
      JSON.stringify({
        ...DEFAULT_LAYOUT,
        sidebar: { activePanel: 'watchlist' },
      }),
    );
    const loaded = loadLayout();
    expect(loaded.sidebar?.activePanel).toBe('watchlist');
  });

  it('rejects invalid sidebar panel ids', () => {
    localStorageMock.setItem(
      'tv-ai:layout:v1',
      JSON.stringify({
        ...DEFAULT_LAYOUT,
        sidebar: { activePanel: 'unknown-panel' },
      }),
    );
    const loaded = loadLayout();
    expect(loaded.sidebar?.activePanel).toBeNull();
  });

  it('round-trips shared sidebar width', () => {
    saveLayout({
      ...DEFAULT_LAYOUT,
      sidebar: {
        activePanel: 'watchlist',
        width: 420,
      },
    });
    const loaded = loadLayout();
    expect(loaded.sidebar?.width).toBe(420);
  });

  it('migrates legacy options active panel to null on load', () => {
    saveLayout({
      ...DEFAULT_LAYOUT,
      sidebar: {
        activePanel: 'options',
        width: 420,
      },
    });
    const loaded = loadLayout();
    expect(loaded.sidebar?.activePanel).toBeNull();
    expect(loaded.sidebar?.width).toBe(420);
  });

  it('migrates legacy per-panel widths to shared width on load', () => {
    localStorageMock.setItem(
      'tv-ai:layout:v1',
      JSON.stringify({
        ...DEFAULT_LAYOUT,
        sidebar: {
          activePanel: 'options',
          panelWidths: { options: 420, watchlist: 700 },
        },
      }),
    );
    const loaded = loadLayout();
    expect(loaded.sidebar?.width).toBe(420);
    expect(loaded.sidebar?.activePanel).toBeNull();
  });

  it('preserves drawing metadata through loadLayout', () => {
    localStorageMock.setItem(
      'tv-ai:layout:v1',
      JSON.stringify({
        ...DEFAULT_LAYOUT,
        cells: [
          {
            ...DEFAULT_LAYOUT.cells[0],
            drawings: [
              {
                id: 'd1',
                name: 'horizontal_line',
                label: 'Stop',
                points: [{ value: 170 }],
                visible: true,
                locked: false,
                zLevel: 0,
                metadata: {
                  kind: 'invalidation',
                  status: 'active',
                  source: 'user',
                  rationale: 'Daily close below',
                },
              },
            ],
          },
        ],
      }),
    );
    const loaded = loadLayout();
    expect(loaded.cells[0]?.drawings[0]?.metadata?.kind).toBe('invalidation');
  });
});

describe('loadLayout theme validation', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('round-trips a valid light theme', () => {
    saveLayout({ ...DEFAULT_LAYOUT, theme: 'light' });
    expect(loadLayout().theme).toBe('light');
  });

  it('round-trips a valid dark theme', () => {
    saveLayout({ ...DEFAULT_LAYOUT, theme: 'dark' });
    expect(loadLayout().theme).toBe('dark');
  });

  it('defaults to dark when theme is missing', () => {
    localStorageMock.setItem(
      'tv-ai:layout:v1',
      JSON.stringify({
        ...DEFAULT_LAYOUT,
        theme: undefined,
      }),
    );
    expect(loadLayout().theme).toBe('dark');
  });

  it('coerces invalid theme values to dark', () => {
    localStorageMock.setItem(
      'tv-ai:layout:v1',
      JSON.stringify({
        ...DEFAULT_LAYOUT,
        theme: 'neon',
      }),
    );
    expect(loadLayout().theme).toBe('dark');
  });
});

describe('migrateCellIndicators', () => {
  it('assigns ids to indicators missing them', () => {
    const cell = migrateCellIndicators({
      symbol: 'AAPL',
      range: '1y',
      interval: '1d',
      chartType: 'candle_solid',
      indicators: [{ id: 'macd-1', name: 'MACD', pane: 'sub' }],
      drawings: [],
    } as CellConfig);

    expect(cell.indicators[0].id).toBeTruthy();
    expect(cell.indicators[0].visible).toBe(true);
  });

  it('remaps paneOrder keys from legacy name::pane to ids', () => {
    const cell = migrateCellIndicators({
      symbol: 'AAPL',
      range: '1y',
      interval: '1d',
      chartType: 'candle_solid',
      indicators: [{ id: 'rsi-1', name: 'RSI', pane: 'sub' }],
      drawings: [],
      paneOrder: ['price', legacyIndicatorKey('RSI', 'sub')],
      paneHeights: { [legacyIndicatorKey('RSI', 'sub')]: 120 },
    } as CellConfig);

    const id = cell.indicators[0].id;
    expect(cell.paneOrder).toEqual(['price', id]);
    expect(cell.paneHeights?.[id]).toBe(120);
  });

  it('preserves inputs and styles on migrated indicators', () => {
    const cell = migrateCellIndicators({
      symbol: 'AAPL',
      range: '1y',
      interval: '1d',
      chartType: 'candle_solid',
      indicators: [
        {
          id: 'macd-1',
          name: 'MACD',
          pane: 'sub',
          inputs: { fast: 8, slow: 21, signal: 5 },
          styles: { signal: { color: '#ff00ff', lineWidth: 2 } },
        },
      ],
      drawings: [],
    } as CellConfig);

    expect(cell.indicators[0].inputs).toEqual({ fast: 8, slow: 21, signal: 5 });
    expect(cell.indicators[0].styles).toEqual({ signal: { color: '#ff00ff', lineWidth: 2 } });
  });
});
