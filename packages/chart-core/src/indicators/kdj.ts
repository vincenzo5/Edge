import type { IndicatorPlugin, ResolvedInputs } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { computeStochastic, fixedRange, mergeRanges, rangeInViewport } from './math';
import {
  guideLineColor,
  stochasticDColor,
  stochasticJColor,
  stochasticKColor,
} from './draw';

function resolveKdjInputs(inputs: ResolvedInputs): { kPeriod: number; dPeriod: number } {
  return {
    kPeriod: typeof inputs.kPeriod === 'number' ? inputs.kPeriod : 9,
    dPeriod: typeof inputs.dPeriod === 'number' ? inputs.dPeriod : 3,
  };
}

export const kdj: IndicatorPlugin = {
  name: 'KDJ',
  category: 'Momentum',
  description: 'Stochastic Oscillator',
  pane: 'sub',
  defaultInputs: { kPeriod: 9, dPeriod: 3 },
  inputSchema: {
    kPeriod: { kind: 'number', label: '%K Period', default: 9, min: 1, max: 100, step: 1 },
    dPeriod: { kind: 'number', label: '%D Period', default: 3, min: 1, max: 100, step: 1 },
  },
  compute(candles, inputs) {
    const { kPeriod, dPeriod } = resolveKdjInputs(inputs);
    const { k, d, j } = computeStochastic(candles, kPeriod, dPeriod);
    return { k, d, j };
  },
  outputs: [
    {
      id: 'upper-guide',
      label: '',
      key: 'k',
      plot: 'hline',
      hlineAt: 80,
      color: guideLineColor,
      lineWidth: 1,
    },
    {
      id: 'lower-guide',
      label: '',
      key: 'k',
      plot: 'hline',
      hlineAt: 20,
      color: guideLineColor,
      lineWidth: 1,
    },
    {
      id: 'k',
      label: 'K',
      key: 'k',
      plot: 'line',
      tooltip: 'Stochastic %K',
      decimals: 2,
      color: stochasticKColor,
    },
    {
      id: 'd',
      label: 'D',
      key: 'd',
      plot: 'line',
      tooltip: 'Stochastic %D',
      decimals: 2,
      color: stochasticDColor,
    },
    {
      id: 'j',
      label: 'J',
      key: 'j',
      plot: 'line',
      tooltip: 'KDJ %J line',
      decimals: 2,
      color: stochasticJColor,
    },
  ],
  valueRangeForViewport(candles, vp, inputs) {
    const data = getComputedSeries(kdj, candles, inputs);
    if (!data) return fixedRange(0, 100);
    const range = mergeRanges([
      rangeInViewport(data.k, vp.startIndex, vp.endIndex),
      rangeInViewport(data.d, vp.startIndex, vp.endIndex),
      rangeInViewport(data.j, vp.startIndex, vp.endIndex),
    ]);
    if (!range) return fixedRange(0, 100);
    const pad = 5;
    return {
      min: Math.max(0, range.min - pad),
      max: Math.min(100, range.max + pad),
    };
  },
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(kdj, candles, inputs);
    if (!data || index < 0 || index >= data.k.length) return null;
    const v = data.k[index];
    return Number.isFinite(v) ? v : null;
  },
};
