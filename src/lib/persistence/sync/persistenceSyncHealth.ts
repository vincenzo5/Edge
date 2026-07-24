import type { PersistenceSyncHealthInput } from "@/lib/marketData/healthDatasets";
import { isCloudSyncExpected } from "@/lib/persistence/client/cloudSyncExpected";

export type PersistenceSyncAggregate = {
  conflict: boolean;
  authBlocked: boolean;
  error: boolean;
  lastError: string | null;
};

const DEFAULT_AGGREGATE: PersistenceSyncAggregate = {
  conflict: false,
  authBlocked: false,
  error: false,
  lastError: null,
};

let aggregate: PersistenceSyncAggregate = { ...DEFAULT_AGGREGATE };
const listeners = new Set<(next: PersistenceSyncAggregate) => void>();

export function reportPersistenceSyncState(partial: Partial<PersistenceSyncAggregate>): void {
  aggregate = { ...aggregate, ...partial };
  for (const listener of listeners) listener(aggregate);
}

export function resetPersistenceSyncStateForTests(): void {
  aggregate = { ...DEFAULT_AGGREGATE };
}

export function subscribePersistenceSyncAggregate(
  listener: (next: PersistenceSyncAggregate) => void,
): () => void {
  listeners.add(listener);
  listener(aggregate);
  return () => listeners.delete(listener);
}

export function buildPersistenceSyncHealthInput(
  state: PersistenceSyncAggregate = aggregate,
): PersistenceSyncHealthInput {
  const expected = isCloudSyncExpected();
  if (!expected) return { expected: false, status: "local_only" };
  if (state.authBlocked) {
    return {
      expected: true,
      status: "auth_blocked",
      detail: "Sign in to sync libraries",
      warnings: ["Persistence auth required"],
    };
  }
  if (state.conflict) {
    return {
      expected: true,
      status: "conflict",
      detail: "Remote revision conflict",
      warnings: ["Cloud sync conflict — remote snapshot applied"],
    };
  }
  if (state.error) {
    return {
      expected: true,
      status: "error",
      detail: "Cloud sync unavailable",
      warnings: state.lastError ? [state.lastError] : ["Cloud sync failed"],
    };
  }
  return {
    expected: true,
    status: "synced",
    detail: "Cloud sync ready",
  };
}
