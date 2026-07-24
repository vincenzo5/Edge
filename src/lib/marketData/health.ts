import type { ChartDataMeta } from "@edge/chart-core";
import { classifyUsEquitySession } from "@edge/chart-core";
import type { DataCacheTier } from "./contracts/result";
import {
  dataConnectionLabel,
  type DataConnectionId,
} from "./dataConnectionPreference";
import type { HealthEvent } from "./healthEvents";
import type { TwsConnectionProbe, TwsStatusProbe } from "./providers/tws/client";
import type { DataUsage, DatasetKind } from "./trust/dataTrust";
import {
  buildTrustMeta,
  datasetKindFromHealthKind,
  defaultUsageForDataset,
  evaluateReadiness,
  getDatasetPolicy,
  isDisplayFresh,
  isFallbackSource,
  provenanceFromMeta,
  quoteAgeMs,
  watchlistDeliveryAgeMs,
} from "./trust/dataTrust";
import { closedMarketHealthySubtitle } from "./watchlistDeliveryFreshness";
import type { SanitizedDatasetState } from "./state/deliveryRegistry";
import { lookupDataset } from "./state/catalog";
import type { OperationalReliabilityReport } from "./state/operationalMetrics";
import {
  buildBrokerageSubdatasetRow,
  buildDemandRowsFromInputs,
  buildPersistenceSyncRow,
  buildPreTradeDatasetRow,
  filterVisibleCurrentDataRows,
  mergeDeliveryDiagnosticsIntoRows,
} from "./healthDatasets";
import {
  shouldAcceptSnapshot,
  type SnapshotRevision,
} from "./state/revision";
import {
  displaySocketsToIbRows,
  reduceConnectionSupervisor,
  type ConnectionSupervisorSnapshot,
} from "./state/connectionSupervisor";
import { ibkrHealthGate } from "./providers/ibkr/healthGate";
import { getBrokerageHealthGateSnapshot } from "../brokerage/brokerageHealthGate";
import { getTwsRecoverySession } from "./providers/tws/recoverySession";

export type DataHealthSeverity = "healthy" | "degraded" | "offline" | "unknown";

export type DataHealthDatasetKind =
  | "chart"
  | "watchlist"
  | "options"
  | "account"
  | "screener"
  | "research"
  | "fundamentals"
  | "brokerage_detail"
  | "pre_trade"
  | "cloud_sync";

export type DataHealthDatasetStatus = "loaded" | "loading" | "unavailable" | "not_loaded";

export type DatasetReadinessLabel = "ok" | "caveat" | "blocked" | "unavailable" | "idle";

export type DataHealthDatasetRow = {
  kind: DataHealthDatasetKind;
  /** Phase 7 catalog id for extended dataset rows. */
  datasetId?: import("./state/catalog").DatasetId;
  label: string;
  detail?: string;
  source?: string;
  cacheTier?: DataCacheTier;
  stale?: boolean;
  streaming?: boolean;
  latencyMs?: number;
  asOf?: number;
  /** Successful quote-delivery timestamp for watchlist transport freshness. */
  receivedAt?: number;
  status: DataHealthDatasetStatus;
  warnings: string[];
  usage?: DataUsage;
  allowedForTradingDecision?: boolean;
  readinessReasons?: string[];
  readinessLabel?: DatasetReadinessLabel;
  severity?: DataHealthSeverity;
  /** Trust policy for options row when chain vs expirations meta differs. */
  trustDataset?: DatasetKind;
};

export type ProviderHealthStatus = "healthy" | "degraded" | "offline" | "disabled";

export type ProviderHealthRow = {
  id: "tws" | "yahoo" | "fmp" | "fred" | "sec" | "massive" | "ibkr";
  label: string;
  configured: boolean;
  status: ProviderHealthStatus;
  detail: string;
  circuitOpen?: boolean;
  circuitReason?: string | null;
  /** When false, bypass/retry is automatic and manual reconnect should stay hidden. */
  requiresManualRecovery?: boolean;
};

export type IbSocketHealthRow = {
  id: "tws-paper" | "tws-live";
  connectionId: DataConnectionId;
  label: string;
  status: ProviderHealthStatus;
  detail: string;
};

export type DataPreferenceHealthRow = {
  connectionId: DataConnectionId;
  label: string;
};

export type HealthGateSnapshot = {
  skipUntil: number;
  lastFailure: string | null;
  failureCount: number;
  lastSuccessAt: number;
};

export type ServerCacheHealthPayload = {
  kind: "memory" | "redis";
  degraded: boolean;
  lastPingOk: boolean | null;
  lastPingAt: number | null;
};

export type ServerHealthPayload = {
  generatedAt: number;
  revision?: SnapshotRevision;
  providers: ProviderHealthRow[];
  recentWarnings: string[];
  cache: ServerCacheHealthPayload;
  lifecycle?: string;
  twsStatus?: TwsStatusProbe;
  deliveryDiagnostics?: SanitizedDatasetState[];
  operationalReliability?: OperationalReliabilityReport;
};

export type ClientHealthInputs = {
  chartMeta?: ChartDataMeta | null;
  chartDetail?: string;
  watchlistMeta?: Partial<ChartDataMeta> | null;
  watchlistDetail?: string;
  watchlistLoading?: boolean;
  watchlistError?: string | null;
  watchlistTransport?: "rest" | "sse";
  watchlistAsOf?: number;
  watchlistDeliveryAt?: number;
  optionsMeta?: Partial<ChartDataMeta> | null;
  optionsDetail?: string;
  optionsTrustDataset?: DatasetKind;
  chartStreamTransport?: string;
  accountDisabled?: boolean;
  accountConnectionState?: string;
  accountDetail?: string;
  accountError?: string | null;
  dataConnectionPreference?: DataConnectionId | null;
  demandDatasets?: import("./healthDatasets").DemandDatasetInput[];
  brokerageSubdatasets?: import("./healthDatasets").BrokerageSubdatasetInput[];
  preTrade?: import("./healthDatasets").PreTradeHealthInput;
  persistenceSync?: import("./healthDatasets").PersistenceSyncHealthInput;
};

