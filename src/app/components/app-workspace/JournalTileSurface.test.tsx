/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { useEffect } from "react";

import JournalTileSurface from "./JournalTileSurface";
import { AppWorkspaceProvider, useAppWorkspace } from "./AppWorkspaceContext";
import { TileDensityOverrideProvider } from "./TileDensityContext";

vi.mock("@/app/components/journal/JournalDashboardView", async () => {
  const { default: JournalModuleHeader } = await import(
    "@/app/components/journal/JournalModuleHeader"
  );
  const { default: JournalViewTabs } = await import(
    "@/app/components/journal/JournalViewTabs"
  );
  const { JournalTileActions, JournalTileTitle } = await import(
    "@/app/components/app-workspace/JournalTileChrome"
  );
  return {
    default: function MockJournalDashboardView() {
      return (
        <>
          <JournalModuleHeader
            sticky
            title={<JournalTileTitle />}
            leading={<JournalViewTabs />}
            trailing={<JournalTileActions />}
          >
            <div data-testid="journal-scope-bar">Scope</div>
          </JournalModuleHeader>
          <div data-testid="journal-dashboard-view">Dashboard</div>
        </>
      );
    },
  };
});

vi.mock("@/app/components/journal/JournalTradesView", async () => {
  const { default: JournalModuleHeader } = await import(
    "@/app/components/journal/JournalModuleHeader"
  );
  const { default: JournalViewTabs } = await import(
    "@/app/components/journal/JournalViewTabs"
  );
  const { JournalTileActions, JournalTileTitle } = await import(
    "@/app/components/app-workspace/JournalTileChrome"
  );
  return {
    default: function MockJournalTradesView({
      variant = "trades",
    }: {
      variant?: "trades" | "open";
    }) {
      return (
        <>
          <JournalModuleHeader
            sticky
            title={<JournalTileTitle />}
            leading={<JournalViewTabs />}
            trailing={<JournalTileActions />}
          >
            <div data-testid="journal-scope-bar">Scope</div>
          </JournalModuleHeader>
          {variant === "open" ? (
            <div data-testid="journal-open-positions-view">Open Positions</div>
          ) : (
            <div data-testid="journal-trades-view">Trades</div>
          )}
        </>
      );
    },
  };
});

vi.mock("@/app/components/journal/JournalSettingsView", async () => {
  const { default: JournalModuleHeader } = await import(
    "@/app/components/journal/JournalModuleHeader"
  );
  const { JournalTileActions, JournalTileTitle } = await import(
    "@/app/components/app-workspace/JournalTileChrome"
  );
  const { default: JournalViewTabs } = await import("@/app/components/journal/JournalViewTabs");
  return {
    default: function MockJournalSettingsView() {
      return (
        <>
          <JournalModuleHeader
            title={<JournalTileTitle />}
            leading={<JournalViewTabs />}
            trailing={<JournalTileActions />}
          />
          <div data-testid="journal-settings-view">Settings</div>
        </>
      );
    },
  };
});

vi.mock("@/app/components/journal/JournalSyncProvider", () => ({
  JournalSyncProvider: ({ children }: { children: React.ReactNode }) => children,
  useJournalSync: () => ({
    syncing: false,
    syncNow: vi.fn(),
  }),
}));

vi.mock("@/app/components/journal/JournalTradesProvider", () => ({
  JournalTradesProvider: ({ children }: { children: React.ReactNode }) => children,
  useJournalTrades: () => ({
    allTrades: [],
    loadTrades: vi.fn(),
    setAllTrades: vi.fn(),
  }),
}));

vi.mock("@/app/components/journal/JournalHistorySyncChip", () => ({
  default: () => null,
}));

vi.mock("@/app/components/journal/JournalImportDialog", () => ({
  default: () => (
    <button type="button" aria-label="Import Flex CSV" data-testid="journal-import-flex">
      Import
    </button>
  ),
}));

