import { describe, expect, it } from "vitest";

import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";
import { lockPositionPlan } from "@/lib/trading/playbook/types";

import { deriveProtectState, reconcileProtectBindings } from "./reconcileProtect";
import type { RiskPolicyTemplate } from "./types";

function stopOrder(orderId: number): AccountOrder {
  return {
    orderId,
    account: "DUP586813",
    symbol: "AAPL",
    action: "SELL",
    orderType: "STP",
    totalQuantity: 10,
    status: "Submitted",
    updatedAt: Date.now(),
    contract: { symbol: "AAPL", secType: "STK" },
  };
}

describe("reconcileProtect", () => {
  it("derives resting when protective stop is observed", () => {
    const plan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "BUY",
      entry: 100,
      initialStop: 95,
      qty: 10,
      environment: "paper",
    });
    const policySnapshot: RiskPolicyTemplate = {
      id: "tpl-1",
      name: "Classic",
      schemaVersion: 1,
      scope: "trade",
      exits: [
        {
          id: "protect-stop",
          role: "protect",
          binding: "restingBroker",
          when: { kind: "protectiveFill" },
          then: { kind: "notify" },
          once: true,
        },
      ],
      adds: [],
    };
    const instance = {
      id: "inst-1",
      templateId: "tpl-1",
      positionPlan: plan,
      status: "armed" as const,
      ruleRuntimes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      policySnapshot,
    };

    const result = reconcileProtectBindings({
      instance,
      orders: [stopOrder(42)],
      checkedAt: "2026-07-31T14:00:00.000Z",
    });

    expect(result.protectState).toBe("resting");
    expect(result.protect[0]?.observed?.orderId).toBe(42);
    expect(result.protectCheckedAt).toBe("2026-07-31T14:00:00.000Z");
  });

  it("derives missing when protect exit expected but no broker stop", () => {
    expect(
      deriveProtectState({
        expectedProtectCount: 1,
        observedOrderCount: 0,
      }),
    ).toBe("missing");
  });

  it("preserves cancelled when explicitly cancelled and no orders remain", () => {
    expect(
      deriveProtectState({
        expectedProtectCount: 1,
        observedOrderCount: 0,
        priorState: "cancelled",
      }),
    ).toBe("cancelled");
  });
});
