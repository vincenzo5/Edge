import type { SymbolSearchResult } from "@/app/components/design-system/symbol-search/types";
import {
  buildClientCacheKey,
  normalizeClientCacheQuery,
} from "@/lib/marketData/cache/clientCachePolicy";
import { getOrFetchClientTtl } from "@/lib/marketData/cache/getOrFetchClientTtl";

const DEFAULT_SEARCH_LIMIT = 8;

export async function fetchSymbolSearch(
  query: string,
  options?: { limit?: number; signal?: AbortSignal },
): Promise<SymbolSearchResult[]> {
  const normalized = normalizeClientCacheQuery(query);
  if (!normalized) return [];

  const limit = options?.limit ?? DEFAULT_SEARCH_LIMIT;
  const key = buildClientCacheKey("search", [normalized, String(limit)]);

  return getOrFetchClientTtl("search", key, async () => {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.trim(), limit }),
      signal: options?.signal,
    });

    if (!res.ok) {
      throw new Error(`Search failed (${res.status})`);
    }

    const body = (await res.json()) as { results?: SymbolSearchResult[] };
    return body.results ?? [];
  });
}
