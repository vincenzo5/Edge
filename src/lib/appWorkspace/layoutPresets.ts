import { createAppWorkspaceId } from "./ids";
import type { LayoutNode, SplitDirection, TileInstance } from "./types";
import { isTileNode } from "./types";

export type WorkspaceLayoutPresetId =
  | "single"
  | "two-cols"
  | "two-rows"
  | "two-cols-70-30"
  | "three-cols"
  | "main-right-stack"
  | "main-bottom-stack"
  | "grid-2x2";

/** Structural tree for icon previews (no tile ids). */
export type WorkspaceLayoutPreviewNode =
  | { kind: "leaf" }
  | {
      kind: "split";
      direction: SplitDirection;
      sizes: [number, number];
      children: [WorkspaceLayoutPreviewNode, WorkspaceLayoutPreviewNode];
    };

export type WorkspaceLayoutPreset = {
  id: WorkspaceLayoutPresetId;
  label: string;
  paneCount: number;
  preview: WorkspaceLayoutPreviewNode;
  build: () => {
    root: LayoutNode;
    tiles: Record<string, TileInstance>;
    activeTileId: string;
  };
};

type BuiltLeaf = {
  root: LayoutNode;
  tiles: Record<string, TileInstance>;
  firstTileId: string;
};

function createPlaceholderLeaf(): BuiltLeaf {
  const tileId = createAppWorkspaceId("tile");
  const nodeId = createAppWorkspaceId("node");
  return {
    root: { type: "tile", id: nodeId, tileId },
    tiles: {
      [tileId]: { id: tileId, surfaceId: "placeholder" },
    },
    firstTileId: tileId,
  };
}

function mergeLeaves(a: BuiltLeaf, b: BuiltLeaf): {
  tiles: Record<string, TileInstance>;
  firstTileId: string;
} {
  return {
    tiles: { ...a.tiles, ...b.tiles },
    firstTileId: a.firstTileId,
  };
}

function splitLeaves(
  first: BuiltLeaf,
  second: BuiltLeaf,
  direction: SplitDirection,
  sizes: [number, number],
): BuiltLeaf {
  const merged = mergeLeaves(first, second);
  return {
    root: {
      type: "split",
      id: createAppWorkspaceId("node"),
      direction,
      sizes,
      children: [first.root, second.root],
    },
    tiles: merged.tiles,
    firstTileId: merged.firstTileId,
  };
}

function rowSplit(
  left: BuiltLeaf,
  right: BuiltLeaf,
  sizes: [number, number] = [0.5, 0.5],
): BuiltLeaf {
  return splitLeaves(left, right, "row", sizes);
}

function columnSplit(
  top: BuiltLeaf,
  bottom: BuiltLeaf,
  sizes: [number, number] = [0.5, 0.5],
): BuiltLeaf {
  return splitLeaves(top, bottom, "column", sizes);
}

function buildSingle(): BuiltLeaf {
  return createPlaceholderLeaf();
}

function buildTwoCols(sizes: [number, number] = [0.5, 0.5]): BuiltLeaf {
  return rowSplit(createPlaceholderLeaf(), createPlaceholderLeaf(), sizes);
}

function buildTwoRows(sizes: [number, number] = [0.5, 0.5]): BuiltLeaf {
  return columnSplit(createPlaceholderLeaf(), createPlaceholderLeaf(), sizes);
}

function buildThreeCols(): BuiltLeaf {
  const left = createPlaceholderLeaf();
  const right = rowSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  return rowSplit(left, right, [1 / 3, 2 / 3]);
}

function buildMainRightStack(): BuiltLeaf {
  const main = createPlaceholderLeaf();
  const stack = columnSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  return rowSplit(main, stack, [0.65, 0.35]);
}

function buildMainBottomStack(): BuiltLeaf {
  const main = createPlaceholderLeaf();
  const bottom = rowSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  return columnSplit(main, bottom, [0.65, 0.35]);
}

function buildGrid2x2(): BuiltLeaf {
  const top = rowSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  const bottom = rowSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  return columnSplit(top, bottom);
}