export type DataHealthSnapshot = {
  severity: DataHealthSeverity;
  severityLabel: string;
  summary: string;
  connectionSummary: string;
  connectionRows: IbSocketHealthRow[];
  dataPreference: DataPreferenceHealthRow | null;
  datasets: DataHealthDatasetRow[];
  providers: ProviderHealthRow[];
  recentWarnings: string[];
  recentEvents: HealthEvent[];
  generatedAt: number;
  revision?: SnapshotRevision;
  deliveryDiagnostics?: SanitizedDatasetState[];
};

/** Monotonic merge for server health polls — rejects older revisions and generatedAt. */
export function mergeMonotonicServerHealth(
  previous: ServerHealthPayload | null,
  incoming: ServerHealthPayload,
): ServerHealthPayload {
  if (!previous) return incoming;
  if (shouldAcceptSnapshot(incoming, previous)) return incoming;
  return previous;
}

const FALLBACK_SOURCES = new Set(["yahoo", "mixed"]);

const TRANSPORT_EVENT_WARNING =
  /first snapshot timeout|stream disconnected|stream error/i;

const INCIDENT_WARNING =
  /fallback|fill|skipped|trying next provider|TWS temporarily skipped|unavailable|error/i;
const RESEARCH_PROVIDER_MAX_DELIVERY_AGE_MS = 15 * 60_000;

export function classifyHealthWarning(warning: string): "incident" | "event" {
  const trimmed = warning.trim();
  if (!trimmed) return "event";
  if (TRANSPORT_EVENT_WARNING.test(trimmed)) return "event";
  if (INCIDENT_WARNING.test(trimmed)) return "incident";
  return "event";
}

function incidentWarnings(warnings: string[]): string[] {
  return warnings.filter((warning) => classifyHealthWarning(warning) === "incident");
}

export { incidentWarnings };

function hasPartialSymbolCoverage(detail: string | undefined): boolean {
  if (!detail) return false;
  const match = detail.match(/(\d+)\/(\d+)\s*symbols?/i);
  if (!match) return false;
  const loaded = Number(match[1]);
  const total = Number(match[2]);
  return Number.isFinite(loaded) && Number.isFinite(total) && loaded < total;
}

export function resolveTrustDataset(row: DataHealthDatasetRow): DatasetKind {
  if (row.trustDataset) {
    return row.trustDataset;
  }
  if (row.datasetId) {
    const def = lookupDataset(row.datasetId);
    if (def?.policyKind) return def.policyKind;
  }
  if (row.kind === "options") {
    return "options_chain";
  }
  if (row.kind === "chart") return "chart_candles";
  if (row.kind === "watchlist") return "watchlist_quotes";
  if (row.kind === "account" || row.kind === "brokerage_detail") return "account_summary";
  if (row.kind === "pre_trade") return "pre_trade_quote";
  return "chart_candles";
}

function rowProvenance(row: DataHealthDatasetRow): ReturnType<typeof provenanceFromMeta> {
  return provenanceFromMeta({
    source: row.source,
    stale: row.stale,
    warnings: incidentWarnings(row.warnings),
    cacheTier: row.cacheTier,
    asOf: row.asOf,
    receivedAt: row.receivedAt,
  });
}

export function isDatasetDisplayFresh(
  row: DataHealthDatasetRow,
  now = Date.now(),
): boolean {
  const dataset = resolveTrustDataset(row);
  const policy = getDatasetPolicy(dataset);
  if (policy.maxDisplayAgeMs == null) {
    return !row.stale;
  }
  return isDisplayFresh(dataset, rowProvenance(row), now);
}

function hasDisplayAgePolicy(row: DataHealthDatasetRow): boolean {
  return getDatasetPolicy(resolveTrustDataset(row)).maxDisplayAgeMs != null;
}

export function attachTrustFields(
  kind: DataHealthDatasetKind,
  row: DataHealthDatasetRow,
): DataHealthDatasetRow {
  if (row.status !== "loaded" || !row.source) return row;
  const dataset = resolveTrustDataset({ ...row, kind });
  const usage = defaultUsageForDataset(dataset);
  const warningsForTrust = incidentWarnings(row.warnings);
  const trust = buildTrustMeta(
    dataset,
    usage,
    provenanceFromMeta({
      source: row.source,
      stale: row.stale,
      warnings: warningsForTrust,
      cacheTier: row.cacheTier,
      asOf: row.asOf,
      receivedAt: row.receivedAt,
    }),
  );
  const enriched: DataHealthDatasetRow = {
    ...row,
    usage: trust.usage,
    allowedForTradingDecision: trust.readiness.allowedForTradingDecision,
    readinessReasons:
      trust.readiness.status === "blocked" ? trust.readiness.reasons : undefined,
  };
  return enrichDatasetRow(enriched);
}

export function enrichDatasetRow(row: DataHealthDatasetRow): DataHealthDatasetRow {
  const readinessLabel = deriveDatasetReadiness(row);
  const severity = deriveDatasetSeverity(row);
  return {
    ...row,
    readinessLabel,
    severity,
  };
}

function upperSource(source: string | undefined): string {
  return (source ?? "unknown").toUpperCase();
}

function formatCacheTier(tier: DataCacheTier | undefined): string | undefined {
  if (!tier) return undefined;
  return tier.replace("-", " ");
}

