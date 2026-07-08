import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import JournalSummaryCards from "./JournalSummaryCards";
import type { JournalStats } from "@/lib/journal/journalStats";

const stats: JournalStats = {
  tradeCount: 10,
  closedCount: 8,
  winCount: 5,
  lossCount: 3,
  winRate: 0.625,
  netPnL: 420,
  grossPnL: 450,
  avgWin: 120,
  avgLoss: -80,
  totalProfit: 600,
  totalLoss: -240,
  profitFactor: 2.5,
  expectancy: 45,
};

const accountEquity = 125_430;

function renderCards(
  statsOverrides: Partial<JournalStats> = {},
  equity: number | null = accountEquity,
) {
  return render(
    <JournalSummaryCards stats={{ ...stats, ...statsOverrides }} accountEquity={equity} />,
  );
}

describe("JournalSummaryCards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders Avg win/loss trade hero card with expectancy and compact bar labels", () => {
    renderCards();
    expect(screen.getByText("Avg win/loss trade")).toBeInTheDocument();
    expect(screen.queryByText("Expectancy")).not.toBeInTheDocument();
    expect(screen.queryByText("Avg win")).not.toBeInTheDocument();
    expect(screen.queryByText("Avg loss")).not.toBeInTheDocument();
    expect(screen.getByTestId("journal-avg-win-loss-expectancy")).toHaveTextContent("$45.00");
    expect(screen.getByTestId("journal-avg-win-loss-label-win")).toHaveTextContent("$120.00");
    expect(screen.getByTestId("journal-avg-win-loss-label-loss")).toHaveTextContent("-$80.00");
    expect(screen.getByTestId("journal-avg-win-loss-card").className).toContain("md:col-span-2");
  });

  it("renders positive expectancy tone", () => {
    renderCards();

    const value = screen.getByTestId("journal-avg-win-loss-expectancy");
    expect(value.className).toContain("text-[var(--edge-positive)]");
  });

  it("renders negative expectancy tone", () => {
    renderCards({ expectancy: -25, avgWin: 50, avgLoss: -100 });

    const value = screen.getByTestId("journal-avg-win-loss-expectancy");
    expect(value).toHaveTextContent("-$25.00");
    expect(value.className).toContain("text-[var(--edge-negative)]");
  });

  it("shows Avg win/loss trade help tooltip after hover delay", () => {
    renderCards();

    fireEvent.mouseEnter(screen.getByLabelText("Avg win/loss trade help"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "The average profit on all winning and losing trades.",
    );
  });

  it("renders bar segments proportional to avg win and loss magnitudes", () => {
    renderCards();

    expect(screen.getByTestId("journal-avg-win-loss-segment-win")).toBeInTheDocument();
    expect(screen.getByTestId("journal-avg-win-loss-segment-loss")).toBeInTheDocument();
    expect(screen.getByTestId("journal-avg-win-loss-segment-win")).toHaveStyle({
      width: "60%",
    });
    expect(screen.getByTestId("journal-avg-win-loss-segment-loss")).toHaveStyle({
      width: "40%",
    });
  });

  it("shows avg win hover pill when win segment is hovered", () => {
    renderCards();

    const pill = screen.getByTestId("journal-avg-win-loss-hover-pill");
    expect(pill).toHaveTextContent("");

    fireEvent.mouseEnter(screen.getByTestId("journal-avg-win-loss-segment-win"));
    expect(pill).toHaveTextContent("$120.00 Avg Win");
  });

  it("shows avg loss hover pill when loss segment is hovered", () => {
    renderCards();

    const pill = screen.getByTestId("journal-avg-win-loss-hover-pill");
    fireEvent.mouseEnter(screen.getByTestId("journal-avg-win-loss-segment-loss"));
    expect(pill).toHaveTextContent("-$80.00 Avg Loss");
  });

  it("renders empty avg win/loss state when only wins exist", () => {
    renderCards({
      closedCount: 2,
      winCount: 2,
      lossCount: 0,
      winRate: 1,
      avgLoss: null,
      expectancy: null,
    });

    expect(screen.getByTestId("journal-avg-win-loss-expectancy")).toHaveTextContent("—");
    expect(screen.getByTestId("journal-avg-win-loss-segment-win")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-avg-win-loss-segment-loss")).not.toBeInTheDocument();
    expect(screen.getByTestId("journal-avg-win-loss-label-loss")).toHaveTextContent("—");
  });

  it("renders empty avg win/loss state when only losses exist", () => {
    renderCards({
      closedCount: 2,
      winCount: 0,
      lossCount: 2,
      winRate: 0,
      avgWin: null,
      expectancy: null,
    });

    expect(screen.getByTestId("journal-avg-win-loss-expectancy")).toHaveTextContent("—");
    expect(screen.queryByTestId("journal-avg-win-loss-segment-win")).not.toBeInTheDocument();
    expect(screen.getByTestId("journal-avg-win-loss-segment-loss")).toBeInTheDocument();
    expect(screen.getByTestId("journal-avg-win-loss-label-win")).toHaveTextContent("—");
  });

  it("renders account equity hero card with strong tone and closed trade count", () => {
    renderCards();

    expect(screen.getByText("Account equity")).toBeInTheDocument();
    const equityValue = screen.getByTestId("journal-account-equity-value");
    expect(equityValue).toHaveTextContent("$125,430.00");
    expect(equityValue.className).toContain("text-[var(--edge-text-strong)]");
    expect(equityValue.className).not.toContain("text-[var(--edge-positive)]");
    expect(equityValue.className).not.toContain("text-[var(--edge-negative)]");

    const pnlSuffix = screen.getByTestId("journal-net-pnl-suffix");
    expect(pnlSuffix).toHaveTextContent("$420.00");
    expect(pnlSuffix.className).toContain("text-[var(--edge-positive)]");
    expect(screen.getByTestId("journal-net-pnl-closed-count")).toHaveTextContent("8 trades");
    expect(screen.getByTestId("journal-account-equity-card").className).toContain("md:col-span-2");
  });

  it("renders negative Net P&L suffix with negative tone", () => {
    renderCards({ netPnL: -125.5 });

    const pnlSuffix = screen.getByTestId("journal-net-pnl-suffix");
    expect(pnlSuffix).toHaveTextContent("-$125.50");
    expect(pnlSuffix.className).toContain("text-[var(--edge-negative)]");
  });

  it("renders em dash for account equity when disconnected", () => {
    renderCards({}, null);

    expect(screen.getByTestId("journal-account-equity-value")).toHaveTextContent("—");
    expect(screen.getByTestId("journal-net-pnl-suffix")).toHaveTextContent("$420.00");
  });

  it("shows Account equity help tooltip after hover delay", () => {
    renderCards();

    fireEvent.mouseEnter(screen.getByLabelText("Account equity help"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Total portfolio value (net liquidation) from your connected IB account.",
    );
  });

  it("shows Net P&L help tooltip after hover delay", () => {
    renderCards();

    fireEvent.mouseEnter(screen.getByLabelText("Net P&L help"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "The total realized net profit and loss for all closed trades.",
    );
  });

  it("reveals Total Trades hover pill on card hover", () => {
    renderCards();

    const pill = screen.getByTestId("journal-account-equity-hover-pill");
    expect(pill).toHaveTextContent("Total Trades");
    expect(pill.className).toContain("opacity-0");

    fireEvent.mouseEnter(screen.getByTestId("journal-account-equity-card"));
    expect(pill.className).toContain("group-hover:opacity-100");
  });

  it("renders Trade win % hero card with formatted percent", () => {
    renderCards();

    expect(screen.getByText("Trade win %")).toBeInTheDocument();
    expect(screen.queryByText("Win rate")).not.toBeInTheDocument();
    expect(screen.getByTestId("journal-win-rate-value")).toHaveTextContent("62.5%");
    expect(screen.getByTestId("journal-win-rate-card").className).toContain("md:col-span-2");
  });

  it("renders win, breakeven, and loss count badges", () => {
    renderCards();

    expect(screen.getByTestId("journal-win-rate-badge-win")).toHaveTextContent("5");
    expect(screen.getByTestId("journal-win-rate-badge-breakeven")).toHaveTextContent("0");
    expect(screen.getByTestId("journal-win-rate-badge-loss")).toHaveTextContent("3");
  });

  it("renders breakeven badge when closed trades break even", () => {
    renderCards({
      closedCount: 3,
      winCount: 1,
      lossCount: 1,
      winRate: 1 / 3,
    });

    expect(screen.getByTestId("journal-win-rate-badge-breakeven")).toHaveTextContent("1");
  });

  it("shows Trade win % help tooltip after hover delay", () => {
    renderCards();

    fireEvent.mouseEnter(screen.getByLabelText("Trade win % help"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Reflects the percentage of your winning trades out of total trades taken.",
    );
  });

  it("shows outcome hover pill when gauge segment is hovered", () => {
    renderCards();

    const pill = screen.getByTestId("journal-win-rate-hover-pill");
    expect(pill).toHaveTextContent("");

    fireEvent.mouseEnter(screen.getByTestId("journal-win-rate-hit-win"));
    expect(pill).toHaveTextContent("5 Winning Trades");
  });

  it("renders gauge segments proportional to win and loss counts", () => {
    renderCards({
      closedCount: 2,
      winCount: 1,
      lossCount: 1,
      winRate: 0.5,
    });

    expect(screen.getByTestId("journal-win-rate-segment-win")).toBeInTheDocument();
    expect(screen.getByTestId("journal-win-rate-segment-loss")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-win-rate-segment-breakeven")).not.toBeInTheDocument();
  });

  it("renders empty win rate state when no closed trades", () => {
    renderCards({
      closedCount: 0,
      winCount: 0,
      lossCount: 0,
      winRate: null,
    });

    expect(screen.getByTestId("journal-win-rate-value")).toHaveTextContent("—");
    expect(screen.getByTestId("journal-win-rate-badge-win")).toHaveTextContent("0");
    expect(screen.getByTestId("journal-win-rate-badge-breakeven")).toHaveTextContent("0");
    expect(screen.getByTestId("journal-win-rate-badge-loss")).toHaveTextContent("0");
    expect(screen.queryByTestId("journal-win-rate-hit-win")).not.toBeInTheDocument();
  });

  it("renders Profit factor hero card with formatted value", () => {
    renderCards();

    expect(screen.getByText("Profit factor")).toBeInTheDocument();
    expect(screen.getByTestId("journal-profit-factor-value")).toHaveTextContent("2.50");
    expect(screen.getByTestId("journal-profit-factor-card").className).toContain(
      "md:col-span-2",
    );
  });

  it("shows Profit factor help tooltip after hover delay", () => {
    renderCards();

    fireEvent.mouseEnter(screen.getByLabelText("Profit factor help"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Total profits divided by total losses. A profit factor above 1.0 indicates a profitable trading system.",
    );
  });

  it("renders profit and loss donut segments proportional to totals", () => {
    renderCards();

    expect(screen.getByTestId("journal-profit-factor-segment-profit")).toBeInTheDocument();
    expect(screen.getByTestId("journal-profit-factor-segment-loss")).toBeInTheDocument();
  });

  it("shows total profit hover pill when value is hovered", () => {
    renderCards();

    const pill = screen.getByTestId("journal-profit-factor-hover-pill");
    expect(pill).toHaveTextContent("");

    fireEvent.mouseEnter(screen.getByTestId("journal-profit-factor-value"));
    expect(pill).toHaveTextContent("$600.00 Total Profit");
  });

  it("shows total loss hover pill when loss segment is hovered", () => {
    renderCards();

    const pill = screen.getByTestId("journal-profit-factor-hover-pill");
    fireEvent.mouseEnter(screen.getByTestId("journal-profit-factor-segment-loss"));
    expect(pill).toHaveTextContent("-$240.00 Total Loss");
  });

  it("renders empty profit factor state when no closed trades", () => {
    renderCards({
      closedCount: 0,
      winCount: 0,
      lossCount: 0,
      profitFactor: null,
      totalProfit: 0,
      totalLoss: 0,
    });

    expect(screen.getByTestId("journal-profit-factor-value")).toHaveTextContent("—");
    expect(screen.queryByTestId("journal-profit-factor-segment-profit")).not.toBeInTheDocument();
    expect(screen.queryByTestId("journal-profit-factor-segment-loss")).not.toBeInTheDocument();
  });
});
