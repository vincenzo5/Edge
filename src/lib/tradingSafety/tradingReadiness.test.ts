import { describe, expect, it } from "vitest";
import { DEFAULT_RISK_SETTINGS } from "@/lib/risk/riskSettings";
import type { AccountSummary } from "@/lib/marketData/contracts/brokerage";
import { evaluateTradingReadiness } from "./tradingReadiness";

const summary: AccountSummary = {
  accountId: "DU123",
  tags: {
    NetLiquidation: { tag: "NetLiquidation", value: "100000", currency: "USD" },
  },
  updatedAt: Date.now(),
};

describe("tradingReadiness", () => {
  it("blocks when brokerage disconnected", () => {
    const result = evaluateTradingReadiness({
      brokerageConnected: false,
      accountSummary: null,
      riskSettings: DEFAULT_RISK_SETTINGS,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("Brokerage is not connected");
  });

  it("allows submit without a quote when account and risk are fine", () => {
    const now = Date.now();
    const result = evaluateTradingReadiness({
      brokerageConnected: true,
      accountSummary: summary,
      accountUpdatedAt: now,
      riskSettings: DEFAULT_RISK_SETTINGS,
      now,
    });
    expect(result.ok).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("blocks stale account snapshot", () => {
    const now = Date.now();
    const result = evaluateTradingReadiness({
      brokerageConnected: true,
      accountSummary: summary,
      accountUpdatedAt: now - 60_000,
      riskSettings: DEFAULT_RISK_SETTINGS,
      now,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => /Account snapshot/i.test(r))).toBe(true);
  });
});
