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
  if (idx < 0 || idx >= candles.length) {
    return { plotX, dataIndex: Math.max(0, idx) };
  }

  let nearestIndex = idx;
  let nearestPlotX = vp.xForIndex(idx);
  let nearestDistance = Math.abs(plotX - nearestPlotX);
  for (const candidate of [idx - 1, idx + 1]) {
    if (candidate < 0 || candidate >= candles.length) continue;
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
  const timestamp = candle?.t ?? 0;
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
    if (dataIndex < 0) {
      for (let i = 0; i < candles.length; i++) {
        if (candles[i].t >= (point.timestamp ?? 0)) {
          dataIndex = i;
          break;
        }
      }
    }
    if (dataIndex == null || dataIndex < 0) dataIndex = Math.max(0, candles.length - 1);
  }
  if (dataIndex == null) dataIndex = point.dataIndex;
  if (dataIndex == null) dataIndex = 0;
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
