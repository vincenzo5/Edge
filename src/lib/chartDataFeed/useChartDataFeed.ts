'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Candle,
  ChartCandleStreamEvent,
  ChartDataFeed,
  ChartDataMeta,
  Interval,
  MarketSessionMode,
  Range,
} from '@edge/chart-core';
import { applyCandleStreamEvent, intervalToMs, mergeCandlesPrependWithIdentity, trimResidentBarsWithIdentity, createCandleSeriesIdentity, type CandleSeriesIdentity } from '@edge/chart-core';
import { recordMarketDataTelemetry, type MarketDataPerfPhase } from '@/lib/marketData/telemetry';
import {
  buildChartClientCacheKey,
  patchChartClientCacheHasMore,
  readChartClientCache,
  writeChartClientCache,
  writeMergedChartClientCache,
} from './chartClientCache';
import { subscribeSharedCandles } from './sharedCandleStreamRegistry';

export type UseChartDataFeedOptions = {
  feed: ChartDataFeed;
  symbol: string;
  exchange?: string;
  interval: Interval;
  range: Range;
  sessionMode?: MarketSessionMode;
  /** Enable live candle subscription when the feed supports it. Default true. */
  live?: boolean;
  /** Bump to refetch candles for the same symbol/range/interval (e.g. after TWS recovery). */
  reloadKey?: number;
};

export type ChartDataFeedState = {
  candles: Candle[];
  seriesIdentity: CandleSeriesIdentity | undefined;
  loading: boolean;
  /** True while serving cached candles and a background refresh is in flight. */
  refreshing: boolean;
  error: string | null;
  meta: ChartDataMeta | null;
  hasMore: boolean;
  streaming: boolean;
  stale: boolean;
  streamError: string | null;
  lastUpdateAt: number | null;
  loadMore: (beforeTimestampMs: number) => Promise<Candle[]>;
};

const DEFAULT_META: ChartDataMeta = {
  source: 'yahoo',
  asOf: Date.now(),
  stale: false,
  warnings: [],
};

function buildMeta(
  base: ChartDataMeta | null,
  extras: {
    streaming: boolean;
    stale: boolean;
    streamError: string | null;
    lastUpdateAt: number | null;
  },
): ChartDataMeta | null {
  if (!base) return null;
  const lastUpdateAt = extras.lastUpdateAt ?? base.lastUpdateAt ?? base.asOf;
  return {
    ...base,
    streaming: extras.streaming,
    streamError: extras.streamError,
    lastUpdateAt,
    stale: extras.stale,
  };
}

