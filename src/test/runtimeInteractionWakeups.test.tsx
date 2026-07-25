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
import {
  cellChartId,
  clearCellLayoutStoreForTests,
  flushCellLayoutNow,
  getCellConfig,
  getCellRevision,
  registerCellLayoutFlushHandler,
  setCellConfig,
} from "@/lib/chart/cellLayoutStore";
import { useCellLayoutConfig } from "@/lib/chart/useCellLayoutConfig";
import { DEFAULT_CELL, type CellConfig } from "@/lib/chartConfig";

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

function CellLayoutProbe({
  chartId,
  fallback,
  counter,
}: {
  chartId: string;
  fallback: CellConfig;
  counter: ReturnType<typeof createRenderCounter>;
}) {
  useRenderCounter(counter);
  useCellLayoutConfig(chartId, fallback);
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

describe("runtime interaction wakeups — Phase 7", () => {
  beforeEach(() => {
    clearCellLayoutStoreForTests();
  });

  it("inactive cell probe does not render when another cell drawing slice updates", () => {
    const cellACounter = createRenderCounter();
    const cellBCounter = createRenderCounter();
    const fallbackA = { ...DEFAULT_CELL, symbol: "AAPL" };
    const fallbackB = { ...DEFAULT_CELL, symbol: "MSFT" };

    render(
      <>
        <CellLayoutProbe chartId="cell-0" fallback={fallbackA} counter={cellACounter} />
        <CellLayoutProbe chartId="cell-1" fallback={fallbackB} counter={cellBCounter} />
      </>,
    );

    cellACounter.reset();
    cellBCounter.reset();

    act(() => {
      setCellConfig(cellChartId(0), {
        ...fallbackA,
        drawings: [
          {
            id: "d1",
            name: "trend_line",
            points: [{ timestamp: 1, value: 1 }],
            visible: true,
            locked: false,
            zLevel: 0,
            paneId: "price",
          },
        ],
      });
    });

    expect(cellACounter.count()).toBe(1);
    expect(cellBCounter.count()).toBe(0);
    expect(getCellRevision(cellChartId(0))).toBeGreaterThan(0);
  });

  it("persistence round-trip captures drawing slice on flush", () => {
    const fallback = { ...DEFAULT_CELL, symbol: "AAPL" };
    const flushed: CellConfig[] = [];

    registerCellLayoutFlushHandler(() => {
      flushed.push({ ...(getCellConfig(cellChartId(0)) ?? fallback) });
    });

    const drawing = {
      id: "d1",
      name: "trend_line",
      points: [{ timestamp: 1, value: 1 }],
      visible: true,
      locked: false,
      zLevel: 0,
      paneId: "price",
    };

    setCellConfig(cellChartId(0), { ...fallback, drawings: [drawing] });
    flushCellLayoutNow();

    expect(flushed).toHaveLength(1);
    expect(flushed[0]?.drawings).toEqual([drawing]);
  });
});
