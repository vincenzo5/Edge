import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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

const accountState = vi.hoisted(() => ({
  value: {
    activeTradingAccountId: "U25026894",
    positions: [
      {
        account: "U25026894",
        contract: { symbol: "SPY", secType: "STK", conId: 756733 },
        position: 10,
        avgCost: 450.25,
      },
    ],
    summary: { tags: {} },
  },
}));

vi.mock("@/app/components/AccountProvider", () => ({
  useAccountOptional: () => accountState.value,
}));

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
    accountState.value = {
      activeTradingAccountId: "U25026894",
      positions: [
        {
          account: "U25026894",
          contract: { symbol: "SPY", secType: "STK", conId: 756733 },
          position: 10,
          avgCost: 450.25,
        },
      ],
      summary: { tags: {} },
    };
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.clearAllMocks();
    vi.mocked(useJournalTrades).mockReturnValue(mockJournalTrades());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders dashboard with calendar, equity chart, and summary cards", () => {
    render(<JournalDashboardView />);
    expect(screen.getByTestId("journal-dashboard-view")).toBeInTheDocument();
    expect(screen.getByText("Avg win/loss")).toBeInTheDocument();
    expect(screen.getByTestId("journal-calendar")).toBeInTheDocument();
    expect(screen.getByTestId("journal-equity-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-trade-table")).not.toBeInTheDocument();
    expect(screen.getByTestId("journal-breakdown-report")).toBeInTheDocument();
    expect(screen.getByTestId("journal-breakdown-row-breakout")).toBeInTheDocument();
  });

  it("does not render the legacy out-of-sync content banner", () => {
    accountState.value = {
      activeTradingAccountId: "U25026894",
      positions: [],
      summary: { tags: {} },
    };

    render(<JournalDashboardView />);
    expect(screen.queryByTestId("journal-out-of-sync-banner")).not.toBeInTheDocument();
  });

  it("shows history sync chip in standalone dashboard header when out of sync", () => {
    accountState.value = {
      activeTradingAccountId: "U25026894",
      positions: [],
      summary: { tags: {} },
    };

    render(<JournalDashboardView />);
    expect(screen.getByTestId("journal-history-sync-chip")).toHaveTextContent("History lagging");
  });

  it("renders scope bar in sticky dashboard header without sync or import actions", () => {
    render(<JournalDashboardView />);
    const header = screen.getByTestId("journal-scope-bar").closest("header");
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
    expect(screen.getByTestId("journal-open-positions-card-row-SPY")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("journal-period-select"));
    fireEvent.click(screen.getByTestId("journal-period-select-option-today"));

    expect(screen.queryByTestId("journal-recent-trades-card-row-t1")).not.toBeInTheDocument();
    expect(screen.getByTestId("journal-recent-trades-card-row-t2")).toBeInTheDocument();
    expect(screen.getByTestId("journal-open-positions-card-row-SPY")).toBeInTheDocument();
  });

  it("renders recent trades and open positions list cards", () => {
    render(<JournalDashboardView />);
    expect(screen.getByTestId("journal-recent-trades-card")).toBeInTheDocument();
    expect(screen.getByTestId("journal-open-positions-card")).toBeInTheDocument();
    expect(screen.getByTestId("journal-recent-trades-card-row-t1")).toBeInTheDocument();
    expect(screen.getByTestId("journal-open-positions-card-row-SPY")).toBeInTheDocument();
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
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      if (this.getAttribute("data-testid") === "journal-trades-table") {
        return {
          width: 800,
          height: 400,
          top: 0,
          left: 0,
          bottom: 400,
          right: 800,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect;
      }
      return originalGetBoundingClientRect.call(this);
    };
    class MockResizeObserver {
      private callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe(target: Element) {
        const rect = target.getBoundingClientRect();
        this.callback(
          [
            {
              target,
              contentRect: {
                width: rect.width,
                height: rect.height,
                top: 0,
                left: 0,
                bottom: rect.height,
                right: rect.width,
                x: 0,
                y: 0,
                toJSON: () => ({}),
              },
            } as ResizeObserverEntry,
          ],
          this,
        );
      }

      unobserve() {}

      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    vi.clearAllMocks();
    vi.mocked(useJournalTrades).mockReturnValue(mockJournalTrades());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
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
    const header = screen.getByTestId("journal-scope-bar").closest("header");
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
    expect(screen.getByText("Avg win/loss")).toBeInTheDocument();
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

  it("virtualizes large trade lists and shows total result count", async () => {
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
    expect(screen.getByTestId("journal-trades-result-count")).toHaveTextContent("30 trades");
    const rows = screen.getAllByTestId(/^journal-trades-row-/);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(30);
  });

  it("hides a column via the columns popover", async () => {
    render(<JournalTradesView />);
    const table = await screen.findByTestId("journal-trades-table");
    expect(table).toHaveTextContent("Setup");
    fireEvent.click(screen.getByTestId("journal-trades-columns-trigger"));
    fireEvent.click(screen.getByTestId("journal-trades-column-setup").querySelector("input")!);
    expect(table).not.toHaveTextContent("Setup");
  });
});
