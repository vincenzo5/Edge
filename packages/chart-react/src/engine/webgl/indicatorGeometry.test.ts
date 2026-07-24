import { describe, expect, it } from 'vitest';
import type { IndicatorPlugin } from '@edge/chart-core/plugin-api';
import { isWebGLCompatibleIndicator } from './indicatorGeometry';

describe('isWebGLCompatibleIndicator', () => {
  it('rejects marker, bgcolor, barcolor, and styled outputs', () => {
    const base: IndicatorPlugin = {
      name: 'Script',
      pane: 'sub',
      inputSchema: {},
      outputs: [{ id: 'line', label: 'Line', key: 'line', plot: 'line' }],
    };
    expect(isWebGLCompatibleIndicator(base)).toBe(true);
    expect(
      isWebGLCompatibleIndicator({
        ...base,
        outputs: [{ id: 'buy', label: 'Buy', key: 'buy', plot: 'marker' }],
      }),
    ).toBe(false);
    expect(
      isWebGLCompatibleIndicator({
        ...base,
        outputs: [{ id: 'tint', label: 'Tint', key: 'tint', plot: 'bgcolor' }],
      }),
    ).toBe(false);
    expect(
      isWebGLCompatibleIndicator({
        ...base,
        outputs: [{ id: 'bars', label: 'Bars', key: 'bars', plot: 'barcolor' }],
      }),
    ).toBe(false);
    expect(
      isWebGLCompatibleIndicator({
        ...base,
        outputs: [{ id: 'line', label: 'Line', key: 'line', plot: 'line', style: 'stepline' }],
      }),
    ).toBe(false);
  });
});
