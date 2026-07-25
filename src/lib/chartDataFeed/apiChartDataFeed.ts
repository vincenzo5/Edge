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
import { HISTORY_FETCH_BAR_COUNT } from '@edge/chart-core';
import { validateCandles } from '@/lib/chart/series';
import { applyIntervalResample, resolveFetchInterval } from '@/lib/chart/intervalAdapter';
import type { StreamTransportFactory, StreamTransportOptions } from './streamTransport';
import { createStreamTransport } from './streamTransportFactory';
import { pollRangeForInterval } from './pollStreamAdapter';
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
import { readDataConnectionPreference } from '@/lib/marketData/dataConnectionPreference';
import { readDataProviderPreference } from '@/lib/marketData/dataProviderPreference';
import {
  buildClientCacheKey,
  CLIENT_CACHE_TTL_MS,
} from '@/lib/marketData/cache/clientCachePolicy';
import { getOrFetchClientTtl } from '@/lib/marketData/cache/getOrFetchClientTtl';
import { getSharedClientTtlCache } from '@/lib/marketData/cache/clientTtlCache';
import { coalesceInFlight } from './coalesceInFlight';

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
  hasMore?: boolean;
  nextBeforeTimestamp?: number;
  historyExtent?: import('@edge/chart-core').ChartHistoryExtent;
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

function buildRegistryEventsCacheKey(request: ChartEventsRequest): string {
  const includeMacro = shouldIncludeMacroChartEvents(request.symbol);
  const families = includeMacro ? 'corporate,filing,macro' : 'corporate,filing';
  const from = request.from != null ? dateParamFromTimestamp(request.from) : '';
  const to = request.to != null ? dateParamFromTimestamp(request.to) : '';
  return buildClientCacheKey('events', [
    request.symbol.trim().toUpperCase(),
    from,
    to,
    families,
  ]);
}

