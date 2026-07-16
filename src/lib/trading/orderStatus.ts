const TERMINAL_ORDER_STATUSES = new Set([
  "filled",
  "cancelled",
  "apicancelled",
  "inactive",
]);

/** True when status is a settled/closed IB order state. Missing status is not terminal. */
export function isTerminalOrderStatus(status: string | null | undefined): boolean {
  if (!status?.trim()) return false;
  return TERMINAL_ORDER_STATUSES.has(status.trim().toLowerCase());
}

/**
 * True for working orders. Open-order lists already exclude closed IB trades;
 * blank/null status (common before orderStatus events) counts as open.
 */
export function isOpenOrderStatus(status: string | null | undefined): boolean {
  return !isTerminalOrderStatus(status);
}

export function isOrderCancellable(status: string | null | undefined): boolean {
  return isOpenOrderStatus(status);
}
