import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchJournalTrades = vi.fn(async () => [] as never[]);

vi.mock("@/lib/persistence/client/journalClient", () => ({
  fetchJournalTrades: (...args: unknown[]) => fetchJournalTrades(...args),
}));

vi.mock("@/app/components/journal/JournalSyncProvider", () => ({
  useJournalSync: () => ({
    lastSyncedAt: null,
    syncing: false,
    syncNow: vi.fn(async () => {}),
  }),
}));

import { JournalTradesProvider, useJournalTrades } from "./JournalTradesProvider";

function TradesProbe() {
  const { loading, error, allTrades, retryLoadTrades } = useJournalTrades();
  return (
    <div
      data-testid="journal-trades-probe"
      data-loading={loading ? "true" : "false"}
      data-error={error ?? "none"}
      data-count={allTrades.length}
    >
      <button type="button" data-testid="journal-trades-retry" onClick={() => void retryLoadTrades()}>
        Retry
      </button>
    </div>
  );
}

describe("JournalTradesProvider", () => {
  beforeEach(() => {
    fetchJournalTrades.mockReset();
    fetchJournalTrades.mockResolvedValue([]);
  });

  it("starts loading and clears loading after initial fetch", async () => {
    render(
      <JournalTradesProvider>
        <TradesProbe />
      </JournalTradesProvider>,
    );

    expect(screen.getByTestId("journal-trades-probe")).toHaveAttribute("data-loading", "true");

    await waitFor(() => {
      expect(screen.getByTestId("journal-trades-probe")).toHaveAttribute("data-loading", "false");
    });
  });

  it("sets error when initial fetch fails", async () => {
    fetchJournalTrades.mockRejectedValueOnce(new Error("network"));

    render(
      <JournalTradesProvider>
        <TradesProbe />
      </JournalTradesProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("journal-trades-probe")).toHaveAttribute(
        "data-error",
        "Could not load journal trades. Check your connection and try again.",
      );
    });
  });

  it("clears error after successful retry", async () => {
    fetchJournalTrades.mockRejectedValueOnce(new Error("network"));
    fetchJournalTrades.mockResolvedValueOnce([
      {
        id: "t1",
        status: "closed",
        direction: "long",
        symbol: "AAPL",
        secType: "STK",
        openedAt: "2026-07-01T13:30:00.000Z",
        closedAt: "2026-07-01T16:00:00.000Z",
        netPnL: 100,
        fillExecIds: ["e1"],
        tags: [],
        setup: null,
        reviewNote: null,
        createdAt: "2026-07-01T13:30:00.000Z",
        updatedAt: "2026-07-01T16:00:00.000Z",
      },
    ] as never[]);

    render(
      <JournalTradesProvider>
        <TradesProbe />
      </JournalTradesProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("journal-trades-probe")).toHaveAttribute(
        "data-error",
        "Could not load journal trades. Check your connection and try again.",
      );
    });

    await act(async () => {
      screen.getByTestId("journal-trades-retry").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("journal-trades-probe")).toHaveAttribute("data-error", "none");
      expect(screen.getByTestId("journal-trades-probe")).toHaveAttribute("data-count", "1");
    });
  });

  it("does not set loading during background refresh when trades are cached", async () => {
    fetchJournalTrades.mockResolvedValueOnce([
      {
        id: "t1",
        status: "closed",
        direction: "long",
        symbol: "AAPL",
        secType: "STK",
        openedAt: "2026-07-01T13:30:00.000Z",
        closedAt: "2026-07-01T16:00:00.000Z",
        netPnL: 100,
        fillExecIds: ["e1"],
        tags: [],
        setup: null,
        reviewNote: null,
        createdAt: "2026-07-01T13:30:00.000Z",
        updatedAt: "2026-07-01T16:00:00.000Z",
      },
    ] as never[]);

    render(
      <JournalTradesProvider>
        <TradesProbe />
        <BackgroundRefreshProbe />
      </JournalTradesProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("journal-trades-probe")).toHaveAttribute("data-count", "1");
    });

    fetchJournalTrades.mockResolvedValueOnce([
      {
        id: "t1",
        status: "closed",
        direction: "long",
        symbol: "AAPL",
        secType: "STK",
        openedAt: "2026-07-01T13:30:00.000Z",
        closedAt: "2026-07-01T16:00:00.000Z",
        netPnL: 120,
        fillExecIds: ["e1"],
        tags: [],
        setup: null,
        reviewNote: null,
        createdAt: "2026-07-01T13:30:00.000Z",
        updatedAt: "2026-07-01T16:00:00.000Z",
      },
    ] as never[]);

    await act(async () => {
      screen.getByTestId("journal-trades-background").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("journal-trades-background")).toHaveAttribute("data-loading", "false");
    });
  });
});

function BackgroundRefreshProbe() {
  const { loadTrades, loading } = useJournalTrades();
  return (
    <button
      type="button"
      data-testid="journal-trades-background"
      data-loading={loading ? "true" : "false"}
      onClick={() => void loadTrades(true)}
    >
      Refresh
    </button>
  );
}
