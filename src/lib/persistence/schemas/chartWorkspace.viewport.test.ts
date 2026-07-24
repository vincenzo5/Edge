import { describe, expect, it } from "vitest";
import { cellConfigSchema } from "@/lib/persistence/schemas/chartWorkspace";

describe("cellConfigSchema viewport", () => {
  const baseCell = {
    symbol: "AAPL",
    range: "1y" as const,
    interval: "1d" as const,
    chartType: "candle_solid" as const,
    indicators: [],
    drawings: [],
  };

  it("accepts optional valid viewport snapshot", () => {
    const parsed = cellConfigSchema.parse({
      ...baseCell,
      viewport: {
        startIndex: 10,
        endIndex: 120,
        priceMin: 90,
        priceMax: 110,
        priceScaleMode: "manual",
      },
    });
    expect(parsed.viewport).toEqual({
      startIndex: 10,
      endIndex: 120,
      priceMin: 90,
      priceMax: 110,
      priceScaleMode: "manual",
    });
  });

  it("strips invalid viewport without failing layout cell parse", () => {
    const parsed = cellConfigSchema.parse({
      ...baseCell,
      viewport: { startIndex: "bad", endIndex: 1, priceMin: 1, priceMax: 2 },
    });
    expect(parsed.viewport).toBeUndefined();
  });
});
