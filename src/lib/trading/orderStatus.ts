const TERMINAL_ORDER_STATUSES = new Set([
  "filled",
  "cancelled",
  "apicancelled",
  "inactive",
]);

export function isOrderCancellable(status: string | null | undefined): boolean {
  if (!status?.trim()) return false;
  return !TERMINAL_ORDER_STATUSES.has(status.trim().toLowerCase());
}
