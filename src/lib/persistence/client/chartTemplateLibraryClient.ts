import type { PresetEnvelope } from "@/lib/chart/presets/types";
import { SCHEMA_VERSION } from "@/lib/persistence/common";
import type { TemplateSnapshot } from "@/lib/persistence/schemas/chartTemplateLibrary";
import {
  fetchRevisionedLibrary,
  saveRevisionedLibraryRemote,
} from "@/lib/persistence/client/revisionedLibraryClient";

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
  return fetchRevisionedLibrary<ChartTemplateLibraryRemoteRecord>(
    "/api/me/chart-template-library",
  );
}

export async function saveChartTemplateLibraryRemote(
  presets: PresetEnvelope[],
  baseRevision: number,
): Promise<SaveChartTemplateLibraryRemoteResult> {
  return saveRevisionedLibraryRemote<
    ChartTemplateLibraryRemoteRecord,
    {
      schemaVersion: typeof SCHEMA_VERSION;
      baseRevision: number;
      templateSnapshot: TemplateSnapshot;
    },
    Pick<ChartTemplateLibraryRemoteRecord, "syncRevision" | "updatedAt" | "templateSnapshot">
  >("/api/me/chart-template-library", {
    schemaVersion: SCHEMA_VERSION,
    baseRevision,
    templateSnapshot: templateSnapshotFromPresets(presets),
  });
}
