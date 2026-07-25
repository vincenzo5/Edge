/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import WatchlistTable from "./WatchlistTable";
import type { QuoteSnapshot } from "@/lib/watchlist/types";
import type { WatchlistDisplayModel } from "@/lib/watchlist/viewModel";
import { DEFAULT_WATCHLIST_VIEW_PREFS } from "@/lib/watchlist/types";

const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

function mockWatchlistScrollContainer() {
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    if (this.getAttribute("data-testid") === "watchlist-table-scroll") {
      return {
        width: 320,
        height: 240,
        top: 0,
        left: 0,
        bottom: 240,
        right: 320,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    }
    return originalGetBoundingClientRect.call(this);
  };

  class MockResizeObserver {
    private callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      const rect = target.getBoundingClientRect();
      this.callback(
        [
          {
            target,
            contentRect: {
              width: rect.width,
              height: rect.height,
              top: 0,
              left: 0,
              bottom: rect.height,
              right: rect.width,
              x: 0,
              y: 0,
              toJSON: () => ({}),
            },
          } as ResizeObserverEntry,
        ],
        this,
      );
    }

    unobserve() {}

    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", MockResizeObserver);
}

function buildDisplayModel(count: number): WatchlistDisplayModel {
  const rows = Array.from({ length: count }, (_, index) => ({
    item: {
      symbol: `SYM${index}`,
      addedAt: index,
    },
    metrics: {
      symbol: `SYM${index}`,
      last: 100 + index,
      changePct: index % 2 === 0 ? 1.2 : -0.8,
      volume: 1_000_000 + index,
      marketCap: 10_000_000_000,
      sector: "Tech",
    },
    pinned: false,
  }));

  return {
    pinnedRows: [],
    groups: [{ id: "all", label: "All", rows }],
    allTags: [],
    viewPrefs: DEFAULT_WATCHLIST_VIEW_PREFS,
  };
}

function buildQuotes(count: number, priceOffset = 0): QuoteSnapshot[] {
  return Array.from({ length: count }, (_, index) => ({
    symbol: `SYM${index}`,
    regularMarketPrice: 100 + index + priceOffset,
    regularMarketChange: 1,
    regularMarketChangePercent: 1,
    regularMarketVolume: 1000,
    updatedAt: Date.now(),
  }));
}

describe("WatchlistTable", () => {
  beforeEach(() => {
    mockWatchlistScrollContainer();
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    vi.unstubAllGlobals();
  });

  it("virtualizes large watchlists without mounting every row", () => {
    render(
      <div className="flex h-[240px] min-h-0 flex-col">
        <WatchlistTable
          displayModel={buildDisplayModel(200)}
          itemCount={200}
          quotes={buildQuotes(200)}
          selectedSymbol={null}
          quotesError={null}
          quotesLoading={false}
          onSelect={vi.fn()}
          onLoadChart={vi.fn()}
          onRemove={vi.fn()}
          onTogglePin={vi.fn()}
          onEditTags={vi.fn()}
          onViewPrefsChange={vi.fn()}
          onSortChange={vi.fn()}
        />
      </div>,
    );

    const rows = screen.getAllByTestId(/^watchlist-row-/);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(200);
    expect(screen.queryByTestId("watchlist-row-SYM199")).toBeNull();
  });

  it("keeps mounted row count bounded after quote ticks", () => {
    const { rerender } = render(
      <div className="flex h-[240px] min-h-0 flex-col">
        <WatchlistTable
          displayModel={buildDisplayModel(200)}
          itemCount={200}
          quotes={buildQuotes(200)}
          selectedSymbol={null}
          quotesError={null}
          quotesLoading={false}
          onSelect={vi.fn()}
          onLoadChart={vi.fn()}
          onRemove={vi.fn()}
          onTogglePin={vi.fn()}
          onEditTags={vi.fn()}
          onViewPrefsChange={vi.fn()}
          onSortChange={vi.fn()}
        />
      </div>,
    );

    expect(screen.getAllByTestId(/^watchlist-row-/).length).toBeLessThan(200);

    rerender(
      <div className="flex h-[240px] min-h-0 flex-col">
        <WatchlistTable
          displayModel={buildDisplayModel(200)}
          itemCount={200}
          quotes={buildQuotes(200, 5)}
          selectedSymbol={null}
          quotesError={null}
          quotesLoading={false}
          onSelect={vi.fn()}
          onLoadChart={vi.fn()}
          onRemove={vi.fn()}
          onTogglePin={vi.fn()}
          onEditTags={vi.fn()}
          onViewPrefsChange={vi.fn()}
          onSortChange={vi.fn()}
        />
      </div>,
    );

    expect(screen.getAllByTestId(/^watchlist-row-/).length).toBeLessThan(200);
  });
});
