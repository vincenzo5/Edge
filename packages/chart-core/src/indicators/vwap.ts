import type { IndicatorPlugin } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { computeVwap } from './math';
import { vwapLineColor } from './draw';

export const vwap: IndicatorPlugin = {
  name: 'VWAP',
  category: 'Volume',
  description: 'Volume Weighted Average Price',
  pane: 'main',
  inputSchema: {},
  compute(candles) {
    return { vwap: computeVwap(candles) };
  },
  outputs: [
    {
      id: 'vwap',
      label: 'VWAP',
      key: 'vwap',
      plot: 'line',
      tooltip: 'Cumulative volume-weighted average price',
      decimals: 2,
      color: vwapLineColor,
    },
  ],
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(vwap, candles, inputs);
    if (!data || index < 0 || index >= data.vwap.length) return null;
    const v = data.vwap[index];
    return Number.isFinite(v) ? v : null;
  },
};
