import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AppSettingsShell from "./AppSettingsShell";
import { AppThemeProvider } from "../AppThemeProvider";
import { AppTimeZoneProvider } from "../AppTimeZoneProvider";
import { AccountAliasesProvider } from "../AccountAliasesProvider";
import { APP_PALETTE_PREFERENCE_KEY } from "@/lib/app/appPalettePreference";
import { APP_SETTINGS_TAB_PREFERENCE_KEY } from "@/lib/app/appSettingsTabPreference";
import { RESEARCH_DEFAULT_DENSITY_KEY } from "@/lib/research/defaultDensityPreference";
import { BREAK_EVEN_PRESET } from "@/lib/trading/playbook/presets";
import type { ServerHealthPayload } from "@/lib/marketData/health";

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
  patchConnectionClient: vi.fn(),
}));

const mockHealthPayload: ServerHealthPayload = {
  generatedAt: Date.now(),
  providers: [
    {
      id: "tws",
      label: "IB Gateway",
      configured: true,
      status: "degraded",
      detail: "Sidecar ok · Gateway disconnected",
      requiresManualRecovery: true,
    },
    {
      id: "yahoo",
      label: "Yahoo",
      configured: true,
      status: "healthy",
      detail: "Fallback available",
    },
    {
      id: "massive",
      label: "Massive",
      configured: true,
      status: "healthy",
      detail: "Configured",
    },
    {
      id: "fmp",
      label: "FMP",
      configured: false,
      status: "disabled",
      detail: "Not configured",
    },
  ],
  recentWarnings: [],
  cache: {
    kind: "memory",
    degraded: false,
    lastPingOk: null,
    lastPingAt: null,
  },
  twsStatus: {
    configured: true,
    sidecarReachable: true,
    gatewayConnected: false,
    host: "127.0.0.1",
    port: 4002,
    connections: {
      "ib-paper": {
        gatewayConnected: true,
        port: 4002,
      },
      "ib-live": {
        gatewayConnected: false,
        port: 4001,
      },
    },
  },
};

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();

function renderShell(open = true) {
  return render(
    <AppThemeProvider>
      <AppTimeZoneProvider>
        <AccountAliasesProvider>
          <AppSettingsShell
            open={open}
            onClose={() => {}}
            accounts={[
              {
                broker: "ib",
                connectionId: "ib-paper",
                accountId: "DUP586813",
                environment: "paper",
                availability: "online",
              },
            ]}
            onRecoverTws={vi.fn()}
          />
        </AccountAliasesProvider>
      </AppTimeZoneProvider>
    </AppThemeProvider>,
  );
}

function settingsTablist() {
  return within(screen.getByTestId("app-settings-tablist")).getByRole("tablist");
}

