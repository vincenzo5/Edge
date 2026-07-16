import { boxFromPoints } from "@edge/chart-core";
import type { RiskDirection } from "@edge/chart-core";
import type { SerializedDrawing } from "@/lib/chart/contracts";
import type { OrderSide } from "./types";

export const POSITION_DRAWING_NAMES = ["long_position", "short_position"] as const;

export type PositionDrawingName = (typeof POSITION_DRAWING_NAMES)[number];

export type PositionOrderLevels = {
  direction: RiskDirection;
  side: OrderSide;
  entry: number;
  stop: number;
  target: number;
  riskRewardRatio: number | null;
};

export function isPositionDrawingName(name: string): name is PositionDrawingName {
  return (POSITION_DRAWING_NAMES as readonly string[]).includes(name);
}

export function directionFromDrawingName(name: string): RiskDirection | null {
  if (name === "long_position") return "long";
  if (name === "short_position") return "short";
  return null;
}

/** Derive order levels from live drawing points (ignores stale riskSetup metadata). */
export function positionOrderLevelsFromDrawing(
  drawing: SerializedDrawing,
): PositionOrderLevels | null {
  const direction = directionFromDrawingName(drawing.name);
  if (!direction) return null;

  const box = boxFromPoints(drawing.points, direction);
  if (!box) return null;

  const risk = Math.abs(box.entry - box.stop);
  const reward = Math.abs(box.target - box.entry);
  const riskRewardRatio = risk > 0 ? reward / risk : null;

  return {
    direction,
    side: direction === "long" ? "BUY" : "SELL",
    entry: box.entry,
    stop: box.stop,
    target: box.target,
    riskRewardRatio,
  };
}

export function plannedRiskDollars(entry: number, stop: number, qty: number): number {
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  return Math.abs(entry - stop) * qty;
}

export function atMarketRiskDollars(
  lastPrice: number,
  stop: number,
  qty: number,
  direction: RiskDirection,
): number {
  if (!Number.isFinite(lastPrice) || !Number.isFinite(qty) || qty <= 0) return 0;
  if (direction === "long") {
    return Math.abs(lastPrice - stop) * qty;
  }
  return Math.abs(stop - lastPrice) * qty;
}
