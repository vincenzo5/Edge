import "server-only";

import { isDatabaseConfigured, pingDatabase } from "@/db";
import { isRedisRequired } from "@/lib/marketData/cache/cacheBackendTypes";
import {
  getRedisUrl,
  getSharedRedisClient,
  pingRedis,
} from "@/lib/marketData/cache/redisClient";
import { createTwsClient } from "@/lib/marketData/providers/tws/client";

export type ReadinessReason =
  | "postgres_unavailable"
  | "redis_unavailable"
  | "tws_unavailable";

export type ReadinessResult = {
  ok: boolean;
  reasons: ReadinessReason[];
};

const TWS_PROBE_TIMEOUT_MS = 2_000;

function isReadyRequireTws(): boolean {
  return process.env.EDGE_READYZ_REQUIRE_TWS?.trim() === "1";
}

function hasTwsSidecarUrl(): boolean {
  const raw = process.env.TWS_SIDECAR_URL?.trim();
  return Boolean(raw && raw.length > 0);
}

async function checkPostgres(reasons: ReadinessReason[]): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }
  const ok = await pingDatabase();
  if (!ok) {
    reasons.push("postgres_unavailable");
  }
}

async function checkRedis(reasons: ReadinessReason[]): Promise<void> {
  if (!isRedisRequired()) {
    return;
  }
  if (!getRedisUrl()) {
    reasons.push("redis_unavailable");
    return;
  }
  try {
    const ok = await pingRedis(getSharedRedisClient());
    if (!ok) {
      reasons.push("redis_unavailable");
    }
  } catch {
    reasons.push("redis_unavailable");
  }
}

async function checkTws(reasons: ReadinessReason[]): Promise<void> {
  if (!isReadyRequireTws() || !hasTwsSidecarUrl()) {
    return;
  }
  try {
    const client = createTwsClient();
    const ok = await client.probeLiveness(TWS_PROBE_TIMEOUT_MS);
    if (!ok) {
      reasons.push("tws_unavailable");
    }
  } catch {
    reasons.push("tws_unavailable");
  }
}

export async function checkReadiness(): Promise<ReadinessResult> {
  const reasons: ReadinessReason[] = [];
  await checkPostgres(reasons);
  await checkRedis(reasons);
  await checkTws(reasons);
  return {
    ok: reasons.length === 0,
    reasons,
  };
}
