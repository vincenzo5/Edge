import type { IndicatorPlugin, ResolvedInputs } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { closes, sma } from './math';
import { maLineColor } from './draw';

function resolvePeriod(inputs: ResolvedInputs): number {
  const v = inputs.period;
  return typeof v === 'number' && Number.isFinite(v) ? v : 20;
}

export const ma: IndicatorPlugin = {
  name: 'MA',
  category: 'Trend',
  description: 'Moving Average',
  pane: 'main',
  defaultInputs: { period: 20 },
  inputSchema: {
    period: { kind: 'number', label: 'Period', default: 20, min: 1, max: 500, step: 1 },
  },
  compute(candles, inputs) {
    const period = resolvePeriod(inputs);
    return { ma: sma(closes(candles), period) };
  },
  outputs: [
    {
      id: 'ma',
      label: 'MA',
      key: 'ma',
      plot: 'line',
      tooltip: 'Simple moving average of close',
      decimals: 2,
      color: maLineColor,
    },
  ],
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(ma, candles, inputs);
    if (!data || index < 0 || index >= data.ma.length) return null;
    const v = data.ma[index];
    return Number.isFinite(v) ? v : null;
  },
};
