import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalPnLAreaChart from "./JournalPnLAreaChart";

describe("JournalPnLAreaChart", () => {
  it("renders area chart with axes", () => {
    render(
      <JournalPnLAreaChart
        points={[
          { id: "a", value: -30 },
          { id: "b", value: 70, tooltipTitle: "Trade 2", tooltipValue: "$70" },
        ]}
        testId="journal-day-pnl"
        xStartLabel="Start"
        xEndLabel="End"
      />,
    );
    expect(screen.getByTestId("journal-day-pnl-svg")).toBeInTheDocument();
    expect(screen.getByTestId("journal-day-pnl-area")).toBeInTheDocument();
    expect(screen.getAllByTestId("journal-day-pnl-y-label").length).toBeGreaterThan(0);
    expect(screen.getByTestId("journal-day-pnl-x-start")).toHaveTextContent("Start");
    expect(screen.getByTestId("journal-day-pnl-x-end")).toHaveTextContent("End");
  });

  it("shows hover tooltip on point hover", () => {
    render(
      <JournalPnLAreaChart
        points={[{ id: "a", value: 100, tooltipTitle: "Point A", tooltipValue: "$100" }]}
        testId="journal-day-pnl"
      />,
    );
    fireEvent.mouseEnter(screen.getByTestId("journal-day-pnl-point-a"));
    expect(screen.getByTestId("journal-day-pnl-hover-tooltip")).toHaveTextContent("Point A");
    expect(screen.getByTestId("journal-day-pnl-hover-tooltip")).toHaveTextContent("$100");
  });

  it("returns null when points are empty", () => {
    const { container } = render(<JournalPnLAreaChart points={[]} testId="journal-day-pnl" />);
    expect(container).toBeEmptyDOMElement();
  });
});
