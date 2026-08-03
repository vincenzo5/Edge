import type { PlaybookTemplate } from "@/lib/trading/playbook/types";

export type ProtectExitQuantities = {
  takeProfitQuantity: number;
  stopQuantity: number;
  runnerQuantity: number;
  /** First scale reduceQty rule id, when TP qty is derived from it. */
  restingScaleRuleId: string | null;
};

function roundEntryQty(entryQty: number): number {
  return Math.max(1, Math.round(entryQty));
}

/** Map policy template scale rules → resting Protect leg sizes (defaults: full entry on both legs). */
export function deriveProtectExitQuantities(
  template: PlaybookTemplate | null | undefined,
  entryQty: number,
): ProtectExitQuantities {
  const entry = roundEntryQty(entryQty);
  let takeProfitQuantity = entry;
  let restingScaleRuleId: string | null = null;

  if (template?.rules?.length) {
    const sorted = [...template.rules].sort(
      (a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER),
    );
    for (const rule of sorted) {
      if (rule.then.kind !== "reduceQty") continue;
      if (rule.when.kind !== "multipleOfR") continue;
      const fraction = rule.then.fraction;
      if (!Number.isFinite(fraction) || fraction <= 0 || fraction >= 1) continue;
      const scaled = Math.floor(entry * fraction);
      if (scaled <= 0 || scaled >= entry) continue;
      takeProfitQuantity = scaled;
      restingScaleRuleId = rule.id;
      break;
    }
  }

  return {
    takeProfitQuantity,
    stopQuantity: entry,
    runnerQuantity: entry - takeProfitQuantity,
    restingScaleRuleId,
  };
}
