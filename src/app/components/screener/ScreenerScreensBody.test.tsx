/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScreenerScreensBody } from "./ScreenerScreensBody";
import { ScreenerResultsBody } from "./ScreenerResultsBody";
import { ScreenerProvider } from "./ScreenerProvider";
import { MarketDataProvider } from "../MarketDataProvider";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";

vi.mock("@/lib/chartDataFeed/apiScreenerFeed", () => ({
  fetchScreenerResults: vi.fn(async () => ({
    rows: [],
    meta: { source: "fmp", warnings: [], skippedSymbols: [], stale: false },
  })),
  fetchMarketMoverResults: vi.fn(async () => ({
    rows: [],
    meta: { source: "fmp", warnings: [], skippedSymbols: [], stale: false },
  })),
}));

function renderScreensBody() {
  return render(
    <ScreenerProvider>
      <MarketDataProvider layout={DEFAULT_LAYOUT}>
        <ScreenerScreensBody
          active
          variant="app"
          resultsSlot={<ScreenerResultsBody active variant="app" embedded />}
        />
      </MarketDataProvider>
    </ScreenerProvider>,
  );
}

describe("ScreenerScreensBody", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders Option B chrome: title, Run, active name, Save in Screens rail", () => {
    renderScreensBody();
    expect(screen.getByTestId("screener-unified-view")).toBeTruthy();
    expect(screen.getByTestId("screener-title")).toHaveTextContent("Stock Screener");
    expect(screen.getByTestId("screener-run-button")).toBeTruthy();
    expect(screen.getByTestId("screener-active-screen-name")).toHaveTextContent("Untitled screen");
    expect(screen.getByTestId("screener-screens-aside")).toContainElement(
      screen.getByTestId("screener-save-open"),
    );
    expect(screen.getByTestId("screener-never-run-hint")).toBeTruthy();
    expect(screen.getByTestId("screener-screen-gainers")).toBeTruthy();
  });

  it("highlights the selected screen and updates the active name", async () => {
    renderScreensBody();
    fireEvent.click(screen.getByTestId("screener-screen-gainers"));
    expect(await screen.findByTestId("screener-active-screen-name")).toHaveTextContent(
      "Gainers today",
    );
    expect(screen.getByTestId("screener-screen-active-row")).toHaveTextContent("Gainers today");
  });
});
