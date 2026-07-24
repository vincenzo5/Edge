/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  loadScriptLibraryFromLocalStorage,
  normalizeScriptLibraryState,
  saveScriptLibraryToLocalStorage,
} from "./storage";
import { DEFAULT_SCRIPT_LIBRARY_STATE, SCRIPT_LIBRARY_STORAGE_KEY } from "./types";
import { createScript } from "./repository";

describe("scriptLibrary storage", () => {
  beforeEach(() => {
    const storage = {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return storage.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        storage.store[key] = value;
      },
      removeItem(key: string) {
        delete storage.store[key];
      },
    };
    vi.stubGlobal("localStorage", storage);
  });

  it("returns defaults when storage is empty", () => {
    expect(loadScriptLibraryFromLocalStorage()).toEqual(DEFAULT_SCRIPT_LIBRARY_STATE);
  });

  it("round-trips library state through localStorage", () => {
    const { state } = createScript(DEFAULT_SCRIPT_LIBRARY_STATE, { displayName: "Saved" });
    saveScriptLibraryToLocalStorage(state);
    const loaded = loadScriptLibraryFromLocalStorage();
    expect(loaded.scripts[0]?.displayName).toBe("Saved");
  });

  it("marks corrupt snapshots", () => {
    localStorage.setItem(SCRIPT_LIBRARY_STORAGE_KEY, JSON.stringify({ version: 2 }));
    const loaded = normalizeScriptLibraryState(JSON.parse(localStorage.getItem(SCRIPT_LIBRARY_STORAGE_KEY)!));
    expect(loaded.corrupt).toBe(true);
    expect(loaded.scripts).toEqual([]);
  });
});
