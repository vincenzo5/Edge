import {
  addWatchlistItem,
  createWatchlist,
  switchWatchlist,
} from "@/lib/watchlist/storage";
import type { WatchlistState } from "@/lib/watchlist/types";
import { REVIEW_KEEPERS_WATCHLIST_NAME } from "@/lib/screener/reviewSession";

export function ensureKeepersWatchlist(
  state: WatchlistState,
): { state: WatchlistState; watchlistId: string } {
  const existing = state.watchlists.find(
    (watchlist) => watchlist.name === REVIEW_KEEPERS_WATCHLIST_NAME,
  );
  if (existing) {
    return { state, watchlistId: existing.id };
  }

  const next = createWatchlist(state, REVIEW_KEEPERS_WATCHLIST_NAME);
  const created = next.watchlists.find(
    (watchlist) => watchlist.name === REVIEW_KEEPERS_WATCHLIST_NAME,
  );
  if (!created) {
    return { state: next, watchlistId: next.activeWatchlistId };
  }

  return { state: next, watchlistId: created.id };
}

export function addSymbolToKeepersWatchlist(
  state: WatchlistState,
  symbol: string,
  name?: string,
): WatchlistState {
  const previousActiveId = state.activeWatchlistId;
  const { state: withKeepers, watchlistId } = ensureKeepersWatchlist(state);

  let next = switchWatchlist(withKeepers, watchlistId);
  next = addWatchlistItem(next, { symbol, name });
  if (previousActiveId !== watchlistId) {
    next = switchWatchlist(next, previousActiveId);
  }

  return next;
}
