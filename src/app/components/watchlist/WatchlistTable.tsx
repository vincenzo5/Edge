"use client";

import { useVirtualizer, observeElementOffset, type Virtualizer } from "@tanstack/react-virtual";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import type { QuoteSnapshot, WatchlistItem, WatchlistSortSpec, WatchlistViewPrefs } from "@/lib/watchlist/types";
import { WATCHLIST_COLUMN_LABELS } from "@/lib/watchlist/types";
import type { WatchlistDisplayModel } from "@/lib/watchlist/viewModel";
import { toggleSortSpec } from "@/lib/watchlist/viewModel";
import WatchlistControls from "./WatchlistControls";
import WatchlistRow, { type WatchlistRowActions } from "./WatchlistRow";
import {
  buildWatchlistVirtualItems,
  type WatchlistVirtualItem,
} from "./watchlistVirtualItems";

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

const GROUP_HEADER_HEIGHT = 22;
const ROW_HEIGHT = 32;
const VIRTUAL_OVERSCAN = 8;

function observeWatchlistScrollRect<T extends Element>(
  instance: Virtualizer<T, Element>,
  cb: (rect: { width: number; height: number }) => void,
) {
  const element = instance.scrollElement;
  if (!element) {
    return () => {};
  }

  const notify = () => {
    const rect = element.getBoundingClientRect();
    cb({
      width: rect.width,
      height: rect.height,
    });
  };

  notify();
  const observer = new ResizeObserver(notify);
  observer.observe(element);
  return () => observer.disconnect();
}

function GroupHeader({ label }: { label: string }) {
  return (
    <tr className="bg-[var(--edge-surface-panel)] text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
      <td colSpan={99} className="px-1.5 py-0.5">
        {label}
      </td>
    </tr>
  );
}

function estimateVirtualItemSize(item: WatchlistVirtualItem | undefined): number {
  if (!item) return ROW_HEIGHT;
  return item.kind === "groupHeader" ? GROUP_HEADER_HEIGHT : ROW_HEIGHT;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const quoteMap = useMemo(
    () => new Map(quotes.map((quote) => [quote.symbol, quote])),
    [quotes],
  );
  const { allTags, viewPrefs } = displayModel;
  const virtualItems = useMemo(
    () => buildWatchlistVirtualItems(displayModel),
    [displayModel],
  );
  const totalRows = virtualItems.filter((item) => item.kind === "symbolRow").length;

  const rowActionBySymbol = useMemo(() => {
    const map = new Map<string, WatchlistRowActions>();
    for (const item of virtualItems) {
      if (item.kind !== "symbolRow") continue;
      const { symbol } = item.row.item;
      map.set(symbol, {
        onActivate: () => {
          onSelect(symbol);
          onLoadChart(item.row.item);
        },
        onRemove: () => onRemove(symbol),
        onTogglePin: () => onTogglePin(symbol),
        onEditTags: () => onEditTags(symbol),
      });
    }
    return map;
  }, [virtualItems, onSelect, onLoadChart, onRemove, onTogglePin, onEditTags]);

  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => estimateVirtualItemSize(virtualItems[index]),
    overscan: VIRTUAL_OVERSCAN,
    getItemKey: (index) => virtualItems[index]?.id ?? index,
    observeElementRect: observeWatchlistScrollRect,
    observeElementOffset,
  });

  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, virtualItems.length, viewPrefs.visibleColumns.length]);

  const virtualRows = rowVirtualizer.getVirtualItems();
  const isVirtualized = virtualRows.length > 0;
  const paddingTop = isVirtualized && virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const paddingBottom =
    isVirtualized && virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1]!.end
      : 0;

  const renderVirtualItem = useCallback(
    (
      item: WatchlistVirtualItem,
      index: number,
      measureRef?: (node: Element | null) => void,
    ) => {
      if (item.kind === "groupHeader") {
        return (
          <GroupHeader
            key={item.id}
            label={item.label}
          />
        );
      }

      const symbol = item.row.item.symbol;
      const actions = rowActionBySymbol.get(symbol);
      if (!actions) return null;

      return (
        <WatchlistRow
          key={item.id}
          row={item.row}
          quote={quoteMap.get(symbol)}
          selected={selectedSymbol === symbol}
          visibleColumns={viewPrefs.visibleColumns}
          actions={actions}
          measureRef={measureRef}
          virtualIndex={index}
        />
      );
    },
    [quoteMap, rowActionBySymbol, selectedSymbol, viewPrefs.visibleColumns],
  );

  return (
    <div data-testid="watchlist-table" className="flex min-h-0 flex-1 flex-col">
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
        <div
          ref={scrollRef}
          data-testid="watchlist-table-scroll"
          className="min-h-0 flex-1 overflow-auto"
        >
          <table className="w-full">
            <thead className="sticky top-0 z-[1] bg-[var(--edge-surface-panel)]">
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
              {isVirtualized && paddingTop > 0 ? (
                <tr aria-hidden="true">
                  <td colSpan={99} style={{ height: paddingTop, padding: 0, border: 0 }} />
                </tr>
              ) : null}
              {isVirtualized
                ? virtualRows.map((virtualRow) => {
                    const item = virtualItems[virtualRow.index]!;
                    if (item.kind === "groupHeader") {
                      return renderVirtualItem(item, virtualRow.index);
                    }
                    return renderVirtualItem(
                      item,
                      virtualRow.index,
                      rowVirtualizer.measureElement,
                    );
                  })
                : virtualItems.map((item, index) => renderVirtualItem(item, index))}
              {isVirtualized && paddingBottom > 0 ? (
                <tr aria-hidden="true">
                  <td colSpan={99} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
