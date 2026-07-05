import type { ScreenerState } from "@/lib/screener/types";
import { loadScreenerState } from "@/lib/screener/screenStorage";
import type { WatchlistState } from "@/lib/watchlist/types";
import { loadWatchlistState } from "@/lib/watchlist/storage";
import type { WorkspaceTabsState } from "../workspaceTabs";
import { loadWorkspaceTabs } from "../workspaceTabsStorage";

export type LocalAppState = {
  workspaceTabs: WorkspaceTabsState;
  watchlist: WatchlistState;
  screener: ScreenerState;
};

/** Synchronous read of workspace tabs, watchlist, and screener from localStorage. */
export function loadLocalAppState(): LocalAppState {
  return {
    workspaceTabs: loadWorkspaceTabs(),
    watchlist: loadWatchlistState(),
    screener: loadScreenerState(),
  };
}
