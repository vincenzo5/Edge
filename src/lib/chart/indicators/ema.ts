import type { IndicatorPlugin } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { closes, ema } from './math';
import { drawLineSeries, emaLineColor } from './draw';

type EmaParams = { period: number };

function resolveParams(params?: Record<string, number>): EmaParams {
  return { period: params?.period ?? 20 };
}

export const emaPlugin: IndicatorPlugin = {
  name: 'EMA',
  category: 'Trend',
  description: 'Exponential Moving Average',
  pane: 'main',
  defaultParams: { period: 20 },
  paramSchema: {
    period: { label: 'Period', default: 20, min: 1, max: 500, step: 1 },
  },
  compute(candles, params) {
    const { period } = resolveParams(params);
    return { ema: ema(closes(candles), period) };
  },
  outputs: [
    {
      id: 'ema',
      label: 'EMA',
      key: 'ema',
      tooltip: 'Exponential moving average of close',
      decimals: 2,
      color: emaLineColor,
    },
  ],
  valueAt(index, candles, params) {
    const data = getComputedSeries(emaPlugin, candles, params);
    if (!data || index < 0 || index >= data.ema.length) return null;
    const v = data.ema[index];
    return Number.isFinite(v) ? v : null;
  },
  draw(ctx, candles, vp, theme, params) {
    const data = getComputedSeries(emaPlugin, candles, params);
    if (!data) return;
    drawLineSeries(ctx, data.ema, vp, emaLineColor(theme));
  },
};
