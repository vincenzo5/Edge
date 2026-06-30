import type { ChartDataMeta } from "@edge/chart-core";
import type { DataCacheTier } from "./contracts/result";
import type { TwsStatusProbe } from "./providers/tws/client";

export type DataHealthSeverity = "healthy" | "degraded" | "offline" | "unknown";

export type DataHealthDatasetKind = "chart" | "watchlist" | "options";

export type DataHealthDatasetStatus = "loaded" | "loading" | "unavailable" | "not_loaded";

export type DataHealthDatasetRow = {
  kind: DataHealthDatasetKind;
  label: string;
  detail?: string;
  source?: string;
  cacheTier?: DataCacheTier;
  stale?: boolean;
  streaming?: boolean;
  latencyMs?: number;
  status: DataHealthDatasetStatus;
  warnings: string[];
};

export type ProviderHealthStatus = "healthy" | "degraded" | "offline" | "disabled";

export type ProviderHealthRow = {
  id: "tws" | "yahoo" | "fmp" | "fred" | "sec";
  label: string;
  configured: boolean;
  status: ProviderHealthStatus;
  detail: string;
  circuitOpen?: boolean;
  circuitReason?: string | null;
};

export type HealthGateSnapshot = {
  skipUntil: number;
  lastFailure: string | null;
  failureCount: number;
  lastSuccessAt: number;
};

export type ServerHealthPayload = {
  generatedAt: number;
  providers: ProviderHealthRow[];
  recentWarnings: string[];
};

export type ClientHealthInputs = {
  chartMeta?: ChartDataMeta | null;
  chartDetail?: string;
  watchlistMeta?: Partial<ChartDataMeta> | null;
  watchlistDetail?: string;
  watchlistLoading?: boolean;
  watchlistError?: string | null;
  watchlistTransport?: "rest" | "sse";
  optionsMeta?: Partial<ChartDataMeta> | null;
  optionsDetail?: string;
  chartStreamTransport?: string;
};

export type DataHealthSnapshot = {
  severity: DataHealthSeverity;
  severityLabel: string;
  summary: string;
  datasets: DataHealthDatasetRow[];
  providers: ProviderHealthRow[];
  recentWarnings: string[];
  generatedAt: number;
};

const FALLBACK_SOURCES = new Set(["yahoo", "mixed"]);

function upperSource(source: string | undefined): string {
  return (source ?? "unknown").toUpperCase();
}

function formatCacheTier(tier: DataCacheTier | undefined): string | undefined {
  if (!tier) return undefined;
  return tier.replace("-", " ");
}

export function buildChartDatasetRow(
  meta: ChartDataMeta | null | undefined,
  detail: string | undefined,
  loading = false,
): DataHealthDatasetRow {
  if (loading) {
    return {
      kind: "chart",
      label: "Active Chart",
      detail,
      status: "loading",
      warnings: [],
    };
  }
  if (!meta?.source) {
    return {
      kind: "chart",
      label: "Active Chart",
      detail,
      status: "not_loaded",
      warnings: [],
    };
  }
  return {
    kind: "chart",
    label: "Active Chart",
    detail,
    source: meta.source,
    cacheTier: meta.cacheTier,
    stale: meta.stale,
    streaming: meta.streaming,
    latencyMs: meta.latencyMs,
    status: meta.streamError ? "unavailable" : "loaded",
    warnings: [
      ...(meta.warnings ?? []),
      ...(meta.streamError ? [meta.streamError] : []),
    ],
  };
}

export function buildWatchlistDatasetRow(
  meta: Partial<ChartDataMeta> | null | undefined,
  detail: string | undefined,
  loading: boolean,
  error: string | null | undefined,
  transport: "rest" | "sse" | undefined,
): DataHealthDatasetRow {
  if (loading && !meta?.source) {
    return {
      kind: "watchlist",
      label: "Watchlist Quotes",
      detail: transport ? `${detail ?? ""} · ${transport}`.trim() : detail,
      status: "loading",
      warnings: [],
    };
  }
  if (error && !meta?.source) {
    return {
      kind: "watchlist",
      label: "Watchlist Quotes",
      detail,
      status: "unavailable",
      warnings: [error],
    };
  }
  if (!meta?.source) {
    return {
      kind: "watchlist",
      label: "Watchlist Quotes",
      detail,
      status: "not_loaded",
      warnings: [],
    };
  }
  return {
    kind: "watchlist",
    label: "Watchlist Quotes",
    detail: transport ? `${detail ?? ""} · ${transport}`.trim() : detail,
    source: meta.source,
    cacheTier: meta.cacheTier,
    stale: meta.stale,
    streaming: transport === "sse" || meta.streaming,
    latencyMs: meta.latencyMs,
    status: "loaded",
    warnings: meta.warnings ?? [],
  };
}

