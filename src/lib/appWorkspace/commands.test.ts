import { describe, expect, it, beforeEach } from "vitest";

import {
  applySurfaceFocusOrOpen,
  applyLayoutPreset,
  assignTileSurface,
  closeTile,
  collectSplitIds,
  createDefaultDocument,
  createDefaultWorkspacesState,
  createWorkspaceDocument,
  duplicateDocument,
  moveTile,
  openSurface,
  resizeSplit,
  saveDocument,
  setActiveTile,
  splitTile,
  updateTileSurfaceState,
} from "./commands";
import { resetAppWorkspaceIdCounterForTests } from "./ids";
import { parseAppWorkspacesState } from "./schema";
import { APP_WORKSPACES_STORAGE_KEY, loadAppWorkspacesState, saveAppWorkspacesState } from "./storage";
import { isSplitNode, isTileNode } from "./types";

describe("appWorkspace commands", () => {
  beforeEach(() => {
    resetAppWorkspaceIdCounterForTests();
  });

  it("creates default one-tile chart document", () => {
    const doc = createDefaultDocument();
    expect(doc.version).toBe(1);
    expect(Object.keys(doc.tiles)).toHaveLength(1);
    expect(isTileNode(doc.root)).toBe(true);
    if (isTileNode(doc.root)) {
      expect(doc.tiles[doc.root.tileId]?.surfaceId).toBe("chart");
    }
  });

  it("splits tile to the right", () => {
    let doc = createDefaultDocument();
    const chartTileId = doc.activeTileId!;
    doc = openSurface(doc, "screener", { region: "right", targetTileId: chartTileId });
    expect(isSplitNode(doc.root)).toBe(true);
    expect(Object.keys(doc.tiles)).toHaveLength(2);
  });

  it("updates tile surface state", () => {
    let doc = createDefaultDocument();
    const chartTileId = doc.activeTileId!;
    doc = openSurface(doc, "screener", {
      region: "right",
      targetTileId: chartTileId,
      surfaceState: { screenerView: "review" },
    });
    const screenerTileId = doc.activeTileId!;
    doc = updateTileSurfaceState(doc, screenerTileId, { screenerView: "screens" });
    expect(doc.tiles[screenerTileId]?.surfaceState?.screenerView).toBe("screens");
  });

  it("applySurfaceFocusOrOpen is idempotent with empty surface state", () => {
    let doc = createDefaultDocument();
    const chartTileId = doc.activeTileId!;
    doc = openSurface(doc, "screener", {
      region: "right",
      targetTileId: chartTileId,
      surfaceState: { screenerView: "review" },
    });
    const before = doc;
    const result = applySurfaceFocusOrOpen(doc, "screener", { surfaceState: {} });
    expect(result.changed).toBe(false);
    expect(result.doc).toBe(before);
  });

  it("applySurfaceFocusOrOpen focuses an existing surface without surface state", () => {
    let doc = createDefaultDocument();
    const chartTileId = doc.activeTileId!;
    doc = openSurface(doc, "screener", { region: "right", targetTileId: chartTileId });
    const screenerTileId = doc.activeTileId!;
    doc = setActiveTile(doc, chartTileId);

    const result = applySurfaceFocusOrOpen(doc, "screener");
    expect(result.changed).toBe(true);
    expect(result.doc.activeTileId).toBe(screenerTileId);
  });

  it("applySurfaceFocusOrOpen is idempotent when surface state already matches", () => {
    let doc = createDefaultDocument();
    const chartTileId = doc.activeTileId!;
    doc = openSurface(doc, "screener", {
      region: "right",
      targetTileId: chartTileId,
      surfaceState: { screenerView: "screens" },
    });
    const before = doc;
    const result = applySurfaceFocusOrOpen(doc, "screener", {
      surfaceState: { screenerView: "screens" },
    });
    expect(result.changed).toBe(false);
    expect(result.openedNew).toBe(false);
    expect(result.doc).toBe(before);
  });

  it("moves tile to another edge", () => {
    let doc = createDefaultDocument();
    const chartTileId = doc.activeTileId!;
    doc = openSurface(doc, "journal", { region: "right", targetTileId: chartTileId });
    const journalTileId = doc.activeTileId!;
    doc = moveTile(doc, journalTileId, chartTileId, "bottom");
    expect(collectSplitIds(doc.root).length).toBeGreaterThan(0);
    expect(doc.tiles[journalTileId]?.surfaceId).toBe("journal");
  });

  it("clamps resize fractions", () => {
    let doc = createDefaultDocument();
    doc = splitTile(doc, doc.activeTileId!, "row", "second", "placeholder");
    const splitId = collectSplitIds(doc.root)[0]!;
    doc = resizeSplit(doc, splitId, [0.01, 0.99]);
    const root = doc.root;
    expect(isSplitNode(root)).toBe(true);
    if (isSplitNode(root)) {
      expect(root.sizes[0]).toBeGreaterThanOrEqual(0.08);
      expect(root.sizes[1]).toBeGreaterThanOrEqual(0.08);
      expect(root.sizes[0] + root.sizes[1]).toBeCloseTo(1, 5);
    }
  });

  it("closes tile and collapses split", () => {
    let doc = createDefaultDocument();
    const chartTileId = doc.activeTileId!;
    doc = openSurface(doc, "screener", { region: "right", targetTileId: chartTileId });
    const screenerTileId = doc.activeTileId!;
    doc = closeTile(doc, screenerTileId);
    expect(isTileNode(doc.root)).toBe(true);
    expect(Object.keys(doc.tiles)).toHaveLength(1);
    expect(doc.tiles[chartTileId]).toBeDefined();
  });

  it("supports two open surfaces via splitTile", () => {
    let doc = createDefaultDocument();
    doc = splitTile(doc, doc.activeTileId!, "column", "second", "journal");
    expect(Object.keys(doc.tiles)).toHaveLength(2);
    const surfaces = Object.values(doc.tiles).map((t) => t.surfaceId);
    expect(surfaces).toContain("chart");
    expect(surfaces).toContain("journal");
  });

  it("round-trips through schema parse", () => {
    let state = createDefaultWorkspacesState();
    let doc = getActiveFromState(state);
    doc = openSurface(doc, "screener", { region: "right", targetTileId: doc.activeTileId });
    state = saveDocument(state, doc);
    const parsed = parseAppWorkspacesState(state);
    expect(parsed).not.toBeNull();
    expect(parsed!.documents[0]!.tiles).toEqual(state.documents[0]!.tiles);
  });

  it("creates a new workspace document and activates it", () => {
    let state = createDefaultWorkspacesState();
    const originalId = state.activeDocumentId;
    state = createWorkspaceDocument(state, "Morning Scan");
    expect(state.documents).toHaveLength(2);
    expect(state.documents[1]!.name).toBe("Morning Scan");
    expect(state.activeDocumentId).toBe(state.documents[1]!.id);
    expect(state.activeDocumentId).not.toBe(originalId);
  });

  it("creates workspace with default name when omitted", () => {
    let state = createDefaultWorkspacesState();
    state = createWorkspaceDocument(state);
    expect(state.documents[1]!.name).toBe("Workspace");
  });

  it("duplicates document with remapped tile ids", () => {
    let state = createDefaultWorkspacesState();
    const doc = getActiveFromState(state);
    state = duplicateDocument(state, doc.id, "Morning copy");
    expect(state.documents).toHaveLength(2);
    expect(state.documents[1]!.name).toBe("Morning copy");
    expect(state.documents[1]!.id).not.toBe(doc.id);
  });

  it("applyLayoutPreset replaces geometry with placeholders", () => {
    let doc = createDefaultDocument("My workspace");
    const docId = doc.id;
    doc = openSurface(doc, "screener", { region: "right", targetTileId: doc.activeTileId });
    doc = applyLayoutPreset(doc, "two-cols");
    expect(doc.id).toBe(docId);
    expect(doc.name).toBe("My workspace");
    expect(Object.keys(doc.tiles)).toHaveLength(2);
    expect(Object.values(doc.tiles).every((t) => t.surfaceId === "placeholder")).toBe(true);
    expect(isSplitNode(doc.root)).toBe(true);
  });

  it("assignTileSurface assigns chart screener journal in place", () => {
    let doc = applyLayoutPreset(createDefaultDocument(), "two-cols");
    const [firstTileId, secondTileId] = Object.keys(doc.tiles);
    doc = assignTileSurface(doc, firstTileId!, "chart");
    doc = assignTileSurface(doc, secondTileId!, "screener");
    expect(doc.tiles[firstTileId!]?.surfaceId).toBe("chart");
    expect(doc.tiles[secondTileId!]?.surfaceId).toBe("screener");
    expect(collectSplitIds(doc.root).length).toBe(1);
  });

  it("assignTileSurface is no-op for unknown tile", () => {
    const doc = createDefaultDocument();
    const result = assignTileSurface(doc, "missing", "journal");
    expect(result).toBe(doc);
  });

  it("assignTileSurface clears surface state when surface changes", () => {
    let doc = createDefaultDocument();
    const tileId = doc.activeTileId!;
    doc = assignTileSurface(doc, tileId, "screener", { screenerView: "review" });
    doc = assignTileSurface(doc, tileId, "journal");
    expect(doc.tiles[tileId]?.surfaceId).toBe("journal");
    expect(doc.tiles[tileId]?.surfaceState).toBeUndefined();
  });
});

describe("appWorkspace storage", () => {
  beforeEach(() => {
    resetAppWorkspaceIdCounterForTests();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(APP_WORKSPACES_STORAGE_KEY);
    }
  });

  it("persists and reloads state", () => {
    const state = createDefaultWorkspacesState();
    saveAppWorkspacesState(state);
    const loaded = loadAppWorkspacesState();
    expect(loaded.activeDocumentId).toBe(state.activeDocumentId);
    expect(loaded.documents[0]!.id).toBe(state.documents[0]!.id);
  });

  it("falls back on corrupt storage", () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(APP_WORKSPACES_STORAGE_KEY, "{not-json");
    const loaded = loadAppWorkspacesState();
    expect(loaded.version).toBe(1);
    expect(loaded.documents.length).toBeGreaterThan(0);
  });
});

function getActiveFromState(state: ReturnType<typeof createDefaultWorkspacesState>) {
  return state.documents.find((d) => d.id === state.activeDocumentId)!;
}
