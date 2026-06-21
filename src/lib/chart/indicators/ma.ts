import type { IndicatorPlugin } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { closes, sma } from './math';
import { drawLineSeries, maLineColor } from './draw';

type MaParams = { period: number };

function resolveParams(params?: Record<string, number>): MaParams {
  return { period: params?.period ?? 20 };
}

export const ma: IndicatorPlugin = {
  name: 'MA',
  category: 'Trend',
  description: 'Moving Average',
  pane: 'main',
  defaultParams: { period: 20 },
  paramSchema: {
    period: { label: 'Period', default: 20, min: 1, max: 500, step: 1 },
  },
  compute(candles, params) {
    const { period } = resolveParams(params);
    return { ma: sma(closes(candles), period) };
  },
  outputs: [
    {
      id: 'ma',
      label: 'MA',
      key: 'ma',
      tooltip: 'Simple moving average of close',
      decimals: 2,
      color: maLineColor,
    },
  ],
  valueAt(index, candles, params) {
    const data = getComputedSeries(ma, candles, params);
    if (!data || index < 0 || index >= data.ma.length) return null;
    const v = data.ma[index];
    return Number.isFinite(v) ? v : null;
  },
  draw(ctx, candles, vp, theme, params) {
    const data = getComputedSeries(ma, candles, params);
    if (!data) return;
    drawLineSeries(ctx, data.ma, vp, maLineColor(theme));
  },
};
