import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";
import { isProtectiveStopOrder } from "@/lib/trading/playbook/resolveStopOrder";
import { resolvePlaybookTemplateFromInstance } from "@/lib/trading/playbook/resolveTemplate";
import type { PlaybookInstance, PlaybookRule } from "@/lib/trading/playbook/types";

import {
  isRestingBrokerProtectExit,
  resolveTemplateExits,
  type ProtectBinding,
  type ProtectState,
  type RiskPolicyTemplate,
} from "./types";

function normalizeSymbol(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? "";
}

function normalizeAction(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? "";
}

function closingActionForSide(side: "BUY" | "SELL"): "BUY" | "SELL" {
  return side === "BUY" ? "SELL" : "BUY";
}

function resolveRestingBrokerProtectExits(instance: PlaybookInstance): PlaybookRule[] {
  const withPolicy = instance as PlaybookInstance & { policySnapshot?: RiskPolicyTemplate };
  if (withPolicy.policySnapshot) {
    return resolveTemplateExits(withPolicy.policySnapshot).filter(isRestingBrokerProtectExit);
  }
  const template = resolvePlaybookTemplateFromInstance(instance);
  if (!template) return [];
  const exits = template.exits ?? template.rules;
  return exits.filter(isRestingBrokerProtectExit);
}

function protectiveOrdersForInstance(
  instance: PlaybookInstance,
  orders: AccountOrder[],
): AccountOrder[] {
  const symbol = normalizeSymbol(instance.positionPlan.symbol);
  const accountId = instance.positionPlan.accountId.trim();
  const closingAction = closingActionForSide(instance.positionPlan.side);

  return orders.filter((order) => {
    if (normalizeSymbol(order.symbol) !== symbol) return false;
    if (order.account?.trim() && order.account.trim() !== accountId) return false;
    if (!isProtectiveStopOrder(order)) return false;
    return normalizeAction(order.action) === closingAction;
  });
}

export function deriveProtectState(args: {
  expectedProtectCount: number;
  observedOrderCount: number;
  priorState?: ProtectState;
}): ProtectState {
  if (args.expectedProtectCount === 0) {
    return "unknown";
  }
  if (args.priorState === "cancelled" && args.observedOrderCount === 0) {
    return "cancelled";
  }
  if (args.observedOrderCount === 0) {
    return "missing";
  }
  if (args.observedOrderCount >= args.expectedProtectCount) {
    return "resting";
  }
  return "partial";
}

function buildProtectBinding(
  rule: PlaybookRule,
  order: AccountOrder | null,
  checkedAt: string,
): ProtectBinding {
  const expectedKind =
    rule.then.kind === "attachTrail" ? "trail" : rule.role === "takeProfit" ? "takeProfit" : "stop";

  return {
    exitId: rule.id,
    role: rule.role ?? "protect",
    expected: {
      kind: expectedKind,
      price: rule.then.kind === "modifyStop" ? rule.then.stopPrice : undefined,
      qtyScope: rule.qtyScope,
    },
    observed: order?.orderId
      ? {
          orderId: order.orderId,
          ocaGroup: order.ocaGroup?.trim() || undefined,
          orderRef: order.orderRef?.trim() || undefined,
          seenAt: checkedAt,
        }
      : null,
  };
}

export function reconcileProtectBindings(args: {
  instance: PlaybookInstance;
  orders: AccountOrder[];
  checkedAt?: string;
}): {
  protect: ProtectBinding[];
  protectState: ProtectState;
  protectCheckedAt: string;
} {
  const checkedAt = args.checkedAt ?? new Date().toISOString();
  const protectExits = resolveRestingBrokerProtectExits(args.instance);
  const protectiveOrders = protectiveOrdersForInstance(args.instance, args.orders);

  const protect = protectExits.map((rule, index) =>
    buildProtectBinding(rule, protectiveOrders[index] ?? null, checkedAt),
  );

  const protectState = deriveProtectState({
    expectedProtectCount: protectExits.length,
    observedOrderCount: protectiveOrders.length,
    priorState: args.instance.protectState,
  });

  return { protect, protectState, protectCheckedAt: checkedAt };
}
