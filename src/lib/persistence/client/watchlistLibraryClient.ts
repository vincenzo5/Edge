import type { WatchlistState } from "@/lib/watchlist/types";
import { SCHEMA_VERSION } from "@/lib/persistence/common";
import { persistenceFetch } from "@/lib/persistence/client/persistenceFetch";
import type { WatchlistSnapshot } from "@/lib/persistence/schemas/watchlistLibrary";

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

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchWatchlistLibrary(): Promise<WatchlistLibraryRemoteRecord | null> {
  const response = await persistenceFetch("/api/me/watchlist-library", {
    method: "GET",
  });

  if (response.status === 503) return null;
  if (!response.ok) return null;

  return parseJsonResponse<WatchlistLibraryRemoteRecord>(response);
}

export async function saveWatchlistLibraryRemote(
  watchlistSnapshot: WatchlistState,
  baseRevision: number,
): Promise<SaveWatchlistLibraryRemoteResult> {
  const response = await persistenceFetch("/api/me/watchlist-library", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      baseRevision,
      watchlistSnapshot,
    }),
  });

  if (response.ok) {
    const record = await parseJsonResponse<WatchlistLibraryRemoteRecord>(response);
    if (!record) {
      return { ok: false, status: 500 };
    }
    return { ok: true, record };
  }

  const body = await parseJsonResponse<{
    code?: string;
    current?: Pick<
      WatchlistLibraryRemoteRecord,
      "syncRevision" | "updatedAt" | "watchlistSnapshot"
    >;
  }>(response);

  return {
    ok: false,
    status: response.status,
    code: body?.code,
    current: body?.current,
  };
}
