import { describe, expect, it } from 'vitest';
import type { QuoteSnapshot } from '@/lib/watchlist/types';
import { resolveChartLiveQuotePrice } from './resolveChartLiveQuotePrice';

function quote(price: number): QuoteSnapshot {
  return {
    symbol: 'AAPL',
    regularMarketPrice: price,
    regularMarketChange: 0,
    regularMarketChangePercent: 0,
    regularMarketVolume: null,
    updatedAt: Date.now(),
  };
}

describe('resolveChartLiveQuotePrice', () => {
  it('reads price from the shared quote map with normalized symbol key', () => {
    const map = new Map<string, QuoteSnapshot>([['AAPL', quote(195.5)]]);
    expect(resolveChartLiveQuotePrice('aapl', map)).toBe(195.5);
  });

  it('returns null when symbol is missing from the map', () => {
    const map = new Map<string, QuoteSnapshot>();
    expect(resolveChartLiveQuotePrice('MSFT', map)).toBeNull();
  });

  it('returns null for non-finite prices', () => {
    const map = new Map<string, QuoteSnapshot>([
      ['AAPL', { ...quote(Number.NaN), regularMarketPrice: Number.NaN }],
    ]);
    expect(resolveChartLiveQuotePrice('AAPL', map)).toBeNull();
  });
});
