import type { FundamentalsSnapshot } from "./types";
import {
  buildClientCacheKey,
  CLIENT_CACHE_TTL_MS,
  normalizeClientCacheSymbol,
} from "@/lib/marketData/cache/clientCachePolicy";
import { getOrFetchClientTtl } from "@/lib/marketData/cache/getOrFetchClientTtl";
import { getSharedClientTtlCache } from "@/lib/marketData/cache/clientTtlCache";

const FUNDAMENTALS_BATCH_MAX = 50;

const batchInFlight = new Map<string, Promise<Record<string, FundamentalsSnapshot>>>();

function fundamentalsCacheKey(symbol: string): string {
  return buildClientCacheKey("fundamentals", [normalizeClientCacheSymbol(symbol)]);
}

function readCachedFundamentals(symbols: string[]): Record<string, FundamentalsSnapshot> {
  const cache = getSharedClientTtlCache();
  const bySymbol: Record<string, FundamentalsSnapshot> = {};
  for (const symbol of symbols) {
    const sym = normalizeClientCacheSymbol(symbol);
    if (!sym) continue;
    const hit = cache.get(fundamentalsCacheKey(sym)) as FundamentalsSnapshot | undefined;
    if (hit) bySymbol[sym] = hit;
  }
  return bySymbol;
}

function writeFundamentalsCache(bySymbol: Record<string, FundamentalsSnapshot>): void {
  const cache = getSharedClientTtlCache();
  const ttl = CLIENT_CACHE_TTL_MS.fundamentals;
  for (const [symbol, snapshot] of Object.entries(bySymbol)) {
    const sym = normalizeClientCacheSymbol(symbol);
    if (!sym) continue;
    cache.set(fundamentalsCacheKey(sym), snapshot, ttl);
  }
}

async function fetchFundamentalsBatchNetwork(
  symbols: string[],
): Promise<Record<string, FundamentalsSnapshot>> {
  const unique = [
    ...new Set(symbols.map((symbol) => normalizeClientCacheSymbol(symbol)).filter(Boolean)),
  ];
  if (unique.length === 0) return {};

  const bySymbol: Record<string, FundamentalsSnapshot> = {};
  for (let offset = 0; offset < unique.length; offset += FUNDAMENTALS_BATCH_MAX) {
    const chunk = unique.slice(offset, offset + FUNDAMENTALS_BATCH_MAX);
    const res = await fetch("/api/fundamentals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: chunk }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { error?: string }).error ?? `Fundamentals batch request failed (${res.status})`,
      );
    }
    const payload = (await res.json()) as {
      bySymbol?: Record<string, FundamentalsSnapshot>;
    };
    Object.assign(bySymbol, payload.bySymbol ?? {});
  }
  return bySymbol;
}

export async function fetchFundamentals(symbol: string): Promise<FundamentalsSnapshot> {
  const sym = normalizeClientCacheSymbol(symbol);
  if (!sym) {
    throw new Error("Symbol is required");
  }

  const key = fundamentalsCacheKey(sym);
  return getOrFetchClientTtl("fundamentals", key, async () => {
    const params = new URLSearchParams({ symbol: sym });
    const res = await fetch(`/api/fundamentals?${params.toString()}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { error?: string }).error ?? `Fundamentals request failed (${res.status})`,
      );
    }
    return (await res.json()) as FundamentalsSnapshot;
  });
}

export async function fetchFundamentalsBatch(
  symbols: string[],
): Promise<Record<string, FundamentalsSnapshot>> {
  const unique = [
    ...new Set(symbols.map((symbol) => normalizeClientCacheSymbol(symbol)).filter(Boolean)),
  ];
  if (unique.length === 0) return {};

  const cached = readCachedFundamentals(unique);
  const misses = unique.filter((sym) => cached[sym] == null);
  if (misses.length === 0) return cached;

  const batchKey = misses.slice().sort().join("\0");
  const existing = batchInFlight.get(batchKey);
  const fetchPromise =
    existing ??
    (async () => {
      const fetched = await fetchFundamentalsBatchNetwork(misses);
      writeFundamentalsCache(fetched);
      return fetched;
    })();

  if (!existing) {
    batchInFlight.set(batchKey, fetchPromise);
  }

  try {
    const fetched = await fetchPromise;
    return { ...cached, ...fetched };
  } finally {
    if (!existing) {
      batchInFlight.delete(batchKey);
    }
  }
}
