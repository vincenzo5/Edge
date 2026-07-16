import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AppTopHeader from "./AppTopHeader";
import * as lastModule from "@/lib/app/lastModule";

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

const setAlias = vi.fn();

const mockUseAccountAliases = vi.fn(() => ({
  aliases: {} as Record<string, string>,
  setAlias,
  displayNameFor: (account: { accountId: string } | null | undefined) =>
    account?.accountId ?? "",
}));

vi.mock("../AccountAliasesProvider", () => ({
  useAccountAliases: () => mockUseAccountAliases(),
}));

const setDataConnectionPreference = vi.fn();
const routerPrefetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    prefetch: routerPrefetch,
  }),
}));

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

import { fetchTradingAccounts, TradingApiError } from "@/lib/trading/tradingClient";

describe("AppTopHeader", () => {
  beforeEach(() => {
    setActiveTradingAccount.mockReset();
    setAlias.mockReset();
    mockUseAccountAliases.mockReset();
    mockUseAccountAliases.mockReturnValue({
      aliases: {},
      setAlias,
      displayNameFor: (account: { accountId: string } | null | undefined) =>
        account?.accountId ?? "",
    });
    setDataConnectionPreference.mockReset();
    routerPrefetch.mockReset();
    vi.mocked(fetchTradingAccounts).mockClear();
    vi.spyOn(lastModule, "recordLastModule").mockImplementation(() => {});
  });

  it("renders logo home link and account picker without journal-only rows", async () => {
    render(<AppTopHeader />);
    expect(screen.getByTestId("app-top-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-logo-home")).toHaveAttribute("href", "/home");
    expect(screen.getByRole("img", { name: "Edge" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("app-account-picker")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("app-account-picker"));
    expect(screen.getByTestId("app-account-picker-option-ib-paper::DUP586813")).toHaveTextContent(
      "DUP586813 (paper)",
    );
    expect(screen.getByTestId("app-account-picker-option-ib-live::U25026894")).toHaveTextContent(
      "U25026894 (live)",
    );
    expect(screen.queryByText(/\(journal\)/)).not.toBeInTheDocument();
  });

  it("records home module when logo is clicked", () => {
    render(<AppTopHeader />);
    fireEvent.click(screen.getByTestId("app-logo-home"));
    expect(lastModule.recordLastModule).toHaveBeenCalledWith("home");
  });

  it("prefetches home route on mount", () => {
    render(<AppTopHeader />);
    expect(routerPrefetch).toHaveBeenCalledWith("/home");
  });

  it("selects live gateway account from the picker using composite keys", async () => {
    render(<AppTopHeader />);
    await waitFor(() => {
      expect(screen.getByTestId("app-account-picker")).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId("app-account-picker"));
    fireEvent.click(screen.getByTestId("app-account-picker-option-ib-live::U25026894"));
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
    fireEvent.click(screen.getByTestId("app-account-picker"));
    fireEvent.click(screen.getByTestId("app-account-picker-option-ib-live::DUP586813"));
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

  it("opens account alias settings from inside account picker dropdown", async () => {
    render(<AppTopHeader />);
    await waitFor(() => {
      expect(screen.getByTestId("app-account-picker")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("app-account-picker"));
    fireEvent.click(screen.getByTestId("app-account-aliases-settings"));
    expect(screen.getByTestId("app-account-aliases-popover")).toBeInTheDocument();
    expect(screen.getByTestId("account-alias-input-ib-paper::DUP586813")).toBeInTheDocument();
  });

  it("updates picker label when alias is set", async () => {
    mockUseAccountAliases.mockReturnValue({
      aliases: { "ib-paper::DUP586813": "Paper IRA" },
      setAlias,
      displayNameFor: () => "Paper IRA",
    });

    render(<AppTopHeader />);
    await waitFor(() => {
      expect(screen.getByTestId("app-account-picker")).toHaveTextContent("Paper IRA (paper)");
    });
  });

  it("shows header reconnect when account load fails and refetches after recover", async () => {
    vi.mocked(fetchTradingAccounts)
      .mockRejectedValueOnce(new TradingApiError("Sidecar unreachable"))
      .mockResolvedValueOnce({
        accounts: [
          {
            broker: "ib",
            connectionId: "ib-paper",
            accountId: "DUP586813",
            environment: "paper",
            availability: "online",
          },
        ],
        defaultAccountId: "DUP586813",
      });

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/market-data/tws/recover")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            commandState: "confirmed",
            message: "TWS reconnected to IB Gateway.",
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ health: { generatedAt: Date.now(), providers: [], recentWarnings: [] } }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<AppTopHeader />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByTestId("app-header-recover-tws")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("app-header-recover-tws"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/market-data/tws/recover",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(fetchTradingAccounts).toHaveBeenCalledTimes(2);
    });
  });
});
