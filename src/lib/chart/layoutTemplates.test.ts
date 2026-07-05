import { describe, expect, it } from "vitest";

import {
  DEFAULT_LAYOUT_ID,
  LAYOUT_MENU_ROWS,
  LAYOUT_TEMPLATES,
  cellCountForLayout,
  getLayoutTemplate,
  migrateLegacyGridMode,
  normalizeLayoutId,
  templatesForPaneCount,
  validateTemplateGeometry,
} from "./layoutTemplates";

const EXPECTED_VARIANT_COUNTS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 6,
  4: 10,
  5: 10,
  6: 6,
  7: 3,
  8: 4,
  9: 4,
  10: 3,
  12: 3,
  14: 1,
  16: 2,
};

describe("layoutTemplates catalog", () => {
  it("has unique template ids", () => {
    const ids = LAYOUT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(LAYOUT_TEMPLATES.map((t) => [t.id, t.paneCount] as const))(
    "template %s has valid geometry for %i panes",
    (id, paneCount) => {
      const template = getLayoutTemplate(id);
      expect(template.cells.length).toBe(paneCount);
      expect(validateTemplateGeometry(template)).toBe(true);
    },
  );

  it("menu rows match expected variant counts", () => {
    for (const paneCount of LAYOUT_MENU_ROWS) {
      expect(templatesForPaneCount(paneCount).length).toBe(
        EXPECTED_VARIANT_COUNTS[paneCount],
      );
    }
  });

  it("migrates all legacy grid modes", () => {
    expect(migrateLegacyGridMode("1x1")).toBe("n1");
    expect(migrateLegacyGridMode("2x1")).toBe("n2-rows");
    expect(migrateLegacyGridMode("1x2")).toBe("n2-cols");
    expect(migrateLegacyGridMode("3x1")).toBe("n3-rows");
    expect(migrateLegacyGridMode("2x2")).toBe("n4-grid-2x2");
  });

  it("falls back unknown ids to default", () => {
    expect(migrateLegacyGridMode("4x4")).toBe(DEFAULT_LAYOUT_ID);
    expect(getLayoutTemplate("unknown-id").id).toBe(DEFAULT_LAYOUT_ID);
    expect(cellCountForLayout("unknown-id")).toBe(1);
  });

  it("normalizes layoutId and legacy gridMode from records", () => {
    expect(normalizeLayoutId({ layoutId: "n3-cols" })).toBe("n3-cols");
    expect(normalizeLayoutId({ gridMode: "2x2" })).toBe("n4-grid-2x2");
    expect(normalizeLayoutId({ gridMode: "4x4" })).toBe(DEFAULT_LAYOUT_ID);
    expect(normalizeLayoutId({})).toBe(DEFAULT_LAYOUT_ID);
  });
});
