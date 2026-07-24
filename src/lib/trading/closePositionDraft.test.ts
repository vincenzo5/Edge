import { describe, expect, it } from "vitest";
import { buildClosePositionDraft, describeClosePositionAction } from "./closePositionDraft";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";

const basePosition: AccountPosition = {
  contract: { symbol: "AAPL", conId: 1 },
  position: 10,
  avgCost: 150,
};

const account = {
  accountId: "DU123",
  environment: "paper" as const,
};

describe("buildClosePositionDraft", () => {
  it("builds SELL MKT draft for long positions", () => {
    const draft = buildClosePositionDraft({ position: basePosition, account });
    expect(draft).toEqual({
      accountId: "DU123",
      symbol: "AAPL",
      side: "SELL",
      quantity: 10,
      orderType: "MKT",
      environment: "paper",
      outsideRth: false,
      tif: "DAY",
    });
  });

  it("builds BUY MKT draft for short positions", () => {
    const draft = buildClosePositionDraft({
      position: { ...basePosition, position: -5 },
      account,
    });
    expect(draft?.side).toBe("BUY");
    expect(draft?.quantity).toBe(5);
  });

  it("returns null for zero quantity", () => {
    expect(
      buildClosePositionDraft({
        position: { ...basePosition, position: 0 },
        account,
      }),
    ).toBeNull();
  });

  it("returns null without symbol", () => {
    expect(
      buildClosePositionDraft({
        position: { contract: { conId: 1 }, position: 10 },
        account,
      }),
    ).toBeNull();
  });

  it("describes close action", () => {
    const draft = buildClosePositionDraft({ position: basePosition, account });
    expect(draft && describeClosePositionAction(draft)).toBe("SELL 10 AAPL MKT");
  });
});
