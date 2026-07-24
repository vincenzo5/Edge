/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import * as chartCore from "@edge/chart-core";
import { ActiveChartProvider } from "../ActiveChartContext";
import { DataHealthProvider } from "./DataHealthProvider";
import DataHealthButton from "./DataHealthButton";

const chartMetaState = vi.hoisted(() => ({
  value: {
    source: "tws" as string,
    asOf: Date.now(),
    streaming: true,
    cacheTier: "hot-fresh" as string | undefined,
    stale: false as boolean | undefined,
    latencyMs: 120 as number | undefined,
  },
}));

vi.mock("../ActiveChartContext", async () => {
  const actual = await vi.importActual<typeof import("../ActiveChartContext")>(
    "../ActiveChartContext",
  );
  return {
    ...actual,
    useActiveChart: () => ({
      config: { symbol: "AAPL", interval: "1d" },
      dataMeta: chartMetaState.value,
    }),
  };
});

vi.mock("../MarketDataProvider", () => ({
  useMarketDataQuotes: () => ({
    quotesBySymbol: new Map([["AAPL", {}]]),
    quotesLoading: false,
    quoteError: null,
    quotesMeta: {
      source: "tws",
      asOf: Date.now(),
      lastUpdateAt: Date.now(),
      stale: false,
      cacheTier: "cold",
      warnings: [],
    },
    quotesTransport: "rest",
    watchlistSymbolCount: 1,
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
    chartMetaState.value = {
      source: "tws",
      asOf: Date.now(),
      streaming: true,
      cacheTier: "hot-fresh",
      stale: false,
      latencyMs: 120,
    };
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
                label: "IB Gateway",
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

  it("renders icon-only badge with accessible label and opens health menu", async () => {
    renderWithProviders(<DataHealthButton theme="dark" />);

    const badge = screen.getByTestId("chart-data-source-badge");
    expect(badge.textContent?.trim()).toBe("");

    await waitFor(() => {
      expect(badge).toHaveAttribute(
        "aria-label",
        expect.stringMatching(/Current/i),
      );
    });

    fireEvent.click(badge);

    await waitFor(() => {
      expect(screen.getByText("Data Health")).toBeTruthy();
      expect(screen.getByText(/Current data/i)).toBeTruthy();
      expect(screen.getByTestId("data-health-dataset-chart")).toBeTruthy();
      expect(screen.getByTestId("data-health-dataset-watchlist")).toBeTruthy();
    });
  });

  it("shows healthy badge when chart is hot-stale but display-fresh", async () => {
    vi.spyOn(chartCore, "classifyUsEquitySession").mockReturnValue("closed");
    chartMetaState.value = {
      source: "tws",
      asOf: Date.now() - 30_000,
      streaming: false,
      cacheTier: "hot-stale",
      stale: true,
      latencyMs: 0,
    };

    renderWithProviders(<DataHealthButton theme="dark" />);

    const badge = screen.getByTestId("chart-data-source-badge");
    expect(badge.textContent?.trim()).toBe("");
    expect(badge.className).not.toMatch(/edge-warning/);

    fireEvent.click(badge);

    await waitFor(() => {
      expect(screen.getByTestId("data-health-session-subtitle")).toHaveTextContent(
        /Market closed · quotes current/i,
      );
    });
  });

  it("shows collapsible latency diagnostics inside diagnostics when telemetry enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_MARKET_DATA_TELEMETRY", "1");
    renderWithProviders(<DataHealthButton theme="dark" />);

    fireEvent.click(screen.getByTestId("chart-data-source-badge"));

    await waitFor(() => {
      expect(screen.getByTestId("data-health-diagnostics-toggle")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("data-health-diagnostics-toggle"));

    await waitFor(() => {
      expect(screen.getByTestId("data-health-latency-section")).toBeInTheDocument();
    });

    expect(screen.getByTestId("data-health-latency-toggle")).toHaveAttribute("aria-expanded", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
});
