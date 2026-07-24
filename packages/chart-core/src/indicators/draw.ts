import type { Candle, IndicatorConfig, Theme, VisibleRange } from '../contracts';
import type { IndicatorPlugin, ResolvedSeriesStyle } from '../plugin-api';
import type { MarkerLocation, MarkerShape, SeriesOutput } from '../legend/types';
import {
  compactScriptBgcolorSegments,
  evaluateScriptColorRules,
  isTruthyScriptSignal,
} from '../scriptContracts';
import { getComputedSeries, resolveSeriesStyle, resolveOutputColor } from '../indicatorCompute';
import { resolveIndicatorInputs } from '../indicatorInputs';
import { plotWidth } from '../layout';
import { getChartColors as getColors } from '../themeTokens';

export function drawSteplineSeries(
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
  let lastX = 0;
  let lastY = 0;
  for (let i = Math.floor(vp.startIndex); i < Math.ceil(vp.endIndex); i++) {
    if (i < 0 || i >= values.length) continue;
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    const x = vp.xForIndex(i);
    const y = vp.yForPrice(v);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
      lastX = x;
      lastY = y;
      continue;
    }
    ctx.lineTo(x, lastY);
    ctx.lineTo(x, y);
    lastX = x;
    lastY = y;
  }
  if (started) ctx.stroke();
}

export function drawAreaSeries(
  ctx: CanvasRenderingContext2D,
  values: number[],
  vp: VisibleRange,
  color: string,
  width = 1.5,
  baselinePrice = 0,
): void {
  const start = Math.max(0, Math.floor(vp.startIndex));
  const end = Math.min(values.length, Math.ceil(vp.endIndex));
  if (end <= start) return;

  const baselineY = vp.yForPrice(baselinePrice);
  ctx.fillStyle = color.includes('rgba') ? color : `${color}33`;
  ctx.beginPath();
  let started = false;
  for (let i = start; i < end; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    const x = vp.xForIndex(i);
    const y = vp.yForPrice(v);
    if (!started) {
      ctx.moveTo(x, baselineY);
      ctx.lineTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  if (!started) return;
  ctx.lineTo(vp.xForIndex(end - 1), baselineY);
  ctx.closePath();
  ctx.fill();
  drawLineSeries(ctx, values, vp, color, width);
}

export function drawPointSeries(
  ctx: CanvasRenderingContext2D,
  values: number[],
  vp: VisibleRange,
  color: string,
  mode: 'circles' | 'crosses',
  radius = 3,
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  for (let i = Math.floor(vp.startIndex); i < Math.ceil(vp.endIndex); i++) {
    if (i < 0 || i >= values.length) continue;
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    const x = vp.xForIndex(i);
    const y = vp.yForPrice(v);
    if (mode === 'circles') {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - radius, y - radius);
    ctx.lineTo(x + radius, y + radius);
    ctx.moveTo(x + radius, y - radius);
    ctx.lineTo(x - radius, y + radius);
    ctx.stroke();
  }
}

export function drawColumnSeries(
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
    const h = Math.max(1, Math.abs(y - zeroY));
    ctx.fillRect(x - barW / 2, top, barW, h);
  }
}

function markerAnchorY(
  location: MarkerLocation,
  value: number,
  candle: Candle | undefined,
  vp: VisibleRange,
): number {
  if (location === 'absolute') return vp.yForPrice(value);
  if (!candle) return vp.yForPrice(value);
  if (location === 'aboveBar') return vp.yForPrice(candle.h) - 8;
  return vp.yForPrice(candle.l) + 8;
}

function drawMarkerShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shape: MarkerShape,
  size: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const half = size / 2;

  switch (shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(x, y, half, 0, Math.PI * 2);
      ctx.fill();
      return;
    case 'square':
      ctx.fillRect(x - half, y - half, size, size);
      return;
    case 'cross':
      ctx.beginPath();
      ctx.moveTo(x - half, y - half);
      ctx.lineTo(x + half, y + half);
      ctx.moveTo(x + half, y - half);
      ctx.lineTo(x - half, y + half);
      ctx.stroke();
      return;
    case 'triangleUp':
      ctx.beginPath();
      ctx.moveTo(x, y - half);
      ctx.lineTo(x + half, y + half);
      ctx.lineTo(x - half, y + half);
      ctx.closePath();
      ctx.fill();
      return;
    case 'triangleDown':
      ctx.beginPath();
      ctx.moveTo(x, y + half);
      ctx.lineTo(x + half, y - half);
      ctx.lineTo(x - half, y - half);
      ctx.closePath();
      ctx.fill();
      return;
    case 'arrowUp':
      ctx.beginPath();
      ctx.moveTo(x, y - half);
      ctx.lineTo(x + half, y);
      ctx.lineTo(x - half, y);
      ctx.closePath();
      ctx.fill();
      return;
    case 'arrowDown':
      ctx.beginPath();
      ctx.moveTo(x, y + half);
      ctx.lineTo(x + half, y);
      ctx.lineTo(x - half, y);
      ctx.closePath();
      ctx.fill();
      return;
    default:
      return;
  }
}

