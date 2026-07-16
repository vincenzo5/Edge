import type { Candle, VisibleRange, IndicatorConfig, SerializedDrawing } from './contracts';
import { plotWidth, plotHeight } from './layout';
import { getIndicator } from './indicators/registry';
import { defaultValueAt } from './indicatorCompute';
import { resolveIndicatorInputs } from './indicatorInputs';

export type DrawingPoint = {
  timestamp: number;
  value: number;
  dataIndex?: number;
};

export type PlotCoords = { x: number; y: number };

export const MAGNET_THRESHOLD_PX = 5;
export const CANDLE_SNAP_THRESHOLD_PX = 10;

/** Median-safe bar duration for extrapolating virtual indices. */
export function estimateBarDurationMs(candles: Candle[]): number {
  if (candles.length >= 2) {
    const last = candles.length - 1;
    const dt = candles[last]!.t - candles[last - 1]!.t;
    if (dt > 0) return dt;
    const head = candles[1]!.t - candles[0]!.t;
    if (head > 0) return head;
  }
  return 60_000;
}

/**
 * Timestamp for a data index, including virtual bars past either end of the series.
 * Never returns 0 when candles exist (0 is treated as "missing" by pointToPlot).
 */
export function timestampForDataIndex(candles: Candle[], dataIndex: number): number {
  if (candles.length === 0) return 0;
  if (dataIndex >= 0 && dataIndex < candles.length) {
    return candles[Math.floor(dataIndex)]!.t;
  }
  const dt = estimateBarDurationMs(candles);
  if (dataIndex < 0) {
    return candles[0]!.t + dataIndex * dt;
  }
  const last = candles.length - 1;
  return candles[last]!.t + (dataIndex - last) * dt;
}

export function clampPlot(
  x: number,
  y: number,
  width: number,
  height: number,
  showTimeAxis = true
): PlotCoords {
  const pw = plotWidth(width);
  const ph = plotHeight(height, showTimeAxis);
  return {
    x: Math.max(0, Math.min(pw, x)),
    y: Math.max(0, Math.min(ph, y)),
  };
}

export function yForPricePlot(
  price: number,
  vp: VisibleRange,
  _showTimeAxis = true
): number {
  return vp.yForPrice(price);
}

export function priceForPlotY(
  plotY: number,
  vp: VisibleRange,
  _showTimeAxis = true
): number {
  return vp.priceForY(plotY);
}

export function snapPlotXToCandle(
  plotX: number,
  vp: VisibleRange,
  candles: Candle[]
): { plotX: number; dataIndex: number } {
  if (candles.length === 0) {
    return { plotX, dataIndex: -1 };
  }
  const idx = vp.indexForX(plotX);
  const last = candles.length - 1;

  // Left of first bar: clamp to first candle (stable anchor; matches historical behavior).
  if (idx < 0) {
    return { plotX, dataIndex: 0 };
  }

  // Right of last bar: snap to last candle when close so a near-miss at the live
  // edge does not create a timestamp=0 / virtual-index stretch to the plot edge.
  if (idx > last) {
    const edgeX = vp.xForIndex(last);
    const neighbor = Math.max(0, last - 1);
    const barWidth = Math.abs(edgeX - vp.xForIndex(neighbor)) || CANDLE_SNAP_THRESHOLD_PX;
    const snapPx = Math.max(CANDLE_SNAP_THRESHOLD_PX, barWidth);
    if (Math.abs(plotX - edgeX) <= snapPx) {
      return { plotX: edgeX, dataIndex: last };
    }
    // Far into empty right margin — keep virtual index; plotToPoint extrapolates ts.
    return { plotX, dataIndex: idx };
  }

  let nearestIndex = idx;
  let nearestPlotX = vp.xForIndex(idx);
  let nearestDistance = Math.abs(plotX - nearestPlotX);
  for (const candidate of [idx - 1, idx + 1]) {
    if (candidate < 0 || candidate > last) continue;
    const candidatePlotX = vp.xForIndex(candidate);
    const distance = Math.abs(plotX - candidatePlotX);
    if (distance < nearestDistance) {
      nearestIndex = candidate;
      nearestPlotX = candidatePlotX;
      nearestDistance = distance;
    }
  }

  if (nearestDistance <= CANDLE_SNAP_THRESHOLD_PX) {
    return { plotX: nearestPlotX, dataIndex: nearestIndex };
  }
  return { plotX, dataIndex: idx };
}