/** Factory that rebuilds geometry with fresh ids on each call. */
function preset(
  id: WorkspaceLayoutPresetId,
  label: string,
  paneCount: number,
  preview: WorkspaceLayoutPreviewNode,
  factory: () => BuiltLeaf,
): WorkspaceLayoutPreset {
  return {
    id,
    label,
    paneCount,
    preview,
    build: () => {
      const built = factory();
      return {
        root: built.root,
        tiles: built.tiles,
        activeTileId: built.firstTileId,
      };
    },
  };
}

export const WORKSPACE_LAYOUT_PRESETS: readonly WorkspaceLayoutPreset[] = [
  preset("single", "Single", 1, { kind: "leaf" }, buildSingle),
  preset(
    "two-cols",
    "2 columns",
    2,
    {
      kind: "split",
      direction: "row",
      sizes: [0.5, 0.5],
      children: [{ kind: "leaf" }, { kind: "leaf" }],
    },
    () => buildTwoCols(),
  ),
  preset(
    "two-rows",
    "2 rows",
    2,
    {
      kind: "split",
      direction: "column",
      sizes: [0.5, 0.5],
      children: [{ kind: "leaf" }, { kind: "leaf" }],
    },
    () => buildTwoRows(),
  ),
  preset(
    "two-cols-70-30",
    "70 / 30",
    2,
    {
      kind: "split",
      direction: "row",
      sizes: [0.7, 0.3],
      children: [{ kind: "leaf" }, { kind: "leaf" }],
    },
    () => buildTwoCols([0.7, 0.3]),
  ),
  preset(
    "three-cols",
    "3 columns",
    3,
    {
      kind: "split",
      direction: "row",
      sizes: [1 / 3, 2 / 3],
      children: [
        { kind: "leaf" },
        {
          kind: "split",
          direction: "row",
          sizes: [0.5, 0.5],
          children: [{ kind: "leaf" }, { kind: "leaf" }],
        },
      ],
    },
    buildThreeCols,
  ),
  preset(
    "main-right-stack",
    "Main + right stack",
    3,
    {
      kind: "split",
      direction: "row",
      sizes: [0.65, 0.35],
      children: [
        { kind: "leaf" },
        {
          kind: "split",
          direction: "column",
          sizes: [0.5, 0.5],
          children: [{ kind: "leaf" }, { kind: "leaf" }],
        },
      ],
    },
    buildMainRightStack,
  ),
  preset(
    "main-bottom-stack",
    "Main + bottom stack",
    3,
    {
      kind: "split",
      direction: "column",
      sizes: [0.65, 0.35],
      children: [
        { kind: "leaf" },
        {
          kind: "split",
          direction: "row",
          sizes: [0.5, 0.5],
          children: [{ kind: "leaf" }, { kind: "leaf" }],
        },
      ],
    },
    buildMainBottomStack,
  ),
  preset(
    "grid-2x2",
    "2×2 grid",
    4,
    {
      kind: "split",
      direction: "column",
      sizes: [0.5, 0.5],
      children: [
        {
          kind: "split",
          direction: "row",
          sizes: [0.5, 0.5],
          children: [{ kind: "leaf" }, { kind: "leaf" }],
        },
        {
          kind: "split",
          direction: "row",
          sizes: [0.5, 0.5],
          children: [{ kind: "leaf" }, { kind: "leaf" }],
        },
      ],
    },
    buildGrid2x2,
  ),
] as const;

const PRESET_BY_ID = new Map<string, WorkspaceLayoutPreset>(
  WORKSPACE_LAYOUT_PRESETS.map((p) => [p.id, p]),
);

export function isWorkspaceLayoutPresetId(value: unknown): value is WorkspaceLayoutPresetId {
  return typeof value === "string" && PRESET_BY_ID.has(value);
}

export function getWorkspaceLayoutPreset(id: WorkspaceLayoutPresetId): WorkspaceLayoutPreset {
  return PRESET_BY_ID.get(id)!;
}

/** Count tile nodes in a layout tree (for tests). */
export function countTilesInLayout(root: LayoutNode): number {
  if (isTileNode(root)) return 1;
  return countTilesInLayout(root.children[0]) + countTilesInLayout(root.children[1]);
}

/** Collect all tile ids from layout tree in DFS left-first order. */
export function collectTileIdsFromLayout(root: LayoutNode): string[] {
  if (isTileNode(root)) return [root.tileId];
  return [
    ...collectTileIdsFromLayout(root.children[0]),
    ...collectTileIdsFromLayout(root.children[1]),
  ];
}
