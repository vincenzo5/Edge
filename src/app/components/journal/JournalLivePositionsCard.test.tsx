import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import JournalLivePositionsCard from "@/app/components/journal/JournalLivePositionsCard";

describe("JournalLivePositionsCard", () => {
  it("renders live position rows with unrealized PnL from account snapshot", () => {
    render(
      <JournalLivePositionsCard
        positions={[
          {
            account: "U25026894",
            contract: { symbol: "F", secType: "STK", conId: 9599491 },
            position: 4,
            avgCost: 13.9554,
            unrealizedPNL: 125.5,
          },
        ]}
      />,
    );
    expect(screen.getByTestId("journal-open-positions-card-row-F")).toBeInTheDocument();
    expect(screen.getByText("F")).toBeInTheDocument();
    expect(screen.getByTestId("journal-open-positions-card-pnl-F")).toHaveTextContent("$125.50");
    expect(screen.getByTestId("journal-open-positions-card-pnl-F").className).toContain(
      "text-[var(--edge-positive)]",
    );
  });

  it("shows negative tone for losing unrealized PnL", () => {
    render(
      <JournalLivePositionsCard
        positions={[
          {
            account: "U25026894",
            contract: { symbol: "AAPL", secType: "STK" },
            position: -10,
            unrealizedPNL: -42.25,
          },
        ]}
      />,
    );
    expect(screen.getByTestId("journal-open-positions-card-pnl-AAPL")).toHaveTextContent("-$42.25");
    expect(screen.getByTestId("journal-open-positions-card-pnl-AAPL").className).toContain(
      "text-[var(--edge-negative)]",
    );
  });

  it("shows empty state when no positions", () => {
    render(<JournalLivePositionsCard positions={[]} />);
    expect(screen.getByText("No open positions on this account")).toBeInTheDocument();
  });
});
