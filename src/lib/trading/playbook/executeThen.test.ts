import { describe, expect, it, vi, beforeEach } from "vitest";

import { executePlaybookThen } from "./executeThen";
import { BREAK_EVEN_PRESET, HALF_PLUS_TRAIL_PRESET, HALF_THEN_BE_PRESET } from "./presets";
import { createPlaybookInstance, lockPositionPlan } from "./types";
import { resetAuditLogForTests, listAudit } from "../auditLog";

describe("executePlaybookThen", () => {
  beforeEach(() => {
    resetAuditLogForTests();
  });

  const positionPlan = lockPositionPlan({
    symbol: "AAPL",
    accountId: "DUP586813",
    side: "BUY",
    entry: 100,
    initialStop: 95,
    qty: 100,
    environment: "paper",
  });

  it("modifyStop resolves stopRMultiple to a locked profit price", async () => {
    const modifyOrder = vi.fn(async () => ({ order: {}, intent: null }));
    const instance = createPlaybookInstance({
      id: "inst-r",
      template: BREAK_EVEN_PRESET,
      positionPlan,
      status: "armed",
      orderIntentId: "intent-r",
    });

    const result = await executePlaybookThen(
      {
        id: "lock-025",
        when: { kind: "multipleOfR", multiple: 0.5 },
        then: { kind: "modifyStop", stopRMultiple: 0.25 },
        once: true,
      },
      {
        tradingService: { modifyOrder, submitOrder: vi.fn() },
        instance,
        stopOrderId: 55,
        filledQty: 100,
      },
    );

    expect(result.ok).toBe(true);
    // entry 100, rUnit 5 → +0.25R = 101.25
    expect(modifyOrder).toHaveBeenCalledWith(
      "DUP586813",
      55,
      { stopPrice: 101.25 },
      "intent-r",
      "paper",
      undefined,
    );
  });

  it("modifyStop sends break-even stop price", async () => {
    const modifyOrder = vi.fn(async () => ({ order: {}, intent: null }));
    const instance = createPlaybookInstance({
      id: "inst-be",
      template: BREAK_EVEN_PRESET,
      positionPlan,
      status: "armed",
      orderIntentId: "intent-1",
    });

    const result = await executePlaybookThen(BREAK_EVEN_PRESET.rules[0]!, {
      tradingService: { modifyOrder, submitOrder: vi.fn() },
      instance,
      stopOrderId: 55,
      filledQty: 100,
    });

    expect(result.ok).toBe(true);
    expect(modifyOrder).toHaveBeenCalledWith(
      "DUP586813",
      55,
      { stopPrice: 100 },
      "intent-1",
      "paper",
      undefined,
    );
    expect(listAudit().some((entry) => entry.detail?.includes("modifyStop"))).toBe(true);
  });

  it("reduceQty submits opposite-side market order", async () => {
    const submitOrder = vi.fn(async () => ({
      order: {},
      orderRef: "edge-1",
      intent: {},
    }));
    const instance = createPlaybookInstance({
      id: "inst-scale",
      template: HALF_THEN_BE_PRESET,
      positionPlan,
      status: "armed",
    });

    const result = await executePlaybookThen(HALF_THEN_BE_PRESET.rules[0]!, {
      tradingService: { modifyOrder: vi.fn(), submitOrder },
      instance,
      stopOrderId: null,
      filledQty: 100,
    });

    expect(result.ok).toBe(true);
    expect(submitOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        side: "SELL",
        quantity: 50,
        orderType: "MKT",
      }),
      "playbook-inst-scale-scale-half-1r-reduce",
      undefined,
      undefined,
    );
  });

  it("attachTrail cancels stop and submits TRAIL for remainder", async () => {
    const cancelOrder = vi.fn(async () => ({ order: {}, intent: null }));
    const submitOrder = vi.fn(async () => ({
      order: { orderId: 88 },
      orderRef: "edge-trail",
      intent: {},
    }));
    const instance = createPlaybookInstance({
      id: "inst-trail",
      template: HALF_PLUS_TRAIL_PRESET,
      positionPlan,
      status: "armed",
      orderIntentId: "intent-trail",
    });
    const trailRule = HALF_PLUS_TRAIL_PRESET.rules.find((r) => r.id === "trail-remainder")!;

    const result = await executePlaybookThen(trailRule, {
      tradingService: { modifyOrder: vi.fn(), submitOrder, cancelOrder },
      instance,
      stopOrderId: 55,
      filledQty: 50,
    });

    expect(result.ok).toBe(true);
    expect(result.stopOrderId).toBe(88);
    expect(cancelOrder).toHaveBeenCalledWith(
      "DUP586813",
      55,
      "intent-trail",
      "paper",
      undefined,
    );
    expect(submitOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: "TRAIL",
        quantity: 50,
        stopPrice: 1,
      }),
      "playbook-inst-trail-trail-remainder-trail",
      undefined,
      undefined,
    );
    expect(listAudit().some((entry) => entry.detail?.includes("attachTrail"))).toBe(true);
  });
});
