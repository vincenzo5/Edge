import { describe, it, expect } from 'vitest';
import type { IndicatorConfig } from './contracts';
import type { IndicatorPlugin } from './plugin-api';
import {
  clampInputValue,
  defaultInputsFromSchema,
  getInputSchema,
  resolveIndicatorInputs,
} from './indicatorInputs';

const sourcePlugin: IndicatorPlugin = {
  name: 'SourceTest',
  category: 'Momentum',
  description: 'Source input test',
  pane: 'sub',
  inputSchema: {
    period: { kind: 'number', label: 'Period', default: 14, min: 2, max: 100, step: 1 },
    source: { kind: 'source', label: 'Source', default: 'close' },
  },
  compute: () => ({ v: [1] }),
  draw: () => {},
};

describe('indicatorInputs', () => {
  it('resolves schema defaults when instance is empty', () => {
    const instance: IndicatorConfig = { id: '1', name: 'SourceTest', pane: 'sub' };
    expect(resolveIndicatorInputs(sourcePlugin, instance)).toEqual({
      period: 14,
      source: 'close',
    });
  });

  it('coerces legacy numeric params into inputs', () => {
    const instance: IndicatorConfig = {
      id: '1',
      name: 'SourceTest',
      pane: 'sub',
      params: { period: 21 },
    };
    expect(resolveIndicatorInputs(sourcePlugin, instance).period).toBe(21);
  });

  it('prefers instance.inputs over legacy params', () => {
    const instance: IndicatorConfig = {
      id: '1',
      name: 'SourceTest',
      pane: 'sub',
      params: { period: 21 },
      inputs: { period: 10, source: 'open' },
    };
    expect(resolveIndicatorInputs(sourcePlugin, instance)).toEqual({
      period: 10,
      source: 'open',
    });
  });

  it('normalizes legacy paramSchema to number kind', () => {
    const legacyPlugin: IndicatorPlugin = {
      name: 'Legacy',
      category: 'Trend',
      description: 'Legacy',
      pane: 'main',
      paramSchema: {
        period: { label: 'Period', default: 20, min: 1, max: 100, step: 1 },
      },
      draw: () => {},
    };
    const schema = getInputSchema(legacyPlugin);
    expect(schema?.period.kind).toBe('number');
  });

  it('seeds defaultInputsFromSchema from inputSchema', () => {
    expect(defaultInputsFromSchema(sourcePlugin)).toEqual({
      period: 14,
      source: 'close',
    });
  });

  it('clamps enum values to allowed options', () => {
    const def = {
      kind: 'enum' as const,
      label: 'Mode',
      default: 'wilder',
      options: [
        { value: 'wilder', label: 'Wilder' },
        { value: 'sma', label: 'SMA' },
      ],
    };
    expect(clampInputValue('invalid', def)).toBe('wilder');
    expect(clampInputValue('sma', def)).toBe('sma');
  });
});
