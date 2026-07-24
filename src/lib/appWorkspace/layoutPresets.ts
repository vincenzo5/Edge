import { createAppWorkspaceId } from "./ids";
import type { LayoutNode, SplitDirection, SurfaceId, TileInstance } from "./types";
import { isTileNode } from "./types";

export type WorkspaceLayoutPresetId =
  | "single"
  | "two-cols"
  | "two-rows"
  | "two-cols-70-30"
  | "two-cols-30-70"
  | "three-cols"
  | "three-rows"
  | "main-right-stack"
  | "main-left-stack"
  | "main-bottom-stack"
  | "main-top-stack"
  | "half-right-stack"
  | "half-left-stack"
  | "half-bottom-stack"
  | "half-top-stack"
  | "main-right-3"
  | "main-bottom-3"
  | "grid-2x2"
  | "grid-2x3"
  | "grid-3x2"
  | "scan-desk"
  | "trade-desk"
  | "journal-review"
  | "triple-module";

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
  /** When true, panes are seeded with Chart/Screener/Journal instead of placeholders. */
  seedsSurfaces?: boolean;
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

function createLeaf(surfaceId: SurfaceId = "placeholder"): BuiltLeaf {
  const tileId = createAppWorkspaceId("tile");
  const nodeId = createAppWorkspaceId("node");
  return {
    root: { type: "tile", id: nodeId, tileId },
    tiles: {
      [tileId]: { id: tileId, surfaceId },
    },
    firstTileId: tileId,
  };
}

