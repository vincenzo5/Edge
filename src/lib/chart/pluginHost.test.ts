import { describe, expect, it } from "vitest";
import { DrawingRegistry } from "@edge/chart-core/pluginHost";
import { serializeAll } from "./pluginHost";
import type { SerializedDrawing } from "./contracts";

describe("DrawingRegistry aliases", () => {
  it("resolves shortPosition toolbar name to short_position plugin", () => {
    expect(DrawingRegistry.resolveName("shortPosition")).toBe("short_position");
    expect(DrawingRegistry.get("shortPosition")?.name).toBe("short_position");
  });
});

describe("serializeAll metadata", () => {
  it("preserves drawing metadata", () => {
    const drawing: SerializedDrawing = {
      id: "d1",
      name: "horizontal_line",
      label: "Stop",
      points: [{ value: 100 }],
      visible: true,
      locked: false,
      zLevel: 0,
      metadata: {
        kind: "invalidation",
        status: "proposed",
        source: "ai",
        rationale: "Break below kills thesis",
      },
    };

    const serialized = serializeAll([drawing]);
    expect(serialized[0]?.metadata).toEqual(drawing.metadata);
  });
});
