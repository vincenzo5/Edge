export type SurfaceId = "chart" | "screener" | "journal" | "placeholder";

export type SplitDirection = "row" | "column";

export type DropEdge = "left" | "right" | "top" | "bottom" | "center";

export type TileSurfaceState = {
  screenerView?: "review" | "screens" | "results" | "keepers";
  journalView?: "dashboard" | "trades" | "settings";
};

export type TileInstance = {
  id: string;
  surfaceId: SurfaceId;
  surfaceState?: TileSurfaceState;
};

export type SplitNode = {
  type: "split";
  id: string;
  direction: SplitDirection;
  children: [LayoutNode, LayoutNode];
  sizes: [number, number];
};

export type TileNode = {
  type: "tile";
  id: string;
  tileId: string;
};

export type LayoutNode = SplitNode | TileNode;

export type AppWorkspaceDocument = {
  version: 1;
  id: string;
  name: string;
  root: LayoutNode;
  tiles: Record<string, TileInstance>;
  activeTileId?: string;
  updatedAt: string;
};

export type AppWorkspacesState = {
  version: 1;
  activeDocumentId: string;
  documents: AppWorkspaceDocument[];
};

export function isSplitNode(node: LayoutNode): node is SplitNode {
  return node.type === "split";
}

export function isTileNode(node: LayoutNode): node is TileNode {
  return node.type === "tile";
}
