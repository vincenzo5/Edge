import { describe, expect, it, vi } from "vitest";
import { getChartStateTool, setChartTypeTool } from "./chart";
import type { ToolContext } from "../context";
import type { ChartLayout } from "@/lib/chartConfig";

function createLayout(overrides: Partial<ChartLayout> = {}): ChartLayout {
  return {
    version: 1,
    layoutId: "n2-rows",
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
        drawings: [],
      },
      {
        symbol: "MSFT",
        range: "6mo",
        interval: "1d",
        chartType: "ohlc",
        indicators: [],
        drawings: [],
      },
    ],
    toolbarPrefs: {},
    sidebar: { activePanel: "object-tree" },
    ...overrides,
  };
}

function createContext(layout: ChartLayout): ToolContext {
  return {
    clientSession: true,
    app: {
      getLayout: () => layout,
      applyCellUpdate: vi.fn(),
      setGridMode: () => {},
      setLayoutSync: () => {},
      setTheme: () => {},
      setActiveCell: () => {},
    },
    chart: {
      getActiveChart: () => ({
        overlays: [{ id: "o1" }],
        dataWindow: { kind: "candle" },
        chartCommands: { getCandles: () => [] },
      }),
      loadSymbolIntoActiveChart: () => {},
    },
    watchlist: null,
    screener: null,
    risk: null,
    account: null,
    options: null,
    marketData: {
      searchSymbols: async () => [],
      getCandles: async () => [],
      getQuotes: async () => [],
      getFundamentals: async () => ({ symbol: "AAPL", updatedAt: Date.now() }),
      getOptionExpirations: async () => [],
      getOptionsChain: async () => ({
        underlying: "AAPL",
        expiration: "2025-06-20",
        contracts: [],
      }),
    },
    trading: null,
  };
}

describe("getChartStateTool (app product)", () => {
  it("returns cell config and active overlays for the focused cell", async () => {
    const layout = createLayout({ activeCellIndex: 0 });
    const ctx = createContext(layout);

    const result = await getChartStateTool.execute({ cellIndex: 0 }, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      cellIndex: 0,
      isActive: true,
      config: layout.cells[0],
      activeOverlays: [{ id: "o1" }],
      dataWindow: { kind: "candle" },
    });
  });

  it("returns config without active overlays when cell is not focused", async () => {
    const layout = createLayout({ activeCellIndex: 0 });
    const ctx = createContext(layout);

    const result = await getChartStateTool.execute({ cellIndex: 1 }, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      cellIndex: 1,
      isActive: false,
      config: layout.cells[1],
      activeOverlays: [],
      dataWindow: null,
    });
  });
});

describe("setChartTypeTool (app product)", () => {
  it("updates the target cell via applyCellUpdate", async () => {
    const layout = createLayout();
    const ctx = createContext(layout);

    const result = await setChartTypeTool.execute(
      { chartType: "area", cellIndex: 1 },
      ctx,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ cellIndex: 1, chartType: "area" });
    expect(ctx.app?.applyCellUpdate).toHaveBeenCalledWith(1, {
      ...layout.cells[1],
      chartType: "area",
    });
  });
});
