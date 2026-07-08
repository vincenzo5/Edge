import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalTradeListCard from "./JournalTradeListCard";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

const closedTrade: JournalTradeResponse = {
  id: "t1",
  status: "closed",
  direction: "long",
  symbol: "BTCUSD",
  secType: "STK",
  openedAt: "2024-07-01T13:30:00.000Z",
  closedAt: "2024-07-08T16:00:00.000Z",
  netPnL: 1540.18,
  avgEntry: 100,
  avgExit: 110,
  fillExecIds: ["e1"],
  tags: [],
  setup: null,
  reviewNote: null,
  createdAt: "2024-07-01T13:30:00.000Z",
  updatedAt: "2024-07-08T16:00:00.000Z",
};

const openTrade: JournalTradeResponse = {
  id: "t2",
  status: "open",
  direction: "long",
  symbol: "ETHUSD",
  secType: "STK",
  openedAt: "2024-07-08T13:30:00.000Z",
  closedAt: null,
  netPnL: null,
  avgEntry: 3200.5,
  fillExecIds: ["e2"],
  tags: [],
  setup: null,
  reviewNote: null,
  createdAt: "2024-07-08T13:30:00.000Z",
  updatedAt: "2024-07-08T13:30:00.000Z",
};

describe("JournalTradeListCard", () => {
  it("renders recent trades title and column headers", () => {
    render(
      <JournalTradeListCard
        title="Recent trades"
        testId="journal-recent-trades-card"
        variant="recent"
        trades={[closedTrade]}
        onSelectTrade={vi.fn()}
      />,
    );

    expect(screen.getByTestId("journal-recent-trades-card")).toBeInTheDocument();
    expect(screen.getByText("Recent trades")).toBeInTheDocument();
    expect(screen.getByText("Close Date")).toBeInTheDocument();
    expect(screen.getByText("Net P&L")).toBeInTheDocument();
  });

  it("renders recent trade row with formatted values", () => {
    render(
      <JournalTradeListCard
        title="Recent trades"
        testId="journal-recent-trades-card"
        variant="recent"
        trades={[closedTrade]}
        onSelectTrade={vi.fn()}
      />,
    );

    const row = screen.getByTestId("journal-recent-trades-card-row-t1");
    expect(row).toHaveTextContent("07/08/2024");
    expect(row).toHaveTextContent("BTCUSD");
    expect(row).toHaveTextContent("$1,540.18");
  });

  it("renders open positions title and entry column", () => {
    render(
      <JournalTradeListCard
        title="Open positions"
        testId="journal-open-positions-card"
        variant="open"
        trades={[openTrade]}
        onSelectTrade={vi.fn()}
      />,
    );

    expect(screen.getByText("Open Date")).toBeInTheDocument();
    expect(screen.getByText("Entry")).toBeInTheDocument();
    expect(screen.getByTestId("journal-open-positions-card-row-t2")).toHaveTextContent("3,200.50");
  });

  it("shows empty state when no trades", () => {
    render(
      <JournalTradeListCard
        title="Open positions"
        testId="journal-open-positions-card"
        variant="open"
        trades={[]}
        onSelectTrade={vi.fn()}
      />,
    );

    expect(screen.getByText("No open positions to show here")).toBeInTheDocument();
    expect(screen.getByText("Try selecting different filters")).toBeInTheDocument();
  });

  it("shows blue title underline only for open positions variant", () => {
    const { rerender } = render(
      <JournalTradeListCard
        title="Recent trades"
        testId="journal-recent-trades-card"
        variant="recent"
        trades={[closedTrade]}
        onSelectTrade={vi.fn()}
      />,
    );

    expect(screen.getByText("Recent trades").className).not.toContain(
      "border-[var(--edge-accent-blue)]",
    );

    rerender(
      <JournalTradeListCard
        title="Open positions"
        testId="journal-open-positions-card"
        variant="open"
        trades={[openTrade]}
        onSelectTrade={vi.fn()}
      />,
    );

    expect(screen.getByText("Open positions").className).toContain(
      "border-[var(--edge-accent-blue)]",
    );
  });

  it("calls onSelectTrade when row is clicked", () => {
    const onSelectTrade = vi.fn();
    render(
      <JournalTradeListCard
        title="Recent trades"
        testId="journal-recent-trades-card"
        variant="recent"
        trades={[closedTrade]}
        onSelectTrade={onSelectTrade}
      />,
    );

    fireEvent.click(screen.getByTestId("journal-recent-trades-card-row-t1"));
    expect(onSelectTrade).toHaveBeenCalledWith("t1");
  });
});
