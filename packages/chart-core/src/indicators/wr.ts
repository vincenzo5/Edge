import type { IndicatorPlugin, ResolvedInputs } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { computeWilliamsR, fixedRange, rangeInViewport } from './math';
import { guideLineColor, williamsRColor } from './draw';

function resolvePeriod(inputs: ResolvedInputs): number {
  const v = inputs.period;
  return typeof v === 'number' && Number.isFinite(v) ? v : 14;
}

export const wr: IndicatorPlugin = {
  name: 'WR',
  category: 'Momentum',
  description: 'Williams %R',
  pane: 'sub',
  defaultInputs: { period: 14 },
  inputSchema: {
    period: { kind: 'number', label: 'Period', default: 14, min: 2, max: 100, step: 1 },
  },
  compute(candles, inputs) {
    const period = resolvePeriod(inputs);
    return { wr: computeWilliamsR(candles, period) };
  },
  outputs: [
    {
      id: 'upper-guide',
      label: '',
      key: 'wr',
      plot: 'hline',
      hlineAt: -20,
      color: guideLineColor,
      lineWidth: 1,
    },
    {
      id: 'lower-guide',
      label: '',
      key: 'wr',
      plot: 'hline',
      hlineAt: -80,
      color: guideLineColor,
      lineWidth: 1,
    },
    {
      id: 'wr',
      label: 'WR',
      key: 'wr',
      plot: 'line',
      tooltip: 'Williams %R',
      decimals: 2,
      color: williamsRColor,
    },
  ],
  valueRangeForViewport(candles, vp, inputs) {
    const data = getComputedSeries(wr, candles, inputs);
    if (!data) return fixedRange(-100, 0);
    const range = rangeInViewport(data.wr, vp.startIndex, vp.endIndex);
    if (!range) return fixedRange(-100, 0);
    const pad = 5;
    return {
      min: Math.max(-100, range.min - pad),
      max: Math.min(0, range.max + pad),
    };
  },
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(wr, candles, inputs);
    if (!data || index < 0 || index >= data.wr.length) return null;
    const v = data.wr[index];
    return Number.isFinite(v) ? v : null;
  },
};
