import type Redis from "ioredis";

import { REDIS_MD_SCHEMA_VERSION, resolveRedisCacheEnv } from "./redisKeys";

/** SCAN pattern for one deploy env segment — never use FLUSHALL/FLUSHDB on shared Redis. */
export function redisEnvKeyPattern(env?: string): string {
  const segment = env ?? resolveRedisCacheEnv();
  return `edge:${segment}:${REDIS_MD_SCHEMA_VERSION}:md:*`;
}

/** Delete only keys under one environment prefix (safe for shared local Redis). */
export async function clearRedisEnvKeys(client: Redis, env?: string): Promise<number> {
  const pattern = redisEnvKeyPattern(env);
  let deleted = 0;
  let cursor = "0";
  do {
    const [next, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = next;
    if (keys.length > 0) {
      deleted += await client.del(...keys);
    }
  } while (cursor !== "0");
  return deleted;
}
