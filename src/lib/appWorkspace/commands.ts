import { createAppWorkspaceId } from "./ids";
import {
  getWorkspaceLayoutPreset,
  type WorkspaceLayoutPresetId,
} from "./layoutPresets";
import type {
  AppWorkspaceDocument,
  AppWorkspacesState,
  DropEdge,
  LayoutNode,
  SplitDirection,
  SplitNode,
  SurfaceId,
  TileInstance,
  TileNode,
  TileSurfaceState,
} from "./types";
import { isSplitNode, isTileNode } from "./types";

const MIN_SPLIT_SIZE = 0.08;
const MAX_SPLIT_SIZE = 1 - MIN_SPLIT_SIZE;

export function clampSplitSize(size: number): number {
  if (!Number.isFinite(size)) return 0.5;
  return Math.min(MAX_SPLIT_SIZE, Math.max(MIN_SPLIT_SIZE, size));
}

export function normalizeSplitSizes(sizes: [number, number]): [number, number] {
  const a = clampSplitSize(sizes[0]);
  const b = clampSplitSize(sizes[1]);
  const total = a + b;
  if (total <= 0) return [0.5, 0.5];
  return [a / total, b / total];
}

export function createDefaultDocument(
  name = "Default",
  surfaceId: SurfaceId = "chart",
): AppWorkspaceDocument {
  const tileId = createAppWorkspaceId("tile");
  const now = new Date().toISOString();
  return {
    version: 1,
    id: createAppWorkspaceId("doc"),
    name,
    activeTileId: tileId,
    updatedAt: now,
    root: {
      type: "tile",
      id: createAppWorkspaceId("node"),
      tileId,
    },
    tiles: {
      [tileId]: {
        id: tileId,
        surfaceId,
      },
    },
  };
}

export function createDefaultWorkspacesState(): AppWorkspacesState {
  const doc = createDefaultDocument();
  return {
    version: 1,
    activeDocumentId: doc.id,
    documents: [doc],
  };
}

function touchDocument(doc: AppWorkspaceDocument): AppWorkspaceDocument {
  return { ...doc, updatedAt: new Date().toISOString() };
}

function cloneLayoutNode(node: LayoutNode): LayoutNode {
  if (isSplitNode(node)) {
    return {
      ...node,
      children: [cloneLayoutNode(node.children[0]), cloneLayoutNode(node.children[1])],
    };
  }
  return { ...node };
}

function findParentSplit(
  root: LayoutNode,
  targetNodeId: string,
): { parent: SplitNode; index: 0 | 1 } | null {
  if (isTileNode(root)) return null;
  for (const index of [0, 1] as const) {
    const child = root.children[index];
    if (child.id === targetNodeId) {
      return { parent: root, index };
    }
    const nested = findParentSplit(child, targetNodeId);
    if (nested) return nested;
  }
  return null;
}

function findTileNode(root: LayoutNode, tileId: string): TileNode | null {
  if (isTileNode(root)) {
    return root.tileId === tileId ? root : null;
  }
  return findTileNode(root.children[0], tileId) ?? findTileNode(root.children[1], tileId);
}

function replaceNode(root: LayoutNode, nodeId: string, replacement: LayoutNode): LayoutNode {
  if (root.id === nodeId) return replacement;
  if (isSplitNode(root)) {
    return {
      ...root,
      children: [
        replaceNode(root.children[0], nodeId, replacement),
        replaceNode(root.children[1], nodeId, replacement),
      ],
    };
  }
  return root;
}

function removeTileFromRecord(
  tiles: Record<string, TileInstance>,
  tileId: string,
): Record<string, TileInstance> {
  const next = { ...tiles };
  delete next[tileId];
  return next;
}

function collapseSplit(parent: SplitNode, keepIndex: 0 | 1): LayoutNode {
  return parent.children[keepIndex];
}

