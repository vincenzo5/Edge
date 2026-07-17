"use client";

import { ScreenerResultsBody } from "@/app/components/screener/ScreenerResultsBody";
import { ScreenerScreensBody } from "@/app/components/screener/ScreenerScreensBody";
import { ScreenerProvider } from "@/app/components/screener/ScreenerProvider";
import { MarketDataProvider } from "@/app/components/MarketDataProvider";
import { WatchlistProvider } from "@/app/components/watchlist/WatchlistContext";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import type { TileSurfaceState } from "@/lib/appWorkspace/types";

type Props = {
  tileId: string;
  surfaceState?: TileSurfaceState;
};

export default function ScreenerTileSurface({ tileId: _tileId, surfaceState: _surfaceState }: Props) {
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
