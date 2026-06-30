import { describe, it, expect } from "vitest";
import { SCREENER_PRESETS } from "./presets";

describe("SCREENER_PRESETS", () => {
  it("includes technical presets with expected query shapes", () => {
    const byId = Object.fromEntries(SCREENER_PRESETS.map((preset) => [preset.id, preset]));

    expect(byId["rsi-oversold"]).toMatchObject({
      kind: "screener",
      query: {
        volume: { min: 500_000 },
        technical: { kind: "rsi", period: 14, max: 30 },
        limit: 200,
      },
    });
    expect(byId["rsi-overbought"]).toMatchObject({
      kind: "screener",
      query: {
        technical: { kind: "rsi", period: 14, min: 70 },
      },
    });
    expect(byId["golden-cross"]).toMatchObject({
      kind: "screener",
      query: {
        technical: { kind: "goldenCross", fast: 50, slow: 200 },
      },
    });
    expect(byId["near-52wk-high"]).toMatchObject({
      kind: "screener",
      query: {
        technical: { kind: "fiftyTwoWeekProximity", withinPct: 0.05 },
      },
    });
  });
});
