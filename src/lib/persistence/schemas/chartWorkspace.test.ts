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

  it("rejects invalid layout id", () => {
    const parsed = chartLayoutSnapshotSchema.safeParse({
      ...DEFAULT_LAYOUT,
      layoutId: "invalid-layout",
    });
    expect(parsed.success).toBe(false);
  });

  it("migrates legacy gridMode to layoutId", () => {
    const { layoutId: _ignored, ...withoutLayoutId } = DEFAULT_LAYOUT;
    const parsed = chartLayoutSnapshotSchema.safeParse({
      ...withoutLayoutId,
      gridMode: "2x2",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.layoutId).toBe("n4-grid-2x2");
    }
  });

  it("accepts layout with 16 cells", () => {
    const parsed = chartLayoutSnapshotSchema.safeParse({
      ...DEFAULT_LAYOUT,
      layoutId: "n16-grid-4x4",
      cells: Array.from({ length: 16 }, () => DEFAULT_LAYOUT.cells[0]),
    });
    expect(parsed.success).toBe(true);
  });

  it("requires baseRevision on write requests", () => {
    const parsed = chartWorkspaceWriteSchema.safeParse({
      schemaVersion: 1,
      chartLayoutSnapshot: DEFAULT_LAYOUT,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts shared sidebar width prefs", () => {
    const parsed = chartLayoutSnapshotSchema.safeParse({
      ...DEFAULT_LAYOUT,
      sidebar: {
        activePanel: "watchlist",
        width: 360,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("migrates legacy per-panel sidebar widths to shared width", () => {
    const parsed = chartLayoutSnapshotSchema.safeParse({
      ...DEFAULT_LAYOUT,
      sidebar: {
        activePanel: "watchlist",
        panelWidths: { watchlist: 360, options: 420 },
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sidebar?.width).toBe(360);
      expect(parsed.data.sidebar?.activePanel).toBe("watchlist");
    }
  });

  it("preserves options active panel on parse", () => {
    const parsed = chartLayoutSnapshotSchema.safeParse({
      ...DEFAULT_LAYOUT,
      sidebar: {
        activePanel: "options",
        width: 420,
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sidebar?.activePanel).toBe("options");
      expect(parsed.data.sidebar?.width).toBe(420);
    }
  });

  it("migrates legacy risk active panel to settings", () => {
    const parsed = chartLayoutSnapshotSchema.safeParse({
      ...DEFAULT_LAYOUT,
      sidebar: {
        activePanel: "risk",
        width: 360,
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sidebar?.activePanel).toBe("settings");
      expect(parsed.data.sidebar?.width).toBe(360);
    }
  });

  it("accepts panel presentation and floating geometry", () => {
    const parsed = chartLayoutSnapshotSchema.safeParse({
      ...DEFAULT_LAYOUT,
      sidebar: {
        activePanel: "screener",
        presentation: { screener: "floating" },
        floatingGeometry: {
          screener: { x: 40, y: 40, width: 960, height: 600 },
        },
      },
    });
    expect(parsed.success).toBe(true);
  });
});
