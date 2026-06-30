/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ActiveChartProvider } from "../ActiveChartContext";
import { DataHealthProvider } from "./DataHealthProvider";
import DataHealthButton from "./DataHealthButton";

vi.mock("../ActiveChartContext", async () => {
  const actual = await vi.importActual<typeof import("../ActiveChartContext")>(
    "../ActiveChartContext",
  );
  return {
    ...actual,
    useActiveChart: () => ({
      config: { symbol: "AAPL", interval: "1d" },
      dataMeta: {
        source: "tws",
        asOf: Date.now(),
        streaming: true,
        cacheTier: "hot-fresh",
        latencyMs: 120,
      },
    }),
  };
});

vi.mock("../MarketDataProvider", () => ({
  useMarketDataQuotes: () => ({
    quotesBySymbol: new Map(),
    quotesLoading: false,
    quoteError: null,
    quotesMeta: {
      source: "mixed",
      asOf: Date.now(),
      stale: true,
      cacheTier: "hot-stale",
    },
    quotesTransport: "sse",
    watchlistSymbolCount: 4,
    recoverySymbols: [],
    recoveryCandleRequests: [],
    recoveryOptionsSymbol: null,
    reloadToken: 0,
    reloadMarketData: vi.fn(),
  }),
}));

function renderWithProviders(ui: ReactNode) {
  return render(
    <ActiveChartProvider>
      <DataHealthProvider>{ui}</DataHealthProvider>
    </ActiveChartProvider>,
  );
}

describe("DataHealthButton", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          health: {
            generatedAt: Date.now(),
            providers: [
              {
                id: "tws",
                label: "TWS",
                configured: true,
                status: "healthy",
                detail: "Sidecar ok · Gateway connected",
              },
            ],
            recentWarnings: [],
          },
        }),
      })) as unknown as typeof fetch,
    );
  });

  it("renders summary badge and opens health menu", async () => {
    renderWithProviders(<DataHealthButton theme="dark" />);

    expect(screen.getByTestId("chart-data-source-badge")).toHaveTextContent("TWS");
    fireEvent.click(screen.getByTestId("chart-data-source-badge"));

    await waitFor(() => {
      expect(screen.getByText("Data Health")).toBeTruthy();
      expect(screen.getByTestId("data-health-dataset-chart")).toBeTruthy();
      expect(screen.getByTestId("data-health-dataset-watchlist")).toBeTruthy();
    });
  });

  it("shows collapsible latency diagnostics in menu when telemetry enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_MARKET_DATA_TELEMETRY", "1");
    renderWithProviders(<DataHealthButton theme="dark" />);

    fireEvent.click(screen.getByTestId("chart-data-source-badge"));

    await waitFor(() => {
      expect(screen.getByTestId("data-health-latency-section")).toBeInTheDocument();
    });

    expect(screen.getByTestId("data-health-latency-toggle")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("data-health-latency-diagnostics")).not.toBeInTheDocument();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });
});
