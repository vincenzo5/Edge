import type { Candle, VisibleRange, Theme, Interval, IndicatorConfig, SerializedDrawing } from '@edge/chart-core';
import { classifyUsEquitySession } from '@edge/chart-core';
import type { ChartAnnotationChannelMarker, ChartEventMarker, ChartReferenceLine } from '@edge/chart-core';
import type { RequiredChartSettings } from './chartSettings';
import {
  applyLineDash,
  resolveColorOverride,
  resolvePriceScaleSide,
  resolveSymbolColors,
  shouldShowGridLines,
} from './chartSettings';
import { PRICE_AXIS_WIDTH, TIME_AXIS_HEIGHT, plotWidth, plotHeight, axisStripX, type PriceScaleSide } from '@edge/chart-core/layout';
import { computeTimeAxisTicks } from '@edge/chart-core/timeAxis';
import {
  formatScaleLabel,
  fromScaleCoord,
  linearScaleContext,
  scaleAxisTicks,
  toScaleCoord,
} from '@edge/chart-core/priceScaleTransform';
import {
  collectPriceAxisAnnotations,
  filterVisibleAnnotations,
  layoutPriceAxisAnnotations,
} from './priceAxisAnnotations';
import type { LaidOutPriceAxisAnnotation } from '@edge/chart-core/priceAxisTypes';

import { getChartColors as getColors } from './chartTheme';

export function drawPlotBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: Theme,
  settings: RequiredChartSettings,
  showTimeAxis = true,
) {
  const c = getColors(theme);
  const bg = resolveColorOverride(settings.canvas.backgroundColor, c.axisBg);
  const ph = plotHeight(height, showTimeAxis);
  const pw = plotWidth(width);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, pw, ph);
  if (settings.canvas.watermarkVisible) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = c.text;
    ctx.font = '600 48px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = settings.canvas.watermarkMode === 'replay' ? 'Replay' : 'Symbol';
    ctx.fillText(label, pw / 2, ph / 2);
    ctx.restore();
  }
}

