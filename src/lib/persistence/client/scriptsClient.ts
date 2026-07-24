import type { ScriptCompileResult, ScriptManifest } from "@edge/chart-core";

import type { ScriptLibraryEntry, ScriptLibraryState } from "@/lib/scriptLibrary/types";
import type { ScriptListItem } from "@/lib/persistence/repositories/scriptsRepository";

export type ScriptsListResponse = {
  scripts: ScriptListItem[];
};

export type ScriptDetailResponse = {
  script: ScriptLibraryEntry;
};

export type SaveRevisionResponse = {
  script: ScriptLibraryEntry;
  revision: string;
};

export type ScriptsImportResponse = {
  imported: number;
  scripts: ScriptListItem[];
};

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  if (response.status === 503 || response.status === 401) {
    return null;
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function fetchScriptsList(): Promise<ScriptsListResponse | null> {
  const response = await fetch("/api/me/scripts", { credentials: "include" });
  return parseJsonResponse<ScriptsListResponse>(response);
}

export async function fetchScriptDetail(scriptId: string): Promise<ScriptDetailResponse | null> {
  const response = await fetch(`/api/me/scripts/${encodeURIComponent(scriptId)}`, {
    credentials: "include",
  });
  return parseJsonResponse<ScriptDetailResponse>(response);
}

export async function createScriptRemote(params?: {
  displayName?: string;
  source?: string;
}): Promise<ScriptDetailResponse> {
  const response = await fetch("/api/me/scripts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params ?? {}),
  });
  const data = await parseJsonResponse<ScriptDetailResponse>(response);
  if (!data) throw new Error("Script library unavailable");
  return data;
}

export async function patchScriptRemote(
  scriptId: string,
  patch: {
    displayName?: string;
    draftSource?: string;
    draftManifest?: ScriptManifest;
    draftDirty?: boolean;
  },
): Promise<ScriptDetailResponse> {
  const response = await fetch(`/api/me/scripts/${encodeURIComponent(scriptId)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await parseJsonResponse<ScriptDetailResponse>(response);
  if (!data) throw new Error("Script library unavailable");
  return data;
}

export async function saveScriptRevisionRemote(
  scriptId: string,
  params: {
    source: string;
    compile: ScriptCompileResult;
  },
): Promise<SaveRevisionResponse> {
  const response = await fetch(
    `/api/me/scripts/${encodeURIComponent(scriptId)}/revisions`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: params.source,
        languageVersion: params.compile.languageVersion,
        sdkVersion: params.compile.sdkVersion,
        manifest: params.compile.manifest,
        artifactHash: params.compile.artifactHash,
        compileOk: params.compile.ok,
      }),
    },
  );
  const data = await parseJsonResponse<SaveRevisionResponse>(response);
  if (!data) throw new Error("Script library unavailable");
  return data;
}

export async function deleteScriptRemote(scriptId: string): Promise<void> {
  const response = await fetch(`/api/me/scripts/${encodeURIComponent(scriptId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (response.status === 503 || response.status === 401) {
    throw new Error("Script library unavailable");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Delete failed (${response.status})`);
  }
}

export async function importScriptsSnapshot(
  snapshot: ScriptLibraryState,
): Promise<ScriptsImportResponse | null> {
  const response = await fetch("/api/me/scripts/import", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });
  return parseJsonResponse<ScriptsImportResponse>(response);
}

export const SCRIPT_LIBRARY_MIGRATED_KEY = "edge:script-library:migrated-v2";

export function isScriptLibraryMigratedLocally(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SCRIPT_LIBRARY_MIGRATED_KEY) === "1";
}

export function markScriptLibraryMigratedLocally(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SCRIPT_LIBRARY_MIGRATED_KEY, "1");
}
