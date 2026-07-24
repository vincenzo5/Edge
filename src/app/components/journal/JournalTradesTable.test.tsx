import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import JournalTradesTable from "./JournalTradesTable";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import {
  DEFAULT_JOURNAL_TRADES_TABLE_SORT,
  defaultJournalTradesTablePrefs,
} from "@/lib/journal/journalTradesTableControls";
import { JOURNAL_TRADES_HEADER_DRAG_HOLD_MS } from "@/lib/journal/journalTradesColumnHeaderDrag";

const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

function mockVirtualScrollContainer() {
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    if (this.getAttribute("data-testid") === "journal-trades-table") {
      return {
        width: 800,
        height: 400,
        top: 0,
        left: 0,
        bottom: 400,
        right: 800,
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

const sampleTrades: JournalTradeResponse[] = [
  {
    id: "t1",
    status: "closed",
    direction: "long",
    symbol: "AAPL",
    secType: "STK",
    openedAt: "2026-06-01T13:30:00.000Z",
    closedAt: "2026-06-02T13:30:00.000Z",
    netPnL: 100,
    avgEntry: 150,
    avgExit: 160,
    fillExecIds: ["e1"],
    tags: ["breakout"],
    setup: "breakout",
    reviewNote: null,
    createdAt: "2026-06-01T13:30:00.000Z",
    updatedAt: "2026-06-02T13:30:00.000Z",
  },
];

const defaults = defaultJournalTradesTablePrefs();

function mockHeaderRect(element: HTMLElement, rect: { left: number; width: number }) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      ...rect,
      top: 0,
      height: 24,
      right: rect.left + rect.width,
      bottom: 24,
      x: rect.left,
      y: 0,
      toJSON: () => ({}),
    }),
  });
}

function renderTable(
  overrides: Partial<Parameters<typeof JournalTradesTable>[0]> = {},
) {
  const onSelectTrade = vi.fn();
  const onSortChange = vi.fn();
  const onColumnOrderChange = vi.fn();
  const result = render(
    <div className="flex h-[400px] min-h-0 flex-col">
      <JournalTradesTable
        trades={sampleTrades}
        selectedTradeId={null}
        onSelectTrade={onSelectTrade}
        sort={DEFAULT_JOURNAL_TRADES_TABLE_SORT}
        onSortChange={onSortChange}
        visibleColumns={defaults.visibleColumns}
        columnOrder={defaults.columnOrder}
        onColumnOrderChange={onColumnOrderChange}
        emptyVariant="none"
        {...overrides}
      />
    </div>,
  );
  return { onSelectTrade, onSortChange, onColumnOrderChange, ...result };
}

