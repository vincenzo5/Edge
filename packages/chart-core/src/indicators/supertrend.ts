import type { IndicatorPlugin, ResolvedInputs } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { computeSupertrend } from './math';
import { supertrendLineColor } from './draw';

function resolveInputs(inputs: ResolvedInputs): { atrPeriod: number; multiplier: number } {
  const atrPeriod =
    typeof inputs.atrPeriod === 'number' && Number.isFinite(inputs.atrPeriod)
      ? inputs.atrPeriod
      : 10;
  const multiplier =
    typeof inputs.multiplier === 'number' && Number.isFinite(inputs.multiplier)
      ? inputs.multiplier
      : 3;
  return { atrPeriod, multiplier };
}

export const supertrend: IndicatorPlugin = {
  name: 'Supertrend',
  category: 'Trend',
  description: 'ATR-based trend following indicator',
  pane: 'main',
  defaultInputs: { atrPeriod: 10, multiplier: 3 },
  inputSchema: {
    atrPeriod: { kind: 'number', label: 'ATR Period', default: 10, min: 1, max: 100, step: 1 },
    multiplier: {
      kind: 'number',
      label: 'Multiplier',
      default: 3,
      min: 0.1,
      max: 10,
      step: 0.1,
    },
  },
  compute(candles, inputs) {
    const { atrPeriod, multiplier } = resolveInputs(inputs);
    const { supertrend: st, direction } = computeSupertrend(candles, atrPeriod, multiplier);
    return { supertrend: st, direction };
  },
  outputs: [
    {
      id: 'supertrend',
      label: 'ST',
      key: 'supertrend',
      plot: 'line',
      tooltip: 'Supertrend line',
      decimals: 2,
      color: supertrendLineColor,
    },
  ],
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(supertrend, candles, inputs);
    if (!data || index < 0 || index >= data.supertrend.length) return null;
    const v = data.supertrend[index];
    return Number.isFinite(v) ? v : null;
  },
};
