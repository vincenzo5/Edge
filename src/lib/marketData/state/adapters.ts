import type { ChartDataMeta } from "@edge/chart-core";
import type { DataResponseMeta, DataResult } from "../contracts/result";
import { isFallbackSource } from "../trust/dataTrust";
import { evaluateDatasetPolicy } from "../trust/policyEvaluator";
import type { DatasetId } from "./catalog";
import type { DeliveryObservation, DatasetState, RouteAttempt, RouteDecision } from "./observation";
import { datasetStateKeyString } from "./observation";
import type { ProvenanceDimension, TransportDimension } from "./dimensions";
import { isRevisionNewer } from "./revision";

export const STATE_RETENTION = {
  maxRouteAttemptsPerDataset: 8,
  maxDatasetStates: 32,
  maxInactiveEvictMs: 30 * 60_000,
} as const;

export function provenanceFromSource(
  source: string | undefined,
  warnings: string[] = [],
): ProvenanceDimension {
  const normalized = (source ?? "").toLowerCase();
  if (normalized === "edge-derived") return "derived";
  if (isFallbackSource(source, warnings)) {
    if (normalized === "mixed") return "mixed";
    return "fallback";
  }
  if (normalized === "unknown" || !normalized) return "unknown";
  return "preferred";
}

export function observationFromDataResult<T>(
  result: DataResult<T>,
  datasetId: DatasetId,
  options?: { consumerId?: string; id?: string },
): DeliveryObservation {
  return observationFromRouteResult(result, datasetId, {
    consumerId: options?.consumerId,
    route: {
      attempted: [result.source],
      selected: result.source,
    },
  });
}

export type RouteObservationContext = {
  route?: RouteDecision;
  transport?: TransportDimension;
  consumerId?: string;
  traceId?: string;
  id?: string;
};

function availabilityFromResult<T>(
  result: DataResult<T>,
  datasetId: DatasetId,
): "available" | "partial" | "unavailable" {
  const count = Array.isArray(result.data) ? result.data.length : result.data == null ? 0 : 1;
  const evaluation = evaluateDatasetPolicy({
    datasetId,
    receivedAt: result.receivedAt,
    providerAsOf: result.asOf,
    transportStale: result.stale,
    cacheTier: result.cacheTier,
    skippedSymbols: result.skippedSymbols,
    returnedCount: count,
    isNullPayload: result.data == null,
  });
  if (evaluation.availability === "partial") return "partial";
  if (evaluation.availability === "unavailable") return "unavailable";
  return "available";
}

function coverageFromResult<T>(
  result: DataResult<T>,
  datasetId: DatasetId,
): "complete" | "partial" | "empty" | "unknown" {
  const count = Array.isArray(result.data) ? result.data.length : result.data == null ? 0 : 1;
  const evaluation = evaluateDatasetPolicy({
    datasetId,
    receivedAt: result.receivedAt,
    providerAsOf: result.asOf,
    transportStale: result.stale,
    cacheTier: result.cacheTier,
    skippedSymbols: result.skippedSymbols,
    returnedCount: count,
    isNullPayload: result.data == null,
  });
  return evaluation.coverage;
}

export function observationFromRouteResult<T>(
  result: DataResult<T>,
  datasetId: DatasetId,
  context: RouteObservationContext = {},
): DeliveryObservation {
  const route = context.route ?? {
    attempted: [result.source],
    selected: result.source,
  };
  const transport =
    context.transport ??
    (result.cacheTier === "hot-fresh" || result.cacheTier === "hot-stale" || result.cacheTier === "universe"
      ? "cache"
      : "request");

  const policyEval = evaluateDatasetPolicy({
    datasetId,
    receivedAt: result.receivedAt,
    providerAsOf: result.asOf,
    transportStale: result.stale,
    cacheTier: result.cacheTier,
    skippedSymbols: result.skippedSymbols,
    returnedCount: Array.isArray(result.data) ? result.data.length : result.data == null ? 0 : 1,
    isNullPayload: result.data == null,
  });

  return {
    id: context.id ?? `delivery-${datasetId}-${result.receivedAt}`,
    datasetId,
    consumerId: context.consumerId,
    dimensions: {
      provenance: provenanceFromSource(result.source, result.warnings),
      freshness: policyEval.freshness,
      availability: policyEval.availability,
      transport,
      lifecycle: "ready",
    },
    timestamps: {
      attemptedAt: result.requestedAt,
      receivedAt: result.receivedAt,
      providerAsOf: result.asOf,
      lastSuccessAt: result.receivedAt,
    },
    route,
    coverage: coverageFromResult(result, datasetId),
    source: result.source,
    stale: result.stale,
    warnings: result.warnings,
    cacheTier: result.cacheTier,
    traceId: context.traceId ?? result.traceId,
    skippedSymbols: result.skippedSymbols,
  };
}

