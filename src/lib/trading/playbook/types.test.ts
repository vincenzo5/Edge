import { describe, expect, it } from "vitest";

import {
  createPlaybookInstance,
  lockPositionPlan,
  PlaybookInstanceSchema,
  PlaybookRuleSchema,
  PlaybookTemplateSchema,
  PositionPlanSchema,
  priceAtMultipleOfR,
} from "./types";
import { BREAK_EVEN_PRESET } from "./presets";

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

describe("PositionPlanSchema", () => {
  it("accepts a valid long plan with locked R", () => {
    const parsed = PositionPlanSchema.safeParse(longPlan);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.rUnit).toBe(5);
  });

  it("rejects mismatched rUnit", () => {
    const parsed = PositionPlanSchema.safeParse({ ...longPlan, rUnit: 4 });
    expect(parsed.success).toBe(false);
  });

  it("rejects long stop above entry", () => {
    const parsed = PositionPlanSchema.safeParse({
      ...longPlan,
      initialStop: 101,
      rUnit: 1,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("priceAtMultipleOfR", () => {
  it("computes long trigger at +1R", () => {
    expect(priceAtMultipleOfR(longPlan, 1)).toBe(105);
    expect(priceAtMultipleOfR(longPlan, 2)).toBe(110);
  });

  it("computes short trigger at +1R", () => {
    const shortPlan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "SELL",
      entry: 100,
      initialStop: 105,
      qty: 50,
      environment: "paper",
      lockedAt: "2026-07-24T18:00:00.000Z",
    });
    expect(priceAtMultipleOfR(shortPlan, 1)).toBe(95);
  });
});

describe("PlaybookRuleSchema", () => {
  it("accepts break-even modifyStop", () => {
    const parsed = PlaybookRuleSchema.safeParse(BREAK_EVEN_PRESET.rules[0]);
    expect(parsed.success).toBe(true);
  });

  it("rejects modifyStop without stopPrice or breakEven", () => {
    const parsed = PlaybookRuleSchema.safeParse({
      id: "bad",
      when: { kind: "multipleOfR", multiple: 1 },
      then: { kind: "modifyStop" },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects attachTrail with fixed stop leg", () => {
    const parsed = PlaybookRuleSchema.safeParse({
      id: "bad-trail",
      when: { kind: "multipleOfR", multiple: 1 },
      then: { kind: "attachTrail", stopLeg: { mode: "fixed", stopPrice: 95 } },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("PlaybookTemplateSchema", () => {
  it("accepts preset templates", () => {
    const parsed = PlaybookTemplateSchema.safeParse(BREAK_EVEN_PRESET);
    expect(parsed.success).toBe(true);
  });
});

describe("PlaybookInstanceSchema", () => {
  it("creates instance with pending rule runtimes", () => {
    const instance = createPlaybookInstance({
      id: "inst-1",
      template: BREAK_EVEN_PRESET,
      positionPlan: longPlan,
    });
    const parsed = PlaybookInstanceSchema.safeParse(instance);
    expect(parsed.success).toBe(true);
    expect(instance.ruleRuntimes).toHaveLength(1);
    expect(instance.ruleRuntimes[0]?.status).toBe("pending");
    expect(instance.status).toBe("pending_fill");
  });
});