export function useChartDataFeed(options: UseChartDataFeedOptions): ChartDataFeedState {
  const {
    feed,
    symbol,
    exchange,
    interval,
    range,
    sessionMode = 'regular',
    live = true,
    reloadKey = 0,
  } = options;
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ChartDataMeta | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [stale, setStale] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);

  const candlesRef = useRef<Candle[]>([]);
  const seriesIdentityRef = useRef<CandleSeriesIdentity | undefined>(undefined);
  const [seriesIdentity, setSeriesIdentity] = useState<CandleSeriesIdentity | undefined>(undefined);
  const fetchGenerationRef = useRef(0);
  const requestKeyRef = useRef('');
  const reloadKeyRef = useRef(reloadKey);
  const feedRef = useRef(feed);
  feedRef.current = feed;

  const streamStateRef = useRef({
    streaming: false,
    stale: false,
    streamError: null as string | null,
    lastUpdateAt: null as number | null,
  });

  const applyStreamState = useCallback((patch: Partial<typeof streamStateRef.current>) => {
    streamStateRef.current = { ...streamStateRef.current, ...patch };
    setStreaming(streamStateRef.current.streaming);
    setStale(streamStateRef.current.stale);
    setStreamError(streamStateRef.current.streamError);
    setLastUpdateAt(streamStateRef.current.lastUpdateAt);
    setMeta((current) =>
      buildMeta(current ?? DEFAULT_META, streamStateRef.current),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const abortController = new AbortController();
    const generation = ++fetchGenerationRef.current;
    const requestKey = buildChartClientCacheKey({
      symbol,
      exchange,
      interval,
      range,
      sessionMode,
    });
    const keyChanged = requestKeyRef.current !== requestKey;
    const reloadTriggered = reloadKeyRef.current !== reloadKey;
    requestKeyRef.current = requestKey;
    reloadKeyRef.current = reloadKey;

    let paintedFromCache = false;
    if (keyChanged || reloadTriggered) {
      if (keyChanged && !reloadTriggered) {
        const cached = readChartClientCache(requestKey);
        if (cached) {
          paintedFromCache = true;
          candlesRef.current = cached.candles;
          seriesIdentityRef.current = createCandleSeriesIdentity(cached.candles);
          setSeriesIdentity(seriesIdentityRef.current);
          setCandles(cached.candles);
          setHasMore(cached.hasMore);
          setLoading(false);
          setRefreshing(true);
          streamStateRef.current = {
            streaming: false,
            stale: true,
            streamError: null,
            lastUpdateAt: cached.asOf,
          };
          setStreaming(false);
          setStale(true);
          setStreamError(null);
          setLastUpdateAt(cached.asOf);
          setMeta(
            buildMeta({ ...cached.meta, stale: true }, streamStateRef.current),
          );
        } else {
          candlesRef.current = [];
          seriesIdentityRef.current = undefined;
          setSeriesIdentity(undefined);
          setCandles([]);
          setLoading(true);
          setRefreshing(false);
        }
      } else {
        candlesRef.current = [];
        seriesIdentityRef.current = undefined;
        setSeriesIdentity(undefined);
        setCandles([]);
        setLoading(true);
        setRefreshing(false);
      }
    } else if (candlesRef.current.length === 0) {
      setLoading(true);
      setRefreshing(false);
    }

    setError(null);
    if (!paintedFromCache) {
      applyStreamState({
        streaming: false,
        stale: false,
        streamError: null,
        lastUpdateAt: null,
      });
    }

    const handleStreamEvent = (event: ChartCandleStreamEvent) => {
      if (cancelled || generation !== fetchGenerationRef.current) return;

      switch (event.type) {
        case 'snapshot':
        case 'append':
        case 'replace-latest': {
          // Poll primes independently of the chart tip. A replace-latest whose
          // timestamp is a full bar ahead is a real new bar that arrived while
          // the chart was loading — apply as append so we do not drop the tip.
          let applyEvent = event;
          if (event.type === 'replace-latest') {
            const chartLast = candlesRef.current[candlesRef.current.length - 1];
            if (
              chartLast &&
              event.candle.t > chartLast.t &&
              event.candle.t - chartLast.t >= intervalToMs(interval)
            ) {
              applyEvent = { type: 'append', candle: event.candle, meta: event.meta };
            }
          }
          const applied = applyCandleStreamEvent(
            candlesRef.current,
            applyEvent,
            seriesIdentityRef.current,
          );
          candlesRef.current = applied.candles;
          seriesIdentityRef.current = applied.identity;
          setSeriesIdentity(applied.identity);
          setCandles(applied.candles);
          const now = Date.now();
          const nextMeta = buildMeta(applied.meta ?? event.meta, {
            ...streamStateRef.current,
            stale: false,
            streamError: null,
            lastUpdateAt: now,
          });
          setMeta(nextMeta);
          streamStateRef.current = {
            ...streamStateRef.current,
            stale: false,
            streamError: null,
            lastUpdateAt: now,
          };
          setStale(false);
          setStreamError(null);
          setLastUpdateAt(now);
          break;
        }
        case 'refresh': {
          const now = Date.now();
          const nextMeta = buildMeta(event.meta, {
            ...streamStateRef.current,
            stale: false,
            streamError: null,
            lastUpdateAt: now,
          });
          setMeta(nextMeta);
          streamStateRef.current = {
            ...streamStateRef.current,
            stale: false,
            streamError: null,
            lastUpdateAt: now,
          };
          setStale(false);
          setStreamError(null);
          setLastUpdateAt(now);
          break;
        }
        case 'stale':
          applyStreamState({
            stale: true,
            streamError: event.reason,
            lastUpdateAt: streamStateRef.current.lastUpdateAt,
          });
          setMeta(buildMeta(event.meta, streamStateRef.current));
          break;
        case 'reconnect':
          applyStreamState({
            streamError: null,
            streaming: true,
          });
          break;
        case 'error':
          applyStreamState({
            streamError: event.message,
            streaming: event.recoverable,
          });
          if (event.meta) {
            setMeta(buildMeta(event.meta, streamStateRef.current));
          }
          break;
      }
    };

    void (async () => {
      const requestStartedAt = Date.now();
      try {
        const result = await feedRef.current.loadCandles({
          symbol,
          exchange,
          interval,
          range,
          sessionMode,
          signal: abortController.signal,
        });
        if (cancelled || generation !== fetchGenerationRef.current) return;
        const loadedAt = Date.now();
        const resultMeta = result.meta ?? DEFAULT_META;
        const leftHistory = reloadTriggered ? [] : candlesRef.current;
        const prepended =
          !reloadTriggered && leftHistory.length > 0
            ? mergeCandlesPrependWithIdentity(result.candles, leftHistory, seriesIdentityRef.current)
            : {
                candles: result.candles,
                identity: createCandleSeriesIdentity(result.candles),
              };
        const trimmed = trimResidentBarsWithIdentity(
          prepended.candles,
          prepended.identity,
        );
        const mergedCandles = trimmed.candles;
        seriesIdentityRef.current = trimmed.identity;
        setSeriesIdentity(trimmed.identity);
        const mergedHasMore = reloadTriggered
          ? (result.hasMore ?? result.candles.length > 0)
          : (result.hasMore ??
              readChartClientCache(requestKey)?.hasMore ??
              mergedCandles.length > result.candles.length);
        candlesRef.current = mergedCandles;
        setCandles(mergedCandles);
        recordMarketDataTelemetry('chart.candles.firstPaint', {
          traceId: result.meta?.traceId,
          scenario: `chart-load:${symbol}:${interval}:${range ?? '1y'}`,
          layer: 'chart',
          ok: true,
          clientMs: loadedAt - requestStartedAt,
          durationMs: loadedAt - requestStartedAt,
          symbol,
          interval,
          range,
          counts: { bars: result.candles.length },
          barCount: result.candles.length,
          cacheTier: result.meta?.cacheTier,
          provider: result.meta?.source,
          source: result.meta?.source,
          serverMs: result.meta?.latencyMs,
          serverPhases: result.meta?.phases as MarketDataPerfPhase[] | undefined,
        });
        streamStateRef.current.lastUpdateAt = loadedAt;
        setLastUpdateAt(loadedAt);
        setMeta(
          buildMeta(result.meta ?? DEFAULT_META, {
            streaming: false,
            stale: false,
            streamError: null,
            lastUpdateAt: loadedAt,
          }),
        );
        setHasMore(mergedHasMore);
        setStale(false);
        setRefreshing(false);
        if (reloadTriggered) {
          writeChartClientCache(requestKey, {
            candles: mergedCandles,
            meta: resultMeta,
            hasMore: mergedHasMore,
            asOf: loadedAt,
          });
        } else {
          writeMergedChartClientCache(requestKey, {
            rightEdgeCandles: result.candles,
            leftHistoryCandles: leftHistory.length > 0 ? leftHistory : undefined,
            meta: resultMeta,
            hasMore: mergedHasMore,
            asOf: loadedAt,
          });
        }

        if (live && feedRef.current.subscribeCandles) {
          unsubscribe = subscribeSharedCandles(
            feedRef.current,
            { symbol, exchange, interval, range, sessionMode },
            handleStreamEvent,
          );
          applyStreamState({ streaming: true, streamError: null });
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load chart data');
          setRefreshing(false);
          if (paintedFromCache) {
            streamStateRef.current = {
              ...streamStateRef.current,
              stale: true,
              streaming: false,
            };
            setStale(true);
            setStreaming(false);
            setMeta((current) =>
              buildMeta(current ?? DEFAULT_META, streamStateRef.current),
            );
          } else {
            applyStreamState({ streaming: false });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      abortController.abort();
      unsubscribe?.();
      applyStreamState({ streaming: false });
    };
  }, [symbol, exchange, interval, range, sessionMode, live, reloadKey, applyStreamState]);

  const loadMore = useCallback(async (beforeTimestampMs: number): Promise<Candle[]> => {
    const loader = feedRef.current.loadMoreCandles;
    if (!loader) return [];
    const cacheKey = buildChartClientCacheKey({
      symbol,
      exchange,
      interval,
      range,
      sessionMode,
    });
    const result = await loader({
      symbol,
      exchange,
      interval,
      beforeTimestamp: beforeTimestampMs,
      sessionMode,
    });
    if (result.candles.length === 0) {
      setHasMore(false);
      patchChartClientCacheHasMore(cacheKey, false);
      return [];
    }
    const prepended = mergeCandlesPrependWithIdentity(
      candlesRef.current,
      result.candles,
      seriesIdentityRef.current,
    );
    const trimmed = trimResidentBarsWithIdentity(prepended.candles, prepended.identity);
    const merged = trimmed.candles;
    seriesIdentityRef.current = trimmed.identity;
    setSeriesIdentity(trimmed.identity);
    const nextHasMore = result.hasMore ?? true;
    const nextMeta = result.meta ?? meta ?? DEFAULT_META;
    const asOf = Date.now();
    candlesRef.current = merged;
    setCandles(merged);
    setMeta(buildMeta(nextMeta, streamStateRef.current));
    setHasMore(nextHasMore);
    writeChartClientCache(cacheKey, {
      candles: merged,
      meta: nextMeta,
      hasMore: nextHasMore,
      asOf,
    });
    return result.candles;
  }, [symbol, exchange, interval, range, sessionMode, meta]);

  return {
    candles,
    seriesIdentity,
    loading,
    refreshing,
    error,
    meta,
    hasMore,
    streaming,
    stale,
    streamError,
    lastUpdateAt,
    loadMore,
  };
}
