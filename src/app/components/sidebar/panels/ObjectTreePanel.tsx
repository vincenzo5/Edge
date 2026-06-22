"use client";

import ObjectTree from "../../ObjectTree";
import { useActiveChart } from "../../ActiveChartContext";

export function ObjectTreePanel() {
  const snapshot = useActiveChart();

  if (!snapshot) {
    return (
      <div className="px-3 py-2 text-xs italic text-gray-400 dark:text-gray-500">
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
      onConfigChange={snapshot.onConfigChange}
      onOverlayAction={snapshot.overlayActions}
      onAddIndicator={snapshot.openIndicatorPicker}
      embedded
    />
  );
}
