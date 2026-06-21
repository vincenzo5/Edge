import type { Candle, VisibleRange, Theme } from './contracts';
import { PRICE_AXIS_WIDTH, TIME_AXIS_HEIGHT } from './layout';

const COLORS = {
  light: {
    up: '#22c55e',
    down: '#ef4444',
    wick: '#111827',
    grid: '#e5e7eb',
    text: '#374151',
    crosshair: '#9ca3af',
    lastPrice: '#3b82f6',
    axisBg: '#f3f4f6',
    axisBorder: '#e5e7eb',
  },
  dark: {
    up: '#22c55e',
    down: '#ef4444',
    wick: '#f3f4f6',
    grid: '#374151',
    text: '#9ca3af',
    crosshair: '#6b7280',
    lastPrice: '#60a5fa',
    axisBg: '#12131A',
    axisBorder: '#1E2030',
  },
};

export function getColors(theme: Theme) {
  return COLORS[theme];
}

export function drawGrid(ctx: CanvasRenderingContext2D, vp: VisibleRange, width: number, height: number, theme: Theme) {
  const c = getColors(theme);
  ctx.strokeStyle = c.grid;
  ctx.lineWidth = 1;
  // vertical lines (time)
  const step = Math.max(1, Math.floor((vp.endIndex - vp.startIndex) / 8));
  for (let i = vp.startIndex; i < vp.endIndex; i += step) {
    const x = vp.xForIndex(i);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  // horizontal lines (price)
  const priceStep = (vp.priceMax - vp.priceMin) / 6;
  for (let p = vp.priceMin; p <= vp.priceMax; p += priceStep) {
    const y = vp.yForPrice(p);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

export function drawCandles(
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  vp: VisibleRange,
  theme: Theme,
  chartType: 'candle_solid' | 'candle_stroke' | 'ohlc' | 'area' | 'heikin_ashi'
) {
  const c = getColors(theme);
  const visibleSpan = vp.endIndex - vp.startIndex;
  if (visibleSpan <= 0) return;
  const w = (vp.width / visibleSpan) * 0.7;

  if (chartType === 'area') {
    ctx.fillStyle = c.up + '33';
    ctx.strokeStyle = c.up;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let first = true;
    for (let idx = vp.startIndex; idx < vp.endIndex; idx++) {
      if (idx < 0 || idx >= candles.length) continue;
      const x = vp.xForIndex(idx);
      const y = vp.yForPrice(candles[idx].c);
      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    const lastDataIdx = Math.min(candles.length - 1, vp.endIndex - 1);
    const firstDataIdx = Math.max(0, vp.startIndex);
    if (lastDataIdx >= firstDataIdx) {
      ctx.lineTo(vp.xForIndex(lastDataIdx), vp.height);
      ctx.lineTo(vp.xForIndex(firstDataIdx), vp.height);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }

  for (let idx = vp.startIndex; idx < vp.endIndex; idx++) {
    if (idx < 0 || idx >= candles.length) continue;
    const candle = candles[idx];
    const x = vp.xForIndex(idx);
    const isUp = candle.c >= candle.o;
    const color = isUp ? c.up : c.down;

    const yHigh = vp.yForPrice(candle.h);
    const yLow = vp.yForPrice(candle.l);
    const yOpen = vp.yForPrice(candle.o);
    const yClose = vp.yForPrice(candle.c);

    ctx.strokeStyle = c.wick;
    ctx.lineWidth = 1;
    // wick
    ctx.beginPath();
    ctx.moveTo(x + w / 2, yHigh);
    ctx.lineTo(x + w / 2, yLow);
    ctx.stroke();

    if (chartType === 'ohlc') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      // open tick left
      ctx.beginPath();
      ctx.moveTo(x, yOpen);
      ctx.lineTo(x + w / 2, yOpen);
      ctx.stroke();
      // close tick right
      ctx.beginPath();
      ctx.moveTo(x + w / 2, yClose);
      ctx.lineTo(x + w, yClose);
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      const yBodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(1, Math.abs(yOpen - yClose));
      if (chartType === 'candle_stroke') {
        ctx.strokeRect(x, yBodyTop, w, bodyH);
      } else {
        ctx.fillRect(x, yBodyTop, w, bodyH);
      }
    }
  }
}

export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vp: VisibleRange,
  width: number,
  height: number,
  theme: Theme
) {
  const c = getColors(theme);
  ctx.strokeStyle = c.crosshair;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 2]);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawLastPrice(ctx: CanvasRenderingContext2D, price: number, vp: VisibleRange, width: number, theme: Theme) {
  if (!Number.isFinite(price)) return;
  const c = getColors(theme);
  const y = vp.yForPrice(price);
  ctx.strokeStyle = c.lastPrice;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
  // label
  ctx.fillStyle = c.lastPrice;
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText(price.toFixed(2), width - 50, y - 4);
}

export function drawAxes(ctx: CanvasRenderingContext2D, vp: VisibleRange, width: number, height: number, theme: Theme, candles?: Candle[]) {
  drawAxisStrips(ctx, width, height, theme);
  const c = getColors(theme);
  ctx.fillStyle = c.text;
  ctx.font = '11px Inter, sans-serif';
  // price labels
  const step = (vp.priceMax - vp.priceMin) / 6;
  if (!Number.isFinite(step) || step <= 0) return;
  for (let p = vp.priceMin; p <= vp.priceMax; p += step) {
    if (!Number.isFinite(p)) continue;
    const y = vp.yForPrice(p);
    ctx.fillText(p.toFixed(2), width - 45, y + 4);
  }
  // time labels
  if (candles) {
    const timeStep = Math.max(1, Math.floor((vp.endIndex - vp.startIndex) / 5));
    for (let i = vp.startIndex; i < vp.endIndex; i += timeStep) {
      if (i < 0 || i >= candles.length) continue;
      const x = vp.xForIndex(i);
      const t = candles[i]?.t;
      const label = t ? new Date(t).toLocaleDateString() : '';
      ctx.fillText(label, x, height - 4);
    }
  }
}

function drawAxisStrips(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme) {
  const c = getColors(theme);
  const pw = width - PRICE_AXIS_WIDTH;
  const ph = height - TIME_AXIS_HEIGHT;

  ctx.fillStyle = c.axisBg;
  ctx.fillRect(pw, 0, PRICE_AXIS_WIDTH, height);
  ctx.fillRect(0, ph, pw, TIME_AXIS_HEIGHT);

  ctx.strokeStyle = c.axisBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pw, 0);
  ctx.lineTo(pw, height);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, ph);
  ctx.lineTo(pw, ph);
  ctx.stroke();
}
