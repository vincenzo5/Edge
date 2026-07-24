"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

import StockApp from "@/app/components/StockApp";
import { useAppWorkspace } from "./AppWorkspaceContext";
import ChartTileBoardActions from "./ChartTileBoardActions";
import type { ChartTileHostBindingContract } from "@/lib/appWorkspace/chartTileBindingSketch";

const JournalChartOverlayProvider = dynamic(
  () =>
    import("@/app/components/journal/JournalChartOverlayProvider").then(
      (mod) => mod.JournalChartOverlayProvider,
    ),
  { ssr: false },
);

type Props = ChartTileHostBindingContract;

export default function ChartTileHost({
  tileId,
  isPrimaryChartTile,
  chartWorkspaceId,
}: Props) {
  const { updateTileChartWorkspaceId } = useAppWorkspace();
  const searchParams = useSearchParams();
  const needsJournalOverlay = Boolean(searchParams.get("journalTrade")?.trim());

  const stockApp = (
    <StockApp
      isPrimaryChart={isPrimaryChartTile}
      chartTileBinding={{ tileId, isPrimaryChartTile, chartWorkspaceId }}
      onChartWorkspaceIdCreated={(resourceId) =>
        updateTileChartWorkspaceId(tileId, resourceId)
      }
    />
  );

  return (
    <div data-testid="chart-tile-host" className="relative h-full min-h-0 overflow-hidden">
      <ChartTileBoardActions
        tileId={tileId}
        isPrimaryChartTile={isPrimaryChartTile}
        chartWorkspaceId={chartWorkspaceId}
      />
      {needsJournalOverlay ? (
        <JournalChartOverlayProvider>{stockApp}</JournalChartOverlayProvider>
      ) : (
        stockApp
      )}
    </div>
  );
}
