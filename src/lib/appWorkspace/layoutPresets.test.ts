import { describe, expect, it, beforeEach } from "vitest";

import { resetAppWorkspaceIdCounterForTests } from "./ids";
import {
  WORKSPACE_LAYOUT_PRESETS,
  collectTileIdsFromLayout,
  countTilesInLayout,
  getWorkspaceLayoutPreset,
  isWorkspaceLayoutPresetId,
} from "./layoutPresets";
import { isSplitNode } from "./types";

describe("layoutPresets catalog", () => {
  beforeEach(() => {
    resetAppWorkspaceIdCounterForTests();
  });

  it("has unique preset ids", () => {
    const ids = WORKSPACE_LAYOUT_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(8);
  });

  it("recognizes valid preset ids", () => {
    expect(isWorkspaceLayoutPresetId("two-cols")).toBe(true);
    expect(isWorkspaceLayoutPresetId("unknown")).toBe(false);
  });

  it.each(WORKSPACE_LAYOUT_PRESETS.map((p) => [p.id, p.paneCount, p.label] as const))(
    "preset %s builds %i placeholder panes",
    (id, paneCount) => {
      const preset = getWorkspaceLayoutPreset(id);
      const { root, tiles, activeTileId } = preset.build();
      expect(Object.keys(tiles)).toHaveLength(paneCount);
      expect(countTilesInLayout(root)).toBe(paneCount);
      expect(Object.values(tiles).every((t) => t.surfaceId === "placeholder")).toBe(true);
      expect(activeTileId).toBe(collectTileIdsFromLayout(root)[0]);
      expect(tiles[activeTileId]).toBeDefined();
    },
  );

  it("two-cols uses row split with equal sizes", () => {
    const { root } = getWorkspaceLayoutPreset("two-cols").build();
    expect(isSplitNode(root)).toBe(true);
    if (isSplitNode(root)) {
      expect(root.direction).toBe("row");
      expect(root.sizes[0]).toBeCloseTo(0.5, 5);
      expect(root.sizes[1]).toBeCloseTo(0.5, 5);
    }
  });

  it("two-cols-70-30 uses asymmetric row split", () => {
    const { root } = getWorkspaceLayoutPreset("two-cols-70-30").build();
    expect(isSplitNode(root)).toBe(true);
    if (isSplitNode(root)) {
      expect(root.sizes[0]).toBeCloseTo(0.7, 5);
      expect(root.sizes[1]).toBeCloseTo(0.3, 5);
    }
  });

  it("main-right-stack nests column split on the right", () => {
    const { root } = getWorkspaceLayoutPreset("main-right-stack").build();
    expect(isSplitNode(root)).toBe(true);
    if (isSplitNode(root)) {
      expect(root.direction).toBe("row");
      const right = root.children[1];
      expect(isSplitNode(right)).toBe(true);
      if (isSplitNode(right)) {
        expect(right.direction).toBe("column");
      }
    }
  });

  it("grid-2x2 has four leaves in a 2x2 structure", () => {
    const { root } = getWorkspaceLayoutPreset("grid-2x2").build();
    expect(countTilesInLayout(root)).toBe(4);
    expect(isSplitNode(root)).toBe(true);
    if (isSplitNode(root)) {
      expect(root.direction).toBe("column");
      expect(isSplitNode(root.children[0])).toBe(true);
      expect(isSplitNode(root.children[1])).toBe(true);
    }
  });

  it("rebuild produces fresh tile ids", () => {
    const first = getWorkspaceLayoutPreset("single").build();
    const second = getWorkspaceLayoutPreset("single").build();
    expect(first.activeTileId).not.toBe(second.activeTileId);
  });
});
