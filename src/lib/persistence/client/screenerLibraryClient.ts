import type { ScreenerState } from "@/lib/screener/types";
import { SCHEMA_VERSION } from "@/lib/persistence/common";
import type { ScreenerSnapshot } from "@/lib/persistence/schemas/screenerLibrary";
import {
  fetchRevisionedLibrary,
  saveRevisionedLibraryRemote,
} from "@/lib/persistence/client/revisionedLibraryClient";

export type ScreenerLibraryRemoteRecord = {
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  screenerSnapshot: ScreenerSnapshot;
};

export type SaveScreenerLibraryRemoteResult =
  | { ok: true; record: ScreenerLibraryRemoteRecord }
  | {
      ok: false;
      status: number;
      code?: string;
      current?: Pick<
        ScreenerLibraryRemoteRecord,
        "syncRevision" | "updatedAt" | "screenerSnapshot"
      >;
    };

export async function fetchScreenerLibrary(): Promise<ScreenerLibraryRemoteRecord | null> {
  return fetchRevisionedLibrary<ScreenerLibraryRemoteRecord>("/api/me/screener-library");
}

export async function saveScreenerLibraryRemote(
  screenerSnapshot: ScreenerState,
  baseRevision: number,
): Promise<SaveScreenerLibraryRemoteResult> {
  return saveRevisionedLibraryRemote<
    ScreenerLibraryRemoteRecord,
    {
      schemaVersion: typeof SCHEMA_VERSION;
      baseRevision: number;
      screenerSnapshot: ScreenerState;
    },
    Pick<ScreenerLibraryRemoteRecord, "syncRevision" | "updatedAt" | "screenerSnapshot">
  >("/api/me/screener-library", {
    schemaVersion: SCHEMA_VERSION,
    baseRevision,
    screenerSnapshot,
  });
}
