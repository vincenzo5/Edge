import type {
  ChartCandleStreamEvent,
  ChartCandleStreamSink,
  ChartDataFeed,
  ChartSubscriptionRequest,
} from '@edge/chart-core';
import { buildChartClientCacheKey } from './chartClientCache';

type StreamEntry = {
  refCount: number;
  unsubscribeTransport: () => void;
  sinks: Set<ChartCandleStreamSink>;
};

const entries = new Map<string, StreamEntry>();
let feedIdCounter = 0;
const feedIds = new WeakMap<ChartDataFeed, number>();

function getFeedId(feed: ChartDataFeed): number {
  let id = feedIds.get(feed);
  if (id == null) {
    id = ++feedIdCounter;
    feedIds.set(feed, id);
  }
  return id;
}

export function buildSharedCandleStreamKey(
  feed: ChartDataFeed,
  request: ChartSubscriptionRequest,
): string {
  const cacheKey = buildChartClientCacheKey({
    symbol: request.symbol,
    exchange: request.exchange,
    interval: request.interval,
    range: request.range,
    sessionMode: request.sessionMode,
  });
  return `${getFeedId(feed)}|${cacheKey}`;
}

function fanOut(entry: StreamEntry, event: ChartCandleStreamEvent): void {
  for (const sink of entry.sinks) {
    try {
      sink(event);
    } catch {
      // Isolate consumer failures so one bad sink does not break peers.
    }
  }
}

/** Ref-counted fan-out wrapper for identical candle stream tuples. */
export function subscribeSharedCandles(
  feed: ChartDataFeed,
  request: ChartSubscriptionRequest,
  sink: ChartCandleStreamSink,
): () => void {
  if (!feed.subscribeCandles) {
    return () => {};
  }

  const key = buildSharedCandleStreamKey(feed, request);
  let entry = entries.get(key);

  if (!entry) {
    const sinks = new Set<ChartCandleStreamSink>();
    const unsubscribeTransport = feed.subscribeCandles(request, (event) => {
      const current = entries.get(key);
      if (current) fanOut(current, event);
    });
    entry = { refCount: 0, unsubscribeTransport, sinks };
    entries.set(key, entry);
  }

  entry.sinks.add(sink);
  entry.refCount += 1;

  return () => {
    const current = entries.get(key);
    if (!current) return;
    current.sinks.delete(sink);
    current.refCount -= 1;
    if (current.refCount <= 0) {
      current.unsubscribeTransport();
      entries.delete(key);
    }
  };
}

/** Test-only reset. */
export function resetSharedCandleStreamRegistryForTests(): void {
  for (const entry of entries.values()) {
    entry.unsubscribeTransport();
  }
  entries.clear();
  feedIdCounter = 0;
}

/** Test-only active transport count. */
export function getSharedCandleStreamCountForTests(): number {
  return entries.size;
}
