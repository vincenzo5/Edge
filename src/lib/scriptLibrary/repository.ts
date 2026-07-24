import type { ScriptCompileResult, ScriptManifest } from "@edge/chart-core";
import {
  DEFAULT_SCRIPT_RUNTIME_BUDGETS,
  SCRIPT_LANGUAGE_VERSION,
  SCRIPT_SDK_VERSION,
} from "@edge/chart-core";
import {
  computeRevisionFromSource,
  normalizeScriptSource,
} from "./hash";
import type {
  ScriptDraft,
  ScriptLibraryEntry,
  ScriptLibraryState,
  ScriptRevisionRecord,
} from "./types";
import {
  DEFAULT_SCRIPT_LIBRARY_STATE,
  DEFAULT_SCRIPT_TEMPLATE,
  MAX_REVISIONS_PER_SCRIPT,
  MAX_SCRIPTS,
} from "./types";

function createScriptId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `script-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function trimRevisions(revisions: ScriptRevisionRecord[]): ScriptRevisionRecord[] {
  return revisions.slice(-MAX_REVISIONS_PER_SCRIPT);
}

function assertSourceWithinBudget(source: string): void {
  const bytes = new TextEncoder().encode(source).byteLength;
  if (bytes > DEFAULT_SCRIPT_RUNTIME_BUDGETS.maxSourceBytes) {
    throw new Error(`Script exceeds ${DEFAULT_SCRIPT_RUNTIME_BUDGETS.maxSourceBytes} byte limit`);
  }
}

export function isSupportedScriptVersion(
  languageVersion: string,
  sdkVersion: string,
): boolean {
  return languageVersion === SCRIPT_LANGUAGE_VERSION && sdkVersion === SCRIPT_SDK_VERSION;
}

export function listScripts(state: ScriptLibraryState): ScriptLibraryEntry[] {
  return [...state.scripts].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getScript(
  state: ScriptLibraryState,
  scriptId: string,
): ScriptLibraryEntry | undefined {
  return state.scripts.find((entry) => entry.scriptId === scriptId);
}

export function createScript(
  state: ScriptLibraryState,
  params?: { displayName?: string; source?: string },
): { state: ScriptLibraryState; entry: ScriptLibraryEntry } {
  if (state.scripts.length >= MAX_SCRIPTS) {
    throw new Error(`Script library limit reached (${MAX_SCRIPTS})`);
  }
  const now = Date.now();
  const source = normalizeScriptSource(params?.source ?? DEFAULT_SCRIPT_TEMPLATE);
  assertSourceWithinBudget(source);
  const entry: ScriptLibraryEntry = {
    scriptId: createScriptId(),
    displayName: params?.displayName?.trim() || "Untitled script",
    createdAt: now,
    updatedAt: now,
    headRevision: null,
    draft: { source, updatedAt: now, dirty: true },
    revisions: [],
  };
  return {
    state: { ...state, scripts: [...state.scripts, entry] },
    entry,
  };
}

export function renameScript(
  state: ScriptLibraryState,
  scriptId: string,
  displayName: string,
): ScriptLibraryState {
  const trimmed = displayName.trim();
  if (!trimmed) return state;
  return {
    ...state,
    scripts: state.scripts.map((entry) =>
      entry.scriptId === scriptId
        ? { ...entry, displayName: trimmed, updatedAt: Date.now() }
        : entry,
    ),
  };
}

export function duplicateScript(
  state: ScriptLibraryState,
  scriptId: string,
): { state: ScriptLibraryState; entry: ScriptLibraryEntry } | null {
  const sourceEntry = getScript(state, scriptId);
  if (!sourceEntry) return null;
  const draftSource =
    sourceEntry.draft?.source ??
    sourceEntry.revisions.find((rev) => rev.revision === sourceEntry.headRevision)?.source ??
    DEFAULT_SCRIPT_TEMPLATE;
  const { state: nextState, entry } = createScript(state, {
    displayName: `${sourceEntry.displayName} copy`,
    source: draftSource,
  });
  return { state: nextState, entry };
}

export function deleteScript(state: ScriptLibraryState, scriptId: string): ScriptLibraryState {
  return {
    ...state,
    scripts: state.scripts.filter((entry) => entry.scriptId !== scriptId),
  };
}

export function saveDraft(
  state: ScriptLibraryState,
  scriptId: string,
  draft: Pick<ScriptDraft, "source" | "manifest"> & { dirty?: boolean },
): ScriptLibraryState {
  const normalized = normalizeScriptSource(draft.source);
  assertSourceWithinBudget(normalized);
  const now = Date.now();
  return {
    ...state,
    scripts: state.scripts.map((entry) =>
      entry.scriptId === scriptId
        ? {
            ...entry,
            updatedAt: now,
            draft: {
              source: normalized,
              updatedAt: now,
              dirty: draft.dirty ?? true,
              manifest: draft.manifest,
            },
          }
        : entry,
    ),
  };
}

export function saveRevision(
  state: ScriptLibraryState,
  scriptId: string,
  params: {
    source: string;
    compile: ScriptCompileResult;
  },
): { state: ScriptLibraryState; revision: string } | null {
  const entry = getScript(state, scriptId);
  if (!entry) return null;

  const normalized = normalizeScriptSource(params.source);
  assertSourceWithinBudget(normalized);
  const revision = computeRevisionFromSource(normalized);
  const now = Date.now();

  const languageVersion = params.compile.languageVersion ?? SCRIPT_LANGUAGE_VERSION;
  const sdkVersion = params.compile.sdkVersion ?? SCRIPT_SDK_VERSION;

  const record: ScriptRevisionRecord = {
    revision,
    source: normalized,
    languageVersion,
    sdkVersion,
    manifest: params.compile.manifest,
    artifactHash: params.compile.artifactHash,
    compiledAt: now,
    compileOk: params.compile.ok,
  };

  const existing = entry.revisions.filter((rev) => rev.revision !== revision);
  const revisions = trimRevisions([...existing, record]);

  const nextScripts = state.scripts.map((item) =>
    item.scriptId === scriptId
      ? {
          ...item,
          updatedAt: now,
          headRevision: revision,
          draft: undefined,
          revisions,
        }
      : item,
  );

  return { state: { ...state, scripts: nextScripts }, revision };
}

export function getRevisionSource(
  state: ScriptLibraryState,
  scriptId: string,
  revision: string,
): ScriptRevisionRecord | null {
  const entry = getScript(state, scriptId);
  if (!entry) return null;

  const saved = entry.revisions.find((rev) => rev.revision === revision);
  if (saved) return saved;

  return null;
}

export function getRevisionManifest(
  state: ScriptLibraryState,
  scriptId: string,
  revision: string,
): ScriptManifest | undefined {
  return getRevisionSource(state, scriptId, revision)?.manifest;
}

export function countScriptUsage(
  indicators: Array<{ kind?: string; scriptId?: string }>,
  scriptId: string,
): number {
  return indicators.filter(
    (ind) => ind.kind === "script" && ind.scriptId === scriptId,
  ).length;
}

export function resetCorruptLibraryState(): ScriptLibraryState {
  return DEFAULT_SCRIPT_LIBRARY_STATE;
}
