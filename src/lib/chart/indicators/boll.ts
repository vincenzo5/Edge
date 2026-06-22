import type { IndicatorPlugin, ResolvedInputs } from '../plugin-api';
import type { Theme } from '../contracts';
import { getComputedSeries } from '../indicatorCompute';
import { closes, computeBollinger } from './math';
import { bollMiddleColor } from './draw';

function resolveBollInputs(inputs: ResolvedInputs): { period: number; std: number } {
  return {
    period: typeof inputs.period === 'number' ? inputs.period : 20,
    std: typeof inputs.std === 'number' ? inputs.std : 2,
  };
}

function bandFillColor(theme: Theme): string {
  return theme === 'dark' ? 'rgba(167, 139, 250, 0.12)' : 'rgba(124, 58, 237, 0.12)';
}

export const boll: IndicatorPlugin = {
  name: 'BOLL',
  category: 'Trend',
  description: 'Bollinger Bands',
  pane: 'main',
  defaultInputs: { period: 20, std: 2 },
  inputSchema: {
    period: { kind: 'number', label: 'Period', default: 20, min: 1, max: 500, step: 1 },
    std: { kind: 'number', label: 'Std Dev', default: 2, min: 0.1, max: 5, step: 0.1 },
  },
  compute(candles, inputs) {
    const { period, std } = resolveBollInputs(inputs);
    const { middle, upper, lower } = computeBollinger(closes(candles), period, std);
    return { middle, upper, lower };
  },
  outputs: [
    {
      id: 'upper',
      label: 'Upper',
      key: 'upper',
      plot: 'line',
      fillBetween: 'lower',
      fillColor: bandFillColor,
      tooltip: 'Upper Bollinger band',
      decimals: 2,
      color: bollMiddleColor,
    },
    {
      id: 'middle',
      label: 'Middle',
      key: 'middle',
      plot: 'line',
      tooltip: 'Middle band (SMA)',
      decimals: 2,
      color: bollMiddleColor,
    },
    {
      id: 'lower',
      label: 'Lower',
      key: 'lower',
      plot: 'line',
      tooltip: 'Lower Bollinger band',
      decimals: 2,
      color: bollMiddleColor,
    },
  ],
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(boll, candles, inputs);
    if (!data || index < 0 || index >= data.middle.length) return null;
    const v = data.middle[index];
    return Number.isFinite(v) ? v : null;
  },
};
