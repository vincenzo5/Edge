import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/journal/dashboard",
}));

const sampleTrades = [
  {
    id: "t1",
    status: "closed" as const,
    direction: "long" as const,
    symbol: "AAPL",
    secType: "STK",
    openedAt: "2026-07-01T13:30:00.000Z",
    closedAt: "2026-07-01T16:00:00.000Z",
    netPnL: 100,
    avgEntry: 150,
    avgExit: 160,
    fillExecIds: ["e1"],
    tags: ["planned"],
    setup: "breakout" as const,
    reviewNote: null,
    createdAt: "2026-07-01T13:30:00.000Z",
    updatedAt: "2026-07-01T16:00:00.000Z",
  },
  {
    id: "t2",
    status: "closed" as const,
    direction: "short" as const,
    symbol: "MSFT",
    secType: "STK",
    openedAt: "2026-07-02T13:30:00.000Z",
    closedAt: "2026-07-02T16:00:00.000Z",
    netPnL: -40,
    fillExecIds: ["e2"],
    tags: ["fomo"],
    setup: "pullback" as const,
    reviewNote: null,
    createdAt: "2026-07-02T13:30:00.000Z",
    updatedAt: "2026-07-02T16:00:00.000Z",
  },
  {
    id: "t3",
    status: "open" as const,
    direction: "long" as const,
    symbol: "SPY",
    secType: "STK",
    openedAt: "2026-07-03T13:30:00.000Z",
    closedAt: null,
    netPnL: null,
    fillExecIds: ["e3"],
    tags: [],
    setup: null,
    reviewNote: null,
    createdAt: "2026-07-03T13:30:00.000Z",
    updatedAt: "2026-07-03T13:30:00.000Z",
  },
];

const loadTrades = vi.fn(async () => {});
const retryLoadTrades = vi.fn(async () => {});
const setAllTrades = vi.fn();

function mockJournalTrades(overrides: {
  loading?: boolean;
  error?: string | null;
  allTrades?: typeof sampleTrades;
} = {}) {
  return {
    loading: false,
    error: null,
    allTrades: sampleTrades,
    loadTrades,
    retryLoadTrades,
    setAllTrades,
    ...overrides,
  };
}

vi.mock("@/app/components/journal/JournalSyncProvider", () => ({
  useJournalSync: () => ({
    lastSyncedAt: null,
    syncing: false,
    syncNow: vi.fn(async () => {}),
  }),
}));

vi.mock("@/app/components/journal/JournalTradesProvider", () => ({
  useJournalTrades: vi.fn(() => mockJournalTrades()),
}));

import JournalDashboardView from "@/app/components/journal/JournalDashboardView";
import JournalTradesView from "@/app/components/journal/JournalTradesView";
import { useJournalTrades } from "@/app/components/journal/JournalTradesProvider";

