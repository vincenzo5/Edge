import type { IndicatorPlugin } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { computeObv, rangeInViewport } from './math';
import { obvLineColor } from './draw';

export const obv: IndicatorPlugin = {
  name: 'OBV',
  category: 'Volume',
  description: 'On-Balance Volume',
  pane: 'sub',
  inputSchema: {},
  compute(candles) {
    return { obv: computeObv(candles) };
  },
  outputs: [
    {
      id: 'obv',
      label: 'OBV',
      key: 'obv',
      plot: 'line',
      tooltip: 'Cumulative on-balance volume',
      decimals: 0,
      color: obvLineColor,
    },
  ],
  valueRangeForViewport(candles, vp, inputs) {
    const data = getComputedSeries(obv, candles, inputs);
    if (!data) return null;
    const range = rangeInViewport(data.obv, vp.startIndex, vp.endIndex);
    if (!range) return null;
    const pad = (range.max - range.min) * 0.05 || Math.abs(range.max) * 0.05 || 1;
    return { min: range.min - pad, max: range.max + pad };
  },
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(obv, candles, inputs);
    if (!data || index < 0 || index >= data.obv.length) return null;
    const v = data.obv[index];
    return Number.isFinite(v) ? v : null;
  },
};
