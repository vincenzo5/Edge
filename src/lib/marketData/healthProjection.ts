import type { ChartDataMeta } from "@edge/chart-core";
import type { SanitizedDatasetState } from "./state/deliveryRegistry";
import type { DataIncident } from "./state/incidents";
import { mergeIncidents, projectWarningsToIncidents } from "./state/incidents";
import type { HealthEvent } from "./healthEvents";
import {
  buildHealthBadgeLabel,
  buildHealthCaveatSubtitle,
  buildHealthSessionSubtitle,
  classifyHealthWarning,
  deriveDatasetSeverity,
  incidentWarnings,
  isDatasetDisplayFresh,
  shouldShowTwsRecovery,
  twsRecoveryButtonLabel,
  type DataHealthDatasetRow,
  type DataHealthSeverity,
  type DataHealthSnapshot,
  type DataPreferenceHealthRow,
  type IbSocketHealthRow,
  type ProviderHealthRow,
} from "./health";
import { isFallbackSource } from "./trust/dataTrust";

export type DataHealthUserStatus = "current" | "fallback" | "delayed" | "unavailable";

export type ConnectionUserLabel =
  | "current"
  | "reconnecting"
  | "confirmed disconnected"
  | "fallback"
  | "unknown";

export type ProjectedConnectionRow = IbSocketHealthRow & {
  userLabel: ConnectionUserLabel;
  userDetail: string;
};

export type ChromeRecoveryLabel = "Reconnect";

export type HealthUserProjection = {
  userStatus: DataHealthUserStatus;
  primaryLabel: string;
  tooltip: string;
  accessibleLabel: string;
  severity: DataHealthSeverity;
  sessionSubtitle: string | null;
  caveatSubtitle: string | null;
  connectionSummary: string;
  /** Calm one-line incident for app chrome (header). Null when healthy. */
  chromeIncidentLabel: string | null;
  /** User-facing recover CTA for app chrome. Null when no manual action. */
  chromeRecoveryLabel: ChromeRecoveryLabel | null;
  showRecovery: boolean;
  /** Ops-specific recover label for Data Health / Settings only. */
  recoveryLabel: string;
  overlayFeedStatus: {
    testId: string;
    label: string;
    tone: "error" | "warning" | "muted";
  } | null;
  sections: {
    currentData: DataHealthDatasetRow[];
    connections: {
      rows: ProjectedConnectionRow[];
      dataPreference: DataPreferenceHealthRow | null;
      preferenceNote: string;
    };
    activeIncident: {
      message: string;
      startedAt: number;
      affectedDatasets: string[];
    } | null;
  };
  diagnostics: {
    providers: ProviderHealthRow[];
    recoveredEvents: Array<{ message: string; at: number }>;
    routeDiagnostics: SanitizedDatasetState[];
    incidentHistory: string[];
  };
};

export type ChartFeedOverlay = {
  error?: string | null;
  streamError?: string | null;
  stale?: boolean;
  refreshing?: boolean;
  source?: ChartDataMeta["source"];
};

export type BuildDataHealthProjectionOptions = {
  watchlistTransport?: "rest" | "sse";
  deliveryDiagnostics?: SanitizedDatasetState[];
  chartFeed?: ChartFeedOverlay;
};

export type DataHealthView = DataHealthSnapshot & {
  projection: HealthUserProjection;
};

export function withHealthProjection(
  snapshot: DataHealthSnapshot,
  options: BuildDataHealthProjectionOptions = {},
): DataHealthView {
  return {
    ...snapshot,
    projection: buildDataHealthProjection(snapshot, options),
  };
}

const FALLBACK_SOURCES = new Set(["yahoo", "mixed"]);

function upperSource(source: string | undefined): string {
  return (source ?? "unknown").toUpperCase();
}

function transportLabel(
  chartRow: DataHealthDatasetRow | undefined,
  watchlistRow: DataHealthDatasetRow | undefined,
  watchlistTransport?: "rest" | "sse",
): string | null {
  if (chartRow?.streaming) return "streaming";
  if (watchlistRow?.streaming || watchlistTransport === "sse") return "streaming";
  if (watchlistTransport === "rest" && watchlistRow?.status === "loaded") return "polling";
  return null;
}

