/**
 * Provider-neutral market data contracts for @edge/chart-core consumers.
 *
 * Production market data stays behind app-owned providers. Implement
 * `MarketDataSource` with an internal provider or fixture adapter.
 */

import type { Candle, Interval, Range } from './contracts';
import type { MarketSessionMode } from './marketSession';

/** Documented unit for `Candle.t` — Unix epoch milliseconds (UTC). */
export const CANDLE_TIMESTAMP_UNIT = 'milliseconds' as const;

/**
 * Supported chart intervals for chart integrations.
 * Some providers lack native `2h` bars; resample upstream when needed.
 */
export const SUPPORTED_INTERVALS: readonly Interval[] = [
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '1d',
  '1wk',
  '1mo',
] as const;

/** Initial or paginated candle load request. */
export type CandleRequest = {
  symbol: string;
  interval: Interval;
  /** Preset lookback for initial loads. Omit when using explicit window or pagination. */
  range?: Range;
  /** Load bars strictly before this timestamp (ms). Used for history pagination. */
  beforeTimestamp?: number;
  /** Bar count when paginating history (provider may cap). */
  barCount?: number;
  /** Explicit window start (ms, inclusive). Alternative to `range`. */
  from?: number;
  /** Explicit window end (ms, inclusive). */
  to?: number;
  /** Regular-hours only vs include pre/post-market bars (intraday). Default regular. */
  sessionMode?: MarketSessionMode;
};

export type CandleResponse = {
  symbol: string;
  interval: Interval;
  candles: Candle[];
  /** True when more history may exist before the first returned bar. */
  hasMore?: boolean;
  /** Hint for the next pagination request (`beforeTimestamp`). */
  nextBeforeTimestamp?: number;
};

export type InstrumentSearchRequest = {
  query: string;
  limit?: number;
};

export type InstrumentSearchResult = {
  symbol: string;
  name: string;
  exchange?: string;
  assetType?: string;
};

export type QuoteRequest = {
  symbols: string[];
};

export type MarketQuote = {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  currency?: string;
  exchange?: string;
  shortName?: string;
  updatedAt: number;
};

export type InstrumentProfileRequest = {
  symbol: string;
};

export type InstrumentProfile = {
  symbol: string;
  shortName?: string | null;
  longName?: string | null;
  exchange?: string | null;
  currency?: string | null;
  sector?: string | null;
  industry?: string | null;
  description?: string | null;
  updatedAt: number;
};

/**
 * Minimal market-data port for chart integrations.
 * Only `getCandles` is required; search, quotes, and profile are optional.
 */
export type MarketDataSource = {
  getCandles(request: CandleRequest): Promise<CandleResponse>;
  searchInstruments?(request: InstrumentSearchRequest): Promise<InstrumentSearchResult[]>;
  getQuotes?(request: QuoteRequest): Promise<MarketQuote[]>;
  getInstrumentProfile?(request: InstrumentProfileRequest): Promise<InstrumentProfile | null>;
};

// --- Unified chart data feed (Percept-style boundary) ---

/** Provider provenance exposed to chart chrome and AI tools. */
export type ChartDataSourceId =
  | 'ibkr'
  | 'yahoo'
  | 'tradier'
  | 'fmp'
  | 'sec'
  | 'fred'
  | 'local'
  | 'mixed'
  | (string & {});

export type ChartDataMeta = {
  source: ChartDataSourceId;
  asOf: number;
  stale?: boolean;
  warnings?: string[];
  providerRequestId?: string;
  /** Server-side fetch latency for the underlying read. */
  latencyMs?: number;
  /** Hot-store tier when served from MarketDataService. */
  cacheTier?: "hot-fresh" | "hot-stale" | "cold";
  /** Correlated market-data perf trace id (dev telemetry). */
  traceId?: string;
  /** Server-side phase timings for market-data perf snapshots. */
  phases?: Array<{
    name: string;
    ms: number;
    ok: boolean;
    layer?: string;
    detail?: Record<string, unknown>;
  }>;
  /** Live feed session is active (polling or stream). */
  streaming?: boolean;
  /** Recoverable stream error message, if any. */
  streamError?: string | null;
  /** Last successful candle/quote update timestamp. */
  lastUpdateAt?: number;
};

export type ChartCandleRequest = CandleRequest & {
  exchange?: string;
};

export type ChartCandleResult = CandleResponse & {
  meta: ChartDataMeta;
};

export type ChartHistoryRequest = {
  symbol: string;
  interval: Interval;
  beforeTimestamp: number;
  barCount?: number;
  exchange?: string;
  sessionMode?: MarketSessionMode;
};

export type ChartQuoteRequest = QuoteRequest;

export type ChartQuoteResult = {
  quotes: MarketQuote[];
  meta: ChartDataMeta;
};

