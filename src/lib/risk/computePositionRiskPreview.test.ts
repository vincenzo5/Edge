import { describe, expect, it } from "vitest";
import type { SerializedDrawing } from "@edge/chart-core/contracts";
import { computePositionRiskPreview } from "./computePositionRiskPreview";

function longDrawing(
  entry: number,
  stop: number,
  target: number,
): SerializedDrawing {
  return {
    id: "draw-1",
    name: "long_position",
    label: "Long",
    points: [
      { timestamp: 1000, value: entry },
      { timestamp: 1000, value: stop },
      { timestamp: 2000, value: target },
      { timestamp: 2000, value: entry },
    ],
  };
}

describe("computePositionRiskPreview", () => {
  it("returns geometry from live drawing points", () => {
    const preview = computePositionRiskPreview(longDrawing(100, 95, 110), null);
    expect(preview).toMatchObject({
      direction: "long",
      entry: 100,
      stop: 95,
      target: 110,
      rUnit: 5,
      riskRewardRatio: 2,
      sizing: null,
    });
  });

  it("sizes with session dollar risk (same math as equityPositionSize)", () => {
    const preview = computePositionRiskPreview(longDrawing(100, 95, 110), 500);
    expect(preview?.sizing).toEqual({
      shares: 100,
      plannedRiskDollars: 500,
      targetRiskDollars: 500,
    });
  });

  it("uses absolute budget not DEFAULT_RISK_ACCOUNT percent path", () => {
    const preview = computePositionRiskPreview(longDrawing(100, 95, 110), 1000);
    expect(preview?.sizing?.shares).toBe(200);
    expect(preview?.sizing?.plannedRiskDollars).toBe(1000);
  });

  it("updates when stop moves (live points)", () => {
    const drawing = longDrawing(100, 95, 110);
    drawing.points[1] = { timestamp: 1000, value: 90 };
    const preview = computePositionRiskPreview(drawing, 500);
    expect(preview?.rUnit).toBe(10);
    expect(preview?.riskRewardRatio).toBe(1);
    expect(preview?.sizing?.shares).toBe(50);
  });

  it("returns null for non-position drawings", () => {
    expect(
      computePositionRiskPreview(
        {
          name: "trend_line",
          points: [
            { timestamp: 0, value: 1 },
            { timestamp: 1, value: 2 },
          ],
        },
        500,
      ),
    ).toBeNull();
  });

  it("omits sizing when budget is missing or zero", () => {
    expect(computePositionRiskPreview(longDrawing(100, 95, 110), null)?.sizing).toBeNull();
    expect(computePositionRiskPreview(longDrawing(100, 95, 110), 0)?.sizing).toBeNull();
  });
});
