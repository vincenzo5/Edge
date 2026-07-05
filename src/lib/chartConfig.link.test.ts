import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_CELL,
  DEFAULT_LAYOUT,
  applyLinkPropagation,
  cellCountFor,
  migrateLayoutSync,
  pickLinkDrawingFields,
  pickLinkFields,
  pickLinkIntervalFields,
  pickLinkSymbolFields,
  type CellConfig,
  type ChartLayout,
  type SerializedDrawing,
} from './chartConfig';
import { loadLayout, saveLayout } from './layoutStorage';

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

describe('pickLinkSymbolFields', () => {
  it('includes symbol metadata only', () => {
    expect(
      pickLinkSymbolFields({
        ...DEFAULT_CELL,
        symbol: 'MSFT',
        symbolName: 'Microsoft',
        exchange: 'NASDAQ',
        range: '6mo',
        interval: '1h',
      }),
    ).toEqual({
      symbol: 'MSFT',
      symbolName: 'Microsoft',
      exchange: 'NASDAQ',
    });
  });
});

describe('pickLinkIntervalFields', () => {
  it('includes range, interval, and rangePreset', () => {
    expect(
      pickLinkIntervalFields({
        ...DEFAULT_CELL,
        range: '6mo',
        interval: '1h',
        rangePreset: '3mo',
      }),
    ).toEqual({
      range: '6mo',
      interval: '1h',
      rangePreset: '3mo',
    });
  });
});

describe('pickLinkFields', () => {
  it('merges symbol and interval fields', () => {
    expect(
      pickLinkFields({
        ...DEFAULT_CELL,
        symbol: 'MSFT',
        symbolName: 'Microsoft',
        exchange: 'NASDAQ',
        range: '6mo',
        interval: '1h',
      }),
    ).toEqual({
      symbol: 'MSFT',
      symbolName: 'Microsoft',
      exchange: 'NASDAQ',
      range: '6mo',
      interval: '1h',
      rangePreset: null,
    });
  });
});

describe('migrateLayoutSync', () => {
  it('maps legacy linked=true to all sync flags', () => {
    expect(
      migrateLayoutSync({
        version: 1,
        layoutId: 'n2-cols',
        linked: true,
        cells: [DEFAULT_CELL],
      }),
    ).toEqual({
      linkSymbol: true,
      linkInterval: true,
      linkCrosshair: true,
      linkDrawings: false,
    });
  });

  it('preserves explicit granular flags', () => {
    expect(
      migrateLayoutSync({
        version: 1,
        layoutId: 'n2-cols',
        linked: true,
        linkSymbol: false,
        linkInterval: true,
        linkCrosshair: false,
        linkDrawings: true,
        cells: [DEFAULT_CELL],
      }),
    ).toEqual({
      linkSymbol: false,
      linkInterval: true,
      linkCrosshair: false,
      linkDrawings: true,
    });
  });
});

describe('linked cell propagation', () => {
  const twoCellLayout: ChartLayout = {
    ...DEFAULT_LAYOUT,
    layoutId: 'n2-cols',
    linkSymbol: true,
    linkInterval: true,
    linkCrosshair: true,
    activeCellIndex: 0,
    cells: [
      { ...DEFAULT_CELL, symbol: 'AAPL' },
      { ...DEFAULT_CELL, symbol: 'GOOG', chartType: 'area' },
    ],
  };

  it('propagates symbol and interval fields when both enabled', () => {
    const next = applyLinkPropagation(twoCellLayout, 0, {
      ...twoCellLayout.cells[0],
      symbol: 'TSLA',
      symbolName: 'Tesla',
      exchange: 'NASDAQ',
      range: '5d',
      interval: '5m',
    });

    expect(next.cells[0].symbol).toBe('TSLA');
    expect(next.cells[1].symbol).toBe('TSLA');
    expect(next.cells[1].symbolName).toBe('Tesla');
    expect(next.cells[1].exchange).toBe('NASDAQ');
    expect(next.cells[1].range).toBe('5d');
    expect(next.cells[1].interval).toBe('5m');
    expect(next.cells[1].chartType).toBe('area');
  });

  it('propagates only symbol when linkInterval is off', () => {
    const layout = { ...twoCellLayout, linkInterval: false };
    const next = applyLinkPropagation(layout, 0, {
      ...layout.cells[0],
      symbol: 'TSLA',
      range: '5d',
      interval: '5m',
    });
    expect(next.cells[1].symbol).toBe('TSLA');
    expect(next.cells[1].range).toBe(DEFAULT_CELL.range);
    expect(next.cells[1].interval).toBe(DEFAULT_CELL.interval);
  });

  it('propagates only interval when linkSymbol is off', () => {
    const layout = { ...twoCellLayout, linkSymbol: false };
    const next = applyLinkPropagation(layout, 0, {
      ...layout.cells[0],
      symbol: 'TSLA',
      range: '5d',
      interval: '5m',
    });
    expect(next.cells[1].symbol).toBe('GOOG');
    expect(next.cells[1].range).toBe('5d');
    expect(next.cells[1].interval).toBe('5m');
  });

  it('does not propagate when all sync flags are off', () => {
    const layout = {
      ...twoCellLayout,
      linkSymbol: false,
      linkInterval: false,
    };
    const next = applyLinkPropagation(layout, 0, {
      ...layout.cells[0],
      symbol: 'TSLA',
    });
    expect(next.cells[1].symbol).toBe('GOOG');
  });
});

