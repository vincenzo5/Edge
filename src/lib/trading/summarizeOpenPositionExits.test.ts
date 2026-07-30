import { describe, expect, it } from "vitest";

import type { AccountOrder, AccountPosition } from "@/lib/marketData/contracts/brokerage";
import { createPlaybookInstance, lockPositionPlan } from "@/lib/trading/playbook/types";
import { HALF_PLUS_TRAIL_PRESET } from "@/lib/trading/playbook/presets";
import {
  formatProtectOrderLabel,
  summarizeOpenPositionExits,
} from "./summarizeOpenPositionExits";

function position(symbol: string, qty: number, account = "DUP586813"): AccountPosition {
  return {
    account,
    contract: { symbol },
    position: qty,
    marketPrice: 105,
    updatedAt: Date.now(),
  };
}

function stopOrder(overrides: Partial<AccountOrder> = {}): AccountOrder {
  return {
    orderId: 1,
    symbol: "AAPL",
    account: "DUP586813",
    action: "SELL",
    orderType: "STP",
    auxPrice: 180,
    status: "Submitted",
    ...overrides,
  };
}

describe("summarizeOpenPositionExits", () => {
  it("marks bare long position unprotected", () => {
    const summary = summarizeOpenPositionExits({
      position: position("AAPL", 10),
      orders: [],
    });
    expect(summary.protect.attached).toBe(false);
    expect(summary.protect.kind).toBe("unprotected");
    expect(summary.protect.label).toBe("Unprotected");
    expect(summary.warnings).toEqual(["unprotected"]);
    expect(summary.manage.attached).toBe(false);
    expect(summary.manage.label).toBe("Off");
  });

  it("detects stop-only protect on closing side", () => {
    const summary = summarizeOpenPositionExits({
      position: position("AAPL", 10),
      orders: [stopOrder()],
    });
    expect(summary.protect.attached).toBe(true);
    expect(summary.protect.kind).toBe("stop");
    expect(summary.protect.label).toBe("STP 180.00");
    expect(summary.warnings).toEqual([]);
  });

  it("detects short position protect on BUY stop", () => {
    const summary = summarizeOpenPositionExits({
      position: position("AAPL", -10),
      orders: [
        stopOrder({
          action: "BUY",
          auxPrice: 195,
        }),
      ],
    });
    expect(summary.protect.attached).toBe(true);
    expect(summary.protect.label).toBe("STP 195.00");
  });

  it("ignores entry-side limit orders", () => {
    const summary = summarizeOpenPositionExits({
      position: position("AAPL", 10),
      orders: [
        {
          orderId: 2,
          symbol: "AAPL",
          account: "DUP586813",
          action: "BUY",
          orderType: "LMT",
          lmtPrice: 100,
          status: "Submitted",
        },
      ],
    });
    expect(summary.protect.attached).toBe(false);
  });

  it("detects OCO stop + TP", () => {
    const summary = summarizeOpenPositionExits({
      position: position("AAPL", 10),
      orders: [
        stopOrder({ orderId: 10, ocaGroup: "oco-1" }),
        {
          orderId: 11,
          symbol: "AAPL",
          account: "DUP586813",
          action: "SELL",
          orderType: "LMT",
          lmtPrice: 210,
          ocaGroup: "oco-1",
          status: "Submitted",
        },
      ],
    });
    expect(summary.protect.kind).toBe("stop_tp");
    expect(summary.protect.label).toBe("STP 180.00 · TP 210.00");
  });

  it("detects trail protect", () => {
    const summary = summarizeOpenPositionExits({
      position: position("AAPL", 10),
      orders: [
        stopOrder({
          orderType: "TRAIL",
          auxPrice: 1.5,
        }),
      ],
    });
    expect(summary.protect.kind).toBe("trail");
    expect(summary.protect.label).toBe("TRAIL $1.5");
  });

  it("includes manage preset and next distance", () => {
    const plan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "BUY",
      entry: 100,
      initialStop: 95,
      qty: 10,
      environment: "paper",
    });
    const instance = createPlaybookInstance({
      id: "inst-1",
      template: HALF_PLUS_TRAIL_PRESET,
      positionPlan: plan,
      status: "armed",
    });

    const summary = summarizeOpenPositionExits({
      position: position("AAPL", 10),
      orders: [stopOrder()],
      manageInstance: instance,
      lastPrice: 100,
    });

    expect(summary.manage.attached).toBe(true);
    expect(summary.manage.label).toContain("Manage:");
    expect(summary.manage.label).toContain("Half + trail");
    expect(summary.manage.nextDistance).toMatch(/R to scale/);
  });

  it("prefers cached stopOrderId on playbook instance", () => {
    const plan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "BUY",
      entry: 100,
      initialStop: 95,
      qty: 10,
      environment: "paper",
    });
    const instance = createPlaybookInstance({
      id: "inst-1",
      template: HALF_PLUS_TRAIL_PRESET,
      positionPlan: plan,
      status: "armed",
    });

    const summary = summarizeOpenPositionExits({
      position: position("AAPL", 10),
      orders: [
        stopOrder({ orderId: 99, auxPrice: 175 }),
        stopOrder({ orderId: 42, auxPrice: 180 }),
      ],
      manageInstance: { ...instance, stopOrderId: 42 },
    });

    expect(summary.protect.label).toBe("STP 180.00");
  });
});

describe("formatProtectOrderLabel", () => {
  it("formats stop and TP pair", () => {
    expect(
      formatProtectOrderLabel(stopOrder(), {
        orderId: 2,
        orderType: "LMT",
        lmtPrice: 200,
      }),
    ).toBe("STP 180.00 · TP 200.00");
  });
});
