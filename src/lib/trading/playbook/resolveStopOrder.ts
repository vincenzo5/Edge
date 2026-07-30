import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";

import type { PlaybookInstance } from "./types";

export function isProtectiveStopOrder(order: AccountOrder): boolean {
  const orderType = order.orderType?.trim().toUpperCase() ?? "";
  return orderType.includes("STP") || orderType === "TRAIL" || orderType.includes("TRAIL");
}

function matchesPlaybookOrderRef(order: AccountOrder, orderRef: string | undefined): boolean {
  if (!orderRef?.trim()) return true;
  const ref = order.orderRef?.trim();
  if (!ref) return false;
  return ref === orderRef || ref.startsWith(orderRef) || orderRef.startsWith(ref);
}

export function resolveProtectiveStopOrderId(args: {
  instance: PlaybookInstance;
  orders: AccountOrder[];
  entryOrderId?: number | null;
  intentStopOrderId?: number | null;
}): number | null {
  if (args.instance.stopOrderId != null) {
    return args.instance.stopOrderId;
  }
  if (args.intentStopOrderId != null) {
    return args.intentStopOrderId;
  }

  const symbol = args.instance.positionPlan.symbol;
  const accountId = args.instance.positionPlan.accountId;
  const orderRef = args.instance.orderRef;
  const entryOrderId = args.entryOrderId ?? null;

  for (const order of args.orders) {
    if (order.symbol?.trim().toUpperCase() !== symbol) continue;
    if (order.account && order.account !== accountId) continue;
    if (!isProtectiveStopOrder(order)) continue;
    if (entryOrderId != null && order.parentId === entryOrderId) {
      return order.orderId ?? null;
    }
    if (matchesPlaybookOrderRef(order, orderRef)) {
      return order.orderId ?? null;
    }
  }

  return null;
}
