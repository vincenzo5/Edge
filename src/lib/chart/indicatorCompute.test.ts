import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IndicatorPlugin } from './plugin-api';
import type { Candle } from './contracts';
import {
  clearComputeCache,
  computeCacheKey,
  defaultValueAt,
  getComputedSeries,
  legendFromOutputs,
  resolveOutputColor,
} from './indicatorCompute';
import { ma } from './indicators/ma';

const candles: Candle[] = [
  { t: 1, o: 10, h: 12, l: 9, c: 11, v: 1000 },
  { t: 2, o: 11, h: 13, l: 10, c: 12, v: 2000 },
  { t: 3, o: 12, h: 14, l: 11, c: 11.8, v: 1500 },
];

function makeTestPlugin(overrides?: Partial<IndicatorPlugin>): IndicatorPlugin {
  const compute = vi.fn(() => ({ a: [1, 2, 3], b: [4, 5, 6] }));
  return {
    name: 'Test',
    category: 'Momentum',
    description: 'Test plugin',
    pane: 'sub',
    compute,
    outputs: [
      { id: 'a', label: 'A', key: 'a', color: '#ffffff', tooltip: 'Series A' },
      { id: 'b', label: 'B', key: 'b', decimals: 2 },
    ],
    draw: () => {},
    ...overrides,
  };
}

describe('indicatorCompute', () => {
  beforeEach(() => {
    clearComputeCache();
  });

  describe('computeCacheKey', () => {
    it('includes name, params, length, and boundary timestamps', () => {
      const key = computeCacheKey('MACD', { fast: 12 }, candles);
      expect(key).toBe('MACD|{"fast":12}|3|1|3');
    });
  });

  describe('resolveOutputColor', () => {
    it('returns static color strings', () => {
      expect(resolveOutputColor('#60a5fa', 'dark', 1)).toBe('#60a5fa');
    });

    it('calls color callbacks with theme and value', () => {
      const color = (theme: 'dark' | 'light', value: number | null) =>
        value != null && value >= 0 ? 'green' : 'red';
      expect(resolveOutputColor(color, 'dark', 2)).toBe('green');
      expect(resolveOutputColor(color, 'dark', -1)).toBe('red');
    });
  });

  describe('getComputedSeries', () => {
    it('caches compute results for the same inputs', () => {
      const plugin = makeTestPlugin();
      getComputedSeries(plugin, candles);
      getComputedSeries(plugin, candles);
      expect(plugin.compute).toHaveBeenCalledTimes(1);
    });

    it('recomputes when candle count changes', () => {
      const plugin = makeTestPlugin();
      getComputedSeries(plugin, candles);
      getComputedSeries(plugin, candles.slice(0, 2));
      expect(plugin.compute).toHaveBeenCalledTimes(2);
    });

    it('evicts oldest entry when cache exceeds max size', () => {
      let firstCalls = 0;
      const firstPlugin: IndicatorPlugin = {
        name: 'CacheFirst',
        category: 'Momentum',
        description: 'Cache test',
        pane: 'sub',
        compute: () => {
          firstCalls++;
          return { v: [1] };
        },
        draw: () => {},
      };
      getComputedSeries(firstPlugin, candles);
      expect(firstCalls).toBe(1);

      for (let i = 0; i < 64; i++) {
        getComputedSeries(
          {
            name: `CacheOther${i}`,
            category: 'Momentum',
            description: 'Cache eviction test',
            pane: 'sub',
            compute: () => ({ v: [1] }),
            draw: () => {},
          },
          candles,
        );
      }

      getComputedSeries(
        {
          name: 'CacheNew',
          category: 'Momentum',
          description: 'Cache eviction test',
          pane: 'sub',
          compute: () => ({ v: [1] }),
          draw: () => {},
        },
        candles,
      );

      getComputedSeries(firstPlugin, candles);
      expect(firstCalls).toBe(2);
    });
  });

  describe('legendFromOutputs', () => {
    it('maps output keys to legend entries at index', () => {
      const plugin = makeTestPlugin();
      const entries = legendFromOutputs(plugin, 1, candles, undefined, 'dark');
      expect(entries).toEqual([
        {
          id: 'a',
          label: 'A',
          value: 2,
          color: '#ffffff',
          tooltip: 'Series A',
          decimals: undefined,
        },
        {
          id: 'b',
          label: 'B',
          value: 5,
          color: undefined,
          tooltip: undefined,
          decimals: 2,
        },
      ]);
    });

    it('returns null when plugin has no outputs', () => {
      const plugin = makeTestPlugin({ outputs: undefined, compute: undefined });
      expect(legendFromOutputs(plugin, 0, candles, undefined, 'dark')).toBeNull();
    });
  });

  describe('defaultValueAt', () => {
    it('returns the first output series value at index', () => {
      const plugin = makeTestPlugin();
      expect(defaultValueAt(plugin, 2, candles)).toBe(3);
    });

    it('returns null when no outputs are declared', () => {
      const plugin = makeTestPlugin({ outputs: undefined, compute: undefined });
      expect(defaultValueAt(plugin, 0, candles)).toBeNull();
    });
  });

  describe('indicator param changes', () => {
    it('MA compute output changes when period param changes', () => {
      clearComputeCache();
      const short = getComputedSeries(ma, candles, { period: 1 });
      const long = getComputedSeries(ma, candles, { period: 2 });
      expect(short?.ma[2]).toBe(candles[2].c);
      expect(long?.ma[2]).toBeCloseTo((candles[1].c + candles[2].c) / 2);
      expect(short?.ma[2]).not.toBe(long?.ma[2]);
    });
  });
});
