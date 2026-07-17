import type { AppWorkspaceDocument, LayoutNode } from "./types";
import { isSplitNode, isTileNode } from "./types";

function walkLayoutNode(
  node: LayoutNode,
  tiles: AppWorkspaceDocument["tiles"],
): string | null {
  if (isTileNode(node)) {
    const tile = tiles[node.tileId];
    return tile?.surfaceId === "chart" ? node.tileId : null;
  }

  if (isSplitNode(node)) {
    for (const child of node.children) {
      const found = walkLayoutNode(child, tiles);
      if (found) return found;
    }
  }

  return null;
}

/** First chart tile in DFS left/top-first tree order. */
export function primaryChartTileId(document: AppWorkspaceDocument): string | null {
  return walkLayoutNode(document.root, document.tiles);
}