describe("AppSettingsShell", () => {
  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    Object.defineProperty(window, "localStorage", { value: localStorageMock, configurable: true });
    Object.defineProperty(window, "sessionStorage", {
      value: sessionStorageMock,
      configurable: true,
    });
    document.documentElement.className = "";
    document.documentElement.dataset.palette = "midnight";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/api/trading/playbooks/templates")) {
          return {
            ok: true,
            json: async () => ({ presets: [BREAK_EVEN_PRESET], userTemplates: [] }),
          };
        }
        return {
          ok: true,
          json: async () => ({ health: mockHealthPayload }),
        };
      }),
    );
  });

  it("defaults to General tab and renders palette options", async () => {
    renderShell();

    await waitFor(() => {
      expect(screen.getByTestId("app-settings-panel-general")).toBeInTheDocument();
    });

    expect(within(settingsTablist()).getByRole("tab", { name: "General" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("app-palette-option-midnight")).toHaveAttribute("data-selected", "true");
    expect(screen.queryByTestId("app-settings-connections-section")).not.toBeInTheDocument();
  });

  it("renders palette options and persists selection", async () => {
    renderShell();

    await waitFor(() => {
      expect(screen.getByTestId("app-palette-option-midnight")).toHaveAttribute("data-selected", "true");
    });

    fireEvent.click(screen.getByTestId("app-palette-option-graphite"));

    await waitFor(() => {
      expect(screen.getByTestId("app-palette-option-graphite")).toHaveAttribute("data-selected", "true");
    });
    expect(localStorageMock.getItem(APP_PALETTE_PREFERENCE_KEY)).toBe("graphite");
    expect(document.documentElement.dataset.palette).toBe("graphite");
  });

  it("renders default density control and persists selection", async () => {
    renderShell();

    await waitFor(() => {
      expect(screen.getByTestId("app-default-density")).toHaveTextContent("Desk");
    });

    const generalPanel = screen.getByTestId("app-settings-panel-general");
    fireEvent.click(within(generalPanel).getByRole("tab", { name: "Board" }));

    await waitFor(() => {
      expect(screen.getByTestId("app-default-density")).toHaveTextContent("Board");
    });
    expect(localStorageMock.getItem(RESEARCH_DEFAULT_DENSITY_KEY)).toBe("Board");
  });

  it("renders Connections and Market data sections when their tabs are selected", async () => {
    renderShell();

    fireEvent.click(within(settingsTablist()).getByRole("tab", { name: "Connections" }));

    await waitFor(() => {
      expect(screen.getByTestId("app-settings-connections-section")).toBeInTheDocument();
    });

    expect(screen.getByTestId("app-settings-connection-row-ib-paper")).toBeInTheDocument();
    expect(screen.getByTestId("app-settings-connection-row-ib-live")).toBeInTheDocument();
    expect(screen.queryByTestId("app-settings-market-data-section")).not.toBeInTheDocument();

    fireEvent.click(within(settingsTablist()).getByRole("tab", { name: "Market data" }));

    await waitFor(() => {
      expect(screen.getByTestId("app-settings-market-data-section")).toBeInTheDocument();
    });

    expect(screen.getByTestId("app-settings-provider-row-tws")).toBeInTheDocument();
    expect(screen.getByTestId("app-settings-provider-row-yahoo")).toBeInTheDocument();
    expect(screen.getByText(/API keys stay in server environment for now/i)).toBeInTheDocument();
  });

  it("renders Costs tab with configured fixed total", async () => {
    renderShell();

    fireEvent.click(within(settingsTablist()).getByRole("tab", { name: "Costs" }));

    await waitFor(() => {
      expect(screen.getByTestId("app-settings-monthly-costs")).toBeInTheDocument();
    });

    expect(screen.getByTestId("app-settings-monthly-costs-total")).toHaveTextContent("$79.00 / mo");
    expect(sessionStorageMock.getItem(APP_SETTINGS_TAB_PREFERENCE_KEY)).toBe("costs");
  });

  it("renders Risk policies tab with the policies library", async () => {
    renderShell();

    fireEvent.click(within(settingsTablist()).getByRole("tab", { name: "Risk policies" }));

    await waitFor(() => {
      expect(screen.getByTestId("app-settings-panel-risk-policies")).toBeInTheDocument();
    });

    expect(screen.getByTestId("risk-policies-section")).toBeInTheDocument();
    expect(screen.getByTestId("risk-policy-create")).toBeInTheDocument();
    expect(sessionStorageMock.getItem(APP_SETTINGS_TAB_PREFERENCE_KEY)).toBe("risk-policies");
  });

  it("does not render secret or API key inputs", async () => {
    renderShell();

    await waitFor(() => {
      expect(screen.getByTestId("app-settings-shell")).toBeInTheDocument();
    });

    expect(screen.queryByLabelText(/api key/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/api key/i)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(/sk-/i)).not.toBeInTheDocument();
  });

  it("shows TWS recover when health indicates manual recovery", async () => {
    const onRecoverTws = vi.fn();
    render(
      <AppThemeProvider>
        <AppTimeZoneProvider>
          <AccountAliasesProvider>
            <AppSettingsShell open onClose={() => {}} onRecoverTws={onRecoverTws} />
          </AccountAliasesProvider>
        </AppTimeZoneProvider>
      </AppThemeProvider>,
    );

    fireEvent.click(within(settingsTablist()).getByRole("tab", { name: "Connections" }));

    await waitFor(() => {
      expect(screen.getByTestId("app-settings-recover-tws")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("app-settings-recover-tws"));
    expect(onRecoverTws).toHaveBeenCalledTimes(1);
  });

  it("does not fetch health when settings are closed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ health: mockHealthPayload }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderShell(false);

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