export function openSurface(
  doc: AppWorkspaceDocument,
  surfaceId: SurfaceId,
  options?: {
    region?: DropEdge;
    surfaceState?: TileSurfaceState;
    targetTileId?: string;
    tileId?: string;
  },
): AppWorkspaceDocument {
  const tileId = options?.tileId ?? createAppWorkspaceId("tile");
  const tile: TileInstance = {
    id: tileId,
    surfaceId,
    ...(options?.surfaceState ? { surfaceState: options.surfaceState } : {}),
  };
  const newNode: TileNode = {
    type: "tile",
    id: createAppWorkspaceId("node"),
    tileId,
  };

  const region = options?.region ?? "right";
  const targetTileId = options?.targetTileId ?? doc.activeTileId;
  let root = cloneLayoutNode(doc.root);

  if (targetTileId) {
    const targetNode = findTileNode(root, targetTileId);
    if (targetNode) {
      if (region === "center") {
        root = replaceNode(root, targetNode.id, newNode);
      } else {
        const direction: SplitDirection =
          region === "left" || region === "right" ? "row" : "column";
        const insertFirst = region === "left" || region === "top";
        const split: SplitNode = {
          type: "split",
          id: createAppWorkspaceId("node"),
          direction,
          children: insertFirst ? [newNode, targetNode] : [targetNode, newNode],
          sizes: [0.5, 0.5],
        };
        root = replaceNode(root, targetNode.id, split);
      }
    } else {
      root = newNode;
    }
  } else {
    root = newNode;
  }

  return touchDocument({
    ...doc,
    root,
    activeTileId: tileId,
    tiles: { ...doc.tiles, [tileId]: tile },
  });
}

export function updateTileSurfaceState(
  doc: AppWorkspaceDocument,
  tileId: string,
  surfaceState: TileSurfaceState,
): AppWorkspaceDocument {
  const tile = doc.tiles[tileId];
  if (!tile) return doc;
  if (tileSurfaceStateMatches(tile.surfaceState, surfaceState)) return doc;
  return touchDocument({
    ...doc,
    tiles: {
      ...doc.tiles,
      [tileId]: { ...tile, surfaceState },
    },
  });
}

function tileSurfaceStateMatches(
  current: TileSurfaceState | undefined,
  next: TileSurfaceState,
): boolean {
  return JSON.stringify(current ?? {}) === JSON.stringify(next);
}

function hasMeaningfulSurfaceState(state?: TileSurfaceState): state is TileSurfaceState {
  return !!state && Object.keys(state).length > 0;
}

export function applySurfaceFocusOrOpen(
  doc: AppWorkspaceDocument,
  surfaceId: SurfaceId,
  options?: { region?: DropEdge; surfaceState?: TileSurfaceState },
): { doc: AppWorkspaceDocument; openedNew: boolean; changed: boolean } {
  const existing = Object.values(doc.tiles).find((tile) => tile.surfaceId === surfaceId);
  if (existing) {
    const wasActive = doc.activeTileId === existing.id;
    const surfacePatch = hasMeaningfulSurfaceState(options?.surfaceState)
      ? options.surfaceState
      : undefined;

    if (surfacePatch) {
      const merged: TileSurfaceState = { ...existing.surfaceState, ...surfacePatch };
      if (wasActive && tileSurfaceStateMatches(existing.surfaceState, merged)) {
        return { doc, openedNew: false, changed: false };
      }
      let next = setActiveTile(doc, existing.id);
      next = updateTileSurfaceState(next, existing.id, merged);
      return { doc: next, openedNew: false, changed: true };
    }

    if (wasActive) {
      return { doc, openedNew: false, changed: false };
    }

    return { doc: setActiveTile(doc, existing.id), openedNew: false, changed: true };
  }

  return {
    doc: openSurface(doc, surfaceId, {
      region: options?.region ?? "right",
      surfaceState: options?.surfaceState,
      targetTileId: doc.activeTileId,
    }),
    openedNew: true,
    changed: true,
  };
}

