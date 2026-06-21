"use client";

import { useEffect, useMemo, useRef } from "react";
import ChartCell from "./ChartCell";
import type { CellConfig, GridMode, Theme } from "@/lib/chartConfig";
import { cellCountFor } from "@/lib/chartConfig";
import { ChartSyncProvider } from "./ChartSyncContext";

type Props = {
  gridMode: GridMode;
  linked: boolean;
  theme: Theme;
  cells: CellConfig[];
  onCellChange: (index: number, next: CellConfig) => void;
};

export default function ChartGrid({
  gridMode,
  linked,
  theme,
  cells,
  onCellChange,
}: Props) {
  const count = cellCountFor(gridMode);
  const lastCountRef = useRef(count);

  // When count grows, ensure cells array has entries (caller manages this,
  // but we guard against missing entries defensively).
  const visibleCells = useMemo(
    () => cells.slice(0, count),
    [cells, count],
  );

  const handleCellChange = (index: number, next: CellConfig) => {
    onCellChange(index, next);
    if (linked) {
      // Propagate symbol/range/interval to all other cells.
      for (let i = 0; i < cells.length; i++) {
        if (i === index) continue;
        onCellChange(i, {
          ...cells[i],
          symbol: next.symbol,
          range: next.range,
          interval: next.interval,
        });
      }
    }
  };

  const gridClass = useMemo(() => gridContainerClass(gridMode), [gridMode]);

  return (
    <ChartSyncProvider>
      <div className={`grid flex-1 gap-1 ${gridClass}`}>
        {visibleCells.map((cell, i) => (
          <div key={i} className="flex min-h-0 min-w-0 flex-col">
            <ChartCell
              chartId={`cell-${i}`}
              config={cell}
              theme={theme}
              onConfigChange={(next) => handleCellChange(i, next)}
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
      return "grid-cols-1 grid-rows-1";
    case "2x1":
      return "grid-cols-1 grid-rows-2";
    case "1x2":
      return "grid-cols-2 grid-rows-1";
    case "3x1":
      return "grid-cols-1 grid-rows-3";
    case "2x2":
      return "grid-cols-2 grid-rows-2";
  }
}
