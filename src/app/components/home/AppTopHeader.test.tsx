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
      availability: "online",
    },
    activeTradingAccountId: "DUP586813",
    setActiveTradingAccount,
  }),
}));

const setDataConnectionPreference = vi.fn();

vi.mock("@/lib/marketData/useDataConnectionPreference", () => ({
  useDataConnectionPreference: () => ({
    preference: "ib-paper",
    setPreference: setDataConnectionPreference,
  }),
}));

vi.mock("@/lib/marketData/dataConnectionPreference", () => ({
  applyDefaultDataConnectionPreferenceIfNeeded: vi.fn(),
  dataConnectionLabel: (id: string) => (id === "ib-live" ? "Live data" : "Paper data"),
}));

vi.mock("@/lib/trading/tradingClient", () => ({
  fetchTradingAccounts: vi.fn().mockResolvedValue({
    accounts: [
      {
        broker: "ib",
        connectionId: "ib-paper",
        accountId: "DUP586813",
        environment: "paper",
        availability: "online",
      },
      {
        broker: "ib",
        connectionId: "ib-live",
        accountId: "U25026894",
        environment: "live",
        availability: "online",
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
    setDataConnectionPreference.mockReset();
    vi.mocked(fetchTradingAccounts).mockClear();
  });

  it("renders edge logo and account picker without journal-only rows", async () => {
    render(<AppTopHeader />);
    expect(screen.getByTestId("app-top-header")).toBeInTheDocument();
    expect(screen.getByText("edge")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("app-account-picker")).toBeInTheDocument();
    });
    expect(screen.getByRole("option", { name: "DUP586813 (paper)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "U25026894 (live)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /\(journal\)/ })).not.toBeInTheDocument();
  });

  it("selects live gateway account from the picker using composite keys", async () => {
    render(<AppTopHeader />);
    await waitFor(() => {
      expect(screen.getByTestId("app-account-picker")).not.toBeDisabled();
    });
    fireEvent.change(screen.getByTestId("app-account-picker"), {
      target: { value: "ib-live::U25026894" },
    });
    expect(setActiveTradingAccount).toHaveBeenCalledWith({
      broker: "ib",
      connectionId: "ib-live",
      accountId: "U25026894",
      environment: "live",
      availability: "online",
    });
  });

  it("selects live gateway account when paper and live share accountId", async () => {
    vi.mocked(fetchTradingAccounts).mockResolvedValueOnce({
      accounts: [
        {
          broker: "ib",
          connectionId: "ib-paper",
          accountId: "DUP586813",
          environment: "paper",
          availability: "online",
        },
        {
          broker: "ib",
          connectionId: "ib-live",
          accountId: "DUP586813",
          environment: "live",
          availability: "online",
        },
      ],
      defaultAccountId: "DUP586813",
    });

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
      availability: "online",
    });
  });

  it("toggles chart data preference independently of order account", async () => {
    render(<AppTopHeader />);
    await waitFor(() => {
      expect(screen.getByTestId("app-data-connection-chip")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("app-data-connection-chip"));
    expect(setDataConnectionPreference).toHaveBeenCalledWith("ib-live");
    expect(setActiveTradingAccount).not.toHaveBeenCalled();
  });
});
