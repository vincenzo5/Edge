import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalBreakdownReport from "./JournalBreakdownReport";

const setupRows = [
  { bucket: "breakout", tradeCount: 2, winRate: 0.5, netPnL: 100, profitFactor: 2 },
];

const tagRows = [
  { bucket: "planned", tradeCount: 1, winRate: 1, netPnL: 80, profitFactor: null },
];

const ratingRows = [
  { bucket: "5", tradeCount: 1, winRate: 1, netPnL: 120, profitFactor: null },
];

describe("JournalBreakdownReport", () => {
  it("renders setup rows by default", () => {
    render(
      <JournalBreakdownReport setupRows={setupRows} tagRows={tagRows} ratingRows={ratingRows} />,
    );
    expect(screen.getByTestId("journal-breakdown-row-breakout")).toBeInTheDocument();
  });

  it("switches to tag tab", () => {
    render(
      <JournalBreakdownReport setupRows={setupRows} tagRows={tagRows} ratingRows={ratingRows} />,
    );
    fireEvent.click(screen.getByTestId("journal-breakdown-tags"));
    expect(screen.getByTestId("journal-breakdown-row-planned")).toBeInTheDocument();
  });

  it("switches to rating tab", () => {
    render(
      <JournalBreakdownReport setupRows={setupRows} tagRows={tagRows} ratingRows={ratingRows} />,
    );
    fireEvent.click(screen.getByTestId("journal-breakdown-rating"));
    expect(screen.getByTestId("journal-breakdown-row-5")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<JournalBreakdownReport setupRows={[]} tagRows={[]} ratingRows={[]} />);
    expect(screen.getByTestId("journal-breakdown-empty")).toBeInTheDocument();
  });
});
