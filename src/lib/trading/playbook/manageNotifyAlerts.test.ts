import { describe, expect, it } from "vitest";

import { BREAK_EVEN_PRESET, HALF_THEN_BE_PRESET } from "./presets";
import {
  buildManageNotifyAlertInputs,
  formatManageNotifySummary,
  manageNotifyOperatorForSide,
} from "./manageNotifyAlerts";
import { planPlaybookSteps } from "./planSteps";
import { lockPositionPlan } from "./types";

const longPlan = lockPositionPlan({
  symbol: "AAPL",
  accountId: "DUP586813",
  side: "BUY",
  entry: 100,
  initialStop: 95,
  qty: 10,
  environment: "paper",
  lockedAt: "2026-07-24T18:00:00.000Z",
});

describe("manageNotifyAlerts", () => {
  it("builds long notify alerts with shared bundleId", () => {
    const { bundleId, alerts } = buildManageNotifyAlertInputs({
      template: BREAK_EVEN_PRESET,
      positionPlan: longPlan,
      bundleId: "00000000-0000-4000-8000-000000000001",
    });
    expect(bundleId).toBe("00000000-0000-4000-8000-000000000001");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      symbol: "AAPL",
      operator: "cross_above",
      price: 105,
      recurrence: "once",
      bundleId,
    });
    expect(alerts[0]?.message).toContain("Manage ·");
  });

  it("uses cross_below for short positions", () => {
    const shortPlan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "SELL",
      entry: 100,
      initialStop: 105,
      qty: 10,
      environment: "paper",
      lockedAt: "2026-07-24T18:00:00.000Z",
    });
    const { alerts } = buildManageNotifyAlertInputs({
      template: BREAK_EVEN_PRESET,
      positionPlan: shortPlan,
    });
    expect(alerts[0]?.operator).toBe("cross_below");
    expect(alerts[0]?.price).toBe(95);
  });

  it("skips steps without triggerPrice", () => {
    const { alerts } = buildManageNotifyAlertInputs({
      template: HALF_THEN_BE_PRESET,
      positionPlan: longPlan,
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.price).toBe(105);
  });

  it("generates unique bundleId when omitted", () => {
    const first = buildManageNotifyAlertInputs({
      template: BREAK_EVEN_PRESET,
      positionPlan: longPlan,
    });
    const second = buildManageNotifyAlertInputs({
      template: BREAK_EVEN_PRESET,
      positionPlan: longPlan,
    });
    expect(first.bundleId).not.toBe(second.bundleId);
  });

  it("formats plain-English notify summary", () => {
    const steps = planPlaybookSteps(BREAK_EVEN_PRESET, longPlan);
    expect(formatManageNotifySummary(steps)).toContain("105.00");
  });

  it("manageNotifyOperatorForSide matches side", () => {
    expect(manageNotifyOperatorForSide("BUY")).toBe("cross_above");
    expect(manageNotifyOperatorForSide("SELL")).toBe("cross_below");
  });
});
