"use client";

import { useEffect, useState } from "react";
import type { FundamentalsSnapshot } from "@/lib/watchlist/types";
import { fetchFundamentals } from "@/lib/watchlist/fundamentalsClient";

export function useWatchlistFundamentalsCache(symbols: string[]) {
  const [cache, setCache] = useState<Record<string, FundamentalsSnapshot>>({});
  const symbolKey = symbols.join("\0");

  useEffect(() => {
    if (!symbolKey) {
      setCache({});
      return;
    }

    let cancelled = false;
    const uniqueSymbols = symbolKey.split("\0");

    void (async () => {
      const entries = await Promise.all(
        uniqueSymbols.map(async (symbol) => {
          try {
            const data = await fetchFundamentals(symbol);
            return [symbol, data] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;
      const next: Record<string, FundamentalsSnapshot> = {};
      for (const entry of entries) {
        if (!entry) continue;
        next[entry[0]] = entry[1];
      }
      setCache(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [symbolKey]);

  return cache;
}
