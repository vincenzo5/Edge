import {
  DEFAULT_CELL,
  cellCountFor,
  type CellConfig,
  type ChartLayout,
} from "@/lib/chartConfig";

type CellEntry = {
  config: CellConfig;
  revision: number;
  listeners: Set<() => void>;
};

const cells = new Map<string, CellEntry>();

let storeHydrated = false;
let flushHandler: (() => void) | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function entryFor(chartId: string): CellEntry {
  let entry = cells.get(chartId);
  if (!entry) {
    entry = { config: { ...DEFAULT_CELL }, revision: 0, listeners: new Set() };
    cells.set(chartId, entry);
  }
  return entry;
}

function cellConfigsEqual(a: CellConfig, b: CellConfig): boolean {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

function notify(entry: CellEntry): void {
  for (const listener of entry.listeners) {
    listener();
  }
}

export function cellChartId(index: number): string {
  return `cell-${index}`;
}

export function getCellConfig(chartId: string): CellConfig | undefined {
  const entry = cells.get(chartId);
  if (!entry) return undefined;
  if (!storeHydrated && entry.revision === 0) return undefined;
  return entry.config;
}

export function getCellRevision(chartId: string): number {
  const entry = cells.get(chartId);
  if (!entry) return -1;
  if (!storeHydrated && entry.revision === 0) return -1;
  return entry.revision;
}

export function setCellConfig(chartId: string, next: CellConfig): void {
  const entry = entryFor(chartId);
  if (cellConfigsEqual(entry.config, next)) return;
  entry.config = next;
  entry.revision += 1;
  notify(entry);
}

export function subscribeCellConfig(chartId: string, listener: () => void): () => void {
  const entry = entryFor(chartId);
  entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
  };
}

/** True after bootstrap or shell sync has populated the cell store. */
export function isCellLayoutStoreHydrated(): boolean {
  return storeHydrated;
}

/** Replace all visible cells from a layout snapshot (bootstrap / shell updates). */
export function syncCellLayoutStoreFromLayout(layout: ChartLayout): void {
  storeHydrated = true;
  const count = cellCountFor(layout.layoutId);
  for (let i = 0; i < count; i += 1) {
    const chartId = cellChartId(i);
    const next = layout.cells[i] ?? DEFAULT_CELL;
    const entry = entryFor(chartId);
    if (cellConfigsEqual(entry.config, next)) continue;
    entry.config = next;
    entry.revision += 1;
    notify(entry);
  }
}

/** Read visible cell configs back for workspace persistence flush. */
export function collectLayoutCells(count: number): CellConfig[] {
  return Array.from({ length: count }, (_, i) => {
    const chartId = cellChartId(i);
    return getCellConfig(chartId) ?? DEFAULT_CELL;
  });
}

export function registerCellLayoutFlushHandler(handler: () => void): () => void {
  flushHandler = handler;
  return () => {
    if (flushHandler === handler) {
      flushHandler = null;
    }
  };
}

export function scheduleCellLayoutFlush(delayMs = 500): void {
  if (!flushHandler) return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushHandler?.();
  }, delayMs);
}

export function flushCellLayoutNow(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushHandler?.();
}

export function clearCellLayoutStoreForTests(): void {
  cells.clear();
  storeHydrated = false;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushHandler = null;
}

export function pickCellShell(config: CellConfig): Omit<CellConfig, "drawings" | "viewport"> {
  const { drawings: _drawings, viewport: _viewport, ...shell } = config;
  return shell;
}

/** True when only drawings and/or viewport differ — hot path for slice-only store writes. */
export function isDrawingViewportOnlyPatch(prev: CellConfig, next: CellConfig): boolean {
  if (prev.drawings === next.drawings && prev.viewport === next.viewport) return false;
  return JSON.stringify(pickCellShell(prev)) === JSON.stringify(pickCellShell(next));
}
