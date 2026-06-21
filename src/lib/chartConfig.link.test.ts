import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_CELL,
  DEFAULT_LAYOUT,
  cellCountFor,
  pickLinkFields,
  type CellConfig,
  type ChartLayout,
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

function applyLinkedUpdate(
  layout: ChartLayout,
  index: number,
  next: CellConfig,
): ChartLayout {
  const count = cellCountFor(layout.gridMode);
  const cells = [...layout.cells];
  cells[index] = next;
  if (layout.linked) {
    const linkFields = pickLinkFields(next);
    for (let i = 0; i < count; i++) {
      if (i !== index) cells[i] = { ...cells[i], ...linkFields };
    }
  }
  return { ...layout, cells };
}

describe('pickLinkFields', () => {
  it('includes symbol metadata and range/interval', () => {
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
    });
  });
});

describe('linked cell propagation', () => {
  const twoCellLayout: ChartLayout = {
    ...DEFAULT_LAYOUT,
    gridMode: '1x2',
    linked: true,
    activeCellIndex: 0,
    cells: [
      { ...DEFAULT_CELL, symbol: 'AAPL' },
      { ...DEFAULT_CELL, symbol: 'GOOG', chartType: 'area' },
    ],
  };

  it('propagates link fields to peer cells when linked', () => {
    const next = applyLinkedUpdate(twoCellLayout, 0, {
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

  it('does not propagate when unlinked', () => {
    const layout = { ...twoCellLayout, linked: false };
    const next = applyLinkedUpdate(layout, 0, {
      ...layout.cells[0],
      symbol: 'TSLA',
    });
    expect(next.cells[1].symbol).toBe('GOOG');
  });
});

describe('activeCellIndex persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('round-trips activeCellIndex through layoutStorage', () => {
    const layout: ChartLayout = {
      ...DEFAULT_LAYOUT,
      gridMode: '2x2',
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
});
