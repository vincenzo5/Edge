import { describe, expect, it } from "vitest";
import { summarizeChartTool } from "./workflow";
import type { ToolContext } from "../context";
import type { ChartLayout } from "@/lib/chartConfig";

describe("summarizeChartTool annotations", () => {
  it("includes annotation items and thesis summary", async () => {
    const layout = {
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
          drawings: [
            {
              id: "d1",
              name: "horizontal_line",
              label: "Thesis zone",
              points: [{ value: 180, timestamp: 1_700_000_000_000 }],
              visible: true,
              locked: false,
              zLevel: 0,
              metadata: {
                kind: "thesis",
                status: "active",
                source: "user",
                rationale: "Bullish continuation",
              },
            },
          ],
        },
      ],
      toolbarPrefs: {},
      sidebar: { activePanel: "object-tree" },
    } as ChartLayout;

    const ctx: ToolContext = {
      clientSession: true,
      app: {
        getLayout: () => layout,
        applyCellUpdate: () => {},
        setGridMode: () => {},
        setLayoutSync: () => {},
        setTheme: () => {},
        setActiveCell: () => {},
      },
      chart: {
        getActiveChart: () => ({
          overlays: [],
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
    };

    const result = await summarizeChartTool.execute({}, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.annotations.items).toHaveLength(1);
    expect(result.data.annotations.items[0]?.kind).toBe("thesis");
    expect(result.data.annotations.thesisSummary).toContain("1 active thesis");
  });
});