function createPlaceholderLeaf(): BuiltLeaf {
  return createLeaf("placeholder");
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

function equalThreeRow(a: BuiltLeaf, b: BuiltLeaf, c: BuiltLeaf): BuiltLeaf {
  return rowSplit(a, rowSplit(b, c), [1 / 3, 2 / 3]);
}

function equalThreeColumn(a: BuiltLeaf, b: BuiltLeaf, c: BuiltLeaf): BuiltLeaf {
  return columnSplit(a, columnSplit(b, c), [1 / 3, 2 / 3]);
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
  return equalThreeRow(
    createPlaceholderLeaf(),
    createPlaceholderLeaf(),
    createPlaceholderLeaf(),
  );
}

function buildThreeRows(): BuiltLeaf {
  return equalThreeColumn(
    createPlaceholderLeaf(),
    createPlaceholderLeaf(),
    createPlaceholderLeaf(),
  );
}

function buildMainRightStack(sizes: [number, number] = [0.65, 0.35]): BuiltLeaf {
  const main = createPlaceholderLeaf();
  const stack = columnSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  return rowSplit(main, stack, sizes);
}

function buildMainLeftStack(sizes: [number, number] = [0.35, 0.65]): BuiltLeaf {
  const stack = columnSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  const main = createPlaceholderLeaf();
  return rowSplit(stack, main, sizes);
}

function buildMainBottomStack(sizes: [number, number] = [0.65, 0.35]): BuiltLeaf {
  const main = createPlaceholderLeaf();
  const bottom = rowSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  return columnSplit(main, bottom, sizes);
}

function buildMainTopStack(sizes: [number, number] = [0.35, 0.65]): BuiltLeaf {
  const top = rowSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  const main = createPlaceholderLeaf();
  return columnSplit(top, main, sizes);
}

function buildMainRight3(): BuiltLeaf {
  const main = createPlaceholderLeaf();
  const stack = equalThreeColumn(
    createPlaceholderLeaf(),
    createPlaceholderLeaf(),
    createPlaceholderLeaf(),
  );
  return rowSplit(main, stack, [0.65, 0.35]);
}

function buildMainBottom3(): BuiltLeaf {
  const main = createPlaceholderLeaf();
  const bottom = equalThreeRow(
    createPlaceholderLeaf(),
    createPlaceholderLeaf(),
    createPlaceholderLeaf(),
  );
  return columnSplit(main, bottom, [0.65, 0.35]);
}

function buildGrid2x2(): BuiltLeaf {
  const top = rowSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  const bottom = rowSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  return columnSplit(top, bottom);
}

function buildGrid2x3(): BuiltLeaf {
  const top = equalThreeRow(
    createPlaceholderLeaf(),
    createPlaceholderLeaf(),
    createPlaceholderLeaf(),
  );
  const bottom = equalThreeRow(
    createPlaceholderLeaf(),
    createPlaceholderLeaf(),
    createPlaceholderLeaf(),
  );
  return columnSplit(top, bottom);
}

function buildGrid3x2(): BuiltLeaf {
  const row1 = rowSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  const row2 = rowSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  const row3 = rowSplit(createPlaceholderLeaf(), createPlaceholderLeaf());
  return columnSplit(row1, columnSplit(row2, row3), [1 / 3, 2 / 3]);
}

function buildScanDesk(): BuiltLeaf {
  return rowSplit(createLeaf("screener"), createLeaf("chart"), [0.7, 0.3]);
}

function buildTradeDesk(): BuiltLeaf {
  const main = createLeaf("chart");
  const stack = columnSplit(createLeaf("screener"), createLeaf("journal"));
  return rowSplit(main, stack, [0.65, 0.35]);
}

function buildJournalReview(): BuiltLeaf {
  return columnSplit(createLeaf("chart"), createLeaf("journal"), [0.65, 0.35]);
}

function buildTripleModule(): BuiltLeaf {
  return equalThreeRow(createLeaf("chart"), createLeaf("screener"), createLeaf("journal"));
}

/** Factory that rebuilds geometry with fresh ids on each call. */
function preset(
  id: WorkspaceLayoutPresetId,
  label: string,
  paneCount: number,
  preview: WorkspaceLayoutPreviewNode,
  factory: () => BuiltLeaf,
  seedsSurfaces = false,
): WorkspaceLayoutPreset {
  return {
    id,
    label,
    paneCount,
    preview,
    seedsSurfaces,
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

const leaf = { kind: "leaf" as const };

function split(
  direction: SplitDirection,
  sizes: [number, number],
  children: [WorkspaceLayoutPreviewNode, WorkspaceLayoutPreviewNode],
): WorkspaceLayoutPreviewNode {
  return { kind: "split", direction, sizes, children };
}

export const WORKSPACE_LAYOUT_PRESETS: readonly WorkspaceLayoutPreset[] = [
  preset("single", "Single", 1, leaf, buildSingle),
  preset(
    "two-cols",
    "2 columns",
    2,
    split("row", [0.5, 0.5], [leaf, leaf]),
    () => buildTwoCols(),
  ),
  preset(
    "two-rows",
    "2 rows",
    2,
    split("column", [0.5, 0.5], [leaf, leaf]),
    () => buildTwoRows(),
  ),
  preset(
    "two-cols-70-30",
    "70 / 30",
    2,
    split("row", [0.7, 0.3], [leaf, leaf]),
    () => buildTwoCols([0.7, 0.3]),
  ),
  preset(
    "two-cols-30-70",
    "30 / 70",
    2,
    split("row", [0.3, 0.7], [leaf, leaf]),
    () => buildTwoCols([0.3, 0.7]),
  ),
  preset(
    "three-cols",
    "3 columns",
    3,
    split("row", [1 / 3, 2 / 3], [leaf, split("row", [0.5, 0.5], [leaf, leaf])]),
    buildThreeCols,
  ),
  preset(
    "three-rows",
    "3 rows",
    3,
    split("column", [1 / 3, 2 / 3], [leaf, split("column", [0.5, 0.5], [leaf, leaf])]),
    buildThreeRows,
  ),
  preset(
    "main-right-stack",
    "Main + right stack",
    3,
    split("row", [0.65, 0.35], [leaf, split("column", [0.5, 0.5], [leaf, leaf])]),
    () => buildMainRightStack(),
  ),
  preset(
    "main-left-stack",
    "Main + left stack",
    3,
    split("row", [0.35, 0.65], [split("column", [0.5, 0.5], [leaf, leaf]), leaf]),
    () => buildMainLeftStack(),
  ),
  preset(
    "main-bottom-stack",
    "Main + bottom stack",
    3,
    split("column", [0.65, 0.35], [leaf, split("row", [0.5, 0.5], [leaf, leaf])]),
    () => buildMainBottomStack(),
  ),
  preset(
    "main-top-stack",
    "Main + top stack",
    3,
    split("column", [0.35, 0.65], [split("row", [0.5, 0.5], [leaf, leaf]), leaf]),
    () => buildMainTopStack(),
  ),
  preset(
    "half-right-stack",
    "50/50 · right stack",
    3,
    split("row", [0.5, 0.5], [leaf, split("column", [0.5, 0.5], [leaf, leaf])]),
    () => buildMainRightStack([0.5, 0.5]),
  ),
  preset(
    "half-left-stack",
    "50/50 · left stack",
    3,
    split("row", [0.5, 0.5], [split("column", [0.5, 0.5], [leaf, leaf]), leaf]),
    () => buildMainLeftStack([0.5, 0.5]),
  ),
  preset(
    "half-bottom-stack",
    "50/50 · bottom stack",
    3,
    split("column", [0.5, 0.5], [leaf, split("row", [0.5, 0.5], [leaf, leaf])]),
    () => buildMainBottomStack([0.5, 0.5]),
  ),
  preset(
    "half-top-stack",
    "50/50 · top stack",
    3,
    split("column", [0.5, 0.5], [split("row", [0.5, 0.5], [leaf, leaf]), leaf]),
    () => buildMainTopStack([0.5, 0.5]),
  ),
  preset(
    "main-right-3",
    "Main + 3 right",
    4,
    split("row", [0.65, 0.35], [
      leaf,
      split("column", [1 / 3, 2 / 3], [leaf, split("column", [0.5, 0.5], [leaf, leaf])]),
    ]),
    buildMainRight3,
  ),
  preset(
    "main-bottom-3",
    "Main + 3 bottom",
    4,
    split("column", [0.65, 0.35], [
      leaf,
      split("row", [1 / 3, 2 / 3], [leaf, split("row", [0.5, 0.5], [leaf, leaf])]),
    ]),
    buildMainBottom3,
  ),
  preset(
    "grid-2x2",
    "2×2 grid",
    4,
    split("column", [0.5, 0.5], [
      split("row", [0.5, 0.5], [leaf, leaf]),
      split("row", [0.5, 0.5], [leaf, leaf]),
    ]),
    buildGrid2x2,
  ),
  preset(
    "grid-2x3",
    "2×3 grid",
    6,
    split("column", [0.5, 0.5], [
      split("row", [1 / 3, 2 / 3], [leaf, split("row", [0.5, 0.5], [leaf, leaf])]),
      split("row", [1 / 3, 2 / 3], [leaf, split("row", [0.5, 0.5], [leaf, leaf])]),
    ]),
    buildGrid2x3,
  ),
  preset(
    "grid-3x2",
    "3×2 grid",
    6,
    split("column", [1 / 3, 2 / 3], [
      split("row", [0.5, 0.5], [leaf, leaf]),
      split("column", [0.5, 0.5], [
        split("row", [0.5, 0.5], [leaf, leaf]),
        split("row", [0.5, 0.5], [leaf, leaf]),
      ]),
    ]),
    buildGrid3x2,
  ),
  preset(
    "scan-desk",
    "Scan desk",
    2,
    split("row", [0.7, 0.3], [leaf, leaf]),
    buildScanDesk,
    true,
  ),
  preset(
    "trade-desk",
    "Trade desk",
    3,
    split("row", [0.65, 0.35], [leaf, split("column", [0.5, 0.5], [leaf, leaf])]),
    buildTradeDesk,
    true,
  ),
  preset(
    "journal-review",
    "Journal review",
    2,
    split("column", [0.65, 0.35], [leaf, leaf]),
    buildJournalReview,
    true,
  ),
  preset(
    "triple-module",
    "Triple module",
    3,
    split("row", [1 / 3, 2 / 3], [leaf, split("row", [0.5, 0.5], [leaf, leaf])]),
    buildTripleModule,
    true,
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
