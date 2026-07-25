export type CellCrosshairData = {
  dataIndex: number | null;
  timestamp: number | null;
  valueLabel: string | null;
  plotX: number | null;
};

const EMPTY: CellCrosshairData = {
  dataIndex: null,
  timestamp: null,
  valueLabel: null,
  plotX: null,
};

type CellEntry = {
  data: CellCrosshairData;
  listeners: Set<() => void>;
};

const cells = new Map<string, CellEntry>();

function entryFor(chartId: string): CellEntry {
  let entry = cells.get(chartId);
  if (!entry) {
    entry = { data: { ...EMPTY }, listeners: new Set() };
    cells.set(chartId, entry);
  }
  return entry;
}

export function getCellCrosshair(chartId: string): CellCrosshairData {
  return cells.get(chartId)?.data ?? EMPTY;
}

export function setCellCrosshair(chartId: string, next: CellCrosshairData): void {
  const entry = entryFor(chartId);
  const prev = entry.data;
  if (
    prev.dataIndex === next.dataIndex &&
    prev.timestamp === next.timestamp &&
    prev.valueLabel === next.valueLabel &&
    prev.plotX === next.plotX
  ) {
    return;
  }
  entry.data = next;
  for (const listener of entry.listeners) {
    listener();
  }
}

export function subscribeCellCrosshair(chartId: string, listener: () => void): () => void {
  const entry = entryFor(chartId);
  entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0) {
      cells.delete(chartId);
    }
  };
}

export function clearCellCrosshairStoreForTests(): void {
  cells.clear();
}
