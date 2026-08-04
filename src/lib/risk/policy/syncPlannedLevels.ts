import type { PositionPlan } from "@/lib/trading/playbook/types";
import {
  defaultEntryOrder,
  seedEntryOrderPrices,
  type EntryOrder,
} from "@/lib/trading/orderExecutionRecipe";

export type PlannedLevelsSyncPatch = {
  positionPlan: PositionPlan;
  entryOrder: EntryOrder;
};

/** Patch payload while instance stays planned — geometry sync from drawing. */
export function buildPlannedLevelsSyncPatch(
  positionPlan: PositionPlan,
  existingEntryOrder?: EntryOrder | null,
): PlannedLevelsSyncPatch {
  const base = existingEntryOrder ?? defaultEntryOrder();
  return {
    positionPlan,
    entryOrder: seedEntryOrderPrices(
      { ...base, orderType: base.orderType },
      { planEntry: positionPlan.entry, planStop: positionPlan.initialStop },
    ),
  };
}
