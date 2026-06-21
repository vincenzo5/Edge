import type { Theme } from '../contracts';
import { getColors } from '../renderer';
import { plotWidth, plotHeight } from '../layout';
import type { VisibleRange } from '../contracts';

export const HIT_TOLERANCE_PX = 4;
export const CONTROL_POINT_SIZE = 6;

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
  const c = getColors(theme);
  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = c.text;
  ctx.lineWidth = 1;
  const half = CONTROL_POINT_SIZE / 2;
  for (const p of points) {
    ctx.fillRect(p.x - half, p.y - half, CONTROL_POINT_SIZE, CONTROL_POINT_SIZE);
    ctx.strokeRect(p.x - half, p.y - half, CONTROL_POINT_SIZE, CONTROL_POINT_SIZE);
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
