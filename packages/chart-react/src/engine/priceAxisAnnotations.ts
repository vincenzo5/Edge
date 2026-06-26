import type { Candle, IndicatorConfig, SerializedDrawing, Theme, VisibleRange, Interval } from '@edge/chart-core';
import type { RequiredChartSettings } from './chartSettings';
import { formatPrice } from '@edge/chart-core/format';
import {
  formatScaleLabel,
  linearScaleContext,
  toScaleCoord,
  type PriceScaleContext,
} from '@edge/chart-core/priceScaleTransform';
import { IndicatorRegistry, DrawingRegistry } from '@edge/chart-core';
import {
  buildResolvedStylesMap,
  getComputedSeries,
} from '@edge/chart-core/indicatorCompute';
import { resolveIndicatorInputs } from '@edge/chart-core/indicatorInputs';
import { resolveDrawingStyles } from '@edge/chart-core/drawingStyles';
import { intervalToMs } from './intervalAdapter';
import { getChartColors } from './chartTheme';

import type { PriceAxisAnnotation, LaidOutPriceAxisAnnotation, PriceAxisLineStyle } from '@edge/chart-core/priceAxisTypes';

const LABEL_HEIGHT = 20;
const MIN_LABEL_GAP = 2;

export function formatAnnotationPrice(
  price: number,
  scaleCtx: PriceScaleContext,
): string {
  if (!Number.isFinite(price)) return '—';
  if (scaleCtx.type === 'linear') return formatPrice(price, 2);
  return formatScaleLabel(toScaleCoord(price, scaleCtx), scaleCtx);
}

