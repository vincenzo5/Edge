"use client";

import { useEffect, useRef, useState } from "react";
import type { QuoteSnapshot } from "@/lib/watchlist/types";
import { fetchQuotes } from "@/lib/watchlist/quoteClient";
import { useMarketDataQuotes, useMarketDataQuotesForSymbols } from "../MarketDataProvider";

function watchlistStreamEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_WATCHLIST_STREAM === "1") return true;
  if (process.env.NEXT_PUBLIC_WATCHLIST_STREAM === "0") return false;
  return typeof EventSource !== "undefined";
}

function mapStreamQuote(raw: Record<string, unknown>): QuoteSnapshot | null {
  const symbol = typeof raw.symbol === "string" ? raw.symbol : null;
  if (!symbol) return null;
  return {
    symbol,
    shortName: typeof raw.shortName === "string" ? raw.shortName : undefined,
    exchange: typeof raw.exchange === "string" ? raw.exchange : undefined,
    currency: typeof raw.currency === "string" ? raw.currency : undefined,
    regularMarketPrice:
      typeof raw.regularMarketPrice === "number" ? raw.regularMarketPrice : null,
    regularMarketChange:
      typeof raw.regularMarketChange === "number" ? raw.regularMarketChange : null,
    regularMarketChangePercent:
      typeof raw.regularMarketChangePercent === "number"
        ? raw.regularMarketChangePercent
        : null,
    regularMarketVolume:
      typeof raw.regularMarketVolume === "number" ? raw.regularMarketVolume : null,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  };
}

function useLegacyWatchlistQuoteStream(symbols: string[]): {
  quotes: QuoteSnapshot[];
  loading: boolean;
  error: string | null;
} {
  const [quotes, setQuotes] = useState<QuoteSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const symbolKey = symbols.join("\0");
  const quotesRef = useRef(quotes);
  quotesRef.current = quotes;

  useEffect(() => {
    if (symbols.length === 0) {
      setQuotes((prev) => (prev.length === 0 ? prev : []));
      setError((prev) => (prev === null ? prev : null));
      setLoading((prev) => (prev === false ? prev : false));
      return;
    }

    let cancelled = false;

    if (!watchlistStreamEnabled()) {
      setLoading(true);
      fetchQuotes(symbols)
        .then((next) => {
          if (!cancelled) {
            setQuotes(next);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Failed to load quotes");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    setLoading(quotesRef.current.length === 0);
    setError(null);

    const params = new URLSearchParams({ symbols: symbols.join(",") });
    const source = new EventSource(`/api/stream/quotes?${params.toString()}`);

    source.onmessage = (message) => {
      if (cancelled) return;
      try {
        const event = JSON.parse(message.data) as {
          type?: string;
          quotes?: Record<string, unknown>[];
          message?: string;
        };
        if (event.type === "error") {
          setError(event.message ?? "Quote stream error");
          return;
        }
        if (event.type === "snapshot" || event.type === "update") {
          const next =
            event.quotes
              ?.map((row) => mapStreamQuote(row))
              .filter((row): row is QuoteSnapshot => row != null) ?? [];
          if (next.length > 0) setQuotes(next);
          setLoading(false);
          setError(null);
        }
      } catch {
        // Ignore malformed frames.
      }
    };

    source.onerror = () => {
      if (cancelled) return;
      setError("Quote stream disconnected");
      setLoading(false);
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, [symbolKey]);

  return { quotes, loading, error };
}

export function useWatchlistQuoteStream(symbols: string[]): {
  quotes: QuoteSnapshot[];
  loading: boolean;
  error: string | null;
} {
  const marketData = useMarketDataQuotes();
  const appQuotes = useMarketDataQuotesForSymbols(symbols);
  const legacy = useLegacyWatchlistQuoteStream(marketData ? [] : symbols);

  if (marketData) {
    return appQuotes;
  }

  return legacy;
}
