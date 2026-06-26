import type { IndicatorPlugin, ResolvedInputs } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { computeAtr, rangeInViewport } from './math';
import { atrLineColor } from './draw';

function resolvePeriod(inputs: ResolvedInputs): number {
  const v = inputs.period;
  return typeof v === 'number' && Number.isFinite(v) ? v : 14;
}

export const atr: IndicatorPlugin = {
  name: 'ATR',
  category: 'Volatility',
  description: 'Average True Range',
  pane: 'sub',
  defaultInputs: { period: 14 },
  inputSchema: {
    period: { kind: 'number', label: 'Period', default: 14, min: 1, max: 200, step: 1 },
  },
  compute(candles, inputs) {
    const period = resolvePeriod(inputs);
    return { atr: computeAtr(candles, period) };
  },
  outputs: [
    {
      id: 'atr',
      label: 'ATR',
      key: 'atr',
      plot: 'line',
      tooltip: 'Wilder-smoothed average true range',
      decimals: 4,
      color: atrLineColor,
    },
  ],
  valueRangeForViewport(candles, vp, inputs) {
    const data = getComputedSeries(atr, candles, inputs);
    if (!data) return null;
    const range = rangeInViewport(data.atr, vp.startIndex, vp.endIndex);
    if (!range) return null;
    const pad = (range.max - range.min) * 0.1 || range.max * 0.1 || 1;
    return { min: Math.max(0, range.min - pad), max: range.max + pad };
  },
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(atr, candles, inputs);
    if (!data || index < 0 || index >= data.atr.length) return null;
    const v = data.atr[index];
    return Number.isFinite(v) ? v : null;
  },
};