export function buildOptionsDatasetRow(
  meta: Partial<ChartDataMeta> | null | undefined,
  detail: string | undefined,
): DataHealthDatasetRow {
  if (!meta?.source) {
    return {
      kind: "options",
      label: "Options",
      detail,
      status: "not_loaded",
      warnings: [],
    };
  }
  return {
    kind: "options",
    label: "Options",
    detail,
    source: meta.source,
    cacheTier: meta.cacheTier,
    stale: meta.stale,
    status: meta.warnings?.length ? "unavailable" : "loaded",
    warnings: meta.warnings ?? [],
  };
}

export function buildProviderRows(args: {
  tws: TwsStatusProbe;
  twsGate: HealthGateSnapshot;
  fmpConfigured?: boolean;
  fredConfigured?: boolean;
  secConfigured?: boolean;
}): ProviderHealthRow[] {
  const now = Date.now();
  const twsCircuitOpen = args.twsGate.skipUntil > now;

  const twsStatus: ProviderHealthStatus = !args.tws.configured
    ? "disabled"
    : twsCircuitOpen
      ? "degraded"
      : args.tws.sidecarReachable && args.tws.gatewayConnected
        ? "healthy"
        : args.tws.sidecarReachable
          ? "degraded"
          : "offline";

  const twsDetail = !args.tws.configured
    ? "Not configured"
    : twsCircuitOpen
      ? (args.twsGate.lastFailure ?? "circuit open")
      : args.tws.sidecarReachable && args.tws.gatewayConnected
        ? "Sidecar ok · Gateway connected"
        : args.tws.sidecarReachable
          ? "Sidecar ok · Gateway disconnected"
          : "Sidecar unreachable";

  return [
    {
      id: "tws",
      label: "IB Gateway",
      configured: args.tws.configured,
      status: twsStatus,
      detail: twsDetail,
      circuitOpen: twsCircuitOpen,
      circuitReason: twsCircuitOpen ? args.twsGate.lastFailure : null,
    },
    {
      id: "yahoo",
      label: "Yahoo",
      configured: true,
      status: "healthy",
      detail: "Fallback available",
    },
    {
      id: "fmp",
      label: "FMP",
      configured: args.fmpConfigured ?? false,
      status: args.fmpConfigured ? "healthy" : "disabled",
      detail: args.fmpConfigured ? "Configured" : "Not configured",
    },
    {
      id: "fred",
      label: "FRED",
      configured: args.fredConfigured ?? false,
      status: args.fredConfigured ? "healthy" : "disabled",
      detail: args.fredConfigured ? "Configured" : "Not configured",
    },
    {
      id: "sec",
      label: "SEC",
      configured: args.secConfigured ?? false,
      status: args.secConfigured ? "healthy" : "disabled",
      detail: args.secConfigured ? "Configured" : "Not configured",
    },
  ];
}

export function collectRecentWarnings(
  datasets: DataHealthDatasetRow[],
  providers: ProviderHealthRow[],
  extra: string[] = [],
): string[] {
  const warnings = new Set<string>();
  for (const row of datasets) {
    for (const warning of row.warnings) {
      if (warning.trim()) warnings.add(warning.trim());
    }
  }
  for (const provider of providers) {
    if (provider.circuitOpen && provider.circuitReason) {
      warnings.add(`${provider.label}: ${provider.circuitReason}`);
    }
  }
  for (const warning of extra) {
    if (warning.trim()) warnings.add(warning.trim());
  }
  return [...warnings].slice(0, 8);
}

export function deriveDatasetSeverity(row: DataHealthDatasetRow): DataHealthSeverity {
  if (row.status === "unavailable") return "offline";
  if (row.status === "loading" || row.status === "not_loaded") return "unknown";
  if (row.stale || row.source === "mixed" || FALLBACK_SOURCES.has(row.source ?? "")) {
    if (row.source === "yahoo" && row.warnings.some((w) => /fallback|fill|skipped|trying/i.test(w))) {
      return "degraded";
    }
    if (row.source === "yahoo" && row.cacheTier === "cold") return "degraded";
    if (row.source === "mixed") return "degraded";
    if (row.stale) return "degraded";
  }
  if (row.warnings.length > 0) return "degraded";
  return "healthy";
}