/** Relative age label for health dataset lines (e.g. "updated 8s ago"). */
export function formatQuoteAgeLabel(asOf: number | undefined, now = Date.now()): string | undefined {
  if (asOf == null) return undefined;
  const ageMs = Math.max(0, now - asOf);
  if (ageMs < 1_000) return "updated just now";
  if (ageMs < 60_000) return `updated ${Math.round(ageMs / 1_000)}s ago`;
  if (ageMs < 3_600_000) return `updated ${Math.round(ageMs / 60_000)}m ago`;
  return `updated ${Math.round(ageMs / 3_600_000)}h ago`;
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
  return attachTrustFields("chart", {
    kind: "chart",
    label: "Active Chart",
    detail,
    source: meta.source,
    cacheTier: meta.cacheTier,
    stale: meta.stale,
    streaming: meta.streaming,
    latencyMs: meta.latencyMs,
    asOf: meta.asOf,
    receivedAt: meta.lastUpdateAt ?? meta.asOf,
    status: meta.streamError ? "unavailable" : "loaded",
    warnings: [
      ...(meta.warnings ?? []),
      ...(meta.streamError ? [meta.streamError] : []),
    ],
  });
}

export function buildWatchlistDatasetRow(
  meta: Partial<ChartDataMeta> | null | undefined,
  detail: string | undefined,
  loading: boolean,
  error: string | null | undefined,
  transport: "rest" | "sse" | undefined,
  watchlistAsOf?: number,
  watchlistDeliveryAt?: number,
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
  return attachTrustFields("watchlist", {
    kind: "watchlist",
    label: "Watchlist Quotes",
    detail: transport ? `${detail ?? ""} · ${transport}`.trim() : detail,
    source: meta.source,
    cacheTier: meta.cacheTier,
    stale: meta.stale,
    asOf: watchlistAsOf ?? meta.asOf,
    receivedAt: watchlistDeliveryAt ?? meta.lastUpdateAt,
    streaming: transport === "sse" || meta.streaming,
    latencyMs: meta.latencyMs,
    status: "loaded",
    warnings: meta.warnings ?? [],
  });
}

export function buildOptionsDatasetRow(
  meta: Partial<ChartDataMeta> | null | undefined,
  detail: string | undefined,
  trustDataset?: DatasetKind,
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
  return attachTrustFields("options", {
    kind: "options",
    label: "Options",
    detail,
    source: meta.source,
    cacheTier: meta.cacheTier,
    stale: meta.stale,
    asOf: meta.asOf,
    receivedAt: meta.lastUpdateAt ?? meta.asOf,
    streaming: meta.streaming,
    latencyMs: meta.latencyMs,
    status: meta.warnings?.length ? "unavailable" : "loaded",
    warnings: meta.warnings ?? [],
    trustDataset,
  });
}

export function buildAccountDatasetRow(args: {
  disabled?: boolean;
  connectionState?: string;
  detail?: string;
  error?: string | null;
}): DataHealthDatasetRow {
  if (args.disabled) {
    return {
      kind: "account",
      label: "Account feed",
      detail: "Unavailable",
      status: "not_loaded",
      warnings: [],
    };
  }
  if (args.error && args.connectionState === "error") {
    return {
      kind: "account",
      label: "Account feed",
      detail: args.detail,
      status: "unavailable",
      warnings: [args.error],
    };
  }
  if (args.connectionState === "connecting") {
    return {
      kind: "account",
      label: "Account feed",
      detail: args.detail,
      status: "loading",
      warnings: [],
    };
  }
  if (args.connectionState === "connected") {
    return attachTrustFields("account", {
      kind: "account",
      label: "Account feed",
      detail: args.detail,
      source: "tws",
      streaming: true,
      status: "loaded",
      warnings: [],
    });
  }
  return {
    kind: "account",
    label: "Account feed",
    detail: args.detail ?? "Disconnected",
    status: "unavailable",
    warnings: args.error ? [args.error] : [],
  };
}

function formatObservationAge(observedAt: number | undefined, now = Date.now()): string | null {
  if (observedAt == null) return null;
  const ageSec = Math.max(0, Math.round((now - observedAt) / 1_000));
  if (ageSec < 60) return `${ageSec}s ago`;
  return `${Math.round(ageSec / 60)}m ago`;
}

function formatCircuitBypassDetail(
  gate: HealthGateSnapshot,
  tws: TwsStatusProbe,
  now = Date.now(),
): string {
  const reason = gate.lastFailure ?? "circuit open";
  const retryInSec = Math.max(0, Math.ceil((gate.skipUntil - now) / 1_000));
  const parts = [`Temporarily bypassed · ${reason}`];
  if (retryInSec > 0) parts.push(`retry in ~${retryInSec}s`);
  const ageLabel = formatObservationAge(tws.observedAt, now);
  if (ageLabel && tws.observationConfidence === "last_known") {
    parts.push(`last observed ${ageLabel}`);
  }
  return parts.join(" · ");
}

function twsRequiresManualRecovery(tws: TwsStatusProbe, circuitOpen: boolean): boolean {
  if (!tws.configured) return false;
  if (!tws.sidecarReachable) return true;
  if (tws.restartRequired || tws.diagnostics?.workerWedged) return true;
  if (tws.connectionState === "client_id_stuck") return true;
  if (circuitOpen) {
    if (tws.observationConfidence === "last_known" && tws.gatewayConnected) return false;
    if (tws.observationConfidence === "observed" && !tws.gatewayConnected) return true;
    return false;
  }
  if (tws.reconnectInProgress || tws.diagnostics?.recovery?.phase === "reconnecting") {
    return false;
  }
  if (tws.subscriptionsLost) return false;
  if (tws.sidecarReachable && !tws.gatewayConnected && tws.observationConfidence === "observed") {
    return true;
  }
  return false;
}

