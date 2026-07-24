import { describe, expect, it } from "vitest";
import {
  createSnapshotRevision,
  isRevisionAtLeastAsNew,
  isRevisionNewer,
  resetProcessEpochForTests,
  shouldAcceptSnapshot,
} from "./revision";
import { createEmptyStateSnapshot, reduceStateSnapshot } from "./reducer";
import { observationFromDataResult } from "./adapters";
import { createDataResult } from "../contracts/result";
import { STATE_RETENTION } from "./adapters";
import { applyDeliveryObservation } from "./adapters";

describe("state revision and reducer", () => {
  it("compares epoch then sequence then generatedAt", () => {
    resetProcessEpochForTests(100);
    const older = createSnapshotRevision(1, 1000, 100);
    const newer = createSnapshotRevision(2, 900, 100);
    expect(isRevisionNewer(newer, older)).toBe(true);
    resetProcessEpochForTests(200);
    const nextEpoch = createSnapshotRevision(1, 1000, 200);
    expect(isRevisionNewer(nextEpoch, newer)).toBe(true);
  });

  it("rejects stale server snapshots via shouldAcceptSnapshot", () => {
    const current = {
      revision: createSnapshotRevision(5, 5000),
      generatedAt: 5000,
    };
    const stale = {
      revision: createSnapshotRevision(4, 6000),
      generatedAt: 6000,
    };
    expect(shouldAcceptSnapshot(stale, current)).toBe(false);
  });

  it("falls back to generatedAt when revision is absent", () => {
    expect(
      shouldAcceptSnapshot({ generatedAt: 2000 }, { generatedAt: 1000 }),
    ).toBe(true);
  });

  it("reduces delivery observations with bounded route attempts", () => {
    const revision = createSnapshotRevision(1, Date.now());
    let snapshot = createEmptyStateSnapshot(revision);
    const result = createDataResult([], "tws");
    const observation = observationFromDataResult(result, "chart_candles");
    snapshot = reduceStateSnapshot(snapshot, { observations: [observation], revision });
    expect(snapshot.datasets.size).toBe(1);
    expect(snapshot.datasets.get("chart_candles")?.latest?.source).toBe("tws");
  });

  it("evicts dataset states beyond retention cap", () => {
    let states = new Map();
    for (let i = 0; i < STATE_RETENTION.maxDatasetStates + 5; i++) {
      const result = createDataResult([], "yahoo");
      const observation = observationFromDataResult(result, "chart_candles", {
        consumerId: `consumer-${i}`,
      });
      states = applyDeliveryObservation(states, observation, Date.now() + i);
    }
    expect(states.size).toBeLessThanOrEqual(STATE_RETENTION.maxDatasetStates);
  });
});
