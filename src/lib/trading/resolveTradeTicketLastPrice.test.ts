import { describe, expect, it } from "vitest";
import { resolveTradeTicketLastPrice } from "./resolveTradeTicketLastPrice";

describe("resolveTradeTicketLastPrice", () => {
  it("prefers live quote over candle close", () => {
    expect(
      resolveTradeTicketLastPrice({ quotePrice: 556.71, lastCandleClose: 550 }),
    ).toBe(556.71);
  });

  it("falls back to last candle close when quote is missing", () => {
    expect(
      resolveTradeTicketLastPrice({ quotePrice: null, lastCandleClose: 556.71 }),
    ).toBe(556.71);
  });

  it("returns null when neither source is usable", () => {
    expect(
      resolveTradeTicketLastPrice({ quotePrice: null, lastCandleClose: null }),
    ).toBeNull();
    expect(
      resolveTradeTicketLastPrice({ quotePrice: Number.NaN, lastCandleClose: undefined }),
    ).toBeNull();
  });
});
