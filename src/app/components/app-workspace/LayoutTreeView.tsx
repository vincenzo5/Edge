"use client";

import { useCallback, useMemo, useState } from "react";

import { primaryChartTileId } from "@/lib/appWorkspace";
import type { DropEdge } from "@/lib/appWorkspace/types";
import { useAppWorkspace } from "./AppWorkspaceContext";
import LayoutTreeInner from "./LayoutTreeInner";

export default function LayoutTreeView() {
  const { document, moveWorkspaceTile } = useAppWorkspace();
  const primaryChartId = useMemo(() => primaryChartTileId(document), [document]);
  const [draggingTileId, setDraggingTileId] = useState<string | null>(null);

  const handleDrop = useCallback(
    (targetTileId: string, edge: DropEdge) => {
      if (!draggingTileId || draggingTileId === targetTileId) return;
      moveWorkspaceTile(draggingTileId, targetTileId, edge);
    },
    [draggingTileId, moveWorkspaceTile],
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <LayoutTreeInner
        node={document.root}
        document={document}
        primaryChartTileId={primaryChartId}
        draggingTileId={draggingTileId}
        onDragStart={setDraggingTileId}
        onDragEnd={() => setDraggingTileId(null)}
        onDrop={handleDrop}
      />
    </div>
  );
}
