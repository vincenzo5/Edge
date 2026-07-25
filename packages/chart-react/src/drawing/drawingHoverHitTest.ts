import type { Candle, SerializedDrawing, VisibleRange } from '@edge/chart-core';
import {
  getHitTestCandidates,
  getVisibleDrawingsSorted,
  hitTestAll,
  hitTestControlPoint,
} from '@edge/chart-core';

export type DrawingHoverHit = {
  hoveredDrawingId: string | null;
  overControlPoint: boolean;
  controlPointLocked: boolean;
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
  for (const drawing of visibleSorted) {
    const cpIdx = hitTestControlPoint(plotX, plotY, drawing, vp, candles, showTimeAxis);
    if (cpIdx >= 0) {
      overControlPoint = true;
      controlPointLocked = Boolean(drawing.locked);
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
    overDrawing: hoveredDrawingId != null,
  };
}
