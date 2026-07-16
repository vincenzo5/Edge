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
import { mapRawQuoteToSnapshot } from "@/lib/marketData/validation/mappers";
import { useWatchlistActions } from "./watchlist/WatchlistContext";
import { useScreenerStateOptional } from "./screener/ScreenerProvider";
import {
  createMarketDataTraceId,
  marketDataTraceHeaders,
  recordMarketDataTelemetry,
} from "@/lib/marketData/telemetry";
import { resolveQuoteStreamFirstPaintMs } from "@/lib/marketData/quoteStreamPolicy";
import { recordHealthEvent } from "@/lib/marketData/healthEvents";
import { getDatasetPolicy, isDisplayFresh, provenanceFromMeta } from "@/lib/marketData/trust/dataTrust";
import { useDataConnectionPreference } from "@/lib/marketData/useDataConnectionPreference";

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

const mapStreamQuote = mapRawQuoteToSnapshot;

type RestQuotesResponse = {
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

async function fetchRestWatchlistQuotes(
  symbols: string[],
  scenario: string,
  traceId: string,
  connectionId?: string,
): Promise<RestQuotesResponse> {
  const res = await fetch("/api/quotes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...marketDataTraceHeaders(traceId, scenario),
    },
    body: JSON.stringify({
      symbols,
      ...(connectionId ? { connectionId } : {}),
    }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(
      (payload as { error?: string }).error ?? `Request failed (${res.status})`,
    );
  }
  return (await res.json()) as RestQuotesResponse;
}

function applyRestQuotesPayload(
  payload: RestQuotesResponse,
  options: {
    traceId: string;
    scenario: string;
    transport: WatchlistQuotesTransport | "rest-fallback";
    startedAt: number | null;
  },
): { next: Map<string, QuoteSnapshot>; firstPaint: boolean } {
  const next = new Map<string, QuoteSnapshot>();
  for (const quote of payload.quotes ?? []) {
    next.set(quote.symbol.trim().toUpperCase(), {
      ...quote,
      symbol: quote.symbol.trim().toUpperCase(),
    });
  }
  const firstPaint = next.size > 0;
  if (firstPaint) {
    recordMarketDataTelemetry("quotes.firstPaint", {
      traceId: payload.meta?.traceId ?? options.traceId,
      scenario: options.scenario,
      layer: "client",
      ok: true,
      clientMs: options.startedAt != null ? Date.now() - options.startedAt : undefined,
      durationMs: options.startedAt != null ? Date.now() - options.startedAt : undefined,
      serverMs: payload.meta?.latencyMs,
      cacheTier: payload.meta?.cacheTier as ChartDataMeta["cacheTier"],
      provider: payload.meta?.source,
      source: payload.meta?.source,
      transport: options.transport,
      counts: { quotes: next.size },
      count: next.size,
      serverPhases: payload.meta?.phases as
        | import("@/lib/marketData/telemetry/perfPhases").MarketDataPerfPhase[]
        | undefined,
    });
  }
  return { next, firstPaint };
}

function oldestQuoteUpdatedAt(quotes: Iterable<QuoteSnapshot>): number | undefined {
  let oldest: number | undefined;
  for (const quote of quotes) {
    if (typeof quote.updatedAt !== "number") continue;
    oldest = oldest == null ? quote.updatedAt : Math.min(oldest, quote.updatedAt);
  }
  return oldest;
}

function mergeQuotesMeta(
  quotes: Map<string, QuoteSnapshot>,
  meta: RestQuotesResponse["meta"] | undefined,
  prev: Partial<ChartDataMeta> | null | undefined,
  streaming?: boolean,
): Partial<ChartDataMeta> {
  const asOf = oldestQuoteUpdatedAt(quotes.values()) ?? meta?.asOf ?? prev?.asOf ?? Date.now();
  return {
    ...prev,
    ...(meta?.source ? { source: meta.source as ChartDataMeta["source"] } : {}),
    asOf,
    stale: meta?.stale ?? prev?.stale,
    warnings: meta?.warnings ?? prev?.warnings ?? [],
    latencyMs: meta?.latencyMs ?? prev?.latencyMs,
    cacheTier: (meta?.cacheTier as ChartDataMeta["cacheTier"]) ?? prev?.cacheTier,
    traceId: meta?.traceId ?? prev?.traceId,
    ...(streaming != null ? { streaming } : {}),
  };
}

const SILENT_REVALIDATE_DELAY_MS = 3_000;

function buildSymbolUniverse(
  layout: ChartLayout,
  watchlistSymbols: string[],
  screenerSymbols: string[] = [],
  extraSymbols: string[] = [],
): string[] {
  const symbols = new Set<string>(watchlistSymbols);
  for (const symbol of screenerSymbols) {
    symbols.add(symbol.trim().toUpperCase());
  }
  for (const symbol of extraSymbols) {
    const normalized = symbol.trim().toUpperCase();
    if (normalized) symbols.add(normalized);
  }
  const count = cellCountFor(layout.layoutId);
  for (let i = 0; i < count; i++) {
    const cell = layout.cells[i];
    if (cell?.symbol) symbols.add(cell.symbol.trim().toUpperCase());
  }
  return [...symbols].sort();
}

const STREAM_SYMBOL_CAP = 32;
const EMPTY_EXTRA_SYMBOLS: string[] = [];

function prioritizeStreamSymbols(
  layout: ChartLayout,
  watchlistSymbols: string[],
  screenerSymbols: string[],
  extraSymbols: string[] = [],
): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (symbol: string) => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    ordered.push(normalized);
  };

  const count = cellCountFor(layout.layoutId);
  for (let i = 0; i < count; i++) {
    const cell = layout.cells[i];
    if (cell?.symbol) push(cell.symbol);
  }
  for (const symbol of extraSymbols) push(symbol);
  for (const symbol of screenerSymbols) push(symbol);
  for (const symbol of watchlistSymbols) push(symbol);

  return ordered.slice(0, STREAM_SYMBOL_CAP);
}

