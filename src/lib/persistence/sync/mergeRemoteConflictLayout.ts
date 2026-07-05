import {
  DEFAULT_SIDEBAR_PREFS,
  type ChartLayout,
  type SidebarPrefs,
} from "@/lib/chartConfig";

/** Sidebar fields that reflect in-session UI and should not be clobbered by remote conflict snapshots. */
function mergeSidebarPrefs(local: SidebarPrefs | undefined, remote: SidebarPrefs | undefined): SidebarPrefs {
  const remoteSidebar = remote ?? DEFAULT_SIDEBAR_PREFS;
  const localSidebar = local ?? DEFAULT_SIDEBAR_PREFS;

  return {
    ...remoteSidebar,
    activePanel: localSidebar.activePanel ?? remoteSidebar.activePanel ?? null,
    width: localSidebar.width ?? remoteSidebar.width,
    presentation: localSidebar.presentation ?? remoteSidebar.presentation,
    floatingGeometry: localSidebar.floatingGeometry ?? remoteSidebar.floatingGeometry,
  };
}

/** Merge a remote layout snapshot after a sync conflict, keeping local sidebar session state. */
export function mergeRemoteConflictLayout(local: ChartLayout, remote: ChartLayout): ChartLayout {
  return {
    ...remote,
    sidebar: mergeSidebarPrefs(local.sidebar, remote.sidebar),
  };
}
