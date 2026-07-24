import type { ChartLayout } from "@/lib/chartConfig";
import { buildAppWorkspaceSnapshot } from "@/lib/app/workspaceSnapshot";

export const WORKSPACE_SNAPSHOT_MAX = 4000;

export function serializeWorkspaceSnapshot(
  layout: ChartLayout,
  hydrated: boolean,
): string {
  const snapshot = buildAppWorkspaceSnapshot(layout, hydrated);
  const json = JSON.stringify(snapshot);
  if (json.length <= WORKSPACE_SNAPSHOT_MAX) {
    return json;
  }
  return json.slice(0, WORKSPACE_SNAPSHOT_MAX);
}
