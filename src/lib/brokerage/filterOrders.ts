import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";
import { isOpenOrderStatus } from "@/lib/trading/orderStatus";

export function filterOrdersByAccount(
  orders: AccountOrder[],
  accountId: string | null | undefined,
): AccountOrder[] {
  const normalized = accountId?.trim();
  if (!normalized) return orders;
  return orders.filter((order) => order.account?.trim() === normalized);
}

/** Working orders only — excludes filled / cancelled / inactive. */
export function filterOpenOrders(orders: AccountOrder[]): AccountOrder[] {
  return orders.filter((order) => isOpenOrderStatus(order.status));
}

/** Newest first for history views. */
export function sortOrdersNewestFirst(orders: AccountOrder[]): AccountOrder[] {
  return [...orders].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}
