import { probeReadyz } from "../src/lib/observability/readyzProbe.ts";
import { LOCAL_DEPLOY_CONTRACT } from "./validate-local-deploy.mts";

export type DeployHealthGateResult = {
  ok: boolean;
  healthz: boolean;
  readyz: boolean;
  cacheKind: string | null;
  cacheDegraded: boolean | null;
  reasons: string[];
};

export type DeployHealthGateOptions = {
  host?: string;
  port?: number;
  apiKey?: string | null;
  fetchImpl?: typeof fetch;
  readyzUrl?: string;
  retries?: number;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const DEFAULT_RETRIES = 12;
const DEFAULT_RETRY_DELAY_MS = 5_000;

export async function probeHealthz(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { ok?: unknown };
    return body.ok === true;
  } catch {
    return false;
  }
}

export async function probeMarketDataCache(
  url: string,
  apiKey: string | null | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; kind: string | null; degraded: boolean | null }> {
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (apiKey?.trim()) {
      headers["x-edge-api-key"] = apiKey.trim();
    }
    const response = await fetchImpl(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return { ok: false, kind: null, degraded: null };
    }
    const body = (await response.json()) as {
      ok?: unknown;
      health?: { cache?: { kind?: unknown; degraded?: unknown } };
    };
    const kind =
      typeof body.health?.cache?.kind === "string" ? body.health.cache.kind : null;
    const degraded =
      typeof body.health?.cache?.degraded === "boolean"
        ? body.health.cache.degraded
        : null;
    const ok = body.ok === true && kind === "redis" && degraded === false;
    return { ok, kind, degraded };
  } catch {
    return { ok: false, kind: null, degraded: null };
  }
}

export async function runDeployHealthGate(
  options: DeployHealthGateOptions = {},
): Promise<DeployHealthGateResult> {
  const host = options.host ?? LOCAL_DEPLOY_CONTRACT.production.host;
  const port = options.port ?? LOCAL_DEPLOY_CONTRACT.production.port;
  const fetchImpl = options.fetchImpl ?? fetch;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  const healthzUrl = `http://${host}:${port}/healthz`;
  const readyzUrl =
    options.readyzUrl?.trim() || `http://${host}:${port}/readyz`;
  const cacheUrl = `http://${host}:${port}/api/market-data/health`;

  const reasons: string[] = [];

  for (let attempt = 0; attempt < retries; attempt += 1) {
    reasons.length = 0;

    const healthzOk = await probeHealthz(healthzUrl, fetchImpl);
    if (!healthzOk) reasons.push("healthz_failed");

    const readyz = await probeReadyz(readyzUrl, fetchImpl);
    if (!readyz.ok) reasons.push(...readyz.reasons);

    const cache = await probeMarketDataCache(cacheUrl, options.apiKey, fetchImpl);
    if (!cache.ok) {
      if (cache.kind !== "redis") reasons.push("cache_kind_not_redis");
      if (cache.degraded === true) reasons.push("cache_degraded");
      if (cache.kind === null && cache.degraded === null) reasons.push("cache_probe_failed");
    }

    if (reasons.length === 0) {
      return {
        ok: true,
        healthz: true,
        readyz: true,
        cacheKind: cache.kind,
        cacheDegraded: cache.degraded,
        reasons: [],
      };
    }

    if (attempt < retries - 1) {
      await sleep(retryDelayMs);
    }
  }

  const cache = await probeMarketDataCache(cacheUrl, options.apiKey, fetchImpl);
  return {
    ok: false,
    healthz: await probeHealthz(healthzUrl, fetchImpl),
    readyz: (await probeReadyz(readyzUrl, fetchImpl)).ok,
    cacheKind: cache.kind,
    cacheDegraded: cache.degraded,
    reasons: [...new Set(reasons)],
  };
}
