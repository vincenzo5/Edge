import type { PresetEnvelope } from "@/lib/chart/presets/types";
import { SCHEMA_VERSION } from "@/lib/persistence/common";
import { persistenceFetch } from "@/lib/persistence/client/persistenceFetch";
import type { TemplateSnapshot } from "@/lib/persistence/schemas/chartTemplateLibrary";

export type ChartTemplateLibraryRemoteRecord = {
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  templateSnapshot: TemplateSnapshot;
};

export type SaveChartTemplateLibraryRemoteResult =
  | { ok: true; record: ChartTemplateLibraryRemoteRecord }
  | {
      ok: false;
      status: number;
      code?: string;
      current?: Pick<
        ChartTemplateLibraryRemoteRecord,
        "syncRevision" | "updatedAt" | "templateSnapshot"
      >;
    };

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function templateSnapshotFromPresets(presets: PresetEnvelope[]): TemplateSnapshot {
  return {
    version: 1,
    presets,
  };
}

export function presetsFromTemplateSnapshot(snapshot: TemplateSnapshot): PresetEnvelope[] {
  return snapshot.presets as PresetEnvelope[];
}

export async function fetchChartTemplateLibrary(): Promise<ChartTemplateLibraryRemoteRecord | null> {
  const response = await persistenceFetch("/api/me/chart-template-library", {
    method: "GET",
  });

  if (response.status === 503) return null;
  if (!response.ok) return null;

  return parseJsonResponse<ChartTemplateLibraryRemoteRecord>(response);
}

export async function saveChartTemplateLibraryRemote(
  presets: PresetEnvelope[],
  baseRevision: number,
): Promise<SaveChartTemplateLibraryRemoteResult> {
  const response = await persistenceFetch("/api/me/chart-template-library", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      baseRevision,
      templateSnapshot: templateSnapshotFromPresets(presets),
    }),
  });

  if (response.ok) {
    const record = await parseJsonResponse<ChartTemplateLibraryRemoteRecord>(response);
    if (!record) {
      return { ok: false, status: 500 };
    }
    return { ok: true, record };
  }

  const body = await parseJsonResponse<{
    code?: string;
    current?: Pick<
      ChartTemplateLibraryRemoteRecord,
      "syncRevision" | "updatedAt" | "templateSnapshot"
    >;
  }>(response);

  return {
    ok: false,
    status: response.status,
    code: body?.code,
    current: body?.current,
  };
}
