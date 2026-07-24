"use client";

import { useRef, useState } from "react";
import {
  ColumnPickerPopover,
  EdgeButton,
} from "@/app/components/design-system";
import {
  defaultJournalTradesTablePrefs,
  formatJournalTradesResultLabel,
  JOURNAL_TRADES_TABLE_COLUMNS,
  reorderJournalTradesToggleableColumns,
  toggleJournalTradesTableColumn,
  type JournalTradesResultMeta,
  type JournalTradesTableColumnId,
} from "@/lib/journal/journalTradesTableControls";

type Props = {
  meta: JournalTradesResultMeta;
  visibleColumns: JournalTradesTableColumnId[];
  columnOrder: JournalTradesTableColumnId[];
  onVisibleColumnsChange: (columns: JournalTradesTableColumnId[]) => void;
  onColumnOrderChange: (order: JournalTradesTableColumnId[]) => void;
};

export default function JournalTradesTableControls({
  meta,
  visibleColumns,
  columnOrder,
  onVisibleColumnsChange,
  onColumnOrderChange,
}: Props) {
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsTriggerRef = useRef<HTMLButtonElement>(null);

  const toggleableColumnIds = columnOrder.filter(
    (id) => JOURNAL_TRADES_TABLE_COLUMNS.find((col) => col.id === id)?.toggleable,
  );
  const toggleableColumns = toggleableColumnIds
    .map((id) => JOURNAL_TRADES_TABLE_COLUMNS.find((col) => col.id === id))
    .filter((col): col is NonNullable<typeof col> => col != null);

  const handleColumnToggle = (_sectionId: string, columnId: string) => {
    onVisibleColumnsChange(
      toggleJournalTradesTableColumn(
        visibleColumns,
        columnId as JournalTradesTableColumnId,
        columnOrder,
      ),
    );
  };

  const handleColumnReorder = (_sectionId: string, fromIndex: number, toIndex: number) => {
    onColumnOrderChange(reorderJournalTradesToggleableColumns(columnOrder, fromIndex, toIndex));
  };

  const handleResetColumns = () => {
    const defaults = defaultJournalTradesTablePrefs();
    onVisibleColumnsChange(defaults.visibleColumns);
    onColumnOrderChange(defaults.columnOrder);
  };

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
        <EdgeButton
          ref={columnsTriggerRef}
          variant="chrome"
          data-testid="journal-trades-columns-trigger"
          aria-expanded={columnsOpen}
          onClick={() => setColumnsOpen((open) => !open)}
        >
          Columns
        </EdgeButton>
        <ColumnPickerPopover
          open={columnsOpen}
          anchorRef={columnsTriggerRef}
          onClose={() => setColumnsOpen(false)}
          align="end"
          minWidth={200}
          className="p-2"
          reorderable
          sections={[
            {
              id: "columns",
              label: "",
              items: toggleableColumns.map((column) => ({
                id: column.id,
                label: column.label,
                checked: visibleColumns.includes(column.id),
                disabled: visibleColumns.includes(column.id) && visibleColumns.length <= 2,
                testId: `journal-trades-column-${column.id}`,
              })),
            },
          ]}
          onToggle={handleColumnToggle}
          onReorder={handleColumnReorder}
          onReset={handleResetColumns}
        />
      </div>
    </div>
  );
}