function deriveUserStatus(
  snapshot: DataHealthSnapshot,
  chartRow: DataHealthDatasetRow | undefined,
  watchlistRow: DataHealthDatasetRow | undefined,
  chartFeed?: ChartFeedOverlay,
): DataHealthUserStatus {
  if (chartFeed?.error || chartFeed?.streamError) return "unavailable";
  if (snapshot.severity === "offline") return "unavailable";

  if (chartFeed?.refreshing) return "delayed";
  if (chartFeed?.stale && chartRow && !isDatasetDisplayFresh(chartRow)) return "delayed";

  const loadedRows = snapshot.datasets.filter((row) => row.status === "loaded");
  if (loadedRows.length === 0) return "unavailable";

  const chartFallback =
    chartRow?.status === "loaded" &&
    (FALLBACK_SOURCES.has(chartRow.source ?? "") ||
      isFallbackSource(chartRow.source, incidentWarnings(chartRow.warnings)));
  const watchlistFallback =
    watchlistRow?.status === "loaded" &&
    (FALLBACK_SOURCES.has(watchlistRow.source ?? "") ||
      isFallbackSource(watchlistRow.source, incidentWarnings(watchlistRow.warnings)));

  if (chartFallback || watchlistFallback) return "fallback";

  const chartDelayed =
    chartRow?.status === "loaded" &&
    ((chartFeed?.stale && !isDatasetDisplayFresh(chartRow)) ||
      deriveDatasetSeverity(chartRow) === "degraded");
  const watchlistDelayed =
    watchlistRow?.status === "loaded" && deriveDatasetSeverity(watchlistRow) === "degraded";

  if (chartDelayed || watchlistDelayed || snapshot.severity === "degraded") {
    if (chartFeed?.refreshing) return "delayed";
    if (chartDelayed || watchlistDelayed) return "delayed";
    if (snapshot.severity === "degraded") return "delayed";
  }

  return "current";
}

function userStatusLabel(status: DataHealthUserStatus): string {
  switch (status) {
    case "current":
      return "Current";
    case "fallback":
      return "Fallback";
    case "delayed":
      return "Delayed";
    case "unavailable":
      return "Unavailable";
  }
}

function mapConnectionUserLabel(row: IbSocketHealthRow, detail: string): ConnectionUserLabel {
  const normalized = detail.toLowerCase();
  if (normalized.includes("bypass") || normalized.includes("temporarily bypassed")) {
    return "fallback";
  }
  if (normalized.includes("last known") || normalized.includes("connection unknown")) {
    return "fallback";
  }
  if (row.status === "healthy") return "current";
  if (
    normalized.includes("reconnect") ||
    normalized.includes("resubscrib") ||
    normalized.includes("retry")
  ) {
    return "reconnecting";
  }
  if (
    row.status === "offline" ||
    normalized.includes("disconnected") ||
    normalized.includes("unreachable")
  ) {
    return "confirmed disconnected";
  }
  if (row.status === "degraded") return "reconnecting";
  return "unknown";
}

function formatConnectionUserDetail(row: IbSocketHealthRow, userLabel: ConnectionUserLabel): string {
  if (userLabel === "current") {
    return row.detail.replace(/^Connected · /i, "Current · ");
  }
  if (userLabel === "confirmed disconnected") {
    if (row.detail.toLowerCase().includes("disconnected")) {
      return row.detail.replace(/Gateway disconnected/i, "Confirmed disconnected");
    }
    return `Confirmed disconnected · ${row.detail}`;
  }
  if (userLabel === "reconnecting") {
    return row.detail.replace(/Sidecar ok · /i, "Reconnecting · ");
  }
  if (userLabel === "fallback") {
    return row.detail.replace(/Temporarily bypassed/i, "Fallback");
  }
  return row.detail;
}

function preferredConnectionRow(
  rows: ProjectedConnectionRow[],
  dataPreference: DataPreferenceHealthRow | null,
): ProjectedConnectionRow | undefined {
  const preferredId = dataPreference?.connectionId === "ib-live" ? "tws-live" : "tws-paper";
  return rows.find((row) => row.id === preferredId);
}

