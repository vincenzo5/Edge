"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { QuoteSnapshot } from "@/lib/watchlist/types";
import {
  getAllQuotes,
  getQuote,
  getQuoteCount,
  subscribeQuote,
  subscribeQuotesGlobal,
} from "./quotesStore";

export function useQuote(symbol: string | null | undefined): QuoteSnapshot | null {
  const normalized = symbol?.trim().toUpperCase() ?? "";
  const subscribe = useCallback(
    (listener: () => void) => (normalized ? subscribeQuote(normalized, listener) : () => {}),
    [normalized],
  );
  const getSnapshot = useCallback(
    () => (normalized ? (getQuote(normalized) ?? null) : null),
    [normalized],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function useQuotesForSymbols(symbols: string[]): QuoteSnapshot[] {
  const normalized = useMemo(
    () => [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))],
    [symbols],
  );
  const key = normalized.join(",");
  const subscribe = useCallback(
    (listener: () => void) => {
      if (normalized.length === 0) return () => {};
      const unsubs = normalized.map((sym) => subscribeQuote(sym, listener));
      return () => {
        for (const unsub of unsubs) unsub();
      };
    },
    [key, normalized],
  );
  const getSnapshot = useCallback(() => {
    return normalized
      .map((sym) => getQuote(sym))
      .filter((row): row is QuoteSnapshot => row != null);
  }, [key, normalized]);
  return useSyncExternalStore(subscribe, getSnapshot, () => []);
}

export function useQuoteCount(): number {
  return useSyncExternalStore(subscribeQuotesGlobal, getQuoteCount, () => 0);
}

export function useAllQuotes(): ReadonlyMap<string, QuoteSnapshot> {
  return useSyncExternalStore(subscribeQuotesGlobal, getAllQuotes, () => new Map());
}
