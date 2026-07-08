import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import JournalTradesTable from "./JournalTradesTable";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import {
  DEFAULT_JOURNAL_TRADES_TABLE_SORT,
  buildVisibleColumnsSet,
  defaultJournalTradesTablePrefs,
} from "@/lib/journal/journalTradesTableControls";

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

function renderTable(
  overrides: Partial<Parameters<typeof JournalTradesTable>[0]> = {},
) {
  const onSelectTrade = vi.fn();
  const onSortChange = vi.fn();
  render(
    <JournalTradesTable
      trades={sampleTrades}
      selectedTradeId={null}
      onSelectTrade={onSelectTrade}
      sort={DEFAULT_JOURNAL_TRADES_TABLE_SORT}
      onSortChange={onSortChange}
      visibleColumns={buildVisibleColumnsSet(defaults.visibleColumns)}
      density="compact"
      emptyVariant="none"
      {...overrides}
    />,
  );
  return { onSelectTrade, onSortChange };
}

describe("JournalTradesTable", () => {
  it("calls onSelectTrade when a row is clicked", () => {
    const { onSelectTrade } = renderTable();
    fireEvent.click(screen.getByTestId("journal-trades-row-t1"));
    expect(onSelectTrade).toHaveBeenCalledWith("t1");
  });

  it("shows empty state when no trades", () => {
    renderTable({ trades: [], emptyVariant: "no-trades" });
    expect(screen.getByTestId("journal-trades-empty")).toBeInTheDocument();
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
    fireEvent.click(screen.getByTestId("journal-trades-sort-symbol"));
    expect(onSortChange).toHaveBeenCalledWith({ key: "symbol", direction: "desc" });
  });

  it("hides columns not in visible set", () => {
    renderTable({
      visibleColumns: buildVisibleColumnsSet(["symbol", "chart"]),
    });
    expect(screen.getByText("Symbol")).toBeInTheDocument();
    expect(screen.queryByText("Open date")).not.toBeInTheDocument();
  });

  it("applies comfortable density attribute", () => {
    renderTable({ density: "comfortable" });
    expect(screen.getByTestId("journal-trades-table")).toHaveAttribute("data-density", "comfortable");
  });
});
