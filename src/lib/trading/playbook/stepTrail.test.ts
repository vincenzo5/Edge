import { describe, expect, it } from "vitest";

import { planPlaybookSteps } from "./planSteps";
import { buildStepTrailPreset, buildStepTrailRules } from "./stepTrail";
import { lockPositionPlan, PlaybookTemplateSchema } from "./types";

describe("buildStepTrailRules", () => {
  it("starts with BE then locks one step behind each milestone", () => {
    const rules = buildStepTrailRules({ stepR: 0.25, maxR: 1 });
    expect(rules).toHaveLength(4);
    expect(rules.map((r) => r.when)).toEqual([
      { kind: "multipleOfR", multiple: 0.25 },
      { kind: "multipleOfR", multiple: 0.5 },
      { kind: "multipleOfR", multiple: 0.75 },
      { kind: "multipleOfR", multiple: 1 },
    ]);
    expect(rules[0]!.then).toEqual({ kind: "modifyStop", breakEven: true });
    expect(rules[1]!.then).toEqual({ kind: "modifyStop", stopRMultiple: 0.25 });
    expect(rules[2]!.then).toEqual({ kind: "modifyStop", stopRMultiple: 0.5 });
    expect(rules[3]!.then).toEqual({ kind: "modifyStop", stopRMultiple: 0.75 });
  });
});

describe("buildStepTrailPreset", () => {
  it("parses and plans stop prices from R multiples", () => {
    const preset = buildStepTrailPreset({
      id: "step_trail_025",
      name: "Step trail 0.25R",
      stepR: 0.25,
      maxR: 0.5,
    });
    expect(PlaybookTemplateSchema.safeParse(preset).success).toBe(true);

    const plan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "BUY",
      entry: 100,
      initialStop: 96,
      qty: 10,
      environment: "paper",
    });
    // rUnit = 4
    const steps = planPlaybookSteps(preset, plan);
    expect(steps[0]!.stopPrice).toBe(100);
    expect(steps[1]!.stopPrice).toBe(101); // +0.25R
  });
});
