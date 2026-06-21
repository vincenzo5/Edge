"use client";

import { useMemo } from "react";
import ChartCell from "./ChartCell";
import type { CellConfig, GridMode, Theme, ToolbarPrefs } from "@/lib/chartConfig";
import { cellCountFor } from "@/lib/chartConfig";
import { ChartSyncProvider } from "./ChartSyncContext";

type Props = {
  gridMode: GridMode;
  linked: boolean;
  theme: Theme;
  cells: CellConfig[];
  activeCellIndex: number;
  toolbarPrefs: ToolbarPrefs;
  onCellChange: (index: number, next: CellConfig) => void;
  onActiveCellChange: (index: number) => void;
  onToolbarPrefsChange: (next: ToolbarPrefs) => void;
};

export default function ChartGrid({
  gridMode,
  linked,
  theme,
  cells,
  activeCellIndex,
  toolbarPrefs,
  onCellChange,
  onActiveCellChange,
  onToolbarPrefsChange,
}: Props) {
  const count = cellCountFor(gridMode);

  const visibleCells = useMemo(
    () => cells.slice(0, count),
    [cells, count],
  );

  const gridClass = useMemo(() => gridContainerClass(gridMode), [gridMode]);

  return (
    <ChartSyncProvider linked={linked}>
      <div
        data-testid="chart-grid"
        className={`grid min-h-0 min-w-0 flex-1 gap-1 overflow-hidden ${gridClass}`}
      >
        {visibleCells.map((cell, i) => (
          <div key={i} className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <ChartCell
              chartId={`cell-${i}`}
              config={cell}
              theme={theme}
              compact={count > 1}
              isActive={i === activeCellIndex}
              toolbarPrefs={toolbarPrefs}
              onFocus={() => onActiveCellChange(i)}
              onConfigChange={(next) => onCellChange(i, next)}
              onToolbarPrefsChange={onToolbarPrefsChange}
            />
          </div>
        ))}
      </div>
    </ChartSyncProvider>
  );
}

function gridContainerClass(mode: GridMode): string {
  switch (mode) {
    case "1x1":
      return "grid-cols-1 chart-grid-rows-1";
    case "2x1":
      return "grid-cols-1 chart-grid-rows-2";
    case "1x2":
      return "grid-cols-2 chart-grid-rows-1";
    case "3x1":
      return "grid-cols-1 chart-grid-rows-3";
    case "2x2":
      return "grid-cols-2 chart-grid-rows-2";
  }
}
