import type { QuoteSnapshot } from "@/lib/watchlist/types";

const quotes = new Map<string, QuoteSnapshot>();
const symbolListeners = new Map<string, Set<() => void>>();
const globalListeners = new Set<() => void>();

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function notifySymbol(symbol: string): void {
  for (const listener of symbolListeners.get(symbol) ?? []) {
    listener();
  }
  for (const listener of globalListeners) {
    listener();
  }
}

function notifyGlobal(): void {
  for (const listener of globalListeners) {
    listener();
  }
}

export function subscribeQuote(symbol: string, listener: () => void): () => void {
  const key = normalizeSymbol(symbol);
  let bucket = symbolListeners.get(key);
  if (!bucket) {
    bucket = new Set();
    symbolListeners.set(key, bucket);
  }
  bucket.add(listener);
  return () => {
    bucket!.delete(listener);
    if (bucket!.size === 0) {
      symbolListeners.delete(key);
    }
  };
}

export function subscribeQuotesGlobal(listener: () => void): () => void {
  globalListeners.add(listener);
  return () => globalListeners.delete(listener);
}

export function getQuote(symbol: string): QuoteSnapshot | undefined {
  return quotes.get(normalizeSymbol(symbol));
}

export function getQuoteCount(): number {
  return quotes.size;
}

export function getAllQuotes(): ReadonlyMap<string, QuoteSnapshot> {
  return quotes;
}

export function mergeQuoteUpdates(rows: QuoteSnapshot[]): void {
  const changed = new Set<string>();
  for (const row of rows) {
    const symbol = normalizeSymbol(row.symbol);
    const next = { ...row, symbol };
    const prev = quotes.get(symbol);
    if (
      prev === next ||
      (prev != null &&
        prev.regularMarketPrice === next.regularMarketPrice &&
        prev.regularMarketChange === next.regularMarketChange &&
        prev.regularMarketChangePercent === next.regularMarketChangePercent &&
        prev.regularMarketVolume === next.regularMarketVolume &&
        prev.updatedAt === next.updatedAt &&
        prev.marketState === next.marketState)
    ) {
      continue;
    }
    quotes.set(symbol, next);
    changed.add(symbol);
  }
  for (const symbol of changed) {
    notifySymbol(symbol);
  }
}

export function replaceQuotes(next: Map<string, QuoteSnapshot>): void {
  const changed = new Set<string>([...quotes.keys(), ...next.keys()]);
  quotes.clear();
  for (const [symbol, quote] of next) {
    quotes.set(normalizeSymbol(symbol), { ...quote, symbol: normalizeSymbol(symbol) });
  }
  for (const symbol of changed) {
    notifySymbol(symbol);
  }
  notifyGlobal();
}

export function clearQuotesStore(): void {
  const changed = new Set(quotes.keys());
  quotes.clear();
  for (const symbol of changed) {
    notifySymbol(symbol);
  }
  notifyGlobal();
}

export function quotesStoreHasSymbol(symbol: string): boolean {
  return quotes.has(normalizeSymbol(symbol));
}