describe("JournalDashboardView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useJournalTrades).mockReturnValue(mockJournalTrades());
  });

  it("renders dashboard with calendar, equity chart, and summary cards", () => {
    render(<JournalDashboardView />);
    expect(screen.getByTestId("journal-dashboard-view")).toBeInTheDocument();
    expect(screen.getByText("Avg win/loss trade")).toBeInTheDocument();
    expect(screen.getByTestId("journal-calendar")).toBeInTheDocument();
    expect(screen.getByTestId("journal-equity-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-trade-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("journal-breakdown-row-breakout")).not.toBeInTheDocument();
  });

  it("renders scope bar in sticky dashboard header without sync or import actions", () => {
    render(<JournalDashboardView />);
    const header = screen.getByText("Dashboard").closest("header");
    expect(header).not.toBeNull();
    expect(header!.className).toContain("sticky");
    expect(screen.getByTestId("journal-scope-bar")).toBeInTheDocument();
    expect(header).toContainElement(screen.getByTestId("journal-scope-bar"));
    expect(screen.getByTestId("journal-period-select")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-window-filters")).not.toBeInTheDocument();
    expect(screen.queryByText("Sync fills")).not.toBeInTheDocument();
    expect(screen.queryByText("Import")).not.toBeInTheDocument();
  });

  it("scopes recent trades to selected period but keeps open positions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T20:00:00.000Z"));

    render(<JournalDashboardView />);
    expect(screen.getByTestId("journal-recent-trades-card-row-t1")).toBeInTheDocument();
    expect(screen.getByTestId("journal-recent-trades-card-row-t2")).toBeInTheDocument();
    expect(screen.getByTestId("journal-open-positions-card-row-t3")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("journal-period-select"), { target: { value: "today" } });

    expect(screen.queryByTestId("journal-recent-trades-card-row-t1")).not.toBeInTheDocument();
    expect(screen.getByTestId("journal-recent-trades-card-row-t2")).toBeInTheDocument();
    expect(screen.getByTestId("journal-open-positions-card-row-t3")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("renders recent trades and open positions list cards", () => {
    render(<JournalDashboardView />);
    expect(screen.getByTestId("journal-recent-trades-card")).toBeInTheDocument();
    expect(screen.getByTestId("journal-open-positions-card")).toBeInTheDocument();
    expect(screen.getByTestId("journal-recent-trades-card-row-t1")).toBeInTheDocument();
    expect(screen.getByTestId("journal-open-positions-card-row-t3")).toBeInTheDocument();
  });

  it("opens trade detail drawer from recent trades card row", () => {
    render(<JournalDashboardView />);
    fireEvent.click(screen.getByTestId("journal-recent-trades-card-row-t1"));
    expect(screen.getByTestId("journal-trade-detail-drawer-panel")).toBeInTheDocument();
    expect(screen.getByTestId("journal-trade-detail-drawer-panel")).toHaveTextContent("AAPL");
  });

  it("shows loading skeleton without scoped empty flash when fetching", () => {
    vi.mocked(useJournalTrades).mockReturnValue(
      mockJournalTrades({ loading: true, allTrades: [] }),
    );
    render(<JournalDashboardView />);
    expect(screen.getByTestId("journal-page-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-equity-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("journal-global-empty")).not.toBeInTheDocument();
  });

  it("renders global empty state when no trades", () => {
    vi.mocked(useJournalTrades).mockReturnValue(
      mockJournalTrades({ loading: false, allTrades: [] }),
    );
    render(<JournalDashboardView />);
    expect(screen.getByTestId("journal-global-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-equity-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("journal-calendar")).not.toBeInTheDocument();
  });

  it("renders error state with retry when fetch fails", () => {
    vi.mocked(useJournalTrades).mockReturnValue(
      mockJournalTrades({
        loading: false,
        allTrades: [],
        error: "Could not load journal trades.",
      }),
    );
    render(<JournalDashboardView />);
    expect(screen.getByTestId("journal-content-error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retryLoadTrades).toHaveBeenCalled();
  });

  it("opens day summary modal when calendar day is clicked", () => {
    render(<JournalDashboardView />);
    fireEvent.click(screen.getByTestId("journal-calendar-day-2026-07-01"));
    expect(screen.getByTestId("journal-day-summary-modal")).toBeInTheDocument();
    expect(screen.getByTestId("journal-day-trades-row-t1")).toBeInTheDocument();
  });

  it("opens empty day summary modal for days without trades", () => {
    render(<JournalDashboardView />);
    fireEvent.click(screen.getByTestId("journal-calendar-day-2026-07-08"));
    expect(screen.getByTestId("journal-day-summary-modal")).toBeInTheDocument();
    expect(screen.getByTestId("journal-day-trades-empty")).toBeInTheDocument();
  });

  it("does not show trade detail before a row is selected", () => {
    render(<JournalDashboardView />);
    fireEvent.click(screen.getByTestId("journal-calendar-day-2026-07-01"));
    expect(screen.queryByTestId("journal-trade-detail-drawer-panel")).not.toBeInTheDocument();
  });

  it("opens slide-over trade detail from day summary row", () => {
    render(<JournalDashboardView />);
    fireEvent.click(screen.getByTestId("journal-calendar-day-2026-07-01"));
    fireEvent.click(screen.getByTestId("journal-day-trades-row-t1"));
    expect(screen.getByTestId("journal-trade-detail-drawer-panel")).toBeInTheDocument();
    expect(screen.getByTestId("journal-trade-detail-drawer-panel")).toHaveTextContent("AAPL");
    expect(screen.getByTestId("journal-trade-detail-drawer-panel")).toHaveTextContent("STK");
    expect(screen.getByTestId("journal-trade-detail")).toHaveTextContent("breakout");
  });

  it("closes slide-over trade detail from backdrop", () => {
    render(<JournalDashboardView />);
    fireEvent.click(screen.getByTestId("journal-calendar-day-2026-07-01"));
    fireEvent.click(screen.getByTestId("journal-day-trades-row-t1"));
    fireEvent.click(screen.getByTestId("journal-trade-detail-drawer-backdrop"));
    expect(screen.queryByTestId("journal-trade-detail-drawer-panel")).not.toBeInTheDocument();
  });
});

describe("JournalTradesView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useJournalTrades).mockReturnValue(mockJournalTrades());
  });

  it("shows loading skeleton on trades page when fetching", () => {
    vi.mocked(useJournalTrades).mockReturnValue(
      mockJournalTrades({ loading: true, allTrades: [] }),
    );
    render(<JournalTradesView />);
    expect(screen.getByTestId("journal-page-loading")).toHaveAttribute("data-variant", "trades");
    expect(screen.queryByTestId("journal-trades-table")).not.toBeInTheDocument();
  });

  it("shows global empty on trades page when no trades", () => {
    vi.mocked(useJournalTrades).mockReturnValue(
      mockJournalTrades({ loading: false, allTrades: [] }),
    );
    render(<JournalTradesView />);
    expect(screen.getByTestId("journal-global-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-trades-table")).not.toBeInTheDocument();
  });

  it("renders scope bar in sticky trades header", async () => {
    render(<JournalTradesView />);
    const header = screen.getByText("Trades").closest("header");
    expect(header).not.toBeNull();
    expect(header!.className).toContain("sticky");
    expect(screen.getByTestId("journal-scope-bar")).toBeInTheDocument();
    expect(header).toContainElement(screen.getByTestId("journal-scope-bar"));
    await screen.findByTestId("journal-trades-table");
  });

  it("renders dashboard hero summary cards above the trades table", async () => {
    render(<JournalTradesView />);

    expect(screen.getByTestId("journal-summary-cards")).toBeInTheDocument();
    expect(screen.getByText("Account equity")).toBeInTheDocument();
    expect(screen.getByText("Trade win %")).toBeInTheDocument();
    expect(screen.getByText("Profit factor")).toBeInTheDocument();
    expect(screen.getByText("Avg win/loss trade")).toBeInTheDocument();
    await screen.findByTestId("journal-trades-table");
  });

  it("renders expanded trades table columns", async () => {
    render(<JournalTradesView />);
    expect(screen.getByTestId("journal-trades-view")).toBeInTheDocument();
    expect(await screen.findByTestId("journal-trades-table")).toBeInTheDocument();
    expect(screen.getByText("Open date")).toBeInTheDocument();
    expect(screen.getByText("Entry")).toBeInTheDocument();
    expect(screen.getByText("Exit")).toBeInTheDocument();
    expect(screen.getByTestId("journal-trade-status-win")).toBeInTheDocument();
    expect(screen.getByTestId("journal-trade-status-loss")).toBeInTheDocument();
    expect(screen.getByTestId("journal-trade-status-open")).toBeInTheDocument();
  });

  it("does not show trade detail before a row is selected", async () => {
    render(<JournalTradesView />);
    await screen.findByTestId("journal-trades-table");
    expect(screen.queryByTestId("journal-trade-detail-drawer-panel")).not.toBeInTheDocument();
  });

  it("opens slide-over trade detail when a trades row is selected", async () => {
    render(<JournalTradesView />);
    await screen.findByTestId("journal-trades-row-t1");
    fireEvent.click(screen.getByTestId("journal-trades-row-t1"));
    expect(screen.getByTestId("journal-trade-detail-drawer-panel")).toBeInTheDocument();
    expect(screen.getByTestId("journal-trade-detail-drawer-panel")).toHaveTextContent("AAPL");
  });

  it("sorts by activity desc by default (most recent first)", async () => {
    render(<JournalTradesView />);
    await screen.findByTestId("journal-trades-table");
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveAttribute("data-testid", "journal-trades-row-t3");
    expect(rows[1]).toHaveAttribute("data-testid", "journal-trades-row-t2");
    expect(rows[2]).toHaveAttribute("data-testid", "journal-trades-row-t1");
  });

  it("reorders rows when a sortable header is clicked", async () => {
    render(<JournalTradesView />);
    await screen.findByTestId("journal-trades-table");
    fireEvent.click(screen.getByTestId("journal-trades-sort-symbol"));
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveAttribute("data-testid", "journal-trades-row-t3");
    expect(rows[1]).toHaveAttribute("data-testid", "journal-trades-row-t2");
    expect(rows[2]).toHaveAttribute("data-testid", "journal-trades-row-t1");
  });

  it("shows filtered empty state when filters match nothing", async () => {
    render(<JournalTradesView />);
    await screen.findByTestId("journal-trades-table");
    fireEvent.change(screen.getByTestId("journal-filter-symbol"), { target: { value: "ZZZ" } });
    expect(screen.getByTestId("journal-trades-filtered-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-trades-table-controls")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Clear filters"));
    expect(await screen.findByTestId("journal-trades-table")).toBeInTheDocument();
  });

  it("paginates trades and updates result count", async () => {
    const manyTrades = Array.from({ length: 30 }, (_, index) => ({
      id: `bulk-${index}`,
      status: "closed" as const,
      direction: "long" as const,
      symbol: `SYM${index}`,
      secType: "STK",
      openedAt: `2026-06-${String((index % 28) + 1).padStart(2, "0")}T13:30:00.000Z`,
      closedAt: `2026-06-${String((index % 28) + 2).padStart(2, "0")}T16:00:00.000Z`,
      netPnL: index,
      fillExecIds: [`e-${index}`],
      tags: [],
      setup: null,
      reviewNote: null,
      createdAt: `2026-06-01T13:30:00.000Z`,
      updatedAt: `2026-06-02T16:00:00.000Z`,
    }));
    vi.mocked(useJournalTrades).mockReturnValue(mockJournalTrades({ allTrades: manyTrades }));

    render(<JournalTradesView />);
    await screen.findByTestId("journal-trades-table-controls");
    fireEvent.change(screen.getByTestId("journal-trades-page-size"), { target: { value: "25" } });
    expect(screen.getByTestId("journal-trades-result-count")).toHaveTextContent(
      "Showing 1–25 of 30 trades",
    );
    expect(screen.getAllByRole("row").length - 1).toBe(25);
    fireEvent.click(screen.getByTestId("journal-trades-page-next"));
    expect(screen.getByTestId("journal-trades-result-count")).toHaveTextContent(
      "Showing 26–30 of 30 trades",
    );
    expect(screen.getAllByRole("row").length - 1).toBe(5);
  });

  it("hides a column via the columns popover", async () => {
    render(<JournalTradesView />);
    const table = await screen.findByTestId("journal-trades-table");
    expect(table).toHaveTextContent("Setup");
    fireEvent.click(screen.getByTestId("journal-trades-columns-trigger"));
    fireEvent.click(screen.getByTestId("journal-trades-column-setup"));
    expect(table).not.toHaveTextContent("Setup");
  });

  it("switches table density via toolbar control", async () => {
    render(<JournalTradesView />);
    const table = await screen.findByTestId("journal-trades-table");
    expect(table).toHaveAttribute("data-density", "compact");
    fireEvent.click(screen.getByRole("tab", { name: "Comfortable" }));
    expect(table).toHaveAttribute("data-density", "comfortable");
  });
});
