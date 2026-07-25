import type { WatchlistDisplayModel, WatchlistDisplayRow } from "@/lib/watchlist/viewModel";

export type WatchlistVirtualItem =
  | { kind: "groupHeader"; id: string; label: string }
  | { kind: "symbolRow"; id: string; row: WatchlistDisplayRow };

export function buildWatchlistVirtualItems(
  displayModel: WatchlistDisplayModel,
): WatchlistVirtualItem[] {
  const items: WatchlistVirtualItem[] = [];
  const { pinnedRows, groups, viewPrefs } = displayModel;

  if (pinnedRows.length > 0) {
    items.push({ kind: "groupHeader", id: "header-pinned", label: "Pinned" });
    for (const row of pinnedRows) {
      items.push({
        kind: "symbolRow",
        id: `pinned-${row.item.symbol}`,
        row,
      });
    }
  }

  for (const group of groups) {
    if (viewPrefs.groupMode !== "none") {
      items.push({ kind: "groupHeader", id: `header-${group.id}`, label: group.label });
    }
    for (const row of group.rows) {
      items.push({
        kind: "symbolRow",
        id: row.item.symbol,
        row,
      });
    }
  }

  return items;
}
