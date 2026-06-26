import type { IndicatorPlugin, ResolvedInputs } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { closes, computeRoc, rangeInViewport, symmetricRangeAroundZero } from './math';
import { guideLineColor, rocLineColor } from './draw';

function resolvePeriod(inputs: ResolvedInputs): number {
  const v = inputs.period;
  return typeof v === 'number' && Number.isFinite(v) ? v : 12;
}

export const roc: IndicatorPlugin = {
  name: 'ROC',
  category: 'Momentum',
  description: 'Rate of Change',
  pane: 'sub',
  defaultInputs: { period: 12 },
  inputSchema: {
    period: { kind: 'number', label: 'Period', default: 12, min: 1, max: 200, step: 1 },
  },
  compute(candles, inputs) {
    const period = resolvePeriod(inputs);
    return { roc: computeRoc(closes(candles), period) };
  },
  outputs: [
    {
      id: 'zero',
      label: '',
      key: 'roc',
      plot: 'hline',
      hlineAt: 0,
      color: guideLineColor,
      lineWidth: 1,
    },
    {
      id: 'roc',
      label: 'ROC',
      key: 'roc',
      plot: 'line',
      tooltip: 'Rate of Change (%)',
      decimals: 2,
      color: rocLineColor,
    },
  ],
  valueRangeForViewport(candles, vp, inputs) {
    const data = getComputedSeries(roc, candles, inputs);
    if (!data) return null;
    const range = rangeInViewport(data.roc, vp.startIndex, vp.endIndex);
    return symmetricRangeAroundZero(range);
  },
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(roc, candles, inputs);
    if (!data || index < 0 || index >= data.roc.length) return null;
    const v = data.roc[index];
    return Number.isFinite(v) ? v : null;
  },
};
