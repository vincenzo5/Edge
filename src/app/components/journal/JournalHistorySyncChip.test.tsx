import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const accountState = vi.hoisted(() => ({
  value: {
    activeTradingAccountId: "U25026894",
    positions: [] as Array<{
      account: string;
      contract: { symbol: string; secType: string; conId: number };
      position: number;
      avgCost: number;
    }>,
  },
}));

const syncState = vi.hoisted(() => ({
  syncing: false,
}));

vi.mock("@/app/components/AccountProvider", () => ({
  useAccountOptional: () => accountState.value,
}));

vi.mock("@/app/components/journal/JournalSyncProvider", () => ({
  useJournalSync: () => ({
    lastSyncedAt: null,
    syncing: syncState.syncing,
    syncNow: vi.fn(async () => {}),
  }),
}));

vi.mock("@/app/components/journal/JournalTradesProvider", () => ({
  useJournalTrades: () => ({
    allTrades: [
      {
        id: "open-1",
        status: "open",
        symbol: "SPY",
        secType: "STK",
        netQuantity: 10,
        legs: [{ conId: 756733, symbol: "SPY", secType: "STK" }],
      },
    ],
  }),
}));

import JournalHistorySyncChip from "./JournalHistorySyncChip";

describe("JournalHistorySyncChip", () => {
  it("renders nothing when journal history matches live positions", () => {
    accountState.value = {
      activeTradingAccountId: "U25026894",
      positions: [
        {
          account: "U25026894",
          contract: { symbol: "SPY", secType: "STK", conId: 756733 },
          position: 10,
          avgCost: 450,
        },
      ],
    };
    syncState.syncing = false;

    render(<JournalHistorySyncChip />);
    expect(screen.queryByTestId("journal-history-sync-chip")).not.toBeInTheDocument();
  });

  it("shows History lagging when out of sync and not syncing", () => {
    accountState.value = {
      activeTradingAccountId: "U25026894",
      positions: [],
    };
    syncState.syncing = false;

    render(<JournalHistorySyncChip />);
    expect(screen.getByTestId("journal-history-sync-chip")).toHaveTextContent("History lagging");
    expect(screen.queryByTestId("journal-history-sync-chip-spinner")).not.toBeInTheDocument();
  });

  it("shows Catching up with spinner when out of sync and syncing", () => {
    accountState.value = {
      activeTradingAccountId: "U25026894",
      positions: [],
    };
    syncState.syncing = true;

    render(<JournalHistorySyncChip />);
    expect(screen.getByTestId("journal-history-sync-chip")).toHaveTextContent("Catching up");
    expect(screen.getByTestId("journal-history-sync-chip-spinner")).toBeInTheDocument();
  });
});