export function drawMarkerSeries(
  ctx: CanvasRenderingContext2D,
  values: number[],
  vp: VisibleRange,
  candles: Candle[] | undefined,
  shape: MarkerShape,
  location: MarkerLocation,
  color: string,
  size = 8,
): void {
  for (let i = Math.floor(vp.startIndex); i < Math.ceil(vp.endIndex); i++) {
    if (i < 0 || i >= values.length) continue;
    const value = values[i];
    if (!isTruthyScriptSignal(value)) continue;
    const x = vp.xForIndex(i);
    const y = markerAnchorY(location, value as number, candles?.[i], vp);
    drawMarkerShape(ctx, x, y, shape, size, color);
  }
}

export function drawBgcolorBands(
  ctx: CanvasRenderingContext2D,
  values: number[],
  vp: VisibleRange,
  fallbackColor: string,
  colorRules: import('../scriptContracts').ScriptColorRule[] | undefined,
  opacity = 0.12,
): void {
  const segments = compactScriptBgcolorSegments(
    values,
    (_index, value) => evaluateScriptColorRules(colorRules, value, fallbackColor),
    vp.startIndex,
    vp.endIndex,
  );
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = opacity;
  for (const segment of segments) {
    const span = vp.endIndex - vp.startIndex;
    const barW = span > 0 ? plotWidth(vp.width) / span : plotWidth(vp.width);
    const x0 = vp.xForIndex(segment.start) - barW / 2;
    const x1 = vp.xForIndex(Math.max(segment.start, segment.end - 1)) + barW / 2;
    ctx.fillStyle = segment.color;
    ctx.fillRect(Math.min(x0, x1), 0, Math.max(barW, Math.abs(x1 - x0)), vp.height);
  }
  ctx.globalAlpha = prevAlpha;
}

export function resolveScriptBarColors(
  values: Array<number | null>,
  fallbackColor: string,
  colorRules: import('../scriptContracts').ScriptColorRule[] | undefined,
): Array<string | null> {
  return values.map((value) => {
    if (!isTruthyScriptSignal(value)) return null;
    return evaluateScriptColorRules(colorRules, value, fallbackColor);
  });
}

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

export function vwapLineColor(theme: Theme): string {
  return theme === 'dark' ? '#f472b6' : '#db2777';
}

export function atrLineColor(theme: Theme): string {
  return theme === 'dark' ? '#38bdf8' : '#0284c7';
}

export function cciLineColor(theme: Theme): string {
  return theme === 'dark' ? '#a78bfa' : '#7c3aed';
}

export function obvLineColor(theme: Theme): string {
  return theme === 'dark' ? '#34d399' : '#059669';
}

export function stochasticKColor(theme: Theme): string {
  return theme === 'dark' ? '#60a5fa' : '#2563eb';
}

export function stochasticDColor(theme: Theme): string {
  return theme === 'dark' ? '#f59e0b' : '#d97706';
}

export function stochasticJColor(theme: Theme): string {
  return theme === 'dark' ? '#f472b6' : '#db2777';
}

export function dmiPlusDiColor(theme: Theme): string {
  return theme === 'dark' ? '#22c55e' : '#16a34a';
}

export function dmiMinusDiColor(theme: Theme): string {
  return theme === 'dark' ? '#ef4444' : '#dc2626';
}

