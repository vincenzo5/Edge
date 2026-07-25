import fs from "node:fs";
import path from "node:path";

import type { ReadyzReasonCode } from "./readyzProbe";

export const READYZ_ALERT_STATE_RELATIVE_PATH = ".edge/readyz-alert-state.json";

export type ReadyzAlertState = {
  consecutiveFailures: number;
  alerting: boolean;
  lastReasons: ReadyzReasonCode[];
  updatedAtMs: number;
};

export type ReadyzAlertTransition =
  | { kind: "none" }
  | { kind: "alert"; reasons: ReadyzReasonCode[]; consecutiveFailures: number }
  | { kind: "recovery" };

export function resolveReadyzAlertStatePath(cwd = process.cwd()): string {
  return path.join(cwd, READYZ_ALERT_STATE_RELATIVE_PATH);
}

export function defaultReadyzAlertState(): ReadyzAlertState {
  return {
    consecutiveFailures: 0,
    alerting: false,
    lastReasons: [],
    updatedAtMs: 0,
  };
}

export function readReadyzAlertState(
  statePath = resolveReadyzAlertStatePath(),
): ReadyzAlertState {
  try {
    const raw = fs.readFileSync(statePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ReadyzAlertState>;
    return {
      consecutiveFailures:
        typeof parsed.consecutiveFailures === "number" &&
        parsed.consecutiveFailures >= 0
          ? parsed.consecutiveFailures
          : 0,
      alerting: parsed.alerting === true,
      lastReasons: Array.isArray(parsed.lastReasons)
        ? parsed.lastReasons.filter(
            (item): item is ReadyzReasonCode => typeof item === "string",
          )
        : [],
      updatedAtMs:
        typeof parsed.updatedAtMs === "number" ? parsed.updatedAtMs : 0,
    };
  } catch {
    return defaultReadyzAlertState();
  }
}

export function writeReadyzAlertState(
  state: ReadyzAlertState,
  statePath = resolveReadyzAlertStatePath(),
): void {
  const dir = path.dirname(statePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function resolveReadyzAlertFailureThreshold(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.EDGE_READYZ_ALERT_FAILURES?.trim();
  if (!raw) {
    return 3;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 3;
  }
  return parsed;
}

export function applyReadyzProbeToState(
  previous: ReadyzAlertState,
  probe: { ok: boolean; reasons: ReadyzReasonCode[] },
  threshold = resolveReadyzAlertFailureThreshold(),
  nowMs = Date.now(),
): { state: ReadyzAlertState; transition: ReadyzAlertTransition } {
  if (probe.ok) {
    const wasAlerting = previous.alerting;
    const state: ReadyzAlertState = {
      consecutiveFailures: 0,
      alerting: false,
      lastReasons: [],
      updatedAtMs: nowMs,
    };
    return {
      state,
      transition: wasAlerting ? { kind: "recovery" } : { kind: "none" },
    };
  }

  const consecutiveFailures = previous.consecutiveFailures + 1;
  const state: ReadyzAlertState = {
    consecutiveFailures,
    alerting: previous.alerting || consecutiveFailures >= threshold,
    lastReasons: probe.reasons,
    updatedAtMs: nowMs,
  };

  if (!previous.alerting && consecutiveFailures >= threshold) {
    return {
      state,
      transition: {
        kind: "alert",
        reasons: probe.reasons,
        consecutiveFailures,
      },
    };
  }

  return { state, transition: { kind: "none" } };
}
