import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CELL,
  DEFAULT_LAYOUT,
  PRICE_PANE_KEY,
  applyLayoutTemplateChange,
  cloneCellConfig,
  createIndicatorInstance,
  type CellConfig,
  type ChartLayout,
  type SerializedDrawing,
} from './chartConfig';

const sampleDrawing: SerializedDrawing = {
  id: 'draw-1',
  name: 'trend_line',
  label: 'TL',
  points: [{ timestamp: 1_700_000_000_000, value: 100 }],
  mode: 'segment',
  visible: true,
  locked: false,
  zLevel: 1,
  paneId: 'price',
};

function richCell(overrides: Partial<CellConfig> = {}): CellConfig {
  const rsi = createIndicatorInstance('RSI', 'sub');
  return {
    symbol: 'XLF',
    symbolName: 'Financial Services sector',
    exchange: 'ARCA',
    range: '6mo',
    interval: '1h',
    rangePreset: '3mo',
    chartType: 'area',
    indicators: [rsi],
    drawings: [sampleDrawing],
    paneOrder: [PRICE_PANE_KEY, rsi.id],
    collapsedPanes: [rsi.id],
    maximizedPane: rsi.id,
    paneHeights: { [rsi.id]: 120 },
    chartSettings: {
      statusLine: { showTitle: true, showLogo: true, showChartValues: true, showBarChangeValues: true },
    },
    mainSeriesVisible: true,
    ...overrides,
  };
}

describe('cloneCellConfig', () => {
  it('copies symbol, interval, chartType, and chartSettings', () => {
    const source = richCell();
    const clone = cloneCellConfig(source);

    expect(clone.symbol).toBe('XLF');
    expect(clone.symbolName).toBe('Financial Services sector');
    expect(clone.exchange).toBe('ARCA');
    expect(clone.range).toBe('6mo');
    expect(clone.interval).toBe('1h');
    expect(clone.rangePreset).toBe('3mo');
    expect(clone.chartType).toBe('area');
    expect(clone.mainSeriesVisible).toBe(true);
    expect(clone.chartSettings?.statusLine.showTitle).toBe(true);
  });

  it('gives indicators new IDs while preserving count, name, pane, and inputs', () => {
    const source = richCell();
    const clone = cloneCellConfig(source);

    expect(clone.indicators).toHaveLength(1);
    expect(clone.indicators[0].id).not.toBe(source.indicators[0].id);
    expect(clone.indicators[0].name).toBe('RSI');
    expect(clone.indicators[0].pane).toBe('sub');
  });

  it('remaps pane keys to new indicator IDs', () => {
    const source = richCell();
    const clone = cloneCellConfig(source);
    const newId = clone.indicators[0].id;

    expect(clone.paneOrder).toEqual([PRICE_PANE_KEY, newId]);
    expect(clone.collapsedPanes).toEqual([newId]);
    expect(clone.maximizedPane).toBe(newId);
    expect(clone.paneHeights?.[newId]).toBe(120);
  });

  it('assigns new drawing IDs when sharedDrawingIds is false', () => {
    const source = richCell();
    const clone = cloneCellConfig(source, { sharedDrawingIds: false });

    expect(clone.drawings).toHaveLength(1);
    expect(clone.drawings[0].id).not.toBe(sampleDrawing.id);
    expect(clone.drawings[0].name).toBe('trend_line');
    expect(clone.drawings[0].points[0].value).toBe(100);
  });

  it('preserves drawing IDs when sharedDrawingIds is true', () => {
    const source = richCell();
    const clone = cloneCellConfig(source, { sharedDrawingIds: true });

    expect(clone.drawings[0].id).toBe('draw-1');
    expect(clone.drawings).not.toBe(source.drawings);
  });
});

