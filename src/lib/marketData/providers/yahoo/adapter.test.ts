import { describe, it, expect } from "vitest";
import {
  mapYahooCandles,
  mapYahooQuotes,
  mapRawTradierOption,
} from "./adapter";

describe("yahoo adapter mappers", () => {
  it("maps yahoo candles to millisecond chart candles", () => {
    const candles = mapYahooCandles([
      {
        timestamp: 1_700_000_000,
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: 100,
      },
    ]);
    expect(candles[0]?.t).toBe(1_700_000_000_000);
    expect(candles[0]?.o).toBe(1);
  });

  it("maps yahoo quotes to equity quotes", () => {
    const quotes = mapYahooQuotes([
      {
        symbol: "AAPL",
        regularMarketPrice: 100,
        regularMarketChange: 1,
        regularMarketChangePercent: 1,
        regularMarketVolume: 1000,
        updatedAt: 123,
      },
    ]);
    expect(quotes[0]?.price).toBe(100);
  });
});

describe("tradier option mapper", () => {
  it("maps tradier option rows with greeks", () => {
    const mapped = mapRawTradierOption(
      {
        symbol: "AAPL250620C00150000",
        option_type: "call",
        strike: 150,
        bid: 1,
        ask: 1.2,
        greeks: { delta: 0.5, mid_iv: 0.25 },
      },
      "AAPL",
      "2025-06-20",
    );
    expect(mapped?.type).toBe("call");
    expect(mapped?.delta).toBe(0.5);
    expect(mapped?.impliedVolatility).toBe(0.25);
  });
});