/** Shade pre/post-market bar regions when extended-hours candles are enabled. */
export function drawSessionRegions(
  ctx: CanvasRenderingContext2D,
  vp: VisibleRange,
  candles: Candle[],
  width: number,
  height: number,
  theme: Theme,
  settings: RequiredChartSettings,
  showTimeAxis = true,
) {
  if (settings.symbol.sessionMode !== 'extended') return;
  if (candles.length === 0 || !vp.xForIndex) return;

  const ph = plotHeight(height, showTimeAxis);
  const start = Math.max(0, Math.floor(vp.startIndex));
  const end = Math.min(candles.length - 1, Math.ceil(vp.endIndex));

  ctx.save();
  for (let i = start; i <= end; i++) {
    const candle = candles[i];
    if (!candle) continue;
    const session = classifyUsEquitySession(candle.t);
    if (session !== 'preMarket' && session !== 'postMarket') continue;

    const x0 = vp.xForIndex(i);
    const x1 = vp.xForIndex(i + 1);
    if (!Number.isFinite(x0) || !Number.isFinite(x1)) continue;
    const left = Math.min(x0, x1);
    const w = Math.max(1, Math.abs(x1 - x0));

    ctx.fillStyle =
      session === 'preMarket'
        ? theme === 'dark'
          ? 'rgba(88, 166, 255, 0.06)'
          : 'rgba(37, 99, 235, 0.06)'
        : theme === 'dark'
          ? 'rgba(255, 171, 64, 0.06)'
          : 'rgba(234, 88, 12, 0.06)';
    ctx.fillRect(left, 0, w, ph);
  }
  ctx.restore();
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  vp: VisibleRange,
  width: number,
  height: number,
  theme: Theme,
  settings: RequiredChartSettings,
  candles?: Candle[],
  interval?: Interval,
) {
  const c = getColors(theme);
  const gridColor = resolveColorOverride(settings.canvas.gridColor, c.grid);
  ctx.strokeStyle = gridColor;
  ctx.globalAlpha = settings.canvas.gridOpacity / 100;
  ctx.lineWidth = 1;
  applyLineDash(ctx, settings.canvas.gridLineStyle);
  const ph = plotHeight(
    height,
    vp.reserveTimeAxis ?? true,
    vp.reserveEventRail ?? false,
  );
  const pw = plotWidth(width);

  if (shouldShowGridLines(settings.canvas, 'vertical')) {
    if (candles && candles.length > 0 && interval) {
      for (const tick of computeTimeAxisTicks(candles, vp, interval, width)) {
        ctx.beginPath();
        ctx.moveTo(tick.x, 0);
        ctx.lineTo(tick.x, ph);
        ctx.stroke();
      }
    } else {
      const step = Math.max(1, Math.floor((vp.endIndex - vp.startIndex) / 8));
      for (let i = vp.startIndex; i < vp.endIndex; i += step) {
        const x = vp.xForIndex(i);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ph);
        ctx.stroke();
      }
    }
  }

  if (shouldShowGridLines(settings.canvas, 'horizontal')) {
    const priceStep = (vp.priceMax - vp.priceMin) / 6;
    for (let p = vp.priceMin; p <= vp.priceMax; p += priceStep) {
      const y = vp.yForPrice(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(pw, y);
      ctx.stroke();
    }
  }

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

export function drawCandles(
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  vp: VisibleRange,
  theme: Theme,
  chartType: 'candle_solid' | 'candle_stroke' | 'ohlc' | 'area' | 'heikin_ashi',
  settings: RequiredChartSettings,
) {
  const colors = resolveSymbolColors(settings.symbol, theme);
  const c = getColors(theme);
  const visibleSpan = vp.endIndex - vp.startIndex;
  if (visibleSpan <= 0) return;
  const pw = plotWidth(vp.width);
  const w = (pw / visibleSpan) * 0.7;

  if (chartType === 'area') {
    ctx.fillStyle = colors.up + '33';
    ctx.strokeStyle = colors.up;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let first = true;
    for (let idx = Math.floor(vp.startIndex); idx < Math.ceil(vp.endIndex); idx++) {
      if (idx < 0 || idx >= candles.length) continue;
      const candle = candles[idx];
      if (!candle) continue;
      const x = vp.xForIndex(idx);
      const y = vp.yForPrice(candle.c);
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

  for (let idx = Math.floor(vp.startIndex); idx < Math.ceil(vp.endIndex); idx++) {
    if (idx < 0 || idx >= candles.length) continue;
    const candle = candles[idx];
    if (!candle) continue;
    const prev = idx > 0 ? candles[idx - 1] : null;
    const isUp = settings.symbol.colorBarsByPreviousClose && prev
      ? candle.c >= prev.c
      : candle.c >= candle.o;
    const bodyColor = isUp ? colors.up : colors.down;
    const wickColor = isUp ? colors.wickUp : colors.wickDown;
    const borderColor = isUp ? colors.borderUp : colors.borderDown;

    const x = vp.xForIndex(idx);
    const yHigh = vp.yForPrice(candle.h);
    const yLow = vp.yForPrice(candle.l);
    const yOpen = vp.yForPrice(candle.o);
    const yClose = vp.yForPrice(candle.c);

    if (settings.symbol.showWicks) {
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, yHigh);
      ctx.lineTo(x + w / 2, yLow);
      ctx.stroke();
    }

    if (chartType === 'ohlc') {
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, yOpen);
      ctx.lineTo(x + w / 2, yOpen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w / 2, yClose);
      ctx.lineTo(x + w, yClose);
      ctx.stroke();
    } else if (settings.symbol.showBody) {
      const yBodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(1, Math.abs(yOpen - yClose));
      if (chartType === 'candle_stroke') {
        ctx.strokeStyle = settings.symbol.showBorders ? borderColor : bodyColor;
        ctx.lineWidth = settings.symbol.showBorders ? 2 : 1;
        ctx.strokeRect(x, yBodyTop, w, bodyH);
      } else {
        ctx.fillStyle = bodyColor;
        ctx.fillRect(x, yBodyTop, w, bodyH);
        if (settings.symbol.showBorders) {
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(x, yBodyTop, w, bodyH);
        }
      }
    }
  }
}

export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _vp: VisibleRange,
  width: number,
  height: number,
  theme: Theme,
  price?: number,
  timeLabel?: string
) {
  const c = getColors(theme);
  const pw = plotWidth(width);
  const ph = plotHeight(height);
  const clampedX = Math.max(0, Math.min(pw, x));
  const clampedY = Math.max(0, Math.min(ph, y));

  ctx.strokeStyle = c.crosshair;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 2]);
  ctx.beginPath();
  ctx.moveTo(clampedX, 0);
  ctx.lineTo(clampedX, ph);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, clampedY);
  ctx.lineTo(pw, clampedY);
  ctx.stroke();
  ctx.setLineDash([]);

  if (price != null && Number.isFinite(price)) {
    drawAxisBadge(ctx, price.toFixed(2), width - PRICE_AXIS_WIDTH + 4, clampedY, theme, 'right');
  }
  if (timeLabel) {
    drawAxisBadge(ctx, timeLabel, clampedX, height - TIME_AXIS_HEIGHT + 4, theme, 'bottom');
  }
}

