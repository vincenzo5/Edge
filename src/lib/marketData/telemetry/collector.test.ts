import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  exportMarketDataTelemetryJson,
  getMarketDataTelemetrySnapshot,
  recordMarketDataTelemetry,
  resetMarketDataTelemetry,
  subscribeMarketDataTelemetry,
} from "./collector";

describe("marketDataTelemetry collector", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_MARKET_DATA_TELEMETRY", "1");
    resetMarketDataTelemetry(1_000);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("records events when enabled", () => {
    recordMarketDataTelemetry("candles.fetch", { clientMs: 42, symbol: "AAPL" });
    const snap = getMarketDataTelemetrySnapshot();
    expect(snap.events).toHaveLength(1);
    expect(snap.events[0]?.kind).toBe("candles.fetch");
    expect(snap.summary["candles.fetch"]?.count).toBe(1);
    expect(snap.summary["candles.fetch"]?.lastMs).toBe(42);
  });

  it("groups events by trace and provider", () => {
    recordMarketDataTelemetry("candles.fetch", {
      traceId: "chart-load:AAPL",
      scenario: "chart-load:AAPL:1d:1y",
      clientMs: 120,
      serverMs: 95,
      provider: "yahoo",
      cacheTier: "cold",
    });
    recordMarketDataTelemetry("chart.candles.firstPaint", {
      traceId: "chart-load:AAPL",
      scenario: "chart-load:AAPL:1d:1y",
      clientMs: 130,
      provider: "yahoo",
      cacheTier: "cold",
    });

    const snap = getMarketDataTelemetrySnapshot();
    expect(snap.traces).toHaveLength(1);
    expect(snap.traces[0]?.traceId).toBe("chart-load:AAPL");
    expect(snap.traces[0]?.eventCount).toBe(2);
    expect(snap.byProvider.yahoo?.count).toBe(2);
    expect(snap.byCacheTier.cold?.count).toBe(2);
    expect(snap.slowestEvents[0]?.kind).toBe("chart.candles.firstPaint");
  });

  it("exports JSON snapshot", () => {
    recordMarketDataTelemetry("warmup.response", { clientMs: 10, ok: true });
    const json = exportMarketDataTelemetryJson();
    expect(JSON.parse(json).events).toHaveLength(1);
  });

  it("no-ops when disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_MARKET_DATA_TELEMETRY", "0");
    vi.stubEnv("NODE_ENV", "production");
    const event = recordMarketDataTelemetry("quotes.first");
    expect(event).toBeNull();
    expect(getMarketDataTelemetrySnapshot().events).toHaveLength(0);
  });

  it("notifies subscribers when events are recorded or reset", () => {
    const listener = vi.fn();
    const unsub = subscribeMarketDataTelemetry(listener);

    recordMarketDataTelemetry("candles.fetch", { clientMs: 1 });
    expect(listener).toHaveBeenCalledTimes(1);

    resetMarketDataTelemetry();
    expect(listener).toHaveBeenCalledTimes(2);

    unsub();
    recordMarketDataTelemetry("candles.fetch", { clientMs: 2 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("returns a stable snapshot reference until telemetry changes", () => {
    recordMarketDataTelemetry("candles.fetch", { clientMs: 1 });
    const first = getMarketDataTelemetrySnapshot();
    const second = getMarketDataTelemetrySnapshot();
    expect(first).toBe(second);

    recordMarketDataTelemetry("warmup.response", { clientMs: 2 });
    const third = getMarketDataTelemetrySnapshot();
    expect(third).not.toBe(first);
  });
});
