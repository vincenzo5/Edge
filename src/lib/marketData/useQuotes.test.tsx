import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { clearQuotesStore, mergeQuoteUpdates } from "@/lib/marketData/quotesStore";
import { useQuotesForSymbols } from "@/lib/marketData/useQuotes";

describe("useQuotesForSymbols", () => {
  beforeEach(() => {
    clearQuotesStore();
  });

  it("returns a stable snapshot while selected quotes are unchanged", () => {
    mergeQuoteUpdates([
      {
        symbol: "SPY",
        regularMarketPrice: 600,
        regularMarketChange: 1,
        regularMarketChangePercent: 0.2,
        regularMarketVolume: 1_000,
        updatedAt: 1,
      },
    ]);

    const { result, rerender } = renderHook(
      ({ symbols }: { symbols: string[] }) => useQuotesForSymbols(symbols),
      { initialProps: { symbols: ["SPY"] } },
    );
    const first = result.current;

    rerender({ symbols: ["SPY"] });

    expect(result.current).toBe(first);
    expect(result.current[0]?.regularMarketPrice).toBe(600);
  });
});
