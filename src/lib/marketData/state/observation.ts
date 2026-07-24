import type { DataProviderId } from "../contracts/result";
import type { DataCacheTier } from "../contracts/result";
import type { DatasetId } from "./catalog";
import type { CoverageDimension, DimensionSnapshot } from "./dimensions";
import type { DeliveryTimestamps } from "./timestamps";
import type { SnapshotRevision } from "./revision";

export type RouteAttempt = {
  provider: DataProviderId | string;
  startedAt: number;
  finishedAt?: number;
  ok: boolean;
  failureCategory?: string;
  detail?: string;
};

export type RouteDecision = {
  attempted: readonly string[];
  selected: string;
  fallbackReason?: string;
  attempts?: readonly RouteAttempt[];
};

export type DeliveryObservation = {
  id: string;
  revision?: SnapshotRevision;
  datasetId: DatasetId;
  consumerId?: string;
  dimensions: DimensionSnapshot;
  timestamps: DeliveryTimestamps;
  route?: RouteDecision;
  coverage?: CoverageDimension;
  source: string;
  stale: boolean;
  warnings: string[];
  cacheTier?: DataCacheTier;
  traceId?: string;
  skippedSymbols?: string[];
  failureCategory?: string;
};

export type DatasetStateKey = {
  datasetId: DatasetId;
  consumerId?: string;
};

export function datasetStateKeyString(key: DatasetStateKey): string {
  return key.consumerId ? `${key.datasetId}:${key.consumerId}` : key.datasetId;
}

export type DatasetState = {
  key: DatasetStateKey;
  latest?: DeliveryObservation;
  routeAttempts: RouteAttempt[];
  updatedAt: number;
};

export type CapabilityObservation = {
  provider: DataProviderId | string;
  capability: string;
  connection?: DimensionSnapshot["connection"];
  observationConfidence?: DimensionSnapshot["observationConfidence"];
  observedAt?: number;
  circuitOpen?: boolean;
  circuitReason?: string | null;
  retryDeadline?: number;
};
