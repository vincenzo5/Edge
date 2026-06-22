import { describe, it, expect, beforeEach } from 'vitest';
import { migrateCellIndicators, legacyIndicatorKey, DEFAULT_LAYOUT, type CellConfig } from '@/lib/chartConfig';
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
});
