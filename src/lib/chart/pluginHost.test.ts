import { describe, expect, it } from "vitest";
import { serializeAll } from "./pluginHost";
import type { SerializedDrawing } from "./contracts";

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
