import { describe, expect, it } from "vitest";

import { stepTrailStopR } from "./policyCatalog";
import { simulatePolicy } from "./simulatePolicy";

describe("simulatePolicy", () => {
  it("fixed 1R takes profit at +1R", () => {
    const result = simulatePolicy([0.2, 0.6, 1.05, 0.5], "fixed_1r");
    expect(result.realizedR).toBe(1);
    expect(result.exitReason).toBe("TP 1R");
  });

  it("step trail 0.5R moves to BE then locks +0.5R", () => {
    expect(simulatePolicy([0.4, 0.5, 0.2, -0.1], "step_trail_05").realizedR).toBe(0);
    expect(simulatePolicy([0.6, 1.0, 0.7, 0.4], "step_trail_05").realizedR).toBe(0.5);
    expect(simulatePolicy([0.3, 0.2, -1], "step_trail_05").realizedR).toBe(-1);
  });

  it("step trail 0.25R arms BE at first quarter R", () => {
    expect(simulatePolicy([0.2, 0.25, 0.1, 0], "step_trail_025").realizedR).toBe(0);
  });

  it("continuous trail tight arms after +1R", () => {
    const result = simulatePolicy([0.5, 1.2, 1.8, 1.0], "full_trail_tight");
    expect(result.realizedR).toBeGreaterThan(0.5);
  });

  it("half_be scales half at 1R and remainder exits at BE", () => {
    const result = simulatePolicy([0.8, 1.1, 0.2, -0.5], "half_be");
    expect(result.realizedR).toBeCloseTo(0.5, 2);
  });
});

describe("stepTrailStopR", () => {
  it("matches buildStepTrailRules milestone math", () => {
    expect(stepTrailStopR(0.24, 0.25)).toBe(-1);
    expect(stepTrailStopR(0.25, 0.25)).toBe(0);
    expect(stepTrailStopR(0.5, 0.25)).toBe(0.25);
    expect(stepTrailStopR(1.0, 0.5)).toBe(0.5);
    expect(stepTrailStopR(2.0, 1)).toBe(1);
  });
});
