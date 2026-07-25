import Redis from "ioredis";
import { bytesToMb } from "./memory-baseline-metrics.ts";
import { lookupPidRssBytes, readPsEntries } from "./memory-process-rss.ts";

const SAMPLE_TIMEOUT_MS = 5000;

export type SidecarRssSample = {
  rssMb: number | null;
  skippedNoSidecar: boolean;
  note?: string;
};

export type RedisUsedSample = {
  usedMb: number | null;
  skippedNoRedis: boolean;
  note?: string;
};

function resolveSidecarUrl(baseUrl?: string): string | undefined {
  const raw = baseUrl?.trim() || process.env.TWS_SIDECAR_URL?.trim();
  if (!raw) return undefined;
  return raw.replace(/\/$/, "");
}

function sidecarHeaders(): Record<string, string> {
  const secret = process.env.TWS_SIDECAR_SECRET?.trim();
  if (secret) return { "X-Edge-Sidecar-Secret": secret };
  return {};
}

export async function sampleSidecarRssMb(baseUrl?: string): Promise<SidecarRssSample> {
  const url = resolveSidecarUrl(baseUrl);
  if (!url) {
    return { rssMb: null, skippedNoSidecar: true, note: "TWS_SIDECAR_URL not set" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SAMPLE_TIMEOUT_MS);
    const response = await fetch(`${url}/health`, {
      signal: controller.signal,
      headers: sidecarHeaders(),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        rssMb: null,
        skippedNoSidecar: true,
        note: `sidecar health HTTP ${response.status}`,
      };
    }

    const body = (await response.json()) as { ok?: boolean; pid?: number };
    if (!body.ok || body.pid == null || !Number.isFinite(body.pid)) {
      return { rssMb: null, skippedNoSidecar: true, note: "sidecar health missing pid" };
    }

    const entries = readPsEntries();
    const bytes = lookupPidRssBytes(entries, body.pid);
    if (bytes == null) {
      return {
        rssMb: null,
        skippedNoSidecar: false,
        note: `sidecar pid ${body.pid} not found in ps`,
      };
    }

    return {
      rssMb: bytesToMb(bytes),
      skippedNoSidecar: false,
      note: `pid=${body.pid}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      rssMb: null,
      skippedNoSidecar: true,
      note: `sidecar unreachable: ${message}`,
    };
  }
}

export function parseRedisUsedMemoryBytes(info: string): number | null {
  for (const line of info.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("used_memory:")) continue;
    const value = Number(trimmed.slice("used_memory:".length));
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

export async function sampleRedisUsedMb(): Promise<RedisUsedSample> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return { usedMb: null, skippedNoRedis: true, note: "REDIS_URL not set" };
  }

  let client: Redis | null = null;
  try {
    client = new Redis(url, {
      connectTimeout: SAMPLE_TIMEOUT_MS,
      maxRetriesPerRequest: 0,
      lazyConnect: true,
    });
    await client.connect();
    const info = await client.info("memory");
    const bytes = parseRedisUsedMemoryBytes(info);
    if (bytes == null) {
      return { usedMb: null, skippedNoRedis: false, note: "used_memory not in INFO memory" };
    }
    return { usedMb: bytesToMb(bytes), skippedNoRedis: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      usedMb: null,
      skippedNoRedis: true,
      note: `redis unreachable: ${message}`,
    };
  } finally {
    if (client) {
      try {
        client.disconnect();
      } catch {
        // ignore disconnect errors
      }
    }
  }
}
