import { describe, expect, it } from "vitest";
import { HALF_THEN_BE_PRESET } from "./presets";
import {
  reconcileRestingScaleFromTpFill,
  resolveRestingScaleRuleId,
  shouldSkipReduceQtyForRestingTp,
} from "./restingScaleTp";
import { lockPositionPlan } from "./types";

describe("restingScaleTp", () => {
  const instance = {
    id: "inst-1",
    templateId: HALF_THEN_BE_PRESET.id,
    positionPlan: lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "BUY",
      entry: 100,
      initialStop: 95,
      qty: 200,
      environment: "paper",
    }),
    status: "armed" as const,
    ruleRuntimes: [{ ruleId: "scale-half-1r", status: "pending" as const }],
    takeProfitOrderId: 42,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("maps half policy to scale rule id", () => {
    expect(resolveRestingScaleRuleId(instance, HALF_THEN_BE_PRESET)).toBe("scale-half-1r");
  });

  it("skips reduceQty when resting TP covers scale", () => {
    expect(
      shouldSkipReduceQtyForRestingTp({
        rule: HALF_THEN_BE_PRESET.rules[0]!,
        instance,
        template: HALF_THEN_BE_PRESET,
      }),
    ).toBe(true);
  });

  it("marks scale fired when TP order fills", () => {
    const result = reconcileRestingScaleFromTpFill({
      instance,
      orders: [{ orderId: 42, status: "Filled", totalQuantity: 100, symbol: "AAPL" }],
      template: HALF_THEN_BE_PRESET,
    });
    expect(result).toEqual({ ruleId: "scale-half-1r", filledQty: 100 });
  });
});