export function formatBarCountdown(
  lastBarTimestamp: number,
  interval: Interval,
  nowMs = Date.now(),
): string {
  const duration = intervalToMs(interval);
  const barEnd = lastBarTimestamp + duration;
  const remaining = Math.max(0, barEnd - nowMs);
  const totalSec = Math.floor(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function symbolLineMode(settings: RequiredChartSettings): PriceAxisLineStyle {
  const mode = settings.scales.symbolPriceLabelMode;
  if (mode === 'line' || mode === 'valueLine') return 'solid';
  return 'hidden';
}

function symbolShowsLabel(settings: RequiredChartSettings): boolean {
  const mode = settings.scales.symbolPriceLabelMode;
  return mode === 'value' || mode === 'valueLine';
}

export function collectSymbolAnnotations(
  candles: Candle[],
  vp: VisibleRange,
  settings: RequiredChartSettings,
  theme: Theme,
  interval?: Interval,
  nowMs = Date.now(),
): PriceAxisAnnotation[] {
  const last = candles[candles.length - 1];
  const price = last?.c;
  if (price == null || !Number.isFinite(price)) return [];

  const colors = getChartColors(theme);
  const scaleCtx = vp.priceScaleContext ?? linearScaleContext();
  const label = formatAnnotationPrice(price, scaleCtx);
  const showLabel = symbolShowsLabel(settings);
  const line = symbolLineMode(settings);
  if (!showLabel && line === 'hidden') return [];

  const annotations: PriceAxisAnnotation[] = [
    {
      id: 'symbol:last',
      paneId: 'price',
      source: 'symbol',
      value: price,
      label,
      color: colors.lastPrice,
      line,
      showLabel,
      priority: 100,
    },
  ];

  if (settings.scales.showCountdownToBarClose && interval && last?.t != null) {
    annotations.push({
      id: 'symbol:countdown',
      paneId: 'price',
      source: 'countdown',
      value: price,
      label: formatBarCountdown(last.t, interval, nowMs),
      color: colors.down,
      line: 'hidden',
      showLabel: true,
      priority: 99,
    });
  }

  return annotations;
}

export function collectIndicatorAnnotations(
  indicators: IndicatorConfig[],
  candles: Candle[],
  vp: VisibleRange,
  settings: RequiredChartSettings,
  theme: Theme,
  paneId: string,
): PriceAxisAnnotation[] {
  if (settings.scales.indicatorPriceLabelMode === 'hidden') return [];
  if (paneId !== 'price') return [];

  const index = candles.length - 1;
  if (index < 0) return [];

  const scaleCtx = vp.priceScaleContext ?? linearScaleContext();
  const annotations: PriceAxisAnnotation[] = [];

  for (const ind of indicators) {
    if (ind.visible === false || ind.pane !== 'main') continue;
    const plugin = IndicatorRegistry.get(ind.name);
    if (!plugin?.outputs?.length) continue;

    const inputs = resolveIndicatorInputs(plugin, ind);
    const data = getComputedSeries(plugin, candles, inputs, ind);
    if (!data) continue;

    for (const out of plugin.outputs) {
      if (out.plot === 'hline' || out.plot === 'columns' || out.plot === 'histogram') continue;
      const raw = data[out.key]?.[index] ?? null;
      if (raw == null || !Number.isFinite(raw)) continue;

      const styleMap = buildResolvedStylesMap(plugin, ind, theme, data, index);
      const style = styleMap.get(out.id);
      if (style && !style.visible) continue;

      const color = style?.color ?? '#888888';
      const valueLabel = formatAnnotationPrice(raw, scaleCtx);
      const label =
        settings.scales.indicatorPriceLabelMode === 'nameValue'
          ? `${out.label} ${valueLabel}`
          : valueLabel;

      annotations.push({
        id: `indicator:${ind.id}:${out.id}`,
        paneId,
        source: 'indicator',
        value: raw,
        label,
        color,
        line: 'hidden',
        showLabel: true,
        priority: 50,
      });
    }
  }

  return annotations;
}

export function collectDrawingAnnotations(
  drawings: SerializedDrawing[],
  vp: VisibleRange,
  candles: Candle[],
  settings: RequiredChartSettings,
  theme: Theme,
  paneId: string,
  showTimeAxis = true,
): PriceAxisAnnotation[] {
  if (settings.scales.drawingPriceLabels === 'hidden') return [];
  if (paneId !== 'price') return [];

  const scaleCtx = vp.priceScaleContext ?? linearScaleContext();
  const annotations: PriceAxisAnnotation[] = [];

  for (const drawing of drawings) {
    if (!drawing.visible) continue;
    const plugin = DrawingRegistry.get(drawing.name);
    if (!plugin?.axisAnnotations) continue;
    const fromPlugin = plugin.axisAnnotations(drawing, vp, candles, theme, showTimeAxis);
    for (const ann of fromPlugin) {
      annotations.push({
        ...ann,
        label: ann.label || formatAnnotationPrice(ann.value, scaleCtx),
        paneId,
        priority: ann.priority ?? 40,
      });
    }
  }

  return annotations;
}

export function collectPriceAxisAnnotations(input: {
  paneId: string;
  candles: Candle[];
  indicators: IndicatorConfig[];
  drawings: SerializedDrawing[];
  vp: VisibleRange;
  settings: RequiredChartSettings;
  theme: Theme;
  interval?: Interval;
  showTimeAxis?: boolean;
  nowMs?: number;
}): PriceAxisAnnotation[] {
  const {
    paneId,
    candles,
    indicators,
    drawings,
    vp,
    settings,
    theme,
    interval,
    showTimeAxis = true,
    nowMs = Date.now(),
  } = input;

  if (paneId === 'price') {
    return [
      ...collectSymbolAnnotations(candles, vp, settings, theme, interval, nowMs),
      ...collectIndicatorAnnotations(indicators, candles, vp, settings, theme, paneId),
      ...collectDrawingAnnotations(drawings, vp, candles, settings, theme, paneId, showTimeAxis),
    ];
  }

  return collectIndicatorAnnotations(indicators, candles, vp, settings, theme, paneId);
}

export function layoutPriceAxisAnnotations(
  annotations: PriceAxisAnnotation[],
  vp: VisibleRange,
  settings: RequiredChartSettings,
  plotAreaHeight: number,
): LaidOutPriceAxisAnnotation[] {
  const laidOut: LaidOutPriceAxisAnnotation[] = [];

  for (const ann of annotations) {
    if (!Number.isFinite(ann.value) || !vp.yForPrice) continue;
    const y = vp.yForPrice(ann.value);
    if (!Number.isFinite(y)) continue;
    laidOut.push({ ...ann, y, displayY: y });
  }

  laidOut.sort((a, b) => a.y - b.y || b.priority - a.priority);

  if (!settings.scales.noOverlappingPriceLabels) return laidOut;

  for (let i = 1; i < laidOut.length; i++) {
    const prev = laidOut[i - 1];
    const curr = laidOut[i];
    const minY = prev.displayY + LABEL_HEIGHT + MIN_LABEL_GAP;
    if (curr.displayY < minY) {
      curr.displayY = minY;
    }
  }

  for (let i = laidOut.length - 2; i >= 0; i--) {
    const next = laidOut[i + 1];
    const curr = laidOut[i];
    const maxY = next.displayY - LABEL_HEIGHT - MIN_LABEL_GAP;
    if (curr.displayY > maxY) {
      curr.displayY = maxY;
    }
  }

  for (const ann of laidOut) {
    ann.displayY = Math.max(LABEL_HEIGHT / 2, Math.min(plotAreaHeight - LABEL_HEIGHT / 2, ann.displayY));
  }

  return laidOut;
}

export function filterVisibleAnnotations(
  annotations: LaidOutPriceAxisAnnotation[],
): LaidOutPriceAxisAnnotation[] {
  return annotations.filter((ann) => ann.showLabel !== false || (ann.line && ann.line !== 'hidden'));
}
