import type { DrawingPlugin } from '../plugin-api';
import type { Candle, Interval, SerializedDrawing, VisibleRange } from '../contracts';
import {
  distanceToSegment,
  drawControlPoints,
  fillFromStyles,
  strokeFromStyles,
  HIT_TOLERANCE_PX,
  pointInRect,
} from './primitives';
import { plotToPoint } from '../drawingCoords';
import { plotsForPoints, baseDrawing, updateTwoPointPreview } from './drawingUtils';
import { getChartColors as getColors } from '../themeTokens';
import { resolveDrawingStyles } from '../drawingStyles';
import { formatTimeDelta } from '../time';
import { formatVolume } from '../format';
import { findDataIndexForTimestamp } from '../crosshair';

export type RulerBarRange = { start: number; end: number };

export type RulerStats = {
  priceDelta: number;
  pct: number;
  bars: number;
  timeLabel: string;
  volume: number;
  /** True when at least one bar in range had volume data. */
  volumeKnown: boolean;
};

type RulerRangeContext = {
  vp?: VisibleRange;
  plotAnchors?: [{ x: number; y: number }, { x: number; y: number }];
};

function clampBarIndex(index: number, candles: Candle[]): number {
  if (candles.length === 0) return -1;
  return Math.max(0, Math.min(candles.length - 1, index));
}

export function resolveRulerPointIndex(
  point: SerializedDrawing['points'][number],
  candles: Candle[],
): number {
  const direct = point.dataIndex;
  if (direct != null && direct >= 0 && direct < candles.length) return direct;
  const timestamp = point.timestamp;
  if (timestamp != null && timestamp !== 0) {
    return findDataIndexForTimestamp(candles, timestamp);
  }
  return -1;
}

export function rulerIndexRange(
  d: SerializedDrawing,
  candles: Candle[],
  ctx: RulerRangeContext = {},
): RulerBarRange | null {
  if (d.points.length < 2 || candles.length === 0) return null;

  if (ctx.plotAnchors && ctx.vp) {
    const [p0, p1] = ctx.plotAnchors;
    const i0 = clampBarIndex(ctx.vp.indexForX(Math.min(p0.x, p1.x)), candles);
    const i1 = clampBarIndex(ctx.vp.indexForX(Math.max(p0.x, p1.x)), candles);
    if (i0 >= 0 && i1 >= 0) {
      return { start: Math.min(i0, i1), end: Math.max(i0, i1) };
    }
  }

  const [a, b] = d.points;
  const i0 = resolveRulerPointIndex(a, candles);
  const i1 = resolveRulerPointIndex(b, candles);
  if (i0 < 0 || i1 < 0) return null;
  return { start: Math.min(i0, i1), end: Math.max(i0, i1) };
}

export function rulerBarCount(
  d: SerializedDrawing,
  candles: Candle[] = [],
  ctx: RulerRangeContext = {},
): number {
  const range = rulerIndexRange(d, candles, ctx);
  if (!range) return 0;
  return range.end - range.start + 1;
}

export function sumRulerVolume(
  d: SerializedDrawing,
  candles: Candle[],
  ctx: RulerRangeContext = {},
): { total: number; known: boolean } {
  const range = rulerIndexRange(d, candles, ctx);
  if (!range) return { total: 0, known: false };
  let total = 0;
  let known = false;
  for (let i = range.start; i <= range.end; i++) {
    const v = candles[i]?.v;
    if (v != null && Number.isFinite(v)) {
      total += v;
      known = true;
    }
  }
  return { total, known };
}

