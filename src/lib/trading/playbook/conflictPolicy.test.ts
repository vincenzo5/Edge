import { describe, expect, it } from "vitest";

import { HALF_PLUS_TRAIL_PRESET } from "./presets";
import {
  CONFLICT_POLICY,
  buildManualStopPausePatch,
  detachAffectsProtectOrders,
  instanceStatusAfterDetach,
  pauseAffectsProtectOrders,
  rulesToPauseOnManualStopDrag,
  shouldPauseOnConflict,
} from "./conflictPolicy";
import { createPlaybookInstance, lockPositionPlan } from "./types";

describe("CONFLICT_POLICY", () => {
  it("states hybrid Protect-at-broker model", () => {
    expect(CONFLICT_POLICY.hybridProtectAtBroker).toBe(true);
    expect(CONFLICT_POLICY.detachKeepsProtectOrders).toBe(true);
    expect(CONFLICT_POLICY.manualStopDragPausesRules).toBe(true);
  });
});

describe("manual stop drag conflicts", () => {
  it("pauses BE and trail rules but not scale-out", () => {
    const paused = rulesToPauseOnManualStopDrag(HALF_PLUS_TRAIL_PRESET.rules);
    expect(paused).toContain("trail-remainder");
    expect(paused).not.toContain("scale-half-1r");
  });

  it("shouldPauseOnConflict for manual stop on trail rule", () => {
    const trailRule = HALF_PLUS_TRAIL_PRESET.rules.find((r) => r.id === "trail-remainder")!;
    expect(
      shouldPauseOnConflict({ kind: "manual_stop_drag", stopPrice: 101 }, trailRule),
    ).toBe(true);
  });

  it("buildManualStopPausePatch pauses instance and skips conflicting rules", () => {
    const positionPlan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "BUY",
      entry: 100,
      initialStop: 95,
      qty: 100,
      environment: "paper",
    });
    const instance = createPlaybookInstance({
      id: "inst-1",
      template: HALF_PLUS_TRAIL_PRESET,
      positionPlan,
      status: "armed",
    });
    const patch = buildManualStopPausePatch(instance, HALF_PLUS_TRAIL_PRESET.rules);
    expect(patch?.status).toBe("paused");
    const trailRuntime = patch?.ruleRuntimes.find((r) => r.ruleId === "trail-remainder");
    expect(trailRuntime?.status).toBe("skipped");
    expect(trailRuntime?.skippedReason).toBe("manual_stop");
  });
});

describe("pause policy", () => {
  it("never cancels Protect orders", () => {
    expect(pauseAffectsProtectOrders()).toBe(false);
  });
});

describe("detach policy", () => {
  it("returns detached status without cancelling Protect", () => {
    expect(instanceStatusAfterDetach()).toBe("detached");
    expect(detachAffectsProtectOrders()).toBe(false);
    expect(pauseAffectsProtectOrders()).toBe(false);
  });

  it("shouldPauseOnConflict for all rules on detach", () => {
    for (const rule of HALF_PLUS_TRAIL_PRESET.rules) {
      expect(shouldPauseOnConflict({ kind: "detach" }, rule)).toBe(true);
    }
  });
});
