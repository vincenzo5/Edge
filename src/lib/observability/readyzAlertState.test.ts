import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  applyReadyzProbeToState,
  defaultReadyzAlertState,
  readReadyzAlertState,
  resolveReadyzAlertFailureThreshold,
  writeReadyzAlertState,
} from "./readyzAlertState";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function tempStatePath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "readyz-alert-state-"));
  tempDirs.push(dir);
  return path.join(dir, "readyz-alert-state.json");
}

describe("resolveReadyzAlertFailureThreshold", () => {
  it("defaults to 3", () => {
    expect(resolveReadyzAlertFailureThreshold({})).toBe(3);
  });

  it("parses EDGE_READYZ_ALERT_FAILURES", () => {
    expect(resolveReadyzAlertFailureThreshold({ EDGE_READYZ_ALERT_FAILURES: "5" })).toBe(
      5,
    );
  });

  it("falls back for invalid values", () => {
    expect(
      resolveReadyzAlertFailureThreshold({ EDGE_READYZ_ALERT_FAILURES: "0" }),
    ).toBe(3);
  });
});

describe("applyReadyzProbeToState", () => {
  it("requires consecutive failures before alerting", () => {
    let state = defaultReadyzAlertState();

    for (let i = 1; i < 3; i += 1) {
      const result = applyReadyzProbeToState(
        state,
        { ok: false, reasons: ["postgres_unavailable"] },
        3,
        1_000 + i,
      );
      expect(result.transition).toEqual({ kind: "none" });
      state = result.state;
    }

    const alert = applyReadyzProbeToState(
      state,
      { ok: false, reasons: ["postgres_unavailable"] },
      3,
      1_004,
    );
    expect(alert.transition).toEqual({
      kind: "alert",
      reasons: ["postgres_unavailable"],
      consecutiveFailures: 3,
    });
    expect(alert.state.alerting).toBe(true);
  });

  it("does not spam while already alerting", () => {
    const previous = {
      consecutiveFailures: 3,
      alerting: true,
      lastReasons: ["redis_unavailable"] as const,
      updatedAtMs: 1,
    };

    const result = applyReadyzProbeToState(
      previous,
      { ok: false, reasons: ["redis_unavailable"] },
      3,
      2,
    );

    expect(result.transition).toEqual({ kind: "none" });
    expect(result.state.consecutiveFailures).toBe(4);
    expect(result.state.alerting).toBe(true);
  });

  it("fires recovery once after alerting clears", () => {
    const previous = {
      consecutiveFailures: 4,
      alerting: true,
      lastReasons: ["tws_unavailable"] as const,
      updatedAtMs: 1,
    };

    const result = applyReadyzProbeToState(previous, { ok: true, reasons: [] }, 3, 2);

    expect(result.transition).toEqual({ kind: "recovery" });
    expect(result.state).toEqual({
      consecutiveFailures: 0,
      alerting: false,
      lastReasons: [],
      updatedAtMs: 2,
    });
  });
});

describe("readWriteReadyzAlertState", () => {
  it("round-trips state through disk", () => {
    const statePath = tempStatePath();
    writeReadyzAlertState(
      {
        consecutiveFailures: 2,
        alerting: false,
        lastReasons: ["postgres_unavailable"],
        updatedAtMs: 42,
      },
      statePath,
    );

    expect(readReadyzAlertState(statePath)).toEqual({
      consecutiveFailures: 2,
      alerting: false,
      lastReasons: ["postgres_unavailable"],
      updatedAtMs: 42,
    });
  });

  it("returns defaults when file is missing", () => {
    const statePath = tempStatePath();
    expect(readReadyzAlertState(statePath)).toEqual(defaultReadyzAlertState());
  });
});
