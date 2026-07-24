import { createSnapshotRevision } from "@/lib/marketData/state/revision";

let healthSequence = 0;

/** Process-local monotonic health snapshot sequence. */
export function nextHealthRevision(generatedAt = Date.now()) {
  healthSequence += 1;
  return createSnapshotRevision(healthSequence, generatedAt);
}

/** Test helper — reset sequence between tests. */
export function resetHealthRevisionForTests(): void {
  healthSequence = 0;
}
