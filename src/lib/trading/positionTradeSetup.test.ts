import { describe, expect, it } from "vitest";
import type { SerializedDrawing } from "@/lib/chart/contracts";
import {
  atMarketRiskDollars,
  isPositionDrawingName,
  plannedRiskDollars,
  positionOrderLevelsFromDrawing,
} from "./positionTradeSetup";

function longDrawing(
  entry: number,
  stop: number,
  target: number,
  id = "draw-1",
): SerializedDrawing {
  return {
    id,
    name: "long_position",
    label: "Long",
    points: [
      { timestamp: 1000, value: entry },
      { timestamp: 1000, value: stop },
      { timestamp: 2000, value: target },
      { timestamp: 2000, value: entry },
    ],
    metadata: {
      fields: {
        riskSetup: {
          direction: "long",
          account: { capital: 100_000, riskPercent: 1 },
          entries: [{ price: 1 }],
          stops: [{ price: 2, type: "initial" }],
          targets: [{ price: 3, rMultiple: 2 }],
        },
      },
    },
  };
}

describe("positionTradeSetup", () => {
  it("detects position drawing names", () => {
    expect(isPositionDrawingName("long_position")).toBe(true);
    expect(isPositionDrawingName("short_position")).toBe(true);
    expect(isPositionDrawingName("trend_line")).toBe(false);
  });

  it("derives long levels from live points", () => {
    const levels = positionOrderLevelsFromDrawing(longDrawing(100, 95, 110));
    expect(levels).toMatchObject({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });
  });

  it("updates levels when geometry changes (ignores stale metadata)", () => {
    const drawing = longDrawing(100, 95, 110);
    drawing.points[1] = { timestamp: 1000, value: 90 };
    const levels = positionOrderLevelsFromDrawing(drawing);
    expect(levels?.stop).toBe(90);
    expect(levels?.riskRewardRatio).toBe(1);
  });

  it("returns null for non-position drawings", () => {
    expect(
      positionOrderLevelsFromDrawing({
        name: "trend_line",
        points: [
          { timestamp: 0, value: 1 },
          { timestamp: 1, value: 2 },
        ],
      }),
    ).toBeNull();
  });

  it("computes planned and at-market risk dollars", () => {
    expect(plannedRiskDollars(100, 95, 10)).toBe(50);
    expect(atMarketRiskDollars(102, 95, 10, "long")).toBe(70);
    expect(atMarketRiskDollars(98, 105, 10, "short")).toBe(70);
  });
});
