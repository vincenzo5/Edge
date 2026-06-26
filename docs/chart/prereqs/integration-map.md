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
  setCrosshairFromSync: (timestamp: number | null) => void;
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
  resetChartView: () => void;
  isViewportModified: () => boolean;
};
```

## Components That Stay Unchanged (shell)
- ObjectTree.tsx, DrawingToolbar.tsx, BarReplay.tsx, IndicatorPicker, etc. — they call the handle methods.

## What Was Replaced (complete)
- ~~`src/app/components/Chart.tsx`~~ — deleted (June 2025)
- ~~`src/lib/themes.ts`~~, ~~`src/lib/overlays.ts`~~ — deleted
- ~~`klinecharts` npm dependency~~ — removed

## Components updated for V1 chart contract (June 2025)
- **StockApp.tsx** — layout controller: `applyCellUpdate` (atomic link propagation), `activeCellIndex`, grid mode clamping
- **ChartGrid.tsx** — viewport-fitting grid shell, `ChartSyncProvider`, compact multi-cell mode
- **ChartCell.tsx** — active cell focus, crosshair snapshot → Object Tree, `IndicatorSettingsModal`, Bar Replay wiring
- **ChartSyncContext.tsx** — `broadcast` gated on `linked`
- **EdgeChart.tsx** — edge fetch, pinch, `PaneControls`, legend settings actions, `onDataLoaded`, `onCrosshairMove`
- **PaneControls.tsx** — collapse / maximize / reorder overlay (extracted from legacy Chart)
- **ObjectTree.tsx** — live data window, indicator visibility toggle

## Feature inventory (living doc)

See **[features.md](../features.md)** for a row-by-row status of every chart capability (done / partial / stub / planned), test coverage, and known gaps. Update it when shipping chart work.

For the external benchmark, see **[tradingview-reference.md](../tradingview-reference.md)** (TradingView Supercharts feature inventory).

## Data Flow
CellConfig (from localStorage) → EdgeChart (via props) → L0 series fetch → L1 viewport → L2/L3 draw → plugins for indicators/drawings

onConfigChange called on drawings change (debounced), indicator toggle, paneOrder change.

Crosshair sync: source chart `onCrosshairTimestamp` → `ChartSyncContext.broadcast` (when `layout.linkCrosshair`) → peer `setCrosshairFromSync`. Symbol propagation uses **Link symbols** (`linkSymbol`) in layout setup menu.

## File Changes (current)
- **Engine**: `src/lib/chart/*` (series, viewport, renderer, panes, pinch, indicators/*, drawings/*, pluginHost)
- **Host**: `src/app/components/EdgeChart.tsx`, `PaneControls.tsx`, `IndicatorSettingsModal.tsx`
- **Shell**: `ChartCell.tsx` imports EdgeChart only
- **Removed**: `Chart.tsx`, `themes.ts`, `overlays.ts`, `klinecharts` package

This ensures zero breakage to existing UI while swapping the engine.