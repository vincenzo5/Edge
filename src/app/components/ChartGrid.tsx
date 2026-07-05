"use client";

import { useMemo } from "react";
import ChartCell from "./ChartCell";
import type { CellConfig, LayoutTemplateId, Theme, ToolbarPrefs } from "@/lib/chartConfig";
import { cellCountFor, getLayoutTemplate } from "@/lib/chartConfig";
import { resolveLayoutGridStyles } from "@/lib/chart/layoutTemplateGrid";
import { shouldStackLayout } from "@/lib/responsive/responsiveLayout";
import type { RailMode } from "@/lib/responsive/responsiveLayout";
import { useElementSize } from "@/lib/responsive/useElementSize";
import { ChartSyncProvider } from "./ChartSyncContext";
import ChartDrawingRail from "./chart-chrome/ChartDrawingRail";
import type { SymbolSelectResult } from "@/lib/watchlist/types";

export type ChartSymbolNav = {
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onSymbolSelect: (result: SymbolSelectResult) => void;
};

type Props = {
  layoutId: LayoutTemplateId;
  linkCrosshair: boolean;
  linkDrawings: boolean;
  theme: Theme;
  cells: CellConfig[];
  activeCellIndex: number;
  toolbarPrefs: ToolbarPrefs;
  railMode?: RailMode;
  symbolNav?: ChartSymbolNav;
  onCellChange: (index: number, next: CellConfig) => void;
  onActiveCellChange: (index: number) => void;
  onToolbarPrefsChange: (next: ToolbarPrefs) => void;
};

export default function ChartGrid({
  layoutId,
  linkCrosshair,
  linkDrawings,
  theme,
  cells,
  activeCellIndex,
  toolbarPrefs,
  railMode = "full",
  symbolNav,
  onCellChange,
  onActiveCellChange,
  onToolbarPrefsChange,
}: Props) {
  const count = cellCountFor(layoutId);
  const [gridRef, gridSize] = useElementSize<HTMLDivElement>();

  const visibleCells = useMemo(
    () => cells.slice(0, count),
    [cells, count],
  );

  const template = useMemo(() => getLayoutTemplate(layoutId), [layoutId]);
  const availableWidth = gridSize.width > 0 ? gridSize.width : 1440;
  const stacked = shouldStackLayout(template, availableWidth);

  const { containerStyle, cellStyles } = useMemo(
    () => resolveLayoutGridStyles(template, { stack: stacked }),
    [template, stacked],
  );

  return (
    <ChartSyncProvider linkCrosshair={linkCrosshair} linkDrawings={linkDrawings}>
      <div className="flex min-h-0 min-w-0 flex-1">
        {count > 1 ? (
          <ChartDrawingRail
            theme={theme}
            railMode={railMode}
            toolbarPrefs={toolbarPrefs}
            onToolbarPrefsChange={onToolbarPrefsChange}
          />
        ) : null}
        <div
          ref={gridRef}
          data-testid="chart-grid"
          data-grid-stacked={stacked ? "true" : "false"}
          style={containerStyle}
          className="grid min-h-0 min-w-0 flex-1 gap-px overflow-hidden bg-[var(--edge-border)]"
        >
        {visibleCells.map((cell, i) => {
          const isActiveCell = count > 1 && i === activeCellIndex;
          return (
          <div
            key={i}
            style={cellStyles[i]}
            data-active-cell={isActiveCell ? "true" : undefined}
            className="relative flex min-h-0 min-w-0 flex-col overflow-hidden"
          >
            <ChartCell
              chartId={`cell-${i}`}
              config={cell}
              theme={theme}
              compact={count > 1}
              railMode={railMode}
              showDrawingRail={count === 1}
              isActive={i === activeCellIndex}
              toolbarPrefs={toolbarPrefs}
              symbolNav={i === activeCellIndex ? symbolNav : undefined}
              onFocus={() => onActiveCellChange(i)}
              onConfigChange={(next) => onCellChange(i, next)}
              onToolbarPrefsChange={onToolbarPrefsChange}
            />
            {isActiveCell ? (
              <div
                aria-hidden
                data-testid="chart-cell-active-outline"
                className="pointer-events-none absolute inset-0 z-[200] box-border border-2 border-[var(--edge-accent-blue)]"
              />
            ) : null}
          </div>
          );
        })}
        </div>
      </div>
    </ChartSyncProvider>
  );
}