describe('applyLayoutTemplateChange', () => {
  it('expands n1 to n2-cols by cloning active cell into new pane', () => {
    const source = richCell();
    const layout: ChartLayout = {
      ...DEFAULT_LAYOUT,
      layoutId: 'n1',
      cells: [source],
      activeCellIndex: 0,
    };

    const next = applyLayoutTemplateChange(layout, 'n2-cols');

    expect(next.layoutId).toBe('n2-cols');
    expect(next.cells).toHaveLength(2);
    expect(next.cells[0]).toBe(source);
    expect(next.cells[1].symbol).toBe('XLF');
    expect(next.cells[1].chartType).toBe('area');
    expect(next.cells[1].indicators[0].id).not.toBe(source.indicators[0].id);
  });

  it('clones from active cell when active index is not 0', () => {
    const cell0 = richCell({ symbol: 'AAPL' });
    const cell1 = richCell({ symbol: 'MSFT' });
    const cell2 = richCell({ symbol: 'GOOG' });
    const layout: ChartLayout = {
      ...DEFAULT_LAYOUT,
      layoutId: 'n4-grid-2x2',
      cells: [cell0, cell1, cell2],
      activeCellIndex: 2,
    };

    const next = applyLayoutTemplateChange(layout, 'n4-cols');

    expect(next.cells).toHaveLength(4);
    expect(next.cells[3].symbol).toBe('GOOG');
    expect(next.cells[3].indicators[0].name).toBe('RSI');
  });

  it('preserves existing cell 1 when expanding n2 to n4', () => {
    const cell0 = richCell({ symbol: 'AAPL' });
    const cell1 = richCell({ symbol: 'MSFT', chartType: 'ohlc' });
    const layout: ChartLayout = {
      ...DEFAULT_LAYOUT,
      layoutId: 'n2-cols',
      cells: [cell0, cell1],
      activeCellIndex: 0,
    };

    const next = applyLayoutTemplateChange(layout, 'n4-grid-2x2');

    expect(next.cells[1]).toBe(cell1);
    expect(next.cells[1].chartType).toBe('ohlc');
  });

  it('shrinks n4 to n1 with active on cell 2, promoting active to sole pane', () => {
    const cell0 = richCell({ symbol: 'AAPL' });
    const cell1 = richCell({ symbol: 'MSFT' });
    const cell2 = richCell({ symbol: 'GOOG' });
    const layout: ChartLayout = {
      ...DEFAULT_LAYOUT,
      layoutId: 'n4-grid-2x2',
      cells: [cell0, cell1, cell2, richCell({ symbol: 'IBM' })],
      activeCellIndex: 2,
    };

    const next = applyLayoutTemplateChange(layout, 'n1');

    expect(next.layoutId).toBe('n1');
    expect(next.cells).toHaveLength(1);
    expect(next.cells[0]).toBe(cell2);
    expect(next.cells[0].symbol).toBe('GOOG');
    expect(next.activeCellIndex).toBe(0);
  });

  it('shrinks n4 to n1 when active is cell 0, discarding extras', () => {
    const cell0 = richCell({ symbol: 'XLF' });
    const layout: ChartLayout = {
      ...DEFAULT_LAYOUT,
      layoutId: 'n4-grid-2x2',
      cells: [cell0, richCell({ symbol: 'MSFT' }), richCell({ symbol: 'GOOG' }), richCell({ symbol: 'IBM' })],
      activeCellIndex: 0,
    };

    const next = applyLayoutTemplateChange(layout, 'n1');

    expect(next.cells).toHaveLength(1);
    expect(next.cells[0]).toBe(cell0);
    expect(next.activeCellIndex).toBe(0);
  });

  it('shrinks n4 to n2 by trimming and clamping active index', () => {
    const layout: ChartLayout = {
      ...DEFAULT_LAYOUT,
      layoutId: 'n4-grid-2x2',
      cells: [
        richCell({ symbol: 'AAPL' }),
        richCell({ symbol: 'MSFT' }),
        richCell({ symbol: 'GOOG' }),
        richCell({ symbol: 'IBM' }),
      ],
      activeCellIndex: 3,
    };

    const next = applyLayoutTemplateChange(layout, 'n2-cols');

    expect(next.cells).toHaveLength(2);
    expect(next.cells[0].symbol).toBe('AAPL');
    expect(next.cells[1].symbol).toBe('MSFT');
    expect(next.activeCellIndex).toBe(1);
  });

  it('clamps activeCellIndex when shrinking below current active', () => {
    const layout: ChartLayout = {
      ...DEFAULT_LAYOUT,
      layoutId: 'n3-cols',
      cells: [richCell(), richCell(), richCell()],
      activeCellIndex: 2,
    };

    const next = applyLayoutTemplateChange(layout, 'n2-cols');

    expect(next.activeCellIndex).toBe(1);
  });

  it('returns same layout when layoutId is unchanged', () => {
    const layout: ChartLayout = { ...DEFAULT_LAYOUT, layoutId: 'n1' };
    expect(applyLayoutTemplateChange(layout, 'n1')).toBe(layout);
  });

  it('uses linkDrawings for shared drawing IDs when expanding', () => {
    const source = richCell();
    const layout: ChartLayout = {
      ...DEFAULT_LAYOUT,
      layoutId: 'n1',
      linkDrawings: true,
      cells: [source],
      activeCellIndex: 0,
    };

    const next = applyLayoutTemplateChange(layout, 'n2-cols');

    expect(next.cells[1].drawings[0].id).toBe('draw-1');
  });

  it('does not pad with DEFAULT_CELL when expanding from custom single pane', () => {
    const source = richCell({ symbol: 'XLF' });
    const layout: ChartLayout = {
      ...DEFAULT_LAYOUT,
      layoutId: 'n1',
      cells: [source],
    };

    const next = applyLayoutTemplateChange(layout, 'n2-cols');

    expect(next.cells[1].symbol).toBe('XLF');
    expect(next.cells[1].symbol).not.toBe(DEFAULT_CELL.symbol);
  });
});
