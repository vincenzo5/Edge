import type { QuoteSnapshot } from '@/lib/watchlist/types';

/** Resolve chart last price from the shared quote map. */
export function resolveChartLiveQuotePrice(
  symbol: string,
  quotesBySymbol: Map<string, QuoteSnapshot>,
): number | null {
  const quote = quotesBySymbol.get(symbol.trim().toUpperCase());
  return resolveChartLiveQuotePriceFromSnapshot(symbol, quote);
}

/** Resolve chart last price from a single quote snapshot. */
export function resolveChartLiveQuotePriceFromSnapshot(
  symbol: string,
  quote: QuoteSnapshot | null | undefined,
): number | null {
  if (!quote) return null;
  const normalized = symbol.trim().toUpperCase();
  if (quote.symbol.trim().toUpperCase() !== normalized) return null;
  const price = quote.regularMarketPrice;
  return price != null && Number.isFinite(price) ? price : null;
}
