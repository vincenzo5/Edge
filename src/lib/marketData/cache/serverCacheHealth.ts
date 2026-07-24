import "server-only";

import {
  activeServerCacheBackendKind,
  isServerCacheDegraded,
} from "./serverCacheBackends";
import { getSharedRedisClient, pingRedis } from "./redisClient";

export type ServerCacheHealthSnapshot = {
  kind: "memory" | "redis";
  degraded: boolean;
  lastPingOk: boolean | null;
  lastPingAt: number | null;
};

/** Process-local health probe for HotStore/DataCache backend — never exposes REDIS_URL. */
export async function getServerCacheHealthSnapshot(): Promise<ServerCacheHealthSnapshot> {
  const kind = activeServerCacheBackendKind();
  const degraded = isServerCacheDegraded();

  if (kind !== "redis") {
    return {
      kind,
      degraded,
      lastPingOk: null,
      lastPingAt: null,
    };
  }

  const lastPingAt = Date.now();
  let lastPingOk = false;
  try {
    lastPingOk = await pingRedis(getSharedRedisClient());
  } catch {
    lastPingOk = false;
  }

  return {
    kind,
    degraded,
    lastPingOk,
    lastPingAt,
  };
}
