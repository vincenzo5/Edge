import { classifyHealthWarning } from "../health";

export type IncidentStatus = "active" | "recovered";

export type DataIncident = {
  incidentId: string;
  status: IncidentStatus;
  startedAt: number;
  lastObservedAt: number;
  recoveredAt?: number;
  affectedDatasetIds: string[];
  affectedCapabilities: string[];
  failureCategory?: string;
  userImpact?: string;
  warnings: string[];
};

export type IncidentProjectionContext = {
  datasetId?: string;
  capability?: string;
  failureCategory?: string;
};

const MAX_ACTIVE_INCIDENTS = 8;
const MAX_INCIDENT_HISTORY = 16;
const INCIDENT_DEDUPE_WINDOW_MS = 30_000;

let incidentSeq = 0;

function incidentKey(
  warning: string,
  context: IncidentProjectionContext,
): string {
  return `${warning.trim()}:${context.datasetId ?? ""}:${context.capability ?? ""}`;
}

export function projectWarningsToIncidents(
  warnings: string[],
  context: IncidentProjectionContext = {},
  now = Date.now(),
): DataIncident[] {
  const incidents: DataIncident[] = [];
  for (const warning of warnings) {
    if (classifyHealthWarning(warning) !== "incident") continue;
    incidents.push({
      incidentId: `incident-${++incidentSeq}`,
      status: "active",
      startedAt: now,
      lastObservedAt: now,
      affectedDatasetIds: context.datasetId ? [context.datasetId] : [],
      affectedCapabilities: context.capability ? [context.capability] : [],
      failureCategory: context.failureCategory,
      warnings: [warning.trim()],
    });
  }
  return incidents;
}

export function mergeIncidents(
  current: DataIncident[],
  incoming: DataIncident[],
  now = Date.now(),
): DataIncident[] {
  const merged = [...current];

  for (const next of incoming) {
    const key = incidentKey(next.warnings[0] ?? "", {
      datasetId: next.affectedDatasetIds[0],
      capability: next.affectedCapabilities[0],
    });
    const existing = merged.find(
      (row) =>
        row.status === "active" &&
        incidentKey(row.warnings[0] ?? "", {
          datasetId: row.affectedDatasetIds[0],
          capability: row.affectedCapabilities[0],
        }) === key &&
        now - row.lastObservedAt < INCIDENT_DEDUPE_WINDOW_MS,
    );
    if (existing) {
      existing.lastObservedAt = now;
      continue;
    }
    merged.unshift(next);
  }

  const active = merged.filter((row) => row.status === "active").slice(0, MAX_ACTIVE_INCIDENTS);
  const history = merged
    .filter((row) => row.status === "recovered")
    .slice(0, MAX_INCIDENT_HISTORY - active.length);
  return [...active, ...history].slice(0, MAX_INCIDENT_HISTORY);
}

export function markIncidentRecovered(
  incidents: DataIncident[],
  incidentId: string,
  now = Date.now(),
): DataIncident[] {
  return incidents.map((row) =>
    row.incidentId === incidentId && row.status === "active"
      ? { ...row, status: "recovered", recoveredAt: now, lastObservedAt: now }
      : row,
  );
}

export function resetIncidentSequenceForTests(): void {
  incidentSeq = 0;
}

export const INCIDENT_RETENTION = {
  maxActive: MAX_ACTIVE_INCIDENTS,
  maxHistory: MAX_INCIDENT_HISTORY,
  dedupeWindowMs: INCIDENT_DEDUPE_WINDOW_MS,
} as const;
