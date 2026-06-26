import type { IndicatorPlugin, ResolvedInputs } from '../plugin-api';
import { getComputedSeries } from '../indicatorCompute';
import { computeMacd, mergeRanges, rangeInViewport, symmetricRangeAroundZero } from './math';
import { guideLineColor, histogramColor, macdLineColor, signalLineColor } from './draw';

type MacdInputs = { fast: number; slow: number; signal: number };

function resolveMacdInputs(inputs: ResolvedInputs): MacdInputs {
  return {
    fast: typeof inputs.fast === 'number' ? inputs.fast : 12,
    slow: typeof inputs.slow === 'number' ? inputs.slow : 26,
    signal: typeof inputs.signal === 'number' ? inputs.signal : 9,
  };
}

function computeMacdSeries(candles: import('../contracts').Candle[], inputs: ResolvedInputs) {
  const { fast, slow, signal } = resolveMacdInputs(inputs);
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
  defaultInputs: { fast: 12, slow: 26, signal: 9 },
  inputSchema: {
    fast: { kind: 'number', label: 'Fast', default: 12, min: 1, max: 100, step: 1 },
    slow: { kind: 'number', label: 'Slow', default: 26, min: 1, max: 200, step: 1 },
    signal: { kind: 'number', label: 'Signal', default: 9, min: 1, max: 100, step: 1 },
  },
  compute(candles, inputs) {
    const { macd: macdLine, signal, histogram } = computeMacdSeries(candles, inputs);
    return { macd: macdLine, signal, histogram };
  },
  outputs: [
    {
      id: 'zero',
      label: '',
      key: 'macd',
      plot: 'hline',
      hlineAt: 0,
      color: guideLineColor,
      lineWidth: 1,
    },
    {
      id: 'histogram',
      label: 'Hist',
      key: 'histogram',
      plot: 'histogram',
      tooltip: 'Histogram — MACD minus signal',
      decimals: 4,
      color: histogramColor,
    },
    {
      id: 'macd',
      label: 'MACD',
      key: 'macd',
      plot: 'line',
      tooltip: 'MACD line — fast EMA minus slow EMA',
      decimals: 4,
      color: macdLineColor,
    },
    {
      id: 'signal',
      label: 'Signal',
      key: 'signal',
      plot: 'line',
      tooltip: 'Signal line — smoothed MACD line',
      decimals: 4,
      color: signalLineColor,
    },
  ],
  valueRangeForViewport(candles, vp, inputs) {
    const data = getComputedSeries(macd, candles, inputs);
    if (!data) return null;
    const range = mergeRanges([
      rangeInViewport(data.macd, vp.startIndex, vp.endIndex),
      rangeInViewport(data.signal, vp.startIndex, vp.endIndex),
      rangeInViewport(data.histogram, vp.startIndex, vp.endIndex),
    ]);
    return symmetricRangeAroundZero(range);
  },
  valueAt(index, candles, inputs) {
    const data = getComputedSeries(macd, candles, inputs);
    if (!data || index < 0 || index >= data.macd.length) return null;
    const v = data.macd[index];
    return Number.isFinite(v) ? v : null;
  },
};
