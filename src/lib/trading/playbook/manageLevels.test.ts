import { describe, expect, it, vi } from "vitest";

import { BREAK_EVEN_PRESET, HALF_THEN_BE_PRESET } from "./presets";
import {
  createPlaybookInstance,
  lockPositionPlan,
} from "./types";
import {
  manageLevelsForSymbol,
  manageLevelsFromInstance,
  manageLevelsToPriceAxisAnnotations,
} from "./manageLevels";

describe("manageLevelsFromInstance", () => {
  const positionPlan = lockPositionPlan({
    symbol: "AAPL",
    accountId: "DUP586813",
    side: "BUY",
    entry: 100,
    initialStop: 95,
    qty: 10,
    environment: "paper",
    lockedAt: "2026-07-24T12:00:00.000Z",
  });

  it("returns BE trigger price for armed break-even preset", () => {
    const instance = createPlaybookInstance({
      id: "inst-be",
      template: BREAK_EVEN_PRESET,
      positionPlan,
      status: "armed",
      createdAt: "2026-07-24T12:00:00.000Z",
    });
    const markers = manageLevelsFromInstance(instance);
    expect(markers.some((item) => item.label === "BE" && item.price === 105)).toBe(true);
  });

  it("returns scale marker for half-then-be preset", () => {
    const instance = createPlaybookInstance({
      id: "inst-half",
      template: HALF_THEN_BE_PRESET,
      positionPlan,
      status: "armed",
      createdAt: "2026-07-24T12:00:00.000Z",
    });
    const markers = manageLevelsFromInstance(instance);
    expect(markers.some((item) => item.label === "½" && item.price === 105)).toBe(true);
  });

  it("hides markers for detached instances", () => {
    const instance = createPlaybookInstance({
      id: "inst-detached",
      template: BREAK_EVEN_PRESET,
      positionPlan,
      status: "detached",
      createdAt: "2026-07-24T12:00:00.000Z",
    });
    expect(manageLevelsFromInstance(instance)).toEqual([]);
  });

  it("maps markers to price-axis annotations", () => {
    const instance = createPlaybookInstance({
      id: "inst-axis",
      template: BREAK_EVEN_PRESET,
      positionPlan,
      status: "armed",
      createdAt: "2026-07-24T12:00:00.000Z",
    });
    const annotations = manageLevelsToPriceAxisAnnotations(
      manageLevelsFromInstance(instance),
    );
    expect(annotations[0]?.source).toBe("manage");
    expect(annotations[0]?.line).toBe("dashed");
  });

  it("finds active instance for symbol", () => {
    const instance = createPlaybookInstance({
      id: "inst-match",
      template: BREAK_EVEN_PRESET,
      positionPlan,
      status: "paused",
      createdAt: "2026-07-24T12:00:00.000Z",
    });
    const markers = manageLevelsForSymbol([instance], "AAPL");
    expect(markers.length).toBeGreaterThan(0);
  });
});
