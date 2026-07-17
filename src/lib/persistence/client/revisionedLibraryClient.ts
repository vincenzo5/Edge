import { persistenceFetch } from "@/lib/persistence/client/persistenceFetch";

export async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchRevisionedLibrary<TRecord>(
  path: string,
): Promise<TRecord | null> {
  const response = await persistenceFetch(path, {
    method: "GET",
  });

  if (response.status === 503) return null;
  if (!response.ok) return null;

  return parseJsonResponse<TRecord>(response);
}

export type SaveRevisionedRemoteResult<TRecord, TCurrent> =
  | { ok: true; record: TRecord }
  | {
      ok: false;
      status: number;
      code?: string;
      current?: TCurrent;
    };

export async function saveRevisionedLibraryRemote<
  TRecord,
  TBody extends Record<string, unknown>,
  TCurrent,
>(
  path: string,
  body: TBody,
): Promise<SaveRevisionedRemoteResult<TRecord, TCurrent>> {
  const response = await persistenceFetch(path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    const record = await parseJsonResponse<TRecord>(response);
    if (!record) {
      return { ok: false, status: 500 };
    }
    return { ok: true, record };
  }

  const errorBody = await parseJsonResponse<{
    code?: string;
    current?: TCurrent;
  }>(response);

  return {
    ok: false,
    status: response.status,
    code: errorBody?.code,
    current: errorBody?.current,
  };
}
