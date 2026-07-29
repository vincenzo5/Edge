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
import { resolveQuoteStreamFirstPaintMs, QUOTE_STREAM_SLOW_FIRST_PAINT_MS } from "@/lib/marketData/quoteStreamPolicy";
import { recordHealthEvent } from "@/lib/marketData/healthEvents";
import { getDatasetPolicy, isDisplayFresh, provenanceFromMeta } from "@/lib/marketData/trust/dataTrust";
import { resolveWatchlistRestPollIntervalMs } from "@/lib/marketData/watchlistDeliveryFreshness";
import { useDataConnectionPreference } from "@/lib/marketData/useDataConnectionPreference";
import { useDataProviderPreference } from "@/lib/marketData/useDataProviderPreference";
import type { DataProviderPreference } from "@/lib/connections/types";
import { setTwsRecoveryContext } from "@/lib/marketData/twsRecoveryContext";
import {
  clearQuotesStore,
  getAllQuotes,
  getQuoteCount,
  mergeQuoteUpdates,
  replaceQuotes,
} from "@/lib/marketData/quotesStore";
import { useQuotesForSymbols } from "@/lib/marketData/useQuotes";

export type WatchlistQuotesTransport = "rest" | "sse";

export type RecoveryCandleRequest = {
  symbol: string;
  interval: string;
  range?: string;
};

type MarketDataContextValue = {
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
    receivedAt?: number;
    stale?: boolean;
    warnings?: string[];
  };
};