function buildChromeIncidentLabel(
  showRecovery: boolean,
  severity: DataHealthSeverity,
  connectionRows: ProjectedConnectionRow[],
  dataPreference: DataPreferenceHealthRow | null,
  twsProvider: ProviderHealthRow | undefined,
): string | null {
  const preferredRow = preferredConnectionRow(connectionRows, dataPreference);
  const preferredLabel = preferredRow?.userLabel;

  if (
    preferredLabel === "reconnecting" ||
    twsProvider?.detail.toLowerCase().includes("reconnect")
  ) {
    return "Broker reconnecting";
  }

  if (
    showRecovery ||
    preferredLabel === "confirmed disconnected" ||
    twsProvider?.status === "offline" ||
    (severity === "offline" && twsProvider?.configured)
  ) {
    return "Broker disconnected";
  }

  return null;
}

function buildConnectionSummary(rows: ProjectedConnectionRow[], dataPreference: DataPreferenceHealthRow | null): string {
  const paper = rows.find((row) => row.id === "tws-paper");
  const live = rows.find((row) => row.id === "tws-live");
  const paperLabel = paper?.userLabel ?? "unknown";
  const liveLabel = live?.userLabel ?? "unknown";
  const preference = dataPreference?.label ?? "Paper data";
  return `Paper: ${paperLabel} · Live: ${liveLabel} · Data preference: ${preference}`;
}

function buildPrimaryLabel(
  userStatus: DataHealthUserStatus,
  chartRow: DataHealthDatasetRow | undefined,
  watchlistRow: DataHealthDatasetRow | undefined,
  severity: DataHealthSeverity,
  watchlistTransport?: "rest" | "sse",
): string {
  const sourceLabel = buildHealthBadgeLabel(chartRow, watchlistRow, severity, watchlistTransport);
  const transport = transportLabel(chartRow, watchlistRow, watchlistTransport);
  const parts = [userStatusLabel(userStatus)];
  if (sourceLabel && sourceLabel !== "Data") {
    parts.push(sourceLabel);
  } else if (chartRow?.source) {
    parts.push(upperSource(chartRow.source));
  } else if (watchlistRow?.source) {
    parts.push(upperSource(watchlistRow.source));
  }
  const joined = parts.join(" · ").toLowerCase();
  if (transport && !joined.includes(transport)) {
    parts.push(transport);
  }
  return parts.join(" · ");
}

function resolveOverlayFeedStatus(
  chartRow: DataHealthDatasetRow | undefined,
  chartFeed?: ChartFeedOverlay,
): HealthUserProjection["overlayFeedStatus"] {
  const sourceSuffix = chartFeed?.source ? ` · ${chartFeed.source}` : "";

  if (chartFeed?.error) {
    return {
      testId: "chart-feed-status-error",
      label: `Unavailable · failed to load${sourceSuffix}`,
      tone: "error",
    };
  }
  if (chartFeed?.streamError) {
    return {
      testId: "chart-feed-status-stream-error",
      label: `Delayed · stream interrupted${sourceSuffix}`,
      tone: "warning",
    };
  }
  if (chartFeed?.stale && chartRow && !isDatasetDisplayFresh(chartRow)) {
    return {
      testId: "chart-feed-status-stale",
      label: `Delayed · updating${sourceSuffix}`,
      tone: "warning",
    };
  }
  if (chartFeed?.refreshing) {
    return {
      testId: "chart-feed-status-refreshing",
      label: `Delayed · cached · refreshing${sourceSuffix}`,
      tone: "muted",
    };
  }
  return null;
}

function selectActiveIncident(
  snapshot: DataHealthSnapshot,
  recentEvents: HealthEvent[],
): HealthUserProjection["sections"]["activeIncident"] {
  const warningIncidents = mergeIncidents(
    [],
    projectWarningsToIncidents(snapshot.recentWarnings),
  ).filter((row) => row.status === "active");

  const activeEvent = recentEvents.find(
    (event) => !event.recovered && classifyHealthWarning(event.message) === "incident",
  );

  const candidate: DataIncident | undefined = warningIncidents[0];
  if (activeEvent && (!candidate || activeEvent.at > candidate.lastObservedAt)) {
    return {
      message: activeEvent.message,
      startedAt: activeEvent.at,
      affectedDatasets: activeEvent.dataset ? [activeEvent.dataset] : [],
    };
  }
  if (!candidate) return null;
  return {
    message: candidate.warnings[0] ?? "Active data incident",
    startedAt: candidate.startedAt,
    affectedDatasets: candidate.affectedDatasetIds,
  };
}

