import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";

export type OrderDisplayGroup =
  | { kind: "single"; order: AccountOrder }
  | { kind: "bracket"; entry: AccountOrder; children: AccountOrder[] }
  | { kind: "oco"; orders: AccountOrder[] };

export function groupAccountOrders(orders: AccountOrder[]): OrderDisplayGroup[] {
  const byId = new Map<number, AccountOrder>();
  for (const order of orders) {
    if (order.orderId != null) {
      byId.set(order.orderId, order);
    }
  }

  const consumed = new Set<number>();
  const groups: OrderDisplayGroup[] = [];

  for (const order of orders) {
    const orderId = order.orderId;
    if (orderId == null || consumed.has(orderId)) continue;

    const childOrders = orders.filter(
      (candidate) =>
        candidate.parentId === orderId &&
        candidate.orderId != null &&
        !consumed.has(candidate.orderId),
    );

    if (childOrders.length > 0) {
      for (const child of childOrders) {
        if (child.orderId != null) consumed.add(child.orderId);
      }
      consumed.add(orderId);
      groups.push({ kind: "bracket", entry: order, children: childOrders });
      continue;
    }

    const ocaGroup = order.ocaGroup?.trim();
    if (ocaGroup && !order.parentId) {
      const ocaPeers = orders.filter(
        (candidate) =>
          candidate.ocaGroup === ocaGroup &&
          candidate.orderId != null &&
          !consumed.has(candidate.orderId),
      );
      if (ocaPeers.length > 1) {
        for (const peer of ocaPeers) {
          if (peer.orderId != null) consumed.add(peer.orderId);
        }
        groups.push({ kind: "oco", orders: ocaPeers });
        continue;
      }
    }

    consumed.add(orderId);
    groups.push({ kind: "single", order });
  }

  return groups;
}

export function orderGroupLabel(group: OrderDisplayGroup): string | null {
  if (group.kind === "bracket") return "Bracket";
  if (group.kind === "oco") return "OCO";
  return null;
}
