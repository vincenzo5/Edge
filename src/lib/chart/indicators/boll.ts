import type { IndicatorPlugin } from '../plugin-api';
import type { Theme } from '../contracts';
import { getComputedSeries } from '../indicatorCompute';
import { closes, computeBollinger } from './math';
import { bollMiddleColor, drawBand, drawLineSeries } from './draw';

type BollParams = { period: number; std: number };

function resolveParams(params?: Record<string, number>): BollParams {
  return {
    period: params?.period ?? 20,
    std: params?.std ?? 2,
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
  defaultParams: { period: 20, std: 2 },
  paramSchema: {
    period: { label: 'Period', default: 20, min: 1, max: 500, step: 1 },
    std: { label: 'Std Dev', default: 2, min: 0.1, max: 5, step: 0.1 },
  },
  compute(candles, params) {
    const { period, std } = resolveParams(params);
    const { middle, upper, lower } = computeBollinger(closes(candles), period, std);
    return { middle, upper, lower };
  },
  outputs: [
    {
      id: 'upper',
      label: 'Upper',
      key: 'upper',
      tooltip: 'Upper Bollinger band',
      decimals: 2,
      color: bollMiddleColor,
    },
    {
      id: 'middle',
      label: 'Middle',
      key: 'middle',
      tooltip: 'Middle band (SMA)',
      decimals: 2,
      color: bollMiddleColor,
    },
    {
      id: 'lower',
      label: 'Lower',
      key: 'lower',
      tooltip: 'Lower Bollinger band',
      decimals: 2,
      color: bollMiddleColor,
    },
  ],
  valueAt(index, candles, params) {
    const data = getComputedSeries(boll, candles, params);
    if (!data || index < 0 || index >= data.middle.length) return null;
    const v = data.middle[index];
    return Number.isFinite(v) ? v : null;
  },
  draw(ctx, candles, vp, theme, params) {
    const data = getComputedSeries(boll, candles, params);
    if (!data) return;

    drawBand(ctx, data.upper, data.lower, vp, bandFillColor(theme));
    drawLineSeries(ctx, data.middle, vp, bollMiddleColor(theme), 1.5);
  },
};
