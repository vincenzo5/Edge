import type { Candle, Interval, Range } from '@edge/chart-core';
import type {
  CandleRequest,
  CandleResponse,
  InstrumentProfile,
  InstrumentSearchRequest,
  InstrumentSearchResult,
  MarketDataSource,
  MarketQuote,
  QuoteRequest,
} from '@edge/chart-core/data-source';

export type FixtureSymbol = 'DEMO' | 'ALT';

const DEMO_CANDLES: Candle[] = [
  { t: 1_700_000_000_000, o: 100, h: 105, l: 99, c: 104, v: 1_200_000 },
  { t: 1_700_000_864_000, o: 104, h: 108, l: 103, c: 107, v: 980_000 },
  { t: 1_700_001_728_000, o: 107, h: 110, l: 106, c: 109, v: 1_100_000 },
  { t: 1_700_002_592_000, o: 109, h: 112, l: 108, c: 111, v: 870_000 },
  { t: 1_700_003_456_000, o: 111, h: 113, l: 109, c: 110, v: 760_000 },
];

const ALT_CANDLES: Candle[] = [
  { t: 1_700_000_000_000, o: 50, h: 52, l: 49, c: 51, v: 500_000 },
  { t: 1_700_000_864_000, o: 51, h: 54, l: 50, c: 53, v: 420_000 },
  { t: 1_700_001_728_000, o: 53, h: 55, l: 52, c: 54, v: 610_000 },
];

const FIXTURE_SERIES: Record<FixtureSymbol, Candle[]> = {
  DEMO: DEMO_CANDLES,
  ALT: ALT_CANDLES,
};

const INSTRUMENTS: InstrumentSearchResult[] = [
  { symbol: 'DEMO', name: 'Demo Equity', exchange: 'FIX', assetType: 'equity' },
  { symbol: 'ALT', name: 'Alt Equity', exchange: 'FIX', assetType: 'equity' },
];

function sliceByRange(candles: Candle[], range: Range | undefined): Candle[] {
  if (!range || range === 'max') return [...candles];
  const take = range === '1d' ? 1 : range === '5d' ? 2 : candles.length;
  return candles.slice(-take);
}

function paginateBefore(candles: Candle[], beforeTimestamp: number, barCount: number): Candle[] {
  const older = candles.filter((c) => c.t < beforeTimestamp);
  return older.slice(-barCount);
}

/** In-memory fixture adapter implementing the public MarketDataSource contract. */
export function createFixtureMarketDataSource(): MarketDataSource {
  return {
    async getCandles(request: CandleRequest): Promise<CandleResponse> {
      const symbol = request.symbol.toUpperCase() as FixtureSymbol;
      const series = FIXTURE_SERIES[symbol];
      if (!series) {
        return { symbol: request.symbol, interval: request.interval, candles: [] };
      }

      if (request.beforeTimestamp != null) {
        const barCount = request.barCount ?? 200;
        const page = paginateBefore(series, request.beforeTimestamp, barCount);
        const first = page[0];
        return {
          symbol: request.symbol,
          interval: request.interval,
          candles: page,
          hasMore: first != null && series.some((c) => c.t < first.t),
          nextBeforeTimestamp: first?.t,
        };
      }

      if (request.from != null || request.to != null) {
        const from = request.from ?? Number.NEGATIVE_INFINITY;
        const to = request.to ?? Number.POSITIVE_INFINITY;
        const windowed = series.filter((c) => c.t >= from && c.t <= to);
        return {
          symbol: request.symbol,
          interval: request.interval,
          candles: windowed,
          hasMore: false,
        };
      }

      const candles = sliceByRange(series, request.range);
      const first = candles[0];
      return {
        symbol: request.symbol,
        interval: request.interval,
        candles,
        hasMore: first != null && series.some((c) => c.t < first.t),
        nextBeforeTimestamp: first?.t,
      };
    },

    async searchInstruments(request: InstrumentSearchRequest): Promise<InstrumentSearchResult[]> {
      const q = request.query.trim().toLowerCase();
      if (!q) return [];
      const limit = request.limit ?? 8;
      return INSTRUMENTS.filter(
        (item) =>
          item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q),
      ).slice(0, limit);
    },

    async getQuotes(request: QuoteRequest): Promise<MarketQuote[]> {
      const now = Date.now();
      return request.symbols.map((raw) => {
        const symbol = raw.toUpperCase() as FixtureSymbol;
        const candles = FIXTURE_SERIES[symbol] ?? [];
        const last = candles[candles.length - 1];
        const prev = candles[candles.length - 2];
        const price = last?.c ?? null;
        const change = last && prev ? last.c - prev.c : null;
        const changePercent =
          last && prev && prev.c !== 0 ? ((last.c - prev.c) / prev.c) * 100 : null;
        return {
          symbol: raw.toUpperCase(),
          price,
          change,
          changePercent,
          volume: last?.v ?? null,
          currency: 'USD',
          exchange: 'FIX',
          shortName: INSTRUMENTS.find((i) => i.symbol === symbol)?.name,
          updatedAt: now,
        };
      });
    },

    async getInstrumentProfile(request) {
      const symbol = request.symbol.toUpperCase() as FixtureSymbol;
      const match = INSTRUMENTS.find((i) => i.symbol === symbol);
      if (!match) return null;
      const profile: InstrumentProfile = {
        symbol: match.symbol,
        shortName: match.name,
        longName: `${match.name} Inc.`,
        exchange: match.exchange ?? null,
        currency: 'USD',
        sector: 'Technology',
        industry: 'Software',
        description: 'Fixture instrument for the data-source example.',
        updatedAt: Date.now(),
      };
      return profile;
    },
  };
}

export function defaultFixtureInterval(): Interval {
  return '1d';
}

export function defaultFixtureRange(): Range {
  return '1y';
}
