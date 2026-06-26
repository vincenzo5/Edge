"use client";

import { Fragment } from "react";
import type { QuoteSnapshot, WatchlistItem, WatchlistSortSpec, WatchlistViewPrefs } from "@/lib/watchlist/types";
import { WATCHLIST_COLUMN_LABELS } from "@/lib/watchlist/types";
import type { WatchlistDisplayModel } from "@/lib/watchlist/viewModel";
import { toggleSortSpec } from "@/lib/watchlist/viewModel";
import WatchlistControls from "./WatchlistControls";
import WatchlistRow from "./WatchlistRow";

type Props = {
  displayModel: WatchlistDisplayModel;
  itemCount: number;
  quotes: QuoteSnapshot[];
  selectedSymbol: string | null;
  quotesError: string | null;
  quotesLoading: boolean;
  onSelect: (symbol: string) => void;
  onLoadChart: (item: WatchlistItem) => void;
  onRemove: (symbol: string) => void;
  onTogglePin: (symbol: string) => void;
  onEditTags: (symbol: string) => void;
  onViewPrefsChange: (patch: Partial<WatchlistViewPrefs>) => void;
  onSortChange: (sort: WatchlistSortSpec) => void;
};

function GroupHeader({ label }: { label: string }) {
  return (
    <tr className="bg-[var(--edge-surface-panel)] text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
      <td colSpan={99} className="px-1.5 py-0.5">
        {label}
      </td>
    </tr>
  );
}

export default function WatchlistTable({
  displayModel,
  itemCount,
  quotes,
  selectedSymbol,
  quotesError,
  quotesLoading,
  onSelect,
  onLoadChart,
  onRemove,
  onTogglePin,
  onEditTags,
  onViewPrefsChange,
  onSortChange,
}: Props) {
  const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const { pinnedRows, groups, allTags, viewPrefs } = displayModel;
  const totalRows =
    pinnedRows.length + groups.reduce((count, group) => count + group.rows.length, 0);

  return (
    <div data-testid="watchlist-table">
      <WatchlistControls
        viewPrefs={viewPrefs}
        allTags={allTags}
        onViewPrefsChange={onViewPrefsChange}
      />

      {quotesError ? (
        <div className="px-2 py-1 text-[10px] text-[var(--edge-negative)]" role="alert">
          {quotesError}
        </div>
      ) : null}
      {quotesLoading && totalRows > 0 ? (
        <div className="px-2 py-1 text-[10px] text-[var(--edge-text-secondary)]">
          Updating quotes…
        </div>
      ) : null}

      {itemCount === 0 ? (
        <div className="px-2 py-3 text-xs text-[var(--edge-text-secondary)]">
          No symbols yet. Use + to add tickers.
        </div>
      ) : totalRows === 0 ? (
        <div className="px-2 py-3 text-xs text-[var(--edge-text-secondary)]">
          No symbols match the current filters.
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
              {viewPrefs.visibleColumns.map((column) => {
                const active = viewPrefs.sort.column === column;
                const alignClass =
                  column === "symbol" ? "text-left" : "text-right";
                return (
                  <th
                    key={column}
                    className={`px-1.5 py-0.5 font-normal ${alignClass}`}
                  >
                    <button
                      type="button"
                      data-testid={`watchlist-sort-${column}`}
                      aria-pressed={active}
                      aria-label={`Sort by ${WATCHLIST_COLUMN_LABELS[column]}${
                        active
                          ? viewPrefs.sort.direction === "asc"
                            ? ", ascending"
                            : ", descending"
                          : ""
                      }`}
                      onClick={() =>
                        onSortChange(toggleSortSpec(viewPrefs.sort, column))
                      }
                      className={`edge-focus-ring inline-flex w-full cursor-pointer items-center gap-0.5 uppercase tracking-wide ${
                        column === "symbol" ? "justify-start" : "justify-end"
                      } ${
                        active
                          ? "text-[var(--edge-text-strong)]"
                          : "text-[var(--edge-text-muted)] hover:text-[var(--edge-text-primary)]"
                      }`}
                    >
                      {WATCHLIST_COLUMN_LABELS[column]}
                      {active ? (
                        <span aria-hidden>
                          {viewPrefs.sort.direction === "asc" ? "↑" : "↓"}
                        </span>
                      ) : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pinnedRows.length > 0 ? (
              <>
                <GroupHeader label="Pinned" />
                {pinnedRows.map((row) => (
                  <WatchlistRow
                    key={`pinned-${row.item.symbol}`}
                    row={row}
                    quote={quoteMap.get(row.item.symbol)}
                    selected={selectedSymbol === row.item.symbol}
                    visibleColumns={viewPrefs.visibleColumns}
                    onActivate={() => {
                      onSelect(row.item.symbol);
                      onLoadChart(row.item);
                    }}
                    onRemove={() => onRemove(row.item.symbol)}
                    onTogglePin={() => onTogglePin(row.item.symbol)}
                    onEditTags={() => onEditTags(row.item.symbol)}
                  />
                ))}
              </>
            ) : null}

            {groups.map((group) => (
              <Fragment key={group.id}>
                {viewPrefs.groupMode !== "none" ? (
                  <GroupHeader label={group.label} />
                ) : null}
                {group.rows.map((row) => (
                  <WatchlistRow
                    key={row.item.symbol}
                    row={row}
                    quote={quoteMap.get(row.item.symbol)}
                    selected={selectedSymbol === row.item.symbol}
                    visibleColumns={viewPrefs.visibleColumns}
                    onActivate={() => {
                      onSelect(row.item.symbol);
                      onLoadChart(row.item);
                    }}
                    onRemove={() => onRemove(row.item.symbol)}
                    onTogglePin={() => onTogglePin(row.item.symbol)}
                    onEditTags={() => onEditTags(row.item.symbol)}
                  />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
