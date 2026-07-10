import { describe, expect, it } from "vitest";
import { BrokerageRequestError } from "@/lib/brokerage/brokerageClient";
import {
  isReconcilableError,
  reconcileIntentWithBroker,
} from "./reconcile";
import type { OrderIntent } from "./types";

const baseIntent: OrderIntent = {
  intentId: "intent-1",
  idempotencyKey: "key-1",
  draft: {
    accountId: "DUP586813",
    symbol: "F",
    side: "BUY",
    quantity: 1,
    orderType: "MKT",
    environment: "paper",
  },
  status: "draft",
  orderRef: "edge-intent-intent-1",
  createdAt: 1,
  updatedAt: 1,
};

describe("reconcile", () => {
  it("matches open orders by orderRef", () => {
    const patch = reconcileIntentWithBroker(baseIntent, [
      { orderId: 17, permId: 1306430090, orderRef: "edge-intent-intent-1" },
    ]);
    expect(patch).toEqual({
      status: "submitted",
      orderId: 17,
      permId: 1306430090,
      orderRef: "edge-intent-intent-1",
    });
  });

  it("matches open orders by permId when orderRef is missing", () => {
    const patch = reconcileIntentWithBroker(
      { ...baseIntent, permId: 1306430090 },
      [{ orderId: 17, permId: 1306430090 }],
    );
    expect(patch?.orderId).toBe(17);
  });

  it("returns null when no broker order matches", () => {
    expect(reconcileIntentWithBroker(baseIntent, [])).toBeNull();
  });

  it("detects reconcilable timeout errors", () => {
    expect(
      isReconcilableError(
        new BrokerageRequestError("request_timeout", "timed out"),
      ),
    ).toBe(true);
    expect(isReconcilableError(new Error("network timeout"))).toBe(true);
    expect(isReconcilableError(new Error("validation failed"))).toBe(false);
  });
});
