/** Pixel delta per wheel line (DOM_DELTA_LINE). */
const WHEEL_LINE_PX = 16;

export type WheelAction =
  | { type: 'zoom'; factor: number }
  | { type: 'pan'; deltaX: number }
  | { type: 'none' };

export function normalizeWheelDelta(delta: number, deltaMode: number): number {
  if (deltaMode === 1) return delta * WHEEL_LINE_PX;
  if (deltaMode === 2) return delta * WHEEL_LINE_PX * 16;
  return delta;
}

/** Scroll down (positive deltaY) → zoom out; up → zoom in. */
export function zoomFactorForDelta(deltaY: number): number {
  const absY = Math.abs(deltaY);
  if (absY < 0.5) return 1;
  const magnitude = Math.min(3, Math.max(1, absY / 50));
  return deltaY > 0 ? 1 - 0.05 * magnitude : 1 + 0.05 * magnitude;
}

/**
 * Map wheel deltas to chart action using the dominant axis.
 * Vertical scroll → zoom; horizontal scroll → pan time.
 */
export function resolveWheelAction(deltaX: number, deltaY: number): WheelAction {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const threshold = 0.5;

  if (absX < threshold && absY < threshold) return { type: 'none' };

  if (absX > absY) {
    return { type: 'pan', deltaX };
  }

  return { type: 'zoom', factor: zoomFactorForDelta(deltaY) };
}

/** Combine batched wheel deltas from the same frame into one action. */
export function mergeWheelBatch(deltaX: number, deltaY: number): WheelAction {
  return resolveWheelAction(deltaX, deltaY);
}
