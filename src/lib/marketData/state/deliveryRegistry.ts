import type { DataResult } from "../contracts/result";
import { redactDiagnosticList } from "../../api/redactDiagnostic";
import type { DatasetId } from "./catalog";
import type { TransportDimension } from "./dimensions";
import {
  observationFromRouteResult,
  type RouteObservationContext,
} from "./adapters";
import { datasetStateKeyString, type DeliveryObservation } from "./observation";
import {
  deliverySampleFromObservation,
  OperationalMetricsWindow,
  type OperationalReliabilityReport,
} from "./operationalMetrics";
import { createSnapshotRevision, resetProcessEpochForTests } from "./revision";
import {
  createEmptyStateSnapshot,
  reduceStateSnapshot,
  type CanonicalStateSnapshot,
} from "./reducer";

const HEARTBEAT_COALESCE_MS = 2_000;
export const MAX_HEARTBEAT_ENTRIES = 128;
const TERMINAL_FAILURE_RETENTION_MS = 30 * 60_000;
const MAX_TERMINAL_FAILURE_ENTRIES = 128;

export type SanitizedDatasetState = {
  datasetId: string;
  source: string;
  cacheTier?: string;
  transport?: string;
  provenance?: string;
  routeAttemptCount: number;
  lastSuccessAt?: number;
  lastFailureAt?: number;
  warnings: string[];
};

export type SanitizedDeliverySnapshot = {
  revision: { sequence: number; generatedAt: number };
  generatedAt: number;
  datasets: SanitizedDatasetState[];
};

/** Bounded server-side store for runtime delivery observations. */
export class DeliveryRegistry {
  private snapshot: CanonicalStateSnapshot;
  private sequence = 0;
  private lastHeartbeatAt = new Map<string, number>();
  private lastTerminalFailureAt = new Map<DatasetId, number>();
  private operationalMetrics = new OperationalMetricsWindow();
  private enabled = true;