export function buildProviderRows(args: {
  tws: TwsStatusProbe;
  twsGate: HealthGateSnapshot;
  fmpConfigured?: boolean;
  fredConfigured?: boolean;
  secConfigured?: boolean;
  massiveConfigured?: boolean;
  ibkrConfigured?: boolean;
  deliveryDiagnostics?: SanitizedDatasetState[];
}): ProviderHealthRow[] {
  const now = Date.now();
  const twsCircuitOpen = args.twsGate.skipUntil > now;
  const diagBySource = new Map<string, SanitizedDatasetState[]>();
  for (const row of args.deliveryDiagnostics ?? []) {
    const list = diagBySource.get(row.source) ?? [];
    list.push(row);
    diagBySource.set(row.source, list);
  }

  function researchProviderStatus(
    providerId: "fmp" | "fred" | "sec" | "yahoo" | "massive" | "ibkr",
    configured: boolean,
    fallbackDetail: string,
  ): { status: ProviderHealthStatus; detail: string } {
    if (!configured) return { status: "disabled", detail: "Not configured" };
    const rows = diagBySource.get(providerId) ?? [];
    if (!rows.length) {
      return { status: "degraded", detail: `${fallbackDetail} · no recent delivery` };
    }
    const latest = rows.reduce((acc, row) =>
      (row.lastSuccessAt ?? 0) > (acc.lastSuccessAt ?? 0) ? row : acc,
    );
    const ageSec =
      latest.lastSuccessAt != null
        ? Math.max(0, Math.round((now - latest.lastSuccessAt) / 1_000))
        : null;
    const hasWarnings = latest.warnings.length > 0;
    const latestFailureAt = rows.reduce(
      (latestAt, row) => Math.max(latestAt, row.lastFailureAt ?? 0),
      0,
    );
    const hasRecentFailure =
      latestFailureAt > 0 && now - latestFailureAt <= RESEARCH_PROVIDER_MAX_DELIVERY_AGE_MS;
    const deliveryTooOld =
      latest.lastSuccessAt == null ||
      now - latest.lastSuccessAt > RESEARCH_PROVIDER_MAX_DELIVERY_AGE_MS;
    return {
      status:
        hasWarnings || hasRecentFailure || deliveryTooOld ? "degraded" : "healthy",
      detail:
        hasRecentFailure
          ? `${fallbackDetail} · recent delivery failure`
          : ageSec != null
            ? `${fallbackDetail} · last delivery ${ageSec}s ago`
          : `${fallbackDetail} · recent delivery observed`,
    };
  }

  const twsStatus: ProviderHealthStatus = !args.tws.configured
    ? "disabled"
    : twsCircuitOpen
      ? "degraded"
      : !args.tws.sidecarReachable
        ? "offline"
        : args.tws.restartRequired || args.tws.diagnostics?.workerWedged
          ? "degraded"
          : args.tws.connectionState === "client_id_stuck"
            ? "degraded"
            : args.tws.sidecarReachable && args.tws.gatewayConnected
              ? "healthy"
              : "degraded";

  const twsDetail = !args.tws.configured
    ? "Not configured"
    : twsCircuitOpen
      ? formatCircuitBypassDetail(args.twsGate, args.tws, now)
      : !args.tws.sidecarReachable
        ? "Sidecar unreachable"
        : args.tws.connectionState === "client_id_stuck" || args.tws.restartRequired
          ? "API client ID stuck"
          : args.tws.diagnostics?.workerWedged
            ? `Worker wedged${args.tws.diagnostics.activeJob ? ` · ${args.tws.diagnostics.activeJob}` : ""}`
            : args.tws.subscriptionsLost
              ? "Market data resubscribing"
              : args.tws.reconnectInProgress ||
                  args.tws.diagnostics?.recovery?.phase === "reconnecting"
                ? `Reconnecting${args.tws.host && args.tws.port ? ` · ${args.tws.host}:${args.tws.port}` : ""}`
                : args.tws.sidecarReachable && args.tws.gatewayConnected
                  ? "Sidecar ok · Gateway connected"
                  : args.tws.observationConfidence === "observed"
                    ? "Sidecar ok · Gateway disconnected"
                    : "Sidecar ok · Connection unknown";

  const requiresManualRecovery = twsRequiresManualRecovery(args.tws, twsCircuitOpen);

  return [
    {
      id: "tws",
      label: "IB Gateway",
      configured: args.tws.configured,
      status: twsStatus,
      detail: twsDetail,
      circuitOpen: twsCircuitOpen,
      circuitReason: twsCircuitOpen ? args.twsGate.lastFailure : null,
      requiresManualRecovery,
    },
    {
      id: "yahoo",
      label: "Yahoo",
      configured: true,
      ...researchProviderStatus("yahoo", true, "Fallback available"),
    },
    {
      id: "fmp",
      label: "FMP",
      configured: args.fmpConfigured ?? false,
      ...researchProviderStatus("fmp", args.fmpConfigured ?? false, "Configured"),
    },
    {
      id: "fred",
      label: "FRED",
      configured: args.fredConfigured ?? false,
      ...researchProviderStatus("fred", args.fredConfigured ?? false, "Configured"),
    },
    {
      id: "sec",
      label: "SEC",
      configured: args.secConfigured ?? false,
      ...researchProviderStatus("sec", args.secConfigured ?? false, "Configured"),
    },
    {
      id: "massive",
      label: "Massive",
      configured: args.massiveConfigured ?? false,
      ...researchProviderStatus("massive", args.massiveConfigured ?? false, "Configured"),
    },
    {
      id: "ibkr",
      label: "IBKR Client Portal",
      configured: args.ibkrConfigured ?? false,
      ...researchProviderStatus("ibkr", args.ibkrConfigured ?? false, "Fallback path"),
    },
  ];
}

