import type { QuoteSnapshot } from "@/lib/watchlist/types";
import type { ScreenerResultRow } from "@/lib/screener/types";

export function mergeScreenerQuoteOverlay(
  rows: ScreenerResultRow[],
  quotes: QuoteSnapshot[],
): ScreenerResultRow[] {
  if (quotes.length === 0) return rows;
  const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
  return rows.map((row) => {
    const quote = quoteBySymbol.get(row.symbol.trim().toUpperCase());
    if (!quote) return row;
    return {
      ...row,
      price: quote.regularMarketPrice ?? row.price,
      changePercent: quote.regularMarketChangePercent ?? row.changePercent,
      change:
        quote.regularMarketChange ??
        (quote.regularMarketPrice != null && row.price != null
          ? quote.regularMarketPrice - row.price
          : row.change),
      volume: quote.regularMarketVolume ?? row.volume,
    };
  });
}
