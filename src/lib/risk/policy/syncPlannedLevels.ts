import type { PositionPlan } from "@/lib/trading/playbook/types";
import type { EntryOrder } from "./slotSchemas";

export type PlannedLevelsSyncPatch = {
  positionPlan: PositionPlan;
  entryOrder: EntryOrder;
};

/** Patch payload while instance stays planned — geometry sync from drawing. */
export function buildPlannedLevelsSyncPatch(
  positionPlan: PositionPlan,
): PlannedLevelsSyncPatch {
  return {
    positionPlan,
    entryOrder: {
      type: "LMT",
      limitPrice: positionPlan.entry,
    },
  };
}
