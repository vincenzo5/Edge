/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DataHealthLatencySection from "./DataHealthLatencySection";
import MarketDataLatencyDiagnosticsView from "./MarketDataLatencyDiagnosticsView";
import {
  getMarketDataTelemetrySnapshot,
  recordMarketDataTelemetry,
  resetMarketDataTelemetry,
} from "@/lib/marketData/telemetry";

describe("DataHealthLatencySection", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_MARKET_DATA_TELEMETRY", "1");
    resetMarketDataTelemetry(1_000);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders collapsed by default and hides diagnostics body", async () => {
    recordMarketDataTelemetry("warmup.response", { clientMs: 42, ok: true });
    render(<DataHealthLatencySection />);

    await waitFor(() => {
      expect(screen.getByTestId("data-health-latency-section")).toBeInTheDocument();
    });

    expect(screen.getByTestId("data-health-latency-toggle")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("data-health-latency-diagnostics")).not.toBeInTheDocument();
    expect(screen.getByText("warmup.response 42ms")).toBeInTheDocument();
  });

  it("expands to show latency diagnostics on toggle click", async () => {
    recordMarketDataTelemetry("candles.fetch", { clientMs: 12, symbol: "AAPL" });
    render(<DataHealthLatencySection />);

    await waitFor(() => {
      expect(screen.getByTestId("data-health-latency-toggle")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("data-health-latency-toggle"));

    expect(screen.getByTestId("data-health-latency-toggle")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("data-health-latency-diagnostics")).toBeInTheDocument();
    expect(screen.getByText("candles.fetch")).toBeInTheDocument();
  });

  it("updates summary hint when new telemetry is recorded while collapsed", async () => {
    render(<DataHealthLatencySection />);

    await waitFor(() => {
      expect(screen.getByTestId("data-health-latency-section")).toBeInTheDocument();
    });

    act(() => {
      recordMarketDataTelemetry("quotes.firstPaint", { clientMs: 99, ok: true });
    });

    expect(screen.getByText("quotes.firstPaint 99ms")).toBeInTheDocument();
  });

  it("does not render when telemetry is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_MARKET_DATA_TELEMETRY", "0");
    render(<DataHealthLatencySection />);
    expect(screen.queryByTestId("data-health-latency-section")).not.toBeInTheDocument();
  });
});

describe("MarketDataLatencyDiagnosticsView", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_MARKET_DATA_TELEMETRY", "1");
    resetMarketDataTelemetry(1_000);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders traces, kind summary, and recent events from snapshot", () => {
    recordMarketDataTelemetry("candles.fetch", { clientMs: 12, symbol: "AAPL" });
    const snapshot = getMarketDataTelemetrySnapshot();

    render(
      <MarketDataLatencyDiagnosticsView snapshot={snapshot} sessionElapsedMs={500} />,
    );

    expect(screen.getByText("candles.fetch")).toBeInTheDocument();
    expect(screen.getByText(/Session\s+500ms/)).toBeInTheDocument();
    expect(screen.getByTestId("data-health-latency-copy-json")).toBeInTheDocument();
  });
});