export function computeRulerStats(
  d: SerializedDrawing,
  candles: Candle[],
  interval?: Interval,
  ctx: RulerRangeContext = {},
): RulerStats | null {
  if (d.points.length < 2) return null;
  const [a, b] = d.points;
  const priceDelta = (b.value ?? 0) - (a.value ?? 0);
  const baseValue = a.value ?? 0;
  const pct = baseValue !== 0 ? (priceDelta / baseValue) * 100 : 0;
  const t0 = a.timestamp ?? 0;
  const t1 = b.timestamp ?? 0;
  const { total, known } = sumRulerVolume(d, candles, ctx);
  return {
    priceDelta,
    pct,
    bars: rulerBarCount(d, candles, ctx),
    timeLabel: formatTimeDelta(t1 - t0, interval),
    volume: total,
    volumeKnown: known,
  };
}

/** @deprecated Prefer formatRulerTooltipLines for TV-style labels. */
export function formatRulerPriceLabels(d: SerializedDrawing): { priceLine: string; pctLine: string } {
  if (d.points.length < 2) return { priceLine: '', pctLine: '' };
  const [a, b] = d.points;
  const priceDelta = (b.value ?? 0) - (a.value ?? 0);
  const baseValue = a.value ?? 0;
  const pct = baseValue !== 0 ? (priceDelta / baseValue) * 100 : 0;
  const sign = priceDelta >= 0 ? '+' : '';
  return {
    priceLine: `${sign}${priceDelta.toFixed(2)}`,
    pctLine: `${sign}${pct.toFixed(2)}%`,
  };
}

/** @deprecated Prefer formatRulerTooltipLines for TV-style labels. */
export function formatRulerTimeLabel(d: SerializedDrawing, interval?: Interval): string {
  if (d.points.length < 2) return '';
  const [a, b] = d.points;
  const t0 = a.timestamp ?? 0;
  const t1 = b.timestamp ?? 0;
  return formatTimeDelta(t1 - t0, interval);
}

function formatSignedPrice(value: number): string {
  const sign = value >= 0 ? '' : '-';
  return `${sign}${Math.abs(value).toFixed(2)}`;
}

function formatSignedPct(value: number): string {
  const sign = value >= 0 ? '' : '-';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

/** TradingView-style ruler tooltip: price (%), bars + time, volume. */
export function formatRulerTooltipLines(
  d: SerializedDrawing,
  candles: Candle[],
  interval?: Interval,
  ctx: RulerRangeContext = {},
): string[] {
  const stats = computeRulerStats(d, candles, interval, ctx);
  if (!stats) return [];
  const lines: string[] = [
    `${formatSignedPrice(stats.priceDelta)} (${formatSignedPct(stats.pct)})`,
  ];
  const barsTime =
    stats.bars > 0 && stats.timeLabel
      ? `${stats.bars} bars, ${stats.timeLabel}`
      : stats.bars > 0
        ? `${stats.bars} bars`
        : stats.timeLabel;
  if (barsTime) lines.push(barsTime);
  lines.push(
    stats.volumeKnown ? `Vol ${formatVolume(stats.volume)}` : 'Vol —',
  );
  return lines;
}

function defaultRulerFill(theme: import('../contracts').Theme): string {
  return theme === 'dark' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.12)';
}

function drawCornerCaps(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  capLen: number,
) {
  const corners: Array<{ x: number; y: number; dx: number; dy: number }> = [
    { x: x0, y: y0, dx: -1, dy: -1 },
    { x: x1, y: y0, dx: 1, dy: -1 },
    { x: x1, y: y1, dx: 1, dy: 1 },
    { x: x0, y: y1, dx: -1, dy: 1 },
  ];
  for (const c of corners) {
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + c.dx * capLen, c.y);
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x, c.y + c.dy * capLen);
    ctx.stroke();
  }
}