export function collectIncidentWarnings(
  datasets: DataHealthDatasetRow[],
  providers: ProviderHealthRow[],
  extra: string[] = [],
): string[] {
  const warnings = new Set<string>();
  for (const row of datasets) {
    for (const warning of incidentWarnings(row.warnings)) {
      if (warning.trim()) warnings.add(warning.trim());
    }
  }
  for (const provider of providers) {
    if (provider.circuitOpen && provider.circuitReason) {
      warnings.add(`${provider.label}: ${provider.circuitReason}`);
    }
  }
  for (const warning of extra) {
    if (warning.trim() && classifyHealthWarning(warning) === "incident") {
      warnings.add(warning.trim());
    }
  }
  return [...warnings].slice(0, 8);
}

/** @deprecated Use collectIncidentWarnings — kept as alias for internal callers. */
export function collectRecentWarnings(
  datasets: DataHealthDatasetRow[],
  providers: ProviderHealthRow[],
  extra: string[] = [],
): string[] {
  return collectIncidentWarnings(datasets, providers, extra);
}

export function deriveDatasetReadiness(row: DataHealthDatasetRow): DatasetReadinessLabel {
  if (row.status === "not_loaded") return "idle";
  if (row.status === "loading") return "idle";
  if (row.status === "unavailable") return "unavailable";
  const severity = deriveDatasetSeverity(row);
  if (severity === "offline") return "unavailable";
  if (severity === "degraded") return "caveat";
  if (row.readinessReasons?.length) return "blocked";
  return "ok";
}

export function deriveDatasetSeverity(row: DataHealthDatasetRow): DataHealthSeverity {
  if (row.status === "unavailable") return "offline";
  if (row.status === "loading" || row.status === "not_loaded") return "unknown";
  if (!row.source) return "unknown";

  const warningsForTrust = incidentWarnings(row.warnings);
  const dataset = resolveTrustDataset(row);
  const usage = defaultUsageForDataset(dataset);
  const provenance = rowProvenance(row);
  const readiness = evaluateReadiness(dataset, usage, provenance);

  if (provenance.isFallback || row.source === "mixed") return "degraded";
  if (FALLBACK_SOURCES.has(row.source) && isFallbackSource(row.source, warningsForTrust)) {
    return "degraded";
  }
  const policy = getDatasetPolicy(dataset);
  if (policy.maxDisplayAgeMs != null) {
    if (!isDisplayFresh(dataset, provenance)) return "degraded";
  } else if (row.stale) {
    return "degraded";
  }
  if (hasPartialSymbolCoverage(row.detail)) return "degraded";
  if (readiness.status === "blocked") return "degraded";
  if (warningsForTrust.length > 0) return "degraded";
  return "healthy";
}

function socketEndpointDetail(
  probe: TwsConnectionProbe | undefined,
  fallbackHost?: string,
  fallbackPort?: number,
  options?: { connected?: boolean; observedAt?: number; lastKnown?: boolean },
): string {
  const connected = options?.connected ?? probe?.gatewayConnected ?? false;
  if (connected) {
    const host = probe?.host ?? fallbackHost ?? "127.0.0.1";
    const port = probe?.port ?? fallbackPort;
    const endpoint = port != null ? `${host}:${port}` : host;
    const ageLabel = formatObservationAge(options?.observedAt);
    if (options?.lastKnown && ageLabel) {
      return `Last known connected · ${endpoint} · ${ageLabel}`;
    }
    return port != null ? `Connected · ${endpoint}` : "Connected";
  }
  if (probe?.message) return probe.message;
  if (options?.lastKnown) return "Connection unknown · bypass active";
  return "Gateway disconnected";
}

function socketStatus(
  probe: TwsConnectionProbe | undefined,
  fallbackConnected: boolean | undefined,
  sidecarReachable: boolean,
  options?: { lastKnownConnected?: boolean },
): ProviderHealthStatus {
  const connected =
    probe?.gatewayConnected ??
    (options?.lastKnownConnected ? true : fallbackConnected) ??
    false;
  if (connected) return "healthy";
  if (!sidecarReachable) return "offline";
  return "degraded";
}

export function buildIbSocketRows(tws: TwsStatusProbe): IbSocketHealthRow[] {
  const paperProbe = tws.connections?.["ib-paper"];
  const liveProbe = tws.connections?.["ib-live"];
  const sidecarReachable = tws.sidecarReachable;
  const lastKnownConnected =
    tws.circuitBypassed === true &&
    tws.observationConfidence === "last_known" &&
    tws.gatewayConnected;

  return [
    {
      id: "tws-paper",
      connectionId: "ib-paper",
      label: "Paper Gateway",
      status: socketStatus(paperProbe, tws.gatewayConnected, sidecarReachable, {
        lastKnownConnected,
      }),
      detail: socketEndpointDetail(paperProbe, tws.host, tws.port, {
        connected: paperProbe?.gatewayConnected ?? (lastKnownConnected ? true : tws.gatewayConnected),
        observedAt: tws.observedAt,
        lastKnown: lastKnownConnected,
      }),
    },
    {
      id: "tws-live",
      connectionId: "ib-live",
      label: "Live Gateway",
      status: socketStatus(liveProbe, false, sidecarReachable, {
        lastKnownConnected: lastKnownConnected && !!liveProbe?.gatewayConnected,
      }),
      detail: socketEndpointDetail(liveProbe, tws.host, liveProbe?.port ?? 4001, {
        connected: liveProbe?.gatewayConnected ?? false,
        observedAt: tws.observedAt,
        lastKnown: lastKnownConnected && !!liveProbe?.gatewayConnected,
      }),
    },
  ];
}

export function buildDataPreferenceRow(
  connectionId: DataConnectionId | null | undefined,
): DataPreferenceHealthRow | null {
  if (!connectionId) return null;
  return {
    connectionId,
    label: dataConnectionLabel(connectionId),
  };
}

