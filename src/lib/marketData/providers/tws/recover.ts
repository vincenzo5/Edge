import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { twsHealthGate } from "./healthGate";
import { createTwsClient, getTwsClientConfig, isTwsConfigured, type TwsStatusProbe } from "./client";

export type TwsRecoverAction = "reconnected" | "started" | "failed";

export type TwsRecoverResult = {
  ok: boolean;
  action: TwsRecoverAction;
  message: string;
  status: TwsStatusProbe;
};

export type TwsRecoverDeps = {
  isControlAllowed?: () => boolean;
  isConfigured?: () => boolean;
  getConfig?: () => ReturnType<typeof getTwsClientConfig>;
  probeHealth?: (baseUrl: string) => Promise<boolean>;
  reconnect?: (baseUrl: string) => Promise<TwsStatusProbe>;
  warmup?: (baseUrl: string, symbols: string[]) => Promise<void>;
  startSidecar?: () => Promise<boolean>;
  waitForHealth?: (baseUrl: string) => Promise<boolean>;
  resetGate?: () => void;
  sleep?: (ms: number) => Promise<void>;
};

let managedSidecarProcess: ChildProcess | null = null;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Recovery is available whenever TWS market data is configured. */
export function isTwsSidecarControlAllowed(): boolean {
  return isTwsConfigured();
}

export function resetManagedSidecarProcessForTests(): void {
  managedSidecarProcess = null;
}

async function defaultProbeHealth(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(2_000),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { ok?: boolean };
    return json.ok === true;
  } catch {
    return false;
  }
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
  return {
    configured: true,
    sidecarReachable: true,
    gatewayConnected: Boolean(json.gatewayConnected),
    host: typeof json.host === "string" ? json.host : undefined,
    port: typeof json.port === "number" ? json.port : undefined,
    clientId: typeof json.clientId === "number" ? json.clientId : undefined,
    readOnly: typeof json.readOnly === "boolean" ? json.readOnly : undefined,
    message: typeof json.message === "string" ? json.message : undefined,
    warnings: Array.isArray(json.warnings)
      ? json.warnings.filter((row): row is string => typeof row === "string")
      : [],
  };
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
  if (managedSidecarProcess && managedSidecarProcess.exitCode == null && !managedSidecarProcess.killed) {
    return true;
  }

  const repoRoot = path.resolve(process.cwd());
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCmd, ["run", "tws:sidecar"], {
    cwd: repoRoot,
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
  managedSidecarProcess = child;
  return true;
}

async function defaultWaitForHealth(
  baseUrl: string,
  probeHealth: (url: string) => Promise<boolean>,
  sleep: (ms: number) => Promise<void>,
): Promise<boolean> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await probeHealth(baseUrl)) {
      return true;
    }
    await sleep(500);
  }
  return false;
}

function buildResult(
  ok: boolean,
  action: TwsRecoverAction,
  message: string,
  status: TwsStatusProbe,
): TwsRecoverResult {
  return { ok, action, message, status };
}

export async function recoverTwsSidecar(
  symbols: string[] = [],
  deps: TwsRecoverDeps = {},
): Promise<TwsRecoverResult> {
  const isControlAllowed = deps.isControlAllowed ?? isTwsSidecarControlAllowed;
  const isConfigured = deps.isConfigured ?? isTwsConfigured;
  const getConfig = deps.getConfig ?? getTwsClientConfig;
  const probeHealth = deps.probeHealth ?? defaultProbeHealth;
  const reconnect = deps.reconnect ?? defaultReconnect;
  const warmup = deps.warmup ?? defaultWarmup;
  const startSidecar = deps.startSidecar ?? defaultStartSidecar;
  const resetGate = deps.resetGate ?? (() => twsHealthGate.reset());
  const sleep = deps.sleep ?? defaultSleep;
  const waitForHealth =
    deps.waitForHealth ??
    ((baseUrl: string) => defaultWaitForHealth(baseUrl, probeHealth, sleep));

  if (!isControlAllowed() || !isConfigured()) {
    throw new Error("TWS is not configured");
  }

  const config = getConfig();
  if (!config) {
    throw new Error("TWS sidecar URL is not configured");
  }

  const baseUrl = config.baseUrl;
  let action: TwsRecoverAction = "reconnected";
  let sidecarWasReachable = await probeHealth(baseUrl);

  if (!sidecarWasReachable) {
    action = "started";
    await startSidecar();
    sidecarWasReachable = await waitForHealth(baseUrl);
    if (!sidecarWasReachable) {
      return buildResult(
        false,
        "failed",
        "Sidecar did not become reachable. Run npm run tws:sidecar-setup, then retry.",
        {
          configured: true,
          sidecarReachable: false,
          gatewayConnected: false,
          warnings: ["Sidecar unreachable after start attempt"],
        },
      );
    }
  }

  let status: TwsStatusProbe;
  try {
    status = await reconnect(baseUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reconnect failed";
    return buildResult(
      false,
      "failed",
      message,
      {
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        warnings: [message],
      },
    );
  }

  resetGate();

  if (status.gatewayConnected) {
    return buildResult(
      true,
      action,
      action === "started"
        ? "TWS sidecar started and connected to IB Gateway."
        : "TWS reconnected to IB Gateway.",
      status,
    );
  }

  return buildResult(
    false,
    action,
    "IB Gateway still disconnected. Log in to IB Gateway, then retry.",
    status,
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