function drawLabelBox(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  theme: import('../contracts').Theme,
  priceDelta: number,
  align: CanvasTextAlign = 'center',
  anchor: 'center' | 'above' = 'center',
) {
  const colors = getColors(theme);
  const isUp = priceDelta >= 0;
  const directional = priceDelta !== 0;
  const bg = directional ? (isUp ? colors.up : colors.down) : colors.axisBg;
  const border = directional ? bg : colors.axisBorder;
  const textColor = directional ? '#ffffff' : colors.text;

  ctx.font = '11px system-ui, sans-serif';
  const lineHeight = 14;
  const padX = 6;
  const padY = 4;
  const maxWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const boxW = maxWidth + padX * 2;
  const boxH = lines.length * lineHeight + padY * 2;
  const left = align === 'center' ? x - boxW / 2 : align === 'right' ? x - boxW : x;
  const top =
    anchor === 'above'
      ? y - boxH - 6
      : y - boxH / 2;

  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(left, top, boxW, boxH, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  lines.forEach((line, index) => {
    const lineY = top + padY + lineHeight / 2 + index * lineHeight;
    ctx.fillText(line, align === 'center' ? x : left + padX, lineY);
  });
}

export const ruler: DrawingPlugin = {
  name: 'ruler',
  defaultLabel: 'Ruler',
  placement: 'two-point',
  create(start) {
    return {
      ...baseDrawing('ruler', 'Ruler', [start, { ...start }]),
      styles: {
        fillOpacity: 0.12,
        fillColor: '#3b82f6',
        lineWidth: 1,
      },
    };
  },
  updatePreview(draft, cursor) {
    return updateTwoPointPreview(draft, cursor);
  },
  finalize(draft) {
    return draft;
  },
  draw(ctx, d, vp, theme, selected, candles, opts) {
    if (d.points.length < 2) return;
    const showTimeAxis = opts?.showTimeAxis ?? true;
    const [a, b] = plotsForPoints(d, vp, candles, showTimeAxis);
    const x0 = Math.min(a.x, b.x);
    const x1 = Math.max(a.x, b.x);
    const y0 = Math.min(a.y, b.y);
    const y1 = Math.max(a.y, b.y);
    const w = Math.max(x1 - x0, 1);
    const h = Math.max(y1 - y0, 1);

    const styles = resolveDrawingStyles(d, theme, selected);
    const { stroke, lineWidth, dash } = strokeFromStyles(styles, theme, selected, opts?.preview);
    const fill = fillFromStyles(styles) ?? defaultRulerFill(theme);

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(x0, y0, w, h);
    }

    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    if (opts?.preview || dash.length > 0) ctx.setLineDash(opts?.preview ? [4, 4] : dash);
    ctx.strokeRect(x0, y0, w, h);
    drawCornerCaps(ctx, x0, y0, x1, y1, 6);

    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    const stats = computeRulerStats(d, candles, opts?.interval, {
      vp,
      plotAnchors: [a, b],
    });
    const tooltipLines = stats
      ? formatRulerTooltipLines(d, candles, opts?.interval, { vp, plotAnchors: [a, b] })
      : [];
    if (tooltipLines.length > 0 && stats) {
      drawLabelBox(
        ctx,
        tooltipLines,
        (x0 + x1) / 2,
        y0,
        theme,
        stats.priceDelta,
        'center',
        'above',
      );
    }

    if (selected && !opts?.preview) {
      drawControlPoints(ctx, [a, b], theme, true);
    }
  },
  hitTest(px, py, d, vp, candles, showTimeAxis = true) {
    if (d.points.length < 2) return false;
    const [a, b] = plotsForPoints(d, vp, candles, showTimeAxis);
    if (pointInRect(px, py, a.x, a.y, b.x, b.y, false)) return true;
    return distanceToSegment(px, py, a.x, a.y, b.x, b.y) <= HIT_TOLERANCE_PX;
  },
  getControlPoints(d, vp, candles, showTimeAxis = true) {
    return plotsForPoints(d, vp, candles, showTimeAxis);
  },
  updateFromControl(d, cpIndex, plotX, plotY, vp, candles, showTimeAxis = true) {
    const pt = plotToPoint(plotX, plotY, vp, candles, { showTimeAxis });
    const points = d.points.map((p, i) =>
      i === cpIndex
        ? { timestamp: pt.timestamp, value: pt.value, dataIndex: pt.dataIndex }
        : p,
    );
    return { ...d, points };
  },
};
