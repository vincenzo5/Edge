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
import { applyCandleStreamEvent } from '@edge/chart-core';
import { mergeCandlesPrepend } from '@/lib/chart/series';
import { recordMarketDataTelemetry, type MarketDataPerfPhase } from '@/lib/marketData/telemetry';

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
  loading: boolean;
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
  return {
    ...base,
    streaming: extras.streaming,
    streamError: extras.streamError,
    lastUpdateAt: extras.lastUpdateAt ?? base.lastUpdateAt ?? base.asOf,
    stale: extras.stale || base.stale,
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
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ChartDataMeta | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [stale, setStale] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);

  const candlesRef = useRef<Candle[]>([]);
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
    const generation = ++fetchGenerationRef.current;
    const requestKey = `${symbol}|${exchange ?? ''}|${interval}|${range ?? ''}|${sessionMode}`;
    const keyChanged = requestKeyRef.current !== requestKey;
    const reloadTriggered = reloadKeyRef.current !== reloadKey;
    requestKeyRef.current = requestKey;
    reloadKeyRef.current = reloadKey;
    if (keyChanged || reloadTriggered) {
      candlesRef.current = [];
      setCandles([]);
      setLoading(true);
    } else if (candlesRef.current.length === 0) {
      setLoading(true);
    }
    setError(null);
    applyStreamState({
      streaming: false,
      stale: false,
      streamError: null,
      lastUpdateAt: null,
    });

    const handleStreamEvent = (event: ChartCandleStreamEvent) => {
      if (cancelled || generation !== fetchGenerationRef.current) return;

      switch (event.type) {
        case 'snapshot':
        case 'append':
        case 'replace-latest': {
          const applied = applyCandleStreamEvent(candlesRef.current, event);
          candlesRef.current = applied.candles;
          setCandles(applied.candles);
          const nextMeta = buildMeta(applied.meta ?? event.meta, {
            ...streamStateRef.current,
            stale: false,
            streamError: null,
            lastUpdateAt: Date.now(),
          });
          setMeta(nextMeta);
          streamStateRef.current = {
            ...streamStateRef.current,
            stale: false,
            streamError: null,
            lastUpdateAt: Date.now(),
          };
          setStale(false);
          setStreamError(null);
          setLastUpdateAt(Date.now());
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
        });
        if (cancelled || generation !== fetchGenerationRef.current) return;
        candlesRef.current = result.candles;
        setCandles(result.candles);
        const loadedAt = Date.now();
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
            stale: result.meta?.stale ?? false,
            streamError: null,
            lastUpdateAt: loadedAt,
          }),
        );
        setHasMore(result.hasMore ?? result.candles.length > 0);
        setStale(result.meta?.stale ?? false);

        if (live && feedRef.current.subscribeCandles) {
          unsubscribe = feedRef.current.subscribeCandles(
            { symbol, exchange, interval, range, sessionMode },
            handleStreamEvent,
          );
          applyStreamState({ streaming: true, streamError: null });
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load chart data');
          applyStreamState({ streaming: false });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      applyStreamState({ streaming: false });
    };
  }, [symbol, exchange, interval, range, sessionMode, live, reloadKey, applyStreamState]);

  const loadMore = useCallback(async (beforeTimestampMs: number): Promise<Candle[]> => {
    const loader = feedRef.current.loadMoreCandles;
    if (!loader) return [];
    const result = await loader({
      symbol,
      exchange,
      interval,
      beforeTimestamp: beforeTimestampMs,
      sessionMode,
    });
    if (result.candles.length === 0) {
      setHasMore(false);
      return [];
    }
    const merged = mergeCandlesPrepend(candlesRef.current, result.candles);
    candlesRef.current = merged;
    setCandles(merged);
    setMeta(
      buildMeta(result.meta ?? meta ?? DEFAULT_META, streamStateRef.current),
    );
    setHasMore(result.hasMore ?? true);
    return result.candles;
  }, [symbol, exchange, interval, sessionMode, meta]);

  return {
    candles,
    loading,
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
