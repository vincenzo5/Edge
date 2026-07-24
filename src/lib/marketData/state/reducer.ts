import type { DeliveryObservation, DatasetState } from "./observation";
import { applyDeliveryObservation, evictInactiveDatasetStates } from "./adapters";
import type { DataIncident } from "./incidents";
import { mergeIncidents } from "./incidents";
import type { SnapshotRevision } from "./revision";
import { shouldAcceptSnapshot } from "./revision";

export type CanonicalStateSnapshot = {
  revision: SnapshotRevision;
  generatedAt: number;
  datasets: Map<string, DatasetState>;
  incidents: DataIncident[];
};

export function createEmptyStateSnapshot(revision: SnapshotRevision): CanonicalStateSnapshot {
  return {
    revision,
    generatedAt: revision.generatedAt,
    datasets: new Map(),
    incidents: [],
  };
}

export function reduceStateSnapshot(
  current: CanonicalStateSnapshot,
  input: {
    observations?: DeliveryObservation[];
    incidents?: DataIncident[];
    revision?: SnapshotRevision;
  },
  now = Date.now(),
): CanonicalStateSnapshot {
  const candidateRevision = input.revision ?? current.revision;
  if (
    input.revision &&
    !shouldAcceptSnapshot(
      { revision: input.revision, generatedAt: input.revision.generatedAt },
      { revision: current.revision, generatedAt: current.generatedAt },
    )
  ) {
    return current;
  }

  let datasets = current.datasets;
  for (const observation of input.observations ?? []) {
    datasets = applyDeliveryObservation(datasets, observation, now);
  }
  datasets = evictInactiveDatasetStates(datasets, now);

  const incidents = mergeIncidents(current.incidents, input.incidents ?? [], now);

  return {
    revision: candidateRevision,
    generatedAt: candidateRevision.generatedAt,
    datasets,
    incidents,
  };
}
