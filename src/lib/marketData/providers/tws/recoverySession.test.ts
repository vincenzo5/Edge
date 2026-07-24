import { describe, expect, it, beforeEach } from "vitest";
import {
  acceptRecoverySessionSnapshot,
  clearTwsRecoverySession,
  getTwsRecoverySession,
  markTwsRecoveryFinalized,
  resetTwsRecoverySessionForTests,
  startTwsRecoverySession,
  updateTwsRecoveryPhase,
} from "./recoverySession";
import { createSnapshotRevision } from "../../state/revision";
import {
  getDeliveryRegistry,
  resetDeliveryRegistryForTests,
} from "../../state/deliveryRegistry";

describe("recoverySession", () => {
  beforeEach(() => {
    resetTwsRecoverySessionForTests();
    resetDeliveryRegistryForTests();
  });

  it("tracks monotonic session revision through phase updates", () => {
    const session = startTwsRecoverySession({ symbols: ["AAPL"] });
    expect(session.id).toMatch(/^tws-recover-/);
    expect(updateTwsRecoveryPhase("reconnect_in_progress")).toBe(true);
    const updated = getTwsRecoverySession();
    expect(updated?.lastPhase).toBe("reconnect_in_progress");
    expect(updated?.revision.sequence).toBeGreaterThan(session.revision.sequence);
  });

  it("rejects stale recovery snapshots for the active session", () => {
    const session = startTwsRecoverySession({ symbols: ["AAPL"] });
    updateTwsRecoveryPhase("reconnect_in_progress");
    const current = getTwsRecoverySession();
    expect(
      acceptRecoverySessionSnapshot({
        sessionId: session.id,
        revision: createSnapshotRevision(1, session.startedAt, session.revision.epoch),
        generatedAt: session.startedAt,
      }),
    ).toBe(false);
    expect(
      acceptRecoverySessionSnapshot({
        sessionId: session.id,
        revision: current?.revision,
        generatedAt: current?.phaseUpdatedAt ?? session.startedAt,
      }),
    ).toBe(true);
  });

  it("records finalized recovery duration once", () => {
    const session = startTwsRecoverySession({});
    markTwsRecoveryFinalized(session.startedAt + 750);
    markTwsRecoveryFinalized(session.startedAt + 1_000);

    expect(
      getDeliveryRegistry().getOperationalReport(session.startedAt + 1_000)
        .recoveryTime,
    ).toMatchObject({
      samples: 1,
      p50Ms: 750,
    });
  });

  it("records failed and abandoned recovery outcomes", () => {
    const failed = startTwsRecoverySession({});
    updateTwsRecoveryPhase("failed", failed.startedAt + 400);
    clearTwsRecoverySession(failed.startedAt + 500);

    const abandoned = startTwsRecoverySession({});
    clearTwsRecoverySession(abandoned.startedAt + 300);

    expect(
      getDeliveryRegistry().getOperationalReport(abandoned.startedAt + 500)
        .recoverySuccess,
    ).toMatchObject({
      samples: 2,
      matching: 0,
      ratio: 0,
    });
  });
});