function JournalTileHarness() {
  const { document, assignWorkspaceTileSurface } = useAppWorkspace();
  const firstTileId = Object.keys(document.tiles)[0];

  useEffect(() => {
    if (firstTileId) {
      assignWorkspaceTileSurface(firstTileId, "journal");
    }
  }, [assignWorkspaceTileSurface, firstTileId]);

  const journalTile = Object.values(document.tiles).find((tile) => tile.surfaceId === "journal");
  if (!journalTile) return null;

  return (
    <TileDensityOverrideProvider mode="standard" width={640}>
      <JournalTileSurface tileId={journalTile.id} surfaceState={journalTile.surfaceState} />
    </TileDensityOverrideProvider>
  );
}

function renderJournalTile() {
  return render(
    <AppWorkspaceProvider>
      <JournalTileHarness />
    </AppWorkspaceProvider>,
  );
}

describe("JournalTileSurface", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses combined module header instead of link sub-nav", async () => {
    renderJournalTile();
    await waitFor(() => {
      expect(screen.getByTestId("journal-module-header")).toBeTruthy();
    });
    expect(screen.queryByTestId("journal-subnav")).not.toBeInTheDocument();
  });

  it("shows Journal title, tabs, filters, and actions in one header row", async () => {
    renderJournalTile();
    await waitFor(() => {
      expect(screen.getByTestId("journal-title")).toHaveTextContent("Journal");
    });
    const header = screen.getByTestId("journal-module-header");
    expect(within(header).getByRole("tablist")).toBeInTheDocument();
    expect(within(header).getByTestId("journal-scope-bar")).toBeInTheDocument();
    expect(within(header).getByTestId("journal-tile-actions")).toBeInTheDocument();
  });

  it("renders underline view tabs inside the combined header", async () => {
    renderJournalTile();
    await waitFor(() => {
      expect(screen.getByTestId("journal-dashboard-view")).toBeTruthy();
    });
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Trades" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Open Positions" })).toBeInTheDocument();
  });

  it("switches views through workspace surface state", async () => {
    renderJournalTile();
    await waitFor(() => {
      expect(screen.getByTestId("journal-dashboard-view")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("tab", { name: "Trades" }));
    await waitFor(() => {
      expect(screen.getByTestId("journal-trades-view")).toBeTruthy();
    });
    expect(screen.queryByTestId("journal-dashboard-view")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Open Positions" }));
    await waitFor(() => {
      expect(screen.getByTestId("journal-open-positions-view")).toBeTruthy();
    });
    expect(screen.queryByTestId("journal-trades-view")).not.toBeInTheDocument();
  });

  it("opens settings through the cog button without stripping header tabs", async () => {
    renderJournalTile();
    await waitFor(() => {
      expect(screen.getByTestId("journal-dashboard-view")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Journal settings" }));
    await waitFor(() => {
      expect(screen.getByTestId("journal-settings-view")).toBeTruthy();
    });
    expect(screen.queryByTestId("journal-dashboard-view")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Dashboard" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Trades" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Open Positions" })).toBeInTheDocument();
  });

  it("toggles settings closed through the cog button", async () => {
    renderJournalTile();
    await waitFor(() => {
      expect(screen.getByTestId("journal-dashboard-view")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Journal settings" }));
    await waitFor(() => {
      expect(screen.getByTestId("journal-settings-view")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Journal settings" }));
    await waitFor(() => {
      expect(screen.getByTestId("journal-dashboard-view")).toBeTruthy();
    });
    expect(screen.queryByTestId("journal-settings-view")).not.toBeInTheDocument();
  });

  it("returns to dashboard when clicking the journal title from settings", async () => {
    renderJournalTile();
    await waitFor(() => {
      expect(screen.getByTestId("journal-dashboard-view")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Journal settings" }));
    await waitFor(() => {
      expect(screen.getByTestId("journal-settings-view")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Back to journal dashboard" }));
    await waitFor(() => {
      expect(screen.getByTestId("journal-dashboard-view")).toBeTruthy();
    });
    expect(screen.queryByTestId("journal-settings-view")).not.toBeInTheDocument();
  });

  it("exposes sync and import as icon buttons in the tile header", async () => {
    renderJournalTile();
    await waitFor(() => {
      expect(screen.getByTestId("journal-module-header")).toBeTruthy();
    });
    const header = within(screen.getByTestId("journal-module-header"));
    expect(header.getByRole("button", { name: "Sync fills" })).toBeInTheDocument();
    expect(header.getByRole("button", { name: "Import Flex CSV" })).toBeInTheDocument();
  });
});
