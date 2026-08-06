import { getAllIndicators, getIndicator } from './indicators/registry';
import { getAllDrawings, getDrawing } from './drawings/registry';
import { CONTROL_POINT_HIT_RADIUS, HIT_TOLERANCE_PX } from './drawings/primitives';
import type { SerializedDrawing, TrackedOverlay, Candle, VisibleRange } from './contracts';

type PlotBounds = { minX: number; minY: number; maxX: number; maxY: number };

let hitTestCandidatesSource: SerializedDrawing[] | null = null;
let hitTestCandidatesRevision = -1;
let hitTestCandidatesCache: SerializedDrawing[] = [];

let visibleSortedSource: SerializedDrawing[] | null = null;
let visibleSortedRevision = -1;
let visibleSortedCache: SerializedDrawing[] = [];

function hitTestListRevision(drawings: SerializedDrawing[]): number {
  let rev = drawings.length;
  for (const d of drawings) {
    rev = (rev * 31 + (d.zLevel ?? 0)) | 0;
    rev = (rev * 31 + (d.visible ? 1 : 0)) | 0;
    rev = (rev * 31 + (d.locked ? 1 : 0)) | 0;
    rev = (rev * 31 + (d.id?.length ?? 0)) | 0;
  }
  return rev;
}

/** Visible, unlocked drawings sorted z-desc for body hit-test (cached per revision). */
export function getHitTestCandidates(drawings: SerializedDrawing[]): SerializedDrawing[] {
  const rev = hitTestListRevision(drawings);
  if (hitTestCandidatesSource === drawings && hitTestCandidatesRevision === rev) {
    return hitTestCandidatesCache;
  }
  hitTestCandidatesSource = drawings;
  hitTestCandidatesRevision = rev;
  hitTestCandidatesCache = drawings
    .filter((d) => d.visible && !d.locked)
    .sort((a, b) => b.zLevel - a.zLevel);
  return hitTestCandidatesCache;
}

/** Visible drawings sorted z-desc for control-point hit-test (cached per revision). */
export function getVisibleDrawingsSorted(drawings: SerializedDrawing[]): SerializedDrawing[] {
  const rev = hitTestListRevision(drawings);
  if (visibleSortedSource === drawings && visibleSortedRevision === rev) {
    return visibleSortedCache;
  }
  visibleSortedSource = drawings;
  visibleSortedRevision = rev;
  visibleSortedCache = drawings.filter((d) => d.visible).sort((a, b) => b.zLevel - a.zLevel);
  return visibleSortedCache;
}

function drawingPlotBounds(
  drawing: SerializedDrawing,
  vp: VisibleRange,
  candles: Candle[],
  showTimeAxis: boolean,
  padding: number,
): PlotBounds | null {
  const plugin = getDrawing(drawing.name);
  if (!plugin?.getControlPoints) return null;
  const cps = plugin.getControlPoints(drawing, vp, candles, showTimeAxis);
  if (cps.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const cp of cps) {
    minX = Math.min(minX, cp.x);
    minY = Math.min(minY, cp.y);
    maxX = Math.max(maxX, cp.x);
    maxY = Math.max(maxY, cp.y);
  }
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}

function pointInPlotBounds(plotX: number, plotY: number, bounds: PlotBounds): boolean {
  return (
    plotX >= bounds.minX &&
    plotX <= bounds.maxX &&
    plotY >= bounds.minY &&
    plotY <= bounds.maxY
  );
}

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
  riskRuler: 'risk_ruler',
  rulerTool: 'ruler',
  longPosition: 'long_position',
  shortPosition: 'short_position',
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
  showTimeAxis = true,
  candidates?: SerializedDrawing[],
): string | null {
  const sorted = candidates ?? getHitTestCandidates(drawings);
  const padding = Math.max(HIT_TOLERANCE_PX, CONTROL_POINT_HIT_RADIUS);
  for (const d of sorted) {
    const bounds = drawingPlotBounds(d, vp, candles, showTimeAxis, padding);
    if (bounds && !pointInPlotBounds(plotX, plotY, bounds)) continue;
    const plugin = getDrawing(d.name);
    if (plugin?.hitTest(plotX, plotY, d, vp, candles, showTimeAxis)) {
      return d.id ?? null;
    }
  }
  return null;
}

export type ControlPointHit = {
  index: number;
  role?: string;
};

export function hitTestControlPointDetailed(
  plotX: number,
  plotY: number,
  drawing: SerializedDrawing,
  vp: VisibleRange,
  candles: Candle[],
  showTimeAxis = true,
  tolerance = CONTROL_POINT_HIT_RADIUS,
): ControlPointHit | null {
  const plugin = getDrawing(drawing.name);
  if (!plugin?.getControlPoints) return null;
  const cps = plugin.getControlPoints(drawing, vp, candles, showTimeAxis);
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i];
    if (Math.hypot(plotX - cp.x, plotY - cp.y) <= tolerance) {
      return { index: i, role: cp.role };
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
  return (
    hitTestControlPointDetailed(
      plotX,
      plotY,
      drawing,
      vp,
      candles,
      showTimeAxis,
      tolerance,
    )?.index ?? -1
  );
}
