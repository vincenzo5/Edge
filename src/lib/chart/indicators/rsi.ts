import type { IndicatorPlugin, ResolvedInputs } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { closes, computeRsi, fixedRange } from './math';
import { guideLineColor, rsiLineColor } from './draw';

function resolvePeriod(inputs: ResolvedInputs): number {
  const v = inputs.period;
  return typeof v === 'number' && Number.isFinite(v) ? v : 14;
}

export const rsi: IndicatorPlugin = {
  name: 'RSI',
  category: 'Momentum',
  description: 'Relative Strength Index',
  pane: 'sub',
  defaultInputs: { period: 14 },
  inputSchema: {
    period: { kind: 'number', label: 'Period', default: 14, min: 2, max: 100, step: 1 },
  },
  compute(candles, inputs) {
    const period = resolvePeriod(inputs);
    return { rsi: computeRsi(closes(candles), period) };
  },
  outputs: [
    {
      id: 'upper-guide',
      label: '',
      key: 'rsi',
      plot: 'hline',
      hlineAt: 70,
      color: guideLineColor,
      lineWidth: 1,
    },
    {
      id: 'lower-guide',
      label: '',
      key: 'rsi',
      plot: 'hline',
      hlineAt: 30,
      color: guideLineColor,
      lineWidth: 1,
    },
    {
      id: 'rsi',
      label: 'RSI',
      key: 'rsi',
      plot: 'line',
      tooltip: 'Relative Strength Index',
      decimals: 2,
      color: rsiLineColor,
    },
  ],
  valueRangeForViewport() {
    return fixedRange(0, 100);
  },
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(rsi, candles, inputs);
    if (!data || index < 0 || index >= data.rsi.length) return null;
    const v = data.rsi[index];
    return Number.isFinite(v) ? v : null;
  },
};
