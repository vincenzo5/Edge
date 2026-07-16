import { describe, expect, it } from "vitest";
import { mapRawQuoteToSnapshot } from "./mappers";

describe("mapRawQuoteToSnapshot", () => {
  it("maps MarketQuote stream shape (price / changePercent)", () => {
    const quote = mapRawQuoteToSnapshot({
      symbol: "f",
      price: 13.45,
      change: 0.23,
      changePercent: 1.72,
      volume: 1_000_000,
      updatedAt: 1,
    });

    expect(quote).toEqual({
      symbol: "F",
      shortName: undefined,
      exchange: undefined,
      currency: undefined,
      regularMarketPrice: 13.45,
      regularMarketChange: 0.23,
      regularMarketChangePercent: 1.72,
      regularMarketVolume: 1_000_000,
      updatedAt: 1,
    });
  });

  it("maps Yahoo-style regularMarket* keys", () => {
    const quote = mapRawQuoteToSnapshot({
      symbol: "AAPL",
      regularMarketPrice: 200,
      regularMarketChange: -1,
      regularMarketChangePercent: -0.5,
      regularMarketVolume: 10,
      updatedAt: 2,
    });

    expect(quote?.regularMarketPrice).toBe(200);
    expect(quote?.regularMarketChangePercent).toBe(-0.5);
  });

  it("returns null without a symbol", () => {
    expect(mapRawQuoteToSnapshot({ price: 1 })).toBeNull();
  });
});