export function snapToOhlc(
  plotY: number,
  dataIndex: number,
  candle: Candle | null,
  vp: VisibleRange,
  showTimeAxis = true,
  thresholdPx = MAGNET_THRESHOLD_PX
): number {
  if (!candle) {
    return priceForPlotY(plotY, vp, showTimeAxis);
  }
  const ohlc = [candle.o, candle.h, candle.l, candle.c];
  let bestPrice = priceForPlotY(plotY, vp, showTimeAxis);
  let bestDist = Infinity;
  for (const price of ohlc) {
    const py = yForPricePlot(price, vp, showTimeAxis);
    const dist = Math.abs(plotY - py);
    if (dist < bestDist) {
      bestDist = dist;
      bestPrice = price;
    }
  }
  if (bestDist <= thresholdPx) return bestPrice;
  return priceForPlotY(plotY, vp, showTimeAxis);
}

export type PlotToPointOptions = {
  magnet?: boolean;
  showTimeAxis?: boolean;
  snapXCandle?: boolean;
  paneId?: string;
  indicators?: IndicatorConfig[];
};

function snapToIndicatorValue(
  plotY: number,
  dataIndex: number,
  vp: VisibleRange,
  candles: Candle[],
  indicators: IndicatorConfig[],
  showTimeAxis: boolean,
  thresholdPx = MAGNET_THRESHOLD_PX
): number {
  const ind = indicators[0];
  if (!ind || dataIndex < 0 || dataIndex >= candles.length) {
    return priceForPlotY(plotY, vp, showTimeAxis);
  }
  const plugin = getIndicator(ind.name);
  if (!plugin) return priceForPlotY(plotY, vp, showTimeAxis);
  const inputs = resolveIndicatorInputs(plugin, ind);
  const at =
    plugin.valueAt?.(dataIndex, candles, inputs) ??
    defaultValueAt(plugin, dataIndex, candles, ind, inputs);
  if (at == null || !Number.isFinite(at)) {
    return priceForPlotY(plotY, vp, showTimeAxis);
  }
  const indicatorY = yForPricePlot(at, vp, showTimeAxis);
  if (Math.abs(plotY - indicatorY) <= thresholdPx) return at;
  return priceForPlotY(plotY, vp, showTimeAxis);
}

export function plotToPoint(
  plotX: number,
  plotY: number,
  vp: VisibleRange,
  candles: Candle[],
  opts: PlotToPointOptions = {}
): DrawingPoint {
  const {
    magnet = false,
    showTimeAxis = true,
    snapXCandle = true,
    paneId = 'price',
    indicators = [],
  } = opts;
  let x = plotX;
  let dataIndex = vp.indexForX(plotX);
  if (snapXCandle) {
    const snapped = snapPlotXToCandle(plotX, vp, candles);
    x = snapped.plotX;
    dataIndex = snapped.dataIndex;
  }
  const candle = dataIndex >= 0 && dataIndex < candles.length ? candles[dataIndex] : null;
  let value: number;
  if (paneId !== 'price' && indicators.length > 0) {
    value = magnet
      ? snapToIndicatorValue(plotY, dataIndex, vp, candles, indicators, showTimeAxis)
      : priceForPlotY(plotY, vp, showTimeAxis);
  } else {
    value = magnet
      ? snapToOhlc(plotY, dataIndex, candle, vp, showTimeAxis)
      : priceForPlotY(plotY, vp, showTimeAxis);
  }
  // Extrapolate when outside loaded candles — never persist timestamp 0 while data exists.
  const timestamp = candle?.t ?? timestampForDataIndex(candles, dataIndex);
  return { timestamp, value, dataIndex };
}

