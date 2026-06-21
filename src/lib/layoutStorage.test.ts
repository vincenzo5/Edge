import { describe, it, expect } from 'vitest';
import { migrateCellIndicators, legacyIndicatorKey, type CellConfig } from '@/lib/chartConfig';

describe('migrateCellIndicators', () => {
  it('assigns ids to indicators missing them', () => {
    const cell = migrateCellIndicators({
      symbol: 'AAPL',
      range: '1y',
      interval: '1d',
      chartType: 'candle_solid',
      indicators: [{ name: 'MACD', pane: 'sub' }],
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
      indicators: [{ name: 'RSI', pane: 'sub' }],
      drawings: [],
      paneOrder: ['price', legacyIndicatorKey('RSI', 'sub')],
      paneHeights: { [legacyIndicatorKey('RSI', 'sub')]: 120 },
    } as CellConfig);

    const id = cell.indicators[0].id;
    expect(cell.paneOrder).toEqual(['price', id]);
    expect(cell.paneHeights?.[id]).toBe(120);
  });
});
