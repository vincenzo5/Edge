import { describe, expect, it } from "vitest";
import { assertCoveredSell, pdtWarnings } from "./safetyGuards";
import { TradingValidationError } from "./validateOrder";
import type { AccountPosition, AccountSummary } from "@/lib/marketData/contracts/brokerage";

const baseDraft = {
  accountId: "DUP586813",
  symbol: "F",
  side: "SELL" as const,
  quantity: 1,
  orderType: "MKT" as const,
  tif: "DAY" as const,
  outsideRth: false,
  environment: "paper" as const,
};

describe("safetyGuards", () => {
  it("allows covered sell when position covers quantity", () => {
    const positions: AccountPosition[] = [
      {
        contract: { symbol: "F", secType: "STK" },
        position: 5,
      },
    ];
    expect(() => assertCoveredSell(baseDraft, positions)).not.toThrow();
  });

  it("blocks uncovered short when flat", () => {
    expect(() => assertCoveredSell(baseDraft, [])).toThrow(TradingValidationError);
  });

  it("blocks sell exceeding long position", () => {
    const positions: AccountPosition[] = [
      {
        contract: { symbol: "F", secType: "STK" },
        position: 1,
      },
    ];
    expect(() =>
      assertCoveredSell({ ...baseDraft, quantity: 2 }, positions),
    ).toThrow(/exceeds long position/);
  });

  it("ignores BUY side", () => {
    expect(() =>
      assertCoveredSell({ ...baseDraft, side: "BUY" }, []),
    ).not.toThrow();
  });

  it("warns when DayTradesRemaining is zero", () => {
    const summary: AccountSummary = {
      accountId: "DUP586813",
      tags: {
        DayTradesRemaining: { tag: "DayTradesRemaining", value: "0", currency: "" },
      },
      updatedAt: Date.now(),
    };
    expect(pdtWarnings(summary)).toHaveLength(1);
    expect(pdtWarnings(summary)[0]).toMatch(/DayTradesRemaining/);
  });

  it("returns no warning when day trades remain", () => {
    const summary: AccountSummary = {
      accountId: "DUP586813",
      tags: {
        DayTradesRemaining: { tag: "DayTradesRemaining", value: "3", currency: "" },
      },
      updatedAt: Date.now(),
    };
    expect(pdtWarnings(summary)).toHaveLength(0);
  });
});
