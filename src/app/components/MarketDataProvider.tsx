"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ChartLayout } from "@/lib/chartConfig";
import { cellCountFor } from "@/lib/chartConfig";
import { getActiveWatchlist } from "@/lib/watchlist/storage";
import type { QuoteSnapshot } from "@/lib/watchlist/types";
import { useWatchlistActions } from "./watchlist/WatchlistContext";
import {
  createMarketDataTraceId,
  marketDataTraceHeaders,
  recordMarketDataTelemetry,
} from "@/lib/marketData/telemetry";

type MarketDataContextValue = {
  quotesBySymbol: Map<string, QuoteSnapshot>;
  quotesLoading: boolean;
  quoteError: string | null;
};

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

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

function buildSymbolUniverse(
  layout: ChartLayout,
  watchlistSymbols: string[],
): string[] {
  const symbols = new Set<string>(watchlistSymbols);
  const count = cellCountFor(layout.gridMode);
  for (let i = 0; i < count; i++) {
    const cell = layout.cells[i];
    if (cell?.symbol) symbols.add(cell.symbol.trim().toUpperCase());
  }
  return [...symbols].sort();
}

export function MarketDataProvider({
  layout,
  children,
}: {
  layout: ChartLayout;
  children: ReactNode;
}) {
  const watchlist = useWatchlistActions();
  const [quotesBySymbol, setQuotesBySymbol] = useState<Map<string, QuoteSnapshot>>(
    () => new Map(),
  );
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const quotesRef = useRef(quotesBySymbol);
  quotesRef.current = quotesBySymbol;
  const quotesFetchStartedRef = useRef<number | null>(null);
  const quotesFirstPaintRef = useRef(false);

  const watchlistSymbols = useMemo(() => {
    if (!watchlist?.state) return [] as string[];
    return getActiveWatchlist(watchlist.state).items.map((item) =>
      item.symbol.trim().toUpperCase(),
    );
  }, [watchlist?.state]);

  const symbolUniverse = useMemo(
    () => buildSymbolUniverse(layout, watchlistSymbols),
    [layout, watchlistSymbols],
  );

  const symbolKey = symbolUniverse.join(",");

  const activeCell = layout.cells[layout.activeCellIndex ?? 0];
  const activeSymbol = activeCell?.symbol?.trim().toUpperCase() ?? null;

  const candleRequests = useMemo(() => {
    const count = cellCountFor(layout.gridMode);
    const requests: Array<{ symbol: string; interval: string; range?: string }> = [];
    for (let i = 0; i < count; i++) {
      const cell = layout.cells[i];
      if (!cell?.symbol) continue;
      requests.push({
        symbol: cell.symbol.trim().toUpperCase(),
        interval: cell.interval,
        range: cell.range,
      });
    }
    return requests;
  }, [layout.gridMode, layout.cells]);

  const candleKey = candleRequests
    .map((row) => `${row.symbol}|${row.interval}|${row.range ?? "1y"}`)
    .join(";");

  useEffect(() => {
    if (symbolUniverse.length === 0 && !activeSymbol) return;

    const scenario = `warmup:layout:${symbolUniverse.length}-symbols:${candleRequests.length}-charts`;
    const traceId = createMarketDataTraceId(scenario);
    const startedAt = Date.now();
    recordMarketDataTelemetry("warmup.request", {
      traceId,
      scenario,
      layer: "client",
      ok: true,
      counts: {
        symbols: symbolUniverse.length,
        candles: candleRequests.length,
      },
      symbols: symbolUniverse.length,
      candles: candleRequests.length,
      optionsSymbol: activeSymbol,
    });

    void fetch("/api/market-data/warmup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...marketDataTraceHeaders(traceId, scenario),
      },
      body: JSON.stringify({
        symbols: symbolUniverse,
        candleRequests,
        optionsSymbol: activeSymbol ?? undefined,
      }),
    })
      .then(async (res) => {
        const payload = (await res.json().catch(() => ({}))) as {
          warmup?: {
            totalMs?: number;
            phases?: unknown[];
            traceId?: string;
            apiPhases?: unknown[];
          };
        };
        recordMarketDataTelemetry("warmup.response", {
          traceId: payload.warmup?.traceId ?? traceId,
          scenario,
          layer: "client",
          ok: res.ok,
          clientMs: Date.now() - startedAt,
          durationMs: Date.now() - startedAt,
          serverMs: payload.warmup?.totalMs,
          serverTotalMs: payload.warmup?.totalMs,
          phases: payload.warmup?.phases?.length ?? 0,
          serverPhases: [
            ...((payload.warmup?.apiPhases as []) ?? []),
            ...((payload.warmup?.phases as []) ?? []),
          ],
        });
      })
      .catch((error) => {
        recordMarketDataTelemetry("warmup.response", {
          traceId,
          scenario,
          layer: "client",
          ok: false,
          clientMs: Date.now() - startedAt,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }, [symbolKey, candleKey, activeSymbol, symbolUniverse, candleRequests]);

  useEffect(() => {
    if (symbolUniverse.length === 0) {
      setQuotesBySymbol(new Map());
      setQuotesLoading(false);
      setQuoteError(null);
      return;
    }

    if (!watchlistStreamEnabled()) {
      setQuotesLoading(quotesRef.current.size === 0);
      setQuoteError(null);
      quotesFirstPaintRef.current = false;
      quotesFetchStartedRef.current = Date.now();
      const quoteScenario = `watchlist-quotes:${symbolUniverse.length}-symbols`;
      const quoteTraceId = createMarketDataTraceId(quoteScenario);
      void fetch("/api/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...marketDataTraceHeaders(quoteTraceId, quoteScenario),
        },
        body: JSON.stringify({ symbols: symbolUniverse }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error(
              (payload as { error?: string }).error ?? `Request failed (${res.status})`,
            );
          }
          return (await res.json()) as {
            quotes?: QuoteSnapshot[];
            meta?: {
              latencyMs?: number;
              cacheTier?: string;
              source?: string;
              traceId?: string;
              phases?: unknown[];
            };
          };
        })
        .then((payload) => {
          const next = new Map<string, QuoteSnapshot>();
          for (const quote of payload.quotes ?? []) {
            next.set(quote.symbol, quote);
          }
          setQuotesBySymbol(next);
          setQuoteError(null);
          if (!quotesFirstPaintRef.current && next.size > 0) {
            quotesFirstPaintRef.current = true;
            recordMarketDataTelemetry("quotes.firstPaint", {
              traceId: payload.meta?.traceId ?? quoteTraceId,
              scenario: quoteScenario,
              layer: "client",
              ok: true,
              clientMs:
                quotesFetchStartedRef.current != null
                  ? Date.now() - quotesFetchStartedRef.current
                  : undefined,
              durationMs:
                quotesFetchStartedRef.current != null
                  ? Date.now() - quotesFetchStartedRef.current
                  : undefined,
              serverMs: payload.meta?.latencyMs,
              cacheTier: payload.meta?.cacheTier,
              provider: payload.meta?.source,
              source: payload.meta?.source,
              counts: { quotes: next.size },
              count: next.size,
              serverPhases: payload.meta?.phases,
            });
          }
        })
        .catch((err) => {
          setQuoteError(err instanceof Error ? err.message : "Failed to load quotes");
        })
        .finally(() => {
          setQuotesLoading(false);
        });
      return;
    }

    setQuotesLoading(quotesRef.current.size === 0);
    setQuoteError(null);
    quotesFirstPaintRef.current = false;
    quotesFetchStartedRef.current = Date.now();
    const streamScenario = `watchlist-quotes-stream:${symbolUniverse.length}-symbols`;
    const streamTraceId = createMarketDataTraceId(streamScenario);

    const params = new URLSearchParams({ symbols: symbolUniverse.join(",") });
    const source = new EventSource(`/api/stream/quotes?${params.toString()}`);

    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as {
          type?: string;
          quotes?: Record<string, unknown>[];
          message?: string;
        };
        if (event.type === "error") {
          setQuoteError(event.message ?? "Quote stream error");
          return;
        }
        if (event.type === "snapshot" || event.type === "update") {
          const rows =
            event.quotes
              ?.map((row) => mapStreamQuote(row))
              .filter((row): row is QuoteSnapshot => row != null) ?? [];
          if (rows.length === 0) return;
          setQuotesBySymbol((prev) => {
            const next = new Map(prev);
            for (const row of rows) {
              next.set(row.symbol, row);
            }
            if (!quotesFirstPaintRef.current && next.size > 0) {
              quotesFirstPaintRef.current = true;
              recordMarketDataTelemetry("quotes.firstPaint", {
                traceId: streamTraceId,
                scenario: streamScenario,
                layer: "client",
                ok: true,
                clientMs:
                  quotesFetchStartedRef.current != null
                    ? Date.now() - quotesFetchStartedRef.current
                    : undefined,
                durationMs:
                  quotesFetchStartedRef.current != null
                    ? Date.now() - quotesFetchStartedRef.current
                    : undefined,
                transport: "sse",
                counts: { quotes: next.size },
                count: next.size,
              });
            }
            return next;
          });
          setQuotesLoading(false);
          setQuoteError(null);
        }
      } catch {
        // Ignore malformed frames.
      }
    };

    source.onerror = () => {
      setQuoteError("Quote stream disconnected");
      setQuotesLoading(false);
    };

    return () => {
      source.close();
    };
  }, [symbolKey, symbolUniverse]);

  const value = useMemo(
    (): MarketDataContextValue => ({
      quotesBySymbol,
      quotesLoading,
      quoteError,
    }),
    [quotesBySymbol, quotesLoading, quoteError],
  );

  return (
    <MarketDataContext.Provider value={value}>{children}</MarketDataContext.Provider>
  );
}

export function useMarketDataQuotes(): MarketDataContextValue | null {
  return useContext(MarketDataContext);
}

export function useMarketDataQuotesForSymbols(symbols: string[]): {
  quotes: QuoteSnapshot[];
  loading: boolean;
  error: string | null;
} {
  const marketData = useMarketDataQuotes();
  const normalized = useMemo(
    () => [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))],
    [symbols],
  );

  const quotes = useMemo(() => {
    if (!marketData) return [] as QuoteSnapshot[];
    return normalized
      .map((sym) => marketData.quotesBySymbol.get(sym))
      .filter((row): row is QuoteSnapshot => row != null);
  }, [marketData, normalized]);

  if (!marketData) {
    return { quotes: [], loading: false, error: null };
  }

  return {
    quotes,
    loading: marketData.quotesLoading && quotes.length === 0,
    error: marketData.quoteError,
  };
}
