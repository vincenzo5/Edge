import type { Candle, IndicatorConfig, VisibleRange } from './contracts';
import { formatPrice } from './format';
import { plotHeight } from './layout';
import { IndicatorRegistry } from './pluginHost';
import { defaultValueAt } from './indicatorCompute';
import { formatAxisTime } from './time';

/** Map plot-area Y (0..plotHeight) to price; vp.priceForY uses full canvas height. */
export function priceForPlotY(
  plotY: number,
  vp: VisibleRange,
  showTimeAxis: boolean
): number {
  const ph = plotHeight(vp.height, showTimeAxis);
  const range = vp.priceMax - vp.priceMin;
  if (ph <= 0 || range <= 0) return vp.priceMax;
  return vp.priceMax - (plotY / ph) * range;
}

export function formatCrosshairValue(
  paneId: string,
  plotY: number,
  vp: VisibleRange,
  candles: Candle[],
  dataIndex: number,
  indicators: IndicatorConfig[],
  showTimeAxis = true
): string {
  if (paneId === 'price') {
    return formatPrice(priceForPlotY(plotY, vp, showTimeAxis), 2);
  }

  const ind = indicators[0];
  if (ind && dataIndex >= 0 && dataIndex < candles.length) {
    const plugin = IndicatorRegistry.get(ind.name);
    if (plugin) {
      const at =
        plugin.valueAt?.(dataIndex, candles, ind.params) ??
        defaultValueAt(plugin, dataIndex, candles, ind.params);
      if (at != null && Number.isFinite(at)) {
        return formatPrice(at, 4);
      }
    }
  }

  return formatPrice(priceForPlotY(plotY, vp, showTimeAxis), 4);
}

/** Clear crosshair on canvas leave unless pointer entered another pane in the same chart. */
export function shouldClearCrosshairOnLeave(
  relatedTarget: EventTarget | null,
  container: Element | null
): boolean {
  if (!container) return true;
  if (relatedTarget instanceof Node && container.contains(relatedTarget)) return false;
  return true;
}

/** Nearest candle index for a wall-clock timestamp (ms). Returns -1 when series is empty. */
export function findDataIndexForTimestamp(candles: Candle[], timestamp: number): number {
  if (candles.length === 0) return -1;

  let lo = 0;
  let hi = candles.length - 1;
  let best = 0;
  let bestDiff = Math.abs(candles[0].t - timestamp);

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = candles[mid].t;
    const diff = Math.abs(t - timestamp);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = mid;
    }
    if (t === timestamp) return mid;
    if (t < timestamp) lo = mid + 1;
    else hi = mid - 1;
  }

  return best;
}

/** Clamp a data index to the visible viewport window. */
export function clampIndexToViewport(index: number, vp: VisibleRange): number {
  return Math.max(vp.startIndex, Math.min(vp.endIndex, index));
}

export function buildSyncedCrosshairState(args: {
  dataIndex: number;
  vp: VisibleRange;
  candles: Candle[];
  indicators: IndicatorConfig[];
  interval: import('./contracts').Interval;
  segment: { top: number; height: number; showTimeAxis: boolean };
}): import('./contracts').CrosshairState {
  const { dataIndex, vp, candles, indicators, interval, segment } = args;
  const plotX = vp.xForIndex(dataIndex);
  const plotY = plotHeight(segment.height, segment.showTimeAxis) / 2;
  const candle = candles[dataIndex];
  return {
    plotX,
    globalY: segment.top + plotY,
    activePaneId: 'price',
    paneTop: segment.top,
    paneHeight: segment.height,
    paneReserveTimeAxis: segment.showTimeAxis,
    timestamp: candle?.t ?? null,
    dataIndex,
    valueLabel: formatCrosshairValue(
      'price',
      plotY,
      vp,
      candles,
      dataIndex,
      indicators,
      segment.showTimeAxis,
    ),
    timeLabel: candle ? formatAxisTime(candle.t, interval) : '',
  };
}
