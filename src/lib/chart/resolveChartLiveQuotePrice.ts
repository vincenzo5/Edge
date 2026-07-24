import type { QuoteSnapshot } from '@/lib/watchlist/types';

/** Resolve chart last price from the shared MarketDataProvider quote map. */
export function resolveChartLiveQuotePrice(
  symbol: string,
  quotesBySymbol: Map<string, QuoteSnapshot>,
): number | null {
  const quote = quotesBySymbol.get(symbol.trim().toUpperCase());
  const price = quote?.regularMarketPrice;
  return price != null && Number.isFinite(price) ? price : null;
}
