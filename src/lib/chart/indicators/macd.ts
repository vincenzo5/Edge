import type { IndicatorPlugin } from '../plugin-api';
import type { Candle, VisibleRange, Theme } from '../contracts';
import { plotWidth } from '../layout';
import { computeMacd, mergeRanges, rangeInViewport, symmetricRangeAroundZero } from './math';

type MacdParams = { fast: number; slow: number; signal: number };

function resolveParams(params?: Record<string, number>): MacdParams {
  return {
    fast: params?.fast ?? 12,
    slow: params?.slow ?? 26,
    signal: params?.signal ?? 9,
  };
}

function getSeries(candles: Candle[], params?: Record<string, number>) {
  const { fast, slow, signal } = resolveParams(params);
  return computeMacd(candles.map((c) => c.c), fast, slow, signal);
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  values: number[],
  vp: VisibleRange,
  color: string,
  width = 1.5
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  let started = false;
  for (let i = Math.floor(vp.startIndex); i < Math.ceil(vp.endIndex); i++) {
    if (i < 0 || i >= values.length) continue;
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    const x = vp.xForIndex(i);
    const y = vp.yForPrice(v);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  if (started) ctx.stroke();
}

function drawHistogram(
  ctx: CanvasRenderingContext2D,
  values: number[],
  vp: VisibleRange,
  theme: Theme
) {
  const span = vp.endIndex - vp.startIndex;
  if (span <= 0) return;
  const barW = Math.max(1, (plotWidth(vp.width) / span) * 0.7);
  const up = theme === 'dark' ? '#22c55e' : '#16a34a';
  const down = theme === 'dark' ? '#ef4444' : '#dc2626';
  const zeroY = vp.yForPrice(0);

  for (let i = Math.floor(vp.startIndex); i < Math.ceil(vp.endIndex); i++) {
    if (i < 0 || i >= values.length) continue;
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    const x = vp.xForIndex(i);
    const y = vp.yForPrice(v);
    ctx.fillStyle = v >= 0 ? up : down;
    const top = Math.min(zeroY, y);
    const h = Math.abs(y - zeroY);
    if (h > 0) {
      ctx.fillRect(x - barW / 2, top, barW, h);
    }
  }
}

export const macd: IndicatorPlugin = {
  name: 'MACD',
  pane: 'sub',
  defaultParams: { fast: 12, slow: 26, signal: 9 },
  valueRangeForViewport(candles, vp, params) {
    const { macd: macdLine, signal, histogram } = getSeries(candles, params);
    const range = mergeRanges([
      rangeInViewport(macdLine, vp.startIndex, vp.endIndex),
      rangeInViewport(signal, vp.startIndex, vp.endIndex),
      rangeInViewport(histogram, vp.startIndex, vp.endIndex),
    ]);
    return symmetricRangeAroundZero(range);
  },
  valueAt(index, candles, params) {
    const { macd: macdLine } = getSeries(candles, params);
    if (index < 0 || index >= macdLine.length) return null;
    const v = macdLine[index];
    return Number.isFinite(v) ? v : null;
  },
  draw(ctx, candles, vp, theme, params) {
    const { macd: macdLine, signal, histogram } = getSeries(candles, params);

    const zeroY = vp.yForPrice(0);
    ctx.strokeStyle = theme === 'dark' ? '#4b5563' : '#9ca3af';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(plotWidth(vp.width), zeroY);
    ctx.stroke();

    drawHistogram(ctx, histogram, vp, theme);
    drawLine(ctx, macdLine, vp, theme === 'dark' ? '#60a5fa' : '#2563eb');
    drawLine(ctx, signal, vp, theme === 'dark' ? '#f59e0b' : '#d97706');
  },
};
