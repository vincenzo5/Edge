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

  it('rejects invalid sidebar panel ids', () => {
    localStorageMock.setItem(
      'tv-ai:layout:v1',
      JSON.stringify({
        ...DEFAULT_LAYOUT,
        sidebar: { activePanel: 'watchlist' },
      }),
    );
    const loaded = loadLayout();
    expect(loaded.sidebar?.activePanel).toBeNull();
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