export type ChartEventKind =
  | 'earnings'
  | 'dividend'
  | 'split'
  | 'filing'
  | 'macro'
  | 'news'
  | 'options_expiration';

export type ChartEventMarker = {
  id: string;
  kind: ChartEventKind;
  timestamp: number;
  title: string;
  symbol?: string;
  price?: number | null;
  meta?: ChartDataMeta;
};

export type ChartEventsRequest = {
  symbol: string;
  from?: number;
  to?: number;
  kinds?: ChartEventKind[];
};

export type ChartEventsResult = {
  events: ChartEventMarker[];
  meta: ChartDataMeta;
};

export type ChartReferenceLine = {
  id: string;
  price: number;
  label?: string;
  color?: string;
  lineWidth?: number;
  lineDash?: number[];
  interactive?: boolean;
};

export type ChartAnnotationChannelMarker = {
  id: string;
  timestamp: number;
  price?: number | null;
  label: string;
  kind?: 'note' | 'thesis' | 'invalidation' | 'target' | 'signal';
  color?: string;
};

export type ChartOverlayChannel = 'events' | 'referenceLines' | 'annotations';

export type ChartOverlayRequest = {
  symbol: string;
  channel: ChartOverlayChannel;
  from?: number;
  to?: number;
  kinds?: ChartEventKind[];
};

export type ChartOverlayResult = {
  channel: ChartOverlayChannel;
  events?: ChartEventMarker[];
  referenceLines?: ChartReferenceLine[];
  annotations?: ChartAnnotationChannelMarker[];
  meta: ChartDataMeta;
};

/** Event kinds routed through the unified events overlay channel. */
export const CHART_EVENT_OVERLAY_KINDS: readonly ChartEventKind[] = [
  'earnings',
  'dividend',
  'split',
  'filing',
  'macro',
  'news',
  'options_expiration',
] as const;

/** Combined overlay payload returned when loading all chart overlay channels. */
export type ChartOverlayBundle = {
  events: ChartEventMarker[];
  referenceLines: ChartReferenceLine[];
  annotations: ChartAnnotationChannelMarker[];
  meta: ChartDataMeta;
};

/** Live candle stream events emitted by `ChartDataFeed.subscribeCandles`. */
export type ChartCandleStreamEvent =
  | { type: 'snapshot'; candles: Candle[]; meta: ChartDataMeta }
  | { type: 'append'; candle: Candle; meta: ChartDataMeta }
  | { type: 'replace-latest'; candle: Candle; meta: ChartDataMeta }
  | { type: 'stale'; reason: string; meta: ChartDataMeta }
  | { type: 'reconnect'; attempt: number; meta?: ChartDataMeta }
  | { type: 'error'; message: string; recoverable: boolean; meta?: ChartDataMeta };

/** Live quote stream events emitted by `ChartDataFeed.subscribeQuotes`. */
export type ChartQuoteStreamEvent =
  | { type: 'snapshot'; quotes: MarketQuote[]; meta: ChartDataMeta }
  | { type: 'update'; quotes: MarketQuote[]; meta: ChartDataMeta }
  | { type: 'stale'; reason: string; meta: ChartDataMeta }
  | { type: 'error'; message: string; recoverable: boolean; meta?: ChartDataMeta };

export type ChartCandleStreamSink = (event: ChartCandleStreamEvent) => void;
export type ChartQuoteStreamSink = (event: ChartQuoteStreamEvent) => void;

/** @deprecated Use ChartCandleStreamEvent */
export type ChartStreamEvent = ChartCandleStreamEvent;
/** @deprecated Use ChartCandleStreamSink */
export type ChartStreamSink = ChartCandleStreamSink;

export type ChartSubscriptionRequest = ChartCandleRequest;

export type ChartQuoteSubscriptionRequest = ChartQuoteRequest;

/**
 * Chart-native data feed boundary. Provider routing stays app-owned;
 * packages consume normalized payloads and metadata only.
 */
export type ChartDataFeed = {
  loadCandles(request: ChartCandleRequest): Promise<ChartCandleResult>;
  loadMoreCandles?(request: ChartHistoryRequest): Promise<ChartCandleResult>;
  loadQuotes?(request: ChartQuoteRequest): Promise<ChartQuoteResult>;
  loadEvents?(request: ChartEventsRequest): Promise<ChartEventsResult>;
  loadOverlays?(request: ChartOverlayRequest): Promise<ChartOverlayResult>;
  subscribeCandles?(request: ChartSubscriptionRequest, sink: ChartCandleStreamSink): () => void;
  subscribeQuotes?(request: ChartQuoteSubscriptionRequest, sink: ChartQuoteStreamSink): () => void;
};
