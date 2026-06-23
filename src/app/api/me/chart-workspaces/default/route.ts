import { NextResponse } from "next/server";

import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { getOrCreateDefaultChartWorkspace } from "@/lib/persistence/repositories/chartWorkspaceRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    const workspace = await getOrCreateDefaultChartWorkspace(userId, DEFAULT_LAYOUT);

    return NextResponse.json({
      id: workspace.id,
      workspaceName: workspace.workspaceName,
      schemaVersion: workspace.schemaVersion,
      syncRevision: workspace.syncRevision,
      updatedAt: workspace.updatedAt,
      chartLayoutSnapshot: workspace.chartLayoutSnapshot,
    });
  });
}
