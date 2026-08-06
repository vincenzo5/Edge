import {
  applyPositionOrderLevels,
  type PositionOrderLevelsPatch,
  type SerializedDrawing,
} from "@edge/chart-core";

/** Apply entry/stop/target patch to a position drawing; null when invalid. */
export function reshapePositionDrawingPoints(
  drawing: SerializedDrawing,
  levels: PositionOrderLevelsPatch,
): SerializedDrawing | null {
  return applyPositionOrderLevels(drawing, levels);
}
