import {
  getActiveTab,
  updateTabRemote,
  type WorkspaceTabsState,
} from "../workspaceTabs";
import type { ChartTileBootstrapBinding } from "./chartTileBootstrapBinding";

/** Attach shell chartWorkspaceId to the active tab before remote merge. */
export function seedWorkspaceTabsFromBinding(
  tabs: WorkspaceTabsState,
  binding: ChartTileBootstrapBinding,
): WorkspaceTabsState {
  const chartWorkspaceId = binding.chartWorkspaceId?.trim();
  if (!chartWorkspaceId) return tabs;

  const active = getActiveTab(tabs);
  if (active.remote?.resourceId === chartWorkspaceId) return tabs;

  return updateTabRemote(tabs, active.id, {
    resourceId: chartWorkspaceId,
    syncRevision: active.remote?.syncRevision ?? 0,
    updatedAt: active.remote?.updatedAt ?? new Date(0).toISOString(),
  });
}
