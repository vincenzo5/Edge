import type {
  ChartCandleRequest,
  ChartCandleResult,
  ChartDataMeta,
  ChartEventKind,
  ChartEventMarker,
  ChartEventsRequest,
  ChartEventsResult,
  ChartHistoryRequest,
  ChartOverlayRequest,
  ChartOverlayResult,
  ChartQuoteRequest,
  ChartQuoteResult,
  Interval,
} from '@edge/chart-core';
import { validateCandles } from '@/lib/chart/series';
import { applyIntervalResample, resolveFetchInterval } from '@/lib/chart/intervalAdapter';
import type { StreamTransportFactory, StreamTransportOptions } from './streamTransport';
import { createStreamTransport } from './streamTransportFactory';
import { shouldIncludeMacroChartEvents } from './macroChartPins';
import {
  eventMarkersToReferenceLines,
  mergeOverlayEvents,
} from './overlayMappers';
import {
  createMarketDataTraceId,
  isMarketDataTelemetryEnabled,
  marketDataTraceHeaders,
  recordMarketDataTelemetry,
} from '@/lib/marketData/telemetry';
import type { MarketDataPerfPhase } from '@/lib/marketData/telemetry';

type ApiMetaPayload = Partial<ChartDataMeta> & {
  source?: string;
  latencyMs?: number;
  cacheTier?: string;
  traceId?: string;
  phases?: MarketDataPerfPhase[];
};

type ApiCandlesResponse = {
  candles: unknown[];
  meta?: ApiMetaPayload;
};

type ApiQuotesResponse = {
  quotes: Array<{
    symbol: string;
    price: number | null;
    change: number | null;
    changePercent: number | null;
    volume: number | null;
    currency?: string;
    exchange?: string;
    shortName?: string;
    updatedAt?: number;
  }>;
  meta?: ApiMetaPayload;
};

type ApiMarketEvent = {
  id: string;
  canonicalId?: string;
  family?: string;
  title: string;
  scheduledAt?: string;
  symbol?: string;
  type?: string;
  timestamp?: number;
  date?: string;
  price?: number | null;
};

type ApiEventsResponse = {
  events: ApiMarketEvent[];
  meta?: ApiMetaPayload;
};

type ApiNewsItem = {
  id: string;
  headline: string;
  publishedAt: string;
  symbols?: string[];
};

type ApiNewsResponse = {
  news: ApiNewsItem[];
  meta?: ApiMetaPayload;
};

type ApiOptionsExpirationsResponse = {
  expirations: string[];
  meta?: ApiMetaPayload;
};

function chartKindFromApiEvent(event: ApiMarketEvent): ChartEventKind {
  switch (event.type) {
    case 'earnings':
    case 'dividend':
    case 'split':
    case 'filing':
    case 'economic':
      return event.type === 'economic' ? 'macro' : event.type;
    default:
      break;
  }
  switch (event.canonicalId) {
    case 'earnings':
      return 'earnings';
    case 'dividend':
      return 'dividend';
    case 'split':
      return 'split';
    case 'sec_8k':
    case 'sec_10q':
    case 'sec_10k':
    case 'sec_filing':
      return 'filing';
    default:
      return event.family === 'macro' ? 'macro' : 'filing';
  }
}

function timestampFromApiEvent(event: ApiMarketEvent): number {
  if (event.timestamp != null && Number.isFinite(event.timestamp)) {
    return event.timestamp;
  }
  const dateValue = event.scheduledAt ?? event.date;
  if (dateValue) {
    const trimmed = dateValue.trim();
    // Date-only corporate events: noon UTC aligns with daily candle calendar day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return Date.parse(`${trimmed}T12:00:00.000Z`);
    }
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NaN;
}

