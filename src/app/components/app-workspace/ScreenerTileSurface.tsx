"use client";

import { useEffect } from "react";

import { ScreenerResultsBody } from "@/app/components/screener/ScreenerResultsBody";
import { ScreenerScreensBody } from "@/app/components/screener/ScreenerScreensBody";
import { ScreenerProvider } from "@/app/components/screener/ScreenerProvider";
import { MarketDataProvider } from "@/app/components/MarketDataProvider";
import { WatchlistProvider } from "@/app/components/watchlist/WatchlistContext";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import type { TileSurfaceState } from "@/lib/appWorkspace/types";

import { useAppWorkspace } from "./AppWorkspaceContext";

type Props = {
  tileId: string;
  surfaceState?: TileSurfaceState;
};

/** Review/Keepers tile views are retired — always show the unified screens pane. */
function coerceScreenerView(view: TileSurfaceState["screenerView"] | undefined): "screens" {
  if (view === "review" || view === "keepers" || view === "results") return "screens";
  return "screens";
}

export default function ScreenerTileSurface({ tileId, surfaceState }: Props) {
  const { document, updateWorkspaceTileSurfaceState } = useAppWorkspace();
  const rawView =
    document.tiles[tileId]?.surfaceState?.screenerView ?? surfaceState?.screenerView;
  const view = coerceScreenerView(rawView);

  useEffect(() => {
    if (rawView && rawView !== view) {
      updateWorkspaceTileSurfaceState(tileId, { screenerView: view });
    }
  }, [rawView, tileId, updateWorkspaceTileSurfaceState, view]);

  return (
    <WatchlistProvider>
      <ScreenerProvider>
        <MarketDataProvider layout={DEFAULT_LAYOUT}>
          <div
            className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
            data-testid="screener-tile-surface"
          >
            <ScreenerScreensBody
              active
              variant="app"
              resultsSlot={<ScreenerResultsBody active variant="app" embedded />}
            />
          </div>
        </MarketDataProvider>
      </ScreenerProvider>
    </WatchlistProvider>
  );
}
