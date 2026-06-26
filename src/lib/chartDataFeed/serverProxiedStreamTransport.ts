import type {
  ChartCandleRequest,
  ChartCandleStreamEvent,
  ChartCandleStreamSink,
  ChartQuoteRequest,
  ChartQuoteStreamEvent,
  ChartQuoteStreamSink,
  Interval,
  Range,
} from '@edge/chart-core';
import type { StreamTransport, StreamTransportOptions } from './streamTransport';

function buildCandleStreamUrl(
  baseUrl: string,
  request: ChartCandleRequest,
): string {
  const params = new URLSearchParams({
    symbol: request.symbol,
    interval: request.interval,
    range: request.range ?? '1y',
  });
  if (request.exchange) params.set('exchange', request.exchange);
  const prefix = baseUrl.replace(/\/$/, '');
  return `${prefix}/api/stream/candles?${params.toString()}`;
}

function buildQuoteStreamUrl(
  baseUrl: string,
  request: ChartQuoteRequest,
): string {
  const params = new URLSearchParams({
    symbols: request.symbols.join(','),
  });
  const prefix = baseUrl.replace(/\/$/, '');
  return `${prefix}/api/stream/quotes?${params.toString()}`;
}

function parseStreamEvent<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Opens an SSE connection to the server-proxied stream endpoint.
 * Falls back to polling when EventSource is unavailable (SSR/tests).
 */
export function createServerProxiedCandleSubscription(
  request: ChartCandleRequest,
  sink: ChartCandleStreamSink,
  options?: StreamTransportOptions,
): () => void {
  if (typeof EventSource === 'undefined') {
    sink({
      type: 'error',
      message: 'EventSource is not available',
      recoverable: false,
    });
    return () => {};
  }

  const url = buildCandleStreamUrl(options?.baseUrl ?? '', request);
  const source = new EventSource(url);
  let closed = false;

  source.onmessage = (message) => {
    const event = parseStreamEvent<ChartCandleStreamEvent>(message.data);
    if (event) sink(event);
  };

  source.onerror = () => {
    if (closed) return;
    sink({
      type: 'error',
      message: 'Stream connection lost',
      recoverable: true,
    });
  };

  return () => {
    closed = true;
    source.close();
  };
}

export function createServerProxiedQuoteSubscription(
  request: ChartQuoteRequest,
  sink: ChartQuoteStreamSink,
  options?: StreamTransportOptions,
): () => void {
  if (typeof EventSource === 'undefined') {
    sink({
      type: 'error',
      message: 'EventSource is not available',
      recoverable: false,
    });
    return () => {};
  }

  const url = buildQuoteStreamUrl(options?.baseUrl ?? '', request);
  const source = new EventSource(url);
  let closed = false;

  source.onmessage = (message) => {
    const event = parseStreamEvent<ChartQuoteStreamEvent>(message.data);
    if (event) sink(event);
  };

  source.onerror = () => {
    if (closed) return;
    sink({
      type: 'error',
      message: 'Stream connection lost',
      recoverable: true,
    });
  };

  return () => {
    closed = true;
    source.close();
  };
}

/** Server-proxied SSE transport. Requires matching /api/stream/* route handlers. */
export function createServerProxiedStreamTransport(
  options?: StreamTransportOptions,
): StreamTransport {
  return {
    subscribeCandles(request, sink, loadLatest) {
      let primed = false;

      void (async () => {
        try {
          await loadLatest();
        } finally {
          primed = true;
        }
      })();

      return createServerProxiedCandleSubscription(request, (event) => {
        if (!primed && event.type !== 'error') return;
        sink(event);
      }, options);
    },

    subscribeQuotes(request, sink, _loadLatest) {
      return createServerProxiedQuoteSubscription(request, sink, options);
    },
  };
}

export type CandleStreamQuery = {
  symbol: string;
  interval: Interval;
  range: Range;
  exchange?: string;
};

export type QuoteStreamQuery = {
  symbols: string[];
};
