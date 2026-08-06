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
    ).toEqual(
      expect.objectContaining({
        entryQty: 200,
        takeProfitQuantity: 100,
        stopQuantity: 200,
        takeProfitPrice: 105,
        stopLossPrice: 95,
        manageTemplateId: "user_long",
        takeProfitEnabled: true,
        stopLossEnabled: true,
        partialGeometry: false,
        orderType: "MKT",
        tif: "DAY",
      }),
    );
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

  it("reshapes bound drawing target from policy geometry on apply", () => {
    const patch = applyPolicyToTradeDraft({
      template: longPolicy,
      entryQty: 200,
      side: "BUY",
      planLevels: {
        direction: "long",
        side: "BUY",
        entry: 100,
        stop: 95,
        target: 110,
        riskRewardRatio: 2,
      },
    });
    expect(patch.takeProfitPrice).toBe(105);
    expect(patch.stopLossPrice).toBe(95);
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

  it("leaves take profit disabled for targetless step-trail policy", () => {
    const patch = applyPolicyToTradeDraft({
      template: {
        ...longPolicy,
        id: "step_trail_025",
        name: "Step trail 0.25R",
        geometry: { stops: [{ rMultiple: 1 }] },
      },
      entryQty: 10,
      side: "BUY",
      entryPrice: 100,
      existingStop: 95,
    });
    expect(patch.takeProfitEnabled).toBe(false);
    expect(patch.takeProfitPrice).toBeNull();
    expect(patch.stopLossEnabled).toBe(true);
  });

  it("seeds default entry order recipe from template", () => {
    const patch = applyPolicyToTradeDraft({
      template: {
        ...longPolicy,
        defaultEntryOrder: {
          orderType: "STP",
          stopPrice: 98,
          tif: "GTC",
          outsideRth: true,
          allOrNone: false,
          usePriceMgmtAlgo: false,
        },
      },
      entryQty: 10,
      side: "BUY",
      entryPrice: 100,
      existingStop: 95,
    });
    expect(patch.orderType).toBe("STP");
    expect(patch.stopPrice).toBe(98);
    expect(patch.tif).toBe("GTC");
    expect(patch.outsideRth).toBe(true);
  });
});
