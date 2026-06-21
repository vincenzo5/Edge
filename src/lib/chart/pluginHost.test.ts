import { describe, it, expect } from 'vitest';
import { IndicatorRegistry, DrawingRegistry } from './pluginHost';

describe('IndicatorRegistry', () => {
  it('returns a list of indicators', () => {
    const all = IndicatorRegistry.getAll();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((i) => i.name === 'MA')).toBe(true);
  });

  it('can retrieve a specific indicator', () => {
    const ma = IndicatorRegistry.get('MA');
    expect(ma).toBeDefined();
  });
});

describe('DrawingRegistry', () => {
  it('resolves aliases (straightLine -> trend_line)', () => {
    const tool = DrawingRegistry.get('straightLine');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('trend_line');
  });

  it('returns all drawings', () => {
    const all = DrawingRegistry.getAll();
    expect(all.length).toBeGreaterThan(0);
  });
});
