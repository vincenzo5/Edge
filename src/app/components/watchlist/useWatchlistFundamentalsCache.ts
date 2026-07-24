"use client";

import { useEffect, useState } from "react";
import type { FundamentalsSnapshot } from "@/lib/watchlist/types";
import { fetchFundamentalsBatch } from "@/lib/watchlist/fundamentalsClient";

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
      try {
        const next = await fetchFundamentalsBatch(uniqueSymbols);
        if (cancelled) return;
        setCache(next);
      } catch {
        if (!cancelled) setCache({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbolKey]);

  return cache;
}
