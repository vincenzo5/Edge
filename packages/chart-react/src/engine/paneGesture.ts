import type { VisibleRange } from '@edge/chart-core';
import type { ViewportState } from './viewport';

/** Active pointer gesture on a chart pane (axis scale vs body pan). */
export type ActiveGesture =
  | { type: 'bodyPan' }
  | { type: 'priceScale'; initial: ViewportState; startY: number }
  | { type: 'timeScale'; initial: ViewportState; startX: number }
  | null;

/** Copy viewport fields for gesture baseline snapshots (no coordinate helpers). */
export function snapshotViewport(vp: VisibleRange): ViewportState {
  return {
    startIndex: vp.startIndex,
    endIndex: vp.endIndex,
    priceMin: vp.priceMin,
    priceMax: vp.priceMax,
    width: vp.width,
    height: vp.height,
    priceScaleMode: vp.priceScaleMode,
    reserveTimeAxis: vp.reserveTimeAxis,
    priceScaleContext: vp.priceScaleContext,
  };
}
