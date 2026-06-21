import type { Candle, Theme, VisibleRange } from '../contracts';
import { plotWidth } from '../layout';
import { getColors } from '../renderer';

export function drawLineSeries(
  ctx: CanvasRenderingContext2D,
  values: number[],
  vp: VisibleRange,
  color: string,
  width = 1.5,
): void {
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

export function drawHorizontalGuide(
  ctx: CanvasRenderingContext2D,
  vp: VisibleRange,
  price: number,
  color: string,
  width = 1,
): void {
  const y = vp.yForPrice(price);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(plotWidth(vp.width), y);
  ctx.stroke();
}

export function histogramColor(theme: Theme, value: number | null): string {
  if (value != null && Number.isFinite(value) && value >= 0) {
    return theme === 'dark' ? '#22c55e' : '#16a34a';
  }
  return theme === 'dark' ? '#ef4444' : '#dc2626';
}

export function drawHistogramSeries(
  ctx: CanvasRenderingContext2D,
  values: number[],
  vp: VisibleRange,
  theme: Theme,
  zeroPrice = 0,
  colorFn: (theme: Theme, value: number | null) => string = histogramColor,
): void {
  const span = vp.endIndex - vp.startIndex;
  if (span <= 0) return;
  const barW = Math.max(1, (plotWidth(vp.width) / span) * 0.7);
  const zeroY = vp.yForPrice(zeroPrice);

  for (let i = Math.floor(vp.startIndex); i < Math.ceil(vp.endIndex); i++) {
    if (i < 0 || i >= values.length) continue;
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    const x = vp.xForIndex(i);
    const y = vp.yForPrice(v);
    ctx.fillStyle = colorFn(theme, v);
    const top = Math.min(zeroY, y);
    const h = Math.abs(y - zeroY);
    if (h > 0) {
      ctx.fillRect(x - barW / 2, top, barW, h);
    }
  }
}

export function drawBand(
  ctx: CanvasRenderingContext2D,
  upper: number[],
  lower: number[],
  vp: VisibleRange,
  fillColor: string,
  strokeColor?: string,
): void {
  const start = Math.max(0, Math.floor(vp.startIndex));
  const end = Math.min(upper.length, Math.ceil(vp.endIndex));
  if (end <= start) return;

  ctx.fillStyle = fillColor;
  ctx.beginPath();
  let started = false;
  for (let i = start; i < end; i++) {
    const u = upper[i];
    if (!Number.isFinite(u)) continue;
    const x = vp.xForIndex(i);
    const y = vp.yForPrice(u);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  for (let i = end - 1; i >= start; i--) {
    const l = lower[i];
    if (!Number.isFinite(l)) continue;
    ctx.lineTo(vp.xForIndex(i), vp.yForPrice(l));
  }
  ctx.closePath();
  ctx.fill();

  if (strokeColor) {
    drawLineSeries(ctx, upper, vp, strokeColor, 1);
    drawLineSeries(ctx, lower, vp, strokeColor, 1);
  }
}

export function macdLineColor(theme: Theme): string {
  return theme === 'dark' ? '#60a5fa' : '#2563eb';
}

export function signalLineColor(theme: Theme): string {
  return theme === 'dark' ? '#f59e0b' : '#d97706';
}

export function maLineColor(theme: Theme): string {
  return theme === 'dark' ? '#60a5fa' : '#3b82f6';
}

export function emaLineColor(theme: Theme): string {
  return theme === 'dark' ? '#34d399' : '#059669';
}

/** Volume bars colored by candle direction (up/down). */
export function drawVolumeBars(
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  vp: VisibleRange,
  theme: Theme,
): void {
  const colors = getColors(theme);
  const span = vp.endIndex - vp.startIndex;
  if (span <= 0) return;
  const barW = Math.max(1, (plotWidth(vp.width) / span) * 0.7);
  const zeroY = vp.yForPrice(0);

  for (let i = Math.floor(vp.startIndex); i < Math.ceil(vp.endIndex); i++) {
    if (i < 0 || i >= candles.length) continue;
    const c = candles[i];
    const v = c.v ?? 0;
    if (!Number.isFinite(v) || v <= 0) continue;
    const x = vp.xForIndex(i);
    const y = vp.yForPrice(v);
    ctx.fillStyle = c.c >= c.o ? colors.up : colors.down;
    const top = Math.min(zeroY, y);
    const h = Math.abs(y - zeroY);
    if (h > 0) {
      ctx.fillRect(x - barW / 2, top, barW, h);
    }
  }
}

export function bollMiddleColor(theme: Theme): string {
  return theme === 'dark' ? '#a78bfa' : '#7c3aed';
}

export function rsiLineColor(theme: Theme): string {
  return theme === 'dark' ? '#f59e0b' : '#d97706';
}

export function guideLineColor(theme: Theme): string {
  return theme === 'dark' ? '#4b5563' : '#9ca3af';
}
