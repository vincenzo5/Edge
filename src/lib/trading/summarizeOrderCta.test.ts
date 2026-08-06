import { describe, expect, it } from "vitest";
import { summarizeOrderCtaLabel } from "./summarizeOrderCta";

describe("summarizeOrderCta", () => {
  it("summarizes market buy order", () => {
    expect(
      summarizeOrderCtaLabel({
        side: "BUY",
        quantity: 1,
        symbol: "AAPL",
        orderType: "MKT",
        lastPrice: 100,
      }),
    ).toBe("BUY 1 AAPL @ MKT MKT");
  });

  it("summarizes limit sell order", () => {
    expect(
      summarizeOrderCtaLabel({
        side: "SELL",
        quantity: 10,
        symbol: "msft",
        orderType: "LMT",
        limitPrice: 135.16,
      }),
    ).toBe("SELL 10 MSFT @ 135.16 LMT");
  });

  it("summarizes stop-limit order", () => {
    expect(
      summarizeOrderCtaLabel({
        side: "BUY",
        quantity: 2,
        symbol: "TSLA",
        orderType: "STP LMT",
        stopPrice: 200,
        limitPrice: 201,
      }),
    ).toBe("BUY 2 TSLA @ 200.00/201.00 STP LMT");
  });

  it("summarizes MOC order", () => {
    expect(
      summarizeOrderCtaLabel({
        side: "BUY",
        quantity: 100,
        symbol: "AAPL",
        orderType: "MOC",
      }),
    ).toBe("BUY 100 AAPL @ MOC MOC");
  });
});
