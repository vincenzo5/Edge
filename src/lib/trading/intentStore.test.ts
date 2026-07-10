import { describe, expect, it } from "vitest";
import { createMemoryIntentStore } from "./intentStore";

const baseDraft = {
  accountId: "DUP586813",
  symbol: "F",
  side: "BUY" as const,
  quantity: 1,
  orderType: "MKT" as const,
  tif: "DAY" as const,
  environment: "paper" as const,
};

describe("intentStore", () => {
  it("dedupes intents by idempotency key and draft hash", () => {
    const store = createMemoryIntentStore();
    const first = store.createIntent(baseDraft, "key-1");
    const second = store.createIntent(baseDraft, "key-1");
    expect(second.intentId).toBe(first.intentId);
    expect(second.orderRef).toMatch(/^edge-intent-/);
  });

  it("creates a new intent when draft changes for same key", () => {
    const store = createMemoryIntentStore();
    const first = store.createIntent(baseDraft, "key-1");
    const second = store.createIntent({ ...baseDraft, quantity: 2 }, "key-1");
    expect(second.intentId).not.toBe(first.intentId);
  });

  it("updates intent status and broker ids", () => {
    const store = createMemoryIntentStore();
    const intent = store.createIntent(baseDraft, "key-2");
    const updated = store.updateIntent(intent.intentId, {
      status: "submitted",
      orderId: 42,
      permId: 99,
    });
    expect(updated?.status).toBe("submitted");
    expect(updated?.orderId).toBe(42);
    expect(updated?.permId).toBe(99);
  });
});
