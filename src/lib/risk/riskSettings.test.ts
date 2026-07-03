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
    expect(
      resolveAccountBasisValue(
        { ...DEFAULT_RISK_SETTINGS, accountBasis: "NetLiquidation" },
        FULL_ACCOUNT,
      ),
    ).toBe(100_000);
  });

  it("returns AvailableFunds from account tags", () => {
    expect(
      resolveAccountBasisValue(
        { ...DEFAULT_RISK_SETTINGS, accountBasis: "AvailableFunds" },
        FULL_ACCOUNT,
      ),
    ).toBe(40_000);
  });

  it("returns EquityWithLoanValue from account tags", () => {
    expect(
      resolveAccountBasisValue(
        { ...DEFAULT_RISK_SETTINGS, accountBasis: "EquityWithLoanValue" },
        FULL_ACCOUNT,
      ),
    ).toBe(95_000);
  });

  it("returns manualCapital when basis is Manual", () => {
    expect(
      resolveAccountBasisValue(
        { ...DEFAULT_RISK_SETTINGS, accountBasis: "Manual", manualCapital: 75_000 },
        null,
      ),
    ).toBe(75_000);
  });

  it("returns null when account is missing for live basis", () => {
    expect(
      resolveAccountBasisValue(
        { ...DEFAULT_RISK_SETTINGS, accountBasis: "NetLiquidation" },
        null,
      ),
    ).toBeNull();
  });

  it("returns null when manualCapital is zero", () => {
    expect(
      resolveAccountBasisValue(
        { ...DEFAULT_RISK_SETTINGS, accountBasis: "Manual", manualCapital: 0 },
        null,
      ),
    ).toBeNull();
  });
});

describe("resolveDollarRisk", () => {
  it("computes percent of NetLiquidation", () => {
    expect(resolveDollarRisk(DEFAULT_RISK_SETTINGS, FULL_ACCOUNT)).toBe(1_000);
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
    expect(resolveDollarRisk(DEFAULT_RISK_SETTINGS, null)).toBeNull();
  });

  it("returns null when basis tag is missing", () => {
    expect(
      resolveDollarRisk(DEFAULT_RISK_SETTINGS, accountSummary({})),
    ).toBeNull();
  });

  it("handles riskPercent at 100%", () => {
    expect(
      resolveDollarRisk(
        { ...DEFAULT_RISK_SETTINGS, riskPercent: 100 },
        FULL_ACCOUNT,
      ),
    ).toBe(100_000);
  });
});

describe("toRiskAccount", () => {
  it("uses live basis capital when available", () => {
    expect(toRiskAccount(DEFAULT_RISK_SETTINGS, FULL_ACCOUNT)).toEqual({
      capital: 100_000,
      riskPercent: 1,
    });
  });

  it("falls back to manualCapital when basis unavailable", () => {
    expect(toRiskAccount(DEFAULT_RISK_SETTINGS, null)).toEqual({
      capital: 50_000,
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
      accountBasis: "AvailableFunds" as const,
      manualCapital: 10_000,
    };
    expect(parseRiskSettings(stored)).toEqual(stored);
  });

  it("rejects invalid riskPercent", () => {
    expect(
      parseRiskSettings({ ...DEFAULT_RISK_SETTINGS, riskPercent: 0 }),
    ).toEqual(DEFAULT_RISK_SETTINGS);
  });
});
