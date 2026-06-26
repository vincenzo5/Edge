"use client";

import ObjectTree from "../../ObjectTree";
import { useActiveChart } from "../../ActiveChartContext";

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
  );
}
