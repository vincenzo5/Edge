import type { UserPreferencesSnapshot } from "@/lib/persistence/schemas/userPreferences";
import { SCHEMA_VERSION } from "@/lib/persistence/common";
import {
  fetchRevisionedLibrary,
  saveRevisionedLibraryRemote,
} from "@/lib/persistence/client/revisionedLibraryClient";

export type UserPreferencesLibraryRemoteRecord = {
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  preferencesSnapshot: UserPreferencesSnapshot;
};

export type SaveUserPreferencesLibraryRemoteResult =
  | { ok: true; record: UserPreferencesLibraryRemoteRecord }
  | {
      ok: false;
      status: number;
      code?: string;
      current?: Pick<
        UserPreferencesLibraryRemoteRecord,
        "syncRevision" | "updatedAt" | "preferencesSnapshot"
      >;
    };

export async function fetchUserPreferencesLibrary(): Promise<UserPreferencesLibraryRemoteRecord | null> {
  return fetchRevisionedLibrary<UserPreferencesLibraryRemoteRecord>("/api/me/user-preferences");
}

export async function saveUserPreferencesLibraryRemote(
  preferencesSnapshot: UserPreferencesSnapshot,
  baseRevision: number,
): Promise<SaveUserPreferencesLibraryRemoteResult> {
  return saveRevisionedLibraryRemote<
    UserPreferencesLibraryRemoteRecord,
    {
      schemaVersion: typeof SCHEMA_VERSION;
      baseRevision: number;
      preferencesSnapshot: UserPreferencesSnapshot;
    },
    Pick<
      UserPreferencesLibraryRemoteRecord,
      "syncRevision" | "updatedAt" | "preferencesSnapshot"
    >
  >("/api/me/user-preferences", {
    schemaVersion: SCHEMA_VERSION,
    baseRevision,
    preferencesSnapshot,
  });
}
