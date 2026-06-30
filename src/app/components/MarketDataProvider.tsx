"use client";

import {
  createContext,
  useCallback,
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
import type { ChartDataMeta } from "@edge/chart-core";
import type { QuoteSnapshot } from "@/lib/watchlist/types";
import { useWatchlistActions } from "./watchlist/WatchlistContext";
import { useScreenerStateOptional } from "./screener/ScreenerProvider";
import {
  createMarketDataTraceId,
  marketDataTraceHeaders,
  recordMarketDataTelemetry,
} from "@/lib/marketData/telemetry";

export type WatchlistQuotesTransport = "rest" | "sse";

export type RecoveryCandleRequest = {
  symbol: string;
  interval: string;
  range?: string;
};

type MarketDataContextValue = {
  quotesBySymbol: Map<string, QuoteSnapshot>;
  quotesLoading: boolean;
  quoteError: string | null;
  quotesMeta: Partial<ChartDataMeta> | null;
  quotesTransport: WatchlistQuotesTransport;
  watchlistSymbolCount: number;
  recoverySymbols: string[];
  recoveryCandleRequests: RecoveryCandleRequest[];
  recoveryOptionsSymbol: string | null;
  reloadToken: number;
  reloadMarketData: () => void;
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
  screenerSymbols: string[] = [],
): string[] {
  const symbols = new Set<string>(watchlistSymbols);
  for (const symbol of screenerSymbols) {
    symbols.add(symbol.trim().toUpperCase());
  }
  const count = cellCountFor(layout.gridMode);
  for (let i = 0; i < count; i++) {
    const cell = layout.cells[i];
    if (cell?.symbol) symbols.add(cell.symbol.trim().toUpperCase());
  }
  return [...symbols].sort();
}

const STREAM_SYMBOL_CAP = 32;

function prioritizeStreamSymbols(
  layout: ChartLayout,
  watchlistSymbols: string[],
  screenerSymbols: string[],
): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (symbol: string) => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    ordered.push(normalized);
  };

  const count = cellCountFor(layout.gridMode);
  for (let i = 0; i < count; i++) {
    const cell = layout.cells[i];
    if (cell?.symbol) push(cell.symbol);
  }
  for (const symbol of screenerSymbols) push(symbol);
  for (const symbol of watchlistSymbols) push(symbol);

  return ordered.slice(0, STREAM_SYMBOL_CAP);
}

