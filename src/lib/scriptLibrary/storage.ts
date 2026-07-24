import type { ScriptLibraryState } from "./types";
import {
  DEFAULT_SCRIPT_LIBRARY_STATE,
  MAX_SCRIPTS,
  SCRIPT_LIBRARY_IDB_KEY,
  SCRIPT_LIBRARY_IDB_NAME,
  SCRIPT_LIBRARY_IDB_STORE,
  SCRIPT_LIBRARY_STORAGE_KEY,
  type ScriptLibraryEntry,
  type ScriptRevisionRecord,
} from "./types";

function isRevisionRecord(value: unknown): value is ScriptRevisionRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as ScriptRevisionRecord;
  return (
    typeof record.revision === "string" &&
    typeof record.source === "string" &&
    typeof record.languageVersion === "string" &&
    typeof record.sdkVersion === "string" &&
    typeof record.compileOk === "boolean"
  );
}

function isScriptEntry(value: unknown): value is ScriptLibraryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as ScriptLibraryEntry;
  return (
    typeof entry.scriptId === "string" &&
    typeof entry.displayName === "string" &&
    typeof entry.createdAt === "number" &&
    typeof entry.updatedAt === "number" &&
    (entry.headRevision === null || typeof entry.headRevision === "string") &&
    Array.isArray(entry.revisions) &&
    entry.revisions.every(isRevisionRecord)
  );
}

export function normalizeScriptLibraryState(raw: unknown): ScriptLibraryState {
  if (!raw || typeof raw !== "object") return DEFAULT_SCRIPT_LIBRARY_STATE;
  const value = raw as ScriptLibraryState;
  if (value.version !== 1 || !Array.isArray(value.scripts)) {
    return { ...DEFAULT_SCRIPT_LIBRARY_STATE, corrupt: true };
  }
  const scripts = value.scripts.filter(isScriptEntry).slice(0, MAX_SCRIPTS);
  return {
    version: 1,
    scripts,
    corrupt: scripts.length !== value.scripts.length,
  };
}

export function loadScriptLibraryFromLocalStorage(): ScriptLibraryState {
  if (typeof window === "undefined") return DEFAULT_SCRIPT_LIBRARY_STATE;
  try {
    const raw = window.localStorage.getItem(SCRIPT_LIBRARY_STORAGE_KEY);
    if (!raw) return DEFAULT_SCRIPT_LIBRARY_STATE;
    return normalizeScriptLibraryState(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SCRIPT_LIBRARY_STATE, corrupt: true };
  }
}

export function saveScriptLibraryToLocalStorage(state: ScriptLibraryState): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ScriptLibraryState = {
      version: 1,
      scripts: state.scripts.slice(0, MAX_SCRIPTS),
    };
    window.localStorage.setItem(SCRIPT_LIBRARY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

function openScriptLibraryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SCRIPT_LIBRARY_IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SCRIPT_LIBRARY_IDB_STORE)) {
        db.createObjectStore(SCRIPT_LIBRARY_IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

export async function loadScriptLibraryFromIndexedDB(): Promise<ScriptLibraryState | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return null;
  try {
    const db = await openScriptLibraryDb();
    const state = await new Promise<ScriptLibraryState | null>((resolve, reject) => {
      const tx = db.transaction(SCRIPT_LIBRARY_IDB_STORE, "readonly");
      const store = tx.objectStore(SCRIPT_LIBRARY_IDB_STORE);
      const getReq = store.get(SCRIPT_LIBRARY_IDB_KEY);
      getReq.onsuccess = () => {
        resolve(getReq.result ? normalizeScriptLibraryState(getReq.result) : null);
      };
      getReq.onerror = () => reject(getReq.error ?? new Error("IndexedDB read failed"));
    });
    db.close();
    return state;
  } catch {
    return null;
  }
}

export async function saveScriptLibraryToIndexedDB(state: ScriptLibraryState): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
  try {
    const db = await openScriptLibraryDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SCRIPT_LIBRARY_IDB_STORE, "readwrite");
      const store = tx.objectStore(SCRIPT_LIBRARY_IDB_STORE);
      const payload: ScriptLibraryState = {
        version: 1,
        scripts: state.scripts.slice(0, MAX_SCRIPTS),
      };
      const putReq = store.put(payload, SCRIPT_LIBRARY_IDB_KEY);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error ?? new Error("IndexedDB write failed"));
    });
    db.close();
  } catch {
    // fall back silently — localStorage mirror still attempted
  }
}

export async function loadScriptLibraryState(): Promise<ScriptLibraryState> {
  const fromIdb = await loadScriptLibraryFromIndexedDB();
  if (fromIdb && fromIdb.scripts.length > 0) return fromIdb;
  return loadScriptLibraryFromLocalStorage();
}

export async function persistScriptLibraryState(state: ScriptLibraryState): Promise<void> {
  saveScriptLibraryToLocalStorage(state);
  await saveScriptLibraryToIndexedDB(state);
}
