import type { SerializedDrawing } from "@edge/chart-core/contracts";
import { computeEquityPositionSize } from "./equityPositionSize";
import {
  positionOrderLevelsFromDrawing,
  type PositionOrderLevels,
} from "@/lib/trading/positionTradeSetup";

export type PositionRiskPreviewSizing = {
  shares: number;
  plannedRiskDollars: number;
  targetRiskDollars: number;
};

export type PositionRiskPreview = PositionOrderLevels & {
  rUnit: number;
  sizing: PositionRiskPreviewSizing | null;
};

/** Geometry + optional budget-backed sizing from live drawing points. */
export function computePositionRiskPreview(
  drawing: SerializedDrawing,
  dollarRisk: number | null,
): PositionRiskPreview | null {
  const levels = positionOrderLevelsFromDrawing(drawing);
  if (!levels) return null;

  const rUnit = Math.abs(levels.entry - levels.stop);

  let sizing: PositionRiskPreviewSizing | null = null;
  if (dollarRisk != null && Number.isFinite(dollarRisk) && dollarRisk > 0) {
    const sizeResult = computeEquityPositionSize({
      entry: levels.entry,
      stop: levels.stop,
      dollarRisk,
    });
    if (sizeResult.ok) {
      sizing = {
        shares: sizeResult.shares,
        plannedRiskDollars: sizeResult.actualRiskDollars,
        targetRiskDollars: sizeResult.targetRiskDollars,
      };
    }
  }

  return {
    ...levels,
    rUnit,
    sizing,
  };
}
