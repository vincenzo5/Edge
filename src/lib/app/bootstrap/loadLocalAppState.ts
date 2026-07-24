import type { ScreenerState } from "@/lib/screener/types";
import { loadScreenerState } from "@/lib/screener/screenStorage";
import type { WatchlistState } from "@/lib/watchlist/types";
import { loadWatchlistState } from "@/lib/watchlist/storage";
import type { WorkspaceTabsState } from "../workspaceTabs";
import {
  loadWorkspaceTabs,
  type WorkspaceTabsStorageBinding,
} from "../workspaceTabsStorage";
import type { ChartTileBootstrapBinding } from "./chartTileBootstrapBinding";
import { resolveChartTileBootstrapBinding } from "./chartTileBootstrapBinding";
import { seedWorkspaceTabsFromBinding } from "./seedWorkspaceTabsFromBinding";

export type LocalAppState = {
  workspaceTabs: WorkspaceTabsState;
  watchlist: WatchlistState;
  screener: ScreenerState;
};

export type LoadLocalAppStateOptions = {
  chartTileBinding?: ChartTileBootstrapBinding;
};

function workspaceTabsStorageBinding(
  binding: ChartTileBootstrapBinding,
): WorkspaceTabsStorageBinding {
  return {
    tileId: binding.tileId,
    isPrimaryChartTile: binding.isPrimaryChartTile,
  };
}

/** Synchronous read of workspace tabs, watchlist, and screener from localStorage. */
export function loadLocalAppState(options?: LoadLocalAppStateOptions): LocalAppState {
  const binding = resolveChartTileBootstrapBinding(options?.chartTileBinding);
  const storageBinding = workspaceTabsStorageBinding(binding);
  const workspaceTabs = seedWorkspaceTabsFromBinding(
    loadWorkspaceTabs(storageBinding),
    binding,
  );

  return {
    workspaceTabs,
    watchlist: loadWatchlistState(),
    screener: loadScreenerState(),
  };
}
