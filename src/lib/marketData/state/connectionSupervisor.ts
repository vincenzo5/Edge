import type { ConnectionDimension, ObservationConfidence } from "./dimensions";
import { createSnapshotRevision, shouldAcceptSnapshot, type SnapshotRevision } from "./revision";
import type { TwsConnectionProbe, TwsStatusProbe } from "../providers/tws/client";
import type { DataConnectionId } from "../dataConnectionPreference";

export type DataHealthSeverity = "healthy" | "degraded" | "offline" | "unknown";

export type ProviderHealthStatus = "healthy" | "degraded" | "offline" | "disabled";

export type HealthGateSnapshot = {
  skipUntil: number;
  lastFailure: string | null;
  failureCount: number;
  lastSuccessAt: number;
};

export type IbSocketHealthRow = {
  id: "tws-paper" | "tws-live";
  connectionId: DataConnectionId;
  label: string;
  status: ProviderHealthStatus;
  detail: string;
};

export type ProviderHealthRow = {
  id: "tws" | "yahoo" | "fmp" | "fred" | "sec";
  label: string;
  configured: boolean;
  status: ProviderHealthStatus;
  detail: string;
  circuitOpen?: boolean;
  circuitReason?: string | null;
  requiresManualRecovery?: boolean;
};

export type SupervisedConnectionId = "ib-paper" | "ib-live";

export type RouteAvailabilityGate = {
  provider: "tws" | "ibkr" | "brokerage";
  available: boolean;
  circuitOpen: boolean;
  reason?: string | null;
  retryDeadline?: number;
};

export type RawSocketObservation = {
  connectionId: SupervisedConnectionId;
  gatewayConnected: boolean;
  connectionState?: string;
  observationConfidence?: ObservationConfidence;
  observedAt: number;
  subscriptionsLost?: boolean;
  message?: string | null;
  host?: string;
  port?: number;
};

export type DisplaySocketState = {
  connectionId: SupervisedConnectionId;
  status: ProviderHealthRow["status"];
  detail: string;
  /** Raw observation used for trading gates — never hysteresis-delayed. */
  rawConnected: boolean;
  observedAt: number;
  stabilizedAt: number;
  pendingDegradeAt?: number;
};

export type ConnectionSupervisorSnapshot = {
  revision: SnapshotRevision;
  generatedAt: number;
  raw: {
    tws?: TwsStatusProbe;
    twsGate?: HealthGateSnapshot;
    ibkrGate?: HealthGateSnapshot;
    brokerageGate?: HealthGateSnapshot;
  };
  routeAvailability: RouteAvailabilityGate[];
  recovery?: {
    sessionId?: string;
    phase?: string;
    updatedAt?: number;
  };
  displaySockets: DisplaySocketState[];
  connectionSummary: { label: string; severity: DataHealthSeverity };
};

export type ConnectionSupervisorInput = {
  tws: TwsStatusProbe;
  twsGate: HealthGateSnapshot;
  ibkrGate?: HealthGateSnapshot;
  brokerageGate?: HealthGateSnapshot;
  dataPreferenceLabel?: string;
  recovery?: ConnectionSupervisorSnapshot["recovery"];
  revision?: SnapshotRevision;
  generatedAt?: number;
};

/** Transient unknown/timeout flips require this hold before degrading display. */
export const DISPLAY_TRANSIENT_HOLD_MS = 2_500;

const IMMEDIATE_DEGRADE_STATES = new Set([
  "gateway_disconnected",
  "client_id_stuck",
  "wedged",
  "failed",
  "shutdown",
]);

