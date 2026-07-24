import type { PlaybookThen, PositionPlan } from "./types";

export function resolveReduceQtyFromFilled(
  then: Extract<PlaybookThen, { kind: "reduceQty" }>,
  filledQty: number,
): number | undefined {
  const raw = filledQty * then.fraction;
  const rounded = Math.floor(raw);
  return rounded > 0 ? rounded : undefined;
}

export function resolveEffectiveFilledQty(
  plan: PositionPlan,
  filledQty: number | null | undefined,
  positionQty: number | null | undefined,
): number {
  if (filledQty != null && filledQty > 0) return filledQty;
  if (positionQty != null && positionQty !== 0) return Math.abs(positionQty);
  return plan.qty;
}
