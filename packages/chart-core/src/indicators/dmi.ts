import type { IndicatorPlugin, ResolvedInputs } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { computeDmi, fixedRange, mergeRanges, rangeInViewport } from './math';
import { dmiAdxColor, dmiMinusDiColor, dmiPlusDiColor, guideLineColor } from './draw';

function resolvePeriod(inputs: ResolvedInputs): number {
  const v = inputs.period;
  return typeof v === 'number' && Number.isFinite(v) ? v : 14;
}

export const dmi: IndicatorPlugin = {
  name: 'DMI',
  category: 'Momentum',
  description: 'Directional Movement Index',
  pane: 'sub',
  defaultInputs: { period: 14 },
  inputSchema: {
    period: { kind: 'number', label: 'Period', default: 14, min: 2, max: 100, step: 1 },
  },
  compute(candles, inputs) {
    const period = resolvePeriod(inputs);
    const { plusDi, minusDi, adx } = computeDmi(candles, period);
    return { plusDi, minusDi, adx };
  },
  outputs: [
    {
      id: 'upper-guide',
      label: '',
      key: 'adx',
      plot: 'hline',
      hlineAt: 25,
      color: guideLineColor,
      lineWidth: 1,
    },
    {
      id: 'plusDi',
      label: '+DI',
      key: 'plusDi',
      plot: 'line',
      tooltip: 'Positive Directional Indicator',
      decimals: 2,
      color: dmiPlusDiColor,
    },
    {
      id: 'minusDi',
      label: '-DI',
      key: 'minusDi',
      plot: 'line',
      tooltip: 'Negative Directional Indicator',
      decimals: 2,
      color: dmiMinusDiColor,
    },
    {
      id: 'adx',
      label: 'ADX',
      key: 'adx',
      plot: 'line',
      tooltip: 'Average Directional Index',
      decimals: 2,
      color: dmiAdxColor,
    },
  ],
  valueRangeForViewport(candles, vp, inputs) {
    const data = getComputedSeries(dmi, candles, inputs);
    if (!data) return fixedRange(0, 100);
    const range = mergeRanges([
      rangeInViewport(data.plusDi, vp.startIndex, vp.endIndex),
      rangeInViewport(data.minusDi, vp.startIndex, vp.endIndex),
      rangeInViewport(data.adx, vp.startIndex, vp.endIndex),
    ]);
    if (!range) return fixedRange(0, 100);
    const pad = 5;
    return {
      min: Math.max(0, range.min - pad),
      max: Math.min(100, range.max + pad),
    };
  },
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(dmi, candles, inputs);
    if (!data || index < 0 || index >= data.adx.length) return null;
    const v = data.adx[index];
    return Number.isFinite(v) ? v : null;
  },
};
