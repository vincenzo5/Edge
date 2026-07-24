import { describe, expect, it } from "vitest";
import type { AccountSummary } from "@/lib/marketData/contracts/brokerage";
import {
  DEFAULT_RISK_SETTINGS,
  parseRiskSettings,
  resolveAccountBasisValue,
  resolveDollarRisk,
  toRiskAccount,
  type RiskSettings,
} from "./riskSettings";

function accountSummary(
  tags: Record<string, { tag: string; value: string }>,
): AccountSummary {
  return { tags, updatedAt: Date.now() };
}

const FULL_ACCOUNT = accountSummary({
  NetLiquidation: { tag: "NetLiquidation", value: "100000" },
  AvailableFunds: { tag: "AvailableFunds", value: "40000" },
  EquityWithLoanValue: { tag: "EquityWithLoanValue", value: "95000" },
});

describe("resolveAccountBasisValue", () => {
  it("returns NetLiquidation from account tags", () => {
    expect(resolveAccountBasisValue(FULL_ACCOUNT)).toBe(100_000);
  });

  it("ignores AvailableFunds and EquityWithLoanValue", () => {
    expect(resolveAccountBasisValue(FULL_ACCOUNT)).not.toBe(40_000);
    expect(resolveAccountBasisValue(FULL_ACCOUNT)).not.toBe(95_000);
  });

  it("returns null when account is missing", () => {
    expect(resolveAccountBasisValue(null)).toBeNull();
  });

  it("returns null when NetLiquidation tag is missing", () => {
    expect(
      resolveAccountBasisValue(
        accountSummary({
          AvailableFunds: { tag: "AvailableFunds", value: "40000" },
        }),
      ),
    ).toBeNull();
  });
});

describe("resolveDollarRisk", () => {
  it("computes percent of NetLiquidation", () => {
    const settings: RiskSettings = {
      ...DEFAULT_RISK_SETTINGS,
      sizingMode: "percent",
    };
    expect(resolveDollarRisk(settings, FULL_ACCOUNT)).toBe(1_000);
  });

  it("returns absoluteRisk in absolute mode", () => {
    const settings: RiskSettings = {
      ...DEFAULT_RISK_SETTINGS,
      sizingMode: "absolute",
      absoluteRisk: 2_500,
    };
    expect(resolveDollarRisk(settings, FULL_ACCOUNT)).toBe(2_500);
    expect(resolveDollarRisk(settings, null)).toBe(2_500);
  });

  it("returns null when account missing in percent mode", () => {
    const settings: RiskSettings = {
      ...DEFAULT_RISK_SETTINGS,
      sizingMode: "percent",
    };
    expect(resolveDollarRisk(settings, null)).toBeNull();
  });

  it("returns null when NetLiquidation tag is missing", () => {
    const settings: RiskSettings = {
      ...DEFAULT_RISK_SETTINGS,
      sizingMode: "percent",
    };
    expect(resolveDollarRisk(settings, accountSummary({}))).toBeNull();
  });

  it("handles riskPercent at 100%", () => {
    expect(
      resolveDollarRisk(
        { ...DEFAULT_RISK_SETTINGS, sizingMode: "percent", riskPercent: 100 },
        FULL_ACCOUNT,
      ),
    ).toBe(100_000);
  });
});

describe("toRiskAccount", () => {
  it("uses NetLiquidation capital when available", () => {
    expect(toRiskAccount(DEFAULT_RISK_SETTINGS, FULL_ACCOUNT)).toEqual({
      capital: 100_000,
      riskPercent: 1,
    });
  });

  it("returns zero capital when NetLiquidation unavailable", () => {
    expect(toRiskAccount(DEFAULT_RISK_SETTINGS, null)).toEqual({
      capital: 0,
      riskPercent: 1,
    });
  });
});

describe("parseRiskSettings", () => {
  it("returns defaults for malformed payload", () => {
    expect(parseRiskSettings(null)).toEqual(DEFAULT_RISK_SETTINGS);
    expect(parseRiskSettings({ bad: true })).toEqual(DEFAULT_RISK_SETTINGS);
  });

  it("parses valid stored settings", () => {
    const stored = {
      sizingMode: "absolute" as const,
      riskPercent: 2,
      absoluteRisk: 500,
    };
    expect(parseRiskSettings(stored)).toEqual({
      ...stored,
      showLiquidationLine: true,
    });
  });

  it("strips legacy accountBasis and manualCapital", () => {
    expect(
      parseRiskSettings({
        sizingMode: "percent",
        riskPercent: 2,
        absoluteRisk: 500,
        accountBasis: "AvailableFunds",
        manualCapital: 75_000,
      }),
    ).toEqual({
      sizingMode: "percent",
      riskPercent: 2,
      absoluteRisk: 500,
      showLiquidationLine: true,
    });
  });

  it("rejects invalid riskPercent", () => {
    expect(
      parseRiskSettings({ ...DEFAULT_RISK_SETTINGS, riskPercent: 0 }),
    ).toEqual(DEFAULT_RISK_SETTINGS);
  });
});
