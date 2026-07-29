"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ScriptCompileResult, ScriptManifest, ScriptSourceResolver } from "@edge/chart-core";
import {
  createScriptRemote,
  deleteScriptRemote,
  fetchScriptDetail,
  fetchScriptsList,
  importScriptsSnapshot,
  isScriptLibraryMigratedLocally,
  markScriptLibraryMigratedLocally,
  patchScriptRemote,
  saveScriptRevisionRemote,
} from "@/lib/persistence/client/scriptsClient";
import {
  getRevisionManifest,
  getRevisionSource,
  getScript,
  listScripts,
} from "./repository";
import { loadScriptLibraryState } from "./storage";
import { createScriptSourceResolver } from "./resolveSource";
import type { ScriptLibraryEntry, ScriptLibraryState } from "./types";
import { DEFAULT_SCRIPT_LIBRARY_STATE } from "./types";

export type ScriptLibraryContextValue = ScriptLibraryPort & {
  state: ScriptLibraryState;
  hydrated: boolean;
  error: string | null;
  scripts: ScriptLibraryEntry[];
  resolver: ScriptSourceResolver;
  dismissError: () => void;
};

type ScriptLibraryPort = import("@/lib/ai/context").ScriptLibraryPort;

const ScriptLibraryContext = createContext<ScriptLibraryContextValue | null>(null);

let hydrateInFlight: Promise<void> | null = null;

function upsertEntry(state: ScriptLibraryState, entry: ScriptLibraryEntry): ScriptLibraryState {
  const existing = state.scripts.some((item) => item.scriptId === entry.scriptId);
  return {
    ...state,
    scripts: existing
      ? state.scripts.map((item) => (item.scriptId === entry.scriptId ? entry : item))
      : [...state.scripts, entry],
  };
}

function removeEntry(state: ScriptLibraryState, scriptId: string): ScriptLibraryState {
  return {
    ...state,
    scripts: state.scripts.filter((item) => item.scriptId !== scriptId),
  };
}

/** Test-only reset for hydrate dedupe state. */
export function resetScriptLibraryHydrateInFlightForTests(): void {
  hydrateInFlight = null;
}

export function ScriptLibraryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScriptLibraryState>(DEFAULT_SCRIPT_LIBRARY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  const hydrateFromDb = useCallback(async () => {
    if (hydrateInFlight) {
      return hydrateInFlight;
    }

    hydrateInFlight = (async () => {
      setError(null);
      const list = await fetchScriptsList();
      if (!list) {
        setError("Script library unavailable — Postgres is required.");
        setHydrated(true);
        hydratedRef.current = true;
        return;
      }

      if (list.scripts.length === 0 && !isScriptLibraryMigratedLocally()) {
        const legacy = await loadScriptLibraryState();
        if (legacy.scripts.length > 0) {
          const imported = await importScriptsSnapshot(legacy);
          if (!imported) {
            setError("Script library import failed — Postgres is required.");
            setHydrated(true);
            hydratedRef.current = true;
            return;
          }
          if (imported.imported > 0) {
            markScriptLibraryMigratedLocally();
            const details = await Promise.all(
              imported.scripts.map((item) => fetchScriptDetail(item.scriptId)),
            );
            const entries = details
              .filter((detail): detail is NonNullable<typeof detail> => detail != null)
              .map((detail) => detail.script);
            setState({ version: 1, scripts: entries });
            setHydrated(true);
            hydratedRef.current = true;
            return;
          }
        }
        markScriptLibraryMigratedLocally();
      }

      const details = await Promise.all(
        list.scripts.map((item) => fetchScriptDetail(item.scriptId)),
      );
      const entries = details
        .filter((detail): detail is NonNullable<typeof detail> => detail != null)
        .map((detail) => detail.script);
      setState({ version: 1, scripts: entries });
      setHydrated(true);
      hydratedRef.current = true;
    })();

    try {
      await hydrateInFlight;
    } finally {
      hydrateInFlight = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void hydrateFromDb().catch((err) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : "Failed to load script library");
      setHydrated(true);
      hydratedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [hydrateFromDb]);

  const resolver = useMemo(() => createScriptSourceResolver(state), [state]);

  const handleCreateScript = useCallback(
    async (params?: { displayName?: string; source?: string }) => {
      const { script } = await createScriptRemote(params);
      setState((prev) => upsertEntry(prev, script));
      return script;
    },
    [],
  );

  const handleRenameScript = useCallback(async (scriptId: string, displayName: string) => {
    const { script } = await patchScriptRemote(scriptId, { displayName });
    setState((prev) => upsertEntry(prev, script));
    return script;
  }, []);

  const handleDuplicateScript = useCallback(async (scriptId: string) => {
    const sourceEntry = getScript(state, scriptId);
    if (!sourceEntry) return null;
    const draftSource =
      sourceEntry.draft?.source ??
      sourceEntry.revisions.find((rev) => rev.revision === sourceEntry.headRevision)?.source;
    if (!draftSource) return null;
    const { script } = await createScriptRemote({
      displayName: `${sourceEntry.displayName} copy`,
      source: draftSource,
    });
    setState((prev) => upsertEntry(prev, script));
    return script;
  }, [state]);

  const handleDeleteScript = useCallback(async (scriptId: string) => {
    await deleteScriptRemote(scriptId);
    setState((prev) => removeEntry(prev, scriptId));
  }, []);

  const handleSaveDraft = useCallback(
    async (
      scriptId: string,
      source: string,
      dirty = true,
      manifest?: ScriptManifest,
    ) => {
      const { script } = await patchScriptRemote(scriptId, {
        draftSource: source,
        draftManifest: manifest as ScriptManifest | undefined,
        draftDirty: dirty,
      });
      setState((prev) => upsertEntry(prev, script));
    },
    [],
  );

  const handleSaveRevision = useCallback(
    async (scriptId: string, params: { source: string; compile: ScriptCompileResult }) => {
      const { script, revision } = await saveScriptRevisionRemote(scriptId, params);
      setState((prev) => upsertEntry(prev, script));
      return revision;
    },
    [],
  );

  const value = useMemo(
    (): ScriptLibraryContextValue => ({
      state,
      getState: () => state,
      isHydrated: () => hydrated,
      getError: () => error,
      hydrated,
      error,
      scripts: listScripts(state),
      resolver,
      createScript: handleCreateScript,
      renameScript: handleRenameScript,
      duplicateScript: handleDuplicateScript,
      deleteScript: handleDeleteScript,
      saveDraft: handleSaveDraft,
      saveRevision: handleSaveRevision,
      getRevisionSource: (scriptId, revision) => getRevisionSource(state, scriptId, revision),
      getRevisionManifest: (scriptId, revision) => getRevisionManifest(state, scriptId, revision),
      getScript: (scriptId) => getScript(state, scriptId),
      dismissError: () => setError(null),
    }),
    [
      state,
      hydrated,
      error,
      resolver,
      handleCreateScript,
      handleRenameScript,
      handleDuplicateScript,
      handleDeleteScript,
      handleSaveDraft,
      handleSaveRevision,
    ],
  );

  return (
    <ScriptLibraryContext.Provider value={value}>{children}</ScriptLibraryContext.Provider>
  );
}

export function useScriptLibrary(): ScriptLibraryContextValue {
  const ctx = useContext(ScriptLibraryContext);
  if (!ctx) {
    throw new Error("useScriptLibrary must be used within ScriptLibraryProvider");
  }
  return ctx;
}

export function useScriptLibraryOptional(): ScriptLibraryContextValue | null {
  return useContext(ScriptLibraryContext);
}
