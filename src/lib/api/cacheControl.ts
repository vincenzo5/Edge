import { CACHE_TTL_MS, type CacheNamespace } from "@/lib/marketData/cache/ttlPolicy";

type CacheControlNamespace = Exclude<CacheNamespace, "candles">;

/** Private browser cache header aligned with server `CACHE_TTL_MS` (seconds). */
export function privateCacheControl(namespace: CacheControlNamespace): string {
  const maxAgeSec = Math.floor(CACHE_TTL_MS[namespace] / 1000);
  return `private, max-age=${maxAgeSec}`;
}