export function closeTile(doc: AppWorkspaceDocument, tileId: string): AppWorkspaceDocument {
  if (!doc.tiles[tileId]) return doc;

  const tileNode = findTileNode(doc.root, tileId);
  if (!tileNode) {
    return touchDocument({
      ...doc,
      tiles: removeTileFromRecord(doc.tiles, tileId),
    });
  }

  const parent = findParentSplit(doc.root, tileNode.id);
  let root: LayoutNode;
  if (parent) {
    const keepIndex: 0 | 1 = parent.index === 0 ? 1 : 0;
    root = replaceNode(doc.root, parent.parent.id, collapseSplit(parent.parent, keepIndex));
  } else {
    const remaining = Object.keys(doc.tiles).filter((id) => id !== tileId);
    if (remaining.length === 0) {
      const fallback = createDefaultDocument(doc.name, "chart");
      return touchDocument({ ...fallback, id: doc.id, name: doc.name });
    }
    const nextTileId = remaining[0]!;
    root = {
      type: "tile",
      id: createAppWorkspaceId("node"),
      tileId: nextTileId,
    };
  }

  const tiles = removeTileFromRecord(doc.tiles, tileId);
  const activeTileId =
    doc.activeTileId === tileId
      ? Object.keys(tiles)[0]
      : doc.activeTileId && tiles[doc.activeTileId]
        ? doc.activeTileId
        : Object.keys(tiles)[0];

  return touchDocument({
    ...doc,
    root,
    tiles,
    activeTileId,
  });
}

export function splitTile(
  doc: AppWorkspaceDocument,
  tileId: string,
  direction: SplitDirection,
  side: "first" | "second",
  surfaceId: SurfaceId,
  surfaceState?: TileSurfaceState,
): AppWorkspaceDocument {
  const region: DropEdge =
    direction === "row" ? (side === "first" ? "left" : "right") : side === "first" ? "top" : "bottom";
  return openSurface(doc, surfaceId, { region, targetTileId: tileId, surfaceState });
}

export function moveTile(
  doc: AppWorkspaceDocument,
  sourceTileId: string,
  targetTileId: string,
  edge: DropEdge,
): AppWorkspaceDocument {
  if (sourceTileId === targetTileId) return doc;
  const sourceTile = doc.tiles[sourceTileId];
  if (!sourceTile) return doc;

  const without = closeTile(doc, sourceTileId);
  return openSurface(without, sourceTile.surfaceId, {
    region: edge,
    targetTileId,
    surfaceState: sourceTile.surfaceState,
    tileId: sourceTileId,
  });
}

export function resizeSplit(
  doc: AppWorkspaceDocument,
  splitId: string,
  sizes: [number, number],
): AppWorkspaceDocument {
  const normalized = normalizeSplitSizes(sizes);

  function mapNode(node: LayoutNode): LayoutNode {
    if (isSplitNode(node)) {
      if (node.id === splitId) {
        return { ...node, sizes: normalized };
      }
      return {
        ...node,
        children: [mapNode(node.children[0]), mapNode(node.children[1])],
      };
    }
    return node;
  }

  return touchDocument({
    ...doc,
    root: mapNode(doc.root),
  });
}

export function setActiveTile(doc: AppWorkspaceDocument, tileId: string): AppWorkspaceDocument {
  if (!doc.tiles[tileId]) return doc;
  if (doc.activeTileId === tileId) return doc;
  return touchDocument({ ...doc, activeTileId: tileId });
}

export function createWorkspaceDocument(
  state: AppWorkspacesState,
  name?: string,
): AppWorkspacesState {
  const doc = createDefaultDocument(name ?? "Workspace");
  return {
    ...state,
    activeDocumentId: doc.id,
    documents: [...state.documents, doc],
  };
}

