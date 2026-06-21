import type { IndicatorPlugin } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { closes, computeRsi, fixedRange } from './math';
import {
  drawHorizontalGuide,
  drawLineSeries,
  guideLineColor,
  rsiLineColor,
} from './draw';

type RsiParams = { period: number };

function resolveParams(params?: Record<string, number>): RsiParams {
  return { period: params?.period ?? 14 };
}

export const rsi: IndicatorPlugin = {
  name: 'RSI',
  category: 'Momentum',
  description: 'Relative Strength Index',
  pane: 'sub',
  defaultParams: { period: 14 },
  paramSchema: {
    period: { label: 'Period', default: 14, min: 2, max: 100, step: 1 },
  },
  compute(candles, params) {
    const { period } = resolveParams(params);
    return { rsi: computeRsi(closes(candles), period) };
  },
  outputs: [
    {
      id: 'rsi',
      label: 'RSI',
      key: 'rsi',
      tooltip: 'Relative Strength Index',
      decimals: 2,
      color: rsiLineColor,
    },
  ],
  valueRangeForViewport() {
    return fixedRange(0, 100);
  },
  valueAt(index, candles, params) {
    const data = getComputedSeries(rsi, candles, params);
    if (!data || index < 0 || index >= data.rsi.length) return null;
    const v = data.rsi[index];
    return Number.isFinite(v) ? v : null;
  },
  draw(ctx, candles, vp, theme, params) {
    const data = getComputedSeries(rsi, candles, params);
    if (!data) return;

    drawHorizontalGuide(ctx, vp, 70, guideLineColor(theme));
    drawHorizontalGuide(ctx, vp, 30, guideLineColor(theme));
    drawLineSeries(ctx, data.rsi, vp, rsiLineColor(theme));
  },
};
