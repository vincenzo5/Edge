import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import JournalSummaryCards from "./JournalSummaryCards";
import { TileDensityOverrideProvider } from "@/app/components/app-workspace/TileDensityContext";
import type {
  JournalDashboardMetrics,
  JournalStats,
  JournalTradeFrequency,
} from "@/lib/journal/journalStats";
import { JOURNAL_UI_STATE_STORAGE_KEY } from "@/lib/journal/journalUiStatePreference";

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

const defaultDashboardMetrics: JournalDashboardMetrics = {
  startingEquity: accountEquity - stats.netPnL,
  equityChangeUsd: stats.netPnL,
  equityChangePct: stats.netPnL / (accountEquity - stats.netPnL),
  drawdown: {
    maxDdUsd: 180,
    maxDdPct: 180 / (accountEquity - stats.netPnL),
    currentDdUsd: 130,
  },
  rStats: {
    netR: 2.5,
    expectancyR: 0.45,
    avgWinR: 1.2,
    avgLossR: -0.8,
    maxDdR: 1.5,
    tradeCountWithR: 6,
  },
};

const defaultFrequency: JournalTradeFrequency = {
  tradesPerWeek: 2.5,
  tradesPerMonth: 10.9,
  elapsedDays: 7,
};

function renderCards(
  statsOverrides: Partial<JournalStats> = {},
  equity: number | null = accountEquity,
  dashboardMetricsOverrides: Partial<JournalDashboardMetrics> = {},
  density: { mode: "compact" | "standard" | "wide"; width: number } = {
    mode: "wide",
    width: 1200,
  },
  frequency: JournalTradeFrequency = defaultFrequency,
) {
  const mergedStats = { ...stats, ...statsOverrides };
  const dashboardMetrics: JournalDashboardMetrics = {
    ...defaultDashboardMetrics,
    ...dashboardMetricsOverrides,
    drawdown: {
      ...defaultDashboardMetrics.drawdown,
      ...dashboardMetricsOverrides.drawdown,
    },
    rStats: {
      ...defaultDashboardMetrics.rStats,
      ...dashboardMetricsOverrides.rStats,
    },
  };

  if (equity == null) {
    dashboardMetrics.startingEquity = null;
    dashboardMetrics.equityChangeUsd =
      dashboardMetricsOverrides.equityChangeUsd ?? mergedStats.netPnL;
    dashboardMetrics.equityChangePct = null;
  } else if (dashboardMetricsOverrides.startingEquity === undefined) {
    dashboardMetrics.startingEquity = equity - mergedStats.netPnL;
    dashboardMetrics.equityChangeUsd =
      dashboardMetricsOverrides.equityChangeUsd ??
      equity - dashboardMetrics.startingEquity;
    dashboardMetrics.equityChangePct =
      dashboardMetrics.startingEquity > 0
        ? dashboardMetrics.equityChangeUsd / dashboardMetrics.startingEquity
        : null;
  } else if (dashboardMetricsOverrides.equityChangeUsd === undefined) {
    dashboardMetrics.equityChangeUsd = equity - (dashboardMetrics.startingEquity ?? 0);
  }

  return render(
    <TileDensityOverrideProvider mode={density.mode} width={density.width}>
      <JournalSummaryCards
        stats={mergedStats}
        accountEquity={equity}
        dashboardMetrics={dashboardMetrics}
        frequency={frequency}
      />
    </TileDensityOverrideProvider>,
  );
}

