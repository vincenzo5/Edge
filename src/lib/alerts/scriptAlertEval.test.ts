import { describe, expect, it } from "vitest";

import {
  evaluateScriptConditionFromSnapshot,
  isScriptSnapshotFresh,
  SCRIPT_ALERT_SNAPSHOT_FRESHNESS_MS,
} from "./scriptAlertEval";

describe("scriptAlertEval", () => {
  it("treats missing snapshot as not fresh", () => {
    expect(isScriptSnapshotFresh({})).toBe(false);
    expect(evaluateScriptConditionFromSnapshot({})).toBe(false);
  });

  it("fires when fresh snapshot is satisfied", () => {
    const now = Date.now();
    const entry = {
      lastScriptSatisfied: true,
      lastScriptBarTime: now - 60_000,
      lastScriptSnapshotAt: new Date(now - 30_000).toISOString(),
    };
    expect(isScriptSnapshotFresh(entry, now)).toBe(true);
    expect(evaluateScriptConditionFromSnapshot(entry, now)).toBe(true);
  });

  it("does not fire when snapshot is stale", () => {
    const now = Date.now();
    const entry = {
      lastScriptSatisfied: true,
      lastScriptBarTime: now - 60_000,
      lastScriptSnapshotAt: new Date(now - SCRIPT_ALERT_SNAPSHOT_FRESHNESS_MS - 1).toISOString(),
    };
    expect(isScriptSnapshotFresh(entry, now)).toBe(false);
    expect(evaluateScriptConditionFromSnapshot(entry, now)).toBe(false);
  });
});
