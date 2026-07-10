import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JournalFillResponse, JournalTradeResponse } from "@/lib/persistence/schemas/journal";

const fetchJournalTrades = vi.fn(async () => [] as JournalTradeResponse[]);
const fetchJournalFills = vi.fn(async () => [] as JournalFillResponse[]);

vi.mock("@/lib/persistence/client/journalClient", () => ({
  fetchJournalTrades: (...args: unknown[]) => fetchJournalTrades(...args),
  fetchJournalFills: (...args: unknown[]) => fetchJournalFills(...args),
}));

vi.mock("@/app/components/journal/JournalSyncProvider", () => ({
  useJournalSync: () => ({
    lastSyncedAt: null,
    syncing: false,
    syncNow: vi.fn(async () => {}),
  }),
}));

import { AccountProvider, useAccount } from "@/app/components/AccountProvider";
import { JournalTradesProvider, useJournalTrades } from "./JournalTradesProvider";

function AccountSwitcher() {
  const account = useAccount();
  return (
    <button
      type="button"
      data-testid="switch-account"
      onClick={() =>
        account.setActiveTradingAccount({
          broker: "ib",
          connectionId: "ib-paper",
          accountId: "DU456",
          environment: "paper",
        })
      }
    >
      Switch
    </button>
  );
}

function TradesProbe() {
  const { allTrades } = useJournalTrades();
  return <div data-testid="trade-count">{allTrades.length}</div>;
}

describe("JournalTradesProvider account nesting", () => {
  beforeEach(() => {
    fetchJournalTrades.mockReset();
    fetchJournalFills.mockReset();
    window.localStorage.clear();

    fetchJournalTrades.mockResolvedValue([
      {
        id: "trade-1",
        status: "closed",
        direction: "long",
        symbol: "AAPL",
        secType: "STK",
        openedAt: "2026-07-01T13:30:00.000Z",
        closedAt: "2026-07-01T16:00:00.000Z",
        fillExecIds: ["exec-1"],
        createdAt: "2026-07-01T13:30:00.000Z",
        updatedAt: "2026-07-01T16:00:00.000Z",
      },
      {
        id: "trade-2",
        status: "closed",
        direction: "long",
        symbol: "MSFT",
        secType: "STK",
        openedAt: "2026-07-01T13:30:00.000Z",
        closedAt: "2026-07-01T16:00:00.000Z",
        fillExecIds: ["exec-2"],
        createdAt: "2026-07-01T13:30:00.000Z",
        updatedAt: "2026-07-01T16:00:00.000Z",
      },
    ]);
    fetchJournalFills.mockResolvedValue([
      {
        id: "fill-1",
        execId: "exec-1",
        fillTime: "2026-07-01T13:30:00.000Z",
        side: "BOT",
        quantity: 1,
        price: 100,
        contract: { symbol: "AAPL", secType: "STK" },
        source: "live",
        createdAt: "2026-07-01T13:30:00.000Z",
        account: "DU123",
      },
      {
        id: "fill-2",
        execId: "exec-2",
        fillTime: "2026-07-01T13:30:00.000Z",
        side: "BOT",
        quantity: 1,
        price: 100,
        contract: { symbol: "MSFT", secType: "STK" },
        source: "live",
        createdAt: "2026-07-01T13:30:00.000Z",
        account: "DU456",
      },
    ]);

    window.localStorage.setItem(
      "edge:trading:activeAccount",
      JSON.stringify({
        broker: "ib",
        connectionId: "ib-paper",
        accountId: "DU123",
        environment: "paper",
        updatedAt: Date.now(),
      }),
    );
  });

  it("filters trades when nested under AccountProvider and active account changes", async () => {
    render(
      <AccountProvider>
        <JournalTradesProvider>
          <TradesProbe />
          <AccountSwitcher />
        </JournalTradesProvider>
      </AccountProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("trade-count")).toHaveTextContent("1");
    });

    await act(async () => {
      screen.getByTestId("switch-account").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("trade-count")).toHaveTextContent("1");
      expect(screen.getByTestId("trade-count")).not.toHaveTextContent("2");
    });
  });
});
