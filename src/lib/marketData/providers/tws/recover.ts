import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { twsHealthGate } from "./healthGate";
import {
  createTwsClient,
  getTwsClientConfig,
  isTwsConfigured,
  type TwsConnectionState,
  type TwsHealthProbe,
  type TwsStatusProbe,
  type TwsWorkerDiagnostics,
} from "./client";
import { canNextSpawnSidecar } from "./managedMode";
import { checkSidecarOwnership } from "./sidecarOwnership";
import { updateTwsRecoveryPhase } from "./recoverySession";

export type TwsRecoverAction = "reconnected" | "started" | "restarted" | "failed";

/** Client-visible recovery phase — distinct from provider health confirmation. */
export type TwsRecoverCommandState =
  | "accepted"
  | "timed_out"
  | "failed"
  | "confirmed";

export type TwsRecoverResult = {
  ok: boolean;
  commandState: TwsRecoverCommandState;
  action: TwsRecoverAction;
  message: string;
  status: TwsStatusProbe;
  recoveryPhase?: string;
};

export type TwsRecoverDeps = {
  isControlAllowed?: () => boolean;
  isConfigured?: () => boolean;
  getConfig?: () => ReturnType<typeof getTwsClientConfig>;
  probeHealth?: (baseUrl: string) => Promise<boolean>;
  fetchHealth?: (baseUrl: string) => Promise<TwsHealthProbe | null>;
  probeStatus?: (baseUrl: string) => Promise<TwsStatusProbe | null>;
  reconnect?: (baseUrl: string) => Promise<TwsStatusProbe>;
  warmup?: (baseUrl: string, symbols: string[]) => Promise<void>;
  startSidecar?: () => Promise<boolean>;
  restartSidecar?: (baseUrl: string) => Promise<boolean>;
  waitForHealth?: (baseUrl: string) => Promise<boolean>;
  resetGate?: () => void;
  sleep?: (ms: number) => Promise<void>;
};

let managedSidecarProcess: ChildProcess | null = null;
let managedSidecarInstanceId: string | null = null;

function getSidecarStartScriptPath(): string {
  return path.join(path.resolve(process.cwd()), "scripts", "tws-sidecar.sh");
}

function getSidecarLogPath(): string {
  return path.join(path.resolve(process.cwd()), ".tools", "tws-sidecar.log");
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Recovery is available whenever TWS market data is configured. */
export function isTwsSidecarControlAllowed(): boolean {
  return isTwsConfigured();
}

export function resetManagedSidecarProcessForTests(): void {
  managedSidecarProcess = null;
  managedSidecarInstanceId = null;
}

export function setManagedSidecarProcessForTests(child: ChildProcess | null): void {
  managedSidecarProcess = child;
}

export function setManagedSidecarInstanceIdForTests(instanceId: string | null): void {
  managedSidecarInstanceId = instanceId;
}

export function getManagedSidecarInstanceIdForTests(): string | null {
  return managedSidecarInstanceId;
}

export function killManagedSidecar(): void {
  if (!canNextSpawnSidecar()) {
    return;
  }
  if (managedSidecarProcess && !managedSidecarProcess.killed) {
    try {
      managedSidecarProcess.kill("SIGTERM");
    } catch {
      // Best-effort — stale process may already be gone.
    }
  }
  managedSidecarProcess = null;
  managedSidecarInstanceId = null;
}

function parseReconnectPayload(json: Record<string, unknown>): TwsStatusProbe {
  const warnings = Array.isArray(json.warnings)
    ? json.warnings.filter((row): row is string => typeof row === "string")
    : [];
  return {
    configured: true,
    sidecarReachable: true,
    gatewayConnected: Boolean(json.gatewayConnected),
    apiSessionConnected: Boolean(json.apiSessionConnected ?? json.gatewayConnected),
    gatewaySocketOpen: Boolean(json.gatewaySocketOpen ?? json.gatewayConnected),
    connectionState:
      typeof json.connectionState === "string"
        ? (json.connectionState as TwsConnectionState)
        : undefined,
    activeClientId: typeof json.activeClientId === "number" ? json.activeClientId : undefined,
    lastIbErrorCode: typeof json.lastIbErrorCode === "number" ? json.lastIbErrorCode : undefined,
    lastIbErrorMessage:
      typeof json.lastIbErrorMessage === "string" ? json.lastIbErrorMessage : undefined,
    subscriptionsLost: Boolean(json.subscriptionsLost),
    restartRequired: Boolean(json.restartRequired),
    host: typeof json.host === "string" ? json.host : undefined,
    port: typeof json.port === "number" ? json.port : undefined,
    clientId: typeof json.clientId === "number" ? json.clientId : undefined,
    readOnly: typeof json.readOnly === "boolean" ? json.readOnly : undefined,
    message: typeof json.message === "string" ? json.message : undefined,
    warnings,
    diagnostics: json.diagnostics as TwsWorkerDiagnostics | undefined,
    reconnectInProgress: Boolean(json.inProgress),
    reconnectTimedOut: Boolean(json.timedOut),
  };
}

async function defaultProbeHealth(baseUrl: string): Promise<boolean> {
  const result = await defaultFetchHealth(baseUrl);
  if (!result?.ok) return false;
  if (result.capabilities?.controlRecovery !== true) return false;
  const ownership = checkSidecarOwnership(result, managedSidecarInstanceId);
  return !ownership.foreign;
}

async function defaultFetchHealth(baseUrl: string): Promise<TwsHealthProbe | null> {
  const config = getTwsClientConfig();
  const client = createTwsClient(config ?? undefined);
  return client.probeHealth(2_000);
}

async function defaultProbeStatus(baseUrl: string): Promise<TwsStatusProbe | null> {
  const config = getTwsClientConfig();
  const client = createTwsClient(config ?? undefined);
  return client.probeStatus(2_000);
}

async function defaultReconnect(baseUrl: string): Promise<TwsStatusProbe> {
  const url = `${baseUrl.replace(/\/$/, "")}/control/reconnect`;
  const res = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  if (text) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = {};
    }
  }
  if (!res.ok) {
    const detail =
      typeof json.detail === "string"
        ? json.detail
        : text || `Reconnect failed (${res.status})`;
    throw new Error(detail);
  }
  return parseReconnectPayload(json);
}

