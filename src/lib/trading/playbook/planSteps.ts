import type { ManageStep, PlaybookRule, PlaybookTemplate, PositionPlan } from "./types";
import { priceAtMultipleOfR } from "./types";

function resolveStopPrice(then: PlaybookRule["then"], plan: PositionPlan): number | undefined {
  if (then.kind !== "modifyStop") return undefined;
  if (then.breakEven) return plan.entry;
  if (then.stopRMultiple != null) {
    if (then.stopRMultiple === 0) return plan.entry;
    return priceAtMultipleOfR(plan, then.stopRMultiple);
  }
  return then.stopPrice;
}

function resolveReduceQty(then: PlaybookRule["then"], plan: PositionPlan): number | undefined {
  if (then.kind !== "reduceQty") return undefined;
  const raw = plan.qty * then.fraction;
  const rounded = Math.floor(raw);
  return rounded > 0 ? rounded : undefined;
}

function resolveTriggerPrice(when: PlaybookRule["when"], plan: PositionPlan): number | undefined {
  if (when.kind === "multipleOfR") {
    return priceAtMultipleOfR(plan, when.multiple);
  }
  if (when.kind === "priceCross") {
    return when.price;
  }
  return undefined;
}

function planRuleStep(rule: PlaybookRule, plan: PositionPlan): ManageStep {
  const triggerPrice = resolveTriggerPrice(rule.when, plan);
  const stopPrice = resolveStopPrice(rule.then, plan);
  const reduceQty = resolveReduceQty(rule.then, plan);

  return {
    ruleId: rule.id,
    label: rule.label ?? rule.id,
    when: rule.when,
    then: rule.then,
    triggerPrice,
    stopPrice,
    reduceQty,
  };
}

/** Pure planner: preset + locked PositionPlan → intended manage steps (no broker I/O). */
export function planPlaybookSteps(
  template: PlaybookTemplate,
  positionPlan: PositionPlan,
): ManageStep[] {
  const sorted = [...template.rules].sort(
    (a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER),
  );
  return sorted.map((rule) => planRuleStep(rule, positionPlan));
}
