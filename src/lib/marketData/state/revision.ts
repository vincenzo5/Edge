/** Monotonic snapshot revision for server health and state merges. */

export type SnapshotRevision = {
  /** Process epoch — increments on server restart. */
  epoch: number;
  /** Monotonic sequence within an epoch. */
  sequence: number;
  /** Wall-clock time when this revision was generated. */
  generatedAt: number;
};

export function createSnapshotRevision(
  sequence: number,
  generatedAt = Date.now(),
  epoch = getProcessEpoch(),
): SnapshotRevision {
  return { epoch, sequence, generatedAt };
}

let processEpoch = Date.now();

/** Stable epoch for this Node process — used to reject cross-restart stale merges. */
export function getProcessEpoch(): number {
  return processEpoch;
}

/** Test helper — reset epoch between tests. */
export function resetProcessEpochForTests(epoch = Date.now()): void {
  processEpoch = epoch;
}

export function isRevisionNewer(
  candidate: SnapshotRevision | undefined,
  current: SnapshotRevision | undefined,
): boolean {
  if (!candidate) return false;
  if (!current) return true;
  if (candidate.epoch !== current.epoch) {
    return candidate.epoch > current.epoch;
  }
  if (candidate.sequence !== current.sequence) {
    return candidate.sequence > current.sequence;
  }
  return candidate.generatedAt > current.generatedAt;
}

export function isRevisionAtLeastAsNew(
  candidate: SnapshotRevision | undefined,
  current: SnapshotRevision | undefined,
): boolean {
  if (!candidate) return false;
  if (!current) return true;
  if (candidate.epoch !== current.epoch) {
    return candidate.epoch >= current.epoch;
  }
  if (candidate.sequence !== current.sequence) {
    return candidate.sequence >= current.sequence;
  }
  return candidate.generatedAt >= current.generatedAt;
}

/** Accept newer revision; fall back to generatedAt when sequence is absent (legacy payloads). */
export function shouldAcceptSnapshot<T extends { revision?: SnapshotRevision; generatedAt: number }>(
  candidate: T,
  current: T | null | undefined,
): boolean {
  if (!current) return true;
  if (candidate.revision && current.revision) {
    return isRevisionAtLeastAsNew(candidate.revision, current.revision);
  }
  return candidate.generatedAt >= current.generatedAt;
}
