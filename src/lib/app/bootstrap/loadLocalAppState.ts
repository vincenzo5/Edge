import type { ChartLayout } from "@/lib/chartConfig";
import { loadLayout } from "@/lib/layoutStorage";
import type { ScreenerState } from "@/lib/screener/types";
import { loadScreenerState } from "@/lib/screener/screenStorage";
import type { WatchlistState } from "@/lib/watchlist/types";
import { loadWatchlistState } from "@/lib/watchlist/storage";

export type LocalAppState = {
  layout: ChartLayout;
  watchlist: WatchlistState;
  screener: ScreenerState;
};

/** Synchronous read of layout, watchlist, and screener from localStorage. */
export function loadLocalAppState(): LocalAppState {
  return {
    layout: loadLayout(),
    watchlist: loadWatchlistState(),
    screener: loadScreenerState(),
  };
}
