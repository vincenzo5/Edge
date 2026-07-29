/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ScreenerScreensBody } from "./ScreenerScreensBody";
import { ScreenerResultsBody } from "./ScreenerResultsBody";
import { ScreenerProvider } from "./ScreenerProvider";
import { MarketDataProvider } from "../MarketDataProvider";
import { TileDensityOverrideProvider } from "../app-workspace/TileDensityContext";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";

vi.mock("@/lib/chartDataFeed/apiScreenerFeed", () => ({
  fetchScreenerResults: vi.fn(async () => ({
    rows: [],
    meta: { source: "fmp", warnings: [], skippedSymbols: [], stale: false },
  })),
  fetchMarketMoverResults: vi.fn(async () => ({
    rows: [{ symbol: "AAPL", name: "Apple Inc." }],
    meta: { source: "fmp", warnings: [], skippedSymbols: [], stale: false },
  })),
}));

vi.mock("@/lib/screener/screenerAlertClient", () => ({
  fetchScreenerAlerts: vi.fn(async () => []),
}));

vi.mock("@/lib/persistence/client/screenerLibraryClient", () => ({
  fetchScreenerLibrary: vi.fn(async () => null),
  saveScreenerLibraryRemote: vi.fn(async () => ({ ok: true, record: { syncRevision: 1, updatedAt: new Date().toISOString() } })),
}));

function renderScreensBody(density: { mode: "compact" | "standard" | "wide"; width: number } = { mode: "wide", width: 1200 }) {
  return render(
    <TileDensityOverrideProvider mode={density.mode} width={density.width}>
      <ScreenerProvider>
        <MarketDataProvider layout={DEFAULT_LAYOUT}>
          <ScreenerScreensBody
            active
            variant="app"
            resultsSlot={<ScreenerResultsBody active variant="app" embedded />}
          />
        </MarketDataProvider>
      </ScreenerProvider>
    </TileDensityOverrideProvider>,
  );
}

describe("ScreenerScreensBody", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders full-width app chrome with inline screen name and rename control", () => {
    renderScreensBody();
    expect(screen.getByTestId("screener-unified-view")).toBeTruthy();
    expect(screen.getByTestId("screener-title")).toHaveTextContent("Stock Screener");
    const runButton = screen.getByTestId("screener-run-button");
    expect(runButton).toContainElement(screen.getByTestId("screener-run-shortcut-hint"));
    expect(screen.getByTestId("screener-screens-aside")).toHaveClass("hidden");
    expect(screen.getByTestId("screener-screens-chips")).toBeTruthy();
    expect(screen.getByTestId("screener-screen-chip-gainers")).toBeTruthy();
    expect(screen.getByTestId("screener-active-screen-name")).toHaveTextContent("Untitled screen");
    expect(screen.getByTestId("screener-rename-open")).toBeTruthy();
    expect(screen.queryByTestId("screener-save-name")).toBeNull();
    expect(screen.getByTestId("screener-never-run-hint")).toBeTruthy();
  });

  it("runs custom query on Cmd/Ctrl+Enter in the workspace screener tile", async () => {
    const { fetchScreenerResults } = await import("@/lib/chartDataFeed/apiScreenerFeed");
    renderScreensBody();
    fireEvent.click(screen.getByTestId("screener-add-rule"));
    fireEvent.keyDown(window, { key: "Enter", metaKey: true });
    expect(fetchScreenerResults).toHaveBeenCalled();
  });

  it("saves a custom screen by name and shows it in the chip row", async () => {
    renderScreensBody();
    await waitFor(() => {
      expect(screen.getByTestId("screener-screen-chip-gainers")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("screener-rename-open"));
    fireEvent.change(screen.getByTestId("screener-save-name"), {
      target: { value: "My tech screen" },
    });
    fireEvent.click(screen.getByTestId("screener-save-button"));
    await waitFor(() => {
      expect(screen.getByTestId("screener-active-screen-name")).toHaveTextContent("My tech screen");
    });
    expect(screen.getByTestId("screener-screens-chips")).toHaveTextContent("My tech screen");
    expect(screen.getByTestId("screener-rename-open")).toBeTruthy();
    expect(screen.queryByTestId("screener-save-name")).toBeNull();
    expect(screen.queryByTestId("screener-save-error")).toBeNull();
  });

  it("saves a name after running a custom query", async () => {
    const { fetchScreenerResults } = await import("@/lib/chartDataFeed/apiScreenerFeed");
    renderScreensBody();
    fireEvent.click(screen.getByTestId("screener-add-rule"));
    fireEvent.click(screen.getByTestId("screener-run-button"));
    await waitFor(() => {
      expect(fetchScreenerResults).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByTestId("screener-rename-open"));
    fireEvent.change(screen.getByTestId("screener-save-name"), {
      target: { value: "After run screen" },
    });
    fireEvent.click(screen.getByTestId("screener-save-button"));
    await waitFor(() => {
      expect(screen.getByTestId("screener-active-screen-name")).toHaveTextContent("After run screen");
    });
    expect(screen.getByTestId("screener-screens-chips")).toHaveTextContent("After run screen");
  });

  it("loads a screen from chips and records it under Recent", async () => {
    renderScreensBody();
    fireEvent.click(screen.getByTestId("screener-screen-chip-gainers"));
    await waitFor(() => {
      expect(screen.getByTestId("screener-recent-screens")).toBeTruthy();
    });
    expect(screen.getByTestId("screener-recent-chip-gainers")).toBeTruthy();
    expect(screen.getByTestId("screener-active-screen-name")).toHaveTextContent("Gainers today");
  });

  it("shows screen chips in compact app layout without aside", () => {
    renderScreensBody({ mode: "compact", width: 420 });
    expect(screen.getByTestId("screener-screens-aside")).toHaveClass("hidden");
    expect(screen.getByTestId("screener-screens-chips")).toBeTruthy();
    expect(screen.getByTestId("screener-screen-chip-gainers")).toBeTruthy();
  });

  it("surfaces FMP restriction banner and disables FMP-only presets after empty run", async () => {
    const { fetchMarketMoverResults } = await import("@/lib/chartDataFeed/apiScreenerFeed");
    vi.mocked(fetchMarketMoverResults).mockResolvedValueOnce({
      rows: [],
      meta: {
        source: "fmp",
        warnings: ["FMP endpoint restricted (403): account suspended"],
        skippedSymbols: [],
        stale: false,
      },
    });

    renderScreensBody();
    const gainersChip = screen.getByTestId("screener-screen-chip-gainers");
    expect(gainersChip).not.toBeDisabled();

    fireEvent.click(gainersChip);

    await waitFor(() => {
      expect(screen.getByTestId("screener-provider-restriction-banner")).toBeTruthy();
    });
    expect(screen.getByTestId("screener-provider-restriction-banner")).toHaveTextContent("403");
    expect(screen.getByTestId("screener-screen-chip-gainers")).toBeDisabled();
    expect(screen.getByTestId("screener-results-empty-restriction")).toBeTruthy();
  });
});
