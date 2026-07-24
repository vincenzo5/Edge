"use client";

import { useEffect, useRef, useState } from "react";
import { getRecentSymbols, subscribeRecentSymbols } from "@/lib/app/recentSymbols";
import { fetchSymbolSearch } from "@/lib/marketData/search/searchClient";
import type { SymbolSearchResult } from "./types";

const SEARCH_DEBOUNCE_MS = 300;

export type UseSymbolSearchOptions = {
  query: string;
  enabled: boolean;
};

export type UseSymbolSearchState = {
  results: SymbolSearchResult[];
  loading: boolean;
  error: string | null;
  showingRecents: boolean;
};

export function useSymbolSearch({ query, enabled }: UseSymbolSearchOptions): UseSymbolSearchState {
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showingRecents, setShowingRecents] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeRecentSymbols((entries) => {
      if (!query.trim()) {
        setResults(entries);
        setShowingRecents(true);
      }
    });
  }, [enabled, query]);

  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort();
      setResults([]);
      setLoading(false);
      setError(null);
      setShowingRecents(false);
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      abortRef.current?.abort();
      setResults(getRecentSymbols());
      setLoading(false);
      setError(null);
      setShowingRecents(true);
      return;
    }

    setShowingRecents(false);

    const debounceTimer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;

      setLoading(true);
      setError(null);

      try {
        const nextResults = await fetchSymbolSearch(trimmed, { signal: controller.signal });
        if (requestId !== requestIdRef.current) return;

        setResults(nextResults);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        if (requestId !== requestIdRef.current) return;
        setResults([]);
        setError(fetchError instanceof Error ? fetchError.message : "Search failed");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(debounceTimer);
      abortRef.current?.abort();
    };
  }, [enabled, query]);

  return { results, loading, error, showingRecents };
}
