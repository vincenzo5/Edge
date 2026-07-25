import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import {
  cellChartId,
  clearCellLayoutStoreForTests,
  collectLayoutCells,
  getCellConfig,
  getCellRevision,
  isDrawingViewportOnlyPatch,
  registerCellLayoutFlushHandler,
  scheduleCellLayoutFlush,
  setCellConfig,
  syncCellLayoutStoreFromLayout,
} from "./cellLayoutStore";
import { DEFAULT_CELL, DEFAULT_LAYOUT, cellCountFor, type CellConfig } from "@/lib/chartConfig";

describe("cellLayoutStore", () => {
  beforeEach(() => {
    clearCellLayoutStoreForTests();
  });

  it("bumps revision and stores config on setCellConfig", () => {
    const id = cellChartId(0);
    const next: CellConfig = { ...DEFAULT_CELL, symbol: "MSFT" };
    setCellConfig(id, next);
    expect(getCellConfig(id)?.symbol).toBe("MSFT");
    expect(getCellRevision(id)).toBe(1);
  });

  it("hydrates from layout and collects cells for flush", () => {
    syncCellLayoutStoreFromLayout({
      ...DEFAULT_LAYOUT,
      layoutId: "n2-cols",
      cells: [{ ...DEFAULT_CELL, symbol: "NVDA" }, { ...DEFAULT_CELL, symbol: "AAPL" }],
    });
    expect(getCellConfig(cellChartId(0))?.symbol).toBe("NVDA");
    expect(getCellConfig(cellChartId(1))?.symbol).toBe("AAPL");
    const collected = collectLayoutCells(2);
    expect(collected[0]?.symbol).toBe("NVDA");
    expect(collected[1]?.symbol).toBe("AAPL");
  });

  it("detects drawing/viewport-only patches", () => {
    const prev: CellConfig = { ...DEFAULT_CELL, drawings: [] };
    const next: CellConfig = {
      ...DEFAULT_CELL,
      drawings: [
        {
          id: "d1",
          name: "trend_line",
          points: [],
          visible: true,
          locked: false,
          zLevel: 0,
          paneId: "price",
        },
      ],
    };
    expect(isDrawingViewportOnlyPatch(prev, next)).toBe(true);
    expect(isDrawingViewportOnlyPatch(prev, { ...next, symbol: "MSFT" })).toBe(false);
  });

  it("debounced flush handler receives store merge", async () => {
    vi.useFakeTimers();
    const flushed: CellConfig[][] = [];
    const unregister = registerCellLayoutFlushHandler(() => {
      flushed.push(collectLayoutCells(cellCountFor(DEFAULT_LAYOUT.layoutId)));
    });
    setCellConfig(cellChartId(0), { ...DEFAULT_CELL, symbol: "TSLA" });
    scheduleCellLayoutFlush(100);
    expect(flushed).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(flushed).toHaveLength(1);
    expect(flushed[0]?.[0]?.symbol).toBe("TSLA");
    unregister();
    vi.useRealTimers();
  });
});
