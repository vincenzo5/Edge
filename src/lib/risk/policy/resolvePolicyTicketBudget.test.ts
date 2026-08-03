import { describe, expect, it } from "vitest";
import { DEFAULT_RISK_SETTINGS } from "@/lib/risk/riskSettings";
import { resolvePolicyTicketBudget } from "./resolvePolicyTicketBudget";

describe("resolvePolicyTicketBudget", () => {
  it("uses policy percentNetLiq over session settings", () => {
    expect(
      resolvePolicyTicketBudget({
        budget: { kind: "percentNetLiq", value: 10 },
        sessionSettings: { ...DEFAULT_RISK_SETTINGS, sizingMode: "percent", riskPercent: 3.25 },
        accountBasisValue: 100_000,
      }),
    ).toEqual({
      unit: "percent",
      riskPercent: 10,
      absoluteRisk: 10_000,
      dollarRisk: 10_000,
    });
  });

  it("uses policy dollar budget", () => {
    expect(
      resolvePolicyTicketBudget({
        budget: { kind: "dollar", value: 500 },
        sessionSettings: DEFAULT_RISK_SETTINGS,
        accountBasisValue: 100_000,
      }),
    ).toEqual({
      unit: "absolute",
      riskPercent: null,
      absoluteRisk: 500,
      dollarRisk: 500,
    });
  });

  it("inherits session percent mode", () => {
    expect(
      resolvePolicyTicketBudget({
        budget: { kind: "inherits" },
        sessionSettings: { ...DEFAULT_RISK_SETTINGS, sizingMode: "percent", riskPercent: 2 },
        accountBasisValue: 50_000,
      }),
    ).toEqual({
      unit: "percent",
      riskPercent: 2,
      absoluteRisk: 1_000,
      dollarRisk: 1_000,
    });
  });

  it("inherits session absolute mode", () => {
    expect(
      resolvePolicyTicketBudget({
        budget: undefined,
        sessionSettings: { ...DEFAULT_RISK_SETTINGS, sizingMode: "absolute", absoluteRisk: 750 },
        accountBasisValue: null,
        sessionDollarRisk: 750,
      }),
    ).toEqual({
      unit: "absolute",
      riskPercent: null,
      absoluteRisk: 750,
      dollarRisk: 750,
    });
  });

  it("returns null dollar risk when percent policy lacks NetLiq", () => {
    expect(
      resolvePolicyTicketBudget({
        budget: { kind: "percentNetLiq", value: 10 },
        sessionSettings: DEFAULT_RISK_SETTINGS,
        accountBasisValue: null,
      }).dollarRisk,
    ).toBeNull();
  });
});
