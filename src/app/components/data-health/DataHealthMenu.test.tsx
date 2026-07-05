/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ActiveChartProvider } from "../ActiveChartContext";
import { DataHealthProvider } from "./DataHealthProvider";
import DataHealthButton from "./DataHealthButton";
import { recordHealthEvent, resetHealthEventsForTests } from "@/lib/marketData/healthEvents";

const chartMetaState = vi.hoisted(() => ({
  value: {
    source: "tws" as string,
    asOf: Date.now(),
    streaming: true,
    cacheTier: "hot-fresh" as string | undefined,
    stale: false as boolean | undefined,
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
    quotesBySymbol: new Map([["AAPL", {}], ["AMD", {}], ["NVDA", {}], ["TSM", {}]]),
    quotesLoading: false,
    quoteError: null,
    quotesMeta: {
      source: "tws",
      asOf: Date.now() - 5_000,
      stale: true,
      cacheTier: "hot-stale",
      latencyMs: 1411,
      warnings: [],
    },
    quotesTransport: "rest",
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

describe("DataHealthMenu readiness UX", () => {
  beforeEach(() => {
    chartMetaState.value = {
      source: "tws",
      asOf: Date.now(),
      streaming: true,
      cacheTier: "hot-fresh",
      stale: false,
    };
    resetHealthEventsForTests();
    recordHealthEvent({
      kind: "transport_fallback",
      message: "Quote stream first snapshot timeout",
      recovered: true,
      dataset: "watchlist",
    });
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

  it("shows healthy state with recent events after recovered SSE fallback", async () => {
    renderWithProviders(<DataHealthButton theme="dark" />);

    fireEvent.click(screen.getByTestId("chart-data-source-badge"));

    await waitFor(() => {
      expect(screen.getByText(/All loaded datasets ready/i)).toBeInTheDocument();
      expect(screen.getByText(/Issues/i)).toBeInTheDocument();
      expect(screen.getByTestId("data-health-issues")).toHaveTextContent(/timeout/i);
      expect(screen.getByTestId("data-health-issues")).toHaveTextContent(/recovered/i);
      expect(screen.getByTestId("data-health-dataset-watchlist")).toHaveTextContent(/TWS/i);
    });
  });

  it("shows chart OK without stale caveat when hot-stale but display-fresh", async () => {
    chartMetaState.value = {
      source: "tws",
      asOf: Date.now() - 30_000,
      streaming: false,
      cacheTier: "hot-stale",
      stale: true,
    };

    renderWithProviders(<DataHealthButton theme="dark" />);

    fireEvent.click(screen.getByTestId("chart-data-source-badge"));

    await waitFor(() => {
      expect(screen.getByText(/All loaded datasets ready/i)).toBeInTheDocument();
      expect(screen.getByTestId("data-health-dataset-chart")).toHaveTextContent(/AAPL/i);
      expect(screen.getByTestId("data-health-dataset-chart")).toHaveTextContent(/8s ago|30s ago|just now/i);
    });

    expect(screen.queryByText(/Active Chart data is stale/i)).not.toBeInTheDocument();
  });
});
