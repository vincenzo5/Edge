import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createDefaultWorkspaceTabs } from "@/lib/app/workspaceTabs";
import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";
import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";
import { createDefaultScreenerSession } from "@/lib/screener/screenerSession";

const bootstrapMock = vi.hoisted(() => ({
  resolveAppBootstrap: vi.fn(),
}));

vi.mock("@/lib/app/bootstrap/resolveAppBootstrap", () => ({
  resolveAppBootstrap: bootstrapMock.resolveAppBootstrap,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("./ChartGrid", () => ({
  default: () => <div data-testid="chart-grid" />,
}));

vi.mock("./sidebar/RightSidebar", () => ({
  default: () => null,
}));

vi.mock("./sidebar/SidebarRail", () => ({
  default: () => <div data-testid="sidebar-rail" />,
}));

vi.mock("./chart-chrome/ChartHeaderBar", () => ({
  default: () => <div data-testid="chart-header" />,
}));

vi.mock("./sidebar/FloatingPanelHost", () => ({
  default: () => null,
}));

vi.mock("./AiSessionBridge", () => ({
  default: () => null,
}));

vi.mock("./MarketDataProvider", () => ({
  MarketDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./AccountProvider", () => ({
  AccountProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./RiskSettingsProvider", () => ({
  RiskSettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./data-health", () => ({
  DataHealthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./AiToolsProvider", () => ({
  AiToolsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./shortcuts/ShortcutProvider", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/persistence/sync/useChartTemplateLibraryRemoteSync", () => ({
  useChartTemplateLibraryRemoteSync: () => {},
}));

vi.mock("./chart-chrome/WorkspaceTabBar", () => ({
  default: () => <div data-testid="workspace-tab-bar" />,
}));

vi.mock("@/lib/persistence/sync/useWorkspaceTabsRemoteSync", () => ({
  useWorkspaceTabsRemoteSync: () => ({ flushActiveTabSave: async () => {} }),
}));

vi.mock("@/lib/responsive/useResponsiveLayout", () => ({
  useResponsiveLayout: () => ({
    sidebarMode: "inline",
    railMode: "full",
  }),
}));

vi.mock("./chart-chrome/useSymbolNavigationHistory", () => ({
  useSymbolNavigationHistory: () => ({
    canBack: false,
    canForward: false,
    navigate: () => null,
  }),
}));

const watchlistProbe = vi.hoisted(() => ({ initial: null as unknown }));

vi.mock("./watchlist/WatchlistContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./watchlist/WatchlistContext")>();
  return {
    ...actual,
    WatchlistProvider: ({
      children,
      initialState,
    }: {
      children: React.ReactNode;
      initialState?: typeof DEFAULT_WATCHLIST_STATE;
    }) => {
      watchlistProbe.initial = initialState ?? null;
      return <>{children}</>;
    },
  };
});

import StockApp from "./StockApp";

describe("StockApp bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    watchlistProbe.initial = null;
    bootstrapMock.resolveAppBootstrap.mockResolvedValue({
      workspaceTabs: createDefaultWorkspaceTabs(),
      watchlist: DEFAULT_WATCHLIST_STATE,
      screener: DEFAULT_SCREENER_STATE,
      screenerSession: createDefaultScreenerSession(DEFAULT_SCREENER_STATE),
      remoteApplied: false,
      remotePending: false,
    });
  });

  it("shows hydration shell until bootstrap resolves", async () => {
    bootstrapMock.resolveAppBootstrap.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              workspaceTabs: createDefaultWorkspaceTabs(),
              watchlist: DEFAULT_WATCHLIST_STATE,
              screener: DEFAULT_SCREENER_STATE,
              screenerSession: createDefaultScreenerSession(DEFAULT_SCREENER_STATE),
              remoteApplied: false,
              remotePending: false,
            });
          }, 20);
        }),
    );

    render(<StockApp />);
    expect(screen.getByTestId("app-hydration-shell")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("chart-grid")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("app-hydration-shell")).toBeNull();
  });

  it("passes preloaded watchlist state to WatchlistProvider", async () => {
    render(<StockApp />);

    await waitFor(() => {
      expect(screen.getByTestId("chart-grid")).toBeInTheDocument();
    });

    expect(bootstrapMock.resolveAppBootstrap).toHaveBeenCalledOnce();
    expect(watchlistProbe.initial).toEqual(DEFAULT_WATCHLIST_STATE);
  });

  it("hydrates from local fallback when bootstrap rejects", async () => {
    bootstrapMock.resolveAppBootstrap.mockRejectedValue(new Error("bootstrap failed"));

    render(<StockApp />);
    expect(screen.getByTestId("app-hydration-shell")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("chart-grid")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("app-hydration-shell")).toBeNull();
  });
});
