import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";
import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";

const mocks = vi.hoisted(() => ({
  loadLayout: vi.fn(() => DEFAULT_LAYOUT),
  loadWatchlistState: vi.fn(() => DEFAULT_WATCHLIST_STATE),
  loadScreenerState: vi.fn(() => DEFAULT_SCREENER_STATE),
}));

vi.mock("@/lib/layoutStorage", () => ({
  loadLayout: mocks.loadLayout,
}));

vi.mock("@/lib/watchlist/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watchlist/storage")>();
  return {
    ...actual,
    loadWatchlistState: mocks.loadWatchlistState,
  };
});

vi.mock("@/lib/screener/screenStorage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/screener/screenStorage")>();
  return {
    ...actual,
    loadScreenerState: mocks.loadScreenerState,
  };
});

import { loadLocalAppState } from "./loadLocalAppState";

describe("loadLocalAppState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns defaults when storage loaders return defaults", () => {
    const state = loadLocalAppState();
    expect(state.layout).toEqual(DEFAULT_LAYOUT);
    expect(state.watchlist).toEqual(DEFAULT_WATCHLIST_STATE);
    expect(state.screener).toEqual(DEFAULT_SCREENER_STATE);
    expect(mocks.loadLayout).toHaveBeenCalledOnce();
    expect(mocks.loadWatchlistState).toHaveBeenCalledOnce();
    expect(mocks.loadScreenerState).toHaveBeenCalledOnce();
  });

  it("returns persisted values from storage loaders", () => {
    const customLayout = {
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0], symbol: "MSFT" }],
    };
    mocks.loadLayout.mockReturnValue(customLayout);

    const state = loadLocalAppState();
    expect(state.layout.cells[0]?.symbol).toBe("MSFT");
  });
});