describe('pickLinkDrawingFields', () => {
  it('deep-clones drawings array', () => {
    const drawing: SerializedDrawing = {
      id: 'd1',
      name: 'trend_line',
      label: 'TL',
      points: [{ timestamp: 1, value: 100 }],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const picked = pickLinkDrawingFields({ ...DEFAULT_CELL, drawings: [drawing] });
    expect(picked.drawings).toEqual([drawing]);
    expect(picked.drawings).not.toBe([drawing]);
    picked.drawings[0].label = 'changed';
    expect(drawing.label).toBe('TL');
  });
});

describe('linked drawing propagation', () => {
  const sampleDrawing: SerializedDrawing = {
    id: 'd1',
    name: 'trend_line',
    label: 'Support',
    points: [{ timestamp: 1_700_000_000_000, value: 150 }],
    visible: true,
    locked: false,
    zLevel: 0,
  };

  const twoCellLayout: ChartLayout = {
    ...DEFAULT_LAYOUT,
    layoutId: 'n2-cols',
    linkDrawings: true,
    cells: [
      { ...DEFAULT_CELL, drawings: [] },
      { ...DEFAULT_CELL, symbol: 'MSFT', drawings: [] },
    ],
  };

  it('propagates drawings to peer cells when linkDrawings is enabled', () => {
    const next = applyLinkPropagation(twoCellLayout, 0, {
      ...twoCellLayout.cells[0],
      drawings: [sampleDrawing],
    });

    expect(next.cells[0].drawings).toEqual([sampleDrawing]);
    expect(next.cells[1].drawings).toEqual([sampleDrawing]);
    expect(next.cells[1].drawings[0]).not.toBe(sampleDrawing);
  });

  it('does not propagate drawings when linkDrawings is off', () => {
    const layout = { ...twoCellLayout, linkDrawings: false };
    const next = applyLinkPropagation(layout, 0, {
      ...layout.cells[0],
      drawings: [sampleDrawing],
    });
    expect(next.cells[1].drawings).toEqual([]);
  });

  it('round-trips linked drawings through layoutStorage', () => {
    const layout: ChartLayout = {
      ...DEFAULT_LAYOUT,
      layoutId: 'n4-grid-2x2',
      linkDrawings: true,
      cells: [
        { ...DEFAULT_CELL, drawings: [sampleDrawing] },
        { ...DEFAULT_CELL, symbol: 'MSFT', drawings: [sampleDrawing] },
        { ...DEFAULT_CELL, symbol: 'GOOG', drawings: [sampleDrawing] },
        { ...DEFAULT_CELL, symbol: 'IBM', drawings: [sampleDrawing] },
      ],
    };
    saveLayout(layout);
    const loaded = loadLayout();
    expect(loaded.linkDrawings).toBe(true);
    expect(loaded.cells[1].drawings[0]?.id).toBe('d1');
  });
});

describe('activeCellIndex persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('round-trips activeCellIndex through layoutStorage', () => {
    const layout: ChartLayout = {
      ...DEFAULT_LAYOUT,
      layoutId: 'n4-grid-2x2',
      activeCellIndex: 2,
      cells: [
        { ...DEFAULT_CELL },
        { ...DEFAULT_CELL },
        { ...DEFAULT_CELL },
        { ...DEFAULT_CELL },
      ],
    };
    saveLayout(layout);
    expect(loadLayout().activeCellIndex).toBe(2);
  });

  it('defaults activeCellIndex to 0 when missing from storage', () => {
    saveLayout({
      ...DEFAULT_LAYOUT,
      activeCellIndex: undefined as unknown as number,
    });
    expect(loadLayout().activeCellIndex).toBe(0);
  });

  it('migrates legacy linked flag into granular sync prefs', () => {
    localStorageMock.setItem(
      'tv-ai:layout:v1',
      JSON.stringify({
        version: 1,
        layoutId: 'n1',
        linked: true,
        activeCellIndex: 0,
        theme: 'dark',
        cells: [DEFAULT_CELL],
      }),
    );
    const loaded = loadLayout();
    expect(loaded.linkSymbol).toBe(true);
    expect(loaded.linkInterval).toBe(true);
    expect(loaded.linkCrosshair).toBe(true);
    expect(loaded.linkDrawings).toBe(false);
  });
});