function connectionShortStatus(status: ProviderHealthRow["status"]): string {
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

function formatObservationAge(observedAt: number | undefined, now: number): string | null {
  if (observedAt == null) return null;
  const ageSec = Math.max(0, Math.round((now - observedAt) / 1_000));
  if (ageSec < 60) return `${ageSec}s ago`;
  return `${Math.round(ageSec / 60)}m ago`;
}

function socketEndpointDetail(
  probe: TwsConnectionProbe | undefined,
  fallbackHost: string | undefined,
  fallbackPort: number | undefined,
  options: { connected: boolean; observedAt?: number; lastKnown?: boolean; message?: string | null },
  now: number,
): string {
  if (options.connected) {
    const host = probe?.host ?? fallbackHost ?? "127.0.0.1";
    const port = probe?.port ?? fallbackPort;
    const endpoint = port != null ? `${host}:${port}` : host;
    const ageLabel = formatObservationAge(options.observedAt, now);
    if (options.lastKnown && ageLabel) {
      return `Last known connected · ${endpoint} · ${ageLabel}`;
    }
    return port != null ? `Connected · ${endpoint}` : "Connected";
  }
  if (options.message) return options.message;
  if (options.lastKnown) return "Connection unknown · bypass active";
  return "Gateway disconnected";
}

function rawStatusFromProbe(
  probe: TwsConnectionProbe | undefined,
  tws: TwsStatusProbe,
  connectionId: SupervisedConnectionId,
  now: number,
): RawSocketObservation {
  const lastKnownConnected =
    tws.circuitBypassed === true &&
    tws.observationConfidence === "last_known" &&
    tws.gatewayConnected;
  const connected =
    probe?.gatewayConnected ??
    (connectionId === "ib-paper" && lastKnownConnected ? true : false);
  return {
    connectionId,
    gatewayConnected: connected,
    connectionState: probe?.connectionState ?? tws.connectionState,
    observationConfidence: probe?.observationConfidence ?? tws.observationConfidence,
    observedAt: probe?.observedAt ?? tws.observedAt ?? now,
    subscriptionsLost: probe?.subscriptionsLost ?? tws.subscriptionsLost,
    message: probe?.message ?? null,
    host: probe?.host ?? tws.host,
    port: probe?.port ?? (connectionId === "ib-live" ? 4001 : tws.port),
  };
}

function rawSocketStatus(raw: RawSocketObservation, sidecarReachable: boolean): ProviderHealthRow["status"] {
  if (raw.gatewayConnected) return "healthy";
  if (!sidecarReachable) return "offline";
  if (raw.connectionState && IMMEDIATE_DEGRADE_STATES.has(raw.connectionState)) {
    return raw.connectionState === "gateway_disconnected" ? "degraded" : "degraded";
  }
  return "degraded";
}

function shouldImmediateDegrade(raw: RawSocketObservation, tws: TwsStatusProbe): boolean {
  if (tws.restartRequired || tws.diagnostics?.workerWedged) return true;
  if (tws.connectionState === "client_id_stuck") return true;
  if (raw.connectionState && IMMEDIATE_DEGRADE_STATES.has(raw.connectionState)) return true;
  if (!tws.sidecarReachable) return true;
  return false;
}

/** Apply bounded display hysteresis — trading gates must use raw observations. */
export function stabilizeDisplaySocket(
  raw: RawSocketObservation,
  tws: TwsStatusProbe,
  previous: DisplaySocketState | undefined,
  now: number,
): DisplaySocketState {
  const probe = tws.connections?.[raw.connectionId];
  const lastKnownConnected =
    tws.circuitBypassed === true &&
    tws.observationConfidence === "last_known" &&
    tws.gatewayConnected;
  const rawStatus = rawSocketStatus(raw, tws.sidecarReachable);
  const immediate = shouldImmediateDegrade(raw, tws);

  let status = rawStatus;
  let pendingDegradeAt: number | undefined;
  if (!immediate && previous && !raw.gatewayConnected) {
    pendingDegradeAt = previous.rawConnected
      ? now
      : previous.pendingDegradeAt ?? now;
    const elapsed = now - pendingDegradeAt;
    if (elapsed < DISPLAY_TRANSIENT_HOLD_MS) {
      status = previous.status;
    }
  } else if (!immediate && previous && !previous.rawConnected && raw.gatewayConnected) {
    status = "healthy";
  }

  if (raw.gatewayConnected) {
    status = "healthy";
  }

  const detail = socketEndpointDetail(probe, raw.host, raw.port, {
    connected: raw.gatewayConnected || (status === "healthy" && lastKnownConnected),
    observedAt: raw.observedAt,
    lastKnown: lastKnownConnected && !raw.gatewayConnected && status === "healthy",
    message: raw.message,
  }, now);

  return {
    connectionId: raw.connectionId,
    status,
    detail,
    rawConnected: raw.gatewayConnected,
    observedAt: raw.observedAt,
    stabilizedAt: status === previous?.status ? (previous?.stabilizedAt ?? now) : now,
    pendingDegradeAt: raw.gatewayConnected || immediate ? undefined : pendingDegradeAt,
  };
}

export function buildRouteAvailability(args: {
  twsGate: HealthGateSnapshot;
  ibkrGate?: HealthGateSnapshot;
  brokerageGate?: HealthGateSnapshot;
  now?: number;
}): RouteAvailabilityGate[] {
  const now = args.now ?? Date.now();
  const twsCircuitOpen = args.twsGate.skipUntil > now;
  const ibkrCircuitOpen = (args.ibkrGate?.skipUntil ?? 0) > now;
  const brokerageCircuitOpen = (args.brokerageGate?.skipUntil ?? 0) > now;
  return [
    {
      provider: "tws",
      available: !twsCircuitOpen,
      circuitOpen: twsCircuitOpen,
      reason: twsCircuitOpen ? args.twsGate.lastFailure : null,
      retryDeadline: twsCircuitOpen ? args.twsGate.skipUntil : undefined,
    },
    {
      provider: "ibkr",
      available: !ibkrCircuitOpen,
      circuitOpen: ibkrCircuitOpen,
      reason: ibkrCircuitOpen ? args.ibkrGate?.lastFailure ?? "auth_failure" : null,
      retryDeadline: ibkrCircuitOpen ? args.ibkrGate?.skipUntil : undefined,
    },
    {
      provider: "brokerage",
      available: !brokerageCircuitOpen,
      circuitOpen: brokerageCircuitOpen,
      reason: brokerageCircuitOpen ? args.brokerageGate?.lastFailure ?? "request_failed" : null,
      retryDeadline: brokerageCircuitOpen ? args.brokerageGate?.skipUntil : undefined,
    },
  ];
}

export function buildSupervisedConnectionSummary(
  displaySockets: DisplaySocketState[],
  dataPreferenceLabel: string | undefined,
  preferredConnectionId: SupervisedConnectionId | undefined,
): { label: string; severity: DataHealthSeverity } {
  const paper = displaySockets.find((row) => row.connectionId === "ib-paper");
  const live = displaySockets.find((row) => row.connectionId === "ib-live");
  const paperShort = connectionShortStatus(paper?.status ?? "disabled");
  const liveShort = connectionShortStatus(live?.status ?? "disabled");
  const dataLabel = dataPreferenceLabel ?? "Paper data";
  const label = `Paper: ${paperShort} · Live: ${liveShort} · Data: ${dataLabel}`;

  const preferredRow = preferredConnectionId
    ? displaySockets.find((row) => row.connectionId === preferredConnectionId)
    : paper;
  const preferredStatus = preferredRow?.status ?? "unknown";
  if (preferredStatus === "offline") return { label, severity: "offline" };
  if (preferredStatus === "degraded") return { label, severity: "degraded" };
  if (preferredStatus === "healthy") return { label, severity: "healthy" };
  return { label, severity: "unknown" };
}

export function displaySocketsToIbRows(displaySockets: DisplaySocketState[]): IbSocketHealthRow[] {
  return displaySockets.map((row) => ({
    id: row.connectionId === "ib-paper" ? "tws-paper" : "tws-live",
    connectionId: row.connectionId,
    label: row.connectionId === "ib-paper" ? "Paper Gateway" : "Live Gateway",
    status: row.status,
    detail: row.detail,
  }));
}

let supervisorSequence = 0;

export function resetConnectionSupervisorSequenceForTests(): void {
  supervisorSequence = 0;
}

export function reduceConnectionSupervisor(
  previous: ConnectionSupervisorSnapshot | null,
  input: ConnectionSupervisorInput,
  now = Date.now(),
): ConnectionSupervisorSnapshot {
  const generatedAt = input.generatedAt ?? now;
  const revision =
    input.revision ??
    createSnapshotRevision(++supervisorSequence, generatedAt);

  if (
    previous &&
    input.revision &&
    !shouldAcceptSnapshot(
      { revision: input.revision, generatedAt },
      { revision: previous.revision, generatedAt: previous.generatedAt },
    )
  ) {
    return previous;
  }

  const rawPaper = rawStatusFromProbe(
    input.tws.connections?.["ib-paper"],
    input.tws,
    "ib-paper",
    now,
  );
  const rawLive = rawStatusFromProbe(
    input.tws.connections?.["ib-live"],
    input.tws,
    "ib-live",
    now,
  );

  const prevPaper = previous?.displaySockets.find((row) => row.connectionId === "ib-paper");
  const prevLive = previous?.displaySockets.find((row) => row.connectionId === "ib-live");

  const displayPaper = stabilizeDisplaySocket(rawPaper, input.tws, prevPaper, now);
  const displayLive = stabilizeDisplaySocket(rawLive, input.tws, prevLive, now);
  const displaySockets = [displayPaper, displayLive];

  const preferredId =
    input.dataPreferenceLabel?.toLowerCase().includes("live") ? "ib-live" : "ib-paper";

  return {
    revision,
    generatedAt,
    raw: {
      tws: input.tws,
      twsGate: input.twsGate,
      ibkrGate: input.ibkrGate,
      brokerageGate: input.brokerageGate,
    },
    routeAvailability: buildRouteAvailability({
      twsGate: input.twsGate,
      ibkrGate: input.ibkrGate,
      brokerageGate: input.brokerageGate,
      now,
    }),
    recovery: input.recovery ?? previous?.recovery,
    displaySockets,
    connectionSummary: buildSupervisedConnectionSummary(
      displaySockets,
      input.dataPreferenceLabel,
      preferredId,
    ),
  };
}
