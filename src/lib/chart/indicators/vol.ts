import type { IndicatorPlugin } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { rangeInViewport, volumes } from './math';
import { drawVolumeBars } from './draw';

export const vol: IndicatorPlugin = {
  name: 'VOL',
  category: 'Volume',
  description: 'Volume',
  pane: 'sub',
  paramSchema: {},
  compute(candles) {
    return { vol: volumes(candles) };
  },
  outputs: [
    {
      id: 'vol',
      label: 'Vol',
      key: 'vol',
      tooltip: 'Bar volume',
      decimals: 0,
    },
  ],
  valueRangeForViewport(candles, vp, params) {
    const data = getComputedSeries(vol, candles, params);
    if (!data) return null;
    const range = rangeInViewport(data.vol, vp.startIndex, vp.endIndex);
    if (!range) return null;
    const pad = (range.max - range.min) * 0.05 || range.max * 0.05 || 1;
    return { min: 0, max: range.max + pad };
  },
  legendAt(index, candles, params, theme) {
    const data = getComputedSeries(vol, candles, params);
    if (!data || index < 0 || index >= data.vol.length) return null;
    const v = data.vol[index];
    if (!Number.isFinite(v)) return null;
    return [
      {
        id: 'vol',
        label: 'Vol',
        value: v,
        tooltip: 'Bar volume',
        decimals: 0,
      },
    ];
  },
  valueAt(index, candles, params) {
    const data = getComputedSeries(vol, candles, params);
    if (!data || index < 0 || index >= data.vol.length) return null;
    const v = data.vol[index];
    return Number.isFinite(v) ? v : null;
  },
  draw(ctx, candles, vp, theme, params) {
    drawVolumeBars(ctx, candles, vp, theme);
  },
};
