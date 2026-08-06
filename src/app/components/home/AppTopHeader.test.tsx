import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AppTopHeader from "./AppTopHeader";
import { AppThemeProvider } from "../AppThemeProvider";
import { AppTimeZoneProvider } from "../AppTimeZoneProvider";
import { AppChromeActionsProvider } from "./AppChromeActionsProvider";
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
    tradingEnvironment: "paper",
    connectionState: "connected",
    positions: [],
    pnl: null,
    setActiveTradingAccount,
    refresh: vi.fn(),
  }),
}));

const setAlias = vi.fn();
const routerPrefetch = vi.fn();
const usePathnameMock = vi.fn(() => "/home");

const mockUseAccountAliases = vi.fn(() => ({
  aliases: {} as Record<string, string>,
  setAlias,
  displayNameFor: (account: { accountId: string } | null | undefined) =>
    account?.accountId ?? "",
}));

vi.mock("../AccountAliasesProvider", () => ({
  useAccountAliases: () => mockUseAccountAliases(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    prefetch: routerPrefetch,
    push: vi.fn(),
  }),
  usePathname: () => usePathnameMock(),
}));

vi.mock("../AppActionsContext", () => ({
  useAppActions: () => null,
}));

vi.mock("../ChartActionsContext", () => ({
  useChartActions: () => null,
}));

