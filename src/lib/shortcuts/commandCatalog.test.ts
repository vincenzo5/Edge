import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  filterCommandsByQuery,
  getCommandLabel,
  allCatalogCommandIds,
} from "./commandCatalog";
import { quickGuideCommandIds, QUICK_GUIDE_GROUPS } from "./quickGuide";
import {
  clearRecentCommandsForTests,
  pushRecentCommand,
  readRecentCommands,
} from "./recentCommands";

describe("commandCatalog", () => {
  it("includes labels for every catalog id", () => {
    for (const id of allCatalogCommandIds()) {
      expect(getCommandLabel(id)).not.toBe("");
    }
  });

  it("filters commands by query tokens", () => {
    const ids = allCatalogCommandIds();
    const filtered = filterCommandsByQuery(ids, "watchlist panel");
    expect(filtered).toContain("toggleWatchlist");
    expect(filtered).not.toContain("undo");
  });

  it("returns all ids when query is empty", () => {
    const ids = allCatalogCommandIds();
    expect(filterCommandsByQuery(ids, "")).toEqual(ids);
  });
});

describe("quickGuide", () => {
  it("lists curated groups without duplicates", () => {
    expect(QUICK_GUIDE_GROUPS.length).toBeGreaterThan(0);
    const ids = quickGuideCommandIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("changeSymbol");
    expect(ids).toContain("toggleWatchlist");
  });
});

describe("recentCommands", () => {
  beforeEach(() => {
    clearRecentCommandsForTests();
  });

  afterEach(() => {
    clearRecentCommandsForTests();
  });

  it("persists recent command ids in order", () => {
    pushRecentCommand("toggleWatchlist");
    pushRecentCommand("changeSymbol");
    expect(readRecentCommands()).toEqual(["changeSymbol", "toggleWatchlist"]);
  });

  it("dedupes and caps recent commands", () => {
    for (let i = 0; i < 10; i += 1) {
      pushRecentCommand(`activateCell${(i % 4) + 1}` as "activateCell1");
    }
    expect(readRecentCommands().length).toBeLessThanOrEqual(8);
    pushRecentCommand("toggleWatchlist");
    pushRecentCommand("toggleWatchlist");
    expect(readRecentCommands()[0]).toBe("toggleWatchlist");
    expect(readRecentCommands().filter((id) => id === "toggleWatchlist")).toHaveLength(1);
  });
});
