import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalDaySummaryModal from "./JournalDaySummaryModal";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

const sampleTrades: JournalTradeResponse[] = [
  {
    id: "t1",
    status: "closed",
    direction: "short",
    symbol: "BTCUSD",
    secType: "STK",
    openedAt: "2026-07-01T13:30:00.000Z",
    closedAt: "2026-07-01T20:00:00.000Z",
    netPnL: 1540.18,
    grossPnL: 1550,
    avgEntry: 100,
    netQuantity: 10,
    totalCommission: 9.82,
    fillExecIds: ["e1"],
    tags: [],
    setup: "breakout",
    reviewNote: null,
    createdAt: "2026-07-01T13:30:00.000Z",
    updatedAt: "2026-07-01T20:00:00.000Z",
  },
  {
    id: "t2",
    status: "closed",
    direction: "short",
    symbol: "ETHUSD",
    secType: "STK",
    openedAt: "2026-07-01T15:00:00.000Z",
    closedAt: "2026-07-01T21:00:00.000Z",
    netPnL: -1100.15,
    grossPnL: -1090,
    avgEntry: 50,
    netQuantity: 20,
    totalCommission: 10.15,
    fillExecIds: ["e2"],
    tags: [],
    setup: "breakout",
    reviewNote: null,
    createdAt: "2026-07-01T15:00:00.000Z",
    updatedAt: "2026-07-01T21:00:00.000Z",
  },
];

describe("JournalDaySummaryModal", () => {
  it("renders header, stats, chart, and table columns", () => {
    render(
      <JournalDaySummaryModal
        open
        date="2026-07-01"
        trades={sampleTrades}
        onClose={vi.fn()}
        onSelectTrade={vi.fn()}
      />,
    );

    expect(screen.getByTestId("journal-day-summary-modal")).toBeInTheDocument();
    expect(screen.getByTestId("journal-day-summary-net-pnl")).toHaveTextContent("Net P&L");
    expect(screen.getByTestId("journal-day-summary-total-trades")).toHaveTextContent("2");
    expect(screen.getByTestId("journal-day-summary-win-rate")).toHaveTextContent("50%");
    expect(screen.getByTestId("journal-day-summary-commissions")).toBeInTheDocument();
    expect(screen.getByTestId("journal-day-pnl-svg")).toBeInTheDocument();
    expect(screen.getByText("Open time")).toBeInTheDocument();
    expect(screen.getByText("Realized R-Multiple")).toBeInTheDocument();
    expect(screen.getByTestId("journal-day-trades-row-t1")).toBeInTheDocument();
    expect(screen.getByTestId("journal-day-trades-row-t2")).toBeInTheDocument();
  });

  it("shows empty states when there are no trades", () => {
    render(
      <JournalDaySummaryModal
        open
        date="2026-07-08"
        trades={[]}
        onClose={vi.fn()}
        onSelectTrade={vi.fn()}
      />,
    );

    expect(screen.getByTestId("journal-day-summary-chart-empty")).toBeInTheDocument();
    expect(screen.getByTestId("journal-day-trades-empty")).toBeInTheDocument();
    expect(screen.getByTestId("journal-day-summary-total-trades")).toHaveTextContent("0");
  });

  it("calls onSelectTrade when a row is clicked", () => {
    const onSelectTrade = vi.fn();
    render(
      <JournalDaySummaryModal
        open
        date="2026-07-01"
        trades={sampleTrades}
        onClose={vi.fn()}
        onSelectTrade={onSelectTrade}
      />,
    );

    fireEvent.click(screen.getByTestId("journal-day-trades-row-t1"));
    expect(onSelectTrade).toHaveBeenCalledWith("t1");
  });

  it("does not render when date is null", () => {
    render(
      <JournalDaySummaryModal
        open
        date={null}
        trades={sampleTrades}
        onClose={vi.fn()}
        onSelectTrade={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("journal-day-summary-modal")).not.toBeInTheDocument();
  });
});
