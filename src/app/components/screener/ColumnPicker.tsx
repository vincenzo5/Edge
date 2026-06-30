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
import ChartAnchoredPopover from "../chart-chrome/ChartAnchoredPopover";
import { SettingsIcon } from "../chart-chrome/ChartHeaderIcons";
import { EdgeMenuItem, EdgeMenuSectionHeader, headerIconButtonClass } from "../design-system";

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
      <ChartAnchoredPopover
        open={open}
        anchorRef={anchorRef}
        theme={theme}
        align="end"
        minWidth={220}
        className="px-1 py-1"
        onClose={() => setOpen(false)}
      >
        <EdgeMenuSectionHeader label="Columns" />
        <div className="max-h-56 overflow-y-auto py-1">
          {ALL_SCREENER_COLUMN_IDS.map((column) => (
            <label
              key={column}
              className="edge-menu-item edge-focus-ring flex cursor-pointer items-center gap-2"
              data-testid={`screener-column-toggle-${column}`}
            >
              <input
                type="checkbox"
                checked={columns.includes(column)}
                onChange={() => toggleColumn(column)}
                aria-label={SCREENER_COLUMN_LABELS[column]}
              />
              <span className="truncate text-xs">{SCREENER_COLUMN_LABELS[column]}</span>
            </label>
          ))}
        </div>
        {indicatorColumns.length > 0 ? (
          <>
            <EdgeMenuSectionHeader label="Indicator" />
            <div className="max-h-40 overflow-y-auto py-1">
              {indicatorColumns.map((column) => (
                <label
                  key={column.key}
                  className="edge-menu-item edge-focus-ring flex cursor-pointer items-center gap-2"
                  data-testid={`screener-indicator-column-toggle-${column.key}`}
                >
                  <input
                    type="checkbox"
                    checked={visibleIndicatorKeys.includes(column.key)}
                    onChange={() => onToggleIndicatorColumn?.(column.key)}
                    aria-label={column.label}
                  />
                  <span className="truncate text-xs">{column.label}</span>
                </label>
              ))}
            </div>
          </>
        ) : null}
        <EdgeMenuItem
          label="Reset to default"
          onClick={() => {
            onResetColumns();
            setOpen(false);
          }}
        />
      </ChartAnchoredPopover>
    </>
  );
}

export { DEFAULT_SCREENER_COLUMNS as SCREENER_DEFAULT_COLUMNS };