import type { CrosshairMode } from '@edge/chart-core/crosshairMode';

/** One crosshair spanning all stacked panes (drawn on chart container overlay). */
export function drawUnifiedCrosshair(
  ctx: CanvasRenderingContext2D,
  width: number,
  totalHeight: number,
  theme: Theme,
  crosshair: {
    plotX: number;
    globalY: number;
    paneTop: number;
    paneHeight: number;
    paneReserveTimeAxis: boolean;
    valueLabel: string;
    timeLabel: string;
  },
  crosshairMode: CrosshairMode = 'cross',
  canvasSettings?: RequiredChartSettings['canvas'],
) {
  const c = getColors(theme);
  const crosshairColor = resolveColorOverride(canvasSettings?.crosshairColor ?? null, c.crosshair);
  const pw = plotWidth(width);
  const plotBottom = totalHeight - TIME_AXIS_HEIGHT;
  const clampedX = Math.max(0, Math.min(pw, crosshair.plotX));

  const panePlotTop = crosshair.paneTop;
  const panePlotBottom = panePlotTop + plotHeight(crosshair.paneHeight, crosshair.paneReserveTimeAxis);
  const clampedY = Math.max(panePlotTop, Math.min(panePlotBottom, crosshair.globalY));

  if (crosshairMode === 'cross') {
    ctx.strokeStyle = crosshairColor;
    ctx.lineWidth = 1;
    applyLineDash(ctx, canvasSettings?.crosshairLineStyle ?? 'dashed');
    ctx.beginPath();
    ctx.moveTo(clampedX, 0);
    ctx.lineTo(clampedX, plotBottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, clampedY);
    ctx.lineTo(pw, clampedY);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (crosshairMode === 'dot') {
    ctx.fillStyle = crosshairColor;
    ctx.beginPath();
    ctx.arc(clampedX, clampedY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // arrow mode: no lines (cursor provides arrow affordance)

  if (crosshair.valueLabel) {
    drawAxisBadge(ctx, crosshair.valueLabel, width - PRICE_AXIS_WIDTH + 4, clampedY, theme, 'right');
  }
  if (crosshair.timeLabel) {
    drawAxisBadge(
      ctx,
      crosshair.timeLabel,
      clampedX,
      totalHeight - TIME_AXIS_HEIGHT + 4,
      theme,
      'bottom'
    );
  }
}

function drawAxisBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  anchorX: number,
  anchorY: number,
  theme: Theme,
  align: 'right' | 'bottom'
) {
  const c = getColors(theme);
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
  const metrics = ctx.measureText(text);
  const padX = 4;
  const padY = 2;
  const textW = metrics.width;
  const textH = 14;

  let rectX: number;
  let rectY: number;
  let textX: number;
  let textY: number;

  if (align === 'right') {
    rectX = anchorX;
    rectY = anchorY - textH / 2 - padY;
    textX = rectX + padX;
    textY = anchorY + 4;
  } else {
    rectX = anchorX - textW / 2 - padX;
    rectY = anchorY;
    textX = rectX + padX;
    textY = anchorY + textH;
  }

  ctx.fillStyle = c.crosshair;
  ctx.fillRect(rectX, rectY, textW + padX * 2, textH + padY * 2);
  ctx.fillStyle = c.axisBg;
  ctx.fillText(text, textX, textY);
}

function drawPriceAxisBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  axisX: number,
  anchorY: number,
  theme: Theme,
  color: string,
  side: PriceScaleSide,
) {
  const c = getColors(theme);
  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
  const metrics = ctx.measureText(text);
  const padX = 5;
  const padY = 2;
  const textW = metrics.width;
  const textH = 14;
  const badgeW = textW + padX * 2;
  const badgeH = textH + padY * 2;
  const radius = 2;

  const rectX = side === 'left' ? axisX + 2 : axisX + 2;
  const rectY = anchorY - badgeH / 2;
  const textX = rectX + padX;
  const textY = anchorY + 4;

  ctx.fillStyle = color;
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(rectX, rectY, badgeW, badgeH, radius);
    ctx.fill();
  } else {
    ctx.fillRect(rectX, rectY, badgeW, badgeH);
  }
  ctx.fillStyle = theme === 'dark' ? '#f0f3fa' : c.axisBg;
  ctx.fillText(text, textX, textY);
}

