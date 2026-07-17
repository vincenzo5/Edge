/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import {
  clearScreenerStorage,
  ensureStarterScreens,
  DEFAULT_SCREENER_STATE,
  loadScreenerState,
  saveScreenerState,
  upsertSavedScreen,
  deleteSavedScreen,
  loadSavedScreen,
  MAX_SAVED_SCREENS,
} from "./screenStorage";
import { SCREENER_PRESETS } from "./presets";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("screenStorage", () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearScreenerStorage();
  });

  it("round-trips screener state", () => {
    const state = ensureStarterScreens({
      ...DEFAULT_SCREENER_STATE,
      query: { sector: "Technology", limit: 100 },
      sort: { column: "sector" as const, direction: "asc" as const },
    });
    saveScreenerState(state);
    expect(loadScreenerState()).toEqual(state);
  });

  it("normalizes sort and new columns on load", () => {
    saveScreenerState({
      version: 1,
      activeScreenId: null,
      query: { limit: 200 },
      columns: ["symbol", "country", "change"],
      sort: { column: "country", direction: "desc" },
      savedScreens: [],
    });
    const loaded = loadScreenerState();
    expect(loaded.columns).toEqual(["symbol", "country", "change"]);
    expect(loaded.sort).toEqual({ column: "country", direction: "desc" });
  });

  it("drops invalid sort on load", () => {
    localStorageMock.setItem(
      "tv-ai:screener:v1",
      JSON.stringify({
        version: 1,
        activeScreenId: null,
        query: { limit: 200 },
        columns: DEFAULT_SCREENER_STATE.columns,
        sort: { column: "not-a-column", direction: "asc" },
        savedScreens: [],
      }),
    );
    expect(loadScreenerState().sort).toBeNull();
  });

  it("returns defaults for malformed JSON", () => {
    localStorageMock.setItem("tv-ai:screener:v1", "{not-json");
    const loaded = loadScreenerState();
    expect(loaded.version).toBe(1);
    expect(loaded.savedScreens.length).toBe(SCREENER_PRESETS.length);
  });

  it("saves, loads, and deletes named screens", () => {
    const saved = upsertSavedScreen(DEFAULT_SCREENER_STATE, {
      id: "screen-1",
      name: "Tech large cap",
      kind: "screener",
      query: { sector: "Technology", marketCap: { min: 10_000_000_000 }, limit: 50 },
      columns: DEFAULT_SCREENER_STATE.columns,
      createdAt: 1,
      updatedAt: 1,
    });
    saveScreenerState(saved);
    const loaded = loadScreenerState();
    expect(loaded.savedScreens.some((screen) => screen.id === "screen-1")).toBe(true);
    expect(loadSavedScreen(loaded, "screen-1").query.sector).toBe("Technology");
    const deleted = deleteSavedScreen(loaded, "screen-1");
    saveScreenerState(deleted);
    expect(loadScreenerState().savedScreens.some((screen) => screen.id === "screen-1")).toBe(false);
  });

  it("caps saved screens at MAX_SAVED_SCREENS", () => {
    let state = DEFAULT_SCREENER_STATE;
    for (let i = 0; i < MAX_SAVED_SCREENS + 5; i += 1) {
      state = upsertSavedScreen(state, {
        id: `screen-${i}`,
        name: `Screen ${i}`,
        kind: "screener",
        query: { limit: 10 },
        columns: state.columns,
        createdAt: i,
        updatedAt: i,
      });
    }
    expect(state.savedScreens).toHaveLength(MAX_SAVED_SCREENS);
  });

  it("seeds starter screens when missing", () => {
    const seeded = ensureStarterScreens(DEFAULT_SCREENER_STATE);
    expect(seeded.savedScreens.length).toBe(SCREENER_PRESETS.length);
    expect(seeded.savedScreens.some((screen) => screen.id === "gainers" && screen.isStarter)).toBe(
      true,
    );
  });

  it("does not overwrite existing starter ids on ensure", () => {
    const custom = upsertSavedScreen(DEFAULT_SCREENER_STATE, {
      id: "gainers",
      name: "My custom gainers",
      kind: "movers",
      moverKind: "gainers",
      limit: 25,
      columns: DEFAULT_SCREENER_STATE.columns,
      createdAt: 1,
      updatedAt: 1,
    });
    const seeded = ensureStarterScreens(custom);
    expect(seeded.savedScreens.find((screen) => screen.id === "gainers")?.name).toBe(
      "My custom gainers",
    );
  });
});
