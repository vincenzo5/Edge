import type { WatchlistState } from "@/lib/watchlist/types";
import { SCHEMA_VERSION } from "@/lib/persistence/common";
import type { WatchlistSnapshot } from "@/lib/persistence/schemas/watchlistLibrary";
import {
  fetchRevisionedLibrary,
  saveRevisionedLibraryRemote,
} from "@/lib/persistence/client/revisionedLibraryClient";

export type WatchlistLibraryRemoteRecord = {
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  watchlistSnapshot: WatchlistSnapshot;
};

export type SaveWatchlistLibraryRemoteResult =
  | { ok: true; record: WatchlistLibraryRemoteRecord }
  | {
      ok: false;
      status: number;
      code?: string;
      current?: Pick<
        WatchlistLibraryRemoteRecord,
        "syncRevision" | "updatedAt" | "watchlistSnapshot"
      >;
    };

export async function fetchWatchlistLibrary(): Promise<WatchlistLibraryRemoteRecord | null> {
  return fetchRevisionedLibrary<WatchlistLibraryRemoteRecord>("/api/me/watchlist-library");
}

export async function saveWatchlistLibraryRemote(
  watchlistSnapshot: WatchlistState,
  baseRevision: number,
): Promise<SaveWatchlistLibraryRemoteResult> {
  return saveRevisionedLibraryRemote<
    WatchlistLibraryRemoteRecord,
    {
      schemaVersion: typeof SCHEMA_VERSION;
      baseRevision: number;
      watchlistSnapshot: WatchlistState;
    },
    Pick<WatchlistLibraryRemoteRecord, "syncRevision" | "updatedAt" | "watchlistSnapshot">
  >("/api/me/watchlist-library", {
    schemaVersion: SCHEMA_VERSION,
    baseRevision,
    watchlistSnapshot,
  });
}
