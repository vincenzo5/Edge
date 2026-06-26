import type {
  ChartCandleRequest,
  ChartCandleStreamEvent,
  ChartCandleStreamSink,
  ChartDataMeta,
  ChartQuoteRequest,
  ChartQuoteStreamEvent,
  ChartQuoteStreamSink,
  Candle,
  MarketQuote,
} from '@edge/chart-core';

/** How live candle/quote updates reach the browser. */
export type StreamTransportMode = 'polling' | 'server-proxied';

export type StreamTransportOptions = {
  /** Transport selection. Defaults to `polling`. */
  mode?: StreamTransportMode;
  /** Base URL for server-proxied SSE endpoints (empty = same origin). */
  baseUrl?: string;
};

/** Loads the latest candle page for diffing (polling) or priming (server stream). */
export type CandleStreamLoader = () => Promise<{
  candles: Candle[];
  meta: ChartDataMeta;
}>;

/** Loads the latest quote snapshot for diffing (polling) or priming (server stream). */
export type QuoteStreamLoader = () => Promise<{
  quotes: MarketQuote[];
  meta: ChartDataMeta;
}>;

/**
 * Pluggable live-update transport behind ChartDataFeed.subscribeCandles/subscribeQuotes.
 * Implementations must emit the shared @edge/chart-core stream event types.
 */
export type StreamTransport = {
  subscribeCandles(
    request: ChartCandleRequest,
    sink: ChartCandleStreamSink,
    loadLatest: CandleStreamLoader,
  ): () => void;

  subscribeQuotes(
    request: ChartQuoteRequest,
    sink: ChartQuoteStreamSink,
    loadLatest: QuoteStreamLoader,
  ): () => void;
};

export type StreamTransportFactory = (options?: StreamTransportOptions) => StreamTransport;

export function resolveStreamTransportMode(
  options?: StreamTransportOptions,
): StreamTransportMode {
  if (options?.mode) return options.mode;
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_STREAM_TRANSPORT === 'server-proxied') {
    return 'server-proxied';
  }
  return 'polling';
}