async function fetchRestWatchlistQuotes(
  symbols: string[],
  scenario: string,
  traceId: string,
  connectionId?: string,
  providerPreference?: DataProviderPreference,
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
      ...(providerPreference ? { providerPreference } : {}),
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
    transport: WatchlistQuotesTransport | "rest-fallback" | "rest-poll";
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
    recordQuoteFirstPaintTelemetry({
      traceId: payload.meta?.traceId ?? options.traceId,
      scenario: options.scenario,
      transport: options.transport,
      clientMs: options.startedAt != null ? Date.now() - options.startedAt : undefined,
      serverMs: payload.meta?.latencyMs,
      cacheTier: payload.meta?.cacheTier as ChartDataMeta["cacheTier"],
      provider: payload.meta?.source,
      source: payload.meta?.source,
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
  quotes: ReadonlyMap<string, QuoteSnapshot>,
  meta: RestQuotesResponse["meta"] | undefined,
  prev: Partial<ChartDataMeta> | null | undefined,
  streaming?: boolean,
  deliveredAt?: number,
): Partial<ChartDataMeta> {
  const asOf = oldestQuoteUpdatedAt(quotes.values()) ?? meta?.asOf ?? prev?.asOf ?? Date.now();
  const lastUpdateAt = deliveredAt ?? meta?.receivedAt ?? prev?.lastUpdateAt ?? Date.now();
  return {
    ...prev,
    ...(meta?.source ? { source: meta.source as ChartDataMeta["source"] } : {}),
    asOf,
    lastUpdateAt,
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

type WarmupInFlight = {
  key: string;
  promise: Promise<void>;
};

let warmupInFlight: WarmupInFlight | null = null;

function buildWarmupRequestKey(
  symbolKey: string,
  candleKey: string,
  activeSymbol: string | null,
  activeCellIndex: number,
): string {
  return `${symbolKey}|${candleKey}|${activeSymbol ?? ""}|${activeCellIndex}`;
}

function recordQuoteFirstPaintTelemetry(options: {
  traceId: string;
  scenario: string;
  transport: WatchlistQuotesTransport | "rest-fallback" | "rest-poll";
  clientMs: number | undefined;
  serverMs?: number;
  cacheTier?: ChartDataMeta["cacheTier"];
  provider?: string;
  source?: string;
  count: number;
  serverPhases?: import("@/lib/marketData/telemetry/perfPhases").MarketDataPerfPhase[];
}): void {
  recordMarketDataTelemetry("quotes.firstPaint", {
    traceId: options.traceId,
    scenario: options.scenario,
    layer: "client",
    ok: true,
    clientMs: options.clientMs,
    durationMs: options.clientMs,
    serverMs: options.serverMs,
    cacheTier: options.cacheTier,
    provider: options.provider,
    source: options.source,
    transport: options.transport,
    counts: { quotes: options.count },
    count: options.count,
    serverPhases: options.serverPhases,
  });
  if (options.clientMs != null && options.clientMs > QUOTE_STREAM_SLOW_FIRST_PAINT_MS) {
    recordHealthEvent({
      kind: "stream_error",
      message: `Quote stream slow first paint (${options.clientMs}ms)`,
      recovered: true,
      dataset: "watchlist",
    });
  }
}

async function postMarketDataWarmup(args: {
  key: string;
  universe: string[];
  requests: RecoveryCandleRequest[];
  activeSymbol: string | null;
  activeCellIndex: number;
}): Promise<void> {
  if (warmupInFlight?.key === args.key) {
    return warmupInFlight.promise;
  }

  const scenario = `warmup:layout:${args.universe.length}-symbols:${args.requests.length}-charts`;
  const traceId = createMarketDataTraceId(scenario);
  const startedAt = Date.now();
  recordMarketDataTelemetry("warmup.request", {
    traceId,
    scenario,
    layer: "client",
    ok: true,
    counts: {
      symbols: args.universe.length,
      candles: args.requests.length,
    },
    symbols: args.universe.length,
    candles: args.requests.length,
    optionsSymbol: args.activeSymbol,
  });

  const promise = fetch("/api/market-data/warmup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...marketDataTraceHeaders(traceId, scenario),
    },
    body: JSON.stringify({
      symbols: args.universe,
      candleRequests: args.requests,
      optionsSymbol: args.activeSymbol ?? undefined,
      activeCellIndex: args.activeCellIndex,
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
    })
    .then(() => undefined);

  warmupInFlight = { key: args.key, promise };
  void promise.finally(() => {
    if (warmupInFlight?.key === args.key) {
      warmupInFlight = null;
    }
  });
  return promise;
}

/** Test-only reset for warmup coalesce state. */
export function resetMarketDataWarmupInFlightForTests(): void {
  warmupInFlight = null;
}

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
  const { preference: dataProviderPreference } = useDataProviderPreference();
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quotesMeta, setQuotesMeta] = useState<Partial<ChartDataMeta> | null>(null);
  const [quotesTransport, setQuotesTransport] = useState<WatchlistQuotesTransport>(() =>
    watchlistStreamEnabled() ? "sse" : "rest",
  );
  const quoteCountRef = useRef(0);
  quoteCountRef.current = getQuoteCount();
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

  const symbolUniverseRef = useRef(symbolUniverse);
  symbolUniverseRef.current = symbolUniverse;
  const candleRequestsRef = useRef(candleRequests);
  candleRequestsRef.current = candleRequests;
  const streamSymbolsRef = useRef(streamSymbols);
  streamSymbolsRef.current = streamSymbols;

  const candleKey = candleRequests
    .map((row) => `${row.symbol}|${row.interval}|${row.range ?? "1y"}`)
    .join(";");

  useEffect(() => {
    const universe = symbolUniverseRef.current;
    const requests = candleRequestsRef.current;
    if (universe.length === 0 && !activeSymbol) return;

    const warmupKey = buildWarmupRequestKey(
      symbolKey,
      candleKey,
      activeSymbol,
      layout.activeCellIndex ?? 0,
    );
    void postMarketDataWarmup({
      key: warmupKey,
      universe,
      requests,
      activeSymbol,
      activeCellIndex: layout.activeCellIndex ?? 0,
    });
  }, [symbolKey, candleKey, activeSymbol, reloadToken, layout.activeCellIndex]);

  useEffect(() => {
    const symbols = streamSymbolsRef.current;
    if (symbols.length === 0) {
      clearQuotesStore();
      setQuotesLoading(false);
      setQuoteError(null);
      setQuotesMeta(null);
      setQuotesTransport("rest");
      return;
    }

    if (!watchlistStreamEnabled()) {
      setQuotesTransport("rest");
      setQuoteError(null);
      return;
    }

    setQuotesTransport("sse");
    setQuotesLoading(quoteCountRef.current === 0);
    setQuoteError(null);
    quotesFirstPaintRef.current = false;
    quotesFetchStartedRef.current = Date.now();
    setQuotesMeta((prev) => ({
      ...prev,
      streaming: true,
      asOf: Date.now(),
    }));
    const streamScenario = `watchlist-quotes-stream:${symbols.length}-symbols`;
    const streamTraceId = createMarketDataTraceId(streamScenario);

    const params = new URLSearchParams({
      symbols: symbols.join(","),
      connectionId: dataConnectionPreference,
      providerPreference: JSON.stringify(dataProviderPreference),
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
      setQuotesLoading(quoteCountRef.current === 0);
      recordHealthEvent({
        kind: "transport_fallback",
        message: reason,
        recovered: true,
        dataset: "watchlist",
      });
    };

    const firstPaintDeadlineMs = resolveQuoteStreamFirstPaintMs(quoteCountRef.current > 0);
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
            receivedAt?: number;
            lastUpdateAt?: number;
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
        if (event.type === "refresh") {
          const deliveredAt = event.meta?.lastUpdateAt ?? event.meta?.receivedAt ?? Date.now();
          setQuotesMeta((prev) =>
            mergeQuotesMeta(getAllQuotes(), event.meta, prev, true, deliveredAt),
          );
          setQuoteError(null);
          return;
        }
        if (event.type === "snapshot" || event.type === "update") {
          const rows =
            event.quotes
              ?.map((row) => mapStreamQuote(row))
              .filter((row): row is QuoteSnapshot => row != null) ?? [];
          if (rows.length === 0) return;
          window.clearTimeout(firstPaintTimer);
          const deliveredAt = event.meta?.receivedAt ?? Date.now();
          mergeQuoteUpdates(rows);
          quoteCountRef.current = getQuoteCount();
          if (!quotesFirstPaintRef.current && getQuoteCount() > 0) {
            quotesFirstPaintRef.current = true;
            recordQuoteFirstPaintTelemetry({
              traceId: streamTraceId,
              scenario: streamScenario,
              transport: "sse",
              clientMs:
                quotesFetchStartedRef.current != null
                  ? Date.now() - quotesFetchStartedRef.current
                  : undefined,
              provider: event.meta?.source,
              source: event.meta?.source,
              count: getQuoteCount(),
            });
          }
          setQuotesLoading(false);
          setQuoteError(null);
          setQuotesMeta((prev) =>
            mergeQuotesMeta(getAllQuotes(), event.meta, prev, true, deliveredAt),
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
  }, [streamKey, reloadToken, dataConnectionPreference, dataProviderPreference]);

  useEffect(() => {
    const symbols = streamSymbolsRef.current;
    if (symbols.length === 0 || quotesTransport !== "rest") return;

    let cancelled = false;
    let inFlight = false;
    let timer: number | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => {
        void runFetch(`watchlist-quotes-rest-poll:${symbols.length}-symbols`, "rest-poll");
      }, resolveWatchlistRestPollIntervalMs());
    };

    const runFetch = async (
      scenario: string,
      transport: WatchlistQuotesTransport | "rest-fallback" | "rest-poll",
    ) => {
      if (cancelled || inFlight) {
        scheduleNext();
        return;
      }
      inFlight = true;
      const traceId = createMarketDataTraceId(scenario);
      if (quoteCountRef.current === 0) {
        setQuotesLoading(true);
      }
      try {
        const payload = await fetchRestWatchlistQuotes(
          symbols,
          scenario,
          traceId,
          dataConnectionPreference,
          dataProviderPreference,
        );
        if (cancelled) return;
        const deliveredAt = payload.meta?.receivedAt ?? Date.now();
        const { next, firstPaint } = applyRestQuotesPayload(payload, {
          traceId,
          scenario,
          transport,
          startedAt: quotesFetchStartedRef.current,
        });
        if (next.size > 0) {
          replaceQuotes(next);
          quoteCountRef.current = getQuoteCount();
          setQuoteError(null);
          setQuotesMeta((prev) => mergeQuotesMeta(next, payload.meta, prev, false, deliveredAt));
          if (firstPaint) {
            quotesFirstPaintRef.current = true;
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (quoteCountRef.current === 0) {
          recordHealthEvent({
            kind: "stream_error",
            message: err instanceof Error ? err.message : "Failed to load quotes",
            recovered: false,
            dataset: "watchlist",
          });
          setQuoteError(err instanceof Error ? err.message : "Failed to load quotes");
        }
      } finally {
        inFlight = false;
        if (!cancelled) {
          setQuotesLoading(false);
          scheduleNext();
        }
      }
    };

    quotesFirstPaintRef.current = false;
    quotesFetchStartedRef.current = Date.now();
    void runFetch(`watchlist-quotes:${symbols.length}-symbols`, "rest");

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [streamKey, quotesTransport, reloadToken, dataConnectionPreference, dataProviderPreference]);

  useEffect(() => {
    silentRevalidateKeyRef.current = null;
  }, [streamKey, reloadToken]);

  useEffect(() => {
    const symbols = streamSymbolsRef.current;
    if (symbols.length === 0 || quotesLoading) return;
    if (quotesTransport === "rest") return;
    if (getQuoteCount() < symbols.length) return;

    const deliveryAt = quotesMeta?.lastUpdateAt;
    if (deliveryAt == null || !quotesMeta?.source) return;

    const provenance = provenanceFromMeta({
      source: quotesMeta.source,
      asOf: quotesMeta.asOf,
      receivedAt: deliveryAt,
      stale: quotesMeta.stale,
      warnings: quotesMeta.warnings ?? [],
      cacheTier: quotesMeta.cacheTier,
    });
    const maxDisplayAgeMs = getDatasetPolicy("watchlist_quotes").maxDisplayAgeMs ?? 60_000;
    const ageMs = Date.now() - deliveryAt;
    const needsRefresh =
      !isDisplayFresh("watchlist_quotes", provenance) || ageMs > maxDisplayAgeMs * 0.8;
    if (!needsRefresh) return;

    const revalidateKey = `${streamKey}:${Math.floor(deliveryAt / 1_000)}`;
    if (silentRevalidateKeyRef.current === revalidateKey) return;

    const timer = window.setTimeout(() => {
      silentRevalidateKeyRef.current = revalidateKey;
      const scenario = `watchlist-quotes-revalidate:${symbols.length}-symbols`;
      const traceId = createMarketDataTraceId(scenario);
      void fetchRestWatchlistQuotes(
        symbols,
        scenario,
        traceId,
        dataConnectionPreference,
        dataProviderPreference,
      )
        .then((payload) => {
          if (!payload.quotes?.length) return;
          const next = new Map(getAllQuotes());
          for (const quote of payload.quotes) {
            const symbol = quote.symbol.trim().toUpperCase();
            next.set(symbol, { ...quote, symbol });
          }
          replaceQuotes(next);
          quoteCountRef.current = getQuoteCount();
          const deliveredAt = payload.meta?.receivedAt ?? Date.now();
          setQuotesMeta((prev) =>
            mergeQuotesMeta(next, payload.meta, prev, prev?.streaming, deliveredAt),
          );
        })
        .catch(() => {
          silentRevalidateKeyRef.current = null;
        });
    }, SILENT_REVALIDATE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [streamKey, quotesLoading, quotesMeta, quotesTransport, dataConnectionPreference, dataProviderPreference]);

  useEffect(() => {
    setTwsRecoveryContext({
      symbols: symbolUniverse,
      candleRequests,
      optionsSymbol: activeSymbol ?? undefined,
    });
  }, [symbolUniverse, candleRequests, activeSymbol]);

  const value = useMemo(
    (): MarketDataContextValue => ({
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
  const quotes = useQuotesForSymbols(symbols);
  const marketData = useMarketDataQuotes();

  if (!marketData) {
    return { quotes: [], loading: false, error: null };
  }

  return {
    quotes,
    loading: marketData.quotesLoading && quotes.length === 0,
    error: marketData.quoteError,
  };
}

export { useQuote, useQuotesForSymbols, useQuoteCount, useAllQuotes } from "@/lib/marketData/useQuotes";
