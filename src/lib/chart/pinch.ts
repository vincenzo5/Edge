import type { WheelAction } from './wheel';

export type PinchPoint = { x: number; y: number };

/** Euclidean distance between two touch/pointer points. */
export function pinchDistance(a: PinchPoint, b: PinchPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

/**
 * Map pinch distance ratio to zoom factor.
 * ratio > 1 → fingers spreading → zoom in; ratio < 1 → zoom out.
 * Clamped per frame to mirror wheel zoom step magnitude (~5% per step).
 */
export function zoomFactorForPinchRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  const delta = ratio - 1;
  if (Math.abs(delta) < 0.001) return 1;
  const magnitude = Math.min(3, Math.max(1, Math.abs(delta) * 20));
  return delta > 0 ? 1 + 0.05 * magnitude : 1 - 0.05 * magnitude;
}

/** Resolve a pinch gesture frame into a zoom action anchored at midpoint X. */
export function resolvePinchAction(
  prevDistance: number,
  newDistance: number,
  anchorX: number,
): { action: Extract<WheelAction, { type: 'zoom' }>; anchorX: number } | null {
  if (prevDistance <= 0 || newDistance <= 0) return null;
  const ratio = newDistance / prevDistance;
  const factor = zoomFactorForPinchRatio(ratio);
  if (Math.abs(factor - 1) < 0.001) return null;
  return { action: { type: 'zoom', factor }, anchorX };
}

export type PinchHandlerOptions = {
  onPinch: (action: Extract<WheelAction, { type: 'zoom' }>, anchorX: number) => void;
  shouldSuppress: () => boolean;
  getContainerRect: () => DOMRect | null;
};

/** Attachable pointer handlers for two-finger pinch zoom on a chart container. */
export function createPinchHandler(options: PinchHandlerOptions) {
  const pointers = new Map<number, PinchPoint>();
  let lastDistance: number | null = null;

  const updateDistance = () => {
    if (pointers.size !== 2) {
      lastDistance = null;
      return;
    }
    const pts = Array.from(pointers.values());
    lastDistance = pinchDistance(pts[0], pts[1]);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (options.shouldSuppress()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    updateDistance();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size !== 2 || lastDistance == null) return;
    if (options.shouldSuppress()) return;

    const pts = Array.from(pointers.values());
    const newDistance = pinchDistance(pts[0], pts[1]);
    const rect = options.getContainerRect();
    if (!rect) return;

    const anchorX = (pts[0].x + pts[1].x) / 2 - rect.left;
    const result = resolvePinchAction(lastDistance, newDistance, anchorX);
    lastDistance = newDistance;
    if (result) options.onPinch(result.action, result.anchorX);
  };

  const onPointerUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    updateDistance();
  };

  const onPointerCancel = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    updateDistance();
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