function connectionShortStatus(status: ProviderHealthStatus): string {
  switch (status) {
    case "healthy":
      return "ok";
    case "offline":
      return "offline";
    case "degraded":
      return "retrying";
    default:
      return "unknown";
  }
}

export function buildConnectionSummary(
  providers: ProviderHealthRow[],
  options: {
    connectionRows?: IbSocketHealthRow[];
    dataPreference?: DataPreferenceHealthRow | null;
  } = {},
): {
  label: string;
  severity: DataHealthSeverity;
} {
  const { connectionRows, dataPreference } = options;
  if (connectionRows?.length) {
    const paper = connectionRows.find((row) => row.id === "tws-paper");
    const live = connectionRows.find((row) => row.id === "tws-live");
    const paperShort = connectionShortStatus(paper?.status ?? "disabled");
    const liveShort = connectionShortStatus(live?.status ?? "disabled");
    const dataLabel = dataPreference?.label ?? "Paper data";
    const label = `Paper: ${paperShort} · Live: ${liveShort} · Data: ${dataLabel}`;

    const preferredRow = dataPreference
      ? connectionRows.find((row) => row.connectionId === dataPreference.connectionId)
      : paper;
    const preferredStatus = preferredRow?.status ?? "unknown";
    if (preferredStatus === "offline") {
      return { label, severity: "offline" };
    }
    if (preferredStatus === "degraded") {
      return { label, severity: "degraded" };
    }
    if (preferredStatus === "healthy") {
      return { label, severity: "healthy" };
    }
    return { label, severity: "unknown" };
  }

  const tws = providers.find((provider) => provider.id === "tws");
  if (!tws?.configured) {
    return { label: "No primary gateway configured", severity: "unknown" };
  }
  if (tws.status === "offline") {
    return { label: "Disconnected · IB Gateway offline", severity: "offline" };
  }
  if (isTwsGatewayHealthy(tws)) {
    return { label: "Connected · IB Gateway ok", severity: "healthy" };
  }
  if (tws.status === "degraded") {
    return { label: `Connecting · ${tws.detail}`, severity: "degraded" };
  }
  return { label: tws.detail, severity: "degraded" };
}

export function deriveOverallSeverity(
  datasets: DataHealthDatasetRow[],
  providers: ProviderHealthRow[],
  options: {
    connectionRows?: IbSocketHealthRow[];
    dataPreference?: DataPreferenceHealthRow | null;
  } = {},
): DataHealthSeverity {
  const loaded = datasets.filter((row) => row.status === "loaded");
  if (loaded.length === 0) return "unknown";

  const datasetSeverities = loaded.map(deriveDatasetSeverity);
  if (datasetSeverities.includes("offline")) return "offline";
  if (datasetSeverities.includes("degraded")) return "degraded";

  const { connectionRows, dataPreference } = options;
  if (connectionRows?.length && dataPreference) {
    const preferredRow = connectionRows.find(
      (row) => row.connectionId === dataPreference.connectionId,
    );
    if (preferredRow?.status === "offline") return "offline";
    if (preferredRow?.status === "degraded") return "degraded";
  }

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
  watchlistRow: DataHealthDatasetRow | undefined,
  severity: DataHealthSeverity,
): string {
  const chartSource = chartRow?.source ? upperSource(chartRow.source) : null;
  const watchlistSource =
    watchlistRow?.status === "loaded" && watchlistRow.source
      ? upperSource(watchlistRow.source)
      : null;

  if (!chartSource && !watchlistSource) return "Data";

  if (chartSource && watchlistSource && chartSource !== watchlistSource) {
    const parts = [`Chart: ${chartSource}`, `Quotes: ${watchlistSource}`];
    if (watchlistRow?.streaming || chartRow?.streaming) parts.push("streaming");
    else if (severity === "degraded") parts.push("mixed");
    return parts.join(" · ");
  }

  const source = chartSource ?? watchlistSource!;
  const primaryRow = chartSource ? chartRow : watchlistRow;
  const label = chartSource ? "Chart" : "Quotes";
  const parts = [`${label}: ${source}`];
  if (primaryRow?.streaming) parts.push("streaming");
  else if (primaryRow && !isDatasetDisplayFresh(primaryRow)) {
    parts.push("aging");
  } else if (severity === "degraded" && FALLBACK_SOURCES.has(primaryRow?.source ?? "")) {
    parts.push("fallback");
  }
  return parts.join(" · ");
}

/** Short overlay label without "Chart:" / "Quotes:" prefixes (e.g. "TWS · live"). */
export function buildHealthCompactSummary(
  chartRow: DataHealthDatasetRow | undefined,
  watchlistRow: DataHealthDatasetRow | undefined,
  severity: DataHealthSeverity,
): string {
  const full = buildHealthSummary(chartRow, watchlistRow, severity);
  if (full === "Data") return full;
  return full
    .replace(/Chart: ([^·]+) · Quotes: ([^·]+)/i, "$1/$2")
    .replace(/^Chart: /i, "")
    .replace(/^Quotes: /i, "");
}

export function buildHealthBadgeLabel(
  chartRow: DataHealthDatasetRow | undefined,
  watchlistRow: DataHealthDatasetRow | undefined,
  severity: DataHealthSeverity,
  watchlistTransport?: "rest" | "sse",
): string {
  const base = buildHealthCompactSummary(chartRow, watchlistRow, severity);
  if (
    severity === "healthy" &&
    watchlistTransport === "rest" &&
    watchlistRow?.status === "loaded" &&
    chartRow?.streaming
  ) {
    return `${base} · REST`;
  }
  return base;
}

/** True when IB Gateway provider row reports sidecar reachable and gateway connected. */
export function isTwsGatewayHealthy(provider: ProviderHealthRow | undefined): boolean {
  if (!provider?.configured) return false;
  return (
    provider.status === "healthy" &&
    provider.detail.toLowerCase().includes("gateway connected")
  );
}