export function pointToPlot(
  point: { timestamp?: number; value?: number; dataIndex?: number },
  vp: VisibleRange,
  candles: Candle[],
  showTimeAxis = true
): PlotCoords {
  let dataIndex: number | undefined;
  if (point.timestamp != null && point.timestamp !== 0) {
    dataIndex = candles.findIndex((c) => c.t === point.timestamp);
    if (dataIndex < 0 && candles.length > 0) {
      const firstTs = candles[0]!.t;
      const lastIdx = candles.length - 1;
      const lastTs = candles[lastIdx]!.t;
      const dt = estimateBarDurationMs(candles);
      if (point.timestamp > lastTs && dt > 0) {
        // Future / virtual-right: derive index from time (stable across history prepend).
        dataIndex = lastIdx + (point.timestamp - lastTs) / dt;
      } else if (point.timestamp < firstTs && dt > 0) {
        dataIndex = (point.timestamp - firstTs) / dt;
      } else {
        for (let i = 0; i < candles.length; i++) {
          if (candles[i]!.t >= point.timestamp) {
            dataIndex = i;
            break;
          }
        }
      }
    }
    // Timestamp not in series and time extrapolate failed: prefer stored dataIndex.
    if ((dataIndex == null || dataIndex < 0 || Number.isNaN(dataIndex)) && point.dataIndex != null) {
      dataIndex = point.dataIndex;
    }
    if (dataIndex == null || dataIndex < 0 || Number.isNaN(dataIndex)) {
      dataIndex = Math.max(0, candles.length - 1);
    }
  }
  if (dataIndex == null) dataIndex = point.dataIndex;
  // Missing index: default to last bar when timestamp is corrupt/missing (0), not index 0 —
  // index 0 maps to the plot's left edge and stretches position fills across the chart.
  if (dataIndex == null) {
    dataIndex =
      (point.timestamp === 0 || point.timestamp == null) && candles.length > 0
        ? candles.length - 1
        : 0;
  }
  // Legacy corrupt anchors: timestamp 0 + out-of-range index → clamp to last real bar.
  if (
    (point.timestamp === 0 || point.timestamp == null) &&
    candles.length > 0 &&
    (dataIndex < 0 || dataIndex >= candles.length)
  ) {
    dataIndex = candles.length - 1;
  }
  const x = vp.xForIndex(dataIndex);
  const y = yForPricePlot(point.value ?? 0, vp, showTimeAxis);
  return { x, y };
}

export function translateDrawingPoints(
  points: SerializedDrawing['points'],
  startPlot: PlotCoords,
  currentPlot: PlotCoords,
  vp: VisibleRange,
  candles: Candle[],
  opts: PlotToPointOptions = {}
): SerializedDrawing['points'] {
  const deltaX = currentPlot.x - startPlot.x;
  const deltaY = currentPlot.y - startPlot.y;
  const showTimeAxis = opts.showTimeAxis ?? true;

  return points.map((p) => {
    const origin = pointToPlot(p, vp, candles, showTimeAxis);
    const translated = plotToPoint(
      origin.x + deltaX,
      origin.y + deltaY,
      vp,
      candles,
      {
        ...opts,
        magnet: false,
      }
    );
    return {
      ...p,
      timestamp: translated.timestamp,
      value: translated.value,
      dataIndex: translated.dataIndex,
    };
  });
}

export function canvasToPlot(
  canvasX: number,
  canvasY: number,
  width: number,
  height: number,
  showTimeAxis = true
): PlotCoords {
  return clampPlot(canvasX, canvasY, width, height, showTimeAxis);
}
