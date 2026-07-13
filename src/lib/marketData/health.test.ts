import { describe, expect, it } from "vitest";
import { HOT_STALE_MS } from "./hotStore";
import {
  buildChartDatasetRow,
  buildConnectionSummary,
  buildDataPreferenceRow,
  buildDatasetChips,
  buildHealthCaveatSubtitle,
  buildHealthSummary,
  buildHealthCompactSummary,
  buildIbSocketRows,
  buildOptionsDatasetRow,
  buildProvisionalProviderRows,
  buildProviderRows,
  buildWatchlistDatasetRow,
  classifyHealthWarning,
  deriveDatasetSeverity,
  deriveOverallSeverity,
  formatDatasetLine,
  formatQuoteAgeLabel,
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

  it("builds compact summary without Chart/Quotes prefixes", () => {
    const chart = buildChartDatasetRow(
      { source: "tws", asOf: Date.now(), streaming: true },
      "AAPL · 1D",
    );
    const watchlist = buildWatchlistDatasetRow(null, "0 symbols", false, null, "rest");
    expect(buildHealthCompactSummary(chart, watchlist, "healthy")).toBe("TWS · live");
  });

  it("builds compact summary for mixed chart and watchlist sources", () => {
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
    expect(buildHealthCompactSummary(chart, watchlist, "degraded")).toBe("YAHOO/TWS · live");
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

  it("builds separate paper and live socket rows from sidecar connections", () => {
    const rows = buildIbSocketRows({
      configured: true,
      sidecarReachable: true,
      gatewayConnected: true,
      host: "127.0.0.1",
      port: 4002,
      warnings: [],
      connections: {
        "ib-paper": {
          connectionId: "ib-paper",
          gatewayConnected: true,
          host: "127.0.0.1",
          port: 4002,
        },
        "ib-live": {
          connectionId: "ib-live",
          gatewayConnected: false,
          host: "127.0.0.1",
          port: 4001,
          message: "Not connected to IB Gateway at 127.0.0.1:4001",
        },
      },
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe("tws-paper");
    expect(rows[0]?.status).toBe("healthy");
    expect(rows[1]?.id).toBe("tws-live");
    expect(rows[1]?.status).toBe("degraded");
  });

  it("builds connection summary with preference-aware severity", () => {
    const connectionRows = buildIbSocketRows({
      configured: true,
      sidecarReachable: true,
      gatewayConnected: true,
      warnings: [],
      connections: {
        "ib-paper": { connectionId: "ib-paper", gatewayConnected: true, port: 4002 },
        "ib-live": { connectionId: "ib-live", gatewayConnected: false, port: 4001 },
      },
    });
    const dataPreference = buildDataPreferenceRow("ib-live");
    const summary = buildConnectionSummary([], { connectionRows, dataPreference });

    expect(summary.label).toContain("Paper: ok");
    expect(summary.label).toContain("Live: down");
    expect(summary.label).toContain("Live data");
    expect(summary.severity).toBe("degraded");
  });

  it("merges connection rows and data preference into health snapshot", () => {
    const twsStatus = {
      configured: true,
      sidecarReachable: true,
      gatewayConnected: true,
      warnings: [],
      connections: {
        "ib-paper": { connectionId: "ib-paper", gatewayConnected: true, port: 4002 },
        "ib-live": { connectionId: "ib-live", gatewayConnected: false, port: 4001 },
      },
    };
    const snapshot = mergeHealthSnapshot(
      {
        chartMeta: { source: "tws", asOf: Date.now(), streaming: true },
        chartDetail: "AAPL · 1D",
        dataConnectionPreference: "ib-live",
      },
      {
        generatedAt: Date.now(),
        providers: buildProviderRows({
          tws: twsStatus,
          twsGate: {
            skipUntil: 0,
            lastFailure: null,
            failureCount: 0,
            lastSuccessAt: Date.now(),
          },
        }),
        recentWarnings: [],
        twsStatus,
      },
    );

    expect(snapshot.connectionRows).toHaveLength(2);
    expect(snapshot.dataPreference?.label).toBe("Live data");
    expect(snapshot.connectionSummary).toContain("Live: down");
  });

  it("classifies transport timeouts as events, not incidents", () => {
    expect(classifyHealthWarning("Quote stream first snapshot timeout")).toBe("event");
    expect(classifyHealthWarning("TWS temporarily skipped (gateway_disconnected)")).toBe(
      "incident",
    );
  });

  it("stays healthy when TWS watchlist hot-stale cache is within display age", () => {
    const now = Date.now();
    const row = buildWatchlistDatasetRow(
      {
        source: "tws",
        asOf: now - 10_000,
        stale: true,
        cacheTier: "hot-stale",
        latencyMs: 0,
        warnings: [],
      },
      "4/4 symbols · rest",
      false,
      null,
      "rest",
      now - 10_000,
    );

    expect(deriveDatasetSeverity(row)).toBe("healthy");
    expect(formatDatasetLine(row, now)).toContain("updated 10s ago");
    expect(formatDatasetLine(row, now)).not.toContain("stale");
  });

  it("marks watchlist degraded when quote age exceeds display max", () => {
    const now = Date.now();
    const row = buildWatchlistDatasetRow(
      {
        source: "tws",
        asOf: now - 90_000,
        stale: true,
        cacheTier: "hot-stale",
      },
      "4/4 symbols · rest",
      false,
      null,
      "rest",
      now - 90_000,
    );

    expect(deriveDatasetSeverity(row)).toBe("degraded");
    expect(buildHealthCaveatSubtitle([row])).toMatch(/90s old/i);
  });

  it("stays healthy when TWS chart hot-stale cache is within display age", () => {
    const now = Date.now();
    const row = buildChartDatasetRow(
      {
        source: "tws",
        asOf: now - 30_000,
        stale: true,
        cacheTier: "hot-stale",
        latencyMs: 0,
        warnings: [],
      },
      "AAPL · 1D",
    );

    expect(deriveDatasetSeverity(row)).toBe("healthy");
    expect(formatDatasetLine(row, now)).toContain("updated 30s ago");
    expect(formatDatasetLine(row, now)).not.toContain("stale");
    expect(formatDatasetLine(row, now)).not.toContain("hot stale");
  });

  it("marks chart degraded when candle age exceeds display max", () => {
    const now = Date.now();
    const row = buildChartDatasetRow(
      {
        source: "tws",
        asOf: now - HOT_STALE_MS.candles - 60_000,
        stale: true,
        cacheTier: "hot-stale",
      },
      "AAPL · 1D",
    );

    expect(deriveDatasetSeverity(row)).toBe("degraded");
    expect(buildHealthCaveatSubtitle([row])).toMatch(/Chart candles/i);
  });

  it("stays healthy when options chain hot-stale cache is within display age", () => {
    const now = Date.now();
    const row = buildOptionsDatasetRow(
      {
        source: "tws",
        asOf: now - 60_000,
        stale: true,
        cacheTier: "hot-stale",
      },
      "AAPL · 12 expirations",
      "options_chain",
    );

    expect(deriveDatasetSeverity(row)).toBe("healthy");
    expect(formatDatasetLine(row, now)).toContain("updated 1m ago");
    expect(formatDatasetLine(row, now)).not.toContain("stale");
  });

  it("stays healthy when options expirations-only meta is within 24h display age", () => {
    const now = Date.now();
    const row = buildOptionsDatasetRow(
      {
        source: "tws",
        asOf: now - 3_600_000,
        stale: true,
        cacheTier: "hot-stale",
      },
      "AAPL · 12 expirations",
      "options_expirations",
    );

    expect(deriveDatasetSeverity(row)).toBe("healthy");
  });

  it("marks options chain degraded when age exceeds display max", () => {
    const now = Date.now();
    const row = buildOptionsDatasetRow(
      {
        source: "tws",
        asOf: now - HOT_STALE_MS.options_chain - 60_000,
        stale: true,
        cacheTier: "hot-stale",
      },
      "AAPL · 12 expirations",
      "options_chain",
    );

    expect(deriveDatasetSeverity(row)).toBe("degraded");
    expect(buildHealthCaveatSubtitle([row])).toMatch(/Options data/i);
  });

  it("mergeHealthSnapshot stays healthy when chart has stale flag but display-fresh age", () => {
    const now = Date.now();
    const snapshot = mergeHealthSnapshot(
      {
        chartMeta: {
          source: "tws",
          asOf: now - 20_000,
          stale: true,
          cacheTier: "hot-stale",
        },
        chartDetail: "AAPL · 1D",
        watchlistMeta: {
          source: "tws",
          asOf: now - 5_000,
          stale: false,
        },
        watchlistDetail: "4/4 symbols",
        watchlistTransport: "rest",
      },
      {
        generatedAt: now,
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
            lastSuccessAt: now,
          },
        }),
        recentWarnings: [],
      },
    );

    const chartRow = snapshot.datasets.find((row) => row.kind === "chart");
    expect(chartRow?.severity).toBe("healthy");
    expect(snapshot.severity).toBe("healthy");
    expect(buildHealthSummary(chartRow, snapshot.datasets[1], snapshot.severity)).not.toContain(
      "stale",
    );
  });

  it("stays healthy when TWS watchlist recovered via REST after SSE timeout", () => {
    const datasets = [
      buildChartDatasetRow(
        {
          source: "tws",
          asOf: Date.now(),
          stale: false,
          streaming: true,
          cacheTier: "hot-fresh",
        },
        "AAPL · 1D",
      ),
      buildWatchlistDatasetRow(
        {
          source: "tws",
          asOf: Date.now() - 5_000,
          stale: true,
          cacheTier: "hot-stale",
          latencyMs: 1411,
          warnings: ["Quote stream first snapshot timeout"],
        },
        "4/4 symbols · rest",
        false,
        null,
        "rest",
        Date.now() - 5_000,
      ),
      buildWatchlistDatasetRow(null, undefined, false, null, "rest"),
    ];
    datasets.pop();
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

    expect(deriveDatasetSeverity(datasets[1]!)).toBe("healthy");
    expect(deriveOverallSeverity(datasets, providers)).toBe("healthy");
  });

  it.each([
    {
      name: "yahoo stale chart fallback",
      datasets: [
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
      ],
      expected: "degraded" as const,
    },
    {
      name: "mixed stale watchlist",
      datasets: [
        buildChartDatasetRow(
          { source: "tws", asOf: Date.now(), streaming: true },
          "AAPL · 1D",
        ),
        buildWatchlistDatasetRow(
          { source: "mixed", asOf: Date.now(), stale: true, cacheTier: "hot-stale" },
          "12/14 symbols",
          false,
          null,
          "sse",
        ),
      ],
      expected: "degraded" as const,
    },
    {
      name: "options not loaded with healthy chart and watchlist",
      datasets: [
        buildChartDatasetRow(
          { source: "tws", asOf: Date.now(), streaming: true },
          "AAPL · 1D",
        ),
        buildWatchlistDatasetRow(
          { source: "tws", asOf: Date.now(), streaming: true },
          "4/4 symbols",
          false,
          null,
          "sse",
        ),
      ],
      expected: "healthy" as const,
    },
  ])("deriveOverallSeverity: $name", ({ datasets, expected }) => {
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
    expect(deriveOverallSeverity(datasets, providers)).toBe(expected);
  });

  it("merges snapshot with connection summary and recent events", () => {
    const snapshot = mergeHealthSnapshot(
      {
        chartMeta: { source: "tws", asOf: Date.now(), streaming: true },
        chartDetail: "AAPL · 1D",
        watchlistMeta: { source: "tws", asOf: Date.now() },
        watchlistDetail: "4/4 symbols",
        watchlistTransport: "rest",
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
      [
        {
          id: "e1",
          kind: "transport_fallback",
          message: "Quote stream first snapshot timeout",
          at: Date.now(),
          recovered: true,
          dataset: "watchlist",
        },
      ],
    );

    expect(snapshot.connectionSummary).toContain("Connected");
    expect(snapshot.recentEvents).toHaveLength(1);
    expect(snapshot.severity).toBe("healthy");
    expect(snapshot.datasets.every((row) => row.severity != null)).toBe(true);
  });

  it("formats quote age labels for health lines", () => {
    const now = 1_000_000;
    expect(formatQuoteAgeLabel(now - 500, now)).toBe("updated just now");
    expect(formatQuoteAgeLabel(now - 8_000, now)).toBe("updated 8s ago");
    expect(formatQuoteAgeLabel(now - 120_000, now)).toBe("updated 2m ago");
  });

  it("builds structured dataset chips from row fields", () => {
    const now = Date.now();
    const row = buildChartDatasetRow(
      {
        source: "tws",
        asOf: now - 8_000,
        streaming: true,
        latencyMs: 120,
        stale: false,
        cacheTier: "hot-fresh",
        warnings: [],
      },
      "AAPL · 1D",
    );

    const chips = buildDatasetChips(row, now);
    expect(chips.map((chip) => chip.label)).toEqual(
      expect.arrayContaining(["AAPL", "1D", "TWS", "Live", "8s ago", "120ms", "display-only"]),
    );
  });

  it("returns empty chips for not_loaded datasets", () => {
    const row = buildOptionsDatasetRow(null, undefined, undefined);
    expect(buildDatasetChips(row)).toEqual([]);
  });
});
