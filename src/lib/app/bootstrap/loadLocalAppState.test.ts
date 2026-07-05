import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { createDefaultWorkspaceTabs } from "../workspaceTabs";
import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";
import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";

const mocks = vi.hoisted(() => ({
  loadWorkspaceTabs: vi.fn(() => createDefaultWorkspaceTabs()),
  loadWatchlistState: vi.fn(() => DEFAULT_WATCHLIST_STATE),
  loadScreenerState: vi.fn(() => DEFAULT_SCREENER_STATE),
}));

vi.mock("@/lib/app/workspaceTabsStorage", () => ({
  loadWorkspaceTabs: mocks.loadWorkspaceTabs,
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
    expect(state.workspaceTabs.tabs[0]?.layout).toEqual(DEFAULT_LAYOUT);
    expect(state.watchlist).toEqual(DEFAULT_WATCHLIST_STATE);
    expect(state.screener).toEqual(DEFAULT_SCREENER_STATE);
    expect(mocks.loadWorkspaceTabs).toHaveBeenCalledOnce();
    expect(mocks.loadWatchlistState).toHaveBeenCalledOnce();
    expect(mocks.loadScreenerState).toHaveBeenCalledOnce();
  });

  it("returns persisted workspace tabs from storage loader", () => {
    const customTabs = createDefaultWorkspaceTabs({
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "MSFT" }],
    });
    mocks.loadWorkspaceTabs.mockReturnValue(customTabs);

    const state = loadLocalAppState();
    expect(state.workspaceTabs.tabs[0]?.layout.cells[0]?.symbol).toBe("MSFT");
  });
});
