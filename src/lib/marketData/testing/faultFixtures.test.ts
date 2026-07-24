import { describe, expect, it } from "vitest";
import { deliverySampleFromObservation } from "../state/operationalMetrics";
import {
  createEmptyStateSnapshot,
  reduceStateSnapshot,
} from "../state/reducer";
import { createSnapshotRevision } from "../state/revision";
import {
  createDataFaultFixture,
  createDataFaultMatrix,
} from "./faultFixtures";

describe("data fault fixtures", () => {
  it("provides every deterministic Phase 8 failure mode", () => {
    expect(createDataFaultMatrix().map((fixture) => fixture.kind)).toEqual([
      "timeout",
      "authentication",
      "rate_limit",
      "empty_valid",
      "empty_invalid",
      "partial",
      "stale_cache",
      "fallback",
      "recovered",
      "late_observation",
    ]);
  });

  it("projects failures, partial coverage, and fallback consistently", () => {
    const timeout = deliverySampleFromObservation(
      createDataFaultFixture("timeout").observation,
    );
    const partial = deliverySampleFromObservation(
      createDataFaultFixture("partial").observation,
    );
    const fallback = deliverySampleFromObservation(
      createDataFaultFixture("fallback").observation,
    );
    expect(timeout.success).toBe(false);
    expect(partial.partial).toBe(true);
    expect(fallback.fallback).toBe(true);
  });

  it("keeps a late observation from overwriting newer state", () => {
    const newer = createDataFaultFixture("recovered", { at: 20_000 }).observation;
    const late = createDataFaultFixture("late_observation", { at: 19_000 }).observation;
    const initial = createEmptyStateSnapshot(createSnapshotRevision(0, 0, 1));
    const current = reduceStateSnapshot(initial, {
      observations: [newer],
      revision: newer.revision,
    });
    const result = reduceStateSnapshot(current, {
      observations: [late],
      revision: late.revision,
    });
    expect(result).toBe(current);
  });
});
