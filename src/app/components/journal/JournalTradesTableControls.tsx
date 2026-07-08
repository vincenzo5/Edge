"use client";

import { useEffect, useRef, useState } from "react";
import { EdgeButton, EdgeSegmentedTabs } from "@/app/components/design-system";
import {
  formatJournalTradesResultLabel,
  JOURNAL_TRADES_PAGE_SIZE_OPTIONS,
  JOURNAL_TRADES_TABLE_COLUMNS,
  type JournalTradesPaginationMeta,
  type JournalTradesTableColumnId,
  type JournalTradesTableDensity,
} from "@/lib/journal/journalTradesTableControls";

type Props = {
  meta: JournalTradesPaginationMeta;
  visibleColumns: JournalTradesTableColumnId[];
  density: JournalTradesTableDensity;
  onVisibleColumnsChange: (columns: JournalTradesTableColumnId[]) => void;
  onDensityChange: (density: JournalTradesTableDensity) => void;
  onPageSizeChange: (pageSize: number) => void;
  onPageChange: (page: number) => void;
};

export default function JournalTradesTableControls({
  meta,
  visibleColumns,
  density,
  onVisibleColumnsChange,
  onDensityChange,
  onPageSizeChange,
  onPageChange,
}: Props) {
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!columnsOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!columnsRef.current?.contains(event.target as Node)) {
        setColumnsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [columnsOpen]);

  const showPagination = meta.total > meta.pageSize;
  const toggleableColumns = JOURNAL_TRADES_TABLE_COLUMNS.filter((col) => col.toggleable);

  return (
    <div
      data-testid="journal-trades-table-controls"
      className="mb-2 flex flex-wrap items-center justify-between gap-2"
    >
      <p
        data-testid="journal-trades-result-count"
        className="text-xs text-[var(--edge-text-secondary)]"
      >
        {formatJournalTradesResultLabel(meta)}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div ref={columnsRef} className="relative">
          <EdgeButton
            variant="chrome"
            data-testid="journal-trades-columns-trigger"
            onClick={() => setColumnsOpen((open) => !open)}
          >
            Columns
          </EdgeButton>
          {columnsOpen ? (
            <div
              data-testid="journal-trades-columns-popover"
              className="edge-popover absolute right-0 z-20 mt-1 min-w-[10rem] rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] p-2 shadow-lg"
            >
              <ul className="flex flex-col gap-1">
                {toggleableColumns.map((column) => {
                  const checked = visibleColumns.includes(column.id);
                  return (
                    <li key={column.id}>
                      <label className="flex cursor-pointer items-center gap-2 px-1 py-0.5 text-xs text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)]">
                        <input
                          type="checkbox"
                          data-testid={`journal-trades-column-${column.id}`}
                          checked={checked}
                          onChange={() => {
                            const set = new Set(visibleColumns);
                            if (set.has(column.id)) {
                              if (set.size > 2) set.delete(column.id);
                            } else {
                              set.add(column.id);
                            }
                            set.add("chart");
                            const ordered = JOURNAL_TRADES_TABLE_COLUMNS.filter((col) =>
                              set.has(col.id),
                            ).map((col) => col.id);
                            onVisibleColumnsChange(ordered);
                          }}
                        />
                        <span>{column.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        <div data-testid="journal-trades-density">
          <EdgeSegmentedTabs
            segments={[
              { id: "compact", label: "Compact" },
              { id: "comfortable", label: "Comfortable" },
            ]}
            value={density}
            onChange={(id) => onDensityChange(id as JournalTradesTableDensity)}
          />
        </div>

        <label className="inline-flex items-center gap-1.5 text-xs text-[var(--edge-text-secondary)]">
          <span>Rows</span>
          <select
            data-testid="journal-trades-page-size"
            className="rounded border border-[var(--edge-border)] bg-transparent px-2 py-1 text-xs text-[var(--edge-text-primary)]"
            value={meta.pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {JOURNAL_TRADES_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        {showPagination ? (
          <div className="flex items-center gap-1">
            <EdgeButton
              variant="chrome"
              data-testid="journal-trades-page-prev"
              disabled={meta.page <= 1}
              onClick={() => onPageChange(meta.page - 1)}
            >
              Prev
            </EdgeButton>
            <span
              data-testid="journal-trades-page-indicator"
              className="px-1 text-xs text-[var(--edge-text-secondary)]"
            >
              {meta.page} / {meta.pageCount}
            </span>
            <EdgeButton
              variant="chrome"
              data-testid="journal-trades-page-next"
              disabled={meta.page >= meta.pageCount}
              onClick={() => onPageChange(meta.page + 1)}
            >
              Next
            </EdgeButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