/** When server health has not loaded yet, infer TWS state from client dataset warnings. */
export function buildProvisionalProviderRows(
  datasets: DataHealthDatasetRow[],
): ProviderHealthRow[] | null {
  const warnings = datasets.flatMap((row) => row.warnings).filter(Boolean);
  const twsSkip = warnings.find((warning) => /TWS temporarily skipped/i.test(warning));
  if (!twsSkip) return null;

  const reasonMatch = twsSkip.match(/skipped \(([^)]+)\)/i);
  const reason = reasonMatch?.[1] ?? "unknown";
  const sidecarUnreachable = reason === "sidecar_unreachable";

  return [
    {
      id: "tws",
      label: "IB Gateway",
      configured: true,
      status: sidecarUnreachable ? "offline" : "degraded",
      detail: sidecarUnreachable ? reason : `Temporarily bypassed · ${reason}`,
      circuitOpen: true,
      circuitReason: reason,
      requiresManualRecovery: sidecarUnreachable,
    },
    {
      id: "yahoo",
      label: "Yahoo",
      configured: true,
      status: "healthy",
      detail: "Fallback available",
    },
  ];
}

export function buildHealthCaveatSubtitle(
  datasets: DataHealthDatasetRow[],
  now = Date.now(),
): string | null {
  for (const row of datasets) {
    if (row.severity !== "degraded" || row.status !== "loaded") continue;
    if (row.kind === "watchlist" && isFallbackSource(row.source, incidentWarnings(row.warnings))) {
      return "Watchlist on fallback source";
    }
    if (row.kind === "chart" && isFallbackSource(row.source, incidentWarnings(row.warnings))) {
      return "Chart on fallback source";
    }
    if (hasDisplayAgePolicy(row) && !isDatasetDisplayFresh(row, now)) {
      const provenance = rowProvenance(row);
      const ageSec = Math.round(
        (row.kind === "watchlist"
          ? watchlistDeliveryAgeMs(provenance, now)
          : quoteAgeMs(provenance, now)) / 1_000,
      );
      if (row.kind === "watchlist") {
        return `Watchlist quotes ${ageSec}s old`;
      }
      if (row.kind === "chart") {
        return `Chart candles ${ageSec}s old`;
      }
      if (row.kind === "options") {
        return `Options data ${ageSec}s old`;
      }
    }
    if (!hasDisplayAgePolicy(row) && row.stale) {
      return `${row.label} data is stale`;
    }
    if (hasPartialSymbolCoverage(row.detail)) {
      return "Watchlist has partial symbol coverage";
    }
  }
  return null;
}

/** Neutral closed-market copy when watchlist delivery is healthy. */
export function buildHealthSessionSubtitle(
  datasets: DataHealthDatasetRow[],
  severity: DataHealthSeverity,
  now = Date.now(),
): string | null {
  if (severity !== "healthy") return null;
  if (classifyUsEquitySession(now) !== "closed") return null;
  const watchlist = datasets.find((row) => row.kind === "watchlist");
  if (watchlist?.status !== "loaded" || watchlist.severity !== "healthy") return null;
  return closedMarketHealthySubtitle();
}

export function mergeHealthSnapshot(
  client: ClientHealthInputs,
  server: ServerHealthPayload | null,
  recentEvents: HealthEvent[] = [],
  supervision?: {
    previous: ConnectionSupervisorSnapshot | null;
    next: ConnectionSupervisorSnapshot | null;
  },
): DataHealthSnapshot {
  const chart = buildChartDatasetRow(client.chartMeta, client.chartDetail);
  const watchlist = buildWatchlistDatasetRow(
    client.watchlistMeta,
    client.watchlistDetail,
    client.watchlistLoading ?? false,
    client.watchlistError,
    client.watchlistTransport,
    client.watchlistAsOf,
    client.watchlistDeliveryAt,
  );
  const options = buildOptionsDatasetRow(
    client.optionsMeta,
    client.optionsDetail,
    client.optionsTrustDataset,
  );
  const account = buildAccountDatasetRow({
    disabled: client.accountDisabled,
    connectionState: client.accountConnectionState,
    detail: client.accountDetail,
    error: client.accountError,
  });

  const extendedRows = [
    ...buildDemandRowsFromInputs(client.demandDatasets),
    ...(client.brokerageSubdatasets ?? []).map((row) => buildBrokerageSubdatasetRow(row)),
    buildPreTradeDatasetRow(client.preTrade),
    buildPersistenceSyncRow(client.persistenceSync),
  ].filter((row): row is DataHealthDatasetRow => row != null);

  const datasets = filterVisibleCurrentDataRows(
    mergeDeliveryDiagnosticsIntoRows(
      [chart, watchlist, options, account, ...extendedRows],
      server?.deliveryDiagnostics,
    ).map((row) => (row.severity ? row : enrichDatasetRow(row))),
  );
  const provisionalProviders = server?.providers?.length
    ? null
    : buildProvisionalProviderRows(datasets);
  const providers = server?.providers?.length
    ? server.providers
    : (provisionalProviders ?? []);
  const connectionRows =
    supervision?.next?.displaySockets?.length
      ? displaySocketsToIbRows(supervision.next.displaySockets)
      : server?.twsStatus?.configured === false
        ? []
        : server?.twsStatus
          ? buildIbSocketRows(server.twsStatus)
          : [];
  const dataPreference = buildDataPreferenceRow(client.dataConnectionPreference);
  const recentWarnings = collectIncidentWarnings(
    datasets,
    providers,
    server?.recentWarnings ?? [],
  );
  const connection = supervision?.next
    ? supervision.next.connectionSummary
    : buildConnectionSummary(providers, {
        connectionRows,
        dataPreference,
      });
  const severity = deriveOverallSeverity(datasets, providers, {
    connectionRows,
    dataPreference,
  });

  return {
    severity,
    severityLabel: severityLabel(severity),
    summary: buildHealthSummary(chart, watchlist, severity),
    connectionSummary: connection.label,
    connectionRows,
    dataPreference,
    datasets,
    providers,
    recentWarnings,
    recentEvents,
    generatedAt: server?.generatedAt ?? Date.now(),
    revision: server?.revision,
    deliveryDiagnostics: server?.deliveryDiagnostics,
  };
}

