import type { IndicatorPlugin, ResolvedInputs } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { computeCci, rangeInViewport, symmetricRangeAroundZero } from './math';
import { cciLineColor, guideLineColor } from './draw';

function resolvePeriod(inputs: ResolvedInputs): number {
  const v = inputs.period;
  return typeof v === 'number' && Number.isFinite(v) ? v : 20;
}

export const cci: IndicatorPlugin = {
  name: 'CCI',
  category: 'Momentum',
  description: 'Commodity Channel Index',
  pane: 'sub',
  defaultInputs: { period: 20 },
  inputSchema: {
    period: { kind: 'number', label: 'Period', default: 20, min: 2, max: 200, step: 1 },
  },
  compute(candles, inputs) {
    const period = resolvePeriod(inputs);
    return { cci: computeCci(candles, period) };
  },
  outputs: [
    {
      id: 'upper-guide',
      label: '',
      key: 'cci',
      plot: 'hline',
      hlineAt: 100,
      color: guideLineColor,
      lineWidth: 1,
    },
    {
      id: 'lower-guide',
      label: '',
      key: 'cci',
      plot: 'hline',
      hlineAt: -100,
      color: guideLineColor,
      lineWidth: 1,
    },
    {
      id: 'zero',
      label: '',
      key: 'cci',
      plot: 'hline',
      hlineAt: 0,
      color: guideLineColor,
      lineWidth: 1,
    },
    {
      id: 'cci',
      label: 'CCI',
      key: 'cci',
      plot: 'line',
      tooltip: 'Commodity Channel Index',
      decimals: 2,
      color: cciLineColor,
    },
  ],
  valueRangeForViewport(candles, vp, inputs) {
    const data = getComputedSeries(cci, candles, inputs);
    if (!data) return null;
    const range = rangeInViewport(data.cci, vp.startIndex, vp.endIndex);
    return symmetricRangeAroundZero(range);
  },
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(cci, candles, inputs);
    if (!data || index < 0 || index >= data.cci.length) return null;
    const v = data.cci[index];
    return Number.isFinite(v) ? v : null;
  },
};