export function MarketDataProvider({
  layout,
  children,
}: {
  layout: ChartLayout;
  children: ReactNode;
}) {
  const watchlist = useWatchlistActions();
  const screener = useScreenerStateOptional();
  const [quotesBySymbol, setQuotesBySymbol] = useState<Map<string, QuoteSnapshot>>(
    () => new Map(),
  );
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quotesMeta, setQuotesMeta] = useState<Partial<ChartDataMeta> | null>(null);
  const [quotesTransport, setQuotesTransport] =
    useState<WatchlistQuotesTransport>("rest");
  const quotesRef = useRef(quotesBySymbol);
  quotesRef.current = quotesBySymbol;
  const quotesFetchStartedRef = useRef<number | null>(null);
  const quotesFirstPaintRef = useRef(false);
  const [reloadToken, setReloadToken] = useState(0);

  const reloadMarketData = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const watchlistSymbols = useMemo(() => {
    if (!watchlist?.state) return [] as string[];
    return getActiveWatchlist(watchlist.state).items.map((item) =>
      item.symbol.trim().toUpperCase(),
    );
  }, [watchlist?.state]);

  const screenerSymbols = useMemo(
    () => screener?.screenerVisibleSymbols ?? [],
    [screener?.screenerVisibleSymbols],
  );

  const symbolUniverse = useMemo(
    () => buildSymbolUniverse(layout, watchlistSymbols, screenerSymbols),
    [layout, watchlistSymbols, screenerSymbols],
  );

  const streamSymbols = useMemo(
    () => prioritizeStreamSymbols(layout, watchlistSymbols, screenerSymbols),
    [layout, watchlistSymbols, screenerSymbols],
  );

  const symbolKey = symbolUniverse.join(",");
  const streamKey = streamSymbols.join(",");

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
  }, [symbolKey, candleKey, activeSymbol, symbolUniverse, candleRequests, reloadToken]);

  useEffect(() => {
    if (streamSymbols.length === 0) {
      setQuotesBySymbol(new Map());
      setQuotesLoading(false);
      setQuoteError(null);
      setQuotesMeta(null);
      setQuotesTransport("rest");
      return;
    }

    if (!watchlistStreamEnabled()) {
      setQuotesTransport("rest");
      setQuotesLoading(quotesRef.current.size === 0);
      setQuoteError(null);
      quotesFirstPaintRef.current = false;
      quotesFetchStartedRef.current = Date.now();
      const quoteScenario = `watchlist-quotes:${streamSymbols.length}-symbols`;
      const quoteTraceId = createMarketDataTraceId(quoteScenario);
      void fetch("/api/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...marketDataTraceHeaders(quoteTraceId, quoteScenario),
        },
        body: JSON.stringify({ symbols: streamSymbols }),
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
              asOf?: number;
              stale?: boolean;
              warnings?: string[];
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
          if (payload.meta) {
            setQuotesMeta({
              source: payload.meta.source as ChartDataMeta["source"],
              asOf: payload.meta.asOf ?? Date.now(),
              stale: payload.meta.stale,
              warnings: payload.meta.warnings,
              latencyMs: payload.meta.latencyMs,
              cacheTier: payload.meta.cacheTier as ChartDataMeta["cacheTier"],
              traceId: payload.meta.traceId,
            });
          }
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
              cacheTier: payload.meta?.cacheTier as ChartDataMeta["cacheTier"],
              provider: payload.meta?.source,
              source: payload.meta?.source,
              counts: { quotes: next.size },
              count: next.size,
              serverPhases: payload.meta?.phases as import("@/lib/marketData/telemetry/perfPhases").MarketDataPerfPhase[] | undefined,
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

    setQuotesTransport("sse");
    setQuotesLoading(quotesRef.current.size === 0);
    setQuoteError(null);
    quotesFirstPaintRef.current = false;
    quotesFetchStartedRef.current = Date.now();
    setQuotesMeta((prev) => ({
      ...prev,
      streaming: true,
      asOf: Date.now(),
    }));
    const streamScenario = `watchlist-quotes-stream:${streamSymbols.length}-symbols`;
    const streamTraceId = createMarketDataTraceId(streamScenario);

    const params = new URLSearchParams({ symbols: streamSymbols.join(",") });
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
          const next = new Map(quotesRef.current);
          for (const row of rows) {
            next.set(row.symbol, row);
          }
          setQuotesBySymbol(next);
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
          setQuotesLoading(false);
          setQuoteError(null);
          setQuotesMeta((prev) => ({
            ...prev,
            streaming: true,
            asOf: Date.now(),
          }));
        }
      } catch {
        // Ignore malformed frames.
      }
    };

    source.onerror = () => {
      setQuoteError("Quote stream disconnected");
      setQuotesLoading(false);
      setQuotesMeta((prev) => ({
        ...prev,
        streamError: "Quote stream disconnected",
      }));
    };

    return () => {
      source.close();
    };
  }, [streamKey, streamSymbols, reloadToken]);

  const value = useMemo(
    (): MarketDataContextValue => ({
      quotesBySymbol,
      quotesLoading,
      quoteError,
      quotesMeta,
      quotesTransport,
      watchlistSymbolCount: symbolUniverse.length,
      recoverySymbols: symbolUniverse,
      recoveryCandleRequests: candleRequests,
      recoveryOptionsSymbol: activeSymbol,
      reloadToken,
      reloadMarketData,
    }),
    [
      quotesBySymbol,
      quotesLoading,
      quoteError,
      quotesMeta,
      quotesTransport,
      symbolUniverse,
      candleRequests,
      activeSymbol,
      reloadToken,
      reloadMarketData,
    ],
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
