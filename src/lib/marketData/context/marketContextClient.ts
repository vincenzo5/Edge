import type { MarketContext } from "@/lib/marketData/contracts/marketContext";
import {
  buildClientCacheKey,
  normalizeClientCacheSymbol,
} from "@/lib/marketData/cache/clientCachePolicy";
import { getOrFetchClientTtl } from "@/lib/marketData/cache/getOrFetchClientTtl";

export async function fetchMarketContext(symbol: string): Promise<MarketContext> {
  const sym = normalizeClientCacheSymbol(symbol);
  if (!sym) {
    throw new Error("Symbol is required");
  }

  const key = buildClientCacheKey("market_context", [sym]);
  return getOrFetchClientTtl("market_context", key, async () => {
    const res = await fetch(`/api/market-data/context?symbol=${encodeURIComponent(sym)}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { error?: string }).error ?? `Market context request failed (${res.status})`,
      );
    }
    const body = (await res.json()) as { context: MarketContext };
    return body.context;
  });
}