function drawAnnotationLine(
  ctx: CanvasRenderingContext2D,
  y: number,
  width: number,
  color: string,
  line: 'solid' | 'dashed',
  side: PriceScaleSide,
) {
  const pw = plotWidth(width, side);
  const plotStart = side === 'left' ? PRICE_AXIS_WIDTH : 0;
  ctx.strokeStyle = color;
  ctx.lineWidth = line === 'dashed' ? 1 : 1.5;
  ctx.setLineDash(line === 'dashed' ? [4, 4] : []);
  ctx.beginPath();
  ctx.moveTo(plotStart, y);
  ctx.lineTo(plotStart + pw, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPricePlusButton(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: Theme,
  side: PriceScaleSide,
) {
  const c = getColors(theme);
  const axisX = axisStripX(width, side);
  const cx = axisX + PRICE_AXIS_WIDTH / 2;
  const cy = height - (TIME_AXIS_HEIGHT > 0 ? TIME_AXIS_HEIGHT : 0) - 18;
  ctx.strokeStyle = c.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy);
  ctx.lineTo(cx + 5, cy);
  ctx.moveTo(cx, cy - 5);
  ctx.lineTo(cx, cy + 5);
  ctx.stroke();
}

export type DrawPriceAxisAnnotationsInput = {
  ctx: CanvasRenderingContext2D;
  vp: VisibleRange;
  width: number;
  height: number;
  theme: Theme;
  settings: RequiredChartSettings;
  paneId: string;
  candles: Candle[];
  indicators?: IndicatorConfig[];
  drawings?: SerializedDrawing[];
  interval?: Interval;
  showTimeAxis?: boolean;
  nowMs?: number;
  livePrice?: number | null;
  liveMarketSession?: import('@edge/chart-core').MarketSessionKind | null;
};

export function drawPriceAxisAnnotations(input: DrawPriceAxisAnnotationsInput): void {
  const {
    ctx,
    vp,
    width,
    height,
    theme,
    settings,
    paneId,
    candles,
    indicators = [],
    drawings = [],
    interval,
    showTimeAxis = true,
    nowMs,
    livePrice,
    liveMarketSession,
  } = input;

  const side = resolvePriceScaleSide(settings.scales.priceScalePlacement);
  const axisX = axisStripX(width, side);
  const ph = plotHeight(height, showTimeAxis);

  const raw = collectPriceAxisAnnotations({
    paneId,
    candles,
    indicators,
    drawings,
    vp,
    settings,
    theme,
    interval,
    showTimeAxis,
    nowMs,
    livePrice,
    liveMarketSession,
  });
  const laidOut = filterVisibleAnnotations(
    layoutPriceAxisAnnotations(raw, vp, settings, ph),
  );

  for (const ann of laidOut) {
    drawAnnotationOnAxis(ctx, ann, width, theme, axisX, side);
  }

  if (settings.scales.showPricePlusButton && paneId === 'price') {
    drawPricePlusButton(ctx, width, height, theme, side);
  }
}

function drawAnnotationOnAxis(
  ctx: CanvasRenderingContext2D,
  ann: LaidOutPriceAxisAnnotation,
  width: number,
  theme: Theme,
  axisX: number,
  side: PriceScaleSide,
) {
  const y = ann.y;
  if (ann.line && ann.line !== 'hidden') {
    drawAnnotationLine(ctx, y, width, ann.color, ann.line, side);
  }
  if (ann.showLabel !== false) {
    drawPriceAxisBadge(ctx, ann.label, axisX, ann.displayY, theme, ann.color, side);
  }
}

/** @deprecated Use drawPriceAxisAnnotations — kept for tests. */
export function drawLastPrice(
  ctx: CanvasRenderingContext2D,
  price: number,
  vp: VisibleRange,
  width: number,
  theme: Theme,
) {
  if (!Number.isFinite(price) || !Number.isFinite(width) || !vp?.yForPrice) return;
  const y = vp.yForPrice(price);
  if (!Number.isFinite(y)) return;
  const c = getColors(theme);
  const scaleCtx = vp.priceScaleContext ?? linearScaleContext();
  const label =
    scaleCtx.type === 'linear'
      ? price.toFixed(2)
      : formatScaleLabel(toScaleCoord(price, scaleCtx), scaleCtx);

  drawAnnotationLine(ctx, y, width, c.lastPrice, 'solid', 'right');
  drawPriceAxisBadge(ctx, label, axisStripX(width, 'right'), y, theme, c.lastPrice, 'right');
}

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  vp: VisibleRange,
  width: number,
  height: number,
  theme: Theme,
  settings: RequiredChartSettings,
  candles?: Candle[],
  interval?: Interval,
  showTimeAxis = true,
  showPriceScale = true,
  priceScaleSide: PriceScaleSide = 'right',
) {
  if (!Number.isFinite(vp.priceMin) || !Number.isFinite(vp.priceMax) || !vp.yForPrice || !vp.xForIndex) {
    return;
  }

  drawAxisStrips(ctx, width, height, theme, settings, showTimeAxis, showPriceScale, priceScaleSide);
  const c = getColors(theme);
  const textColor = resolveColorOverride(settings.scales.axisTextColor, c.text);
  const fontSize = settings.scales.axisTextSize;
  ctx.fillStyle = textColor;
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif`;
  if (showPriceScale) {
    const scaleCtx = vp.priceScaleContext ?? linearScaleContext();
    const ticks = scaleAxisTicks(vp.priceMin, vp.priceMax, scaleCtx);
    const axisX = axisStripX(width, priceScaleSide);
    const labelX = priceScaleSide === 'left' ? axisX + 4 : width - 45;
    for (const coord of ticks) {
      if (!Number.isFinite(coord)) continue;
      const raw = fromScaleCoord(coord, scaleCtx);
      const y = vp.yForPrice(raw);
      if (!Number.isFinite(y)) continue;
      ctx.fillText(formatScaleLabel(coord, scaleCtx), labelX, y + 4);
    }
  }
  if (showTimeAxis && candles && interval) {
    const axisY = height - 4;
    for (const tick of computeTimeAxisTicks(candles, vp, interval, width)) {
      if (tick.kind === 'year') {
        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif`;
        ctx.fillStyle = textColor;
      } else {
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif`;
        ctx.fillStyle = textColor;
      }
      ctx.fillText(tick.label, tick.x, axisY);
    }
  }
}

function drawAxisStrips(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: Theme,
  settings: RequiredChartSettings,
  showTimeAxis = true,
  showPriceScale = true,
  priceScaleSide: PriceScaleSide = 'right',
) {
  const c = getColors(theme);
  const axisX = axisStripX(width, priceScaleSide);
  const pw = showPriceScale ? plotWidth(width, priceScaleSide) : width;
  const ph = showTimeAxis ? height - TIME_AXIS_HEIGHT : height;
  const plotStart = priceScaleSide === 'left' ? PRICE_AXIS_WIDTH : 0;
  const borderColor = resolveColorOverride(settings.scales.axisLineColor, c.axisBorder);

  if (showPriceScale) {
    ctx.fillStyle = c.axisBg;
    ctx.fillRect(axisX, 0, PRICE_AXIS_WIDTH, height);
  }
  if (showTimeAxis) {
    ctx.fillStyle = c.axisBg;
    ctx.fillRect(plotStart, ph, pw, TIME_AXIS_HEIGHT);
  }

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  if (showPriceScale) {
    const borderX = priceScaleSide === 'left' ? axisX + PRICE_AXIS_WIDTH : axisX;
    ctx.beginPath();
    ctx.moveTo(borderX, 0);
    ctx.lineTo(borderX, height);
    ctx.stroke();
  }
  if (showTimeAxis) {
    ctx.beginPath();
    ctx.moveTo(plotStart, ph);
    ctx.lineTo(plotStart + pw, ph);
    ctx.stroke();
  }
}

export { getChartColors as getColors } from './chartTheme';

import type { EventBadgeGroup } from './eventBadges';
import {
  layoutEventBadgeGroups,
  eventRailTopY,
  EVENT_RAIL_HEIGHT,
} from './eventBadges';

export type EventBadgeDrawOptions = {
  hoveredGroupId?: string | null;
  selectedGroupId?: string | null;
  /** When set, layout is reused instead of recomputed. */
  badgeGroups?: EventBadgeGroup[];
};

/** Draw bottom-axis event badges; vertical guide only on hover/selection. */
export function drawEventBadges(
  ctx: CanvasRenderingContext2D,
  vp: VisibleRange,
  candles: Candle[],
  markers: ChartEventMarker[],
  theme: Theme,
  showTimeAxis = true,
  options: EventBadgeDrawOptions = {},
): EventBadgeGroup[] {
  if (markers.length === 0 || candles.length === 0) return [];

  const reserveEventRail = vp.reserveEventRail ?? false;
  const groups =
    options.badgeGroups ??
    layoutEventBadgeGroups(
      markers,
      vp,
      candles,
      theme,
      showTimeAxis,
      reserveEventRail,
    );
  if (groups.length === 0) return [];

  const railTop = reserveEventRail ? eventRailTopY(vp.height, showTimeAxis) : plotHeight(vp.height, showTimeAxis);
  const guideId = options.selectedGroupId ?? options.hoveredGroupId ?? null;

  ctx.save();

  if (reserveEventRail) {
    const c = getColors(theme);
    ctx.fillStyle = theme === 'dark' ? 'rgba(19, 23, 34, 0.92)' : 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(0, railTop, plotWidth(vp.width), EVENT_RAIL_HEIGHT);
    ctx.strokeStyle = c.grid;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(0, railTop);
    ctx.lineTo(plotWidth(vp.width), railTop);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (guideId) {
    const active = groups.find((group) => group.id === guideId);
    if (active) {
      ctx.strokeStyle = active.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(active.x, 0);
      ctx.lineTo(active.x, reserveEventRail ? railTop : active.y - active.radius - 2);
      ctx.stroke();
    }
  }

  for (const group of groups) {
    const isActive = group.id === guideId;
    ctx.setLineDash([]);
    ctx.globalAlpha = isActive ? 1 : 0.92;
    ctx.fillStyle = group.color;
    ctx.beginPath();
    ctx.arc(group.x, group.y, group.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = group.glyph.length > 1
      ? '9px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif'
      : '10px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(group.glyph, group.x, group.y + 0.5);
  }

  ctx.restore();
  return groups;
}

/** @deprecated Use drawEventBadges — kept for compatibility in tests. */
export function drawEventMarkers(
  ctx: CanvasRenderingContext2D,
  vp: VisibleRange,
  candles: Candle[],
  markers: ChartEventMarker[],
  theme: Theme,
): void {
  drawEventBadges(ctx, vp, candles, markers, theme, vp.reserveTimeAxis ?? true);
}

export function drawReferenceLines(
  ctx: CanvasRenderingContext2D,
  vp: VisibleRange,
  lines: ChartReferenceLine[],
  theme: Theme,
): void {
  if (lines.length === 0) return;
  const pw = plotWidth(vp.width);
  ctx.save();
  for (const line of lines) {
    const y = vp.yForPrice(line.price);
    ctx.strokeStyle = line.color ?? (theme === 'dark' ? '#fbbf24' : '#d97706');
    ctx.lineWidth = line.lineWidth ?? 1;
    ctx.setLineDash(line.lineDash ?? [6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(pw, y);
    ctx.stroke();
    if (line.label) {
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(line.label, 4, y - 4);
    }
  }
  ctx.restore();
}

const ANNOTATION_KIND_COLORS: Record<string, { dark: string; light: string }> = {
  thesis: { dark: '#22c55e', light: '#16a34a' },
  invalidation: { dark: '#ef4444', light: '#dc2626' },
  target: { dark: '#f59e0b', light: '#d97706' },
  note: { dark: '#60a5fa', light: '#2563eb' },
  signal: { dark: '#a78bfa', light: '#7c3aed' },
};

export function drawAnnotationMarkers(
  ctx: CanvasRenderingContext2D,
  vp: VisibleRange,
  candles: Candle[],
  markers: ChartAnnotationChannelMarker[],
  theme: Theme,
): void {
  if (markers.length === 0 || candles.length === 0) return;
  const c = getColors(theme);
  ctx.save();

  for (const marker of markers) {
    const idx = candles.findIndex((bar) => bar.t >= marker.timestamp);
    if (idx < vp.startIndex || idx > vp.endIndex) continue;
    const x = vp.xForIndex(idx);
    const kind = marker.kind ?? 'note';
    const palette = ANNOTATION_KIND_COLORS[kind] ?? ANNOTATION_KIND_COLORS.note!;
    const color = marker.color ?? (theme === 'dark' ? palette.dark : palette.light);

    if (marker.price != null && Number.isFinite(marker.price)) {
      const y = vp.yForPrice(marker.price);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x + 6, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, marker.price != null ? vp.yForPrice(marker.price) : 12, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = c.text;
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(marker.label.slice(0, 12), x, 22);
  }

  ctx.restore();
}
