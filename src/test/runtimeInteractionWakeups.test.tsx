import { describe, it, expect, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { createRenderCounter, useRenderCounter } from "@/test/reactRenderCounter";
import { useQuote } from "@/lib/marketData/useQuotes";
import {
  clearQuotesStore,
  mergeQuoteUpdates,
} from "@/lib/marketData/quotesStore";
import type { QuoteSnapshot } from "@/lib/watchlist/types";
import {
  clearAccountPositionStoreForTests,
  syncAccountPositions,
} from "@/lib/marketData/accountPositionStore";
import { useAccountPositionForSymbol } from "@/lib/marketData/useAccountPosition";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";

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

function position(symbol: string, qty = 10): AccountPosition {
  return {
    accountId: "acct-1",
    contract: { symbol, secType: "STK", exchange: "SMART", currency: "USD" },
    position: qty,
    avgCost: 100,
    marketPrice: 101,
    marketValue: qty * 101,
    unrealizedPnL: qty,
  };
}

function QuoteProbe({
  symbol,
  counter,
}: {
  symbol: string | null;
  counter: ReturnType<typeof createRenderCounter>;
}) {
  useRenderCounter(counter);
  useQuote(symbol);
  return null;
}

function AccountPositionProbe({
  symbol,
  counter,
}: {
  symbol: string;
  counter: ReturnType<typeof createRenderCounter>;
}) {
  useRenderCounter(counter);
  useAccountPositionForSymbol(symbol);
  return null;
}

describe("runtime interaction wakeups — Phase 2", () => {
  beforeEach(() => {
    clearQuotesStore();
    clearAccountPositionStoreForTests();
  });

  it("inactive quote probe does not render on foreign-symbol tick", () => {
    const activeCounter = createRenderCounter();
    const inactiveCounter = createRenderCounter();

    render(
      <>
        <QuoteProbe symbol="AAPL" counter={activeCounter} />
        <QuoteProbe symbol={null} counter={inactiveCounter} />
      </>,
    );

    activeCounter.reset();
    inactiveCounter.reset();

    act(() => {
      mergeQuoteUpdates([quote("MSFT", 200)]);
    });

    expect(activeCounter.count()).toBe(0);
    expect(inactiveCounter.count()).toBe(0);
  });

  it("active quote probe renders only for its symbol", () => {
    const aaplCounter = createRenderCounter();
    const msftCounter = createRenderCounter();

    render(
      <>
        <QuoteProbe symbol="AAPL" counter={aaplCounter} />
        <QuoteProbe symbol="MSFT" counter={msftCounter} />
      </>,
    );

    aaplCounter.reset();
    msftCounter.reset();

    act(() => {
      mergeQuoteUpdates([quote("AAPL", 150)]);
    });

    expect(aaplCounter.count()).toBe(1);
    expect(msftCounter.count()).toBe(0);
  });

  it("account position probe ignores unrelated symbol updates", () => {
    const aaplCounter = createRenderCounter();
    const msftCounter = createRenderCounter();

    syncAccountPositions([position("AAPL")]);
    render(
      <>
        <AccountPositionProbe symbol="AAPL" counter={aaplCounter} />
        <AccountPositionProbe symbol="MSFT" counter={msftCounter} />
      </>,
    );

    aaplCounter.reset();
    msftCounter.reset();

    act(() => {
      syncAccountPositions([position("AAPL"), position("MSFT", 5)]);
    });

    expect(aaplCounter.count()).toBe(0);
    expect(msftCounter.count()).toBe(1);
  });
});
