import { describe, it, expect } from 'vitest';
import { IndicatorRegistry, DrawingRegistry } from './pluginHost';
import { getInputSchema } from './indicatorInputs';

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

  it('registered plugins include catalog metadata and input schema', () => {
    for (const plugin of IndicatorRegistry.getAll()) {
      expect(plugin.category).toBeTruthy();
      expect(plugin.description).toBeTruthy();
      expect(getInputSchema(plugin)).toBeDefined();
      expect(typeof plugin.compute).toBe('function');
      const hasDraw = typeof plugin.draw === 'function';
      const hasDeclarative = (plugin.outputs?.length ?? 0) > 0;
      expect(hasDraw || hasDeclarative).toBe(true);
    }
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
