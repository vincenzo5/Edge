import { describe, expect, it } from "vitest";
import type { WatchlistItem } from "./types";
import { DEFAULT_WATCHLIST_VIEW_PREFS } from "./types";
import {
  buildWatchlistDisplayModel,
  normalizeTagInput,
  toggleFilterTag,
  toggleSortSpec,
  toggleVisibleColumn,
} from "./viewModel";

const items: WatchlistItem[] = [
  { symbol: "AAPL", addedAt: 1, pinned: true, tags: ["Tech"] },
  { symbol: "MSFT", addedAt: 2, tags: ["Tech", "AI"] },
  { symbol: "XOM", addedAt: 3, tags: ["Energy"] },
];

describe("watchlist viewModel", () => {
  it("places pinned rows before grouped rows", () => {
    const model = buildWatchlistDisplayModel(
      items,
      [],
      {
        AAPL: { symbol: "AAPL", sector: "Technology" } as never,
        MSFT: { symbol: "MSFT", sector: "Technology" } as never,
        XOM: { symbol: "XOM", sector: "Energy" } as never,
      },
      DEFAULT_WATCHLIST_VIEW_PREFS,
    );

    expect(model.pinnedRows.map((row) => row.item.symbol)).toEqual(["AAPL"]);
    expect(model.groups[0]?.rows.map((row) => row.item.symbol)).toEqual([
      "MSFT",
      "XOM",
    ]);
  });

  it("groups by sector and filters by tags", () => {
    const model = buildWatchlistDisplayModel(
      items,
      [],
      {
        AAPL: { symbol: "AAPL", sector: "Technology" } as never,
        MSFT: { symbol: "MSFT", sector: "Technology" } as never,
        XOM: { symbol: "XOM", sector: "Energy" } as never,
      },
      {
        ...DEFAULT_WATCHLIST_VIEW_PREFS,
        groupMode: "sector",
        filterTags: ["Tech"],
      },
    );

    expect(model.pinnedRows).toHaveLength(1);
    expect(model.groups).toHaveLength(1);
    expect(model.groups[0]?.label).toBe("Technology");
    expect(model.groups[0]?.rows.map((row) => row.item.symbol)).toEqual(["MSFT"]);
  });

  it("sorts by change percent descending", () => {
    const model = buildWatchlistDisplayModel(
      items,
      [
        {
          symbol: "MSFT",
          regularMarketPrice: 400,
          regularMarketChange: 2,
          regularMarketChangePercent: 2,
          regularMarketVolume: 1000,
          updatedAt: 1,
        },
        {
          symbol: "XOM",
          regularMarketPrice: 100,
          regularMarketChange: -1,
          regularMarketChangePercent: -1,
          regularMarketVolume: 500,
          updatedAt: 1,
        },
      ],
      {},
      {
        ...DEFAULT_WATCHLIST_VIEW_PREFS,
        sort: { column: "changePct", direction: "desc" },
      },
    );

    expect(model.groups[0]?.rows.map((row) => row.item.symbol)).toEqual([
      "MSFT",
      "XOM",
    ]);
  });

  it("toggles sort, columns, and filter tags", () => {
    expect(toggleSortSpec({ column: "symbol", direction: "asc" }, "symbol")).toEqual({
      column: "symbol",
      direction: "desc",
    });
    expect(toggleVisibleColumn(["symbol", "last"], "volume")).toEqual([
      "symbol",
      "last",
      "volume",
    ]);
    expect(toggleFilterTag([], "Tech")).toEqual(["Tech"]);
    expect(toggleFilterTag(["Tech"], "Tech")).toEqual([]);
    expect(normalizeTagInput("  AI  ")).toBe("AI");
  });
});
