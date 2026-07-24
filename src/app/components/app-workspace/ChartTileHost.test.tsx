/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import ChartTileHost from "./ChartTileHost";
import { AppWorkspaceProvider } from "./AppWorkspaceContext";

const journalOverlayMountSpy = vi.hoisted(() => vi.fn());
const stockAppRenderSpy = vi.hoisted(() => vi.fn());

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockJournalChartOverlayProvider({ children }: { children: React.ReactNode }) {
      journalOverlayMountSpy();
      return <div data-testid="journal-overlay-provider">{children}</div>;
    },
}));

vi.mock("@/app/components/StockApp", () => ({
  default: () => {
    stockAppRenderSpy();
    return <div data-testid="stock-app" />;
  },
}));

function renderChartTileHost() {
  return render(
    <AppWorkspaceProvider>
      <ChartTileHost tileId="tile-1" isPrimaryChartTile chartWorkspaceId={undefined} />
    </AppWorkspaceProvider>,
  );
}

describe("ChartTileHost journal overlay gate", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    journalOverlayMountSpy.mockClear();
    stockAppRenderSpy.mockClear();
    window.localStorage.clear();
  });

  it("does not mount journal overlay provider on chart-only URL", () => {
    renderChartTileHost();

    expect(screen.getByTestId("stock-app")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-overlay-provider")).not.toBeInTheDocument();
    expect(journalOverlayMountSpy).not.toHaveBeenCalled();
    expect(stockAppRenderSpy).toHaveBeenCalled();
  });

  it("mounts journal overlay provider when journalTrade is present", () => {
    searchParams = new URLSearchParams("symbol=SPY&journalTrade=trade-1");

    renderChartTileHost();

    expect(screen.getByTestId("journal-overlay-provider")).toBeInTheDocument();
    expect(screen.getByTestId("stock-app")).toBeInTheDocument();
    expect(journalOverlayMountSpy).toHaveBeenCalled();
  });
});
