"use client";

import ObjectTree from "../../ObjectTree";
import { useActiveChart } from "../../ActiveChartContext";
import { PanelPopOutButton } from "../PanelChromeActions";

export function ObjectTreePanel() {
  const snapshot = useActiveChart();

  if (!snapshot) {
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
      chartId={snapshot.chartId}
      config={snapshot.config}
      overlays={snapshot.overlays}
      dataWindow={snapshot.dataWindow}
      dataWindowActions={snapshot.dataWindowActions}
      chartCommands={{
        selectDrawing: snapshot.chartCommands.selectDrawing,
        getSelectedDrawingId: snapshot.chartCommands.getSelectedDrawingId,
      }}
      onConfigChange={snapshot.onConfigChange}
      onOverlayAction={snapshot.overlayActions}
      onAddIndicator={snapshot.openIndicatorPicker}
      embedded
    />
    </div>
  );
}