describe("JournalSummaryCards", () => {
  beforeEach(() => {
    localStorage.removeItem(JOURNAL_UI_STATE_STORAGE_KEY);
    vi.useFakeTimers();
  });

  afterEach(() => {
    localStorage.removeItem(JOURNAL_UI_STATE_STORAGE_KEY);
    vi.useRealTimers();
  });

  it("renders Expected value hero card with dollar mode by default", () => {
    renderCards();
    expect(screen.getByText("Expected value")).toBeInTheDocument();
    expect(screen.queryByText("Avg win/loss")).not.toBeInTheDocument();
    expect(screen.getByTestId("journal-expected-value")).toHaveTextContent("$45.00");
    expect(screen.getByTestId("journal-avg-win-loss-label-win")).toHaveTextContent("$120.00");
    expect(screen.getByTestId("journal-avg-win-loss-label-loss")).toHaveTextContent("-$80.00");
    expect(screen.getByTestId("journal-expected-value-card").className).toContain("md:col-span-2");
  });

  it("renders positive expected value tone", () => {
    renderCards();

    const value = screen.getByTestId("journal-expected-value");
    expect(value.className).toContain("text-[var(--edge-positive)]");
  });

  it("renders negative expected value tone", () => {
    renderCards({ expectancy: -25, avgWin: 50, avgLoss: -100 });

    const value = screen.getByTestId("journal-expected-value");
    expect(value).toHaveTextContent("-$25.00");
    expect(value.className).toContain("text-[var(--edge-negative)]");
  });

  it("switches expected value card to percent mode", () => {
    renderCards({}, accountEquity, { startingEquity: 10_000, equityChangePct: 0.042 });

    fireEvent.click(screen.getByRole("tab", { name: "%" }));
    expect(screen.getByTestId("journal-expected-value")).toHaveTextContent("+0.5%");
    expect(screen.getByTestId("journal-avg-win-loss-label-win")).toHaveTextContent("+1.2%");
  });

  it("switches expected value card to R mode", () => {
    renderCards();

    fireEvent.click(screen.getByRole("tab", { name: "R" }));
    expect(screen.getByTestId("journal-expected-value")).toHaveTextContent("+0.45R");
    expect(screen.getByTestId("journal-avg-win-loss-label-win")).toHaveTextContent("+1.2R");
  });

  it("shows Expected value help tooltip after hover delay", () => {
    renderCards();

    fireEvent.mouseEnter(screen.getByLabelText("Expected value help"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Average profit or loss per trade in the current scope (expectancy).",
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

    const pill = screen.getByTestId("journal-expected-value-hover-pill");
    expect(pill).toHaveTextContent("");

    fireEvent.mouseEnter(screen.getByTestId("journal-avg-win-loss-segment-win"));
    expect(pill).toHaveTextContent("$120.00 Avg Win");
  });

  it("shows avg loss hover pill when loss segment is hovered", () => {
    renderCards();

    const pill = screen.getByTestId("journal-expected-value-hover-pill");
    fireEvent.mouseEnter(screen.getByTestId("journal-avg-win-loss-segment-loss"));
    expect(pill).toHaveTextContent("-$80.00 Avg Loss");
  });

  it("renders empty expected value state when only wins exist", () => {
    renderCards({
      closedCount: 2,
      winCount: 2,
      lossCount: 0,
      winRate: 1,
      avgLoss: null,
      expectancy: null,
    });

    expect(screen.getByTestId("journal-expected-value")).toHaveTextContent("—");
    expect(screen.getByTestId("journal-avg-win-loss-segment-win")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-avg-win-loss-segment-loss")).not.toBeInTheDocument();
    expect(screen.getByTestId("journal-avg-win-loss-label-loss")).toHaveTextContent("—");
  });

  it("renders account equity hero card with percent and R secondary lines", () => {
    renderCards();

    expect(screen.getByText("Account equity")).toBeInTheDocument();
    const equityValue = screen.getByTestId("journal-account-equity-value");
    expect(equityValue).toHaveTextContent("$125,430.00");
    expect(equityValue.className).toContain("text-[var(--edge-text-strong)]");

    const pnlSuffix = screen.getByTestId("journal-net-pnl-suffix");
    expect(pnlSuffix).toHaveTextContent("$420.00");
    expect(pnlSuffix.className).toContain("text-[var(--edge-positive)]");
    expect(screen.getByTestId("journal-equity-change-pct")).toHaveTextContent("+0.3%");
    expect(screen.getByTestId("journal-equity-net-r")).toHaveTextContent("+2.5R");
    expect(screen.getByTestId("journal-net-pnl-closed-count")).toHaveTextContent("8 trades");
    expect(screen.getByTestId("journal-trade-pace")).toHaveTextContent("2.5/wk · 10.9/mo");
    expect(screen.getByTestId("journal-account-equity-card").className).toContain("md:col-span-2");
  });

  it("renders capital-base equity change dollars and percent", () => {
    renderCards({}, 36_648.17, {
      startingEquity: 28_000,
      equityChangeUsd: 8_648.17,
      equityChangePct: 8_648.17 / 28_000,
    });

    expect(screen.getByTestId("journal-net-pnl-suffix")).toHaveTextContent("$8.65K");
    expect(screen.getByTestId("journal-equity-change-pct")).toHaveTextContent("+30.9%");
  });

  it("renders empty trade pace placeholders when frequency is missing", () => {
    renderCards({}, accountEquity, {}, { mode: "wide", width: 1200 }, {
      tradesPerWeek: null,
      tradesPerMonth: null,
      elapsedDays: null,
    });
    expect(screen.getByTestId("journal-trade-pace")).toHaveTextContent("— /wk · — /mo");
  });

  it("flashes green when account equity increases", () => {
    const { rerender } = renderCards({}, accountEquity);

    expect(screen.getByTestId("journal-account-equity-value")).not.toHaveAttribute("data-flash");

    rerender(
      <TileDensityOverrideProvider mode="wide" width={1200}>
        <JournalSummaryCards
          stats={stats}
          accountEquity={accountEquity + 100}
          dashboardMetrics={defaultDashboardMetrics}
        />
      </TileDensityOverrideProvider>,
    );

    const equityValue = screen.getByTestId("journal-account-equity-value");
    expect(equityValue).toHaveAttribute("data-flash", "up");
    expect(equityValue.className).toContain("text-[var(--edge-positive)]");

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(equityValue).not.toHaveAttribute("data-flash");
    expect(equityValue.className).toContain("text-[var(--edge-text-strong)]");
  });

  it("flashes red when account equity decreases", () => {
    const { rerender } = renderCards({}, accountEquity);

    rerender(
      <TileDensityOverrideProvider mode="wide" width={1200}>
        <JournalSummaryCards
          stats={stats}
          accountEquity={accountEquity - 50}
          dashboardMetrics={defaultDashboardMetrics}
        />
      </TileDensityOverrideProvider>,
    );

    const equityValue = screen.getByTestId("journal-account-equity-value");
    expect(equityValue).toHaveAttribute("data-flash", "down");
    expect(equityValue.className).toContain("text-[var(--edge-negative)]");
  });

  it("does not flash on first equity paint", () => {
    renderCards({}, accountEquity);
    expect(screen.getByTestId("journal-account-equity-value")).not.toHaveAttribute("data-flash");
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
    expect(screen.getByTestId("journal-equity-change-pct")).toHaveTextContent("—");
    expect(screen.getByTestId("journal-net-pnl-suffix")).toHaveTextContent("$420.00");
  });

  it("shows em dash for net R when no planned risk trades", () => {
    renderCards({}, accountEquity, {
      rStats: {
        netR: null,
        expectancyR: null,
        avgWinR: null,
        avgLossR: null,
        maxDdR: null,
        tradeCountWithR: 0,
      },
    });

    expect(screen.getByTestId("journal-equity-net-r")).toHaveTextContent("—");
  });

  it("renders Trade win % hero card with formatted percent", () => {
    renderCards();

    expect(screen.getByText("Trade win %")).toBeInTheDocument();
    expect(screen.getByTestId("journal-win-rate-value")).toHaveTextContent("62.5%");
    expect(screen.getByTestId("journal-win-rate-card").className).toContain("md:col-span-2");
  });

  it("renders max drawdown hero card with percent and R secondary lines", () => {
    renderCards();

    expect(screen.getByText("Max drawdown")).toBeInTheDocument();
    expect(screen.getByTestId("journal-drawdown-value")).toHaveTextContent("-$180.00");
    expect(screen.getByTestId("journal-drawdown-pct")).toHaveTextContent("0.1%");
    expect(screen.getByTestId("journal-drawdown-r")).toHaveTextContent("-1.5R");
    expect(screen.getByTestId("journal-drawdown-bar-fill")).toBeInTheDocument();
    expect(screen.getByTestId("journal-drawdown-card").className).toContain("md:col-span-2");
  });

  it("renders empty drawdown state when no decline", () => {
    renderCards({}, accountEquity, {
      drawdown: { maxDdUsd: 0, maxDdPct: null, currentDdUsd: 0 },
      rStats: {
        netR: null,
        expectancyR: null,
        avgWinR: null,
        avgLossR: null,
        maxDdR: null,
        tradeCountWithR: 0,
      },
    });

    expect(screen.getByTestId("journal-drawdown-value")).toHaveTextContent("—");
    expect(screen.queryByTestId("journal-drawdown-bar-fill")).not.toBeInTheDocument();
  });

  it("does not render profit factor card", () => {
    renderCards();
    expect(screen.queryByText("Profit factor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("journal-profit-factor-card")).not.toBeInTheDocument();
  });
});
