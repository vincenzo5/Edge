export type RecentSymbol = {
  symbol: string;
  name: string;
  exchange: string;
};

export const RECENT_SYMBOLS_KEY = "edge:recent-symbols:v1";

export const RECENT_SYMBOLS_MAX = 12;

const RECENT_SYMBOLS_EVENT = "edge:recentSymbols";

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function normalizeEntry(entry: RecentSymbol): RecentSymbol {
  return {
    symbol: normalizeSymbol(entry.symbol),
    name: entry.name.trim() || normalizeSymbol(entry.symbol),
    exchange: entry.exchange.trim(),
  };
}

function readStored(): RecentSymbol[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SYMBOLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentSymbol =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as RecentSymbol).symbol === "string" &&
          typeof (item as RecentSymbol).name === "string" &&
          typeof (item as RecentSymbol).exchange === "string",
      )
      .map(normalizeEntry)
      .slice(0, RECENT_SYMBOLS_MAX);
  } catch {
    return [];
  }
}

function writeStored(entries: RecentSymbol[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_SYMBOLS_KEY, JSON.stringify(entries));
    window.dispatchEvent(
      new CustomEvent<RecentSymbol[]>(RECENT_SYMBOLS_EVENT, { detail: entries }),
    );
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export function getRecentSymbols(): RecentSymbol[] {
  return readStored();
}

export function recordRecentSymbol(entry: RecentSymbol): void {
  const normalized = normalizeEntry(entry);
  if (!normalized.symbol) return;

  const existing = readStored().filter(
    (item) => normalizeSymbol(item.symbol) !== normalized.symbol,
  );
  writeStored([normalized, ...existing].slice(0, RECENT_SYMBOLS_MAX));
}

export function seedRecentSymbols(entries: RecentSymbol[]): void {
  if (readStored().length > 0) return;
  const seeded: RecentSymbol[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const normalized = normalizeEntry(entry);
    if (!normalized.symbol || seen.has(normalized.symbol)) continue;
    seen.add(normalized.symbol);
    seeded.push(normalized);
    if (seeded.length >= RECENT_SYMBOLS_MAX) break;
  }

  if (seeded.length > 0) {
    writeStored(seeded);
  }
}

export function clearRecentSymbols(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RECENT_SYMBOLS_KEY);
    window.dispatchEvent(new CustomEvent<RecentSymbol[]>(RECENT_SYMBOLS_EVENT, { detail: [] }));
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export function subscribeRecentSymbols(listener: (entries: RecentSymbol[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<RecentSymbol[]>).detail;
    if (detail) listener(detail);
  };
  window.addEventListener(RECENT_SYMBOLS_EVENT, handler);
  return () => window.removeEventListener(RECENT_SYMBOLS_EVENT, handler);
}
