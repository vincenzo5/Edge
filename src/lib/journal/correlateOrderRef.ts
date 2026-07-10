import type { JournalFill, JournalTrade } from "./types";

export const EDGE_INTENT_ORDER_REF_PREFIX = "edge-intent-";

export type OrderRefFillLike = Pick<JournalFill, "execId" | "orderRef">;
export type OrderRefTradeLike = Pick<JournalTrade, "fillExecIds"> & { id?: string };

export function parseEdgeIntentId(orderRef: string | null | undefined): string | null {
  const trimmed = orderRef?.trim();
  if (!trimmed?.startsWith(EDGE_INTENT_ORDER_REF_PREFIX)) return null;
  const intentId = trimmed.slice(EDGE_INTENT_ORDER_REF_PREFIX.length).trim();
  return intentId.length > 0 ? intentId : null;
}

export function isEdgeIntentOrderRef(orderRef: string | null | undefined): boolean {
  return parseEdgeIntentId(orderRef) != null;
}

export function findFillsByOrderRef(
  fills: OrderRefFillLike[],
  orderRef: string,
): OrderRefFillLike[] {
  const normalized = orderRef.trim();
  if (!normalized) return [];
  return fills.filter((fill) => fill.orderRef?.trim() === normalized);
}

export function findTradeForOrderRef(
  fills: OrderRefFillLike[],
  trades: Array<OrderRefTradeLike & { id: string }>,
  orderRef: string,
): (OrderRefTradeLike & { id: string }) | null {
  const matchingFills = findFillsByOrderRef(fills, orderRef);
  if (matchingFills.length === 0) return null;
  const execIds = new Set(matchingFills.map((fill) => fill.execId));
  return (
    trades.find((trade) =>
      trade.fillExecIds.some((execId) => execIds.has(execId)),
    ) ?? null
  );
}

export function collectOrderRefsForTrade(
  fills: OrderRefFillLike[],
  trade: OrderRefTradeLike,
): string[] {
  const execIds = new Set(trade.fillExecIds);
  const refs = new Set<string>();
  for (const fill of fills) {
    if (!execIds.has(fill.execId)) continue;
    const ref = fill.orderRef?.trim();
    if (ref) refs.add(ref);
  }
  return [...refs];
}
