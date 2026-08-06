import type { Candle, SerializedDrawing, VisibleRange } from '@edge/chart-core';
import {
  getHitTestCandidates,
  getVisibleDrawingsSorted,
  hitTestAll,
} from '@edge/chart-core';
import { hitTestControlPointDetailed } from '@edge/chart-core/pluginHost';
import {
  cursorForControlPointRole,
  type ChartCursor,
} from '@edge/chart-core/layout';

export type DrawingHoverHit = {
  hoveredDrawingId: string | null;
  overControlPoint: boolean;
  controlPointLocked: boolean;
  controlPointCursor: ChartCursor;
  overDrawing: boolean;
};

/** One pass over sorted pane drawings for hover cursor + hovered id. */
export function computeDrawingHoverHit(
  plotX: number,
  plotY: number,
  drawings: SerializedDrawing[],
  vp: VisibleRange,
  candles: Candle[],
  showTimeAxis: boolean,
): DrawingHoverHit {
  const bodyCandidates = getHitTestCandidates(drawings);
  const visibleSorted = getVisibleDrawingsSorted(drawings);

  let overControlPoint = false;
  let controlPointLocked = false;
  let controlPointCursor: ChartCursor = 'grab';
  for (const drawing of visibleSorted) {
    const hit = hitTestControlPointDetailed(plotX, plotY, drawing, vp, candles, showTimeAxis);
    if (hit) {
      overControlPoint = true;
      controlPointLocked = Boolean(drawing.locked);
      controlPointCursor = cursorForControlPointRole(hit.role);
      break;
    }
  }

  const hoveredDrawingId = hitTestAll(
    plotX,
    plotY,
    drawings,
    vp,
    candles,
    showTimeAxis,
    bodyCandidates,
  );

  return {
    hoveredDrawingId,
    overControlPoint,
    controlPointLocked,
    controlPointCursor,
    overDrawing: hoveredDrawingId != null,
  };
}
