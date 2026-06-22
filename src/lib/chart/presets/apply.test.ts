import { describe, expect, it } from 'vitest';
import type { CellConfig } from '@/lib/chartConfig';
import { DEFAULT_CELL, PRICE_PANE_KEY } from '@/lib/chartConfig';
import { applyChartTemplate, applyStudyTemplate } from './apply';
import type { ChartTemplatePayload } from './types';

const baseCell: CellConfig = {
  ...DEFAULT_CELL,
  symbol: 'MSFT',
  range: '6mo',
  drawings: [{ id: 'd1', name: 'trend_line', label: 'T', points: [], visible: true, locked: false, zLevel: 0 }],
};

describe('presets apply', () => {
  it('applyStudyTemplate adds a new RSI instance', () => {
    const { cell, skipped } = applyStudyTemplate(baseCell, {
      name: 'RSI',
      pane: 'sub',
      inputs: { period: 21 },
      visible: true,
    });
    expect(skipped).toEqual([]);
    expect(cell.symbol).toBe('MSFT');
    expect(cell.drawings).toHaveLength(1);
    expect(cell.indicators).toHaveLength(1);
    expect(cell.indicators[0].name).toBe('RSI');
    expect(cell.indicators[0].inputs?.period).toBe(21);
  });

  it('applyChartTemplate replaces indicators and remaps pane keys', () => {
    const oldMacdId = 'macd-old-id';
    const oldRsiId = 'rsi-old-id';
    const payload: ChartTemplatePayload = {
      chartType: 'area',
      indicators: [
        { templateKey: oldMacdId, name: 'MACD', pane: 'sub', visible: true },
        { templateKey: oldRsiId, name: 'RSI', pane: 'sub', inputs: { period: 10 }, visible: true },
      ],
      paneOrder: [PRICE_PANE_KEY, oldMacdId, oldRsiId],
      paneHeights: { [oldRsiId]: 120 },
      collapsedPanes: [oldMacdId],
      maximizedPane: oldRsiId,
    };

    const { cell, skipped } = applyChartTemplate(baseCell, payload);
    expect(skipped).toEqual([]);
    expect(cell.chartType).toBe('area');
    expect(cell.symbol).toBe('MSFT');
    expect(cell.drawings).toHaveLength(1);
    expect(cell.indicators).toHaveLength(2);

    const newMacdId = cell.indicators.find((i) => i.name === 'MACD')!.id;
    const newRsiId = cell.indicators.find((i) => i.name === 'RSI')!.id;
    expect(cell.paneOrder).toEqual([PRICE_PANE_KEY, newMacdId, newRsiId]);
    expect(cell.paneHeights?.[newRsiId]).toBe(120);
    expect(cell.collapsedPanes).toEqual([newMacdId]);
    expect(cell.maximizedPane).toBe(newRsiId);
  });

  it('skips unimplemented indicators', () => {
    const payload: ChartTemplatePayload = {
      chartType: 'candle_solid',
      indicators: [
        { templateKey: 'x', name: 'KDJ', pane: 'sub', visible: true },
        { templateKey: 'y', name: 'RSI', pane: 'sub', visible: true },
      ],
    };
    const { cell, skipped } = applyChartTemplate(baseCell, payload);
    expect(skipped).toEqual(['KDJ']);
    expect(cell.indicators).toHaveLength(1);
    expect(cell.indicators[0].name).toBe('RSI');
  });
});
