import { describe, it, expect } from "vitest";

import { DEFAULT_LAYOUT, createScriptIndicatorInstance } from "@/lib/chartConfig";
import { layoutHasScriptIndicators } from "./layoutHasScriptIndicators";

describe("layoutHasScriptIndicators", () => {
  it("returns false for default layout without script indicators", () => {
    expect(layoutHasScriptIndicators(DEFAULT_LAYOUT)).toBe(false);
  });

  it("returns true when any cell has a script indicator", () => {
    const layout = {
      ...DEFAULT_LAYOUT,
      cells: [
        {
          ...DEFAULT_LAYOUT.cells[0]!,
          indicators: [
            createScriptIndicatorInstance({
              scriptId: "line-midpoint",
              revision: "abc123",
              name: "__script_line_midpoint",
              pane: "main",
            }),
          ],
        },
      ],
    };

    expect(layoutHasScriptIndicators(layout)).toBe(true);
  });
});
