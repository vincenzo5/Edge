import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";

export function filterOrdersByAccount(
  orders: AccountOrder[],
  accountId: string | null | undefined,
): AccountOrder[] {
  const normalized = accountId?.trim();
  if (!normalized) return orders;
  return orders.filter((order) => order.account?.trim() === normalized);
}