function dateParamFromTimestamp(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function normalizeMeta(partial: ApiMetaPayload | undefined): ChartDataMeta {
  return {
    source: (partial?.source as ChartDataMeta['source']) ?? 'yahoo',
    asOf: partial?.asOf ?? Date.now(),
    stale: partial?.stale ?? false,
    warnings: partial?.warnings ?? [],
    providerRequestId: partial?.providerRequestId,
    latencyMs: partial?.latencyMs,
    cacheTier: partial?.cacheTier as ChartDataMeta['cacheTier'],
    traceId: partial?.traceId,
    phases: partial?.phases,
  };
}

async function loadRegistryEvents(request: ChartEventsRequest): Promise<ChartEventMarker[]> {
  const includeMacro = shouldIncludeMacroChartEvents(request.symbol);
  const params = new URLSearchParams({
    symbol: request.symbol,
    families: includeMacro ? 'corporate,filing,macro' : 'corporate,filing',
  });
  if (includeMacro) params.set('includeMacro', 'true');
  if (request.from != null) params.set('from', dateParamFromTimestamp(request.from));
  if (request.to != null) params.set('to', dateParamFromTimestamp(request.to));
  const res = await fetch(`/api/events?${params.toString()}`);
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error((payload as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  const payload = (await res.json()) as ApiEventsResponse;
  const allowed = request.kinds ? new Set(request.kinds) : null;
  return (payload.events ?? [])
    .map((event) => {
      const timestamp = timestampFromApiEvent(event);
      const kind = chartKindFromApiEvent(event);
      return {
        id: event.id,
        kind,
        timestamp,
        title: event.title,
        symbol: event.symbol,
        price: event.price ?? null,
      };
    })
    .filter((event) => Number.isFinite(event.timestamp))
    .filter((event) => !allowed || allowed.has(event.kind));
}

async function loadNewsEvents(request: ChartEventsRequest): Promise<ChartEventMarker[]> {
  const params = new URLSearchParams({ symbol: request.symbol, limit: '20' });
  const res = await fetch(`/api/news?${params.toString()}`);
  if (!res.ok) return [];
  const payload = (await res.json()) as ApiNewsResponse;
  return (payload.news ?? [])
    .map((item) => {
      const timestamp = Date.parse(item.publishedAt);
      return {
        id: `news-${item.id}`,
        kind: 'news' as const,
        timestamp,
        title: item.headline,
        symbol: request.symbol,
        price: null,
      };
    })
    .filter((event) => Number.isFinite(event.timestamp));
}

async function loadOptionsExpirationEvents(
  request: ChartEventsRequest,
): Promise<ChartEventMarker[]> {
  const params = new URLSearchParams({ underlying: request.symbol });
  const res = await fetch(`/api/options/expirations?${params.toString()}`);
  if (!res.ok) return [];
  const payload = (await res.json()) as ApiOptionsExpirationsResponse;
  return (payload.expirations ?? [])
    .map((expiration) => {
      const timestamp = Date.parse(`${expiration}T16:00:00.000Z`);
      return {
        id: `opt-exp-${request.symbol}-${expiration}`,
        kind: 'options_expiration' as const,
        timestamp,
        title: `Options exp ${expiration}`,
        symbol: request.symbol,
        price: null,
      };
    })
    .filter((event) => Number.isFinite(event.timestamp));
}

async function postCandles(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ApiCandlesResponse> {
  const scenario = `chart-load:${String(body.symbol ?? 'unknown')}:${String(body.interval ?? '1d')}:${String(body.range ?? '1y')}`;
  const traceId = createMarketDataTraceId(scenario);
  const startedAt = Date.now();
  const res = await fetch('/api/candles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...marketDataTraceHeaders(traceId, scenario),
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error((payload as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  const payload = (await res.json()) as ApiCandlesResponse;
  if (isMarketDataTelemetryEnabled()) {
    recordMarketDataTelemetry('candles.fetch', {
      traceId,
      scenario,
      layer: 'client',
      ok: true,
      clientMs: Date.now() - startedAt,
      durationMs: Date.now() - startedAt,
      symbol: body.symbol as string | undefined,
      interval: body.interval as string | undefined,
      range: body.range as string | undefined,
      serverMs: payload.meta?.latencyMs,
      cacheTier: payload.meta?.cacheTier,
      provider: payload.meta?.source,
      source: payload.meta?.source,
      serverPhases: payload.meta?.phases,
      counts: {
        bars: Array.isArray(payload.candles) ? payload.candles.length : 0,
      },
      barCount: Array.isArray(payload.candles) ? payload.candles.length : 0,
    });
  }
  return { ...payload, meta: { ...payload.meta, traceId: payload.meta?.traceId ?? traceId } };
}

function normalizeCandlePage(
  symbol: string,
  interval: Interval,
  raw: unknown[],
  meta: ChartDataMeta,
  resampleTo?: Interval,
): ChartCandleResult {
  const normalized = validateCandles(raw);
  const candles = resampleTo ? applyIntervalResample(normalized, resampleTo) : normalized;
  const first = candles[0];
  return {
    symbol,
    interval,
    candles,
    hasMore: first != null,
    nextBeforeTimestamp: first?.t,
    meta,
  };
}

/** App-owned ChartDataFeed over existing Next.js market-data routes. */
export type ApiChartDataFeedOptions = {
  streamTransport?: StreamTransportFactory;
  streamTransportOptions?: StreamTransportOptions;
};

export function createApiChartDataFeed(
  options: ApiChartDataFeedOptions = {},
): import('@edge/chart-core').ChartDataFeed {
  const transport =
    options.streamTransport?.(options.streamTransportOptions) ??
    createStreamTransport(options.streamTransportOptions);

  const feed: import('@edge/chart-core').ChartDataFeed = {
    async loadCandles(request: ChartCandleRequest): Promise<ChartCandleResult> {
      const { providerInterval, resampleTo } = resolveFetchInterval(request.interval);
      const payload = await postCandles({
        symbol: request.symbol,
        range: request.range ?? '1y',
        interval: providerInterval,
        sessionMode: request.sessionMode ?? 'regular',
      });
      return normalizeCandlePage(
        request.symbol,
        request.interval,
        payload.candles,
        normalizeMeta(payload.meta),
        resampleTo,
      );
    },

    async loadMoreCandles(request: ChartHistoryRequest): Promise<ChartCandleResult> {
      const { providerInterval, resampleTo } = resolveFetchInterval(request.interval);
      const barCount = request.barCount ?? 200;
      const fetchBarCount = resampleTo === '2h' ? barCount * 2 : barCount;
      const payload = await postCandles({
        symbol: request.symbol,
        interval: providerInterval,
        before: request.beforeTimestamp,
        barCount: fetchBarCount,
        sessionMode: request.sessionMode ?? 'regular',
      });
      return normalizeCandlePage(
        request.symbol,
        request.interval,
        payload.candles,
        normalizeMeta(payload.meta),
        resampleTo,
      );
    },

    async loadQuotes(request: ChartQuoteRequest): Promise<ChartQuoteResult> {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: request.symbols }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error((payload as { error?: string }).error ?? `Request failed (${res.status})`);
      }
      const payload = (await res.json()) as ApiQuotesResponse;
      return {
        quotes: (payload.quotes ?? []).map((q) => ({
          ...q,
          updatedAt: q.updatedAt ?? Date.now(),
        })),
        meta: normalizeMeta(payload.meta),
      };
    },

    async loadEvents(request: ChartEventsRequest): Promise<ChartEventsResult> {
      const allowed = request.kinds ? new Set(request.kinds) : null;
      const includeNews = !allowed || allowed.has('news');
      const includeOptions = !allowed || allowed.has('options_expiration');

      const [registryEvents, newsEvents] = await Promise.all([
        loadRegistryEvents(request),
        includeNews ? loadNewsEvents(request) : Promise.resolve([]),
      ]);
      const optionsEvents = includeOptions
        ? await loadOptionsExpirationEvents(request)
        : [];
      const events = mergeOverlayEvents(registryEvents, newsEvents, optionsEvents);
      const filtered = allowed
        ? events.filter((event) => allowed.has(event.kind))
        : events;
      return {
        events: filtered,
        meta: {
          source: 'mixed',
          asOf: Date.now(),
          stale: false,
          warnings: [],
        },
      };
    },

    async loadOverlays(request: ChartOverlayRequest): Promise<ChartOverlayResult> {
      if (request.channel === 'annotations') {
        return {
          channel: 'annotations',
          annotations: [],
          meta: {
            source: 'local',
            asOf: Date.now(),
            stale: false,
            warnings: [],
          },
        };
      }

      const eventsRequest: ChartEventsRequest = {
        symbol: request.symbol,
        from: request.from,
        to: request.to,
        kinds: request.kinds,
      };

      if (request.channel === 'referenceLines') {
        const eventsResult = await this.loadEvents!(eventsRequest);
        const referenceLines = eventMarkersToReferenceLines(eventsResult.events);
        return {
          channel: 'referenceLines',
          referenceLines,
          meta: eventsResult.meta,
        };
      }

      const eventsResult = await this.loadEvents!(eventsRequest);
      return {
        channel: 'events',
        events: eventsResult.events,
        meta: eventsResult.meta,
      };
    },

    subscribeCandles(request, sink) {
      return transport.subscribeCandles(
        request,
        sink,
        async () => feed.loadCandles(request),
      );
    },

    subscribeQuotes(request, sink) {
      const loader = feed.loadQuotes;
      if (!loader) {
        return () => {};
      }
      return transport.subscribeQuotes(request, sink, async () => loader(request));
    },
  };

  return feed;
}

export const defaultApiChartDataFeed = createApiChartDataFeed({
  streamTransportOptions: {
    mode:
      typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_STREAM_TRANSPORT === 'server-proxied'
        ? 'server-proxied'
        : 'polling',
  },
});