export function duplicateDocument(
  state: AppWorkspacesState,
  documentId: string,
  name?: string,
): AppWorkspacesState {
  const source = state.documents.find((d) => d.id === documentId);
  if (!source) return state;

  const idMap = new Map<string, string>();
  for (const tileId of Object.keys(source.tiles)) {
    idMap.set(tileId, createAppWorkspaceId("tile"));
  }

  function remapNode(node: LayoutNode): LayoutNode {
    if (isTileNode(node)) {
      const mappedTileId = idMap.get(node.tileId) ?? node.tileId;
      return {
        type: "tile",
        id: createAppWorkspaceId("node"),
        tileId: mappedTileId,
      };
    }
    return {
      ...node,
      id: createAppWorkspaceId("node"),
      children: [remapNode(node.children[0]), remapNode(node.children[1])],
    };
  }

  const tiles: Record<string, TileInstance> = {};
  for (const [oldId, tile] of Object.entries(source.tiles)) {
    const newId = idMap.get(oldId)!;
    tiles[newId] = { ...tile, id: newId };
  }

  const activeTileId = source.activeTileId
    ? idMap.get(source.activeTileId) ?? Object.keys(tiles)[0]
    : Object.keys(tiles)[0];

  const copy: AppWorkspaceDocument = touchDocument({
    ...source,
    id: createAppWorkspaceId("doc"),
    name: name ?? `${source.name} copy`,
    root: remapNode(source.root),
    tiles,
    activeTileId,
  });

  return {
    ...state,
    activeDocumentId: copy.id,
    documents: [...state.documents, copy],
  };
}

export function saveDocument(
  state: AppWorkspacesState,
  doc: AppWorkspaceDocument,
): AppWorkspacesState {
  const documents = state.documents.map((d) => (d.id === doc.id ? touchDocument(doc) : d));
  return { ...state, documents };
}

export function loadDocument(state: AppWorkspacesState, documentId: string): AppWorkspacesState {
  if (!state.documents.some((d) => d.id === documentId)) return state;
  return { ...state, activeDocumentId: documentId };
}

export function renameDocument(
  state: AppWorkspacesState,
  documentId: string,
  name: string,
): AppWorkspacesState {
  const documents = state.documents.map((d) =>
    d.id === documentId ? touchDocument({ ...d, name }) : d,
  );
  return { ...state, documents };
}

export function getActiveDocument(state: AppWorkspacesState): AppWorkspaceDocument {
  return (
    state.documents.find((d) => d.id === state.activeDocumentId) ??
    state.documents[0] ??
    createDefaultDocument()
  );
}

export function collectSplitIds(root: LayoutNode): string[] {
  if (isTileNode(root)) return [];
  return [
    root.id,
    ...collectSplitIds(root.children[0]),
    ...collectSplitIds(root.children[1]),
  ];
}

export type AssignableSurfaceId = Exclude<SurfaceId, "placeholder">;

export function applyLayoutPreset(
  doc: AppWorkspaceDocument,
  presetId: WorkspaceLayoutPresetId,
): AppWorkspaceDocument {
  const preset = getWorkspaceLayoutPreset(presetId);
  const { root, tiles, activeTileId } = preset.build();
  return touchDocument({
    ...doc,
    root,
    tiles,
    activeTileId,
  });
}

export function assignTileSurface(
  doc: AppWorkspaceDocument,
  tileId: string,
  surfaceId: AssignableSurfaceId,
  surfaceState?: TileSurfaceState,
): AppWorkspaceDocument {
  const tile = doc.tiles[tileId];
  if (!tile) return doc;

  const surfaceChanged = tile.surfaceId !== surfaceId;
  const nextSurfaceState =
    surfaceState !== undefined
      ? surfaceState
      : surfaceChanged
        ? undefined
        : tile.surfaceState;

  if (
    !surfaceChanged &&
    (surfaceState === undefined ||
      tileSurfaceStateMatches(tile.surfaceState, surfaceState))
  ) {
    return doc;
  }

  const nextTile: TileInstance = { id: tile.id, surfaceId };
  if (hasMeaningfulSurfaceState(nextSurfaceState)) {
    nextTile.surfaceState = nextSurfaceState;
  }

  return touchDocument({
    ...doc,
    tiles: { ...doc.tiles, [tileId]: nextTile },
  });
}
