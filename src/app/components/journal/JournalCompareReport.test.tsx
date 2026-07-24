import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalCompareReport from "./JournalCompareReport";
import type { JournalReportTradeInput } from "@/lib/journal/journalStats";

const baseTrades: JournalReportTradeInput[] = [
  {
    status: "closed",
    direction: "long",
    openedAt: "2026-06-01T14:00:00.000Z",
    closedAt: "2026-06-01T16:00:00.000Z",
    netPnL: 100,
    rating: 5,
    plannedRiskMode: "usd",
    plannedRiskValue: 50,
    plannedRiskUsd: 50,
  },
  {
    status: "closed",
    direction: "short",
    openedAt: "2026-06-02T14:00:00.000Z",
    closedAt: "2026-06-02T16:00:00.000Z",
    netPnL: -40,
    rating: 2,
  },
];

describe("JournalCompareReport", () => {
  it("renders wins vs losses by default", () => {
    render(<JournalCompareReport baseTrades={baseTrades} />);
    expect(screen.getByTestId("journal-compare-a")).toHaveTextContent("Wins");
    expect(screen.getByTestId("journal-compare-b")).toHaveTextContent("Losses");
    expect(screen.getByTestId("journal-compare-a")).toHaveTextContent("$100.00");
    expect(screen.getByTestId("journal-compare-b")).toHaveTextContent("-$40.00");
  });

  it("switches to high vs low rating preset", () => {
    render(<JournalCompareReport baseTrades={baseTrades} />);
    fireEvent.click(screen.getByTestId("journal-compare-preset-high_vs_low_rating"));
    expect(screen.getByTestId("journal-compare-a")).toHaveTextContent("Rating 4–5");
    expect(screen.getByTestId("journal-compare-b")).toHaveTextContent("Rating 1–2");
  });

  it("shows empty state when no trades match", () => {
    render(<JournalCompareReport baseTrades={[]} />);
    expect(screen.getByTestId("journal-compare-empty")).toBeInTheDocument();
  });
});
