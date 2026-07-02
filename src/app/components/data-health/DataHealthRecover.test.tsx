/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ActiveChartProvider } from "../ActiveChartContext";
import { DataHealthProvider } from "./DataHealthProvider";
import DataHealthButton from "./DataHealthButton";

const reloadMarketData = vi.fn();

vi.mock("../ActiveChartContext", async () => {
  const actual = await vi.importActual<typeof import("../ActiveChartContext")>(
    "../ActiveChartContext",
  );
  return {
    ...actual,
    useActiveChart: () => ({
      config: { symbol: "AAPL", interval: "1d" },
      dataMeta: {
        source: "yahoo",
        asOf: Date.now(),
        stale: true,
        cacheTier: "hot-stale",
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
      source: "yahoo",
      asOf: Date.now(),
      stale: true,
      cacheTier: "hot-stale",
    },
    quotesTransport: "rest",
    watchlistSymbolCount: 2,
    recoverySymbols: ["AAPL", "SPY"],
    recoveryCandleRequests: [{ symbol: "AAPL", interval: "1d", range: "1mo" }],
    recoveryOptionsSymbol: "AAPL",
    reloadToken: 0,
    reloadMarketData,
  }),
}));

function renderWithProviders(ui: ReactNode) {
  return render(
    <ActiveChartProvider>
      <DataHealthProvider>{ui}</DataHealthProvider>
    </ActiveChartProvider>,
  );
}

describe("DataHealth recover TWS", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/market-data/tws/recover")) {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              commandState: "confirmed",
              action: "reconnected",
              message: "TWS reconnected to IB Gateway.",
            }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({
            health: {
              generatedAt: Date.now(),
              providers: [
                {
                  id: "tws",
                  label: "TWS",
                  configured: true,
                  status: "degraded",
                  detail: "Sidecar ok · Gateway disconnected",
                  circuitOpen: true,
                  circuitReason: "gateway_disconnected",
                },
              ],
              recentWarnings: [],
            },
          }),
        } as Response;
      }) as unknown as typeof fetch,
    );
  });

  it("shows recover button for degraded TWS and runs recovery", async () => {
    renderWithProviders(<DataHealthButton theme="dark" />);
    fireEvent.click(screen.getByTestId("chart-data-source-badge"));

    await waitFor(() => {
      expect(screen.getByTestId("data-health-recover-tws")).toBeTruthy();
    });

    expect(screen.getByTestId("data-health-recover-tws")).toHaveTextContent("Reconnect TWS");
    fireEvent.click(screen.getByTestId("data-health-recover-tws"));

    await waitFor(() => {
      expect(screen.getByTestId("data-health-recover-message")).toHaveTextContent(
        "TWS reconnected to IB Gateway.",
      );
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/market-data/tws/recover",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          symbols: ["AAPL", "SPY"],
          candleRequests: [{ symbol: "AAPL", interval: "1d", range: "1mo" }],
          optionsSymbol: "AAPL",
        }),
      }),
    );
    expect(reloadMarketData).toHaveBeenCalledOnce();
  });

  it("reloads market data after reconnect timeout once recovery status confirms", async () => {
    let recoverRequested = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/market-data/tws/recover/status")) {
          return {
            ok: true,
            json: async () => ({
              ok: recoverRequested,
              finalized: recoverRequested,
              message: recoverRequested
                ? "Gateway connected."
                : "Reconnecting to IB Gateway at 127.0.0.1:4001…",
              recoveryPhase: recoverRequested ? "confirmed" : "reconnect_in_progress",
            }),
          } as Response;
        }
        if (url.includes("/api/market-data/tws/recover")) {
          recoverRequested = true;
          return {
            ok: true,
            json: async () => ({
              ok: false,
              commandState: "timed_out",
              action: "reconnected",
              message: "Reconnecting to IB Gateway at 127.0.0.1:4001…",
              recoveryPhase: "reconnect_in_progress",
            }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({
            health: {
              generatedAt: Date.now(),
              providers: [
                {
                  id: "tws",
                  label: "TWS",
                  configured: true,
                  status: recoverRequested ? "healthy" : "degraded",
                  detail: recoverRequested
                    ? "Sidecar ok · Gateway connected"
                    : "Reconnecting · 127.0.0.1:4001",
                  circuitOpen: !recoverRequested,
                  circuitReason: recoverRequested ? undefined : "gateway_disconnected",
                },
              ],
              recentWarnings: [],
            },
          }),
        } as Response;
      }) as unknown as typeof fetch,
    );

    renderWithProviders(<DataHealthButton theme="dark" />);
    fireEvent.click(screen.getByTestId("chart-data-source-badge"));

    await waitFor(() => {
      expect(screen.getByTestId("data-health-recover-tws")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("data-health-recover-tws"));

    await waitFor(() => {
      expect(reloadMarketData).toHaveBeenCalledOnce();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