  constructor() {
    this.snapshot = createEmptyStateSnapshot(createSnapshotRevision(0, Date.now()));
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  record(observation: DeliveryObservation, options?: { coalesceHeartbeat?: boolean }): void {
    if (!this.enabled) return;
    try {
      if (options?.coalesceHeartbeat) {
        const key = datasetStateKeyString({
          datasetId: observation.datasetId,
          consumerId: observation.consumerId,
        });
        const now = Date.now();
        this.pruneHeartbeatEntries(now);
        const last = this.lastHeartbeatAt.get(key) ?? 0;
        if (now - last < HEARTBEAT_COALESCE_MS) return;
        this.lastHeartbeatAt.delete(key);
        this.lastHeartbeatAt.set(key, now);
      }
      this.sequence += 1;
      const revision = createSnapshotRevision(this.sequence, Date.now());
      this.snapshot = reduceStateSnapshot(this.snapshot, {
        observations: [{ ...observation, revision }],
        revision,
      });
      this.pruneOrphanedHeartbeatEntries();
      this.operationalMetrics.record(deliverySampleFromObservation(observation));
    } catch {
      // no-throw — instrumentation must not break delivery
    }
  }

  recordTerminalFailure(datasetId: DatasetId, at = Date.now()): void {
    if (!this.enabled) return;
    try {
      this.lastTerminalFailureAt.delete(datasetId);
      this.lastTerminalFailureAt.set(datasetId, at);
      this.pruneTerminalFailures(at);
      this.operationalMetrics.record({
        kind: "delivery",
        at,
        datasetId,
        success: false,
      });
    } catch {
      // no-throw — instrumentation must not break delivery
    }
  }

  recordRecoveryDuration(
    durationMs: number,
    success = true,
    at = Date.now(),
  ): void {
    if (!this.enabled) return;
    try {
      this.operationalMetrics.record({
        kind: "recovery",
        at,
        durationMs: Math.max(0, durationMs),
        success,
      });
    } catch {
      // no-throw — instrumentation must not break recovery
    }
  }

  getOperationalReport(now = Date.now()): OperationalReliabilityReport {
    return this.operationalMetrics.report(now);
  }

  recordFromResult<T>(
    result: DataResult<T>,
    datasetId: DatasetId,
    context: RouteObservationContext = {},
  ): void {
    try {
      const observation = observationFromRouteResult(result, datasetId, context);
      const coalesceHeartbeat =
        context.transport === "streaming" || context.transport === "polling";
      this.record(observation, { coalesceHeartbeat });
    } catch {
      // no-throw — conversion and recording are instrumentation only
    }
  }

  getSnapshot(): CanonicalStateSnapshot {
    return this.snapshot;
  }

  getSanitizedSnapshot(): SanitizedDeliverySnapshot {
    this.pruneTerminalFailures(Date.now());
    const datasets: SanitizedDatasetState[] = [];
    for (const [, state] of this.snapshot.datasets) {
      const latest = state.latest;
      if (!latest) continue;
      datasets.push({
        datasetId: latest.datasetId,
        source: latest.source,
        cacheTier: latest.cacheTier,
        transport: latest.dimensions.transport,
        provenance: latest.dimensions.provenance,
        routeAttemptCount: state.routeAttempts.length,
        lastSuccessAt: latest.timestamps.lastSuccessAt,
        lastFailureAt: this.lastTerminalFailureAt.get(latest.datasetId),
        warnings: redactDiagnosticList(latest.warnings.slice(0, 5)),
      });
    }
    return {
      revision: {
        sequence: this.snapshot.revision.sequence,
        generatedAt: this.snapshot.revision.generatedAt,
      },
      generatedAt: this.snapshot.generatedAt,
      datasets,
    };
  }

  reset(): void {
    this.sequence = 0;
    this.lastHeartbeatAt.clear();
    this.lastTerminalFailureAt.clear();
    this.operationalMetrics.reset();
    this.snapshot = createEmptyStateSnapshot(createSnapshotRevision(0, Date.now()));
  }

  getHeartbeatEntryCount(): number {
    return this.lastHeartbeatAt.size;
  }

  private pruneHeartbeatEntries(now: number): void {
    for (const [key, recordedAt] of this.lastHeartbeatAt) {
      if (now - recordedAt >= HEARTBEAT_COALESCE_MS) {
        this.lastHeartbeatAt.delete(key);
      }
    }
    while (this.lastHeartbeatAt.size >= MAX_HEARTBEAT_ENTRIES) {
      const oldestKey = this.lastHeartbeatAt.keys().next().value;
      if (oldestKey == null) break;
      this.lastHeartbeatAt.delete(oldestKey);
    }
  }

  private pruneOrphanedHeartbeatEntries(): void {
    const retained = new Set(this.snapshot.datasets.keys());
    for (const key of this.lastHeartbeatAt.keys()) {
      if (!retained.has(key)) this.lastHeartbeatAt.delete(key);
    }
  }

  private pruneTerminalFailures(now: number): void {
    for (const [datasetId, failedAt] of this.lastTerminalFailureAt) {
      if (now - failedAt > TERMINAL_FAILURE_RETENTION_MS) {
        this.lastTerminalFailureAt.delete(datasetId);
      }
    }
    while (this.lastTerminalFailureAt.size > MAX_TERMINAL_FAILURE_ENTRIES) {
      const oldestDataset = this.lastTerminalFailureAt.keys().next().value;
      if (oldestDataset == null) break;
      this.lastTerminalFailureAt.delete(oldestDataset);
    }
  }
}

let globalRegistry: DeliveryRegistry | null = null;

export function getDeliveryRegistry(): DeliveryRegistry {
  if (!globalRegistry) {
    globalRegistry = new DeliveryRegistry();
  }
  return globalRegistry;
}

export function resetDeliveryRegistryForTests(): void {
  globalRegistry?.reset();
  globalRegistry = null;
  resetProcessEpochForTests();
}

export function recordDeliveryFromResult<T>(
  result: DataResult<T>,
  datasetId: DatasetId,
  context: RouteObservationContext = {},
): void {
  getDeliveryRegistry().recordFromResult(result, datasetId, context);
}

export function recordTerminalDeliveryFailure(
  datasetId: DatasetId,
  at = Date.now(),
): void {
  getDeliveryRegistry().recordTerminalFailure(datasetId, at);
}

export function recordOperationalRecovery(
  durationMs: number,
  success = true,
  at = Date.now(),
): void {
  getDeliveryRegistry().recordRecoveryDuration(durationMs, success, at);
}

export function transportFromCacheTier(
  cacheTier: DataResult<unknown>["cacheTier"],
): TransportDimension {
  if (cacheTier === "hot-fresh" || cacheTier === "hot-stale" || cacheTier === "universe") {
    return "cache";
  }
  return "request";
}