export function observationFromChartMeta(
  meta: Partial<ChartDataMeta> | null | undefined,
  datasetId: DatasetId,
  options?: { consumerId?: string; id?: string },
): DeliveryObservation | undefined {
  if (!meta?.source) return undefined;
  const receivedAt = meta.lastUpdateAt ?? meta.asOf ?? Date.now();
  return {
    id: options?.id ?? `chart-${datasetId}-${receivedAt}`,
    datasetId,
    consumerId: options?.consumerId,
    dimensions: {
      provenance: provenanceFromSource(meta.source, meta.warnings),
      freshness: meta.stale ? "stale" : "current",
      transport: meta.streaming ? "streaming" : "polling",
      availability: "available",
    },
    timestamps: {
      receivedAt,
      providerAsOf: meta.asOf,
      lastSuccessAt: receivedAt,
      attemptedAt: receivedAt,
    },
    route: { attempted: [meta.source], selected: meta.source },
    source: meta.source,
    stale: meta.stale ?? false,
    warnings: meta.warnings ?? [],
    cacheTier: meta.cacheTier,
    traceId: meta.traceId,
  };
}

export function projectToDataResponseMeta<T>(
  observation: DeliveryObservation,
  dataResult?: DataResult<T>,
): DataResponseMeta {
  const base = dataResult
    ? {
        source: dataResult.source,
        warnings: dataResult.warnings,
        stale: dataResult.stale,
        asOf: dataResult.asOf,
        receivedAt: dataResult.receivedAt,
        latencyMs: Math.max(0, dataResult.receivedAt - dataResult.requestedAt),
        cacheTier: dataResult.cacheTier,
        traceId: dataResult.traceId,
        phases: dataResult.phases,
        indicatorValues: dataResult.indicatorValues,
        skippedSymbols: dataResult.skippedSymbols,
      }
    : {
        source: observation.source,
        warnings: observation.warnings,
        stale: observation.stale,
        asOf: observation.timestamps.providerAsOf,
        receivedAt: observation.timestamps.receivedAt,
        cacheTier: observation.cacheTier,
        traceId: observation.traceId,
        skippedSymbols: observation.skippedSymbols,
      };

  return base;
}

export function projectToChartDataMeta(observation: DeliveryObservation): ChartDataMeta {
  const receivedAt = observation.timestamps.receivedAt ?? Date.now();
  const cacheTier = observation.cacheTier;
  const chartCacheTier =
    cacheTier === "hot-fresh" || cacheTier === "hot-stale" || cacheTier === "cold"
      ? cacheTier
      : undefined;
  return {
    source: observation.source,
    asOf: observation.timestamps.providerAsOf ?? receivedAt,
    stale: observation.stale,
    warnings: observation.warnings,
    cacheTier: chartCacheTier,
    traceId: observation.traceId,
    lastUpdateAt: observation.timestamps.lastSuccessAt ?? receivedAt,
    streaming: observation.dimensions.transport === "streaming",
  };
}

function trimRouteAttempts(attempts: RouteAttempt[]): RouteAttempt[] {
  return attempts.slice(-STATE_RETENTION.maxRouteAttemptsPerDataset);
}

export function applyDeliveryObservation(
  states: Map<string, DatasetState>,
  observation: DeliveryObservation,
  now = Date.now(),
): Map<string, DatasetState> {
  const key = datasetStateKeyString({
    datasetId: observation.datasetId,
    consumerId: observation.consumerId,
  });
  const current = states.get(key);
  if (
    current?.latest?.revision &&
    observation.revision &&
    !isRevisionNewer(observation.revision, current.latest.revision)
  ) {
    return states;
  }
  const routeAttempts = trimRouteAttempts([
    ...(current?.routeAttempts ?? []),
    ...(observation.route?.attempts ?? []),
  ]);
  const next = new Map(states);
  next.set(key, {
    key: { datasetId: observation.datasetId, consumerId: observation.consumerId },
    latest: observation,
    routeAttempts,
    updatedAt: now,
  });
  return evictInactiveDatasetStates(next, now);
}

export function evictInactiveDatasetStates(
  states: Map<string, DatasetState>,
  now = Date.now(),
): Map<string, DatasetState> {
  const entries = [...states.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  const next = new Map<string, DatasetState>();
  const keep = entries.slice(-STATE_RETENTION.maxDatasetStates);
  for (const [key, value] of keep) {
    if (now - value.updatedAt <= STATE_RETENTION.maxInactiveEvictMs) {
      next.set(key, value);
    }
  }
  return next;
}

export function shouldAcceptHealthSnapshot(
  candidateGeneratedAt: number,
  currentGeneratedAt: number | undefined,
  candidateRevision?: DeliveryObservation["revision"],
  currentRevision?: DeliveryObservation["revision"],
): boolean {
  if (candidateRevision && currentRevision) {
    return isRevisionNewer(candidateRevision, currentRevision);
  }
  if (currentGeneratedAt == null) return true;
  return candidateGeneratedAt >= currentGeneratedAt;
}
