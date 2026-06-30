import { describe, expect, it } from "vitest";
import {
  buildChartDatasetRow,
  buildHealthSummary,
  buildProviderRows,
  buildWatchlistDatasetRow,
  deriveOverallSeverity,
  mergeHealthSnapshot,
  severityLabel,
  shouldShowTwsRecovery,
  twsRecoveryButtonLabel,
} from "./health";

describe("marketData health", () => {
  it("builds a healthy chart dataset row from meta", () => {
    const row = buildChartDatasetRow(
      {
        source: "tws",
        asOf: Date.now(),
        stale: false,
        cacheTier: "hot-fresh",
        latencyMs: 184,
        streaming: true,
      },
      "AAPL · 1D",
    );

    expect(row.status).toBe("loaded");
    expect(row.source).toBe("tws");
    expect(row.streaming).toBe(true);
  });

  it("marks degraded severity when chart is stale or fallback", () => {
    const datasets = [
      buildChartDatasetRow(
        {
          source: "yahoo",
          asOf: Date.now(),
          stale: true,
          warnings: ["TWS temporarily skipped (gateway_disconnected)"],
        },
        "AAPL · 1D",
      ),
      buildWatchlistDatasetRow(null, "0 symbols", false, null, "rest"),
    ];
    const providers = buildProviderRows({
      tws: {
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        warnings: [],
      },
      twsGate: {
        skipUntil: Date.now() + 30_000,
        lastFailure: "gateway_disconnected",
        failureCount: 1,
        lastSuccessAt: 0,
      },
    });

    expect(deriveOverallSeverity(datasets, providers)).toBe("degraded");
  });

  it("merges client and server snapshots with summary label", () => {
    const snapshot = mergeHealthSnapshot(
      {
        chartMeta: {
          source: "tws",
          asOf: Date.now(),
          streaming: true,
        },
        chartDetail: "AAPL · 1D",
        watchlistMeta: {
          source: "mixed",
          asOf: Date.now(),
          stale: true,
          cacheTier: "hot-stale",
        },
        watchlistDetail: "12/14 symbols",
        watchlistTransport: "sse",
      },
      {
        generatedAt: Date.now(),
        providers: buildProviderRows({
          tws: {
            configured: true,
            sidecarReachable: true,
            gatewayConnected: true,
            warnings: [],
          },
          twsGate: {
            skipUntil: 0,
            lastFailure: null,
            failureCount: 0,
            lastSuccessAt: Date.now(),
          },
        }),
        recentWarnings: [],
      },
    );

    expect(snapshot.severityLabel).toBe(severityLabel(snapshot.severity));
    expect(snapshot.summary).toContain("TWS");
    expect(snapshot.datasets).toHaveLength(3);
    expect(snapshot.providers.length).toBeGreaterThan(0);
  });

  it("builds fallback summary when chart uses yahoo", () => {
    const chart = buildChartDatasetRow(
      {
        source: "yahoo",
        asOf: Date.now(),
        cacheTier: "cold",
      },
      "AAPL · 1D",
    );
    expect(buildHealthSummary(chart, "degraded")).toContain("fallback");
  });

  it("derives TWS recovery affordances from provider rows", () => {
    const offline = {
      id: "tws" as const,
      label: "IB Gateway",
      configured: true,
      status: "offline" as const,
      detail: "Sidecar unreachable",
    };
    expect(shouldShowTwsRecovery(offline)).toBe(true);
    expect(twsRecoveryButtonLabel(offline)).toBe("Start TWS sidecar");

    const degraded = {
      ...offline,
      status: "degraded" as const,
      detail: "Sidecar ok · Gateway disconnected",
      circuitOpen: true,
      circuitReason: "gateway_disconnected",
    };
    expect(twsRecoveryButtonLabel(degraded)).toBe("Reconnect TWS");
    expect(shouldShowTwsRecovery({ ...degraded, status: "healthy" })).toBe(false);
  });

  it("never includes IBKR Client Portal in provider rows", () => {
    const providers = buildProviderRows({
      tws: {
        configured: true,
        sidecarReachable: true,
        gatewayConnected: true,
        warnings: [],
      },
      twsGate: {
        skipUntil: 0,
        lastFailure: null,
        failureCount: 0,
        lastSuccessAt: Date.now(),
      },
    });

    expect(providers.some((row) => row.id === "ibkr")).toBe(false);
    expect(providers.find((row) => row.id === "tws")?.label).toBe("IB Gateway");
  });
});
