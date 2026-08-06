import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { DEFAULT_CELL, type CellConfig } from "@/lib/chartConfig";
import {
  buildJournalCaptureSeed,
  captureSeedStorageKey,
  clearCaptureSeed,
  createCaptureToken,
  readCaptureSeed,
  writeCaptureSeed,
} from "./captureSeed";

const activeCell: CellConfig = {
  symbol: "NVDA",
  range: "6mo",
  interval: "5m",
  rangePreset: null,
  chartType: "candle_solid",
  indicators: [{ id: "ma-1", name: "MA", pane: "main", visible: true }],
  drawings: [
    {
      id: "line-1",
      name: "segment",
      label: "Line",
      points: [
        { dataIndex: 1, value: 10 },
        { dataIndex: 2, value: 12 },
      ],
      visible: true,
      locked: false,
      zLevel: 0,
    },
  ],
};

describe("captureSeed", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000001");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clones active cell with new drawing ids and forces trade symbol", () => {
    const seed = buildJournalCaptureSeed({
      trade: { id: "trade-1", symbol: "brun" },
      activeCellConfig: activeCell,
    });

    expect(seed.symbol).toBe("BRUN");
    expect(seed.tradeId).toBe("trade-1");
    expect(seed.cellConfig.symbol).toBe("BRUN");
    expect(seed.cellConfig.interval).toBe("5m");
    expect(seed.cellConfig.indicators[0]?.id).not.toBe(activeCell.indicators[0]?.id);
    expect(seed.cellConfig.drawings[0]?.id).not.toBe(activeCell.drawings[0]?.id);
  });

  it("falls back to default daily interval when no active chart", () => {
    const seed = buildJournalCaptureSeed({
      trade: {
        id: "trade-1",
        symbol: "AAPL",
        openedAt: "2026-07-01T13:30:00.000Z",
        closedAt: "2026-07-01T20:00:00.000Z",
      },
    });

    expect(seed.cellConfig.symbol).toBe("AAPL");
    expect(seed.cellConfig.interval).toBe("1d");
    expect(seed.cellConfig.range).toBe(DEFAULT_CELL.range);
  });

  it("round-trips through sessionStorage", () => {
    const seed = buildJournalCaptureSeed({
      trade: { id: "trade-1", symbol: "BRUN" },
      activeCellConfig: activeCell,
      theme: "light",
    });
    const token = createCaptureToken();
    writeCaptureSeed(token, seed);

    expect(readCaptureSeed(token)).toEqual(seed);
    clearCaptureSeed(token);
    expect(readCaptureSeed(token)).toBeNull();
  });

  it("returns null for missing or malformed seed", () => {
    expect(readCaptureSeed("missing")).toBeNull();
    sessionStorage.setItem(captureSeedStorageKey("bad"), "{");
    expect(readCaptureSeed("bad")).toBeNull();
  });
});
