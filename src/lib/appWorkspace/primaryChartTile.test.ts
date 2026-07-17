import { describe, expect, it, beforeEach } from "vitest";

import { createDefaultDocument, openSurface } from "./commands";
import { resetAppWorkspaceIdCounterForTests } from "./ids";
import { primaryChartTileId } from "./primaryChartTile";

describe("primaryChartTileId", () => {
  beforeEach(() => {
    resetAppWorkspaceIdCounterForTests();
  });

  it("returns the chart tile when only chart exists", () => {
    const doc = createDefaultDocument();
    expect(primaryChartTileId(doc)).toBe(doc.activeTileId);
  });

  it("returns left chart tile in a horizontal split", () => {
    let doc = createDefaultDocument();
    const chartTileId = doc.activeTileId!;
    doc = openSurface(doc, "screener", { region: "right", targetTileId: chartTileId });
    expect(primaryChartTileId(doc)).toBe(chartTileId);
  });

  it("returns top chart tile in a vertical split", () => {
    let doc = createDefaultDocument();
    const chartTileId = doc.activeTileId!;
    doc = openSurface(doc, "journal", { region: "bottom", targetTileId: chartTileId });
    expect(primaryChartTileId(doc)).toBe(chartTileId);
  });

  it("returns null when no chart tile exists", () => {
    const doc = createDefaultDocument("Screener only", "screener");
    expect(primaryChartTileId(doc)).toBeNull();
  });
});
