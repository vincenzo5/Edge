/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ActiveChartProvider } from "../ActiveChartContext";
import { DataHealthProvider } from "../data-health/DataHealthProvider";
import ChartOverlayStatusStack from "./ChartOverlayStatusStack";

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
    quotesMeta: null,
    quotesTransport: "rest",
    watchlistSymbolCount: 0,
    recoverySymbols: [],
    recoveryCandleRequests: [],
    recoveryOptionsSymbol: null,
    reloadToken: 0,
    reloadMarketData: vi.fn(),
  }),
}));

function renderStack(
  ui: ReactNode,
  fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      health: {
        generatedAt: Date.now(),
        providers: [],
        recentWarnings: [],
      },
    }),
  })),
) {
  vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
  return render(
    <ActiveChartProvider>
      <DataHealthProvider>{ui}</DataHealthProvider>
    </ActiveChartProvider>,
  );
}

describe("ChartOverlayStatusStack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders data health badge when showDataHealth is true", () => {
    renderStack(
      <ChartOverlayStatusStack
        theme="dark"
        showDataHealth
        error={null}
        streamError={null}
        stale={false}
        refreshing={false}
      />,
    );

    expect(screen.getByTestId("chart-overlay-status-stack")).toBeInTheDocument();
    expect(screen.getByTestId("chart-data-source-badge")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-feed-status-badge")).toBeNull();
  });

  it("stacks feed status badge above data health when stale", () => {
    renderStack(
      <ChartOverlayStatusStack
        theme="dark"
        showDataHealth
        error={null}
        streamError={null}
        stale
        refreshing={false}
        source="tws"
      />,
    );

    expect(screen.getByTestId("chart-feed-status-stale")).toHaveTextContent(/Stale data · tws/);
    expect(screen.getByTestId("chart-data-source-badge")).toBeInTheDocument();
  });

  it('renders unified status pill with health dot only (no session label)', () => {
    renderStack(
      <ChartOverlayStatusStack
        theme="dark"
        showDataHealth
        marketSessionLabel="Market closed"
        showMarketStatus
        error={null}
        streamError={null}
        stale={false}
        refreshing={false}
      />,
    );

    expect(screen.getByTestId("chart-overlay-status-row")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-market-session-label")).toBeNull();
    expect(screen.getByTestId("chart-data-source-badge")).toBeInTheDocument();
  });

  it("positions overlay left of the price axis strip", () => {
    renderStack(
      <ChartOverlayStatusStack
        theme="dark"
        showDataHealth
        error={null}
        streamError={null}
        stale={false}
        refreshing={false}
      />,
    );

    const stack = screen.getByTestId("chart-overlay-status-stack");
    expect(stack).toHaveStyle({ right: "58px" });
  });

  it('never renders market session label regardless of showMarketStatus', () => {
    renderStack(
      <ChartOverlayStatusStack
        theme="dark"
        showDataHealth
        marketSessionLabel="Market closed"
        showMarketStatus={false}
        error={null}
        streamError={null}
        stale={false}
        refreshing={false}
      />,
    );

    expect(screen.queryByTestId("chart-market-session-label")).toBeNull();
    expect(screen.getByTestId("chart-data-source-badge")).toBeInTheDocument();
  });

  it("falls back to standalone feed badge when showDataHealth is false", () => {
    render(
      <ChartOverlayStatusStack
        theme="dark"
        showDataHealth={false}
        error={null}
        streamError={null}
        stale
        refreshing={false}
        source="yahoo"
      />,
    );

    expect(screen.queryByTestId("chart-overlay-status-stack")).toBeNull();
    expect(screen.queryByTestId("chart-data-source-badge")).toBeNull();
    expect(screen.getByTestId("chart-feed-status-stale")).toBeInTheDocument();
  });
});
