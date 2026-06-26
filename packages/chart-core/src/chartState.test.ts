import { describe, expect, it } from 'vitest';
import {
  createDefaultChartState,
  migrateChartState,
  restoreChartState,
  serializeChartState,
  validateChartState,
} from '@edge/chart-core';

describe('chart state serialization', () => {
  it('round-trips indicators, drawings, panes, and settings', () => {
    const input = createDefaultChartState({
      chartType: 'area',
      indicators: [{ id: 'ma-1', name: 'MA', pane: 'main', visible: true }],
      drawings: [
        {
          id: 'd1',
          name: 'trend_line',
          label: 'Support',
          points: [{ dataIndex: 0, value: 100 }],
          visible: true,
          locked: false,
          zLevel: 0,
        },
      ],
      paneOrder: ['price', 'ma-1'],
      collapsedPanes: [],
      maximizedPane: null,
      paneHeights: { 'ma-1': 120 },
      chartSettings: { canvas: { showGrid: true } },
    });

    const serialized = serializeChartState(input);
    const restored = restoreChartState(serialized);

    expect(restored).toEqual(serialized);
    expect(restored.indicators).not.toBe(input.indicators);
    expect(restored.drawings).not.toBe(input.drawings);
  });

  it('round-trips mainSeriesVisible', () => {
    const input = createDefaultChartState({
      mainSeriesVisible: false,
    });
    const serialized = serializeChartState(input);
    const restored = restoreChartState(serialized);
    expect(restored.mainSeriesVisible).toBe(false);
  });

  it('migrates partial legacy payloads', () => {
    const migrated = migrateChartState({
      chartType: 'ohlc',
      indicators: [{ id: 'x', name: 'RSI', pane: 'sub' }],
      drawings: [],
    });

    expect(migrated.version).toBe(1);
    expect(migrated.chartType).toBe('ohlc');
    expect(migrated.indicators).toHaveLength(1);
  });

  it('rejects invalid payloads', () => {
    const result = validateChartState({ version: 99, chartType: 'bad' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});
