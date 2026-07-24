import type Redis from "ioredis";

export type RedisEvictionOptions = {
  maxEntries: number;
  softBytes: number;
  lruKey: string;
  entryPrefix: string;
};

async function sumApproxBytes(redis: Redis, redisKeys: string[]): Promise<number> {
  if (redisKeys.length === 0) return 0;
  const pipeline = redis.pipeline();
  for (const key of redisKeys) {
    pipeline.get(key);
  }
  const results = await pipeline.exec();
  if (!results) return 0;
  let sum = 0;
  for (const [err, raw] of results) {
    if (err || typeof raw !== "string") continue;
    try {
      const parsed = JSON.parse(raw) as { approxBytes?: number };
      sum += parsed.approxBytes ?? 0;
    } catch {
      // ignore malformed payloads during eviction accounting
    }
  }
  return sum;
}

/** Evict least-recently-touched Redis entries until within entry and soft byte budgets. */
export async function evictRedisUntilWithinBudget(
  redis: Redis,
  options: RedisEvictionOptions,
): Promise<void> {
  const { lruKey, entryPrefix, maxEntries, softBytes } = options;

  while (true) {
    const count = await redis.zcard(lruKey);
    if (count <= maxEntries) {
      const members = await redis.zrange(lruKey, 0, -1);
      const keys = members.map((logical) => `${entryPrefix}${logical}`);
      const totalBytes = await sumApproxBytes(redis, keys);
      if (totalBytes <= softBytes) {
        return;
      }
    }

    const victims = await redis.zpopmin(lruKey, 1);
    if (victims.length === 0) return;

    const logicalKey = victims[0]![0];
    const redisKey = `${entryPrefix}${logicalKey}`;
    await redis.del(redisKey);

    const remaining = await redis.zcard(lruKey);
    if (remaining === 0) return;

    if (remaining <= maxEntries) {
      const members = await redis.zrange(lruKey, 0, -1);
      const keys = members.map((logical) => `${entryPrefix}${logical}`);
      const totalBytes = await sumApproxBytes(redis, keys);
      if (totalBytes <= softBytes) {
        return;
      }
    }
  }
}

export async function removeRedisLruMembers(
  redis: Redis,
  lruKey: string,
  logicalKeys: string[],
): Promise<void> {
  if (logicalKeys.length === 0) return;
  await redis.zrem(lruKey, ...logicalKeys);
}

export async function scanDeleteByPrefix(redis: Redis, prefix: string): Promise<void> {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
}
