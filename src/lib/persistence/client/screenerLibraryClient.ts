import type { ScreenerState } from "@/lib/screener/types";
import { SCHEMA_VERSION } from "@/lib/persistence/common";
import { persistenceFetch } from "@/lib/persistence/client/persistenceFetch";
import type { ScreenerSnapshot } from "@/lib/persistence/schemas/screenerLibrary";

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

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchScreenerLibrary(): Promise<ScreenerLibraryRemoteRecord | null> {
  const response = await persistenceFetch("/api/me/screener-library", {
    method: "GET",
  });

  if (response.status === 503) return null;
  if (!response.ok) return null;

  return parseJsonResponse<ScreenerLibraryRemoteRecord>(response);
}

export async function saveScreenerLibraryRemote(
  screenerSnapshot: ScreenerState,
  baseRevision: number,
): Promise<SaveScreenerLibraryRemoteResult> {
  const response = await persistenceFetch("/api/me/screener-library", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      baseRevision,
      screenerSnapshot,
    }),
  });

  if (response.ok) {
    const record = await parseJsonResponse<ScreenerLibraryRemoteRecord>(response);
    if (!record) {
      return { ok: false, status: 500 };
    }
    return { ok: true, record };
  }

  const body = await parseJsonResponse<{
    code?: string;
    current?: Pick<
      ScreenerLibraryRemoteRecord,
      "syncRevision" | "updatedAt" | "screenerSnapshot"
    >;
  }>(response);

  return {
    ok: false,
    status: response.status,
    code: body?.code,
    current: body?.current,
  };
}
