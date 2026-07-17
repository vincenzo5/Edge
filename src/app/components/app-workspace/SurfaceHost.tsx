"use client";

import type { AssignableSurfaceId } from "@/lib/appWorkspace/commands";
import type { TileInstance } from "@/lib/appWorkspace/types";
import ChartTileHost from "./ChartTileHost";
import JournalTileSurface from "./JournalTileSurface";
import PlaceholderTile from "./PlaceholderTile";
import ScreenerTileSurface from "./ScreenerTileSurface";

type Props = {
  tile: TileInstance;
  isPrimaryChart?: boolean;
  onAssignSurface?: (surfaceId: AssignableSurfaceId) => void;
};

export default function SurfaceHost({ tile, isPrimaryChart = false, onAssignSurface }: Props) {
  switch (tile.surfaceId) {
    case "chart":
      return <ChartTileHost isPrimaryChart={isPrimaryChart} />;
    case "screener":
      return <ScreenerTileSurface tileId={tile.id} surfaceState={tile.surfaceState} />;
    case "journal":
      return <JournalTileSurface surfaceState={tile.surfaceState} />;
    case "placeholder":
      return (
        <PlaceholderTile
          onAssign={(surfaceId) => onAssignSurface?.(surfaceId)}
        />
      );
    default:
      return (
        <PlaceholderTile
          onAssign={(surfaceId) => onAssignSurface?.(surfaceId)}
        />
      );
  }
}
