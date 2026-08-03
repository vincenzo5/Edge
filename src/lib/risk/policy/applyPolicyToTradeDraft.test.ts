import { describe, expect, it } from "vitest";
import { applyPolicyToTradeDraft } from "./applyPolicyToTradeDraft";
import { HALF_THEN_BE_PRESET } from "@/lib/trading/playbook/presets";

describe("applyPolicyToTradeDraft", () => {
  const longPolicy: typeof HALF_THEN_BE_PRESET = {
    ...HALF_THEN_BE_PRESET,
    id: "user_long",
    name: "Long half → BE → 0.5R trail",
    geometry: {
      stops: [{ rMultiple: 1 }],
      targets: [{ rMultiple: 1 }],
    },
  };

  it("seeds half TP qty and full stop qty with geometry", () => {
    expect(
      applyPolicyToTradeDraft({
        template: longPolicy,
        entryQty: 200,
        side: "BUY",
        entryPrice: 100,
        existingStop: 95,
        dollarRisk: 1000,
      }),
    ).toEqual({
      entryQty: 200,
      takeProfitQuantity: 100,
      stopQuantity: 200,
      takeProfitPrice: 105,
      stopLossPrice: 95,
      manageTemplateId: "user_long",
      takeProfitEnabled: true,
      stopLossEnabled: true,
      partialGeometry: false,
    });
  });

  it("sizes entry qty from dollar risk and stop distance", () => {
    const patch = applyPolicyToTradeDraft({
      template: longPolicy,
      entryQty: 1,
      side: "BUY",
      planLevels: {
        direction: "long",
        side: "BUY",
        entry: 100,
        stop: 95,
        target: 105,
        riskRewardRatio: 1,
      },
      dollarRisk: 1000,
    });
    expect(patch.entryQty).toBe(200);
    expect(patch.takeProfitQuantity).toBe(100);
    expect(patch.stopQuantity).toBe(200);
  });

  it("seeds qty split only when geometry cannot be resolved", () => {
    const patch = applyPolicyToTradeDraft({
      template: longPolicy,
      entryQty: 200,
      side: "BUY",
    });
    expect(patch.takeProfitQuantity).toBe(100);
    expect(patch.stopQuantity).toBe(200);
    expect(patch.takeProfitPrice).toBeNull();
    expect(patch.stopLossPrice).toBeNull();
    expect(patch.partialGeometry).toBe(true);
  });
});
