"use client";

import { useMemo } from "react";
import ChartCell from "./ChartCell";
import type { CellConfig, GridMode, Theme, ToolbarPrefs } from "@/lib/chartConfig";
import { cellCountFor } from "@/lib/chartConfig";
import { resolveGridContainerClass } from "@/lib/responsive/responsiveLayout";
import { useElementSize } from "@/lib/responsive/useElementSize";
import { ChartSyncProvider } from "./ChartSyncContext";

type Props = {
  gridMode: GridMode;
  linkCrosshair: boolean;
  linkDrawings: boolean;
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
  linkCrosshair,
  linkDrawings,
  theme,
  cells,
  activeCellIndex,
  toolbarPrefs,
  onCellChange,
  onActiveCellChange,
  onToolbarPrefsChange,
}: Props) {
  const count = cellCountFor(gridMode);
  const [gridRef, gridSize] = useElementSize<HTMLDivElement>();

  const visibleCells = useMemo(
    () => cells.slice(0, count),
    [cells, count],
  );

  const gridClass = useMemo(
    () =>
      resolveGridContainerClass(
        gridMode,
        gridSize.width > 0 ? gridSize.width : 1440,
      ),
    [gridMode, gridSize.width],
  );

  return (
    <ChartSyncProvider linkCrosshair={linkCrosshair} linkDrawings={linkDrawings}>
      <div
        ref={gridRef}
        data-testid="chart-grid"
        data-grid-stacked={
          gridClass.includes("grid-cols-1") &&
          (gridMode === "1x2" || gridMode === "2x2")
            ? "true"
            : "false"
        }
        className={`grid min-h-0 min-w-0 flex-1 gap-px overflow-hidden bg-[var(--edge-border)] ${gridClass}`}
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
