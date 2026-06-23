import { getAllIndicators, getIndicator } from './indicators/registry';
import { getAllDrawings, getDrawing } from './drawings/registry';
import { CONTROL_POINT_HIT_RADIUS } from './drawings/primitives';
import type { SerializedDrawing, TrackedOverlay, Candle, VisibleRange } from './contracts';

export const IndicatorRegistry = {
  getAll: getAllIndicators,
  get: getIndicator,
};

/** Toolbar overlay name → registry plugin name */
export const drawingAliases: Record<string, string> = {
  straightLine: 'trend_line',
  horizontalStraightLine: 'horizontal_line',
  verticalStraightLine: 'vertical_line',
  rayLine: 'ray',
  parallelStraightLine: 'parallel_channel',
  priceChannelLine: 'price_channel',
  rect: 'rectangle',
  circle: 'circle',
  fibonacciLine: 'fib_retracement',
  priceLine: 'price_line',
  simpleAnnotation: 'annotation',
  measure: 'measure',
};

export const DrawingRegistry = {
  getAll: getAllDrawings,
  get: (name: string) => getDrawing(drawingAliases[name] ?? name),
  resolveName: (toolbarOrRegistryName: string) =>
    drawingAliases[toolbarOrRegistryName] ?? toolbarOrRegistryName,
};

export function serializeAll(drawings: SerializedDrawing[]): SerializedDrawing[] {
  return drawings
    .map((d) => ({
      id: d.id,
      name: d.name,
      label: d.label,
      points: d.points.map((p) => ({
        timestamp: p.timestamp,
        value: p.value,
        dataIndex: p.dataIndex,
      })),
      mode: d.mode,
      styles: d.styles,
      metadata: d.metadata ? { ...d.metadata } : undefined,
      visible: d.visible,
      locked: d.locked,
      zLevel: d.zLevel,
      paneId: d.paneId ?? 'price',
    }))
    .sort((a, b) => a.zLevel - b.zLevel);
}

export function restoreAll(data: SerializedDrawing[]): TrackedOverlay[] {
  return data.map((d, i) => ({
    id: d.id ?? `restored_${i}`,
    name: d.name,
    label: d.label,
    visible: d.visible,
    locked: d.locked,
    zLevel: d.zLevel,
    paneId: d.paneId ?? 'price',
  }));
}

export function hitTestAll(
  plotX: number,
  plotY: number,
  drawings: SerializedDrawing[],
  vp: VisibleRange,
  candles: Candle[],
  showTimeAxis = true
): string | null {
  const sorted = [...drawings]
    .filter((d) => d.visible && !d.locked)
    .sort((a, b) => b.zLevel - a.zLevel);
  for (const d of sorted) {
    const plugin = getDrawing(d.name);
    if (plugin?.hitTest(plotX, plotY, d, vp, candles, showTimeAxis)) {
      return d.id ?? null;
    }
  }
  return null;
}

export function hitTestControlPoint(
  plotX: number,
  plotY: number,
  drawing: SerializedDrawing,
  vp: VisibleRange,
  candles: Candle[],
  showTimeAxis = true,
  tolerance = CONTROL_POINT_HIT_RADIUS
): number {
  const plugin = getDrawing(drawing.name);
  if (!plugin?.getControlPoints) return -1;
  const cps = plugin.getControlPoints(drawing, vp, candles, showTimeAxis);
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i];
    if (Math.hypot(plotX - cp.x, plotY - cp.y) <= tolerance) return i;
  }
  return -1;
}
