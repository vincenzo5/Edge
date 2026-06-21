import { describe, it, expect } from "vitest";
import {
  DRAWING_TOOL_GROUPS,
  MEASURE_TOOL,
  findGroupForTool,
  initialGroupSelections,
  isGroupedDrawingTool,
} from "./toolGroups";

describe("toolGroups", () => {
  it("defines three flyout groups", () => {
    expect(DRAWING_TOOL_GROUPS).toHaveLength(3);
    expect(DRAWING_TOOL_GROUPS.map((g) => g.id)).toEqual([
      "lines",
      "shapes",
      "annotation",
    ]);
  });

  it("does not include measure in any group", () => {
    const groupedNames = DRAWING_TOOL_GROUPS.flatMap((g) =>
      g.tools.map((t) => t.name),
    );
    expect(groupedNames).not.toContain("measure");
    expect(MEASURE_TOOL).toBe("measure");
  });

  it("has no duplicate tools across groups", () => {
    const names = DRAWING_TOOL_GROUPS.flatMap((g) => g.tools.map((t) => t.name));
    expect(new Set(names).size).toBe(names.length);
  });

  it("initialGroupSelections uses each group defaultTool", () => {
    const selections = initialGroupSelections();
    for (const group of DRAWING_TOOL_GROUPS) {
      expect(selections[group.id]).toBe(group.defaultTool);
    }
  });

  it("findGroupForTool resolves grouped tools only", () => {
    expect(findGroupForTool("straightLine")?.id).toBe("lines");
    expect(findGroupForTool("rect")?.id).toBe("shapes");
    expect(findGroupForTool("simpleAnnotation")?.id).toBe("annotation");
    expect(findGroupForTool("measure")).toBeUndefined();
    expect(findGroupForTool("__cursor__")).toBeUndefined();
  });

  it("isGroupedDrawingTool excludes measure and cursor", () => {
    expect(isGroupedDrawingTool("straightLine")).toBe(true);
    expect(isGroupedDrawingTool("measure")).toBe(false);
  });
});
