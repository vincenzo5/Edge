import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import JournalTradeTable from "./JournalTradeTable";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

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
    fillExecIds: ["e1", "e2"],
    tags: ["breakout"],
    setup: "breakout",
    reviewNote: null,
    createdAt: "2026-06-01T13:30:00.000Z",
    updatedAt: "2026-06-02T13:30:00.000Z",
  },
  {
    id: "t2",
    status: "open",
    direction: "long",
    symbol: "SPY",
    secType: "spread",
    openedAt: "2026-06-03T13:30:00.000Z",
    closedAt: null,
    netPnL: null,
    fillExecIds: ["e3"],
    legs: [{ symbol: "SPY", secType: "OPT", netQuantity: 1 }],
    tags: [],
    setup: null,
    reviewNote: null,
    createdAt: "2026-06-03T13:30:00.000Z",
    updatedAt: "2026-06-03T13:30:00.000Z",
  },
];

describe("JournalTradeTable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders stock and spread rows", () => {
    render(
      <JournalTradeTable trades={sampleTrades} selectedTradeId={null} onSelectTrade={vi.fn()} />,
    );
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("spread")).toBeInTheDocument();
    expect(screen.getByTestId("journal-trade-chart-t1")).toHaveAttribute(
      "href",
      expect.stringContaining("symbol=AAPL"),
    );
    expect(screen.getByTestId("journal-trade-chart-t1").getAttribute("href")).toContain(
      "journalTrade=t1",
    );
  });

  it("shows empty state when no trades", () => {
    render(<JournalTradeTable trades={[]} selectedTradeId={null} onSelectTrade={vi.fn()} />);
    expect(screen.getByTestId("journal-trade-empty")).toBeInTheDocument();
  });

  it("calls onSelectTrade when a row is clicked", () => {
    const onSelectTrade = vi.fn();
    render(
      <JournalTradeTable trades={sampleTrades} selectedTradeId={null} onSelectTrade={onSelectTrade} />,
    );
    fireEvent.click(screen.getByTestId("journal-trade-row-t1"));
    expect(onSelectTrade).toHaveBeenCalledWith("t1");
  });
});
