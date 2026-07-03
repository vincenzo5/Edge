import { describe, expect, it } from "vitest";
import {
  buildChartDatasetRow,
  buildHealthSummary,
  buildProvisionalProviderRows,
  buildProviderRows,
  buildWatchlistDatasetRow,
  deriveOverallSeverity,
  formatDatasetLine,
  isTwsGatewayHealthy,
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
    expect(row.usage).toBe("display");
    expect(row.allowedForTradingDecision).toBe(false);
  });

  it("marks yahoo chart row as display-only in format line", () => {
    const row = buildChartDatasetRow(
      {
        source: "yahoo",
        asOf: Date.now(),
        stale: true,
        warnings: ["TWS temporarily skipped (gateway_disconnected)"],
      },
      "AAPL · 1D",
    );
    expect(formatDatasetLine(row)).toContain("display-only");
    expect(row.allowedForTradingDecision).toBe(false);
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
    expect(snapshot.datasets).toHaveLength(4);
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
    const watchlist = buildWatchlistDatasetRow(null, "0 symbols", false, null, "rest");
    expect(buildHealthSummary(chart, watchlist, "degraded")).toContain("fallback");
  });

  it("shows separate chart and watchlist sources when they differ", () => {
    const chart = buildChartDatasetRow(
      { source: "yahoo", asOf: Date.now(), streaming: false },
      "AAPL · 1D",
    );
    const watchlist = buildWatchlistDatasetRow(
      { source: "tws", asOf: Date.now(), streaming: true },
      "4/4 symbols",
      false,
      null,
      "sse",
    );
    const summary = buildHealthSummary(chart, watchlist, "degraded");
    expect(summary).toContain("Chart: YAHOO");
    expect(summary).toContain("Quotes: TWS");
  });

  it("builds provisional TWS provider rows from client skip warnings", () => {
    const chart = buildChartDatasetRow(
      {
        source: "yahoo",
        asOf: Date.now(),
        warnings: ["TWS temporarily skipped (sidecar_unreachable); retry in ~60s"],
      },
      "TSM · 1D",
    );
    const rows = buildProvisionalProviderRows([chart]);
    expect(rows?.find((row) => row.id === "tws")?.status).toBe("offline");
    expect(rows?.find((row) => row.id === "tws")?.detail).toBe("sidecar_unreachable");
    expect(shouldShowTwsRecovery(rows?.find((row) => row.id === "tws"))).toBe(true);
  });

  it("detects healthy IB Gateway from provider row detail", () => {
    expect(
      isTwsGatewayHealthy({
        id: "tws",
        label: "IB Gateway",
        configured: true,
        status: "healthy",
        detail: "Sidecar ok · Gateway connected",
      }),
    ).toBe(true);
    expect(
      isTwsGatewayHealthy({
        id: "tws",
        label: "IB Gateway",
        configured: true,
        status: "degraded",
        detail: "Sidecar ok · Gateway disconnected",
      }),
    ).toBe(false);
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

  it("shows worker wedged and reconnecting diagnostics in TWS provider detail", () => {
    const wedged = buildProviderRows({
      tws: {
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        warnings: [],
        diagnostics: { workerWedged: true, activeJob: "stream_quotes" },
      },
      twsGate: {
        skipUntil: 0,
        lastFailure: null,
        failureCount: 0,
        lastSuccessAt: Date.now(),
      },
    });
    expect(wedged.find((row) => row.id === "tws")?.detail).toMatch(/Worker wedged/i);

    const reconnecting = buildProviderRows({
      tws: {
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        reconnectInProgress: true,
        host: "127.0.0.1",
        port: 4001,
        warnings: [],
      },
      twsGate: {
        skipUntil: 0,
        lastFailure: null,
        failureCount: 0,
        lastSuccessAt: Date.now(),
      },
    });
    expect(reconnecting.find((row) => row.id === "tws")?.detail).toMatch(/Reconnecting/i);
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
