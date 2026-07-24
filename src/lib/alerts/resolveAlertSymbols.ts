import "server-only";

import { getWatchlistLibrary } from "@/lib/persistence/repositories/watchlistLibraryRepository";
import type { WatchlistSnapshot } from "@/lib/persistence/schemas/watchlistLibrary";
import { MAX_WATCHLIST_ITEMS } from "@/lib/watchlist/storage";

export type ResolvedAlertSymbolScope = {
  symbols: string[];
  watchlistName: string | null;
  skippedReason?: "watchlist_unavailable" | "watchlist_empty";
};

function symbolsFromSnapshot(snapshot: WatchlistSnapshot, watchlistId: string): string[] {
  const watchlist = snapshot.watchlists.find((list) => list.id === watchlistId);
  if (!watchlist) return [];
  return watchlist.items
    .map((item) => item.symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, MAX_WATCHLIST_ITEMS);
}

export async function resolveAlertSymbols(input: {
  userId: string;
  symbol: string;
  watchlistId?: string | null;
}): Promise<ResolvedAlertSymbolScope> {
  if (!input.watchlistId) {
    return {
      symbols: [input.symbol.trim().toUpperCase()],
      watchlistName: null,
    };
  }

  const library = await getWatchlistLibrary(input.userId);
  if (!library) {
    return { symbols: [], watchlistName: null, skippedReason: "watchlist_unavailable" };
  }

  const symbols = symbolsFromSnapshot(library.watchlistSnapshot, input.watchlistId);
  const watchlist = library.watchlistSnapshot.watchlists.find(
    (list) => list.id === input.watchlistId,
  );

  if (symbols.length === 0) {
    return {
      symbols: [],
      watchlistName: watchlist?.name ?? null,
      skippedReason: "watchlist_empty",
    };
  }

  return {
    symbols,
    watchlistName: watchlist?.name ?? null,
  };
}

export function chunkSymbols(symbols: string[], chunkSize = 50): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += chunkSize) {
    chunks.push(symbols.slice(i, i + chunkSize));
  }
  return chunks;
}
