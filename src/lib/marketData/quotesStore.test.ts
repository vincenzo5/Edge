import { describe, it, expect, beforeEach } from "vitest";
import {
  clearQuotesStore,
  getQuote,
  mergeQuoteUpdates,
  replaceQuotes,
  subscribeQuote,
} from "@/lib/marketData/quotesStore";
import type { QuoteSnapshot } from "@/lib/watchlist/types";

function quote(symbol: string, price: number): QuoteSnapshot {
  return {
    symbol,
    regularMarketPrice: price,
    regularMarketChange: 1,
    regularMarketChangePercent: 1,
    regularMarketVolume: 1000,
    updatedAt: Date.now(),
  };
}

describe("quotesStore", () => {
  beforeEach(() => {
    clearQuotesStore();
  });

  it("notifies only changed symbols", () => {
    let aaplCalls = 0;
    let msftCalls = 0;
    const unsubAapl = subscribeQuote("AAPL", () => {
      aaplCalls += 1;
    });
    const unsubMsft = subscribeQuote("MSFT", () => {
      msftCalls += 1;
    });

    mergeQuoteUpdates([quote("AAPL", 100)]);
    mergeQuoteUpdates([quote("MSFT", 200)]);

    expect(getQuote("AAPL")?.regularMarketPrice).toBe(100);
    expect(getQuote("MSFT")?.regularMarketPrice).toBe(200);
    expect(aaplCalls).toBe(1);
    expect(msftCalls).toBe(1);

    const unchanged = getQuote("AAPL");
    if (unchanged) mergeQuoteUpdates([unchanged]);
    expect(aaplCalls).toBe(1);

    unsubAapl();
    unsubMsft();
  });

  it("replaceQuotes clears and repopulates", () => {
    replaceQuotes(new Map([["AAPL", quote("AAPL", 50)]]));
    expect(getQuote("AAPL")?.regularMarketPrice).toBe(50);
    replaceQuotes(new Map([["MSFT", quote("MSFT", 75)]]));
    expect(getQuote("AAPL")).toBeUndefined();
    expect(getQuote("MSFT")?.regularMarketPrice).toBe(75);
  });
});
