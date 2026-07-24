import { describe, expect, it } from "vitest";

import {
  buildTradePlanAlertInputs,
  tradePlanMessageForRole,
  tradePlanOperatorForRole,
} from "@/lib/alerts/tradePlanAlerts";
import type { PositionOrderLevels } from "@/lib/trading/positionTradeSetup";

const longLevels: PositionOrderLevels = {
  direction: "long",
  side: "BUY",
  entry: 100,
  stop: 95,
  target: 110,
  riskRewardRatio: 2,
};

const shortLevels: PositionOrderLevels = {
  direction: "short",
  side: "SELL",
  entry: 100,
  stop: 105,
  target: 90,
  riskRewardRatio: 2,
};

describe("tradePlanAlerts", () => {
  it("maps long operators by role", () => {
    expect(tradePlanOperatorForRole("long", "entry")).toBe("cross_above");
    expect(tradePlanOperatorForRole("long", "stop")).toBe("cross_below");
    expect(tradePlanOperatorForRole("long", "target")).toBe("cross_above");
  });

  it("maps short operators by role", () => {
    expect(tradePlanOperatorForRole("short", "entry")).toBe("cross_below");
    expect(tradePlanOperatorForRole("short", "stop")).toBe("cross_above");
    expect(tradePlanOperatorForRole("short", "target")).toBe("cross_below");
  });

  it("builds three alerts with shared bundle id", () => {
    const inputs = buildTradePlanAlertInputs({
      symbol: "AAPL",
      drawingId: "pos-1",
      levels: longLevels,
      bundleId: "bundle-123",
    });

    expect(inputs).toHaveLength(3);
    expect(new Set(inputs.map((input) => input.bundleId))).toEqual(new Set(["bundle-123"]));
    expect(inputs.map((input) => input.drawingRole)).toEqual(["entry", "stop", "target"]);
    expect(inputs.map((input) => input.price)).toEqual([100, 95, 110]);
    expect(tradePlanMessageForRole("target", longLevels)).toBe("Target (2.0R)");
  });
});
