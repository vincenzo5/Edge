import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AppTopHeader from "./AppTopHeader";

const setActiveTradingAccount = vi.fn();

vi.mock("../AccountProvider", () => ({
  useAccount: () => ({
    activeTradingAccount: {
      broker: "ib",
      connectionId: "ib-paper",
      accountId: "DUP586813",
      environment: "paper",
    },
    activeTradingAccountId: "DUP586813",
    setActiveTradingAccount,
  }),
}));

vi.mock("@/lib/persistence/client/journalClient", () => ({
  fetchJournalFills: vi.fn().mockResolvedValue([
    {
      id: "fill-1",
      execId: "exec-1",
      fillTime: "2026-07-01T13:30:00.000Z",
      side: "BOT",
      quantity: 1,
      price: 100,
      contract: { symbol: "AAPL", secType: "STK" },
      source: "flex_csv",
      createdAt: "2026-07-01T13:30:00.000Z",
      account: "U25026894",
    },
  ]),
}));

vi.mock("@/lib/trading/tradingClient", () => ({
  fetchTradingAccounts: vi.fn().mockResolvedValue({
    accounts: [
      {
        broker: "ib",
        connectionId: "ib-paper",
        accountId: "DUP586813",
        environment: "paper",
      },
      {
        broker: "ib",
        connectionId: "ib-live",
        accountId: "DUP586813",
        environment: "live",
      },
    ],
    defaultAccountId: "DUP586813",
  }),
  TradingApiError: class TradingApiError extends Error {
    status = 500;
  },
}));

import { fetchTradingAccounts } from "@/lib/trading/tradingClient";

describe("AppTopHeader", () => {
  beforeEach(() => {
    setActiveTradingAccount.mockReset();
    vi.mocked(fetchTradingAccounts).mockClear();
  });

  it("renders edge logo and account picker", async () => {
    render(<AppTopHeader />);
    expect(screen.getByTestId("app-top-header")).toBeInTheDocument();
    expect(screen.getByText("edge")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("app-account-picker")).toBeInTheDocument();
    });
    expect(screen.getByRole("option", { name: "DUP586813 (paper)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "DUP586813 (live)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "U25026894 (journal)" })).toBeInTheDocument();
  });

  it("selects a different account from the picker using composite keys", async () => {
    render(<AppTopHeader />);
    await waitFor(() => {
      expect(screen.getByTestId("app-account-picker")).not.toBeDisabled();
    });
    fireEvent.change(screen.getByTestId("app-account-picker"), {
      target: { value: "journal::U25026894" },
    });
    expect(setActiveTradingAccount).toHaveBeenCalledWith({
      broker: "ib",
      connectionId: "journal",
      accountId: "U25026894",
      environment: "paper",
    });
  });

  it("selects live gateway account when paper and live share accountId", async () => {
    render(<AppTopHeader />);
    await waitFor(() => {
      expect(screen.getByTestId("app-account-picker")).not.toBeDisabled();
    });
    fireEvent.change(screen.getByTestId("app-account-picker"), {
      target: { value: "ib-live::DUP586813" },
    });
    expect(setActiveTradingAccount).toHaveBeenCalledWith({
      broker: "ib",
      connectionId: "ib-live",
      accountId: "DUP586813",
      environment: "live",
    });
  });
});