export function deriveOverallSeverity(
  datasets: DataHealthDatasetRow[],
  providers: ProviderHealthRow[],
): DataHealthSeverity {
  const loaded = datasets.filter((row) => row.status === "loaded");
  if (loaded.length === 0) return "unknown";

  const datasetSeverities = loaded.map(deriveDatasetSeverity);
  if (datasetSeverities.includes("offline")) return "offline";
  if (datasetSeverities.includes("degraded")) return "degraded";

  const primaryConfigured = providers.filter(
    (provider) => provider.configured && provider.id === "tws",
  );
  const allPrimaryOffline = primaryConfigured.length > 0 &&
    primaryConfigured.every((provider) => provider.status === "offline" || provider.status === "degraded");

  const chart = loaded.find((row) => row.kind === "chart");
  if (allPrimaryOffline && chart?.source === "yahoo") return "degraded";

  if (primaryConfigured.some((provider) => provider.status === "offline")) return "degraded";
  if (loaded.every((row) => deriveDatasetSeverity(row) === "healthy")) return "healthy";
  return "degraded";
}

export function severityLabel(severity: DataHealthSeverity): string {
  switch (severity) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "offline":
      return "Offline";
    default:
      return "Unknown";
  }
}

export function buildHealthSummary(
  chartRow: DataHealthDatasetRow | undefined,
  severity: DataHealthSeverity,
): string {
  const source = chartRow?.source ? upperSource(chartRow.source) : null;
  if (!source) return "Data";

  const parts = [`Data: ${source}`];
  if (chartRow?.streaming) parts.push("live");
  else if (chartRow?.stale) parts.push("stale");
  else if (severity === "degraded" && FALLBACK_SOURCES.has(chartRow?.source ?? "")) {
    parts.push("fallback");
  }
  return parts.join(" · ");
}

export function mergeHealthSnapshot(
  client: ClientHealthInputs,
  server: ServerHealthPayload | null,
): DataHealthSnapshot {
  const chart = buildChartDatasetRow(client.chartMeta, client.chartDetail);
  const watchlist = buildWatchlistDatasetRow(
    client.watchlistMeta,
    client.watchlistDetail,
    client.watchlistLoading ?? false,
    client.watchlistError,
    client.watchlistTransport,
  );
  const options = buildOptionsDatasetRow(client.optionsMeta, client.optionsDetail);

  const datasets = [chart, watchlist, options];
  const providers = server?.providers ?? [];
  const recentWarnings = collectRecentWarnings(
    datasets,
    providers,
    server?.recentWarnings ?? [],
  );
  const severity = deriveOverallSeverity(datasets, providers);

  return {
    severity,
    severityLabel: severityLabel(severity),
    summary: buildHealthSummary(chart, severity),
    datasets,
    providers,
    recentWarnings,
    generatedAt: server?.generatedAt ?? Date.now(),
  };
}

export function formatDatasetLine(row: DataHealthDatasetRow): string {
  const parts: string[] = [];
  if (row.detail) parts.push(row.detail);
  if (row.source) parts.push(upperSource(row.source));
  if (row.streaming) parts.push("live");
  if (row.stale) parts.push("stale");
  const cache = formatCacheTier(row.cacheTier);
  if (cache) parts.push(cache);
  if (row.latencyMs != null) parts.push(`${Math.round(row.latencyMs)}ms`);
  return parts.join(" · ");
}

export function exportHealthJson(snapshot: DataHealthSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function shouldShowTwsRecovery(provider: ProviderHealthRow | undefined): boolean {
  if (!provider?.configured) return false;
  return provider.status === "degraded" || provider.status === "offline";
}

export function twsRecoveryButtonLabel(provider: ProviderHealthRow | undefined): string {
  if (!provider?.configured) return "Recover TWS";
  if (provider.detail.toLowerCase().includes("unreachable")) {
    return "Start TWS sidecar";
  }
  if (
    provider.circuitOpen ||
    provider.detail.toLowerCase().includes("gateway disconnected") ||
    provider.detail.toLowerCase().includes("not connected")
  ) {
    return "Reconnect TWS";
  }
  return "Recover TWS";
}
