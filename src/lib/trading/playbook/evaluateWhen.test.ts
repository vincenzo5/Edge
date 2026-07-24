import { describe, expect, it } from "vitest";

import { BREAK_EVEN_PRESET, HALF_THEN_BE_PRESET } from "./presets";
import { evaluatePlaybookWhen, ruleRequirementsMet } from "./evaluateWhen";
import { lockPositionPlan } from "./types";

const longPlan = lockPositionPlan({
  symbol: "AAPL",
  accountId: "DUP586813",
  side: "BUY",
  entry: 100,
  initialStop: 95,
  qty: 100,
  environment: "paper",
  lockedAt: "2026-07-24T18:00:00.000Z",
});

describe("evaluatePlaybookWhen", () => {
  it("fires multipleOfR when price reaches trigger", () => {
    const rule = BREAK_EVEN_PRESET.rules[0]!;
    expect(
      evaluatePlaybookWhen(rule.when, longPlan, {
        lastPrice: 104.9,
        ruleRuntimes: [],
      }),
    ).toBe(false);
    expect(
      evaluatePlaybookWhen(rule.when, longPlan, {
        lastPrice: 105,
        ruleRuntimes: [],
      }),
    ).toBe(true);
  });

  it("fires scaleFill when referenced rule is fired", () => {
    const scaleRule = HALF_THEN_BE_PRESET.rules[0]!;
    const beRule = HALF_THEN_BE_PRESET.rules[1]!;
    expect(
      evaluatePlaybookWhen(beRule.when, longPlan, {
        lastPrice: 110,
        ruleRuntimes: [{ ruleId: scaleRule.id, status: "pending" }],
      }),
    ).toBe(false);
    expect(
      evaluatePlaybookWhen(beRule.when, longPlan, {
        lastPrice: 110,
        ruleRuntimes: [{ ruleId: scaleRule.id, status: "fired", firedAt: "2026-07-24T18:01:00.000Z" }],
      }),
    ).toBe(true);
  });
});

describe("ruleRequirementsMet", () => {
  it("requires referenced rules to be fired", () => {
    const beRule = HALF_THEN_BE_PRESET.rules[1]!;
    expect(
      ruleRequirementsMet(beRule, [{ ruleId: "scale-half-1r", status: "pending" }]),
    ).toBe(false);
    expect(
      ruleRequirementsMet(beRule, [{ ruleId: "scale-half-1r", status: "fired" }]),
    ).toBe(true);
  });
});
