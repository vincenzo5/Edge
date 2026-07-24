"use client";

import dynamic from "next/dynamic";
import type { AssignableSurfaceId } from "@/lib/appWorkspace/commands";
import type { TileInstance } from "@/lib/appWorkspace/types";
import ChartTileHost from "./ChartTileHost";
import PlaceholderTile from "./PlaceholderTile";
import TileLoadingShell from "./TileLoadingShell";

const JournalTileSurface = dynamic(() => import("./JournalTileSurface"), {
  ssr: false,
  loading: () => <TileLoadingShell label="Journal" />,
});

const ScreenerTileSurface = dynamic(() => import("./ScreenerTileSurface"), {
  ssr: false,
  loading: () => <TileLoadingShell label="Screener" />,
});

const ScriptsTileSurface = dynamic(() => import("./ScriptsTileSurface"), {
  ssr: false,
  loading: () => <TileLoadingShell label="Scripts" />,
});

const AlertsTileSurface = dynamic(() => import("./AlertsTileSurface"), {
  ssr: false,
  loading: () => <TileLoadingShell label="Alerts" />,
});

const CopilotTileSurface = dynamic(() => import("./CopilotTileSurface"), {
  ssr: false,
  loading: () => <TileLoadingShell label="Copilot" />,
});

type Props = {
  tile: TileInstance;
  isPrimaryChart?: boolean;
  onAssignSurface?: (surfaceId: AssignableSurfaceId) => void;
};

export default function SurfaceHost({ tile, isPrimaryChart = false, onAssignSurface }: Props) {
  switch (tile.surfaceId) {
    case "chart":
      return (
        <ChartTileHost
          tileId={tile.id}
          isPrimaryChartTile={isPrimaryChart}
          chartWorkspaceId={tile.chartWorkspaceId}
        />
      );
    case "screener":
      return <ScreenerTileSurface tileId={tile.id} surfaceState={tile.surfaceState} />;
    case "journal":
      return <JournalTileSurface tileId={tile.id} surfaceState={tile.surfaceState} />;
    case "scripts":
      return <ScriptsTileSurface tileId={tile.id} surfaceState={tile.surfaceState} />;
    case "alerts":
      return <AlertsTileSurface tileId={tile.id} surfaceState={tile.surfaceState} />;
    case "copilot":
      return <CopilotTileSurface tileId={tile.id} />;
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
