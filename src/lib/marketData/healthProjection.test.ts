import { describe, expect, it } from "vitest";
import {
  buildChartDatasetRow,
  buildProviderRows,
  buildWatchlistDatasetRow,
  mergeHealthSnapshot,
} from "./health";
import { buildDataHealthProjection, withHealthProjection } from "./healthProjection";

function healthySnapshot() {
  return withHealthProjection(
    mergeHealthSnapshot(
    {
      chartMeta: {
        source: "tws",
        asOf: Date.now(),
        stale: false,
        streaming: true,
        cacheTier: "hot-fresh",
      },
      chartDetail: "AAPL · 1D",
      watchlistMeta: {
        source: "tws",
        asOf: Date.now(),
        lastUpdateAt: Date.now(),
        stale: false,
        cacheTier: "hot-fresh",
      },
      watchlistDetail: "4/4 symbols",
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
    [],
    ),
  );
}

describe("buildDataHealthProjection", () => {
  it("projects current healthy status with streaming transport", () => {
    const snapshot = healthySnapshot();
    const projection = snapshot.projection;

    expect(projection.userStatus).toBe("current");
    expect(projection.primaryLabel).toMatch(/Current/i);
    expect(projection.primaryLabel).toMatch(/streaming/i);
    expect(projection.accessibleLabel).toBe(projection.tooltip);
    expect(projection.sections.activeIncident).toBeNull();
  });

  it("projects fallback when chart uses yahoo", () => {
    const snapshot = withHealthProjection(
      mergeHealthSnapshot(
      {
        chartMeta: {
          source: "yahoo",
          asOf: Date.now(),
          stale: true,
          warnings: ["TWS temporarily skipped (gateway_disconnected)"],
        },
        chartDetail: "AAPL · 1D",
        watchlistMeta: {
          source: "yahoo",
          asOf: Date.now(),
          stale: true,
          warnings: ["TWS temporarily skipped (gateway_disconnected)"],
        },
        watchlistDetail: "2/2 symbols",
        watchlistTransport: "rest",
      },
      null,
      [],
      ),
    );

    expect(snapshot.projection.userStatus).toBe("fallback");
    expect(snapshot.projection.primaryLabel).toMatch(/Fallback/i);
  });

  it("does not mark hot-stale display-fresh chart as delayed overlay", () => {
    const snapshot = withHealthProjection(
      mergeHealthSnapshot(
      {
        chartMeta: {
          source: "tws",
          asOf: Date.now() - 30_000,
          stale: true,
          cacheTier: "hot-stale",
          streaming: false,
        },
        chartDetail: "AAPL · 1D",
        watchlistMeta: {
          source: "tws",
          asOf: Date.now(),
          stale: false,
        },
        watchlistDetail: "1/1 symbols",
        watchlistTransport: "rest",
      },
      null,
      [],
      ),
    );

    expect(snapshot.projection.userStatus).toBe("current");
    expect(snapshot.projection.overlayFeedStatus).toBeNull();
  });

  it("projects delayed overlay when chart feed is refreshing cached data", () => {
    const snapshot = healthySnapshot();
    const projection = buildDataHealthProjection(snapshot, {
      chartFeed: { refreshing: true, source: "tws" },
    });

    expect(projection.userStatus).toBe("delayed");
    expect(projection.overlayFeedStatus?.label).toMatch(/Delayed/i);
  });

  it("maps circuit bypass to fallback connection label, not confirmed disconnected", () => {
    const snapshot = withHealthProjection(
      mergeHealthSnapshot(
      {
        chartMeta: { source: "yahoo", asOf: Date.now(), stale: true },
        chartDetail: "AAPL · 1D",
      },
      {
        generatedAt: Date.now(),
        providers: buildProviderRows({
          tws: {
            configured: true,
            sidecarReachable: true,
            gatewayConnected: true,
            observationConfidence: "last_known",
            circuitBypassed: true,
            observedAt: Date.now() - 5_000,
            warnings: [],
          },
          twsGate: {
            skipUntil: Date.now() + 30_000,
            lastFailure: "gateway_disconnected",
            failureCount: 1,
            lastSuccessAt: Date.now() - 60_000,
          },
        }),
        recentWarnings: [],
        twsStatus: {
          configured: true,
          sidecarReachable: true,
          gatewayConnected: true,
          observationConfidence: "last_known",
          circuitBypassed: true,
          observedAt: Date.now() - 5_000,
          warnings: [],
          connections: {
            "ib-paper": {
              gatewayConnected: true,
              host: "127.0.0.1",
              port: 4002,
            },
            "ib-live": {
              gatewayConnected: false,
              host: "127.0.0.1",
              port: 4001,
            },
          },
        },
      },
      [],
      ),
    );

    expect(snapshot.projection.connectionSummary).toMatch(/fallback/i);
    expect(snapshot.projection.connectionSummary).not.toMatch(/confirmed disconnected/i);
  });

  it("selects one active incident and moves recovered events to diagnostics", () => {
    const snapshot = withHealthProjection(
      mergeHealthSnapshot(
      {
        chartMeta: { source: "tws", asOf: Date.now(), stale: false, streaming: true },
        chartDetail: "AAPL · 1D",
      },
      {
        generatedAt: Date.now(),
        providers: [],
        recentWarnings: ["Yahoo fallback in use"],
      },
      [
        {
          id: "evt-1",
          kind: "transport_fallback",
          message: "Quote stream first snapshot timeout",
          at: Date.now() - 10_000,
          recovered: true,
          dataset: "watchlist",
        },
      ],
      ),
    );

    expect(snapshot.projection.sections.activeIncident?.message).toMatch(/fallback/i);
    expect(snapshot.projection.diagnostics.recoveredEvents).toHaveLength(1);
    expect(snapshot.projection.diagnostics.incidentHistory.some((line) => /timeout/i.test(line))).toBe(
      true,
    );
  });

  it("shows reconnecting connection summary for degraded gateway", () => {
    const snapshot = withHealthProjection(
      mergeHealthSnapshot(
      {
        chartMeta: { source: "tws", asOf: Date.now(), stale: false, streaming: true },
      },
      {
        generatedAt: Date.now(),
        providers: buildProviderRows({
          tws: {
            configured: true,
            sidecarReachable: true,
            gatewayConnected: false,
            reconnectInProgress: true,
            warnings: [],
          },
          twsGate: {
            skipUntil: 0,
            lastFailure: null,
            failureCount: 0,
            lastSuccessAt: 0,
          },
        }),
        recentWarnings: [],
        twsStatus: {
          configured: true,
          sidecarReachable: true,
          gatewayConnected: false,
          reconnectInProgress: true,
          host: "127.0.0.1",
          port: 4002,
          warnings: [],
          connections: {
            "ib-paper": {
              gatewayConnected: false,
              host: "127.0.0.1",
              port: 4002,
            },
            "ib-live": {
              gatewayConnected: false,
              host: "127.0.0.1",
              port: 4001,
            },
          },
        },
      },
      [],
      ),
    );

    expect(snapshot.projection.connectionSummary).toMatch(/reconnecting/i);
    expect(snapshot.projection.showRecovery).toBe(false);
  });

  it("includes route diagnostics when provided", () => {
    const snapshot = healthySnapshot();
    const projection = buildDataHealthProjection(snapshot, {
      deliveryDiagnostics: [
        {
          datasetId: "chart_candles",
          source: "tws",
          cacheTier: "hot-fresh",
          transport: "streaming",
          routeAttemptCount: 1,
          warnings: [],
        },
      ],
    });

    expect(projection.diagnostics.routeDiagnostics).toHaveLength(1);
    expect(projection.diagnostics.routeDiagnostics[0]?.datasetId).toBe("chart_candles");
  });

  it("keeps accessible label aligned with tooltip and primary label", () => {
    const snapshot = withHealthProjection(
      mergeHealthSnapshot(
      {
        chartMeta: { source: "mixed", asOf: Date.now(), stale: false },
        watchlistMeta: { source: "mixed", asOf: Date.now(), stale: false, warnings: ["partial fill"] },
        watchlistDetail: "2/4 symbols",
        watchlistTransport: "rest",
      },
      null,
      [],
      ),
    );

    expect(snapshot.projection.accessibleLabel).toBe(snapshot.projection.tooltip);
    expect(snapshot.projection.accessibleLabel).toContain(snapshot.projection.primaryLabel);
  });

  it("projects unavailable when chart feed reports error", () => {
    const snapshot = healthySnapshot();
    const projection = buildDataHealthProjection(snapshot, {
      chartFeed: { error: "Network error", source: "tws" },
    });

    expect(projection.userStatus).toBe("unavailable");
    expect(projection.overlayFeedStatus?.tone).toBe("error");
    expect(projection.chromeIncidentLabel).toBeNull();
  });

  it("projects calm chrome incident and reconnect label when manual recovery is needed", () => {
    const snapshot = withHealthProjection(
      mergeHealthSnapshot(
        {
          chartMeta: { source: "yahoo", asOf: Date.now(), stale: true },
          chartDetail: "AAPL · 1D",
        },
        {
          generatedAt: Date.now(),
          providers: buildProviderRows({
            tws: {
              configured: true,
              sidecarReachable: false,
              gatewayConnected: false,
              warnings: [],
            },
            twsGate: {
              skipUntil: 0,
              lastFailure: "sidecar_unreachable",
              failureCount: 1,
              lastSuccessAt: 0,
            },
          }),
          recentWarnings: [],
          twsStatus: {
            configured: true,
            sidecarReachable: false,
            gatewayConnected: false,
            host: "127.0.0.1",
            port: 8765,
            warnings: [],
            connections: {
              "ib-paper": {
                gatewayConnected: false,
                host: "127.0.0.1",
                port: 4002,
              },
              "ib-live": {
                gatewayConnected: false,
                host: "127.0.0.1",
                port: 4001,
              },
            },
          },
        },
        [],
      ),
    );

    expect(snapshot.projection.chromeIncidentLabel).toBe("Broker disconnected");
    expect(snapshot.projection.chromeRecoveryLabel).toBe("Reconnect");
    expect(snapshot.projection.recoveryLabel).toMatch(/sidecar/i);
  });

  it("projects broker reconnecting chrome incident without manual recover CTA", () => {
    const snapshot = withHealthProjection(
      mergeHealthSnapshot(
        {
          chartMeta: { source: "tws", asOf: Date.now(), stale: false, streaming: true },
        },
        {
          generatedAt: Date.now(),
          providers: buildProviderRows({
            tws: {
              configured: true,
              sidecarReachable: true,
              gatewayConnected: false,
              reconnectInProgress: true,
              warnings: [],
            },
            twsGate: {
              skipUntil: 0,
              lastFailure: null,
              failureCount: 0,
              lastSuccessAt: 0,
            },
          }),
          recentWarnings: [],
          twsStatus: {
            configured: true,
            sidecarReachable: true,
            gatewayConnected: false,
            reconnectInProgress: true,
            host: "127.0.0.1",
            port: 4002,
            warnings: [],
            connections: {
              "ib-paper": {
                gatewayConnected: false,
                host: "127.0.0.1",
                port: 4002,
              },
              "ib-live": {
                gatewayConnected: false,
                host: "127.0.0.1",
                port: 4001,
              },
            },
          },
        },
        [],
      ),
    );

    expect(snapshot.projection.chromeIncidentLabel).toBe("Broker reconnecting");
    expect(snapshot.projection.chromeRecoveryLabel).toBeNull();
    expect(snapshot.projection.showRecovery).toBe(false);
  });

  it("keeps healthy chrome incident null", () => {
    const snapshot = healthySnapshot();
    expect(snapshot.projection.chromeIncidentLabel).toBeNull();
    expect(snapshot.projection.chromeRecoveryLabel).toBeNull();
  });

  it("builds dataset rows used by current-data section", () => {
    const chart = buildChartDatasetRow(
      { source: "tws", asOf: Date.now(), stale: false, streaming: true },
      "AAPL · 1D",
    );
    const watchlist = buildWatchlistDatasetRow(
      { source: "tws", asOf: Date.now(), stale: false },
      "2/2 symbols",
      false,
      null,
      "sse",
    );
    const snapshot = withHealthProjection(
      mergeHealthSnapshot(
      {
        chartMeta: { source: "tws", asOf: Date.now(), stale: false, streaming: true },
        chartDetail: "AAPL · 1D",
        watchlistMeta: { source: "tws", asOf: Date.now(), stale: false },
        watchlistDetail: "2/2 symbols",
        watchlistTransport: "sse",
      },
      null,
      [],
      ),
    );

    expect(snapshot.projection.sections.currentData).toHaveLength(3);
    expect(chart.status).toBe("loaded");
    expect(watchlist.status).toBe("loaded");
  });
});
