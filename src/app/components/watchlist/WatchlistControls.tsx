"use client";

import type {
  WatchlistColumnId,
  WatchlistGroupMode,
  WatchlistViewPrefs,
} from "@/lib/watchlist/types";
import { WATCHLIST_COLUMN_LABELS } from "@/lib/watchlist/types";
import { toggleFilterTag, toggleVisibleColumn } from "@/lib/watchlist/viewModel";

type Props = {
  viewPrefs: WatchlistViewPrefs;
  allTags: string[];
  onViewPrefsChange: (patch: Partial<WatchlistViewPrefs>) => void;
};

const GROUP_MODES: Array<{ id: WatchlistGroupMode; label: string }> = [
  { id: "none", label: "Flat" },
  { id: "tags", label: "Tags" },
  { id: "sector", label: "Sector" },
];

const OPTIONAL_COLUMNS: WatchlistColumnId[] = [
  "volume",
  "marketCap",
];

export default function WatchlistControls({
  viewPrefs,
  allTags,
  onViewPrefsChange,
}: Props) {
  return (
    <div
      data-testid="watchlist-controls"
      className="space-y-1 border-b border-[var(--edge-border-subtle)] px-1.5 py-1"
    >
      <div className="flex flex-wrap items-center gap-1">
        {GROUP_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            data-testid={`watchlist-group-${mode.id}`}
            aria-pressed={viewPrefs.groupMode === mode.id}
            onClick={() => onViewPrefsChange({ groupMode: mode.id })}
            className={`edge-focus-ring rounded-[var(--edge-radius-xs)] px-1.5 py-0.5 text-[10px] ${
              viewPrefs.groupMode === mode.id
                ? "bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]"
                : "text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]"
            }`}
          >
            {mode.label}
          </button>
        ))}
        <span className="mx-0.5 h-3 w-px bg-[var(--edge-border)]" aria-hidden />
        {OPTIONAL_COLUMNS.map((column) => {
          const active = viewPrefs.visibleColumns.includes(column);
          return (
            <button
              key={column}
              type="button"
              data-testid={`watchlist-column-${column}`}
              aria-pressed={active}
              onClick={() =>
                onViewPrefsChange({
                  visibleColumns: toggleVisibleColumn(viewPrefs.visibleColumns, column),
                })
              }
              className={`edge-focus-ring rounded-[var(--edge-radius-xs)] px-1.5 py-0.5 text-[10px] ${
                active
                  ? "bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]"
                  : "text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]"
              }`}
            >
              {WATCHLIST_COLUMN_LABELS[column]}
            </button>
          );
        })}
      </div>

      {allTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-[var(--edge-text-muted)]">Filter</span>
          {allTags.map((tag) => {
            const active = viewPrefs.filterTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                data-testid={`watchlist-filter-${tag}`}
                aria-pressed={active}
                onClick={() =>
                  onViewPrefsChange({
                    filterTags: toggleFilterTag(viewPrefs.filterTags, tag),
                  })
                }
                className={`edge-focus-ring rounded-[var(--edge-radius-xs)] px-1.5 py-0.5 text-[10px] ${
                  active
                    ? "bg-[color-mix(in_srgb,var(--edge-accent-blue)_18%,transparent)] text-[var(--edge-accent-blue)]"
                    : "text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
