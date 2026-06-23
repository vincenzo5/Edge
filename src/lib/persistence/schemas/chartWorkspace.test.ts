import { describe, expect, it } from "vitest";

import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import {
  chartLayoutSnapshotSchema,
  chartWorkspaceWriteSchema,
} from "@/lib/persistence/schemas/chartWorkspace";

describe("chartWorkspace schemas", () => {
  it("accepts a valid chart layout snapshot", () => {
    const parsed = chartLayoutSnapshotSchema.safeParse(DEFAULT_LAYOUT);
    expect(parsed.success).toBe(true);
  });

  it("rejects empty cells", () => {
    const parsed = chartLayoutSnapshotSchema.safeParse({
      ...DEFAULT_LAYOUT,
      cells: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid grid mode", () => {
    const parsed = chartLayoutSnapshotSchema.safeParse({
      ...DEFAULT_LAYOUT,
      gridMode: "4x4",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires baseRevision on write requests", () => {
    const parsed = chartWorkspaceWriteSchema.safeParse({
      schemaVersion: 1,
      chartLayoutSnapshot: DEFAULT_LAYOUT,
    });
    expect(parsed.success).toBe(false);
  });
});
