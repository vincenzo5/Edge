import type { IndicatorPlugin } from '../plugin-api';
import type { Candle } from '../contracts';
import { getComputedSeries } from '../indicatorCompute';
import { computeMacd, mergeRanges, rangeInViewport, symmetricRangeAroundZero } from './math';
import {
  drawHistogramSeries,
  drawHorizontalGuide,
  drawLineSeries,
  guideLineColor,
  histogramColor,
  macdLineColor,
  signalLineColor,
} from './draw';

type MacdParams = { fast: number; slow: number; signal: number };

function resolveParams(params?: Record<string, number>): MacdParams {
  return {
    fast: params?.fast ?? 12,
    slow: params?.slow ?? 26,
    signal: params?.signal ?? 9,
  };
}

function computeMacdSeries(candles: Candle[], params?: Record<string, number>) {
  const { fast, slow, signal } = resolveParams(params);
  return computeMacd(
    candles.map((c) => c.c),
    fast,
    slow,
    signal,
  );
}

export const macd: IndicatorPlugin = {
  name: 'MACD',
  category: 'Momentum',
  description: 'Moving Average Convergence Divergence',
  pane: 'sub',
  defaultParams: { fast: 12, slow: 26, signal: 9 },
  paramSchema: {
    fast: { label: 'Fast', default: 12, min: 1, max: 100, step: 1 },
    slow: { label: 'Slow', default: 26, min: 1, max: 200, step: 1 },
    signal: { label: 'Signal', default: 9, min: 1, max: 100, step: 1 },
  },
  compute(candles, params) {
    const { macd: macdLine, signal, histogram } = computeMacdSeries(candles, params);
    return { macd: macdLine, signal, histogram };
  },
  outputs: [
    {
      id: 'macd',
      label: 'MACD',
      key: 'macd',
      tooltip: 'MACD line — fast EMA minus slow EMA',
      decimals: 4,
      color: macdLineColor,
    },
    {
      id: 'signal',
      label: 'Signal',
      key: 'signal',
      tooltip: 'Signal line — smoothed MACD line',
      decimals: 4,
      color: signalLineColor,
    },
    {
      id: 'histogram',
      label: 'Hist',
      key: 'histogram',
      tooltip: 'Histogram — MACD minus signal',
      decimals: 4,
      color: histogramColor,
    },
  ],
  valueRangeForViewport(candles, vp, params) {
    const data = getComputedSeries(macd, candles, params);
    if (!data) return null;
    const range = mergeRanges([
      rangeInViewport(data.macd, vp.startIndex, vp.endIndex),
      rangeInViewport(data.signal, vp.startIndex, vp.endIndex),
      rangeInViewport(data.histogram, vp.startIndex, vp.endIndex),
    ]);
    return symmetricRangeAroundZero(range);
  },
  valueAt(index, candles, params) {
    const data = getComputedSeries(macd, candles, params);
    if (!data || index < 0 || index >= data.macd.length) return null;
    const v = data.macd[index];
    return Number.isFinite(v) ? v : null;
  },
  draw(ctx, candles, vp, theme, params) {
    const data = getComputedSeries(macd, candles, params);
    if (!data) return;

    drawHorizontalGuide(ctx, vp, 0, guideLineColor(theme));
    drawHistogramSeries(ctx, data.histogram, vp, theme);
    drawLineSeries(ctx, data.macd, vp, macdLineColor(theme));
    drawLineSeries(ctx, data.signal, vp, signalLineColor(theme));
  },
};