async function defaultWarmup(baseUrl: string, symbols: string[]): Promise<void> {
  const normalized = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (normalized.length === 0) return;
  try {
    await fetch(`${baseUrl.replace(/\/$/, "")}/warmup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ symbols: normalized }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // Warmup is best-effort after reconnect.
  }
}

async function defaultStartSidecar(): Promise<boolean> {
  if (!canNextSpawnSidecar()) {
    return false;
  }

  if (managedSidecarProcess && managedSidecarProcess.exitCode == null && !managedSidecarProcess.killed) {
    return true;
  }

  const repoRoot = path.resolve(process.cwd());
  const scriptPath = getSidecarStartScriptPath();
  const logPath = getSidecarLogPath();

  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const logFd = fs.openSync(logPath, "a");

  const instanceId = randomUUID();
  managedSidecarInstanceId = instanceId;

  const bashCmd = process.platform === "win32" ? "bash" : "bash";
  const child = spawn(bashCmd, [scriptPath], {
    cwd: repoRoot,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: {
      ...process.env,
      TWS_MANAGED_BY: "edge-local",
      EDGE_INSTANCE_ID: instanceId,
    },
  });
  child.unref();
  fs.closeSync(logFd);
  managedSidecarProcess = child;
  return true;
}

async function defaultRestartSidecar(
  baseUrl: string,
  probeHealth: (url: string) => Promise<boolean>,
  startSidecar: () => Promise<boolean>,
  sleep: (ms: number) => Promise<void>,
  waitForHealth: (url: string) => Promise<boolean>,
): Promise<boolean> {
  if (!canNextSpawnSidecar()) {
    return false;
  }

  if (managedSidecarProcess && !managedSidecarProcess.killed) {
    try {
      managedSidecarProcess.kill("SIGTERM");
    } catch {
      // Best-effort — stale process may already be gone.
    }
    managedSidecarProcess = null;
    managedSidecarInstanceId = null;
    await sleep(750);
  }

  await startSidecar();
  return waitForHealth(baseUrl);
}

async function defaultWaitForHealth(
  baseUrl: string,
  probeHealth: (url: string) => Promise<boolean>,
  sleep: (ms: number) => Promise<void>,
  fetchHealth?: (url: string) => Promise<TwsHealthProbe | null>,
): Promise<boolean> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await probeHealth(baseUrl)) {
      if (managedSidecarInstanceId && fetchHealth) {
        const health = await fetchHealth(baseUrl);
        if (health?.instanceId && health.instanceId !== managedSidecarInstanceId) {
          await sleep(500);
          continue;
        }
      }
      return true;
    }
    await sleep(500);
  }
  return false;
}

function isReconnectTimeout(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("timeout") || message.includes("abort");
}

function buildResult(
  ok: boolean,
  commandState: TwsRecoverCommandState,
  action: TwsRecoverAction,
  message: string,
  status: TwsStatusProbe,
  recoveryPhase?: string,
): TwsRecoverResult {
  return { ok, commandState, action, message, status, recoveryPhase };
}

export function formatTwsRecoveryPhaseMessage(status: TwsStatusProbe): string {
  const diagnostics = status.diagnostics;
  const recovery = diagnostics?.recovery;
  if (!status.sidecarReachable) {
    return "Sidecar unresponsive — starting managed sidecar…";
  }
  if (status.restartRequired && status.connectionState === "client_id_stuck") {
    return "API client ID stuck — restart IB Gateway or change TWS_CLIENT_ID";
  }
  if (status.restartRequired || diagnostics?.workerWedged) {
    const job = diagnostics?.activeJob ? ` (${diagnostics.activeJob})` : "";
    if (diagnostics?.workerWedged) {
      return `Sidecar worker wedged${job} — restarting sidecar…`;
    }
    return "Sidecar stale — restart managed sidecar (npm run tws:sidecar) to pick up current routes";
  }
  if (status.subscriptionsLost) {
    return "Market data resubscribing after Gateway reconnect…";
  }
  if (recovery?.phase === "reconnecting" || status.reconnectInProgress) {
    const host = status.host ?? "127.0.0.1";
    const port = status.port ?? 4002;
    return `Reconnecting to IB Gateway at ${host}:${port}…`;
  }
  if (status.connectionState === "gateway_disconnected") {
    return "Gateway not logged in — log in to IB Gateway, then retry.";
  }
  if (status.gatewayConnected) {
    return "Gateway connected, data reloaded.";
  }
  if (recovery?.message) {
    return recovery.message;
  }
  if (status.message) {
    return status.message;
  }
  return "Waiting for Gateway health…";
}

function needsSidecarRestart(status: TwsStatusProbe | null | undefined): boolean {
  if (!status) return false;
  if (!status.sidecarReachable) return true;
  if (status.restartRequired) return true;
  if (status.diagnostics?.workerWedged) return true;
  return status.connectionState === "client_id_stuck";
}

function deriveRecoveryPhase(status: TwsStatusProbe): string {
  if (!status.sidecarReachable) return "sidecar_unresponsive";
  if (status.connectionState === "client_id_stuck" || status.restartRequired) {
    return "client_id_stuck";
  }
  if (status.diagnostics?.workerWedged) return "worker_wedged";
  if (status.subscriptionsLost) return "resubscribing";
  if (status.reconnectInProgress || status.diagnostics?.recovery?.phase === "reconnecting") {
    return "reconnect_in_progress";
  }
  if (status.gatewayConnected) return "confirmed";
  if (status.connectionState === "gateway_disconnected") return "gateway_disconnected";
  return "gateway_disconnected";
}

export async function probeTwsRecoveryStatus(
  baseUrl?: string,
): Promise<TwsStatusProbe | null> {
  const config = getTwsClientConfig();
  const resolved = baseUrl ?? config?.baseUrl;
  if (!resolved) return null;

  const healthOk = await defaultProbeHealth(resolved);
  if (!healthOk) {
    return {
      configured: true,
      sidecarReachable: false,
      gatewayConnected: false,
      warnings: ["Sidecar HTTP unresponsive"],
    };
  }

  const client = createTwsClient(config ?? undefined);
  return client.probeStatus(2_000);
}

export async function recoverTwsSidecar(
  symbols: string[] = [],
  deps: TwsRecoverDeps = {},
): Promise<TwsRecoverResult> {
  const isControlAllowed = deps.isControlAllowed ?? isTwsSidecarControlAllowed;
  const isConfigured = deps.isConfigured ?? isTwsConfigured;
  const getConfig = deps.getConfig ?? getTwsClientConfig;
  const probeHealth = deps.probeHealth ?? defaultProbeHealth;
  const fetchHealth = deps.fetchHealth ?? defaultFetchHealth;
  const probeStatus = deps.probeStatus ?? defaultProbeStatus;
  const reconnect = deps.reconnect ?? defaultReconnect;
  const startSidecar = deps.startSidecar ?? defaultStartSidecar;
  const resetGate = deps.resetGate ?? (() => twsHealthGate.reset());
  const sleep = deps.sleep ?? defaultSleep;
  const waitForHealth =
    deps.waitForHealth ??
    ((url: string) => defaultWaitForHealth(url, probeHealth, sleep, fetchHealth));
  const restartSidecar =
    deps.restartSidecar ??
    ((url: string) =>
      defaultRestartSidecar(url, probeHealth, startSidecar, sleep, waitForHealth));

  if (!isControlAllowed() || !isConfigured()) {
    throw new Error("TWS is not configured");
  }

  const config = getConfig();
  if (!config) {
    throw new Error("TWS sidecar URL is not configured");
  }

  updateTwsRecoveryPhase("starting");

  const baseUrl = config.baseUrl;
  let action: TwsRecoverAction = "reconnected";
  let sidecarWasReachable = await probeHealth(baseUrl);

  if (!sidecarWasReachable) {
    const health = await fetchHealth(baseUrl);
    const ownership = checkSidecarOwnership(health, managedSidecarInstanceId);
    if (ownership.foreign) {
      return buildResult(
        false,
        "failed",
        "failed",
        ownership.reason ??
          "Another process owns the TWS sidecar port. Stop it or set TWS_MANAGED=external.",
        {
          configured: true,
          sidecarReachable: true,
          gatewayConnected: false,
          warnings: [ownership.reason ?? "Foreign sidecar on port"],
        },
        "sidecar_unresponsive",
      );
    }

    if (!canNextSpawnSidecar()) {
      return buildResult(
        false,
        "failed",
        "failed",
        "Sidecar unreachable. Start manually: npm run tws:sidecar",
        {
          configured: true,
          sidecarReachable: false,
          gatewayConnected: false,
          warnings: ["Sidecar unreachable in TWS_MANAGED=external mode"],
        },
        "sidecar_unresponsive",
      );
    }

    action = "started";
    updateTwsRecoveryPhase("sidecar_unresponsive");
    const started = await startSidecar();
    if (!started) {
      return buildResult(
        false,
        "failed",
        "failed",
        "Unable to start managed sidecar.",
        {
          configured: true,
          sidecarReachable: false,
          gatewayConnected: false,
          warnings: ["Sidecar start failed"],
        },
        "sidecar_unresponsive",
      );
    }
    sidecarWasReachable = await waitForHealth(baseUrl);
    if (!sidecarWasReachable) {
      return buildResult(
        false,
        "failed",
        "failed",
        "Sidecar did not become reachable. Run npm run tws:sidecar-setup, then retry.",
        {
          configured: true,
          sidecarReachable: false,
          gatewayConnected: false,
          warnings: ["Sidecar unreachable after start attempt"],
        },
        "sidecar_unresponsive",
      );
    }
  }

  let preStatus = await probeStatus(baseUrl);
  if (needsSidecarRestart(preStatus)) {
    if (!canNextSpawnSidecar()) {
      return buildResult(
        false,
        "failed",
        "failed",
        "Sidecar wedged or stale. Restart manually: npm run tws:sidecar",
        {
          configured: true,
          sidecarReachable: preStatus?.sidecarReachable ?? true,
          gatewayConnected: false,
          restartRequired: true,
          warnings: ["Sidecar restart required in TWS_MANAGED=external mode"],
        },
        preStatus?.diagnostics?.workerWedged ? "worker_wedged" : "client_id_stuck",
      );
    }

    updateTwsRecoveryPhase(
      preStatus?.connectionState === "client_id_stuck" ? "client_id_stuck" : "worker_wedged",
    );
    action = "restarted";
    const restarted = await restartSidecar(baseUrl);
    if (!restarted) {
      return buildResult(
        false,
        "failed",
        "failed",
        "Sidecar restart failed — run npm run tws:sidecar manually, then retry.",
        {
          configured: true,
          sidecarReachable: false,
          gatewayConnected: false,
          restartRequired: true,
          warnings: ["Sidecar restart did not become reachable"],
        },
        "sidecar_unresponsive",
      );
    }
    preStatus = await probeStatus(baseUrl);
    if (preStatus?.connectionState === "client_id_stuck" || preStatus?.restartRequired) {
      return buildResult(
        false,
        "failed",
        action,
        formatTwsRecoveryPhaseMessage(preStatus ?? {
          configured: true,
          sidecarReachable: true,
          gatewayConnected: false,
          connectionState: "client_id_stuck",
          restartRequired: true,
          warnings: [],
        }),
        preStatus ?? {
          configured: true,
          sidecarReachable: true,
          gatewayConnected: false,
          connectionState: "client_id_stuck",
          restartRequired: true,
          warnings: [],
        },
        "client_id_stuck",
      );
    }
  }

  let status: TwsStatusProbe;
  try {
    updateTwsRecoveryPhase("reconnect_in_progress");
    status = await reconnect(baseUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reconnect failed";
    if (isReconnectTimeout(error)) {
      const polled = await probeStatus(baseUrl);
      const fallbackStatus: TwsStatusProbe = polled ?? {
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        reconnectInProgress: true,
        reconnectTimedOut: true,
        warnings: [message],
      };
      updateTwsRecoveryPhase(deriveRecoveryPhase(fallbackStatus));
      return buildResult(
        false,
        "timed_out",
        action,
        formatTwsRecoveryPhaseMessage(fallbackStatus),
        fallbackStatus,
        deriveRecoveryPhase(fallbackStatus),
      );
    }
    updateTwsRecoveryPhase("failed");
    return buildResult(
      false,
      "failed",
      "failed",
      message,
      {
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        warnings: [message],
      },
      "failed",
    );
  }

  if (needsSidecarRestart(status) && action !== "restarted") {
    if (!canNextSpawnSidecar()) {
      return buildResult(
        false,
        "failed",
        action,
        "Sidecar wedged. Restart manually: npm run tws:sidecar",
        status,
        "worker_wedged",
      );
    }
    updateTwsRecoveryPhase("worker_wedged");
    action = "restarted";
    const restarted = await restartSidecar(baseUrl);
    if (restarted) {
      try {
        status = await reconnect(baseUrl);
      } catch (retryError) {
        const message =
          retryError instanceof Error ? retryError.message : "Reconnect failed after restart";
        updateTwsRecoveryPhase("failed");
        return buildResult(
          false,
          "failed",
          action,
          message,
          {
            configured: true,
            sidecarReachable: true,
            gatewayConnected: false,
            warnings: [message],
          },
          "failed",
        );
      }
    }
  }

  const phase = deriveRecoveryPhase(status);
  updateTwsRecoveryPhase(phase);

  if (status.reconnectInProgress || status.reconnectTimedOut) {
    return buildResult(
      false,
      status.reconnectTimedOut ? "timed_out" : "accepted",
      action,
      formatTwsRecoveryPhaseMessage(status),
      status,
      phase,
    );
  }

  if (status.connectionState === "client_id_stuck" || status.restartRequired) {
    return buildResult(
      false,
      "failed",
      action,
      formatTwsRecoveryPhaseMessage(status),
      status,
      "client_id_stuck",
    );
  }

  resetGate();

  if (status.gatewayConnected) {
    const successMessage =
      action === "started"
        ? "TWS sidecar started and connected to IB Gateway."
        : action === "restarted"
          ? "TWS sidecar restarted and connected to IB Gateway."
          : status.subscriptionsLost
            ? "Gateway connected — market data resubscribing."
            : "TWS reconnected to IB Gateway.";
    return buildResult(
      true,
      "confirmed",
      action,
      successMessage,
      status,
      "confirmed",
    );
  }

  return buildResult(
    false,
    "failed",
    action,
    "IB Gateway still disconnected. Log in to IB Gateway, then retry.",
    status,
    "gateway_disconnected",
  );
}

export async function getTwsStatusAfterRecover(): Promise<TwsStatusProbe> {
  if (!isTwsConfigured()) {
    return {
      configured: false,
      sidecarReachable: false,
      gatewayConnected: false,
      warnings: ["TWS not configured"],
    };
  }
  const client = createTwsClient();
  return client.getStatus();
}
