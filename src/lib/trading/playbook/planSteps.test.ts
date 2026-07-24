import { describe, expect, it } from "vitest";

import { PLAYBOOK_PRESET_LIST } from "./presets";
import { planPlaybookSteps } from "./planSteps";
import { lockPositionPlan } from "./types";

const longPlan = lockPositionPlan({
  symbol: "AAPL",
  accountId: "DUP586813",
  side: "BUY",
  entry: 100,
  initialStop: 95,
  qty: 99,
  environment: "paper",
  lockedAt: "2026-07-24T18:00:00.000Z",
});

describe("planPlaybookSteps", () => {
  it("plans finite steps for every preset", () => {
    for (const preset of PLAYBOOK_PRESET_LIST) {
      const steps = planPlaybookSteps(preset, longPlan);
      expect(steps.length, preset.id).toBeGreaterThan(0);
      expect(steps.length, preset.id).toBe(preset.rules.length);
    }
  });

  it("computes +1R trigger and break-even stop for break_even", () => {
    const preset = PLAYBOOK_PRESET_LIST.find((p) => p.id === "break_even")!;
    const [step] = planPlaybookSteps(preset, longPlan);
    expect(step?.triggerPrice).toBe(105);
    expect(step?.stopPrice).toBe(100);
    expect(step?.then).toEqual({ kind: "modifyStop", breakEven: true });
  });

  it("computes reduce qty from fraction", () => {
    const preset = PLAYBOOK_PRESET_LIST.find((p) => p.id === "half_then_be")!;
    const steps = planPlaybookSteps(preset, longPlan);
    const scaleStep = steps.find((step) => step.ruleId === "scale-half-1r");
    expect(scaleStep?.reduceQty).toBe(49);
    expect(scaleStep?.triggerPrice).toBe(105);
  });

  it("plans scale_3x with 1R/2R triggers and runner trail", () => {
    const preset = PLAYBOOK_PRESET_LIST.find((p) => p.id === "scale_3x")!;
    const steps = planPlaybookSteps(preset, longPlan);
    expect(steps.find((s) => s.ruleId === "scale-third-1r")?.triggerPrice).toBe(105);
    expect(steps.find((s) => s.ruleId === "scale-third-2r")?.triggerPrice).toBe(110);
    expect(steps.find((s) => s.ruleId === "trail-runner")?.then.kind).toBe("attachTrail");
  });

  it("plans short geometry correctly", () => {
    const shortPlan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "SELL",
      entry: 100,
      initialStop: 105,
      qty: 100,
      environment: "paper",
      lockedAt: "2026-07-24T18:00:00.000Z",
    });
    const preset = PLAYBOOK_PRESET_LIST.find((p) => p.id === "break_even")!;
    const [step] = planPlaybookSteps(preset, shortPlan);
    expect(step?.triggerPrice).toBe(95);
    expect(step?.stopPrice).toBe(100);
  });

  it("includes session flatten step without trigger price", () => {
    const preset = PLAYBOOK_PRESET_LIST.find((p) => p.id === "daytrade_flatten")!;
    const flattenStep = planPlaybookSteps(preset, longPlan).find(
      (step) => step.ruleId === "session-flatten",
    );
    expect(flattenStep?.when.kind).toBe("sessionFlatten");
    expect(flattenStep?.triggerPrice).toBeUndefined();
    expect(flattenStep?.then.kind).toBe("flatten");
  });

  it("sorts steps by rule priority", () => {
    const preset = PLAYBOOK_PRESET_LIST.find((p) => p.id === "scale_3x")!;
    const steps = planPlaybookSteps(preset, longPlan);
    const priorities = steps.map((step) => {
      const rule = preset.rules.find((r) => r.id === step.ruleId);
      return rule?.priority ?? Number.MAX_SAFE_INTEGER;
    });
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
  });
});
