import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";
import { BrokerageRequestError } from "@/lib/brokerage/brokerageClient";
import type { OrderIntent } from "./types";

export type ReconcilePatch = Pick<
  OrderIntent,
  "status" | "orderId" | "permId" | "orderRef"
>;

export function isReconcilableError(error: unknown): boolean {
  if (error instanceof BrokerageRequestError) {
    return (
      error.category === "request_timeout" ||
      error.category === "sidecar_unreachable" ||
      error.category === "request_failed"
    );
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("timeout") || message.includes("aborted");
  }
  return false;
}

export function reconcileIntentWithBroker(
  intent: OrderIntent,
  orders: AccountOrder[],
): ReconcilePatch | null {
  const byRef = orders.find(
    (order) =>
      order.orderRef != null &&
      order.orderRef.trim() === intent.orderRef.trim(),
  );
  if (byRef?.orderId != null) {
    return {
      status: "submitted",
      orderId: byRef.orderId,
      permId: byRef.permId ?? intent.permId ?? null,
      orderRef: intent.orderRef,
    };
  }

  if (intent.permId != null) {
    const byPerm = orders.find((order) => order.permId === intent.permId);
    if (byPerm?.orderId != null) {
      return {
        status: "submitted",
        orderId: byPerm.orderId,
        permId: byPerm.permId ?? intent.permId,
        orderRef: intent.orderRef,
      };
    }
  }

  return null;
}
