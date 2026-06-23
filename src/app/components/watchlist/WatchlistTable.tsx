"use client";

import type { QuoteSnapshot, WatchlistItem } from "@/lib/watchlist/types";
import WatchlistRow from "./WatchlistRow";

type Props = {
  items: WatchlistItem[];
  quotes: QuoteSnapshot[];
  selectedSymbol: string | null;
  quotesError: string | null;
  quotesLoading: boolean;
  onSelect: (symbol: string) => void;
  onLoadChart: (item: WatchlistItem) => void;
  onRemove: (symbol: string) => void;
};

export default function WatchlistTable({
  items,
  quotes,
  selectedSymbol,
  quotesError,
  quotesLoading,
  onSelect,
  onLoadChart,
  onRemove,
}: Props) {
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

  if (items.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-[var(--tv-text-secondary)]">
        No symbols yet. Use + to add tickers.
      </div>
    );
  }

  return (
    <div data-testid="watchlist-table">
      {quotesError && (
        <div className="px-2 py-1 text-[10px] text-[var(--tv-negative)]" role="alert">
          {quotesError}
        </div>
      )}
      {quotesLoading && items.length > 0 && (
        <div className="px-2 py-1 text-[10px] text-[var(--tv-text-secondary)]">Updating quotes…</div>
      )}
      <table className="w-full">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-[var(--tv-text-secondary)]">
            <th className="px-2 py-1 text-left">Symbol</th>
            <th className="px-2 py-1 text-right">Last</th>
            <th className="px-2 py-1 text-right">Chg%</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <WatchlistRow
              key={item.symbol}
              item={item}
              quote={quoteMap.get(item.symbol)}
              selected={selectedSymbol === item.symbol}
              onActivate={() => {
                onSelect(item.symbol);
                onLoadChart(item);
              }}
              onRemove={() => onRemove(item.symbol)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
