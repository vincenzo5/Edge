import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  listPatternTaxonomyTool,
  findSimilarSetupsTool,
  patternLibraryStatsTool,
  capturePatternSetupTool,
} from "./patternLibrary";
import type { ToolContext } from "../context";

vi.mock("@/lib/patternLibrary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/patternLibrary")>();
  const records = actual.generateSeedRecords(10, 1);
  return {
    ...actual,
    loadAllRecords: () => records,
    libraryStats: () => ({
      total: 10,
      takes: 6,
      passes: 4,
      byFamily: { pullback_in_trend: 3 },
    }),
  };
});

const mockCandles = Array.from({ length: 20 }, (_, i) => ({
  timestamp: Date.parse("2025-01-01T00:00:00Z") + i * 3600000,
  open: 100 + i * 0.5,
  high: 101 + i * 0.5,
  low: 99 + i * 0.5,
  close: 100.5 + i * 0.5,
  volume: 1_000_000,
}));

function mockContext(): ToolContext {
  return {
    app: {
      getLayout: () => ({
        version: 1,
        layoutId: "n1",
        linkSymbol: false,
        linkInterval: false,
        linkCrosshair: false,
        linkDrawings: false,
        theme: "dark",
        activeCellIndex: 0,
        cells: [
          {
            symbol: "AAPL",
            symbolName: "Apple",
            exchange: "NASDAQ",
            range: "1y",
            interval: "1d",
            chartType: "candle_solid",
            indicators: [],
            drawings: [
              {
                id: "d1",
                name: "horizontal_line",
                label: "Stop",
                points: [{ value: 95, timestamp: 1_700_000_000_000 }],
                visible: true,
                locked: false,
                zLevel: 0,
                metadata: {
                  kind: "invalidation",
                  status: "active",
                  source: "user",
                  rationale: "Below pullback low",
                },
              },
            ],
          },
        ],
      }),
      isHydrated: () => true,
    },
    chart: {
      getActiveChart: () => ({
        chartCommands: { getCandles: () => mockCandles },
        overlays: [],
      }),
    },
  } as ToolContext;
}

describe("patternLibrary AI tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list_pattern_taxonomy returns setup families", async () => {
    const result = await listPatternTaxonomyTool.execute({}, {} as ToolContext);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.setupFamilies.length).toBeGreaterThan(0);
    }
  });

  it("pattern_library_stats returns counts", async () => {
    const result = await patternLibraryStatsTool.execute({}, {} as ToolContext);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.total).toBe(10);
    }
  });

  it("find_similar_setups returns neighbors from library", async () => {
    const result = await findSimilarSetupsTool.execute({ topK: 3 }, mockContext());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.librarySize).toBe(10);
      expect(result.data.neighbors.length).toBeLessThanOrEqual(3);
    }
  });

  it("capture_pattern_setup builds draft from active chart", async () => {
    const result = await capturePatternSetupTool.execute(
      {
        setupFamilyId: "pullback_in_trend",
        quality: 4,
        decision: "take",
        thesis: "Test thesis",
        direction: "long",
      },
      mockContext(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.draft.symbol).toBe("AAPL");
      expect(result.data.draft.ohlcv.length).toBe(20);
      expect(result.data.annotations.length).toBe(1);
    }
  });
});
