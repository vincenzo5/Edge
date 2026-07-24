import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";

import type { PlaybookInstance, PlaybookRule, PlaybookWhen, PositionPlan } from "./types";
import { priceAtMultipleOfR } from "./types";

export type PlaybookWhenContext = {
  lastPrice: number | null;
  ruleRuntimes: PlaybookInstance["ruleRuntimes"];
};

function isPriceAtOrBeyondTrigger(plan: PositionPlan, trigger: number, lastPrice: number): boolean {
  if (plan.side === "BUY") {
    return lastPrice >= trigger;
  }
  return lastPrice <= trigger;
}

function evaluatePriceCross(
  when: Extract<PlaybookWhen, { kind: "priceCross" }>,
  plan: PositionPlan,
  lastPrice: number,
): boolean {
  const direction = when.direction ?? (plan.side === "BUY" ? "above" : "below");
  if (direction === "above") {
    return lastPrice >= when.price;
  }
  return lastPrice <= when.price;
}

function ruleRuntimeById(
  runtimes: PlaybookInstance["ruleRuntimes"],
  ruleId: string,
): PlaybookInstance["ruleRuntimes"][number] | undefined {
  return runtimes.find((item) => item.ruleId === ruleId);
}

export function evaluatePlaybookWhen(
  when: PlaybookWhen,
  plan: PositionPlan,
  context: PlaybookWhenContext,
): boolean {
  if (when.kind === "multipleOfR") {
    if (context.lastPrice == null) return false;
    const trigger = priceAtMultipleOfR(plan, when.multiple);
    return isPriceAtOrBeyondTrigger(plan, trigger, context.lastPrice);
  }

  if (when.kind === "priceCross") {
    if (context.lastPrice == null) return false;
    return evaluatePriceCross(when, plan, context.lastPrice);
  }

  if (when.kind === "scaleFill") {
    const targetId = when.ruleId;
    if (!targetId) return false;
    return ruleRuntimeById(context.ruleRuntimes, targetId)?.status === "fired";
  }

  return false;
}

export function ruleRequirementsMet(
  rule: PlaybookRule,
  runtimes: PlaybookInstance["ruleRuntimes"],
): boolean {
  if (!rule.requires?.length) return true;
  return rule.requires.every(
    (ruleId) => ruleRuntimeById(runtimes, ruleId)?.status === "fired",
  );
}

export function isActionableWhenKind(when: PlaybookWhen): boolean {
  return when.kind === "multipleOfR" || when.kind === "priceCross" || when.kind === "scaleFill";
}

export function isManageActionableThen(then: PlaybookRule["then"]): boolean {
  return then.kind === "modifyStop" || then.kind === "reduceQty" || then.kind === "attachTrail";
}

/** @deprecated Use isManageActionableThen */
export function isPhase2ActionableThen(then: PlaybookRule["then"]): boolean {
  return isManageActionableThen(then);
}

export function resolveEntryOrderId(
  orders: AccountOrder[],
  instance: PlaybookInstance,
): number | null {
  const symbol = instance.positionPlan.symbol;
  const accountId = instance.positionPlan.accountId;
  const orderRef = instance.orderRef?.trim();

  for (const order of orders) {
    if (order.symbol?.trim().toUpperCase() !== symbol) continue;
    if (order.account && order.account !== accountId) continue;
    if (orderRef && order.orderRef === orderRef) {
      return order.orderId ?? null;
    }
  }

  return null;
}