vi.mock("@/lib/connections/useConnectionsList", () => ({
  useConnectionsList: () => ({
    connections: [
      {
        id: "ib-paper",
        kind: "ib_gateway_sidecar",
        authKind: "local_gateway",
        broker: "ib",
        environment: "paper",
        displayName: "IB Gateway (Paper)",
        status: "unknown",
      },
      {
        id: "ib-live",
        kind: "ib_gateway_sidecar",
        authKind: "local_gateway",
        broker: "ib",
        environment: "live",
        displayName: "IB Gateway (Live)",
        status: "unknown",
      },
    ],
    source: "seed",
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
  resolveConnectionDisplayName: (_id: string, connections: Array<{ id: string; displayName: string }>) =>
    connections.find((row) => row.id === _id)?.displayName ?? "Paper data",
}));

vi.mock("../notifications/NotificationProvider", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    dismiss: vi.fn(),
    refresh: vi.fn(),
  }),
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

const mockRunTwsRecoveryClient = vi.fn().mockResolvedValue({ ok: true });

let shellBrokerChrome = {
  chromeIncidentLabel: null as string | null,
  chromeRecoveryLabel: null as "Reconnect" | null,
  showRecovery: false,
};

vi.mock("@/lib/marketData/fetchTwsCircuitOpen", () => ({
  fetchTwsCircuitOpen: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/marketData/twsRecoveryClient", () => ({
  runTwsRecoveryClient: (...args: unknown[]) => mockRunTwsRecoveryClient(...args),
}));

vi.mock("./useShellBrokerConnectionChrome", () => ({
  useShellBrokerConnectionChrome: () => shellBrokerChrome,
}));

function renderHeader(ui: React.ReactNode = <AppTopHeader />) {
  return render(
    <AppThemeProvider>
      <AppTimeZoneProvider>
        <AppChromeActionsProvider>{ui}</AppChromeActionsProvider>
      </AppTimeZoneProvider>
    </AppThemeProvider>,
  );
}

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
    routerPrefetch.mockReset();
    usePathnameMock.mockReturnValue("/home");
    vi.mocked(fetchTradingAccounts).mockClear();
    vi.spyOn(lastModule, "recordLastModule").mockImplementation(() => {});
    shellBrokerChrome = {
      chromeIncidentLabel: null,
      chromeRecoveryLabel: null,
      showRecovery: false,
    };
    mockRunTwsRecoveryClient.mockClear();
  });

  it("renders logo home link and account picker without journal-only rows", async () => {
    renderHeader();
    expect(screen.getByTestId("app-top-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-logo-home")).toHaveAttribute("href", "/home");
    expect(screen.getByRole("img", { name: "Edge" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("app-account-picker")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("app-account-picker"));
    expect(screen.getByTestId("app-account-picker-option-ib-paper::DUP586813")).toHaveTextContent(
      "Paper (DUP586813)",
    );
    expect(screen.getByTestId("app-account-picker-option-ib-live::U25026894")).toHaveTextContent(
      "Live (U25026894)",
    );
    expect(screen.queryByText(/\(journal\)/)).not.toBeInTheDocument();
  });

  it("records home module when logo is clicked", () => {
    renderHeader();
    fireEvent.click(screen.getByTestId("app-logo-home"));
    expect(lastModule.recordLastModule).toHaveBeenCalledWith("home");
  });

  it("prefetches home route on mount", () => {
    renderHeader();
    expect(routerPrefetch).toHaveBeenCalledWith("/home");
  });

  it("shows density switcher on Talk routes", () => {
    usePathnameMock.mockReturnValue("/copilot");
    renderHeader();
    expect(screen.getByTestId("density-switcher")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Talk" })).toHaveAttribute("aria-selected", "true");
  });

  it("hides density switcher on home", () => {
    renderHeader();
    expect(screen.queryByTestId("density-switcher")).not.toBeInTheDocument();
  });

  it("selects live gateway account from the picker using composite keys", async () => {
    renderHeader();
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

  it("activates the server demo default for the demo session", async () => {
    const demoAccount = {
      broker: "ib" as const,
      connectionId: "ib-paper",
      accountId: "DEMO0001",
      environment: "paper" as const,
      availability: "offline" as const,
    };
    vi.mocked(fetchTradingAccounts).mockResolvedValueOnce({
      accounts: [
        {
          broker: "ib",
          connectionId: "ib-paper",
          accountId: "DUP586813",
          environment: "paper",
          availability: "online",
        },
        demoAccount,
      ],
      defaultAccountId: "DEMO0001",
    });
    const sessionFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        authenticated: true,
        user: { id: "demo-user", email: "demo@localhost" },
      }),
    );

    renderHeader();

    await waitFor(() => {
      expect(setActiveTradingAccount).toHaveBeenCalledWith(demoAccount);
    });
    sessionFetch.mockRestore();
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

    renderHeader();
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

  it("toggles global theme from the header control", async () => {
    renderHeader();
    await waitFor(() => {
      expect(screen.getByTestId("app-header-theme-toggle")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("app-header-theme-toggle"));
    await waitFor(() => {
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });

  it("opens and closes the deferred application settings shell", async () => {
    renderHeader();
    const settingsButton = screen.getByTestId("app-header-settings");
    expect(settingsButton.querySelector('[data-edge-icon="settings"]')).toBeInTheDocument();
    fireEvent.click(settingsButton);
    expect(screen.getByTestId("app-settings-shell")).toBeInTheDocument();
    expect(screen.getByTestId("app-default-timezone")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("app-settings-shell")).not.toBeInTheDocument();
    });
    expect(settingsButton).toHaveFocus();
  });

  it("opens account alias settings from inside account picker dropdown", async () => {
    renderHeader();
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

    renderHeader();
    await waitFor(() => {
      expect(screen.getByTestId("app-account-picker")).toHaveTextContent("Paper IRA (DUP586813)");
    });
  });

  it("renders calm broker incident and reconnect on Talk routes when gateway is down", async () => {
    usePathnameMock.mockReturnValue("/copilot");
    shellBrokerChrome = {
      chromeIncidentLabel: "Broker disconnected",
      chromeRecoveryLabel: "Reconnect",
      showRecovery: true,
    };

    renderHeader();

    expect(screen.getByTestId("app-header-connection-incident")).toHaveTextContent(
      "Broker disconnected",
    );
    expect(screen.getByTestId("app-header-recover-tws")).toHaveTextContent("Reconnect");

    fireEvent.click(screen.getByTestId("app-header-recover-tws"));
    expect(mockRunTwsRecoveryClient).toHaveBeenCalledWith({
      source: "data-health",
      symbols: [],
      candleRequests: [],
    });
  });

  it("renders reconnecting incident without recover CTA", () => {
    shellBrokerChrome = {
      chromeIncidentLabel: "Broker reconnecting",
      chromeRecoveryLabel: null,
      showRecovery: false,
    };

    renderHeader();

    expect(screen.getByTestId("app-header-connection-incident")).toHaveTextContent(
      "Broker reconnecting",
    );
    expect(screen.queryByTestId("app-header-recover-tws")).toBeNull();
  });

  it("hides connection incident chrome when broker is healthy", () => {
    renderHeader();
    expect(screen.queryByTestId("app-header-connection-slot")).toBeNull();
  });

  it("shows disabled account picker when no accounts are available", async () => {
    vi.mocked(fetchTradingAccounts).mockResolvedValueOnce({
      accounts: [],
      defaultAccountId: null,
    });

    renderHeader();

    await waitFor(() => {
      expect(screen.getByTestId("app-account-picker")).toBeDisabled();
    });
    expect(screen.getByTestId("app-account-picker")).toHaveTextContent("No accounts");
  });

  it(
    "retries account load after an empty circuit-open result",
    async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        vi.mocked(fetchTradingAccounts)
          .mockResolvedValueOnce({
            accounts: [],
            defaultAccountId: null,
          })
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

        renderHeader();

        await waitFor(() => {
          expect(screen.getByTestId("app-account-picker")).toHaveTextContent("No accounts");
        });

        await vi.advanceTimersByTimeAsync(5_000);

        await waitFor(() => {
          expect(screen.getByTestId("app-account-picker")).toHaveTextContent("Paper (DUP586813)");
        });
        expect(fetchTradingAccounts).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    },
    10_000,
  );
});
