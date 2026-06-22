import { describe, it, expect } from 'vitest';
import { DEFAULT_CHART_RANGE, DEFAULT_CELL, pickLinkFields } from '@/lib/chartConfig';
import { applyRangePresetSelect } from '@/lib/chart/rangePresetTransition';

describe('range preset toggle behavior', () => {
  it('default landing view has no active preset', () => {
    expect(DEFAULT_CELL.rangePreset).toBeNull();
    expect(DEFAULT_CELL.range).toBe(DEFAULT_CHART_RANGE.range);
    expect(DEFAULT_CELL.interval).toBe(DEFAULT_CHART_RANGE.interval);
  });

  it('selecting a preset sets range, interval, and rangePreset', () => {
    const next = applyRangePresetSelect(DEFAULT_CELL, '1d');
    expect(next.rangePreset).toBe('1d');
    expect(next.interval).toBe('1m');
  });

  it('deselecting active preset restores default chart range', () => {
    const active = { ...DEFAULT_CELL, range: '1d', interval: '1m', rangePreset: '1d' as const };
    const deselected = applyRangePresetSelect(active, '1d');
    expect(deselected.rangePreset).toBeNull();
    expect(deselected.range).toBe('1y');
    expect(deselected.interval).toBe('1d');
  });

  it('propagates rangePreset when charts are linked', () => {
    const cell = {
      ...DEFAULT_CELL,
      rangePreset: '5d' as const,
      range: '5d' as const,
      interval: '5m' as const,
    };
    expect(pickLinkFields(cell).rangePreset).toBe('5d');
  });
});
