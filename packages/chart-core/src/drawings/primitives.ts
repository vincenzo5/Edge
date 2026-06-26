import type { Theme } from '../contracts';
import { plotWidth, plotHeight } from '../layout';
import type { VisibleRange } from '../contracts';

export const HIT_TOLERANCE_PX = 4;
export const CONTROL_POINT_SIZE = 6;
/** Visual radius for TradingView-style circular handles. */
export const CONTROL_POINT_RADIUS = 4;
/** Hit-test radius for control-point drag (slightly larger than visual). */
export const CONTROL_POINT_HIT_RADIUS = 8;

export function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function distanceToInfiniteLine(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(px - x1, py - y1);
  return Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / len;
}

export function distanceToRay(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  plotWidthPx: number,
  plotHeightPx: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, t);
  const far = Math.max(plotWidthPx, plotHeightPx) * 2;
  const endX = x1 + (dx / Math.sqrt(lenSq)) * far;
  const endY = y1 + (dy / Math.sqrt(lenSq)) * far;
  return distanceToSegment(px, py, x1, y1, endX, endY);
}

export function pointInRect(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  edgeOnly = true
): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  if (edgeOnly) {
    const onLeft = Math.abs(px - minX) <= HIT_TOLERANCE_PX && py >= minY - HIT_TOLERANCE_PX && py <= maxY + HIT_TOLERANCE_PX;
    const onRight = Math.abs(px - maxX) <= HIT_TOLERANCE_PX && py >= minY - HIT_TOLERANCE_PX && py <= maxY + HIT_TOLERANCE_PX;
    const onTop = Math.abs(py - minY) <= HIT_TOLERANCE_PX && px >= minX - HIT_TOLERANCE_PX && px <= maxX + HIT_TOLERANCE_PX;
    const onBottom = Math.abs(py - maxY) <= HIT_TOLERANCE_PX && px >= minX - HIT_TOLERANCE_PX && px <= maxX + HIT_TOLERANCE_PX;
    return onLeft || onRight || onTop || onBottom;
  }
  return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

function lineBoundaryParameters(
  x1: number,
  y1: number,
  dx: number,
  dy: number,
  pw: number,
  ph: number
): number[] {
  const ts: number[] = [];
  if (dx !== 0) {
    ts.push((0 - x1) / dx);
    ts.push((pw - x1) / dx);
  }
  if (dy !== 0) {
    ts.push((0 - y1) / dy);
    ts.push((ph - y1) / dy);
  }
  const eps = 1e-6;
  return ts.filter((t) => {
    const x = x1 + t * dx;
    const y = y1 + t * dy;
    return x >= -eps && x <= pw + eps && y >= -eps && y <= ph + eps;
  });
}

export function extendSegmentEndpoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  height: number,
  showTimeAxis = true,
  extendLeft = false,
  extendRight = false
): { x1: number; y1: number; x2: number; y2: number } {
  const pw = plotWidth(width);
  const ph = plotHeight(height, showTimeAxis);
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return { x1, y1, x2, y2 };

  const ts = lineBoundaryParameters(x1, y1, dx, dy, pw, ph);
  let outX1 = x1;
  let outY1 = y1;
  let outX2 = x2;
  let outY2 = y2;

  if (extendLeft) {
    const leftTs = ts.filter((t) => t <= 0);
    if (leftTs.length > 0) {
      const t = Math.min(...leftTs);
      outX1 = x1 + t * dx;
      outY1 = y1 + t * dy;
    }
  }
  if (extendRight) {
    const rightTs = ts.filter((t) => t >= 0);
    if (rightTs.length > 0) {
      const t = Math.max(...rightTs);
      outX2 = x1 + t * dx;
      outY2 = y1 + t * dy;
    }
  }
  return { x1: outX1, y1: outY1, x2: outX2, y2: outY2 };
}

export function extendRayToBounds(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  height: number,
  showTimeAxis = true
): { x: number; y: number } {
  const pw = plotWidth(width);
  const ph = plotHeight(height, showTimeAxis);
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return { x: x1, y: y1 };
  const candidates: number[] = [];
  if (dx !== 0) {
    candidates.push((0 - x1) / dx);
    candidates.push((pw - x1) / dx);
  }
  if (dy !== 0) {
    candidates.push((0 - y1) / dy);
    candidates.push((ph - y1) / dy);
  }
  let bestT = 0;
  for (const t of candidates) {
    if (t > bestT) bestT = t;
  }
  if (bestT <= 0) bestT = 1;
  return { x: x1 + dx * bestT, y: y1 + dy * bestT };
}

export function defaultDrawingStroke(theme: Theme, selected: boolean): string {
  if (selected) return '#f59e0b';
  return theme === 'dark' ? '#64748b' : '#475569';
}

export function fillFromStyles(
  styles: { fillColor?: string; fillOpacity?: number },
  fallback = 'rgba(59, 130, 246, 0.15)'
): string | null {
  const opacity = styles.fillOpacity ?? 0;
  if (opacity <= 0) return null;
  const color = styles.fillColor ?? '#3b82f6';
  if (color.startsWith('rgba') || color.startsWith('rgb')) return color;
  const hex = color.replace('#', '');
  if (hex.length !== 6) return fallback;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return fallback;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function strokeFromStyles(
  styles: { lineColor?: string; lineWidth?: number; lineDash?: number[] },
  theme: Theme,
  selected: boolean,
  preview?: boolean
): { stroke: string; lineWidth: number; dash: number[] } {
  if (preview) {
    return { stroke: previewDrawingStroke(), lineWidth: 1, dash: [4, 4] };
  }
  const stroke = selected ? '#f59e0b' : styles.lineColor ?? defaultDrawingStroke(theme, false);
  return {
    stroke,
    lineWidth: styles.lineWidth ?? 1.5,
    dash: styles.lineDash ?? [],
  };
}

export function previewDrawingStroke(): string {
  return '#64748b';
}

export function drawControlPoints(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  theme: Theme,
  selected: boolean
) {
  if (!selected || points.length === 0) return;
  const fill = theme === 'dark' ? '#131722' : '#ffffff';
  const stroke = '#2962FF';
  const outerRing = theme === 'dark' ? 'rgba(41, 98, 255, 0.35)' : 'rgba(41, 98, 255, 0.25)';

  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, CONTROL_POINT_RADIUS + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = outerRing;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, CONTROL_POINT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function sortDrawingsByZ<T extends { zLevel: number }>(drawings: T[]): T[] {
  return [...drawings].sort((a, b) => a.zLevel - b.zLevel);
}

export function nextZLevel(drawings: Array<{ zLevel: number }>): number {
  if (drawings.length === 0) return 0;
  return Math.max(...drawings.map((d) => d.zLevel)) + 1;
}

export function plotDimensions(vp: VisibleRange, showTimeAxis = true) {
  return {
    pw: plotWidth(vp.width),
    ph: plotHeight(vp.height, showTimeAxis),
  };
}
