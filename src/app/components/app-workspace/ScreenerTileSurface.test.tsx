/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";

import ScreenerTileSurface from "./ScreenerTileSurface";
import { AppWorkspaceProvider, useAppWorkspace } from "./AppWorkspaceContext";
import { TileDensityOverrideProvider } from "./TileDensityContext";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/app/components/screener/ScreenerScreensBody", () => ({
  ScreenerScreensBody: () => <div data-testid="screener-unified-view">Screens</div>,
}));

vi.mock("@/app/components/screener/ScreenerResultsBody", () => ({
  ScreenerResultsBody: () => <div data-testid="screener-results-view">Results</div>,
}));

vi.mock("@/app/components/screener/ScreenerProvider", () => ({
  ScreenerProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/app/components/MarketDataProvider", () => ({
  MarketDataProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/app/components/watchlist/WatchlistContext", () => ({
  WatchlistProvider: ({ children }: { children: ReactNode }) => children,
}));

function ScreenerTileHarness({
  initialView,
}: {
  initialView?: "review" | "screens" | "results" | "keepers";
}) {
  const { document, assignWorkspaceTileSurface, updateWorkspaceTileSurfaceState } =
    useAppWorkspace();
  const firstTileId = Object.keys(document.tiles)[0];

  useEffect(() => {
    if (!firstTileId) return;
    assignWorkspaceTileSurface(firstTileId, "screener");
    if (initialView) {
      updateWorkspaceTileSurfaceState(firstTileId, { screenerView: initialView });
    }
  }, [assignWorkspaceTileSurface, firstTileId, initialView, updateWorkspaceTileSurfaceState]);

  const screenerTile = Object.values(document.tiles).find((tile) => tile.surfaceId === "screener");
  if (!screenerTile) return null;

  return (
    <TileDensityOverrideProvider mode="standard" width={640}>
      <ScreenerTileSurface tileId={screenerTile.id} surfaceState={screenerTile.surfaceState} />
    </TileDensityOverrideProvider>
  );
}

function renderScreenerTile(initialView?: "review" | "screens" | "results" | "keepers") {
  return render(
    <AppWorkspaceProvider>
      <ScreenerTileHarness initialView={initialView} />
    </AppWorkspaceProvider>,
  );
}

describe("ScreenerTileSurface", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders unified screens pane full width without tile subnav", async () => {
    renderScreenerTile();
    await waitFor(() => {
      expect(screen.getByTestId("screener-tile-surface")).toBeTruthy();
    });
    expect(screen.queryByTestId("screener-subnav")).not.toBeInTheDocument();
    expect(screen.getByTestId("screener-unified-view")).toBeTruthy();
  });

  it("coerces legacy review view to unified screens pane", async () => {
    renderScreenerTile("review");
    await waitFor(() => {
      expect(screen.getByTestId("screener-unified-view")).toBeTruthy();
    });
    expect(screen.queryByTestId("screener-review-view")).not.toBeInTheDocument();
    expect(screen.queryByTestId("screener-subnav")).not.toBeInTheDocument();
  });

  it("coerces legacy keepers view to unified screens pane", async () => {
    renderScreenerTile("keepers");
    await waitFor(() => {
      expect(screen.getByTestId("screener-unified-view")).toBeTruthy();
    });
    expect(screen.queryByTestId("screener-keepers-view")).not.toBeInTheDocument();
  });
});
