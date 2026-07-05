import type {
  CellConfig,
  IndicatorConfig,
  SerializedDrawing,
  TrackedOverlay,
} from "@/lib/chartConfig";

export type ObjectTreeDrawingRow = {
  id: string;
  name: string;
  label: string;
  visible: boolean;
  locked: boolean;
  zLevel: number;
  metadata?: SerializedDrawing["metadata"];
};

export type ObjectTreePaneNode = {
  cellIndex: number;
  chartId: string;
  title: string;
  isActive: boolean;
  indicators: IndicatorConfig[];
  drawings: ObjectTreeDrawingRow[];
};

export type ObjectTreeLayoutModel =
  | { mode: "single"; panes: [ObjectTreePaneNode] }
  | { mode: "multi"; panes: ObjectTreePaneNode[] };

export function formatObjectTreeSymbolLine(
  symbol: string,
  interval: CellConfig["interval"],
  exchange?: string,
): string {
  const parts = [symbol];
  if (exchange) parts.push(exchange);
  parts.push(interval);
  return parts.join(" · ");
}

function overlayToDrawingRow(overlay: TrackedOverlay, config: CellConfig): ObjectTreeDrawingRow {
  const serialized = config.drawings.find((d) => d.id === overlay.id);
  return {
    id: overlay.id,
    name: overlay.name,
    label: overlay.label,
    visible: overlay.visible,
    locked: overlay.locked,
    zLevel: overlay.zLevel,
    metadata: serialized?.metadata,
  };
}

function serializedToDrawingRow(drawing: SerializedDrawing): ObjectTreeDrawingRow {
  return {
    id: drawing.id ?? drawing.name,
    name: drawing.name,
    label: drawing.label,
    visible: drawing.visible,
    locked: drawing.locked,
    zLevel: drawing.zLevel,
    metadata: drawing.metadata,
  };
}

function sortDrawingsDesc(rows: ObjectTreeDrawingRow[]): ObjectTreeDrawingRow[] {
  return [...rows].sort((a, b) => b.zLevel - a.zLevel);
}

export function buildObjectTreeLayoutModel(input: {
  cells: CellConfig[];
  activeCellIndex: number;
  paneCount: number;
  activeCellIndexForOverlays?: number;
  activeOverlays?: TrackedOverlay[];
}): ObjectTreeLayoutModel {
  const visibleCells = input.cells.slice(0, input.paneCount);
  const panes: ObjectTreePaneNode[] = visibleCells.map((cell, cellIndex) => {
    const useLiveOverlays =
      cellIndex === input.activeCellIndex &&
      cellIndex === input.activeCellIndexForOverlays &&
      input.activeOverlays != null;

    const drawings = useLiveOverlays
      ? sortDrawingsDesc(
          input.activeOverlays!.map((overlay) => overlayToDrawingRow(overlay, cell)),
        )
      : sortDrawingsDesc(cell.drawings.map(serializedToDrawingRow));

    return {
      cellIndex,
      chartId: `cell-${cellIndex}`,
      title: formatObjectTreeSymbolLine(cell.symbol, cell.interval, cell.exchange),
      isActive: cellIndex === input.activeCellIndex,
      indicators: cell.indicators,
      drawings,
    };
  });

  if (input.paneCount <= 1) {
    return { mode: "single", panes: [panes[0]!] };
  }
  return { mode: "multi", panes };
}

export function patchCellIndicator(
  cell: CellConfig,
  indicatorId: string,
  patch: Partial<IndicatorConfig>,
): CellConfig {
  return {
    ...cell,
    indicators: cell.indicators.map((ind) =>
      ind.id === indicatorId ? { ...ind, ...patch } : ind,
    ),
  };
}

export function removeCellIndicator(cell: CellConfig, indicatorId: string): CellConfig {
  return {
    ...cell,
    indicators: cell.indicators.filter((ind) => ind.id !== indicatorId),
  };
}

export function patchCellDrawing(
  cell: CellConfig,
  drawingId: string,
  patch: Partial<SerializedDrawing>,
): CellConfig {
  return {
    ...cell,
    drawings: cell.drawings.map((drawing) =>
      drawing.id === drawingId ? { ...drawing, ...patch } : drawing,
    ),
  };
}

export function removeCellDrawing(cell: CellConfig, drawingId: string): CellConfig {
  return {
    ...cell,
    drawings: cell.drawings.filter((drawing) => drawing.id !== drawingId),
  };
}

export function renameCellDrawing(
  cell: CellConfig,
  drawingId: string,
  label: string,
): CellConfig {
  return patchCellDrawing(cell, drawingId, { label });
}

export function bringCellDrawingForward(cell: CellConfig, drawingId: string): CellConfig {
  const maxZ = cell.drawings.reduce((max, drawing) => Math.max(max, drawing.zLevel), 0);
  return patchCellDrawing(cell, drawingId, { zLevel: maxZ + 1 });
}
