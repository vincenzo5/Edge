# Integration Map — How EdgeChart Slots Into Existing App

## Props / Handle API (must match current ChartHandle exactly)
```ts
export type ChartHandle = {
  startDrawing: (overlayName: string) => void;
  stopDrawing: () => void;
  clearDrawings: () => void;
  setMagnet: (on: boolean) => void;
  serializeDrawings: () => SerializedDrawing[];
  restoreDrawings: (data: SerializedDrawing[]) => void;
  resize: () => void;
  onCrosshair: (cb: (timestamp: number | null) => void) => () => void;
  getTrackedOverlays: () => TrackedOverlay[];
  removeOverlay: (id: string) => void;
  setOverlayVisible: (id: string, visible: boolean) => void;
  setOverlayLocked: (id: string, locked: boolean) => void;
  renameOverlay: (id: string, label: string) => void;
  duplicateOverlay: (id: string) => string | null;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  subscribeOverlayChange: (cb: () => void) => () => void;
  getSubPaneId: (key: IndicatorKey) => string | undefined;
  applyPaneHeights: (heights: Map<IndicatorKey, number | null>) => void;
};
```

## Components That Stay Unchanged
- StockApp.tsx (layout state)
- ChartGrid.tsx (grid + linked propagation)
- ChartCell.tsx (toolbar, ObjectTree, BarReplay, IndicatorPicker, OverlayContextMenu, ChartSyncBridge)
- ObjectTree.tsx, DrawingToolbar.tsx, BarReplay.tsx, etc. — they call the handle methods.

## What Gets Replaced
- src/app/components/Chart.tsx → deleted after EdgeChart works
- All klinecharts imports, init, dispose, createIndicator, createOverlay, _panes hacks

## Data Flow
CellConfig (from localStorage) → EdgeChart (via props) → L0 series fetch → L1 viewport → L2/L3 draw → plugins for indicators/drawings

onConfigChange called on drawings change (debounced), indicator toggle, paneOrder change.

Crosshair ts broadcast via ChartSyncContext (fix the current no-op receiver).

## File Changes
- New: src/lib/chart/* (series, viewport, renderer, panes, indicators/*, drawings/*, pluginHost)
- New: src/app/components/EdgeChart.tsx
- Modify: ChartCell.tsx (import swap + ref type)
- Delete: Chart.tsx, remove klinecharts from package.json after verification

This ensures zero breakage to existing UI while swapping the engine.