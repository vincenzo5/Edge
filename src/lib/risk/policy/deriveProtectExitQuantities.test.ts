import { describe, expect, it } from "vitest";
import { deriveProtectExitQuantities } from "./deriveProtectExitQuantities";
import { HALF_THEN_BE_PRESET } from "@/lib/trading/playbook/presets";

describe("deriveProtectExitQuantities", () => {
  it("defaults both legs to full entry qty when no scale rule", () => {
    expect(deriveProtectExitQuantities(null, 200)).toEqual({
      takeProfitQuantity: 200,
      stopQuantity: 200,
      runnerQuantity: 0,
      restingScaleRuleId: null,
    });
  });

  it("derives half TP for Long half policy at 200 shares", () => {
    const longPolicy: typeof HALF_THEN_BE_PRESET = {
      ...HALF_THEN_BE_PRESET,
      id: "user_long",
      name: "Long half → BE → 0.5R trail",
    };
    expect(deriveProtectExitQuantities(longPolicy, 200)).toEqual({
      takeProfitQuantity: 100,
      stopQuantity: 200,
      runnerQuantity: 100,
      restingScaleRuleId: "scale-half-1r",
    });
  });

  it("rejects invalid fractions", () => {
    const template = {
      id: "bad",
      name: "bad",
      rules: [
        {
          id: "scale-all",
          when: { kind: "multipleOfR" as const, multiple: 1 },
          then: { kind: "reduceQty" as const, fraction: 1 },
        },
      ],
    };
    expect(deriveProtectExitQuantities(template, 100).takeProfitQuantity).toBe(100);
  });
});
