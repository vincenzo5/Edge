import { describe, expect, it } from "vitest";
import { buildFixedStopLeg, buildTrailStopLeg } from "@/lib/trading/bracketPlan";
import {
  formatProtectLabel,
  formatProtectStopLegLabel,
  submitRiskWarningLabel,
  summarizeSubmitRiskPlan,
  summarizeSubmitRiskPlanFromBracket,
  SUBMIT_RISK_FAILURE_MODE_COPY,
  SUBMIT_RISK_GAP_GUIDANCE_COPY,
} from "./summarizeSubmitRiskPlan";
import { evaluateAccountRiskGates } from "./accountRiskGates";
import { DEFAULT_RISK_SETTINGS } from "./riskSettings";

describe("summarizeSubmitRiskPlan", () => {
  it("reports Off protect and manage when not attached", () => {
    const summary = summarizeSubmitRiskPlan({
      environment: "paper",
      quantity: 100,
      dollarRisk: 1000,
      plannedRiskDollars: 500,
      protectAttached: false,
      stopLeg: null,
      takeProfitPrice: null,
      managePresetId: "off",
    });

    expect(summary.budget.label).toBe("$1,000");
    expect(summary.size.label).toBe("100 sh · $500 planned");
    expect(summary.protect.label).toBe("Off");
    expect(summary.manage.label).toBe("Off");
    expect(summary.failureMode).toBeNull();
    expect(summary.warnings).toEqual([]);
  });

  it("shows protect + manage + failure mode when bracket attached", () => {
    const summary = summarizeSubmitRiskPlan({
      environment: "paper",
      quantity: 50,
      dollarRisk: 500,
      plannedRiskDollars: 250,
      protectAttached: true,
      stopLeg: buildFixedStopLeg(95),
      takeProfitPrice: 110,
      managePresetId: "break_even",
    });

    expect(summary.protect.label).toBe("STP 95.00 · TP 110.00");
    expect(summary.manage.label).toBe("Break-even");
    expect(summary.failureMode).toBe(SUBMIT_RISK_FAILURE_MODE_COPY);
    expect(summary.gapGuidance).toBe(SUBMIT_RISK_GAP_GUIDANCE_COPY);
    expect(summary.warnings).toEqual([]);
  });

  it("warns on live without protect but does not block via summary", () => {
    const summary = summarizeSubmitRiskPlan({
      environment: "live",
      quantity: 10,
      dollarRisk: 250,
      plannedRiskDollars: null,
      protectAttached: false,
      stopLeg: null,
      takeProfitPrice: null,
      managePresetId: "off",
    });

    expect(summary.warnings).toEqual(["live_unprotected"]);
    expect(submitRiskWarningLabel(summary.warnings[0]!)).toContain("without Bracket");
    expect(summary.failureMode).toBeNull();
    expect(summary.gapGuidance).toBeNull();
  });

  it("formats trail stop legs", () => {
    expect(formatProtectStopLegLabel(buildTrailStopLeg({ trailAmount: 2.5 }))).toBe(
      "TRAIL $2.5",
    );
    expect(formatProtectStopLegLabel(buildTrailStopLeg({ trailPercent: 3 }))).toBe(
      "TRAIL 3%",
    );
    expect(formatProtectStopLegLabel(buildTrailStopLeg({ trailRMultiple: 0.5 }))).toBe(
      "TRAIL 0.5R",
    );
    expect(
      formatProtectLabel({
        attached: true,
        stopLeg: buildTrailStopLeg({ trailPercent: 2 }),
        takeProfitPrice: 120,
      }),
    ).toBe("TRAIL 2% · TP 120.00");
  });

  it("derives from bracket plan when attach is enabled", () => {
    const summary = summarizeSubmitRiskPlanFromBracket({
      environment: "paper",
      quantity: 200,
      dollarRisk: 1000,
      plannedRiskDollars: 500,
      attachProtect: true,
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
      managePresetId: "half_then_be",
    });

    expect(summary.size.quantity).toBe(200);
    expect(summary.protect.attached).toBe(true);
    expect(summary.manage.label).toBe("Half then BE");
    expect(summary.failureMode).toBe(SUBMIT_RISK_FAILURE_MODE_COPY);
  });

  it("warns when next entry would breach open heat cap", () => {
    const status = evaluateAccountRiskGates({
      settings: { ...DEFAULT_RISK_SETTINGS, openHeatCapPercent: 5 },
      netLiquidation: 100_000,
      dailyPnL: 0,
      openHeatDollars: 4_000,
    });
    const summary = summarizeSubmitRiskPlan({
      environment: "paper",
      quantity: 100,
      dollarRisk: 1000,
      plannedRiskDollars: 2000,
      protectAttached: false,
      stopLeg: null,
      takeProfitPrice: null,
      managePresetId: "off",
      accountGates: status,
      side: "BUY",
    });
    expect(summary.warnings).toContain("account_heat_would_breach");
  });
});
