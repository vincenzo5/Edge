import { describe, expect, it } from "vitest";
import { buildFixedStopLeg } from "@/lib/trading/bracketPlan";
import {
  composeRiskPolicyView,
  ComposeRiskPolicyViewInputSchema,
} from "./composeRiskPolicyView";
import {
  SUBMIT_RISK_FAILURE_MODE_COPY,
  SUBMIT_RISK_GAP_GUIDANCE_COPY,
} from "./summarizeSubmitRiskPlan";

describe("composeRiskPolicyView", () => {
  it("returns slot-complete summary for bracket + manage preset fixture", () => {
    const view = composeRiskPolicyView({
      environment: "paper",
      side: "BUY",
      quantity: 100,
      dollarRisk: 1000,
      entry: 100,
      initialStop: 95,
      takeProfitPrice: 110,
      attachProtect: true,
      stopLeg: buildFixedStopLeg(95),
      managePresetId: "half_then_be",
    });

    expect(view.geometry).toEqual({
      direction: "long",
      entry: 100,
      initialStop: 95,
      takeProfitPrice: 110,
    });
    expect(view.measurement.rUnit).toBe(5);
    expect(view.measurement.plannedRiskDollars).toBe(500);
    expect(view.measurement.riskRewardRatio).toBe(2);
    expect(view.budget.label).toBe("$1,000");
    expect(view.sizing.label).toBe("100 sh · $500 planned");
    expect(view.protect.attached).toBe(true);
    expect(view.protect.label).toBe("STP 95.00 · TP 110.00");
    expect(view.manage.label).toBe("Half then BE");
    expect(view.failureMode).toBe(SUBMIT_RISK_FAILURE_MODE_COPY);
    expect(view.gapGuidance).toBe(SUBMIT_RISK_GAP_GUIDANCE_COPY);
    expect(view.warnings).toEqual([]);
    expect(view.gates.label).toContain("readiness");
  });

  it("reports Off protect and manage when protect not attached", () => {
    const view = composeRiskPolicyView({
      environment: "paper",
      side: "BUY",
      quantity: 50,
      dollarRisk: 500,
      entry: 200,
      initialStop: 195,
      attachProtect: false,
      managePresetId: "off",
    });

    expect(view.protect.label).toBe("Off");
    expect(view.manage.label).toBe("Off");
    expect(view.failureMode).toBeNull();
    expect(view.measurement.plannedRiskDollars).toBe(250);
  });

  it("warns on live without protect", () => {
    const view = composeRiskPolicyView({
      environment: "live",
      side: "SELL",
      quantity: 10,
      entry: 50,
      initialStop: 52,
      attachProtect: false,
      managePresetId: "break_even",
    });

    expect(view.geometry.direction).toBe("short");
    expect(view.warnings).toEqual(["live_unprotected"]);
    expect(view.manage.label).toBe("Break-even");
  });

  it("accepts optional bracketPlan override", () => {
    const view = composeRiskPolicyView({
      environment: "paper",
      side: "BUY",
      quantity: 200,
      dollarRisk: 1000,
      entry: 100,
      initialStop: 95,
      attachProtect: true,
      managePresetId: "break_even",
      bracketPlan: {
        entry: {
          accountId: "DUP586813",
          symbol: "AAPL",
          side: "BUY",
          quantity: 200,
          orderType: "MKT",
          environment: "paper",
          outsideRth: false,
          tif: "DAY",
        },
        stopLeg: buildFixedStopLeg(95),
        takeProfitPrice: 110,
      },
    });

    expect(view.protect.attached).toBe(true);
    expect(view.sizing.quantity).toBe(200);
  });

  it("validates input schema", () => {
    expect(() =>
      ComposeRiskPolicyViewInputSchema.parse({
        side: "BUY",
        quantity: -1,
        entry: 100,
        initialStop: 95,
      }),
    ).toThrow();
  });
});
