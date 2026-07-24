import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { serializeWorkspaceSnapshot, WORKSPACE_SNAPSHOT_MAX } from "./workspaceSnapshotText";

describe("serializeWorkspaceSnapshot", () => {
  it("serializes layout snapshot JSON", () => {
    const json = serializeWorkspaceSnapshot(DEFAULT_LAYOUT, true);
    const parsed = JSON.parse(json) as { layoutId: string; hydrated: boolean };
    expect(parsed.layoutId).toBe(DEFAULT_LAYOUT.layoutId);
    expect(parsed.hydrated).toBe(true);
  });

  it("truncates oversized snapshots", () => {
    const hugeLayout = {
      ...DEFAULT_LAYOUT,
      cells: Array.from({ length: 200 }, (_, index) => ({
        ...DEFAULT_LAYOUT.cells[0],
        symbol: `SYM${index}`.repeat(20),
      })),
    };
    const json = serializeWorkspaceSnapshot(hugeLayout, true);
    expect(json.length).toBeLessThanOrEqual(WORKSPACE_SNAPSHOT_MAX);
  });
});
