import type { ChartLayout } from "@/lib/chartConfig";
import { persistenceFetch } from "@/lib/persistence/client/persistenceFetch";
import { SCHEMA_VERSION } from "@/lib/persistence/common";
import type { ChartLayoutSnapshot } from "@/lib/persistence/schemas/chartWorkspace";

export type ChartWorkspaceRemoteRecord = {
  id: string;
  workspaceName: string;
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  chartLayoutSnapshot: ChartLayoutSnapshot;
};

export type SaveChartWorkspaceRemoteInput = {
  workspaceId: string;
  baseRevision: number;
  chartLayoutSnapshot: ChartLayout;
  workspaceName?: string;
};

export type SaveChartWorkspaceRemoteResult =
  | { ok: true; record: ChartWorkspaceRemoteRecord }
  | {
      ok: false;
      status: number;
      code?: string;
      current?: Pick<
        ChartWorkspaceRemoteRecord,
        "syncRevision" | "updatedAt" | "chartLayoutSnapshot"
      >;
    };

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchDefaultChartWorkspace(): Promise<ChartWorkspaceRemoteRecord | null> {
  const response = await persistenceFetch("/api/me/chart-workspaces/default", {
    method: "GET",
  });

  if (response.status === 503) return null;
  if (!response.ok) return null;

  return parseJsonResponse<ChartWorkspaceRemoteRecord>(response);
}

export async function saveChartWorkspaceRemote(
  input: SaveChartWorkspaceRemoteInput,
): Promise<SaveChartWorkspaceRemoteResult> {
  const response = await persistenceFetch(`/api/me/chart-workspaces/${input.workspaceId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      baseRevision: input.baseRevision,
      workspaceName: input.workspaceName,
      chartLayoutSnapshot: input.chartLayoutSnapshot,
    }),
  });

  if (response.ok) {
    const record = await parseJsonResponse<ChartWorkspaceRemoteRecord>(response);
    if (!record) {
      return { ok: false, status: 500 };
    }
    return { ok: true, record };
  }

  const body = await parseJsonResponse<{
    code?: string;
    current?: Pick<
      ChartWorkspaceRemoteRecord,
      "syncRevision" | "updatedAt" | "chartLayoutSnapshot"
    >;
  }>(response);

  return {
    ok: false,
    status: response.status,
    code: body?.code,
    current: body?.current,
  };
}
