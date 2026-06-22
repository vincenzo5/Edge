import type { IndicatorPlugin, ResolvedInputs } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { closes, ema } from './math';
import { emaLineColor } from './draw';

function resolvePeriod(inputs: ResolvedInputs): number {
  const v = inputs.period;
  return typeof v === 'number' && Number.isFinite(v) ? v : 20;
}

export const emaPlugin: IndicatorPlugin = {
  name: 'EMA',
  category: 'Trend',
  description: 'Exponential Moving Average',
  pane: 'main',
  defaultInputs: { period: 20 },
  inputSchema: {
    period: { kind: 'number', label: 'Period', default: 20, min: 1, max: 500, step: 1 },
  },
  compute(candles, inputs) {
    const period = resolvePeriod(inputs);
    return { ema: ema(closes(candles), period) };
  },
  outputs: [
    {
      id: 'ema',
      label: 'EMA',
      key: 'ema',
      plot: 'line',
      tooltip: 'Exponential moving average of close',
      decimals: 2,
      color: emaLineColor,
    },
  ],
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(emaPlugin, candles, inputs);
    if (!data || index < 0 || index >= data.ema.length) return null;
    const v = data.ema[index];
    return Number.isFinite(v) ? v : null;
  },
};
