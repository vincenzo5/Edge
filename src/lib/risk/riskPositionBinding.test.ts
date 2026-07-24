import { describe, expect, it, beforeEach } from "vitest";
import {
  clearRiskPositionBindStorage,
  findNewPositionDrawingId,
  findPositionDrawingById,
  loadRiskPositionBindFromStorage,
  positionDrawingIds,
  saveRiskPositionBindToStorage,
} from "./riskPositionBinding";
import type { SerializedDrawing } from "@/lib/chart/contracts";

function positionDrawing(id: string, name: "long_position" | "short_position"): SerializedDrawing {
  return {
    id,
    name,
    label: name,
    points: [
      { timestamp: 1, price: 100 },
      { timestamp: 2, price: 95 },
      { timestamp: 3, price: 110 },
    ],
    visible: true,
    locked: false,
    zLevel: 1,
  };
}

describe("riskPositionBinding", () => {
  beforeEach(() => {
    clearRiskPositionBindStorage();
  });

  it("collects position drawing ids", () => {
    const drawings = [
      positionDrawing("d1", "long_position"),
      {
        id: "d2",
        name: "trend_line",
        label: "Trend",
        points: [{ timestamp: 1, price: 100 }],
        visible: true,
        locked: false,
        zLevel: 1,
      },
      positionDrawing("d3", "short_position"),
    ];
    expect(positionDrawingIds(drawings)).toEqual(new Set(["d1", "d3"]));
  });

  it("finds the last newly added position drawing", () => {
    const prev = new Set(["d1"]);
    const drawings = [
      positionDrawing("d1", "long_position"),
      positionDrawing("d2", "short_position"),
      positionDrawing("d3", "long_position"),
    ];
    expect(findNewPositionDrawingId(prev, drawings)).toBe("d3");
  });

  it("returns null when no new position drawings appear", () => {
    const prev = new Set(["d1", "d2"]);
    const drawings = [
      positionDrawing("d1", "long_position"),
      positionDrawing("d2", "short_position"),
    ];
    expect(findNewPositionDrawingId(prev, drawings)).toBeNull();
  });

  it("finds a position drawing by id", () => {
    const drawings = [positionDrawing("d1", "long_position")];
    expect(findPositionDrawingById(drawings, "d1")?.name).toBe("long_position");
    expect(findPositionDrawingById(drawings, "missing")).toBeNull();
  });

  it("persists bind state to localStorage", () => {
    saveRiskPositionBindToStorage({
      cellId: "cell-0",
      drawingId: "d1",
      linked: true,
    });
    expect(loadRiskPositionBindFromStorage()).toEqual({
      cellId: "cell-0",
      drawingId: "d1",
      linked: true,
    });
    clearRiskPositionBindStorage();
    expect(loadRiskPositionBindFromStorage()).toBeNull();
  });
});
