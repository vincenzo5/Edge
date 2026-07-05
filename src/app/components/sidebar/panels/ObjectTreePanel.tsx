"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import ObjectTree, { type ObjectTreePaneActions } from "../../ObjectTree";
import { useActiveChart } from "../../ActiveChartContext";
import { useAppActions } from "../../AppActionsContext";
import { PanelPopOutButton } from "../PanelChromeActions";
import { cellCountFor, type CellConfig } from "@/lib/chartConfig";
import {
  bringCellDrawingForward,
  buildObjectTreeLayoutModel,
  patchCellDrawing,
  patchCellIndicator,
  removeCellDrawing,
  removeCellIndicator,
  renameCellDrawing,
} from "@/lib/chart/objectTreeModel";

export function ObjectTreePanel() {
  const app = useAppActions();
  const snapshot = useActiveChart();
  const pendingSelectRef = useRef<{ cellIndex: number; drawingId: string } | null>(null);

  const layout = app?.getLayout();
  const paneCount = layout ? cellCountFor(layout.layoutId) : 1;
  const activeCellIndex = layout?.activeCellIndex ?? 0;

  const layoutModel = useMemo(() => {
    if (!layout) {
      return buildObjectTreeLayoutModel({
        cells: snapshot?.config ? [snapshot.config] : [],
        activeCellIndex: 0,
        paneCount: 1,
        activeCellIndexForOverlays: 0,
        activeOverlays: snapshot?.overlays,
      });
    }
    return buildObjectTreeLayoutModel({
      cells: layout.cells,
      activeCellIndex,
      paneCount,
      activeCellIndexForOverlays: activeCellIndex,
      activeOverlays: snapshot?.overlays,
    });
  }, [layout, snapshot?.config, snapshot?.overlays, activeCellIndex, paneCount]);

  const panelKey = paneCount > 1 ? "layout" : (snapshot?.chartId ?? "layout");

  useEffect(() => {
    const pending = pendingSelectRef.current;
    if (!pending || !snapshot) return;
    if (snapshot.chartId === `cell-${pending.cellIndex}`) {
      snapshot.chartCommands.selectDrawing(pending.drawingId);
      pendingSelectRef.current = null;
    }
  }, [snapshot]);

  const applyCell = useCallback(
    (cellIndex: number, updater: (cell: CellConfig) => CellConfig) => {
      if (!app || !layout) return;
      const cell = layout.cells[cellIndex];
      if (!cell) return;
      app.applyCellUpdate(cellIndex, updater(cell));
    },
    [app, layout],
  );

  const paneActions = useMemo<ObjectTreePaneActions>(
    () => ({
      onPaneFocus: (cellIndex) => {
        app?.setActiveCellIndex(cellIndex);
      },
      onToggleIndicatorVisible: (cellIndex, indicatorId) => {
        if (cellIndex === activeCellIndex && snapshot) {
          const ind = snapshot.config.indicators.find((i) => i.id === indicatorId);
          if (!ind) return;
          snapshot.onConfigChange(
            patchCellIndicator(snapshot.config, indicatorId, {
              visible: ind.visible === false,
            }),
          );
          return;
        }
        applyCell(cellIndex, (cell) =>
          patchCellIndicator(cell, indicatorId, {
            visible: cell.indicators.find((i) => i.id === indicatorId)?.visible === false,
          }),
        );
      },
      onRemoveIndicator: (cellIndex, indicatorId) => {
        if (cellIndex === activeCellIndex && snapshot) {
          snapshot.onConfigChange(removeCellIndicator(snapshot.config, indicatorId));
          return;
        }
        applyCell(cellIndex, (cell) => removeCellIndicator(cell, indicatorId));
      },
      onAddIndicator: (cellIndex) => {
        if (cellIndex !== activeCellIndex) {
          app?.setActiveCellIndex(cellIndex);
        }
        snapshot?.openIndicatorPicker();
      },
      onDrawingSetVisible: (cellIndex, drawingId, visible) => {
        if (cellIndex === activeCellIndex && snapshot) {
          snapshot.overlayActions.setVisible(drawingId, visible);
          return;
        }
        applyCell(cellIndex, (cell) => patchCellDrawing(cell, drawingId, { visible }));
      },
      onDrawingSetLocked: (cellIndex, drawingId, locked) => {
        if (cellIndex === activeCellIndex && snapshot) {
          snapshot.overlayActions.setLocked(drawingId, locked);
          return;
        }
        applyCell(cellIndex, (cell) => patchCellDrawing(cell, drawingId, { locked }));
      },
      onDrawingRemove: (cellIndex, drawingId) => {
        if (cellIndex === activeCellIndex && snapshot) {
          snapshot.overlayActions.remove(drawingId);
          return;
        }
        applyCell(cellIndex, (cell) => removeCellDrawing(cell, drawingId));
      },
      onDrawingRename: (cellIndex, drawingId, label) => {
        if (cellIndex === activeCellIndex && snapshot) {
          snapshot.overlayActions.rename(drawingId, label);
          return;
        }
        applyCell(cellIndex, (cell) => renameCellDrawing(cell, drawingId, label));
      },
      onDrawingBringForward: (cellIndex, drawingId) => {
        if (cellIndex === activeCellIndex && snapshot) {
          snapshot.overlayActions.bringForward(drawingId);
          return;
        }
        applyCell(cellIndex, (cell) => bringCellDrawingForward(cell, drawingId));
      },
      onSelectDrawing: (cellIndex, drawingId) => {
        if (cellIndex === activeCellIndex && snapshot) {
          snapshot.chartCommands.selectDrawing(drawingId);
          return;
        }
        pendingSelectRef.current = { cellIndex, drawingId };
        app?.setActiveCellIndex(cellIndex);
      },
      subscribeOverlayChanges: snapshot?.overlayActions.subscribe,
    }),
    [app, snapshot, activeCellIndex, applyCell],
  );

  if (!layout && !snapshot) {
    return (
      <div className="px-3 py-2 text-xs italic text-[var(--edge-text-muted)]">
        Focus a chart to inspect objects and data.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--edge-border)] px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--edge-text-secondary)]">
          Object tree
        </span>
        <PanelPopOutButton label="Pop out" />
      </div>
      <ObjectTree
        panelKey={panelKey}
        layoutModel={layoutModel}
        paneActions={paneActions}
        selectedDrawingId={snapshot?.chartCommands.getSelectedDrawingId() ?? null}
        dataWindow={snapshot?.dataWindow}
        dataWindowActions={snapshot?.dataWindowActions}
        embedded
      />
    </div>
  );
}
