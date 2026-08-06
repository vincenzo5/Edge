import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";
import type { PlaybookInstance, PlaybookRule, PlaybookTemplate } from "./types";
import { deriveProtectExitQuantities } from "@/lib/risk/policy/deriveProtectExitQuantities";
import { resolvePlaybookTemplateFromInstance } from "./resolveTemplate";

function orderIsFilled(order: AccountOrder | undefined): boolean {
  if (!order) return false;
  const status = order.status?.trim().toUpperCase() ?? "";
  return status === "FILLED" || status === "FILLED PARTIAL";
}

function findOrderById(orders: AccountOrder[], orderId: number | null | undefined): AccountOrder | undefined {
  if (orderId == null) return undefined;
  return orders.find((order) => order.orderId === orderId);
}

/** Scale reduceQty rule covered by a resting partial TP at promote time. */
export function resolveRestingScaleRuleId(
  instance: PlaybookInstance,
  template?: PlaybookTemplate | null,
): string | null {
  const resolved = template ?? resolvePlaybookTemplateFromInstance(instance);
  if (!resolved) return null;
  const derived = deriveProtectExitQuantities(resolved, instance.positionPlan.qty);
  return derived.restingScaleRuleId;
}

export function shouldSkipReduceQtyForRestingTp(args: {
  rule: PlaybookRule;
  instance: PlaybookInstance;
  template?: PlaybookTemplate | null;
}): boolean {
  if (args.rule.then.kind !== "reduceQty") return false;
  const scaleRuleId = resolveRestingScaleRuleId(args.instance, args.template);
  return scaleRuleId === args.rule.id;
}

/** Mark scale rule fired when its resting TP leg fills (OCA partial exit). */
export function reconcileRestingScaleFromTpFill(args: {
  instance: PlaybookInstance;
  orders: AccountOrder[];
  template?: PlaybookTemplate | null;
}): { ruleId: string; filledQty: number } | null {
  const scaleRuleId = resolveRestingScaleRuleId(args.instance, args.template);
  if (!scaleRuleId) return null;

  const runtime = args.instance.ruleRuntimes.find((item) => item.ruleId === scaleRuleId);
  if (runtime?.status === "fired" || runtime?.status === "skipped") return null;

  const tpOrder = findOrderById(args.orders, args.instance.takeProfitOrderId ?? null);
  if (!orderIsFilled(tpOrder)) return null;

  const template = args.template ?? resolvePlaybookTemplateFromInstance(args.instance);
  const derived = template
    ? deriveProtectExitQuantities(template, args.instance.positionPlan.qty)
    : null;
  const scaleQty = derived?.takeProfitQuantity ?? tpOrder?.totalQuantity ?? 0;
  if (scaleQty <= 0) return null;

  return { ruleId: scaleRuleId, filledQty: scaleQty };
}
