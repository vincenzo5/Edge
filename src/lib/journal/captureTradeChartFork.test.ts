import { describe, expect, it, vi } from "vitest";

import type { CellConfig } from "@/lib/chartConfig";

const mocks = vi.hoisted(() => ({
  createSnapshot: vi.fn(),
  uploadScreenshot: vi.fn(),
}));

vi.mock("@/lib/persistence/client/journalClient", () => ({
  createJournalTradeChartSnapshotRemote: mocks.createSnapshot,
  uploadJournalTradeScreenshot: mocks.uploadScreenshot,
}));

import {
  buildTradeChartForkCellConfig,
  captureTradeChartFork,
  extractPlanLevelsFromCellConfig,
  symbolsMatchForTradeCapture,
} from "@/lib/journal/captureTradeChartFork";

const baseCell: CellConfig = {
  symbol: "BRUN",
  range: "6mo",
  interval: "1d",
  rangePreset: null,
  chartType: "candle_solid",
  indicators: [{ id: "ma-1", name: "MA", pane: "main", visible: true }],
  drawings: [
    {
      id: "pos-1",
      name: "long_position",
      label: "Long",
      points: [
        { dataIndex: 10, value: 12 },
        { dataIndex: 10, value: 11 },
        { dataIndex: 10, value: 14 },
      ],
      visible: true,
      locked: false,
      zLevel: 0,
    },
  ],
};

describe("captureTradeChartFork helpers", () => {
  it("matches symbols case-insensitively", () => {
    expect(symbolsMatchForTradeCapture("brun", "BRUN")).toBe(true);
    expect(symbolsMatchForTradeCapture("AAPL", "BRUN")).toBe(false);
  });

  it("deep clones cell config with new indicator ids", () => {
    const cloned = buildTradeChartForkCellConfig(baseCell);
    expect(cloned.symbol).toBe("BRUN");
    expect(cloned.indicators[0]?.id).not.toBe(baseCell.indicators[0]?.id);
    expect(cloned.drawings[0]?.id).not.toBe(baseCell.drawings[0]?.id);
  });

  it("extracts plan levels from position drawing", () => {
    const plan = extractPlanLevelsFromCellConfig(baseCell);
    expect(plan?.entry).toBe(12);
    expect(plan?.stop).toBe(11);
    expect(plan?.target).toBe(14);
    expect(plan?.side).toBe("BUY");
  });

  it("surfaces screenshot upload failure details", async () => {
    mocks.uploadScreenshot.mockRejectedValueOnce(new Error("Journal trade not found."));

    const result = await captureTradeChartFork({
      trade: { id: "trade-1", symbol: "BRUN" },
      cellConfig: baseCell,
      captureScreenshot: async () =>
        new Blob([Uint8Array.from([1])], { type: "image/png" }),
    });

    expect(result).toEqual({
      ok: false,
      error: "Could not capture or upload chart screenshot. Journal trade not found.",
    });
  });

  it("surfaces chart snapshot validation failure details", async () => {
    mocks.createSnapshot.mockRejectedValueOnce(
      new Error("Invalid request body: cellConfig: Invalid input"),
    );

    const result = await captureTradeChartFork({
      trade: { id: "trade-1", symbol: "BRUN" },
      cellConfig: baseCell,
    });

    expect(result).toEqual({
      ok: false,
      error:
        "Could not save chart snapshot to journal trade. Invalid request body: cellConfig: Invalid input",
    });
  });
});
