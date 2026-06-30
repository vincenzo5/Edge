import { describe, expect, it, vi } from "vitest";
import {
  addDrawingTool,
  listDrawingsTool,
  updateDrawingTool,
} from "./drawings";
import type { ToolContext } from "../context";
import type { ChartLayout } from "@/lib/chartConfig";

function mockLayout(drawings: ChartLayout["cells"][0]["drawings"]): ChartLayout {
  return {
    version: 1,
    gridMode: "1x1",
    linkSymbol: false,
    linkInterval: false,
    linkCrosshair: false,
    linkDrawings: false,
    theme: "dark",
    activeCellIndex: 0,
    cells: [
      {
        symbol: "AAPL",
        range: "1y",
        interval: "1d",
        chartType: "candle_solid",
        indicators: [],
        drawings,
      },
    ],
    toolbarPrefs: {},
    sidebar: { activePanel: "object-tree" },
  } as ChartLayout;
}

function mockContext(layout: ChartLayout): ToolContext {
  const restoreDrawings = vi.fn();
  return {
    clientSession: true,
    app: {
      getLayout: () => layout,
      applyCellUpdate: vi.fn((index, cell) => {
        layout.cells[index] = cell;
      }),
      setGridMode: vi.fn(),
      setLayoutSync: vi.fn(),
      setTheme: vi.fn(),
      setActiveCell: vi.fn(),
    },
    chart: {
      getActiveChart: () => ({
        overlays: [],
        chartCommands: {
          restoreDrawings,
          getSelectedDrawingId: () => null,
          updateDrawingStyles: vi.fn(),
        },
      }),
      loadSymbolIntoActiveChart: vi.fn(),
    },
    watchlist: null,
    screener: null,
    marketData: {
      searchSymbols: vi.fn(),
      getCandles: vi.fn(),
      getQuotes: vi.fn(),
      getFundamentals: vi.fn(),
      getOptionExpirations: vi.fn(),
      getOptionsChain: vi.fn(),
    },
  };
}

describe("drawing AI tools metadata", () => {
  it("add_drawing applies normalized AI metadata", async () => {
    const layout = mockLayout([]);
    const ctx = mockContext(layout);

    const result = await addDrawingTool.execute(
      {
        type: "horizontal_line",
        points: [{ value: 180 }],
        metadata: {
          kind: "invalidation",
          source: "ai",
          rationale: "Daily close below invalidates long thesis",
        },
      },
      ctx,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const drawing = layout.cells[0]!.drawings[0];
    expect(drawing?.metadata).toMatchObject({
      kind: "invalidation",
      source: "ai",
      status: "proposed",
      rationale: "Daily close below invalidates long thesis",
    });
  });

  it("list_drawings filters by kind", async () => {
    const layout = mockLayout([
      {
        id: "d1",
        name: "horizontal_line",
        label: "Stop",
        points: [{ value: 170 }],
        visible: true,
        locked: false,
        zLevel: 0,
        metadata: { kind: "invalidation", status: "active", source: "user" },
      },
      {
        id: "d2",
        name: "horizontal_line",
        label: "Target",
        points: [{ value: 200 }],
        visible: true,
        locked: false,
        zLevel: 1,
        metadata: { kind: "target", status: "active", source: "user" },
      },
    ]);
    const ctx = mockContext(layout);

    const result = await listDrawingsTool.execute({ kind: "target" }, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.drawings).toHaveLength(1);
    expect(result.data.drawings[0]?.metadata?.kind).toBe("target");
    expect(result.data.annotationSummary.byKind.target).toBe(1);
  });

  it("update_drawing merges metadata patch", async () => {
    const layout = mockLayout([
      {
        id: "d1",
        name: "horizontal_line",
        label: "Stop",
        points: [{ value: 170 }],
        visible: true,
        locked: false,
        zLevel: 0,
        metadata: {
          kind: "invalidation",
          status: "proposed",
          source: "ai",
          rationale: "Initial",
        },
      },
    ]);
    const ctx = mockContext(layout);

    const result = await updateDrawingTool.execute(
      {
        drawingId: "d1",
        metadata: { status: "accepted" },
      },
      ctx,
    );

    expect(result.ok).toBe(true);
    expect(layout.cells[0]!.drawings[0]?.metadata?.status).toBe("accepted");
  });
});
