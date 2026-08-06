import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import JournalTradeDetailHeaderSubtitle from "./JournalTradeDetailHeaderSubtitle";
import JournalTradeDetailHeaderTitle, {
  JournalTradeDetailHeaderMeta,
} from "./JournalTradeDetailHeaderTitle";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

const trade: JournalTradeResponse = {
  id: "t1",
  status: "closed",
  direction: "long",
  symbol: "AAPL",
  secType: "STK",
  openedAt: "2026-08-05T16:18:27.000Z",
  closedAt: "2026-08-05T16:21:26.000Z",
  netPnL: 100,
  fillExecIds: ["e1"],
  tags: [],
  setup: null,
  reviewNote: null,
  createdAt: "2026-08-05T16:18:27.000Z",
  updatedAt: "2026-08-05T16:21:26.000Z",
};

describe("JournalTradeDetailHeader", () => {
  it("shows only the symbol chart link in the title", () => {
    render(<JournalTradeDetailHeaderTitle trade={trade} />);
    expect(screen.getByTestId("journal-trade-detail-chart")).toHaveTextContent("AAPL");
    expect(screen.queryByTestId("journal-trade-detail-status")).not.toBeInTheDocument();
    expect(screen.queryByTestId("journal-trade-detail-direction")).not.toBeInTheDocument();
  });

  it("shows color-coded win status and pnl in the header meta for closed trades", () => {
    render(<JournalTradeDetailHeaderMeta trade={trade} />);
    const status = screen.getByTestId("journal-trade-detail-status");
    expect(status).toHaveAttribute("data-outcome", "win");
    expect(status).toHaveTextContent("WIN");
    expect(status).toHaveTextContent("$100.00");
    expect(status.className).toContain("--edge-positive");
  });

  it("shows color-coded loss status and pnl in the header meta", () => {
    render(<JournalTradeDetailHeaderMeta trade={{ ...trade, netPnL: -58 }} />);
    const status = screen.getByTestId("journal-trade-detail-status");
    expect(status).toHaveAttribute("data-outcome", "loss");
    expect(status).toHaveTextContent("LOSS");
    expect(status).toHaveTextContent("-$58.00");
    expect(status.className).toContain("--edge-negative");
  });

  it("shows open status without pnl for open trades", () => {
    render(
      <JournalTradeDetailHeaderMeta
        trade={{ ...trade, status: "open", closedAt: null, netPnL: null }}
      />,
    );
    const status = screen.getByTestId("journal-trade-detail-status");
    expect(status).toHaveAttribute("data-outcome", "open");
    expect(status).toHaveTextContent("OPEN");
    expect(status.textContent).not.toContain("$");
  });

  it("shows a color-coded bull mark for long in the header meta", () => {
    render(<JournalTradeDetailHeaderMeta trade={trade} />);
    const direction = screen.getByTestId("journal-trade-detail-direction");
    expect(direction).toHaveAttribute("data-direction", "long");
    expect(direction).toHaveAttribute("data-icon", "bull");
    expect(direction).toHaveAttribute("aria-label", "LONG");
    expect(direction.className).toContain("--edge-positive");
  });

  it("shows a color-coded bear mark for short in the header meta", () => {
    render(<JournalTradeDetailHeaderMeta trade={{ ...trade, direction: "short" }} />);
    const direction = screen.getByTestId("journal-trade-detail-direction");
    expect(direction).toHaveAttribute("data-direction", "short");
    expect(direction).toHaveAttribute("data-icon", "bear");
    expect(direction).toHaveAttribute("aria-label", "SHORT");
    expect(direction.className).toContain("--edge-negative");
  });

  it("renders open/close dates without clock times", () => {
    render(<JournalTradeDetailHeaderSubtitle trade={trade} />);
    const subtitle = screen.getByTestId("journal-trade-detail-subtitle");
    expect(subtitle).toHaveTextContent("08/05/2026");
    expect(subtitle.textContent).not.toMatch(/\d{2}:\d{2}/);
    expect(subtitle.textContent).not.toContain("Opened");
    expect(subtitle.textContent).not.toContain("Closed");
    expect(subtitle.textContent).not.toContain("ET");
    expect(screen.getByLabelText("Opened 08/05/2026")).toBeInTheDocument();
    expect(screen.getByLabelText("Closed 08/05/2026")).toBeInTheDocument();
  });
});
