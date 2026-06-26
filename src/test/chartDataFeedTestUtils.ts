import type { Candle, ChartDataFeed, ChartDataMeta, Interval, Range } from '@edge/chart-core';

export const defaultTestCandles: Candle[] = [
  { t: 1000, o: 100, h: 110, l: 90, c: 105, v: 1000 },
  { t: 2000, o: 105, h: 115, l: 95, c: 110, v: 1100 },
  { t: 3000, o: 110, h: 120, l: 100, c: 115, v: 1200 },
];

const defaultMeta: ChartDataMeta = {
  source: 'yahoo',
  asOf: Date.now(),
  stale: false,
  warnings: [],
};

export function createTestChartDataFeed(
  candles: Candle[] = defaultTestCandles,
  overrides?: Partial<ChartDataFeed>,
): ChartDataFeed {
  return {
    async loadCandles(request) {
      return {
        symbol: request.symbol,
        interval: request.interval,
        candles,
        hasMore: true,
        meta: defaultMeta,
      };
    },
    async loadMoreCandles(request) {
      return {
        symbol: request.symbol,
        interval: request.interval,
        candles: [],
        hasMore: false,
        meta: defaultMeta,
      };
    },
    async loadOverlays(request) {
      if (request.channel === 'events') {
        return { channel: 'events', events: [], meta: defaultMeta };
      }
      if (request.channel === 'referenceLines') {
        return { channel: 'referenceLines', referenceLines: [], meta: defaultMeta };
      }
      return { channel: 'annotations', annotations: [], meta: defaultMeta };
    },
    ...overrides,
  };
}

export function candleLoadRequest(symbol: string, range: Range, interval: Interval) {
  return { symbol, range, interval };
}
