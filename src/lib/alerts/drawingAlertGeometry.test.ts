import { describe, expect, it } from "vitest";

import type { SerializedDrawing } from "@edge/chart-core/contracts";
import {
  buildAlertPrefillFromDrawing,
  interpolateTrendlineLevel,
  isAlertableDrawingKind,
  resolveAlertEvaluationTarget,
  resolveGeometryFromDrawing,
} from "./drawingAlertGeometry";

describe("drawingAlertGeometry", () => {
  it("recognizes alertable drawing kinds", () => {
    expect(isAlertableDrawingKind("horizontal_line")).toBe(true);
    expect(isAlertableDrawingKind("rectangle")).toBe(true);
    expect(isAlertableDrawingKind("fib_retracement")).toBe(false);
  });

  it("resolves horizontal line geometry", () => {
    const drawing: SerializedDrawing = {
      id: "d1",
      name: "horizontal_line",
      label: "H",
      points: [{ value: 150 }],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    expect(resolveGeometryFromDrawing(drawing)).toEqual({ price: 150 });
  });

  it("resolves rectangle zone bounds", () => {
    const drawing: SerializedDrawing = {
      id: "d2",
      name: "rectangle",
      label: "Rect",
      points: [{ value: 120 }, { value: 100 }],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    expect(resolveGeometryFromDrawing(drawing)).toEqual({ price: 100, priceHigh: 120 });
  });

  it("interpolates trendline level at a timestamp", () => {
    const level = interpolateTrendlineLevel({
      t0: 0,
      v0: 100,
      t1: 10_000,
      v1: 110,
      atMs: 5_000,
    });
    expect(level).toBeCloseTo(105, 5);
  });

  it("builds alert prefill from drawing", () => {
    const drawing: SerializedDrawing = {
      id: "d3",
      name: "horizontal_line",
      label: "H",
      points: [{ value: 200 }],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const prefill = buildAlertPrefillFromDrawing({
      symbol: "aapl",
      drawing,
      quotePrice: 195,
    });
    expect(prefill).toMatchObject({
      symbol: "AAPL",
      operator: "cross_above",
      price: 200,
      drawingId: "d3",
      drawingKind: "horizontal_line",
    });
  });

  it("resolves trendline target from stored endpoints", () => {
    const target = resolveAlertEvaluationTarget(
      {
        id: "a",
        symbol: "SPY",
        operator: "cross_above",
        price: 0,
        message: null,
        recurrence: "once",
        status: "active",
        cooldownMs: 30_000,
        expiresAt: null,
        lastPrice: null,
        lastFiredAt: null,
        drawingId: "d4",
        drawingKind: "trend_line",
        priceHigh: null,
        tlT0: 0,
        tlV0: 100,
        tlT1: 10_000,
        tlV1: 110,
        tlExtendLeft: false,
        tlExtendRight: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      5_000,
    );
    expect(target?.targetPrice).toBeCloseTo(105, 5);
  });
});