async function fetchRegistryEventsFromApi(request: ChartEventsRequest): Promise<ChartEventMarker[]> {
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

async function loadRegistryEvents(request: ChartEventsRequest): Promise<ChartEventMarker[]> {
  const key = buildRegistryEventsCacheKey(request);
  return getOrFetchClientTtl('events', key, () => fetchRegistryEventsFromApi(request));
}

async function loadNewsEvents(request: ChartEventsRequest): Promise<ChartEventMarker[]> {
  const limit = '20';
  const key = buildClientCacheKey('news', [request.symbol.trim().toUpperCase(), limit]);
  const cache = getSharedClientTtlCache();
  const hit = cache.get(key) as ChartEventMarker[] | undefined;
  if (hit) return hit;

  return coalesceInFlight(key, async () => {
    const again = cache.get(key) as ChartEventMarker[] | undefined;
    if (again) return again;

    const params = new URLSearchParams({ symbol: request.symbol, limit });
    const res = await fetch(`/api/news?${params.toString()}`);
    if (!res.ok) return [];
    const payload = (await res.json()) as ApiNewsResponse;
    const markers = (payload.news ?? [])
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
    cache.set(key, markers, CLIENT_CACHE_TTL_MS.news);
    return markers;
  });
}

async function loadOptionsExpirationEvents(
  request: ChartEventsRequest,
): Promise<ChartEventMarker[]> {
  const key = buildClientCacheKey('options_expirations', [request.symbol.trim().toUpperCase()]);
  const cache = getSharedClientTtlCache();
  const hit = cache.get(key) as ChartEventMarker[] | undefined;
  if (hit) return hit;

  return coalesceInFlight(key, async () => {
    const again = cache.get(key) as ChartEventMarker[] | undefined;
    if (again) return again;

    const params = new URLSearchParams({ underlying: request.symbol });
    const res = await fetch(`/api/options/expirations?${params.toString()}`);
    if (!res.ok) return [];
    const payload = (await res.json()) as ApiOptionsExpirationsResponse;
    const markers = (payload.expirations ?? [])
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
    cache.set(key, markers, CLIENT_CACHE_TTL_MS.options_expirations);
    return markers;
  });
}

async function postCandles(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ApiCandlesResponse> {
  if (signal) {
    return postCandlesRequest(body, signal);
  }
  const key = buildCandleCoalesceKey(body);
  return coalesceInFlight(key, () => postCandlesRequest(body));
}

function buildCandleCoalesceKey(body: Record<string, unknown>): string {
  return [
    'candles',
    body.symbol,
    body.interval,
    body.range ?? '',
    body.before ?? '',
    body.barCount ?? '',
    body.sessionMode ?? 'regular',
    body.connectionId ?? '',
    JSON.stringify(body.providerPreference ?? null),
  ].join('|');
}

async function postCandlesRequest(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ApiCandlesResponse> {
  const scenario = `chart-load:${String(body.symbol ?? 'unknown')}:${String(body.interval ?? '1d')}:${String(body.range ?? '1y')}`;
  const traceId = createMarketDataTraceId(scenario);
  const startedAt = Date.now();
  const connectionId = readDataConnectionPreference();
  const providerPreference = readDataProviderPreference();
  const res = await fetch('/api/candles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...marketDataTraceHeaders(traceId, scenario),
    },
    body: JSON.stringify({
      ...body,
      ...(connectionId ? { connectionId } : {}),
      providerPreference,
    }),
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

async function postQuotes(symbols: string[]): Promise<ApiQuotesResponse> {
  const connectionId = readDataConnectionPreference();
  const providerPreference = readDataProviderPreference();
  const key = ['quotes', ...symbols.slice().sort(), connectionId ?? '', JSON.stringify(providerPreference)].join('|');
  return coalesceInFlight(key, () => postQuotesRequest(symbols, connectionId, providerPreference));
}

async function postQuotesRequest(
  symbols: string[],
  connectionId: ReturnType<typeof readDataConnectionPreference>,
  providerPreference: ReturnType<typeof readDataProviderPreference>,
): Promise<ApiQuotesResponse> {
  const res = await fetch('/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbols,
      ...(connectionId ? { connectionId } : {}),
      providerPreference,
    }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error((payload as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as ApiQuotesResponse;
}

function normalizeCandlePage(
  symbol: string,
  interval: Interval,
  raw: unknown[],
  meta: ChartDataMeta,
  resampleTo?: Interval,
  pagination?: Pick<ApiCandlesResponse, 'hasMore' | 'nextBeforeTimestamp' | 'historyExtent'>,
): ChartCandleResult {
  const normalized = validateCandles(raw);
  const candles = resampleTo ? applyIntervalResample(normalized, resampleTo) : normalized;
  const first = candles[0];
  const pageExtent =
    pagination?.historyExtent ??
    (candles.length > 0
      ? {
          fromMs: first!.t,
          toMs: candles[candles.length - 1]!.t,
          completeness: 'discovered' as const,
        }
      : undefined);
  return {
    symbol,
    interval,
    candles,
    hasMore: pagination?.hasMore ?? first != null,
    nextBeforeTimestamp: pagination?.nextBeforeTimestamp ?? first?.t,
    historyExtent: pageExtent,
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

  async function loadPollCandles(request: ChartCandleRequest): Promise<ChartCandleResult> {
    const { providerInterval, resampleTo } = resolveFetchInterval(request.interval);
    const payload = await postCandles({
      symbol: request.symbol,
      range: pollRangeForInterval(request.interval),
      interval: providerInterval,
      sessionMode: request.sessionMode ?? 'regular',
    });
    return normalizeCandlePage(
      request.symbol,
      request.interval,
      payload.candles,
      normalizeMeta(payload.meta),
      resampleTo,
      payload,
    );
  }

  const feed: import('@edge/chart-core').ChartDataFeed = {
    async loadCandles(request: ChartCandleRequest): Promise<ChartCandleResult> {
      const { providerInterval, resampleTo } = resolveFetchInterval(request.interval);
      const payload = await postCandles(
        {
          symbol: request.symbol,
          range: request.range ?? '1y',
          interval: providerInterval,
          sessionMode: request.sessionMode ?? 'regular',
        },
        request.signal,
      );
      return normalizeCandlePage(
        request.symbol,
        request.interval,
        payload.candles,
        normalizeMeta(payload.meta),
        resampleTo,
        payload,
      );
    },

    async loadMoreCandles(request: ChartHistoryRequest): Promise<ChartCandleResult> {
      const { providerInterval, resampleTo } = resolveFetchInterval(request.interval);
      const barCount = request.barCount ?? HISTORY_FETCH_BAR_COUNT;
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
        payload,
      );
    },

    async loadQuotes(request: ChartQuoteRequest): Promise<ChartQuoteResult> {
      const payload = await postQuotes(request.symbols);
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

      const [registryEvents, newsEvents, optionsEvents] = await Promise.all([
        loadRegistryEvents(request),
        includeNews ? loadNewsEvents(request) : Promise.resolve([]),
        includeOptions ? loadOptionsExpirationEvents(request) : Promise.resolve([]),
      ]);
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
        async () => loadPollCandles(request),
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
