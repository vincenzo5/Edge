import type { WorkspaceTabsState } from "@/lib/app/workspaceTabs";
import { recordDismissedRemoteWorkspace } from "@/lib/app/workspaceTabsStorage";
import {
  archiveChartWorkspaceRemote,
  fetchChartWorkspaces,
  type ChartWorkspaceRemoteSummary,
} from "@/lib/persistence/client/chartWorkspaceClient";

export type ReconcileChartWorkspacesResult = {
  archived: string[];
  failed: string[];
};

function collectRemainingRemoteIds(tabs: WorkspaceTabsState): Set<string> {
  return new Set(
    tabs.tabs
      .map((tab) => tab.remote?.resourceId)
      .filter((id): id is string => Boolean(id)),
  );
}

function pickReservedRemoteId(
  remainingTabs: WorkspaceTabsState,
  remotes: ChartWorkspaceRemoteSummary[],
): string | undefined {
  if (remainingTabs.tabs.length !== 1) return undefined;
  if (remainingTabs.tabs[0]?.remote?.resourceId) return undefined;
  return remotes.find((remote) => remote.isDefault)?.id ?? remotes[0]?.id;
}

export async function reconcileChartWorkspacesAfterTabClose(
  remainingTabs: WorkspaceTabsState,
  closedRemoteId?: string,
): Promise<ReconcileChartWorkspacesResult> {
  const remainingIds = collectRemainingRemoteIds(remainingTabs);
  const remotes = await fetchChartWorkspaces();

  const toArchive = new Set<string>();
  if (closedRemoteId && !remainingIds.has(closedRemoteId)) {
    toArchive.add(closedRemoteId);
  }

  if (remotes) {
    const reservedRemoteId = pickReservedRemoteId(remainingTabs, remotes);
    for (const remote of remotes) {
      if (remainingIds.has(remote.id)) continue;
      if (remote.id === reservedRemoteId) continue;
      toArchive.add(remote.id);
    }
  }

  const archived: string[] = [];
  const failed: string[] = [];

  for (const workspaceId of toArchive) {
    recordDismissedRemoteWorkspace(workspaceId);
    const ok = await archiveChartWorkspaceRemote(workspaceId);
    if (ok) {
      archived.push(workspaceId);
    } else {
      failed.push(workspaceId);
    }
  }

  return { archived, failed };
}
