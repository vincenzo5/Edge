/** @vitest-environment jsdom */
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MarketDataTelemetryPanel, {
  MarketDataTelemetryPanelView,
} from "./MarketDataTelemetryPanel";
import {
  getMarketDataTelemetrySnapshot,
  recordMarketDataTelemetry,
  resetMarketDataTelemetry,
} from "@/lib/marketData/telemetry";

describe("MarketDataTelemetryPanel", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_MARKET_DATA_TELEMETRY", "1");
    resetMarketDataTelemetry(1_000);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders telemetry rows from the external store after mount", async () => {
    recordMarketDataTelemetry("warmup.response", { clientMs: 42, ok: true });
    render(<MarketDataTelemetryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("market-data-telemetry-panel")).toBeInTheDocument();
    });
    expect(screen.getByText("warmup.response")).toBeInTheDocument();
  });

  it("updates when new telemetry is recorded", async () => {
    render(<MarketDataTelemetryPanel />);
    await waitFor(() => {
      expect(screen.getByTestId("market-data-telemetry-panel")).toBeInTheDocument();
    });

    act(() => {
      recordMarketDataTelemetry("quotes.firstPaint", { clientMs: 99, ok: true });
    });

    expect(screen.getByText("quotes.firstPaint")).toBeInTheDocument();
  });

  it("renders the extracted view from a snapshot", () => {
    recordMarketDataTelemetry("candles.fetch", { clientMs: 12, symbol: "AAPL" });
    const snapshot = getMarketDataTelemetrySnapshot();

    render(
      <MarketDataTelemetryPanelView
        open
        setOpen={vi.fn()}
        snapshot={snapshot}
        sessionElapsedMs={500}
      />,
    );

    expect(screen.getByText("candles.fetch")).toBeInTheDocument();
    expect(screen.getByText(/Session\s+500ms/)).toBeInTheDocument();
    expect(screen.getByTestId("data-health-latency-copy-json")).toBeInTheDocument();
  });
});