export function dmiAdxColor(theme: Theme): string {
  return theme === 'dark' ? '#f59e0b' : '#d97706';
}

export function williamsRColor(theme: Theme): string {
  return theme === 'dark' ? '#818cf8' : '#4f46e5';
}

export function rocLineColor(theme: Theme): string {
  return theme === 'dark' ? '#2dd4bf' : '#0d9488';
}

export function supertrendLineColor(theme: Theme): string {
  return theme === 'dark' ? '#22c55e' : '#16a34a';
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
    if (out.plot !== 'bgcolor') continue;
    const values = data[out.key];
    if (!values) continue;
    const style = resolvedStyles.get(out.id) ?? resolveSeriesStyle(out, instance, plugin, theme, null);
    if (!style.visible) continue;
    drawBgcolorBands(
      ctx,
      values,
      vp,
      style.color,
      out.colorRules,
      out.opacity ?? 0.12,
    );
  }

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

    if (plot === 'bgcolor' || plot === 'barcolor') {
      continue;
    }

    if (plot === 'marker') {
      drawMarkerSeries(
        ctx,
        values,
        vp,
        candles,
        out.markerShape ?? 'circle',
        out.markerLocation ?? 'absolute',
        style.color,
        out.markerSize ?? 8,
      );
      continue;
    }

    if (plot === 'hline') {
      const at = out.hlineAt ?? 0;
      drawHorizontalGuide(ctx, vp, at, style.color, style.lineWidth);
      continue;
    }

    if (plot === 'histogram') {
      const colorFn =
        out.colorRules?.length
          ? (_theme: Theme, value: number | null) =>
              evaluateScriptColorRules(out.colorRules, value, style.color)
          : instance.styles?.[out.id]?.color != null
            ? (_theme: Theme, _value: number | null) => style.color
            : typeof out.color === 'function'
              ? out.color
              : (_theme: Theme, _value: number | null) => style.color;
      if (out.style === 'columns') {
        drawColumnSeries(ctx, values, vp, theme, 0, colorFn);
      } else {
        drawHistogramSeries(ctx, values, vp, theme, 0, colorFn);
      }
      continue;
    }

    if (plot === 'columns') {
      if (candles) drawVolumeBars(ctx, candles, vp, theme);
      continue;
    }

    const seriesStyle = out.style ?? 'line';
    if (seriesStyle === 'stepline') {
      drawSteplineSeries(ctx, values, vp, style.color, style.lineWidth);
      continue;
    }
    if (seriesStyle === 'area') {
      drawAreaSeries(ctx, values, vp, style.color, style.lineWidth, 0);
      continue;
    }
    if (seriesStyle === 'circles' || seriesStyle === 'crosses') {
      drawPointSeries(ctx, values, vp, style.color, seriesStyle, 3);
      continue;
    }
    if (seriesStyle === 'columns') {
      drawColumnSeries(
        ctx,
        values,
        vp,
        theme,
        0,
        out.colorRules?.length
          ? (_theme: Theme, value: number | null) =>
              evaluateScriptColorRules(out.colorRules, value, style.color)
          : (_theme: Theme, _value: number | null) => style.color,
      );
      continue;
    }

    if (out.colorRules?.length) {
      for (let i = Math.floor(vp.startIndex); i < Math.ceil(vp.endIndex) - 1; i++) {
        if (i < 0 || i + 1 >= values.length) continue;
        const v0 = values[i];
        const v1 = values[i + 1];
        if (!Number.isFinite(v0) || !Number.isFinite(v1)) continue;
        ctx.strokeStyle = evaluateScriptColorRules(out.colorRules, v0, style.color);
        ctx.lineWidth = style.lineWidth;
        ctx.beginPath();
        ctx.moveTo(vp.xForIndex(i), vp.yForPrice(v0));
        ctx.lineTo(vp.xForIndex(i + 1), vp.yForPrice(v1));
        ctx.stroke();
      }
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
  precomputedData?: Record<string, number[]> | null,
): void {
  const inputs = resolveIndicatorInputs(plugin, instance);
  const data = precomputedData ?? getComputedSeries(plugin, candles, inputs);

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
