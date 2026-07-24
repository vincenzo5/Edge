import type { AppWorkspacesState } from "@/lib/appWorkspace/types";
import { SCHEMA_VERSION } from "@/lib/persistence/common";
import type { AppWorkspacesSnapshot } from "@/lib/persistence/schemas/appWorkspaces";
import {
  fetchRevisionedLibrary,
  saveRevisionedLibraryRemote,
} from "@/lib/persistence/client/revisionedLibraryClient";

export type AppWorkspacesLibraryRemoteRecord = {
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  appWorkspacesSnapshot: AppWorkspacesSnapshot;
};

export type SaveAppWorkspacesLibraryRemoteResult =
  | { ok: true; record: AppWorkspacesLibraryRemoteRecord }
  | {
      ok: false;
      status: number;
      code?: string;
      current?: Pick<
        AppWorkspacesLibraryRemoteRecord,
        "syncRevision" | "updatedAt" | "appWorkspacesSnapshot"
      >;
    };

export async function fetchAppWorkspacesLibrary(): Promise<AppWorkspacesLibraryRemoteRecord | null> {
  return fetchRevisionedLibrary<AppWorkspacesLibraryRemoteRecord>("/api/me/app-workspaces");
}

export async function saveAppWorkspacesLibraryRemote(
  appWorkspacesSnapshot: AppWorkspacesState,
  baseRevision: number,
): Promise<SaveAppWorkspacesLibraryRemoteResult> {
  return saveRevisionedLibraryRemote<
    AppWorkspacesLibraryRemoteRecord,
    {
      schemaVersion: typeof SCHEMA_VERSION;
      baseRevision: number;
      appWorkspacesSnapshot: AppWorkspacesState;
    },
    Pick<
      AppWorkspacesLibraryRemoteRecord,
      "syncRevision" | "updatedAt" | "appWorkspacesSnapshot"
    >
  >("/api/me/app-workspaces", {
    schemaVersion: SCHEMA_VERSION,
    baseRevision,
    appWorkspacesSnapshot,
  });
}
