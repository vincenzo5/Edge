import "server-only";

import Redis from "ioredis";
import { isRedisRequired } from "./cacheBackendTypes";

let sharedClient: Redis | null = null;
let connectAttempted = false;

export function getRedisUrl(): string | undefined {
  const url = process.env.REDIS_URL?.trim();
  return url && url.length > 0 ? url : undefined;
}

export function createRedisClient(): Redis {
  const url = getRedisUrl();
  if (!url) {
    throw new Error("REDIS_URL is required when EDGE_MARKET_DATA_CACHE_BACKEND=redis");
  }
  return new Redis(url, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    enableOfflineQueue: !isRedisRequired(),
  });
}

/** Shared client for server cache backends (lazy connect on first use). */
export function getSharedRedisClient(): Redis {
  if (!sharedClient) {
    sharedClient = createRedisClient();
  }
  return sharedClient;
}

export async function ensureRedisConnected(client: Redis): Promise<void> {
  if (client.status === "ready" || client.status === "connect") {
    return;
  }
  if (client.status === "connecting") {
    await new Promise<void>((resolve, reject) => {
      client.once("ready", () => resolve());
      client.once("error", reject);
    });
    return;
  }
  await client.connect();
}

export async function pingRedis(client: Redis): Promise<boolean> {
  try {
    await ensureRedisConnected(client);
    const pong = await client.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

export function resetSharedRedisClientForTests(): void {
  if (sharedClient) {
    void sharedClient.quit().catch(() => undefined);
    sharedClient = null;
  }
  connectAttempted = false;
}

export function markRedisConnectAttempted(): void {
  connectAttempted = true;
}

export function wasRedisConnectAttempted(): boolean {
  return connectAttempted;
}