export function buildConnectionSupervision(
  server: ServerHealthPayload | null,
  previous: ConnectionSupervisorSnapshot | null,
  options: {
    dataConnectionPreference?: DataConnectionId | null;
    twsGate?: HealthGateSnapshot;
  } = {},
): ConnectionSupervisorSnapshot | null {
  if (!server?.twsStatus) return previous;
  return reduceConnectionSupervisor(previous, {
    tws: server.twsStatus,
    twsGate: options.twsGate ?? { skipUntil: 0, lastFailure: null, failureCount: 0, lastSuccessAt: 0 },
    ibkrGate: ibkrHealthGate.snapshot(),
    brokerageGate: getBrokerageHealthGateSnapshot(),
    dataPreferenceLabel: options.dataConnectionPreference
      ? dataConnectionLabel(options.dataConnectionPreference)
      : undefined,
    recovery: getTwsRecoverySession()
      ? {
          sessionId: getTwsRecoverySession()?.id,
          phase: getTwsRecoverySession()?.lastPhase,
          updatedAt: getTwsRecoverySession()?.phaseUpdatedAt,
        }
      : undefined,
    revision: server.revision,
    generatedAt: server.generatedAt,
  });
}

export type { ConnectionSupervisorSnapshot };

export function formatDatasetLine(row: DataHealthDatasetRow, now = Date.now()): string {
  const parts: string[] = [];
  if (row.detail) parts.push(row.detail);
  if (row.source) parts.push(upperSource(row.source));
  if (row.streaming) parts.push("live");
  const displayFresh = isDatasetDisplayFresh(row, now);
  if (row.asOf != null && hasDisplayAgePolicy(row)) {
    const ageLabel = formatQuoteAgeLabel(row.asOf, now);
    if (ageLabel) parts.push(ageLabel);
  } else if (row.stale && !displayFresh) {
    parts.push("stale");
  }
  if (!hasDisplayAgePolicy(row)) {
    const cache = formatCacheTier(row.cacheTier);
    if (cache) parts.push(cache);
  }
  if (row.latencyMs != null) parts.push(`${Math.round(row.latencyMs)}ms`);
  if (row.allowedForTradingDecision === false && row.status === "loaded") {
    parts.push("display-only");
  }
  return parts.join(" · ");
}

export type DatasetChipTone = "default" | "muted" | "warning" | "positive";

export type DatasetChip = { label: string; tone?: DatasetChipTone };

export function buildDatasetChips(row: DataHealthDatasetRow, now = Date.now()): DatasetChip[] {
  if (row.status === "not_loaded") return [];
  if (row.status === "loading") return [{ label: "Loading…", tone: "muted" }];
  if (row.status === "unavailable") {
    return [{ label: row.detail ?? "Unavailable", tone: "warning" }];
  }

  const chips: DatasetChip[] = [];
  if (row.detail) {
    for (const part of row.detail.split(" · ")) {
      const trimmed = part.trim();
      if (trimmed) chips.push({ label: trimmed, tone: "default" });
    }
  }
  if (row.source) {
    chips.push({ label: upperSource(row.source), tone: "default" });
  }
  if (row.streaming) {
    chips.push({ label: "Streaming", tone: "positive" });
  }
  const displayFresh = isDatasetDisplayFresh(row, now);
  if (row.asOf != null && hasDisplayAgePolicy(row)) {
    const ageLabel = formatQuoteAgeLabel(row.asOf, now);
    if (ageLabel) {
      chips.push({
        label: ageLabel.replace(/^updated /i, ""),
        tone: displayFresh ? "muted" : "warning",
      });
    }
  } else if (row.stale && !displayFresh) {
    chips.push({ label: "Stale", tone: "warning" });
  }
  if (!hasDisplayAgePolicy(row)) {
    const cache = formatCacheTier(row.cacheTier);
    if (cache) chips.push({ label: cache, tone: "muted" });
  }
  if (row.latencyMs != null) {
    chips.push({ label: `${Math.round(row.latencyMs)}ms`, tone: "muted" });
  }
  if (row.allowedForTradingDecision === false && row.status === "loaded") {
    chips.push({ label: "display-only", tone: "muted" });
  }
  return chips;
}

export function exportHealthJson(snapshot: DataHealthSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function shouldShowTwsRecovery(provider: ProviderHealthRow | undefined): boolean {
  if (!provider?.configured) return false;
  if (provider.status === "healthy") return false;
  if (provider.requiresManualRecovery === false) return false;
  if (provider.requiresManualRecovery === true) return true;
  return provider.status === "degraded" || provider.status === "offline";
}

export function twsRecoveryButtonLabel(provider: ProviderHealthRow | undefined): string {
  if (!provider?.configured) return "Recover TWS";
  if (provider.requiresManualRecovery === false) return "Recover TWS";
  if (provider.detail.toLowerCase().includes("unreachable")) {
    return "Start TWS sidecar";
  }
  if (provider.detail.toLowerCase().includes("client id stuck")) {
    return "Restart sidecar";
  }
  if (provider.detail.toLowerCase().includes("worker wedged")) {
    return "Restart sidecar";
  }
  if (
    provider.detail.toLowerCase().includes("gateway disconnected") ||
    provider.detail.toLowerCase().includes("not connected")
  ) {
    return "Reconnect TWS";
  }
  return "Recover TWS";
}
