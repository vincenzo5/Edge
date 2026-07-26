"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { QuoteSnapshot } from "@/lib/watchlist/types";
import {
  getAllQuotes,
  getQuote,
  getQuoteCount,
  subscribeQuote,
  subscribeQuotesGlobal,
} from "./quotesStore";

const EMPTY_QUOTES: QuoteSnapshot[] = [];

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
  const key = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))].join(",");
  const normalized = useMemo(() => (key ? key.split(",") : []), [key]);
  const snapshotRef = useRef<QuoteSnapshot[]>(EMPTY_QUOTES);
  const subscribe = useCallback(
    (listener: () => void) => {
      if (normalized.length === 0) return () => {};
      const unsubs = normalized.map((sym) => subscribeQuote(sym, listener));
      return () => {
        for (const unsub of unsubs) unsub();
      };
    },
    [normalized],
  );
  const getSnapshot = useCallback(() => {
    const next = normalized
      .map((sym) => getQuote(sym))
      .filter((row): row is QuoteSnapshot => row != null);
    const previous = snapshotRef.current;
    if (
      previous.length === next.length &&
      previous.every((quote, index) => quote === next[index])
    ) {
      return previous;
    }
    snapshotRef.current = next;
    return next;
  }, [normalized]);
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_QUOTES);
}

export function useQuoteCount(): number {
  return useSyncExternalStore(subscribeQuotesGlobal, getQuoteCount, () => 0);
}

export function useAllQuotes(): ReadonlyMap<string, QuoteSnapshot> {
  return useSyncExternalStore(subscribeQuotesGlobal, getAllQuotes, () => new Map());
}
