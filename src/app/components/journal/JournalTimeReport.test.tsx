import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalTimeReport from "./JournalTimeReport";

const hourRows = [
  { bucket: "09:00", tradeCount: 2, winRate: 0.5, netPnL: 100, profitFactor: 2 },
];

const weekdayRows = [
  { bucket: "Mon", tradeCount: 1, winRate: 1, netPnL: 80, profitFactor: null },
];

describe("JournalTimeReport", () => {
  it("renders hour rows by default", () => {
    render(<JournalTimeReport hourRows={hourRows} weekdayRows={weekdayRows} />);
    expect(screen.getByTestId("journal-time-row-09:00")).toBeInTheDocument();
  });

  it("switches to weekday tab", () => {
    render(<JournalTimeReport hourRows={hourRows} weekdayRows={weekdayRows} />);
    fireEvent.click(screen.getByTestId("journal-time-weekday"));
    expect(screen.getByTestId("journal-time-row-Mon")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<JournalTimeReport hourRows={[]} weekdayRows={[]} />);
    expect(screen.getByTestId("journal-time-empty")).toBeInTheDocument();
  });
});
