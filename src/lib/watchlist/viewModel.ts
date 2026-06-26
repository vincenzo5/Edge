import type {
  FundamentalsSnapshot,
  QuoteSnapshot,
  WatchlistColumnId,
  WatchlistGroupMode,
  WatchlistItem,
  WatchlistSortSpec,
  WatchlistViewPrefs,
} from "./types";
import { DEFAULT_WATCHLIST_VIEW_PREFS } from "./types";

export type WatchlistRowMetrics = {
  symbol: string;
  last: number | null;
  changePct: number | null;
  volume: number | null;
  marketCap: number | null;
  sector: string | null;
};

export type WatchlistDisplayRow = {
  item: WatchlistItem;
  metrics: WatchlistRowMetrics;
  pinned: boolean;
};

export type WatchlistDisplayGroup = {
  id: string;
  label: string;
  rows: WatchlistDisplayRow[];
};

export type WatchlistDisplayModel = {
  pinnedRows: WatchlistDisplayRow[];
  groups: WatchlistDisplayGroup[];
  allTags: string[];
  viewPrefs: WatchlistViewPrefs;
};

export function resolveWatchlistViewPrefs(
  prefs: WatchlistViewPrefs | undefined,
): WatchlistViewPrefs {
  if (!prefs) return DEFAULT_WATCHLIST_VIEW_PREFS;
  const visibleColumns =
    prefs.visibleColumns?.length > 0
      ? prefs.visibleColumns
      : DEFAULT_WATCHLIST_VIEW_PREFS.visibleColumns;
  return {
    visibleColumns,
    sort: prefs.sort ?? DEFAULT_WATCHLIST_VIEW_PREFS.sort,
    groupMode: prefs.groupMode ?? DEFAULT_WATCHLIST_VIEW_PREFS.groupMode,
    filterTags: prefs.filterTags ?? [],
  };
}

function buildMetrics(
  item: WatchlistItem,
  quote: QuoteSnapshot | undefined,
  fundamentals: FundamentalsSnapshot | undefined,
): WatchlistRowMetrics {
  return {
    symbol: item.symbol,
    last: quote?.regularMarketPrice ?? fundamentals?.regularMarketPrice ?? null,
    changePct:
      quote?.regularMarketChangePercent ??
      fundamentals?.regularMarketChangePercent ??
      null,
    volume: quote?.regularMarketVolume ?? fundamentals?.volume ?? null,
    marketCap: fundamentals?.marketCap ?? null,
    sector: fundamentals?.sector ?? null,
  };
}

function compareValues(
  left: string | number | null,
  right: string | number | null,
  direction: WatchlistSortSpec["direction"],
): number {
  const factor = direction === "asc" ? 1 : -1;
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * factor;
  }
  return String(left).localeCompare(String(right)) * factor;
}

function sortValueForColumn(
  row: WatchlistDisplayRow,
  column: WatchlistColumnId,
): string | number | null {
  switch (column) {
    case "symbol":
      return row.item.symbol;
    case "last":
      return row.metrics.last;
    case "changePct":
      return row.metrics.changePct;
    case "volume":
      return row.metrics.volume;
    case "marketCap":
      return row.metrics.marketCap;
  }
}

function sortRows(
  rows: WatchlistDisplayRow[],
  sort: WatchlistSortSpec,
): WatchlistDisplayRow[] {
  return [...rows].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const primary = compareValues(
      sortValueForColumn(a, sort.column),
      sortValueForColumn(b, sort.column),
      sort.direction,
    );
    if (primary !== 0) return primary;
    return a.item.symbol.localeCompare(b.item.symbol);
  });
}

function matchesTagFilters(item: WatchlistItem, filterTags: string[]): boolean {
  if (filterTags.length === 0) return true;
  const itemTags = item.tags ?? [];
  return filterTags.every((tag) => itemTags.includes(tag));
}

function groupLabelForMode(
  item: WatchlistItem,
  metrics: WatchlistRowMetrics,
  groupMode: WatchlistGroupMode,
): string {
  switch (groupMode) {
    case "tags": {
      const tags = item.tags ?? [];
      return tags.length > 0 ? tags[0]! : "Untagged";
    }
    case "sector":
      return metrics.sector?.trim() || "Unknown sector";
    case "none":
    default:
      return "All";
  }
}

export function buildWatchlistDisplayModel(
  items: WatchlistItem[],
  quotes: QuoteSnapshot[],
  fundamentalsBySymbol: Record<string, FundamentalsSnapshot | undefined>,
  viewPrefsInput: WatchlistViewPrefs | undefined,
): WatchlistDisplayModel {
  const viewPrefs = resolveWatchlistViewPrefs(viewPrefsInput);
  const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));

  const allTags = Array.from(
    new Set(items.flatMap((item) => item.tags ?? [])),
  ).sort((a, b) => a.localeCompare(b));

  const filteredRows: WatchlistDisplayRow[] = items
    .filter((item) => matchesTagFilters(item, viewPrefs.filterTags))
    .map((item) => {
      const fundamentals = fundamentalsBySymbol[item.symbol];
      const metrics = buildMetrics(item, quoteMap.get(item.symbol), fundamentals);
      return {
        item,
        metrics,
        pinned: item.pinned === true,
      };
    });

  const pinnedRows = sortRows(
    filteredRows.filter((row) => row.pinned),
    viewPrefs.sort,
  );
  const unpinnedRows = filteredRows.filter((row) => !row.pinned);

  if (viewPrefs.groupMode === "none") {
    return {
      pinnedRows,
      groups: [
        {
          id: "all",
          label: "All",
          rows: sortRows(unpinnedRows, viewPrefs.sort),
        },
      ],
      allTags,
      viewPrefs,
    };
  }

  const grouped = new Map<string, WatchlistDisplayRow[]>();
  for (const row of unpinnedRows) {
    const label = groupLabelForMode(row.item, row.metrics, viewPrefs.groupMode);
    const bucket = grouped.get(label) ?? [];
    bucket.push(row);
    grouped.set(label, bucket);
  }

  const groups = Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, rows]) => ({
      id: label.toLowerCase().replace(/\s+/g, "-"),
      label,
      rows: sortRows(rows, viewPrefs.sort),
    }));

  return {
    pinnedRows,
    groups,
    allTags,
    viewPrefs,
  };
}

export function toggleSortSpec(
  current: WatchlistSortSpec,
  column: WatchlistColumnId,
): WatchlistSortSpec {
  if (current.column === column) {
    return {
      column,
      direction: current.direction === "asc" ? "desc" : "asc",
    };
  }
  return { column, direction: "asc" };
}

export function toggleVisibleColumn(
  visibleColumns: WatchlistColumnId[],
  column: WatchlistColumnId,
): WatchlistColumnId[] {
  if (visibleColumns.includes(column)) {
    const next = visibleColumns.filter((value) => value !== column);
    return next.length > 0 ? next : ["symbol"];
  }
  return [...visibleColumns, column];
}

export function toggleFilterTag(
  filterTags: string[],
  tag: string,
): string[] {
  return filterTags.includes(tag)
    ? filterTags.filter((value) => value !== tag)
    : [...filterTags, tag];
}

export function normalizeTagInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 24);
}
