"use client";

import { useCallback } from "react";

import type { AppWorkspaceDocument, DropEdge, LayoutNode, TileInstance } from "@/lib/appWorkspace/types";
import { isSplitNode, isTileNode } from "@/lib/appWorkspace/types";
import { useAppWorkspace } from "./AppWorkspaceContext";
import SplitPane from "./SplitPane";
import SurfaceHost from "./SurfaceHost";
import TileFrame from "./TileFrame";
import PlaceholderTile from "./PlaceholderTile";

type Props = {
  node: LayoutNode;
  document: AppWorkspaceDocument;
  primaryChartTileId: string | null;
  draggingTileId: string | null;
  onDragStart: (tileId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetTileId: string, edge: DropEdge) => void;
};

export default function LayoutTreeInner({
  node,
  document,
  primaryChartTileId,
  draggingTileId,
  onDragStart,
  onDragEnd,
  onDrop,
}: Props) {
  const { closeWorkspaceTile, setWorkspaceActiveTile, resizeWorkspaceSplit, layoutEditMode, assignWorkspaceTileSurface } =
    useAppWorkspace();
  const tileCount = Object.keys(document.tiles).length;
  const editMode = layoutEditMode === "edit";

  const renderTile = useCallback(
    (tile: TileInstance) => {
      const active = document.activeTileId === tile.id;
      const canClose = editMode && tileCount > 1;

      const handleDrop = (edge: DropEdge) => {
        if (!editMode || !draggingTileId || draggingTileId === tile.id) return;
        onDrop(tile.id, edge);
        onDragEnd();
      };

      return (
        <TileFrame
          tileId={tile.id}
          surfaceId={tile.surfaceId}
          active={active}
          editMode={editMode}
          onFocus={() => setWorkspaceActiveTile(tile.id)}
          onClose={() => closeWorkspaceTile(tile.id)}
          onReassign={(surfaceId) => assignWorkspaceTileSurface(tile.id, surfaceId)}
          canClose={canClose}
          dragHandleProps={
            editMode
              ? {
                  draggable: true,
                  onDragStart: (event) => {
                    event.dataTransfer.setData("text/plain", tile.id);
                    event.dataTransfer.effectAllowed = "move";
                    onDragStart(tile.id);
                  },
                  onDragEnd: () => onDragEnd(),
                }
              : undefined
          }
        >
          <div className="relative h-full min-h-0">
            {editMode && draggingTileId && draggingTileId !== tile.id ? (
              <>
                <div
                  data-testid={`drop-left-${tile.id}`}
                  className="absolute inset-y-0 left-0 z-10 w-1/4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop("left")}
                />
                <div
                  data-testid={`drop-right-${tile.id}`}
                  className="absolute inset-y-0 right-0 z-10 w-1/4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop("right")}
                />
                <div
                  data-testid={`drop-top-${tile.id}`}
                  className="absolute inset-x-0 top-0 z-10 h-1/4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop("top")}
                />
                <div
                  data-testid={`drop-bottom-${tile.id}`}
                  className="absolute inset-x-0 bottom-0 z-10 h-1/4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop("bottom")}
                />
                <div
                  data-testid={`drop-center-${tile.id}`}
                  className="absolute inset-[25%] z-10"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop("center")}
                />
              </>
            ) : null}
            <SurfaceHost
              tile={tile}
              isPrimaryChart={primaryChartTileId != null && tile.id === primaryChartTileId}
              onAssignSurface={(surfaceId) => assignWorkspaceTileSurface(tile.id, surfaceId)}
            />
          </div>
        </TileFrame>
      );
    },
    [
      primaryChartTileId,
      closeWorkspaceTile,
      assignWorkspaceTileSurface,
      document.activeTileId,
      draggingTileId,
      editMode,
      onDragEnd,
      onDragStart,
      onDrop,
      setWorkspaceActiveTile,
      tileCount,
    ],
  );

  if (isTileNode(node)) {
    const tile = document.tiles[node.tileId];
    if (!tile) {
      return (
        <PlaceholderTile onAssign={() => {}} />
      );
    }
    return renderTile(tile);
  }

  if (isSplitNode(node)) {
    return (
      <SplitPane
        splitId={node.id}
        direction={node.direction}
        sizes={node.sizes}
        onResizeCommit={resizeWorkspaceSplit}
        first={
          <LayoutTreeInner
            node={node.children[0]}
            document={document}
            primaryChartTileId={primaryChartTileId}
            draggingTileId={draggingTileId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
          />
        }
        second={
          <LayoutTreeInner
            node={node.children[1]}
            document={document}
            primaryChartTileId={primaryChartTileId}
            draggingTileId={draggingTileId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
          />
        }
      />
    );
  }

  return null;
}
