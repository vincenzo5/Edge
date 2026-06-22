import type { Candle, IndicatorConfig, Theme, VisibleRange } from '../contracts';
import type { IndicatorPlugin, ResolvedSeriesStyle } from '../plugin-api';
import type { SeriesOutput } from '../legend/types';
import { getComputedSeries, resolveSeriesStyle, resolveOutputColor } from '../indicatorCompute';
import { resolveIndicatorInputs } from '../indicatorInputs';
import { plotWidth } from '../layout';
import { getChartColors as getColors } from '../chartTheme';

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

export function drawFromOutputs(
  ctx: CanvasRenderingContext2D,
  vp: VisibleRange,
  theme: Theme,
  data: Record<string, number[]>,
  outputs: SeriesOutput[],
  resolvedStyles: Map<string, ResolvedSeriesStyle>,
  instance: IndicatorConfig,
  plugin: IndicatorPlugin,
  candles?: Candle[],
): void {
  const outputById = new Map(outputs.map((o) => [o.id, o]));
  const drawnFills = new Set<string>();

  for (const out of outputs) {
    if (!out.fillBetween) continue;
    const fillKey = `${out.id}:${out.fillBetween}`;
    if (drawnFills.has(fillKey)) continue;

    const lowerOut = outputById.get(out.fillBetween);
    if (!lowerOut) continue;

    const upperValues = data[out.key];
    const lowerValues = data[lowerOut.key];
    if (!upperValues || !lowerValues) continue;

    const style = resolvedStyles.get(out.id) ?? resolveSeriesStyle(out, instance, plugin, theme, null);
    if (!style.visible) continue;

    const fillColor =
      resolveOutputColor(out.fillColor, theme, null) ??
      (theme === 'dark' ? 'rgba(167, 139, 250, 0.12)' : 'rgba(124, 58, 237, 0.12)');

    drawBand(ctx, upperValues, lowerValues, vp, fillColor);
    drawnFills.add(fillKey);
  }

  for (const out of outputs) {
    const style = resolvedStyles.get(out.id) ?? resolveSeriesStyle(out, instance, plugin, theme, null);
    if (!style.visible) continue;

    const plot = out.plot ?? 'line';
    const values = data[out.key];
    if (!values) continue;

    if (plot === 'hline') {
      const at = out.hlineAt ?? 0;
      drawHorizontalGuide(ctx, vp, at, style.color, style.lineWidth);
      continue;
    }

    if (plot === 'histogram') {
      const colorFn =
        instance.styles?.[out.id]?.color != null
          ? (_theme: Theme, _value: number | null) => style.color
          : typeof out.color === 'function'
            ? out.color
            : (_theme: Theme, _value: number | null) => style.color;
      drawHistogramSeries(ctx, values, vp, theme, 0, colorFn);
      continue;
    }

    if (plot === 'columns') {
      if (candles) drawVolumeBars(ctx, candles, vp, theme);
      continue;
    }

    drawLineSeries(ctx, values, vp, style.color, style.lineWidth);
  }
}

export function drawIndicator(
  plugin: IndicatorPlugin,
  instance: IndicatorConfig,
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  vp: VisibleRange,
  theme: Theme,
): void {
  const inputs = resolveIndicatorInputs(plugin, instance);
  const data = getComputedSeries(plugin, candles, inputs);

  const midIndex = Math.min(
    candles.length - 1,
    Math.max(0, Math.floor((vp.startIndex + vp.endIndex) / 2)),
  );
  const resolvedStyles = plugin.outputs?.length
    ? new Map(
        plugin.outputs.map((out) => [
          out.id,
          resolveSeriesStyle(
            out,
            instance,
            plugin,
            theme,
            data?.[out.key]?.[midIndex] ?? null,
          ),
        ]),
      )
    : new Map<string, ResolvedSeriesStyle>();

  const options = { instance, resolvedStyles, data };

  if (plugin.draw) {
    plugin.draw(ctx, candles, vp, theme, inputs, options);
    return;
  }

  if (plugin.outputs?.length && data) {
    drawFromOutputs(ctx, vp, theme, data, plugin.outputs, resolvedStyles, instance, plugin, candles);
  }
}
