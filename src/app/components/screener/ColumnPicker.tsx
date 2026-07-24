"use client";

import { useRef, useState } from "react";
import type { Theme } from "@/lib/chartConfig";
import {
  ALL_SCREENER_COLUMN_IDS,
  DEFAULT_SCREENER_COLUMNS,
  SCREENER_COLUMN_LABELS,
  type ScreenerColumnId,
  type ScreenerIndicatorColumnDef,
} from "@/lib/screener/types";
import { SettingsIcon } from "../chart-chrome/ChartHeaderIcons";
import {
  ColumnPickerPopover,
  headerIconButtonClass,
  popoverPanelClass,
} from "../design-system";

type Props = {
  theme?: Theme;
  columns: ScreenerColumnId[];
  indicatorColumns?: ScreenerIndicatorColumnDef[];
  visibleIndicatorKeys?: string[];
  onColumnsChange: (columns: ScreenerColumnId[]) => void;
  onResetColumns: () => void;
  onToggleIndicatorColumn?: (key: string) => void;
};

export default function ColumnPicker({
  theme = "dark",
  columns,
  indicatorColumns = [],
  visibleIndicatorKeys = [],
  onColumnsChange,
  onResetColumns,
  onToggleIndicatorColumn,
}: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const toggleColumn = (column: ScreenerColumnId) => {
    if (columns.includes(column)) {
      if (columns.length <= 1) return;
      onColumnsChange(columns.filter((entry) => entry !== column));
      return;
    }
    onColumnsChange([...columns, column]);
  };

  const sections = [
    {
      id: "columns",
      label: "Columns",
      maxHeightClass: "max-h-56",
      items: ALL_SCREENER_COLUMN_IDS.map((column) => ({
        id: column,
        label: SCREENER_COLUMN_LABELS[column],
        checked: columns.includes(column),
        disabled: columns.includes(column) && columns.length <= 1,
        testId: `screener-column-toggle-${column}`,
      })),
    },
    ...(indicatorColumns.length > 0
      ? [
          {
            id: "indicator",
            label: "Indicator",
            maxHeightClass: "max-h-40",
            items: indicatorColumns.map((column) => ({
              id: column.key,
              label: column.label,
              checked: visibleIndicatorKeys.includes(column.key),
              testId: `screener-indicator-column-toggle-${column.key}`,
            })),
          },
        ]
      : []),
  ];

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        title="Column settings"
        aria-label="Column settings"
        aria-expanded={open}
        data-testid="screener-column-picker-trigger"
        className={`edge-icon-button edge-focus-ring ${headerIconButtonClass(theme, open, false)} h-6 w-6`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <SettingsIcon />
      </button>
      <ColumnPickerPopover
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        align="end"
        minWidth={220}
        className="px-1 py-1"
        panelClassName={popoverPanelClass(theme)}
        sections={sections}
        onToggle={(sectionId, itemId) => {
          if (sectionId === "columns") {
            toggleColumn(itemId as ScreenerColumnId);
            return;
          }
          onToggleIndicatorColumn?.(itemId);
        }}
        onReset={onResetColumns}
      />
    </>
  );
}

export { DEFAULT_SCREENER_COLUMNS as SCREENER_DEFAULT_COLUMNS };