function buildRecoveredEvents(recentEvents: HealthEvent[]): Array<{ message: string; at: number }> {
  return recentEvents
    .filter((event) => event.recovered)
    .map((event) => ({ message: event.message, at: event.at }));
}

function buildIncidentHistory(
  snapshot: DataHealthSnapshot,
  recentEvents: HealthEvent[],
  activeIncident: HealthUserProjection["sections"]["activeIncident"],
): string[] {
  const items: string[] = [];
  for (const warning of snapshot.recentWarnings) {
    if (activeIncident?.message === warning) continue;
    items.push(warning);
  }
  for (const event of recentEvents) {
    const line = `${event.message}${event.recovered ? " · recovered" : ""}`;
    if (activeIncident?.message === event.message) continue;
    items.push(line);
  }
  return items.slice(0, 8);
}

export function buildDataHealthProjection(
  snapshot: DataHealthSnapshot,
  options: BuildDataHealthProjectionOptions = {},
): HealthUserProjection {
  const chartRow = snapshot.datasets.find((row) => row.kind === "chart");
  const watchlistRow = snapshot.datasets.find((row) => row.kind === "watchlist");
  const twsProvider = snapshot.providers.find((provider) => provider.id === "tws");

  const userStatus = deriveUserStatus(snapshot, chartRow, watchlistRow, options.chartFeed);
  const caveatSubtitle = buildHealthCaveatSubtitle(snapshot.datasets);
  const sessionSubtitle = buildHealthSessionSubtitle(snapshot.datasets, snapshot.severity);
  const primaryLabel = buildPrimaryLabel(
    userStatus,
    chartRow,
    watchlistRow,
    snapshot.severity,
    options.watchlistTransport,
  );

  const connectionRows: ProjectedConnectionRow[] = snapshot.connectionRows.map((row) => {
    let userLabel = mapConnectionUserLabel(row, row.detail);
    if (twsProvider?.circuitOpen && userLabel === "confirmed disconnected") {
      userLabel = "fallback";
    }
    if (
      twsProvider?.detail.toLowerCase().includes("reconnect") &&
      userLabel === "confirmed disconnected"
    ) {
      userLabel = "reconnecting";
    }
    return {
      ...row,
      userLabel,
      userDetail: formatConnectionUserDetail(row, userLabel),
    };
  });

  const connectionSummary =
    connectionRows.length > 0
      ? buildConnectionSummary(connectionRows, snapshot.dataPreference)
      : snapshot.connectionSummary;

  const activeIncident = selectActiveIncident(snapshot, snapshot.recentEvents);
  const recoveredEvents = buildRecoveredEvents(snapshot.recentEvents);
  const incidentHistory = buildIncidentHistory(snapshot, snapshot.recentEvents, activeIncident);

  const accessibleLabel = primaryLabel;
  const showRecovery = shouldShowTwsRecovery(twsProvider);
  const chromeIncidentLabel = buildChromeIncidentLabel(
    showRecovery,
    snapshot.severity,
    connectionRows,
    snapshot.dataPreference,
    twsProvider,
  );

  return {
    userStatus,
    primaryLabel,
    tooltip: primaryLabel,
    accessibleLabel,
    severity: snapshot.severity,
    sessionSubtitle,
    caveatSubtitle,
    connectionSummary,
    chromeIncidentLabel,
    chromeRecoveryLabel: showRecovery ? "Reconnect" : null,
    showRecovery,
    recoveryLabel: twsRecoveryButtonLabel(twsProvider),
    overlayFeedStatus: resolveOverlayFeedStatus(chartRow, options.chartFeed),
    sections: {
      currentData: snapshot.datasets,
      connections: {
        rows: connectionRows,
        dataPreference: snapshot.dataPreference,
        preferenceNote: "Affects chart and watchlist data only",
      },
      activeIncident,
    },
    diagnostics: {
      providers: snapshot.providers,
      recoveredEvents,
      routeDiagnostics: options.deliveryDiagnostics ?? [],
      incidentHistory,
    },
  };
}