describe("JournalTradesTable", () => {
  beforeEach(() => {
    mockVirtualScrollContainer();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it("calls onSelectTrade when a row is clicked", () => {
    const { onSelectTrade } = renderTable();
    fireEvent.click(screen.getByTestId("journal-trades-row-t1"));
    expect(onSelectTrade).toHaveBeenCalledWith("t1");
  });

  it("shows empty state when no trades", () => {
    renderTable({ trades: [], emptyVariant: "no-trades" });
    expect(screen.getByTestId("journal-trades-empty")).toBeInTheDocument();
  });

  it("shows open-positions empty state", () => {
    renderTable({ trades: [], emptyVariant: "no-open" });
    expect(screen.getByTestId("journal-open-positions-empty")).toHaveTextContent(
      "No open positions to show here",
    );
  });

  it("shows filtered empty state with clear action", () => {
    const onClearFilters = vi.fn();
    renderTable({ trades: [], emptyVariant: "filtered", onClearFilters });
    expect(screen.getByTestId("journal-trades-filtered-empty")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Clear filters"));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("calls onSortChange when sortable header is clicked", () => {
    const { onSortChange } = renderTable();
    fireEvent.pointerDown(screen.getByTestId("journal-trades-header-symbol"), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
    });
    fireEvent.pointerUp(screen.getByTestId("journal-trades-header-symbol"), { pointerId: 1 });
    expect(onSortChange).toHaveBeenCalledWith({ key: "symbol", direction: "desc" });
  });

  it("reorders columns when a header is held and dragged", () => {
    vi.useFakeTimers();
    const onColumnOrderChange = vi.fn();
    renderTable({
      onColumnOrderChange,
      visibleColumns: ["openDate", "symbol", "status", "chart"],
    });

    const openDateHeader = screen.getByTestId("journal-trades-header-openDate");
    const symbolHeader = screen.getByTestId("journal-trades-header-symbol");
    mockHeaderRect(openDateHeader, { left: 0, width: 100 });
    mockHeaderRect(symbolHeader, { left: 100, width: 100 });

    fireEvent.pointerDown(openDateHeader, { clientX: 20, clientY: 10, pointerId: 1 });
    vi.advanceTimersByTime(JOURNAL_TRADES_HEADER_DRAG_HOLD_MS);
    fireEvent.pointerMove(openDateHeader, { clientX: 130, clientY: 10, pointerId: 1 });
    expect(screen.getByTestId("journal-trades-column-drag-ghost")).toHaveTextContent("Open date");
    expect(screen.getByTestId("journal-trades-column-drop-marker")).toBeInTheDocument();
    fireEvent.pointerUp(openDateHeader, { pointerId: 1 });

    expect(onColumnOrderChange).toHaveBeenCalled();
  });

  it("does not sort when a drag reorder completes", () => {
    vi.useFakeTimers();
    const { onSortChange, onColumnOrderChange } = renderTable({
      visibleColumns: ["openDate", "symbol", "chart"],
    });

    const openDateHeader = screen.getByTestId("journal-trades-header-openDate");
    const symbolHeader = screen.getByTestId("journal-trades-header-symbol");
    mockHeaderRect(openDateHeader, { left: 0, width: 100 });
    mockHeaderRect(symbolHeader, { left: 100, width: 100 });

    fireEvent.pointerDown(openDateHeader, { clientX: 20, clientY: 10, pointerId: 1 });
    vi.advanceTimersByTime(JOURNAL_TRADES_HEADER_DRAG_HOLD_MS);
    fireEvent.pointerMove(openDateHeader, { clientX: 130, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(openDateHeader, { pointerId: 1 });

    expect(onColumnOrderChange).toHaveBeenCalled();
    expect(onSortChange).not.toHaveBeenCalled();
  });

  it("hides columns not in visible set", () => {
    renderTable({
      visibleColumns: ["symbol", "chart"],
    });
    expect(screen.getByText("Symbol")).toBeInTheDocument();
    expect(screen.queryByText("Open date")).not.toBeInTheDocument();
  });

  it("renders headers and cells in column order", () => {
    renderTable({
      visibleColumns: ["symbol", "status", "chart"],
      columnOrder: ["status", "symbol", "openDate", "chart"],
    });
    const headerCells = within(screen.getByTestId("journal-trades-table")).getAllByRole("columnheader");
    expect(headerCells.map((cell) => cell.textContent?.replace(/↕|↑|↓/g, "").trim())).toEqual([
      "Status",
      "Symbol",
      "Chart",
    ]);
    const row = screen.getByTestId("journal-trades-row-t1");
    expect(within(row).getAllByRole("cell").map((cell) => cell.textContent?.trim())).toEqual([
      "WIN",
      "AAPL",
      "Open",
    ]);
  });

  it("shows live unrealized PnL for open trades in open positions mode", () => {
    renderTable({
      trades: [
        {
          ...sampleTrades[0],
          id: "open-1",
          status: "open",
          closedAt: null,
          netPnL: null,
          legs: [{ conId: 123, symbol: "AAPL", secType: "STK" }],
        },
      ],
      visibleColumns: ["symbol", "netPnL", "chart"],
      openPositionsMode: true,
      liveUnrealizedByTradeId: { "open-1": 250.75 },
    });
    const pnlCell = screen.getByTestId("journal-trades-pnl-open-1");
    expect(pnlCell).toHaveTextContent("$250.75");
    expect(pnlCell.className).toContain("text-[var(--edge-positive)]");
  });

  it("shows dash when open trade has no live unrealized match", () => {
    renderTable({
      trades: [
        {
          ...sampleTrades[0],
          id: "open-2",
          status: "open",
          closedAt: null,
          netPnL: null,
        },
      ],
      visibleColumns: ["symbol", "netPnL", "chart"],
      openPositionsMode: true,
      liveUnrealizedByTradeId: { "open-2": null },
    });
    expect(screen.getByTestId("journal-trades-pnl-open-2")).toHaveTextContent("—");
  });

  it("virtualizes large trade lists without mounting every row", () => {
    const manyTrades = Array.from({ length: 200 }, (_, index) => ({
      ...sampleTrades[0],
      id: `bulk-${index}`,
      symbol: `SYM${index}`,
    }));
    renderTable({ trades: manyTrades });
    const rows = screen.getAllByTestId(/^journal-trades-row-/);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(200);
  });
});
