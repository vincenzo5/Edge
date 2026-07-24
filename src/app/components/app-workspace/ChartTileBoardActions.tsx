"use client";

import { useRouter } from "next/navigation";

import { demoteAndBindChartTileToBoard } from "@/lib/research/promote";
import type { ChartTileHostBindingContract } from "@/lib/appWorkspace/chartTileBindingSketch";
import { getActiveDocument, loadAppWorkspacesState } from "@/lib/appWorkspace";

import { EdgeButton } from "../design-system";

type Props = ChartTileHostBindingContract;

export default function ChartTileBoardActions({
  tileId,
  isPrimaryChartTile,
  chartWorkspaceId,
}: Props) {
  const router = useRouter();

  const sendToBoard = () => {
    const doc = getActiveDocument(loadAppWorkspacesState());
    demoteAndBindChartTileToBoard({
      tileId,
      isPrimaryChartTile,
      chartWorkspaceId,
      appWorkspaceId: doc.id,
    });
    router.push("/research");
  };

  return (
    <div className="pointer-events-auto absolute right-2 top-2 z-30">
      <EdgeButton
        type="button"
        variant="secondary"
        data-testid={`chart-tile-send-to-board-${tileId}`}
        onClick={sendToBoard}
      >
        Send to board
      </EdgeButton>
    </div>
  );
}
