import type {
  Candle,
  ChartCandleStreamSink,
  ChartQuoteStreamSink,
  Interval,
} from '@edge/chart-core';
import {
  applyCandleAppend,
  applyCandleReplaceLatest,
} from '@edge/chart-core';
import { diffCandlesToStreamEvents } from './streamDiff';

type PollCandleLoader = () => Promise<{
  candles: Candle[];
  meta: import('@edge/chart-core').ChartDataMeta;
}>;

type PollQuoteLoader = () => Promise<{
  quotes: import('@edge/chart-core').MarketQuote[];
  meta: import('@edge/chart-core').ChartDataMeta;
}>;

export function candlePollIntervalMs(interval: Interval): number {
  switch (interval) {
    case '1m':
      return 15_000;
    case '5m':
      return 30_000;
    case '15m':
      return 45_000;
    case '30m':
      return 60_000;
    case '1h':
    case '2h':
      return 60_000;
    case '1d':
    case '1wk':
    case '1mo':
      return 120_000;
    default:
      return 30_000;
  }
}

export const QUOTE_POLL_INTERVAL_MS = 15_000;
export const MAX_POLL_FAILURES_BEFORE_STALE = 3;

export function createPollingCandleSubscription(
  loadLatest: PollCandleLoader,
  intervalMs: number,
  sink: ChartCandleStreamSink,
): () => void {
  let cancelled = false;
  let primed = false;
  let failureCount = 0;
  let lastCandles: Candle[] = [];

  const poll = async () => {
    if (cancelled) return;
    try {
      const result = await loadLatest();
      if (cancelled) return;
      failureCount = 0;

      const normalized = result.candles;
      if (normalized.length === 0) return;

      if (!primed) {
        lastCandles = normalized;
        primed = true;
        return;
      }

      const events = diffCandlesToStreamEvents(lastCandles, normalized, result.meta);
      for (const event of events) {
        if (event.type === 'replace-latest') {
          lastCandles = applyCandleReplaceLatest(lastCandles, event.candle);
        } else if (event.type === 'append') {
          lastCandles = applyCandleAppend(lastCandles, event.candle);
        } else if (event.type === 'snapshot') {
          lastCandles = event.candles;
        }
        sink(event);
      }
      if (events.length === 0) {
        return;
      }

      if (result.meta.stale) {
        sink({ type: 'stale', reason: 'provider marked data stale', meta: result.meta });
      }
    } catch (error) {
      if (cancelled) return;
      failureCount += 1;
      const message = error instanceof Error ? error.message : 'Polling failed';
      sink({ type: 'error', message, recoverable: true });
      if (failureCount >= MAX_POLL_FAILURES_BEFORE_STALE) {
        sink({
          type: 'stale',
          reason: message,
          meta: {
            source: 'mixed',
            asOf: Date.now(),
            stale: true,
            warnings: [message],
          },
        });
      }
    }
  };

  void poll();
  const timer = setInterval(() => {
    void poll();
  }, intervalMs);

  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}

export function createPollingQuoteSubscription(
  loadLatest: PollQuoteLoader,
  intervalMs: number,
  sink: ChartQuoteStreamSink,
): () => void {
  let cancelled = false;
  let primed = false;
  let failureCount = 0;

  const poll = async () => {
    if (cancelled) return;
    try {
      const result = await loadLatest();
      if (cancelled) return;
      failureCount = 0;

      if (!primed) {
        primed = true;
        sink({ type: 'snapshot', quotes: result.quotes, meta: result.meta });
        return;
      }

      sink({ type: 'update', quotes: result.quotes, meta: result.meta });
      if (result.meta.stale) {
        sink({ type: 'stale', reason: 'provider marked quotes stale', meta: result.meta });
      }
    } catch (error) {
      if (cancelled) return;
      failureCount += 1;
      const message = error instanceof Error ? error.message : 'Quote polling failed';
      sink({ type: 'error', message, recoverable: true });
      if (failureCount >= MAX_POLL_FAILURES_BEFORE_STALE) {
        sink({
          type: 'stale',
          reason: message,
          meta: {
            source: 'mixed',
            asOf: Date.now(),
            stale: true,
            warnings: [message],
          },
        });
      }
    }
  };

  void poll();
  const timer = setInterval(() => {
    void poll();
  }, intervalMs);

  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}
