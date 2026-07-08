import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalEquityChart from "./JournalEquityChart";

const samplePoints = [
  { date: "2026-06-01", tradePnL: -30, cumulativePnL: -30 },
  { date: "2026-06-02", tradePnL: 100, cumulativePnL: 70 },
];

describe("JournalEquityChart", () => {
  it("renders area chart with axes for points", () => {
    render(<JournalEquityChart points={samplePoints} />);
    expect(screen.getByTestId("journal-equity-svg")).toBeInTheDocument();
    expect(screen.getByTestId("journal-equity-area")).toBeInTheDocument();
    expect(screen.getByTestId("journal-equity-line")).toBeInTheDocument();
    expect(screen.getAllByTestId("journal-equity-y-label").length).toBeGreaterThan(0);
    expect(screen.getByTestId("journal-equity-x-start")).toHaveTextContent("06/01/26");
    expect(screen.getByTestId("journal-equity-x-end")).toHaveTextContent("06/02/26");
  });

  it("shows info help icon", () => {
    render(<JournalEquityChart points={samplePoints} />);
    expect(screen.getByTestId("journal-equity-help")).toBeInTheDocument();
    expect(screen.getByLabelText("Equity curve help")).toBeInTheDocument();
  });

  it("shows hover tooltip on point hover", () => {
    render(<JournalEquityChart points={samplePoints} />);
    fireEvent.mouseEnter(screen.getByTestId("journal-equity-point-2026-06-01"));
    expect(screen.getByTestId("journal-equity-hover-tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("journal-equity-hover-tooltip")).toHaveTextContent("06/01/2026");
    expect(screen.getByTestId("journal-equity-hover-tooltip")).toHaveTextContent("-$30");
  });

  it("shows empty state with help icon", () => {
    render(<JournalEquityChart points={[]} />);
    expect(screen.getByTestId("journal-equity-empty")).toBeInTheDocument();
    expect(screen.getByTestId("journal-equity-help")).toBeInTheDocument();
  });
});