export function MarketDataProvider({
  layout,
  extraSymbols = EMPTY_EXTRA_SYMBOLS,
  children,
}: {
  layout: ChartLayout;
  /** Additional symbols to quote (e.g. inactive workspace tab primaries). */
  extraSymbols?: string[];
  children: ReactNode;
}) {
  const watchlist = useWatchlistActions();
  const screener = useScreenerStateOptional();
  const { preference: dataConnectionPreference } = useDataConnectionPreference();
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
  const silentRevalidateKeyRef = useRef<string | null>(null);
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
    () => buildSymbolUniverse(layout, watchlistSymbols, screenerSymbols, extraSymbols),
    [layout, watchlistSymbols, screenerSymbols, extraSymbols],
  );

  const streamSymbols = useMemo(
    () => prioritizeStreamSymbols(layout, watchlistSymbols, screenerSymbols, extraSymbols),
    [layout, watchlistSymbols, screenerSymbols, extraSymbols],
  );

  const symbolKey = symbolUniverse.join(",");
  const streamKey = streamSymbols.join(",");

  const activeCell = layout.cells[layout.activeCellIndex ?? 0];
  const activeSymbol = activeCell?.symbol?.trim().toUpperCase() ?? null;

  const candleRequests = useMemo(() => {
    const count = cellCountFor(layout.layoutId);
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
  }, [layout.layoutId, layout.cells]);

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
        activeCellIndex: layout.activeCellIndex ?? 0,
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
      void fetchRestWatchlistQuotes(
        streamSymbols,
        quoteScenario,
        quoteTraceId,
        dataConnectionPreference,
      )
        .then((payload) => {
          const { next, firstPaint } = applyRestQuotesPayload(payload, {
            traceId: quoteTraceId,
            scenario: quoteScenario,
            transport: "rest",
            startedAt: quotesFetchStartedRef.current,
          });
          setQuotesBySymbol(next);
          setQuoteError(null);
          if (payload.meta || next.size > 0) {
            setQuotesMeta(mergeQuotesMeta(next, payload.meta, null, false));
          }
          if (firstPaint) {
            quotesFirstPaintRef.current = true;
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

    const params = new URLSearchParams({
      symbols: streamSymbols.join(","),
      connectionId: dataConnectionPreference,
    });
    const source = new EventSource(`/api/stream/quotes?${params.toString()}`);
    let cancelled = false;
    let restFallbackStarted = false;

    const runRestFallback = (reason: string) => {
      if (cancelled || restFallbackStarted) return;
      restFallbackStarted = true;
      source.close();
      setQuotesTransport("rest");
      setQuoteError(null);
      const fallbackScenario = `watchlist-quotes-rest-fallback:${streamSymbols.length}-symbols`;
      const fallbackTraceId = createMarketDataTraceId(fallbackScenario);
      void fetchRestWatchlistQuotes(
        streamSymbols,
        fallbackScenario,
        fallbackTraceId,
        dataConnectionPreference,
      )
        .then((payload) => {
          if (cancelled) return;
          const { next, firstPaint } = applyRestQuotesPayload(payload, {
            traceId: fallbackTraceId,
            scenario: fallbackScenario,
            transport: "rest-fallback",
            startedAt: quotesFetchStartedRef.current,
          });
          setQuotesBySymbol(next);
          recordHealthEvent({
            kind: "transport_fallback",
            message: reason,
            recovered: true,
            dataset: "watchlist",
          });
          setQuotesMeta((prev) => mergeQuotesMeta(next, payload.meta, prev, false));
          if (firstPaint) {
            quotesFirstPaintRef.current = true;
          }
        })
        .catch((err) => {
          if (cancelled) return;
          recordHealthEvent({
            kind: "stream_error",
            message: err instanceof Error ? err.message : reason,
            recovered: false,
            dataset: "watchlist",
          });
          setQuoteError(err instanceof Error ? err.message : reason);
        })
        .finally(() => {
          if (!cancelled) {
            setQuotesLoading(false);
          }
        });
    };

    const firstPaintDeadlineMs = resolveQuoteStreamFirstPaintMs(quotesRef.current.size > 0);
    const firstPaintTimer = window.setTimeout(() => {
      runRestFallback("Quote stream first snapshot timeout");
    }, firstPaintDeadlineMs);

    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as {
          type?: string;
          quotes?: Record<string, unknown>[];
          message?: string;
          meta?: {
            source?: string;
            stale?: boolean;
            warnings?: string[];
            cacheTier?: string;
            asOf?: number;
          };
        };
        if (event.type === "error") {
          const recoverable = (event as { recoverable?: boolean }).recoverable;
          setQuoteError(event.message ?? "Quote stream error");
          if (recoverable === false) {
            runRestFallback(event.message ?? "Quote stream error");
          }
          return;
        }
        if (event.type === "snapshot" || event.type === "update") {
          const rows =
            event.quotes
              ?.map((row) => mapStreamQuote(row))
              .filter((row): row is QuoteSnapshot => row != null) ?? [];
          if (rows.length === 0) return;
          window.clearTimeout(firstPaintTimer);
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
              provider: event.meta?.source,
              source: event.meta?.source,
              counts: { quotes: next.size },
              count: next.size,
            });
          }
          setQuotesLoading(false);
          setQuoteError(null);
          setQuotesMeta((prev) =>
            mergeQuotesMeta(next, event.meta, prev, true),
          );
        }
      } catch {
        // Ignore malformed frames.
      }
    };

    source.onerror = () => {
      runRestFallback("Quote stream disconnected");
    };

    return () => {
      cancelled = true;
      window.clearTimeout(firstPaintTimer);
      source.close();
    };
  }, [streamKey, streamSymbols, reloadToken, dataConnectionPreference]);

  useEffect(() => {
    silentRevalidateKeyRef.current = null;
  }, [streamKey, reloadToken]);

  useEffect(() => {
    if (streamSymbols.length === 0 || quotesLoading) return;
    if (quotesBySymbol.size < streamSymbols.length) return;

    const asOf = oldestQuoteUpdatedAt(quotesBySymbol.values()) ?? quotesMeta?.asOf;
    if (asOf == null || !quotesMeta?.source) return;

    const provenance = provenanceFromMeta({
      source: quotesMeta.source,
      asOf,
      stale: quotesMeta.stale,
      warnings: quotesMeta.warnings ?? [],
      cacheTier: quotesMeta.cacheTier,
    });
    const maxDisplayAgeMs = getDatasetPolicy("watchlist_quotes").maxDisplayAgeMs ?? 60_000;
    const ageMs = Date.now() - asOf;
    const needsRefresh =
      !isDisplayFresh("watchlist_quotes", provenance) || ageMs > maxDisplayAgeMs * 0.8;
    if (!needsRefresh) return;

    const revalidateKey = `${streamKey}:${Math.floor(asOf / 1_000)}`;
    if (silentRevalidateKeyRef.current === revalidateKey) return;

    const timer = window.setTimeout(() => {
      silentRevalidateKeyRef.current = revalidateKey;
      const scenario = `watchlist-quotes-revalidate:${streamSymbols.length}-symbols`;
      const traceId = createMarketDataTraceId(scenario);
      void fetchRestWatchlistQuotes(
        streamSymbols,
        scenario,
        traceId,
        dataConnectionPreference,
      )
        .then((payload) => {
          if (!payload.quotes?.length) return;
          const next = new Map(quotesRef.current);
          for (const quote of payload.quotes) {
            const symbol = quote.symbol.trim().toUpperCase();
            next.set(symbol, { ...quote, symbol });
          }
          setQuotesBySymbol(next);
          setQuotesMeta((prev) => mergeQuotesMeta(next, payload.meta, prev, prev?.streaming));
        })
        .catch(() => {
          silentRevalidateKeyRef.current = null;
        });
    }, SILENT_REVALIDATE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [streamSymbols, streamKey, quotesBySymbol, quotesLoading, quotesMeta, dataConnectionPreference]);

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
